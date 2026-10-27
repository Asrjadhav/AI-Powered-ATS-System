/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";

const FASTAPI_BASE_URL =
  (import.meta as any).env?.VITE_FASTAPI_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://127.0.0.1:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export interface WeeklyApplicationPoint {
  name: string;
  count: number;
}

/**
 * Every figure shown on the recruitment dashboard.
 *
 * This mirrors the DashboardStats model in backend/schemas/stats.py. Each value
 * is final and is rendered as-is: do not re-total, re-filter or otherwise
 * recompute anything here. The pipeline stage counts are disjoint, so they can
 * be summed or charted directly.
 *
 * To change how a figure is derived, change
 * backend/services/stats_service.get_dashboard_stats.
 */
export interface DashboardStats {
  totalJobs: number;
  activeVacancies: number;
  activeCandidates: number;
  totalCandidates: number;
  talentPoolCount: number;

  newApplicationsCount: number;
  aiShortlistedCount: number;
  interviewStageCount: number;
  offerCount: number;
  hiredCount: number;
  rejectedCount: number;
  appsTodayCount: number;

  averageMatchScore: number;

  todayInterviews: number;
  upcomingInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  pendingFeedback: number;
  totalInterviews: number;

  totalOffers: number;
  pendingOffers: number;
  averageDuration: number;

  weeklyApplications: WeeklyApplicationPoint[];
}

/**
 * Shown when the dashboard cannot reach the API, so the page renders empty
 * rather than throwing. It is never used to stand in for a real figure.
 */
const EMPTY_STATS: DashboardStats = {
  totalJobs: 0,
  activeVacancies: 0,
  activeCandidates: 0,
  totalCandidates: 0,
  talentPoolCount: 0,
  newApplicationsCount: 0,
  aiShortlistedCount: 0,
  interviewStageCount: 0,
  offerCount: 0,
  hiredCount: 0,
  rejectedCount: 0,
  appsTodayCount: 0,
  averageMatchScore: 0,
  todayInterviews: 0,
  upcomingInterviews: 0,
  completedInterviews: 0,
  cancelledInterviews: 0,
  pendingFeedback: 0,
  totalInterviews: 0,
  totalOffers: 0,
  pendingOffers: 0,
  averageDuration: 0,
  weeklyApplications: [
    { name: "Mon", count: 0 },
    { name: "Tue", count: 0 },
    { name: "Wed", count: 0 },
    { name: "Thu", count: 0 },
    { name: "Fri", count: 0 },
    { name: "Sat", count: 0 },
    { name: "Sun", count: 0 },
  ],
};

export const StatsRepository = {
  /**
   * Fetches the dashboard figures.
   *
   * The aggregation runs in the database. Pass matchThreshold only to override
   * the server's configured ATS_MATCH_THRESHOLD for this request.
   */
  async getDashboardStats(matchThreshold?: number): Promise<DashboardStats> {
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/stats`, {
        ...apiConfig,
        params:
          typeof matchThreshold === "number" ? { matchThreshold } : undefined,
      });
      if (res.data) {
        return res.data as DashboardStats;
      }
    } catch (e) {
      console.error("StatsRepository.getDashboardStats failed:", e);
    }
    return EMPTY_STATS;
  },
};
