import re
import uuid
import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError

from models.job import JobModel
from models.candidate import CandidateModel
from schemas.job import JobCreate, JobUpdate, JobResponse
import services.job_lifecycle_service as job_lifecycle_service

import logging

logger = logging.getLogger(__name__)

def clean_job_title(title: Optional[str]) -> str:
    if not title:
        return "Position"
    raw = str(title).strip()
    cleaned = re.sub(r'^(?:job\s*title|job\s*opening|job\s*position|job|role\s*title|role|position|vacancy)\s*:\s*', '', raw, flags=re.IGNORECASE).strip()
    return cleaned or "Position"

def generate_next_job_id(db: Session) -> str:
    """
    Scans existing jobId strings in format JOB-XXXX, extracts integer suffixes,
    and returns next zero-padded formatted string JOB-0001, JOB-0002, etc.
    """
    job_ids = db.query(JobModel.jobId).all()
    max_num = 0
    pattern = re.compile(r"^JOB-(\d+)$", re.IGNORECASE)
    for (jid,) in job_ids:
        if jid:
            match = pattern.match(str(jid).strip())
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
    next_num = max_num + 1
    return f"JOB-{next_num:04d}"

def compute_candidate_count(db: Session, job: JobModel) -> int:
    """
    Number of different candidates who applied to this job: the candidates with an application for
    it in the applications table. That is the same data the Applications page lists, so the "N applied"
    figure always matches what clicking it shows.
    """
    from models.application import ApplicationModel

    job_keys = [key for key in (job.id, job.jobId) if key]
    return db.query(func.count(func.distinct(ApplicationModel.candidateId))).filter(
        ApplicationModel.jobId.in_(job_keys)
    ).scalar() or 0

def build_job_response(db: Session, job: JobModel) -> JobResponse:
    """
    Transforms JobModel into JobResponse, computing candidateCount
    and normalizing status ("published" -> "active").
    """
    job_dict = {c.name: getattr(job, c.name) for c in job.__table__.columns}
    
    # Normalize status for frontend compatibility
    raw_status = job_dict.get("status")
    if raw_status == "published":
        job_dict["status"] = "active"
        
    job_dict["candidateCount"] = compute_candidate_count(db, job)
    return JobResponse(**job_dict)

def list_positions(db: Session) -> List[dict]:
    """
    The distinct positions (job titles) that exist in the jobs table, for the Applications page's
    "Job Position / Role" filter. Titles that differ only in case or spacing are one position; each
    position lists the ids of every job opening that has it. Sorted by title.
    """
    positions: dict = {}
    rows = db.query(JobModel.id, JobModel.jobId, JobModel.title).all()
    for row_id, job_id, title in rows:
        label = re.sub(r"\s+", " ", str(title or "")).strip()
        if not label:
            continue
        entry = positions.setdefault(label.lower(), {"title": label, "jobIds": []})
        entry["jobIds"].extend(key for key in (row_id, job_id) if key and key not in entry["jobIds"])
    return sorted(positions.values(), key=lambda p: p["title"].lower())

def get_jobs(db: Session, status_filter: Optional[str] = None, search: Optional[str] = None) -> List[JobResponse]:
    """
    Retrieves all jobs, applying optional status and search filtering.
    """
    query = db.query(JobModel)
    if status_filter:
        if status_filter.lower() == "active":
            query = query.filter(or_(JobModel.status == "active", JobModel.status == "published"))
        else:
            query = query.filter(JobModel.status == status_filter)
            
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                JobModel.title.ilike(search_pattern),
                JobModel.department.ilike(search_pattern),
                JobModel.location.ilike(search_pattern),
                JobModel.jobId.ilike(search_pattern)
            )
        )
        
    jobs = query.order_by(JobModel.createdAt.desc().nullslast()).all()
    return [build_job_response(db, j) for j in jobs]

def get_job_by_id_or_job_id(db: Session, identifier: str) -> Optional[JobModel]:
    """
    Looks up a job record by internal primary key 'id' OR human-readable 'jobId'.
    Handles JOB-0004, job-0004, JOB-4, and UUID formats cleanly.
    """
    if not identifier:
        return None
    raw = str(identifier).strip()
    import re
    m = re.match(r'^(?:j|job|job-)?0*([1-9]\d*)$', raw, re.IGNORECASE)
    normalized_job_id = f"JOB-{int(m.group(1)):04d}" if m else raw

    return db.query(JobModel).filter(
        or_(
            JobModel.id == raw,
            JobModel.jobId == raw,
            func.lower(JobModel.id) == raw.lower(),
            func.lower(JobModel.jobId) == raw.lower(),
            JobModel.id == normalized_job_id,
            JobModel.jobId == normalized_job_id
        )
    ).first()

def get_job_response(db: Session, identifier: str) -> Optional[JobResponse]:
    job = get_job_by_id_or_job_id(db, identifier)
    if not job:
        return None
    return build_job_response(db, job)

