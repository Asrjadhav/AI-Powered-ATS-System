"""
The mail formats (Interview Invitation, Offer Letter, Rejection) and the offer letter PDF.

Covers the date / time / rupee wording helpers, the offer letter PDF (content, validation,
attachment to the right candidate's email), template rendering with real values substituted, the
manual and automatic send paths, and the offer-letter preview endpoint.

Runs on in-memory SQLite with the real `database` module replaced by a stand-in and the SMTP sender
replaced by a recorder, so no real database, credentials or email are used.
"""
import datetime
import os
import re
import sys
import types
from io import BytesIO

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
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pypdf import PdfReader

import database
import models  # noqa: F401  (registers every table on Base)
import services.automated_email_service as automated
import services.email_service as email_service
import services.email_html as email_html
import services.email_trigger_service as triggers
import services.email_variables as email_variables
import services.manual_email_service as manual
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.email_template import EmailTemplateModel
from models.interview import InterviewModel
from models.job import JobModel
from routers import emails as emails_router
from routers import offers as offers_router
from services import formatting
from services.email_template_defaults import DEFAULT_TEMPLATES
from services.offer_letter_service import (
    OfferLetterData, OfferLetterError, build_offer_letter, ctc_sentence, validity_sentence, validate,
)

TODAY = datetime.date(2026, 9, 10)


def pdf_pages(content: bytes):
    return [" ".join(page.extract_text().split()) for page in PdfReader(BytesIO(content)).pages]


def pdf_text(content: bytes) -> str:
    return " ".join(pdf_pages(content))


def letter(**overrides) -> OfferLetterData:
    values = dict(candidate_name="Priya Sharma", job_title="Blockchain Developer", annual_ctc=204000,
                  joining_date="2026-09-11", valid_till="2026-09-11", mobile="9321459042",
                  email="priya@example.com", reporting_manager="Mr. Ashish Jain", letter_date=TODAY)
    values.update(overrides)
    return OfferLetterData(**values)


# ---------------------------------------------------------------- wording helpers

def test_dates_and_times():
    assert formatting.date_long("2026-09-09") == "9th September 2026"
    assert formatting.date_long("2026-09-11") == "11th September 2026"
    assert formatting.date_long("2026-09-22") == "22nd September 2026"
    assert formatting.date_long("2026-09-23") == "23rd September 2026"
    assert formatting.date_short("2026-08-11") == "Aug 11, 2026"
    assert formatting.date_for_subject("2026-08-11") == "August 11 2026"
    assert formatting.time_12h("17:00") == "05:00 PM"
    assert formatting.time_12h("00:30") == "12:30 AM"
    assert formatting.time_12h("12:00:00") == "12:00 PM"
    assert formatting.weekday_name("2026-09-11") == "Friday"
    # A value that is not understood is shown as given, never invented.
    assert formatting.date_long("soon") == "soon" and formatting.time_12h("noon") == "noon"
    assert formatting.date_long(None) == "" and formatting.time_12h(None) == ""


def test_rupee_amounts():
    assert formatting.rupees_in_words(17000) == "Seventeen Thousand Only"
    assert formatting.rupees_in_words(125000) == "One Lakh Twenty Five Thousand Only"
    assert formatting.rupees_in_words(12345678) == "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only"
    assert formatting.rupees_with_grouping(17000) == "17,000"
    assert formatting.rupees_with_grouping(1250000) == "12,50,000"
    assert formatting.lakhs_per_annum(204000) == "2.04"
    assert formatting.lakhs_per_annum(1200000) == "12"
    assert formatting.lakhs_per_annum(650000) == "6.5"
    assert formatting.monthly_from_annual(204000) == 17000


def test_mobile_numbers():
    assert formatting.mobile_for_letter("9321459042") == "+91- 9321459042"
    assert formatting.mobile_for_letter("+91 93214 59042") == "+91- 9321459042"
    assert formatting.mobile_for_letter("09321459042") == "+91- 9321459042"
    assert formatting.mobile_for_letter("+1 415 555 0100") == "+1 415 555 0100"
    assert formatting.mobile_for_letter("") == ""


