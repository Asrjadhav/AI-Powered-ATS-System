"""
Insights Hiring Funnel: the Job Position filter (GET /api/insights?position=...).

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
from fastapi import FastAPI
from fastapi.testclient import TestClient

import database
import models  # noqa: F401  (registers every table on Base)
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.job import JobModel
from routers import insights as insights_router

# job -> (title, department, [application stages])
JOBS = {
    "J-DEV": ("Software Engineer", "Engineering", ["New", "Shortlisted", "Interviewing", "Offer", "Hired", "Rejected"]),
    "J-DEV2": ("  software   engineer ", "Engineering", ["New"]),          # same position, different spacing / case
    "J-QA": ("QA Engineer", "Engineering", ["New", "Shortlisted"]),
    "J-HR": ("HR Executive", "People", ["Rejected", "New", "New"]),
    "J-EMPTY": ("Data Analyst", "Analytics", []),                           # a position nobody applied to
}


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    n = 0
    for job_id, (title, department, stages) in JOBS.items():
        session.add(JobModel(id=job_id, jobId=job_id, title=title, department=department))
        session.flush()
        for stage in stages:
            n += 1
            session.add(CandidateModel(id=f"C{n}", candidateId=f"C{n}", email=f"c{n}@example.com", source="LinkedIn"))
            session.flush()
            session.add(ApplicationModel(id=f"A{n}", applicationId=f"A{n}", candidateId=f"C{n}", jobId=job_id,
                                         status=stage, atsScore=70, department=department))
    session.commit()
    app = FastAPI()
    app.include_router(insights_router.router, prefix="/api")
    app.dependency_overrides[database.get_db] = lambda: session
    yield TestClient(app)
    session.close()
    engine.dispose()


def funnel(response):
    return {stage["key"]: stage["count"] for stage in response.json()["funnel"]}


def test_all_positions_is_the_default_and_matches_no_filter(client):
    everything = client.get("/api/insights").json()
    assert everything["total"] == 12
    for value in ("All Positions", "all", ""):
        assert client.get("/api/insights", params={"position": value}).json()["total"] == 12


def test_one_position_shows_only_its_applications(client):
    response = client.get("/api/insights", params={"position": "QA Engineer"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert funnel(response) == {"applications": 2, "shortlisted": 1, "interviewing": 0, "offer": 0, "hired": 0}
    assert body["funnel"][1]["conversionFromPrevious"] == 50  # 1 shortlisted of 2


def test_a_position_with_several_funnel_stages(client):
    response = client.get("/api/insights", params={"position": "HR Executive"})
    body = response.json()
    assert body["total"] == 3 and body["rejectedCount"] == 1 and body["newCount"] == 2
    assert funnel(response) == {"applications": 3, "shortlisted": 0, "interviewing": 0, "offer": 0, "hired": 0}


def test_positions_that_differ_only_in_case_or_spacing_are_one_position(client):
    response = client.get("/api/insights", params={"position": "Software Engineer"})
    body = response.json()
    assert body["total"] == 7  # 6 on one opening + 1 on the other opening with the same title
    assert funnel(response) == {"applications": 7, "shortlisted": 4, "interviewing": 3, "offer": 2, "hired": 1}
    assert client.get("/api/insights", params={"position": "SOFTWARE ENGINEER"}).json()["total"] == 7


def test_full_pipeline_numbers_follow_the_position(client):
    body = client.get("/api/insights", params={"position": "Software Engineer"}).json()
    assert body["hiredCount"] == 1 and body["total"] == 7  # the page shows 1 of 7 as full pipeline conversion


def test_a_position_with_no_applications_gives_an_empty_funnel_not_an_error(client):
    response = client.get("/api/insights", params={"position": "Data Analyst"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0 and body["hiredCount"] == 0
    assert [stage["count"] for stage in body["funnel"]] == [0, 0, 0, 0, 0]
    assert all(stage["conversionFromPrevious"] in (0, 100) for stage in body["funnel"])


def test_an_unknown_position_gives_an_empty_funnel(client):
    body = client.get("/api/insights", params={"position": "Astronaut"}).json()
    assert body["total"] == 0


def test_position_and_department_work_together(client):
    both = client.get("/api/insights", params={"position": "QA Engineer", "department": "Engineering"}).json()
    assert both["total"] == 2
    mismatch = client.get("/api/insights", params={"position": "QA Engineer", "department": "People"}).json()
    assert mismatch["total"] == 0
    only_department = client.get("/api/insights", params={"department": "Engineering"}).json()
    assert only_department["total"] == 9  # 6 + 1 + 2


def test_the_position_filter_leaves_the_department_list_complete(client):
    body = client.get("/api/insights", params={"position": "QA Engineer"}).json()
    assert set(body["departments"]) == {"Engineering", "People"}  # departments that have applications
