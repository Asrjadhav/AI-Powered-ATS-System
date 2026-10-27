"""
A candidate who applies again with the same email (for another job) is re-used. The application
form sends the status "Applied", which the application_stage enum does not accept; it must be
stored as the canonical "New" (this used to fail with a 500).

Runs on in-memory SQLite with the real `database` module replaced by a stand-in.
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

import database
import models  # noqa: F401  (registers every table on Base)
import services.candidate_service as candidate_service
from models.candidate import CandidateModel
from models.job import JobModel
from schemas.candidate import CandidateCreate


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(JobModel(id="JOB-0004", jobId="JOB-0004", title="Software Engineer - Fresher"))
    session.add(JobModel(id="JOB-0005", jobId="JOB-0005", title="QA Engineer"))
    session.add(CandidateModel(id="CAND-0016", candidateId="CAND-0016", firstName="Asha", lastName="K",
                               email="asha@gmail.com", status="New"))
    session.commit()
    yield session
    session.close()
    engine.dispose()


def test_reapplying_with_status_applied_is_stored_as_new(db, monkeypatch):
    # Only the profile update is under test here, not the application that follows it.
    import services.application_service as application_service
    monkeypatch.setattr(application_service, "create_application", lambda *args, **kwargs: None)
    payload = CandidateCreate(firstName="Asha", lastName="", email="asha@gmail.com", status="Applied",
                              currentRole="Not specified")
    result = candidate_service.create_candidate(db, payload, target_job_id="JOB-0004")
    assert result.id == "CAND-0016"
    assert db.query(CandidateModel).filter_by(id="CAND-0016").one().status == "New"


def test_a_job_saved_only_on_the_profile_does_not_block_applying_and_the_application_is_created(db, monkeypatch):
    import services.application_service as application_service
    from models.application import ApplicationModel
    db.query(CandidateModel).filter_by(id="CAND-0016").one().jobId = "JOB-0004"  # left by a failed application
    db.commit()
    created = []
    monkeypatch.setattr(application_service, "create_application", lambda db_, app_in: created.append(app_in))
    payload = CandidateCreate(firstName="Asha", lastName="", email="asha@gmail.com", status="Applied")
    candidate_service.create_candidate(db, payload, target_job_id="JOB-0004")
    assert [a.jobId for a in created] == ["JOB-0004"]


def test_applying_again_for_a_job_with_a_recorded_application_is_refused(db):
    from fastapi import HTTPException
    from models.application import ApplicationModel
    db.add(ApplicationModel(id="A1", applicationId="A1", candidateId="CAND-0016", jobId="JOB-0004"))
    db.commit()
    payload = CandidateCreate(firstName="Asha", lastName="", email="asha@gmail.com", status="Applied")
    with pytest.raises(HTTPException) as err:
        candidate_service.create_candidate(db, payload, target_job_id="JOB-0004")
    assert err.value.status_code == 409


def test_a_failed_application_is_reported_not_swallowed(db, monkeypatch):
    from fastapi import HTTPException
    import services.application_service as application_service

    def broken(db_, app_in):
        raise RuntimeError("boom")

    monkeypatch.setattr(application_service, "create_application", broken)
    payload = CandidateCreate(firstName="Asha", lastName="", email="asha@gmail.com", status="Applied")
    with pytest.raises(HTTPException) as err:
        candidate_service.create_candidate(db, payload, target_job_id="JOB-0004")
    assert err.value.status_code == 500 and "could not be recorded" in err.value.detail

    new_person = CandidateCreate(firstName="New", lastName="Person", email="new@example.com", status="Applied")
    with pytest.raises(HTTPException) as err:
        candidate_service.create_candidate(db, new_person, target_job_id="JOB-0004")
    assert err.value.status_code == 500
