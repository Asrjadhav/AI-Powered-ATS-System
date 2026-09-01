import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
import config
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.job import JobModel
from models.talent_pool import TalentPoolModel
from models.notification import NotificationModel
from services.application_service import screen_application_resume
from services.talent_pool_service import list_talent_pool, get_talent_pool_by_id

def run_tests():
    db = SessionLocal()
    print("\n=============================================================")
    print("   STARTING AUTOMATED TALENT POOL RETENTION TEST SUITE      ")
    print("=============================================================\n")

    try:
        # Clean previous test records (talent pool and applications first)
        db.query(TalentPoolModel).filter(TalentPoolModel.candidateId.like("t-tp-%")).delete(synchronize_session=False)
        db.query(ApplicationModel).filter(ApplicationModel.candidateId.like("t-tp-%")).delete(synchronize_session=False)
        db.query(ApplicationModel).filter(ApplicationModel.id.like("t-tp-%")).delete(synchronize_session=False)
        db.query(CandidateModel).filter(CandidateModel.id.like("t-tp-%")).delete(synchronize_session=False)
        db.commit()

        # 1. Create Target Job: "Full Stack Developer"
        job = db.query(JobModel).filter(JobModel.title == "Full Stack Developer").first()
        if not job:
            job = JobModel(
                id="job-fs-tp-001",
                jobId="JOB-FS-TP-001",
                title="Full Stack Developer",
                department="Engineering",
                status="active"
            )
            db.add(job)
            db.commit()

        # 2. Create Candidate profile & Application for score = 60%
        cand_id = "t-tp-cand-60"
        app_id = "t-tp-app-60"

        cand = CandidateModel(
            id=cand_id,
            candidateId=cand_id,
            firstName="Priya",
            lastName="Nair",
            email="priya.nair.tp@test.com",
            phone="+91 98765 00060",
            currentRole="Frontend Developer Intern",
            resumeText="Resume content for Priya Nair with Frontend HTML CSS JS basic experience."
        )
        db.add(cand)
        db.commit()

        app = ApplicationModel(
            id=app_id,
            applicationId=f"APP-{cand_id}",
            candidateId=cand_id,
            jobId=job.id,
            candidateName="Priya Nair",
            candidateEmail="priya.nair.tp@test.com",
            appliedRole="Full Stack Developer",
            status="Applied",
            aiEvaluation={
                "score": 60,
                "summary": "Evaluation score 60%",
                "strengths": ["Basic JS"],
                "gaps": ["Lacks backend Node.js and PostgreSQL experience"],
                "interviewQuestions": ["Explain closures"],
                "fitReasoning": "Assigned score 60% (Below 70% threshold)"
            }
        )
        db.add(app)
        db.commit()

        # 3. Run ATS screening
        res = screen_application_resume(db, app.id)
        db.refresh(app)
        db.refresh(cand)

        # 4. Verify Application & Candidate status = Rejected
        assert app.status == "Rejected", f"FAIL: Expected Application Rejected, got '{app.status}'"
        assert cand.status == "Rejected", f"FAIL: Expected Candidate Rejected, got '{cand.status}'"
        print("[PASS] TEST 1: Candidate score = 60% -> Application & Candidate set to Rejected")

        # 5. Verify Notification created
        notif = db.query(NotificationModel).filter(NotificationModel.candidateName == "Priya Nair").first()
        assert notif is not None, "FAIL: Rejection notification not created"
        print(f"[PASS] TEST 2: Rejection notification created -> '{notif.title}' ({notif.message})")

        # 6. Verify Rejection Email flag set
        assert app.aiEvaluation.get("rejectionEmailSent") is True, "FAIL: Rejection email not triggered"
        print("[PASS] TEST 3: Rejection email triggered (idempotent)")

        # 7. Verify Candidate automatically added to Talent Pool
        tp_item = get_talent_pool_by_id(db, cand_id)
        assert tp_item is not None, "FAIL: Candidate not added to Talent Pool"
        print(f"[PASS] TEST 4: Candidate automatically added to Talent Pool -> ID '{tp_item.id}'")

        # 8. Verify GET /api/talent-pool API response
        all_tp = list_talent_pool(db)
        match_tp = next((item for item in all_tp if item.get("email") == "priya.nair.tp@test.com"), None)
        assert match_tp is not None, "FAIL: GET /api/talent-pool missing candidate"
        
        history = match_tp.get("recruitmentHistory", {})
        assert history.get("previousAtsScore") is not None or history.get("atsScore") is not None, "FAIL: Missing previousAtsScore"
        score_val = history.get("previousAtsScore") or history.get("atsScore")
        assert score_val < 70, f"FAIL: Expected score < 70, got {score_val}"
        
        print("\n[PASS] TEST 5: GET /api/talent-pool returned candidate with full historical details:")
        print(f"  - Candidate Name: {match_tp['name']}")
        print(f"  - Previous Applied Job: {history.get('appliedJob') or history.get('previousRole')}")
        print(f"  - Previous Status: {history.get('previousStatus') or history.get('previousStage')}")
        print(f"  - Previous ATS Score: {score_val}%")

        # 9. Verify Idempotency (Re-screening does NOT create duplicate Candidate or TalentPool entry)
        cand_count_before = db.query(CandidateModel).filter(CandidateModel.email == "priya.nair.tp@test.com").count()
        tp_count_before = db.query(TalentPoolModel).filter(TalentPoolModel.candidateId == cand.id).count()

        screen_application_resume(db, app.id)

        cand_count_after = db.query(CandidateModel).filter(CandidateModel.email == "priya.nair.tp@test.com").count()
        tp_count_after = db.query(TalentPoolModel).filter(TalentPoolModel.candidateId == cand.id).count()

        assert cand_count_before == cand_count_after == 1, f"FAIL: Duplicate Candidate created ({cand_count_after})"
        assert tp_count_before == tp_count_after == 1, f"FAIL: Duplicate Talent Pool entry created ({tp_count_after})"
        print("\n[PASS] TEST 6: Idempotency check -> Re-evaluating candidate creates 0 duplicate candidate or talent pool rows")

        print("\n=============================================================")
        print("    ALL AUTOMATED TALENT POOL TESTS PASSED (100% OK)!        ")
        print("=============================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