def test_the_two_exact_sentences():
    assert ctc_sentence(204000) == "Your starting monthly CTC will be Rs. 17,000/- (Seventeen Thousand Only) i.e. Rs. 2.04 LPA."
    assert validity_sentence("2026-09-11") == "The offer stands valid till 11th September 2026 only."


# ---------------------------------------------------------------- the offer letter PDF

def test_offer_letter_is_a_two_page_branded_pdf_with_the_candidates_details():
    pdf = build_offer_letter(letter())
    assert pdf.startswith(b"%PDF-1.4") and pdf.rstrip().endswith(b"%%EOF")
    reader = PdfReader(BytesIO(pdf))
    assert len(reader.pages) == 2
    assert len(reader.pages[0].images) == 1  # the company letterhead
    first, second = pdf_pages(pdf)
    assert first.startswith("Offer Letter 10th September 2026 Priya Sharma Mobile No.: +91- 9321459042 priya@example.com Dear Priya,")
    assert "You are expected to join the company on 11th September 2026, i.e. Friday." in first
    assert "appointed to the position of “Blockchain Developer”" in first
    assert "you will report directly to Mr. Ashish Jain." in first
    assert "Your starting monthly CTC will be Rs. 17,000/- (Seventeen Thousand Only) i.e. Rs. 2.04 LPA." in first
    assert "The offer stands valid till 11th September 2026 only." in first
    assert first.endswith("Regards, Sunmit Baphna HR Director.")
    assert second.startswith("I accept the above terms and conditions")
    assert "Name: Priya Sharma Date: Place:" in second


def test_heading_date_is_the_current_date_when_not_given():
    today = datetime.date.today()
    pdf = build_offer_letter(letter(letter_date=None, valid_till=today + datetime.timedelta(days=3)))
    assert formatting.date_long(today) in pdf_pages(pdf)[0].split("Priya Sharma")[0]


def test_amounts_follow_the_ctc_entered():
    first = pdf_pages(build_offer_letter(letter(annual_ctc=1200000)))[0]
    assert "Rs. 1,00,000/- (One Lakh Only) i.e. Rs. 12 LPA." in first
    first = pdf_pages(build_offer_letter(letter(annual_ctc=650000)))[0]
    assert "Rs. 54,167/- (Fifty Four Thousand One Hundred Sixty Seven Only) i.e. Rs. 6.5 LPA." in first


def test_optional_lines_are_left_out_not_invented():
    first = pdf_pages(build_offer_letter(letter(mobile="", email="", reporting_manager="")))[0]
    assert "Mobile No." not in first and "@" not in first
    assert "report directly" not in first
    assert "appointed to the position of “Blockchain Developer”. Your starting monthly CTC" in first


@pytest.mark.parametrize("field,value,missing", [
    ("candidate_name", "", "candidate name"),
    ("job_title", "  ", "job title"),
    ("annual_ctc", None, "annual CTC"),
    ("annual_ctc", 0, "annual CTC"),
    ("joining_date", "", "joining date"),
    ("joining_date", "not a date", "joining date"),
    ("valid_till", None, "offer valid till date"),
])
def test_missing_details_stop_the_letter_and_name_the_field(field, value, missing):
    with pytest.raises(OfferLetterError) as err:
        build_offer_letter(letter(**{field: value}))
    assert missing in str(err.value)


def test_every_missing_detail_is_named_at_once():
    with pytest.raises(OfferLetterError) as err:
        validate(OfferLetterData("", "", None, None, None))
    for name in ("candidate name", "job title", "annual CTC", "joining date", "offer valid till date"):
        assert name in str(err.value)


def test_valid_till_cannot_be_before_the_letter_date():
    with pytest.raises(OfferLetterError) as err:
        build_offer_letter(letter(valid_till="2026-09-09"))
    assert "earlier" in str(err.value)
    build_offer_letter(letter(valid_till="2026-09-10"))  # the same day is fine


