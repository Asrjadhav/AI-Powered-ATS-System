"""
Automated candidate emails.

Sent by the backend, with no manual step, when:
  - a candidate is rejected         -> notify_candidate_rejected(db, application)
  - an offer letter is generated    -> notify_offer_generated(db, offer_id)  (letter PDF attached)
  - an interview is scheduled       -> notify_interview_scheduled(db, interview, options)  (job description PDF attached)
  - an offer is accepted            -> notify_offer_accepted(db, offer_id)   (Welcome Email)

Each one first asks services/email_trigger_service whether its switch (Automation Triggers
tab) is on, and does nothing when it is off.

The recipient's name and email always come from the candidate's database row
(falling back to the copy stored on the application / offer / interview row).
The stored email templates are used when present, else built-in text.

Every function is best-effort: a failure is logged and returned as False and
never fails the request that triggered it.
"""

import datetime
import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

import services.email_service as email_service
import services.email_trigger_service as email_trigger_service
import services.email_variables as email_variables
import services.job_description_service as job_description_service
import services.offer_letter_service as offer_letter_service
from services.email_template_defaults import (
    INTERVIEW_BODY, INTERVIEW_CATEGORY, INTERVIEW_SUBJECT, INTERVIEW_TEMPLATE_ID,
    OFFER_BODY, OFFER_CATEGORY, OFFER_SUBJECT, OFFER_TEMPLATE_ID,
    WELCOME_BODY, WELCOME_CATEGORY, WELCOME_SUBJECT, WELCOME_TEMPLATE_ID,
)
from logging_config import mask_email

logger = logging.getLogger(__name__)

# Template ids, categories and built-in wording are in services/email_template_defaults.py.


def _trigger_off(db: Session, event: str, what: str) -> bool:
    """True (and logged) when this automatic email's switch is off."""
    if email_trigger_service.is_enabled(db, event):
        return False
    logger.info("%s: not sent, the %r trigger is switched OFF (Email Templates > Automation Triggers)", what, event)
    return True


def _find_candidate(db: Session, identifier: Optional[str]):
    if not identifier:
        return None
    from services.candidate_service import get_candidate_by_id_or_candidate_id

    return get_candidate_by_id_or_candidate_id(db, identifier)


def _find_offer(db: Session, offer_id: str):
    from services.offer_service import get_offer_by_id

    return get_offer_by_id(db, offer_id)


def _commit(db: Session, what: str) -> None:
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Could not save email status for %s: %s", what, exc)


