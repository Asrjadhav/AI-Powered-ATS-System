import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.interview import InterviewModel
from models.candidate import CandidateModel
from models.job import JobModel
from models.application import ApplicationModel

client = TestClient(app)

def test_phase2b_interviews_full_workflow():
    print("\n--- Starting Phase 2B Interview API & PostgreSQL Test Workflow ---")
    db = SessionLocal()

    try:
        headers = {"X-Skip-Interceptor": "true", "Content-Type": "application/json"}

        # 1. SETUP: Create Job, Candidate, Application
        res_job = client.post("/api/jobs", json={"title": "SENIOR SYSTEM ARCHITECT", "department": "Core Tech"}, headers=headers)
        assert res_job.status_code == 201
        job_data = res_job.json()

        import time
        res_cand = client.post("/api/candidates", json={"firstName": "Rahul", "lastName": "Sharma", "email": f"rahul_p2b_{int(time.time())}@example.com", "phone": "+91 9988776655"}, headers=headers)
        assert res_cand.status_code == 201
        cand_data = res_cand.json()

        res_app = client.post("/api/applications", json={"candidateId": cand_data["candidateId"], "jobId": job_data["jobId"], "atsScore": 89}, headers=headers)
        assert res_app.status_code == 201
        app_data = res_app.json()

        print(f"Setup Complete: Job='{job_data['jobId']}', Candidate='{cand_data['candidateId']}', Application='{app_data['applicationId']}'.")

        # 2. GET /api/interviews
        res_list_init = client.get("/api/interviews", headers=headers)
        assert res_list_init.status_code == 200

        # 3. CREATE INTERVIEW (Human-Readable ID Resolution for Candidate, Job, Application)
        schedule_payload = {
            "candidateId": cand_data["candidateId"], # Uses CAND-0001 format
            "jobId": job_data["jobId"],            # Uses JOB-0001 format
            "applicationId": app_data["applicationId"], # Uses APP-0001 format
            "round": "Technical System Design Round",
            "date": "2026-08-25",
            "time": "15:30",
            "interviewer": "Lead Architect Alex",
            "meetingLink": "https://meet.google.com/xyz-abc-test"
        }
        res_create = client.post("/api/interviews", json=schedule_payload, headers=headers)
        assert res_create.status_code == 201, f"Create interview failed: {res_create.text}"
        int_data = res_create.json()
        int_id = int_data["id"]

        assert int_data["candidateId"] == cand_data["id"] # Resolved internal candidate primary key FK
        assert int_data["jobId"] == job_data["id"]       # Resolved internal job primary key FK
        assert int_data["applicationId"] == app_data["id"] # Resolved internal application primary key FK
        print(f"1. CREATE INTERVIEW: Scheduled interview '{int_id}' for {int_data['candidateName']}.")

        # 4. DIRECT POSTGRESQL VERIFICATION OF CREATION
        pg_int_1 = db.query(InterviewModel).filter(InterviewModel.id == int_id).first()
        assert pg_int_1 is not None, "Interview row not found in PostgreSQL!"
        assert pg_int_1.round == "Technical System Design Round"
        assert pg_int_1.status == "Scheduled"
        print(f"2. POSTGRESQL CHECK: Verified row created in PostgreSQL 'interviews' table! (round='{pg_int_1.round}')")

        # 5. GET CREATED INTERVIEW BY ID
        res_get = client.get(f"/api/interviews/{int_id}", headers=headers)
        assert res_get.status_code == 200
        assert res_get.json()["id"] == int_id

        # 6. UPDATE INTERVIEW (RESCHEDULE)
        update_payload = {
            "time": "17:00",
            "round": "Advanced System Architecture",
            "interviewer": "Principal Architect Tech Lead"
        }
        res_update = client.put(f"/api/interviews/{int_id}", json=update_payload, headers=headers)
        assert res_update.status_code == 200
        print("3. UPDATE: Successfully rescheduled interview.")

        # 7. DIRECT POSTGRESQL VERIFICATION OF UPDATE
        db.expire_all()
        pg_int_2 = db.query(InterviewModel).filter(InterviewModel.id == int_id).first()
        assert pg_int_2.time == "17:00"
        assert pg_int_2.round == "Advanced System Architecture"
        print(f"4. POSTGRESQL CHECK: Verified update in PostgreSQL! (time='{pg_int_2.time}', round='{pg_int_2.round}')")

        # 8. CANCEL INTERVIEW
        res_cancel = client.patch(f"/api/interviews/{int_id}/cancel", headers=headers)
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "Cancelled"
        print("5. CANCEL: Successfully marked interview as Cancelled.")

        # 9. DIRECT POSTGRESQL VERIFICATION OF CANCELLATION
        db.expire_all()
        pg_int_3 = db.query(InterviewModel).filter(InterviewModel.id == int_id).first()
        assert pg_int_3.status == "Cancelled"
        print(f"6. POSTGRESQL CHECK: Verified status updated to 'Cancelled' in PostgreSQL!")

        # 10. SUBMIT EVALUATION FEEDBACK
        feedback_payload = {
            "technicalScore": 9.2,
            "communicationScore": 8.8,
            "comments": "Outstanding technical depth and clear system design communication."
        }
        res_fb = client.post(f"/api/interviews/{int_id}/feedback", json=feedback_payload, headers=headers)
        assert res_fb.status_code == 200
        assert res_fb.json()["status"] == "Completed"
        print("7. FEEDBACK: Successfully submitted feedback and marked interview as Completed.")

        # 11. DIRECT POSTGRESQL VERIFICATION OF FEEDBACK
        db.expire_all()
        pg_int_4 = db.query(InterviewModel).filter(InterviewModel.id == int_id).first()
        assert pg_int_4.status == "Completed"
        assert pg_int_4.technicalScore == 9.2
        assert "Outstanding" in pg_int_4.feedback
        print(f"8. POSTGRESQL CHECK: Verified feedback and score ({pg_int_4.technicalScore}) stored in PostgreSQL!")

        # 12. DELETE INTERVIEW
        res_del = client.delete(f"/api/interviews/{int_id}", headers=headers)
        assert res_del.status_code == 200
        print(f"9. DELETE: Successfully deleted test interview '{int_id}'.")

        # 13. DIRECT POSTGRESQL VERIFICATION OF DELETION
        db.expire_all()
        pg_int_5 = db.query(InterviewModel).filter(InterviewModel.id == int_id).first()
        assert pg_int_5 is None, "Interview row still exists in PostgreSQL after deletion!"
        print("10. POSTGRESQL CHECK: Verified interview row completely removed from PostgreSQL!")

        # Cleanup setup records
        client.delete(f"/api/applications/{app_data['id']}", headers=headers)
        client.delete(f"/api/candidates/{cand_data['id']}", headers=headers)
        client.delete(f"/api/jobs/{job_data['id']}", headers=headers)
        print("Cleanup completed.")

        print("\nALL PHASE 2B INTERVIEW API & POSTGRESQL CHECKS PASSED CLEANLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_phase2b_interviews_full_workflow()
