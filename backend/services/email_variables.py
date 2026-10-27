"""
Template variables ({{candidate_name}}, {{salary}}, ...) built from database rows.

Shared by the automated emails and the manual "Send Email" button so both fill
templates the same way. Pure functions: they read attributes off the rows they
are given and never query the database. A value that isn't stored is left empty.
"""

import re
from typing import Dict, Optional, Tuple

import config
from services import formatting


def candidate_name(candidate, fallback: Optional[str] = None) -> str:
    if candidate is not None:
        name = f"{candidate.firstName or ''} {candidate.lastName or ''}".strip()
        if name:
            return name
    return fallback or "Candidate"


def format_inr(amount) -> str:
    """1200000 -> "₹12,00,000 / year" (Indian digit grouping). Empty when unknown."""
    try:
        value = int(round(float(amount)))
    except (TypeError, ValueError):
        return ""
    if value <= 0:
        return ""
    digits = str(value)
    last_three, rest = digits[-3:], digits[:-3]
    groups = []
    while len(rest) > 2:
        groups.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.insert(0, rest)
    return "₹" + ",".join(groups + [last_three]) + " / year"


def is_meet_url(value: Optional[str]) -> bool:
    return bool(value) and str(value).startswith("https://meet.google.com/")


def candidate_first_name(name: Optional[str]) -> str:
    parts = (name or "").split()
    return parts[0] if parts else ""


def base_variables(name: str, job_title: Optional[str], department: Optional[str] = None) -> Dict[str, str]:
    return {
        "candidate_name": name,
        "candidate_first_name": candidate_first_name(name),
        "job_title": job_title or "",
        "department": department or "",
        "company_name": config.COMPANY_NAME,
        "recruiter_name": config.RECRUITER_NAME,
    }


def offer_variables(offer, joining_date=None, valid_till=None, annual_ctc=None) -> Dict[str, str]:
    """
    Offer wording values. They come from the saved offer row, and any value HR confirmed for this
    letter (joining date, valid-till date, annual CTC) takes priority over the row.
    """
    ctc = annual_ctc if annual_ctc not in (None, "") else (offer.offeredCTC if offer is not None else None)
    joining = joining_date or (offer.joiningDate if offer is not None else None)
    return {
        "salary": format_inr(ctc),
        "joining_date": formatting.date_long(joining),
        # The offers table has no valid-till column, so it is only known when HR enters it for the letter.
        "offer_expiry": formatting.date_long(valid_till),
    }


_ROUND_WORDS = {1: "First", 2: "Second", 3: "Third", 4: "Fourth", 5: "Fifth",
                6: "Sixth", 7: "Seventh", 8: "Eighth", 9: "Ninth", 10: "Tenth"}


def interview_round(round_text: Optional[str]) -> Tuple[str, str]:
    """
    ("First Round Discussion", "1st Round of Interview") for "Technical Round 1". A round that
    is not numbered ("HR Interview") is used as it is, and an empty one becomes "Interview".
    """
    text = (round_text or "").strip()
    match = re.search(r"round\s*(\d+)", text, re.IGNORECASE)
    if match and int(match.group(1)) in _ROUND_WORDS:
        number = int(match.group(1))
        return f"{_ROUND_WORDS[number]} Round Discussion", f"{formatting.ordinal(number)} Round of Interview"
    return (text or "Interview"), (text or "Interview")


def interview_variables(
    interview,
    mode: str = "",
    meeting_link: str = "",
    office_location: str = "",
) -> Dict[str, str]:
    if interview is None:
        return {"interview_round": "", "interview_round_phrase": "", "interview_date": "",
                "interview_date_subject": "", "interview_time": "", "interview_mode": "",
                "meeting_link": "", "office_location": "", "joining_label": "Joining Link",
                "joining_details": ""}
    round_label, round_phrase = interview_round(interview.round)
    # An online interview is joined with its link; an in-person one is attended at the office.
    if meeting_link or not office_location:
        # Shown as a clickable "Interview Link" in the HTML email and as the address in the plain text.
        joining_label = "Joining Link"
        joining_details = f"[[Interview Link|{meeting_link}]]" if meeting_link.startswith(("http://", "https://")) else meeting_link
    else:
        joining_label, joining_details = "Location", office_location
    return {
        "interview_round": round_label,
        "interview_round_phrase": round_phrase,
        "interview_date": formatting.date_short(interview.date),
        "interview_date_subject": formatting.date_for_subject(interview.date),
        "interview_time": formatting.time_12h(interview.time),
        "interview_mode": mode,
        "meeting_link": meeting_link,
        "office_location": office_location,
        "joining_label": joining_label,
        "joining_details": joining_details,
    }
