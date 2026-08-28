import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status

from models.offer import OfferModel
from models.candidate import CandidateModel
from models.job import JobModel
from models.application import ApplicationModel
from schemas.offer import OfferCreate, OfferUpdate
from services import candidate_service, job_service, application_service

def format_offer_response(off: OfferModel, db: Session) -> dict:
    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, off.candidateId)
    job = job_service.get_job_by_id_or_job_id(db, off.jobId) if off.jobId else None
    app = application_service.get_application_by_id_or_app_id(db, off.applicationId) if off.applicationId else None

    cand_name = off.candidateName or (f"{cand.firstName or ''} {cand.lastName or ''}".strip() if cand else "Candidate")
    cand_email = off.candidateEmail or (cand.email if cand else "")
    job_title = off.jobTitle or (job.title if job else "Position")
    dept = off.department or (job.department if job else "Engineering")

    ctc_val = off.offeredCTC or (cand.expectedCTC if cand else 1500000)
    formatted_salary = f"₹{ctc_val:,.0f} / year" if isinstance(ctc_val, (int, float)) and ctc_val > 0 else (str(ctc_val) if ctc_val else "₹15,00,000 / year")

    return {
        "id": off.id,
        "candidateId": cand.candidateId if cand else off.candidateId,
        "jobId": job.jobId if job else off.jobId,
        "applicationId": app.applicationId if app else off.applicationId,
        "candidateName": cand_name,
        "candidateEmail": cand_email,
        "candidatePhone": cand.phone if cand else "",
        "jobTitle": job_title,
        "department": dept,
        "recruiter": "Hiring Manager",
        "aiMatchScore": cand.aiScore if cand and cand.aiScore else 88,
        "salary": formatted_salary,
        "offeredSalary": formatted_salary,
        "offeredSalaryNum": ctc_val,
        "offeredCTC": ctc_val,
        "bonus": "10% Performance Bonus",
        "benefits": "Full Medical Insurance, Provident Fund",
        "reportingManager": "Engineering Manager",
        "employmentType": "Full-time",
        "workLocation": cand.location if cand else "Pune, MH",
        "noticePeriod": cand.noticePeriod if cand else "30 Days",
        "joiningDate": off.joiningDate or (datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
        "offerDate": off.createdAt.split("T")[0] if off.createdAt else datetime.date.today().isoformat(),
        "expiryDate": (datetime.date.today() + datetime.timedelta(days=14)).isoformat(),
        "experienceLevel": "Mid-level",
        "location": cand.location if cand else "Pune",
        "status": off.status or "Draft",
        "workflowStage": off.workflowStage or ("Joining Process" if off.status == "Accepted" else "Offer Generation"),
        "contractTemplate": off.contractTemplate or "Standard Employment Agreement",
        "customTerms": off.customTerms or "",
        "timeline": {
            "generated": off.createdAt.split("T")[0] if off.createdAt else datetime.date.today().isoformat(),
            "sent": off.createdAt.split("T")[0] if off.status in ["Pending", "Accepted", "Joined"] else None,
            "viewed": off.createdAt.split("T")[0] if off.status in ["Accepted", "Joined"] else None,
            "responded": off.updatedAt.split("T")[0] if off.status in ["Accepted", "Rejected", "Joined"] else None,
            "joined": off.updatedAt.split("T")[0] if off.status == "Joined" else None
        },
        "createdAt": off.createdAt,
        "updatedAt": off.updatedAt
    }

def list_offers(db: Session) -> List[dict]:
    offers = db.query(OfferModel).all()
    return [format_offer_response(off, db) for off in offers]

def get_offer_by_id(db: Session, identifier: str) -> Optional[OfferModel]:
    if not identifier:
        return None
    raw_id = str(identifier).strip()
    return db.query(OfferModel).filter(
        or_(
            OfferModel.id == raw_id,
            func.lower(OfferModel.id) == raw_id.lower()
        )
    ).first()

def create_offer(db: Session, payload: OfferCreate) -> dict:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Resolve Candidate
    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, payload.candidateId)
    if not cand and payload.candidateEmail:
        cand = db.query(CandidateModel).filter(func.lower(CandidateModel.email) == payload.candidateEmail.strip().lower()).first()

    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate '{payload.candidateId}' not found. Cannot create offer without a valid candidate."
        )

    # 2. Resolve Job
    job = None
    if payload.jobId:
        job = job_service.get_job_by_id_or_job_id(db, payload.jobId)
    if not job and cand.jobId:
        job = job_service.get_job_by_id_or_job_id(db, cand.jobId)

    # 3. Resolve Application
    app = None
    if payload.applicationId:
        app = application_service.get_application_by_id_or_app_id(db, payload.applicationId)
    if not app:
        c_ids = [cand.id, cand.candidateId]
        app = db.query(ApplicationModel).filter(ApplicationModel.candidateId.in_(c_ids)).first()

    cand_name = payload.candidateName or f"{cand.firstName or ''} {cand.lastName or ''}".strip()
    cand_email = payload.candidateEmail or cand.email
    job_title = payload.jobTitle or (job.title if job else "Open Position")
    dept = payload.department or (job.department if job else "Engineering")

    offer_id = payload.id if payload.id else f"OFF-2026-{str(uuid.uuid4())[:6].upper()}"

    # Check duplicate offer ID
    existing = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if existing:
        offer_id = f"OFF-2026-{str(uuid.uuid4())[:6].upper()}"

    new_offer = OfferModel(
        id=offer_id,
        candidateId=cand.id,
        jobId=job.id if job else (cand.jobId or "JOB-0001"),
        applicationId=app.id if app else None,
        candidateName=cand_name,
        candidateEmail=cand_email,
        jobTitle=job_title,
        department=dept,
        offeredCTC=payload.offeredCTC or (cand.expectedCTC if cand else 1500000.0),
        joiningDate=payload.joiningDate or (datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
        status=payload.status or "Draft",
        workflowStage=payload.workflowStage or "Offer Generation",
        contractTemplate=payload.contractTemplate or "Standard Employment Agreement",
        customTerms=payload.customTerms or "",
        createdAt=now,
        updatedAt=now
    )

    db.add(new_offer)

    # If offer is created directly as Accepted or Joined, sync application & candidate status in PostgreSQL
    new_status_str = str(payload.status or "").strip().lower()
    if new_status_str in ["accepted", "joined", "hired"]:
        target_stage = "Hired" if new_status_str in ["joined", "hired"] else "Offered"
        cand.status = target_stage
        if app:
            app.status = target_stage

    db.commit()
    db.refresh(new_offer)

    return format_offer_response(new_offer, db)

def update_offer(db: Session, identifier: str, updates: OfferUpdate) -> Optional[dict]:
    off = get_offer_by_id(db, identifier)
    if not off:
        return None

    update_data = updates.dict(exclude_unset=True)
    update_data.pop("id", None)
    update_data.pop("candidateId", None)
    update_data.pop("jobId", None)
    update_data.pop("applicationId", None)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data["updatedAt"] = now

    for key, val in update_data.items():
        setattr(off, key, val)

    # Sync Application/Candidate status if offer status updated to Accepted or Joined
    if updates.status:
        st_lower = str(updates.status).strip().lower()
        if st_lower in ["accepted", "joined", "hired"]:
            target_stage = "Hired" if st_lower in ["joined", "hired"] else "Offered"
            cand = candidate_service.get_candidate_by_id_or_candidate_id(db, off.candidateId)
            if cand:
                cand.status = target_stage
            if off.applicationId:
                app = application_service.get_application_by_id_or_app_id(db, off.applicationId)
                if app:
                    app.status = target_stage

    db.commit()
    db.refresh(off)
    return format_offer_response(off, db)

def update_offer_status(db: Session, identifier: str, status_str: str, workflow_stage: Optional[str] = None) -> Optional[dict]:
    off = get_offer_by_id(db, identifier)
    if not off:
        return None

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    off.status = status_str
    if workflow_stage:
        off.workflowStage = workflow_stage
    off.updatedAt = now

    st_lower = str(status_str).strip().lower()
    if st_lower in ["accepted", "joined", "hired"]:
        target_stage = "Hired" if st_lower in ["joined", "hired"] else "Offered"
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, off.candidateId)
        if cand:
            cand.status = target_stage
        if off.applicationId:
            app = application_service.get_application_by_id_or_app_id(db, off.applicationId)
            if app:
                app.status = target_stage

    db.commit()
    db.refresh(off)
    return format_offer_response(off, db)

def delete_offer(db: Session, identifier: str) -> bool:
    off = get_offer_by_id(db, identifier)
    if not off:
        return False

    db.delete(off)
    db.commit()
    return True
