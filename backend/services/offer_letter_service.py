"""
Offer letter PDF.

The letter is built from what HR confirms for one candidate (name, mobile and email from the saved
profile, job title, annual CTC, joining date, "offer valid till" date, reporting manager) and is
printed on the company letterhead (assets/offer_letterhead.png). Nothing is invented: a required
value that is missing stops the letter with an OfferLetterError that names the field.

Layout and wording follow the company's reference offer letter. The PDF is written by
services/pdf_writer.py (no PDF library); text is Times, so characters outside Windows-1252
(for example Devanagari) print as "?".
"""

import datetime
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

import config
from services import formatting
from services.pdf_writer import PAGE_WIDTH, Page, PdfDocument, Run, rgb, superscript

LETTERHEAD_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "offer_letterhead.png")

LEFT = 72.0
RIGHT = 523.0
TEXT_WIDTH = RIGHT - LEFT
TITLE_X = 244.66      # where the reference letter starts the "Offer Letter" title
DATE_RIGHT = 518.83   # where its date line ends
SIZE = 13.92
LEADING = 16.08
LINK_BLUE = rgb("#0563C1")
SIGNATORY_BLUE = rgb("#1F3864")
FIRST_BASELINE = 705.79


class OfferLetterError(ValueError):
    """The letter cannot be produced because required details are missing or invalid."""


@dataclass
class OfferLetterData:
    candidate_name: str
    job_title: str
    annual_ctc: Optional[float]          # rupees per year
    joining_date: object                 # date or "YYYY-MM-DD"
    valid_till: object                   # date or "YYYY-MM-DD"
    mobile: str = ""
    email: str = ""
    reporting_manager: str = ""
    letter_date: Optional[datetime.date] = None  # the date in the heading; today when omitted


def offer_letter_filename(candidate_name: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9]+", "_", candidate_name or "").strip("_") or "Candidate"
    return f"Offer_Letter_{safe}.pdf"


def first_name(candidate_name: str) -> str:
    parts = (candidate_name or "").split()
    return parts[0] if parts else ""


def data_for_candidate(candidate, name: str, job_title: str, annual_ctc, joining_date, valid_till,
                       reporting_manager: str = "") -> OfferLetterData:
    """The letter inputs for a candidate: mobile and email come from the saved candidate profile."""
    return OfferLetterData(
        candidate_name=name,
        job_title=job_title,
        annual_ctc=annual_ctc,
        joining_date=joining_date,
        valid_till=valid_till,
        mobile=getattr(candidate, "phone", "") or "",
        email=getattr(candidate, "email", "") or "",
        reporting_manager=reporting_manager,
    )


