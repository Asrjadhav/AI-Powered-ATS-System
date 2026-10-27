"""
The wording of the four email templates (Email Templates page), taken from the company's
"ATS Mail Format" reference document.

These are used in two places: the startup seed that creates the templates when they are missing,
and as the built-in text when a stored template cannot be found. Once a template is stored in the
database, HR edits it there and the stored text wins.

Placeholders ({{name}}) are filled by services/email_service.render() from services/email_variables.py.
The ***bold italic***, **bold** and [[label|link]] markup is turned into the styled HTML email (with
the company logo) by services/email_html.py, which also writes the plain-text version without it.
"""

# The signature the company uses on every email.
HR_SIGNATURE_INTERVIEW = "\n".join([
    "**Yogesh Adsul**",
    "HR Generalist",
    "+91 8855 825 770",
    "Office No 1, 2nd Floor, Raghunath Building, Market yard, Gultekdi,",
    "Pune - 411037, (MH) INDIA",
    "www.encureit.com",
])
HR_SIGNATURE = "\n".join([
    "Yogesh Adsul,",
    "HR Generalist",
    "[[+91 8855825770|tel:+918855825770]]",
    "EncureIT Systems Pvt Ltd,",
    "Pune - 411037, (MH) INDIA",
    "www.encureit.com",
])

# ---------------------------------------------------------------- Interview Invitation
INTERVIEW_TEMPLATE_ID = "temp-001"
INTERVIEW_CATEGORY = "Interview Invitation"
INTERVIEW_NAME = "Technical Interview Invitation"
INTERVIEW_SUBJECT = "{{interview_round}} | {{job_title}} | {{interview_date_subject}} at {{interview_time}}"
INTERVIEW_BODY = "\n\n".join([
    "Dear {{candidate_first_name}},",
    "***Greetings from EncureIT Systems!!***",
    "As per our discussion, we are pleased to invite you for the {{interview_round_phrase}} for the "
    "position of **{{job_title}}.**",
    "**The interview is scheduled as follows:**\n"
    "**Date:** {{interview_date}}\n"
    "**Time:** {{interview_time}}\n"
    "**Mode:** {{interview_mode}}\n"
    "**{{joining_label}}: {{joining_details}}**",
    "We request you to confirm your availability by replying to this email and ensure you have a stable "
    "internet connection at the time of the interview. If you have any queries or require further "
    "information, feel free to reach out.",
    "We look forward to connecting with you and wish you all the best for the interview.",
    HR_SIGNATURE_INTERVIEW,
])
INTERVIEW_VARIABLES = ["candidate_first_name", "candidate_name", "job_title", "interview_round",
                       "interview_round_phrase", "interview_date", "interview_date_subject", "interview_time",
                       "interview_mode", "joining_label", "joining_details", "meeting_link", "company_name"]

# ---------------------------------------------------------------- Offer Letter
OFFER_TEMPLATE_ID = "temp-002"
OFFER_CATEGORY = "Offer Letter"
OFFER_NAME = "Official Job Offer Letter"
OFFER_SUBJECT = "Offer Letter | {{candidate_name}} | EncureIT Systems Pvt Ltd."
OFFER_BODY = "\n\n".join([
    "Dear {{candidate_first_name}},",
    "**Congratulations on receiving an offer from EncureIT Systems Pvt Ltd.!**",
    "Please find your offer letter attached. The detailed appointment letter will be provided on your "
    "joining date.",
    "We are confident that you will make valuable contributions to our organization, and we look forward "
    "to welcoming you on **{{joining_date}}.**",
    "Kindly reply to this email with your acceptance and share a signed copy (digital signature also "
    "acceptable) of the offer letter by tomorrow EOD.",
    HR_SIGNATURE,
])
OFFER_VARIABLES = ["candidate_first_name", "candidate_name", "job_title", "joining_date", "offer_expiry",
                   "salary", "company_name"]

# ---------------------------------------------------------------- Rejection Email
REJECTION_TEMPLATE_ID = "temp-003"
REJECTION_CATEGORY = "Rejection Email"
REJECTION_NAME = "Candidate Application Rejection"
REJECTION_SUBJECT = "Update on Your Application – {{company_name}}"
REJECTION_BODY = "\n\n".join([
    "Dear {{candidate_name}},",
    "Thank you for your interest in the {{job_title}} position at {{company_name}} and for taking the time "
    "to participate in our recruitment process.",
    "After careful consideration, we regret to inform you that we will not be proceeding with your "
    "application for this position at this time.",
    "We appreciate your interest in joining our organization and the effort you have invested in the "
    "interview process. We encourage you to apply for future opportunities that match your skills and "
    "experience.",
    "We wish you all the best in your future career endeavors.",
    "Regards,\n\n" + HR_SIGNATURE,
])
REJECTION_VARIABLES = ["candidate_name", "job_title", "company_name"]

# ---------------------------------------------------------------- Welcome Email (unchanged)
WELCOME_TEMPLATE_ID = "temp-004"
WELCOME_CATEGORY = "Welcome Email"
WELCOME_NAME = "Welcome Email"
WELCOME_SUBJECT = "Welcome to {{company_name}}, {{candidate_name}}!"
WELCOME_BODY = (
    "Dear {{candidate_name}},\n\n"
    "Welcome to {{company_name}}! We are delighted to have you join us as {{job_title}} in the {{department}} team.\n\n"
    "Our team will share your onboarding details and joining formalities shortly. In the meantime, "
    "if you have any questions, please reply to this email.\n\n"
    "We look forward to working with you.\n\n"
    "Warm regards,\n{{recruiter_name}}\n{{company_name}}"
)
WELCOME_VARIABLES = ["candidate_name", "job_title", "department", "company_name", "recruiter_name"]


DEFAULT_TEMPLATES = [
    {"id": INTERVIEW_TEMPLATE_ID, "name": INTERVIEW_NAME, "category": INTERVIEW_CATEGORY,
     "subject": INTERVIEW_SUBJECT, "body": INTERVIEW_BODY, "variables": INTERVIEW_VARIABLES},
    {"id": OFFER_TEMPLATE_ID, "name": OFFER_NAME, "category": OFFER_CATEGORY,
     "subject": OFFER_SUBJECT, "body": OFFER_BODY, "variables": OFFER_VARIABLES},
    {"id": REJECTION_TEMPLATE_ID, "name": REJECTION_NAME, "category": REJECTION_CATEGORY,
     "subject": REJECTION_SUBJECT, "body": REJECTION_BODY, "variables": REJECTION_VARIABLES},
    {"id": WELCOME_TEMPLATE_ID, "name": WELCOME_NAME, "category": WELCOME_CATEGORY,
     "subject": WELCOME_SUBJECT, "body": WELCOME_BODY, "variables": WELCOME_VARIABLES},
]
