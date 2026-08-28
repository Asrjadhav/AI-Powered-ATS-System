from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.talent_pool import TalentPoolCreate, TalentPoolUpdate, TalentPoolResponse
from services import talent_pool_service

router = APIRouter(tags=["Talent Pool"])

@router.get("/talent-pool", response_model=List[TalentPoolResponse])
def list_talent_pool(db: Session = Depends(get_db)):
    """
    List all candidates in the Talent Pool database.
    """
    return talent_pool_service.list_talent_pool(db)

@router.get("/talent-pool/{id}", response_model=TalentPoolResponse)
def get_talent_pool_item(id: str, db: Session = Depends(get_db)):
    """
    Get specific talent pool entry by ID or Candidate ID.
    """
    tp = talent_pool_service.get_talent_pool_by_id(db, id)
    if not tp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Talent pool candidate '{id}' not found."
        )
    cand = talent_pool_service.candidate_service.get_candidate_by_id_or_candidate_id(db, tp.candidateId)
    return talent_pool_service.format_tp_response(tp, cand)

@router.post("/talent-pool", response_model=TalentPoolResponse, status_code=status.HTTP_201_CREATED)
def add_to_talent_pool(payload: TalentPoolCreate, db: Session = Depends(get_db)):
    """
    Add a candidate to the Talent Pool.
    Enforces uniqueness: Returns 409 Conflict if candidate is already in Talent Pool.
    """
    return talent_pool_service.add_candidate_to_talent_pool(db, payload)

@router.patch("/talent-pool/{id}", response_model=TalentPoolResponse)
def update_talent_pool_item(id: str, updates: TalentPoolUpdate, db: Session = Depends(get_db)):
    """
    Update Talent Pool metadata (status, tags, recruiterNotes, availability, noticePeriod, etc.).
    """
    updated = talent_pool_service.update_talent_pool(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Talent pool entry '{id}' not found."
        )
    return updated

@router.delete("/talent-pool/{id}", status_code=status.HTTP_200_OK)
def remove_from_talent_pool(id: str, db: Session = Depends(get_db)):
    """
    Remove entry from Talent Pool table in PostgreSQL.
    Preserves CandidateModel profile in candidates table intact.
    """
    success = talent_pool_service.remove_from_talent_pool(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Talent pool entry '{id}' not found."
        )
    return {"success": True, "id": id}

@router.post("/talent-pool/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_talent_pool(payload: dict, db: Session = Depends(get_db)):
    """
    Bulk remove entries from Talent Pool table.
    Preserves CandidateModel profiles in candidates table intact.
    """
    ids = payload.get("ids", [])
    if not ids or not isinstance(ids, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request payload must contain a non-empty 'ids' list."
        )
    talent_pool_service.bulk_delete_talent_pool(db, ids)
    return {"success": True, "count": len(ids)}
