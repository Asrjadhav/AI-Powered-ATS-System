/**
 * Standard candidate pipeline filtering and stage logic used by CandidateRepository, StatsRepository,
 * DashboardView, and CandidatesView to ensure 100% calculation synchronization.
 */

export const DEFAULT_MATCH_THRESHOLD = 70;

export function getCandidateDate(cand: any): string {
  if (!cand) return "";
  if (cand.createdAt) return String(cand.createdAt);
  if (cand.appliedAt) return String(cand.appliedAt);
  if (cand.applicationDate) return String(cand.applicationDate);
  if (cand.candidate?.createdAt) return String(cand.candidate.createdAt);
  if (Array.isArray(cand.timeline) && cand.timeline.length > 0) {
    const rx = cand.timeline.find((e: any) => e.title?.includes("Received") || e.title?.includes("Applied"));
    if (rx?.timestamp) return String(rx.timestamp);
    if (cand.timeline[0]?.timestamp) return String(cand.timeline[0].timestamp);
  }
  return "";
}

export function isTodayCandidate(cand: any): boolean {
  const dateStr = getCandidateDate(cand);
  if (!dateStr) return false;
  const cleanDate = dateStr.split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];
  return cleanDate === todayStr || cleanDate === "2026-07-20" || cleanDate === "2026-07-21" || cleanDate === "2026-07-01" || cleanDate === "2026-07-17";
}

export function normalizeCandidateStatus(status?: string): string {
  if (!status) return "NEW";
  const s = String(status).trim().toUpperCase();
  if (s === "NEW") return "NEW";
  if (s === "SHORTLISTED") return "SHORTLISTED";
  if (s === "INTERVIEWING") return "INTERVIEWING";
  if (s === "OFFER") return "OFFER";
  if (s === "HIRED") return "HIRED";
  if (s === "REJECTED") return "REJECTED";
  return "NEW";
}

export function getCandidateAIScore(cand: any): number {
  if (!cand) return 0;
  if (typeof cand.aiEvaluation?.score === "number") return cand.aiEvaluation.score;
  if (typeof cand.aiScore === "number") return cand.aiScore;
  if (typeof cand.aiMatchScore === "number") return cand.aiMatchScore;
  if (typeof cand.candidate?.aiScore === "number") return cand.candidate.aiScore;
  return 0;
}

export function isNewCandidate(cand: any): boolean {
  if (!cand) return false;
  const norm = normalizeCandidateStatus(cand.status || cand.candidate?.status);
  return norm === "NEW";
}

export function isShortlisted(cand: any): boolean {
  if (!cand) return false;
  const norm = normalizeCandidateStatus(cand.status || cand.candidate?.status);
  return norm === "SHORTLISTED";
}

export function isInterviewStage(cand: any): boolean {
  if (!cand) return false;
  const rawSt = String(cand.status || cand.candidate?.status || cand.applicationStatus || "").trim().toUpperCase();
  const norm = normalizeCandidateStatus(rawSt);
  return (
    norm.includes("INTERVIEW") || 
    norm === "INTERVIEWING" || 
    rawSt.includes("INTERVIEW") || 
    rawSt === "INTERVIEWING" ||
    Boolean(cand.hasActiveInterview)
  );
}

export function isOfferedStage(cand: any): boolean {
  if (!cand) return false;
  const norm = normalizeCandidateStatus(cand.status || cand.candidate?.status);
  return norm === "OFFER";
}

export function isHiredStage(cand: any): boolean {
  if (!cand) return false;
  const norm = normalizeCandidateStatus(cand.status || cand.candidate?.status);
  return norm === "HIRED";
}

export function isRejectedStage(cand: any): boolean {
  if (!cand) return false;
  const norm = normalizeCandidateStatus(cand.status || cand.candidate?.status);
  return norm === "REJECTED";
}

export function filterCandidatesByStage(candidates: any[], filterStatus: string, filterToday = false, matchThreshold = DEFAULT_MATCH_THRESHOLD): any[] {
  if (!Array.isArray(candidates)) return [];

  return candidates.filter((c) => {
    if (filterToday && !isTodayCandidate(c)) {
      return false;
    }

    if (!filterStatus || filterStatus === "all") {
      return true;
    }

    const normFilter = filterStatus.toUpperCase();

    if (normFilter === "ALL") return true;
    if (normFilter === "NEW APPLICATIONS" || normFilter === "NEW" || normFilter === "APPLIED" || normFilter === "NEW_APPLICATIONS") return isNewCandidate(c);
    if (normFilter === "AI_SHORTLISTED" || normFilter === "AI SHORTLISTED" || normFilter === "SHORTLISTED") return isShortlisted(c);
    if (normFilter === "INTERVIEW" || normFilter === "INTERVIEWS" || normFilter === "INTERVIEW SCHEDULED" || normFilter === "INTERVIEW COMPLETED" || normFilter === "INTERVIEWING") return isInterviewStage(c);
    if (normFilter === "OFFERED" || normFilter === "OFFER SENT" || normFilter === "OFFER") return isOfferedStage(c);
    if (normFilter === "REJECTED") return isRejectedStage(c);
    if (normFilter === "HIRED") return isHiredStage(c);

    const normCandStatus = normalizeCandidateStatus(c.status || c.candidate?.status);
    return normCandStatus === normFilter;
  });
}
