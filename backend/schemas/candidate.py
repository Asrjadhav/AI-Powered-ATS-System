from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class CandidateBase(BaseModel):
    id: Optional[str] = None
    candidateId: Optional[str] = None # e.g. CAND-0001
    jobId: Optional[str] = None
    appliedJob: Optional[str] = None # Resolved from target JobModel.title
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    currentRole: Optional[str] = None
    currentCompany: Optional[str] = None
    skills: Optional[Any] = None
    experienceYears: Optional[float] = None
    resumeText: Optional[str] = None
    resumeFileName: Optional[str] = None
    resumeStorageKey: Optional[str] = None
    resumeUploadedAt: Optional[str] = None
    linkedinUrl: Optional[str] = None
    avatarUrl: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    expectedCTC: Optional[float] = None
    currentCTC: Optional[float] = None
    hrNotes: Optional[str] = None
    hrApprovalStatus: Optional[str] = None
    customFields: Optional[Any] = None
    
    experienceLevel: Optional[str] = None
    noticePeriod: Optional[str] = None
    portfolioUrl: Optional[str] = None
    highestEducation: Optional[str] = None
    specialization: Optional[str] = None
    yearOfPassing: Optional[str] = None
    totalExperience: Optional[str] = None
    totalExperienceMonths: Optional[int] = 0
    keySkills: Optional[str] = None
    inHandSalary: Optional[str] = None
    projectsWorkedOn: Optional[str] = None
    relocateToPune: Optional[str] = None
    
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    status: Optional[str] = "Applied"
    aiScore: Optional[int] = None
    timeline: Optional[Any] = None

class CandidateCreate(CandidateBase):
    email: str # Email is required for creating a Candidate profile

class CandidateUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    currentRole: Optional[str] = None
    currentCompany: Optional[str] = None
    skills: Optional[Any] = None
    experienceYears: Optional[float] = None
    resumeText: Optional[str] = None
    resumeFileName: Optional[str] = None
    resumeStorageKey: Optional[str] = None
    resumeUploadedAt: Optional[str] = None
    linkedinUrl: Optional[str] = None
    avatarUrl: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    expectedCTC: Optional[float] = None
    currentCTC: Optional[float] = None
    hrNotes: Optional[str] = None
    hrApprovalStatus: Optional[str] = None
    customFields: Optional[Any] = None
    totalExperienceMonths: Optional[int] = None
    status: Optional[str] = None
    jobId: Optional[str] = None
    selectedJobId: Optional[str] = None

class CandidateResponse(CandidateBase):
    class Config:
        from_attributes = True
