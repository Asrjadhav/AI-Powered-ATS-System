from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.notification import NotificationCreate, NotificationUpdate, NotificationResponse
from services import notification_service

router = APIRouter(tags=["Notifications"])

@router.get("/notifications", response_model=List[dict])
def list_notifications(db: Session = Depends(get_db)):
    """
    List all notifications from PostgreSQL database.
    """
    return notification_service.get_all_notifications(db)

@router.get("/notifications/{id}", response_model=dict)
def get_notification(id: str, db: Session = Depends(get_db)):
    """
    Get specific notification by ID.
    """
    n = notification_service.get_notification_by_id(db, id)
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{id}' not found."
        )
    return notification_service.format_notification_response(n)

@router.post("/notifications", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    """
    Create a new notification record in PostgreSQL.
    """
    return notification_service.create_notification(db, payload)

@router.patch("/notifications/read-all", response_model=dict)
def mark_all_read_endpoint(db: Session = Depends(get_db)):
    """
    Mark all notifications as read in PostgreSQL.
    """
    notification_service.mark_all_as_read(db)
    return {"success": True, "message": "All notifications marked as read."}

@router.patch("/notifications/{id}/read", response_model=dict)
def mark_read_endpoint(id: str, db: Session = Depends(get_db)):
    """
    Mark specific notification as read in PostgreSQL.
    """
    updated = notification_service.mark_as_read(db, identifier=id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{id}' not found."
        )
    return updated

@router.delete("/notifications/{id}", status_code=status.HTTP_200_OK)
def delete_notification(id: str, db: Session = Depends(get_db)):
    """
    Delete specific notification record from PostgreSQL.
    """
    success = notification_service.delete_notification(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{id}' not found."
        )
    return {"success": True, "id": id}

@router.delete("/notifications", status_code=status.HTTP_200_OK)
def clear_all_notifications_endpoint(db: Session = Depends(get_db)):
    """
    Clear all notifications from PostgreSQL.
    """
    notification_service.clear_all_notifications(db)
    return {"success": True, "message": "All notifications cleared."}
