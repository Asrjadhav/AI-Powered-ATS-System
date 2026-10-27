"""
Email transport and template rendering.

ACTIVE SENDER: SMTP. Configure with environment variables (read in config.py,
never hardcoded): SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
SMTP_TIMEOUT_SECONDS, FROM_EMAIL, FROM_NAME, COMPANY_NAME, RECRUITER_NAME.

Connection: port 465 uses implicit TLS (SMTP_SSL); any other port (587, ...) connects
in plain text and upgrades with STARTTLS. The server certificate is verified. Login
credentials are never sent unencrypted: if a login is configured but the server
offers no STARTTLS, the send is refused.

send_email() returns True only when the SMTP server ACCEPTED the message for
delivery. It returns False, and logs the exact reason, when email is not configured
or the server refuses anything (login, sender, recipient, connection, TLS). Note
that "accepted" is not "delivered": a server can still bounce a message afterwards.

The Brevo (REST API) sender that was active before is kept below as a commented-out
block. To switch back: comment out the SMTP section, uncomment the Brevo section and
the Brevo lines in config.py, and use BREVO_API_KEY.
"""

import logging
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Iterable, Mapping, Optional, Tuple

from sqlalchemy.orm import Session

import config
from logging_config import mask_email
from services import email_html
from services.email_template_defaults import (  # the built-in rejection wording, used when no template is stored
    REJECTION_BODY,
    REJECTION_CATEGORY,
    REJECTION_SUBJECT,
    REJECTION_TEMPLATE_ID,
)

# --- BREVO (DISABLED): imports used only by the commented-out Brevo sender at the bottom ---
# import base64
# import requests

logger = logging.getLogger(__name__)

# (filename, file content, MIME type such as "application/pdf")
Attachment = Tuple[str, bytes, str]

_PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*\}\}")

# Free-mail sender domain -> words that appear in that provider's own SMTP host name.
FREE_MAIL_DOMAINS = {
    "gmail.com": ("gmail", "google"),
    "googlemail.com": ("gmail", "google"),
    "outlook.com": ("outlook", "office365", "live", "hotmail"),
    "hotmail.com": ("outlook", "office365", "live", "hotmail"),
    "live.com": ("outlook", "office365", "live", "hotmail"),
    "yahoo.com": ("yahoo",),
    "icloud.com": ("icloud", "me.com", "mail.me"),
    "aol.com": ("aol",),
}


class EmailConfigError(RuntimeError):
    """A required setting is missing, so the mail server was not contacted."""


class EmailSendError(RuntimeError):
    """The mail server refused the email or could not be reached."""


def render(text: Optional[str], variables: Mapping[str, object]) -> str:
    """Fills {{name}} placeholders. A placeholder with no value becomes empty text."""
    return _PLACEHOLDER.sub(lambda m: str(variables.get(m.group(1)) or ""), text or "")


# =============================================================================
# SMTP (ACTIVE)
# =============================================================================

def is_configured() -> bool:
    """True when an SMTP server is set (a login is optional, e.g. for an IP-allowlisted relay)."""
    return bool(config.SMTP_HOST)


def _tls_context() -> ssl.SSLContext:
    """TLS context that verifies the server certificate (smtplib's own default does not)."""
    context = ssl.create_default_context()
    try:
        # Also trust Mozilla's CA bundle: Python on Windows only sees the roots the OS has already
        # downloaded, which can make a valid server fail with "unable to get local issuer certificate".
        import certifi
        context.load_verify_locations(cafile=certifi.where())
    except ImportError:
        pass
    return context


def _server_reply(exc: smtplib.SMTPResponseException) -> str:
    message = exc.smtp_error
    if isinstance(message, bytes):
        message = message.decode("utf-8", "replace")
    return f"{exc.smtp_code} {str(message).strip()}"[:300]


_ADDRESS = re.compile(r"^[^@\s,;<>]+@[^@\s,;<>]+$")


def _clean_addresses(addresses: Optional[Iterable[str]], exclude: Iterable[str] = ()) -> list:
    """Valid, de-duplicated addresses (case-insensitive), minus any in `exclude`."""
    seen = {a.lower() for a in exclude}
    cleaned = []
    for address in addresses or []:
        address = str(address or "").strip()
        if _ADDRESS.match(address) and address.lower() not in seen:
            seen.add(address.lower())
            cleaned.append(address)
    return cleaned


