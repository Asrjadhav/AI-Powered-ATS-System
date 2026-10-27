from pydantic import BaseModel
from typing import Optional

class OfferBase(BaseModel):
    id: Optional[str] = None
    candidateId: str
    jobId: str
    applicationId: Optional[str] = None
    candidateName: Optional[str] = None
    candidateEmail: Optional[str] = None
    jobTitle: Optional[str] = None
    department: Optional[str] = None
    offeredCTC: Optional[float] = None
    joiningDate: Optional[str] = None
    status: Optional[str] = "Draft"
    workflowStage: Optional[str] = "Offer Generation"
    contractTemplate: Optional[str] = None
    customTerms: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class OfferCreate(OfferBase):
    # Used for the offer letter PDF only (the offers table has no column for them): the date
    # the offer stays valid till, and who the candidate reports to.
    expiryDate: Optional[str] = None
    reportingManager: Optional[str] = None

class OfferUpdate(BaseModel):
    offeredCTC: Optional[float] = None
    joiningDate: Optional[str] = None
    status: Optional[str] = None
    workflowStage: Optional[str] = None
    contractTemplate: Optional[str] = None
    customTerms: Optional[str] = None

class OfferResponse(OfferBase):
    class Config:
        from_attributes = True
