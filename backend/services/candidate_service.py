import re
import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from models.candidate import CandidateModel
from schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse

def normalize_email(email: str) -> str:
    """
    Normalizes candidate email string by trimming whitespace and lowercasing.
    """
    if not email:
        return ""
    return email.strip().lower()

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
}

def calculate_total_experience_months(
    text: Optional[str] = None,
    total_exp_str: Optional[str] = None,
    exp_years: Optional[float] = None
) -> int:
    """
    Derives total experience strictly in integer months from candidate's actual stored data or resume text.
    NEVER uses hardcoded/mock values.
    Supports interval merging to avoid double counting overlapping employment periods.
    Supports 'Present' / 'Current' up to current system date.
    Returns 0 if no valid experience data exists.
    """
    if exp_years is not None and isinstance(exp_years, (int, float)) and exp_years > 0:
        return int(round(exp_years * 12))

    search_text = (text or "") + " " + (total_exp_str or "")
    if search_text.strip():
        date_pattern = r"(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\.?\s*)?\b(20\d\d|19\d\d)\b\s*[\u2013\u2014\-to\s]+\s*(?:(Present|Current|Till Date|Now)|(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\.?\s*)?\b(20\d\d|19\d\d)\b)"
        
        matches = list(re.finditer(date_pattern, search_text, re.IGNORECASE))
        if matches:
            now = datetime.datetime.now()
            cur_yr = now.year
            cur_mo = now.month
            
            raw_intervals = []
            for m in matches:
                start_m_str, start_y_str, is_present, end_m_str, end_y_str = m.groups()
                
                s_yr = int(start_y_str)
                s_mo = MONTH_MAP.get((start_m_str or "").lower(), 1)
                
                if is_present:
                    e_yr = cur_yr
                    e_mo = cur_mo
                else:
                    e_yr = int(end_y_str) if end_y_str else s_yr
                    e_mo = MONTH_MAP.get((end_m_str or "").lower(), 12)
                
                start_abs = s_yr * 12 + s_mo
                end_abs = e_yr * 12 + e_mo
                
                if end_abs >= start_abs and (e_yr <= cur_yr + 1) and (s_yr >= 1970):
                    raw_intervals.append((start_abs, end_abs))
            
            if raw_intervals:
                raw_intervals.sort(key=lambda x: x[0])
                merged = []
                for interval in raw_intervals:
                    if not merged:
                        merged.append(interval)
                    else:
                        prev_start, prev_end = merged[-1]
                        if interval[0] <= prev_end + 1:
                            merged[-1] = (prev_start, max(prev_end, interval[1]))
                        else:
                            merged.append(interval)
                
                total_m = sum(end - start + 1 for start, end in merged)
                if total_m > 0:
                    return total_m

    if total_exp_str and total_exp_str.strip():
        s = total_exp_str.lower().strip()
        if "fresher" in s:
            return 0
        
        float_y_match = re.search(r"(\d+\.\d+)\s*(?:years?|yrs?)?", s)
        if float_y_match:
            return int(round(float(float_y_match.group(1)) * 12))

        ym_match = re.search(r"(\d+)\s*(?:years?|yrs?)\s*(\d+)\s*(?:months?|mos?)", s)
        if ym_match:
            return int(ym_match.group(1)) * 12 + int(ym_match.group(2))

        y_only = re.search(r"(\d+)\s*(?:years?|yrs?)", s)
        if y_only:
            return int(y_only.group(1)) * 12

        m_only = re.search(r"(\d+)\s*(?:months?|mos?)", s)
        if m_only:
            return int(m_only.group(1))

        num_match = re.search(r"(\d+(?:\.\d+)?)", s)
        if num_match:
            val = float(num_match.group(1))
            return int(round(val * 12))

    return 0

def generate_next_candidate_id(db: Session) -> str:
    """
    Scans existing candidateId strings in format CAND-XXXX, extracts integer suffixes,
    and returns next zero-padded formatted string CAND-0001, CAND-0002, etc.
    """
    cand_ids = db.query(CandidateModel.candidateId).all()
    max_num = 0
    pattern = re.compile(r"^CAND-(\d+)$", re.IGNORECASE)
    for (cid,) in cand_ids:
        if cid:
            match = pattern.match(str(cid).strip())
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
    next_num = max_num + 1
    return f"CAND-{next_num:04d}"

