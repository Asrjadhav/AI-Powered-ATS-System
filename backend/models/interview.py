from sqlalchemy import Column, String, Integer, Float, Text, JSON, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from database import Base

class InterviewModel(Base):
    __tablename__ = "interviews"

    id = Column(String, primary_key=True, index=True)
    candidateId = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    applicationId = Column(String, ForeignKey("applications.id"), nullable=True, index=True)
    candidateName = Column(String, nullable=True)
    candidateEmail = Column(String, nullable=True)
    jobTitle = Column(String, nullable=True)
    round = Column(String, nullable=True, default="Technical Round 1")
    date = Column(String, nullable=True)
    time = Column(String, nullable=True)
    interviewer = Column(String, nullable=True)  # comma-joined names of `interviewers`
    # Lists of {"id", "name", "email"} copied from the people directory (services/directory_service.py).
    # `interviewers` are the CC recipients of the invitation email (required); `bcc` is optional.
    # Existing databases need backend/migrations/001_interview_participants.sql run once.
    interviewers = Column(JSONB, nullable=True, default=list, server_default=text("'[]'::jsonb"))
    bcc = Column(JSONB, nullable=True, default=list, server_default=text("'[]'::jsonb"))
    status = Column(String, nullable=True, default="Scheduled", index=True)
    meetingLink = Column(String, nullable=True)
    feedback = Column(Text, nullable=True)
    technicalScore = Column(Float, nullable=True)
    communicationScore = Column(Float, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    # Relationships
    candidate = relationship("CandidateModel", back_populates="interviews")
    job = relationship("JobModel", back_populates="interviews")
    application = relationship("ApplicationModel", back_populates="interviews")
