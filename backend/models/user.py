from sqlalchemy import Column, String, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    fullName = Column(String, nullable=True)
    role = Column(String, nullable=True, default="Recruiter")
    department = Column(String, nullable=True)
    employeeId = Column(String, nullable=True)
    avatarUrl = Column(String, nullable=True)
    status = Column(String, nullable=True, default="Active")
    lastLogin = Column(String, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    # Relationships
    jobs = relationship("JobModel", back_populates="creator", foreign_keys="JobModel.createdBy")
    notifications = relationship("NotificationModel", back_populates="user")
