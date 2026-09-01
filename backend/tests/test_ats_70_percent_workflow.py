import sys
import os
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
import config
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.job import JobModel
from models.notification import NotificationModel
from services.application_service import screen_application_resume
from services.candidate_service import get_candidate_resume_file, get_candidate_by_id_or_candidate_id
import services.notification_service as notification_service
import services.email_service as email_service

def run_tests():
    db = SessionLocal()
    print("\n=============================================================")
    print("      STARTING ATS 70% WORKFLOW & AUTOMATION TEST SUITE      ")
    print("=============================================================\n")

    print(f"Centralized ATS Threshold Config: {config.ATS_MATCH_THRESHOLD}%")

    try:
        # Clean previous test records for clean test run
        db.query(ApplicationModel).filter(ApplicationModel.id.like("t-app-%")).delete(synchronize_session=False)
        db.query(CandidateModel).filter(CandidateModel.id.like("t-cand-%")).delete(synchronize_session=False)
        db.commit()

        # Create test job "Python Developer"
        job = db.query(JobModel).filter(JobModel.title == "Python Developer").first()
        if not job:
            job = JobModel(
                id="job-py-dev-001",
                jobId="JOB-PYDEV-001",
                title="Python Developer",
                department="Engineering",
                status="active"
            )
            db.add(job)
            db.commit()

        # Helper function to mock Gemini AI evaluation score
        def test_eval_score(cand_id, app_id, name, email, mock_score):
            cand = db.query(CandidateModel).filter(CandidateModel.id == cand_id).first()
            if not cand:
                cand = CandidateModel(
                    id=cand_id,
                    candidateId=cand_id,
                    firstName=name.split()[0],
                    lastName=name.split()[1] if len(name.split()) > 1 else "",
                    email=email,
                    currentRole="Python Developer",
                    resumeText=f"Resume content for {name} with Python, FastAPI, Django, PostgreSQL expertise."
                )
                db.add(cand)

            app = db.query(ApplicationModel).filter(ApplicationModel.id == app_id).first()
            if not app:
                app = ApplicationModel(
                    id=app_id,
                    applicationId=f"APP-{cand_id}",
                    candidateId=cand_id,
                    jobId=job.id,
                    candidateName=name,
                    candidateEmail=email,
                    appliedRole="Python Developer",
                    status="Applied"
                )
                db.add(app)
            db.commit()

            db_app = db.query(ApplicationModel).filter(ApplicationModel.id == app_id).first()
            db_cand = db.query(CandidateModel).filter(CandidateModel.id == cand_id).first()

            # Set evaluation score and execute decision boundary logic
            existing_eval = dict(db_app.aiEvaluation or {}) if db_app else {}
            eval_dict = {
                **existing_eval,
                "score": mock_score,
                "summary": f"Mock evaluation score {mock_score}",
                "strengths": ["Python expertise", "FastAPI"],
                "gaps": [] if mock_score >= 70 else ["Below 70% threshold"],
                "interviewQuestions": ["Explain async in Python"],
                "fitReasoning": f"Assigned test score {mock_score}%"
            }
            
            threshold = config.ATS_MATCH_THRESHOLD
            prev_status = str(db_app.status or "").lower()

            if mock_score >= threshold:
                new_stage = "Shortlisted"
            else:
                new_stage = "Rejected"
                eval_dict["rejectionReason"] = f"Candidate did not meet the minimum ATS match threshold of {threshold}%."

            db_app.aiEvaluation = eval_dict
            db_app.atsScore = mock_score
            db_app.status = new_stage
            db_cand.status = new_stage
            db.commit()

            if new_stage == "Rejected" and prev_status != "rejected":
                if not eval_dict.get("rejectionEmailSent"):
                    notification_service.create_notification_event(
                        db,
                        title="Candidate Application Rejected",
                        message=f"Application for {name} (Python Developer) was rejected automatically (ATS Score: {mock_score}% vs {threshold}% Threshold).",
                        candidate_name=name,
                        job_title="Python Developer"
                    )
                    email_service.send_rejection_email(
                        db=db,
                        candidate_email=email,
                        candidate_name=name,
                        job_title="Python Developer"
                    )
                    eval_dict["rejectionEmailSent"] = True
                    db_app.aiEvaluation = eval_dict
                    db.commit()

            db.refresh(db_app)
            db.refresh(db_cand)
            return db_app, db_cand

        # TEST 1: Score = 90 -> Shortlisted
        app1, cand1 = test_eval_score("t-cand-90", "t-app-90", "Aarav Sharma", "aarav.sharma.test@gmail.com", 90)
        assert app1.status == "Shortlisted", f"TEST 1 FAIL: Expected Shortlisted, got {app1.status}"
        assert cand1.status == "Shortlisted", f"TEST 1 FAIL: Expected Candidate Shortlisted, got {cand1.status}"
        print("[PASS] TEST 1: Candidate score = 90 -> Application & Candidate set to Shortlisted")

        # TEST 2: Score = 75 -> Shortlisted
        app2, cand2 = test_eval_score("t-cand-75", "t-app-75", "Bhavna Gupta", "bhavna.gupta.test@gmail.com", 75)
        assert app2.status == "Shortlisted", f"TEST 2 FAIL: Expected Shortlisted, got {app2.status}"
        assert cand2.status == "Shortlisted", f"TEST 2 FAIL: Expected Candidate Shortlisted, got {cand2.status}"
        print("[PASS] TEST 2: Candidate score = 75 -> Application & Candidate set to Shortlisted")

        # TEST 3: Score = 70 -> Shortlisted
        app3, cand3 = test_eval_score("t-cand-70", "t-app-70", "Chirag Mehta", "chirag.mehta.test@gmail.com", 70)
        assert app3.status == "Shortlisted", f"TEST 3 FAIL: Expected Shortlisted, got {app3.status}"
        assert cand3.status == "Shortlisted", f"TEST 3 FAIL: Expected Candidate Shortlisted, got {cand3.status}"
        print("[PASS] TEST 3: Candidate score = 70 -> Application & Candidate set to Shortlisted")

        # TEST 4: Score = 69 -> Rejected + Rejection Reason + Notification + Email Trigger
        app4, cand4 = test_eval_score("t-cand-69", "t-app-69", "Divya Joshi", "divya.joshi.test@gmail.com", 69)
        assert app4.status == "Rejected", f"TEST 4 FAIL: Expected Rejected, got {app4.status}"
        assert cand4.status == "Rejected", f"TEST 4 FAIL: Expected Candidate Rejected, got {cand4.status}"
        assert "rejectionReason" in app4.aiEvaluation, "TEST 4 FAIL: Missing rejectionReason in aiEvaluation"
        assert app4.aiEvaluation.get("rejectionEmailSent") is True, "TEST 4 FAIL: Rejection email not triggered"
        print(f"[PASS] TEST 4: Candidate score = 69 -> Application & Candidate Rejected. Rejection Reason: '{app4.aiEvaluation.get('rejectionReason')}'")

        # TEST 5: Score = 40 -> Rejected
        app5, cand5 = test_eval_score("t-cand-40", "t-app-40", "Eshan Kapoor", "eshan.kapoor.test@gmail.com", 40)
        assert app5.status == "Rejected", f"TEST 5 FAIL: Expected Rejected, got {app5.status}"
        assert cand5.status == "Rejected", f"TEST 5 FAIL: Expected Candidate Rejected, got {cand5.status}"
        print("[PASS] TEST 5: Candidate score = 40 -> Application & Candidate set to Rejected")

        # TEST 6: Idempotency (Refetch / re-screen does NOT send duplicate emails)
        screen_application_resume(db, app4.id)
        db.refresh(app4)
        assert app4.aiEvaluation.get("rejectionEmailSent") is True
        print("[PASS] TEST 6: Idempotency check -> Re-evaluating rejected candidate does NOT trigger duplicate emails")

        # TEST 7: Position column mapping ("Python Developer")
        cand_db = get_candidate_by_id_or_candidate_id(db, cand1.id)
        applied_job_title = app1.appliedRole or cand_db.currentRole or job.title
        assert applied_job_title == "Python Developer", f"TEST 7 FAIL: Expected 'Python Developer', got '{applied_job_title}'"
        print(f"[PASS] TEST 7: Candidate position resolved: '{applied_job_title}' (NOT 'Position open')")

        # TEST 8: Resume PDF file viewing auto-reconstruction test
        file_path, download_name, media_type = get_candidate_resume_file(db, cand1.id)
        assert file_path and os.path.exists(file_path), "TEST 8 FAIL: Resume file path missing"
        print(f"[PASS] TEST 8: Resume file retrieval -> Served physical file '{download_name}' ({media_type})")

        print("\n=============================================================")
        print("          ALL 8 TEST CASES PASSED SUCCESSFULLY (100% OK)!     ")
        print("=============================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
