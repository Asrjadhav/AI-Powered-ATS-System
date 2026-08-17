/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { CandidateRepository } from "./candidateRepository";
import { ApplicationRepository } from "./applicationRepository";
import { generateId, cleanDuplicateRecords } from "./repositoryUtils";
import { isOfferedStage, isHiredStage } from "../utils/pipelineUtils";

export const OfferRepository = {
  async getAll(): Promise<any[]> {
    const candidates = await CandidateRepository.getAll();
    if (!candidates || candidates.length === 0) {
      return [];
    }

    let rawOffers: any[] = [];
    try {
      const res = await axios.get("/api/offers", { headers: { "X-Skip-Interceptor": "true" } });
      if (res.data && Array.isArray(res.data)) {
        rawOffers = res.data;
      }
    } catch (e) {
      rawOffers = LocalStorageService.get<any[]>("offers", []);
    }

    const deduplicated = cleanDuplicateRecords(rawOffers, 'offer');
    const now = new Date().toISOString();
    const resultOffers: any[] = [];

    // Filter candidates who are actually in offered or hired stage
    for (const c of candidates) {
      if (!c) continue;
      if (isOfferedStage(c) || isHiredStage(c)) {
        const cId = String(c.candidateId || c.id || "");
        const cEmail = String(c.email || "").toLowerCase();
        const cleanCId = cId.replace(/^app-/, "").toLowerCase();

        // Check if an existing offer matches this candidate
        const existingOffer = deduplicated.find(o => {
          if (!o) return false;
          const oCandId = String(o.candidateId || "").replace(/^app-/, "").toLowerCase();
          const oEmail = String(o.candidateEmail || o.email || "").toLowerCase();
          return (cleanCId && oCandId === cleanCId) || (cEmail && oEmail === cEmail);
        });

        if (existingOffer) {
          resultOffers.push({
            ...existingOffer,
            candidateName: c.name || existingOffer.candidateName,
            candidateEmail: c.email || existingOffer.candidateEmail,
            jobTitle: c.appliedJob || c.jobTitle || c.role || existingOffer.jobTitle,
            salary: c.expectedCTC || c.currentCTC || existingOffer.salary || "$120,000",
            offeredSalary: c.expectedCTC || c.currentCTC || existingOffer.offeredSalary || "$120,000",
            status: isHiredStage(c) ? "Accepted" : (existingOffer.status || "Pending")
          });
        } else {
          // Create offer for this candidate dynamically from their actual record
          const newOffer = {
            id: `OFF-2026-${cleanCId}`,
            candidateId: cId,
            applicationId: c.applicationId || `app-${cleanCId}`,
            candidateName: c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Candidate",
            candidateEmail: c.email || "candidate@email.com",
            jobTitle: c.appliedJob || c.jobTitle || c.role || "Software Engineer",
            department: c.department || "Engineering",
            recruiter: "Hiring Manager",
            location: c.location || "Remote",
            offerDate: c.updatedAt?.split("T")[0] || now.split("T")[0],
            joiningDate: new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0],
            status: isHiredStage(c) ? "Accepted" : "Pending",
            salary: c.expectedCTC || c.currentCTC || "$120,000",
            offeredSalary: c.expectedCTC || c.currentCTC || "$120,000",
            timeline: {
              generated: (c.updatedAt || now).split("T")[0] + " 10:00 AM",
              sent: null,
              viewed: null,
              responded: null,
              joined: null
            },
            createdAt: now,
            updatedAt: now
          };
          resultOffers.push(newOffer);
        }
      }
    }

    LocalStorageService.set("offers", resultOffers);
    return resultOffers;
  },

  async getPendingCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(o => {
      const st = String(o.status || "").toLowerCase();
      return st === "pending" || st === "draft";
    }).length;
  },

  async getById(id: string): Promise<any | null> {
    const list = await this.getAll();
    return list.find(o => o.id === id) || null;
  },

  async create(payload: any): Promise<any> {
    const candidates = await CandidateRepository.getAll();
    if (!candidates || candidates.length === 0) {
      throw new Error("Cannot create offer: No candidates found.");
    }
    const candId = String(payload.candidateId || "").replace(/^app-/, "").toLowerCase();
    const foundCand = candidates.find(c => String(c.id || c.candidateId || "").replace(/^app-/, "").toLowerCase() === candId || (payload.candidateEmail && c.email?.toLowerCase() === payload.candidateEmail.toLowerCase()));
    if (!foundCand && candId) {
      throw new Error("Cannot create offer: Candidate does not exist.");
    }

    try {
      await axios.post("/api/offers", payload, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }

    const list = LocalStorageService.get<any[]>("offers", []);
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const newOffer = {
      id: payload.id || generateId("off"),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      status: payload.status || "Draft",
      candidateId: payload.candidateId || foundCand?.id || "",
      candidateName: payload.candidateName || foundCand?.name || "Candidate",
      candidateEmail: payload.candidateEmail || foundCand?.email || "",
      ...payload
    };

    list.unshift(newOffer);
    LocalStorageService.set("offers", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offers-updated"));
    }
    return newOffer;
  },

  async update(id: string, updates: any): Promise<any> {
    try {
      await axios.patch(`/api/offers/${id}`, updates, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }

    const list = await this.getAll();
    const index = list.findIndex(o => o.id === id);
    if (index === -1) throw new Error("Offer not found.");

    const updated = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    LocalStorageService.set("offers", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offers-updated"));
    }
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`/api/offers/${id}`, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      // Fallback local
    }
    const list = await this.getAll();
    const filtered = list.filter(o => o.id !== id);
    LocalStorageService.set("offers", filtered);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offers-updated"));
    }
    return true;
  }
};
