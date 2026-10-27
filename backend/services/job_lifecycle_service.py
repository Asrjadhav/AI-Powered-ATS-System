"""
What happens to a job's applications when the job stops or starts accepting them.

  job Open -> Closed / Draft : applications go "On Hold", candidates go to the Talent Pool
  job Closed / Draft -> Open : applications go back to "Open", and Talent Pool entries that
                               were only there because of this job are removed
  job deleted                : candidates go to the Talent Pool (permanently), then the
                               job's applications are deleted

None of these functions commit: the caller (services/job_service.py) commits once, so the
job change and everything here succeed or fail together. Candidate rows and resumes are
never touched.

Talent Pool bookkeeping: an entry this module creates for a held job records the job ids
holding it in recruitmentHistory["heldForJobIds"]. Only such entries are ever removed on
reopen, and only once no held job is left. Entries that were already in the pool (added by
a recruiter, or by rejection) are never claimed or removed here.
"""

import datetime
import uuid
import logging
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.interview import InterviewModel
from models.offer import OfferModel
from models.talent_pool import TalentPoolModel
from services.application_state import ApplicationState

logger = logging.getLogger(__name__)

# Job statuses that mean "accepting applications" (the UI shows these as "Open").
OPEN_JOB_STATUSES = {"active", "published", "open"}

HELD_FOR_KEY = "heldForJobIds"


def is_open_status(job_status: Optional[str]) -> bool:
    return str(job_status or "").strip().lower() in OPEN_JOB_STATUSES


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _job_applications(db: Session, job) -> List[ApplicationModel]:
    # applications.jobId holds the job's primary key; jobId (JOB-0001) is included for older rows.
    return db.query(ApplicationModel).filter(ApplicationModel.jobId.in_([job.id, job.jobId])).all()


def _talent_pool_entry(db: Session, candidate: CandidateModel) -> Optional[TalentPoolModel]:
    return db.query(TalentPoolModel).filter(
        TalentPoolModel.candidateId.in_([candidate.id, candidate.candidateId])
    ).first()


def _stage(app: ApplicationModel) -> str:
    return app.status.value if hasattr(app.status, "value") else str(app.status or "New")


def _new_talent_pool_entry(candidate: CandidateModel, app: ApplicationModel, job, reason: str,
                           held_for_job_id: Optional[str]) -> TalentPoolModel:
    now = _now()
    history = {
        "appliedJob": job.title,
        "previousRole": job.title,
        "previousStage": _stage(app),
        "previousStatus": _stage(app),
        "previousAtsScore": app.atsScore,
        "atsScore": app.atsScore,
        "notSelectedReason": reason,
        "addedToTalentPoolAt": now,
        "recruiterNotes": f"Added to the Talent Pool because {job.title} ({job.jobId}) {reason.lower()}.",
    }
    if held_for_job_id:
        history[HELD_FOR_KEY] = [held_for_job_id]
    return TalentPoolModel(
        id=f"tp_{str(uuid.uuid4())[:8]}",
        candidateId=candidate.id,
        currentRole=candidate.currentRole,
        currentCompany=candidate.currentCompany,
        skills=candidate.skills,
        experienceYears=candidate.experienceYears,
        location=candidate.location,
        aiMatchScore=app.atsScore if app.atsScore is not None else candidate.aiScore,
        availability="Immediate",
        noticePeriod=candidate.noticePeriod,
        status="Available",
        department=app.department or job.department,
        education={
            "degree": candidate.highestEducation,
            "specialization": candidate.specialization,
            "passingYear": candidate.yearOfPassing,
        },
        tags=["Job On Hold" if held_for_job_id else "Job Deleted"],
        recruitmentHistory=history,
        recruiterNotes=history["recruiterNotes"],
        createdAt=now,
        updatedAt=now,
    )


def _candidates_with_apps(db: Session, apps: List[ApplicationModel]):
    """(candidate, application) pairs, one per candidate, skipping applications whose candidate is missing."""
    seen = set()
    for app in apps:
        if app.candidateId in seen:
            continue
        seen.add(app.candidateId)
        candidate = db.query(CandidateModel).filter(CandidateModel.id == app.candidateId).first()
        if candidate is None:
            logger.warning("Application %s: candidate %s not found, skipped for the Talent Pool", app.id, app.candidateId)
            continue
        yield candidate, app


