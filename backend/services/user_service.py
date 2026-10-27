"""
Team member (recruiter/HR/admin) management.

This is the single place users are created, updated and listed. It replaces
two disconnected copies that used to live entirely in the browser: the Users
& Roles screen wrote to localStorage key "ats_users", and a separate
repository read a different key, "users" — neither ever saw the other's data,
and neither was reachable outside the browser that created it.

/api/auth/login auto-creates a UserModel row on first sign-in if the email is
new. That behaviour is untouched. This service is for explicitly managing
those rows — inviting a team member before they have ever logged in, editing
their role, deactivating them.
"""

import uuid
import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.user import UserModel
from schemas.user import UserCreate, UserUpdate

import logging
from logging_config import mask_email

logger = logging.getLogger(__name__)

# Solid colour classes cycled through for a new user's avatar fallback.
AVATAR_COLORS = (
    "bg-indigo-600 text-white",
    "bg-emerald-600 text-white",
    "bg-purple-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-600 text-white",
    "bg-sky-600 text-white",
    "bg-pink-600 text-white",
)


def _normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def get_users(db: Session, department: Optional[str] = None) -> List[UserModel]:
    query = db.query(UserModel)
    if department and department.strip().lower() not in ("", "all", "all departments"):
        query = query.filter(UserModel.department == department)
    return query.order_by(UserModel.createdAt.desc()).all()


def get_user_by_id(db: Session, user_id: str) -> Optional[UserModel]:
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[UserModel]:
    normalized = _normalize_email(email)
    if not normalized:
        return None
    return db.query(UserModel).filter(UserModel.email == normalized).first()


def create_user(db: Session, user_in: UserCreate) -> UserModel:
    """
    Adds a team member.

    They can sign in with this email from the first attempt: /api/auth/login
    finds the row this creates, sees it has no passwordHash yet, and sets one
    from whatever password they first log in with.
    """
    normalized_email = _normalize_email(user_in.email)
    if not normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required."
        )

    if get_user_by_email(db, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{normalized_email}' already exists."
        )

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    existing_count = db.query(UserModel).count()

    db_user = UserModel(
        id=user_in.id or f"usr-{uuid.uuid4().hex[:8]}",
        email=normalized_email,
        fullName=user_in.fullName or normalized_email.split("@")[0].capitalize(),
        role=user_in.role or "Recruiter",
        department=user_in.department,
        designation=user_in.designation,
        manager=user_in.manager,
        employeeId=user_in.employeeId or f"ENC-{uuid.uuid4().hex[:6].upper()}",
        phone=user_in.phone,
        avatarUrl=user_in.avatarUrl,
        avatarColor=user_in.avatarColor or AVATAR_COLORS[existing_count % len(AVATAR_COLORS)],
        status=user_in.status or "Active",
        lastLogin="Never",
        changePasswordOnFirstLogin=(
            user_in.changePasswordOnFirstLogin
            if user_in.changePasswordOnFirstLogin is not None
            else True
        ),
        createdAt=now,
        updatedAt=now,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.warning("User created: id=%s email=%s role=%s (they set their password on first login)",
                   db_user.id, mask_email(db_user.email), db_user.role)
    return db_user


def update_user(db: Session, user_id: str, updates: UserUpdate) -> Optional[UserModel]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        logger.warning("User update: %r not found", user_id)
        return None

    update_data = updates.dict(exclude_unset=True)
    old_role = db_user.role

    if "email" in update_data:
        normalized_email = _normalize_email(update_data["email"])
        if not normalized_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email cannot be empty."
            )
        existing = get_user_by_email(db, normalized_email)
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A user with email '{normalized_email}' already exists."
            )
        update_data["email"] = normalized_email

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db_user.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.commit()
    db.refresh(db_user)
    (logger.warning if "role" in update_data or "status" in update_data else logger.info)(
        "User %s updated: fields=%s%s", db_user.id, sorted(k for k in update_data if k != "updatedAt"),
        f" (role {old_role} -> {db_user.role})" if "role" in update_data else "")
    return db_user


def delete_user(db: Session, user_id: str) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        logger.warning("User delete: %r not found", user_id)
        return False
    db.delete(db_user)
    db.commit()
    logger.warning("User deleted: id=%s email=%s", user_id, mask_email(db_user.email))
    return True
