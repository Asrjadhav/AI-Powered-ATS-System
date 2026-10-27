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

export interface ScoreBucket {
  key: string;
  name: string;
  count: number;
  percentage: number;
}

export interface FunnelStage {
  key: string;
  stage: string;
  count: number;
  /** This stage as a share of all applications. */
  percentageOfTotal: number;
  /** This stage as a share of the stage before it. */
  conversionFromPrevious: number;
}

export interface SourceBreakdown {
  name: string;
  candidates: number;
  avgScore: number;
}

export interface JobPerformance {
  id: string;
  title: string;
  department: string;
  applications: number;
  qualified: number;
  interviewRate: number;
  hiringRate: number;
  avgAiScore: number;
  status: string;
}

/**
 * Recruitment analytics, mirroring RecruitmentInsights in
 * backend/schemas/insights.py.
 *
 * Every value is final, including funnel conversions and every percentage.
 * Render them as-is. The Insights and Visual Insights screens previously each
 * computed their own and disagreed; the definitions now live in
 * backend/services/insights_service.py alone.
 */
export interface RecruitmentInsights {
  total: number;
  avgScore: number;

  newCount: number;
  shortlistedCount: number;
  interviewingCount: number;
  offerCount: number;
  hiredCount: number;
  rejectedCount: number;

  conversionRate: number;
  offerConversionRate: number;
  interviewSuccessRate: number;
  offerAcceptanceRate: number;

  scoreBuckets: ScoreBucket[];
  funnel: FunnelStage[];
  sourceData: SourceBreakdown[];
  jobPerformance: JobPerformance[];
  departments: string[];
}

/** Chart colours keyed by the stable identifiers the API returns. */
export const SCORE_BUCKET_COLORS: Record<string, string> = {
  exceptional: "#1F3B75",
  strong: "#355EA8",
  moderate: "#f59e0b",
  needs_review: "#94a3b8",
};

export const FUNNEL_STAGE_COLORS: Record<string, string> = {
  applications: "#1F3B75",
  shortlisted: "#2E549B",
  interviewing: "#557DBF",
  offer: "#f59e0b",
  hired: "#10b981",
};

/**
 * Shown when the analytics cannot be reached, so the screens render empty
 * rather than throwing. It never stands in for a real figure.
 */
export const EMPTY_INSIGHTS: RecruitmentInsights = {
  total: 0,
  avgScore: 0,
  newCount: 0,
  shortlistedCount: 0,
  interviewingCount: 0,
  offerCount: 0,
  hiredCount: 0,
  rejectedCount: 0,
  conversionRate: 0,
  offerConversionRate: 0,
  interviewSuccessRate: 0,
  offerAcceptanceRate: 0,
  scoreBuckets: [],
  funnel: [],
  sourceData: [],
  jobPerformance: [],
  departments: [],
};

export const InsightsRepository = {
  /**
   * Fetches the recruitment analytics.
   *
   * Pass a department to scope the figures to it; omit it, or pass
   * "All Departments", for everything.
   */
  async getInsights(
    department?: string,
    matchThreshold?: number,
    position?: string
  ): Promise<RecruitmentInsights> {
    try {
      const params: Record<string, string | number> = {};
      if (department && department !== "All Departments") {
        params.department = department;
      }
      if (typeof matchThreshold === "number") {
        params.matchThreshold = matchThreshold;
      }
      if (position && position !== "All Positions") {
        params.position = position;
      }

      const res = await axios.get(`${FASTAPI_BASE_URL}/api/insights`, {
        ...apiConfig,
        params,
      });
      if (res.data) {
        return res.data as RecruitmentInsights;
      }
    } catch (e) {
      console.error("InsightsRepository.getInsights failed:", e);
    }
    return EMPTY_INSIGHTS;
  },
};
