from pydantic import BaseModel, field_validator
from typing import List, Optional


class DirectoryPerson(BaseModel):
    """A person from the people directory (see services/directory_service.py)."""
    id: str
    name: str
    email: str
    role: Optional[str] = ""


class PersonRef(BaseModel):
    """
    A person picked on an interview. On input only `id` is trusted: the name and email
    are looked up in the directory (services/interview_participants.py).
    """
    id: str
    name: Optional[str] = None
    email: Optional[str] = None


class InterviewBase(BaseModel):
    id: Optional[str] = None
    candidateId: str
    jobId: str
    applicationId: Optional[str] = None
    candidateName: Optional[str] = None
    candidateEmail: Optional[str] = None
    jobTitle: Optional[str] = None
    round: Optional[str] = "Technical Round 1"
    date: Optional[str] = None
    time: Optional[str] = None
    # Comma-joined names of `interviewers`, kept for screens that show a single text value.
    interviewer: Optional[str] = None
    # The CC recipients of the invitation email: required when scheduling (at least one person).
    interviewers: Optional[List[PersonRef]] = None
    # Optional; hidden from the other recipients.
    bcc: Optional[List[PersonRef]] = None
    status: Optional[str] = "Scheduled"
    meetingLink: Optional[str] = None
    feedback: Optional[str] = None
    technicalScore: Optional[float] = None
    communicationScore: Optional[float] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class InterviewCreate(InterviewBase):
    pass

class InterviewUpdate(BaseModel):
    round: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    interviewer: Optional[str] = None
    interviewers: Optional[List[PersonRef]] = None
    bcc: Optional[List[PersonRef]] = None
    status: Optional[str] = None
    meetingLink: Optional[str] = None
    feedback: Optional[str] = None
    technicalScore: Optional[float] = None
    communicationScore: Optional[float] = None

class InterviewResponse(InterviewBase):
    @field_validator("interviewers", "bcc", mode="before")
    @classmethod
    def _missing_list_is_empty(cls, value):
        # Interviews saved before these columns existed have NULL in them.
        return [] if value is None else value

    class Config:
        from_attributes = True