def test_long_text_wraps_inside_the_page():
    pdf = build_offer_letter(letter(job_title="Senior Principal Software Development Engineer in Test (Automation)",
                                    reporting_manager="Mr. Ashish Jain, Head of Engineering and Delivery"))
    assert "Senior Principal Software Development Engineer in Test (Automation)" in pdf_pages(pdf)[0]
    assert "Regards, Sunmit Baphna" in pdf_pages(pdf)[0]


# ---------------------------------------------------------------- template wording

def template(category: str) -> dict:
    return next(t for t in DEFAULT_TEMPLATES if t["category"] == category)


def render(template_dict: dict, variables: dict):
    """The subject and the body as the candidate reads them (template markup removed)."""
    return (email_service.render(template_dict["subject"], variables),
            email_html.to_plain(email_service.render(template_dict["body"], variables)))


def render_html(template_dict: dict, variables: dict) -> str:
    return email_html.to_html(email_service.render(template_dict["body"], variables))


def interview_row(**overrides):
    values = dict(id="int_1", candidateId="CAND-1", candidateName="Priya Sharma", jobTitle="Blockchain Developer",
                  round="Technical Round 1", date="2026-08-11", time="17:00")
    values.update(overrides)
    return InterviewModel(**values)


def interview_vars(interview, mode="G Meet", link="https://meet.google.com/abc-defg-hij", location=""):
    return {**email_variables.base_variables("Priya Sharma", "Blockchain Developer"),
            **email_variables.interview_variables(interview, mode=mode, meeting_link=link, office_location=location)}


def test_interview_invitation_matches_the_reference_format():
    subject, body = render(template("Interview Invitation"), interview_vars(interview_row()))
    assert subject == "First Round Discussion | Blockchain Developer | August 11 2026 at 05:00 PM"
    assert body.startswith(
        "Dear Priya,\n\nGreetings from EncureIT Systems!!\n\n"
        "As per our discussion, we are pleased to invite you for the 1st Round of Interview for the position of "
        "Blockchain Developer.\n\n"
        "The interview is scheduled as follows:\n"
        "Date: Aug 11, 2026\n"
        "Time: 05:00 PM\n"
        "Mode: G Meet\n"
        "Joining Link: https://meet.google.com/abc-defg-hij\n\n"
        "We request you to confirm your availability by replying to this email")
    assert body.endswith(
        "We look forward to connecting with you and wish you all the best for the interview.\n\n"
        "Yogesh Adsul\nHR Generalist\n+91 8855 825 770\n"
        "Office No 1, 2nd Floor, Raghunath Building, Market yard, Gultekdi,\n"
        "Pune - 411037, (MH) INDIA\nwww.encureit.com")
    assert "{{" not in subject + body


def test_subject_changes_with_the_position_and_round():
    variables = interview_vars(interview_row(round="Technical Round 2", date="2026-12-01", time="09:05"))
    variables["job_title"] = "Data Analyst"
    subject, body = render(template("Interview Invitation"), variables)
    assert subject == "Second Round Discussion | Data Analyst | December 1 2026 at 09:05 AM"
    assert "2nd Round of Interview for the position of Data Analyst." in body


def test_in_person_interview_shows_the_location_not_an_empty_link():
    variables = interview_vars(interview_row(), mode="In-Person", link="", location="Pune office, Gultekdi")
    body = render(template("Interview Invitation"), variables)[1]
    assert "Mode: In-Person\nLocation: Pune office, Gultekdi" in body and "Joining Link" not in body


def test_offer_email_matches_the_reference_format():
    variables = {**email_variables.base_variables("Vinay Kekan", "Blockchain Developer"),
                 **email_variables.offer_variables(None, joining_date="2026-09-09", valid_till="2026-09-09",
                                                   annual_ctc=204000)}
    subject, body = render(template("Offer Letter"), variables)
    assert subject == "Offer Letter | Vinay Kekan | EncureIT Systems Pvt Ltd."
    assert body.startswith("Dear Vinay,\n\nCongratulations on receiving an offer from EncureIT Systems Pvt Ltd.!\n\n"
                           "Please find your offer letter attached. The detailed appointment letter will be provided "
                           "on your joining date.\n\n")
    assert "we look forward to welcoming you on 9th September 2026.\n\n" in body
    assert "by tomorrow EOD." in body
    assert body.endswith("Yogesh Adsul,\nHR Generalist\n+91 8855825770\nEncureIT Systems Pvt Ltd,\n"
                         "Pune - 411037, (MH) INDIA\nwww.encureit.com")


