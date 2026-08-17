/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import {
  generateId,
  normalizePipelineStatus,
  generateAIMatchScore,
  cleanOrphanCandidates,
  assignSequentialCandidateIds
} from "./repositoryUtils";
import {
  isNewCandidate,
  isPendingEvaluation,
  isAIShortlisted,
  isInterviewStage,
  isOfferedStage,
  isHiredStage,
  isRejectedStage,
  isTodayCandidate,
  filterCandidatesByStage,
  getCandidateAIScore,
  DEFAULT_MATCH_THRESHOLD
} from "../utils/pipelineUtils";

export const SUPPORTED_CANDIDATE_SOURCES = [
  "Career Website",
  "Public Apply Form",
  "LinkedIn",
  "Manual HR Add Candidate",
  "Resume Upload",
  "CSV Import",
  "Naukri",
  "Foundit",
  "Indeed"
] as const;

function findCandidateIndex(candidates: any[], id: string): number {
  if (!id) return -1;
  const rawId = String(id).trim();
  const cleanId = rawId.replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
  return candidates.findIndex(c => {
    if (!c) return false;
    const cId = String(c.id || "").trim();
    const cCandId = String(c.candidateId || "").trim();
    const cCleanId = cId.replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
    const cCandCleanId = cCandId.replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
    return (
      cId === rawId ||
      cCandId === rawId ||
      cCleanId === cleanId ||
      cCandCleanId === cleanId ||
      cId.toLowerCase() === rawId.toLowerCase() ||
      cCandId.toLowerCase() === rawId.toLowerCase()
    );
  });
}

export const CandidateRepository = {
  async getAllCandidates(): Promise<any[]> {
    const res = await axios.get("/api/candidates", { headers: { "X-Skip-Interceptor": "true" } });
    if (res.data && Array.isArray(res.data)) {
      const cleaned = cleanOrphanCandidates(res.data);
      const sequenced = assignSequentialCandidateIds(cleaned);
      return sequenced;
    }
    return [];
  },

  async getAll(): Promise<any[]> {
    return this.getAllCandidates();
  },

  async getMetrics(matchThreshold = DEFAULT_MATCH_THRESHOLD): Promise<{
    total: number;
    pendingEvaluation: number;
    aiShortlisted: number;
    interview: number;
    offered: number;
    hired: number;
    rejected: number;
    today: number;
  }> {
    const list = await this.getAll();
    return {
      total: list.length,
      pendingEvaluation: list.filter(a => isPendingEvaluation(a)).length,
      aiShortlisted: list.filter(a => isAIShortlisted(a, matchThreshold)).length,
      interview: list.filter(a => isInterviewStage(a)).length,
      offered: list.filter(a => isOfferedStage(a)).length,
      hired: list.filter(a => isHiredStage(a)).length,
      rejected: list.filter(a => isRejectedStage(a)).length,
      today: list.filter(a => isTodayCandidate(a)).length,
    };
  },

  async getTotal(): Promise<number> {
    const list = await this.getAll();
    return list.length;
  },

  async getPendingEvaluationCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(a => isPendingEvaluation(a)).length;
  },

  async getNewApplicationsCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(a => isNewCandidate(a)).length;
  },

  async getNewTodayCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(a => isTodayCandidate(a)).length;
  },

  async getAIShortlistedCount(threshold = DEFAULT_MATCH_THRESHOLD): Promise<number> {
    const list = await this.getAll();
    return list.filter(a => isAIShortlisted(a, threshold)).length;
  },

  async getAverageAIScore(): Promise<number> {
    const list = await this.getAll();
    if (list.length === 0) return 0;
    const totalScore = list.reduce((sum, a) => sum + getCandidateAIScore(a), 0);
    return Math.round(totalScore / list.length);
  },

  async getFiltered(
    filterStatus = "all",
    filterToday = false,
    jobId = "all",
    searchQuery = "",
    matchThreshold = DEFAULT_MATCH_THRESHOLD
  ): Promise<any[]> {
    const list = await this.getAll();
    let result = filterCandidatesByStage(list, filterStatus, filterToday, matchThreshold);

    if (jobId && jobId !== "all") {
      result = result.filter(a => a.jobId === jobId || a.job?.id === jobId);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a => {
        const c = a.candidate || a;
        const name = `${c.firstName || ""} ${c.lastName || ""} ${c.name || ""}`.toLowerCase();
        const email = (c.email || "").toLowerCase();
        const role = (c.currentRole || a.appliedJob || "").toLowerCase();
        const company = (c.currentCompany || "").toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q) || company.includes(q);
      });
    }

    return result;
  },

  async getById(id: string): Promise<any | null> {
    const list = await this.getAll();
    const idx = findCandidateIndex(list, id);
    return idx !== -1 ? list[idx] : null;
  },

  async create(payload: any): Promise<any> {
    const currentList = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const nextNum = currentList.length + 1;
    const candidateId = payload.candidateId || (payload.id && String(payload.id).startsWith("CAND-") ? payload.id : `CAND-${String(nextNum).padStart(3, '0')}`);
    const status = normalizePipelineStatus(payload.status || "Applied");
    const aiMatchScore = generateAIMatchScore(payload);

    const newCandidate = {
      ...payload,
      id: candidateId,
      candidateId: candidateId,
      createdAt: payload.createdAt || now,
      updatedAt: now,
      createdBy: payload.createdBy || currentUser,
      status,
      aiScore: aiMatchScore
    };

    const res = await axios.post("/api/candidates", newCandidate, { headers: { "X-Skip-Interceptor": "true" } });
    const saved = res.data || newCandidate;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return saved;
  },

  async createApplication(payload: any): Promise<any> {
    return this.create(payload);
  },

  async update(id: string, updates: any): Promise<any> {
    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updatedAt: now
    };

    const res = await axios.patch(`/api/candidates/${id}`, payload, { headers: { "X-Skip-Interceptor": "true" } });
    const updated = res.data || { id, ...updates };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return updated;
  },

  async updateStatus(id: string, newStatusRaw: string, currentUserSession?: any): Promise<any> {
    const newStatus = normalizePipelineStatus(newStatusRaw);
    const now = new Date().toISOString();
    const updaterName = currentUserSession?.name || "HR Admin";

    const currentCandidate = await this.getById(id);
    const timeline = currentCandidate?.timeline || [];

    const newEvent = {
      id: generateId("evt"),
      title: `State Transition to ${newStatus}`,
      timestamp: now,
      description: `Applicant pipeline state updated to ${newStatus} by ${updaterName}.`
    };

    const updatedTimeline = [...timeline, newEvent];

    const res = await axios.patch(`/api/candidates/${id}`, {
      status: newStatus,
      timeline: updatedTimeline,
      updatedAt: now
    }, { headers: { "X-Skip-Interceptor": "true" } });

    const updated = res.data;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const rawId = String(id || "").trim();
    const cleanId = rawId.replace(/^app-/, "").replace(/^cand-/, "").replace(/^tp-/, "");

    await axios.delete(`/api/candidates/${rawId}`, { headers: { "X-Skip-Interceptor": "true" } });
    if (cleanId && cleanId !== rawId) {
      await axios.delete(`/api/candidates/${cleanId}`, { headers: { "X-Skip-Interceptor": "true" } }).catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return true;
  }
};
