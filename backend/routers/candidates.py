from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse
import services.candidate_service as candidate_service

router = APIRouter()

@router.get("/candidates", response_model=List[CandidateResponse])
def read_candidates(
    search: Optional[str] = Query(None, description="Search candidates by name, email, candidateId, or role"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all candidates with optional search filtering.
    """
    return candidate_service.get_candidates(db, search=search)

@router.get("/candidates/{id}", response_model=CandidateResponse)
def read_candidate(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve a specific candidate by internal primary key 'id' OR human-readable 'candidateId'.
    """
    candidate = candidate_service.get_candidate_by_id_or_candidate_id(db, identifier=id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )
    return candidate

@router.post("/candidates", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
def create_candidate(
    candidate_in: CandidateCreate,
    job_id: Optional[str] = Query(None, alias="jobId"),
    db: Session = Depends(get_db)
):
    """
    Create a new candidate profile or re-use existing profile when applying for a different role.
    """
    return candidate_service.create_candidate(db, candidate_in=candidate_in, target_job_id=job_id)

@router.put("/candidates/{id}", response_model=CandidateResponse)
@router.patch("/candidates/{id}", response_model=CandidateResponse)
def update_candidate(
    id: str,
    updates: CandidateUpdate,
    db: Session = Depends(get_db)
):
    """
    Update candidate profile details.
    """
    updated = candidate_service.update_candidate(db, identifier=id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )
    return updated

@router.delete("/candidates/{id}", status_code=status.HTTP_200_OK)
def delete_candidate(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a candidate profile safely without cascading deletes to application history.
    """
    success = candidate_service.delete_candidate(db, identifier=id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )
    return {"success": True, "id": id}

@router.post("/candidates/{id}/resume", response_model=CandidateResponse)
async def upload_candidate_resume(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload candidate resume document (PDF, DOC, DOCX up to 10MB).
    """
    contents = await file.read()
    filename = file.filename or "resume.pdf"
    content_type = file.content_type
    return candidate_service.upload_candidate_resume(
        db=db,
        identifier=id,
        file_bytes=contents,
        original_filename=filename,
        content_type=content_type
    )

@router.get("/candidates/{id}/resume")
def get_candidate_resume(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Download/view candidate resume document.
    """
    file_path, download_name, media_type = candidate_service.get_candidate_resume_file(db, identifier=id)
    return FileResponse(
        path=file_path,
        media_type=media_type,
        content_disposition_type="inline",
        headers={"Content-Disposition": f'inline; filename="{download_name}"'}
    )

@router.get("/candidates/{id}/resume/text")
def get_candidate_resume_text(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Get extracted text from candidate's resume document.
    """
    return candidate_service.get_candidate_resume_text(db, identifier=id)

@router.delete("/candidates/{id}/resume", response_model=CandidateResponse)
def delete_candidate_resume(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Delete candidate resume file from disk and clear PostgreSQL metadata while preserving candidate profile.
    """
    return candidate_service.delete_candidate_resume(db, identifier=id)

class ResumeParseRequest(BaseModel):
    fileData: Optional[str] = None
    fileName: Optional[str] = None
    content: Optional[str] = None

@router.post("/candidates/parse-resume")
def parse_candidate_resume(payload: ResumeParseRequest):
    """
    Zero-mock document text parser for candidate CV upload.
    """
    file_bytes = None
    if payload.fileData:
        try:
            import base64
            file_bytes = base64.b64decode(payload.fileData)
        except Exception:
            pass

    return candidate_service.parse_resume_document(
        file_bytes=file_bytes,
        filename=payload.fileName,
        raw_content=payload.content
    )

