import os
import re
import json
import uuid
import time
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from models.application import ApplicationModel
from models.candidate import CandidateModel
from models.job import JobModel
from schemas.application import ApplicationCreate, ApplicationUpdate
import services.candidate_service as candidate_service
import services.job_service as job_service

import config
import services.notification_service as notification_service
import services.automated_email_service as automated_email_service
import services.talent_pool_service as talent_pool_service
from services.application_stage import ApplicationStage, to_db_stage
from services.application_state import ApplicationState

import logging

logger = logging.getLogger(__name__)

def generate_next_application_id(db: Session) -> str:
    """
    Scans existing applicationId strings in format APP-XXXX, extracts integer suffixes,
    and returns next zero-padded formatted string APP-0001, APP-0002, etc.
    """
    app_ids = db.query(ApplicationModel.applicationId).all()
    max_num = 0
    pattern = re.compile(r"^APP-(\d+)$", re.IGNORECASE)
    for (aid,) in app_ids:
        if aid:
            match = pattern.match(str(aid).strip())
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
    next_num = max_num + 1
    return f"APP-{next_num:04d}"

def get_application_by_candidate_and_job(db: Session, candidate_identifier: str, job_identifier: str) -> Optional[ApplicationModel]:
    """
    Checks whether an application record already exists for the given candidate and job.
    Resolves candidate and job by internal ID or human-readable ID.
    """
    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, candidate_identifier)
    job = job_service.get_job_by_id_or_job_id(db, job_identifier)

    cand_ids = [candidate_identifier]
    if cand:
        cand_ids.extend([cand.id, cand.candidateId])
        
    job_ids = [job_identifier]
    if job:
        job_ids.extend([job.id, job.jobId])

    return db.query(ApplicationModel).filter(
        and_(
            ApplicationModel.candidateId.in_(cand_ids),
            ApplicationModel.jobId.in_(job_ids)
        )
    ).first()

def get_application_by_id_or_app_id(db: Session, identifier: str) -> Optional[ApplicationModel]:
    """
    Looks up an application record by internal primary key 'id', human-readable 'applicationId',
    or candidate identifier (candidateId or candidate internal UUID).
    Supports formatted variations (APP-0001, app-0001, 0001, UUID).
    """
    if not identifier:
        return None

    raw_id = str(identifier).strip()
    clean_lower = raw_id.lower()

    variants = [raw_id, clean_lower]
    if raw_id.isdigit():
        variants.append(f"APP-{int(raw_id):04d}")
        variants.append(f"APP-{raw_id}")
    elif clean_lower.startswith("app-"):
        num_part = clean_lower.replace("app-", "")
        if num_part.isdigit():
            variants.append(f"APP-{int(num_part):04d}")
            variants.append(num_part)

    app = db.query(ApplicationModel).filter(
        or_(
            func.lower(ApplicationModel.id).in_([v.lower() for v in variants]),
            func.lower(ApplicationModel.applicationId).in_([v.lower() for v in variants])
        )
    ).first()

    if app:
        return app

    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, identifier)
    if cand:
        cand_ids = [identifier, cand.id, cand.candidateId]
        return db.query(ApplicationModel).filter(ApplicationModel.candidateId.in_(cand_ids)).first()

    return None

def get_applications(db: Session, candidate_id: Optional[str] = None, job_id: Optional[str] = None) -> List[ApplicationModel]:
    """
    Retrieves applications, optionally filtering by candidateId or jobId.
    """
    query = db.query(ApplicationModel)
    if candidate_id:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, candidate_id)
        c_ids = [candidate_id]
        if cand: c_ids.extend([cand.id, cand.candidateId])
        query = query.filter(ApplicationModel.candidateId.in_(c_ids))

    if job_id:
        job = job_service.get_job_by_id_or_job_id(db, job_id)
        j_ids = [job_id]
        if job: j_ids.extend([job.id, job.jobId])
        query = query.filter(ApplicationModel.jobId.in_(j_ids))

    return query.order_by(ApplicationModel.createdAt.desc().nullslast()).all()

