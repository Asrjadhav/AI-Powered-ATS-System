import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.job import JobModel
from services.job_service import get_job_by_id_or_job_id, create_job
from schemas.job import JobCreate

def ensure_job_0004():
    db = SessionLocal()
    try:
        job = get_job_by_id_or_job_id(db, "JOB-0004")
        if not job:
            print("JOB-0004 not found in PostgreSQL. Re-creating JOB-0004...")
            job_in = JobCreate(
                id="JOB-0004",
                jobId="JOB-0004",
                title="Full Stack Developer",
                department="Engineering",
                location="Pune, India",
                type="Full-time",
                experienceLevel="Senior-Level",
                description="Full Stack Developer opening responsible for building scalable web applications.",
                status="published"
            )
            create_job(db, job_in=job_in)
            print("SUCCESS: Re-created JOB-0004 in PostgreSQL database.")
        else:
            print(f"JOB-0004 exists in PostgreSQL: ID '{job.id}', Title '{job.title}'")
    finally:
        db.close()

if __name__ == "__main__":
    ensure_job_0004()