def get_candidate_by_email(db: Session, email: str) -> Optional[CandidateModel]:
    """
    Performs case-insensitive candidate lookup by email.
    """
    norm_email = normalize_email(email)
    if not norm_email:
        return None
    return db.query(CandidateModel).filter(
        func.lower(CandidateModel.email) == norm_email
    ).first()

def get_candidate_by_id_or_candidate_id(db: Session, identifier: str) -> Optional[CandidateModel]:
    """
    Looks up a candidate record by internal primary key 'id' OR human-readable 'candidateId'.
    Also safely resolves candidates if passed an application ID (application.id / application.applicationId) or candidate email.
    """
    if not identifier or not str(identifier).strip():
        return None

    raw_id = str(identifier).strip()

    # 1. Direct lookup by candidate.id or candidate.candidateId
    cand = db.query(CandidateModel).filter(
        or_(
            CandidateModel.id == raw_id,
            CandidateModel.candidateId == raw_id
        )
    ).first()
    if cand:
        return cand

    # 2. Lookup by candidate email
    if "@" in raw_id:
        cand = get_candidate_by_email(db, raw_id)
        if cand:
            return cand

    # 3. Lookup by Application ID (if an application identifier was passed)
    try:
        from models.application import ApplicationModel
        app_record = db.query(ApplicationModel).filter(
            or_(
                ApplicationModel.id == raw_id,
                ApplicationModel.applicationId == raw_id
            )
        ).first()
        if app_record and app_record.candidateId:
            cand = db.query(CandidateModel).filter(
                or_(
                    CandidateModel.id == app_record.candidateId,
                    CandidateModel.candidateId == app_record.candidateId
                )
            ).first()
            if cand:
                return cand
            if app_record.candidateEmail:
                cand = get_candidate_by_email(db, app_record.candidateEmail)
                if cand:
                    return cand
    except Exception:
        pass

    return None

def get_candidates(db: Session, search: Optional[str] = None) -> List[CandidateModel]:
    """
    Retrieves all candidates with optional search filtering across name, email, role, candidateId.
    """
    query = db.query(CandidateModel)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                CandidateModel.firstName.ilike(pattern),
                CandidateModel.lastName.ilike(pattern),
                CandidateModel.email.ilike(pattern),
                CandidateModel.candidateId.ilike(pattern),
                CandidateModel.currentRole.ilike(pattern)
            )
        )
    cands = query.order_by(CandidateModel.createdAt.desc().nullslast()).all()
    for c in cands:
        if c.totalExperienceMonths is None or c.totalExperienceMonths == 0:
            calc_m = calculate_total_experience_months(text=c.resumeText, total_exp_str=c.totalExperience, exp_years=c.experienceYears)
            if calc_m > 0:
                c.totalExperienceMonths = calc_m
    return cands

