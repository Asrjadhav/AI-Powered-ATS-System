/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { generateId, formatJobId } from "./repositoryUtils";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "https://ats-fastapi-backend.onrender.com";

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
  source: string;
  atsScore: number;
  aiEvaluation?: any;
  createdDate?: string;
  createdAt: string;
  updatedAt: string;
  candidateEmail?: string;
  candidateName?: string;
}

export const ApplicationRepository = {
  async getAllApplications(): Promise<ApplicationRecord[]> {
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/applications`, apiConfig);
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((item: any) => ({
          id: item.id,
          applicationId: item.applicationId || item.id || generateId("app"),
          candidateId: item.candidateId || item.candidate?.id || "",
          jobId: formatJobId(item.jobId || item.job?.id || "JOB-0001"),
          appliedRole: item.appliedRole || item.jobTitle || item.job?.title || "Applicant Role",
          department: item.department || item.job?.department || "General",
          status: item.status || "Applied",
          source: item.source || "Career Website",
          atsScore: item.atsScore ?? item.aiEvaluation?.score ?? 75,
          aiEvaluation: item.aiEvaluation,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          candidateEmail: item.candidateEmail,
          candidateName: item.candidateName
        }));
      }
    } catch (e) {
      console.warn("ApplicationRepository.getAllApplications API fetch failed, falling back to local storage:", e);
    }
    const local = LocalStorageService.get<ApplicationRecord[]>("applications_db", []);
    if (local && local.length > 0) return local;

    return [];
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
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/applications?candidateId=${encodeURIComponent(candidateIdentifier)}`, apiConfig);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((item: any) => ({
          id: item.id,
          applicationId: item.applicationId || item.id || generateId("app"),
          candidateId: item.candidateId || candidateIdentifier,
          jobId: formatJobId(item.jobId || item.job?.id || "JOB-0001"),
          appliedRole: item.appliedRole || item.jobTitle || item.job?.title || "Applicant Role",
          department: item.department || item.job?.department || "General",
          status: item.status || "Applied",
          source: item.source || "Career Website",
          atsScore: item.atsScore ?? item.aiEvaluation?.score ?? 75,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          candidateEmail: item.candidateEmail,
          candidateName: item.candidateName
        }));
      }
    } catch (e) {
      // Fall through to local list filter
    }

    const list = await this.getAllApplications();
    const cleanCandId = String(candidateIdentifier || "").replace(/^app-/, "").trim().toLowerCase();
    return list.filter(a => {
      const aCandId = String(a.candidateId || "").replace(/^app-/, "").trim().toLowerCase();
      const aEmail = String(a.candidateEmail || "").trim().toLowerCase();
      return aCandId === cleanCandId || aEmail === cleanCandId;
    });
  },

  async createApplication(data: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    try {
      const res = await axios.post(`${FASTAPI_BASE_URL}/api/applications`, data, apiConfig);
      const created = res.data;
      const formatted: ApplicationRecord = {
        id: created.id,
        applicationId: created.applicationId || created.id,
        candidateId: created.candidateId,
        jobId: formatJobId(created.jobId),
        appliedRole: created.appliedRole || data.appliedRole || "Applicant Role",
        department: created.department || data.department || "General",
        status: created.status || "Applied",
        source: created.source || "Career Portal",
        atsScore: created.atsScore ?? 75,
        createdAt: created.createdAt || new Date().toISOString(),
        updatedAt: created.updatedAt || new Date().toISOString(),
        candidateEmail: created.candidateEmail,
        candidateName: created.candidateName
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
      }
      return formatted;
    } catch (e) {
      console.warn("FastAPI application creation failed, saving locally:", e);
    }

    const list = await this.getAllApplications();
    const now = new Date().toISOString();
    const newApp: ApplicationRecord = {
      applicationId: data.applicationId || generateId("app"),
      candidateId: data.candidateId || "",
      jobId: formatJobId(data.jobId || "JOB-0001"),
      appliedRole: data.appliedRole || "Applicant Role",
      department: data.department || "General",
      status: data.status || "Applied",
      source: data.source || "Career Website",
      atsScore: data.atsScore ?? 75,
      createdAt: data.createdAt || now,
      updatedAt: now,
      ...data
    };
    list.unshift(newApp);
    LocalStorageService.set("applications_db", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
    }
    return newApp;
  },

  async create(data: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    return this.createApplication(data);
  },

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

  async updateStatusByCandidateOrAppId(id: string, status: string): Promise<void> {
    const list = await this.getAllApplications();
    const cleanId = String(id || "").replace(/^app-/, "").toLowerCase();
    let updated = false;
    const newList = list.map(a => {
      const aCandId = String(a.candidateId || "").replace(/^app-/, "").toLowerCase();
      const aAppId = String(a.applicationId || "").replace(/^app-/, "").toLowerCase();
      if (aCandId === cleanId || aAppId === cleanId || a.applicationId === id || a.candidateId === id) {
        updated = true;
        return {
          ...a,
          status,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    });

    if (updated) {
      LocalStorageService.set("applications_db", newList);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
      }
    }
  },

  async updateApplication(applicationId: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    try {
      const res = await axios.put(`${FASTAPI_BASE_URL}/api/applications/${applicationId}`, updates, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
      }
      return res.data;
    } catch (e) {
      // Fallback
    }

    const list = await this.getAllApplications();
    const index = list.findIndex(a => a.applicationId === applicationId || a.id === applicationId);
    if (index === -1) throw new Error("Application not found.");

    const updated = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    list[index] = updated;
    LocalStorageService.set("applications_db", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
    }
    return updated;
  },

  async update(applicationId: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    return this.updateApplication(applicationId, updates);
  },

  async deleteApplication(applicationId: string): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/applications/${applicationId}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
      }
      return true;
    } catch (e) {
      // Fallback
    }

    const list = await this.getAllApplications();
    const filtered = list.filter(a => a.applicationId !== applicationId && a.id !== applicationId);
    LocalStorageService.set("applications_db", filtered);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
    }
    return true;
  },

  async delete(applicationId: string): Promise<boolean> {
    return this.deleteApplication(applicationId);
  }
};