def test_rejection_email_matches_the_reference_format(monkeypatch):
    monkeypatch.setattr(email_variables.config, "COMPANY_NAME", "EncureIT Systems Pvt Ltd")
    variables = email_variables.base_variables("Aditi Jadhav", "Marketing Manager")
    subject, body = render(template("Rejection Email"), variables)
    assert subject == "Update on Your Application – EncureIT Systems Pvt Ltd"
    assert body.startswith("Dear Aditi Jadhav,\n\nThank you for your interest in the Marketing Manager position at "
                           "EncureIT Systems Pvt Ltd and for taking the time to participate in our recruitment process.")
    assert "we will not be proceeding with your application for this position at this time." in body
    assert "\n\nRegards,\n\nYogesh Adsul,\nHR Generalist\n+91 8855825770\nEncureIT Systems Pvt Ltd,\n" in body


def test_every_placeholder_in_the_templates_has_a_value_to_fill_it():
    base = set(email_variables.base_variables("A B", "t"))
    offer = set(email_variables.offer_variables(None))
    interview = set(email_variables.interview_variables(interview_row()))
    available = {"Interview Invitation": base | interview, "Offer Letter": base | offer,
                 "Rejection Email": base, "Welcome Email": base}
    for t in DEFAULT_TEMPLATES:
        used = set(re.findall(r"\{\{\s*(\w+)\s*\}\}", t["subject"] + t["body"]))
        assert used <= available[t["category"]], (t["category"], used - available[t["category"]])
        assert used <= set(t["variables"]) | {"candidate_first_name"}, t["category"]


# ---------------------------------------------------------------- sending

@pytest.fixture()
def engine():
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    session = sessionmaker(bind=engine)()
    for t in DEFAULT_TEMPLATES:
        session.add(EmailTemplateModel(id=t["id"], name=t["name"], category=t["category"], subject=t["subject"],
                                       body=t["body"], variables=t["variables"]))
    session.add(CandidateModel(id="CAND-0001", candidateId="CAND-0001", firstName="Priya", lastName="Sharma",
                               email="priya@example.com", phone="9321459042"))
    session.add(CandidateModel(id="CAND-0002", candidateId="CAND-0002", firstName="Rohan", lastName="Mehta",
                               email="rohan@example.com", phone="+91 98765 43210"))
    session.flush()
    session.add(ApplicationModel(id="APP-1", applicationId="APP-1", candidateId="CAND-0001",
                                 appliedRole="Blockchain Developer", department="Engineering"))
    session.add(ApplicationModel(id="APP-2", applicationId="APP-2", candidateId="CAND-0002",
                                 appliedRole="Data Analyst", department="Analytics"))
    session.commit()
    yield session
    session.close()


@pytest.fixture()
def sent(monkeypatch):
    calls = []
    monkeypatch.setattr(email_service, "is_configured", lambda: True)

    def record(to_email, subject, body, attachments=None):
        calls.append({"to": to_email, "subject": subject, "body": body, "attachments": list(attachments or [])})
        return True

    monkeypatch.setattr(email_service, "send_email", record)
    return calls


@pytest.fixture()
def client(db):
    app = FastAPI()
    app.include_router(emails_router.router, prefix="/api")
    app.include_router(offers_router.router, prefix="/api")
    app.dependency_overrides[database.get_db] = lambda: db
    return TestClient(app)


def details(**overrides):
    today = datetime.date.today()
    values = {"annualCtc": 204000, "joiningDate": (today + datetime.timedelta(days=20)).isoformat(),
              "validTill": (today + datetime.timedelta(days=10)).isoformat()}
    values.update(overrides)
    return values


