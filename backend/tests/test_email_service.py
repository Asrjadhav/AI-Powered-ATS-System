"""
Email service tests: transport, rendering, the dummy offer letter PDF, the
automated emails (rejected / offer generated / interview scheduled) and the
manual "Send Email" button's backend.

Fully offline: SMTP is replaced by a recorder, database lookups are stubbed, and
a stub `database` module is installed so nothing here can load backend/.env or
connect to PostgreSQL.
"""
import sys
import os
import io
import types

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if "database" not in sys.modules:
    from sqlalchemy.orm import declarative_base

    _stub = types.ModuleType("database")
    _stub.Base = declarative_base()
    _stub.engine = None
    _stub.SessionLocal = None

    def _get_db():
        yield None

    _stub.get_db = _get_db
    sys.modules["database"] = _stub

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pypdf import PdfReader

import config
import services.email_service as email_service
import services.email_variables as email_variables
import services.offer_letter_service as offer_letter_service
import services.automated_email_service as automated
import services.manual_email_service as manual


# ---------------------------------------------------------------- fakes

class FakeSMTP:
    """Records what would have been sent. Never opens a connection."""
    instances = []
    fail_with = None

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port = host, port
        self.started_tls = False
        self.logged_in = None
        self.sent = []
        FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def ehlo(self):
        pass

    def has_extn(self, name):
        return True

    def starttls(self, context=None):
        self.started_tls = True

    def login(self, user, password):
        self.logged_in = user

    def send_message(self, msg):
        if FakeSMTP.fail_with:
            raise FakeSMTP.fail_with
        self.sent.append(msg)
        return {}


class FakeDb:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def refresh(self, obj):
        pass


@pytest.fixture(autouse=True)
def offline_smtp(monkeypatch):
    FakeSMTP.instances = []
    FakeSMTP.fail_with = None
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", FakeSMTP)
    monkeypatch.setattr(config, "SMTP_HOST", "")
    monkeypatch.setattr(config, "SMTP_PORT", 587)
    monkeypatch.setattr(config, "SMTP_USERNAME", "")
    monkeypatch.setattr(config, "SMTP_PASSWORD", "")
    monkeypatch.setattr(config, "FROM_EMAIL", "hr@test.local")
    monkeypatch.setattr(config, "FROM_NAME", "HR Team")
    monkeypatch.setattr(config, "COMPANY_NAME", "TestCo")
    monkeypatch.setattr(config, "RECRUITER_NAME", "Rita Recruiter")
    monkeypatch.setattr(config, "GOOGLE_CALENDAR_TIMEZONE", "Asia/Kolkata")
    # No stored templates unless a test provides one: built-in text is used.
    monkeypatch.setattr(email_service, "get_template", lambda db, template_id, category: None)


@pytest.fixture()
def smtp_on(monkeypatch):
    monkeypatch.setattr(config, "SMTP_HOST", "smtp.test.local")
    monkeypatch.setattr(config, "SMTP_USERNAME", "mailer")
    monkeypatch.setattr(config, "SMTP_PASSWORD", "secret")


def sent_messages():
    return [m for s in FakeSMTP.instances for m in s.sent]


def body_of(msg):
    return msg.get_body(preferencelist=("plain",)).get_content()


def candidate(**overrides):
    base = dict(id="cand-uuid-1", candidateId="CAND-0001", firstName="Priya", lastName="Nair",
                email="priya.db@example.com", phone="9321459042", totalExperience="3 years", experienceYears=3.0,
                skills=["React", "SQL"], keySkills=None, status="Shortlisted")
    base.update(overrides)
    return SimpleNamespace(**base)


# ---------------------------------------------------------------- transport

def test_render_fills_known_and_blanks_unknown_placeholders():
    assert email_service.render("Hi {{ candidate_name }}, {{unknown}}!", {"candidate_name": "Priya"}) == "Hi Priya, !"


def test_send_email_not_configured_returns_false_and_connects_nowhere():
    assert email_service.send_email("a@example.com", "S", "B") is False
    assert FakeSMTP.instances == []


