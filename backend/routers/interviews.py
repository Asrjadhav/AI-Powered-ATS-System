from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Body
from sqlalchemy.orm import Session

from database import get_db
from schemas.interview import InterviewCreate, InterviewUpdate, InterviewResponse
import services.interview_service as interview_service
import services.automated_email_service as automated_email_service
import services.google_calendar_service as google_calendar_service
import services.interview_participants as interview_participants

import logging

logger = logging.getLogger(__name__)

GOOGLE_MEET_FAILED_DETAIL = "Google Meet generation failed, mail not sent."


def _validated_participants(interview_in, *, creating: bool) -> None:
    """
    Checks interviewers / BCC (interviewers, who are CC'd on the invitation, are required when scheduling;
    BCC is optional) and replaces them on the request with directory-verified copies. Raises 422 before
    anything else (Google Calendar, database, email) happens.
    """
    try:
        resolved = interview_participants.resolve(
            interview_in.interviewers, interview_in.bcc, creating=creating
        )
    except interview_participants.ParticipantError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    for field, people in resolved.items():
        setattr(interview_in, field, people)
    if "interviewers" in resolved:
        interview_in.interviewer = ", ".join(p.name for p in resolved["interviewers"])

router = APIRouter()

async def _meeting_options(request: Request) -> Dict[str, Any]:
    """
    The raw create-interview body, used only to see whether this is an Online /
    Google Meet interview. `type` and `platform` are not interview columns, so
    they are read here rather than through InterviewCreate.
    """
    try:
        body = await request.json()
    except Exception:
        return {}
    return body if isinstance(body, dict) else {}

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
    meeting_options: Dict[str, Any] = Depends(_meeting_options),
    db: Session = Depends(get_db)
):
    """
    Schedule a new interview linking Candidate, Job, and Application.
    Correctly resolves human-readable IDs (CAND-0001, JOB-0001, APP-0001) or internal UUIDs.
    For Online / Google Meet interviews, the Calendar event and Meet link are created
    first; if that fails nothing is saved, no email is sent and the request fails with 502.
    Otherwise the interview is saved and the candidate is emailed the invitation.
    """
    logger.info("Interview schedule requested: candidate=%s job=%s date=%s time=%s type=%s platform=%s",
                interview_in.candidateId, interview_in.jobId, interview_in.date, interview_in.time,
                meeting_options.get("type"), meeting_options.get("platform"))

    _validated_participants(interview_in, creating=True)

    # `meetingLink` only ever holds a real URL, never a label such as "Google Meet".
    if not str(interview_in.meetingLink or "").startswith(("http://", "https://")):
        interview_in.meetingLink = None

    if meeting_options.get("type") == "Online" and meeting_options.get("platform") == "Google Meet":
        logger.info("Interview schedule: creating the Google Meet link before saving")
        try:
            interview_in.meetingLink = google_calendar_service.create_meet_link_for_new_interview(interview_in)
        except Exception as exc:
            logger.error("Interview schedule: Google Meet link NOT created (%s: %s). Interview not saved, email not sent.",
                         type(exc).__name__, exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=GOOGLE_MEET_FAILED_DETAIL
            )

    interview = interview_service.create_interview(db, interview_in=interview_in)
    logger.info("Interview saved: id=%s candidate=%s job=%s round=%r date=%s time=%s, now emailing the candidate",
                interview.id, interview.candidateId, interview.jobId, interview.round, interview.date, interview.time)
    email_sent = automated_email_service.notify_interview_scheduled(db, interview, meeting_options)
    logger.info("Interview %s: scheduling finished (invitation email %s, meeting link %s)",
                interview.id, "sent" if email_sent else "NOT sent",
                "set" if str(interview.meetingLink or "").startswith("https://meet.google.com/") else "none")
    return interview

@router.put("/interviews/{id}", response_model=InterviewResponse)
def update_interview(
    id: str,
    updates: InterviewUpdate,
    db: Session = Depends(get_db)
):
    """
    Update interview details (date, time, round, interviewer, status, meeting link).
    """
    _validated_participants(updates, creating=False)
    updated = interview_service.update_interview(db, identifier=id, updates=updates)
    if not updated:
        logger.warning("Interview update: %r not found", id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    logger.info("Interview %s updated: fields=%s (Google Calendar is not updated)", updated.id,
                sorted(updates.dict(exclude_unset=True)))
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
        logger.warning("Interview cancel: %r not found", id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    logger.info("Interview %s cancelled; candidate/application moved back to Shortlisted (Google Calendar event is not removed)",
                cancelled.id)
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
        logger.warning("Interview feedback: %r not found", id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    logger.info("Interview %s completed with feedback (recommendation=%s)", completed.id,
                feedback_payload.get("recommendation") or "Hire")
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
        logger.warning("Interview delete: %r not found", id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found."
        )
    logger.info("Interview delete finished for %r (this id may match several interviews)", id)
    return {"success": True, "id": id}
