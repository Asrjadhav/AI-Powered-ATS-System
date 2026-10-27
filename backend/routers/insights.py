from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.insights import RecruitmentInsights
import services.insights_service as insights_service

router = APIRouter()


@router.get("/insights", response_model=RecruitmentInsights)
def read_recruitment_insights(
    department: Optional[str] = Query(
        None,
        description=(
            "Restrict the analytics to one department. Omit, or pass "
            "'All Departments', for everything."
        ),
    ),
    position: Optional[str] = Query(
        None,
        description=(
            "Restrict the analytics to one job position (a job title). Omit, or pass "
            "'All Positions', for every position. Works together with 'department'."
        ),
    ),
    matchThreshold: Optional[int] = Query(
        None,
        ge=0,
        le=100,
        description=(
            "AI match score at or above which a scored candidate counts as "
            "shortlisted. Defaults to the server's ATS_MATCH_THRESHOLD."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Returns the recruitment analytics shown on the Insights screens.

    Every figure is final, including funnel conversions. Clients render these
    values as-is and must not recompute them.
    """
    return insights_service.get_recruitment_insights(
        db, department=department, match_threshold=matchThreshold, position=position
    )
