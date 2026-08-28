import os
import re
import json
import uuid
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
    # 1. Resolve Candidate
    cand = candidate_service.get_candidate_by_id_or_candidate_id(db, app_in.candidateId)
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with identifier '{app_in.candidateId}' not found."
        )

    # 2. Resolve Job
    job = job_service.get_job_by_id_or_job_id(db, app_in.jobId)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job opening with identifier '{app_in.jobId}' not found."
        )

    # 3. Check for existing application (Duplicate Prevention)
    existing_app = get_application_by_candidate_and_job(db, cand.id, job.id)
    if existing_app:
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
            data["appliedRole"] = data.get("appliedRole") or job.title
            data["department"] = data.get("department") or job.department
            data["status"] = data.get("status") or "Applied"
            data["source"] = data.get("source") or "Career Portal"
            data["createdAt"] = data.get("createdAt") or now
            data["updatedAt"] = now

            db_app = ApplicationModel(**data)
            db.add(db_app)
            db.commit()
            db.refresh(db_app)

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
        return None

    update_data = updates.dict(exclude_unset=True)
    update_data.pop("id", None)
    update_data.pop("applicationId", None)
    update_data.pop("candidateId", None)
    update_data.pop("jobId", None)
    update_data.pop("createdAt", None)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data["updatedAt"] = now

    for key, val in update_data.items():
        setattr(db_app, key, val)

    # Keep candidate.status synchronized with application.status in PostgreSQL
    if updates.status:
        cand = candidate_service.get_candidate_by_id_or_candidate_id(db, db_app.candidateId)
        if cand:
            cand.status = updates.status
            cand.updatedAt = now

        # Auto-preserve candidate in Talent Pool when application is Rejected
        if str(updates.status).strip().lower() in ["rejected", "decline", "declined"]:
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
                print("Talent pool auto-archiving note:", tp_err)

    db.commit()
    db.refresh(db_app)
    return db_app

def delete_application(db: Session, identifier: str) -> bool:
    """
    Deletes an application record cleanly along with linked offers and interviews.
    """
    db_app = get_application_by_id_or_app_id(db, identifier)
    if not db_app:
        return False
        
    from models.interview import InterviewModel
    from models.offer import OfferModel

    app_ids = [db_app.id, db_app.applicationId]
    db.query(OfferModel).filter(OfferModel.applicationId.in_(app_ids)).delete(synchronize_session=False)
    db.query(InterviewModel).filter(InterviewModel.applicationId.in_(app_ids)).delete(synchronize_session=False)

    db.delete(db_app)
    db.commit()
    return True

def screen_application_resume(db: Session, application_id: str) -> dict:
    """
    Screens an application's resume using Gemini AI or JD-aware structured fallback.
    Compares the candidate resume & skills against the COMPLETE Job Description stored in JobModel.
    Updates application's aiEvaluation JSON field and atsScore in PostgreSQL.
    """
    db_app = get_application_by_id_or_app_id(db, application_id)
    if not db_app:
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
    full_resume_text = resume_text or "No physical resume document content provided."

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

    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"""You are an expert Enterprise ATS AI Screening Engine.
Your task is to conduct a rigorous, objective, and evidence-based ATS match evaluation comparing a candidate's resume against a specific Job Description (JD).

=== JOB DESCRIPTION ===
{formatted_jd}

=== CANDIDATE PROFILE ===
Candidate Name: {cand_name}
Declared Skills: {skills_text}

=== CANDIDATE RESUME TEXT ===
{full_resume_text}

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
        except Exception as e:
            print(f"Gemini API invocation error during screening: {e}")

    if not evaluation or not isinstance(evaluation, dict) or "score" not in evaluation:
        # JD-Aware Fallback Evaluation (No generic software-engineering fallbacks)
        jd_title_lower = job_info["title"].lower()
        combined_resume = (skills_text + " " + full_resume_text).lower()
        combined_jd = (job_info["title"] + " " + job_info["description"] + " " + resp_formatted + " " + req_formatted + " " + pref_formatted).lower()

        # Extract core keywords from JD
        jd_keywords = set(re.findall(r"\b[a-zA-Z]{3,}\b", combined_jd))
        stop_words = {"the", "and", "for", "with", "this", "that", "from", "have", "are", "will", "your", "must", "work", "team", "role", "job", "candidate", "about", "looking", "ability", "experience", "skills"}
        target_keywords = [w for w in jd_keywords if w not in stop_words and len(w) > 3]

        matching_skills = [w.capitalize() for w in target_keywords if w in combined_resume]
        missing_skills = [w.capitalize() for w in target_keywords if w not in combined_resume][:3]

        # Calculate evidence-based match score
        if target_keywords:
            overlap = len(matching_skills) / max(1, len(target_keywords))
            calc_score = int(35 + (overlap * 55))
        else:
            calc_score = 75

        if len(combined_resume.strip()) < 30:
            calc_score = min(calc_score, 40)
        else:
            calc_score = min(95, max(30, calc_score))

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

        evaluation = {
            "score": calc_score,
            "summary": f"{cand_name} has been evaluated against the {job_info['title']} Job Description. The profile displays a {calc_score}% ATS keyword and requirement alignment.",
            "strengths": strengths_list,
            "gaps": gaps_list,
            "interviewQuestions": questions_list,
            "fitReasoning": f"Score of {calc_score}% calculated by evaluating candidate resume evidence against JD requirements for {job_info['title']}. Candidate matched key domain requirements with identified areas for technical verification."
        }

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db_app.aiEvaluation = evaluation
    calc_score = int(evaluation.get("score", 0))
    db_app.atsScore = calc_score
    
    # Progress recruitment stage from Applied according to AI screening decision
    if calc_score >= 50:
        new_stage = "Shortlisted"
    else:
        new_stage = "Screening"

    db_app.status = new_stage
    db_app.updatedAt = now

    if cand:
        cand.status = new_stage
        cand.updatedAt = now

    db.commit()
    db.refresh(db_app)

    return {
        "success": True,
        "evaluation": evaluation
    }
