from sqlalchemy import Column, String, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class TalentPoolModel(Base):
    __tablename__ = "talent_pool"

    id = Column(String, primary_key=True, index=True)
    candidateId = Column(String, ForeignKey("candidates.id"), unique=True, index=True, nullable=False)
    
    currentRole = Column(String, nullable=True)
    currentCompany = Column(String, nullable=True)
    skills = Column(JSON, nullable=True)
    experienceYears = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    aiMatchScore = Column(Float, nullable=True)
    availability = Column(String, nullable=True)
    noticePeriod = Column(String, nullable=True)
    status = Column(String, nullable=True, default="Available")
    department = Column(String, nullable=True)
    education = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    aiSummary = Column(Text, nullable=True)
    certifications = Column(JSON, nullable=True)
    projects = Column(JSON, nullable=True)
    recruitmentHistory = Column(JSON, nullable=True)
    recruiterNotes = Column(Text, nullable=True)
    
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    # Foreign key relationship to CandidateModel
    candidate = relationship("CandidateModel", foreign_keys=[candidateId])
