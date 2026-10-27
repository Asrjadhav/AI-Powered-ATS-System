from typing import List

from pydantic import BaseModel


class WeeklyApplicationPoint(BaseModel):
    """One bar of the weekly applications chart."""
    name: str
    count: int


class DashboardStats(BaseModel):
    """
    Every figure shown on the recruitment dashboard.

    Field names match the TypeScript DashboardStats interface in src/types.ts so
    the client can render them directly. Each value is final: the client must
    not re-derive, re-total or re-filter anything here.
    """
    totalJobs: int = 0
    activeVacancies: int = 0
    activeCandidates: int = 0
    totalCandidates: int = 0
    talentPoolCount: int = 0

    # Pipeline stages. These are disjoint: a candidate is counted in exactly
    # one of them.
    newApplicationsCount: int = 0
    aiShortlistedCount: int = 0
    interviewStageCount: int = 0
    offerCount: int = 0
    hiredCount: int = 0
    rejectedCount: int = 0
    appsTodayCount: int = 0

    averageMatchScore: int = 0

    todayInterviews: int = 0
    upcomingInterviews: int = 0
    completedInterviews: int = 0
    cancelledInterviews: int = 0
    pendingFeedback: int = 0
    totalInterviews: int = 0

    totalOffers: int = 0
    pendingOffers: int = 0
    averageDuration: int = 0

    weeklyApplications: List[WeeklyApplicationPoint] = []
