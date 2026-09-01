import smtplib
import logging
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

import config
from models.email_template import EmailTemplateModel

logger = logging.getLogger(__name__)

def send_email(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None
) -> bool:
    """
    Sends an email using configured SMTP environment settings.
    If SMTP credentials/host are not configured, logs the email safely without crashing.
    """
    if not to_email:
        logger.warning("No recipient email provided for send_email.")
        return False

    sender = from_email or config.FROM_EMAIL

    if not config.SMTP_HOST or not config.SMTP_USERNAME:
        logger.info(
            f"[EMAIL DISPATCH SIMULATED / LOG ONLY] To: {to_email} | Subject: {subject}\n"
            f"SMTP_HOST not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD in environment to enable live email delivery."
        )
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email successfully dispatched to {to_email} via SMTP ({config.SMTP_HOST}).")
        return True
    except Exception as err:
        logger.error(f"Failed to dispatch email to {to_email} via SMTP: {err}")
        return False

def send_rejection_email(
    db: Session,
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str = "EncureIT Talent AI",
    recruiter_name: str = "Aditi Jadhav"
) -> bool:
    """
    Retrieves the Rejection Email Template ('temp-006' or 'Candidate Application Rejection'),
    renders template variables, and dispatches the rejection email safely.
    """
    if not candidate_email:
        return False

    template = db.query(EmailTemplateModel).filter(
        (EmailTemplateModel.id == "temp-006") | 
        (EmailTemplateModel.name.ilike("%rejection%"))
    ).first()

    subject = f"Update on your application for {job_title} at {company_name}"
    body = (
        f"Dear {candidate_name},\n\n"
        f"Thank you for applying for the {job_title} position at {company_name}.\n\n"
        f"After reviewing your application against the requirements of the role, we will not be moving forward with your application at this time.\n\n"
        f"We appreciate your interest in {company_name} and wish you success in your job search.\n\n"
        f"Best regards,\n{recruiter_name}\n{company_name} Talent Acquisition Team"
    )

    if template:
        subject = template.subject or subject
        body = template.body or body

        replacements = {
            "{{candidate_name}}": candidate_name,
            "{{job_title}}": job_title,
            "{{company_name}}": company_name,
            "{{recruiter_name}}": recruiter_name
        }
        for k, v in replacements.items():
            subject = subject.replace(k, v)
            body = body.replace(k, v)

    return send_email(to_email=candidate_email, subject=subject, body=body)
