import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db, SessionLocal
from models.job import JobModel

client = TestClient(app)

def test_jobs_api_full_crud_workflow():
    print("\n--- Starting Phase 1B Jobs API Test Workflow ---")
    
    # 1. GET /api/jobs
    res_list = client.get("/api/jobs")
    assert res_list.status_code == 200
    initial_jobs = res_list.json()
    assert isinstance(initial_jobs, list)
    print(f"1. GET /api/jobs returned {len(initial_jobs)} initial job(s).")

    # 2. POST /api/jobs (Create TEST job)
    test_job_payload = {
        "title": "TEST AUTOMATED QA ENGINEER",
        "department": "Engineering",
        "location": "Remote",
        "type": "Full-time",
        "workMode": "Remote",
        "experienceRange": "3-5 years",
        "salaryRange": "$120,000 - $140,000",
        "openings": 2,
        "description": "Test job created via Phase 1B automated test suite.",
        "responsibilities": ["Build automated testing suites", "Perform regression checks"],
        "requirements": {"mustHave": ["Python", "FastAPI", "PostgreSQL"]},
        "benefits": ["Remote work", "Health insurance"],
        "status": "published"
    }
    
    res_create = client.post("/api/jobs", json=test_job_payload)
    assert res_create.status_code == 201
    created_job = res_create.json()
    created_id = created_job["id"]
    created_job_id = created_job["jobId"]
    
    assert created_job["title"] == "TEST AUTOMATED QA ENGINEER"
    assert created_job_id.startswith("JOB-")
    assert created_job["status"] == "active" # Normalized from "published"
    print(f"2. POST /api/jobs succeeded! Created Job ID: '{created_job_id}' (DB Primary Key: '{created_id}').")

    # 3. GET /api/jobs/{id} by human-readable jobId AND DB id
    res_get_by_job_id = client.get(f"/api/jobs/{created_job_id}")
    assert res_get_by_job_id.status_code == 200
    assert res_get_by_job_id.json()["jobId"] == created_job_id

    res_get_by_db_id = client.get(f"/api/jobs/{created_id}")
    assert res_get_by_db_id.status_code == 200
    assert res_get_by_db_id.json()["id"] == created_id
    print("3. GET /api/jobs/{id} dual lookup verified for both jobId and db primary key id!")

    # 4. PUT /api/jobs/{id} (Update details)
    update_payload = {
        "title": "UPDATED TEST QA ENGINEER",
        "location": "Pune / Remote",
        "openings": 5,
        "salaryRange": "$130,000 - $150,000"
    }
    res_update = client.put(f"/api/jobs/{created_job_id}", json=update_payload)
    assert res_update.status_code == 200
    updated_job = res_update.json()
    assert updated_job["title"] == "UPDATED TEST QA ENGINEER"
    assert updated_job["location"] == "Pune / Remote"
    assert updated_job["openings"] == 5
    assert updated_job["jobId"] == created_job_id # Preserved
    print("4. PUT /api/jobs/{id} verified! Updated title and details successfully.")

    # 5. PATCH /api/jobs/{id}/status (Status update)
    res_patch = client.patch(f"/api/jobs/{created_job_id}/status", json={"status": "closed"})
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "closed"
    print("5. PATCH /api/jobs/{id}/status verified! Changed status to 'closed'.")

    # 6. DELETE /api/jobs/{id} (Safe deletion)
    res_delete = client.delete(f"/api/jobs/{created_job_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["success"] is True
    print(f"6. DELETE /api/jobs/{created_job_id} verified! Removed test record cleanly.")

    # Verify 404 after deletion
    res_404 = client.get(f"/api/jobs/{created_job_id}")
    assert res_404.status_code == 404
    print("7. Post-deletion 404 verification passed!")

def test_jobs_api_retry_on_conflict():
    print("\n--- Testing Concurrency & UNIQUE Constraint Retry Logic ---")
    # Test creating two jobs sequentially to ensure no UNIQUE constraint error occurs
    res1 = client.post("/api/jobs", json={"title": "Test Unique 1"})
    assert res1.status_code == 201
    job1 = res1.json()

    res2 = client.post("/api/jobs", json={"title": "Test Unique 2"})
    assert res2.status_code == 201
    job2 = res2.json()

    assert job1["jobId"] != job2["jobId"]
    print(f"Verified unique auto-generated IDs: '{job1['jobId']}' vs '{job2['jobId']}'.")

    # Clean up test jobs
    client.delete(f"/api/jobs/{job1['id']}")
    client.delete(f"/api/jobs/{job2['id']}")
    print("Conflict & Retry test cleanup completed.")

if __name__ == "__main__":
    test_jobs_api_full_crud_workflow()
    test_jobs_api_retry_on_conflict()
    print("\nALL PHASE 1B FASTAPI JOBS API TESTS PASSED CLEANLY!")
