import requests
import sys
import os
import uuid
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.email_template import EmailTemplateModel

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("\n--- Starting Phase 2F Email Templates API & PostgreSQL Test Workflow ---")
    db: Session = SessionLocal()

    test_id = str(uuid.uuid4())[:8]
    temp_id = f"temp-test-{test_id}"

    try:
        # 1. CREATE TEMPLATE VIA API
        create_res = requests.post(f"{BASE_URL}/templates", json={
            "id": temp_id,
            "name": f"Test Interview Invitation {test_id}",
            "category": "Interview Invitation",
            "subject": "Interview Invitation for {{job_title}} at {{company_name}}",
            "body": "Dear {{candidate_name}},\n\nWe would like to invite you for an interview with {{recruiter_name}} on {{interview_date}}.\n\nBest,\n{{company_name}}",
            "variables": ["candidate_name", "job_title", "company_name", "recruiter_name", "interview_date"]
        })

        if create_res.status_code != 201:
            print(f"FAILED POST /templates: {create_res.status_code} - {create_res.text}")
            sys.exit(1)

        temp_data = create_res.json()
        print(f"1. POST API SUCCESS: Created template '{temp_data['id']}' ({temp_data['name']}).")

        # 2. VERIFY POSTGRESQL EMAIL_TEMPLATES TABLE DIRECTLY
        db.expire_all()
        db_temp = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == temp_id).first()
        if not db_temp or db_temp.category != "Interview Invitation" or "interview_date" not in db_temp.variables:
            print(f"FAILED PostgreSQL check: Got category='{db_temp.category if db_temp else None}', variables={db_temp.variables if db_temp else None}")
            sys.exit(1)
        print(f"2. POSTGRESQL CHECK: Verified row in 'email_templates' table! (name='{db_temp.name}', category='{db_temp.category}')")

        # 3. GET TEMPLATES LIST
        get_res = requests.get(f"{BASE_URL}/templates")
        if get_res.status_code != 200 or not any(t["id"] == temp_id for t in get_res.json()):
            print(f"FAILED GET /templates: {get_res.status_code}")
            sys.exit(1)
        print("3. GET ALL SUCCESS: Template retrieved via GET /api/templates!")

        # 4. UPDATE TEMPLATE DETAILS VIA PATCH
        patch_res = requests.patch(f"{BASE_URL}/templates/{temp_id}", json={
            "name": f"Updated Test Invitation {test_id}",
            "subject": "UPDATED: Technical Interview Invitation for {{job_title}}",
            "category": "Interview Invitation",
            "variables": ["candidate_name", "job_title", "company_name", "recruiter_name", "interview_date", "meeting_link"]
        })
        if patch_res.status_code != 200:
            print(f"FAILED PATCH /templates/{temp_id}: {patch_res.status_code}")
            sys.exit(1)
        print("4. PATCH API SUCCESS: Updated name, subject, and variables.")

        # 5. VERIFY UPDATES IN POSTGRESQL DIRECTLY
        db.expire_all()
        db_temp_updated = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == temp_id).first()
        if db_temp_updated.name != f"Updated Test Invitation {test_id}" or "meeting_link" not in db_temp_updated.variables:
            print(f"FAILED PostgreSQL update check: Got name='{db_temp_updated.name}', variables={db_temp_updated.variables}")
            sys.exit(1)
        print("5. POSTGRESQL CHECK: Verified updated name and variables stored in PostgreSQL 'email_templates' table!")

        # 6. DELETE TEMPLATE
        del_res = requests.delete(f"{BASE_URL}/templates/{temp_id}")
        if del_res.status_code != 200:
            print(f"FAILED DELETE /templates/{temp_id}: {del_res.status_code}")
            sys.exit(1)
        print("6. DELETE API SUCCESS: Deleted template.")

        db.expire_all()
        deleted_temp = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == temp_id).first()
        assert deleted_temp is None, "Template row should be deleted from PostgreSQL!"
        print("7. POSTGRESQL CHECK: Verified row cleanly removed from 'email_templates' table!")

        print("\nALL PHASE 2F EMAIL TEMPLATES API & POSTGRESQL CHECKS PASSED CLEANLY!")

    finally:
        db.query(EmailTemplateModel).filter(EmailTemplateModel.id == temp_id).delete()
        db.commit()
        db.close()
        print("Cleanup completed.")

if __name__ == "__main__":
    run_test()
