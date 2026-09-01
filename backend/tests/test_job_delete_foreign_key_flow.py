import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
from models.job import JobModel
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.interview import InterviewModel
from models.offer import OfferModel
from services.job_service import create_job, delete_job, get_job_by_id_or_job_id
from schemas.job import JobCreate

def run_fk_job_delete_verification():
    db = SessionLocal()
    print("\n=============================================================")
    print("   STARTING JOB-0004 FOREIGN-KEY DELETION VERIFICATION SUITE   ")
    print("=============================================================\n")

    try:
        # Step 1: Ensure JOB-0004 exists or create a test job with JOB-0004
        job = get_job_by_id_or_job_id(db, "JOB-0004")
        if not job:
            job_in = JobCreate(
                id="JOB-0004",
                jobId="JOB-0004",
                title="Full Stack Developer",
                department="Engineering",
                location="Pune, India",
                type="Full-time",
                experienceLevel="Senior-Level",
                description="Test full stack developer job posting."
            )
            created = create_job(db, job_in=job_in)
            job = get_job_by_id_or_job_id(db, "JOB-0004")

        print(f"Target Job Found: ID '{job.id}', JobID '{job.jobId}', Title '{job.title}'")

        # Step 2: Link Candidate, Application, Interview, and Offer to JOB-0004
        cand = db.query(CandidateModel).filter(CandidateModel.jobId == job.id).first()
        if not cand:
            cand = CandidateModel(
                id="test-fk-cand-1",
                candidateId="CAND-FK01",
                firstName="FK",
                lastName="TestCandidate",
                email="fk.test.candidate@test.com",
                jobId=job.id,
                status="Applied"
            )
            db.add(cand)
            db.commit()
            db.refresh(cand)

        app = db.query(ApplicationModel).filter(ApplicationModel.jobId == job.id).first()
        if not app:
            app = ApplicationModel(
                id="test-fk-app-1",
                candidateId=cand.id,
                jobId=job.id,
                status="Applied",
                appliedRole=job.title
            )
            db.add(app)
            db.commit()
            db.refresh(app)

        print(f"Linked Records before Delete:")
        print(f"  - Candidate '{cand.id}' linked to jobId '{cand.jobId}'")
        print(f"  - Application '{app.id}' linked to jobId '{app.jobId}'")

        # Step 3: Execute Delete for JOB-0004
        success = delete_job(db, identifier="JOB-0004")
        assert success is True, "FAIL: delete_job returned False"

        # Step 4: Verify Job is deleted from PostgreSQL
        job_check = get_job_by_id_or_job_id(db, "JOB-0004")
        assert job_check is None, "FAIL: Job JOB-0004 still exists in database"
        print(f"\n[PASS] JOB DELETE: Job 'JOB-0004' was successfully deleted from PostgreSQL.")

        # Step 5: Verify Candidates & Applications are NOT deleted
        db.refresh(cand)
        db.refresh(app)
        assert cand is not None, "FAIL: Candidate was deleted"
        assert app is not None, "FAIL: Application was deleted"
        assert cand.jobId is None, f"FAIL: Candidate jobId expected None, got {cand.jobId}"
        assert app.jobId is None, f"FAIL: Application jobId expected None, got {app.jobId}"

        print(f"[PASS] PRESERVATION: Candidate '{cand.id}' & Application '{app.id}' preserved with jobId set to None.")

        print("\n=============================================================")
        print("  FOREIGN KEY JOB-0004 DELETION TEST PASSED 100% SUCCESSFULLY! ")
        print("=============================================================\n")

    finally:
        # Clean up test candidate & application
        try:
            db.query(ApplicationModel).filter(ApplicationModel.id == "test-fk-app-1").delete(synchronize_session=False)
            db.query(CandidateModel).filter(CandidateModel.id == "test-fk-cand-1").delete(synchronize_session=False)
            db.commit()
        except Exception:
            pass
        db.close()

if __name__ == "__main__":
    run_fk_job_delete_verification()
