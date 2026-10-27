"""
Automation Triggers: the four automatic emails and their on/off switches
(services/email_trigger_service.py, services/automated_email_service.py, routers/offers.py).

Runs on in-memory SQLite with the real `database` module replaced by a stand-in and the SMTP
sender replaced by a recorder, so no real database, credentials or email are used.
"""
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
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import database
import models  # noqa: F401  (registers every table on Base)
import seed_email_templates
import services.automated_email_service as automated
import services.email_service as email_service
import services.email_trigger_service as triggers
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.email_template import EmailTemplateModel
from models.email_trigger import EmailTriggerModel
from models.interview import InterviewModel
from models.offer import OfferModel
from routers import offers as offers_router


@pytest.fixture()
def engine():
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    session = sessionmaker(bind=engine)()
    for t in seed_email_templates.DEFAULT_TEMPLATES:
        session.add(EmailTemplateModel(id=t["id"], name=t["name"], category=t["category"], subject=t["subject"],
                                       body=t["body"], variables=t["variables"]))
    session.add(CandidateModel(id="CAND-0001", candidateId="CAND-0001", firstName="Aditi", lastName="Jadhav",
                               email="aditi@example.com"))
    session.flush()
    session.add(ApplicationModel(id="APP-1", applicationId="APP-1", candidateId="CAND-0001",
                                 appliedRole="Marketing Manager", department="Marketing"))
    session.add(InterviewModel(id="int_1", candidateId="CAND-0001", candidateName="Aditi Jadhav",
                               jobTitle="Marketing Manager", date="2026-10-20", time="14:00"))
    session.add(OfferModel(id="OFF-1", candidateId="CAND-0001", candidateName="Aditi Jadhav",
                           jobTitle="Marketing Manager", department="Marketing", status="Pending",
                           createdAt="2026-10-15T10:00:00+00:00", updatedAt="2026-10-15T10:00:00+00:00"))
    session.commit()
    yield session
    session.close()


@pytest.fixture()
def sent(monkeypatch):
    calls = []

    def record(to_email, subject, body, attachments=None):
        calls.append({"to": to_email, "subject": subject, "body": body, "attachments": list(attachments or [])})
        return True

    monkeypatch.setattr(email_service, "send_email", record)
    return calls


# ---- the switches ----

def test_defaults_existing_three_on_and_welcome_off(db):
    state = {t["event"]: t["enabled"] for t in triggers.list_triggers(db)}
    assert state == {"interview_scheduled": True, "offer_generated": True,
                     "candidate_rejected": True, "offer_accepted": False}


def test_triggers_are_exactly_the_four_kept_templates(db):
    listed = triggers.list_triggers(db)
    assert [t["templateName"] for t in listed] == [
        "Technical Interview Invitation", "Official Job Offer Letter",
        "Candidate Application Rejection", "Welcome Email"]


def test_switching_persists_and_is_read_back(db):
    triggers.set_enabled(db, "interview_scheduled", False)
    triggers.set_enabled(db, "offer_accepted", True)
    assert triggers.is_enabled(db, "interview_scheduled") is False
    assert triggers.is_enabled(db, "offer_accepted") is True
    triggers.set_enabled(db, "interview_scheduled", True)
    assert triggers.is_enabled(db, "interview_scheduled") is True
    assert db.query(EmailTriggerModel).count() == 2  # updated in place, not duplicated


def test_unknown_trigger_is_refused(db):
    with pytest.raises(HTTPException) as err:
        triggers.set_enabled(db, "no_such_event", True)
    assert err.value.status_code == 404
    assert triggers.is_enabled(db, "no_such_event") is False


def test_missing_table_falls_back_to_defaults_and_never_blocks_sending(db, engine):
    EmailTriggerModel.__table__.drop(engine)
    assert triggers.is_enabled(db, "interview_scheduled") is True
    assert triggers.is_enabled(db, "offer_accepted") is False
    assert [t["enabled"] for t in triggers.list_triggers(db)] == [True, True, True, False]


# ---- each switch controls its email ----

