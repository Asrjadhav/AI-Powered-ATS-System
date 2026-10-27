"""
Work Mode: where a candidate prefers to work.

This is the CANDIDATE's preference and is stored on the candidate (candidates."preferredWorkMode").
It is separate from the job's own work mode (jobs."workMode": Remote / Hybrid / On-site), which is
what the opening offers. A candidate's choice never changes the job.

The choices offered for a job follow what the job offers (the same rule is in src/lib/workMode.ts):
  Remote   -> Work from Home
  On-site  -> Work from Office
  Hybrid   -> all three (a hybrid job allows some work from home as well as the office)
  not set  -> all three
"""

from typing import List, Optional

from fastapi import HTTPException, status

WORK_FROM_OFFICE = "Work from Office"
HYBRID = "Hybrid"
WORK_FROM_HOME = "Work from Home"
WORK_MODES = (WORK_FROM_OFFICE, HYBRID, WORK_FROM_HOME)


def normalize(value) -> Optional[str]:
    """The canonical spelling of a work mode, None when empty. Anything else raises ValueError."""
    text = " ".join(str(value or "").split())
    if not text:
        return None
    for mode in WORK_MODES:
        if text.lower() == mode.lower():
            return mode
    raise ValueError("Work Mode must be one of: " + ", ".join(WORK_MODES) + ".")


def options_for_job(job_work_mode) -> List[str]:
    """The work modes a candidate may choose for a job with this work mode."""
    configured = " ".join(str(job_work_mode or "").split()).lower()
    if configured == "remote":
        return [WORK_FROM_HOME]
    if configured in ("on-site", "onsite", "on site"):
        return [WORK_FROM_OFFICE]
    return list(WORK_MODES)  # Hybrid jobs and jobs that do not say: all three


def ensure_allowed_for_job(preferred: Optional[str], job) -> None:
    """Refuses (400) a Work Mode the job does not offer. Nothing is checked when either side is missing."""
    if not preferred or job is None:
        return
    allowed = options_for_job(getattr(job, "workMode", None))
    if preferred not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(f"Work Mode '{preferred}' is not available for {job.title or 'this position'} "
                    f"({job.workMode}). Choose one of: " + ", ".join(allowed) + "."),
        )
