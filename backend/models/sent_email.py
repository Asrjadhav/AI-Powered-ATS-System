from sqlalchemy import Column, String, Text
from database import Base

class SentEmailModel(Base):
    __tablename__ = "sent_emails"

    id = Column(String, primary_key=True, index=True)
    toEmail = Column(String, nullable=False, index=True)
    toName = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    sentAt = Column(String, nullable=True)
    status = Column(String, nullable=True, default="Sent")
    candidateId = Column(String, nullable=True)
    jobId = Column(String, nullable=True)
