import datetime
import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.interview import InterviewModel
from models.job import JobModel

def run_sync():
    db = SessionLocal()
    try:
        print("=== SYNCHRONIZING INTERVIEWS IN POSTGRESQL ===")
        
        # 1. Clean up any multi_role test leftovers
        mr_cands = db.query(CandidateModel).filter(CandidateModel.email.ilike("%multi_role%")).all()
        for c in mr_cands:
            c_ids = [c.id, c.candidateId]
            db.query(InterviewModel).filter(InterviewModel.candidateId.in_(c_ids)).delete(synchronize_session=False)
            db.query(ApplicationModel).filter(ApplicationModel.candidateId.in_(c_ids)).delete(synchronize_session=False)
            db.delete(c)
        db.commit()

        # 2. Find all candidates in Interviewing stage
        cands_in_interview = db.query(CandidateModel).filter(CandidateModel.status.ilike("%interview%")).all()
        print(f"Found {len(cands_in_interview)} candidate(s) in Interviewing stage in PostgreSQL.")

        created_count = 0
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        for cand in cands_in_interview:
            c_ids = [cand.id, cand.candidateId]
            app = db.query(ApplicationModel).filter(ApplicationModel.candidateId.in_(c_ids)).first()
            existing_int = db.query(InterviewModel).filter(InterviewModel.candidateId.in_(c_ids)).first()

            if not existing_int:
                target_job_id = app.jobId if app else cand.jobId
                job = db.query(JobModel).filter(JobModel.id == target_job_id).first() if target_job_id else None
                cand_name = f"{cand.firstName or ''} {cand.lastName or ''}".strip() or "Candidate"

                new_int = InterviewModel(
                    id=f"int_{str(uuid.uuid4())[:8]}",
                    applicationId=app.id if app else None,
                    candidateId=cand.id,
                    jobId=job.id if job else (target_job_id or "JOB-0001"),
                    candidateName=cand_name,
                    candidateEmail=cand.email or "",
                    jobTitle=job.title if job else "Open Position",
                    round="Technical Round 1",
                    date=datetime.date.today().isoformat(),
                    time="14:00",
                    interviewer="Hiring Manager",
                    status="Scheduled",
                    createdAt=now,
                    updatedAt=now
                )
                db.add(new_int)
                created_count += 1
                print(f"[OK] Created missing interview record for: {cand_name} ({cand.candidateId})")

        db.commit()
        print(f"\nSUCCESS: Synchronization complete! Created {created_count} missing interview record(s).")

        # Verify final state
        total_interview_cands = db.query(CandidateModel).filter(CandidateModel.status.ilike("%interview%")).count()
        total_interview_records = db.query(InterviewModel).count()
        print(f"\nFinal Verified Counts in PostgreSQL:")
        print(f"- Candidates in 'Interviewing' stage: {total_interview_cands}")
        print(f"- Total Interview records in 'interviews' table: {total_interview_records}")

    finally:
        db.close()

if __name__ == "__main__":
    run_sync()