def test_recipients_carry_the_profile_phone_and_the_formatted_variables(db):
    recipients = {r["id"]: r for r in manual.list_recipients(db)["recipients"]}
    priya = recipients["CAND-0001"]
    assert priya["phone"] == "9321459042" and priya["jobTitle"] == "Blockchain Developer"
    assert priya["offerDefaults"] == {"annualCtc": None, "joiningDate": ""}  # nothing saved, nothing invented
    assert priya["variables"]["candidate_first_name"] == "Priya"


def test_offer_defaults_come_from_the_saved_offer_only(db):
    from models.offer import OfferModel
    db.add(OfferModel(id="OFF-1", candidateId="CAND-0002", candidateName="Rohan Mehta", jobTitle="Data Analyst",
                      offeredCTC=600000, joiningDate="2026-11-02", createdAt="2026-10-15T10:00:00+00:00"))
    db.commit()
    rohan = next(r for r in manual.list_recipients(db)["recipients"] if r["id"] == "CAND-0002")
    assert rohan["offerDefaults"] == {"annualCtc": 600000, "joiningDate": "2026-11-02"}


def test_manual_offer_email_attaches_that_candidates_letter_and_uses_hr_edited_values(db, sent):
    edited = details(joiningDate="2027-02-03", validTill="2027-01-20", reportingManager="Ms. Neha Rao")
    result = manual.send_manual_email(
        db, "CAND-0002", "Offer Letter | {{candidate_name}} | EncureIT Systems Pvt Ltd.",
        "Dear {{candidate_first_name}}, we look forward to welcoming you on {{joining_date}}.",
        template_id="temp-002", offer_letter=edited)

    assert len(sent) == 1 and sent[0]["to"] == "rohan@example.com"
    assert sent[0]["subject"] == "Offer Letter | Rohan Mehta | EncureIT Systems Pvt Ltd."
    assert sent[0]["body"] == "Dear Rohan, we look forward to welcoming you on 3rd February 2027."
    (filename, content, mime), = sent[0]["attachments"]
    assert filename == "Offer_Letter_Rohan_Mehta.pdf" and mime == "application/pdf"
    first = pdf_pages(content)[0]
    assert "Rohan Mehta Mobile No.: +91- 9876543210 rohan@example.com Dear Rohan," in first
    assert "appointed to the position of “Data Analyst”" in first
    assert "join the company on 3rd February 2027, i.e. Wednesday." in first
    assert "The offer stands valid till 20th January 2027 only." in first
    assert "report directly to Ms. Neha Rao." in first
    assert formatting.date_long(datetime.date.today()) in first
    assert result["attachments"] == ["Offer_Letter_Rohan_Mehta.pdf"]


@pytest.mark.parametrize("override,missing", [
    ({"annualCtc": None}, "annual CTC"),
    ({"joiningDate": ""}, "joining date"),
    ({"validTill": None}, "offer valid till date"),
])
def test_manual_offer_email_is_refused_when_a_detail_is_missing(db, sent, override, missing):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as err:
        manual.send_manual_email(db, "CAND-0001", "Offer", "Body", template_id="temp-002",
                                 offer_letter=details(**override))
    assert err.value.status_code == 400 and missing in err.value.detail
    assert sent == []


def test_manual_offer_email_without_any_details_is_refused(db, sent):
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as err:
        manual.send_manual_email(db, "CAND-0001", "Offer", "Body", template_id="temp-002")
    assert err.value.status_code == 400
    assert sent == []


def test_send_route_passes_the_offer_details_through(client, sent):
    response = client.post("/api/emails/send", json={
        "candidateId": "CAND-0001", "subject": "Offer", "body": "Body", "templateId": "temp-002",
        "offerLetter": details(reportingManager="")})
    assert response.status_code == 200 and response.json()["attachments"] == ["Offer_Letter_Priya_Sharma.pdf"]
    assert sent[0]["attachments"][0][1].startswith(b"%PDF-1.4")


def test_preview_route_returns_the_pdf_without_sending(client, sent):
    response = client.post("/api/emails/offer-letter/preview", json={
        "candidateId": "CAND-0001", "offerLetter": details(annualCtc=300000)})
    assert response.status_code == 200 and response.headers["content-type"] == "application/pdf"
    assert "Rs. 25,000/- (Twenty Five Thousand Only) i.e. Rs. 3 LPA." in pdf_pages(response.content)[0]
    assert sent == []


