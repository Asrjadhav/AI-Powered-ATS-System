from pydantic import BaseModel
from typing import Optional

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
    interviewer: Optional[str] = None
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
    status: Optional[str] = None
    meetingLink: Optional[str] = None
    feedback: Optional[str] = None
    technicalScore: Optional[float] = None
    communicationScore: Optional[float] = None

class InterviewResponse(InterviewBase):
    class Config:
        from_attributes = True
