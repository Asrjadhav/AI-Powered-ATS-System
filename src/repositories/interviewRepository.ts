/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { CandidateRepository } from "./candidateRepository";
import { ApplicationRepository } from "./applicationRepository";
import {
  generateId,
  cleanDuplicateRecords
} from "./repositoryUtils";

export const InterviewRepository = {
  async getAll(): Promise<any[]> {
    const candidates = await CandidateRepository.getAll();
    if (!candidates || candidates.length === 0) {
      return [];
    }
    const applications = await ApplicationRepository.getAll();

    let rawInterviews: any[] = [];
    try {
      const res = await axios.get("/api/interviews", { headers: { "X-Skip-Interceptor": "true" } });
      if (res.data && Array.isArray(res.data)) {
        rawInterviews = res.data;
      }
    } catch (e) {
      rawInterviews = LocalStorageService.get<any[]>("interviews", []);
    }

    const deduplicated = cleanDuplicateRecords(rawInterviews, 'interview');
    const validated = deduplicated.filter(item => {
      if (!item) return false;
      const appId = String(item.applicationId || "").replace(/^app-/, "").toLowerCase();
      const candId = String(item.candidateId || "").replace(/^app-/, "").toLowerCase();
      const iEmail = String(item.candidateEmail || "").toLowerCase();

      const foundCand = candidates.find(c => {
        const cId = String(c.candidateId || c.id || "").replace(/^app-/, "").toLowerCase();
        const cEmail = String(c.email || "").toLowerCase();
        return (candId && cId === candId) || (iEmail && cEmail === iEmail);
      });

      const foundApp = applications.find(a => {
        const aId = String(a.applicationId || "").replace(/^app-/, "").toLowerCase();
        const aCandId = String(a.candidateId || "").replace(/^app-/, "").toLowerCase();
        return (appId && aId === appId) || (candId && (aCandId === candId || aId === candId));
      });

      return !!(foundCand && foundApp);
    });

    const enriched = validated.map(item => {
      const candId = String(item.candidateId || "").replace(/^app-/, "").toLowerCase();
      const iEmail = String(item.candidateEmail || "").toLowerCase();
      const foundCand = candidates.find(c => {
        const cId = String(c.candidateId || c.id || "").replace(/^app-/, "").toLowerCase();
        const cEmail = String(c.email || "").toLowerCase();
        return (candId && cId === candId) || (iEmail && cEmail === iEmail);
      });
      if (foundCand) {
        const realName = foundCand.name || `${foundCand.firstName || ""} ${foundCand.lastName || ""}`.trim();
        const realJob = foundCand.appliedJob || foundCand.jobTitle || foundCand.currentRole;
        if (realName && (!item.candidateName || item.candidateName === "New Candidate" || item.candidateName === "Candidate")) {
          item.candidateName = realName;
        }
        if (realJob && (!item.jobTitle || item.jobTitle === "Open Position" || item.jobTitle === "Job Opening")) {
          item.jobTitle = realJob;
        }
      }
      return item;
    });

    LocalStorageService.set("interviews", enriched);
    return enriched;
  },

  async getTodayCount(): Promise<number> {
    const list = await this.getAll();
    const todayStr = new Date().toISOString().split("T")[0];
    return list.filter(i => {
      const isToday = i.date === todayStr;
      const st = String(i.status || "").toUpperCase();
      return isToday && (st === "UPCOMING" || st === "SCHEDULED" || st === "PENDING");
    }).length;
  },

  async getCompletedCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(i => String(i.status || "").toUpperCase() === "COMPLETED").length;
  },

  async getById(id: string): Promise<any | null> {
    const list = await this.getAll();
    return list.find(i => i.id === id) || null;
  },

  async create(payload: any): Promise<any> {
    const candidates = await CandidateRepository.getAll();
    if (!candidates || candidates.length === 0) {
      throw new Error("Cannot schedule interview: No candidates found.");
    }
    const candId = String(payload.candidateId || "").replace(/^app-/, "").toLowerCase();
    const foundCand = candidates.find(c => String(c.id || c.candidateId || "").replace(/^app-/, "").toLowerCase() === candId || (payload.candidateEmail && c.email?.toLowerCase() === payload.candidateEmail.toLowerCase()));
    if (!foundCand && candId) {
      throw new Error("Cannot schedule interview: Candidate does not exist.");
    }

    let created: any = null;
    try {
      const res = await axios.post("/api/interviews", payload, { headers: { "X-Skip-Interceptor": "true" } });
      if (res.data) {
        created = res.data;
      }
    } catch (e) {
      // Fallback local
    }

    const list = LocalStorageService.get<any[]>("interviews", []);
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const newInterview = created || {
      id: payload.id || generateId("int"),
      applicationId: payload.applicationId || "",
      candidateId: payload.candidateId || foundCand?.id || "",
      candidateName: payload.candidateName || foundCand?.name || "Candidate",
      candidateEmail: payload.candidateEmail || foundCand?.email || "",
      jobId: payload.jobId || "",
      jobTitle: payload.jobTitle || "Job Opening",
      round: payload.round || "Technical Interview",
      interviewer: payload.interviewer || "Panel Evaluator",
      date: payload.date || new Date().toISOString().split("T")[0],
      time: payload.time || "14:00",
      type: payload.type || "Online",
      platform: payload.platform || "Google Meet",
      location: payload.location || "",
      status: payload.status || "Upcoming",
      notes: payload.notes || "",
      meetingProvider: payload.platform || "Google Meet",
      meetingStatus: "Confirmed",
      calendarSynced: true,
      duration: 60,
      createdAt: payload.createdAt || now,
      updatedAt: now,
      createdBy: currentUser,
      ...payload,
    };

    list.unshift(newInterview);
    LocalStorageService.set("interviews", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("interviews-updated"));
    }
    return newInterview;
  },

  async update(id: string, updates: any): Promise<any> {
    try {
      await axios.patch(`/api/interviews/${id}`, updates, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }

    const list = await this.getAll();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Interview not found.");

    const updated = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    LocalStorageService.set("interviews", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("interviews-updated"));
    }
    return updated;
  },

  async cancel(id: string): Promise<any> {
    try {
      await axios.patch(`/api/interviews/${id}/cancel`, {}, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }
    return this.update(id, { status: "Cancelled" });
  },

  async submitFeedback(id: string, payload: any): Promise<any> {
    try {
      await axios.post(`/api/interviews/${id}/feedback`, payload, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }
    return this.update(id, {
      status: "COMPLETED",
      feedback: payload,
      score: payload.score || payload.technicalScore || 8
    });
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`/api/interviews/${id}`, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }
    const list = await this.getAll();
    const filtered = list.filter(i => i.id !== id);
    LocalStorageService.set("interviews", filtered);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("interviews-updated"));
    }
    return true;
  }
};
