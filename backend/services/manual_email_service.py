"""
Manual emails sent by HR from the Email Templates page ("Send Email" button).

list_recipients() returns the real candidates (with an email address) and the
template variables for each, built from their latest application, interview and
offer rows. The page previews with these exact values, and send_manual_email()
sends to the candidate's email as stored in the database.
"""

import datetime
from collections import defaultdict
from typing import Dict, Iterable, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import config
import services.automated_email_service as automated_email_service
import services.email_service as email_service
import services.email_html as email_html
import services.email_variables as email_variables
from services import formatting
import services.offer_letter_service as offer_letter_service

import logging
from logging_config import mask_email

logger = logging.getLogger(__name__)


def _stage(value) -> str:
    raw = getattr(value, "value", value)
    return str(raw) if raw else ""


def _latest(rows: Iterable, key) -> Optional[object]:
    rows = list(rows)
    return max(rows, key=key) if rows else None


def _is_cancelled(interview) -> bool:
    return str(interview.status or "").strip().lower() == "cancelled"


def build_recipient(candidate, applications: Iterable, interviews: Iterable, offers: Iterable) -> Dict:
    """One candidate as the Email Templates page needs it. Pure: no database access."""
    application = _latest(applications, key=lambda a: a.createdAt or "")
    interview = _latest(
        (i for i in interviews if not _is_cancelled(i)),
        key=lambda i: (i.date or "", i.time or "", i.createdAt or ""),
    )
    offer = _latest(offers, key=lambda o: o.createdAt or "")

    name = email_variables.candidate_name(candidate)
    job_title = application.appliedRole if application and application.appliedRole else ""
    department = application.department if application and application.department else ""
    if candidate.totalExperience:
        experience = candidate.totalExperience
    elif candidate.experienceYears:
        experience = f"{candidate.experienceYears:g} years"
    else:
        experience = ""
    if isinstance(candidate.skills, list):
        skills = ", ".join(str(s) for s in candidate.skills if s)
    else:
        skills = str(candidate.skills or candidate.keySkills or "")
    ats_score = application.atsScore if application and application.atsScore is not None else None

    meeting_link = interview.meetingLink if interview and email_variables.is_meet_url(interview.meetingLink) else ""
    variables = {
        **email_variables.base_variables(name, job_title, department),
        "experience": experience,
        "skills": skills,
        "ats_score": f"{ats_score}%" if ats_score is not None else "",
        **email_variables.interview_variables(
            interview, mode="G Meet" if meeting_link else "", meeting_link=meeting_link
        ),
        **email_variables.offer_variables(offer),
        "custom_message": "",
    }
    return {
        "id": candidate.id,
        "candidateId": candidate.candidateId,
        "name": name,
        "email": candidate.email,
        "phone": candidate.phone or "",
        "jobTitle": job_title,
        "department": department,
        "experience": experience,
        "skills": skills,
        "atsScore": str(ats_score) if ats_score is not None else "",
        "interviewStatus": _stage(application.status if application else candidate.status),
        "offerStatus": offer.status if offer and offer.status else "None",
        # What the offer letter form starts with: the candidate's saved offer, if there is one. HR
        # reviews and edits every value before the letter is generated or sent.
        "offerDefaults": {
            "annualCtc": offer.offeredCTC if offer and offer.offeredCTC else None,
            "joiningDate": formatting.parse_date(offer.joiningDate).isoformat()
            if offer and formatting.parse_date(offer.joiningDate) else "",
        },
        "variables": variables,
    }


def _group_by_candidate(rows: Iterable) -> Dict[str, List]:
    grouped = defaultdict(list)
    for row in rows:
        grouped[row.candidateId].append(row)
    return grouped


def _related_rows(db: Session, candidate_ids: Optional[List[str]] = None):
    from models.application import ApplicationModel
    from models.interview import InterviewModel
    from models.offer import OfferModel

    def query(model):
        q = db.query(model)
        if candidate_ids is not None:
            q = q.filter(model.candidateId.in_(candidate_ids))
        return _group_by_candidate(q.all())

    return query(ApplicationModel), query(InterviewModel), query(OfferModel)


def _rows_for(grouped: Dict[str, List], candidate) -> List:
    return grouped.get(candidate.id, []) + (
        grouped.get(candidate.candidateId, []) if candidate.candidateId != candidate.id else []
    )


def list_recipients(db: Session) -> Dict:
    from models.candidate import CandidateModel

    candidates = (
        db.query(CandidateModel)
        .filter(CandidateModel.email.isnot(None), CandidateModel.email != "")
        .order_by(CandidateModel.createdAt.desc().nullslast())
        .all()
    )
    applications, interviews, offers = _related_rows(db)
    logger.info("Email recipients requested: %d candidate(s) with an email address, email %s",
                len(candidates), "configured" if email_service.is_configured() else "NOT configured")
    return {
        "configured": email_service.is_configured(),
        "sender": {"name": config.FROM_NAME, "email": config.FROM_EMAIL},
        "recipients": [
            build_recipient(c, _rows_for(applications, c), _rows_for(interviews, c), _rows_for(offers, c))
            for c in candidates
        ],
    }


