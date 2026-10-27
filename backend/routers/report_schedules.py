from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.report_schedule import (
    ReportScheduleCreate,
    ReportScheduleResponse,
    ReportScheduleUpdate,
)
import services.report_schedule_service as report_schedule_service

router = APIRouter(tags=["Report Schedules"])


@router.get("/report-schedules", response_model=List[ReportScheduleResponse])
def list_report_schedules(db: Session = Depends(get_db)):
    """List every configured report schedule."""
    return report_schedule_service.get_schedules(db)


@router.post(
    "/report-schedules",
    response_model=ReportScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_report_schedule(payload: ReportScheduleCreate, db: Session = Depends(get_db)):
    """
    Saves a report schedule.

    Only the schedule is stored. Nothing sends a report on this cadence yet —
    that requires a scheduler, which is separate future work.
    """
    return report_schedule_service.create_schedule(db, payload)


@router.put("/report-schedules/{id}", response_model=ReportScheduleResponse)
def update_report_schedule(
    id: str, updates: ReportScheduleUpdate, db: Session = Depends(get_db)
):
    updated = report_schedule_service.update_schedule(db, id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report schedule '{id}' not found.",
        )
    return updated


@router.delete("/report-schedules/{id}", status_code=status.HTTP_200_OK)
def delete_report_schedule(id: str, db: Session = Depends(get_db)):
    success = report_schedule_service.delete_schedule(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report schedule '{id}' not found.",
        )
    return {"success": True, "id": id}
