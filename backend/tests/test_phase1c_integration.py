import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.job import JobModel
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_phase1c_full_integration():
    print("\n--- Starting Phase 1C Full System & PostgreSQL Verification ---")
    db: Session = SessionLocal()

    try:
        # 1. CREATE JOB
        create_payload = {
            "title": "PHASE 1C SYSTEM VERIFICATION ENGINEER",
            "department": "Engineering",
            "location": "Pune",
            "type": "Full-time",
            "workMode": "Hybrid",
            "experienceRange": "4-6 years",
            "salaryRange": "$140,000",
            "openings": 3,
            "description": "Integration test job for Phase 1C verification.",
            "status": "published"
        }
        
        headers = {"X-Skip-Interceptor": "true", "Content-Type": "application/json"}
        res_create = client.post("/api/jobs", json=create_payload, headers=headers)
        assert res_create.status_code == 201, f"Create failed: {res_create.text}"
        job_data = res_create.json()
        job_id = job_data["jobId"]
        db_id = job_data["id"]
        print(f"1. CREATE: Successfully posted job '{job_id}' (DB Primary Key: '{db_id}').")

        # 2. DIRECT POSTGRESQL VERIFICATION OF CREATION
        pg_job_after_create = db.query(JobModel).filter(JobModel.jobId == job_id).first()
        assert pg_job_after_create is not None, "PostgreSQL row not found after creation!"
        assert pg_job_after_create.title == "PHASE 1C SYSTEM VERIFICATION ENGINEER"
        assert pg_job_after_create.openings == 3
        print(f"2. POSTGRESQL CHECK: Verified row created in PostgreSQL 'jobs' table! (title='{pg_job_after_create.title}')")

        # 3. UPDATE JOB
        update_payload = {
            "title": "PHASE 1C LEAD VERIFICATION ENGINEER",
            "openings": 10
        }
        res_update = client.put(f"/api/jobs/{job_id}", json=update_payload, headers=headers)
        assert res_update.status_code == 200, f"Update failed: {res_update.text}"
        print("3. UPDATE: Successfully updated job via API.")

        # 4. DIRECT POSTGRESQL VERIFICATION OF UPDATE
        db.expire_all()
        pg_job_after_update = db.query(JobModel).filter(JobModel.jobId == job_id).first()
        assert pg_job_after_update.title == "PHASE 1C LEAD VERIFICATION ENGINEER"
        assert pg_job_after_update.openings == 10
        print(f"4. POSTGRESQL CHECK: Verified row updated in PostgreSQL! (title='{pg_job_after_update.title}', openings={pg_job_after_update.openings})")

        # 5. STATUS UPDATE
        res_status = client.patch(f"/api/jobs/{job_id}/status", json={"status": "closed"}, headers=headers)
        assert res_status.status_code == 200, f"Status update failed: {res_status.text}"
        print("5. STATUS: Successfully updated job status to 'closed'.")

        # 6. DIRECT POSTGRESQL VERIFICATION OF STATUS
        db.expire_all()
        pg_job_after_status = db.query(JobModel).filter(JobModel.jobId == job_id).first()
        assert pg_job_after_status.status == "closed"
        print(f"6. POSTGRESQL CHECK: Verified status updated to '{pg_job_after_status.status}' in PostgreSQL!")

        # 7. DELETE JOB
        res_delete = client.delete(f"/api/jobs/{job_id}", headers=headers)
        assert res_delete.status_code == 200, f"Delete failed: {res_delete.text}"
        print(f"7. DELETE: Successfully deleted job '{job_id}' via API.")

        # 8. DIRECT POSTGRESQL VERIFICATION OF DELETION
        db.expire_all()
        pg_job_after_delete = db.query(JobModel).filter(JobModel.jobId == job_id).first()
        assert pg_job_after_delete is None, "PostgreSQL row still exists after deletion!"
        print("8. POSTGRESQL CHECK: Verified row completely removed from PostgreSQL 'jobs' table!")

        print("\nALL PHASE 1C INTEGRATION AND POSTGRESQL DIRECT CHECKS PASSED CLEANLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_phase1c_full_integration()
