"""
AI job import.

Takes an uploaded job description (PDF or Word) or pasted text, extracts its text, and asks
Gemini to return structured job postings. A document listing several roles yields one posting
per role. Only what the document says is kept: a detail it does not state stays empty.

All of this used to run partly in the browser: the file was base64-encoded
there, and whenever the server call failed a client-side regex parser invented
a posting (title "Python Backend Developer", department "Software Engineering",
status "published") and reported it as a successful AI extraction. Extraction
now happens only here, and a failure is reported as a failure.
"""

import json
import re
from typing import Any, Dict, List, Optional

import config
import services.document_service as document_service

# Imported postings start as drafts. A document the recruiter has not reviewed
# must never go live on the public careers page by itself.
IMPORTED_JOB_STATUS = "draft"

WORK_MODES = ("Remote", "Hybrid", "On-site")
JOB_TYPES = ("Full-time", "Part-time", "Contract", "Internship")

TITLE_LABEL_PREFIX = re.compile(
    r"^(?:job\s*title|job\s*opening|job\s*position|job|role\s*title|role|position|vacancy)\s*:\s*",
    re.IGNORECASE,
)
BULLET_PREFIX = re.compile(r"^[\s\-*••\d.]+")

# Lines that merely restate a field label, stripped out of the description.
FIELD_LABEL_LINE = re.compile(
    r"^(?:Job Title|Title|Department|Location|Work Mode|Job Type|Employment Type|"
    r"Experience|Experience Level|Experience Range|Salary|Salary Range|Openings|"
    r"Vacancies|Application Deadline|Deadline|Expected Joining Date|"
    r"Target Joining Date|Joining Date|Hiring Manager|Recruiter|Status)\s*:",
    re.IGNORECASE,
)

SYSTEM_INSTRUCTION = (
    "You are an HR document parser. Copy structured job postings out of the text you are given, "
    "using only what the text says. Never add, infer, guess or complete anything that is not written "
    "in it: a detail the text does not state is left empty."
)

JOB_ARRAY_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "title": {"type": "STRING"},
            "department": {"type": "STRING"},
            "location": {"type": "STRING"},
            "type": {"type": "STRING"},
            "workMode": {"type": "STRING"},
            "experienceRange": {"type": "STRING"},
            "salaryRange": {"type": "STRING"},
            "openings": {"type": "INTEGER"},
            "deadline": {"type": "STRING"},
            "targetJoiningDate": {"type": "STRING"},
            "description": {"type": "STRING"},
            "requirements": {
                "type": "OBJECT",
                "properties": {
                    "mustHave": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "goodToHave": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "softSkills": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "languages": {"type": "ARRAY", "items": {"type": "STRING"}},
                },
            },
            "preferredSkills": {"type": "ARRAY", "items": {"type": "STRING"}},
            "benefits": {"type": "ARRAY", "items": {"type": "STRING"}},
            "requiredSkills": {"type": "ARRAY", "items": {"type": "STRING"}},
            "responsibilities": {"type": "ARRAY", "items": {"type": "STRING"}},
        },
        "required": ["title"],
    },
}

EXTRACTION_PROMPT = """Extract the job opening(s) written in the document below into structured job posting objects.

THE ONE RULE: use ONLY information that is written in the document. Do NOT add, infer, guess, complete or "improve" anything. If the document does not state a detail, leave that field EMPTY: an empty string "", an empty array [], or null for 'openings'. Never fill a field with a typical, default or example value.

FIELD RULES:
- 'title': the exact job title as written (without a label prefix like 'Job:', 'Job Title:' or 'Role:'). Do not rename it.
- 'department': only if the document names a department, team or business unit. Do NOT work it out from the title.
- 'location': only the location the document states.
- 'workMode': 'Remote', 'Hybrid' or 'On-site' ONLY if the document says so; otherwise "".
- 'type': 'Full-time', 'Part-time', 'Contract' or 'Internship' ONLY if the document says so; otherwise "".
- 'experienceRange': only the experience the document asks for, in its own words; otherwise "".
- 'salaryRange': only if a salary or compensation is written; otherwise "". Do NOT write 'Competitive' or any estimate.
- 'openings': the number of vacancies only if written; otherwise null.
- 'deadline' and 'targetJoiningDate': only dates written in the document; otherwise "".
- 'description': the overview and context paragraphs as written in the document; "" if there are none. Do not write a summary of your own.
- 'responsibilities': the duties exactly as listed in the document; [] if there are none.
- 'requirements.mustHave': the required qualifications, skills, degree and experience exactly as listed; [] if none.
- 'preferredSkills': the nice-to-have skills exactly as listed; [] if none.
- 'benefits': the perks or benefits exactly as listed; [] if none.
- Keep the document's own wording. Do not add skills, tools, benefits, responsibilities or requirements that are not in the text, and do not replace real content with generic text.

MULTIPLE OPENINGS: if the document lists several distinct job positions (separate titles or sections), return each as its own object. If it describes one job, return exactly one object.

Document:
{document_text}"""


