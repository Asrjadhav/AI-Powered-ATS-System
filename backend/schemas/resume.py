from typing import Optional
from pydantic import BaseModel


class ParsedResume(BaseModel):
    """
    Flat, form-ready representation of a parsed resume.

    Field names match the Add Candidate form inputs one-to-one so the frontend
    can assign them directly without deriving, reformatting, or re-parsing
    anything. Any change to the extraction rules belongs in
    services/candidate_service.parse_resume_document, never in the client.
    """
    firstName: str = ""
    lastName: str = ""
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    role: str = ""
    company: str = ""

    # experienceYears is pre-computed as an integer so the client never parses
    # a string like "6 years". experienceLabel is the display form.
    experienceYears: int = 0
    experienceLabel: str = "Fresher"
    isFresher: bool = True

    # Comma-separated, ready for the Key Skills input.
    skills: str = ""
    educationText: str = ""

    # Full extracted document text for the resume panel.
    resumeText: str = ""

    # Provenance, set server-side.
    source: str = "Uploaded CV"
    fileName: Optional[str] = None


class ResumeParseResponse(BaseModel):
    success: bool = True
    parsed: ParsedResume


class ResumeParseRequest(BaseModel):
    """
    Legacy base64/JSON request body.

    Retained for backward compatibility. New callers should POST the file as
    multipart/form-data to the same path instead, which avoids base64 encoding
    the document in the browser.
    """
    fileData: Optional[str] = None
    fileName: Optional[str] = None
    content: Optional[str] = None
