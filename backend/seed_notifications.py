import datetime
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.notification import NotificationModel

DEFAULT_NOTIFS = [
    {
        "id": "notif-001",
        "title": "Smart Candidate Match",
        "message": "Aura AI match rating for candidate Priya Patel processed. High match alignment at 88%.",
        "type": "ai_screening_completed",
        "isRead": False,
        "candidateName": "Priya Patel",
        "jobTitle": "Product Designer"
    },
    {
        "id": "notif-002",
        "title": "Technical Interview Scheduled",
        "message": "Technical architecture evaluation panel scheduled for candidate sdfaf adfer.",
        "type": "interview_reminder",
        "isRead": False,
        "candidateName": "sdfaf adfer",
        "jobTitle": "Backend Engineer - Python"
    },
    {
        "id": "notif-003",
        "title": "Candidate Application Received",
        "message": "Candidate sdf fds submitted a formal application for Frontend Developer.",
        "type": "candidate_applied",
        "isRead": True,
        "candidateName": "sdf fds",
        "jobTitle": "Frontend Developer - Fresher"
    },
    {
        "id": "notif-004",
        "title": "Offer Letter Generated",
        "message": "Employment offer contract generated for candidate sdf fds.",
        "type": "offer_accepted",
        "isRead": False,
        "candidateName": "sdf fds",
        "jobTitle": "Frontend Developer - Fresher"
    }
]

def seed_notifications():
    db = SessionLocal()
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        added_count = 0

        for n_data in DEFAULT_NOTIFS:
            existing = db.query(NotificationModel).filter(NotificationModel.id == n_data["id"]).first()
            if not existing:
                notif = NotificationModel(
                    id=n_data["id"],
                    userId=None,
                    title=n_data["title"],
                    message=n_data["message"],
                    type=n_data["type"],
                    isRead=n_data["isRead"],
                    candidateName=n_data["candidateName"],
                    jobTitle=n_data["jobTitle"],
                    createdAt=now
                )
                db.add(notif)
                added_count += 1

        db.commit()
        print(f"Seeded {added_count} notification(s) into PostgreSQL 'notifications' table!")

        print("\n=== POSTGRESQL NOTIFICATIONS TABLE ===")
        notifs = db.query(NotificationModel).all()
        for n in notifs:
            print(f"  - {n.id} | Title: {n.title} | Read: {n.isRead} | Candidate: {n.candidateName}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_notifications()
