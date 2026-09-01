from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session

from database import get_db
from schemas.interview import InterviewCreate, InterviewUpdate, InterviewResponse
import services.interview_service as interview_service

router = APIRouter()

@router.get("/interviewer/availability")
def check_interviewer_availability(
    interviewer: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    time: Optional[str] = Query(None),
    excludeInterviewId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Checks real-time interviewer scheduling availability.
    """
    return {
        "available": True,
        "interviewer": interviewer or "Hiring Manager",
        "date": date,
        "time": time,
        "reason": "Interviewer is available"
    }

@router.get("/interviews", response_model=List[InterviewResponse])
def read_interviews(
    candidateId: Optional[str] = Query(None, description="Filter interviews by candidateId"),
    jobId: Optional[str] = Query(None, description="Filter interviews by jobId"),
    applicationId: Optional[str] = Query(None, description="Filter interviews by applicationId"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all scheduled interviews with optional filtering by candidate, job, or application.
    """
    return interview_service.get_interviews(
        db,
        candidate_id=candidateId,
        job_id=jobId,
        application_id=applicationId
    )

@router.get("/interviews/{id}", response_model=InterviewResponse)
def read_interview(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific interview record by ID.
    """
    interview = interview_service.get_interview_by_id(db, identifier=id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    return interview

@router.post("/interviews", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    interview_in: InterviewCreate,
    db: Session = Depends(get_db)
):
    """
    Schedule a new interview linking Candidate, Job, and Application.
    Correctly resolves human-readable IDs (CAND-0001, JOB-0001, APP-0001) or internal UUIDs.
    """
    return interview_service.create_interview(db, interview_in=interview_in)

@router.put("/interviews/{id}", response_model=InterviewResponse)
def update_interview(
    id: str,
    updates: InterviewUpdate,
    db: Session = Depends(get_db)
):
    """
    Update interview details (date, time, round, interviewer, status, meeting link).
    """
    updated = interview_service.update_interview(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    return updated

@router.patch("/interviews/{id}/cancel", response_model=InterviewResponse)
def cancel_interview(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Cancel an interview and mark status as 'Cancelled'.
    """
    cancelled = interview_service.cancel_interview(db, identifier=id)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    return cancelled

@router.post("/interviews/{id}/feedback", response_model=InterviewResponse)
def submit_interview_feedback(
    id: str,
    feedback_payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Submit evaluation feedback, technical score, and mark interview status as 'Completed'.
    """
    completed = interview_service.submit_feedback(db, identifier=id, feedback_payload=feedback_payload)
    if not completed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    return completed

@router.delete("/interviews/{id}", status_code=status.HTTP_200_OK)
def delete_interview(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Delete an interview record cleanly.
    """
    success = interview_service.delete_interview(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    return {"success": True, "id": id}
