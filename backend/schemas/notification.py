from pydantic import BaseModel
from typing import Optional

class NotificationBase(BaseModel):
    id: Optional[str] = None
    userId: Optional[str] = None
    title: str
    message: Optional[str] = None
    type: Optional[str] = "info"
    isRead: Optional[bool] = False
    candidateName: Optional[str] = None
    jobTitle: Optional[str] = None
    createdAt: Optional[str] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    isRead: Optional[bool] = None

class NotificationResponse(NotificationBase):
    class Config:
        from_attributes = True
