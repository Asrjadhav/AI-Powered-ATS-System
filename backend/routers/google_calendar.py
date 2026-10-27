"""
Google Calendar / OAuth routes — STUB.

Thin controller layer only: each route validates its input and delegates to
services/google_calendar_service.py, which is entirely `pass` stubs for now.
No response_model is set on these routes yet, on purpose — every service
function currently returns None, and setting a response_model against that
would make FastAPI raise a validation error on every call instead of the
harmless `null` these return today. Wire up schemas.google_calendar as each
route's response_model once its service function is implemented.

Route paths mirror server.ts exactly so the frontend needs no path changes
when these stop being stubs — see services/google_calendar_service.py for
the server.ts line numbers each one replaces.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.google_calendar import SaveGoogleTokenRequest
import services.google_calendar_service as google_calendar_service

router = APIRouter(tags=["Google Calendar"])


@router.get("/firebase-config")
def read_firebase_config(db: Session = Depends(get_db)):
    """Public Firebase Web SDK config for the frontend's Google sign-in flow."""
    return google_calendar_service.get_firebase_config()


@router.post("/auth/google/save-token")
def save_google_token(payload: SaveGoogleTokenRequest, db: Session = Depends(get_db)):
    """Persists the access token from a successful client-side Google consent."""
    return google_calendar_service.save_google_token(
        db, access_token=payload.accessToken, email=payload.email
    )


@router.get("/auth/google/status")
def read_google_connection_status(db: Session = Depends(get_db)):
    """
    Whether a Google Calendar account is connected.

    Supersedes the hardcoded `{"connected": False, "email": None}` stub that
    previously lived in routers/auth.py — this is now the one route for it.
    """
    return google_calendar_service.get_google_connection_status(db)


@router.post("/auth/google/disconnect")
def disconnect_google(db: Session = Depends(get_db)):
    """Removes the stored Google OAuth token, if any."""
    return google_calendar_service.disconnect_google(db)


@router.get("/interviewer/availability")
def read_interviewer_availability(
    interviewer: str = Query(..., description="Interviewer name to check."),
    date: str = Query(..., description="Date to check, as YYYY-MM-DD."),
    time: Optional[str] = Query(
        None, description="A specific slot (HH:MM). Omit to get all four predefined slots."
    ),
    excludeInterviewId: Optional[str] = Query(
        None, description="Ignore this interview's own slot when re-scheduling it."
    ),
    db: Session = Depends(get_db),
):
    """
    Checks interviewer availability against booked interviews and, once
    connected, live Google Calendar events for that day.
    """
    return google_calendar_service.get_interviewer_availability(
        db,
        interviewer=interviewer,
        date=date,
        time=time,
        exclude_interview_id=excludeInterviewId,
    )


@router.post("/interviews/sync-gcal")
def sync_google_calendar(db: Session = Depends(get_db)):
    """
    Reconciles locally stored interviews against their linked Google
    Calendar events (picks up cancellations or reschedules made directly
    in Google Calendar).
    """
    return google_calendar_service.sync_google_calendar(db)
