"""
Dashboard statistics.

Everything the dashboard shows is computed here, against the database. This
replaces the previous arrangement where the browser downloaded the candidate,
application, job, interview, offer and talent-pool collections in full and
joined and aggregated them in JavaScript.

Counts that depend only on a status column are answered by SQL COUNT. The
pipeline-stage counts need the application/candidate merge and the shared
status vocabulary, so they read a narrow set of columns and apply the rules in
services.pipeline — still server-side, and a few columns rather than six whole
collections over the network.
"""

import datetime
from collections import Counter
from typing import Any, Dict, List, Mapping, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import services.pipeline as pipeline
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.interview import InterviewModel
from models.job import JobModel
from models.offer import OfferModel
from models.talent_pool import TalentPoolModel

# Interview rows carry no duration column yet, so completed interviews are
# assumed to take this long when averaging.
ASSUMED_INTERVIEW_MINUTES = 45

WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

SCHEDULED_INTERVIEW_STATUSES = ("upcoming", "scheduled")
COMPLETED_INTERVIEW_STATUSES = ("completed",)
CANCELLED_INTERVIEW_STATUSES = ("cancelled", "canceled")

# An offer counts as outstanding until it has been sent and answered, so a
# draft that nobody has released yet is still pending.
PENDING_OFFER_STATUSES = ("pending", "draft")


def _today_iso_date() -> str:
    return datetime.date.today().isoformat()


def _iso_date_part(timestamp: Optional[str]) -> str:
    """Returns the YYYY-MM-DD portion of a stored ISO-8601 timestamp."""
    if not timestamp:
        return ""
    return str(timestamp).split("T", 1)[0].strip()


def _count_rows(session: Session, model, *filters) -> int:
    query = session.query(func.count(model.id))
    for condition in filters:
        query = query.filter(condition)
    return int(query.scalar() or 0)


def _build_pipeline_dataset(session: Session) -> List[Dict[str, Any]]:
    """
    Produces the records the pipeline-stage counts run over.

    An application is the authoritative record of where someone sits in the
    pipeline, with their candidate row filling in anything the application does
    not carry. When no applications exist at all, candidates stand in for them
    so a freshly seeded system still reports sensible numbers.
    """
    candidate_rows = session.query(
        CandidateModel.id,
        CandidateModel.candidateId,
        CandidateModel.email,
        CandidateModel.status,
        CandidateModel.aiScore,
        CandidateModel.createdAt,
    ).all()

    candidates_by_identifier: Dict[str, Mapping[str, Any]] = {}
    candidates_by_email: Dict[str, Mapping[str, Any]] = {}

    for candidate_row in candidate_rows:
        candidate_record = {
            "id": candidate_row.id,
            "candidateId": candidate_row.candidateId,
            "email": candidate_row.email,
            "status": candidate_row.status,
            "aiScore": candidate_row.aiScore,
            "createdAt": candidate_row.createdAt,
        }
        for identifier in (candidate_row.id, candidate_row.candidateId):
            if identifier and identifier not in candidates_by_identifier:
                candidates_by_identifier[identifier] = candidate_record
        if candidate_row.email:
            email_key = candidate_row.email.strip().lower()
            candidates_by_email.setdefault(email_key, candidate_record)

    application_rows = session.query(
        ApplicationModel.candidateId,
        ApplicationModel.candidateEmail,
        ApplicationModel.status,
        ApplicationModel.atsScore,
        ApplicationModel.aiEvaluation,
        ApplicationModel.createdAt,
    ).all()

    if not application_rows:
        return [dict(record) for record in candidates_by_identifier.values()]

    merged_records: List[Dict[str, Any]] = []
    for application_row in application_rows:
        matched_candidate: Mapping[str, Any] = {}
        if application_row.candidateId:
            matched_candidate = candidates_by_identifier.get(
                application_row.candidateId, {}
            )
        if not matched_candidate and application_row.candidateEmail:
            matched_candidate = candidates_by_email.get(
                application_row.candidateEmail.strip().lower(), {}
            )

        merged_records.append({
            "status": application_row.status
            or matched_candidate.get("status")
            or "New",
            "aiScore": application_row.atsScore
            if application_row.atsScore is not None
            else matched_candidate.get("aiScore"),
            "aiEvaluation": application_row.aiEvaluation,
            "createdAt": application_row.createdAt
            or matched_candidate.get("createdAt"),
        })

    return merged_records