def test_send_email_delivers_with_sender_from_config_and_attachment(smtp_on):
    ok = email_service.send_email(
        "a@example.com", "Subject", "Body text", attachments=[("letter.pdf", b"%PDF-1.4 x", "application/pdf")]
    )
    assert ok is True
    server = FakeSMTP.instances[0]
    assert server.started_tls and server.logged_in == "mailer"
    msg = server.sent[0]
    assert msg["From"] == "HR Team <hr@test.local>"
    assert msg["To"] == "a@example.com"
    assert msg["Subject"] == "Subject"
    assert body_of(msg).strip() == "Body text"
    attachment = next(msg.iter_attachments())
    assert attachment.get_filename() == "letter.pdf"
    assert attachment.get_content_type() == "application/pdf"


def test_send_email_port_465_uses_ssl_without_starttls(smtp_on, monkeypatch):
    monkeypatch.setattr(config, "SMTP_PORT", 465)
    assert email_service.send_email("a@example.com", "S", "B") is True
    assert FakeSMTP.instances[0].started_tls is False


def test_send_email_smtp_error_returns_false(smtp_on):
    FakeSMTP.fail_with = OSError("connection refused")
    assert email_service.send_email("a@example.com", "S", "B") is False


def test_templated_email_prefers_stored_template(smtp_on, monkeypatch):
    stored = SimpleNamespace(id="temp-x", name="Stored", subject="Stored {{job_title}}", body="Stored body for {{candidate_name}}")
    monkeypatch.setattr(email_service, "get_template", lambda db, template_id, category: stored)
    email_service.send_templated_email(
        FakeDb(), "temp-x", "Cat", "a@example.com", {"job_title": "Dev", "candidate_name": "Priya"}, "fallback", "fallback"
    )
    msg = sent_messages()[0]
    assert msg["Subject"] == "Stored Dev"
    assert body_of(msg).strip() == "Stored body for Priya"


# ---------------------------------------------------------------- offer letter file name + variables
# (the offer letter PDF itself is tested in test_mail_formats_and_offer_letter.py)

def test_offer_letter_filename():
    assert offer_letter_service.offer_letter_filename("Priya (P) Nair") == "Offer_Letter_Priya_P_Nair.pdf"
    assert offer_letter_service.offer_letter_filename("") == "Offer_Letter_Candidate.pdf"


@pytest.mark.parametrize("amount,expected", [
    (1200000, "₹12,00,000 / year"),
    (950, "₹950 / year"),
    (12345678, "₹1,23,45,678 / year"),
    (None, ""),
    (0, ""),
])
def test_format_inr(amount, expected):
    assert email_variables.format_inr(amount) == expected


# ---------------------------------------------------------------- automated: rejected

def application(**overrides):
    base = dict(id="app-1", candidateId="cand-uuid-1", candidateEmail="stale@example.com",
                candidateName="Old Name", appliedRole="Frontend Developer", department="Engineering",
                aiEvaluation={"score": 30})
    base.update(overrides)
    return SimpleNamespace(**base)


def test_rejection_email_goes_to_db_candidate_and_is_recorded(smtp_on, monkeypatch):
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())
    app, db = application(), FakeDb()

    assert automated.notify_candidate_rejected(db, app) is True
    msg = sent_messages()[0]
    assert msg["To"] == "priya.db@example.com"  # from the candidates table, not the stale copy
    assert msg["Subject"] == "Update on Your Application – TestCo"
    assert "Dear Priya Nair" in body_of(msg) and "the Frontend Developer position at TestCo" in body_of(msg)
    assert app.aiEvaluation["rejectionEmailSent"] is True
    assert app.aiEvaluation["score"] == 30  # existing evaluation kept
    assert db.commits == 1


def test_rejection_email_is_sent_only_once(smtp_on, monkeypatch):
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())
    app = application(aiEvaluation={"rejectionEmailSent": True})
    assert automated.notify_candidate_rejected(FakeDb(), app) is False
    assert sent_messages() == []


def test_rejection_email_not_delivered_is_not_marked_sent(monkeypatch):
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())
    app, db = application(), FakeDb()  # SMTP not configured
    assert automated.notify_candidate_rejected(db, app) is False
    assert "rejectionEmailSent" not in app.aiEvaluation
    assert db.commits == 0


# ---------------------------------------------------------------- automated: offer generated

