"""
Application Source chosen when adding a candidate (Manual Form Entry and Upload CV): it is saved on the
candidate AND on the application, and read back by the candidate and application lists.

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
from models.job import JobModel
from routers import applications as applications_router
from routers import candidates as candidates_router

SOURCES = ["LinkedIn", "Naukri", "Career Website", "Referral", "External Link"]


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(email_service, "send_email", lambda *a, **k: True)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(JobModel(id="JOB-1", jobId="JOB-1", title="Software Engineer", department="Eng", workMode="Hybrid"))
    session.add(JobModel(id="JOB-2", jobId="JOB-2", title="QA Engineer", department="Eng", workMode="Hybrid"))
    session.commit()
    app = FastAPI()
    app.include_router(candidates_router.router, prefix="/api")
    app.include_router(applications_router.router, prefix="/api")
    app.dependency_overrides[database.get_db] = lambda: session
    yield TestClient(app)
    session.close()
    engine.dispose()


def body(n, **extra):
    data = {"firstName": f"Cand{n}", "lastName": "Test", "email": f"cand{n}@example.com",
            "experienceLevel": "Fresher", "totalExperience": "Fresher", "keySkills": "Python"}
    data.update(extra)
    return data


@pytest.mark.parametrize("source", SOURCES)
def test_the_chosen_source_is_saved_on_the_candidate_and_the_application(client, source):
    created = client.post("/api/candidates", params={"jobId": "JOB-1"}, json=body(source, source=source))
    assert created.status_code == 201 and created.json()["source"] == source
    assert client.get(f"/api/candidates/{created.json()['id']}").json()["source"] == source
    assert [c["source"] for c in client.get("/api/candidates").json()] == [source]
    applications = client.get("/api/applications").json()
    assert [a["source"] for a in applications] == [source]  # not the "Career Portal" default


def test_a_candidate_added_without_a_source_keeps_the_existing_defaults(client):
    created = client.post("/api/candidates", params={"jobId": "JOB-1"}, json=body("none"))
    assert created.status_code == 201
    assert [a["source"] for a in client.get("/api/applications").json()] == ["Career Portal"]


def test_a_returning_candidate_applying_again_saves_the_new_source_on_the_new_application(client):
    client.post("/api/candidates", params={"jobId": "JOB-1"}, json=body("same", source="LinkedIn"))
    again = client.post("/api/candidates", params={"jobId": "JOB-2"}, json=body("same", source="Referral"))
    assert again.status_code == 201
    by_job = {a["jobId"]: a["source"] for a in client.get("/api/applications").json()}
    assert by_job == {"JOB-1": "LinkedIn", "JOB-2": "Referral"}


def test_the_source_can_be_edited_on_the_candidate_later(client):
    created = client.post("/api/candidates", params={"jobId": "JOB-1"}, json=body("edit", source="LinkedIn")).json()
    edited = client.patch(f"/api/candidates/{created['id']}", json={"source": "Naukri"})
    assert edited.status_code == 200 and edited.json()["source"] == "Naukri"
    assert client.get(f"/api/candidates/{created['id']}").json()["source"] == "Naukri"
