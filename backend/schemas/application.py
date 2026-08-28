from pydantic import BaseModel
from typing import Optional, Any

class ApplicationBase(BaseModel):
    id: Optional[str] = None
    applicationId: Optional[str] = None # e.g. APP-0001
    candidateId: str
    jobId: str
    status: Optional[str] = "Applied"
    source: Optional[str] = "Career Portal"
    atsScore: Optional[int] = None
    appliedRole: Optional[str] = None
    department: Optional[str] = None
    candidateEmail: Optional[str] = None
    candidateName: Optional[str] = None
    notes: Optional[str] = None
    aiEvaluation: Optional[Any] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    candidateId: str
    jobId: str

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    source: Optional[str] = None
    atsScore: Optional[int] = None
    appliedRole: Optional[str] = None
    department: Optional[str] = None
    notes: Optional[str] = None
    aiEvaluation: Optional[Any] = None

class ApplicationResponse(ApplicationBase):
    class Config:
        from_attributes = True
