"""
AI generation and rewriting of email templates.

Ported from POST /api/templates/generate in server.ts. Deliberately does not
port that handler's "local rewriter" fallback: it produced canned text
(appending "(Shortened)" / "(Grammar Checked)", swapping a few words for
translations) and returned it as if the AI had done the work. When Gemini is
unavailable this raises instead, so the caller can say so.
"""

import json
import re
from typing import Any, Dict, Optional

import config
from schemas.email_template import TemplateAIRequest

PLACEHOLDER_VARIABLES = (
    "candidate_name, job_title, company_name, recruiter_name, department, "
    "experience, skills, interview_date, meeting_link, joining_date, salary, "
    "offer_expiry"
)

GENERATE_SYSTEM_PROMPT = f"""You are an expert HR recruitment copywriter. Generate a highly personalized, professional recruitment email template.
Include double-curly-bracket variables where appropriate so they can be replaced dynamically. Supported variables: {PLACEHOLDER_VARIABLES}, each written as {{{{name}}}}.

Frame standard values as placeholders (e.g. use {{{{candidate_name}}}} instead of printing the candidate's name in the final body), but use the candidate context to make the tone and content tailored to their profile.
Return your output STRICTLY as a JSON object containing "subject" and "body" fields. No markdown formatting outside the JSON block."""

EDIT_SYSTEM_PROMPT = """You are an expert HR copywriter and editor. Rewrite the provided email template based on the specified edit action.
IMPORTANT: You must keep all double-curly-bracket placeholders (e.g. {{candidate_name}}, {{job_title}}, etc.) exactly intact. Do not translate or change the placeholder text inside the braces!
Return your output STRICTLY as a JSON object containing "subject" and "body" fields. No markdown formatting outside the JSON block."""

ACTION_DIRECTIVES = {
    "shorten": "Shorten the body significantly. Keep it highly concise, punchy, and clear while retaining essential placeholders.",
    "expand": "Expand the email body by adding welcoming, helpful paragraphs about company culture, preparation advice, and support. Keep placeholders.",
    "professional": "Change the tone to be highly polished, enterprise-grade, respectful, and formal. Elevate the vocabulary.",
    "friendly": "Make the tone warm, welcoming, friendly, and enthusiastic. Use positive phrasing and polite exclamation marks where appropriate.",
    "formal": "Rewrite in a highly formal, traditional corporate business standard tone.",
    "grammar": "Perform a thorough grammar check, spelling correction, and stylistic polish. Keep all placeholders exactly intact.",
}
DEFAULT_DIRECTIVE = "Improve the overall flow, clarity, tone, and persuasiveness of the subject and body."

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {"subject": {"type": "STRING"}, "body": {"type": "STRING"}},
    "required": ["subject", "body"],
}


class TemplateGenerationError(Exception):
    """The AI could not produce a template; the message is safe to show a user."""


def _build_request(request: TemplateAIRequest) -> Dict[str, str]:
    context = request.context.model_dump() if request.context else {}

    def field(name: str) -> str:
        return context.get(name) or "not specified"

    if request.action == "generate":
        user_message = (
            f'Generate a template for the stage "{field("interviewStatus")}".\n'
            "Candidate Context:\n"
            f'- Candidate Name: {field("candidateName")}\n'
            f'- Skills: {field("skills")}\n'
            f'- Experience: {field("experience")}\n'
            f'- Job Role: {field("jobRole")}\n'
            f'- Department: {field("department")}\n'
            f'- ATS Score: {field("atsScore")}\n'
            f'- Offer Status: {field("offerStatus")}\n'
            f'- Recruiter: {field("recruiterName")}\n'
            f'- Company: {field("companyName")}\n\n'
            "Additional requirements/instructions: "
            f'{request.prompt or "Make it sound high-end, welcoming, and professional."}'
        )
        return {"system": GENERATE_SYSTEM_PROMPT, "user": user_message}

    if request.action == "translate":
        directive = (
            f"Translate the email subject and body into {request.targetLanguage or 'Spanish'}. "
            "Crucial: Do NOT translate the text inside the curly brackets "
            "(e.g., keep {{candidate_name}} as {{candidate_name}})."
        )
    else:
        directive = ACTION_DIRECTIVES.get(request.action, DEFAULT_DIRECTIVE)

    user_message = (
        f"Action: {request.action.upper()}\n"
        f"Directive: {directive}\n\n"
        f"Current Subject: {request.subject or ''}\n"
        f"Current Body: {request.body or ''}"
    )
    return {"system": EDIT_SYSTEM_PROMPT, "user": user_message}


def _parse_json_object(raw_text: str) -> Optional[Dict[str, Any]]:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return parsed if isinstance(parsed, dict) else None


def generate_template(request: TemplateAIRequest) -> Dict[str, str]:
    if not config.GEMINI_API_KEY:
        raise TemplateGenerationError(
            "AI template generation is unavailable because GEMINI_API_KEY is not "
            "configured on the server."
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as missing_dependency:
        raise TemplateGenerationError(
            "AI template generation is unavailable because the Gemini client "
            "library is not installed on the server."
        ) from missing_dependency

    prompts = _build_request(request)
    client = genai.Client(api_key=config.GEMINI_API_KEY)
    try:
        response = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=prompts["user"],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RESPONSE_SCHEMA,
                system_instruction=prompts["system"],
            ),
        )
    except Exception as api_error:
        raise TemplateGenerationError(f"The AI template service failed: {api_error}") from api_error

    result = _parse_json_object(response.text or "")
    if not result or not result.get("subject"):
        raise TemplateGenerationError("The AI returned an unusable response. Please try again.")

    return {"subject": str(result["subject"]), "body": str(result.get("body") or "")}
