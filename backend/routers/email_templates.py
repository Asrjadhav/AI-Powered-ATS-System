from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse
from services import email_template_service

router = APIRouter(tags=["Email Templates"])

@router.get("/templates", response_model=List[dict])
def list_templates(db: Session = Depends(get_db)):
    """
    List all email templates in the PostgreSQL database.
    """
    return email_template_service.list_templates(db)

@router.get("/templates/{id}", response_model=dict)
def get_template(id: str, db: Session = Depends(get_db)):
    """
    Get specific email template by ID or name.
    """
    temp = email_template_service.get_template_by_id(db, id)
    if not temp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template '{id}' not found."
        )
    return email_template_service.format_template_response(temp)

@router.post("/templates", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_template(payload: EmailTemplateCreate, db: Session = Depends(get_db)):
    """
    Create a new email template in PostgreSQL.
    """
    return email_template_service.create_template(db, payload)

@router.put("/templates/{id}", response_model=dict)
def update_template_full(id: str, updates: EmailTemplateUpdate, db: Session = Depends(get_db)):
    """
    Full update of an email template in PostgreSQL.
    """
    updated = email_template_service.update_template(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template '{id}' not found."
        )
    return updated

@router.patch("/templates/{id}", response_model=dict)
def update_template_partial(id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Partial update of an email template in PostgreSQL.
    """
    updates = EmailTemplateUpdate(**payload)
    updated = email_template_service.update_template(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template '{id}' not found."
        )
    return updated

@router.delete("/templates/{id}", status_code=status.HTTP_200_OK)
def delete_template(id: str, db: Session = Depends(get_db)):
    """
    Delete an email template cleanly from PostgreSQL.
    """
    success = email_template_service.delete_template(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template '{id}' not found."
        )
    return {"success": True, "id": id}