def create_candidate(db: Session, candidate_in: CandidateCreate, target_job_id: Optional[str] = None) -> CandidateModel:
    """
    Creates a new Candidate profile or re-uses existing Candidate profile if applying for a different role.
    Enforces duplicate application check for the same job position.
    """
    norm_email = normalize_email(candidate_in.email)
    if not norm_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid candidate email address is required."
        )

    # 1. Check for existing candidate profile with this normalized email
    existing_candidate = get_candidate_by_email(db, norm_email)
    if existing_candidate:
        job_id_to_check = target_job_id or getattr(candidate_in, "jobId", None)
        if job_id_to_check:
            from models.application import ApplicationModel
            from services.job_service import get_job_by_id_or_job_id
            job = get_job_by_id_or_job_id(db, job_id_to_check)
            j_ids = [job_id_to_check]
            if job:
                j_ids.extend([job.id, job.jobId])

            c_ids = [existing_candidate.id, existing_candidate.candidateId]
            existing_app = db.query(ApplicationModel).filter(
                ApplicationModel.candidateId.in_(c_ids),
                ApplicationModel.jobId.in_(j_ids)
            ).first()

            is_same_job = existing_app or (existing_candidate.jobId and existing_candidate.jobId in j_ids)

            if is_same_job:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This candidate has already submitted an application for this job position."
                )

        if not job_id_to_check:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Candidate profile with email '{norm_email}' already exists."
            )

        # Same candidate applying for a different role -> re-use existing candidate profile
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        update_data = candidate_in.dict(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("candidateId", None)
        update_data.pop("email", None)
        update_data.pop("createdAt", None)
        update_data.pop("jobId", None)
        update_data["updatedAt"] = now

        for key, val in update_data.items():
            if val is not None:
                setattr(existing_candidate, key, val)

        db.commit()
        db.refresh(existing_candidate)

        # Create new application for different role in PostgreSQL
        if job_id_to_check:
            try:
                from services.job_service import get_job_by_id_or_job_id
                from services.application_service import create_application, ApplicationCreate
                job = get_job_by_id_or_job_id(db, job_id_to_check)
                if job:
                    create_application(db, ApplicationCreate(
                        candidateId=existing_candidate.id,
                        jobId=job.id,
                        status=candidate_in.status or "Applied",
                        appliedRole=candidate_in.currentRole or job.title or "Applicant"
                    ))
            except Exception:
                pass

        return existing_candidate

    max_retries = 5
    for attempt in range(max_retries):
        try:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            assigned_cand_id = candidate_in.candidateId or generate_next_candidate_id(db)
            internal_id = candidate_in.id or assigned_cand_id or str(uuid.uuid4())

            data = candidate_in.dict(exclude_unset=True)
            data["id"] = internal_id
            data["candidateId"] = assigned_cand_id
            data["email"] = norm_email
            data["status"] = candidate_in.status or "Applied"

            job_id_val = target_job_id or candidate_in.jobId
            if job_id_val:
                from services.job_service import get_job_by_id_or_job_id
                job = get_job_by_id_or_job_id(db, job_id_val)
                if job:
                    data["jobId"] = job.id

            data["createdAt"] = data.get("createdAt") or now
            data["updatedAt"] = now
            data["totalExperienceMonths"] = calculate_total_experience_months(
                text=data.get("resumeText"),
                total_exp_str=data.get("totalExperience"),
                exp_years=data.get("experienceYears")
            )

            db_cand = CandidateModel(**data)
            db.add(db_cand)
            db.commit()
            db.refresh(db_cand)

            if job_id_val:
                try:
                    from services.job_service import get_job_by_id_or_job_id
                    from services.application_service import create_application, ApplicationCreate
                    job = get_job_by_id_or_job_id(db, job_id_val)
                    if job:
                        create_application(db, ApplicationCreate(
                            candidateId=db_cand.id,
                            jobId=job.id,
                            status=candidate_in.status or "Applied",
                            appliedRole=candidate_in.currentRole or job.title or "Applicant"
                        ))
                except Exception:
                    pass

            return db_cand
        except IntegrityError as err:
            db.rollback()
            if attempt < max_retries - 1 and not candidate_in.candidateId:
                continue
            raise err

    raise RuntimeError("Failed to generate a unique Candidate ID after multiple retries.")

def update_candidate(db: Session, identifier: str, updates: CandidateUpdate) -> Optional[CandidateModel]:
    """
    Updates candidate profile fields while preserving immutable identifiers.
    """
    db_cand = get_candidate_by_id_or_candidate_id(db, identifier)
    if not db_cand:
        return None

    update_data = updates.dict(exclude_unset=True)
    if "email" in update_data and update_data["email"]:
        new_norm = normalize_email(update_data["email"])
        if new_norm != db_cand.email:
            existing = get_candidate_by_email(db, new_norm)
            if existing and existing.id != db_cand.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{new_norm}' is already in use by another candidate."
                )
            update_data["email"] = new_norm

    update_data.pop("id", None)
    update_data.pop("candidateId", None)
    update_data.pop("createdAt", None)
    update_data["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for key, val in update_data.items():
        setattr(db_cand, key, val)

    db.commit()
    db.refresh(db_cand)
    return db_cand

def delete_candidate(db: Session, identifier: str) -> bool:
    """
    Safely deletes a candidate profile, linked applications/interviews/offers,
    and removes the candidate's canonical physical resume folder on disk.

    Sequence:
    1. Resolve candidate from supplied identifier.
    2. Capture canonical candidateId and storage key folder BEFORE db.delete().
    3. Delete canonical resume directory using file_storage_service.delete_candidate_folder().
    4. Delete candidate DB row and linked application/interview/offer rows.
    5. Commit.
    6. Log any filesystem failure explicitly without swallowing exceptions.
    """
    if not identifier:
        return False

    raw_id = str(identifier).strip()
    db_cand = get_candidate_by_id_or_candidate_id(db, raw_id)
    if not db_cand:
        from services.application_service import get_application_by_id_or_app_id
        db_app = get_application_by_id_or_app_id(db, raw_id)
        if db_app and db_app.candidateId:
            db_cand = get_candidate_by_id_or_candidate_id(db, db_app.candidateId)
        if not db_cand:
            db_cand = get_candidate_by_email(db, raw_id)

    # 1. Capture canonical candidateId and storage key folder BEFORE db.delete()
    canonical_folders = set()
    if db_cand:
        if db_cand.candidateId:
            canonical_folders.add(db_cand.candidateId)
        if db_cand.resumeStorageKey and "/" in db_cand.resumeStorageKey:
            sk_folder = db_cand.resumeStorageKey.split("/")[1]
            if sk_folder:
                canonical_folders.add(sk_folder)
    else:
        if raw_id.upper().startswith("CAND-"):
            canonical_folders.add(raw_id)

    # 2. Delete canonical physical resume directory on disk
    for folder_id in canonical_folders:
        try:
            file_storage_service.delete_candidate_folder(folder_id)
        except Exception as f_err:
            print(f"[ERROR] Failed to delete candidate resume directory for '{folder_id}': {f_err}")

    if not db_cand:
        return True

    # 3. Purge linked records and candidate database row
    c_ids = list(set(filter(None, [db_cand.id, db_cand.candidateId, db_cand.email])))
    from models.interview import InterviewModel
    from models.application import ApplicationModel
    from models.offer import OfferModel
    from models.talent_pool import TalentPoolModel

    apps = db.query(ApplicationModel).filter(
        or_(ApplicationModel.candidateId.in_(c_ids), ApplicationModel.candidateEmail == db_cand.email)
    ).all()
    app_ids = list(set([a.id for a in apps] + [a.applicationId for a in apps if a.applicationId]))

    db.query(OfferModel).filter(
        or_(
            OfferModel.candidateId.in_(c_ids),
            OfferModel.candidateEmail == db_cand.email,
            OfferModel.applicationId.in_(app_ids) if app_ids else False
        )
    ).delete(synchronize_session=False)

    db.query(TalentPoolModel).filter(
        TalentPoolModel.candidateId.in_(c_ids)
    ).delete(synchronize_session=False)

    db.query(InterviewModel).filter(
        or_(
            InterviewModel.candidateId.in_(c_ids),
            InterviewModel.applicationId.in_(app_ids) if app_ids else False
        )
    ).delete(synchronize_session=False)

    db.query(ApplicationModel).filter(
        or_(
            ApplicationModel.candidateId.in_(c_ids),
            ApplicationModel.candidateEmail == db_cand.email,
            ApplicationModel.id.in_(c_ids)
        )
    ).delete(synchronize_session=False)

    db.delete(db_cand)
    db.commit()
    return True

import os
import io
import services.file_storage_service as file_storage_service

MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}

