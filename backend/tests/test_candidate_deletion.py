import sys
import os
import uuid
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from sqlalchemy.orm import Session
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.interview import InterviewModel
from models.offer import OfferModel
from models.talent_pool import TalentPoolModel

client = TestClient(app)

def run_test():
    print("\n--- Starting Candidate Deletion with Linked Records Test ---")
    db: Session = SessionLocal()

    test_id = str(uuid.uuid4())[:8]
    cand_id = f"cand-del-{test_id}"

    try:
        # 1. CREATE CANDIDATE
        cand_email = f"del.candidate.{test_id}@example.com"
        create_res = client.post("/api/candidates", json={
            "id": cand_id,
            "firstName": "ToDelete",
            "lastName": "Candidate",
            "email": cand_email,
            "currentRole": "Software Engineer"
        })
        assert create_res.status_code == 201, f"Failed candidate creation: {create_res.text}"
        cand_data = create_res.json()
        internal_cand_id = cand_data["id"]
        print(f"1. CREATE CANDIDATE SUCCESS: '{internal_cand_id}'.")

        # 2. CREATE LINKED APPLICATION
        app_id = f"app-del-{test_id}"
        db_app = ApplicationModel(
            id=app_id,
            applicationId=f"APP-DEL-{test_id.upper()}",
            candidateId=internal_cand_id,
            jobId="JOB-0001",
            status="Interviewing",
            appliedRole="Software Engineer"
        )
        db.add(db_app)
        db.commit()
        print("2. LINKED APPLICATION CREATED.")

        # 3. CREATE LINKED INTERVIEW
        int_id = f"int-del-{test_id}"
        db_int = InterviewModel(
            id=int_id,
            candidateId=internal_cand_id,
            jobId="JOB-0001",
            applicationId=app_id,
            candidateName="ToDelete Candidate",
            jobTitle="Software Engineer",
            date="2026-09-10",
            time="11:00 AM",
            interviewer="Tech Lead",
            status="Scheduled"
        )
        db.add(db_int)
        db.commit()
        print("3. LINKED INTERVIEW CREATED.")

        # 4. CREATE LINKED OFFER
        off_id = f"off-del-{test_id}"
        db_off = OfferModel(
            id=off_id,
            candidateId=internal_cand_id,
            jobId="JOB-0001",
            applicationId=app_id,
            candidateName="ToDelete Candidate",
            jobTitle="Software Engineer",
            offeredCTC=1200000.0,
            status="Draft"
        )
        db.add(db_off)
        db.commit()
        print("4. LINKED OFFER CREATED.")

        # 5. CREATE LINKED TALENT POOL ENTRY
        tp_id = f"tp-del-{test_id}"
        db_tp = TalentPoolModel(
            id=tp_id,
            candidateId=internal_cand_id,
            currentRole="Software Engineer",
            status="Available"
        )
        db.add(db_tp)
        db.commit()
        print("5. LINKED TALENT POOL ENTRY CREATED.")

        # 6. DELETE CANDIDATE VIA API
        del_res = client.delete(f"/api/candidates/{internal_cand_id}")
        assert del_res.status_code == 200, f"Candidate deletion failed: {del_res.text}"
        print("6. DELETE CANDIDATE API RETURNED 200 OK.")

        # 7. VERIFY ALL LINKED RECORDS ARE CLEANLY REMOVED FROM POSTGRESQL
        db.expire_all()
        assert db.query(CandidateModel).filter(CandidateModel.id == internal_cand_id).first() is None, "Candidate record was not deleted!"
        assert db.query(ApplicationModel).filter(ApplicationModel.id == app_id).first() is None, "Linked application was not deleted!"
        assert db.query(InterviewModel).filter(InterviewModel.id == int_id).first() is None, "Linked interview was not deleted!"
        assert db.query(OfferModel).filter(OfferModel.id == off_id).first() is None, "Linked offer was not deleted!"
        assert db.query(TalentPoolModel).filter(TalentPoolModel.id == tp_id).first() is None, "Linked talent pool entry was not deleted!"

        print("7. POSTGRESQL VERIFICATION SUCCESS: All linked records deleted without foreign key violations!")
        print("\nCANDIDATE DELETION TEST PASSED CLEANLY!")

    finally:
        db.query(TalentPoolModel).filter(TalentPoolModel.id == f"tp-del-{test_id}").delete(synchronize_session=False)
        db.query(OfferModel).filter(OfferModel.id == f"off-del-{test_id}").delete(synchronize_session=False)
        db.query(InterviewModel).filter(InterviewModel.id == f"int-del-{test_id}").delete(synchronize_session=False)
        db.query(ApplicationModel).filter(ApplicationModel.id == f"app-del-{test_id}").delete(synchronize_session=False)
        db.query(CandidateModel).filter(CandidateModel.id == cand_id).delete(synchronize_session=False)
        db.commit()
        db.close()

if __name__ == "__main__":
    run_test()
