from typing import List

from pydantic import BaseModel


class ScoreBucket(BaseModel):
    """One band of the AI score distribution."""
    key: str
    name: str
    count: int
    percentage: int


class FunnelStage(BaseModel):
    """
    One stage of the hiring funnel.

    Counts are cumulative: every candidate who reached this stage, including
    those who have since moved further along. That is what makes the funnel
    monotonically decreasing and the conversions meaningful.

    - percentageOfTotal: this stage as a share of all applications.
    - conversionFromPrevious: this stage as a share of the stage before it.
    """
    key: str
    stage: str
    count: int
    percentageOfTotal: int
    conversionFromPrevious: int


class SourceBreakdown(BaseModel):
    """Candidate volume and average score for one sourcing channel."""
    name: str
    candidates: int
    avgScore: int


class JobPerformance(BaseModel):
    """One row of the per-job performance table."""
    id: str
    title: str
    department: str
    applications: int
    qualified: int
    interviewRate: int
    hiringRate: int
    avgAiScore: int
    status: str


class RecruitmentInsights(BaseModel):
    """
    The analytics shown on the Insights and Visual Insights screens.

    Both screens render these identical values. Previously each computed its
    own, and they disagreed: two different offer-conversion formulas and a
    funnel whose conversion percentages were hardcoded constants.
    """
    total: int = 0
    avgScore: int = 0

    # Pipeline stages, disjoint: each candidate is counted exactly once.
    newCount: int = 0
    shortlistedCount: int = 0
    interviewingCount: int = 0
    offerCount: int = 0
    hiredCount: int = 0
    rejectedCount: int = 0

    # Share of candidates who progressed beyond initial review.
    conversionRate: int = 0
    # Share of everyone who received an offer that went on to be hired.
    offerConversionRate: int = 0

    interviewSuccessRate: int = 0
    offerAcceptanceRate: int = 0

    scoreBuckets: List[ScoreBucket] = []
    funnel: List[FunnelStage] = []
    sourceData: List[SourceBreakdown] = []
    jobPerformance: List[JobPerformance] = []

    # Every department present in the data, for the filter control.
    departments: List[str] = []
