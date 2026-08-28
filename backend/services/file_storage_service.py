import os
import uuid
import re
from typing import Optional
from sqlalchemy.orm import Session

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
RESUMES_DIR = os.path.join(UPLOADS_DIR, "resumes")

os.makedirs(RESUMES_DIR, exist_ok=True)

VALID_RESUME_EXTENSIONS = {".pdf", ".docx", ".doc"}

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes raw filenames by removing path traversal characters, slashes, and unsafe symbols.
    """
    if not filename:
        return "uploaded_file"
    clean = os.path.basename(filename)
    clean = re.sub(r"[^\w\.\-]", "_", clean)
    return clean.strip("_") or "uploaded_file"

def save_resume(candidate_id: str, file_bytes: bytes, original_filename: str) -> str:
    """
    Saves candidate resume file under backend/uploads/resumes/<candidate_id>/<unique_name>.ext.
    Returns relative storage key e.g. 'resumes/CAND-0001/8f3a2c1d_Resume.pdf'.
    """
    safe_cand_id = sanitize_filename(str(candidate_id).strip())
    safe_orig_name = sanitize_filename(original_filename)

    candidate_folder = os.path.join(RESUMES_DIR, safe_cand_id)
    os.makedirs(candidate_folder, exist_ok=True)

    unique_prefix = str(uuid.uuid4())[:8]
    unique_filename = f"{unique_prefix}_{safe_orig_name}"
    
    file_path = os.path.join(candidate_folder, unique_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    relative_key = f"resumes/{safe_cand_id}/{unique_filename}"
    return relative_key

def get_resume_path(storage_key: str) -> Optional[str]:
    """
    Resolves relative storage key to absolute local path safely.
    Prevents path traversal attempts (e.g. containing '..').
    Returns absolute path if file exists, else None.
    """
    if not storage_key:
        return None

    clean_key = str(storage_key).strip().replace("\\", "/").lstrip("/")
    if ".." in clean_key:
        return None

    abs_path = os.path.abspath(os.path.join(UPLOADS_DIR, clean_key))
    abs_uploads_dir = os.path.abspath(UPLOADS_DIR)

    if not abs_path.startswith(abs_uploads_dir):
        return None

    if os.path.exists(abs_path) and os.path.isfile(abs_path):
        return abs_path

    return None

def find_latest_valid_resume_file(candidate_id: str) -> Optional[str]:
    """
    Fallback for legacy/repair purposes: scans backend/uploads/resumes/<candidate_id>/
    for valid resume documents (.pdf, .docx, .doc), sorted by most recently modified timestamp.
    Returns relative storage key e.g. 'resumes/CAND-0009/04bad9d4_python_dev_resume.docx' if found.
    """
    safe_cand_id = sanitize_filename(str(candidate_id).strip())
    candidate_folder = os.path.join(RESUMES_DIR, safe_cand_id)

    if not os.path.exists(candidate_folder) or not os.path.isdir(candidate_folder):
        return None

    candidates_files = []
    try:
        for fname in os.listdir(candidate_folder):
            ext = os.path.splitext(fname.lower())[1]
            if ext in VALID_RESUME_EXTENSIONS:
                fpath = os.path.join(candidate_folder, fname)
                if os.path.isfile(fpath):
                    mtime = os.path.getmtime(fpath)
                    candidates_files.append((mtime, fname))
    except Exception as err:
        print(f"Error scanning candidate resume directory for {candidate_id}: {err}")
        return None

    if not candidates_files:
        return None

    # Sort descending by last modified timestamp
    candidates_files.sort(key=lambda x: x[0], reverse=True)
    latest_fname = candidates_files[0][1]
    return f"resumes/{safe_cand_id}/{latest_fname}"

def is_storage_key_referenced(db: Session, storage_key: str, exclude_candidate_id: Optional[str] = None) -> bool:
    """
    Checks if a storage_key is currently referenced by any Candidate row in PostgreSQL.
    """
    if not storage_key or not db:
        return False

    try:
        from models.candidate import CandidateModel
        query = db.query(CandidateModel).filter(CandidateModel.resumeStorageKey == storage_key)
        if exclude_candidate_id:
            c_ids = [exclude_candidate_id, exclude_candidate_id.replace("CAND-", "")]
            query = query.filter(~CandidateModel.id.in_(c_ids))
        return query.first() is not None
    except Exception as err:
        print(f"Error checking storage key references: {err}")
        return True # Erring on the side of caution

def delete_resume(storage_key: str) -> bool:
    """
    Safely deletes physical resume file from local storage if present.
    """
    path = get_resume_path(storage_key)
    if path and os.path.exists(path):
        try:
            os.remove(path)
            return True
        except Exception as e:
            print(f"Error removing physical resume file at {path}: {e}")
            return False
    return False

def delete_candidate_folder(candidate_id: str) -> bool:
    """
    Safely removes candidate resume folder and all contained physical files.
    """
    if not candidate_id:
        return False
    safe_cand_id = sanitize_filename(str(candidate_id).strip())
    candidate_folder = os.path.join(RESUMES_DIR, safe_cand_id)
    if os.path.exists(candidate_folder) and os.path.isdir(candidate_folder):
        try:
            import shutil
            shutil.rmtree(candidate_folder)
            print(f"Successfully deleted candidate resume directory: {candidate_folder}")
            return True
        except Exception as err:
            print(f"Error removing candidate folder {candidate_folder}: {err}")
            raise err
    return False

def cleanup_obsolete_files_in_folder(candidate_id: str, active_storage_key: str, db: Session):
    """
    Cleans up obsolete, unreferenced physical resume files in backend/uploads/resumes/<candidate_id>/
    that do NOT match active_storage_key and are NOT referenced elsewhere in DB.
    """
    safe_cand_id = sanitize_filename(str(candidate_id).strip())
    candidate_folder = os.path.join(RESUMES_DIR, safe_cand_id)
    if not os.path.exists(candidate_folder) or not os.path.isdir(candidate_folder):
        return

    active_basename = os.path.basename(active_storage_key) if active_storage_key else ""

    try:
        for fname in os.listdir(candidate_folder):
            if fname == active_basename:
                continue
            rel_key = f"resumes/{safe_cand_id}/{fname}"
            if not is_storage_key_referenced(db, rel_key, exclude_candidate_id=candidate_id):
                fpath = os.path.join(candidate_folder, fname)
                if os.path.isfile(fpath):
                    try:
                        os.remove(fpath)
                    except Exception as rm_err:
                        print(f"Obsolete resume file removal note for {fpath}: {rm_err}")
    except Exception as err:
        print(f"Error during obsolete file cleanup for candidate {candidate_id}: {err}")
