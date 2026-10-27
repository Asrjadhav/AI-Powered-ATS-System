import datetime
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import or_

from database import SessionLocal
from models.email_template import EmailTemplateModel
from services.email_template_defaults import DEFAULT_TEMPLATES

# The wording lives in services/email_template_defaults.py (from the company's mail-format document).


def seed_email_templates():
    db = SessionLocal()
    try:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        added_count = 0

        for t_data in DEFAULT_TEMPLATES:
            # Skipped when a template with this id OR this category already exists, so renumbering the
            # ids in the database can never make startup insert a duplicate.
            existing = db.query(EmailTemplateModel).filter(
                or_(EmailTemplateModel.id == t_data["id"], EmailTemplateModel.category == t_data["category"])
            ).first()
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
