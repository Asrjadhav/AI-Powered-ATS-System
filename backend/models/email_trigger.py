from sqlalchemy import Column, String, Boolean
from database import Base


class EmailTriggerModel(Base):
    """
    On/off switch for one automatic email (see services/email_trigger_service.py).

    A row exists only once someone has switched that trigger; a trigger without a row
    uses its built-in default.
    """
    __tablename__ = "email_triggers"

    event = Column(String, primary_key=True)  # e.g. "interview_scheduled"
    enabled = Column(Boolean, nullable=False, default=True)
    updatedAt = Column(String, nullable=True)