def create_application(db: Session, app_in: ApplicationCreate) -> ApplicationModel:
    """
    Creates a new Application linking a Candidate and a Job.
    Rejects duplicate applications for the same (candidateId, jobId) pair with 409 Conflict.
    Stores job-specific atsScore directly on the Application record.
    """
    logger.info("Application create requested: candidate=%s job=%s", app_in.candidateId, app_in.jobId)

    # 1. Resolve Candidate
    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, app_in.candidateId)
    if not cand:
        logger.warning("Application create refused: candidate %r not found", app_in.candidateId)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with identifier '{app_in.candidateId}' not found."
        )

    # 2. Resolve Job
    job = job_service.get_job_by_id_or_job_id(db, app_in.jobId)
    if not job:
        logger.warning("Application create refused: job %r not found", app_in.jobId)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job opening with identifier '{app_in.jobId}' not found."
        )

    # 3. Check for existing application (Duplicate Prevention)
    existing_app = get_application_by_candidate_and_job(db, cand.id, job.id)
    if existing_app:
        logger.warning("Application create refused: candidate %s already applied to job %s (application %s)",
                       cand.id, job.id, existing_app.id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied to this job."
        )

    max_retries = 5
    for attempt in range(max_retries):
        try:
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            assigned_app_id = app_in.applicationId or generate_next_application_id(db)
            internal_id = app_in.id or assigned_app_id or str(uuid.uuid4())

            data = app_in.dict(exclude_unset=True)
            data["id"] = internal_id
            data["applicationId"] = assigned_app_id
            data["candidateId"] = cand.id # Store internal candidate primary key FK
            data["jobId"] = job.id # Store internal job primary key FK
            data["candidateEmail"] = data.get("candidateEmail") or cand.email
            data["candidateName"] = data.get("candidateName") or f"{cand.firstName or ''} {cand.lastName or ''}".strip()
            data["appliedRole"] = job.title if (job and job.title) else (data.get("appliedRole") or "Applicant")
            data["department"] = data.get("department") or job.department
            data["status"] = to_db_stage(data.get("status"))
            data["applicationState"] = ApplicationState.OPEN
            data["source"] = data.get("source") or "Career Portal"
            data["createdAt"] = data.get("createdAt") or now
            data["updatedAt"] = now

            db_app = ApplicationModel(**data)
            db.add(db_app)
            db.commit()
            db.refresh(db_app)
            logger.info("Application created: id=%s applicationId=%s candidate=%s job=%s status=%s",
                        db_app.id, db_app.applicationId, cand.id, job.id, db_app.status)

            # Auto-run AI screening upon application creation for instant accurate ATS score
            try:
                logger.info("Application %s: running automatic screening", db_app.id)
                screen_application_resume(db, application_id=db_app.id)
                db.refresh(db_app)
            except Exception as screen_err:
                logger.warning("Application %s: automatic screening failed, application kept unscreened: %s",
                               db_app.id, screen_err, exc_info=True)

            return db_app
        except IntegrityError as err:
            db.rollback()
            # Check if database composite UNIQUE constraint caught a race condition duplicate
            if "uq_candidate_job_application" in str(err).lower() or "unique" in str(err).lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You have already applied to this job."
                )
            if attempt < max_retries - 1 and not app_in.applicationId:
                continue
            raise err

    raise RuntimeError("Failed to generate a unique Application ID after multiple retries.")

def update_application(db: Session, identifier: str, updates: ApplicationUpdate) -> Optional[ApplicationModel]:
    """
    Updates application details (e.g. status, notes, atsScore).
    """
    db_app = get_application_by_id_or_app_id(db, identifier)
    if not db_app:
        logger.warning("Application update: %r not found", identifier)
        return None

    update_data = updates.dict(exclude_unset=True)
    update_data.pop("id", None)
    update_data.pop("applicationId", None)
    update_data.pop("candidateId", None)
    update_data.pop("jobId", None)
    update_data.pop("createdAt", None)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data["updatedAt"] = now

    # Map any known status spelling (e.g. "Applied", "Screening", "Offered")
    # onto the canonical Title Case stage so the PostgreSQL application_stage
    # enum never rejects the write.
    if "status" in update_data:
        update_data["status"] = to_db_stage(update_data["status"])

    previous_status = db_app.status.value if isinstance(db_app.status, ApplicationStage) else db_app.status
    becomes_rejected = (
        update_data.get("status") == ApplicationStage.REJECTED.value
        and previous_status != ApplicationStage.REJECTED.value
    )

    for key, val in update_data.items():
        setattr(db_app, key, val)

    # Keep candidate.status synchronized with application.status in PostgreSQL
    if updates.status:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, db_app.candidateId)
        if cand:
            cand.status = db_app.status
            cand.updatedAt = now

        # Auto-preserve candidate in Talent Pool when application is Rejected
        if str(updates.status).strip().upper() in [ApplicationStage.REJECTED.value.upper(), "DECLINE", "DECLINED"]:
            try:
                from services import talent_pool_service
                from schemas.talent_pool import TalentPoolCreate
                tp_existing = talent_pool_service.get_talent_pool_by_id(db, db_app.candidateId)
                if not tp_existing and cand:
                    talent_pool_service.add_candidate_to_talent_pool(db, TalentPoolCreate(
                        candidateId=cand.candidateId or cand.id,
                        name=f"{cand.firstName or ''} {cand.lastName or ''}".strip() or "Candidate",
                        email=cand.email or "",
                        currentRole=cand.currentRole or cand.appliedRole or "Applicant",
                        currentCompany=cand.currentCompany or "Not specified",
                        experienceYears=cand.experienceYears or 0.0,
                        location=cand.location or "Remote",
                        status="Available",
                        tags=["Rejected Application", "Talent Pool"]
                    ))
            except Exception as tp_err:
                logger.warning("Application %s: talent pool auto-archive failed: %s", db_app.id, tp_err, exc_info=True)

    db.commit()
    db.refresh(db_app)
    logger.info("Application %s updated: fields=%s status %s -> %s",
                db_app.id, sorted(k for k in update_data if k != "updatedAt"),
                previous_status, db_app.status.value if isinstance(db_app.status, ApplicationStage) else db_app.status)

    if becomes_rejected:
        logger.info("Application %s: moved to Rejected, sending rejection email", db_app.id)
        automated_email_service.notify_candidate_rejected(db, db_app)
    return db_app

