"""
Recruitment analytics for the Insights screens.

This is the single definition of every analytics figure the product reports.
It replaces two separate browser-side implementations that disagreed with each
other: they used different offer-conversion formulas, bucketed pending-review
candidates differently, and one displayed hardcoded funnel conversion
percentages next to real counts.

Where the two disagreed, the definitions here are:

- offerConversionRate divides by everyone who received an offer
  (still-open offers plus hires), not just the still-open ones. Dividing by
  open offers alone reports above 100% once anyone is hired.
- The stages are exactly the application stages: New, Shortlisted, Interviewing,
  Offer, Hired and Rejected. No other stage name is used here.
- Funnel counts are cumulative, so each stage includes candidates who have
  since progressed. Conversions are computed from those counts, never fixed.
- Candidates awaiting review are their own stage rather than being folded in
  with new applications.
"""

from typing import Any, Dict, List, Mapping, Optional

from sqlalchemy.orm import Session

import services.pipeline as pipeline
from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.interview import InterviewModel
from models.job import JobModel
from models.offer import OfferModel

SCORE_BUCKET_DEFINITIONS = [
    ("exceptional", "Exceptional (90-100)", 90),
    ("strong", "Strong (75-89)", 75),
    ("moderate", "Moderate (60-74)", 60),
    ("needs_review", "Needs Review (<60)", 0),
]

UNASSIGNED_DEPARTMENT = "Unassigned"
UNKNOWN_SOURCE = "Unknown"

COMPLETED_INTERVIEW_STATUSES = ("completed",)
ACCEPTED_OFFER_STATUSES = ("accepted", "joined")


def _as_percentage(numerator: float, denominator: float) -> int:
    """Rounds numerator/denominator to a whole percent, treating 0/0 as 0."""
    if not denominator:
        return 0
    return int(round((numerator / denominator) * 100))


def _normalize_position(title: Any) -> str:
    """A job title as positions are compared: spacing and case ignored."""
    return " ".join(str(title or "").split()).lower()


