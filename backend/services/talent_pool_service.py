import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status

from models.talent_pool import TalentPoolModel
from models.candidate import CandidateModel
from schemas.talent_pool import TalentPoolCreate, TalentPoolUpdate, TalentPoolResponse
from services import candidate_service

def format_tp_response(tp: TalentPoolModel, cand: Optional[CandidateModel]) -> dict:
    cand_name = f"{cand.firstName or ''} {cand.lastName or ''}".strip() if cand else "Candidate"
    return {
        "id": tp.id,
        "candidateId": cand.candidateId if cand else tp.candidateId,
        "name": cand_name or "Candidate",
        "email": cand.email if cand else "",
        "phone": cand.phone if cand else "",
        "currentRole": tp.currentRole or (cand.currentRole if cand else "Applicant"),
        "currentCompany": tp.currentCompany or (cand.currentCompany if cand else "Not specified"),
        "skills": tp.skills or (cand.skills if cand and isinstance(cand.skills, list) else []),
        "experienceYears": tp.experienceYears if tp.experienceYears is not None else (cand.experienceYears or 0.0),
        "location": tp.location or (cand.location if cand else "Remote"),
        "aiMatchScore": tp.aiMatchScore if tp.aiMatchScore is not None else 80.0,
        "availability": tp.availability or "Immediate",
        "noticePeriod": tp.noticePeriod or "Immediate",
        "status": tp.status or "Available",
        "department": tp.department or "Engineering",
        "education": tp.education or {
            "degree": cand.highestEducation or "Graduation",
            "specialization": cand.specialization or "General",
            "passingYear": cand.yearOfPassing or "2023",
            "university": "University"
        } if cand else {"degree": "Graduation", "specialization": "General", "passingYear": "2023", "university": "University"},
        "tags": tp.tags or ["Talent Pool"],
        "aiSummary": tp.aiSummary or "Vetted talent pool candidate profile.",
        "certifications": tp.certifications or [],
        "projects": tp.projects or [],
        "recruitmentHistory": tp.recruitmentHistory or {
            "appliedJob": cand.appliedRole if hasattr(cand, 'appliedRole') else "General Pool",
            "previousStage": cand.status if cand else "Applied",
            "interviewFeedback": "Profile active.",
            "notSelectedReason": "None",
            "recruiterNotes": tp.recruiterNotes or "Candidate in talent pool."
        },
        "recruiterNotes": tp.recruiterNotes or "",
        "createdAt": tp.createdAt,
        "updatedAt": tp.updatedAt
    }

def list_talent_pool(db: Session) -> List[dict]:
    records = db.query(TalentPoolModel).all()
    results = []
    for tp in records:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, tp.candidateId)
        results.append(format_tp_response(tp, cand))
    return results

def get_talent_pool_by_id(db: Session, identifier: str) -> Optional[TalentPoolModel]:
    if not identifier:
        return None
    raw_id = str(identifier).strip()

    # Try matching talent_pool.id directly
    tp = db.query(TalentPoolModel).filter(
        or_(
            TalentPoolModel.id == raw_id,
            func.lower(TalentPoolModel.id) == raw_id.lower()
        )
    ).first()
    if tp:
        return tp

    # Try resolving candidate first
    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, raw_id)
    if cand:
        c_ids = [cand.id, cand.candidateId]
        return db.query(TalentPoolModel).filter(TalentPoolModel.candidateId.in_(c_ids)).first()

    return None

def add_candidate_to_talent_pool(db: Session, payload: TalentPoolCreate) -> dict:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cand = None

    # 1. Resolve candidate by candidateId or email
    if payload.candidateId:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, payload.candidateId)
    
    if not cand and payload.email:
        clean_email = payload.email.strip().lower()
        cand = db.query(CandidateModel).filter(func.lower(CandidateModel.email) == clean_email).first()

    # 2. If candidate doesn't exist, create candidate profile in candidates table
    if not cand:
        first_name = payload.firstName or (payload.name.split(" ")[0] if payload.name else "Candidate")
        last_name = payload.lastName or (" ".join(payload.name.split(" ")[1:]) if payload.name and len(payload.name.split(" ")) > 1 else "")
        email = payload.email or f"talent_{str(uuid.uuid4())[:8]}@example.com"
        
        cand = candidate_service.create_candidate(
            db,
            candidate_in=candidate_service.CandidateCreate(
                firstName=first_name,
                lastName=last_name,
                email=email,
                phone=payload.phone or "+91 9999999999",
                currentRole=payload.currentRole,
                currentCompany=payload.currentCompany,
                skills=payload.skills,
                experienceYears=payload.experienceYears,
                location=payload.location
            )
        )

    # 3. Check for DUPLICATE addition (Prevent adding same candidate twice)
    c_ids = [cand.id, cand.candidateId]
    existing = db.query(TalentPoolModel).filter(TalentPoolModel.candidateId.in_(c_ids)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Candidate '{cand.firstName} {cand.lastName}' ({cand.candidateId}) is already in the Talent Pool."
        )

    # 4. Insert TalentPoolModel row
    tp_id = f"tp_{str(uuid.uuid4())[:8]}"
    new_tp = TalentPoolModel(
        id=tp_id,
        candidateId=cand.id,
        currentRole=payload.currentRole or cand.currentRole,
        currentCompany=payload.currentCompany or cand.currentCompany,
        skills=payload.skills or cand.skills,
        experienceYears=payload.experienceYears if payload.experienceYears is not None else cand.experienceYears,
        location=payload.location or cand.location,
        aiMatchScore=payload.aiMatchScore or 80.0,
        availability=payload.availability or "Immediate",
        noticePeriod=payload.noticePeriod or "Immediate",
        status=payload.status or "Available",
        department=payload.department or "Engineering",
        education=payload.education,
        tags=payload.tags or ["Talent Pool"],
        aiSummary=payload.aiSummary or "Vetted talent pool candidate profile.",
        certifications=payload.certifications or [],
        projects=payload.projects or [],
        recruitmentHistory=payload.recruitmentHistory,
        recruiterNotes=payload.recruiterNotes or "",
        createdAt=now,
        updatedAt=now
    )
    db.add(new_tp)
    db.commit()
    db.refresh(new_tp)

    return format_tp_response(new_tp, cand)

def update_talent_pool(db: Session, identifier: str, updates: TalentPoolUpdate) -> Optional[dict]:
    tp = get_talent_pool_by_id(db, identifier)
    if not tp:
        return None

    update_data = updates.dict(exclude_unset=True)
    update_data.pop("id", None)
    update_data.pop("candidateId", None)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data["updatedAt"] = now

    for key, val in update_data.items():
        setattr(tp, key, val)

    db.commit()
    db.refresh(tp)

    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, tp.candidateId)
    return format_tp_response(tp, cand)

def remove_from_talent_pool(db: Session, identifier: str) -> bool:
    """
    Removes talent pool record cleanly from talent_pool table in PostgreSQL.
    CRITICAL: Preserves CandidateModel record in candidates table intact.
    """
    tp = get_talent_pool_by_id(db, identifier)
    if not tp:
        return False

    db.delete(tp)
    db.commit()
    return True

def bulk_delete_talent_pool(db: Session, ids: List[str]) -> bool:
    """
    Bulk removes talent pool entries by ID or candidate ID.
    CRITICAL: Preserves CandidateModel records in candidates table intact.
    """
    for item_id in ids:
        remove_from_talent_pool(db, item_id)
    return True