def _build_message(to_email: str, subject: str, body: str, sender_email: str,
                   attachments: Iterable[Attachment], cc: Iterable[str] = (),
                   bcc: Iterable[str] = ()) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((config.FROM_NAME, sender_email))
    msg["To"] = to_email
    if cc:
        msg["Cc"] = ", ".join(cc)
    if bcc:
        # smtplib's send_message() delivers to Bcc addresses and removes this header from the sent copy.
        msg["Bcc"] = ", ".join(bcc)
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=sender_email.rpartition("@")[2] or None)
    # Plain-text part without the template markup, plus the styled HTML part with the company logo.
    msg.set_content(email_html.to_plain(body))
    msg.add_alternative(email_html.to_html(body), subtype="html")
    try:
        msg.get_payload()[1].add_related(email_html.logo_bytes(), "image", "png", cid=f"<{email_html.LOGO_CID}>",
                                         filename="encureit_logo.png", disposition="inline")
    except OSError as exc:  # a missing logo file must never stop the email
        logger.warning("Email sent without the company logo: %s", exc)
    for filename, content, mime_type in attachments:
        maintype, _, subtype = mime_type.partition("/")
        msg.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)
    return msg


def _send_with_smtp(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str],
    attachments: Iterable[Attachment],
    cc: Iterable[str] = (),
    bcc: Iterable[str] = (),
) -> str:
    """Sends one plain-text email over SMTP. Returns its Message-ID; raises if the To address is refused."""
    if not config.SMTP_HOST:
        raise EmailConfigError("SMTP_HOST is not set")
    sender_email = from_email or config.FROM_EMAIL
    if not sender_email:
        raise EmailConfigError("FROM_EMAIL is not set")
    if (config.SMTP_USERNAME and config.SMTP_USERNAME.lower() != sender_email.lower()
            and any(name in config.SMTP_HOST.lower() for name in ("gmail", "google"))):
        # Only Gmail/Workspace behave this way; transactional mail providers use a separate login.
        logger.info("FROM_EMAIL differs from SMTP_USERNAME: Gmail/Workspace rewrite or reject a sender that is "
                    "not the logged-in account or one of its aliases")

    sender_domain = sender_email.rpartition("@")[2].lower()
    own_hosts = FREE_MAIL_DOMAINS.get(sender_domain)
    if own_hosts and not any(name in config.SMTP_HOST.lower() for name in own_hosts):
        logger.warning(
            "FROM_EMAIL is a %s address but SMTP_HOST is %s. A free-mail address can only be sent through its "
            "own provider's SMTP server; other servers refuse it (550 Invalid Mail From). Use an address on a "
            "domain verified with your SMTP provider, or use that provider's own SMTP server.",
            sender_domain, config.SMTP_HOST)

    msg = _build_message(to_email, subject, body, sender_email, attachments, cc, bcc)
    target = f"{config.SMTP_HOST}:{config.SMTP_PORT}"
    try:
        if config.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT,
                                      timeout=config.SMTP_TIMEOUT_SECONDS, context=_tls_context())
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=config.SMTP_TIMEOUT_SECONDS)
        with server:
            if config.SMTP_PORT != 465:
                server.ehlo()
                if server.has_extn("starttls"):
                    server.starttls(context=_tls_context())
                    server.ehlo()
                elif config.SMTP_USERNAME:
                    raise EmailSendError(
                        f"{target} does not offer STARTTLS; refusing to send the login unencrypted"
                    )
            if config.SMTP_USERNAME:
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            refused = server.send_message(msg)
    except EmailSendError:
        raise
    except smtplib.SMTPAuthenticationError as exc:
        raise EmailSendError(
            f"login to {target} was rejected ({_server_reply(exc)}). Check SMTP_USERNAME and SMTP_PASSWORD "
            f"(Gmail/Workspace needs an App Password, not the normal account password)"
        ) from exc
    except smtplib.SMTPSenderRefused as exc:
        raise EmailSendError(f"sender {mask_email(sender_email)} was refused ({_server_reply(exc)})") from exc
    except smtplib.SMTPRecipientsRefused as exc:
        reasons = "; ".join(f"{code} {str(text, 'utf-8', 'replace') if isinstance(text, bytes) else text}".strip()
                            for code, text in exc.recipients.values())
        raise EmailSendError(f"recipient {mask_email(to_email)} was refused ({reasons})"[:400]) from exc
    except smtplib.SMTPResponseException as exc:
        raise EmailSendError(f"{target} answered with an error ({_server_reply(exc)})") from exc
    except ssl.SSLError as exc:
        raise EmailSendError(f"TLS handshake with {target} failed: {exc}") from exc
    except (smtplib.SMTPException, OSError) as exc:  # connection refused/timeout, DNS failure, dropped connection
        raise EmailSendError(f"could not talk to {target}: {type(exc).__name__}: {exc}") from exc

    if refused:
        # send_message() only returns (instead of raising) when some recipients were accepted.
        if any(address.lower() == to_email.lower() for address in refused):
            raise EmailSendError(f"server refused the recipient: {refused}")
        logger.warning("Email delivered to %s, but the server refused %d CC/BCC address(es): %s",
                       mask_email(to_email), len(refused), ", ".join(mask_email(a) for a in refused))
    return msg["Message-ID"]


