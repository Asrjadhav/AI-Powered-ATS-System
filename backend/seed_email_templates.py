import datetime
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import SessionLocal
from models.email_template import EmailTemplateModel

DEFAULT_TEMPLATES = [
    {
        "id": "temp-001",
        "name": "Application Received Confirmation",
        "category": "Application Received",
        "subject": "Thank you for applying to {{company_name}} - {{job_title}}",
        "body": "Dear {{candidate_name}},\n\nThank you for submitting your application for the {{job_title}} position at {{company_name}}.\n\nOur hiring team has received your application and is currently reviewing your qualifications. If your profile matches our requirements, {{recruiter_name}} will reach out to schedule an initial interview.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}} Talent Acquisition Team",
        "variables": ["candidate_name", "job_title", "company_name", "recruiter_name"]
    },
    {
        "id": "temp-002",
        "name": "Resume Shortlisted Announcement",
        "category": "Resume Shortlisted",
        "subject": "Great News! Your application for {{job_title}} at {{company_name}} has been shortlisted",
        "body": "Hi {{candidate_name}},\n\nWe are pleased to inform you that your profile has been shortlisted for the {{job_title}} role at {{company_name}}!\n\nWe were impressed by your background and experience. We would like to move forward with the next stage of our recruitment process.\n\nPlease let us know your availability for a short discussion this week.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}}",
        "variables": ["candidate_name", "job_title", "company_name", "recruiter_name"]
    },
    {
        "id": "temp-003",
        "name": "Technical Interview Invitation",
        "category": "Interview Invitation",
        "subject": "Invitation for Technical Interview - {{job_title}} at {{company_name}}",
        "body": "Dear {{candidate_name}},\n\nYou are invited for a Technical Interview for the {{job_title}} position at {{company_name}}.\n\nInterview Details:\n- Date: {{interview_date}}\n- Time: {{interview_time}}\n- Mode: {{interview_mode}}\n- Meeting Link: {{meeting_link}}\n\nPlease confirm your availability by responding to this email.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}}",
        "variables": ["candidate_name", "job_title", "company_name", "recruiter_name", "interview_date", "interview_time", "interview_mode", "meeting_link"]
    },
    {
        "id": "temp-004",
        "name": "Official Job Offer Letter",
        "category": "Offer Letter",
        "subject": "Job Offer: {{job_title}} at {{company_name}}",
        "body": "Dear {{candidate_name}},\n\nOn behalf of {{company_name}}, I am delighted to extend an offer of employment for the role of {{job_title}} in our {{department}} department.\n\nOffer Overview:\n- Annual CTC: {{salary}}\n- Expected Joining Date: {{joining_date}}\n- Offer Decision Deadline: {{offer_expiry}}\n\nPlease find the attached formal offer letter for full details.\n\nWarm regards,\n{{recruiter_name}}\n{{company_name}}",
        "variables": ["candidate_name", "job_title", "department", "salary", "joining_date", "offer_expiry", "recruiter_name", "company_name"]
    },
    {
        "id": "temp-005",
        "name": "New Hire Day 1 Joining Instructions",
        "category": "Joining Instructions",
        "subject": "Welcome to {{company_name}}! Day 1 Joining Instructions for {{job_title}}",
        "body": "Dear {{candidate_name}},\n\nWe are thrilled to welcome you to {{company_name}}! Your joining date is confirmed for {{joining_date}}.\n\nWorkplace Details:\n- Location: {{office_location}}\n- Reporting Time: 09:30 AM IST\n\nInstructions:\nPlease carry your original photo ID and education certificates for HR onboarding verification.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}} Onboarding Team",
        "variables": ["candidate_name", "company_name", "job_title", "joining_date", "office_location", "recruiter_name"]
    },
    {
        "id": "temp-006",
        "name": "Candidate Application Rejection",
        "category": "Application Rejection",
        "subject": "Update on your application for {{job_title}} at {{company_name}}",
        "body": "Dear {{candidate_name}},\n\nThank you for applying for the {{job_title}} position at {{company_name}}.\n\nAfter reviewing your application against the requirements of the role, we will not be moving forward with your application at this time.\n\nWe appreciate your interest in {{company_name}} and wish you success in your job search.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}} Talent Acquisition Team",
        "variables": ["candidate_name", "job_title", "company_name", "recruiter_name"]
    }
]

def seed_email_templates():
    db = SessionLocal()
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        added_count = 0

        for t_data in DEFAULT_TEMPLATES:
            existing = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == t_data["id"]).first()
            if not existing:
                temp = EmailTemplateModel(
                    id=t_data["id"],
                    name=t_data["name"],
                    category=t_data["category"],
                    subject=t_data["subject"],
                    body=t_data["body"],
                    variables=t_data["variables"],
                    createdAt=now,
                    updatedAt=now
                )
                db.add(temp)
                added_count += 1

        db.commit()
        print(f"Seeded {added_count} system email template(s) into PostgreSQL 'email_templates' table!")

        print("\n=== POSTGRESQL EMAIL_TEMPLATES TABLE ===")
        temps = db.query(EmailTemplateModel).all()
        for t in temps:
            print(f"  - {t.id} | Name: {t.name} | Category: {t.category}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_email_templates()
