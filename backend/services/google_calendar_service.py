"""
Google Calendar / OAuth integration — STUB.

Ported from server.ts (Express), which has since been removed from the
working tree. The `server.ts:NNN` references below point into the last
committed copy: `git show HEAD:server.ts`. Everything below is a `pass` stub EXCEPT
`create_meet_link_for_new_interview` (and its helpers), which is implemented: it creates
the Calendar event + real Google Meet link. POST /api/interviews calls it, before the
interview is saved, when an Online / Google Meet interview is scheduled.
This file exists to fix the module boundary (routes -> service) before the
real logic is designed, per instruction — the actual Google API calls,
token storage strategy, etc. are deliberately deferred.

Two things the real implementation must NOT copy from Express:

1. Express stores the OAuth token in a PLAINTEXT JSON file on disk
   (google_oauth_token.json, committed-adjacent, in .gitignore but still a
   plaintext secret on the filesystem). Use the `system_tokens` table
   (models/system_token.py — SystemTokenModel) instead: it already has
   tokenType, accessToken, refreshToken, expiryDate, updatedAt and is
   currently unused by anything.

2. Express treats "Google Meet" as available even when no OAuth token has
   ever been connected, silently generating a fake, non-functional meet
   link as a fallback (see generateMockMeetLink() in server.ts). Whatever
   this becomes should fail honestly instead — a fabricated Meet URL that
   doesn't work is worse than a clear error, consistent with how every
   other AI/parsing endpoint we've ported handles a failure it can't
   recover from.

Also note: creating/updating/cancelling an interview in server.ts has Google
Calendar side effects baked directly into the interview handlers
(POST /api/interviews, PATCH /api/interviews/:id,
PATCH /api/interviews/:id/cancel — see server.ts:1055-1293, 1451-1524). This
file only covers the six routes that exist solely for Google integration.
Wiring calendar create/update/delete into the *existing* interview
create/update/cancel endpoints (backend/services/interview_service.py) is a
separate, later change — those endpoints are live and tested today, so that
hookup should happen once the calendar client below is real, not as part of
this scaffold.
"""

import datetime
import json
import logging
import time
import uuid
from types import SimpleNamespace
from typing import Optional

from sqlalchemy.orm import Session

import config
from schemas.google_calendar import (
    AvailabilityCheck,
    AvailabilitySlot,
    FirebaseConfig,
    GoogleConnectionStatus,
)

logger = logging.getLogger(__name__)

CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
# Must be the scope authorized for the service account in the Workspace Admin console
# (Security > API controls > Domain-wide delegation).
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"
REQUEST_TIMEOUT_SECONDS = 15
# Meet creation is asynchronous: the insert response may not carry the link yet.
MEET_LINK_POLL_ATTEMPTS = 4
MEET_LINK_POLL_DELAY_SECONDS = 1.0


class GoogleMeetError(Exception):
    """A Calendar event / Meet link could not be created."""


class GoogleMeetNotConfigured(GoogleMeetError):
    """Service-account settings are missing, so Google was not contacted."""


def _load_service_account_info() -> Optional[dict]:
    if config.GOOGLE_SERVICE_ACCOUNT_JSON:
        return json.loads(config.GOOGLE_SERVICE_ACCOUNT_JSON)
    if config.GOOGLE_SERVICE_ACCOUNT_FILE:
        with open(config.GOOGLE_SERVICE_ACCOUNT_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    return None


def _build_session():
    """
    An authorized HTTP session that acts as the organizer account, via a service
    account with domain-wide delegation. Tokens are minted and refreshed
    automatically by google-auth; nothing is stored.
    """
    organizer = config.GOOGLE_CALENDAR_ORGANIZER_EMAIL
    info = _load_service_account_info()
    if not info or not organizer:
        raise GoogleMeetNotConfigured(
            "Google Meet is not configured: set GOOGLE_SERVICE_ACCOUNT_FILE (or "
            "GOOGLE_SERVICE_ACCOUNT_JSON) and GOOGLE_CALENDAR_ORGANIZER_EMAIL."
        )
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession

    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=[CALENDAR_SCOPE], subject=organizer
    )
    return AuthorizedSession(credentials)


