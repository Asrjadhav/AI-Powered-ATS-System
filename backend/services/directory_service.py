"""
People directory: the employees who can be picked as an interviewer, CC or BCC.

TEMPORARY SOURCE: backend/data/employee_directory.json. This is the only module that knows
where the people come from, so connecting the Resource Hub (ERA) later means replacing
`_load_people()` (see changes.md). Callers get plain dicts: {id, name, email, role}.
Interviews store the id plus a copy of the name and email taken from here.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)

DIRECTORY_FILE = Path(__file__).resolve().parent.parent / "data" / "employee_directory.json"


def _load_people() -> List[dict]:
    try:
        with open(DIRECTORY_FILE, encoding="utf-8") as fh:
            raw = json.load(fh)
    except (OSError, ValueError) as exc:
        logger.error("People directory %s could not be read (%s: %s)", DIRECTORY_FILE, type(exc).__name__, exc)
        return []
    people = []
    for item in raw if isinstance(raw, list) else []:
        if isinstance(item, dict) and item.get("id") and item.get("name") and item.get("email"):
            people.append({
                "id": str(item["id"]),
                "name": str(item["name"]),
                "email": str(item["email"]).strip(),
                "role": str(item.get("role") or ""),
            })
    return people


def list_people(query: Optional[str] = None) -> List[dict]:
    """All people, or those whose name, email or role contains `query` (case-insensitive)."""
    people = _load_people()
    needle = (query or "").strip().lower()
    if not needle:
        return people
    return [p for p in people if needle in f"{p['name']} {p['email']} {p['role']}".lower()]


def get_people_by_id(ids: Iterable[str]) -> Dict[str, dict]:
    """The people with these ids, keyed by id. Unknown ids are simply absent."""
    wanted = set(ids)
    return {p["id"]: p for p in _load_people() if p["id"] in wanted}
