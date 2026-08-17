/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CandidateRepository } from "./candidateRepository";
import { ApplicationRepository } from "./applicationRepository";
import { JobRepository } from "./jobRepository";
import { InterviewRepository } from "./interviewRepository";
import { OfferRepository } from "./offerRepository";
import { TalentPoolRepository } from "./talentPoolRepository";
import {
  isNewCandidate,
  isPendingEvaluation,
  isAIShortlisted,
  isInterviewStage,
  isOfferedStage,
  isHiredStage,
  isRejectedStage,
  isTodayCandidate,
  getCandidateAIScore,
  DEFAULT_MATCH_THRESHOLD
} from "../utils/pipelineUtils";

export const StatsRepository = {
  async getDashboardStats(matchThreshold = DEFAULT_MATCH_THRESHOLD): Promise<any> {
    const [candidates, applications, jobs, interviewsRaw, offersRaw, talentPool] = await Promise.all([
      CandidateRepository.getAll(),
      ApplicationRepository.getAll(),
      JobRepository.getAll(),
      InterviewRepository.getAll(),
      OfferRepository.getAll(),
      TalentPoolRepository.getAll()
    ]);

    const interviews = candidates.length === 0 ? [] : interviewsRaw;
    const offers = candidates.length === 0 ? [] : offersRaw;

    const activeVacancies = jobs.filter((j: any) => String(j.status || "").toLowerCase() === "active").length;
    const totalCandidates = candidates.length;
    const totalInterviews = interviews.length;
    const totalOffers = offers.length;

    const todayStr = new Date().toISOString().split("T")[0];
    const todayInterviews = interviews.filter((i: any) => i.date === todayStr && i.status !== "Cancelled" && i.status !== "CANCELLED").length;
    const upcomingInterviews = interviews.filter((i: any) => (i.status === "Upcoming" || i.status === "SCHEDULED" || i.status === "Scheduled") && i.date >= todayStr).length;
    const completedInterviews = interviews.filter((i: any) => i.status === "Completed" || i.status === "COMPLETED").length;
    const cancelledInterviews = interviews.filter((i: any) => i.status === "Cancelled" || i.status === "CANCELLED").length;
    const pendingFeedback = interviews.filter((i: any) => (i.status === "Upcoming" || i.status === "SCHEDULED" || i.status === "Scheduled") && i.date < todayStr).length;
    
    const pendingOffers = offers.filter((o: any) => String(o.status || "").toLowerCase() === "pending").length;

    const completedWithDuration = interviews.filter((i: any) => i.status === "Completed" || i.status === "COMPLETED");
    const averageDuration = completedWithDuration.length > 0 
      ? Math.round(completedWithDuration.reduce((acc: number, curr: any) => acc + (curr.duration || 45), 0) / completedWithDuration.length)
      : 0;

    const averageMatchScore = candidates.length > 0 
      ? Math.round(candidates.reduce((acc: number, curr: any) => acc + getCandidateAIScore(curr), 0) / candidates.length)
      : 0;

    const dayCounts: Record<string, number> = { "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0 };
    candidates.forEach(cand => {
      const dateStr = cand.appliedAt || cand.appliedDate || cand.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const dayName = dayNames[d.getDay()];
          if (dayCounts[dayName] !== undefined) {
            dayCounts[dayName]++;
          }
        }
      }
    });

    const pendingReviews = candidates.filter(c => isPendingEvaluation(c)).length;
    const aiShortlistedCount = candidates.filter(c => isAIShortlisted(c, matchThreshold)).length;
    const interviewStageCount = candidates.filter(c => isInterviewStage(c)).length;
    const offeredCount = candidates.filter(c => isOfferedStage(c)).length;
    const hiredCount = candidates.filter(c => isHiredStage(c)).length;
    const rejectedCount = candidates.filter(c => isRejectedStage(c)).length;
    const appsTodayCount = candidates.filter(c => isTodayCandidate(c)).length;
    const newApplicationsCount = candidates.filter(c => isNewCandidate(c)).length;

    return {
      totalJobs: activeVacancies,
      activeVacancies,
      activeCandidates: totalCandidates,
      totalCandidates,
      talentPoolCount: talentPool.length,
      pendingReviews,
      aiShortlistedCount,
      interviewStageCount,
      offeredCount,
      hiredCount,
      rejectedCount,
      appsTodayCount,
      newApplicationsCount,
      averageMatchScore,
      todayInterviews,
      upcomingInterviews,
      completedInterviews,
      cancelledInterviews,
      pendingFeedback,
      totalInterviews,
      totalOffers,
      pendingOffers,
      averageDuration,
      weeklyApplications: [
        { name: "Mon", count: dayCounts["Mon"] },
        { name: "Tue", count: dayCounts["Tue"] },
        { name: "Wed", count: dayCounts["Wed"] },
        { name: "Thu", count: dayCounts["Thu"] },
        { name: "Fri", count: dayCounts["Fri"] },
        { name: "Sat", count: dayCounts["Sat"] },
        { name: "Sun", count: dayCounts["Sun"] },
      ]
    };
  }
};
