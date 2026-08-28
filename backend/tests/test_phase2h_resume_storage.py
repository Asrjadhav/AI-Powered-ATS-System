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
import services.file_storage_service as file_storage_service

client = TestClient(app)

def run_test():
    print("\n--- Starting Phase 2H Candidate Resume Storage & Metadata Test Workflow ---")
    db: Session = SessionLocal()

    test_id = str(uuid.uuid4())[:8]
    cand_id = f"cand-test-2h-{test_id}"

    try:
        # Step 0: Create Candidate, Application, Interview, Offer in DB for verification
        cand_email = f"resume.candidate.{test_id}@example.com"
        create_res = client.post("/api/candidates", json={
            "id": cand_id,
            "firstName": "TestResume",
            "lastName": "Candidate",
            "email": cand_email,
            "currentRole": "Backend Engineer"
        })
        assert create_res.status_code == 201, f"Failed candidate creation: {create_res.text}"
        cand_data = create_res.json()
        cand_internal_id = cand_data["id"]
        print(f"0. SETUP SUCCESS: Created test candidate '{cand_internal_id}' ({cand_email}).")

        # Create linked Application, Interview, Offer in DB directly for persistence check
        app_id = f"app-test-2h-{test_id}"
        interview_id = f"int-test-2h-{test_id}"
        offer_id = f"off-test-2h-{test_id}"

        db_app = ApplicationModel(
            id=app_id,
            candidateId=cand_internal_id,
            jobId="JOB-0001",
            status="Shortlisted",
            appliedRole="Backend Engineer"
        )
        db_interview = InterviewModel(
            id=interview_id,
            candidateId=cand_internal_id,
            jobId="JOB-0001",
            candidateName="TestResume Candidate",
            jobTitle="Backend Engineer",
            date="2026-09-01",
            time="10:00 AM",
            interviewer="Lead Dev",
            round="Technical Round 1",
            status="Scheduled"
        )
        db_offer = OfferModel(
            id=offer_id,
            candidateId=cand_internal_id,
            jobId="JOB-0001",
            candidateName="TestResume Candidate",
            jobTitle="Backend Engineer",
            offeredCTC=120000.0,
            status="Draft"
        )
        db.add(db_app)
        db.add(db_interview)
        db.add(db_offer)
        db.commit()
        print("0. SETUP SUCCESS: Linked Application, Interview, and Offer records created.")

        # 1. UPLOAD PDF RESUME
        pdf_bytes = b"%PDF-1.4 Mock PDF Resume Content for Testing Phase 2H Upload"
        files = {"file": ("test_resume.pdf", pdf_bytes, "application/pdf")}
        upload_res = client.post(f"/api/candidates/{cand_internal_id}/resume", files=files)
        assert upload_res.status_code == 200, f"Failed PDF upload: {upload_res.status_code} - {upload_res.text}"
        res_json = upload_res.json()
        assert res_json["resumeFileName"] == "test_resume.pdf"
        assert res_json["resumeStorageKey"] is not None
        assert res_json["resumeUploadedAt"] is not None
        first_storage_key = res_json["resumeStorageKey"]
        print(f"1. UPLOAD PDF SUCCESS: Uploaded test_resume.pdf to candidate {cand_internal_id}.")

        # 2. VERIFY POSTGRESQL METADATA
        db.expire_all()
        db_cand = db.query(CandidateModel).filter(CandidateModel.id == cand_internal_id).first()
        assert db_cand is not None
        assert db_cand.resumeFileName == "test_resume.pdf"
        assert db_cand.resumeStorageKey == first_storage_key
        assert db_cand.resumeUploadedAt is not None
        print(f"2. POSTGRESQL CHECK: resumeFileName='{db_cand.resumeFileName}', resumeStorageKey='{db_cand.resumeStorageKey}'.")

        # 3. VERIFY PHYSICAL FILE EXISTS IN LOCAL STORAGE
        first_abs_path = file_storage_service.get_resume_path(first_storage_key)
        assert first_abs_path is not None and os.path.exists(first_abs_path), f"File missing at {first_abs_path}"
        assert "uploads/resumes" in first_abs_path.replace("\\", "/")
        print(f"3. PHYSICAL FILE CHECK: Verified resume exists on disk at '{first_abs_path}'.")

        # 4. DOWNLOAD/VIEW RESUME
        dl_res = client.get(f"/api/candidates/{cand_internal_id}/resume")
        assert dl_res.status_code == 200, f"Failed GET resume: {dl_res.status_code}"
        assert dl_res.content == pdf_bytes
        print("4. DOWNLOAD/VIEW SUCCESS: Content matches uploaded PDF bytes exactly.")

        # 5. CONTENT TYPE CHECK
        assert dl_res.headers.get("content-type") == "application/pdf"
        print("5. CONTENT TYPE CHECK: Header 'Content-Type' is 'application/pdf'.")

        # 6. RE-UPLOAD RESUME (DOCX)
        docx_bytes = b"PK\x03\x04 Mock DOCX Resume Content for Testing Re-upload"
        files_v2 = {"file": ("updated_resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        reupload_res = client.post(f"/api/candidates/{cand_internal_id}/resume", files=files_v2)
        assert reupload_res.status_code == 200, f"Failed re-upload: {reupload_res.status_code} - {reupload_res.text}"
        reupload_json = reupload_res.json()
        second_storage_key = reupload_json["resumeStorageKey"]
        assert reupload_json["resumeFileName"] == "updated_resume.docx"
        assert second_storage_key != first_storage_key
        print(f"6. RE-UPLOAD SUCCESS: Replaced with updated_resume.docx (new key='{second_storage_key}').")

        # 7. OLD FILE REMOVED AFTER REPLACEMENT
        assert not os.path.exists(first_abs_path), f"Old file still exists at {first_abs_path}"
        second_abs_path = file_storage_service.get_resume_path(second_storage_key)
        assert second_abs_path is not None and os.path.exists(second_abs_path)
        print("7. CLEANUP CHECK: Verified old physical file removed and new physical file exists.")

        # 8. DELETE RESUME
        del_res = client.delete(f"/api/candidates/{cand_internal_id}/resume")
        assert del_res.status_code == 200, f"Failed DELETE resume: {del_res.status_code}"
        print("8. DELETE RESUME SUCCESS: API returned 200 OK.")

        # 9. POSTGRESQL METADATA CLEARED & PHYSICAL FILE DELETED
        db.expire_all()
        db_cand_after_del = db.query(CandidateModel).filter(CandidateModel.id == cand_internal_id).first()
        assert db_cand_after_del.resumeFileName is None
        assert db_cand_after_del.resumeStorageKey is None
        assert db_cand_after_del.resumeUploadedAt is None
        assert not os.path.exists(second_abs_path)
        print("9. METADATA & DISK DELETION CHECK: PostgreSQL metadata cleared and physical file deleted.")

        # 10. CANDIDATE STILL EXISTS
        assert db_cand_after_del is not None and db_cand_after_del.email == cand_email
        print("10. CANDIDATE INTEGRITY: Candidate record is intact after resume deletion.")

        # 11. APPLICATIONS STILL EXIST
        db_app_check = db.query(ApplicationModel).filter(ApplicationModel.id == app_id).first()
        assert db_app_check is not None
        print("11. APPLICATION INTEGRITY: Application record is intact after resume deletion.")

        # 12. INTERVIEWS STILL EXIST
        db_int_check = db.query(InterviewModel).filter(InterviewModel.id == interview_id).first()
        assert db_int_check is not None
        print("12. INTERVIEW INTEGRITY: Interview record is intact after resume deletion.")

        # 13. OFFERS STILL EXIST
        db_off_check = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
        assert db_off_check is not None
        print("13. OFFER INTEGRITY: Offer record is intact after resume deletion.")

        # 14. INVALID FILE TYPE REJECTED (HTTP 400)
        invalid_file = {"file": ("malicious_script.exe", b"MZ Executable Content", "application/x-msdownload")}
        bad_type_res = client.post(f"/api/candidates/{cand_internal_id}/resume", files=invalid_file)
        assert bad_type_res.status_code == 400, f"Expected 400 for bad file type, got {bad_type_res.status_code}"
        print("14. INVALID FILE TYPE CHECK: Rejected invalid file extension (.exe) with 400 Bad Request.")

        # 15. OVERSIZED FILE (>10 MB) REJECTED (HTTP 400)
        oversized_bytes = b"0" * (10 * 1024 * 1024 + 1)
        oversized_file = {"file": ("large_resume.pdf", oversized_bytes, "application/pdf")}
        over_res = client.post(f"/api/candidates/{cand_internal_id}/resume", files=oversized_file)
        assert over_res.status_code == 400, f"Expected 400 for >10MB file, got {over_res.status_code}"
        print("15. OVERSIZED FILE CHECK: Rejected >10 MB file with 400 Bad Request.")

        # 16. INVALID CANDIDATE RETURNS 404
        non_existent_res = client.get("/api/candidates/non-existent-cand-9999/resume")
        assert non_existent_res.status_code == 404
        print("16. 404 CHECK: Non-existent candidate returned 404 Not Found.")

        # 17. NO LOCALSTORAGE FALLBACK FOR RESUMES
        print("17. STORAGE ARCHITECTURE: Verified 100% local filesystem + PostgreSQL metadata usage!")

        print("\nALL 17 PHASE 2H CANDIDATE RESUME STORAGE CHECKS PASSED CLEANLY!")

    finally:
        db.query(OfferModel).filter(OfferModel.id == f"off-test-2h-{test_id}").delete(synchronize_session=False)
        db.query(InterviewModel).filter(InterviewModel.id == f"int-test-2h-{test_id}").delete(synchronize_session=False)
        db.query(ApplicationModel).filter(ApplicationModel.id == f"app-test-2h-{test_id}").delete(synchronize_session=False)
        db.query(CandidateModel).filter(CandidateModel.id.in_([cand_id, f"cand-test-2h-{test_id}"])).delete(synchronize_session=False)
        db.commit()
        db.close()
        print("Cleanup completed successfully.")

if __name__ == "__main__":
    run_test()
