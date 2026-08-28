/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { ApplicationRepository } from "./applicationRepository";
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

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "https://ats-fastapi-backend.onrender.com";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

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
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/candidates`, apiConfig);
      if (res.data && Array.isArray(res.data)) {
        const cleaned = cleanOrphanCandidates(res.data);
        const sequenced = assignSequentialCandidateIds(cleaned);
        return sequenced;
      }
    } catch (e) {
      console.warn("CandidateRepository.getAllCandidates API fetch failed, using local storage fallback:", e);
    }
    const local = LocalStorageService.get<any[]>("candidates", []);
    return assignSequentialCandidateIds(cleanOrphanCandidates(local));
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
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(id)}`, apiConfig);
      if (res.data) return res.data;
    } catch (e) {
      // Fallback to list search
    }
    const list = await this.getAll();
    const idx = findCandidateIndex(list, id);
    return idx !== -1 ? list[idx] : null;
  },

  async create(payload: any): Promise<any> {
    const currentList = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const status = normalizePipelineStatus(payload.status || "Applied");
    const aiMatchScore = generateAIMatchScore(payload);

    const newCandidatePayload = {
      firstName: payload.firstName || "Applicant",
      lastName: payload.lastName || "Candidate",
      email: payload.email || `candidate.${Date.now()}@example.com`,
      phone: payload.phone || "+91 9876543210",
      currentRole: payload.currentRole || "Not specified",
      currentCompany: payload.currentCompany || "Not specified",
      skills: payload.skills || [],
      experienceYears: payload.experienceYears || 0,
      resumeText: payload.resumeText || "",
      linkedinUrl: payload.linkedinUrl || "",
      portfolioUrl: payload.portfolioUrl || "",
      source: payload.source || "Manual HR Add Candidate",
      location: payload.location || "Remote",
      expectedCTC: payload.expectedCTC || 0,
      currentCTC: payload.currentCTC || 0,
      hrNotes: payload.hrNotes || "",
      hrApprovalStatus: payload.hrApprovalStatus || "approved",
      experienceLevel: payload.experienceLevel || "Experienced",
      noticePeriod: payload.noticePeriod || "Immediate",
      status,
      aiScore: aiMatchScore,
      createdAt: payload.createdAt || now,
      updatedAt: now,
      createdBy: payload.createdBy || currentUser,
    };

    let savedCandidate: any = null;
    const targetJobId = payload.jobId || "JOB-0001";
    try {
      const res = await axios.post(`${FASTAPI_BASE_URL}/api/candidates?jobId=${encodeURIComponent(targetJobId)}`, newCandidatePayload, apiConfig);
      savedCandidate = res.data;
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const errorDetail = e.response.data?.detail || "This candidate has already submitted an application for this job position.";
        throw new Error(errorDetail);
      }
      console.warn("CandidateRepository.create API call encountered error, using local fallback:", e?.response?.data || e);
      const nextNum = currentList.length + 1;
      const candidateId = payload.candidateId || `CAND-${String(nextNum).padStart(4, '0')}`;
      savedCandidate = {
        ...newCandidatePayload,
        id: candidateId,
        candidateId,
      };
      currentList.unshift(savedCandidate);
      LocalStorageService.set("candidates", currentList);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return savedCandidate;
  },

  async createApplication(payload: any): Promise<any> {
    // 1. Create the Candidate record first
    const candidate = await this.create(payload);

    // 2. Create the associated Application record linking Candidate + Job
    const targetJobId = payload.jobId || "JOB-0001";
    let applicationRecord: any = null;
    try {
      applicationRecord = await ApplicationRepository.createApplication({
        candidateId: candidate.candidateId || candidate.id,
        jobId: targetJobId,
        status: payload.status || "Applied",
        source: payload.source || "Manual HR Add Candidate",
        atsScore: candidate.aiScore || generateAIMatchScore(payload),
        appliedRole: candidate.currentRole || payload.currentRole || "Applicant Role",
        department: payload.department || "Engineering",
        candidateEmail: candidate.email,
        candidateName: `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
      });
    } catch (appErr) {
      console.warn("Application creation linking candidate failed:", appErr);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }

    return {
      ...(applicationRecord || {}),
      candidate,
      candidateId: candidate.candidateId || candidate.id,
      jobId: targetJobId,
      status: payload.status || "Applied",
    };
  },

  async update(id: string, updates: any): Promise<any> {
    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updatedAt: now
    };

    try {
      const res = await axios.put(`${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(id)}`, payload, apiConfig);
      if (res.data) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("candidates-updated"));
        }
        return res.data;
      }
    } catch (e) {
      // Fallback
    }

    const currentList = await this.getAll();
    const idx = findCandidateIndex(currentList, id);
    if (idx !== -1) {
      currentList[idx] = { ...currentList[idx], ...payload };
      LocalStorageService.set("candidates", currentList);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return { id, ...updates };
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

    return this.update(id, {
      status: newStatus,
      timeline: updatedTimeline,
      updatedAt: now
    });
  },

  async delete(id: string): Promise<boolean> {
    const rawId = String(id || "").trim();
    if (!rawId) return false;
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(rawId)}`, apiConfig);
    } catch (e) {
      console.warn("API Candidate delete error:", e);
    }

    const currentList = await this.getAll();
    const filtered = currentList.filter(c => c.id !== rawId && c.candidateId !== rawId && c.applicationId !== rawId);
    LocalStorageService.set("candidates", filtered);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return true;
  },

  async uploadResume(id: string, file: File): Promise<any> {
    const rawId = String(id || "").trim();
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(
      `${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(rawId)}/resume`,
      formData,
      {
        headers: {
          "X-Skip-Interceptor": "true",
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return res.data;
  },

  getResumeUrl(id: string): string {
    const rawId = String(id || "").trim();
    return `${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(rawId)}/resume`;
  },

  async getResumeText(id: string): Promise<{ candidateId: string; fileName: string; text: string }> {
    const rawId = String(id || "").trim();
    const res = await axios.get(
      `${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(rawId)}/resume/text`,
      apiConfig
    );
    return res.data;
  },

  async deleteResume(id: string): Promise<any> {
    const rawId = String(id || "").trim();
    const res = await axios.delete(
      `${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(rawId)}/resume`,
      apiConfig
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return res.data;
  }
};