def _weekly_application_counts(session: Session) -> List[Dict[str, Any]]:
    """Counts candidates by the weekday they were created, Monday first."""
    created_timestamps = session.query(CandidateModel.createdAt).all()

    counts_by_weekday: Counter = Counter()
    for (created_at,) in created_timestamps:
        date_part = _iso_date_part(created_at)
        if not date_part:
            continue
        try:
            parsed_date = datetime.date.fromisoformat(date_part)
        except ValueError:
            continue
        counts_by_weekday[WEEKDAY_LABELS[parsed_date.weekday()]] += 1

    return [
        {"name": weekday, "count": counts_by_weekday.get(weekday, 0)}
        for weekday in WEEKDAY_LABELS
    ]


def _interview_status_filter(statuses):
    return func.lower(func.coalesce(InterviewModel.status, "")).in_(statuses)


def get_dashboard_stats(
    session: Session,
    match_threshold: Optional[int] = None,
) -> Dict[str, Any]:
    """Returns every figure the recruitment dashboard displays."""
    threshold = (
        pipeline.DEFAULT_MATCH_THRESHOLD if match_threshold is None else match_threshold
    )
    today = _today_iso_date()

    active_vacancies = _count_rows(
        session, JobModel, func.lower(func.coalesce(JobModel.status, "")) == "active"
    )
    total_candidates = _count_rows(session, CandidateModel)
    talent_pool_count = _count_rows(session, TalentPoolModel)

    total_interviews = _count_rows(session, InterviewModel)
    today_interviews = _count_rows(
        session,
        InterviewModel,
        InterviewModel.date == today,
        ~_interview_status_filter(CANCELLED_INTERVIEW_STATUSES),
    )
    upcoming_interviews = _count_rows(
        session,
        InterviewModel,
        _interview_status_filter(SCHEDULED_INTERVIEW_STATUSES),
        InterviewModel.date > today,
    )
    completed_interviews = _count_rows(
        session, InterviewModel, _interview_status_filter(COMPLETED_INTERVIEW_STATUSES)
    )
    cancelled_interviews = _count_rows(
        session, InterviewModel, _interview_status_filter(CANCELLED_INTERVIEW_STATUSES)
    )
    # An interview whose scheduled date has passed while still marked as
    # scheduled is one nobody has filed feedback for.
    pending_feedback = _count_rows(
        session,
        InterviewModel,
        _interview_status_filter(SCHEDULED_INTERVIEW_STATUSES),
        InterviewModel.date < today,
    )

    total_offers = _count_rows(session, OfferModel)
    pending_offers = _count_rows(
        session,
        OfferModel,
        func.lower(func.coalesce(OfferModel.status, "")).in_(PENDING_OFFER_STATUSES),
    )

    average_match_score = int(
        round(session.query(func.coalesce(func.avg(CandidateModel.aiScore), 0)).scalar() or 0)
    )

    pipeline_records = _build_pipeline_dataset(session)
    applications_today = sum(
        1
        for record in pipeline_records
        if _iso_date_part(record.get("createdAt")) == today
    )

    return {
        "totalJobs": active_vacancies,
        "activeVacancies": active_vacancies,
        "activeCandidates": total_candidates,
        "totalCandidates": total_candidates,
        "talentPoolCount": talent_pool_count,

        "newApplicationsCount": sum(1 for r in pipeline_records if pipeline.is_new(r)),
        "aiShortlistedCount": sum(
            1 for r in pipeline_records if pipeline.is_shortlisted(r)
        ),
        "interviewStageCount": sum(
            1 for r in pipeline_records if pipeline.is_interview_stage(r)
        ),
        "offerCount": sum(1 for r in pipeline_records if pipeline.is_offered(r)),
        "hiredCount": sum(1 for r in pipeline_records if pipeline.is_hired(r)),
        "rejectedCount": sum(1 for r in pipeline_records if pipeline.is_rejected(r)),
        "appsTodayCount": applications_today,

        "averageMatchScore": average_match_score,
        "todayInterviews": today_interviews,
        "upcomingInterviews": upcoming_interviews,
        "completedInterviews": completed_interviews,
        "cancelledInterviews": cancelled_interviews,
        "pendingFeedback": pending_feedback,
        "totalInterviews": total_interviews,
        "totalOffers": total_offers,
        "pendingOffers": pending_offers,
        "averageDuration": ASSUMED_INTERVIEW_MINUTES if completed_interviews else 0,

        "weeklyApplications": _weekly_application_counts(session),
    }