def offer(**overrides):
    base = dict(id="OFF-1", candidateId="cand-uuid-1", candidateEmail="stale@example.com", candidateName="Old",
                jobTitle="Frontend Developer", department="Product Engineering",
                offeredCTC=1200000.0, joiningDate="2026-11-01")
    base.update(overrides)
    return SimpleNamespace(**base)


def test_offer_email_attaches_offer_letter_pdf(smtp_on, monkeypatch):
    monkeypatch.setattr(automated, "_find_offer", lambda db, oid: offer())
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())

    letter = {"annualCtc": 1200000.0, "joiningDate": "2099-11-01", "validTill": "2099-10-20"}
    assert automated.notify_offer_generated(FakeDb(), "OFF-1", letter=letter) is True
    msg = sent_messages()[0]
    assert msg["To"] == "priya.db@example.com"
    assert msg["Subject"] == "Offer Letter | Priya Nair | EncureIT Systems Pvt Ltd."
    assert "welcoming you on 1st November 2099." in body_of(msg)
    attachment = next(msg.iter_attachments())
    assert attachment.get_filename() == "Offer_Letter_Priya_Nair.pdf"
    pdf_text = " ".join(PdfReader(io.BytesIO(attachment.get_content())).pages[0].extract_text().split())
    assert "Priya Nair Mobile No.: +91- 9321459042 priya.db@example.com Dear Priya," in pdf_text
    assert "“Frontend Developer”" in pdf_text
    assert "Rs. 1,00,000/- (One Lakh Only) i.e. Rs. 12 LPA." in pdf_text


def test_offer_email_without_the_letter_details_sends_nothing(smtp_on, monkeypatch):
    monkeypatch.setattr(automated, "_find_offer", lambda db, oid: offer())
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())
    assert automated.notify_offer_generated(FakeDb(), "OFF-1") is False  # no valid-till date
    assert sent_messages() == []


def test_offer_email_unknown_offer_sends_nothing(smtp_on, monkeypatch):
    monkeypatch.setattr(automated, "_find_offer", lambda db, oid: None)
    assert automated.notify_offer_generated(FakeDb(), "missing") is False
    assert sent_messages() == []


# ---------------------------------------------------------------- automated: interview scheduled

def interview(**overrides):
    base = dict(id="int_1", candidateId="cand-uuid-1", candidateEmail="stale@example.com", candidateName="Old",
                jobTitle="Frontend Developer", date="2026-10-20", time="14:00", round="Technical Round 1",
                meetingLink="https://meet.google.com/abc-defg-hij")
    base.update(overrides)
    return SimpleNamespace(**base)


GOOGLE_MEET = {"type": "Online", "platform": "Google Meet"}


def test_interview_email_includes_the_saved_meet_link(smtp_on, monkeypatch):
    # The create-interview route makes the Meet link first (and refuses to save without it); the
    # email then uses the link saved on the interview.
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())
    iv = interview(meetingLink="https://meet.google.com/abc-defg-hij")

    assert automated.notify_interview_scheduled(FakeDb(), iv, GOOGLE_MEET) is True
    body = body_of(sent_messages()[0])
    assert "Joining Link: https://meet.google.com/abc-defg-hij" in body
    assert "Date: Oct 20, 2026" in body and "Time: 02:00 PM" in body
    assert "Mode: G Meet" in body


@pytest.mark.parametrize("options,expected", [
    ({"type": "Offline", "location": "Pune office"}, "Mode: In-Person\nLocation: Pune office"),
    ({"type": "Online", "platform": "Zoom"}, "Mode: Online (Zoom)\nJoining Link:"),
])
def test_interview_email_without_google_meet(smtp_on, monkeypatch, options, expected):
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: candidate())
    assert automated.notify_interview_scheduled(FakeDb(), interview(meetingLink=None), options) is True
    assert expected in body_of(sent_messages()[0])


def test_interview_without_candidate_email_sends_nothing(smtp_on, monkeypatch):
    monkeypatch.setattr(automated, "_find_candidate", lambda db, i: None)
    assert automated.notify_interview_scheduled(FakeDb(), interview(candidateEmail=None), GOOGLE_MEET) is False
    assert sent_messages() == []


