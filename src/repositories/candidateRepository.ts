/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { ApplicationRepository } from "./applicationRepository";
import {
  normalizePipelineStatus,
  assignSequentialCandidateIds
} from "./repositoryUtils";

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

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export const CandidateRepository = {
  async getAllCandidates(): Promise<any[]> {
    const res = await axios.get(`${FASTAPI_BASE_URL}/api/candidates`, apiConfig);
    const list = Array.isArray(res.data) ? res.data : [];
    return assignSequentialCandidateIds(list);
  },

  async getAll(): Promise<any[]> {
    return this.getAllCandidates();
  },

  // getMetrics/getTotal/getPendingEvaluationCount/getNewApplicationsCount/
  // getNewTodayCount/getAIShortlistedCount/getAverageAIScore/getFiltered
  // were removed here: all eight duplicated pipeline stage/scoring logic
  // that GET /api/stats and GET /api/insights already compute server-side
  // (backend/services/pipeline.py is the shared source of truth for both),
  // and none had any caller left in the app — the dashboard and insights
  // screens already moved to those endpoints. Kept them would have meant a
  // second, unreachable copy of that logic that could silently drift from
  // the backend's.

  async getById(id: string): Promise<any | null> {
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(id)}`, apiConfig);
      return res.data || null;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },

  async create(payload: any): Promise<any> {
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const status = normalizePipelineStatus(payload.status || "New");

    let firstName = payload.firstName;
    let lastName = payload.lastName;
    if (!firstName && payload.fullName) {
      const parts = String(payload.fullName).trim().split(/\s+/);
      firstName = parts[0] || "Applicant";
      lastName = parts.slice(1).join(" ") || "";
    }

    const newCandidatePayload = {
      firstName: firstName || "Applicant",
      lastName: lastName !== undefined ? lastName : "Candidate",
      email: payload.email || `candidate.${Date.now()}@example.com`,
      phone: payload.phone || "+91 9876543210",
      currentRole: payload.currentRole || "Not specified",
      currentCompany: payload.currentCompany || "Not specified",
      skills:
        payload.skills ||
        (payload.keySkills
          ? String(payload.keySkills)
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : []),
      experienceYears: payload.experienceYears || 0,
      resumeText: payload.resumeText || "",
      linkedinUrl: payload.linkedinUrl || payload.linkedinProfile || "",
      portfolioUrl: payload.portfolioUrl || payload.portfolioLink || "",
      source: payload.source || "Job Application Form",
      location: payload.location || payload.currentLocation || "Remote",
      expectedCTC: payload.expectedCTC || 0,
      currentCTC: payload.currentCTC || 0,
      hrNotes: payload.hrNotes || "",
      hrApprovalStatus: payload.hrApprovalStatus || "approved",
      experienceLevel: payload.experienceLevel || "Experienced",
      noticePeriod: payload.noticePeriod || "Immediate",
      // Job Application Google Form fields (experienced + fresher variants).
      // The backend candidate model/schema already has these columns — they
      // were simply never forwarded here, so the form data never reached the API.
      relocateToPune: payload.relocateToPune || "",
      // The candidate's own preference; empty when not chosen. The job's work mode is never sent from here.
      preferredWorkMode: payload.preferredWorkMode || "",
      keySkills: payload.keySkills || "",
      highestEducation: payload.highestEducation || "",
      specialization: payload.specialization || "",
      yearOfPassing: payload.yearOfPassing || "",
      totalExperience: payload.totalExperience || "",
      inHandSalary: payload.inHandSalary || "",
      projectsWorkedOn: payload.projectsWorkedOn || payload.projectsDescription || "",
      status,
      // No client-side scoring. A real number here means it came from an
      // actual AI evaluation (e.g. createApplication's /api/screen-resume
      // call, run after this). Anything else stays unset — null/no score is
      // honest; a plausible-looking fabricated number is not.
      aiScore: typeof payload.aiScore === "number" ? payload.aiScore : undefined,
      createdAt: payload.createdAt || now,
      updatedAt: now,
      createdBy: payload.createdBy || currentUser,
    };

    const targetJobId = payload.jobId || "JOB-0001";
    let savedCandidate: any;
    try {
      const res = await axios.post(`${FASTAPI_BASE_URL}/api/candidates?jobId=${encodeURIComponent(targetJobId)}`, newCandidatePayload, apiConfig);
      savedCandidate = res.data;
    } catch (e: any) {
      if (e?.response?.status === 409) {
        throw new Error(
          e.response.data?.detail || "This candidate has already submitted an application for this job position."
        );
      }
      throw new Error(e?.response?.data?.detail || e?.message || "Failed to create candidate.");
    }

    // Upload the CV alongside the new candidate. The file is sent as-is;
    // the browser never encodes or inspects it.
    if (payload.resumeFile instanceof File && savedCandidate && (savedCandidate.id || savedCandidate.candidateId)) {
      try {
        const uploadRes = await this.uploadResume(
          savedCandidate.id || savedCandidate.candidateId,
          payload.resumeFile
        );
        if (uploadRes) {
          savedCandidate = { ...savedCandidate, ...uploadRes };
        }
      } catch (uploadErr) {
        console.warn("Auto resume upload after candidate creation failed:", uploadErr);
      }
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
    let targetJobTitle = payload.jobTitle || payload.appliedJob || payload.job?.title;
    if (!targetJobTitle) {
      try {
        const { JobRepository } = await import("./jobRepository");
        const jobs = await JobRepository.getAll();
        const foundJob = jobs.find((j: any) => j.id === targetJobId || j.jobId === targetJobId);
        if (foundJob) targetJobTitle = foundJob.title;
      } catch (err) {
        console.warn("Could not resolve job title for application creation:", err);
      }
    }

    let applicationRecord: any = null;
    try {
      applicationRecord = await ApplicationRepository.createApplication({
        candidateId: candidate.candidateId || candidate.id,
        jobId: targetJobId,
        status: payload.status || "New",
        source: payload.source || "Job Application Form",
        // Real scoring happens a few lines below via /api/screen-resume.
        // No client-side fallback score — an application with no ats score
        // yet is "not screened yet", not a fabricated number.
        atsScore: typeof candidate.aiScore === "number" ? candidate.aiScore : undefined,
        appliedRole: targetJobTitle || payload.appliedRole || "Job Position",
        department: payload.department || "Engineering",
        candidateEmail: candidate.email,
        candidateName: `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
      });
    } catch (appErr) {
      console.warn("Application creation linking candidate failed:", appErr);
    }
    // 3. Automatically trigger AI screening upon application creation for accurate instant ATS match score
    const targetAppId = applicationRecord?.id || applicationRecord?.applicationId;
    if (targetAppId) {
      try {
        const screenRes = await axios.post(`${FASTAPI_BASE_URL}/api/screen-resume`, { applicationId: targetAppId }, apiConfig);
        if (screenRes.data && screenRes.data.evaluation) {
          const evalResult = screenRes.data.evaluation;
          applicationRecord = {
            ...applicationRecord,
            aiEvaluation: evalResult,
            atsScore: evalResult.score,
            // The stage the backend saved after screening (Shortlisted or Rejected); never a made-up one.
            status: screenRes.data.status || applicationRecord?.status
          };
          if (candidate) {
            candidate.aiScore = evalResult.score;
            candidate.aiEvaluation = evalResult;
            candidate.status = screenRes.data.status || candidate.status;
          }
        }
      } catch (screenErr) {
        console.warn("Auto AI screening upon application creation encountered warning:", screenErr);
      }
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
      status: applicationRecord?.status || payload.status || "New",
      aiEvaluation: applicationRecord?.aiEvaluation || candidate?.aiEvaluation,
      atsScore: applicationRecord?.atsScore || candidate?.aiScore
    };
  },

  async update(id: string, updates: any): Promise<any> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const res = await axios.put(`${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(id)}`, payload, apiConfig);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return res.data;
  },

  // updateStatus was removed here: its only caller was
  // CandidateWorkflowService.updateCandidateStatus in the now-deleted
  // src/services/workflowService.ts, which also auto-created interview and
  // offer records with fabricated data ("$120,000" salary, "Hiring Manager"
  // as interviewer, a fake "calendarSynced: true"). Status changes now go
  // through ApplicationRepository.updateStatus and CandidateRepository.update
  // directly, without inventing records on the side.

  async delete(id: string): Promise<boolean> {
    const rawId = String(id || "").trim();
    if (!rawId) return false;

    await axios.delete(`${FASTAPI_BASE_URL}/api/candidates/${encodeURIComponent(rawId)}`, apiConfig);

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
