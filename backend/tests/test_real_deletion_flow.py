import os
import sys
import requests
import json

sys.path.insert(0, os.path.abspath("backend"))

from database import SessionLocal
from models.candidate import CandidateModel

RESUMES_DIR = os.path.join(os.path.abspath("backend"), "uploads", "resumes")

def run_real_deletion_tests():
    print("\n--- STARTING REAL CANDIDATE DELETION FLOW VERIFICATION ---")

    # 1. Create Candidate CAND-TEST-DELETE with a real PDF resume
    cand_payload = {
        "candidateId": "CAND-TEST-DELETE",
        "firstName": "TestDelete",
        "lastName": "Candidate",
        "email": "test.delete.cand@example.com",
        "phone": "9998887776",
        "currentRole": "QA Engineer",
        "currentCompany": "TestCorp"
    }

    db = SessionLocal()
    try:
        from services import candidate_service
        cand_in = candidate_service.CandidateCreate(**cand_payload)
        created_cand = candidate_service.create_candidate(db, cand_in)
        cand_id_str = created_cand.candidateId or created_cand.id
        print(f"1. Created Candidate '{cand_id_str}' in PostgreSQL (DB ID: '{created_cand.id}').")

        # Upload physical PDF resume
        pdf_bytes = b"%PDF-1.4 %-Test PDF Document for Candidate Deletion Test-%%EOF\n"
        upload_res = candidate_service.upload_candidate_resume(
            db=db,
            identifier=cand_id_str,
            file_bytes=pdf_bytes,
            original_filename="sample_delete_resume.pdf",
            content_type="application/pdf"
        )
        print(f"   Uploaded physical resume for {cand_id_str}. Storage key: {upload_res.resumeStorageKey}")

        cand_folder = os.path.join(RESUMES_DIR, cand_id_str)
        assert os.path.exists(cand_folder), f"Expected folder {cand_folder} to exist on disk!"
        files_in_folder = os.listdir(cand_folder)
        print(f"   Physical filesystem check: Directory '{cand_folder}' contains {files_in_folder}.")
        assert len(files_in_folder) == 1, f"Expected 1 file in {cand_folder}, found {len(files_in_folder)}"

        # 2. Execute deletion using the primary candidate identifier (simulating frontend confirm delete button)
        print(f"\n2. Executing candidate deletion for '{cand_id_str}'...")
        del_success = candidate_service.delete_candidate(db, identifier=cand_id_str)
        assert del_success is True, "Expected delete_candidate to return True"

        # 3. Verify PostgreSQL candidate record is deleted
        db.expire_all()
        db_check = candidate_service.get_candidate_by_id_or_candidate_id(db, cand_id_str)
        assert db_check is None, f"Expected candidate '{cand_id_str}' to be deleted from PostgreSQL, but it still exists!"
        print(f"   PostgreSQL Check: Candidate '{cand_id_str}' successfully purged from DB.")

        # 4. Verify physical resume folder and file are completely deleted from disk
        assert not os.path.exists(cand_folder), f"FAILED: Physical directory '{cand_folder}' still exists on disk!"
        print(f"   Filesystem Check: Physical directory '{cand_folder}' completely removed from disk!")

        # 5. TEST DELETING A CANDIDATE WITH NO RESUME
        print("\n3. Testing candidate deletion for candidate WITH NO RESUME...")
        no_resume_cand_payload = {
            "candidateId": "CAND-NO-RESUME",
            "firstName": "NoResume",
            "lastName": "User",
            "email": "no.resume.user@example.com"
        }
        no_res_cand_in = candidate_service.CandidateCreate(**no_resume_cand_payload)
        no_res_cand = candidate_service.create_candidate(db, no_res_cand_in)
        no_res_id = no_res_cand.candidateId
        print(f"   Created Candidate '{no_res_id}' with NO physical resume.")

        no_res_del_success = candidate_service.delete_candidate(db, identifier=no_res_id)
        assert no_res_del_success is True, "Expected no-resume candidate deletion to succeed!"
        
        db.expire_all()
        no_res_db_check = candidate_service.get_candidate_by_id_or_candidate_id(db, no_res_id)
        assert no_res_db_check is None, f"Expected candidate '{no_res_id}' to be deleted from DB!"
        print(f"   PostgreSQL Check: No-resume candidate '{no_res_id}' successfully purged from DB.")

        print("\n=============================================================")
        print("REAL CANDIDATE DELETION FLOW TEST PASSED 100%!")
        print("=============================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_real_deletion_tests()
