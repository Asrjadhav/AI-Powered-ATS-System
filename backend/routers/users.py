from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.user import UserCreate, UserResponse, UserUpdate
import services.user_service as user_service

router = APIRouter(tags=["Users"])


@router.get("/users", response_model=List[UserResponse])
def list_users(
    department: Optional[str] = Query(
        None, description="Restrict to one department. Omit for everyone."
    ),
    db: Session = Depends(get_db),
):
    """List team members (recruiters, HR, admins)."""
    return user_service.get_users(db, department=department)


@router.get("/users/{id}", response_model=UserResponse)
def get_user(id: str, db: Session = Depends(get_db)):
    db_user = user_service.get_user_by_id(db, id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{id}' not found."
        )
    return db_user


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Adds a team member. Returns 409 if the email is already in use.

    No password is set here — the user's first successful /api/auth/login
    with this email sets their password from what they enter.
    """
    return user_service.create_user(db, payload)


@router.patch("/users/{id}", response_model=UserResponse)
def update_user(id: str, updates: UserUpdate, db: Session = Depends(get_db)):
    updated = user_service.update_user(db, id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{id}' not found."
        )
    return updated


@router.delete("/users/{id}", status_code=status.HTTP_200_OK)
def delete_user(id: str, db: Session = Depends(get_db)):
    success = user_service.delete_user(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{id}' not found."
        )
    return {"success": True, "id": id}