class JobImportError(Exception):
    """Raised when a document cannot be turned into job postings."""


def _strip_json_fence(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _parse_model_json(raw_text: str) -> List[Dict[str, Any]]:
    """
    Reads the model's JSON, tolerating a truncated or fenced response.

    If nothing parseable comes back the caller is told, rather than being handed
    an invented posting.
    """
    text = _strip_json_fence(raw_text or "")
    if not text:
        raise JobImportError("The AI returned an empty response for this document.")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # A long document can be cut off mid-object; close what is open.
        repaired = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", text)
        if repaired.count('"') % 2 != 0:
            repaired += '"'
        repaired += "}" * max(0, repaired.count("{") - repaired.count("}"))
        repaired += "]" * max(0, repaired.count("[") - repaired.count("]"))
        try:
            parsed = json.loads(repaired)
        except json.JSONDecodeError:
            match = re.search(r"\[\s*\{[\s\S]*\}\s*\]", text) or re.search(r"\{[\s\S]*\}", text)
            if not match:
                raise JobImportError(
                    "The AI response could not be read as structured job data."
                )
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError as decode_error:
                raise JobImportError(
                    "The AI response could not be read as structured job data."
                ) from decode_error

    if isinstance(parsed, dict):
        parsed = [parsed]
    if not isinstance(parsed, list):
        raise JobImportError("The AI response was not a list of job postings.")

    return [entry for entry in parsed if isinstance(entry, dict)]


def _clean_string_list(value: Any) -> List[str]:
    """Normalises a model field into a clean list of bullet strings."""
    if isinstance(value, list):
        cleaned = [
            BULLET_PREFIX.sub("", str(item)).strip()
            for item in value
            if isinstance(item, str) and item.strip()
        ]
        return [item for item in cleaned if item]

    if isinstance(value, str) and value.strip():
        parts = [BULLET_PREFIX.sub("", part).strip() for part in re.split(r"\n|;|•", value)]
        return [part for part in parts if part]

    return []


def _normalize_work_mode(value: Any) -> str:
    """One of the three work modes when the document states one; empty when it does not."""
    text = str(value or "").strip()
    if re.search(r"hybrid", text, re.IGNORECASE):
        return "Hybrid"
    if re.search(r"remote", text, re.IGNORECASE):
        return "Remote"
    if re.search(r"site|office|onsite", text, re.IGNORECASE):
        return "On-site"
    return ""


def _normalize_job_type(value: Any) -> str:
    """One of the four job types when the document states one; empty when it does not."""
    text = str(value or "").strip()
    if re.search(r"part", text, re.IGNORECASE):
        return "Part-time"
    if re.search(r"contract", text, re.IGNORECASE):
        return "Contract"
    if re.search(r"intern", text, re.IGNORECASE):
        return "Internship"
    if re.search(r"full", text, re.IGNORECASE):
        return "Full-time"
    return ""


def _find_labelled_value(document_text: str, labels: str) -> str:
    match = re.search(rf"(?:{labels})\s*:\s*([^\n\r]+)", document_text, re.IGNORECASE)
    if match:
        # Only leading bullet marks go; digits are part of the value ("1-2 years").
        return re.sub(r"^[\s\-*•]+", "", match.group(1)).strip()
    return ""


def _clean_description(raw_description: str) -> str:
    """The description as written in the document. Empty when it has none (nothing is made up)."""
    description = str(raw_description or "").strip()
    if not description:
        return ""

    kept_lines = [
        line for line in description.split("\n")
        if not FIELD_LABEL_LINE.match(line.strip())
    ]
    cleaned = "\n".join(kept_lines).strip()
    return cleaned if len(cleaned) >= 10 else description


def _to_job_posting(raw_job: Dict[str, Any], document_text: str) -> Dict[str, Any]:
    """
    Turns one model-extracted object into a job posting ready for preview. Only what the document
    states is kept: every detail it does not give stays empty (no default department, location,
    experience, salary, dates, work mode or job type is filled in).
    """
    job_title = TITLE_LABEL_PREFIX.sub("", str(raw_job.get("title") or "").strip()).strip()

    department = str(raw_job.get("department") or "").strip()
    if not department or department.lower() == "general":
        department = _find_labelled_value(document_text, "team|department|dept|unit|division")

    location = str(raw_job.get("location") or "").strip()
    if not location or location.lower() == "remote / hybrid":
        location = _find_labelled_value(
            document_text, "location|city|place|offices|site|based in|stationed in"
        )

    experience_range = str(
        raw_job.get("experienceRange") or raw_job.get("experienceLevel") or ""
    ).strip()
    if not experience_range:
        experience_range = _find_labelled_value(document_text, "experience|exp|years of experience")

    must_have = _clean_string_list(
        (raw_job.get("requirements") or {}).get("mustHave")
        if isinstance(raw_job.get("requirements"), dict)
        else None
    ) or _clean_string_list(raw_job.get("requiredSkills")) or _clean_string_list(
        raw_job.get("mustHave")
    )

    requirements = raw_job.get("requirements") if isinstance(raw_job.get("requirements"), dict) else {}
    good_to_have = (
        _clean_string_list(raw_job.get("preferredSkills"))
        or _clean_string_list(requirements.get("goodToHave"))
    )

    try:
        openings = int(raw_job.get("openings")) if raw_job.get("openings") else None
        if openings is not None and openings < 1:
            openings = None
    except (TypeError, ValueError):
        openings = None

    return {
        "title": job_title,
        "department": department,
        "location": location,
        "type": _normalize_job_type(raw_job.get("type")),
        "workMode": _normalize_work_mode(raw_job.get("workMode")),
        "status": IMPORTED_JOB_STATUS,
        "description": _clean_description(raw_job.get("description")),
        "responsibilities": _clean_string_list(raw_job.get("responsibilities")),
        "requirements": {
            "mustHave": must_have,
            "goodToHave": good_to_have,
            "softSkills": _clean_string_list(requirements.get("softSkills")),
            "languages": _clean_string_list(requirements.get("languages")),
        },
        "requiredSkills": must_have,
        "preferredSkills": good_to_have,
        "benefits": _clean_string_list(raw_job.get("benefits")),
        "experienceRange": experience_range,
        "experienceLevel": experience_range,
        "salaryRange": str(raw_job.get("salaryRange") or "").strip(),
        "openings": openings,
        "deadline": str(raw_job.get("deadline") or "").strip(),
        "targetJoiningDate": str(raw_job.get("targetJoiningDate") or "").strip(),
        "hiringManager": str(raw_job.get("hiringManager") or "").strip(),
        "recruiter": str(raw_job.get("recruiter") or "").strip(),
    }


def _call_gemini(document_text: str) -> str:
    if not config.GEMINI_API_KEY:
        raise JobImportError(
            "AI job import is unavailable because GEMINI_API_KEY is not configured "
            "on the server."
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as missing_dependency:
        raise JobImportError(
            "AI job import is unavailable because the Gemini client library is "
            "not installed on the server."
        ) from missing_dependency

    client = genai.Client(api_key=config.GEMINI_API_KEY)
    try:
        response = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=EXTRACTION_PROMPT.format(document_text=document_text),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=JOB_ARRAY_SCHEMA,
                max_output_tokens=8192,
                system_instruction=SYSTEM_INSTRUCTION,
            ),
        )
    except Exception as api_error:
        raise JobImportError(f"The AI job parser failed: {api_error}") from api_error

    return response.text or ""


def parse_jobs_from_document(
    file_bytes: Optional[bytes] = None,
    filename: Optional[str] = None,
    content: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extracts structured job postings from an uploaded document or pasted text.

    Raises JobImportError when the document cannot be read or the AI cannot
    produce postings, so the caller reports a genuine failure rather than
    saving guessed data.
    """
    document_text = ""
    if file_bytes:
        # Surfaces DocumentExtractionError to the router as a 400.
        document_text = document_service.extract_text(file_bytes, filename)

    if not document_text.strip():
        document_text = (content or "").strip()

    if not document_text.strip():
        raise JobImportError(
            "No readable text was found in the upload. If this is a scanned PDF, "
            "please paste the job description text instead."
        )

    raw_jobs = _parse_model_json(_call_gemini(document_text))
    postings = [_to_job_posting(raw_job, document_text) for raw_job in raw_jobs]
    # A posting needs the title the document gives it; one without a title is not made up.
    postings = [posting for posting in postings if posting["title"]]

    if not postings:
        raise JobImportError(
            "No job openings could be identified in this document. Please check "
            "the file, or paste the job description text directly."
        )

    return {
        "success": True,
        "data": postings,
        "warning": None,
        "sourceFileName": filename,
        "extractedCharacters": len(document_text),
    }
