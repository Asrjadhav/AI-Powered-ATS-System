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

import config
import services.notification_service as notification_service
import services.email_service as email_service
import services.talent_pool_service as talent_pool_service

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
            data["appliedRole"] = job.title if (job and job.title) else (data.get("appliedRole") or "Applicant")
            data["department"] = data.get("department") or job.department
            data["status"] = data.get("status") or "Applied"
            data["source"] = data.get("source") or "Career Portal"
            data["createdAt"] = data.get("createdAt") or now
            data["updatedAt"] = now

            db_app = ApplicationModel(**data)
            db.add(db_app)
            db.commit()
            db.refresh(db_app)

            # Auto-run AI screening upon application creation for instant accurate ATS score
            try:
                screen_application_resume(db, application_id=db_app.id)
                db.refresh(db_app)
            except Exception as screen_err:
                print(f"Auto AI screening upon application creation encountered warning: {screen_err}")

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
        # Structured, Alias-Aware ATS Fallback Evaluation Engine
        jd_title_lower = job_info["title"].lower()
        combined_resume = (skills_text + " " + full_resume_text).lower()
        cand_role_str = (cand.currentRole or "") if cand else ""

        # Generic Role Words (Never treated as technical skills)
        ROLE_WORDS = {
            "developer", "engineer", "analyst", "manager", "designer", "consultant", 
            "specialist", "lead", "senior", "junior", "intern", "architect", "administrator",
            "director", "head", "officer", "executive", "associate", "trainee", "vp"
        }

        # Strict Stop Words / Header Filter to eliminate non-technical boilerplate pollution
        BOILERPLATE_STOP_WORDS = ROLE_WORDS.union({
            "the", "and", "for", "with", "this", "that", "from", "have", "are", "will", "your", 
            "must", "work", "team", "role", "job", "candidate", "about", "looking", "ability", 
            "experience", "skills", "specified", "description", "detailed", "provided", 
            "musthave", "goodtohave", "responsibilities", "requirements", "preferred", "general", 
            "level", "range", "education", "requirement", "title", "department", "none",
            "location", "position", "company", "years", "year", "strong", "working", "building",
            "knowledge", "proven", "understanding", "degree", "field", "bachelor", "master", "plus"
        })

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
            st_clean = skill_term.lower().strip()
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
        req_skills_list = []
        raw_req = job_info.get("requirements")
        if isinstance(raw_req, dict):
            must_arr = raw_req.get("mustHave") or raw_req.get("requiredSkills") or []
            if isinstance(must_arr, list):
                req_skills_list.extend([str(s).strip() for s in must_arr if s])
        elif isinstance(raw_req, list):
            req_skills_list.extend([str(s).strip() for s in raw_req if s])
        elif isinstance(raw_req, str) and raw_req:
            req_skills_list.extend([s.strip() for s in re.split(r"[\n,;•\-]+", raw_req) if s.strip()])

        # Extract Preferred (Good-To-Have) Skills
        pref_skills_list = []
        raw_pref = job_info.get("preferredSkills")
        if isinstance(raw_pref, list):
            pref_skills_list.extend([str(s).strip() for s in raw_pref if s])
        elif isinstance(raw_pref, str) and raw_pref:
            pref_skills_list.extend([s.strip() for s in re.split(r"[\n,;•\-]+", raw_pref) if s.strip()])

        # Fallback to description token extraction ONLY if structured requirements are empty (NEVER use title role words as skills)
        if not req_skills_list:
            combined_jd_text = f"{job_info['description'] or ''} {resp_formatted or ''}".lower()
            desc_tokens = set(re.findall(r"\b[a-zA-Z]{3,}\b", combined_jd_text))
            req_skills_list = [w for w in desc_tokens if w not in BOILERPLATE_STOP_WORDS and len(w) > 3]

        # If still empty, attempt title technology token extraction (excluding role words)
        if not req_skills_list:
            title_tokens = set(re.findall(r"\b[a-zA-Z]{3,}\b", job_info["title"].lower()))
            req_skills_list = [w for w in title_tokens if w not in BOILERPLATE_STOP_WORDS and len(w) > 3]

        # Sanitize and deduplicate extracted skill items
        clean_req_skills = []
        for r_item in req_skills_list:
            r_str = str(r_item).strip()
            if r_str and r_str.lower() not in BOILERPLATE_STOP_WORDS:
                clean_req_skills.append(r_str)
        clean_req_skills = list(dict.fromkeys(clean_req_skills))

        clean_pref_skills = []
        for p_item in pref_skills_list:
            p_str = str(p_item).strip()
            if p_str and p_str.lower() not in BOILERPLATE_STOP_WORDS:
                clean_pref_skills.append(p_str)
        clean_pref_skills = list(dict.fromkeys(clean_pref_skills))

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

        if clean_pref_skills:
            R_pref = len(matched_pref) / len(clean_pref_skills)
            W_pref = 10.0
        else:
            R_pref = 0.0
            W_pref = 0.0  # Deactivated if absent from JD

        edu_req_str = str(job_info.get("education") or "").strip()
        if edu_req_str and edu_req_str.lower() not in ["not specified", "none", "n/a"]:
            R_edu = evaluate_education_ratio(edu_req_str, full_resume_text)
            W_edu = 5.0
        else:
            R_edu = 0.0
            W_edu = 0.0  # Deactivated if absent from JD

        W_active_sum = 40.0 + 20.0 + 15.0 + 10.0 + W_pref + W_edu
        earned_points = (40.0 * R_req) + (20.0 * R_exp) + (15.0 * R_proj) + (10.0 * R_role) + (W_pref * R_pref) + (W_edu * R_edu)

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
            "requiredSkills": {"score": int(round((40.0 * R_req / W_active_sum) * 100)), "matched": matched_req, "missing": missing_req, "ratio": round(R_req, 2)},
            "experience": {"score": int(round((20.0 * R_exp / W_active_sum) * 100)), "ratio": round(R_exp, 2)},
            "projects": {"score": int(round((15.0 * R_proj / W_active_sum) * 100)), "ratio": round(R_proj, 2)},
            "roleMatch": {"score": int(round((10.0 * R_role / W_active_sum) * 100)), "ratio": round(R_role, 2)},
            "preferredSkills": {"active": W_pref > 0, "score": int(round((W_pref * R_pref / W_active_sum) * 100)) if W_pref > 0 else None, "matched": matched_pref, "missing": missing_pref},
            "education": {"active": W_edu > 0, "score": int(round((W_edu * R_edu / W_active_sum) * 100)) if W_edu > 0 else None, "requirement": edu_req_str if W_edu > 0 else "None specified"},
            "activeWeightSum": W_active_sum,
            "finalScore": calc_score
        }

        evaluation = {
            "score": calc_score,
            "categoryBreakdown": category_breakdown,
            "summary": f"{cand_name} has been evaluated against the {job_info['title']} Job Description. The profile displays a {calc_score}% ATS alignment across technical skills, experience, projects, and role fit.",
            "strengths": strengths_list,
            "gaps": gaps_list,
            "interviewQuestions": questions_list,
            "fitReasoning": f"Score of {calc_score}% calculated by evaluating candidate resume evidence against JD requirements for {job_info['title']} using a 6-category weighted evidence engine (Active Weight Base: {int(W_active_sum)}pts)."
        }

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    calc_score = int(evaluation.get("score", 0))
    threshold = config.ATS_MATCH_THRESHOLD
    prev_status = str(db_app.status or "").lower()

    existing_eval = dict(db_app.aiEvaluation or {})
    merged_eval = {**existing_eval, **evaluation}
    
    if calc_score >= threshold:
        new_stage = "Shortlisted"
        rejection_reason = None
    else:
        new_stage = "Rejected"
        rejection_reason = f"Candidate did not meet the minimum ATS match threshold of {threshold}%."
        merged_eval["rejectionReason"] = rejection_reason

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
    if new_stage == "Rejected":
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
            except Exception as tp_err:
                print(f"Auto talent pool retention note: {tp_err}")

        if prev_status != "rejected":
            eval_dict = dict(db_app.aiEvaluation or {})
            if not eval_dict.get("rejectionEmailSent"):
                cand_name_str = (db_app.candidateName or f"{cand.firstName if cand else ''} {cand.lastName if cand else ''}").strip() or "Candidate"
                job_title_str = db_app.appliedRole or (job.title if job else "Open Position")
                cand_email_str = db_app.candidateEmail or (cand.email if cand else "")

                # 2. Create rejection notification for recruiter/HR dashboard
                try:
                    notification_service.create_notification_event(
                        db,
                        title="Candidate Application Rejected",
                        message=f"Application for {cand_name_str} ({job_title_str}) was rejected automatically (ATS Score: {calc_score}% vs {threshold}% Threshold).",
                        candidate_name=cand_name_str,
                        job_title=job_title_str
                    )
                except Exception as notif_err:
                    print(f"Rejection notification creation note: {notif_err}")

                # 3. Trigger automated rejection email (idempotent & non-blocking)
                try:
                    if cand_email_str:
                        email_service.send_rejection_email(
                            db=db,
                            candidate_email=cand_email_str,
                            candidate_name=cand_name_str,
                            job_title=job_title_str
                        )
                        eval_dict["rejectionEmailSent"] = True
                        eval_dict["rejectionEmailSentAt"] = now
                        db_app.aiEvaluation = eval_dict
                        db.commit()
                except Exception as email_err:
                    print(f"Rejection email dispatch note: {email_err}")

    return {
        "success": True,
        "evaluation": db_app.aiEvaluation
    }
