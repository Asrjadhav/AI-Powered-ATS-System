from pydantic import BaseModel
from typing import Optional, Any

class ApplicationBase(BaseModel):
    id: Optional[str] = None
    applicationId: Optional[str] = None # e.g. APP-0001
    candidateId: str
    # NULL when the job was deleted: delete_job() keeps the application and clears
    # its jobId. ApplicationCreate below still requires a job for new applications.
    jobId: Optional[str] = None
    status: Optional[str] = "New"
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
    # Read-only: set by the backend ("Open" on apply, "On Hold" while the job is closed/draft).
    applicationState: Optional[str] = None

    class Config:
        from_attributes = True
