import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status

from models.email_template import EmailTemplateModel
from schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate

def format_template_response(temp: EmailTemplateModel) -> dict:
    return {
        "id": temp.id,
        "name": temp.name,
        "subject": temp.subject,
        "body": temp.body,
        "category": temp.category or "General",
        "variables": temp.variables or ["candidate_name", "job_title", "company_name", "recruiter_name"],
        "status": "Active",
        "createdAt": temp.createdAt,
        "updatedAt": temp.updatedAt
    }

def list_templates(db: Session) -> List[dict]:
    templates = db.query(EmailTemplateModel).all()
    return [format_template_response(t) for t in templates]

def get_template_by_id(db: Session, identifier: str) -> Optional[EmailTemplateModel]:
    if not identifier:
        return None
    raw_id = str(identifier).strip()
    return db.query(EmailTemplateModel).filter(
        or_(
            EmailTemplateModel.id == raw_id,
            func.lower(EmailTemplateModel.id) == raw_id.lower(),
            func.lower(EmailTemplateModel.name) == raw_id.lower()
        )
    ).first()

def create_template(db: Session, payload: EmailTemplateCreate) -> dict:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    temp_id = payload.id if payload.id else f"temp_{str(uuid.uuid4())[:8]}"

    existing = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == temp_id).first()
    if existing:
        temp_id = f"temp_{str(uuid.uuid4())[:8]}"

    new_temp = EmailTemplateModel(
        id=temp_id,
        name=payload.name,
        subject=payload.subject,
        body=payload.body,
        category=payload.category or "General",
        variables=payload.variables or ["candidate_name", "job_title", "company_name", "recruiter_name"],
        createdAt=now,
        updatedAt=now
    )
    db.add(new_temp)
    db.commit()
    db.refresh(new_temp)

    return format_template_response(new_temp)

def update_template(db: Session, identifier: str, updates: EmailTemplateUpdate) -> Optional[dict]:
    temp = get_template_by_id(db, identifier)
    if not temp:
        return None

    update_data = updates.dict(exclude_unset=True)
    update_data.pop("id", None)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data["updatedAt"] = now

    for key, val in update_data.items():
        setattr(temp, key, val)

    db.commit()
    db.refresh(temp)

    return format_template_response(temp)

def delete_template(db: Session, identifier: str) -> bool:
    temp = get_template_by_id(db, identifier)
    if not temp:
        return False

    db.delete(temp)
    db.commit()
    return True
