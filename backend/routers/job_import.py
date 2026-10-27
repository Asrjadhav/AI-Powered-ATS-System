from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import config
import services.job_import_service as job_import_service
import services.job_service as job_service
from database import get_db
from schemas.job import JobCreate
from schemas.job_import import (
    JobImportConfirmRequest,
    JobImportConfirmResponse,
    JobImportParseResponse,
)
from services.document_service import DocumentExtractionError

router = APIRouter()


@router.post("/jobs/import", response_model=JobImportParseResponse)
async def parse_jobs_for_import(
    file: Optional[UploadFile] = File(
        None, description="Job description document: PDF, DOCX or TXT."
    ),
    content: Optional[str] = Form(
        None, description="Job description pasted as plain text, instead of a file."
    ),
):
    """
    Extracts structured job postings from an uploaded document or pasted text.

    The document is uploaded as multipart/form-data and read entirely on the
    server. A spreadsheet listing several roles yields one posting per role.
    Postings come back as drafts for review; nothing is saved by this call.
    """
    file_bytes: Optional[bytes] = None
    filename: Optional[str] = None

    if file is not None:
        file_bytes = await file.read()
        filename = file.filename
        if len(file_bytes) > config.MAX_IMPORT_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "The document is larger than "
                    f"{config.MAX_IMPORT_FILE_BYTES // (1024 * 1024)} MB."
                ),
            )

    if not file_bytes and not (content or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload a job description document, or paste the text.",
        )

    try:
        return job_import_service.parse_jobs_from_document(
            file_bytes=file_bytes,
            filename=filename,
            content=content,
        )
    except DocumentExtractionError as extraction_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(extraction_error)
        ) from extraction_error
    except job_import_service.JobImportError as import_error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(import_error)
        ) from import_error


@router.post("/jobs/import/confirm", response_model=JobImportConfirmResponse)
def confirm_job_import(
    payload: JobImportConfirmRequest,
    db: Session = Depends(get_db),
):
    """
    Saves the reviewed job postings.

    All postings are written in a single transaction: if any one fails, none
    are kept, so a partial import can never leave half the roles created.
    """
    if not payload.jobs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No job postings were supplied to save.",
        )

    # Validate every posting before writing any of them, so a malformed entry
    # is rejected without having created the ones before it.
    validated_jobs = []
    for index, raw_job in enumerate(payload.jobs):
        try:
            validated_jobs.append(JobCreate(**raw_job))
        except Exception as validation_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Job {index + 1} of {len(payload.jobs)} "
                    f"(\"{raw_job.get('title') or 'Untitled'}\") is not valid: "
                    f"{validation_error}. No jobs were saved."
                ),
            ) from validation_error

    # job_service.create_job commits each posting itself, so a later failure
    # cannot be undone with a rollback. Remove what was already written
    # instead, leaving the import all-or-nothing from the caller's view.
    created_jobs = []
    created_identifiers = []
    for index, job_in in enumerate(validated_jobs):
        try:
            created = job_service.create_job(db, job_in)
            created_dict = created if isinstance(created, dict) else dict(created.__dict__)
            created_jobs.append(created_dict)
            identifier = created_dict.get("id") or created_dict.get("jobId")
            if identifier:
                created_identifiers.append(identifier)
        except Exception as creation_error:
            db.rollback()
            for identifier in created_identifiers:
                try:
                    job_service.delete_job(db, identifier)
                except Exception:
                    # Reported below; the caller is told the import failed.
                    pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Could not save job {index + 1} of {len(validated_jobs)} "
                    f"(\"{job_in.title}\"): {creation_error}. No jobs were saved."
                ),
            ) from creation_error

    return JobImportConfirmResponse(
        success=True,
        created=len(created_jobs),
        jobs=[
            {key: value for key, value in job.items() if not key.startswith("_")}
            for job in created_jobs
        ],
    )
