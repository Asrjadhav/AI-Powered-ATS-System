from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class OfferModel(Base):
    __tablename__ = "offers"

    id = Column(String, primary_key=True, index=True)
    candidateId = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    applicationId = Column(String, ForeignKey("applications.id"), nullable=True, index=True)
    candidateName = Column(String, nullable=True)
    candidateEmail = Column(String, nullable=True)
    jobTitle = Column(String, nullable=True)
    department = Column(String, nullable=True)
    offeredCTC = Column(Float, nullable=True)
    joiningDate = Column(String, nullable=True)
    status = Column(String, nullable=True, default="Draft", index=True)
    workflowStage = Column(String, nullable=True, default="Offer Generation")
    contractTemplate = Column(String, nullable=True)
    customTerms = Column(Text, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    # Relationships
    candidate = relationship("CandidateModel", back_populates="offers")
    job = relationship("JobModel", back_populates="offers")
    application = relationship("ApplicationModel", back_populates="offers")
