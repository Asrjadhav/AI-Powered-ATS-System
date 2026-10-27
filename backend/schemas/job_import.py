from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class JobRequirements(BaseModel):
    mustHave: List[str] = []
    goodToHave: List[str] = []
    softSkills: List[str] = []
    languages: List[str] = []


class ImportedJobPosting(BaseModel):
    """
    One job posting extracted from an uploaded document, ready for the
    recruiter to review before saving.

    Imported postings arrive as drafts. Nothing reaches the public careers page
    until a person has confirmed it.
    """
    title: str
    department: str = ""
    location: str = ""
    type: str = "Full-time"
    workMode: str = "Remote"
    status: str = "draft"
    description: str = ""
    responsibilities: List[str] = []
    requirements: JobRequirements = JobRequirements()
    requiredSkills: List[str] = []
    preferredSkills: List[str] = []
    benefits: List[str] = []
    experienceRange: str = ""
    experienceLevel: str = ""
    salaryRange: str = ""
    openings: int = 1
    deadline: str = ""
    targetJoiningDate: str = ""
    hiringManager: str = ""
    recruiter: str = ""


class JobImportParseResponse(BaseModel):
    success: bool = True
    data: List[ImportedJobPosting] = []
    warning: Optional[str] = None
    sourceFileName: Optional[str] = None
    # Characters of text extracted from the document, useful for diagnosing a
    # scanned PDF that yielded nothing.
    extractedCharacters: int = 0


class JobImportConfirmRequest(BaseModel):
    """Job postings the recruiter reviewed and chose to save."""
    jobs: List[Dict[str, Any]] = []


class JobImportConfirmResponse(BaseModel):
    success: bool = True
    created: int = 0
    jobs: List[Dict[str, Any]] = []