def send_email(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    attachments: Optional[Iterable[Attachment]] = None,
    cc: Optional[Iterable[str]] = None,
    bcc: Optional[Iterable[str]] = None,
) -> bool:
    """
    Sends an email (plain text + styled HTML with the logo, optional attachments) via SMTP. True only if the
    server accepted the To address. CC and BCC addresses are optional; BCC is never shown to other recipients.
    """
    if not to_email:
        logger.warning("Email not sent: no recipient address.")
        return False
    attachments = list(attachments or [])
    cc_list = _clean_addresses(cc, exclude=[to_email])
    bcc_list = _clean_addresses(bcc, exclude=[to_email, *cc_list])
    logger.info("Sending email via SMTP (%s:%s): from=%s to=%s cc=%d bcc=%d subject=%r body=%d chars attachments=%s",
                config.SMTP_HOST or "-", config.SMTP_PORT, mask_email(from_email or config.FROM_EMAIL),
                mask_email(to_email), len(cc_list), len(bcc_list), subject, len(body or ""),
                [name for name, _content, _mime in attachments] or "none")
    try:
        message_id = _send_with_smtp(to_email, subject, body, from_email, attachments, cc_list, bcc_list)
    except EmailConfigError as err:
        logger.warning("Email to %s NOT sent: %s", mask_email(to_email), err)
        return False
    except EmailSendError as err:
        logger.error("Email to %s FAILED: %s", mask_email(to_email), err)
        return False
    logger.info("Email accepted by the SMTP server: to=%s message_id=%s", mask_email(to_email), message_id)
    return True


