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


class TemplateAIContext(BaseModel):
    candidateName: Optional[str] = None
    experience: Optional[str] = None
    skills: Optional[str] = None
    jobRole: Optional[str] = None
    department: Optional[str] = None
    interviewStatus: Optional[str] = None
    atsScore: Optional[str] = None
    offerStatus: Optional[str] = None
    recruiterName: Optional[str] = None
    companyName: Optional[str] = None


class TemplateAIRequest(BaseModel):
    """`action` is "generate" or one of the edit actions (shorten, expand, ...)."""
    action: str
    prompt: Optional[str] = None
    context: Optional[TemplateAIContext] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    targetLanguage: Optional[str] = None


class TemplateAIResponse(BaseModel):
    subject: str
    body: str
