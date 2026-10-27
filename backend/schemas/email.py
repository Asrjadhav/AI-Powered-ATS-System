from typing import Optional

from pydantic import BaseModel


class OfferLetterDetails(BaseModel):
    """What HR confirms on the form before an offer letter is generated. Nothing here has a default."""
    jobTitle: Optional[str] = None
    annualCtc: Optional[float] = None  # rupees per year
    joiningDate: Optional[str] = None
    validTill: Optional[str] = None
    reportingManager: Optional[str] = None


class OfferLetterPreviewRequest(BaseModel):
    candidateId: str
    offerLetter: OfferLetterDetails


class ManualEmailRequest(BaseModel):
    """Body of POST /api/emails/send. The address is looked up from candidateId, never taken from the client."""
    candidateId: str
    subject: str
    body: str
    # The stored template being sent. An "Offer Letter" template gets the candidate's offer letter PDF attached.
    templateId: Optional[str] = None
    # Required when that template is an "Offer Letter" one: the details the PDF is generated from.
    offerLetter: Optional[OfferLetterDetails] = None


class EmailTriggerUpdate(BaseModel):
    """Body of PUT /api/emails/triggers/{event}: switch one automatic email on or off."""
    enabled: bool
