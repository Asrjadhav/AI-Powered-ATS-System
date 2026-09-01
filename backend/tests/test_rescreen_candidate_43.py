import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import SessionLocal
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.job import JobModel
from services.application_service import screen_application_resume

def rescreen_test():
    print("\n=============================================================")
    print("      RE-SCREENING CANDIDATES (PREVIOUS SCORE 35% - 48%)     ")
    print("=============================================================\n")

    db = SessionLocal()
    try:
        app_ids = ["t-app-69", "APP-0003", "APP-0004"]
        for app_id in app_ids:
            app = db.query(ApplicationModel).filter(ApplicationModel.id == app_id).first()
            if not app:
                continue

            cand = db.query(CandidateModel).filter(CandidateModel.id == app.candidateId).first()
            job = db.query(JobModel).filter(JobModel.id == app.jobId).first() if app.jobId else None

            prev_score = app.atsScore
            prev_status = app.status

            # Re-run screening with corrected algorithm
            screen_application_resume(db, app.id)

            db.refresh(app)
            new_score = app.atsScore
            new_status = app.status

            print(f"App ID: {app.id}")
            print(f"Candidate: {app.candidateName} | Target Job: {job.title if job else app.appliedRole}")
            print(f"BEFORE Score: {prev_score}%  | BEFORE Status: {prev_status}")
            print(f"AFTER  Score: {new_score}%  | AFTER  Status: {new_status}")
            if app.aiEvaluation:
                ev = app.aiEvaluation
                print(f"Fit Reasoning: {ev.get('fitReasoning')}")
            print("--------------------------------------------------")

        print("\n=============================================================")
        print("                 RE-SCREENING COMPLETE!                      ")
        print("=============================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    rescreen_test()
