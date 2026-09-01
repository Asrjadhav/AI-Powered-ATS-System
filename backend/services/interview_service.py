import json
import uuid
import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from models.interview import InterviewModel
from models.candidate import CandidateModel
from models.job import JobModel
from models.application import ApplicationModel
from schemas.interview import InterviewCreate, InterviewUpdate
import services.candidate_service as candidate_service
import services.job_service as job_service
import services.application_service as application_service

def get_interview_by_id(db: Session, identifier: str) -> Optional[InterviewModel]:
    """
    Looks up an interview record by primary key 'id', candidateId, or applicationId.
    """
    if not identifier:
        return None
    raw_id = str(identifier).strip()
    c_ids = [raw_id, raw_id.replace("app-", ""), raw_id.replace("cand-", ""), raw_id.replace("int_", "")]
    return db.query(InterviewModel).filter(
        or_(
            InterviewModel.id == raw_id,
            InterviewModel.id.in_(c_ids),
            InterviewModel.applicationId.in_(c_ids),
            InterviewModel.candidateId.in_(c_ids)
        )
    ).first()

def ensure_interview_records_synced(db: Session):
    """
    Ensures every candidate or application in 'Interviewing' stage in PostgreSQL 
    has a corresponding active interview session record in the 'interviews' table.
    """
    try:
        from models.candidate import CandidateModel
        from models.application import ApplicationModel
        from models.job import JobModel

        cands_in_interview = db.query(CandidateModel).filter(
            or_(
                CandidateModel.status.ilike("%interview%"),
                CandidateModel.status == "Interviewing"
            )
        ).all()

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        today_str = datetime.date.today().isoformat()
        new_records = False

        for cand in cands_in_interview:
            c_ids = [cand.id, cand.candidateId]
            app = db.query(ApplicationModel).filter(ApplicationModel.candidateId.in_(c_ids)).first()
            a_ids = [cand.id, cand.candidateId]
            if app:
                a_ids.extend([app.id, app.applicationId])

            existing_int = db.query(InterviewModel).filter(
                or_(
                    InterviewModel.candidateId.in_(c_ids),
                    InterviewModel.applicationId.in_(a_ids)
                )
            ).first()

            if not existing_int:
                target_job_id = app.jobId if app else cand.jobId
                job = db.query(JobModel).filter(JobModel.id == target_job_id).first() if target_job_id else None
                cand_name = f"{cand.firstName or ''} {cand.lastName or ''}".strip() or "Candidate"

                new_int = InterviewModel(
                    id=f"int_{str(uuid.uuid4())[:8]}",
                    applicationId=app.id if app else None,
                    candidateId=cand.id,
                    jobId=job.id if job else (target_job_id or "JOB-0001"),
                    candidateName=cand_name,
                    candidateEmail=cand.email or "",
                    jobTitle=job.title if job else (cand.appliedRole or "Open Position"),
                    round="Technical Interview",
                    date=today_str,
                    time="14:00",
                    interviewer="Hiring Manager",
                    status="Scheduled",
                    createdAt=now,
                    updatedAt=now
                )
                db.add(new_int)
                new_records = True

        if new_records:
            db.commit()
    except Exception as sync_err:
        print("Auto-sync interview records note:", sync_err)

def get_interviews(
    db: Session,
    candidate_id: Optional[str] = None,
    job_id: Optional[str] = None,
    application_id: Optional[str] = None
) -> List[InterviewModel]:
    """
    Retrieves all interview records with optional candidate, job, or application filtering.
    """
    ensure_interview_records_synced(db)
    query = db.query(InterviewModel)

    if application_id:
        app = application_service.get_application_by_id_or_app_id(db, application_id)
        app_ids = [application_id]
        if app: app_ids.extend([app.id, app.applicationId])
        query = query.filter(InterviewModel.applicationId.in_(app_ids))

    if candidate_id:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, candidate_id)
        c_ids = [candidate_id]
        if cand: c_ids.extend([cand.id, cand.candidateId])
        query = query.filter(InterviewModel.candidateId.in_(c_ids))

    if job_id:
        job = job_service.get_job_by_id_or_job_id(db, job_id)
        j_ids = [job_id]
        if job: j_ids.extend([job.id, job.jobId])
        query = query.filter(InterviewModel.jobId.in_(j_ids))

    return query.order_by(InterviewModel.createdAt.desc().nullslast()).all()

