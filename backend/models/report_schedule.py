from sqlalchemy import Column, String
from database import Base


class ReportScheduleModel(Base):
    """
    A recurring report configuration: how often, in what format, to whom.

    This table stores the schedule only. Nothing currently sends a report on
    it — there is no scheduler wired up yet, so lastSent stays "Never" until
    that is built. Persisting the schedule here at least makes it shared
    across devices instead of living in one browser's localStorage.
    """
    __tablename__ = "report_schedules"

    id = Column(String, primary_key=True, index=True)
    frequency = Column(String, nullable=False, default="Weekly")
    format = Column(String, nullable=False, default="PDF")
    # Comma-separated recipient list, matching how the UI collects it today.
    emails = Column(String, nullable=False, default="")
    department = Column(String, nullable=True, default="All Departments")
    status = Column(String, nullable=True, default="Active")
    lastSent = Column(String, nullable=True, default="Never")
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)
    createdBy = Column(String, nullable=True)
