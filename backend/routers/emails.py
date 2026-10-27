from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas.email import ManualEmailRequest, OfferLetterPreviewRequest, EmailTriggerUpdate
import services.manual_email_service as manual_email_service
import services.email_trigger_service as email_trigger_service

router = APIRouter(tags=["Emails"])


@router.get("/emails/recipients")
def list_email_recipients(db: Session = Depends(get_db)):
    """Candidates the Email Templates page can send to, with their template variables."""
    return manual_email_service.list_recipients(db)


@router.post("/emails/send")
def send_email_to_candidate(payload: ManualEmailRequest, db: Session = Depends(get_db)):
    """Sends an email to one candidate (the "Send Email" button on the Email Templates page)."""
    return manual_email_service.send_manual_email(
        db, candidate_id=payload.candidateId, subject=payload.subject, body=payload.body,
        template_id=payload.templateId,
        offer_letter=payload.offerLetter.dict() if payload.offerLetter else None,
    )


@router.post("/emails/offer-letter/preview")
def preview_offer_letter(payload: OfferLetterPreviewRequest, db: Session = Depends(get_db)):
    """The offer letter PDF for the details on the form, so HR can read it before sending. Nothing is sent or saved."""
    letter = manual_email_service.preview_offer_letter(db, payload.candidateId, payload.offerLetter.dict())
    return Response(
        content=letter["content"], media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{letter["filename"]}"'},
    )


@router.get("/emails/triggers")
def list_email_triggers(db: Session = Depends(get_db)):
    """The automatic emails and whether each is switched on (Email Templates > Automation Triggers)."""
    return email_trigger_service.list_triggers(db)


@router.put("/emails/triggers/{event}")
def set_email_trigger(event: str, payload: EmailTriggerUpdate, db: Session = Depends(get_db)):
    """Switches one automatic email on or off. It takes effect immediately."""
    return email_trigger_service.set_enabled(db, event, payload.enabled)
