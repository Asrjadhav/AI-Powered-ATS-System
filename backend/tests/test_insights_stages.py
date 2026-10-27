"""
Insights and dashboard figures use exactly the application stages:
New, Shortlisted, Interviewing, Offer, Hired and Rejected.

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
import services.insights_service as insights_service
import services.offer_service as offer_service
import services.stats_service as stats_service
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.job import JobModel
from models.offer import OfferModel
from schemas.insights import RecruitmentInsights
from services.application_stage import ApplicationStage, to_db_stage

STAGES = ["New", "New", "Shortlisted", "Interviewing", "Offer", "Hired", "Hired", "Rejected"]


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(JobModel(id="J1", jobId="J1", title="Developer", department="Engineering"))
    session.flush()
    for index, stage in enumerate(STAGES):
        cand_id = f"C{index}"
        session.add(CandidateModel(id=cand_id, candidateId=cand_id, email=f"{cand_id}@example.com", source="LinkedIn"))
        session.flush()
        session.add(ApplicationModel(id=f"A{index}", applicationId=f"A{index}", candidateId=cand_id, jobId="J1",
                                     status=stage, atsScore=80))
    session.commit()
    yield session
    session.close()
    engine.dispose()


def test_insights_counts_every_stage_by_its_own_name(db):
    result = insights_service.get_recruitment_insights(db)
    assert result["total"] == 8
    assert (result["newCount"], result["shortlistedCount"], result["interviewingCount"], result["offerCount"],
            result["hiredCount"], result["rejectedCount"]) == (2, 1, 1, 1, 2, 1)
    assert not {"appliedCount", "pendingEvalCount", "offeredCount", "interviewCount"} & set(result)
    RecruitmentInsights(**result)  # matches the response schema the API returns


def test_the_funnel_is_cumulative_and_uses_the_stage_names(db):
    funnel = {stage["key"]: stage for stage in insights_service.get_recruitment_insights(db)["funnel"]}
    assert [s["stage"] for s in funnel.values()] == ["Applications", "Shortlisted", "Interviewing", "Offer", "Hired"]
    assert funnel["applications"]["count"] == 8
    assert funnel["shortlisted"]["count"] == 5  # shortlisted + interviewing + offer + hired(2)
    assert funnel["interviewing"]["count"] == 4
    assert funnel["offer"]["count"] == 3
    assert funnel["hired"]["count"] == 2
    assert funnel["hired"]["conversionFromPrevious"] == 67  # 2 of the 3 who reached an offer


def test_rates_and_job_table_use_hired(db):
    result = insights_service.get_recruitment_insights(db)
    assert result["conversionRate"] == 62  # 5 of 8 went beyond New (62.5 rounds to 62)
    assert result["offerConversionRate"] == 67  # hired / (offer + hired)
    (job,) = result["jobPerformance"]
    assert job["hiringRate"] == 25  # 2 hired of 8 applications
    assert job["interviewRate"] == 12  # 1 of 8 (12.5 rounds to 12)


def test_dashboard_stats_have_a_real_hired_count(db):
    stats = stats_service.get_dashboard_stats(db)
    assert stats["hiredCount"] == 2 and stats["offerCount"] == 1
    assert "pendingReviews" not in stats and "offeredCount" not in stats


def test_hired_is_a_stage_and_old_names_are_translated():
    assert [s.value for s in ApplicationStage] == ["New", "Shortlisted", "Interviewing", "Rejected", "Offer", "Hired"]
    assert to_db_stage("Hired") == "Hired" and to_db_stage("joined") == "Hired" and to_db_stage("Accepted") == "Hired"
    assert to_db_stage("Offered") == "Offer" and to_db_stage("Applied") == "New" and to_db_stage("Screening") == "New"


def test_an_accepted_offer_makes_the_application_and_candidate_hired(db):
    db.add(OfferModel(id="OFF-1", candidateId="C0", applicationId="A0", jobId="J1", status="Pending",
                      createdAt="2026-10-15T10:00:00+00:00", updatedAt="2026-10-15T10:00:00+00:00"))
    db.commit()
    offer_service.update_offer_status(db, "OFF-1", "Accepted")
    application = db.query(ApplicationModel).filter_by(id="A0").one()
    candidate = db.query(CandidateModel).filter_by(id="C0").one()
    assert str(getattr(application.status, "value", application.status)) == "Hired"
    assert str(getattr(candidate.status, "value", candidate.status)) == "Hired"
