"""
Candidate Work Mode (Work from Office / Hybrid / Work from Home).

It is the candidate's own preference, stored on the candidate (candidates.preferredWorkMode), and is kept
apart from the job's work mode (jobs.workMode), which is never changed by it.

Runs on in-memory SQLite with the real `database` module replaced by a stand-in; Gemini and email are off.
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
from fastapi import FastAPI
from fastapi.testclient import TestClient

import database
import models  # noqa: F401  (registers every table on Base)
import services.email_service as email_service
from models.candidate import CandidateModel
from models.job import JobModel
from routers import candidates as candidates_router
from services import work_mode


@pytest.fixture()
def env(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(email_service, "send_email", lambda *a, **k: True)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    for job_id, mode in (("J-REMOTE", "Remote"), ("J-HYBRID", "Hybrid"), ("J-SITE", "On-site"), ("J-NONE", "")):
        session.add(JobModel(id=job_id, jobId=job_id, title=f"{job_id} role", workMode=mode, department="Eng"))
    session.commit()
    app = FastAPI()
    app.include_router(candidates_router.router, prefix="/api")
    app.dependency_overrides[database.get_db] = lambda: session
    yield TestClient(app), session
    session.close()
    engine.dispose()


def new_candidate(n, **extra):
    body = {"firstName": f"Cand{n}", "lastName": "Test", "email": f"cand{n}@example.com", "source": "Job Application Form",
            "experienceLevel": "Fresher", "totalExperience": "Fresher", "keySkills": "Python, SQL"}
    body.update(extra)
    return body


# ---- the helper rules

def test_options_follow_what_the_job_offers():
    assert work_mode.options_for_job("Remote") == ["Work from Home"]
    assert work_mode.options_for_job("On-site") == ["Work from Office"]
    for open_job in ("Hybrid", "", None, "Flexible"):
        assert work_mode.options_for_job(open_job) == ["Work from Office", "Hybrid", "Work from Home"]


def test_normalize_accepts_the_three_modes_in_any_case_and_empty():
    assert work_mode.normalize("work FROM home") == "Work from Home"
    assert work_mode.normalize("  Hybrid ") == "Hybrid"
    assert work_mode.normalize("") is None and work_mode.normalize(None) is None
    with pytest.raises(ValueError):
        work_mode.normalize("Remote")


# ---- create: fresher and experienced applications, manual entry, persistence

@pytest.mark.parametrize("level,extra", [
    ("Fresher", {"highestEducation": "B.E. / B.Tech", "specialization": "Computer Engineering", "totalExperience": "Fresher"}),
    ("Experienced", {"currentRole": "Developer", "currentCompany": "Acme", "totalExperience": "3 years", "experienceYears": 3}),
])
def test_a_candidate_is_saved_with_the_chosen_work_mode_and_it_is_returned(env, level, extra):
    client, _session = env
    body = new_candidate(level, experienceLevel=level, preferredWorkMode="Hybrid", **extra)
    created = client.post("/api/candidates", params={"jobId": "J-HYBRID"}, json=body)
    assert created.status_code == 201, created.text
    assert created.json()["preferredWorkMode"] == "Hybrid"
    fetched = client.get(f"/api/candidates/{created.json()['id']}").json()
    assert fetched["preferredWorkMode"] == "Hybrid"
    assert any(c["preferredWorkMode"] == "Hybrid" for c in client.get("/api/candidates").json())


def test_manual_entry_without_a_job_accepts_any_of_the_three(env):
    client, _session = env
    for n, mode in enumerate(("Work from Office", "Hybrid", "Work from Home"), start=10):
        response = client.post("/api/candidates", json=new_candidate(n, preferredWorkMode=mode))
        assert response.status_code == 201 and response.json()["preferredWorkMode"] == mode


def test_a_candidate_without_a_work_mode_is_still_saved_and_reads_back_empty(env):
    client, _session = env
    created = client.post("/api/candidates", params={"jobId": "J-HYBRID"}, json=new_candidate(20))
    assert created.status_code == 201 and created.json()["preferredWorkMode"] is None
    blank = client.post("/api/candidates", json=new_candidate(21, preferredWorkMode=""))
    assert blank.status_code == 201 and blank.json()["preferredWorkMode"] is None


def test_an_existing_record_with_no_value_still_reads_fine(env):
    client, session = env
    session.add(CandidateModel(id="OLD-1", candidateId="OLD-1", email="old@example.com", firstName="Old"))
    session.commit()
    body = client.get("/api/candidates/OLD-1").json()
    assert body["preferredWorkMode"] is None and body["firstName"] == "Old"


# ---- validation

def test_a_value_that_is_not_one_of_the_three_is_refused(env):
    client, _session = env
    response = client.post("/api/candidates", json=new_candidate(30, preferredWorkMode="Remote"))
    assert response.status_code == 422
    assert client.get("/api/candidates").json() == []  # nothing saved


@pytest.mark.parametrize("job_id,allowed,refused", [
    ("J-REMOTE", "Work from Home", "Work from Office"),
    ("J-SITE", "Work from Office", "Work from Home"),
])
def test_the_choice_must_be_one_the_job_offers(env, job_id, allowed, refused):
    client, _session = env
    ok = client.post("/api/candidates", params={"jobId": job_id}, json=new_candidate(f"ok-{job_id}", preferredWorkMode=allowed))
    assert ok.status_code == 201
    bad = client.post("/api/candidates", params={"jobId": job_id}, json=new_candidate(f"bad-{job_id}", preferredWorkMode=refused))
    assert bad.status_code == 400 and "not available" in bad.json()["detail"]


@pytest.mark.parametrize("job_id", ["J-NONE", "J-HYBRID"])
def test_a_hybrid_job_and_a_job_with_no_work_mode_accept_all_three(env, job_id):
    client, _session = env
    for n, mode in enumerate(work_mode.WORK_MODES, start=40):
        response = client.post("/api/candidates", params={"jobId": job_id}, json=new_candidate(f"{job_id}-{n}", preferredWorkMode=mode))
        assert response.status_code == 201, response.text


# ---- the job's own work mode is never touched

def test_the_candidates_choice_never_changes_the_job(env):
    client, session = env
    client.post("/api/candidates", params={"jobId": "J-HYBRID"}, json=new_candidate(50, preferredWorkMode="Work from Office"))
    assert session.query(JobModel).filter_by(id="J-HYBRID").one().workMode == "Hybrid"


# ---- editing

def test_the_work_mode_can_be_edited_and_cleared(env):
    client, _session = env
    created = client.post("/api/candidates", json=new_candidate(60, preferredWorkMode="Hybrid")).json()
    edited = client.patch(f"/api/candidates/{created['id']}", json={"preferredWorkMode": "Work from Home"})
    assert edited.status_code == 200 and edited.json()["preferredWorkMode"] == "Work from Home"
    assert client.get(f"/api/candidates/{created['id']}").json()["preferredWorkMode"] == "Work from Home"
    cleared = client.patch(f"/api/candidates/{created['id']}", json={"preferredWorkMode": ""})
    assert cleared.status_code == 200 and cleared.json()["preferredWorkMode"] is None
    assert client.patch(f"/api/candidates/{created['id']}", json={"preferredWorkMode": "Remote"}).status_code == 422


def test_editing_other_fields_keeps_the_work_mode(env):
    client, _session = env
    created = client.post("/api/candidates", json=new_candidate(61, preferredWorkMode="Hybrid")).json()
    client.patch(f"/api/candidates/{created['id']}", json={"hrNotes": "Strong profile"})
    assert client.get(f"/api/candidates/{created['id']}").json()["preferredWorkMode"] == "Hybrid"


# ---- duplicate prevention and a returning candidate

def test_a_returning_candidate_can_apply_to_another_job_with_a_new_choice_and_duplicates_are_still_refused(env):
    client, _session = env
    first = client.post("/api/candidates", params={"jobId": "J-HYBRID"}, json=new_candidate(70, preferredWorkMode="Hybrid"))
    assert first.status_code == 201
    second = client.post("/api/candidates", params={"jobId": "J-REMOTE"}, json=new_candidate(70, preferredWorkMode="Work from Home"))
    assert second.status_code == 201 and second.json()["preferredWorkMode"] == "Work from Home"
    duplicate = client.post("/api/candidates", params={"jobId": "J-REMOTE"}, json=new_candidate(70, preferredWorkMode="Work from Home"))
    assert duplicate.status_code == 409
    wrong = client.post("/api/candidates", params={"jobId": "J-SITE"}, json=new_candidate(70, preferredWorkMode="Work from Home"))
    assert wrong.status_code == 400
