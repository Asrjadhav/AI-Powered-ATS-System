/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { generateId, formatJobId } from "./repositoryUtils";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export interface ApplicationRecord {
  id?: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  appliedRole?: string;
  department?: string;
  status: string;
  // "Open", or "On Hold" while the job is closed/draft (set by the backend).
  applicationState: string;
  source: string;
  atsScore: number;
  aiEvaluation?: any;
  createdDate?: string;
  createdAt: string;
  updatedAt: string;
  candidateEmail?: string;
  candidateName?: string;
}

function mapApplication(item: any): ApplicationRecord {
  return {
    id: item.id,
    applicationId: item.applicationId || item.id || generateId("app"),
    candidateId: item.candidateId || item.candidate?.id || "",
    // An application whose job was deleted has no jobId; keep it empty rather than
    // attributing it to a different job.
    jobId: formatJobId(item.jobId || item.job?.id),
    appliedRole: item.appliedRole || item.jobTitle || item.job?.title || "Applicant Role",
    department: item.department || item.job?.department || "General",
    status: item.status || "New",
    applicationState: item.applicationState || "Open",
    source: item.source || "Career Website",
    atsScore: item.atsScore ?? item.aiEvaluation?.score ?? 75,
    aiEvaluation: item.aiEvaluation,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    candidateEmail: item.candidateEmail,
    candidateName: item.candidateName
  };
}

export const ApplicationRepository = {
  async getAllApplications(): Promise<ApplicationRecord[]> {
    const res = await axios.get(`${FASTAPI_BASE_URL}/api/applications`, apiConfig);
    return Array.isArray(res.data) ? res.data.map(mapApplication) : [];
  },

  async getAll(): Promise<ApplicationRecord[]> {
    return this.getAllApplications();
  },

  async getApplication(applicationId: string): Promise<ApplicationRecord | null> {
    const list = await this.getAllApplications();
    return list.find(a => a.applicationId === applicationId || a.id === applicationId) || null;
  },

  async getById(applicationId: string): Promise<ApplicationRecord | null> {
    return this.getApplication(applicationId);
  },

  async getApplicationsByCandidateId(candidateIdentifier: string): Promise<ApplicationRecord[]> {
    if (!candidateIdentifier) return [];
    const res = await axios.get(
      `${FASTAPI_BASE_URL}/api/applications?candidateId=${encodeURIComponent(candidateIdentifier)}`,
      apiConfig
    );
    return Array.isArray(res.data) ? res.data.map(mapApplication) : [];
  },

  async createApplication(data: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    const res = await axios.post(`${FASTAPI_BASE_URL}/api/applications`, data, apiConfig);
    const formatted = mapApplication(res.data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
    }
    return formatted;
  },

  async create(data: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    return this.createApplication(data);
  },

  /**
   * Updates an application's pipeline status.
   *
   * `id` may be an application id or a candidate id — the backend resolves
   * either (services/application_service.get_application_by_id_or_app_id),
   * so there is no separate "by candidate or app id" path needed here.
   */
  async updateStatus(id: string, status: string, email?: string): Promise<any> {
    const rawId = String(id || "").trim();
    if (!rawId) throw new Error("Application identifier is required.");

    try {
      const res = await axios.patch(`${FASTAPI_BASE_URL}/api/applications/${encodeURIComponent(rawId)}/status`, { status, email }, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
        window.dispatchEvent(new CustomEvent("candidates-updated"));
      }
      return res.data;
    } catch (e: any) {
      // Fallback to PUT if PATCH fails
      const res = await axios.put(`${FASTAPI_BASE_URL}/api/applications/${encodeURIComponent(rawId)}`, { status }, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
        window.dispatchEvent(new CustomEvent("candidates-updated"));
      }
      return res.data;
    }
  },

  async updateApplication(applicationId: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    const res = await axios.put(`${FASTAPI_BASE_URL}/api/applications/${applicationId}`, updates, apiConfig);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
    }
    return mapApplication(res.data);
  },

  async update(applicationId: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    return this.updateApplication(applicationId, updates);
  },

  async deleteApplication(applicationId: string): Promise<boolean> {
    await axios.delete(`${FASTAPI_BASE_URL}/api/applications/${applicationId}`, apiConfig);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
    }
    return true;
  },

  async delete(applicationId: string): Promise<boolean> {
    return this.deleteApplication(applicationId);
  }
};
