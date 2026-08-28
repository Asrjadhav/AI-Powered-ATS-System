from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
import services.application_service as application_service

router = APIRouter()

@router.get("/applications", response_model=List[ApplicationResponse])
def read_applications(
    candidateId: Optional[str] = Query(None, description="Filter applications by candidateId"),
    jobId: Optional[str] = Query(None, description="Filter applications by jobId"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all job applications with optional candidate or job filtering.
    """
    return application_service.get_applications(db, candidate_id=candidateId, job_id=jobId)

@router.get("/applications/{id}", response_model=ApplicationResponse)
def read_application(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific application by internal primary key 'id' OR human-readable 'applicationId'.
    """
    app = application_service.get_application_by_id_or_app_id(db, identifier=id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application record not found."
        )
    return app

@router.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    app_in: ApplicationCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new job application linking Candidate + Job.
    Enforces duplicate application prevention: Rejects candidate applying to the same job twice with 409 Conflict.
    """
    return application_service.create_application(db, app_in=app_in)

@router.put("/applications/{id}", response_model=ApplicationResponse)
def update_application(
    id: str,
    updates: ApplicationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update application status, notes, or ATS score.
    """
    updated = application_service.update_application(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application record not found."
        )
    return updated

@router.patch("/applications/{id}/status", response_model=ApplicationResponse)
def update_application_status(
    id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Update application pipeline status directly (e.g. from Kanban drag-and-drop).
    Resolves application by primary key UUID or human-readable applicationId (APP-0001).
    """
    new_status = payload.get("status")
    if not new_status or not str(new_status).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A non-empty 'status' field is required in request payload."
        )

    updated = application_service.update_application(
        db,
        identifier=id,
        updates=ApplicationUpdate(status=str(new_status).strip())
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application record '{id}' not found."
        )
    return updated

@router.delete("/applications/{id}", status_code=status.HTTP_200_OK)
def delete_application(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Delete an application record cleanly.
    """
    success = application_service.delete_application(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application record not found."
        )
    return {"success": True, "id": id}

@router.post("/screen-resume", status_code=status.HTTP_200_OK)
@router.post("/applications/{id}/screen", status_code=status.HTTP_200_OK)
def screen_candidate_resume(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Triggers AI resume screening for an application.
    Resolves application by primary key UUID or human-readable applicationId (e.g. APP-0006).
    """
    app_id = payload.get("applicationId") or payload.get("id")
    if not app_id or not str(app_id).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A non-empty 'applicationId' is required in request payload."
        )

    return application_service.screen_application_resume(db, application_id=str(app_id).strip())
