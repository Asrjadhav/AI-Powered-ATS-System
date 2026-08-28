from pydantic import BaseModel
from typing import Optional, List

class EmailTemplateBase(BaseModel):
    id: Optional[str] = None
    name: str
    subject: str
    body: str
    category: Optional[str] = "General"
    variables: Optional[List[str]] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    variables: Optional[List[str]] = None

class EmailTemplateResponse(EmailTemplateBase):
    class Config:
        from_attributes = True
