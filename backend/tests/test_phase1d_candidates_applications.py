import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.job import JobModel

client = TestClient(app)

def test_phase1d_candidates_and_applications_full_suite():
    print("\n--- Starting Phase 1D Candidate & Application Test Workflow ---")
    db = SessionLocal()

    try:
        # Setup: Create 2 Test Jobs for multi-job application testing
        j1_payload = {"title": "ROLE FULL STACK DEVELOPER 1", "department": "Tech"}
        j2_payload = {"title": "ROLE FRONTEND DEVELOPER 2", "department": "Tech"}
        
        headers = {"X-Skip-Interceptor": "true", "Content-Type": "application/json"}
        res_j1 = client.post("/api/jobs", json=j1_payload, headers=headers)
        res_j2 = client.post("/api/jobs", json=j2_payload, headers=headers)
        assert res_j1.status_code == 201
        assert res_j2.status_code == 201
        
        j1 = res_j1.json()
        j2 = res_j2.json()
        job1_id = j1["id"]
        job2_id = j2["id"]
        print(f"Setup Jobs Created: Job 1='{j1['jobId']}', Job 2='{j2['jobId']}'.")

        # 1. CREATE CANDIDATE & VERIFY AUTO-GENERATED CANDIDATE ID (CAND-XXXX)
        cand_payload_1 = {
            "firstName": "Aditi",
            "lastName": "Jadhav",
            "email": "Aditi.Jadhav@Example.com", # Mixed case email
            "phone": "+91 9876543210",
            "currentRole": "Software Engineer",
            "skills": ["Python", "FastAPI", "React"]
        }
        res_cand1 = client.post("/api/candidates", json=cand_payload_1, headers=headers)
        assert res_cand1.status_code == 201, f"Candidate creation failed: {res_cand1.text}"
        c1_data = res_cand1.json()
        c1_id = c1_data["id"]
        c1_cand_id = c1_data["candidateId"]
        
        assert c1_cand_id.startswith("CAND-")
        assert c1_data["email"] == "aditi.jadhav@example.com" # Case normalized
        print(f"1. CREATE CANDIDATE: Created '{c1_cand_id}' with normalized email '{c1_data['email']}'.")

        # 2. CANDIDATE EMAIL CASE NORMALIZATION & UNIQUENESS (REJECT DUPLICATE EMAIL)
        dup_email_payload = {
            "firstName": "Aditi",
            "lastName": "Duplicate",
            "email": "ADITI.JADHAV@EXAMPLE.COM" # Identical email with different casing
        }
        res_dup = client.post("/api/candidates", json=dup_email_payload, headers=headers)
        assert res_dup.status_code == 409, f"Expected 409 Conflict, got {res_dup.status_code}"
        assert "already exists" in res_dup.json()["detail"]
        print("2. EMAIL UNIQUENESS: Rejected candidate creation with duplicate case-insensitive email (409 Conflict).")

        # 3. CREATE APPLICATION 1 (CAND-0001 + JOB-0001 -> APP-0001, ATS Score 87)
        app1_payload = {
            "candidateId": c1_cand_id,
            "jobId": j1["jobId"],
            "atsScore": 87,
            "source": "LinkedIn"
        }
        res_app1 = client.post("/api/applications", json=app1_payload, headers=headers)
        assert res_app1.status_code == 201, f"Application 1 failed: {res_app1.text}"
        app1_data = res_app1.json()
        app1_id = app1_data["applicationId"]
        
        assert app1_id.startswith("APP-")
        assert app1_data["atsScore"] == 87
        print(f"3. APPLICATION 1: Posted Application '{app1_id}' for Job 1 with ATS score 87.")

        # 4. CREATE APPLICATION 2 (CAND-0001 + JOB-0002 -> APP-0002, ATS Score 72 - Different Job Allowed!)
        app2_payload = {
            "candidateId": c1_cand_id,
            "jobId": j2["jobId"],
            "atsScore": 72,
            "source": "Career Site"
        }
        res_app2 = client.post("/api/applications", json=app2_payload, headers=headers)
        assert res_app2.status_code == 201, f"Application 2 failed: {res_app2.text}"
        app2_data = res_app2.json()
        app2_id = app2_data["applicationId"]
        
        assert app2_id != app1_id
        assert app2_data["atsScore"] == 72
        print(f"4. APPLICATION 2: Posted Application '{app2_id}' for Job 2 with ATS score 72. (Multi-job application allowed!)")

        # 5. REJECT DUPLICATE APPLICATION (CAND-0001 + JOB-0001 Second Attempt -> 409 Conflict!)
        dup_app_payload = {
            "candidateId": c1_cand_id,
            "jobId": j1["jobId"],
            "atsScore": 95
        }
        res_dup_app = client.post("/api/applications", json=dup_app_payload, headers=headers)
        assert res_dup_app.status_code == 409, f"Expected 409 Conflict, got {res_dup_app.status_code}"
        assert res_dup_app.json()["detail"] == "You have already applied to this job."
        print("5. DUPLICATE APPLICATION PREVENTION: Rejected 2nd application to same Job 1 with 409 Conflict ('You have already applied to this job.').")

        # 6. VERIFY ATS SCORES STORED ON APPLICATION TABLE IN POSTGRESQL
        db.expire_all()
        pg_app1 = db.query(ApplicationModel).filter(ApplicationModel.applicationId == app1_id).first()
        pg_app2 = db.query(ApplicationModel).filter(ApplicationModel.applicationId == app2_id).first()
        
        assert pg_app1.atsScore == 87
        assert pg_app2.atsScore == 72
        print("6. POSTGRESQL VERIFICATION: Confirmed distinct job-specific ATS scores (87 vs 72) stored on applications table in PostgreSQL!")

        # Cleanup test data
        client.delete(f"/api/applications/{app1_data['id']}", headers=headers)
        client.delete(f"/api/applications/{app2_data['id']}", headers=headers)
        client.delete(f"/api/candidates/{c1_id}", headers=headers)
        client.delete(f"/api/jobs/{job1_id}", headers=headers)
        client.delete(f"/api/jobs/{job2_id}", headers=headers)
        print("Cleanup completed.")

        print("\nALL PHASE 1D CANDIDATE & APPLICATION FOUNDATION TESTS PASSED CLEANLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_phase1d_candidates_and_applications_full_suite()