def delete_application(db: Session, identifier: str) -> bool:
    """
    Deletes an application record cleanly along with linked offers and interviews.
    """
    db_app = get_application_by_id_or_app_id(db, identifier)
    if not db_app:
        logger.warning("Application delete: %r not found", identifier)
        return False
        
    from models.interview import InterviewModel
    from models.offer import OfferModel

    app_ids = [db_app.id, db_app.applicationId]
    db.query(OfferModel).filter(OfferModel.applicationId.in_(app_ids)).delete(synchronize_session=False)
    db.query(InterviewModel).filter(InterviewModel.applicationId.in_(app_ids)).delete(synchronize_session=False)

    db.delete(db_app)
    db.commit()
    logger.info("Application %s deleted together with its offers and interviews", db_app.id)
    return True

def is_fresher_profile(cand) -> bool:
    """A candidate with under a year of experience (or declared a fresher) is scored on academics."""
    declared = f"{cand.experienceLevel or ''} {cand.totalExperience or ''}".lower()
    if "fresh" in declared:
        return True
    return (cand.totalExperienceMonths or 0) < 12 and (cand.experienceYears or 0) < 1


def profile_evidence_text(cand) -> str:
    """
    What a candidate added without a CV is scored on, built only from the saved profile:
    - a fresher: academic details (education, specialization, year of passing) and key skills
    - an experienced candidate: key skills, current role and current company
    Nothing is invented; a field that is empty is left out.
    """
    key_skills = (cand.keySkills or "").strip()
    if not key_skills and isinstance(cand.skills, list):
        key_skills = ", ".join(str(s) for s in cand.skills if s)
    lines = ["Profile details (no CV was uploaded):"]
    if is_fresher_profile(cand):
        lines.append("Candidate type: Fresher")
        for label, value in (("Highest education", cand.highestEducation), ("Specialization", cand.specialization),
                             ("Year of passing", cand.yearOfPassing)):
            if value and str(value).strip():
                lines.append(f"{label}: {str(value).strip()}")
    else:
        lines.append("Candidate type: Experienced")
        for label, value in (("Current role", cand.currentRole), ("Current company", cand.currentCompany)):
            if value and str(value).strip() and str(value).strip().lower() != "not specified":
                lines.append(f"{label}: {str(value).strip()}")
    if key_skills:
        lines.append(f"Key skills: {key_skills}")
    return "\n".join(lines)


