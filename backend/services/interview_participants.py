"""
Validates the interviewers / BCC chosen for an interview.

The interviewers are the CC recipients of the invitation email, so:
  - at least one interviewer is required (never empty) when scheduling;
  - BCC may be empty;
  - every person must exist in the people directory: only the id is trusted from the
    request, and the stored name and email are copied from the directory;
  - nobody may be both an interviewer and in BCC (BCC would reveal itself through the CC header).
"""

from typing import Dict, List, Optional

import services.directory_service as directory_service
from schemas.interview import PersonRef


class ParticipantError(ValueError):
    """The chosen interviewers / BCC are not acceptable. The message is shown to the user."""


def _resolve_list(label: str, refs: List[PersonRef], directory: Dict[str, dict]) -> List[PersonRef]:
    resolved: List[PersonRef] = []
    seen = set()
    for ref in refs:
        if ref.id in seen:
            continue
        seen.add(ref.id)
        person = directory.get(ref.id)
        if not person:
            raise ParticipantError(f"{label}: '{ref.id}' is not in the people directory.")
        resolved.append(PersonRef(id=person["id"], name=person["name"], email=person["email"]))
    return resolved


def resolve(
    interviewers: Optional[List[PersonRef]],
    bcc: Optional[List[PersonRef]],
    *,
    creating: bool,
) -> Dict[str, List[PersonRef]]:
    """
    Returns the validated lists, keyed "interviewers" / "bcc".
    When creating, interviewers must be non-empty and a missing BCC becomes [].
    When updating, only the lists that were sent are checked and returned.
    """
    if creating:
        interviewers, bcc = interviewers or [], bcc or []

    if interviewers is not None and not interviewers:
        raise ParticipantError("Interviewers cannot be empty: select at least one person.")

    wanted = [r.id for group in (interviewers, bcc) for r in (group or [])]
    directory = directory_service.get_people_by_id(wanted)

    result: Dict[str, List[PersonRef]] = {}
    if interviewers is not None:
        result["interviewers"] = _resolve_list("Interviewer", interviewers, directory)
    if bcc is not None:
        result["bcc"] = _resolve_list("BCC", bcc, directory)

    overlap = {p.id for p in result.get("interviewers", [])} & {p.id for p in result.get("bcc", [])}
    if overlap:
        names = ", ".join(p.name for p in result["interviewers"] if p.id in overlap)
        raise ParticipantError(f"{names} is both an interviewer and in BCC. Choose one.")
    return result
