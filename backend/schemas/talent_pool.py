from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TalentPoolBase(BaseModel):
    currentRole: Optional[str] = None
    currentCompany: Optional[str] = None
    skills: Optional[List[str]] = None
    experienceYears: Optional[float] = 0.0
    location: Optional[str] = None
    aiMatchScore: Optional[float] = 80.0
    availability: Optional[str] = "Immediate"
    noticePeriod: Optional[str] = "Immediate"
    status: Optional[str] = "Available"
    department: Optional[str] = "Engineering"
    education: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    aiSummary: Optional[str] = None
    certifications: Optional[List[str]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    recruitmentHistory: Optional[Dict[str, Any]] = None
    recruiterNotes: Optional[str] = None

class TalentPoolCreate(TalentPoolBase):
    candidateId: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class TalentPoolUpdate(TalentPoolBase):
    pass

class TalentPoolResponse(TalentPoolBase):
    id: str
    candidateId: str
    name: str
    email: str
    phone: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        from_attributes = True

class TalentPoolStats(BaseModel):
    """
    KPI figures for the Talent Pool screen, aggregated in the database.

    Previously computed in TalentPoolView.tsx from the full fetched pool
    (candidates.reduce(...), candidates.filter(...).length), duplicating work
    the database can do directly and more cheaply as the pool grows.
    """
    total: int = 0
    aiRecommendedCount: int = 0
    immediateJoinersCount: int = 0
    averageMatchScore: int = 0