def create_interview(db: Session, interview_in: InterviewCreate) -> InterviewModel:
    """
    Schedules a new Interview. Correctly resolves Candidate, Job, and Application foreign keys
    whether passed as internal primary keys or human-readable IDs (CAND-0001, JOB-0001, APP-0001).
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Resolve Application if provided
    app: Optional[ApplicationModel] = None
    if interview_in.applicationId:
        app = application_service.get_application_by_id_or_app_id(db, interview_in.applicationId)

    # 2. Resolve Candidate
    cand: Optional[CandidateModel] = None
    target_cand_id = interview_in.candidateId
    if not target_cand_id and app:
        target_cand_id = app.candidateId

    if target_cand_id:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, target_cand_id)
    if not cand and interview_in.candidateEmail:
        cand = candidate_service.get_candidate_by_email(db, interview_in.candidateEmail)

    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with identifier '{interview_in.candidateId or interview_in.candidateEmail}' not found."
        )

    # 3. Resolve Job
    job: Optional[JobModel] = None
    target_job_id = interview_in.jobId
    if not target_job_id and app:
        target_job_id = app.jobId

    if target_job_id:
        job = job_service.get_job_by_id_or_job_id(db, target_job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job opening with identifier '{interview_in.jobId}' not found."
        )

    # 4. If application wasn't passed directly, resolve existing application for candidate & job
    if not app and cand and job:
        app = application_service.get_application_by_candidate_and_job(db, cand.id, job.id)

    internal_id = interview_in.id or f"int_{str(uuid.uuid4())[:8]}"

    cand_name = (
        interview_in.candidateName or
        f"{cand.firstName or ''} {cand.lastName or ''}".strip() or
        "Candidate"
    )
    cand_email = interview_in.candidateEmail or cand.email or ""
    job_title = interview_in.jobTitle or job.title or "Job Position"

    data = interview_in.dict(exclude_unset=True)
    data["id"] = internal_id
    data["candidateId"] = cand.id # Store internal candidate primary key FK
    data["jobId"] = job.id # Store internal job primary key FK
    data["applicationId"] = app.id if app else None # Store internal application primary key FK if linked
    data["candidateName"] = cand_name
    data["candidateEmail"] = cand_email
    data["jobTitle"] = job_title
    data["round"] = data.get("round") or "Technical Round 1"
    data["date"] = data.get("date") or datetime.date.today().isoformat()
    data["time"] = data.get("time") or "14:00"
    data["interviewer"] = data.get("interviewer") or "Panel Evaluator"
    data["status"] = data.get("status") or "Scheduled"
    data["createdAt"] = data.get("createdAt") or now
    data["updatedAt"] = now

    db_int = InterviewModel(**data)
    db.add(db_int)
    
    # Synchronize application and candidate status to Interviewing in PostgreSQL
    if app:
        application_service.update_application(db, app.id, application_service.ApplicationUpdate(status="Interviewing"))
    if cand:
        cand.status = "Interviewing"
        cand.updatedAt = now

    db.commit()
    db.refresh(db_int)
    return db_int

def update_interview(db: Session, identifier: str, updates: InterviewUpdate) -> Optional[InterviewModel]:
    """
    Updates interview details (date, time, round, interviewer, status, meeting link).
    """
    db_int = get_interview_by_id(db, identifier)
    if not db_int:
        return None

    update_data = updates.dict(exclude_unset=True)
    update_data.pop("id", None)
    update_data.pop("candidateId", None)
    update_data.pop("jobId", None)
    update_data.pop("applicationId", None)
    update_data.pop("createdAt", None)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data["updatedAt"] = now

    for key, val in update_data.items():
        setattr(db_int, key, val)

    db.commit()
    db.refresh(db_int)
    return db_int

def cancel_interview(db: Session, identifier: str) -> Optional[InterviewModel]:
    """
    Cancels an interview session and reverts candidate/application status if no active interviews remain.
    """
    db_int = get_interview_by_id(db, identifier)
    if not db_int:
        return None

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db_int.status = "Cancelled"
    db_int.updatedAt = now

    # If no other active interviews remain, revert status
    if db_int.applicationId:
        application_service.update_application(db, db_int.applicationId, application_service.ApplicationUpdate(status="Shortlisted"))
    elif db_int.candidateId:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, db_int.candidateId)
        if cand:
            cand.status = "Shortlisted"
            cand.updatedAt = now

    db.commit()
    db.refresh(db_int)
    return db_int

def submit_feedback(db: Session, identifier: str, feedback_payload: Dict[str, Any]) -> Optional[InterviewModel]:
    """
    Submits evaluation feedback, technical score, and completes interview.
    """
    db_int = get_interview_by_id(db, identifier)
    if not db_int:
        return None

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    comments = feedback_payload.get("comments") or feedback_payload.get("feedback") or ""
    tech_score = feedback_payload.get("technicalScore") or feedback_payload.get("techScore")
    comm_score = feedback_payload.get("communicationScore") or feedback_payload.get("commScore")
    recommendation = feedback_payload.get("recommendation") or "Hire"

    feedback_dict = {
        "technicalScore": float(tech_score) if tech_score is not None else 8.0,
        "communicationScore": float(comm_score) if comm_score is not None else 8.0,
        "problemSolvingScore": float(feedback_payload.get("problemSolvingScore", 8.0)),
        "comments": comments,
        "recommendation": recommendation
    }

    db_int.feedback = json.dumps(feedback_dict)
    db_int.technicalScore = float(tech_score) if tech_score is not None else None
    db_int.communicationScore = float(comm_score) if comm_score is not None else None
    db_int.status = "Completed"
    db_int.updatedAt = now

    if recommendation.lower() == "reject":
        if db_int.applicationId:
            application_service.update_application(db, db_int.applicationId, application_service.ApplicationUpdate(status="Rejected"))
        elif db_int.candidateId:
            cand = candidate_service.get_candidate_by_id_or_candidate_id(db, db_int.candidateId)
            if cand:
                cand.status = "Rejected"
                cand.updatedAt = now

    db.commit()
    db.refresh(db_int)
    return db_int

def delete_interview(db: Session, identifier: str) -> bool:
    """
    Deletes an interview record cleanly by interview id, candidateId, or applicationId.
    If candidate has no remaining active interviews, reverts candidate & application status in PostgreSQL.
    """
    if not identifier:
        return False

    raw_id = str(identifier).strip()
    c_ids = [raw_id, raw_id.replace("app-", ""), raw_id.replace("cand-", ""), raw_id.replace("int_", "")]

    matches = db.query(InterviewModel).filter(
        or_(
            InterviewModel.id == raw_id,
            func.lower(InterviewModel.id).in_([v.lower() for v in c_ids]),
            func.lower(InterviewModel.applicationId).in_([v.lower() for v in c_ids]),
            func.lower(InterviewModel.candidateId).in_([v.lower() for v in c_ids])
        )
    ).all()

    if not matches:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, raw_id)
        if cand:
            matches = db.query(InterviewModel).filter(
                or_(
                    InterviewModel.candidateId.in_([cand.id, cand.candidateId]),
                    InterviewModel.applicationId.in_([cand.id, cand.candidateId, f"app-{cand.id}", f"app-{cand.candidateId}"])
                )
            ).all()

    if not matches:
        return False

    app_id = matches[0].applicationId
    cand_id = matches[0].candidateId

    for item in matches:
        db.delete(item)

    db.commit()

    # Direct query remaining count without triggering get_interviews auto-creation side effects
    remaining_count = db.query(InterviewModel).filter(
        or_(
            InterviewModel.candidateId == cand_id,
            InterviewModel.applicationId == app_id
        )
    ).count()

    if remaining_count == 0:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if app_id:
            application_service.update_application(db, app_id, application_service.ApplicationUpdate(status="Shortlisted"))
        if cand_id:
            cand = candidate_service.get_candidate_by_id_or_candidate_id(db, cand_id)
            if cand:
                cand.status = "Shortlisted"
                cand.updatedAt = now
                db.commit()

    return True
