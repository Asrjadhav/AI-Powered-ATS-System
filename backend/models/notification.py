from sqlalchemy import Column, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class NotificationModel(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String, nullable=True, default="info")
    isRead = Column(Boolean, nullable=False, default=False)
    candidateName = Column(String, nullable=True)
    jobTitle = Column(String, nullable=True)
    createdAt = Column(String, nullable=True)

    # Relationships
    user = relationship("UserModel", back_populates="notifications")
