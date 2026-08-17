/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export interface ApplicationRecord {
  applicationId: string;
  candidateId: string;
  jobId: string;
  status: string;
  source: string;
  atsScore: number;
  createdDate?: string;
  createdAt: string;
  updatedAt: string;
  candidateEmail?: string;
  candidateName?: string;
}

export const ApplicationRepository = {
  async getAllApplications(): Promise<ApplicationRecord[]> {
    try {
      const res = await axios.get("/api/applications", { headers: { "X-Skip-Interceptor": "true" } });
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((item: any) => ({
          applicationId: item.applicationId || item.id || generateId("app"),
          candidateId: item.candidateId || item.candidate?.id || "",
          jobId: item.jobId || item.job?.id || "",
          status: item.status || "Applied",
          source: item.source || "Career Website",
          atsScore: item.atsScore ?? item.aiEvaluation?.score ?? 75,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        }));
      }
    } catch (e) {
      // Fallback to local storage
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
    return list.find(a => a.applicationId === applicationId || a.candidateId === applicationId) || null;
  },

  async getById(applicationId: string): Promise<ApplicationRecord | null> {
    return this.getApplication(applicationId);
  },

  async getApplicationsByCandidateId(candidateId: string): Promise<ApplicationRecord[]> {
    const list = await this.getAllApplications();
    const cleanCandId = String(candidateId || "").replace(/^app-/, "").toLowerCase();
    return list.filter(a => {
      const aCandId = String(a.candidateId || "").replace(/^app-/, "").toLowerCase();
      return aCandId === cleanCandId;
    });
  },

  async createApplication(data: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    const list = await this.getAllApplications();
    const now = new Date().toISOString();
    const newApp: ApplicationRecord = {
      applicationId: data.applicationId || generateId("app"),
      candidateId: data.candidateId || "",
      jobId: data.jobId || "",
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
    try {
      await axios.post("/api/applications", newApp);
    } catch (e) {
      // Ignored if offline
    }
    return newApp;
  },

  async create(data: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    return this.createApplication(data);
  },

  async updateStatus(id: string, status: string, email?: string): Promise<any> {
    const cleanId = String(id || "").replace(/^app-/, "").trim();
    const res = await axios.patch(`/api/applications/${cleanId}/status`, {
      status,
      email
    }, { headers: { "X-Skip-Interceptor": "true" } });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("applications-updated"));
      window.dispatchEvent(new CustomEvent("candidates-updated"));
    }
    return res.data;
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
    } else {
      const newApp: ApplicationRecord = {
        applicationId: `app-${cleanId}`,
        candidateId: id,
        jobId: "j1",
        status,
        source: "Career Website",
        atsScore: 85,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.unshift(newApp);
      LocalStorageService.set("applications_db", list);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("applications-updated"));
      }
    }
  },

  async updateApplication(applicationId: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    const list = await this.getAllApplications();
    const index = list.findIndex(a => a.applicationId === applicationId);
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
    const list = await this.getAllApplications();
    const filtered = list.filter(a => a.applicationId !== applicationId);
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
