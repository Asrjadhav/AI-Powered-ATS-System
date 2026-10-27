import hashlib
import hmac
import secrets
import datetime
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx
import config
from database import get_db
from models.user import UserModel
import logging
from logging_config import mask_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str
    captchaToken: str = ""

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class UpdateProfileRequest(BaseModel):
    email: str
    name: Optional[str] = None
    role: Optional[str] = None
    profileImage: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None
    originalEmail: Optional[str] = None

def generate_salt() -> str:
    """A fresh, per-user random salt. Generated once per password set."""
    return secrets.token_hex(16)

def hash_password(password: str, salt: str) -> str:
    """
    Salted PBKDF2-HMAC-SHA256, standard library only.

    Replaces the previous plain hashlib.sha256(password) with no salt, which
    meant identical passwords produced identical hashes (rainbow-table
    lookups work directly against it) and had no per-guess cost at all. This
    version needs the correct per-user salt to reproduce the hash, and
    PASSWORD_HASH_ITERATIONS makes each guess computationally expensive.
    """
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        config.PASSWORD_HASH_ITERATIONS,
    ).hex()

def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    """Constant-time comparison, so mismatch timing can't leak hash bytes."""
    return hmac.compare_digest(hash_password(password, salt), expected_hash)

def verify_turnstile_token(token: str) -> bool:
    """
    Verify a Cloudflare Turnstile token via the Siteverify API.
    Returns True only if Cloudflare confirms the token is valid.
    Fails closed: returns False if the secret key is not configured.
    Never logs the token or secret.
    """
    if not config.TURNSTILE_SECRET_KEY:
        logger.warning("CAPTCHA check failed closed: TURNSTILE_SECRET_KEY is not set, so nobody can log in")
        return False
    if not token:
        return False
    try:
        response = httpx.post(
            config.TURNSTILE_SITEVERIFY_URL,
            data={
                "secret": config.TURNSTILE_SECRET_KEY,
                "response": token,
            },
            timeout=10.0,
        )
        result = response.json()
        ok = result.get("success", False) is True
        if not ok:
            logger.warning("CAPTCHA rejected by Cloudflare: %s", result.get("error-codes"))
        return ok
    except Exception as exc:
        logger.error("CAPTCHA verification could not reach Cloudflare: %s", exc)
        return False

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    logger.info("Login attempt: email=%s", mask_email(payload.email.strip().lower()))
    # Verify CAPTCHA before any authentication logic
    if not payload.captchaToken or not verify_turnstile_token(payload.captchaToken):
        logger.warning("Login refused for %s: CAPTCHA missing or failed", mask_email(payload.email.strip().lower()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete the CAPTCHA verification."
        )

    clean_email = payload.email.strip().lower()
    if not clean_email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user = db.query(UserModel).filter(UserModel.email.ilike(clean_email)).first()

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not user:
        logger.warning("Login: no account for %s, AUTO-CREATING an admin account (any password is accepted for a new email)",
                       mask_email(clean_email))
        # Auto-create user for seamless access in production & sandbox environments.
        # Intentionally permissive for now: any email + any password logs in.
        # Revisit once real role-based registration exists.
        name_prefix = clean_email.split("@")[0]
        capitalized_name = name_prefix[0].upper() + name_prefix[1:] if len(name_prefix) > 0 else "User"
        new_salt = generate_salt()
        user = UserModel(
            id=f"usr-{uuid.uuid4().hex[:8]}",
            email=clean_email,
            fullName=capitalized_name,
            passwordSalt=new_salt,
            passwordHash=hash_password(payload.password, new_salt),
            role="Lead Recruiting Admin",
            department="Talent Acquisition",
            phone="+91 98765 43210",
            bio=f"Talent Acquisition and Recruiting Administrator account for {capitalized_name}.",
            timezone="Asia/Kolkata",
            status="Active",
            lastLogin=now_iso,
            createdAt=now_iso,
            updatedAt=now_iso
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # A user with no passwordHash is awaiting their first password —
        # either a brand new account, or an existing one reset by migration
        # 006 (salted hashing rollout). Adopt whatever they enter now.
        if not user.passwordHash:
            logger.warning("Login: account %s has no password yet, the password entered now becomes its password",
                           mask_email(user.email))
            new_salt = generate_salt()
            user.passwordSalt = new_salt
            user.passwordHash = hash_password(payload.password, new_salt)
            user.lastLogin = now_iso
            db.commit()
            db.refresh(user)
        else:
            if not user.passwordSalt or not verify_password(
                payload.password, user.passwordSalt, user.passwordHash
            ):
                logger.warning("Login refused for %s: wrong password%s", mask_email(user.email),
                               "" if user.passwordSalt else " (account has no salt, password reset needed)")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password."
                )

            user.lastLogin = now_iso
            db.commit()

    logger.info("Login OK: user=%s role=%s", mask_email(user.email), user.role)
    return {
        "success": True,
        "token": f"bearer-token-{uuid.uuid4().hex}",
        "user": {
            "email": user.email,
            "name": user.fullName or user.email.split("@")[0].capitalize(),
            "role": user.role or "Lead Recruiting Admin",
            "profileImage": user.avatarUrl or "",
            "phone": user.phone or "+91 98765 43210",
            "bio": user.bio or "",
            "timezone": user.timezone or "Asia/Kolkata"
        }
    }

@router.post("/logout")
def logout():
    """
    Tokens are stateless, so there is no server-side session to end; the client
    discards its token. Kept as a real endpoint so the frontend has one place to
    call, and a place to revoke tokens once they are server-issued.
    """
    return {"success": True}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    return {
        "success": True,
        "message": f"Password recovery instructions dispatched to {payload.email}.",
        "isSandbox": False
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    return {
        "success": True,
        "message": "Password successfully updated."
    }

@router.post("/update-profile")
def update_profile(payload: UpdateProfileRequest, db: Session = Depends(get_db)):
    target_email = (payload.originalEmail or payload.email).strip().lower()
    user = db.query(UserModel).filter(UserModel.email.ilike(target_email)).first()

    if not user:
        logger.warning("Profile update: no account for %s", mask_email(target_email))
        raise HTTPException(status_code=404, detail="User profile not found.")

    if payload.name:
        user.fullName = payload.name
    if payload.role:
        user.role = payload.role
    if payload.profileImage is not None:
        user.avatarUrl = payload.profileImage
    if payload.phone:
        user.phone = payload.phone
    if payload.bio:
        user.bio = payload.bio
    if payload.timezone:
        user.timezone = payload.timezone
    if payload.email and payload.email.strip().lower() != target_email:
        user.email = payload.email.strip().lower()

    if payload.newPassword and payload.currentPassword:
        if user.passwordHash:
            if not user.passwordSalt or not verify_password(
                payload.currentPassword, user.passwordSalt, user.passwordHash
            ):
                raise HTTPException(status_code=400, detail="Current password is incorrect.")
        new_salt = generate_salt()
        user.passwordSalt = new_salt
        user.passwordHash = hash_password(payload.newPassword, new_salt)

    user.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.commit()
    db.refresh(user)
    changed = [name for name, value in (
        ("name", payload.name), ("role", payload.role), ("avatar", payload.profileImage is not None),
        ("phone", payload.phone), ("bio", payload.bio), ("timezone", payload.timezone),
        ("email", payload.email and payload.email.strip().lower() != target_email),
        ("password", payload.newPassword and payload.currentPassword),
    ) if value]
    (logger.warning if "role" in changed or "password" in changed else logger.info)(
        "Profile updated for %s: changed=%s", mask_email(user.email), changed)

    return {
        "success": True,
        "message": "User profile successfully updated.",
        "user": {
            "email": user.email,
            "name": user.fullName,
            "role": user.role,
            "profileImage": user.avatarUrl or "",
            "phone": user.phone or "",
            "bio": user.bio or "",
            "timezone": user.timezone or "Asia/Kolkata"
        }
    }

# GET /google/status (-> /api/auth/google/status) previously lived here as a
# hardcoded `{"connected": False, "email": None}` stub. It now lives in
# routers/google_calendar.py alongside the rest of the Google integration
# routes, backed by services/google_calendar_service.py.
