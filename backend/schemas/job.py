from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JobBase(BaseModel):
    id: Optional[str] = None
    jobId: Optional[str] = None # e.g. JOB-0001
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = "Full-time"
    workMode: Optional[str] = "Remote"
    experienceRange: Optional[str] = None
    experienceLevel: Optional[str] = None
    salaryRange: Optional[str] = None
    maxBudget: Optional[float] = None
    openings: Optional[int] = 1
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    requirements: Optional[Any] = None
    preferredSkills: Optional[List[str]] = None
    education: Optional[Any] = None
    benefits: Optional[List[str]] = None
    status: Optional[str] = "published"
    hiringManager: Optional[str] = None
    recruiter: Optional[str] = None
    deadline: Optional[str] = None
    targetJoiningDate: Optional[str] = None
    customFields: Optional[Any] = None
    publicApplicationInfo: Optional[Dict[str, Any]] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    workMode: Optional[str] = None
    experienceRange: Optional[str] = None
    experienceLevel: Optional[str] = None
    salaryRange: Optional[str] = None
    maxBudget: Optional[float] = None
    openings: Optional[int] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    requirements: Optional[Any] = None
    preferredSkills: Optional[List[str]] = None
    education: Optional[Any] = None
    benefits: Optional[List[str]] = None
    status: Optional[str] = None
    hiringManager: Optional[str] = None
    recruiter: Optional[str] = None
    deadline: Optional[str] = None
    targetJoiningDate: Optional[str] = None
    customFields: Optional[Any] = None
    publicApplicationInfo: Optional[Dict[str, Any]] = None

class JobResponse(JobBase):
    candidateCount: Optional[int] = 0

    class Config:
        from_attributes = True