def notify_candidate_rejected(db: Session, application) -> bool:
    """Emails the rejection template once per application (tracked in aiEvaluation)."""
    logger.info("Rejection email: application=%s candidate=%s", application.id, application.candidateId)
    if _trigger_off(db, email_trigger_service.CANDIDATE_REJECTED, f"Rejection email for application {application.id}"):
        return False
    evaluation = dict(application.aiEvaluation or {})
    if evaluation.get("rejectionEmailSent"):
        logger.info("Rejection email: already sent for application %s, not sending again", application.id)
        return False

    candidate = _find_candidate(db, application.candidateId)
    to_email = (candidate.email if candidate else None) or application.candidateEmail
    if not to_email:
        logger.warning("Application %s: rejection email not sent, no candidate email.", application.id)
        return False
    logger.info("Rejection email: recipient %s taken from the %s", mask_email(to_email),
                "candidates table" if candidate and candidate.email else "application row (candidate row had no email)")

    name = email_variables.candidate_name(candidate, application.candidateName)
    variables = email_variables.base_variables(name, application.appliedRole, application.department)
    sent = email_service.send_templated_email(
        db,
        email_service.REJECTION_TEMPLATE_ID,
        email_service.REJECTION_CATEGORY,
        to_email=to_email,
        variables=variables,
        fallback_subject=email_service.REJECTION_SUBJECT,
        fallback_body=email_service.REJECTION_BODY,
    )
    logger.info("Rejection email for application %s: %s", application.id,
                "delivered, recording it" if sent else "NOT delivered (can be retried later)")
    if sent:
        # Only a delivered email is recorded, so a failed one can be retried later.
        evaluation["rejectionEmailSent"] = True
        evaluation["rejectionEmailSentAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        application.aiEvaluation = evaluation
        _commit(db, f"application {application.id}")
    return sent


def notify_offer_generated(db: Session, offer_id: str, letter: Optional[Dict[str, Any]] = None) -> bool:
    """
    Emails the offer template with the generated offer letter PDF attached.

    The CTC and joining date come from the saved offer. `letter` carries what HR confirmed for the
    letter and the offers table does not store: `validTill` (required) and `reportingManager`;
    `annualCtc` / `joiningDate` there replace the saved offer's values. Without the details the
    letter needs, no email is sent (an incomplete letter is never sent).
    """
    letter = letter or {}
    logger.info("Offer email: offer=%s", offer_id)
    if _trigger_off(db, email_trigger_service.OFFER_GENERATED, f"Offer email for offer {offer_id}"):
        return False
    offer = _find_offer(db, offer_id)
    if offer is None:
        logger.warning("Offer %s: offer email not sent, offer not found.", offer_id)
        return False

    candidate = _find_candidate(db, offer.candidateId)
    to_email = (candidate.email if candidate else None) or offer.candidateEmail
    if not to_email:
        logger.warning("Offer %s: offer email not sent, no candidate email.", offer.id)
        return False
    logger.info("Offer email: recipient %s taken from the %s", mask_email(to_email),
                "candidates table" if candidate and candidate.email else "offer row (candidate row had no email)")

    name = email_variables.candidate_name(candidate, offer.candidateName)
    position = offer.jobTitle or ""
    # A key present in `letter` is used even when empty (the letter is then refused), so a value
    # the offers API filled in by default is never printed on a letter.
    annual_ctc = letter["annualCtc"] if "annualCtc" in letter else offer.offeredCTC
    joining_date = letter["joiningDate"] if "joiningDate" in letter else offer.joiningDate
    valid_till = letter.get("validTill")
    try:
        pdf = offer_letter_service.build_offer_letter(offer_letter_service.data_for_candidate(
            candidate, name, position, annual_ctc, joining_date, valid_till, letter.get("reportingManager") or ""))
    except offer_letter_service.OfferLetterError as exc:
        logger.warning("Offer %s: offer email not sent. %s", offer.id, exc)
        return False
    logger.info("Offer %s: offer letter PDF generated (%d bytes) for %s / %s", offer.id, len(pdf), name, position)
    variables = {
        **email_variables.base_variables(name, position, offer.department),
        **email_variables.offer_variables(offer, joining_date=joining_date, valid_till=valid_till, annual_ctc=annual_ctc),
    }
    return email_service.send_templated_email(
        db,
        OFFER_TEMPLATE_ID,
        OFFER_CATEGORY,
        to_email=to_email,
        variables=variables,
        fallback_subject=OFFER_SUBJECT,
        fallback_body=OFFER_BODY,
        attachments=[(offer_letter_service.offer_letter_filename(name), pdf, "application/pdf")],
    )


def _job_description_attachment(db: Session, interview) -> list:
    """
    The job's description (from Jobs) as a PDF attachment for the invitation. When it cannot be built
    the reason is logged and no attachment is added: the interview is already saved, so the
    invitation itself is still sent.
    """
    try:
        from services.job_service import get_job_by_id_or_job_id

        job = get_job_by_id_or_job_id(db, interview.jobId) if interview.jobId else None
        if not job:
            logger.warning("Interview %s: no job description attached, job %r was not found.", interview.id, interview.jobId)
            return []
        pdf = job_description_service.build_job_description(job)
        filename = job_description_service.job_description_filename(job.title)
    except job_description_service.JobDescriptionError as exc:
        logger.warning("Interview %s: no job description attached. %s", interview.id, exc)
        return []
    except Exception as exc:  # best-effort, like every automatic email here
        logger.error("Interview %s: job description PDF failed (%s: %s); sending the invitation without it.",
                     interview.id, type(exc).__name__, exc)
        return []
    logger.info("Interview %s: attaching the job description PDF %s (%d KB)", interview.id, filename, max(1, len(pdf) // 1024))
    return [(filename, pdf, "application/pdf")]


def notify_interview_scheduled(db: Session, interview, options: Optional[Dict[str, Any]] = None) -> bool:
    """
    Emails the interview invitation. For Online / Google Meet interviews the Meet link
    was already created and saved on the interview by the create route (which refuses
    to save the interview, and so never reaches this email, when Meet fails).

    `options` is the create-interview request body: `type`, `platform` and
    `location` are not stored on the interview row, so they are read from it.
    """
    options = options or {}
    interview_type = options.get("type")
    platform = options.get("platform") or ""
    location = options.get("location") or ""
    logger.info("Interview email: interview=%s type=%s platform=%s", interview.id, interview_type, platform or "-")
    if _trigger_off(db, email_trigger_service.INTERVIEW_SCHEDULED, f"Interview email for interview {interview.id}"):
        return False

    meeting_link = ""
    mode = ""
    if interview_type == "Online" and platform == "Google Meet":
        mode = "G Meet"
        meeting_link = interview.meetingLink or ""
        logger.info("Interview %s: using the saved Google Meet link", interview.id)
    elif interview_type == "Online":
        logger.info("Interview %s: online but not Google Meet (%s), no Meet link is created", interview.id, platform or "no platform")
        mode = f"Online ({platform})" if platform else "Online"
        if str(interview.meetingLink or "").startswith(("http://", "https://")):
            meeting_link = interview.meetingLink
    elif interview_type == "Offline":
        logger.info("Interview %s: in-person at %r, no Meet link needed", interview.id, location or "-")
        mode = "In-Person"
    else:
        logger.info("Interview %s: type %r is neither Online nor Offline, the email will have no mode or link", interview.id, interview_type)

    candidate = _find_candidate(db, interview.candidateId)
    to_email = (candidate.email if candidate else None) or interview.candidateEmail
    if not to_email:
        logger.warning("Interview %s: invitation email not sent, no candidate email.", interview.id)
        return False
    logger.info("Interview email: recipient %s taken from the %s", mask_email(to_email),
                "candidates table" if candidate and candidate.email else "interview row (candidate row had no email)")

    name = email_variables.candidate_name(candidate, interview.candidateName)
    variables = {
        **email_variables.base_variables(name, interview.jobTitle),
        **email_variables.interview_variables(
            interview,
            mode=mode,
            meeting_link=meeting_link,
            office_location=location if interview_type == "Offline" else "",
        ),
    }
    # The interviewers are the CC recipients; BCC is the optional hidden copy.
    cc_emails = [p.get("email") for p in (interview.interviewers or []) if isinstance(p, dict)]
    bcc_emails = [p.get("email") for p in (interview.bcc or []) if isinstance(p, dict)]
    logger.info("Interview email: %d CC (interviewers) and %d BCC recipient(s) saved on the interview", len(cc_emails), len(bcc_emails))
    return email_service.send_templated_email(
        db,
        INTERVIEW_TEMPLATE_ID,
        INTERVIEW_CATEGORY,
        to_email=to_email,
        variables=variables,
        fallback_subject=INTERVIEW_SUBJECT,
        fallback_body=INTERVIEW_BODY,
        attachments=_job_description_attachment(db, interview),
        cc=cc_emails,
        bcc=bcc_emails,
    )


def notify_offer_accepted(db: Session, offer_id: str) -> bool:
    """Emails the Welcome Email template to the candidate whose offer was just accepted."""
    logger.info("Welcome email: offer=%s", offer_id)
    if _trigger_off(db, email_trigger_service.OFFER_ACCEPTED, f"Welcome email for offer {offer_id}"):
        return False
    offer = _find_offer(db, offer_id)
    if offer is None:
        logger.warning("Offer %s: welcome email not sent, offer not found.", offer_id)
        return False

    candidate = _find_candidate(db, offer.candidateId)
    to_email = (candidate.email if candidate else None) or offer.candidateEmail
    if not to_email:
        logger.warning("Offer %s: welcome email not sent, no candidate email.", offer.id)
        return False
    logger.info("Welcome email: recipient %s taken from the %s", mask_email(to_email),
                "candidates table" if candidate and candidate.email else "offer row (candidate row had no email)")

    name = email_variables.candidate_name(candidate, offer.candidateName)
    variables = email_variables.base_variables(name, offer.jobTitle, offer.department)
    return email_service.send_templated_email(
        db,
        WELCOME_TEMPLATE_ID,
        WELCOME_CATEGORY,
        to_email=to_email,
        variables=variables,
        fallback_subject=WELCOME_SUBJECT,
        fallback_body=WELCOME_BODY,
    )
