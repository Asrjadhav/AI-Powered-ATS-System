from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.offer import OfferCreate, OfferUpdate, OfferResponse
from services import offer_service

router = APIRouter(tags=["Offers"])

@router.get("/offers", response_model=List[dict])
def list_offers(db: Session = Depends(get_db)):
    """
    List all offer records in the PostgreSQL database.
    """
    return offer_service.list_offers(db)

@router.get("/offers/{id}", response_model=dict)
def get_offer(id: str, db: Session = Depends(get_db)):
    """
    Get specific offer record by ID or Candidate ID.
    """
    off = offer_service.get_offer_by_id(db, id)
    if not off:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offer record '{id}' not found."
        )
    return offer_service.format_offer_response(off, db)

@router.post("/offers", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_offer(payload: OfferCreate, db: Session = Depends(get_db)):
    """
    Create a new offer record in PostgreSQL.
    Resolves candidateId, jobId, and applicationId.
    """
    return offer_service.create_offer(db, payload)

@router.put("/offers/{id}", response_model=dict)
def update_offer_full(id: str, updates: OfferUpdate, db: Session = Depends(get_db)):
    """
    Update an offer record.
    """
    updated = offer_service.update_offer(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offer record '{id}' not found."
        )
    return updated

@router.patch("/offers/{id}", response_model=dict)
def update_offer_partial(id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Partial update of offer fields (e.g. status, workflowStage, joiningDate, offeredCTC).
    """
    updates = OfferUpdate(**payload)
    updated = offer_service.update_offer(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offer record '{id}' not found."
        )
    return updated

@router.patch("/offers/{id}/status", response_model=dict)
def update_offer_status_endpoint(id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Specialized endpoint to update offer status and workflowStage.
    Syncs candidate and application stage in PostgreSQL if Accepted or Joined.
    """
    new_status = payload.get("status")
    if not new_status or not str(new_status).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A non-empty 'status' field is required."
        )
    workflow_stage = payload.get("workflowStage")
    updated = offer_service.update_offer_status(db, identifier=id, status_str=str(new_status).strip(), workflow_stage=workflow_stage)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offer record '{id}' not found."
        )
    return updated

@router.delete("/offers/{id}", status_code=status.HTTP_200_OK)
def delete_offer(id: str, db: Session = Depends(get_db)):
    """
    Delete offer record cleanly from PostgreSQL.
    """
    success = offer_service.delete_offer(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Offer record '{id}' not found."
        )
    return {"success": True, "id": id}
