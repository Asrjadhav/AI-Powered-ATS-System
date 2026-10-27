import os

# Logging: LOG_LEVEL is DEBUG, INFO, WARNING or ERROR. LOG_FILE (optional) also writes
# a rotating log file, e.g. LOG_FILE=logs/backend.log. See logging_config.py.
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
LOG_FILE = os.environ.get("LOG_FILE", "")

# Centralized ATS Threshold
ATS_MATCH_THRESHOLD = int(os.environ.get("ATS_MATCH_THRESHOLD", "50"))

# Password hashing (PBKDF2-HMAC-SHA256, stdlib, no extra dependency).
# 260,000 iterations matches Django's current default and OWASP's 2023
# guidance for PBKDF2-SHA256.
#
# The iteration count is NOT stored per-user, only the salt is. Changing this
# value therefore invalidates every existing password hash at once (they were
# computed at the old iteration count), the same way changing the hashing
# scheme did in migration 006 — anyone with a hash set would need to reset.
# A future improvement would store the iteration count alongside each hash so
# it can be raised without a mass reset.
PASSWORD_HASH_ITERATIONS = int(os.environ.get("PASSWORD_HASH_ITERATIONS", "260000"))

# Gemini Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
# Model used for document understanding (job import, resume screening).
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
# Longest a resume-screening call to Gemini may take before the built-in scoring engine is used instead.
GEMINI_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT_SECONDS", "25"))
# Largest document upload accepted for AI job import.
MAX_IMPORT_FILE_BYTES = int(os.environ.get("MAX_IMPORT_FILE_BYTES", str(10 * 1024 * 1024)))

# Email Service Configuration
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "smtp").lower()
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@company.com")
# Display name shown on outgoing email: "FROM_NAME <FROM_EMAIL>".
FROM_NAME = os.environ.get("FROM_NAME", "Talent Acquisition")
# Values for the {{company_name}} / {{recruiter_name}} template variables.
COMPANY_NAME = os.environ.get("COMPANY_NAME", "EncureIT Systems Private Limited")
RECRUITER_NAME = os.environ.get("RECRUITER_NAME", "Talent Acquisition Team")
SMTP_TIMEOUT_SECONDS = int(os.environ.get("SMTP_TIMEOUT_SECONDS", "15"))

# Offer letter PDF (services/offer_letter_service.py). The letter is on the company letterhead
# (assets/offer_letterhead.png) and signed off by this person.
OFFER_LETTER_COMPANY = os.environ.get("OFFER_LETTER_COMPANY", "EncureIT Systems Pvt Ltd Pune")
OFFER_SIGNATORY_NAME = os.environ.get("OFFER_SIGNATORY_NAME", "Sunmit Baphna")
OFFER_SIGNATORY_TITLE = os.environ.get("OFFER_SIGNATORY_TITLE", "HR Director.")

# Brevo transactional email (DISABLED: SMTP is the active sender, see services/email_service.py).
# To re-enable Brevo, uncomment these lines and the Brevo section in email_service.py.
# FROM_EMAIL must be a sender verified in Brevo (Senders, Domains & Dedicated IPs -> Senders).
# BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
# BREVO_API_URL = os.environ.get("BREVO_API_URL", "https://api.brevo.com/v3/smtp/email")
# BREVO_TIMEOUT_SECONDS = int(os.environ.get("BREVO_TIMEOUT_SECONDS", "15"))

# Cloudflare Turnstile CAPTCHA
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")
TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

# Google Calendar / Meet (service account with domain-wide delegation).
# Provide the service-account key as EITHER a file path OR the raw JSON string.
GOOGLE_SERVICE_ACCOUNT_FILE = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "")
GOOGLE_SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")
# The Workspace user the service account impersonates; owns every interview event/Meet.
GOOGLE_CALENDAR_ORGANIZER_EMAIL = os.environ.get("GOOGLE_CALENDAR_ORGANIZER_EMAIL", "")
GOOGLE_CALENDAR_TIMEZONE = os.environ.get("GOOGLE_CALENDAR_TIMEZONE", "Asia/Kolkata")
# Interviews have no stored duration, so every event uses this length.
GOOGLE_MEET_DURATION_MINUTES = int(os.environ.get("GOOGLE_MEET_DURATION_MINUTES", "60"))
