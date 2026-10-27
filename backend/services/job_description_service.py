"""
Job description (JD) PDF, attached to the interview invitation email.

Built from the job saved under Jobs (title, department, location, type, work mode, experience,
education, openings, description, responsibilities, requirements, preferred skills, benefits) and
printed on the company letterhead (assets/offer_letterhead.png), page after page when it is long.

Only what a candidate may see is printed. Internal fields (salary range, maximum budget, hiring
manager, recruiter, status, deadline, custom fields) are never read. Nothing is invented: a job with
no title, or with no details at all, raises JobDescriptionError instead of producing an empty PDF.

The PDF is written by services/pdf_writer.py (no PDF library); like the offer letter, characters
outside Windows-1252 (for example Devanagari) print as "?".
"""

import html
import os
import re
from typing import List, Sequence, Tuple

from services.pdf_writer import PAGE_HEIGHT, PAGE_WIDTH, PdfDocument, Run, rgb, wrap

LETTERHEAD_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "offer_letterhead.png")

LEFT = 72.0
RIGHT = 523.0
TEXT_WIDTH = RIGHT - LEFT
TOP = 735.0      # first baseline on a page, below the logo
BOTTOM = 108.0   # nothing is printed below this line: the letterhead footer starts under it
SIZE = 11.5
LEADING = 15.5
BULLET_INDENT = 16.0
BLUE = rgb("#1F3864")
GREY = rgb("#555555")
INK = rgb("#222222")


class JobDescriptionError(ValueError):
    """The job description PDF cannot be produced because the job has nothing to print."""


def job_description_filename(job_title: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9]+", "_", job_title or "").strip("_") or "Job"
    return f"Job_Description_{safe}.pdf"


def _clean(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


_MARKER = re.compile(r"^(?:[-*•·●]|\d+[.)])\s+")


def _items(value) -> List[Tuple[str, bool]]:
    """
    Text lines from a stored value (a list of strings, or free text that may hold simple HTML or
    markdown). Each line is (text, had_a_bullet_marker).
    """
    if value is None:
        return []
    raw = [str(v) for v in value if v is not None] if isinstance(value, (list, tuple)) else [str(value)]
    out: List[Tuple[str, bool]] = []
    for chunk in raw:
        text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>|</h\d>", "\n", chunk)
        text = re.sub(r"(?i)<li[^>]*>", "\n- ", text)
        text = html.unescape(re.sub(r"<[^>]+>", "", text))
        for line in text.splitlines():
            line = _clean(line.replace("**", "").replace("__", ""))
            line = re.sub(r"^#{1,6}\s*", "", line)
            bullet = bool(_MARKER.match(line))
            line = _MARKER.sub("", line)
            if line:
                out.append((line, bullet))
    return out


class _Flow:
    """Writes top to bottom and starts a new letterhead page when the next line would not fit."""

    def __init__(self, document: PdfDocument) -> None:
        self._document = document
        self.y = TOP
        self.page = self._start_page()

    def _start_page(self):
        page = self._document.add_page()
        page.image("Letterhead", 0, 0, PAGE_WIDTH, PAGE_HEIGHT)
        self.y = TOP
        return page

    def need(self, height: float) -> None:
        if self.y - height < BOTTOM:
            self.page = self._start_page()

    def skip(self, height: float) -> None:
        self.y -= height

    def paragraph(self, runs: Sequence[Run], bullet: bool = False) -> None:
        indent = BULLET_INDENT if bullet else 0.0
        for index, line in enumerate(wrap(runs, TEXT_WIDTH - indent)):
            self.need(LEADING)
            if bullet and index == 0:
                self.page.text_line(LEFT, self.y, [Run("•", "T", SIZE, color=INK)])
            self.page.text_line(LEFT + indent, self.y, line)
            self.y -= LEADING

    def heading(self, text: str) -> None:
        self.need(LEADING * 3)  # never leave a heading alone at the bottom of a page
        self.skip(8.0)
        self.page.text_line(LEFT, self.y, [Run(text, "HB", 12.5, color=BLUE)])
        self.page.line(LEFT, self.y - 5.0, RIGHT, self.y - 5.0, BLUE, 0.8)
        self.skip(22.0)


def _meta(job) -> List[Tuple[str, str]]:
    experience = _clean(getattr(job, "experienceRange", ""))
    level = _clean(getattr(job, "experienceLevel", ""))
    if experience and level:
        experience = f"{experience} ({level})"
    openings = getattr(job, "openings", None)
    rows = [
        ("Department", _clean(getattr(job, "department", ""))),
        ("Location", _clean(getattr(job, "location", ""))),
        ("Work Mode", _clean(getattr(job, "workMode", ""))),
        ("Employment Type", _clean(getattr(job, "type", ""))),
        ("Experience", experience or level),
        ("Education", _clean(getattr(job, "education", ""))),
        ("Openings", str(openings) if openings else ""),
    ]
    return [(label, value) for label, value in rows if value]


def build_job_description(job) -> bytes:
    """The finished job description as PDF bytes. `job` is a jobs row (JobModel)."""
    title = _clean(getattr(job, "title", ""))
    if not title:
        raise JobDescriptionError("Job description cannot be generated: the job has no title.")

    description = _items(getattr(job, "description", None))
    sections = [
        ("About the Role", description, False),
        ("Key Responsibilities", _items(getattr(job, "responsibilities", None)), True),
        ("Requirements", _items(getattr(job, "requirements", None)), True),
        ("Preferred Skills", _items(getattr(job, "preferredSkills", None)), True),
        ("Benefits", _items(getattr(job, "benefits", None)), True),
    ]
    meta = _meta(job)
    if not meta and not any(items for _, items, _ in sections):
        raise JobDescriptionError(f"Job description cannot be generated: job {title!r} has no details saved.")

    document = PdfDocument()
    with open(LETTERHEAD_PATH, "rb") as handle:
        document.add_png("Letterhead", handle.read())
    flow = _Flow(document)

    flow.paragraph([Run("JOB DESCRIPTION", "HB", 9.5, color=GREY)])
    flow.skip(4.0)
    for line in wrap([Run(title, "HB", 20.0, color=BLUE)], TEXT_WIDTH):
        flow.need(26.0)
        flow.page.text_line(LEFT, flow.y, line)
        flow.skip(26.0)
    job_ref = _clean(getattr(job, "jobId", ""))
    if job_ref:
        flow.paragraph([Run(f"Job ID: {job_ref}", "T", 10.5, color=GREY)])
    flow.skip(8.0)

    for label, value in meta:
        flow.paragraph([Run(f"{label}: ", "TB", SIZE, color=INK), Run(value, "T", SIZE, color=INK)])

    for heading, items, force_bullets in sections:
        if not items:
            continue
        flow.heading(heading)
        for text, had_marker in items:
            bullet = force_bullets or had_marker
            flow.paragraph([Run(text, "T", SIZE, color=INK)], bullet=bullet)
            flow.skip(0.0 if bullet else 5.0)

    return document.to_bytes()