def _event_times(date: str, time_of_day: str) -> tuple:
    """Local (timezone-less) ISO start/end for the interview's date and HH:MM."""
    start = datetime.datetime.strptime(f"{date} {str(time_of_day)[:5]}", "%Y-%m-%d %H:%M")
    end = start + datetime.timedelta(minutes=config.GOOGLE_MEET_DURATION_MINUTES)
    return start.isoformat(), end.isoformat()


def _meet_url(event: dict) -> Optional[str]:
    for entry in (event.get("conferenceData") or {}).get("entryPoints") or []:
        if entry.get("entryPointType") == "video" and entry.get("uri"):
            return entry["uri"]
    return event.get("hangoutLink") or None


def _raise_for_google_error(response, action: str) -> None:
    if response.status_code < 400:
        return
    try:
        message = response.json().get("error", {}).get("message", "")
    except ValueError:
        message = ""
    raise GoogleMeetError(f"Google Calendar {action} failed ({response.status_code}): {message}")


def create_meet_event(interview) -> str:
    """
    Creates a Calendar event at the interview's date/time with a brand-new Google
    Meet conference and returns the real Meet URL. Raises GoogleMeetError rather
    than ever returning a made-up link.
    """
    logger.info("Google Meet: building credentials (service account impersonating the organizer)")
    session = _build_session()
    start, end = _event_times(interview.date, interview.time)
    timezone = config.GOOGLE_CALENDAR_TIMEZONE
    logger.info("Google Meet: creating a Calendar event for interview %s, %s to %s (%s)", interview.id, start, end, timezone)
    body = {
        "summary": f"Interview: {interview.candidateName or 'Candidate'} - {interview.round or 'Interview'}",
        "description": (
            f"Round: {interview.round or ''}\n"
            f"Interviewer: {interview.interviewer or ''}\n"
            f"Position: {interview.jobTitle or ''}"
        ),
        "start": {"dateTime": start, "timeZone": timezone},
        "end": {"dateTime": end, "timeZone": timezone},
        # A new conference per event (Google advises against reusing Meet codes).
        "conferenceData": {
            "createRequest": {
                "requestId": f"ats-{interview.id}-{int(time.time())}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
    }
    response = session.post(
        CALENDAR_EVENTS_URL,
        params={"conferenceDataVersion": 1, "sendUpdates": "none"},
        json=body,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    _raise_for_google_error(response, "event creation")
    event = response.json()
    logger.info("Google Meet: Calendar event created (id=%s), Meet link %s", event.get("id"),
                "present" if _meet_url(event) else "not ready yet, will poll")

    url = _meet_url(event)
    attempts = 0
    while not url and attempts < MEET_LINK_POLL_ATTEMPTS:
        attempts += 1
        logger.info("Google Meet: waiting for the Meet link (check %d/%d)", attempts, MEET_LINK_POLL_ATTEMPTS)
        time.sleep(MEET_LINK_POLL_DELAY_SECONDS)
        poll = session.get(
            f"{CALENDAR_EVENTS_URL}/{event['id']}", timeout=REQUEST_TIMEOUT_SECONDS
        )
        _raise_for_google_error(poll, "event lookup")
        url = _meet_url(poll.json())
    if not url:
        logger.error("Google Meet: event %s exists in Calendar but Google returned no Meet link", event.get("id"))
        raise GoogleMeetError(
            f"Google created event {event.get('id')} but did not return a Meet link."
        )
    logger.info("Google Meet: link ready for interview %s", interview.id)
    return url


def create_meet_link_for_new_interview(interview_in) -> str:
    """
    Creates the Calendar event + Meet link for an interview that is about to be saved
    (the create-interview request body), so nothing is stored when Meet fails.
    Raises (GoogleMeetError or any Google/auth error) when no link could be created;
    no fake link is ever made.
    """
    if not interview_in.date or not interview_in.time:
        raise GoogleMeetError("Interview date and time are required to create a Google Meet link.")
    pending_interview = SimpleNamespace(
        id=interview_in.id or f"new-{uuid.uuid4().hex[:8]}",
        candidateName=interview_in.candidateName,
        round=interview_in.round,
        interviewer=interview_in.interviewer,
        jobTitle=interview_in.jobTitle,
        date=interview_in.date,
        time=interview_in.time,
    )
    return create_meet_event(pending_interview)


def get_firebase_config() -> FirebaseConfig:
    """
    Ported from: server.ts:272-286 (GET /api/firebase-config)

    Express reads firebase-applet-config.json off disk and overlays
    oAuthClientId from the GOOGLE_CLIENT_ID env var when set. Decide here
    whether that JSON file is read the same way, or whether these values
    move into config.py as proper settings (preferred — avoids a second,
    undeclared source of configuration).
    """
    pass


def save_google_token(db: Session, access_token: str, email: Optional[str]) -> dict:
    """
    Ported from: server.ts:290-304 (POST /api/auth/google/save-token)

    Express writes {accessToken, email, connectedAt} to
    google_oauth_token.json in plaintext. Persist to the system_tokens table
    instead (SystemTokenModel: tokenType="google_calendar", accessToken,
    refreshToken, expiryDate, updatedAt) — upsert on tokenType so there is
    always at most one row per integration.
    """
    pass


def get_google_connection_status(db: Session) -> GoogleConnectionStatus:
    """
    Ported from: server.ts:306-320 (GET /api/auth/google/status)

    Express checks whether google_oauth_token.json exists and reads
    {email, connectedAt} from it. Read the system_tokens row instead; report
    connected=False when no row exists (or the stored token has expired —
    Express does not currently check expiry at all, which is worth fixing
    rather than porting as-is).

    This route previously had a hardcoded stub in routers/auth.py
    (`{"connected": False, "email": None}`) that always reported
    disconnected. That stub has been removed in favour of this module so
    there is one owner for every Google-related route.
    """
    pass


def disconnect_google(db: Session) -> dict:
    """
    Ported from: server.ts:322-334 (POST /api/auth/google/disconnect)

    Express deletes google_oauth_token.json if present. Delete the
    system_tokens row for tokenType="google_calendar" instead. Should be
    idempotent: disconnecting when nothing is connected is still a success,
    same as Express's behaviour.
    """
    pass


def get_interviewer_availability(
    db: Session,
    interviewer: str,
    date: str,
    time: Optional[str] = None,
    exclude_interview_id: Optional[str] = None,
) -> "AvailabilityCheck | list[AvailabilitySlot]":
    """
    Ported from: server.ts:350-495 (GET /api/interviewer/availability)

    Two response shapes depending on whether `time` is passed, matching
    Express:
      - `time` given  -> a single AvailabilityCheck for that exact slot.
      - `time` omitted -> the four predefined day slots (09:00, 10:00, 11:00,
        14:00), each as an AvailabilitySlot.

    In both cases Express checks two sources and reports the first conflict
    found:
      1. This app's own `interviews` table — same interviewer, same date,
         same time, status not Cancelled (excluding exclude_interview_id,
         used when re-scheduling the interview being edited).
      2. Live Google Calendar free/busy for that interviewer's connected
         calendar, via calendar.events.list for the whole day — only run
         when a Google client can be constructed (i.e. a token is stored).

    Needs: a helper (e.g. get_calendar_client()) that builds a
    google-api-python-client Calendar service from the stored system_tokens
    row, returning None when nothing is connected — callers should degrade
    to "local-only" conflict checking in that case, the same as Express does
    when getCalendarClient() returns null.
    """
    pass


def sync_google_calendar(db: Session) -> dict:
    """
    Ported from: server.ts:1525-1584 (POST /api/interviews/sync-gcal)

    For every interview row that has a googleEventId, Express fetches the
    live event from Google Calendar and reconciles:
      - event.status == "cancelled" (or a 404/410 from the API, meaning the
        event was deleted) -> mark the local interview Cancelled.
      - event start time differs from the stored date/time -> update the
        local interview to match (someone rescheduled it directly in
        Google Calendar).
    Returns how many local rows were changed. Requires a connected token;
    should reject with a clear error when nothing is connected rather than
    silently reporting updatedCount=0, unlike Express which conflates "not
    connected" and "connected, nothing to update".
    """
    pass
