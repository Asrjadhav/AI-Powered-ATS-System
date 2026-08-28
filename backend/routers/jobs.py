from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.job import JobCreate, JobUpdate, JobResponse
import services.job_service as job_service

router = APIRouter()

@router.get("/jobs", response_model=List[JobResponse])
def read_jobs(
    status: Optional[str] = Query(None, description="Filter jobs by status e.g. active, published, draft, closed"),
    search: Optional[str] = Query(None, description="Search jobs by title, department, location, or jobId"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all job openings enriched with candidate counts and normalized status.
    """
    return job_service.get_jobs(db, status_filter=status, search=search)

@router.get("/jobs/{id}", response_model=JobResponse)
def read_job(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific job opening by internal primary key 'id' OR human-readable 'jobId'.
    """
    job = job_service.get_job_response(db, identifier=id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job opening not found."
        )
    return job

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new job posting. Auto-generates the next zero-padded human-readable Job ID (e.g. JOB-0001)
    and handles potential concurrent creation conflicts safely with retry.
    """
    try:
        return job_service.create_job(db, job_in=job_in)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create job posting: {str(e)}"
        )

@router.put("/jobs/{id}", response_model=JobResponse)
def update_job(
    id: str,
    updates: JobUpdate,
    db: Session = Depends(get_db)
):
    """
    Update job details while preserving immutable identifiers (id, jobId, createdAt).
    """
    updated = job_service.update_job(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job opening not found."
        )
    return updated

@router.patch("/jobs/{id}/status", response_model=JobResponse)
def update_job_status(
    id: str,
    status_payload: dict = Body(..., example={"status": "closed"}),
    db: Session = Depends(get_db)
):
    """
    Update status of a job opening (e.g. active, published, closed, archived, draft).
    """
    new_status = status_payload.get("status")
    if not new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status field is required."
        )
    updated = job_service.update_job_status(db, identifier=id, new_status=new_status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job opening not found."
        )
    return updated

@router.delete("/jobs/{id}", status_code=status.HTTP_200_OK)
def delete_job(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a job opening safely without cascade deleting related candidate/application history.
    """
    success = job_service.delete_job(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job opening not found."
        )
    return {"success": True, "id": id}
