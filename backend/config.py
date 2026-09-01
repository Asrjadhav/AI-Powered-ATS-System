import os

# Centralized ATS Threshold
ATS_MATCH_THRESHOLD = int(os.environ.get("ATS_MATCH_THRESHOLD", "70"))

# Email Service Configuration
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "smtp").lower()
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@company.com")