def test_preview_route_explains_what_is_missing(client):
    response = client.post("/api/emails/offer-letter/preview", json={
        "candidateId": "CAND-0001", "offerLetter": details(validTill=None)})
    assert response.status_code == 400 and "offer valid till date" in response.json()["detail"]
    assert client.post("/api/emails/offer-letter/preview", json={
        "candidateId": "NOPE", "offerLetter": details()}).status_code == 404


def test_the_pdf_really_is_an_attachment_of_the_message(db, sent):
    manual.send_manual_email(db, "CAND-0001", "Offer", "Body", template_id="temp-002", offer_letter=details())
    filename, content, mime = sent[0]["attachments"][0]
    message = email_service._build_message("priya@example.com", "Offer", "Body", "hr@example.com",
                                           [(filename, content, mime)])
    (part,) = list(message.iter_attachments())
    assert part.get_content_type() == "application/pdf" and part.get_filename() == "Offer_Letter_Priya_Sharma.pdf"
    assert part.get_content() == content


def test_automatic_offer_email_uses_what_hr_entered_and_never_a_default(client, db, sent):
    from models.job import JobModel  # noqa: F401
    payload = {"candidateId": "CAND-0001", "jobId": "JOB-1", "applicationId": "APP-1", "status": "Draft"}

    # CTC, joining date and valid-till all given -> email with the letter.
    given = {**payload, "offeredCTC": 204000, "joiningDate": "2099-09-11", "expiryDate": "2099-09-10",
             "reportingManager": "Mr. Ashish Jain"}
    assert client.post("/api/offers", json=given).status_code == 201
    assert len(sent) == 1 and sent[0]["to"] == "priya@example.com"
    assert sent[0]["subject"] == "Offer Letter | Priya Sharma | EncureIT Systems Pvt Ltd."
    assert "welcoming you on 11th September 2099." in email_html.to_plain(sent[0]["body"])
    (filename, content, _mime), = sent[0]["attachments"]
    assert filename == "Offer_Letter_Priya_Sharma.pdf"
    first = pdf_pages(content)[0]
    assert "Rs. 17,000/- (Seventeen Thousand Only) i.e. Rs. 2.04 LPA." in first
    assert "The offer stands valid till 10th September 2099 only." in first and "Mr. Ashish Jain" in first

    # Valid-till left out, or CTC left out (the offers API would invent one) -> no email, no letter.
    sent.clear()
    assert client.post("/api/offers", json={**given, "expiryDate": None}).status_code == 201
    assert client.post("/api/offers", json={k: v for k, v in given.items() if k != "offeredCTC"}).status_code == 201
    assert sent == []


def test_automatic_offer_email_respects_its_switch(client, db, sent):
    triggers.set_enabled(db, "offer_generated", False)
    given = {"candidateId": "CAND-0001", "jobId": "JOB-1", "offeredCTC": 204000, "joiningDate": "2099-09-11",
             "expiryDate": "2099-09-10"}
    assert client.post("/api/offers", json=given).status_code == 201
    assert sent == []


def test_automatic_interview_email_uses_the_new_format(db, sent):
    interview = interview_row(candidateId="CAND-0001", meetingLink="https://meet.google.com/abc-defg-hij")
    db.add(interview)
    db.commit()
    assert automated.notify_interview_scheduled(db, interview, {"type": "Online", "platform": "Google Meet"}) is True
    assert sent[0]["subject"] == "First Round Discussion | Blockchain Developer | August 11 2026 at 05:00 PM"
    plain = email_html.to_plain(sent[0]["body"])
    assert "Mode: G Meet\nJoining Link: https://meet.google.com/abc-defg-hij" in plain
    assert plain.startswith("Dear Priya,\n\nGreetings from EncureIT Systems!!")


