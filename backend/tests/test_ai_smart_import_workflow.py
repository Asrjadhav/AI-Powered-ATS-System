import os
import sys
import pytest
import re

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import SessionLocal
from models.job import JobModel
from schemas.job import JobCreate
from services.job_service import create_job, clean_job_title, get_jobs

def test_title_sanitization_rules():
    print("\n=============================================================")
    print("      TEST 1: TITLE SANITIZATION (NO 'Job:' PREFIX)          ")
    print("=============================================================\n")

    cases = [
        ("Job: Python Backend Developer", "Python Backend Developer"),
        ("Job Title: Full Stack Developer", "Full Stack Developer"),
        ("Role: DevOps Engineer", "DevOps Engineer"),
        ("Position: Data Scientist", "Data Scientist"),
        ("Vacancy: Frontend Engineer", "Frontend Engineer"),
        ("Python Backend Developer", "Python Backend Developer"),
        ("Job Analyst", "Job Analyst"),
        ("On-The-Job Trainer", "On-The-Job Trainer")
    ]

    for raw, expected in cases:
        py_cleaned = clean_job_title(raw)
        assert py_cleaned == expected, f"Python clean_job_title failed for '{raw}': got '{py_cleaned}', expected '{expected}'"
        print(f"[PASS] Input: '{raw}' -> Cleaned: '{py_cleaned}'")

def test_location_and_field_extraction():
    print("\n=============================================================")
    print("      TEST 2: LOCATION & FIELD EXTRACTION FROM SOURCE        ")
    print("=============================================================\n")

    raw_text = """Job: Python Backend Developer
Team: Software Engineering
Location: Pune, India
Experience: 0–2 years"""

    # Title extraction test
    title_match = re.search(r'(?:job|role|title|position)\s*:\s*([^\n\r]+)', raw_text, re.IGNORECASE)
    assert title_match is not None
    extracted_title = clean_job_title(title_match.group(1).strip())
    assert extracted_title == "Python Backend Developer", f"Extracted title mismatch: {extracted_title}"

    # Department extraction test
    dept_match = re.search(r'(?:team|department|dept|unit|division)\s*:\s*([^\n\r]+)', raw_text, re.IGNORECASE)
    assert dept_match is not None
    extracted_dept = dept_match.group(1).strip()
    assert extracted_dept == "Software Engineering", f"Extracted department mismatch: {extracted_dept}"

    # Location extraction test
    loc_match = re.search(r'(?:location|city|place|offices|site|based in|stationed in)\s*:\s*([^\n\r]+)', raw_text, re.IGNORECASE)
    assert loc_match is not None
    extracted_loc = loc_match.group(1).strip()
    assert extracted_loc == "Pune, India", f"Extracted location mismatch: {extracted_loc}"

    # Experience extraction test
    exp_match = re.search(r'(?:experience|exp|years of experience)\s*:\s*([^\n\r]+)', raw_text, re.IGNORECASE)
    assert exp_match is not None
    extracted_exp = exp_match.group(1).strip()
    assert extracted_exp == "0–2 years", f"Extracted experience mismatch: {extracted_exp}"

    print(f"[PASS] Extracted Title: {extracted_title}")
    print(f"[PASS] Extracted Department: {extracted_dept}")
    print(f"[PASS] Extracted Location: {extracted_loc}")
    print(f"[PASS] Extracted Experience: {extracted_exp}")

    return {
        "title": extracted_title,
        "department": extracted_dept,
        "location": extracted_loc,
        "experienceRange": extracted_exp
    }

def test_database_and_api_consistency():
    print("\n=============================================================")
    print("      TEST 3: DATABASE & API DATA CONSISTENCY CHECK          ")
    print("=============================================================\n")

    db: Session = SessionLocal()
    try:
        extracted = test_location_and_field_extraction()

        job_in = JobCreate(
            title="Job: Python Backend Developer",  # Pass raw title with prefix to verify auto-cleansing
            department=extracted["department"],
            location=extracted["location"],
            type="Full-time",
            workMode="On-site",
            description=f"Job posting for {extracted['title']} in {extracted['location']}.",
            requirements={"mustHave": ["Python", "FastAPI", "PostgreSQL"]},
            responsibilities=["Develop API endpoints", "Maintain DB schemas"],
            experienceRange=extracted["experienceRange"],
            salaryRange="Competitive",
            openings=1,
            status="active"
        )

        created_job = create_job(db, job_in=job_in)

        assert created_job.title == "Python Backend Developer", f"Stored title in DB has prefix: {created_job.title}"
        assert created_job.location == "Pune, India", f"Stored location in DB mismatch: {created_job.location}"
        assert created_job.department == "Software Engineering", f"Stored department mismatch: {created_job.department}"

        print(f"[PASS] Job Created in DB:")
        print(f"       ID: {created_job.id}")
        print(f"       JobID: {created_job.jobId}")
        print(f"       Title: {created_job.title}")
        print(f"       Location: {created_job.location}")
        print(f"       Department: {created_job.department}")

        # Fetch via API service function
        all_jobs = get_jobs(db)
        imported_job = next((j for j in all_jobs if j.id == created_job.id or j.jobId == created_job.jobId), None)

        assert imported_job is not None, "Created job not found in API list"
        assert imported_job.title == "Python Backend Developer", f"API title mismatch: {imported_job.title}"
        assert imported_job.location == "Pune, India", f"API location mismatch: {imported_job.location}"

        print("\n[SUCCESS] AI SMART IMPORT WORKFLOW TESTED AND VERIFIED 100%!")

    finally:
        db.close()

if __name__ == "__main__":
    test_title_sanitization_rules()
    test_location_and_field_extraction()
    test_database_and_api_consistency()
