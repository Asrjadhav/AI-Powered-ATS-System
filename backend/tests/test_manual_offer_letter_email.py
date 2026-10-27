"""
Email Templates page: the six kept templates, and the offer letter PDF on the manual
"Send Email" for an Offer Letter template.

Runs on in-memory SQLite with the real `database` module replaced by a stand-in and the
SMTP sender replaced by a recorder, so no real database, credentials or email are used.
"""
import datetime
import os
import sys
import types

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

if "database" not in sys.modules:
    _stub = types.ModuleType("database")
    _stub.Base = declarative_base()
    _stub.engine = None
    _stub.SessionLocal = None
    _stub.get_db = lambda: iter(())
    sys.modules["database"] = _stub

import pytest
from fastapi import HTTPException

import database
import models  # noqa: F401  (registers every table on Base)
import seed_email_templates
import services.email_service as email_service
import services.manual_email_service as manual
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.email_template import EmailTemplateModel

TEMPLATES = {t["id"]: t for t in seed_email_templates.DEFAULT_TEMPLATES}
KEPT_CATEGORIES = ["Interview Invitation", "Offer Letter", "Welcome Email", "Rejection Email"]


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    for t in TEMPLATES.values():
        session.add(EmailTemplateModel(id=t["id"], name=t["name"], category=t["category"], subject=t["subject"],
                                       body=t["body"], variables=t["variables"]))
    session.add(CandidateModel(id="CAND-0001", candidateId="CAND-0001", firstName="Aditi", lastName="Jadhav",
                               email="aditi@example.com"))
    session.add(CandidateModel(id="CAND-0002", candidateId="CAND-0002", firstName="No", lastName="Application",
                               email="noapp@example.com"))
    session.flush()
    session.add(ApplicationModel(id="APP-1", applicationId="APP-1", candidateId="CAND-0001", appliedRole="Marketing Manager"))
    session.commit()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def sent(monkeypatch):
    calls = []
    monkeypatch.setattr(email_service, "is_configured", lambda: True)

    def record(to_email, subject, body, attachments=None):
        calls.append({"to": to_email, "subject": subject, "body": body, "attachments": list(attachments or [])})
        return True

    monkeypatch.setattr(email_service, "send_email", record)
    return calls


def test_seed_keeps_exactly_the_four_templates():
    assert [t["category"] for t in seed_email_templates.DEFAULT_TEMPLATES] == [
        "Interview Invitation", "Offer Letter", "Rejection Email", "Welcome Email"]
    assert sorted(t["category"] for t in seed_email_templates.DEFAULT_TEMPLATES) == sorted(KEPT_CATEGORIES)
    names = " ".join(t["name"] for t in seed_email_templates.DEFAULT_TEMPLATES)
    for removed in ("Shortlisted", "Joining", "Application Received", "Rescheduled"):
        assert removed not in names


def test_rejection_fallback_category_matches_the_seeded_one():
    assert email_service.REJECTION_CATEGORY == TEMPLATES["temp-003"]["category"] == "Rejection Email"


def pdf_text(content: bytes) -> str:
    from io import BytesIO

    from pypdf import PdfReader

    text = " ".join(page.extract_text() for page in PdfReader(BytesIO(content)).pages)
    return " ".join(text.split())  # lines wrap differently per name; compare on single spaces


def future(days: int) -> str:
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


def offer_details(**overrides):
    details = {"annualCtc": 204000, "joiningDate": future(20), "validTill": future(10), "reportingManager": ""}
    details.update(overrides)
    return details


def test_offer_letter_template_attaches_the_candidates_pdf(db, sent):
    result = manual.send_manual_email(db, "CAND-0001", "Job Offer", "Please find the offer.",
                                      template_id="temp-002", offer_letter=offer_details())

    assert len(sent) == 1
    (filename, content, mime), = sent[0]["attachments"]
    assert filename == "Offer_Letter_Aditi_Jadhav.pdf" and mime == "application/pdf"
    assert content.startswith(b"%PDF-1.4") and content.rstrip().endswith(b"%%EOF")
    text = pdf_text(content)
    assert "Aditi Jadhav" in text and "Marketing Manager" in text
    assert "Rs. 17,000/- (Seventeen Thousand Only) i.e. Rs. 2.04 LPA." in text
    assert result["attachments"] == ["Offer_Letter_Aditi_Jadhav.pdf"]


@pytest.mark.parametrize("template_id", ["temp-001", "temp-003", "temp-004", None, "no-such-id"])
def test_other_templates_have_no_attachment(db, sent, template_id):
    result = manual.send_manual_email(db, "CAND-0001", "Hello", "Body", template_id=template_id)
    assert sent[0]["attachments"] == []
    assert result["attachments"] == []


def test_offer_letter_without_a_job_title_is_refused_and_nothing_is_sent(db, sent):
    with pytest.raises(HTTPException) as err:
        manual.send_manual_email(db, "CAND-0002", "Job Offer", "Body", template_id="temp-002",
                                 offer_letter=offer_details())
    assert err.value.status_code == 400 and "job title" in err.value.detail
    assert sent == []


def test_hr_can_type_the_job_title_when_the_candidate_has_no_application(db, sent):
    manual.send_manual_email(db, "CAND-0002", "Job Offer", "Body", template_id="temp-002",
                             offer_letter=offer_details(jobTitle="QA Engineer"))
    assert "QA Engineer" in pdf_text(sent[0]["attachments"][0][1])


def test_welcome_template_only_uses_variables_the_page_can_fill():
    known = {"candidate_name", "job_title", "company_name", "recruiter_name", "department", "interview_date",
             "interview_time", "interview_mode", "meeting_link", "joining_date", "salary", "offer_expiry"}
    assert set(TEMPLATES["temp-004"]["variables"]) <= known


# ---- Renumbering the ids (old ids temp-003/004/006/008 -> temp-001..004) must be safe at any moment ----

OLD_ID_ROWS = [("temp-003", "Interview Invitation"), ("temp-004", "Offer Letter"),
               ("temp-006", "Rejection Email"), ("temp-008", "Welcome Email")]


@pytest.fixture()
def old_id_factory():
    """A database that still has the four templates under their OLD ids."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    session = factory()
    for old_id, category in OLD_ID_ROWS:
        session.add(EmailTemplateModel(id=old_id, name=category, category=category, subject="s", body="b"))
    session.commit()
    session.close()
    yield factory
    engine.dispose()


def test_seed_does_not_add_duplicates_before_the_ids_are_renumbered(old_id_factory, monkeypatch):
    monkeypatch.setattr(seed_email_templates, "SessionLocal", old_id_factory)
    seed_email_templates.seed_email_templates()
    check = old_id_factory()
    assert check.query(EmailTemplateModel).count() == 4
    check.close()


def test_template_lookup_never_returns_another_kinds_template(old_id_factory):
    session = old_id_factory()
    # New id temp-003 is the REJECTION id, but in the old database temp-003 is the interview invitation.
    template = email_service.get_template(session, "temp-003", "Rejection Email")
    assert template.id == "temp-006" and template.category == "Rejection Email"
    template = email_service.get_template(session, "temp-001", "Interview Invitation")  # id not there yet
    assert template.id == "temp-003"
    session.close()


def test_template_lookup_uses_the_new_ids_once_renumbered(db):
    assert email_service.get_template(db, "temp-003", "Rejection Email").id == "temp-003"
    assert email_service.get_template(db, "temp-002", "Offer Letter").id == "temp-002"
    assert email_service.get_template(db, "temp-001", "Interview Invitation").id == "temp-001"
