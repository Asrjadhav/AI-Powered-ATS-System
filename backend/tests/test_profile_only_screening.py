"""
ATS score for a candidate added without a CV: it is calculated from the saved profile.
  - fresher: academic details + key skills
  - experienced: key skills + current role + current company

Runs on in-memory SQLite with the real `database` module replaced by a stand-in; Gemini is switched
off (the built-in scoring engine is used), and nothing is emailed.
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
import services.application_service as application_service
import services.email_service as email_service
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.job import JobModel


@pytest.fixture()
def db(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(email_service, "send_email", lambda *a, **k: True)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(JobModel(
        id="JOB-1", jobId="JOB-1", title="Software Engineer", department="Engineering",
        experienceLevel="Entry level", education="B.E. / B.Tech in Computer Engineering",
        description="Build web apps.", requirements=["Python", "SQL", "React", "Git"], preferredSkills=["Docker"]))
    session.commit()
    yield session
    session.close()
    engine.dispose()


def add(db, cand_id, **fields):
    db.add(CandidateModel(id=cand_id, candidateId=cand_id, email=f"{cand_id.lower()}@example.com", **fields))
    db.flush()
    db.add(ApplicationModel(id=f"A-{cand_id}", applicationId=f"A-{cand_id}", candidateId=cand_id, jobId="JOB-1",
                            appliedRole="Software Engineer"))
    db.commit()
    return f"A-{cand_id}"


def screen(db, app_id):
    application_service.screen_application_resume(db, app_id)
    return db.query(ApplicationModel).filter_by(id=app_id).one()


def test_the_evidence_text_for_a_fresher_is_academics_and_key_skills_only(db):
    cand = CandidateModel(id="C", candidateId="C", email="c@example.com", firstName="A", experienceLevel="Fresher",
                          highestEducation="B.E. / B.Tech", specialization="Computer Engineering", yearOfPassing="2025",
                          keySkills="Python, SQL", currentRole="Intern", currentCompany="Acme")
    text = application_service.profile_evidence_text(cand)
    assert "Highest education: B.E. / B.Tech" in text and "Specialization: Computer Engineering" in text
    assert "Key skills: Python, SQL" in text
    assert "Current role" not in text and "Current company" not in text


def test_the_evidence_text_for_an_experienced_candidate_is_skills_role_and_company(db):
    cand = CandidateModel(id="C", candidateId="C", email="c@example.com", firstName="A", totalExperienceMonths=48,
                          experienceYears=4, keySkills="Python, React", currentRole="Backend Developer",
                          currentCompany="Acme", highestEducation="B.Tech")
    text = application_service.profile_evidence_text(cand)
    assert "Current role: Backend Developer" in text and "Current company: Acme" in text
    assert "Key skills: Python, React" in text
    assert "education" not in text.lower()


def test_a_fresher_with_matching_academics_and_skills_gets_a_real_score_and_is_shortlisted(db):
    app_id = add(db, "CAND-1", experienceLevel="Fresher", highestEducation="B.E. / B.Tech",
                 specialization="Computer Engineering", keySkills="Python, SQL, React, Git, Docker")
    app = screen(db, app_id)
    assert app.atsScore is not None and app.atsScore > 50
    assert str(getattr(app.status, "value", app.status)) == "Shortlisted"
    assert app.aiEvaluation["basis"].startswith("profile: academic details")


def test_a_fresher_with_no_matching_skills_scores_lower(db):
    strong = screen(db, add(db, "CAND-1", experienceLevel="Fresher", highestEducation="B.Tech",
                            specialization="Computer Engineering", keySkills="Python, SQL, React, Git"))
    weak = screen(db, add(db, "CAND-2", experienceLevel="Fresher", highestEducation="B.Com",
                          specialization="Commerce", keySkills="Tally, Accounting"))
    assert weak.atsScore < strong.atsScore
    assert weak.atsScore is not None


def test_an_experienced_candidate_is_scored_on_skills_role_and_company(db):
    good = screen(db, add(db, "CAND-1", totalExperienceMonths=36, experienceYears=3, currentRole="Software Engineer",
                          currentCompany="Acme", keySkills="Python, SQL, React, Git, Docker"))
    other = screen(db, add(db, "CAND-2", totalExperienceMonths=36, experienceYears=3, currentRole="Accountant",
                           currentCompany="Firm", keySkills="Tally"))
    assert good.aiEvaluation["basis"] == "profile: key skills, current role and current company"
    assert good.atsScore > other.atsScore
    assert good.aiEvaluation["categoryBreakdown"]["roleMatch"]["maxWeight"] == 20
    assert good.aiEvaluation["categoryBreakdown"]["experience"]["maxWeight"] == 0


def test_a_candidate_with_a_cv_is_still_scored_on_the_cv(db):
    app_id = add(db, "CAND-1", resumeText="Python developer with 3 years experience. Built REST APIs with SQL and React. B.Tech.",
                 keySkills="Python")
    app = screen(db, app_id)
    assert app.aiEvaluation["basis"] == "cv"
    assert app.aiEvaluation["categoryBreakdown"]["experience"]["maxWeight"] == 20
