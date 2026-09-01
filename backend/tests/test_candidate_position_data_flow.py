import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal
import config
from models.candidate import CandidateModel
from models.application import ApplicationModel
from models.job import JobModel
from schemas.candidate import CandidateCreate
from services.candidate_service import create_candidate, get_candidates, get_candidate_by_id_or_candidate_id
from services.application_service import create_application, ApplicationCreate

def run_tests():
    db = SessionLocal()
    print("\n=============================================================")
    print("      STARTING CANDIDATE POSITION DATA FLOW TEST SUITE       ")
    print("=============================================================\n")

    try:
        # Clean up existing test data (talent pool & applications first)
        from models.talent_pool import TalentPoolModel
        db.query(TalentPoolModel).filter(TalentPoolModel.candidateId.like("test-pos-%")).delete(synchronize_session=False)
        db.query(ApplicationModel).filter(ApplicationModel.candidateId.like("test-pos-%")).delete(synchronize_session=False)
        db.query(ApplicationModel).filter(ApplicationModel.id.like("test-pos-%")).delete(synchronize_session=False)
        db.query(CandidateModel).filter(CandidateModel.id.like("test-pos-%")).delete(synchronize_session=False)
        db.query(JobModel).filter(JobModel.id.like("test-job-%")).delete(synchronize_session=False)
        db.commit()

        # 1. Create or get Target Job 1: "Backend Developer"
        job1 = db.query(JobModel).filter(JobModel.title == "Backend Developer").first()
        if not job1:
            job1 = JobModel(
                id="test-job-backend",
                jobId="JOB-TEST-001",
                title="Backend Developer",
                department="Engineering",
                status="active"
            )
            db.add(job1)

        # 2. Create or get Target Job 2: "Full Stack Developer"
        job2 = db.query(JobModel).filter(JobModel.jobId == "JOB-0004").first()
        if not job2:
            job2 = db.query(JobModel).filter(JobModel.title == "Full Stack Developer").first()
        if not job2:
            job2 = JobModel(
                id="test-job-fullstack",
                jobId="JOB-0004",
                title="Full Stack Developer",
                department="Engineering",
                status="active"
            )
            db.add(job2)

        db.commit()

        # TEST CASE A:
        # Candidate A: Resume role = "Frontend Developer", Selected job = "Backend Developer"
        cand_a_in = CandidateCreate(
            id="test-pos-cand-a",
            candidateId="test-pos-cand-a",
            firstName="Priya",
            lastName="Nair",
            email="priya.nair.pos@test.com",
            currentRole="Frontend Developer Intern at WebCraft Labs",
            jobId=job1.id
        )
        cand_a = create_candidate(db, cand_a_in, target_job_id=job1.id)
        db.refresh(cand_a)

        # Retrieve Candidate A via GET /api/candidates logic
        cand_a_fetched = get_candidate_by_id_or_candidate_id(db, cand_a.id)
        print(f"Candidate A Resume Role: '{cand_a_fetched.currentRole}'")
        print(f"Candidate A Selected Target Job: '{job1.title}'")
        print(f"Candidate A Resolved Position (appliedJob): '{cand_a_fetched.appliedJob}'")

        assert cand_a_fetched.appliedJob == "Backend Developer", f"FAIL: Expected 'Backend Developer', got '{cand_a_fetched.appliedJob}'"
        assert cand_a_fetched.currentRole == "Frontend Developer Intern at WebCraft Labs", "FAIL: Resume currentRole mutated"
        print("[PASS] TEST CASE A: Position correctly set to Selected Target Job 'Backend Developer' (NOT resume role)")

        # TEST CASE B:
        # Candidate B: Resume role = "Java Developer", Selected job = "Full Stack Developer"
        cand_b_in = CandidateCreate(
            id="test-pos-cand-b",
            candidateId="test-pos-cand-b",
            firstName="Rahul",
            lastName="Verma",
            email="rahul.verma.pos@test.com",
            currentRole="Java Developer at TechCorp",
            jobId=job2.id
        )
        cand_b = create_candidate(db, cand_b_in, target_job_id=job2.id)
        db.refresh(cand_b)

        cand_b_fetched = get_candidate_by_id_or_candidate_id(db, cand_b.id)
        print(f"\nCandidate B Resume Role: '{cand_b_fetched.currentRole}'")
        print(f"Candidate B Selected Target Job: '{job2.title}'")
        print(f"Candidate B Resolved Position (appliedJob): '{cand_b_fetched.appliedJob}'")

        assert cand_b_fetched.appliedJob == job2.title, f"FAIL: Expected '{job2.title}', got '{cand_b_fetched.appliedJob}'"
        assert cand_b_fetched.currentRole == "Java Developer at TechCorp", "FAIL: Resume currentRole mutated"
        print(f"[PASS] TEST CASE B: Position correctly set to Selected Target Job '{job2.title}' (NOT resume role)")

        # TEST CASE C:
        # Candidate C: Resume role = "Python Intern", No target job selected
        cand_c_in = CandidateCreate(
            id="test-pos-cand-c",
            candidateId="test-pos-cand-c",
            firstName="Sneha",
            lastName="Kulkarni",
            email="sneha.kulkarni.pos@test.com",
            currentRole="Python Intern"
        )
        cand_c = create_candidate(db, cand_c_in, target_job_id=None)
        db.refresh(cand_c)

        cand_c_fetched = get_candidate_by_id_or_candidate_id(db, cand_c.id)
        print(f"\nCandidate C Resume Role: '{cand_c_fetched.currentRole}'")
        print(f"Candidate C Selected Target Job: None")
        print(f"Candidate C Resolved Position (appliedJob): '{cand_c_fetched.appliedJob}'")

        assert cand_c_fetched.appliedJob == "Job not assigned", f"FAIL: Expected 'Job not assigned', got '{cand_c_fetched.appliedJob}'"
        print("[PASS] TEST CASE C: Position correctly set to 'Job not assigned' when no job relationship exists")

        print("\n=============================================================")
        print("          ALL POSITION MAPPING TESTS PASSED (100% OK)!       ")
        print("=============================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
