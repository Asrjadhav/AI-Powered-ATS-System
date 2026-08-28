import datetime
import uuid
import sys
import os
import json
import hashlib

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.user import UserModel

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_users():
    db = SessionLocal()
    try:
        users_json_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "users_db.json")
        default_users = []
        if os.path.exists(users_json_path):
            try:
                with open(users_json_path, "r", encoding="utf-8") as f:
                    default_users = json.load(f)
            except Exception:
                default_users = []

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        added_count = 0

        for u_data in default_users:
            email = str(u_data.get("email", "")).strip().lower()
            if not email:
                continue

            existing = db.query(UserModel).filter(UserModel.email.ilike(email)).first()
            if not existing:
                pwd_hash = u_data.get("passwordHash")
                if not pwd_hash:
                    pwd_hash = hash_password("password123")

                user = UserModel(
                    id=f"usr-{uuid.uuid4().hex[:8]}",
                    email=email,
                    fullName=u_data.get("name", "Recruiter Admin"),
                    passwordHash=pwd_hash,
                    role=u_data.get("role", "Lead Recruiting Admin"),
                    department="Talent Acquisition",
                    phone=u_data.get("phone", "+91 98765 43210"),
                    bio=u_data.get("bio", f"Talent Acquisition account for {email}."),
                    timezone=u_data.get("timezone", "Asia/Kolkata"),
                    avatarUrl=u_data.get("profileImage", ""),
                    status="Active",
                    createdAt=now_iso,
                    updatedAt=now_iso
                )
                db.add(user)
                added_count += 1
            else:
                # Ensure passwordHash is set on legacy rows
                if not existing.passwordHash and u_data.get("passwordHash"):
                    existing.passwordHash = u_data.get("passwordHash")

        db.commit()
        print(f"[SUCCESS] Seeded {added_count} recruiter account(s) into PostgreSQL 'users' table!")
    except Exception as e:
        db.rollback()
        print(f"[NOTE] User seeding note: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
