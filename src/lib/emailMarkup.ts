/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Email template markup, the same rules as backend/services/email_html.py (which builds the real email):
//   ***bold italic***   **bold**   [[label|link]]   bare http(s):// and www. addresses become links,
//   and the ordinal in "1st Round" / "9th September" is raised.
// The preview renders the HTML below; the text is escaped first, so nothing typed can inject markup.

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const LINK = /\[\[(.+?)\|(.+?)\]\]/g;
const BARE_URL = /(?:https?:\/\/|www\.)[^\s<>[\]|]+/g;
const BOLD_ITALIC = /\*\*\*([\s\S]+?)\*\*\*/g;
const BOLD = /\*\*([\s\S]+?)\*\*/g;
const ORDINAL = new RegExp(String.raw`\b(\d{1,2})(st|nd|rd|th)(?= (?:Round|${MONTHS})\b)`, "g");

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(text: string): string {
  return text.replace(/"/g, "&quot;");
}

function anchor(label: string, url: string): string {
  const decoration = /^(tel:|mailto:)/.test(url) ? "none" : "underline";
  return `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer" style="color:#1155cc;text-decoration:${decoration};">${label}</a>`;
}

/** The email body as HTML (paragraphs, formatting, links), with the company logo under it. */
export function renderEmailMarkup(text: string, logoUrl: string): string {
  if (!text) return "";
  const pieces: string[] = [];
  const keep = (markup: string) => {
    pieces.push(markup);
    return `\u0000${pieces.length - 1}\u0000`;
  };

  let html = escapeHtml(text);
  html = html.replace(LINK, (_m, label, url) => keep(anchor(label, url)));
  html = html.replace(BARE_URL, (match) => {
    let address = match;
    let trailing = "";
    while (address && ".,;:!?)".includes(address[address.length - 1])) {
      trailing = address[address.length - 1] + trailing;
      address = address.slice(0, -1);
    }
    const href = address.startsWith("http") ? address : `http://${address}`;
    return keep(anchor(address, href)) + trailing;
  });
  html = html.replace(BOLD_ITALIC, "<strong><em>$1</em></strong>");
  html = html.replace(BOLD, "<strong>$1</strong>");
  html = html.replace(ORDINAL, "$1<sup>$2</sup>");
  html = html.replace(/\u0000(\d+)\u0000/g, (_m, index) => pieces[Number(index)]);

  const paragraphs = html.trim().split(/\n\s*\n/).filter((p) => p.trim());
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px 0;">${p.trim().replace(/\n/g, "<br>")}</p>`).join("");
  return `${body}<img src="${escapeAttribute(logoUrl)}" width="125" alt="EncureIT" style="display:block;border:0;">`;
}
