from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.candidate import CandidateModel
from schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

@router.get("", response_model=List[CandidateResponse])
def get_candidates(db: Session = Depends(get_db)):
    candidates = db.query(CandidateModel).all()
    return candidates

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(CandidateModel).filter(
        (CandidateModel.id == candidate_id) | (CandidateModel.candidateId == candidate_id)
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.post("", response_model=CandidateResponse)
def create_candidate(payload: CandidateCreate, db: Session = Depends(get_db)):
    cand_data = payload.dict()
    
    # Generate ID if missing
    if not cand_data.get("id"):
        count = db.query(CandidateModel).count()
        cand_data["id"] = f"CAND-{str(count + 1).zfill(3)}"
    if not cand_data.get("candidateId"):
        cand_data["candidateId"] = cand_data["id"]
        
    now = datetime.utcnow().isoformat()
    if not cand_data.get("createdAt"):
        cand_data["createdAt"] = now
    cand_data["updatedAt"] = now

    # Check if exists by id or email
    existing = None
    if cand_data.get("id"):
        existing = db.query(CandidateModel).filter(CandidateModel.id == cand_data["id"]).first()
    if not existing and cand_data.get("email"):
        existing = db.query(CandidateModel).filter(CandidateModel.email == cand_data["email"]).first()

    if existing:
        for key, value in cand_data.items():
            if value is not None:
                setattr(existing, key, value)
        existing.updatedAt = now
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_candidate = CandidateModel(**cand_data)
        db.add(new_candidate)
        db.commit()
        db.refresh(new_candidate)
        return new_candidate

@router.patch("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: str, payload: CandidateUpdate, db: Session = Depends(get_db)):
    candidate = db.query(CandidateModel).filter(
        (CandidateModel.id == candidate_id) | (CandidateModel.candidateId == candidate_id)
    ).first()
    
    if not candidate:
        # If not found, create it as a fallback update
        update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
        update_data["id"] = candidate_id
        update_data["candidateId"] = update_data.get("candidateId", candidate_id)
        now = datetime.utcnow().isoformat()
        update_data["createdAt"] = update_data.get("createdAt", now)
        update_data["updatedAt"] = now
        
        candidate = CandidateModel(**update_data)
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return candidate

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(candidate, key, value)
    
    candidate.updatedAt = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(candidate)
    return candidate

@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: str, db: Session = Depends(get_db)):
    clean_id = candidate_id.replace("app-", "").replace("cand-", "").replace("tp-", "")
    candidates = db.query(CandidateModel).all()
    
    found = None
    for c in candidates:
        c_id = str(c.id or "").strip()
        c_cand_id = str(c.candidateId or "").strip()
        c_clean = c_id.replace("app-", "").replace("cand-", "").replace("tp-", "")
        if c_id == candidate_id or c_cand_id == candidate_id or c_clean == clean_id:
            found = c
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    db.delete(found)
    db.commit()
    return {"status": "success", "message": "Candidate deleted"}
