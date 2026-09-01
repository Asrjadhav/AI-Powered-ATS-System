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
    Counts candidates associated with a job by matching candidate.jobId
    or candidate.currentRole.
    """
    count = db.query(CandidateModel).filter(
        or_(
            CandidateModel.jobId == job.id,
            CandidateModel.jobId == job.jobId,
            func.lower(CandidateModel.currentRole) == func.lower(job.title)
        )
    ).count()
    return count

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
            job_data["status"] = job_in.status or "active"
            job_data["createdAt"] = job_data.get("createdAt") or now
            job_data["updatedAt"] = now
            
            db_job = JobModel(**job_data)
            db.add(db_job)
            db.commit()
            db.refresh(db_job)
            return build_job_response(db, db_job)
        except IntegrityError as err:
            db.rollback()
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
    
    update_data["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    for key, val in update_data.items():
        setattr(db_job, key, val)
        
    db.commit()
    db.refresh(db_job)
    return build_job_response(db, db_job)

def update_job_status(db: Session, identifier: str, new_status: str) -> Optional[JobResponse]:
    """
    Updates the status field of a job record.
    """
    db_job = get_job_by_id_or_job_id(db, identifier)
    if not db_job:
        return None
        
    db_job.status = new_status
    db_job.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    db.commit()
    db.refresh(db_job)
    return build_job_response(db, db_job)

def delete_job(db: Session, identifier: str) -> bool:
    """
    Deletes a job row safely without cascade deleting related candidate/application history.
    Safely disassociates jobId in linked candidates, applications, interviews, and offers to avoid foreign key violations.
    """
    db_job = get_job_by_id_or_job_id(db, identifier)
    if not db_job:
        return False

    j_ids = list(set([identifier, db_job.id, db_job.jobId]))

    from models.candidate import CandidateModel
    from models.application import ApplicationModel
    from models.interview import InterviewModel
    from models.offer import OfferModel

    # Safely nullify jobId in linked candidates, applications, interviews, and offers to prevent foreign key errors
    db.query(CandidateModel).filter(CandidateModel.jobId.in_(j_ids)).update({CandidateModel.jobId: None}, synchronize_session=False)
    db.query(ApplicationModel).filter(ApplicationModel.jobId.in_(j_ids)).update({ApplicationModel.jobId: None}, synchronize_session=False)
    db.query(InterviewModel).filter(InterviewModel.jobId.in_(j_ids)).update({InterviewModel.jobId: None}, synchronize_session=False)
    db.query(OfferModel).filter(OfferModel.jobId.in_(j_ids)).update({OfferModel.jobId: None}, synchronize_session=False)

    db.delete(db_job)
    db.commit()
    return True
