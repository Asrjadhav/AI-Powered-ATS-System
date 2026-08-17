from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class CandidateBase(BaseModel):
    id: Optional[str] = None
    candidateId: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    currentRole: Optional[str] = None
    currentCompany: Optional[str] = None
    skills: Optional[List[str]] = None
    experienceYears: Optional[float] = None
    resumeText: Optional[str] = None
    linkedinUrl: Optional[str] = None
    avatarUrl: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    expectedCTC: Optional[float] = None
    currentCTC: Optional[float] = None
    hrNotes: Optional[str] = None
    hrApprovalStatus: Optional[str] = None
    customFields: Optional[List[Dict[str, Any]]] = None
    
    experienceLevel: Optional[str] = None
    noticePeriod: Optional[str] = None
    portfolioUrl: Optional[str] = None
    highestEducation: Optional[str] = None
    specialization: Optional[str] = None
    yearOfPassing: Optional[str] = None
    totalExperience: Optional[str] = None
    keySkills: Optional[str] = None
    inHandSalary: Optional[str] = None
    projectsWorkedOn: Optional[str] = None
    relocateToPune: Optional[str] = None
    
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    status: Optional[str] = None
    aiScore: Optional[int] = None
    timeline: Optional[List[Dict[str, Any]]] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    candidateId: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    currentRole: Optional[str] = None
    currentCompany: Optional[str] = None
    skills: Optional[List[str]] = None
    experienceYears: Optional[float] = None
    resumeText: Optional[str] = None
    linkedinUrl: Optional[str] = None
    avatarUrl: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    expectedCTC: Optional[float] = None
    currentCTC: Optional[float] = None
    hrNotes: Optional[str] = None
    hrApprovalStatus: Optional[str] = None
    customFields: Optional[List[Dict[str, Any]]] = None
    
    experienceLevel: Optional[str] = None
    noticePeriod: Optional[str] = None
    portfolioUrl: Optional[str] = None
    highestEducation: Optional[str] = None
    specialization: Optional[str] = None
    yearOfPassing: Optional[str] = None
    totalExperience: Optional[str] = None
    keySkills: Optional[str] = None
    inHandSalary: Optional[str] = None
    projectsWorkedOn: Optional[str] = None
    relocateToPune: Optional[str] = None
    
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    status: Optional[str] = None
    aiScore: Optional[int] = None
    timeline: Optional[List[Dict[str, Any]]] = None

class CandidateResponse(CandidateBase):
    class Config:
        from_attributes = True