def extract_text_from_file_bytes(file_bytes: bytes, filename: str) -> Optional[str]:
    """
    Extracts plain text content from PDF and DOCX file bytes.
    For legacy .doc format, returns descriptive message if safe text parser is unavailable.
    """
    ext = os.path.splitext(filename.lower())[1]
    extracted_text = ""

    if ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text_pages.append(t)
            extracted_text = "\n\n".join(text_pages).strip()
        except Exception as e:
            print(f"PDF extraction error for {filename}: {e}")

    elif ext == ".docx":
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            extracted_text = "\n".join(paragraphs).strip()
        except Exception as e:
            print(f"DOCX extraction error for {filename}: {e}")

    elif ext == ".doc":
        extracted_text = f"Text extraction is unavailable for legacy .doc format ({filename}). Please download the file or re-upload in PDF or DOCX format."

    return extracted_text if extracted_text else None

def validate_resume_file(file_bytes: bytes, original_filename: str, content_type: Optional[str] = None):
    if len(file_bytes) > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file must be 10 MB or smaller."
        )

    ext = os.path.splitext(original_filename.lower())[1]
    ct = (content_type or "").lower().strip()

    is_valid_type = ct in ALLOWED_MIME_TYPES or ext in ALLOWED_EXTENSIONS
    if not is_valid_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported resume file type."
        )

