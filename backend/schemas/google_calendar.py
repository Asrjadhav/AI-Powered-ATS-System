"""
Target request/response shapes for Google Calendar / OAuth integration.

These describe the contract the real implementation should eventually
satisfy (mirroring what server.ts currently returns), so the router and
service signatures below are typed against something concrete. They are not
yet wired up as `response_model` on any route — see routers/google_calendar.py
for why — so nothing here is enforced at runtime until the service layer is
built.
"""

from typing import List, Optional

from pydantic import BaseModel


class FirebaseConfig(BaseModel):
    """
    Public Firebase Web SDK config, read from firebase-applet-config.json in
    Express (server.ts:272-286) with oAuthClientId overridden from the
    GOOGLE_CLIENT_ID env var when set.
    """
    projectId: Optional[str] = None
    appId: Optional[str] = None
    apiKey: Optional[str] = None
    authDomain: Optional[str] = None
    storageBucket: Optional[str] = None
    messagingSenderId: Optional[str] = None
    measurementId: Optional[str] = None
    oAuthClientId: Optional[str] = None
    recaptchaSiteKey: Optional[str] = None


class SaveGoogleTokenRequest(BaseModel):
    """Body posted after a successful client-side Google OAuth consent."""
    accessToken: str
    email: Optional[str] = None


class SaveGoogleTokenResponse(BaseModel):
    success: bool
    email: Optional[str] = None


class GoogleConnectionStatus(BaseModel):
    connected: bool
    email: Optional[str] = None
    connectedAt: Optional[str] = None


class DisconnectGoogleResponse(BaseModel):
    success: bool


class AvailabilitySlot(BaseModel):
    """One of the four predefined interview slots for a given day."""
    id: str
    label: str
    time: str  # "HH:MM"
    available: bool
    reason: str = ""


class AvailabilityCheck(BaseModel):
    """Response when a specific `time` is passed to the availability check."""
    available: bool
    reason: str = ""


class SyncGcalResponse(BaseModel):
    success: bool
    updatedCount: int = 0
