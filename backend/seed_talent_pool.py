import datetime
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.candidate import CandidateModel
from models.talent_pool import TalentPoolModel

def seed_real_talent_pool():
    db = SessionLocal()
    try:
        cands = db.query(CandidateModel).all()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        added_count = 0

        for cand in cands:
            c_ids = [cand.id, cand.candidateId]
            existing = db.query(TalentPoolModel).filter(TalentPoolModel.candidateId.in_(c_ids)).first()
            if not existing:
                tp = TalentPoolModel(
                    id=f"tp_{str(uuid.uuid4())[:8]}",
                    candidateId=cand.id,
                    currentRole=cand.currentRole or "Applicant",
                    currentCompany=cand.currentCompany or "Not specified",
                    skills=cand.skills or ["General"],
                    experienceYears=cand.experienceYears or 0.0,
                    location=cand.location or "Remote",
                    aiMatchScore=85.0,
                    availability="Immediate",
                    noticePeriod="Immediate",
                    status="Available",
                    department="Engineering",
                    education={"degree": cand.highestEducation or "Graduation", "specialization": cand.specialization or "General", "passingYear": cand.yearOfPassing or "2023", "university": "University"},
                    tags=["Talent Pool"],
                    aiSummary="Vetted candidate profile in talent pool.",
                    certifications=[],
                    projects=[],
                    recruitmentHistory={"appliedJob": cand.appliedRole if hasattr(cand, 'appliedRole') else "General Pool", "previousStage": cand.status or "Applied", "interviewFeedback": "Active profile", "notSelectedReason": "None", "recruiterNotes": "Real candidate profile."},
                    recruiterNotes="Candidate in talent pool.",
                    createdAt=now,
                    updatedAt=now
                )
                db.add(tp)
                added_count += 1

        db.commit()
        print(f"Seeded {added_count} real candidate(s) into PostgreSQL 'talent_pool' table!")

        print("\n=== POSTGRESQL TALENT POOL TABLE ===")
        tps = db.query(TalentPoolModel).all()
        for t in tps:
            c = db.query(CandidateModel).filter(CandidateModel.id == t.candidateId).first()
            name = f"{c.firstName} {c.lastName}" if c else "Candidate"
            print(f"  - {t.id} | Candidate: {name} ({t.candidateId}) | Status: {t.status} | Role: {t.currentRole}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_real_talent_pool()
