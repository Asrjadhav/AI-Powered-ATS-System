import datetime
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.job import JobModel
from models.offer import OfferModel

def seed_offers():
    db = SessionLocal()
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        offered_cands = db.query(CandidateModel).filter(CandidateModel.status.ilike("%offered%")).all()
        print(f"Found {len(offered_cands)} candidate(s) in Offered stage in PostgreSQL.")

        for cand in offered_cands:
            c_ids = [cand.id, cand.candidateId]
            existing = db.query(OfferModel).filter(OfferModel.candidateId.in_(c_ids)).first()
            if not existing:
                app = db.query(ApplicationModel).filter(ApplicationModel.candidateId.in_(c_ids)).first()
                job = db.query(JobModel).filter(JobModel.id == (app.jobId if app else cand.jobId)).first()
                cand_name = f"{cand.firstName or ''} {cand.lastName or ''}".strip() or "Candidate"

                new_off = OfferModel(
                    id=f"OFF-2026-{str(uuid.uuid4())[:6].upper()}",
                    candidateId=cand.id,
                    jobId=job.id if job else (cand.jobId or "JOB-0005"),
                    applicationId=app.id if app else None,
                    candidateName=cand_name,
                    candidateEmail=cand.email or "",
                    jobTitle=job.title if job else "Frontend Developer - Fresher",
                    department=job.department if job else "Product Engineering",
                    offeredCTC=cand.expectedCTC or 1500000.0,
                    joiningDate=(datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
                    status="Pending",
                    workflowStage="Offer Generation",
                    contractTemplate="Standard Employment Agreement",
                    customTerms="Standard employment offer terms.",
                    createdAt=now,
                    updatedAt=now
                )
                db.add(new_off)
                print(f"[OK] Seeded offer for candidate: {cand_name} ({cand.candidateId})")

        db.commit()

        print("\n=== POSTGRESQL OFFERS TABLE ===")
        offs = db.query(OfferModel).all()
        for o in offs:
            print(f"  - {o.id} | Candidate: {o.candidateName} ({o.candidateId}) | Status: {o.status} | Job: {o.jobTitle}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_offers()
