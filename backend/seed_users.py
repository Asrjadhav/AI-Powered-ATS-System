import datetime
import uuid
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.user import UserModel

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
                # passwordHash/passwordSalt are deliberately left unset. Any
                # passwordHash committed to users_db.json predates salted
                # hashing (routers/auth.py) and can't be verified without a
                # matching salt this seed doesn't have. Leaving both unset
                # means /api/auth/login treats this account as awaiting its
                # first password, same as migration 006 does for existing
                # rows — the next login sets a correctly salted hash.
                user = UserModel(
                    id=f"usr-{uuid.uuid4().hex[:8]}",
                    email=email,
                    fullName=u_data.get("name", "Recruiter Admin"),
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
            # Note: no longer backfilling passwordHash on existing rows here.
            # An unsalted hash pulled from users_db.json would silently
            # recreate the exact vulnerability migration 006 removed.

        db.commit()
        print(f"[SUCCESS] Seeded {added_count} recruiter account(s) into PostgreSQL 'users' table!")
    except Exception as e:
        db.rollback()
        print(f"[NOTE] User seeding note: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
