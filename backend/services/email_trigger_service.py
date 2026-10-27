"""
The automatic emails and their on/off switches (the Automation Triggers tab).

Four triggers, one per email template that is kept:

  interview_scheduled -> Interview Invitation   an interview is scheduled
  offer_generated     -> Offer Letter           an offer is created (offer letter PDF attached)
  candidate_rejected  -> Rejection Email        an application is moved to Rejected
  offer_accepted      -> Welcome Email          an offer is marked Accepted

automated_email_service asks is_enabled() before sending each of them, so a switch that is
off really stops that email. A trigger with no stored row uses its default: the three that
existed before the switches stay on; Welcome Email is new and starts off.

If the email_triggers table is missing or unreadable, every trigger falls back to its
default and a warning is logged: the switches can never stop the app from sending.
"""

import datetime
import logging
from typing import Dict, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.email_template import EmailTemplateModel
from models.email_trigger import EmailTriggerModel

logger = logging.getLogger(__name__)

INTERVIEW_SCHEDULED = "interview_scheduled"
OFFER_GENERATED = "offer_generated"
CANDIDATE_REJECTED = "candidate_rejected"
OFFER_ACCEPTED = "offer_accepted"

TRIGGERS: List[Dict] = [
    {"event": INTERVIEW_SCHEDULED, "label": "Interview Scheduled", "category": "Interview Invitation",
     "when": "An interview is scheduled", "default": True},
    {"event": OFFER_GENERATED, "label": "Offer Generated", "category": "Offer Letter",
     "when": "An offer is created (the offer letter PDF is attached)", "default": True},
    {"event": CANDIDATE_REJECTED, "label": "Candidate Rejected", "category": "Rejection Email",
     "when": "An application is moved to Rejected, by HR or by AI screening", "default": True},
    {"event": OFFER_ACCEPTED, "label": "Offer Accepted", "category": "Welcome Email",
     "when": "An offer is marked Accepted", "default": False},
]
_BY_EVENT = {t["event"]: t for t in TRIGGERS}


def _stored_switches(db: Session) -> Dict[str, bool]:
    try:
        return {row.event: bool(row.enabled) for row in db.query(EmailTriggerModel).all()}
    except Exception as exc:
        db.rollback()
        logger.warning("Email triggers: could not read the email_triggers table (%s). Using the defaults.", exc)
        return {}


def is_enabled(db: Session, event: str) -> bool:
    """Whether this automatic email should be sent right now."""
    trigger = _BY_EVENT.get(event)
    if trigger is None:
        return False
    return _stored_switches(db).get(event, trigger["default"])


def list_triggers(db: Session) -> List[Dict]:
    """Every trigger with its switch and the template it sends, for the Automation Triggers tab."""
    switches = _stored_switches(db)
    result = []
    for trigger in TRIGGERS:
        template = db.query(EmailTemplateModel).filter(EmailTemplateModel.category == trigger["category"]).first()
        result.append({
            "event": trigger["event"],
            "label": trigger["label"],
            "when": trigger["when"],
            "templateName": template.name if template else None,
            "enabled": switches.get(trigger["event"], trigger["default"]),
        })
    return result


def set_enabled(db: Session, event: str, enabled: bool) -> Dict:
    if event not in _BY_EVENT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown email trigger '{event}'.")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        row = db.query(EmailTriggerModel).filter(EmailTriggerModel.event == event).first()
        if row is None:
            db.add(EmailTriggerModel(event=event, enabled=enabled, updatedAt=now))
        else:
            row.enabled = enabled
            row.updatedAt = now
        db.commit()
    except Exception:
        db.rollback()
        logger.error("Email trigger %s: could not be saved", event, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The trigger could not be saved. Check that the email_triggers table exists.",
        )
    logger.info("Email trigger %s switched %s", event, "ON" if enabled else "OFF")
    return next(t for t in list_triggers(db) if t["event"] == event)
