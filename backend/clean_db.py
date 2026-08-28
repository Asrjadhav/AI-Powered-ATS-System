import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.interview import InterviewModel
from models.job import JobModel

def clean_database():
    db = SessionLocal()
    try:
        print("=== CLEANING TEST DATA LEFTOVERS FROM POSTGRESQL ===")
        
        # 1. Update any applications/interviews pointing to test-db-001 to point to real JOB-0005
        db.query(ApplicationModel).filter(ApplicationModel.jobId == 'test-db-001').update({'jobId': 'JOB-0005'}, synchronize_session=False)
        db.query(InterviewModel).filter(InterviewModel.jobId == 'test-db-001').update({'jobId': 'JOB-0005'}, synchronize_session=False)
        db.commit()

        # 2. Delete test script generated interviews
        db.query(InterviewModel).filter(
            (InterviewModel.candidateEmail.ilike('%example.com%')) |
            (InterviewModel.candidateName.ilike('%pipeline%')) |
            (InterviewModel.candidateName.ilike('%rahul%')) |
            (InterviewModel.candidateName.ilike('%multirole%'))
        ).delete(synchronize_session=False)

        # 3. Delete test script generated applications
        db.query(ApplicationModel).filter(
            (ApplicationModel.candidateEmail.ilike('%example.com%')) |
            (ApplicationModel.candidateId.ilike('%P2C%')) |
            (ApplicationModel.jobId.ilike('%P2C%')) |
            (ApplicationModel.candidateId.in_(['CAND-0006', 'CAND-0007', 'CAND-0008']))
        ).delete(synchronize_session=False)

        # 4. Delete test script generated candidates
        db.query(CandidateModel).filter(
            (CandidateModel.email.ilike('%example.com%')) |
            (CandidateModel.candidateId.ilike('%P2C%')) |
            (CandidateModel.firstName.ilike('%pipeline%')) |
            (CandidateModel.firstName.ilike('%rahul%')) |
            (CandidateModel.firstName.ilike('%multirole%')) |
            (CandidateModel.candidateId.in_(['CAND-0006', 'CAND-0007', 'CAND-0008']))
        ).delete(synchronize_session=False)

        # 5. Delete test script generated jobs
        db.query(JobModel).filter(
            (JobModel.id.ilike('%P2C%')) |
            (JobModel.id.ilike('%test%')) |
            (JobModel.jobId.in_(['JOB-0006', 'JOB-0007', 'JOB-0008', 'test-db-001', 'JOB-TEST-001']))
        ).delete(synchronize_session=False)

        db.commit()
        print("SUCCESS: Database cleaned successfully!")

        print("\n=== CURRENT REAL POSTGRESQL STATE ===")
        jobs = db.query(JobModel).all()
        cands = db.query(CandidateModel).all()
        apps = db.query(ApplicationModel).all()
        ints = db.query(InterviewModel).all()

        print(f"Jobs ({len(jobs)}):")
        for j in jobs:
            print(f"  - {j.jobId}: {j.title} ({j.department})")

        print(f"\nCandidates ({len(cands)}):")
        for c in cands:
            print(f"  - {c.candidateId}: {c.firstName} {c.lastName} ({c.email}) -> Status: {c.status}")

        print(f"\nApplications ({len(apps)}):")
        for a in apps:
            print(f"  - {a.applicationId}: Candidate={a.candidateId}, Job={a.jobId} -> Status: {a.status}")

        print(f"\nInterviews ({len(ints)}):")
        for i in ints:
            print(f"  - {i.id}: Candidate={i.candidateName} ({i.candidateId}), Job={i.jobTitle} -> Status: {i.status}")

    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
