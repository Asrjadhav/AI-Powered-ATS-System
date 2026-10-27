from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.stats import DashboardStats
import services.stats_service as stats_service

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def read_dashboard_stats(
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
    Returns every figure shown on the recruitment dashboard, aggregated in the
    database. Clients render these values as-is.
    """
    return stats_service.get_dashboard_stats(db, match_threshold=matchThreshold)