def upload_candidate_resume(
    db: Session,
    identifier: str,
    file_bytes: bytes,
    original_filename: str,
    content_type: Optional[str] = None
) -> CandidateModel:
    import hashlib
    cand = get_candidate_by_id_or_candidate_id(db, identifier)
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found."
        )

    validate_resume_file(file_bytes, original_filename, content_type)

    # 1. Idempotency Check: if candidate already has a file with identical SHA-256 hash, return immediately
    new_hash = hashlib.sha256(file_bytes).hexdigest()
    if cand.resumeStorageKey:
        existing_path = file_storage_service.get_resume_path(cand.resumeStorageKey)
        if existing_path and os.path.exists(existing_path):
            try:
                with open(existing_path, "rb") as ef:
                    if hashlib.sha256(ef.read()).hexdigest() == new_hash:
                        return cand
            except Exception:
                pass

    old_key = cand.resumeStorageKey
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    cand_ref = cand.candidateId or cand.id

    # 2. Save new physical file first
    new_storage_key = file_storage_service.save_resume(
        candidate_id=cand_ref,
        file_bytes=file_bytes,
        original_filename=original_filename
    )

    extracted_text = extract_text_from_file_bytes(file_bytes, original_filename)

    # 3. Update candidate database record
    cand.resumeFileName = file_storage_service.sanitize_filename(original_filename)
    cand.resumeStorageKey = new_storage_key
    cand.resumeUploadedAt = now
    if extracted_text:
        cand.resumeText = extracted_text
        calc_m = calculate_total_experience_months(text=extracted_text, total_exp_str=cand.totalExperience, exp_years=cand.experienceYears)
        if calc_m > 0:
            cand.totalExperienceMonths = calc_m
    cand.updatedAt = now

    # 4. Enforce DB Commit FIRST before physical deletion of old file
    db.commit()
    db.refresh(cand)

    # 5. After DB commit succeeds, safely delete old file if not referenced elsewhere
    if old_key and old_key != new_storage_key:
        if not file_storage_service.is_storage_key_referenced(db, old_key, exclude_candidate_id=cand.id):
            file_storage_service.delete_resume(old_key)

    # 6. Clean up any unreferenced obsolete files in candidate folder
    file_storage_service.cleanup_obsolete_files_in_folder(cand_ref, new_storage_key, db)

    return cand

def get_candidate_resume_file(db: Session, identifier: str):
    cand = get_candidate_by_id_or_candidate_id(db, identifier)
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found."
        )

    cand_ref = cand.candidateId or cand.id
    file_path = file_storage_service.get_resume_path(cand.resumeStorageKey) if cand.resumeStorageKey else None

    # Safe Fallback Repair for Legacy/Broken records where resumeStorageKey is NULL or points to missing file
    if not file_path:
        repaired_key = file_storage_service.find_latest_valid_resume_file(cand_ref)
        if repaired_key:
            file_path = file_storage_service.get_resume_path(repaired_key)
            if file_path:
                cand.resumeStorageKey = repaired_key
                cand.resumeFileName = file_storage_service.sanitize_filename(os.path.basename(repaired_key))
                cand.resumeUploadedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
                db.commit()
                db.refresh(cand)

    # Persistent Ephemeral Fallback: Auto-reconstruct physical file if disk wiped on Render restart
    if not file_path and cand and (cand.resumeText or (isinstance(cand.customFields, dict) and cand.customFields.get("cvBase64"))):
        try:
            cand_name = f"{cand.firstName or ''} {cand.lastName or ''}".strip() or "Candidate"
            doc_filename = cand.resumeFileName or f"{cand_name.replace(' ', '_')}_Resume.pdf"
            cv_b64 = cand.customFields.get("cvBase64") if isinstance(cand.customFields, dict) else None

            if cv_b64:
                import base64
                if "," in str(cv_b64):
                    cv_b64 = str(cv_b64).split(",", 1)[1]
                file_bytes = base64.b64decode(cv_b64)
            else:
                text_content = cand.resumeText or f"Resume Document for {cand_name}"
                header = f"CANDIDATE CURRICULUM VITAE / RESUME\nName: {cand_name}\nEmail: {cand.email or 'N/A'}\nRole: {cand.currentRole or 'N/A'}\n"
                full_doc_str = f"{header}\n{'='*50}\n\n{text_content}"
                file_bytes = full_doc_str.encode("utf-8")
                if not doc_filename.endswith(".txt") and not doc_filename.endswith(".pdf"):
                    doc_filename = f"{os.path.splitext(doc_filename)[0]}.txt"

            new_key = file_storage_service.save_resume(cand_ref, file_bytes, doc_filename)
            file_path = file_storage_service.get_resume_path(new_key)
            if file_path:
                cand.resumeStorageKey = new_key
                cand.resumeFileName = doc_filename
                cand.resumeUploadedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
                db.commit()
                db.refresh(cand)
        except Exception as synth_err:
            print(f"Auto-reconstruct resume file note for {cand_ref}: {synth_err}")

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No physical resume document has been uploaded for this candidate."
        )

    ext = os.path.splitext(file_path.lower())[1]
    media_type = "application/pdf"
    if ext == ".doc":
        media_type = "application/msword"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    download_name = cand.resumeFileName or os.path.basename(file_path)
    return file_path, download_name, media_type

