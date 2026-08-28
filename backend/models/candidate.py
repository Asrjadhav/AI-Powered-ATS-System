from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CandidateModel(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, index=True)
    candidateId = Column(String, unique=True, index=True, nullable=False) # e.g. CAND-0001
    jobId = Column(String, ForeignKey("jobs.id"), nullable=True)
    firstName = Column(String, nullable=True)
    lastName = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False) # Normalized case-insensitive unique email
    phone = Column(String, nullable=True)
    currentRole = Column(String, nullable=True)
    currentCompany = Column(String, nullable=True)
    skills = Column(JSON, nullable=True)
    experienceYears = Column(Float, nullable=True)
    resumeText = Column(Text, nullable=True)
    resumeFileName = Column(String, nullable=True)
    resumeStorageKey = Column(String, nullable=True)
    resumeUploadedAt = Column(String, nullable=True)
    linkedinUrl = Column(String, nullable=True)
    avatarUrl = Column(String, nullable=True)
    source = Column(String, nullable=True)
    location = Column(String, nullable=True)
    expectedCTC = Column(Float, nullable=True)
    currentCTC = Column(Float, nullable=True)
    hrNotes = Column(Text, nullable=True)
    hrApprovalStatus = Column(String, nullable=True)
    customFields = Column(JSON, nullable=True)
    
    experienceLevel = Column(String, nullable=True)
    noticePeriod = Column(String, nullable=True)
    portfolioUrl = Column(String, nullable=True)
    highestEducation = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    yearOfPassing = Column(String, nullable=True)
    totalExperience = Column(String, nullable=True)
    totalExperienceMonths = Column(Integer, nullable=True, default=0)
    keySkills = Column(String, nullable=True)
    inHandSalary = Column(String, nullable=True)
    projectsWorkedOn = Column(Text, nullable=True)
    relocateToPune = Column(String, nullable=True)
    
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)
    createdBy = Column(String, nullable=True)
    status = Column(String, nullable=True)
    aiScore = Column(Integer, nullable=True)
    timeline = Column(JSON, nullable=True)

    # Relationships (No cascade delete to preserve ATS history)
    applications = relationship("ApplicationModel", back_populates="candidate")
    interviews = relationship("InterviewModel", back_populates="candidate")
    offers = relationship("OfferModel", back_populates="candidate")