def screen_application_resume(db: Session, application_id: str) -> dict:
    """
    Screens an application's resume using Gemini AI or JD-aware structured fallback.
    Compares the candidate resume & skills against the COMPLETE Job Description stored in JobModel.
    Updates application's aiEvaluation JSON field and atsScore in PostgreSQL.
    """
    logger.info("Screening started: application=%s", application_id)
    db_app = get_application_by_id_or_app_id(db, application_id)
    if not db_app:
        logger.warning("Screening refused: application %r not found", application_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application record '{application_id}' not found."
        )

    # Resolve candidate
    from services.candidate_service import get_candidate_by_id_or_candidate_id, extract_text_from_file_bytes
    import services.file_storage_service as file_storage_service

    cand = get_candidate_by_id_or_candidate_id(db, db_app.candidateId)
    if not cand and db_app.candidateEmail:
        from services.candidate_service import get_candidate_by_email
        cand = get_candidate_by_email(db, db_app.candidateEmail)

    resume_text = cand.resumeText if cand else None
    if cand and not resume_text and cand.resumeStorageKey:
        file_path = file_storage_service.get_resume_path(cand.resumeStorageKey)
        if file_path and os.path.exists(file_path):
            try:
                with open(file_path, "rb") as f:
                    fb = f.read()
                resume_text = extract_text_from_file_bytes(fb, cand.resumeFileName or "resume")
                if resume_text:
                    cand.resumeText = resume_text
                    db.commit()
            except Exception:
                pass

    # Resolve job from JobModel
    job = job_service.get_job_by_id_or_job_id(db, db_app.jobId) if db_app.jobId else None
    if not db_app.jobId:
        logger.warning("Screening application %s: it has NO job (the job was deleted?), so it is scored against an empty job description",
                       db_app.id)
    if db_app.jobId and not job:
        logger.warning("Screening refused: job %r of application %s does not exist", db_app.jobId, db_app.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected job opening '{db_app.jobId}' does not exist in backend database."
        )

    # Construct structured job_description object from JobModel fields
    job_info = {
        "title": job.title if job else (db_app.appliedRole or "Target Position"),
        "department": job.department if job else (db_app.department or "General"),
        "location": job.location if job else "Not Specified",
        "experienceLevel": job.experienceLevel if job else "Not Specified",
        "experienceRange": job.experienceRange if job else "Not Specified",
        "description": job.description if job else "No detailed description provided.",
        "responsibilities": job.responsibilities if job else [],
        "requirements": job.requirements if job else [],
        "preferredSkills": job.preferredSkills if job else [],
        "education": job.education if job else "Not Specified"
    }

    cand_name = f"{cand.firstName or ''} {cand.lastName or ''}".strip() if cand else (db_app.candidateName or "Candidate")
    if cand and isinstance(cand.skills, list):
        skills_text = ", ".join(str(s) for s in cand.skills)
    elif cand and cand.skills:
        skills_text = str(cand.skills)
    else:
        skills_text = ""
    # No CV: score the saved profile instead (fresher: academics + key skills; experienced: key skills,
    # current role, current company), so a candidate added by hand still gets a real ATS score.
    profile_only = bool(cand) and not (resume_text and resume_text.strip())
    profile_fresher = profile_only and is_fresher_profile(cand)
    if profile_only:
        full_resume_text = profile_evidence_text(cand)
        basis_note = (
            "NO CV WAS UPLOADED. Score ONLY from the profile details above: "
            + ("the academic details and key skills of this fresher. " if profile_fresher
               else "the key skills, current role and current company. ")
            + "Do not lower the score because a CV's usual sections (projects, experience history) are absent."
        )
        logger.info("Screening application %s: no CV, scoring the %s profile details", db_app.id,
                    "fresher (academics + key skills)" if profile_fresher else "experienced (key skills, role, company)")
    else:
        full_resume_text = resume_text or "No physical resume document content provided."
        basis_note = ""
    logger.info("Screening input: candidate=%s job=%s resume_text=%s skills=%d",
                cand.id if cand else None, job.id if job else None,
                f"{len(resume_text)} characters" if resume_text else "NONE (no resume text found)",
                len(skills_text.split(",")) if skills_text else 0)

    def format_field(val):
        if isinstance(val, list):
            return "\n".join(f"- {str(item)}" for item in val if item)
        elif isinstance(val, dict):
            parts = []
            for k, v in val.items():
                if isinstance(v, list):
                    v_str = ", ".join(str(i) for i in v)
                else:
                    v_str = str(v)
                parts.append(f"{k}: {v_str}")
            return "\n".join(parts)
        elif val:
            return str(val)
        return "None specified"

    resp_formatted = format_field(job_info["responsibilities"])
    req_formatted = format_field(job_info["requirements"])
    pref_formatted = format_field(job_info["preferredSkills"])

    formatted_jd = f"""
Job Title: {job_info['title']}
Department: {job_info['department']}
Experience Level: {job_info['experienceLevel']}
Experience Range: {job_info['experienceRange']}
Education Requirement: {job_info['education']}

Job Description:
{job_info['description']}

Key Responsibilities:
{resp_formatted}

Must-Have & Key Requirements:
{req_formatted}

Preferred Skills:
{pref_formatted}
"""

    # Check Gemini API Key
    api_key = os.environ.get("GEMINI_API_KEY")
    evaluation = None

    if not api_key:
        logger.info("Screening engine: fallback scoring (GEMINI_API_KEY is not set)")
    if api_key:
        gemini_started = time.monotonic()
        try:
            logger.info("Screening engine: Gemini (model=gemini-2.5-flash), calling the API (gives up after %ss)",
                        config.GEMINI_TIMEOUT_SECONDS)
            from google import genai
            from google.genai import types as genai_types
            client = genai.Client(
                api_key=api_key,
                http_options=genai_types.HttpOptions(timeout=config.GEMINI_TIMEOUT_SECONDS * 1000),
            )
            prompt = f"""You are an expert Enterprise ATS AI Screening Engine.
Your task is to conduct a rigorous, objective, and evidence-based ATS match evaluation comparing a candidate's resume against a specific Job Description (JD).

=== JOB DESCRIPTION ===
{formatted_jd}

=== CANDIDATE PROFILE ===
Candidate Name: {cand_name}
Declared Skills: {skills_text}

=== CANDIDATE RESUME TEXT ===
{full_resume_text}
{basis_note}

=== SCORING & EVALUATION INSTRUCTIONS ===
1. SCORE (0 - 100):
   - Calculate an objective 0-100 match score based strictly on actual alignment with the JD.
   - Do NOT restrict scores to 70-98. Unaligned resumes must receive low scores (e.g., 20-50), highly aligned resumes receive high scores (e.g., 80-95).
   - Weight MUST-HAVE requirements significantly higher than preferred skills.
   - Do NOT award points for skills or experience NOT supported by the resume text.
   - Evaluate experience against the JD experience level/range (e.g. a entry-level/fresher candidate should NOT be penalized for lacking 5+ years experience if the JD specifies 0-1 years).
   - Evaluate candidate education against the declared Education Requirement.

2. STRENGTHS (3-4 bullet items):
   - Only include genuine strengths directly supported by explicit evidence in the candidate's resume that match JD requirements.

3. GAPS (2-3 bullet items):
   - Only identify genuine missing, weak, or unclear JD requirements. Do not invent non-existent gaps.

4. INTERVIEW QUESTIONS (3-4 bullet items):
   - Generate role-specific technical and behavioral questions derived directly from the Job Description and candidate's specific gaps or key strengths.
   - Questions MUST be relevant to the specific role (e.g. for Data Analyst: SQL, Python, Excel, data cleaning, EDA, dashboards, statistics; for Software Engineer: coding, APIs, database design, testing).

5. FIT REASONING:
   - Provide a clear, objective explanation detailing why the candidate received this specific score, highlighting top matching criteria and key missing requirements.

Output ONLY valid JSON matching this exact structure:
{{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence summary of candidate fit for this specific job>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "interviewQuestions": ["<question 1>", "<question 2>", "<question 3>"],
  "fitReasoning": "<detailed explanation of score calculation and alignment>"
}}
"""
            res = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            raw_json = res.text.strip()
            if raw_json.startswith("```"):
                raw_json = raw_json.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict) and "score" in parsed:
                evaluation = parsed
                logger.info("Gemini returned a score of %s for application %s in %.1fs", parsed.get("score"), db_app.id,
                            time.monotonic() - gemini_started)
            else:
                logger.warning("Gemini reply for application %s had no score, falling back", db_app.id)
        except Exception as e:
            logger.warning("Gemini screening failed for application %s after %.1fs, falling back to the scoring engine: %s",
                           db_app.id, time.monotonic() - gemini_started, e)

    # Helper evaluation routines for experience, projects, and education
    def evaluate_experience_ratio(job_info_dict: dict, resume_str: str) -> float:
        exp_req = str(job_info_dict.get("experienceLevel") or job_info_dict.get("experienceRange") or "").lower()
        res_lower = resume_str.lower()
        
        is_fresher_job = any(k in exp_req for k in ["0-1", "0 - 1", "fresher", "entry", "intern", "junior", "not specified"])
        
        # Search for years of experience mentioned in resume
        exp_years_match = re.findall(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)", res_lower)
        found_years = [float(y) for y in exp_years_match] if exp_years_match else []
        max_exp = max(found_years) if found_years else 0.0

        if is_fresher_job:
            if max_exp >= 1.0 or "experience" in res_lower or "built" in res_lower:
                return 0.95
            return 0.85

        if "senior" in job_info_dict["title"].lower() or "lead" in job_info_dict["title"].lower():
            if max_exp >= 4.0:
                return 1.0
            elif max_exp >= 2.0:
                return 0.70
            elif max_exp > 0:
                return 0.40
            return 0.20

        if max_exp >= 2.0:
            return 1.0
        elif max_exp >= 1.0:
            return 0.85
        elif "developer" in res_lower or "engineer" in res_lower or "intern" in res_lower:
            return 0.60
        return 0.20

    def evaluate_projects_ratio(job_info_dict: dict, resume_str: str) -> float:
        res_lower = resume_str.lower()
        has_project_section = any(k in res_lower for k in ["project", "portfolio", "github", "built", "developed", "architected", "implemented", "api"])
        
        if not has_project_section:
            return 0.30

        # Check technical term overlap in project context
        tech_terms = ["python", "fastapi", "django", "postgres", "postgresql", "rest", "api", "docker", "react", "sql", "aws", "node"]
        matched_terms = [t for t in tech_terms if t in res_lower]
        
        if len(matched_terms) >= 3:
            return 0.95
        elif len(matched_terms) >= 1:
            return 0.80
        return 0.50

    def evaluate_education_ratio(edu_req_str: str, resume_str: str) -> float:
        res_lower = resume_str.lower()
        edu_keywords = ["bachelor", "b.tech", "btech", "b.s", "bs", "master", "m.tech", "mtech", "degree", "computer science", "engineering", "diploma"]
        if any(k in res_lower for k in edu_keywords):
            return 1.0
        return 0.50

    if not evaluation or not isinstance(evaluation, dict) or "score" not in evaluation:
        logger.info("Screening engine: fallback 6-category scoring for application %s", db_app.id)
        # Structured, Alias-Aware ATS Fallback Evaluation Engine
        jd_title_lower = job_info["title"].lower()
        combined_resume = (skills_text + " " + full_resume_text).lower()
        cand_role_str = (cand.currentRole or "") if cand else ""

        # Generic Role & Soft-Skill Words (Never treated as independent technical skills)
        ROLE_WORDS = {
            "developer", "engineer", "analyst", "manager", "designer", "consultant", 
            "specialist", "lead", "senior", "junior", "intern", "architect", "administrator",
            "director", "head", "officer", "executive", "associate", "trainee", "vp",
            "backend", "frontend", "fullstack", "full", "stack", "development", "programmer",
            "programming", "software"
        }

        # Strict Stop Words / Header Filter to eliminate non-technical boilerplate pollution
        BOILERPLATE_STOP_WORDS = ROLE_WORDS.union({
            "the", "and", "for", "with", "this", "that", "from", "have", "are", "will", "your", 
            "must", "work", "team", "role", "job", "candidate", "about", "looking", "ability", 
            "experience", "skills", "specified", "description", "detailed", "provided", 
            "musthave", "goodtohave", "responsibilities", "requirements", "preferred", "general", 
            "level", "range", "education", "requirement", "title", "department", "none",
            "location", "position", "company", "years", "year", "strong", "working", "building",
            "knowledge", "proven", "understanding", "degree", "field", "bachelor", "master", "plus",
            "problem", "solving", "communication", "soft", "languages", "workflows", "workflow",
            "mechanisms", "mechanism", "authentication", "authorization", "debugging", "duties",
            "basic", "good", "excellent", "written", "verbal", "analytical", "related", "field"
        })

        # Known technical tokens for prose sentence skill extraction
        KNOWN_TECH_TOKENS = {
            "python": "Python", "fastapi": "FastAPI", "django": "Django", "flask": "Flask",
            "java": "Java", "javascript": "JavaScript", "js": "JavaScript", "typescript": "TypeScript",
            "ts": "TypeScript", "node": "Node.js", "node.js": "Node.js", "nodejs": "Node.js",
            "express": "Express.js", "react": "React", "reactjs": "React", "react.js": "React",
            "html": "HTML", "css": "CSS", "sql": "SQL", "postgresql": "PostgreSQL",
            "postgres": "PostgreSQL", "psql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
            "redis": "Redis", "kafka": "Kafka", "elasticsearch": "Elasticsearch", "aws": "AWS",
            "amazon web services": "AWS", "azure": "Azure", "gcp": "GCP", "docker": "Docker",
            "kubernetes": "Kubernetes", "k8s": "Kubernetes", "git": "Git", "github": "Git",
            "rest": "REST APIs", "restful": "REST APIs", "rest api": "REST APIs",
            "restful api": "REST APIs", "graphql": "GraphQL", "microservices": "Microservices",
            "ci/cd": "CI/CD", "cicd": "CI/CD", "oop": "OOP", "http": "HTTP", "json": "JSON",
            "pandas": "Pandas", "numpy": "NumPy", "power bi": "Power BI", "tableau": "Tableau",
            "excel": "Excel", "eda": "EDA", "statistics": "Statistics",
            "authentication": "Authentication", "authorization": "Authorization"
        }

        # Technology Alias & Synonym Map
        ALIAS_MAP = {
            "postgres": ["postgres", "postgresql", "psql"],
            "postgresql": ["postgres", "postgresql", "psql"],
            "js": ["js", "javascript", "ecmascript"],
            "javascript": ["js", "javascript", "ecmascript"],
            "aws": ["aws", "amazon web services", "amazon web service"],
            "amazon web services": ["aws", "amazon web services"],
            "rest": ["rest", "restful", "rest api", "restful api", "restful apis", "rest apis"],
            "restful": ["rest", "restful", "rest api", "restful api", "restful apis", "rest apis"],
            "rest api": ["rest", "restful", "rest api", "restful api", "restful apis", "rest apis"],
            "restful api": ["rest", "restful", "rest api", "restful api", "restful apis", "rest apis"],
            "node": ["node", "node.js", "nodejs"],
            "node.js": ["node", "node.js", "nodejs"],
            "nodejs": ["node", "node.js", "nodejs"],
            "react": ["react", "react.js", "reactjs"],
            "reactjs": ["react", "react.js", "reactjs"],
            "py": ["python", "py"],
            "python": ["python", "py"]
        }

        def is_skill_in_text(skill_term: str, text: str) -> bool:
            st_clean = re.sub(r"^[\s•\-:\.,]+|[\s•\-:\.,]+$", "", str(skill_term)).lower().strip()
            if not st_clean:
                return False
            if st_clean in text:
                return True
            aliases = ALIAS_MAP.get(st_clean, [])
            for alias in aliases:
                if alias in text:
                    return True
            escaped = re.escape(st_clean)
            if re.search(r"\b" + escaped + r"\b", text):
                return True
            return False

        def parse_skills_from_raw(raw_items) -> list:
            items = []
            if isinstance(raw_items, dict):
                must_arr = raw_items.get("mustHave") or raw_items.get("requiredSkills") or []
                if isinstance(must_arr, list):
                    items.extend([str(s).strip() for s in must_arr if s])
            elif isinstance(raw_items, list):
                items.extend([str(s).strip() for s in raw_items if s])
            elif isinstance(raw_items, str) and raw_items:
                items.extend([s.strip() for s in re.split(r"[\n,;•\-]+", raw_items) if s.strip()])

            result = []
            for item in items:
                clean_item = re.sub(r"^[\s•\-:\.,]+|[\s•\-:\.,]+$", "", item).strip()
                if not clean_item:
                    continue
                
                # Check if item is short skill name
                words = clean_item.split()
                if len(words) <= 3 and clean_item.lower() not in BOILERPLATE_STOP_WORDS:
                    result.append(clean_item)
                else:
                    # Prose sentence: extract known technical tokens ONLY
                    found = []
                    item_lower = clean_item.lower()
                    for tech_key, tech_label in KNOWN_TECH_TOKENS.items():
                        escaped = re.escape(tech_key)
                        if re.search(r"\b" + escaped + r"\b", item_lower):
                            found.append(tech_label)
                    if found:
                        result.extend(found)

            return list(dict.fromkeys(result))

        # Role / Title Similarity Component (Evaluated separately from technical skills)
        def calculate_role_match(job_title: str, resume_text_lower: str, current_role: str) -> float:
            jt_clean = job_title.lower().strip()
            cr_clean = (current_role + " " + resume_text_lower).lower()
            if jt_clean in cr_clean:
                return 1.0
            jt_tech_tokens = [t for t in re.findall(r"\b[a-zA-Z]{3,}\b", jt_clean) if t not in BOILERPLATE_STOP_WORDS]
            has_tech = any(t in cr_clean for t in jt_tech_tokens) if jt_tech_tokens else True
            has_role = any(r in cr_clean for r in ROLE_WORDS)
            if has_tech and has_role:
                return 0.90
            elif has_tech:
                return 0.75
            elif has_role:
                return 0.50
            return 0.30

        role_match_score = calculate_role_match(job_info["title"], combined_resume, cand_role_str)

        # Extract Required (Must-Have) Skills
        clean_req_skills = parse_skills_from_raw(job_info.get("requirements"))
        clean_pref_skills = parse_skills_from_raw(job_info.get("preferredSkills"))

        # Separate Matching logic
        matched_req = [s for s in clean_req_skills if is_skill_in_text(s, combined_resume)]
        missing_req = [s for s in clean_req_skills if not is_skill_in_text(s, combined_resume)]

        matched_pref = [s for s in clean_pref_skills if is_skill_in_text(s, combined_resume)]
        missing_pref = [s for s in clean_pref_skills if not is_skill_in_text(s, combined_resume)]

        # === 6-CATEGORY DETERMINISTIC SCORING ENGINE WITH DYNAMIC NORMALIZATION ===
        R_req = len(matched_req) / max(1, len(clean_req_skills)) if clean_req_skills else 1.0
        R_exp = evaluate_experience_ratio(job_info, full_resume_text)
        R_proj = evaluate_projects_ratio(job_info, full_resume_text)
        R_role = role_match_score

        # Weights of the experience / projects / role categories. With no CV the profile has no
        # projects or experience history to read, so those are switched off (like preferred skills
        # and education are when the JD lacks them) and the profile's own evidence carries the score:
        # a fresher on academics + key skills, an experienced candidate on key skills + current role.
        W_exp, W_proj, W_role = 20.0, 15.0, 10.0
        if profile_only:
            W_exp, W_proj = 0.0, 0.0
            W_role = 0.0 if profile_fresher else 20.0

        if clean_pref_skills:
            R_pref = len(matched_pref) / len(clean_pref_skills)
            W_pref = 10.0
        else:
            R_pref = 0.0
            W_pref = 0.0  # Deactivated if absent from JD

        edu_req_str = str(job_info.get("education") or "").strip()
        if edu_req_str and edu_req_str.lower() not in ["not specified", "none", "n/a"]:
            R_edu = evaluate_education_ratio(edu_req_str, full_resume_text)
            W_edu = 20.0 if profile_fresher else 5.0
        else:
            R_edu = 0.0
            W_edu = 0.0  # Deactivated if absent from JD

        W_active_sum = 40.0 + W_exp + W_proj + W_role + W_pref + W_edu
        earned_points = (40.0 * R_req) + (W_exp * R_exp) + (W_proj * R_proj) + (W_role * R_role) + (W_pref * R_pref) + (W_edu * R_edu)

        calc_score = int(round((earned_points / max(1.0, W_active_sum)) * 100.0))

        if len(combined_resume.strip()) < 30:
            calc_score = min(calc_score, 40)
        else:
            calc_score = min(95, max(30, calc_score))

        matching_skills = matched_req + matched_pref
        missing_skills = missing_req + missing_pref

        # Role-specific interview questions based on Job Title & JD content
        if "data analyst" in jd_title_lower or "analytics" in jd_title_lower or "data" in jd_title_lower:
            strengths_list = [
                f"Demonstrated proficiency in data manipulation and query tools relevant to {job_info['title']}",
                "Familiarity with data cleaning, exploratory data analysis (EDA), and reporting workflows",
                "Strong analytical mindset with capacity to translate raw datasets into actionable insights"
            ]
            gaps_list = [
                f"Verify depth of experience with specific JD data visualization tools ({' / '.join(missing_skills[:2]) if missing_skills else 'dashboards'})",
                "Evaluate hands-on experience with production SQL database optimization and complex joins"
            ]
            questions_list = [
                f"Can you explain your workflow for data extraction, joining tables, and writing complex queries in SQL for {job_info['title']}?",
                "How do you approach cleaning raw datasets with missing values or anomalies using Python (Pandas) or Excel?",
                "Describe a time you built a dashboard or data visualization to communicate insights to non-technical stakeholders.",
                "How do you validate statistical findings before presenting recommendations to hiring managers?"
            ]
        elif "frontend" in jd_title_lower or "react" in jd_title_lower or "ui" in jd_title_lower:
            strengths_list = [
                f"Strong foundation in modern frontend web technologies aligned with {job_info['title']}",
                "Experience building responsive, component-driven user interface applications",
                "Familiarity with state management, modern JavaScript/TypeScript, and web performance"
            ]
            gaps_list = [
                "Verify experience with specific state management and build tool configurations",
                "Assess depth of automated component testing and accessibility (a11y) standards"
            ]
            questions_list = [
                "How do you structure component hierarchies and manage global state in complex web applications?",
                "What techniques do you use to optimize page load speeds, LCP, and rendering performance?",
                "Can you walk through your process for ensuring cross-browser compatibility and responsive design?"
            ]
        else:
            strengths_list = [
                f"Direct alignment with key responsibilities for the {job_info['title']} role",
                f"Demonstrated technical and functional domain skills ({', '.join(matching_skills[:3]) if matching_skills else 'core competencies'})",
                "Strong communication and collaborative problem-solving approach"
            ]
            gaps_list = [
                f"Further evaluate experience in specific requirement areas ({', '.join(missing_skills) if missing_skills else 'advanced tooling'})",
                "Confirm depth of hands-on project delivery under tight deadlines"
            ]
            questions_list = [
                f"Can you describe a key project from your background that directly relates to the responsibilities of {job_info['title']}?",
                "How do you prioritize competing tasks and resolve technical challenges when requirements evolve?",
                "What tools and methodologies do you rely on to maintain quality and accuracy in your deliverables?"
            ]

        category_breakdown = {
            "requiredSkills": {
                "score": round(40.0 * R_req, 1),
                "maxWeight": 40,
                "matched": matched_req,
                "missing": missing_req,
                "total": len(clean_req_skills),
                "matchedCount": len(matched_req),
                "ratio": round(R_req, 2)
            },
            "experience": {
                "score": round(W_exp * R_exp, 1),
                "maxWeight": int(W_exp),
                "ratio": round(R_exp, 2)
            },
            "projects": {
                "score": round(W_proj * R_proj, 1),
                "maxWeight": int(W_proj),
                "ratio": round(R_proj, 2)
            },
            "roleMatch": {
                "score": round(W_role * R_role, 1),
                "maxWeight": int(W_role),
                "ratio": round(R_role, 2)
            },
            "preferredSkills": {
                "active": W_pref > 0,
                "score": round(W_pref * R_pref, 1) if W_pref > 0 else None,
                "maxWeight": 10 if W_pref > 0 else 0,
                "matched": matched_pref,
                "missing": missing_pref,
                "total": len(clean_pref_skills),
                "matchedCount": len(matched_pref),
                "ratio": round(R_pref, 2) if W_pref > 0 else None
            },
            "education": {
                "active": W_edu > 0,
                "score": round(W_edu * R_edu, 1) if W_edu > 0 else None,
                "maxWeight": 5 if W_edu > 0 else 0,
                "requirement": edu_req_str if W_edu > 0 else "None specified",
                "ratio": round(R_edu, 2) if W_edu > 0 else None
            },
            "activeWeightSum": W_active_sum,
            "earnedPoints": round(earned_points, 1),
            "finalScore": calc_score
        }

        evaluation = {
            "score": calc_score,
            "basis": ("profile: academic details and key skills" if profile_fresher else
                      "profile: key skills, current role and current company") if profile_only else "cv",
            "categoryBreakdown": category_breakdown,
            "summary": f"{cand_name} has been evaluated against the {job_info['title']} Job Description. The profile displays a {calc_score}% ATS alignment across technical skills, experience, projects, and role fit.",
            "strengths": strengths_list,
            "gaps": gaps_list,
            "interviewQuestions": questions_list,
            "fitReasoning": f"Score of {calc_score}% calculated by evaluating candidate resume evidence against JD requirements for {job_info['title']} using a 6-category weighted evidence engine (Active Weight Base: {int(W_active_sum)}pts)."
        }

    # Record what the score was based on (the CV, or the profile when none was uploaded).
    evaluation.setdefault("basis", ("profile: academic details and key skills" if profile_fresher else
                                    "profile: key skills, current role and current company") if profile_only else "cv")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    calc_score = int(evaluation.get("score", 0))
    threshold = config.ATS_MATCH_THRESHOLD
    # Unwrap the SQLAlchemy enum member so this yields "rejected", not
    # "applicationstage.rejected".
    prev_raw = db_app.status.value if isinstance(db_app.status, ApplicationStage) else (db_app.status or "")
    prev_status = str(prev_raw).lower()

    existing_eval = dict(db_app.aiEvaluation or {})
    merged_eval = {**existing_eval, **evaluation}
    
    if calc_score > threshold:
        new_stage = ApplicationStage.SHORTLISTED.value
        rejection_reason = None
    else:
        new_stage = ApplicationStage.REJECTED.value
        rejection_reason = f"Candidate did not meet the minimum ATS match threshold of {threshold}%."
        merged_eval["rejectionReason"] = rejection_reason

    logger.info("Screening result: application=%s score=%s threshold=%s (needs MORE than the threshold) -> %s (was %s)",
                db_app.id, calc_score, threshold, new_stage, prev_status or "none")
    if prev_status in ("interviewing", "offer") and new_stage.lower() != prev_status:
        logger.warning("Screening is changing application %s from %s to %s even though it was already past screening",
                       db_app.id, prev_status, new_stage)

    db_app.aiEvaluation = merged_eval
    db_app.atsScore = calc_score
    db_app.status = new_stage
    db_app.updatedAt = now

    if cand:
        cand.status = new_stage
        cand.updatedAt = now

    db.commit()
    db.refresh(db_app)

    # Perform automated rejection side-effects (notification, email trigger, & talent pool retention)
    if new_stage == ApplicationStage.REJECTED.value:
        # 1. Retain candidate in Talent Pool for future opportunity matching (idempotent)
        if cand:
            try:
                talent_pool_service.auto_add_rejected_candidate_to_talent_pool(
                    db=db,
                    candidate=cand,
                    app=db_app,
                    score=calc_score,
                    rejection_reason=rejection_reason
                )
                logger.info("Application %s rejected by screening: candidate kept in the talent pool", db_app.id)
            except Exception as tp_err:
                logger.warning("Application %s: talent pool retention failed: %s", db_app.id, tp_err, exc_info=True)

        if prev_status != "rejected":
            eval_dict = dict(db_app.aiEvaluation or {})
            if not eval_dict.get("rejectionEmailSent"):
                cand_name_str = (db_app.candidateName or f"{cand.firstName if cand else ''} {cand.lastName if cand else ''}").strip() or "Candidate"
                job_title_str = db_app.appliedRole or (job.title if job else "Open Position")

                # 2. Create rejection notification for recruiter/HR dashboard
                try:
                    notification_service.create_notification_event(
                        db,
                        title="Candidate Application Rejected",
                        message=f"Application for {cand_name_str} ({job_title_str}) was rejected automatically (ATS Score: {calc_score}% vs {threshold}% Threshold).",
                        candidate_name=cand_name_str,
                        job_title=job_title_str
                    )
                    logger.info("Application %s: dashboard notification created for the rejection", db_app.id)
                except Exception as notif_err:
                    logger.warning("Application %s: rejection notification failed: %s", db_app.id, notif_err, exc_info=True)

                # 3. Automated rejection email (non-blocking; marked sent only when delivered)
                try:
                    automated_email_service.notify_candidate_rejected(db, db_app)
                except Exception as email_err:
                    logger.error("Application %s: rejection email step failed: %s", db_app.id, email_err, exc_info=True)

    return {
        "success": True,
        "evaluation": db_app.aiEvaluation,
        # The stage the screening actually saved (Shortlisted or Rejected), so screens show the real one.
        "status": new_stage,
    }
