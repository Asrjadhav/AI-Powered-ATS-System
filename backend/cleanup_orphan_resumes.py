import os
import sys
import shutil

sys.path.insert(0, os.path.abspath("backend"))

from database import engine, SessionLocal
from models.candidate import CandidateModel
from models.application import ApplicationModel
from sqlalchemy import or_

RESUMES_DIR = os.path.join(os.path.abspath("backend"), "uploads", "resumes")

def get_active_candidate_identifiers(db):
    """
    Retrieves all active candidate identifier aliases currently present in PostgreSQL.
    """
    candidates = db.query(CandidateModel).all()
    active_ids = set()
    for c in candidates:
        if c.id:
            active_ids.add(c.id.strip())
        if c.candidateId:
            active_ids.add(c.candidateId.strip())
        if c.resumeStorageKey and "/" in c.resumeStorageKey:
            sk_folder = c.resumeStorageKey.split("/")[1].strip()
            if sk_folder:
                active_ids.add(sk_folder)
    
    # Also check linked candidateIds on applications
    apps = db.query(ApplicationModel).all()
    for a in apps:
        if a.candidateId:
            active_ids.add(a.candidateId.strip())

    return active_ids

def scan_and_clean_orphan_folders(delete_orphans: bool = False):
    """
    Scans backend/uploads/resumes/, compares against PostgreSQL active candidate IDs,
    reports confirmed orphan candidate folders, and optionally deletes ONLY confirmed orphans.
    """
    if not os.path.exists(RESUMES_DIR):
        print(f"Resumes directory does not exist at {RESUMES_DIR}.")
        return

    db = SessionLocal()
    try:
        active_ids = get_active_candidate_identifiers(db)
        print(f"Active PostgreSQL Candidate Identifier Count: {len(active_ids)}")
        print(f"Active Candidate IDs in DB: {sorted(list(active_ids))}")

        all_folders = [f for f in os.listdir(RESUMES_DIR) if os.path.isdir(os.path.join(RESUMES_DIR, f))]
        print(f"\nTotal Candidate Folders Found on Disk ({RESUMES_DIR}): {len(all_folders)}")

        preserved_folders = []
        orphan_folders = []

        for folder in all_folders:
            if folder in active_ids:
                preserved_folders.append(folder)
            else:
                orphan_folders.append(folder)

        print("\n--- PRESERVED ACTIVE CANDIDATE FOLDERS ---")
        for p in sorted(preserved_folders):
            print(f"  [ACTIVE] {p}")

        print("\n--- CONFIRMED ORPHANED CANDIDATE FOLDERS ---")
        if not orphan_folders:
            print("  No orphaned candidate folders found.")
        else:
            for o in sorted(orphan_folders):
                print(f"  [ORPHAN] {o}")

        if delete_orphans and orphan_folders:
            print("\n--- EXECUTING ORPHAN FOLDER DELETION ---")
            for o in orphan_folders:
                target_path = os.path.join(RESUMES_DIR, o)
                try:
                    shutil.rmtree(target_path)
                    print(f"  [DELETED] Successfully removed orphan directory: {target_path}")
                except Exception as err:
                    print(f"  [ERROR] Failed to delete orphan directory {target_path}: {err}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_flag = "--delete" in sys.argv or "-d" in sys.argv
    scan_and_clean_orphan_folders(delete_orphans=delete_flag)