def hold_job_applications(db: Session, job) -> Dict[str, int]:
    """Job left Open: its applications go On Hold and their candidates go to the Talent Pool."""
    apps = _job_applications(db, job)
    now = _now()
    held = added = already = 0
    for app in apps:
        if app.applicationState != ApplicationState.ON_HOLD:
            app.applicationState = ApplicationState.ON_HOLD
            app.updatedAt = now
            held += 1

    for candidate, app in _candidates_with_apps(db, apps):
        entry = _talent_pool_entry(db, candidate)
        if entry is None:
            db.add(_new_talent_pool_entry(candidate, app, job, "Is on hold", held_for_job_id=job.id))
            db.flush()
            added += 1
            continue
        history = dict(entry.recruitmentHistory or {})
        if HELD_FOR_KEY in history and job.id not in history[HELD_FOR_KEY]:
            # Pool entry exists only because of another held job: this job holds it too now.
            history[HELD_FOR_KEY] = list(history[HELD_FOR_KEY]) + [job.id]
            entry.recruitmentHistory = history
            entry.updatedAt = now
        already += 1

    logger.info("Job %s (%s) on hold: %d application(s) set On Hold, %d candidate(s) added to the Talent Pool, "
                "%d already there", job.id, job.jobId, held, added, already)
    return {"applicationsOnHold": held, "talentPoolAdded": added, "talentPoolExisting": already}


def reopen_job_applications(db: Session, job) -> Dict[str, int]:
    """Job is Open again: its applications go back to Open, and pool entries held only by it are removed."""
    apps = _job_applications(db, job)
    now = _now()
    reopened = removed = 0
    for app in apps:
        if app.applicationState != ApplicationState.OPEN:
            app.applicationState = ApplicationState.OPEN
            app.updatedAt = now
            reopened += 1

    for candidate, _app in _candidates_with_apps(db, apps):
        entry = _talent_pool_entry(db, candidate)
        if entry is None:
            continue
        history = dict(entry.recruitmentHistory or {})
        if HELD_FOR_KEY not in history:
            continue  # in the pool for another reason (recruiter, rejection, deleted job): keep it
        remaining = [jid for jid in history[HELD_FOR_KEY] if jid != job.id]
        if remaining:
            history[HELD_FOR_KEY] = remaining
            entry.recruitmentHistory = history
            entry.updatedAt = now
        else:
            db.delete(entry)
            removed += 1

    logger.info("Job %s (%s) reopened: %d application(s) set Open, %d Talent Pool entr(ies) removed",
                job.id, job.jobId, reopened, removed)
    return {"applicationsReopened": reopened, "talentPoolRemoved": removed}


def remove_job_applications(db: Session, job) -> Dict[str, int]:
    """
    Job is being deleted: its candidates go to the Talent Pool first (for good), then its
    applications are deleted. Interviews and offers of those applications are kept and
    just lose the link to the deleted application.
    """
    apps = _job_applications(db, job)
    now = _now()
    added = already = 0
    for candidate, app in _candidates_with_apps(db, apps):
        entry = _talent_pool_entry(db, candidate)
        if entry is None:
            db.add(_new_talent_pool_entry(candidate, app, job, "Was deleted", held_for_job_id=None))
            added += 1
            continue
        history = dict(entry.recruitmentHistory or {})
        if HELD_FOR_KEY in history:
            # Was in the pool only while this (or another) job was on hold; the job is gone,
            # so the candidate now stays in the pool.
            history.pop(HELD_FOR_KEY)
            entry.recruitmentHistory = history
            entry.updatedAt = now
        already += 1
    # Talent Pool rows are written before any application is removed.
    db.flush()

    app_ids = [app.id for app in apps]
    n_interviews = n_offers = n_deleted = 0
    if app_ids:
        n_interviews = db.query(InterviewModel).filter(InterviewModel.applicationId.in_(app_ids)).update(
            {InterviewModel.applicationId: None}, synchronize_session=False)
        n_offers = db.query(OfferModel).filter(OfferModel.applicationId.in_(app_ids)).update(
            {OfferModel.applicationId: None}, synchronize_session=False)
        n_deleted = db.query(ApplicationModel).filter(ApplicationModel.id.in_(app_ids)).delete(synchronize_session=False)

    logger.warning("Job %s (%s) deleted: %d candidate(s) added to the Talent Pool, %d already there, "
                   "%d application(s) deleted, %d interview(s) and %d offer(s) unlinked from them",
                   job.id, job.jobId, added, already, n_deleted, n_interviews, n_offers)
    return {"talentPoolAdded": added, "talentPoolExisting": already, "applicationsDeleted": n_deleted}
