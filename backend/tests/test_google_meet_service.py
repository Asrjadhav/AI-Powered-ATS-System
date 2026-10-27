"""
Unit tests for services/google_calendar_service (create_meet_event, create_meet_link_for_new_interview).

Fully mocked: no network, no database, and `main` / `database` are never imported.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from types import SimpleNamespace

import pytest

import config
import services.google_calendar_service as gcs

MEET_URL = "https://meet.google.com/abc-defg-hij"


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, post_response, get_responses=()):
        self.post_response = post_response
        self.get_responses = list(get_responses)
        self.post_calls = []
        self.get_calls = []

    def post(self, url, params=None, json=None, timeout=None):
        self.post_calls.append({"url": url, "params": params, "json": json})
        return self.post_response

    def get(self, url, timeout=None):
        self.get_calls.append(url)
        return self.get_responses.pop(0)


class FakeDb:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def refresh(self, obj):
        pass


def make_interview(**overrides):
    base = dict(
        id="int_test01",
        candidateName="Priya Nair",
        round="Technical Interview",
        interviewer="Aris Thorne",
        jobTitle="Marketing Manager",
        date="2026-10-08",
        time="14:00",
        meetingLink="Google Meet",  # the frontend's label, which must be replaced by the URL
    )
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.fixture(autouse=True)
def fast_polling(monkeypatch):
    monkeypatch.setattr(gcs.time, "sleep", lambda s: None)


def use_session(monkeypatch, session):
    monkeypatch.setattr(gcs, "_build_session", lambda: session)


def event_with_link(url=MEET_URL):
    return {
        "id": "evt1",
        "conferenceData": {"entryPoints": [{"entryPointType": "video", "uri": url}]},
    }


def test_event_uses_interview_date_time_and_requests_new_meet(monkeypatch):
    session = FakeSession(FakeResponse(200, event_with_link()))
    use_session(monkeypatch, session)

    url = gcs.create_meet_event(make_interview())

    assert url == MEET_URL
    call = session.post_calls[0]
    assert call["params"]["conferenceDataVersion"] == 1
    assert call["params"]["sendUpdates"] == "none"
    body = call["json"]
    assert body["start"] == {"dateTime": "2026-10-08T14:00:00", "timeZone": config.GOOGLE_CALENDAR_TIMEZONE}
    assert body["end"]["dateTime"] == "2026-10-08T15:00:00"  # default 60 minutes
    assert body["conferenceData"]["createRequest"]["conferenceSolutionKey"] == {"type": "hangoutsMeet"}
    assert body["conferenceData"]["createRequest"]["requestId"].startswith("ats-int_test01-")
    assert "attendees" not in body


def test_time_with_seconds_is_accepted(monkeypatch):
    session = FakeSession(FakeResponse(200, event_with_link()))
    use_session(monkeypatch, session)
    gcs.create_meet_event(make_interview(time="09:30:00"))
    assert session.post_calls[0]["json"]["start"]["dateTime"] == "2026-10-08T09:30:00"


def test_hangout_link_fallback_field(monkeypatch):
    session = FakeSession(FakeResponse(200, {"id": "evt1", "hangoutLink": MEET_URL}))
    use_session(monkeypatch, session)
    assert gcs.create_meet_event(make_interview()) == MEET_URL


def test_pending_conference_is_polled_until_link_appears(monkeypatch):
    pending = {"id": "evt1", "conferenceData": {"createRequest": {"status": {"statusCode": "pending"}}}}
    session = FakeSession(
        FakeResponse(200, pending),
        get_responses=[FakeResponse(200, pending), FakeResponse(200, event_with_link())],
    )
    use_session(monkeypatch, session)
    assert gcs.create_meet_event(make_interview()) == MEET_URL
    assert len(session.get_calls) == 2


def test_missing_link_raises_instead_of_inventing_one(monkeypatch):
    no_link = {"id": "evt1"}
    session = FakeSession(
        FakeResponse(200, no_link),
        get_responses=[FakeResponse(200, no_link)] * gcs.MEET_LINK_POLL_ATTEMPTS,
    )
    use_session(monkeypatch, session)
    with pytest.raises(gcs.GoogleMeetError):
        gcs.create_meet_event(make_interview())


def test_google_http_error_raises(monkeypatch):
    session = FakeSession(FakeResponse(403, {"error": {"message": "Forbidden"}}))
    use_session(monkeypatch, session)
    with pytest.raises(gcs.GoogleMeetError, match="403"):
        gcs.create_meet_event(make_interview())


def test_not_configured_raises_specific_error(monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_SERVICE_ACCOUNT_FILE", "")
    monkeypatch.setattr(config, "GOOGLE_SERVICE_ACCOUNT_JSON", "")
    monkeypatch.setattr(config, "GOOGLE_CALENDAR_ORGANIZER_EMAIL", "")
    with pytest.raises(gcs.GoogleMeetNotConfigured):
        gcs._build_session()


def make_interview_in(**overrides):
    # The create-interview request body, before anything is saved (no id yet).
    return make_interview(id=None, meetingLink=None, **overrides)


def test_new_interview_returns_real_url(monkeypatch):
    session = FakeSession(FakeResponse(200, event_with_link()))
    use_session(monkeypatch, session)
    assert gcs.create_meet_link_for_new_interview(make_interview_in()) == MEET_URL
    body = session.post_calls[0]["json"]
    assert body["start"]["dateTime"] == "2026-10-08T14:00:00"
    assert body["conferenceData"]["createRequest"]["requestId"].startswith("ats-new-")


def test_new_interview_raises_when_not_configured(monkeypatch):
    def not_configured():
        raise gcs.GoogleMeetNotConfigured("not configured")
    monkeypatch.setattr(gcs, "_build_session", not_configured)
    with pytest.raises(gcs.GoogleMeetNotConfigured):
        gcs.create_meet_link_for_new_interview(make_interview_in())


def test_new_interview_raises_on_google_failure(monkeypatch):
    use_session(monkeypatch, FakeSession(FakeResponse(500, {"error": {"message": "backend error"}})))
    with pytest.raises(gcs.GoogleMeetError):
        gcs.create_meet_link_for_new_interview(make_interview_in())


@pytest.mark.parametrize("missing", ["date", "time"])
def test_new_interview_without_date_or_time_raises_before_calling_google(monkeypatch, missing):
    def must_not_call():
        raise AssertionError("Google must not be contacted")
    monkeypatch.setattr(gcs, "_build_session", must_not_call)
    with pytest.raises(gcs.GoogleMeetError):
        gcs.create_meet_link_for_new_interview(make_interview_in(**{missing: None}))