# =============================================================================
# BREVO (DISABLED) - Brevo REST API sender, kept so it can be re-enabled later.
# To re-enable: comment out the SMTP section above (is_configured/_send_with_smtp/
# send_email and the helpers only they use), uncomment this block and the two Brevo
# imports near the top, uncomment the BREVO_* lines in config.py, and set BREVO_API_KEY
# plus a FROM_EMAIL that is a verified sender in Brevo.
# =============================================================================
#
# def is_configured() -> bool:
#     """True when a Brevo API key is set (the sender address is checked at send time)."""
#     return bool(config.BREVO_API_KEY)
#
#
# def _send_with_brevo(
#     to_email: str,
#     subject: str,
#     body: str,
#     from_email: Optional[str],
#     attachments: Optional[Iterable[Attachment]],
# ) -> Optional[str]:
#     """Sends one plain-text email through Brevo. Returns Brevo's message id."""
#     if not config.BREVO_API_KEY:
#         raise EmailConfigError("BREVO_API_KEY is not set")
#     sender_email = from_email or config.FROM_EMAIL
#     if not sender_email:
#         raise EmailConfigError(
#             "FROM_EMAIL is not set - it must be a sender verified in Brevo "
#             "(Senders, Domains & Dedicated IPs -> Senders)."
#         )
#
#     payload = {
#         "sender": {"email": sender_email, "name": config.FROM_NAME},
#         "to": [{"email": to_email}],
#         "subject": subject,
#         "textContent": body,
#     }
#     attachment_items = [
#         {"name": filename, "content": base64.b64encode(content).decode("ascii")}
#         for filename, content, _mime_type in attachments or []
#     ]
#     if attachment_items:
#         payload["attachment"] = attachment_items
#
#     try:
#         response = requests.post(
#             config.BREVO_API_URL,
#             json=payload,
#             headers={"api-key": config.BREVO_API_KEY, "accept": "application/json"},
#             timeout=config.BREVO_TIMEOUT_SECONDS,
#         )
#     except requests.RequestException as exc:
#         raise EmailSendError(f"Brevo could not be reached: {exc}") from exc
#
#     if response.status_code >= 400:
#         try:
#             detail = response.json().get("message", "")
#         except ValueError:
#             detail = response.text[:300]
#         raise EmailSendError(f"Brevo send failed: HTTP {response.status_code} - {detail}")
#
#     try:
#         return response.json().get("messageId")
#     except ValueError:
#         return None
#
#
# def send_email(
#     to_email: str,
#     subject: str,
#     body: str,
#     from_email: Optional[str] = None,
#     attachments: Optional[Iterable[Attachment]] = None,
# ) -> bool:
#     """Sends a plain-text email (with optional attachments) via Brevo. True only if Brevo accepted it."""
#     if not to_email:
#         logger.warning("Email not sent: no recipient address.")
#         return False
#     attachments = list(attachments or [])
#     logger.info("Sending email via Brevo: from=%s to=%s subject=%r body=%d chars attachments=%s",
#                 mask_email(from_email or config.FROM_EMAIL), mask_email(to_email),
#                 subject, len(body or ""), [name for name, _content, _mime in attachments] or "none")
#     try:
#         message_id = _send_with_brevo(to_email, subject, body, from_email, attachments)
#     except EmailConfigError as err:
#         logger.warning("Email to %s NOT sent: %s", mask_email(to_email), err)
#         return False
#     except EmailSendError as err:
#         logger.error("Email to %s FAILED: %s", mask_email(to_email), err)
#         return False
#     logger.info("Email accepted by Brevo: to=%s message_id=%s", mask_email(to_email), message_id)
#     return True


# =============================================================================
# Templates (unchanged; transport-independent)
# =============================================================================

def get_template(db: Session, template_id: str, category: str):
    """
    The stored template with this id, provided it is of this category; else the first one in
    this category; else None. The category check means a renumbered or reused id can never send
    the wrong kind of email (e.g. an interview invitation as a rejection).
    """
    from models.email_template import EmailTemplateModel

    template = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if template is None or template.category != category:
        template = db.query(EmailTemplateModel).filter(EmailTemplateModel.category == category).first()
    return template


def send_templated_email(
    db: Session,
    template_id: str,
    category: str,
    to_email: str,
    variables: Mapping[str, object],
    fallback_subject: str,
    fallback_body: str,
    attachments: Optional[Iterable[Attachment]] = None,
    cc: Optional[Iterable[str]] = None,
    bcc: Optional[Iterable[str]] = None,
) -> bool:
    """Renders the stored template (or the fallback text when it is missing) and sends it."""
    template = get_template(db, template_id, category)
    logger.info("Email template for %r: %s", category,
                f"stored template {template.id} ({template.name!r})" if template
                else "none stored, using the built-in text")
    subject = template.subject if template and template.subject else fallback_subject
    body = template.body if template and template.body else fallback_body
    return send_email(
        to_email=to_email,
        subject=render(subject, variables),
        body=render(body, variables),
        attachments=attachments,
        cc=cc,
        bcc=bcc,
    )


def send_rejection_email(
    db: Session,
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: Optional[str] = None,
    recruiter_name: Optional[str] = None,
) -> bool:
    """Sends the rejection template to one candidate."""
    return send_templated_email(
        db,
        REJECTION_TEMPLATE_ID,
        REJECTION_CATEGORY,
        to_email=candidate_email,
        variables={
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": company_name or config.COMPANY_NAME,
            "recruiter_name": recruiter_name or config.RECRUITER_NAME,
        },
        fallback_subject=REJECTION_SUBJECT,
        fallback_body=REJECTION_BODY,
    )
