import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
from models.job import JobModel
from models.candidate import CandidateModel
from models.application import ApplicationModel
from services.job_service import create_job, delete_job, get_job_by_id_or_job_id
from schemas.job import JobCreate
from migrate_job_id_nullable import run_migration

def run_local_verification():
    run_migration()
    db = SessionLocal()
    print("\n=============================================================")
    print("      LOCAL END-TO-END JOB DELETE VERIFICATION (JOB-0009)    ")
    print("=============================================================\n")

    try:
        # Create test job JOB-0009
        job_in = JobCreate(
            id="JOB-0009",
            jobId="JOB-0009",
            title="Senior DevOps Engineer",
            department="Infrastructure",
            location="Pune, India",
            type="Full-time",
            experienceLevel="Senior-Level",
            description="Test devops engineer job posting."
        )
        created = create_job(db, job_in=job_in)
        job = get_job_by_id_or_job_id(db, "JOB-0009")
        print(f"Created Local Test Job: ID '{job.id}', JobID '{job.jobId}', Title '{job.title}'")

        # Create linked candidate and application
        cand = CandidateModel(
            id="test-local-cand-9",
            candidateId="CAND-0009",
            firstName="Local",
            lastName="Tester",
            email="local.tester@test.com",
            jobId=job.id,
            status="Applied"
        )
        db.add(cand)
        db.commit()

        app = ApplicationModel(
            id="APP-0009",
            applicationId="APP-0009",
            candidateId=cand.id,
            jobId=job.id,
            status="Applied",
            appliedRole=job.title
        )
        db.add(app)
        db.commit()

        print("Linked candidate CAND-0009 and application APP-0009 to JOB-0009.")

        # Execute Delete
        success = delete_job(db, identifier="JOB-0009")
        assert success is True, "FAIL: delete_job returned False"

        # Verify job is deleted
        deleted_check = get_job_by_id_or_job_id(db, "JOB-0009")
        assert deleted_check is None, "FAIL: Job JOB-0009 still in DB"

        db.refresh(cand)
        db.refresh(app)
        assert cand.jobId is None, "FAIL: Candidate jobId not nullified"
        assert app.jobId is None, "FAIL: Application jobId not nullified"

        print(f"[PASS] LOCAL DELETE: Job 'JOB-0009' deleted from PostgreSQL.")
        print(f"[PASS] PRESERVATION: Candidate '{cand.id}' & Application '{app.id}' preserved with jobId=None.")
        print("\n=============================================================")
        print("          LOCAL END-TO-END VERIFICATION 100% OK!             ")
        print("=============================================================\n")

    finally:
        try:
            db.query(ApplicationModel).filter(ApplicationModel.id == "APP-0009").delete(synchronize_session=False)
            db.query(CandidateModel).filter(CandidateModel.id == "test-local-cand-9").delete(synchronize_session=False)
            db.commit()
        except Exception:
            pass
        db.close()

if __name__ == "__main__":
    run_local_verification()
