"""
Report schedule configuration.

Stores what report a recruiter wants sent, how often, in what format, to
whom. This replaces two disconnected browser-local copies of the same idea —
one keyed "report_schedules", one keyed "ats_report_schedules" — that never
saw each other's data.

Scope note: this only persists the schedule. Nothing reads these rows and
sends a report on the given cadence yet; that needs a scheduler (e.g.
APScheduler or a cron worker) and is out of scope here. lastSent stays
whatever it was last set to — "Never" for a schedule nothing has acted on.
"""

import uuid
import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from models.report_schedule import ReportScheduleModel
from schemas.report_schedule import ReportScheduleCreate, ReportScheduleUpdate


def get_schedules(db: Session) -> List[ReportScheduleModel]:
    return db.query(ReportScheduleModel).order_by(ReportScheduleModel.createdAt.desc()).all()


def get_schedule_by_id(db: Session, schedule_id: str) -> Optional[ReportScheduleModel]:
    return db.query(ReportScheduleModel).filter(ReportScheduleModel.id == schedule_id).first()


def create_schedule(
    db: Session, schedule_in: ReportScheduleCreate, created_by: Optional[str] = None
) -> ReportScheduleModel:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db_schedule = ReportScheduleModel(
        id=schedule_in.id or f"rep-sch-{uuid.uuid4().hex[:8]}",
        frequency=schedule_in.frequency or "Weekly",
        format=schedule_in.format or "PDF",
        emails=schedule_in.emails or "",
        department=schedule_in.department or "All Departments",
        status=schedule_in.status or "Active",
        lastSent=schedule_in.lastSent or "Never",
        createdAt=now,
        updatedAt=now,
        createdBy=created_by or schedule_in.createdBy,
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def update_schedule(
    db: Session, schedule_id: str, updates: ReportScheduleUpdate
) -> Optional[ReportScheduleModel]:
    db_schedule = get_schedule_by_id(db, schedule_id)
    if not db_schedule:
        return None

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(db_schedule, field, value)

    db_schedule.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


def delete_schedule(db: Session, schedule_id: str) -> bool:
    db_schedule = get_schedule_by_id(db, schedule_id)
    if not db_schedule:
        return False
    db.delete(db_schedule)
    db.commit()
    return True