def _find_candidate(db: Session, identifier: str):
    from services.candidate_service import get_candidate_by_id_or_candidate_id

    return get_candidate_by_id_or_candidate_id(db, identifier)


def _is_offer_template(db: Session, template_id: Optional[str]) -> bool:
    if not template_id:
        return False
    from models.email_template import EmailTemplateModel

    template = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    return template is not None and template.category == automated_email_service.OFFER_CATEGORY


def _offer_letter_inputs(candidate, recipient: Dict, details: Optional[Dict]):
    """
    The letter data and the email variables for what HR confirmed on the form. HR may edit the job
    title; it starts as the candidate's applied role. A missing or invalid value is a 400 that names it.
    """
    details = details or {}
    data = offer_letter_service.data_for_candidate(
        candidate,
        recipient["name"],
        (details.get("jobTitle") or recipient["jobTitle"] or "").strip(),
        details.get("annualCtc"),
        details.get("joiningDate"),
        details.get("validTill"),
        details.get("reportingManager") or "",
    )
    try:
        offer_letter_service.validate(data)
    except offer_letter_service.OfferLetterError as exc:
        logger.warning("Offer letter refused for candidate %s: %s", recipient["id"], exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    overrides = email_variables.offer_variables(
        None, joining_date=data.joining_date, valid_till=data.valid_till, annual_ctc=data.annual_ctc)
    overrides["job_title"] = data.job_title
    return data, overrides


def preview_offer_letter(db: Session, candidate_id: str, details: Optional[Dict]) -> Dict:
    """The offer letter PDF for the form as it stands, so HR can read it before sending."""
    candidate = _find_candidate(db, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
    recipient = _recipient_for(db, candidate)
    data, _overrides = _offer_letter_inputs(candidate, recipient, details)
    pdf = offer_letter_service.build_offer_letter(data)
    return {"filename": offer_letter_service.offer_letter_filename(recipient["name"]), "content": pdf}


def _recipient_for(db: Session, candidate) -> Dict:
    ids = list({candidate.id, candidate.candidateId} - {None})
    applications, interviews, offers = _related_rows(db, ids)
    return build_recipient(
        candidate, _rows_for(applications, candidate), _rows_for(interviews, candidate), _rows_for(offers, candidate)
    )


def send_manual_email(db: Session, candidate_id: str, subject: str, body: str,
                      template_id: Optional[str] = None, offer_letter: Optional[Dict] = None) -> Dict:
    """
    Sends one email. When the template is an "Offer Letter" one, `offer_letter` holds what HR
    confirmed on the form (jobTitle, annualCtc, joiningDate, validTill, reportingManager); the
    offer letter PDF is generated from it and attached to this candidate's email.
    """
    logger.info("Manual email requested: candidate=%s subject=%r template=%s", candidate_id, (subject or "")[:80], template_id or "-")
    candidate = _find_candidate(db, candidate_id)
    if candidate is None or not candidate.email:
        logger.warning("Manual email refused: candidate %r not found or has no email address", candidate_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found, or the candidate has no email address.",
        )
    if not (subject or "").strip() or not (body or "").strip():
        logger.warning("Manual email refused: empty subject or body")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject and body are required.",
        )
    if not email_service.is_configured():
        logger.warning("Manual email refused: email is not configured (SMTP_HOST is not set)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email is not configured on the server (SMTP_HOST is not set).",
        )

    recipient = _recipient_for(db, candidate)
    variables = dict(recipient["variables"])
    attachments = []
    if _is_offer_template(db, template_id):
        data, overrides = _offer_letter_inputs(candidate, recipient, offer_letter)
        # The email says what the letter says (joining date, job title), including anything HR edited.
        variables.update(overrides)
        pdf = offer_letter_service.build_offer_letter(data)
        filename = offer_letter_service.offer_letter_filename(recipient["name"])
        attachments.append((filename, pdf, "application/pdf"))
        logger.info("Manual offer email: offer letter PDF %s prepared (%d bytes) for %s / %s",
                    filename, len(pdf), recipient["name"], data.job_title)
    # The page sends already-rendered text; this fills anything it left behind.
    subject_text = email_service.render(subject, variables)
    body_text = email_service.render(body, variables)

    logger.info("Manual email: sending to candidate %s (%s)%s", candidate.id, mask_email(candidate.email),
                f" with {len(attachments)} attachment(s)" if attachments else "")
    if not email_service.send_email(candidate.email, subject_text, body_text, attachments=attachments):
        logger.error("Manual email to candidate %s failed, see the error logged just above", candidate.id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The email could not be sent. Check the server log for the SMTP error.",
        )
    logger.info("Manual email to candidate %s sent", candidate.id)
    return {
        "success": True,
        "to": candidate.email,
        "candidateId": candidate.candidateId or candidate.id,
        "candidateName": recipient["name"],
        "subject": subject_text,
        "body": email_html.to_plain(body_text),  # as the candidate reads it, without the template markup
        "attachments": [filename for filename, _content, _mime in attachments],
        "sentAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
