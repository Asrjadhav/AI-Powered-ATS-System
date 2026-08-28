import requests
import sys
import os
import uuid
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.candidate import CandidateModel
from models.job import JobModel
from models.application import ApplicationModel
from models.interview import InterviewModel

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("\n--- Starting Phase 2C Candidate Pipeline Drag-and-Drop & PostgreSQL Verification ---")
    db: Session = SessionLocal()

    # 1. SETUP: Create Test Job, Candidate, Application in PostgreSQL
    test_id = str(uuid.uuid4())[:8]
    job_id = f"JOB-P2C-{test_id}"
    cand_id = f"CAND-P2C-{test_id}"
    app_id = f"APP-P2C-{test_id}"

    job = JobModel(id=job_id, jobId=job_id, title="Pipeline Test Engineer", department="QA")
    cand = CandidateModel(id=cand_id, candidateId=cand_id, firstName="Pipeline", lastName="Tester", email=f"pipe_{test_id}@example.com")
    db.add(job)
    db.add(cand)
    db.commit()

    app = ApplicationModel(
        id=app_id,
        applicationId=app_id,
        candidateId=cand_id,
        jobId=job_id,
        status="Applied",
        source="Test Script",
        appliedRole="Pipeline Test Engineer"
    )
    db.add(app)
    db.commit()
    print(f"Setup Complete: App='{app_id}' initialized with status='Applied'.")

    try:
        # 2. TEST PATCH ENDPOINT: Drag card to 'Interviewing'
        patch_res = requests.patch(f"{BASE_URL}/applications/{app_id}/status", json={"status": "Interviewing"})
        if patch_res.status_code != 200:
            print(f"FAILED PATCH /applications/{app_id}/status: {patch_res.status_code} - {patch_res.text}")
            sys.exit(1)
        print(f"1. PATCH API SUCCESS: {app_id} status updated to 'Interviewing'.")

        # 3. POSTGRESQL CHECK: Query PostgreSQL directly
        db.expire_all()
        db_app = db.query(ApplicationModel).filter(ApplicationModel.applicationId == app_id).first()
        if not db_app or db_app.status != "Interviewing":
            print(f"FAILED PostgreSQL Check: Expected 'Interviewing', got '{db_app.status if db_app else None}'")
            sys.exit(1)
        print(f"2. POSTGRESQL CHECK: Verified applicationId='{db_app.applicationId}' status='{db_app.status}' stored in PostgreSQL!")

        # 4. TEST PATCH ENDPOINT: Drag card to 'Offered'
        patch_res2 = requests.patch(f"{BASE_URL}/applications/{app_id}/status", json={"status": "Offered"})
        if patch_res2.status_code != 200:
            print(f"FAILED PATCH to Offered: {patch_res2.status_code}")
            sys.exit(1)

        db.expire_all()
        db_app2 = db.query(ApplicationModel).filter(ApplicationModel.applicationId == app_id).first()
        if not db_app2 or db_app2.status != "Offered":
            print(f"FAILED PostgreSQL Check for Offered: Got '{db_app2.status if db_app2 else None}'")
            sys.exit(1)
        print(f"3. POSTGRESQL CHECK: Verified transition to status='{db_app2.status}' in PostgreSQL!")

        # 5. TEST INVALID APPLICATION ID (404 Error Handling)
        invalid_res = requests.patch(f"{BASE_URL}/applications/APP-NONEXISTENT/status", json={"status": "Interviewing"})
        if invalid_res.status_code == 404:
            print("4. ERROR HANDLING CHECK: Verified non-existent application returns 404 Not Found cleanly!")
        else:
            print(f"FAILED 404 Check: Expected 404, got {invalid_res.status_code}")
            sys.exit(1)

        print("\nALL PHASE 2C CANDIDATE PIPELINE DRAG-AND-DROP CHECKS PASSED CLEANLY!")

    finally:
        # Cleanup test records from PostgreSQL
        db.query(InterviewModel).filter(InterviewModel.applicationId == app_id).delete()
        db.query(ApplicationModel).filter(ApplicationModel.id == app_id).delete()
        db.query(CandidateModel).filter(CandidateModel.id == cand_id).delete()
        db.query(JobModel).filter(JobModel.id == job_id).delete()
        db.commit()
        db.close()
        print("Cleanup completed.")

if __name__ == "__main__":
    run_test()