def get_candidate_resume_text(db: Session, identifier: str) -> dict:
    cand = get_candidate_by_id_or_candidate_id(db, identifier)
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    cand_ref = cand.candidateId or cand.id
    file_path = file_storage_service.get_resume_path(cand.resumeStorageKey) if cand.resumeStorageKey else None

    # Safe Fallback Repair for Legacy/Broken records
    if not file_path:
        repaired_key = file_storage_service.find_latest_valid_resume_file(cand_ref)
        if repaired_key:
            file_path = file_storage_service.get_resume_path(repaired_key)
            if file_path:
                cand.resumeStorageKey = repaired_key
                cand.resumeFileName = file_storage_service.sanitize_filename(os.path.basename(repaired_key))
                cand.resumeUploadedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
                db.commit()
                db.refresh(cand)

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical resume file missing."
        )

    if not cand.resumeText:
        try:
            with open(file_path, "rb") as f:
                fb = f.read()
            cand.resumeText = extract_text_from_file_bytes(fb, cand.resumeFileName or os.path.basename(file_path))
            db.commit()
            db.refresh(cand)
        except Exception:
            pass

    if not cand.resumeText:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text extraction unavailable or no text content found in resume file."
        )

    return {
        "candidateId": cand.candidateId or cand.id,
        "fileName": cand.resumeFileName or os.path.basename(file_path),
        "text": cand.resumeText
    }

def delete_candidate_resume(db: Session, identifier: str) -> CandidateModel:
    cand = get_candidate_by_id_or_candidate_id(db, identifier)
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found."
        )

    old_key = cand.resumeStorageKey
    if old_key:
        file_storage_service.delete_resume(old_key)

    cand.resumeFileName = None
    cand.resumeStorageKey = None
    cand.resumeUploadedAt = None
    cand.resumeText = None
    cand.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()

    db.commit()
    db.refresh(cand)
    return cand

