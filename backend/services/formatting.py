"""
Pure helpers that turn stored values into the wording used in emails and the offer letter:
dates ("9th September 2026"), times ("05:00 PM"), Indian rupee amounts in figures and words,
and mobile numbers. Nothing here touches the database or the clock.

A value that cannot be understood is returned as the text it was given (never invented).
"""

import datetime
import re
from typing import Optional

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ---------------------------------------------------------------- dates and times

def parse_date(value) -> Optional[datetime.date]:
    """A date from a date, a datetime, "2026-09-09", "09-09-2026", "09/09/2026" or an ISO datetime."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(text[:10], fmt).date()
        except ValueError:
            continue
    try:
        return datetime.datetime.fromisoformat(text).date()
    except ValueError:
        return None


def ordinal(day: int) -> str:
    """1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd"."""
    suffix = "th" if 10 <= day % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix}"


def date_long(value) -> str:
    """"9th September 2026" (the offer letter and offer email)."""
    parsed = parse_date(value)
    if parsed is None:
        return str(value) if value else ""
    return f"{ordinal(parsed.day)} {MONTHS[parsed.month - 1]} {parsed.year}"


def date_short(value) -> str:
    """"Aug 11, 2026" (the interview details)."""
    parsed = parse_date(value)
    if parsed is None:
        return str(value) if value else ""
    return f"{MONTHS[parsed.month - 1][:3]} {parsed.day}, {parsed.year}"


def date_for_subject(value) -> str:
    """"August 11 2026" (the interview email subject)."""
    parsed = parse_date(value)
    if parsed is None:
        return str(value) if value else ""
    return f"{MONTHS[parsed.month - 1]} {parsed.day} {parsed.year}"


def weekday_name(value) -> str:
    parsed = parse_date(value)
    return WEEKDAYS[parsed.weekday()] if parsed else ""


def time_12h(value) -> str:
    """"14:00" or "14:00:00" -> "02:00 PM". Anything else is returned as given."""
    if value is None or value == "":
        return ""
    text = str(value).strip()
    match = re.fullmatch(r"(\d{1,2}):(\d{2})(?::\d{2})?", text)
    if not match:
        return text
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour > 23 or minute > 59:
        return text
    return f"{hour % 12 or 12:02d}:{minute:02d} {'AM' if hour < 12 else 'PM'}"


# ---------------------------------------------------------------- Indian rupee amounts

_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
         "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _below_hundred(n: int) -> str:
    if n < 20:
        return _ONES[n]
    return (_TENS[n // 10] + (" " + _ONES[n % 10] if n % 10 else "")).strip()


def _below_thousand(n: int) -> str:
    words = []
    if n >= 100:
        words.append(_ONES[n // 100] + " Hundred")
        n %= 100
    if n:
        words.append(_below_hundred(n))
    return " ".join(words)


def rupees_in_words(amount) -> str:
    """17000 -> "Seventeen Thousand Only"; 125000 -> "One Lakh Twenty Five Thousand Only" (Indian system)."""
    n = int(round(float(amount)))
    if n <= 0:
        return "Zero Only"
    parts = []
    crore, n = divmod(n, 10_000_000)
    lakh, n = divmod(n, 100_000)
    thousand, n = divmod(n, 1_000)
    if crore:
        parts.append(_below_thousand(crore) + " Crore")
    if lakh:
        parts.append(_below_hundred(lakh) + " Lakh")
    if thousand:
        parts.append(_below_hundred(thousand) + " Thousand")
    if n:
        parts.append(_below_thousand(n))
    return " ".join(parts) + " Only"


def rupees_with_grouping(amount) -> str:
    """17000 -> "17,000"; 1250000 -> "12,50,000" (Indian digit grouping)."""
    digits = str(int(round(float(amount))))
    last_three, rest = digits[-3:], digits[:-3]
    groups = []
    while len(rest) > 2:
        groups.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.insert(0, rest)
    return ",".join(groups + [last_three])


def lakhs_per_annum(annual) -> str:
    """204000 -> "2.04"; 1200000 -> "12"; 650000 -> "6.5"."""
    text = f"{float(annual) / 100_000:.2f}"
    if text.endswith(".00"):
        return text[:-3]
    return text[:-1] if text.endswith("0") else text


def monthly_from_annual(annual) -> int:
    """The monthly figure shown in the letter: annual / 12, rounded to the rupee."""
    return int(round(float(annual) / 12))


# ---------------------------------------------------------------- mobile numbers

def mobile_for_letter(raw) -> str:
    """"9321459042", "+91 93214 59042" or "09321459042" -> "+91- 9321459042". Other numbers are kept as stored."""
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) == 14 and digits.startswith("0091"):
        digits = digits[4:]
    elif len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10:
        return f"+91- {digits}"
    return str(raw).strip()
