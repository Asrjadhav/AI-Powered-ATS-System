"""
Canonical application pipeline stages.

This module is the single source of truth for the valid pipeline stage values.
Both the database (via migration 007) and all service-layer logic reference
these enum members — no other stage strings should appear in the codebase.
"""

from enum import Enum


class ApplicationStage(str, Enum):
    """The canonical stages an application can be in."""

    NEW = "New"
    SHORTLISTED = "Shortlisted"
    INTERVIEWING = "Interviewing"
    REJECTED = "Rejected"
    OFFER = "Offer"
    HIRED = "Hired"  # added by migration 010_add_hired_stage (run its SQL before anything saves it)


# Convenience: all valid stage values as a tuple, for DB checks and validation.
ALL_STAGES = tuple(stage.value for stage in ApplicationStage)

# Older spellings mapped onto the stages ("Applied", "Screening", "Offered", "Joined", ...). The app
# itself now sends only the stage names above; this table only catches old data and old clients, so
# no request ever writes a value the application_stage enum rejects.
_STAGE_ALIASES = {
    "APPLIED": ApplicationStage.NEW,
    "SCREENING": ApplicationStage.NEW,
    "PENDING EVALUATION": ApplicationStage.NEW,
    "PENDING_EVALUATION": ApplicationStage.NEW,
    "TALENT POOL": ApplicationStage.NEW,
    "TALENT_POOL": ApplicationStage.NEW,
    "AI SHORTLISTED": ApplicationStage.SHORTLISTED,
    "AI_SHORTLISTED": ApplicationStage.SHORTLISTED,
    "INTERVIEW": ApplicationStage.INTERVIEWING,
    "DECLINE": ApplicationStage.REJECTED,
    "DECLINED": ApplicationStage.REJECTED,
    "OFFERED": ApplicationStage.OFFER,
    "ACCEPTED": ApplicationStage.HIRED,
    "JOINED": ApplicationStage.HIRED,
}


def to_db_stage(status) -> str:
    """
    Returns the canonical Title Case value for any known status spelling.

    Accepts ApplicationStage members or plain strings in any case. Unknown
    values pass through unchanged so genuine client errors stay visible
    instead of being silently rewritten.
    """
    if status is None or status == "":
        return ApplicationStage.NEW.value

    raw = status.value if isinstance(status, ApplicationStage) else status
    key = str(raw).strip().upper()

    for stage in ApplicationStage:
        if key == stage.value.upper():
            return stage.value

    alias = _STAGE_ALIASES.get(key)
    if alias:
        return alias.value

    return str(raw).strip()
