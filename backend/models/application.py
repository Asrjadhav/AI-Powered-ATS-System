from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import relationship
from database import Base
from services.application_stage import ApplicationStage
from services.application_state import ApplicationState

class ApplicationModel(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, index=True)
    applicationId = Column(String, unique=True, index=True, nullable=False) # e.g. APP-0001
    candidateId = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    status = Column(SAEnum(ApplicationStage, name="application_stage", create_type=False, values_callable=lambda x: [e.value for e in x]), nullable=True, default=ApplicationStage.NEW, index=True)
    # "Open" while the job is open; "On Hold" while the job is closed/draft (see services/job_lifecycle_service.py)
    applicationState = Column(SAEnum(ApplicationState, name="application_state", values_callable=lambda x: [e.value for e in x]), nullable=False, default=ApplicationState.OPEN, server_default=ApplicationState.OPEN.value, index=True)
    source = Column(String, nullable=True, default="Career Portal")
    atsScore = Column(Integer, nullable=True) # ATS score stored directly on Application record
    appliedRole = Column(String, nullable=True)
    department = Column(String, nullable=True)
    candidateEmail = Column(String, nullable=True)
    candidateName = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    aiEvaluation = Column(JSON, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    # Database-level composite unique constraint preventing duplicate applications for same (candidateId, jobId)
    __table_args__ = (
        UniqueConstraint("candidateId", "jobId", name="uq_candidate_job_application"),
    )

    # Relationships
    candidate = relationship("CandidateModel", back_populates="applications")
    job = relationship("JobModel", back_populates="applications")
    interviews = relationship("InterviewModel", back_populates="application")
    offers = relationship("OfferModel", back_populates="application")
