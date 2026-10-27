"""
Whether an application is live, or parked because its job is not open.

Separate from the pipeline stage (`status`: New / Shortlisted / ...): a held
application keeps its stage and score and simply waits until the job reopens.
"""

from enum import Enum


class ApplicationState(str, Enum):
    OPEN = "Open"
    ON_HOLD = "On Hold"
