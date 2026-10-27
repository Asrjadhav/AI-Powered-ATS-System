"""
Canonical candidate pipeline semantics.

This module is the single source of truth for how a raw status string maps to a
pipeline stage, and for which stage a candidate or application record belongs
to. It replaces the duplicated copy that previously lived in the browser
(src/utils/pipelineUtils.ts), where each screen was free to reinterpret it.

The match threshold comes from config.ATS_MATCH_THRESHOLD so that changing
ATS_MATCH_THRESHOLD in the environment moves screening and reporting together.
Nothing here touches the database; these are pure functions over plain dicts.
"""

from typing import Any, Mapping, Optional

import config
from services.application_stage import ApplicationStage

DEFAULT_MATCH_THRESHOLD = config.ATS_MATCH_THRESHOLD

# Fields that may carry a numeric AI match score, in order of preference.
SCORE_FIELDS_BY_PRECEDENCE = ("aiScore", "aiMatchScore", "atsScore")


def normalize_status(status: Optional[str]) -> str:
    """Maps any known status spelling onto a canonical pipeline stage."""
    if not status:
        return ApplicationStage.NEW.value

    # An SQLAlchemy Enum column yields ApplicationStage members; str() of such a
    # member is "ApplicationStage.SHORTLISTED", not the stored value, so unwrap
    # it explicitly before normalizing.
    raw = status.value if isinstance(status, ApplicationStage) else status
    normalized_status = str(raw).strip().upper()

    for stage in ApplicationStage:
        if normalized_status == stage.value.upper():
            return stage.value

    return ApplicationStage.NEW.value


def get_raw_status(record: Mapping[str, Any]) -> Optional[str]:
    """Returns the record's status exactly as stored, before normalization."""
    return record.get("status") or record.get("applicationStatus")






def get_stage(record: Mapping[str, Any]) -> str:
    """Returns the record's canonical pipeline stage, lowercased for comparison."""
    return normalize_status(get_raw_status(record)).lower()


def get_ai_score(record: Mapping[str, Any]) -> float:
    """
    Resolves a record's AI match score, preferring the richest source.

    Mirrors the precedence the dashboard has always used:
    aiEvaluation.score, then aiScore, then aiMatchScore, then atsScore.
    """
    if not record:
        return 0.0

    ai_evaluation = record.get("aiEvaluation")
    if isinstance(ai_evaluation, Mapping) and isinstance(
        ai_evaluation.get("score"), (int, float)
    ):
        return float(ai_evaluation["score"])

    for score_field in SCORE_FIELDS_BY_PRECEDENCE:
        score_value = record.get(score_field)
        if isinstance(score_value, (int, float)):
            return float(score_value)

    return 0.0


def has_been_scored(record: Mapping[str, Any]) -> bool:
    """True when the record carries a real AI score rather than an absent one."""
    ai_evaluation = record.get("aiEvaluation")
    if isinstance(ai_evaluation, Mapping) and isinstance(
        ai_evaluation.get("score"), (int, float)
    ):
        return True
    return any(
        isinstance(record.get(score_field), (int, float))
        for score_field in SCORE_FIELDS_BY_PRECEDENCE
    )


def is_new(record: Mapping[str, Any]) -> bool:
    return get_stage(record) == ApplicationStage.NEW.value.lower()


def is_shortlisted(record: Mapping[str, Any]) -> bool:
    return get_stage(record) == ApplicationStage.SHORTLISTED.value.lower()


def is_interview_stage(record: Mapping[str, Any]) -> bool:
    return get_stage(record) == ApplicationStage.INTERVIEWING.value.lower()


def is_offered(record: Mapping[str, Any]) -> bool:
    return get_stage(record) == ApplicationStage.OFFER.value.lower()


def is_hired(record: Mapping[str, Any]) -> bool:
    return get_stage(record) == ApplicationStage.HIRED.value.lower()


def is_rejected(record: Mapping[str, Any]) -> bool:
    return get_stage(record) == ApplicationStage.REJECTED.value.lower()
