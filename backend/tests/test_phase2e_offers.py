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
from models.offer import OfferModel

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("\n--- Starting Phase 2E Offers API & PostgreSQL Test Workflow ---")
    db: Session = SessionLocal()

    test_id = str(uuid.uuid4())[:8]
    job_id = f"JOB-OFF-{test_id}"
    cand_id = f"CAND-OFF-{test_id}"
    app_id = f"APP-OFF-{test_id}"

    # 1. SETUP: Create Job, Candidate, Application in PostgreSQL
    job = JobModel(id=job_id, jobId=job_id, title="Lead System Engineer", department="Core Infra")
    cand = CandidateModel(id=cand_id, candidateId=cand_id, firstName="Offer", lastName="Candidate", email=f"offer_{test_id}@example.com")
    app = ApplicationModel(id=app_id, applicationId=app_id, candidateId=cand_id, jobId=job_id, status="Interviewing")

    db.add(job)
    db.add(cand)
    db.add(app)
    db.commit()
    print(f"Setup Complete: App='{app_id}' initialized with status='Interviewing'.")

    offer_id = None

    try:
        # 2. CREATE OFFER VIA FASTAPI
        create_res = requests.post(f"{BASE_URL}/offers", json={
            "candidateId": cand_id,
            "jobId": job_id,
            "applicationId": app_id,
            "candidateName": "Offer Candidate",
            "candidateEmail": f"offer_{test_id}@example.com",
            "jobTitle": "Lead System Engineer",
            "department": "Core Infra",
            "offeredCTC": 2400000.0,
            "joiningDate": "2026-09-15",
            "status": "Draft",
            "workflowStage": "Offer Generation"
        })

        if create_res.status_code != 201:
            print(f"FAILED POST /offers: {create_res.status_code} - {create_res.text}")
            sys.exit(1)

        off_data = create_res.json()
        offer_id = off_data["id"]
        print(f"1. POST API SUCCESS: Created offer record '{offer_id}'.")

        # 3. VERIFY POSTGRESQL OFFERS TABLE DIRECTLY
        db.expire_all()
        db_off = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
        if not db_off or db_off.status != "Draft" or db_off.offeredCTC != 2400000.0:
            print(f"FAILED PostgreSQL check: Got status='{db_off.status if db_off else None}', ctc={db_off.offeredCTC if db_off else None}")
            sys.exit(1)
        print(f"2. POSTGRESQL CHECK: Verified row in 'offers' table! (status='{db_off.status}', offeredCTC={db_off.offeredCTC})")

        # 4. GET OFFERS LIST
        get_res = requests.get(f"{BASE_URL}/offers")
        if get_res.status_code != 200 or not any(o["id"] == offer_id for o in get_res.json()):
            print(f"FAILED GET /offers: {get_res.status_code}")
            sys.exit(1)
        print("3. GET ALL SUCCESS: Offer retrieved via GET /api/offers!")

        # 5. UPDATE OFFER DETAILS VIA PATCH
        patch_res = requests.patch(f"{BASE_URL}/offers/{offer_id}", json={
            "joiningDate": "2026-10-01",
            "offeredCTC": 2600000.0,
            "customTerms": "Joining bonus included ₹1,00,000"
        })
        if patch_res.status_code != 200:
            print(f"FAILED PATCH /offers/{offer_id}: {patch_res.status_code}")
            sys.exit(1)
        print("4. PATCH API SUCCESS: Updated joiningDate and offeredCTC.")

        # 6. UPDATE OFFER STATUS TO ACCEPTED & VERIFY STAGE SYNC
        status_res = requests.patch(f"{BASE_URL}/offers/{offer_id}/status", json={
            "status": "Accepted",
            "workflowStage": "Joining Process"
        })
        if status_res.status_code != 200:
            print(f"FAILED PATCH /offers/{offer_id}/status: {status_res.status_code}")
            sys.exit(1)
        print("5. STATUS PATCH API SUCCESS: Updated status to 'Accepted'.")

        # 7. VERIFY POSTGRESQL STATUS & APPLICATION/CANDIDATE SYNC
        db.expire_all()
        db_off_updated = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
        db_app_updated = db.query(ApplicationModel).filter(ApplicationModel.id == app_id).first()
        db_cand_updated = db.query(CandidateModel).filter(CandidateModel.id == cand_id).first()

        if db_off_updated.status != "Accepted":
            print(f"FAILED PostgreSQL offer status check: Got '{db_off_updated.status}'")
            sys.exit(1)

        if db_app_updated.status != "Offered" or db_cand_updated.status != "Offered":
            print(f"FAILED PostgreSQL stage sync check: App status='{db_app_updated.status}', Cand status='{db_cand_updated.status}'")
            sys.exit(1)
        print("6. POSTGRESQL STAGE SYNC CHECK: Verified status='Accepted' stored in 'offers' table AND synced application/candidate status to 'Offered' in PostgreSQL!")

        # 8. DELETE OFFER RECORD
        del_res = requests.delete(f"{BASE_URL}/offers/{offer_id}")
        if del_res.status_code != 200:
            print(f"FAILED DELETE /offers/{offer_id}: {del_res.status_code}")
            sys.exit(1)
        print("7. DELETE API SUCCESS: Deleted offer record.")

        db.expire_all()
        deleted_off = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
        assert deleted_off is None, "Offer row should be deleted from PostgreSQL!"
        print("8. POSTGRESQL CHECK: Verified row cleanly removed from 'offers' table!")

        print("\nALL PHASE 2E OFFERS API & POSTGRESQL CHECKS PASSED CLEANLY!")

    finally:
        # Clean up test records
        if offer_id:
            db.query(OfferModel).filter(OfferModel.id == offer_id).delete()
        db.query(ApplicationModel).filter(ApplicationModel.id == app_id).delete()
        db.query(CandidateModel).filter(CandidateModel.id == cand_id).delete()
        db.query(JobModel).filter(JobModel.id == job_id).delete()
        db.commit()
        db.close()
        print("Cleanup completed.")

if __name__ == "__main__":
    run_test()
