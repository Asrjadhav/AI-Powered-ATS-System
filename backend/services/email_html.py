"""
Turns an email template body into the plain-text and HTML parts of the message.

Templates are written as plain text with a little markup, so HR can still edit them in the Email
Templates page. The same markup is read by the page's live preview (src/lib/emailMarkup.ts):

    ***text***           bold + italic     ("Greetings from EncureIT Systems!!")
    **text**             bold
    [[label|url]]        a link            ([[Interview Link|https://meet.google.com/...]])
    https://... www....  a bare address becomes a link
    1st Round, 9th September 2026   the ordinal is raised, as in the reference mail

The plain-text part has the markup removed. The HTML part is styled like the reference mail
(Arial, blue links) and ends with the company logo, sent as an inline image.
"""

import html
import os
import re
from typing import List

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "email_logo.png")
LOGO_CID = "company_logo"
LOGO_WIDTH_PX = 125

_MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
_LINK = re.compile(r"\[\[(.+?)\|(.+?)\]\]")
_BARE_URL = re.compile(r"(?:https?://|www\.)[^\s<>\[\]|]+")
_BOLD_ITALIC = re.compile(r"\*\*\*(.+?)\*\*\*", re.S)
_BOLD = re.compile(r"\*\*(.+?)\*\*", re.S)
_ORDINAL = re.compile(rf"\b(\d{{1,2}})(st|nd|rd|th)(?= (?:Round|{_MONTHS})\b)")
_LINK_STYLE = "color:#1155cc;"


def to_plain(text: str) -> str:
    """The text with the markup removed. A link to a web address shows the address itself."""
    def link(match: "re.Match") -> str:
        label, url = match.group(1), match.group(2)
        return url if url.startswith(("http://", "https://")) else label

    text = _LINK.sub(link, text or "")
    text = _BOLD_ITALIC.sub(r"\1", text)
    return _BOLD.sub(r"\1", text)


def _anchor(label: str, url: str) -> str:
    decoration = "none" if url.startswith(("tel:", "mailto:")) else "underline"
    return f'<a href="{url}" style="{_LINK_STYLE}text-decoration:{decoration};">{label}</a>'


def to_html(text: str, with_logo: bool = True) -> str:
    """The HTML part of the email: paragraphs, bold / italic, links, raised ordinals and the logo."""
    pieces: List[str] = []  # finished anchors, put back after the other rules ran

    def keep(markup: str) -> str:
        pieces.append(markup)
        return f"\x00{len(pieces) - 1}\x00"

    escaped = html.escape(text or "", quote=False)
    escaped = _LINK.sub(lambda m: keep(_anchor(m.group(1), html.escape(m.group(2), quote=True))), escaped)

    def bare(match: "re.Match") -> str:
        address = match.group(0)
        trailing = ""
        while address and address[-1] in ".,;:!?)":
            trailing = address[-1] + trailing
            address = address[:-1]
        href = address if address.startswith("http") else "http://" + address
        return keep(_anchor(address, html.escape(href, quote=True))) + trailing

    escaped = _BARE_URL.sub(bare, escaped)
    escaped = _BOLD_ITALIC.sub(r"<strong><em>\1</em></strong>", escaped)
    escaped = _BOLD.sub(r"<strong>\1</strong>", escaped)
    escaped = _ORDINAL.sub(r"\1<sup>\2</sup>", escaped)
    escaped = re.sub(r"\x00(\d+)\x00", lambda m: pieces[int(m.group(1))], escaped)

    paragraphs = [p for p in re.split(r"\n\s*\n", escaped.strip()) if p.strip()]
    body = "".join(f'<p style="margin:0 0 14px 0;">{p.strip().replace(chr(10), "<br>")}</p>' for p in paragraphs)
    logo = (f'<p style="margin:0;"><img src="cid:{LOGO_CID}" width="{LOGO_WIDTH_PX}" alt="EncureIT" '
            f'style="display:block;border:0;"></p>') if with_logo else ""
    return ('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222222;">'
            f"{body}{logo}</div>")


def logo_bytes() -> bytes:
    with open(LOGO_PATH, "rb") as handle:
        return handle.read()