def _clean(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def validate(data: OfferLetterData) -> Dict[str, object]:
    """Checks the letter inputs. Returns the cleaned values; raises OfferLetterError naming every problem."""
    problems: List[str] = []
    name = _clean(data.candidate_name)
    title = _clean(data.job_title)
    if not name:
        problems.append("candidate name")
    if not title:
        problems.append("job title")

    annual = None
    try:
        annual = float(data.annual_ctc) if data.annual_ctc not in (None, "") else None
    except (TypeError, ValueError):
        annual = None
    if annual is None or annual <= 0:
        problems.append("annual CTC")

    joining = formatting.parse_date(data.joining_date)
    if joining is None:
        problems.append("joining date")
    valid_till = formatting.parse_date(data.valid_till)
    if valid_till is None:
        problems.append("offer valid till date")

    if problems:
        raise OfferLetterError("Offer letter cannot be generated. Missing or invalid: " + ", ".join(problems) + ".")

    letter_date = data.letter_date or datetime.date.today()
    if valid_till < letter_date:
        raise OfferLetterError("Offer valid till date cannot be earlier than the date of the letter.")

    return {
        "name": name,
        "title": title,
        "annual": annual,
        "joining": joining,
        "valid_till": valid_till,
        "letter_date": letter_date,
        "mobile": formatting.mobile_for_letter(_clean(data.mobile)),
        "email": _clean(data.email),
        "manager": _clean(data.reporting_manager),
    }


def ctc_sentence(annual: float) -> str:
    """"Your starting monthly CTC will be Rs. 17,000/- (Seventeen Thousand Only) i.e. Rs. 2.04 LPA."""
    monthly = formatting.monthly_from_annual(annual)
    return (f"Your starting monthly CTC will be Rs. {formatting.rupees_with_grouping(monthly)}/- "
            f"({formatting.rupees_in_words(monthly)}) i.e. Rs. {formatting.lakhs_per_annum(annual)} LPA.")


def validity_sentence(valid_till) -> str:
    return f"The offer stands valid till {formatting.date_long(valid_till)} only."


def _date_runs(value: datetime.date, font: str, size: float) -> List[Run]:
    """"10th September 2026" with the "th" raised, as in the reference letter."""
    day = formatting.ordinal(value.day)
    return [
        Run(day[:-2], font, size),
        superscript(day[-2:], font, size),
        Run(f" {formatting.MONTHS[value.month - 1]} {value.year}", font, size),
    ]


def _letter_runs(values: Dict[str, object]) -> Dict[str, List[Run]]:
    """The wording of each paragraph, as styled runs."""
    T, B = "T", "TB"
    joining: datetime.date = values["joining"]  # type: ignore[assignment]
    valid_till: datetime.date = values["valid_till"]  # type: ignore[assignment]
    annual = float(values["annual"])  # type: ignore[arg-type]
    monthly = formatting.monthly_from_annual(annual)

    intro = [Run(f"It is our pleasure to extend the following offer of employment to you on behalf of "
                 f"{config.OFFER_LETTER_COMPANY}, following the interview and discussion you had with us. "
                 f"You are expected to join the company on ", T, SIZE)]
    intro += _date_runs(joining, B, SIZE)
    intro.append(Run(f", i.e. {formatting.weekday_name(joining)}.", B, SIZE))

    role = [Run("You have been appointed to the position of ", T, SIZE),
            Run("“", T, SIZE), Run(f"{values['title']}”", B, SIZE)]
    if values["manager"]:
        role.append(Run(f" and in this capacity, you will report directly to {values['manager']}.", T, SIZE))
    else:
        role.append(Run(".", T, SIZE))
    role += [
        Run(" Your starting monthly CTC will be ", T, SIZE),
        Run(f"Rs. {formatting.rupees_with_grouping(monthly)}/-", B, SIZE),
        Run(f" ({formatting.rupees_in_words(monthly)}) i.e. ", T, SIZE),
        Run(f"Rs. {formatting.lakhs_per_annum(annual)} LPA", B, SIZE),
        Run(".", T, SIZE),
    ]

    validity = [Run("The offer stands valid till ", T, SIZE)]
    validity += _date_runs(valid_till, T, SIZE)
    validity.append(Run(" only.", T, SIZE))

    return {"intro": intro, "role": role, "validity": validity}


def _first_page(page: Page, values: Dict[str, object]) -> None:
    T, B = "T", "TB"
    runs = _letter_runs(values)
    page.image("Letterhead", 0, 0, PAGE_WIDTH, 841.89)

    page.text_line(TITLE_X, FIRST_BASELINE, [Run("Offer Letter", B, SIZE, underline=True)])
    page.right_aligned(DATE_RIGHT, FIRST_BASELINE - 17.52, _date_runs(values["letter_date"], B, SIZE))  # type: ignore[arg-type]

    y = FIRST_BASELINE - 17.52 - 60.0
    page.text_line(LEFT, y, [Run(str(values["name"]), B, SIZE)])
    y -= 17.52
    if values["mobile"]:
        page.text_line(LEFT, y, [Run(f"Mobile No.: {values['mobile']}", B, SIZE)])
        y -= 17.52
    if values["email"]:
        end = page.text_line(LEFT, y, [Run(str(values["email"]), B, SIZE, color=LINK_BLUE)])
        page.line(LEFT, y - 2.9, end, y - 2.9, LINK_BLUE, 1.44)
        y -= 17.52
    y -= 34.0

    page.text_line(LEFT, y, [Run(f"Dear {first_name(str(values['name']))},", B, SIZE)])
    y -= 32.0

    paragraphs = [
        runs["intro"],
        runs["role"],
        [Run("As per Indian Government, Income Tax rules, taxes will be deducted from salary and will be "
             "deposited in the Government Treasury if applicable.", T, SIZE)],
        [Run("A detailed appointment letter will be issued to you upon joining the company.", T, SIZE)],
        [Run("Please confirm your acceptance of this offer to reply to this email and share digital signed "
             "offer copy.", T, SIZE)],
        runs["validity"],
        [Run("We look forward to an enduring relationship with you.", T, SIZE)],
        [Run("Regards,", T, SIZE)],
    ]
    for index, paragraph in enumerate(paragraphs):
        y = page.paragraph(LEFT, y, paragraph, TEXT_WIDTH, LEADING)
        y -= LEADING if index < len(paragraphs) - 1 else 2.0

    page.text_line(LEFT, y, [Run(config.OFFER_SIGNATORY_NAME, "H", 16.08, color=SIGNATORY_BLUE)])
    y -= 17.76
    page.text_line(LEFT, y, [Run(config.OFFER_SIGNATORY_TITLE, T, SIZE)])


def _second_page(page: Page, values: Dict[str, object]) -> None:
    T = "T"
    page.image("Letterhead", 0, 0, PAGE_WIDTH, 841.89)
    y = 742.78
    for text in ("I accept the above terms and conditions and agree that my employment will be subject to the "
                 "above conditions.",
                 "I further agree to perform my service under this agreement for the company or any of its "
                 "associated companies."):
        y = page.paragraph(LEFT, y, [Run(text, T, SIZE)], TEXT_WIDTH, LEADING)
        y -= LEADING
    y -= 1.5 * LEADING
    page.text_line(LEFT, y, [Run("Signature:", T, SIZE)])
    y -= 4.0 * LEADING
    page.text_line(LEFT, y, [Run(f"Name: {values['name']}", T, SIZE)])
    y -= LEADING * 1.09
    page.text_line(LEFT, y, [Run("Date:", T, SIZE)])
    y -= LEADING * 1.09
    page.text_line(LEFT, y, [Run("Place:", T, SIZE)])


def build_offer_letter(data: OfferLetterData) -> bytes:
    """The finished two-page offer letter as PDF bytes."""
    values = validate(data)
    document = PdfDocument()
    with open(LETTERHEAD_PATH, "rb") as handle:
        document.add_png("Letterhead", handle.read())
    _first_page(document.add_page(), values)
    _second_page(document.add_page(), values)
    return document.to_bytes()
