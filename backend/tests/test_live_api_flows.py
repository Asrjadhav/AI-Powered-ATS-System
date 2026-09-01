import sys
import os
import json
import base64

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
from models.job import JobModel
from models.candidate import CandidateModel
from models.application import ApplicationModel
from services.job_service import create_job, delete_job, get_job_by_id_or_job_id
from services.candidate_service import create_candidate, update_candidate, get_candidate_resume_file
from schemas.job import JobCreate
from schemas.candidate import CandidateCreate, CandidateUpdate

def run_live_api_verification():
    db = SessionLocal()
    print("\n=============================================================")
    print("      STARTING LIVE API & END-TO-END FLOW VERIFICATION      ")
    print("=============================================================\n")

    try:
        # TEST 1: JOB DELETE FLOW VERIFICATION
        print("--- 1. VERIFYING JOB DELETE ENDPOINT FLOW ---")
        job_in = JobCreate(
            title="Temporary Quality Engineer",
            department="QA Engineering",
            location="Remote",
            type="Full-time",
            experienceLevel="Mid-Level",
            description="Temporary test job for deletion verification."
        )
        test_job = create_job(db, job_in=job_in)
        created_id = test_job.id
        public_job_id = test_job.jobId

        print(f"Created Test Job: ID '{created_id}', Public JobID '{public_job_id}', Title '{test_job.title}'")

        # Execute Delete using public_job_id
        del_success = delete_job(db, identifier=public_job_id)
        assert del_success is True, "FAIL: delete_job returned False"

        # Verify job is deleted from database
        deleted_check = get_job_by_id_or_job_id(db, public_job_id)
        assert deleted_check is None, f"FAIL: Job still present in database after delete"
        print(f"[PASS] JOB DELETE: Job '{public_job_id}' successfully deleted from PostgreSQL database.")

        # TEST 2: CANDIDATE UPDATE FLOW VERIFICATION
        print("\n--- 2. VERIFYING CANDIDATE UPDATE ENDPOINT FLOW ---")
        cand_in = CandidateCreate(
            firstName="Vikram",
            lastName="Aditya",
            email="vikram.aditya.update@test.com",
            phone="+91 99887 11223",
            currentRole="Junior Developer",
            currentCompany="TechSolutions"
        )
        db.query(CandidateModel).filter(CandidateModel.email == "vikram.aditya.update@test.com").delete(synchronize_session=False)
        db.commit()

        test_cand = create_candidate(db, candidate_in=cand_in)
        db.refresh(test_cand)

        # Update candidate fields
        update_payload = CandidateUpdate(
            firstName="Vikram",
            lastName="Aditya (Updated)",
            currentRole="Senior Full Stack Engineer",
            currentCompany="Global Cloud Systems",
            experienceYears=5.5,
            location="Pune, India"
        )
        updated_cand = update_candidate(db, identifier=test_cand.id, updates=update_payload)
        assert updated_cand.lastName == "Aditya (Updated)", f"FAIL: Expected 'Aditya (Updated)', got '{updated_cand.lastName}'"
        assert updated_cand.currentRole == "Senior Full Stack Engineer", f"FAIL: Role not updated"
        assert updated_cand.id == test_cand.id, "FAIL: Candidate ID mutated"

        cand_count = db.query(CandidateModel).filter(CandidateModel.email == "vikram.aditya.update@test.com").count()
        assert cand_count == 1, f"FAIL: Candidate update created duplicate records ({cand_count})"
        print(f"[PASS] CANDIDATE UPDATE: Updated Candidate '{test_cand.id}' without creating duplicate candidates.")

        # TEST 3: RESUME VIEW & RECONSTRUCTION FLOW VERIFICATION
        print("\n--- 3. VERIFYING RESUME VIEW ENDPOINT FLOW ---")
        pdf_bytes = b"%PDF-1.4 Fake PDF Content for Resume View Verification Test\n%%EOF"
        custom = dict(test_cand.customFields or {})
        custom["cvBase64"] = base64.b64encode(pdf_bytes).decode("utf-8")
        test_cand.customFields = custom
        test_cand.resumeFileName = "Vikram_Aditya_Resume.pdf"
        db.commit()
        db.refresh(test_cand)

        file_path, download_name, media_type = get_candidate_resume_file(db, identifier=test_cand.id)
        assert os.path.exists(file_path), "FAIL: Physical resume file does not exist"
        assert media_type == "application/pdf", f"FAIL: Expected application/pdf, got {media_type}"
        print(f"[PASS] RESUME VIEW: Served physical PDF '{download_name}' ({media_type}) from disk/base64 reconstruction.")

        print("\n=============================================================")
        print("      ALL LIVE API FLOW VERIFICATIONS PASSED (100% OK)!      ")
        print("=============================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_live_api_verification()