# ---------------------------------------------------------------- manual "Send Email" button

def test_build_recipient_uses_latest_real_rows():
    apps = [
        SimpleNamespace(createdAt="2026-01-01", appliedRole="Old Role", department="X", atsScore=40, status="Rejected"),
        SimpleNamespace(createdAt="2026-09-01", appliedRole="Frontend Developer", department="Product", atsScore=91,
                        status="Interviewing"),
    ]
    interviews = [
        SimpleNamespace(date="2026-10-01", time="10:00", createdAt="a", status="Scheduled", round="Technical Round 1",
                        meetingLink="https://meet.google.com/aaa-bbbb-ccc"),
        SimpleNamespace(date="2026-12-01", time="10:00", createdAt="b", status="Cancelled", round="HR Interview",
                        meetingLink="https://meet.google.com/zzz"),
    ]
    offers = [SimpleNamespace(createdAt="2026-10-05", status="Pending", offeredCTC=1500000.0, joiningDate="2026-11-15")]

    r = manual.build_recipient(candidate(), apps, interviews, offers)
    assert r["email"] == "priya.db@example.com"
    assert r["jobTitle"] == "Frontend Developer" and r["atsScore"] == "91"
    assert r["interviewStatus"] == "Interviewing" and r["offerStatus"] == "Pending"
    v = r["variables"]
    assert v["interview_date"] == "Oct 1, 2026"  # cancelled interview ignored
    assert v["interview_time"] == "10:00 AM" and v["interview_mode"] == "G Meet"
    assert v["meeting_link"] == "https://meet.google.com/aaa-bbbb-ccc"
    assert v["salary"] == "₹15,00,000 / year" and v["joining_date"] == "15th November 2026"
    assert v["company_name"] == "TestCo" and v["custom_message"] == ""


def test_build_recipient_leaves_missing_data_blank():
    r = manual.build_recipient(candidate(skills=None, keySkills=None, totalExperience=None, experienceYears=None), [], [], [])
    v = r["variables"]
    assert r["atsScore"] == "" and r["offerStatus"] == "None"
    assert v["meeting_link"] == "" and v["salary"] == "" and v["interview_date"] == ""


def _stub_manual_lookups(monkeypatch, cand):
    monkeypatch.setattr(manual, "_find_candidate", lambda db, i: cand)
    monkeypatch.setattr(manual, "_related_rows", lambda db, ids=None: ({}, {}, {}))


def test_manual_send_goes_to_db_email(smtp_on, monkeypatch):
    _stub_manual_lookups(monkeypatch, candidate())
    result = manual.send_manual_email(FakeDb(), "CAND-0001", "Hello {{candidate_name}}", "Body {{salary}}.")
    assert result["success"] is True and result["to"] == "priya.db@example.com"
    msg = sent_messages()[0]
    assert msg["Subject"] == "Hello Priya Nair"
    assert body_of(msg).strip() == "Body ."  # no offer: salary left blank


def test_manual_send_unknown_candidate_404(smtp_on, monkeypatch):
    _stub_manual_lookups(monkeypatch, None)
    with pytest.raises(HTTPException) as e:
        manual.send_manual_email(FakeDb(), "nope", "S", "B")
    assert e.value.status_code == 404


def test_manual_send_requires_subject_and_body(smtp_on, monkeypatch):
    _stub_manual_lookups(monkeypatch, candidate())
    with pytest.raises(HTTPException) as e:
        manual.send_manual_email(FakeDb(), "CAND-0001", "  ", "B")
    assert e.value.status_code == 400


def test_manual_send_not_configured_503(monkeypatch):
    _stub_manual_lookups(monkeypatch, candidate())
    with pytest.raises(HTTPException) as e:
        manual.send_manual_email(FakeDb(), "CAND-0001", "S", "B")
    assert e.value.status_code == 503
    assert FakeSMTP.instances == []


def test_manual_send_smtp_failure_502(smtp_on, monkeypatch):
    _stub_manual_lookups(monkeypatch, candidate())
    FakeSMTP.fail_with = OSError("refused")
    with pytest.raises(HTTPException) as e:
        manual.send_manual_email(FakeDb(), "CAND-0001", "S", "B")
    assert e.value.status_code == 502
