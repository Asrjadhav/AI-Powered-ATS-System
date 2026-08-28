from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    id: Optional[str] = None
    email: str
    fullName: Optional[str] = None
    role: Optional[str] = "Recruiter"
    department: Optional[str] = None
    employeeId: Optional[str] = None
    avatarUrl: Optional[str] = None
    status: Optional[str] = "Active"
    lastLogin: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    fullName: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    avatarUrl: Optional[str] = None
    status: Optional[str] = None
    lastLogin: Optional[str] = None

class UserResponse(UserBase):
    class Config:
        from_attributes = True
