from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    fullName = Column(String, nullable=True)
    passwordHash = Column(String, nullable=True)
    # Per-user random salt (hex-encoded) mixed into passwordHash via PBKDF2.
    # A user with passwordHash set but no passwordSalt predates this column
    # and cannot log in until their password is reset — see migration 006.
    passwordSalt = Column(String, nullable=True)
    role = Column(String, nullable=True, default="Recruiter")
    department = Column(String, nullable=True)
    employeeId = Column(String, nullable=True)
    avatarUrl = Column(String, nullable=True)
    # Solid colour class used as an avatar fallback in the Users & Roles
    # screen (e.g. "bg-indigo-600 text-white") when no avatarUrl is set.
    avatarColor = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    manager = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    status = Column(String, nullable=True, default="Active")
    lastLogin = Column(String, nullable=True)
    # Set when a team member is created by an admin, so the first login can
    # prompt a password change. Not currently enforced by /api/auth/login.
    changePasswordOnFirstLogin = Column(Boolean, nullable=True, default=False)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    # Relationships
    jobs = relationship("JobModel", back_populates="creator", foreign_keys="JobModel.createdBy")
    notifications = relationship("NotificationModel", back_populates="user")
