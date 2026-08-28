import requests
import sys
import os
import uuid
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.candidate import CandidateModel
from models.talent_pool import TalentPoolModel

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("\n--- Starting Phase 2D Talent Pool FastAPI + PostgreSQL Test Workflow ---")
    db: Session = SessionLocal()

    test_id = str(uuid.uuid4())[:8]
    cand_id = f"CAND-TP-{test_id}"
    email = f"tp_tester_{test_id}@example.com"

    # 1. SETUP: Create Candidate in PostgreSQL
    cand = CandidateModel(
        id=cand_id,
        candidateId=cand_id,
        firstName="TalentPool",
        lastName="Tester",
        email=email,
        phone="+91 9999000011",
        currentRole="Cloud Architect",
        currentCompany="CloudCorp"
    )
    db.add(cand)
    db.commit()
    print(f"Setup Complete: Created candidate '{cand_id}' ({email}) in PostgreSQL.")

    tp_item_id = None

    try:
        # 2. ADD TO TALENT POOL
        add_res = requests.post(f"{BASE_URL}/talent-pool", json={
            "candidateId": cand_id,
            "currentRole": "Principal Cloud Architect",
            "currentCompany": "CloudCorp Global",
            "skills": ["AWS", "Kubernetes", "Terraform"],
            "experienceYears": 8.5,
            "availability": "Immediate",
            "noticePeriod": "Immediate",
            "status": "Available",
            "department": "Engineering",
            "tags": ["Cloud Specialist", "Immediate Joiner"],
            "recruiterNotes": "High potential candidate for lead roles."
        })

        if add_res.status_code != 201:
            print(f"FAILED POST /talent-pool: {add_res.status_code} - {add_res.text}")
            sys.exit(1)

        tp_data = add_res.json()
        tp_item_id = tp_data["id"]
        print(f"1. ADD SUCCESS: Candidate added to Talent Pool with ID '{tp_item_id}'.")

        # 3. VERIFY POSTGRESQL TABLE DIRECTLY
        db.expire_all()
        db_tp = db.query(TalentPoolModel).filter(TalentPoolModel.candidateId == cand_id).first()
        if not db_tp or db_tp.currentRole != "Principal Cloud Architect":
            print(f"FAILED PostgreSQL check: Expected 'Principal Cloud Architect', got '{db_tp.currentRole if db_tp else None}'")
            sys.exit(1)
        print(f"2. POSTGRESQL CHECK: Verified row in 'talent_pool' table! (status='{db_tp.status}', role='{db_tp.currentRole}')")

        # 4. GET ALL TALENT POOL
        get_res = requests.get(f"{BASE_URL}/talent-pool")
        if get_res.status_code != 200 or not any(item["candidateId"] == cand_id for item in get_res.json()):
            print(f"FAILED GET /talent-pool: {get_res.status_code}")
            sys.exit(1)
        print("3. GET ALL SUCCESS: Candidate retrieved via GET /api/talent-pool!")

        # 5. UPDATE STATUS, TAGS, NOTES
        patch_res = requests.patch(f"{BASE_URL}/talent-pool/{tp_item_id}", json={
            "status": "Interested",
            "tags": ["Cloud Specialist", "Vetted", "Leadership"],
            "recruiterNotes": "Spoke on phone, very interested in Senior Architect role."
        })
        if patch_res.status_code != 200:
            print(f"FAILED PATCH /talent-pool/{tp_item_id}: {patch_res.status_code}")
            sys.exit(1)
        print("4. UPDATE SUCCESS: Updated status to 'Interested', updated tags and recruiterNotes.")

        # 6. VERIFY UPDATES IN POSTGRESQL DIRECTLY
        db.expire_all()
        db_tp_updated = db.query(TalentPoolModel).filter(TalentPoolModel.id == tp_item_id).first()
        if db_tp_updated.status != "Interested" or "Leadership" not in db_tp_updated.tags:
            print(f"FAILED PostgreSQL update check: Got status='{db_tp_updated.status}', tags={db_tp_updated.tags}")
            sys.exit(1)
        print("5. POSTGRESQL CHECK: Verified updated status='Interested' and tags stored in PostgreSQL!")

        # 7. ATTEMPT DUPLICATE ADDITION (409 CONFLICT CHECK)
        dup_res = requests.post(f"{BASE_URL}/talent-pool", json={"candidateId": cand_id})
        if dup_res.status_code == 409:
            print(f"6. 409 CONFLICT CHECK: Verified duplicate candidate addition returned 409 Conflict cleanly! ({dup_res.json()['detail']})")
        else:
            print(f"FAILED 409 Conflict check: Expected 409, got {dup_res.status_code}")
            sys.exit(1)

        # 8. REMOVE FROM TALENT POOL & VERIFY CANDIDATE PRESERVATION
        del_res = requests.delete(f"{BASE_URL}/talent-pool/{tp_item_id}")
        if del_res.status_code != 200:
            print(f"FAILED DELETE /talent-pool/{tp_item_id}: {del_res.status_code}")
            sys.exit(1)
        print("7. DELETE SUCCESS: Removed entry from Talent Pool table.")

        db.expire_all()
        deleted_tp = db.query(TalentPoolModel).filter(TalentPoolModel.id == tp_item_id).first()
        assert deleted_tp is None, "talent_pool row should be deleted!"
        print("8. POSTGRESQL CHECK: Verified row removed from 'talent_pool' table!")

        # CRITICAL: Verify candidate record STILL EXISTS in candidates table!
        cand_still_exists = db.query(CandidateModel).filter(CandidateModel.id == cand_id).first()
        if not cand_still_exists:
            print("FAILED CANDIDATE PRESERVATION CHECK: Candidate row was incorrectly deleted from candidates table!")
            sys.exit(1)
        print(f"9. CANDIDATE PRESERVATION CHECK: Verified candidate '{cand_still_exists.candidateId}' ({cand_still_exists.email}) STILL EXISTS in 'candidates' table!")

        print("\nALL PHASE 2D TALENT POOL API & POSTGRESQL CHECKS PASSED CLEANLY!")

    finally:
        # Cleanup test records
        if tp_item_id:
            db.query(TalentPoolModel).filter(TalentPoolModel.id == tp_item_id).delete()
        db.query(CandidateModel).filter(CandidateModel.id == cand_id).delete()
        db.commit()
        db.close()
        print("Cleanup completed.")

if __name__ == "__main__":
    run_test()