def test_rejection_email_follows_its_switch(db, sent):
    application = db.query(ApplicationModel).one()
    triggers.set_enabled(db, "candidate_rejected", False)
    assert automated.notify_candidate_rejected(db, application) is False
    assert sent == []
    triggers.set_enabled(db, "candidate_rejected", True)
    assert automated.notify_candidate_rejected(db, application) is True
    assert len(sent) == 1 and sent[0]["to"] == "aditi@example.com"
    assert "will not be proceeding with your application" in sent[0]["body"]


def test_offer_email_follows_its_switch_and_keeps_the_pdf(db, sent):
    triggers.set_enabled(db, "offer_generated", False)
    assert automated.notify_offer_generated(db, "OFF-1") is False and sent == []
    triggers.set_enabled(db, "offer_generated", True)
    letter = {"annualCtc": 204000, "joiningDate": "2026-11-09", "validTill": "2099-01-01"}
    assert automated.notify_offer_generated(db, "OFF-1", letter=letter) is True
    (filename, content, _mime), = sent[0]["attachments"]
    assert filename == "Offer_Letter_Aditi_Jadhav.pdf" and content.startswith(b"%PDF-1.4")
    assert "9th November 2026" in sent[0]["body"]


def test_interview_email_follows_its_switch(db, sent):
    interview = db.query(InterviewModel).one()
    triggers.set_enabled(db, "interview_scheduled", False)
    assert automated.notify_interview_scheduled(db, interview, {"type": "Offline", "location": "HQ"}) is False
    assert sent == []
    triggers.set_enabled(db, "interview_scheduled", True)
    assert automated.notify_interview_scheduled(db, interview, {"type": "Offline", "location": "HQ"}) is True
    assert "In-Person" in sent[0]["body"] and "Oct 20, 2026" in sent[0]["body"]


def test_welcome_email_is_off_by_default_then_sends_the_welcome_template(db, sent):
    assert automated.notify_offer_accepted(db, "OFF-1") is False and sent == []
    triggers.set_enabled(db, "offer_accepted", True)
    assert automated.notify_offer_accepted(db, "OFF-1") is True
    assert sent[0]["to"] == "aditi@example.com"
    assert sent[0]["subject"].startswith("Welcome to") and "Aditi Jadhav" in sent[0]["subject"]
    assert "Marketing Manager" in sent[0]["body"] and "Marketing" in sent[0]["body"]
    assert sent[0]["attachments"] == []


# ---- the offers routes: Welcome Email fires on the change INTO Accepted ----

@pytest.fixture()
def client(db):
    app = FastAPI()
    app.include_router(offers_router.router, prefix="/api")
    app.dependency_overrides[database.get_db] = lambda: db
    return TestClient(app)


def test_accepting_an_offer_sends_one_welcome_email(client, db, sent):
    triggers.set_enabled(db, "offer_accepted", True)
    assert client.patch("/api/offers/OFF-1", json={"status": "Accepted"}).status_code == 200
    assert len(sent) == 1 and sent[0]["subject"].startswith("Welcome to")
    # Saving it again while it is already Accepted must not send a second welcome.
    assert client.patch("/api/offers/OFF-1", json={"status": "Accepted"}).status_code == 200
    assert client.patch("/api/offers/OFF-1", json={"joiningDate": "2026-11-01"}).status_code == 200
    assert len(sent) == 1


def test_welcome_email_is_not_sent_when_its_switch_is_off(client, db, sent):
    assert client.patch("/api/offers/OFF-1", json={"status": "Accepted"}).status_code == 200
    assert sent == []


def test_other_status_changes_send_no_welcome(client, db, sent):
    triggers.set_enabled(db, "offer_accepted", True)
    assert client.patch("/api/offers/OFF-1", json={"status": "Rejected"}).status_code == 200
    assert sent == []


def test_status_endpoint_and_put_also_send_the_welcome_email(client, db, sent):
    triggers.set_enabled(db, "offer_accepted", True)
    assert client.patch("/api/offers/OFF-1/status", json={"status": "Accepted"}).status_code == 200
    assert len(sent) == 1
    db.query(OfferModel).one().status = "Pending"
    db.commit()
    assert client.put("/api/offers/OFF-1", json={"status": "Accepted"}).status_code == 200
    assert len(sent) == 2