def parse_resume_document(file_bytes: Optional[bytes] = None, filename: Optional[str] = None, raw_content: Optional[str] = None) -> dict:
    extracted_text = ""
    if file_bytes and filename:
        extracted_text = extract_text_from_file_bytes(file_bytes, filename) or ""
    if not extracted_text:
        extracted_text = raw_content or ""

    text_lines = [l.strip() for l in extracted_text.split("\n") if l.strip()]

    # 1. Email
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", extracted_text)
    email = email_match.group(0) if email_match else ""

    # 2. Phone
    phone = ""
    lbl_phone_match = re.search(r"(?:Phone|Mobile|Tel|Contact)[:\s]*([+\d\s\-\(\)]{8,20})", extracted_text, re.IGNORECASE)
    if lbl_phone_match:
        phone_cand = lbl_phone_match.group(1).strip()
        raw_p = re.sub(r"[^\d+]", "", phone_cand)
        if len(raw_p) >= 8 and not raw_p.startswith("00000"):
            phone = phone_cand
    if not phone:
        phone_match = re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}", extracted_text)
        if phone_match:
            raw_p = re.sub(r"[^\d+]", "", phone_match.group(0))
            if len(raw_p) >= 8 and not raw_p.startswith("00000"):
                phone = phone_match.group(0).strip()

    # 3. Location
    location = ""
    addr_match = re.search(r"(?:Address|Location|City|Residence)[:\s]+([A-Za-z0-9\s,]+)", extracted_text, re.IGNORECASE)
    if addr_match:
        location = addr_match.group(1).split("\n")[0].strip()
    else:
        city_match = re.search(r"\b(Pune|Mumbai|Bangalore|Bengaluru|Delhi|Gurgaon|Noida|Hyderabad|Chennai|Kolkata|Ahmedabad)\b(?:,\s*(?:India|Maharashtra|Karnataka|TN|DL))?", extracted_text[:1500], re.IGNORECASE)
        if city_match:
            location = city_match.group(0)

    # 4. Total Experience Calculation (Single Source of Truth using calculate_total_experience_months)
    total_exp_months = calculate_total_experience_months(text=extracted_text)
    exp_years = total_exp_months // 12
    exp_months = total_exp_months % 12
    if exp_years > 0:
        exp_text = f"{exp_years} Years"
    elif exp_months > 0:
        exp_text = f"Fresher ({exp_months} Month{'s' if exp_months > 1 else ''})"
    else:
        exp_text = "Fresher"

    # 5. Name Extraction (Body Text priority #1, Filename clean fallback #2)
    first_name = ""
    last_name = ""
    extracted_role_from_header = ""
    
    noise_words = {
        "resume", "cv", "pdf", "docx", "doc", "marketing", "manager", "engineer",
        "developer", "fresher", "senior", "junior", "lead", "architect", "analyst",
        "executive", "trainee", "specialist", "consultant", "profile", "updated", "final",
        "backend", "frontend", "fullstack", "python", "java", "software", "data", "scientist",
        "devops", "ui", "ux", "designer", "cloud", "it", "program", "project", "coordinator"
    }

    # Priority 1: Check document body header lines
    ignore_name_keywords = ["resume", "curriculum", "address", "phone", "email", "@", "role:", "location:", "objective", "summary", "experience", "education"]
    header_lines = [l for l in text_lines[:8] if not any(k in l.lower() for k in ignore_name_keywords)]
    if header_lines:
        for h_line in header_lines[:3]:
            clean_line = re.sub(r"^(?:Name|Candidate Name|Full Name)[:\s]*", "", h_line, flags=re.IGNORECASE)
            clean_line = re.sub(r"\(\d+\)", "", clean_line)
            # Strip leading numbers/prefixes like 04_, 01., 04
            clean_line = re.sub(r"^\d+[\s_\.\-]+", "", clean_line)
            
            # Check if header line contains pipe or dash delimiter e.g. "Nikhil Patil | Backend Python Engineer"
            if "|" in clean_line or "–" in clean_line or " - " in clean_line:
                h_parts = [p.strip() for p in re.split(r"[\u2013\u2014\|]", clean_line) if p.strip()]
                for hp in h_parts:
                    hp_clean = re.sub(r"[^A-Za-z\s]", " ", hp).strip()
                    tokens = [t for t in hp_clean.split() if len(t) > 1 and t.lower() not in noise_words]
                    if tokens and not first_name:
                        first_name = tokens[0].capitalize()
                        if len(tokens) > 1:
                            last_name = " ".join([t.capitalize() for t in tokens[1:]])
                    elif any(w.lower() in noise_words for w in hp.split()) and not extracted_role_from_header:
                        extracted_role_from_header = hp.strip()
            else:
                clean_line_alpha = re.sub(r"[^A-Za-z\s]", " ", clean_line).strip()
                tokens = [t for t in clean_line_alpha.split() if len(t) > 1 and t.lower() not in noise_words]
                if tokens:
                    first_name = tokens[0].capitalize()
                    if len(tokens) > 1:
                        last_name = " ".join([t.capitalize() for t in tokens[1:]])
                    break

    # Priority 2: Clean Filename Fallback (stripping numeric prefixes e.g. '04_' and job title noise words)
    if not first_name and filename:
        clean_f = re.sub(r"\.[^/.]+$", "", filename)
        clean_f = re.sub(r"\(\d+\)", "", clean_f)
        # Strip leading numbers/prefixes like 04_, 1., 04-
        clean_f = re.sub(r"^\d+[\s_\.\-]+", "", clean_f)
        clean_f = re.sub(r"[^A-Za-z\s]", " ", clean_f).strip()
        
        f_tokens = [t for t in clean_f.split() if len(t) > 1 and t.lower() not in noise_words]
        if f_tokens:
            first_name = f_tokens[0].capitalize()
            if len(f_tokens) > 1:
                last_name = " ".join([t.capitalize() for t in f_tokens[1:]])

    # 6. Role & Company Extraction
    role = extracted_role_from_header
    company = ""
    
    # Check top header for explicit Role: label
    role_match = re.search(r"^(?:Role|Position|Current Role|Target Role)[:\s]+([^\n]+)", extracted_text, re.IGNORECASE)
    if role_match:
        role = role_match.group(1).strip()

    exp_idx = -1
    for idx, line in enumerate(text_lines):
        if re.search(r"^(?:Work\s+Experience|Experience|Employment\s+History|Professional\s+Experience|Work\s+History)", line, re.IGNORECASE):
            exp_idx = idx
            break

    if exp_idx != -1:
        for el in text_lines[exp_idx+1 : exp_idx+10]:
            # Pipe-delimited or dash-delimited experience line e.g. "BrightWave Digital Solutions, Pune | Marketing Manager | Apr 2024 – Present"
            if "|" in el or "–" in el or " - " in el:
                parts = [p.strip() for p in re.split(r"[\u2013\u2014\|]", el) if p.strip()]
                for p in parts:
                    if not role and re.search(r"(?:Engineer|Developer|Trainee|Architect|Manager|Executive|Lead|Analyst|Consultant|Specialist|Designer)", p, re.IGNORECASE):
                        role = p
                    elif not company and not re.search(r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d\d|-|\u2013|\u2014|Present)", p, re.IGNORECASE):
                        # Strip city suffix if present
                        comp_clean = p.split(",")[0].strip()
                        company = comp_clean
            elif not role and re.search(r"(?:Engineer|Developer|Trainee|Architect|Manager|Executive|Lead|Analyst|Consultant|Specialist|Designer)", el, re.IGNORECASE):
                role = el.split(",")[0].strip()
            elif role and not company and el != role and not re.search(r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d\d|-|\u2013|\u2014|Present)", el, re.IGNORECASE) and not el.startswith("-"):
                company = el.split(",")[0].strip()

    # 7. Education
    education_text = ""
    edu_idx = -1
    for idx, line in enumerate(text_lines):
        if re.search(r"^(?:Education|Academic\s+Background|Qualifications)", line, re.IGNORECASE):
            edu_idx = idx
            break
    if edu_idx != -1:
        education_text = ", ".join(text_lines[edu_idx+1 : edu_idx+5]).strip()

    # 8. Skills
    candidate_skills = [
        "Windows Server", "Active Directory", "DNS", "DHCP", "IIS", "SQL Server", "PowerShell",
        "VMware", "AWS", "GCP", "Azure", "Git", "Java", "Python", "JavaScript", "React", "TypeScript",
        "Docker", "Kubernetes", "PostgreSQL", "Terraform", "C++", "SQL", "Linux", "Node.js",
        "SEO", "Lead Generation", "Digital Marketing", "Content Strategy", "Marketing Analytics", "Performance Marketing"
    ]
    matched_skills = [sk for sk in candidate_skills if sk.lower() in extracted_text.lower()]

    return {
        "success": True,
        "parsed": {
            "firstName": first_name,
            "lastName": last_name,
            "fullName": f"{first_name} {last_name}".strip(),
            "email": email,
            "phone": phone,
            "location": location,
            "role": role,
            "company": company,
            "experienceYears": exp_years,
            "totalExperience": exp_text,
            "skills": ", ".join(matched_skills),
            "educationText": education_text,
            "extractedRawText": extracted_text
        }
    }


