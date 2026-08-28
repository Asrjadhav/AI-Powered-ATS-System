from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    jobId = Column(String, unique=True, index=True, nullable=False) # e.g. JOB-0001, JOB-0002
    title = Column(String, nullable=False, index=True)
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)
    type = Column(String, nullable=True, default="Full-time")
    workMode = Column(String, nullable=True, default="Remote")
    experienceRange = Column(String, nullable=True)
    experienceLevel = Column(String, nullable=True)
    salaryRange = Column(String, nullable=True)
    maxBudget = Column(Float, nullable=True)
    openings = Column(Integer, nullable=True, default=1)
    description = Column(Text, nullable=True)
    responsibilities = Column(JSON, nullable=True)
    requirements = Column(JSON, nullable=True)
    preferredSkills = Column(JSON, nullable=True)
    education = Column(String, nullable=True)
    benefits = Column(JSON, nullable=True)
    status = Column(String, nullable=True, default="published")
    hiringManager = Column(String, nullable=True)
    recruiter = Column(String, nullable=True)
    deadline = Column(String, nullable=True)
    targetJoiningDate = Column(String, nullable=True)
    customFields = Column(JSON, nullable=True)
    publicApplicationInfo = Column(JSON, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)
    createdBy = Column(String, ForeignKey("users.id"), nullable=True)

    # Relationships (No cascade delete to preserve ATS history on job deletion)
    creator = relationship("UserModel", back_populates="jobs", foreign_keys=[createdBy])
    applications = relationship("ApplicationModel", back_populates="job")
    interviews = relationship("InterviewModel", back_populates="job")
    offers = relationship("OfferModel", back_populates="job")