def create_job(db: Session, job_in: JobCreate) -> JobResponse:
    """
    Creates a new job posting with concurrency-safe Job ID generation and retry handling.
    If a UNIQUE constraint conflict on jobId occurs under concurrent calls, retries with fresh ID.
    """
    max_retries = 5
    for attempt in range(max_retries):
        try:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # Determine human-readable jobId if not explicitly supplied
            assigned_job_id = job_in.jobId or generate_next_job_id(db)
            
            # Internal primary key id (defaults to assigned_job_id or uuid)
            internal_id = job_in.id or assigned_job_id or str(uuid.uuid4())
            
            job_data = job_in.dict(exclude_unset=True)
            job_data["id"] = internal_id
            job_data["jobId"] = assigned_job_id
            job_data["title"] = clean_job_title(job_data.get("title"))
            job_data["status"] = job_in.status or "active"
            job_data["createdAt"] = job_data.get("createdAt") or now
            job_data["updatedAt"] = now
            
            db_job = JobModel(**job_data)
            db.add(db_job)
            db.commit()
            db.refresh(db_job)
            logger.info("Job created: id=%s jobId=%s title=%r status=%s", db_job.id, db_job.jobId, db_job.title, db_job.status)
            return build_job_response(db, db_job)
        except IntegrityError as err:
            db.rollback()
            logger.warning("Job create: integrity error on attempt %d/%d: %s", attempt + 1, max_retries, err)
            # If conflict occurred on auto-generated jobId, retry up to max_retries
            if attempt < max_retries - 1 and not job_in.jobId:
                continue
            raise err

    raise RuntimeError("Failed to generate a unique Job ID after multiple retries.")

def update_job(db: Session, identifier: str, updates: JobUpdate) -> Optional[JobResponse]:
    """
    Updates an existing job by id or jobId while preserving id, jobId, and createdAt.
    """
    db_job = get_job_by_id_or_job_id(db, identifier)
    if not db_job:
        return None
        
    update_data = updates.dict(exclude_unset=True)
    # Exclude immutable primary identifiers and creation timestamp
    update_data.pop("id", None)
    update_data.pop("jobId", None)
    update_data.pop("createdAt", None)
    
    if "title" in update_data:
        update_data["title"] = clean_job_title(update_data["title"])

    update_data["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    old_status = db_job.status
    try:
        for key, val in update_data.items():
            setattr(db_job, key, val)
        # The edit form can change the status too: same application/Talent Pool rules as PATCH /status.
        if "status" in update_data:
            _apply_status_transition(db, db_job, old_status, db_job.status)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(db_job)
    logger.info("Job %s updated: fields=%s", db_job.id, sorted(k for k in update_data if k != "updatedAt"))
    return build_job_response(db, db_job)

def _apply_status_transition(db: Session, db_job: JobModel, old_status: Optional[str], new_status: Optional[str]) -> None:
    """Open -> not open puts the job's applications on hold; not open -> Open reopens them. No commit."""
    was_open = job_lifecycle_service.is_open_status(old_status)
    now_open = job_lifecycle_service.is_open_status(new_status)
    logger.info("Job %s status %r -> %r", db_job.id, old_status, new_status)
    if was_open and not now_open:
        job_lifecycle_service.hold_job_applications(db, db_job)
    elif now_open and not was_open:
        job_lifecycle_service.reopen_job_applications(db, db_job)

def update_job_status(db: Session, identifier: str, new_status: str) -> Optional[JobResponse]:
    """
    Updates the status field of a job record. Leaving Open puts its applications On Hold and
    moves their candidates to the Talent Pool; becoming Open again reverses that.
    """
    db_job = get_job_by_id_or_job_id(db, identifier)
    if not db_job:
        return None

    old_status = db_job.status
    try:
        db_job.status = new_status
        db_job.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
        _apply_status_transition(db, db_job, old_status, new_status)
        db.commit()
    except Exception:
        db.rollback()
        logger.error("Job %s status change to %r failed and was rolled back", db_job.id, new_status, exc_info=True)
        raise
    db.refresh(db_job)
    return build_job_response(db, db_job)

def delete_job(db: Session, identifier: str) -> bool:
    """
    Deletes a job. Its candidates are added to the Talent Pool first, then its applications
    are deleted. Candidates (and their resumes), interviews and offers are kept; they just
    lose the link to the deleted job (jobId -> NULL). All in one transaction.
    """
    db_job = get_job_by_id_or_job_id(db, identifier)
    if not db_job:
        logger.warning("Job delete: %r not found", identifier)
        return False

    logger.warning("Job delete requested: %s (%s, title %r). Candidates go to the Talent Pool, applications are deleted",
                   db_job.id, db_job.jobId, db_job.title)
    j_ids = list(set([identifier, db_job.id, db_job.jobId]))

    from models.candidate import CandidateModel
    from models.interview import InterviewModel
    from models.offer import OfferModel

    try:
        # Talent Pool first, then the applications (see job_lifecycle_service.remove_job_applications).
        job_lifecycle_service.remove_job_applications(db, db_job)

        # Nullify jobId in linked candidates, interviews, and offers to prevent foreign key errors
        n_candidates = db.query(CandidateModel).filter(CandidateModel.jobId.in_(j_ids)).update({CandidateModel.jobId: None}, synchronize_session=False)
        n_interviews = db.query(InterviewModel).filter(InterviewModel.jobId.in_(j_ids)).update({InterviewModel.jobId: None}, synchronize_session=False)
        n_offers = db.query(OfferModel).filter(OfferModel.jobId.in_(j_ids)).update({OfferModel.jobId: None}, synchronize_session=False)

        db.delete(db_job)
        db.commit()
    except Exception:
        db.rollback()
        logger.error("Job %s delete failed and was rolled back; nothing was changed", db_job.id, exc_info=True)
        raise
    logger.warning("Job %s deleted. Rows that lost their job: %d candidate(s), %d interview(s), %d offer(s)",
                   db_job.id, n_candidates, n_interviews, n_offers)
    return True
