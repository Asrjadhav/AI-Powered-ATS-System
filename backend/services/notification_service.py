import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from models.notification import NotificationModel
from schemas.notification import NotificationCreate, NotificationUpdate

def format_notification_response(n: NotificationModel) -> dict:
    priority = "HIGH" if n.type in ["interview_reminder", "offer_accepted", "offer_rejected"] else ("MEDIUM" if n.type in ["candidate_applied", "ai_screening_completed"] else "LOW")
    return {
        "id": n.id,
        "userId": n.userId,
        "title": n.title,
        "message": n.message or "",
        "description": n.message or "",
        "type": n.type or "info",
        "isRead": bool(n.isRead),
        "read": bool(n.isRead),
        "status": "read" if n.isRead else "unread",
        "priority": priority,
        "candidateName": n.candidateName or "",
        "jobTitle": n.jobTitle or "",
        "timestamp": n.createdAt or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "createdAt": n.createdAt,
        "updatedAt": n.createdAt
    }

def get_all_notifications(db: Session) -> List[dict]:
    notifs = db.query(NotificationModel).order_by(NotificationModel.createdAt.desc()).all()
    return [format_notification_response(n) for n in notifs]

def get_notification_by_id(db: Session, identifier: str) -> Optional[NotificationModel]:
    if not identifier:
        return None
    raw_id = str(identifier).strip()
    return db.query(NotificationModel).filter(
        or_(
            NotificationModel.id == raw_id,
            func.lower(NotificationModel.id) == raw_id.lower()
        )
    ).first()

def create_notification(db: Session, payload: NotificationCreate) -> dict:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    notif_id = payload.id if payload.id else f"notif_{str(uuid.uuid4())[:8]}"

    existing = db.query(NotificationModel).filter(NotificationModel.id == notif_id).first()
    if existing:
        notif_id = f"notif_{str(uuid.uuid4())[:8]}"

    new_notif = NotificationModel(
        id=notif_id,
        userId=payload.userId,
        title=payload.title,
        message=payload.message or "",
        type=payload.type or "info",
        isRead=payload.isRead if payload.isRead is not None else False,
        candidateName=payload.candidateName,
        jobTitle=payload.jobTitle,
        createdAt=payload.createdAt or now
    )

    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)

    return format_notification_response(new_notif)

def create_notification_event(
    db: Session,
    title: str,
    message: str,
    notif_type: str = "info",
    candidate_name: Optional[str] = None,
    job_title: Optional[str] = None
) -> dict:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    notif_id = f"notif_{str(uuid.uuid4())[:8]}"

    new_notif = NotificationModel(
        id=notif_id,
        userId=None,
        title=title,
        message=message,
        type=notif_type,
        isRead=False,
        candidateName=candidate_name,
        jobTitle=job_title,
        createdAt=now
    )

    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)

    return format_notification_response(new_notif)

def mark_as_read(db: Session, identifier: str) -> Optional[dict]:
    n = get_notification_by_id(db, identifier)
    if not n:
        return None

    n.isRead = True
    db.commit()
    db.refresh(n)

    return format_notification_response(n)

def mark_all_as_read(db: Session) -> bool:
    db.query(NotificationModel).filter(NotificationModel.isRead == False).update({"isRead": True}, synchronize_session=False)
    db.commit()
    return True

def delete_notification(db: Session, identifier: str) -> bool:
    n = get_notification_by_id(db, identifier)
    if not n:
        return False

    db.delete(n)
    db.commit()
    return True

def clear_all_notifications(db: Session) -> bool:
    db.query(NotificationModel).delete(synchronize_session=False)
    db.commit()
    return True