def test_automatic_rejection_email_uses_the_new_format(db, sent):
    application = db.query(ApplicationModel).filter_by(id="APP-1").one()
    assert automated.notify_candidate_rejected(db, application) is True
    assert sent[0]["subject"].startswith("Update on Your Application – ")
    assert "Thank you for your interest in the Blockchain Developer position at" in sent[0]["body"]


def test_built_in_fallback_text_is_the_new_wording_too(db, sent):
    db.query(EmailTemplateModel).delete()
    db.commit()
    interview = interview_row(candidateId="CAND-0001", meetingLink="https://meet.google.com/abc-defg-hij")
    db.add(interview)
    db.commit()
    automated.notify_interview_scheduled(db, interview, {"type": "Online", "platform": "Google Meet"})
    assert sent[0]["subject"] == "First Round Discussion | Blockchain Developer | August 11 2026 at 05:00 PM"


# ---------------------------------------------------------------- the HTML email (formatting + logo)

def test_interview_html_has_the_reference_formatting():
    page = render_html(template("Interview Invitation"), interview_vars(interview_row()))
    assert "<strong><em>Greetings from EncureIT Systems!!</em></strong>" in page
    assert "<strong>Blockchain Developer.</strong>" in page
    assert "<strong>The interview is scheduled as follows:</strong>" in page
    assert "<strong>Date:</strong> Aug 11, 2026" in page and "<strong>Time:</strong> 05:00 PM" in page
    assert "<strong>Mode:</strong> G Meet" in page
    assert '<strong>Joining Link: <a href="https://meet.google.com/abc-defg-hij"' in page
    assert ">Interview Link</a></strong>" in page
    assert "1<sup>st</sup> Round of Interview" in page
    assert "<strong>Yogesh Adsul</strong><br>HR Generalist<br>+91 8855 825 770" in page
    assert "2nd Floor" in page and "<sup>nd</sup>" not in page  # only dates and rounds are raised
    assert '<a href="http://www.encureit.com"' in page
    assert page.endswith("</div>") and 'src="cid:company_logo"' in page


def test_offer_html_has_the_reference_formatting():
    variables = {**email_variables.base_variables("Vinay Kekan", "Blockchain Developer"),
                 **email_variables.offer_variables(None, joining_date="2026-09-09")}
    page = render_html(template("Offer Letter"), variables)
    assert "<strong>Congratulations on receiving an offer from EncureIT Systems Pvt Ltd.!</strong>" in page
    assert "<strong>9<sup>th</sup> September 2026.</strong>" in page
    assert '<a href="tel:+918855825770"' in page and "+91 8855825770</a>" in page
    assert 'src="cid:company_logo"' in page


def test_markup_is_escaped_and_removed_from_plain_text():
    assert "<script>" not in email_html.to_html("Hi <script>alert(1)</script> **x**")
    assert email_html.to_plain("***a*** **b** [[Link|https://x.y/z]] [[+91 1|tel:+911]]") == "a b https://x.y/z +91 1"


def test_message_has_plain_html_inline_logo_and_the_pdf():
    from email import message_from_bytes, policy
    body = "Dear **Priya**,\n\n[[Interview Link|https://meet.google.com/abc-defg-hij]]"
    message = email_service._build_message("priya@example.com", "S", body, "hr@example.com",
                                           [("Offer_Letter_Priya.pdf", b"%PDF-1.4 x", "application/pdf")])
    parsed = message_from_bytes(message.as_bytes(), policy=policy.default)
    kinds = [part.get_content_type() for part in parsed.walk()]
    assert kinds == ["multipart/mixed", "multipart/alternative", "text/plain", "multipart/related",
                     "text/html", "image/png", "application/pdf"]
    assert parsed.get_body(("plain",)).get_content().strip() == "Dear Priya,\n\nhttps://meet.google.com/abc-defg-hij"
    logo = next(part for part in parsed.walk() if part.get_content_type() == "image/png")
    assert logo["Content-ID"] == "<company_logo>" and logo.get_content().startswith(b"\x89PNG")
    assert "<strong>Priya</strong>" in parsed.get_body(("html",)).get_content()
    pdf = next(parsed.iter_attachments())
    assert pdf.get_filename() == "Offer_Letter_Priya.pdf"
