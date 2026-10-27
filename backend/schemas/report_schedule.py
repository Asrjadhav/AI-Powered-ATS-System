from typing import Optional

from pydantic import BaseModel


class ReportScheduleBase(BaseModel):
    id: Optional[str] = None
    frequency: str = "Weekly"
    format: str = "PDF"
    emails: str = ""
    department: Optional[str] = "All Departments"
    status: Optional[str] = "Active"
    lastSent: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None


class ReportScheduleCreate(ReportScheduleBase):
    pass


class ReportScheduleUpdate(BaseModel):
    frequency: Optional[str] = None
    format: Optional[str] = None
    emails: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    lastSent: Optional[str] = None


class ReportScheduleResponse(ReportScheduleBase):
    class Config:
        from_attributes = True