def _build_insight_records(
    session: Session,
    department: Optional[str] = None,
    position: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Assembles the candidate records the analytics run over.

    An application carries the authoritative pipeline status, with the
    candidate row supplying anything it lacks. Department comes from the
    application, falling back to the job the candidate applied to.
    """
    department_by_job_id: Dict[str, str] = {}
    position_by_job_id: Dict[str, str] = {}
    for job_row in session.query(JobModel.id, JobModel.jobId, JobModel.department, JobModel.title).all():
        for job_identifier in (job_row.id, job_row.jobId):
            if job_identifier and job_row.department:
                department_by_job_id.setdefault(job_identifier, job_row.department)
            if job_identifier:
                position_by_job_id.setdefault(job_identifier, _normalize_position(job_row.title))

    candidates_by_identifier: Dict[str, Dict[str, Any]] = {}
    candidates_by_email: Dict[str, Dict[str, Any]] = {}
    for candidate_row in session.query(
        CandidateModel.id,
        CandidateModel.candidateId,
        CandidateModel.email,
        CandidateModel.status,
        CandidateModel.aiScore,
        CandidateModel.source,
        CandidateModel.jobId,
    ).all():
        candidate_record = {
            "status": candidate_row.status,
            "aiScore": candidate_row.aiScore,
            "source": candidate_row.source,
            "jobId": candidate_row.jobId,
        }
        for candidate_identifier in (candidate_row.id, candidate_row.candidateId):
            if candidate_identifier:
                candidates_by_identifier.setdefault(candidate_identifier, candidate_record)
        if candidate_row.email:
            candidates_by_email.setdefault(
                candidate_row.email.strip().lower(), candidate_record
            )

    application_rows = session.query(
        ApplicationModel.candidateId,
        ApplicationModel.candidateEmail,
        ApplicationModel.status,
        ApplicationModel.atsScore,
        ApplicationModel.aiEvaluation,
        ApplicationModel.department,
        ApplicationModel.jobId,
    ).all()

    records: List[Dict[str, Any]] = []

    if application_rows:
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

            job_identifier = application_row.jobId or matched_candidate.get("jobId")
            records.append({
                "status": application_row.status or matched_candidate.get("status") or "New",
                "aiScore": application_row.atsScore
                if application_row.atsScore is not None
                else matched_candidate.get("aiScore"),
                "aiEvaluation": application_row.aiEvaluation,
                "source": matched_candidate.get("source") or UNKNOWN_SOURCE,
                "department": application_row.department
                or department_by_job_id.get(job_identifier or "")
                or UNASSIGNED_DEPARTMENT,
                "jobId": job_identifier,
            })
    else:
        for candidate_record in candidates_by_identifier.values():
            records.append({
                "status": candidate_record.get("status") or "New",
                "aiScore": candidate_record.get("aiScore"),
                "aiEvaluation": None,
                "source": candidate_record.get("source") or UNKNOWN_SOURCE,
                "department": department_by_job_id.get(
                    candidate_record.get("jobId") or ""
                ) or UNASSIGNED_DEPARTMENT,
                "jobId": candidate_record.get("jobId"),
            })

    if department and department.strip().lower() not in ("", "all", "all departments"):
        wanted_department = department.strip().lower()
        records = [
            record for record in records
            if str(record.get("department") or "").strip().lower() == wanted_department
        ]

    # One job position (a job title). Applications with no job never match a chosen position.
    if position and position.strip().lower() not in ("", "all", "all positions"):
        wanted_position = _normalize_position(position)
        records = [
            record for record in records
            if position_by_job_id.get(record.get("jobId") or "") == wanted_position
        ]

    return records


def _score_buckets(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    total = len(records)
    counts_by_bucket_key = {key: 0 for key, _label, _floor in SCORE_BUCKET_DEFINITIONS}

    for record in records:
        score = pipeline.get_ai_score(record)
        for bucket_key, _label, minimum_score in SCORE_BUCKET_DEFINITIONS:
            if score >= minimum_score:
                counts_by_bucket_key[bucket_key] += 1
                break

    return [
        {
            "key": bucket_key,
            "name": label,
            "count": counts_by_bucket_key[bucket_key],
            "percentage": _as_percentage(counts_by_bucket_key[bucket_key], total),
        }
        for bucket_key, label, _minimum in SCORE_BUCKET_DEFINITIONS
    ]


def _funnel(stage_counts: Dict[str, int], total: int) -> List[Dict[str, Any]]:
    """
    Builds the hiring funnel from cumulative stage counts.

    A candidate now in an interview was shortlisted earlier, so they are counted
    at every stage they have passed through. Each conversion is this stage
    measured against the previous one.
    """
    reached_hired = stage_counts["hired"]
    reached_offer = stage_counts["offer"] + reached_hired
    reached_interview = stage_counts["interviewing"] + reached_offer
    reached_shortlist = stage_counts["shortlisted"] + reached_interview

    stages = [
        ("applications", "Applications", total),
        ("shortlisted", "Shortlisted", reached_shortlist),
        ("interviewing", "Interviewing", reached_interview),
        ("offer", "Offer", reached_offer),
        ("hired", "Hired", reached_hired),
    ]

    funnel: List[Dict[str, Any]] = []
    previous_stage_count = total
    for index, (stage_key, stage_label, stage_count) in enumerate(stages):
        funnel.append({
            "key": stage_key,
            "stage": stage_label,
            "count": stage_count,
            "percentageOfTotal": _as_percentage(stage_count, total),
            "conversionFromPrevious": 100 if index == 0
            else _as_percentage(stage_count, previous_stage_count),
        })
        previous_stage_count = stage_count

    return funnel


def _source_breakdown(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    totals_by_source: Dict[str, Dict[str, float]] = {}
    for record in records:
        source_name = str(record.get("source") or UNKNOWN_SOURCE)
        totals = totals_by_source.setdefault(source_name, {"count": 0, "score_total": 0.0})
        totals["count"] += 1
        totals["score_total"] += pipeline.get_ai_score(record)

    breakdown = [
        {
            "name": source_name,
            "candidates": int(totals["count"]),
            "avgScore": int(round(totals["score_total"] / totals["count"]))
            if totals["count"] else 0,
        }
        for source_name, totals in totals_by_source.items()
    ]
    breakdown.sort(key=lambda entry: entry["candidates"], reverse=True)
    return breakdown


def _job_performance(
    session: Session,
    records: List[Dict[str, Any]],
    match_threshold: int,
) -> List[Dict[str, Any]]:
    """
    Per-job figures for the Insights job performance table.

    Grouped from the same department-filtered records the rest of this
    module uses, so this table always agrees with the summary figures above
    it. Previously computed in the browser from an unfiltered candidate/job
    fetch, which disagreed with the (department-filtered) summary whenever a
    department filter was applied.
    """
    records_by_job_id: Dict[str, List[Dict[str, Any]]] = {}
    for record in records:
        job_id = record.get("jobId")
        if not job_id:
            continue
        records_by_job_id.setdefault(job_id, []).append(record)

    if not records_by_job_id:
        return []

    job_rows = session.query(
        JobModel.id, JobModel.jobId, JobModel.title, JobModel.department, JobModel.status
    ).filter(
        (JobModel.id.in_(records_by_job_id.keys()))
        | (JobModel.jobId.in_(records_by_job_id.keys()))
    ).all()

    performance: List[Dict[str, Any]] = []
    seen_job_rows: set = set()
    for job_row in job_rows:
        job_identifier = next(
            (jid for jid in (job_row.id, job_row.jobId) if jid in records_by_job_id),
            None,
        )
        if job_identifier is None or job_identifier in seen_job_rows:
            continue
        seen_job_rows.add(job_identifier)

        job_records = records_by_job_id[job_identifier]
        applications = len(job_records)
        interviewed = sum(1 for r in job_records if pipeline.is_interview_stage(r))
        hired = sum(1 for r in job_records if pipeline.is_hired(r))
        qualified = sum(
            1 for r in job_records if pipeline.is_shortlisted(r)
        )
        avg_ai_score = (
            int(round(sum(pipeline.get_ai_score(r) for r in job_records) / applications))
            if applications else 0
        )

        performance.append({
            "id": job_row.id or job_row.jobId,
            "title": job_row.title or "Untitled job",
            "department": job_row.department or UNASSIGNED_DEPARTMENT,
            "applications": applications,
            "qualified": qualified,
            "interviewRate": _as_percentage(interviewed, applications),
            "hiringRate": _as_percentage(hired, applications),
            "avgAiScore": avg_ai_score,
            "status": job_row.status or "Unknown",
        })

    performance.sort(key=lambda entry: entry["applications"], reverse=True)
    return performance


def get_recruitment_insights(
    session: Session,
    department: Optional[str] = None,
    match_threshold: Optional[int] = None,
    position: Optional[str] = None,
) -> Dict[str, Any]:
    """Returns every analytics figure the Insights screens display."""
    threshold = (
        pipeline.DEFAULT_MATCH_THRESHOLD if match_threshold is None else match_threshold
    )
    records = _build_insight_records(session, department=department, position=position)
    total = len(records)

    stage_counts = {
        "new": 0, "shortlisted": 0, "interviewing": 0,
        "offer": 0, "hired": 0, "rejected": 0,
    }
    score_total = 0.0

    for record in records:
        score_total += pipeline.get_ai_score(record)

        # Checked most-advanced first so each candidate lands in exactly one
        # stage and the funnel stays consistent with the stage counts.
        if pipeline.is_rejected(record):
            stage_counts["rejected"] += 1
        elif pipeline.is_hired(record):
            stage_counts["hired"] += 1
        elif pipeline.is_offered(record):
            stage_counts["offer"] += 1
        elif pipeline.is_interview_stage(record):
            stage_counts["interviewing"] += 1
        elif pipeline.is_shortlisted(record):
            stage_counts["shortlisted"] += 1
        else:
            stage_counts["new"] += 1

    progressed_beyond_review = (
        stage_counts["shortlisted"] + stage_counts["interviewing"]
        + stage_counts["offer"] + stage_counts["hired"]
    )
    everyone_offered = stage_counts["offer"] + stage_counts["hired"]

    total_interviews = session.query(InterviewModel.id).count()
    completed_interviews = (
        session.query(InterviewModel.id)
        .filter(InterviewModel.status.isnot(None))
        .filter(
            InterviewModel.status.in_(["Completed", "COMPLETED", "completed"])
        )
        .count()
    )

    total_offers = session.query(OfferModel.id).count()
    accepted_offers = sum(
        1
        for (offer_status,) in session.query(OfferModel.status).all()
        if str(offer_status or "").strip().lower() in ACCEPTED_OFFER_STATUSES
    )

    return {
        "total": total,
        "avgScore": int(round(score_total / total)) if total else 0,

        "newCount": stage_counts["new"],
        "shortlistedCount": stage_counts["shortlisted"],
        "interviewingCount": stage_counts["interviewing"],
        "offerCount": stage_counts["offer"],
        "hiredCount": stage_counts["hired"],
        "rejectedCount": stage_counts["rejected"],

        "conversionRate": _as_percentage(progressed_beyond_review, total),
        "offerConversionRate": _as_percentage(stage_counts["hired"], everyone_offered),

        "interviewSuccessRate": _as_percentage(completed_interviews, total_interviews),
        "offerAcceptanceRate": _as_percentage(accepted_offers, total_offers),

        "scoreBuckets": _score_buckets(records),
        "funnel": _funnel(stage_counts, total),
        "sourceData": _source_breakdown(records),
        "jobPerformance": _job_performance(session, records, threshold),
        "departments": sorted({
            str(record.get("department") or UNASSIGNED_DEPARTMENT)
            for record in _build_insight_records(session)
        }),
    }
