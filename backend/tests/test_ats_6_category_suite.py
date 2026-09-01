import os
import sys
import unittest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import SessionLocal
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.job import JobModel
from services.application_service import screen_application_resume
from services.candidate_service import create_candidate
from schemas.candidate import CandidateCreate
from schemas.job import JobCreate
from services.job_service import create_job

class TestATS6CategorySuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_strong_experienced_candidate_divya(self):
        """Test Case 1: Strong experienced candidate Divya Joshi -> High Score (Shortlisted)"""
        app = self.db.query(ApplicationModel).filter(ApplicationModel.id == "t-app-69").first()
        if not app:
            cand = self.db.query(CandidateModel).filter(CandidateModel.firstName.ilike("%Divya%")).first()
            if cand:
                app = self.db.query(ApplicationModel).filter(ApplicationModel.candidateId == cand.id).first()
        self.assertIsNotNone(app, "Divya Joshi application record should exist")
        
        eval_res = screen_application_resume(self.db, app.id)
        self.db.refresh(app)

        print("\n--- TEST 1: Strong Experienced Candidate (Divya Joshi) ---")
        print(f"Candidate: {app.candidateName} | Score: {app.atsScore}% | Status: {app.status}")
        self.assertGreaterEqual(app.atsScore, 70, "Divya Joshi should score >= 70%")
        self.assertEqual(app.status, "Shortlisted")

    def test_weak_candidate_priya(self):
        """Test Case 2: Weak candidate Priya Nair -> Low Score (Rejected + Talent Pool)"""
        app = self.db.query(ApplicationModel).filter(ApplicationModel.id == "APP-0003").first()
        if not app:
            cand = self.db.query(CandidateModel).filter(CandidateModel.firstName.ilike("%Priya%")).first()
            if cand:
                app = self.db.query(ApplicationModel).filter(ApplicationModel.candidateId == cand.id).first()
        self.assertIsNotNone(app, "Priya Nair application record should exist")
        
        eval_res = screen_application_resume(self.db, app.id)
        self.db.refresh(app)

        print("\n--- TEST 2: Weak Candidate (Priya Nair) ---")
        print(f"Candidate: {app.candidateName} | Score: {app.atsScore}% | Status: {app.status}")
        self.assertLess(app.atsScore, 70, "Priya Nair should score < 70%")
        self.assertEqual(app.status, "Rejected")

    def test_strong_fresher_with_projects(self):
        """Test Case 3: Strong fresher candidate with practical API projects -> High Score"""
        job_in = JobCreate(
            title="Python Developer",
            department="Engineering",
            location="Remote",
            experienceLevel="0-1 years",
            experienceRange="0-1 years",
            description="Entry level Python developer opening.",
            requirements=["Python", "FastAPI", "PostgreSQL"],
            preferredSkills=["Docker"],
            education="B.Tech CS"
        )
        job = create_job(self.db, job_in)

        cand_in = CandidateCreate(
            firstName="Aarav",
            lastName="Sharma",
            email=f"aarav.fresher.{job.id[:8]}@test.com",
            phone="+91-9876543210",
            currentRole="CS Graduate",
            jobId=job.id,
            skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
            resumeText="B.Tech CS graduate. Developed a production REST API using Python, FastAPI, PostgreSQL, and Docker containerization."
        )
        cand = create_candidate(self.db, cand_in)
        app = self.db.query(ApplicationModel).filter(ApplicationModel.candidateId == cand.id).first()

        eval_res = screen_application_resume(self.db, app.id)
        self.db.refresh(app)

        print("\n--- TEST 3: Strong Fresher with Projects ---")
        print(f"Candidate: {app.candidateName} | Score: {app.atsScore}% | Status: {app.status}")
        self.assertGreaterEqual(app.atsScore, 70, "Strong fresher with projects should score >= 70%")
        self.assertEqual(app.status, "Shortlisted")

    def test_experienced_candidate_missing_one_skill(self):
        """Test Case 4: Experienced candidate missing 1 of 4 required skills -> High Score (~90%)"""
        job_in = JobCreate(
            title="Senior Backend Engineer",
            department="Core",
            location="Remote",
            experienceLevel="5+ years",
            description="Senior backend engineer job.",
            requirements=["Python", "FastAPI", "PostgreSQL", "Kafka"],
            preferredSkills=["Redis"],
            education="B.Tech"
        )
        job = create_job(self.db, job_in)

        cand_in = CandidateCreate(
            firstName="Vikram",
            lastName="Aditya",
            email=f"vikram.senior.{job.id[:8]}@test.com",
            phone="+91-9123456789",
            currentRole="Senior Backend Engineer",
            jobId=job.id,
            skills=["Python", "FastAPI", "PostgreSQL", "Redis"],
            resumeText="5 years senior backend engineering experience. Expertise in Python, FastAPI, PostgreSQL, and Redis caching. Built high-scale microservices."
        )
        cand = create_candidate(self.db, cand_in)
        app = self.db.query(ApplicationModel).filter(ApplicationModel.candidateId == cand.id).first()

        eval_res = screen_application_resume(self.db, app.id)
        self.db.refresh(app)

        print("\n--- TEST 4: Experienced Candidate Missing One Skill ---")
        print(f"Candidate: {app.candidateName} | Score: {app.atsScore}% | Status: {app.status}")
        self.assertGreaterEqual(app.atsScore, 70, "Experienced candidate missing 1 skill should still score >= 70%")
        self.assertEqual(app.status, "Shortlisted")

    def test_technology_aliases_and_dynamic_normalization(self):
        """Test Case 5: Technology aliases (Postgres, JS, Node, RESTful, AWS) & Dynamic Normalization"""
        job_in = JobCreate(
            title="Full Stack Engineer",
            department="Product",
            location="Remote",
            description="Full stack engineer role.",
            requirements=["PostgreSQL", "JavaScript", "Node.js", "REST API", "AWS"],
            preferredSkills=[], # Empty -> Dynamic Normalization
            education="Not Specified" # Empty -> Dynamic Normalization
        )
        job = create_job(self.db, job_in)

        cand_in = CandidateCreate(
            firstName="Neha",
            lastName="Gupta",
            email=f"neha.alias.{job.id[:8]}@test.com",
            currentRole="Full Stack Engineer",
            jobId=job.id,
            skills=["Postgres", "JS", "Node", "RESTful API", "Amazon Web Services"],
            resumeText="Full stack developer with 3 years experience in Postgres, JS, Node, RESTful APIs, and Amazon Web Services."
        )
        cand = create_candidate(self.db, cand_in)
        app = self.db.query(ApplicationModel).filter(ApplicationModel.candidateId == cand.id).first()

        eval_res = screen_application_resume(self.db, app.id)
        self.db.refresh(app)

        print("\n--- TEST 5: Technology Aliases & Dynamic Normalization ---")
        print(f"Candidate: {app.candidateName} | Score: {app.atsScore}% | Status: {app.status}")
        self.assertGreaterEqual(app.atsScore, 85, "Aliases should match 100% and score >= 85%")
        self.assertEqual(app.status, "Shortlisted")

    def test_nonexistent_job_id_raises_400_error(self):
        """Test Case 6: Regression test proving unpersisted/mock Job ID (e.g. JOB-6D4FSGH) is rejected due to foreign key integrity check"""
        from sqlalchemy.exc import IntegrityError
        from fastapi import HTTPException
        self.db.rollback()
        
        cand_in = CandidateCreate(
            firstName="MockJob",
            lastName="Test",
            email="mockjob.test@test.com",
            jobId="JOB-6D4FSGH",
            resumeText="Python developer"
        )
        with self.assertRaises((IntegrityError, HTTPException)) as cm:
            cand = create_candidate(self.db, cand_in)
            
        self.db.rollback()
        print("\n--- TEST 6: Nonexistent Job ID Regression Test ---")
        print(f"[PASS] Attempting to create candidate/screen against nonexistent job JOB-6D4FSGH was blocked by foreign key validation.")

    def test_category_breakdown_mathematical_bounds(self):
        """Test Case 7: Verify all category breakdown bounds and mathematical consistency"""
        app = self.db.query(ApplicationModel).filter(ApplicationModel.id == "t-app-69").first()
        if not app:
            cand = self.db.query(CandidateModel).filter(CandidateModel.firstName.ilike("%Divya%")).first()
            if cand:
                app = self.db.query(ApplicationModel).filter(ApplicationModel.candidateId == cand.id).first()
        
        screen_application_resume(self.db, app.id)
        self.db.refresh(app)
        
        cb = app.aiEvaluation.get("categoryBreakdown", {})
        print("\n--- TEST 7: Category Breakdown Mathematical Assertions ---")
        print("Category Breakdown Object:", cb)

        # Assert no category exceeds max weight
        self.assertLessEqual(cb["requiredSkills"]["score"], cb["requiredSkills"]["maxWeight"])
        self.assertLessEqual(cb["experience"]["score"], cb["experience"]["maxWeight"])
        self.assertLessEqual(cb["projects"]["score"], cb["projects"]["maxWeight"])
        self.assertLessEqual(cb["roleMatch"]["score"], cb["roleMatch"]["maxWeight"])
        if cb["preferredSkills"]["active"]:
            self.assertLessEqual(cb["preferredSkills"]["score"], cb["preferredSkills"]["maxWeight"])
        if cb["education"]["active"]:
            self.assertLessEqual(cb["education"]["score"], cb["education"]["maxWeight"])

        # Assert ratios are between 0 and 1
        self.assertTrue(0.0 <= cb["requiredSkills"]["ratio"] <= 1.0)
        self.assertTrue(0.0 <= cb["experience"]["ratio"] <= 1.0)
        self.assertTrue(0.0 <= cb["projects"]["ratio"] <= 1.0)
        self.assertTrue(0.0 <= cb["roleMatch"]["ratio"] <= 1.0)
        
        # Assert final score bounds
        self.assertTrue(0 <= app.atsScore <= 100)

        # Assert generic words like 'backend', 'development', 'problem', 'solving' are not in required skills
        invalid_words = ["backend", "development", "problem", "solving", "communication", "experience", "skills"]
        for matched_item in cb["requiredSkills"]["matched"]:
            self.assertNotIn(matched_item.lower(), invalid_words)

        print("[PASS] All category breakdown scores are <= maxWeight, ratios in [0, 1], and no generic words present.")

if __name__ == "__main__":
    unittest.main()
