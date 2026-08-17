/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export const JobRepository = {
  async getAll(): Promise<any[]> {
    const list = LocalStorageService.get<any[]>("jobs", []);
    const candidates = LocalStorageService.get<any[]>("candidates", []);
    return list.map(job => {
      let status = job.status;
      if (status === "published") status = "active";
      const count = candidates.filter((c: any) => 
        c.jobId === job.id || 
        c.appliedJobId === job.id || 
        (c.appliedRole && job.title && c.appliedRole.toLowerCase() === job.title.toLowerCase())
      ).length;
      return {
        ...job,
        status,
        candidateCount: count,
      };
    });
  },

  async getActiveCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(j => {
      const s = String(j.status || "").toLowerCase();
      return s === "published" || s === "active" || s === "open";
    }).length;
  },

  async getById(id: string): Promise<any | null> {
    const list = await this.getAll();
    return list.find(j => j.id === id) || null;
  },

  async create(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const newJob = {
      id: payload.id || generateId("job"),
      createdAt: payload.createdAt || now,
      updatedAt: now,
      createdBy: payload.createdBy || currentUser,
      status: payload.status || "published",
      title: payload.title || "Untitled Role",
      department: payload.department || "Engineering",
      location: payload.location || "Remote",
      ...payload,
    };

    list.unshift(newJob);
    LocalStorageService.set("jobs", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobs-updated"));
    }
    return newJob;
  },

  async update(id: string, updates: any): Promise<any> {
    const list = await this.getAll();
    const index = list.findIndex(j => j.id === id);
    if (index === -1) throw new Error("Job not found.");

    const updatedJob = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedJob;
    LocalStorageService.set("jobs", list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobs-updated"));
    }
    return updatedJob;
  },

  async updateStatus(id: string, newStatus: string): Promise<any> {
    return this.update(id, { status: newStatus });
  },

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter(j => j.id !== id);
    LocalStorageService.set("jobs", filtered);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobs-updated"));
    }
    return true;
  },

  async importParse(payload: { content?: string; fileData?: string; fileName?: string | null }): Promise<{ success: boolean; data: any[]; warning?: string }> {
    try {
      const response = await axios.post("/api/jobs/import", payload, {
        headers: { "X-Skip-Interceptor": "true" }
      });
      if (response.data && response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const aiParsedWithIds = response.data.data.map((job: any) => ({
          id: generateId("job"),
          status: "published",
          ...job,
        }));
        return { success: true, data: aiParsedWithIds };
      }
    } catch (err: any) {
      console.warn("Server Gemini AI job parser encountered issue, using structured fallback:", err?.message || err);
    }

    const rawText = payload.content || "";
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
    
    let currentSection: "about" | "responsibilities" | "requirements" | "preferred" | "benefits" = "about";
    const aboutLines: string[] = [];
    const respLines: string[] = [];
    const reqLines: string[] = [];
    const prefLines: string[] = [];
    const benefitLines: string[] = [];

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes("responsibility") || lower.includes("responsibilities") || lower.includes("what you'll do") || lower.includes("role overview")) {
        currentSection = "responsibilities";
      } else if (lower.includes("requirement") || lower.includes("requirements") || lower.includes("qualifications") || lower.includes("must have") || lower.includes("what you bring")) {
        currentSection = "requirements";
      } else if (lower.includes("preferred") || lower.includes("nice to have") || lower.includes("good to have") || lower.includes("bonus")) {
        currentSection = "preferred";
      } else if (lower.includes("benefit") || lower.includes("benefits") || lower.includes("perks") || lower.includes("what we offer")) {
        currentSection = "benefits";
      } else if (lower.includes("about the role") || lower.includes("about the job") || lower.includes("summary")) {
        currentSection = "about";
      } else {
        const cleanLine = line.replace(/^[\s\-*•\d.]+/, "").trim();
        if (cleanLine) {
          if (currentSection === "about") aboutLines.push(cleanLine);
          else if (currentSection === "responsibilities") respLines.push(cleanLine);
          else if (currentSection === "requirements") reqLines.push(cleanLine);
          else if (currentSection === "preferred") prefLines.push(cleanLine);
          else if (currentSection === "benefits") benefitLines.push(cleanLine);
        }
      }
    });

    const parsedJob = {
      id: generateId("job"),
      title: payload.fileName ? payload.fileName.replace(/\.[^/.]+$/, "") : (aboutLines[0] || "Parsed Job Position"),
      department: "Engineering",
      location: "Remote / Hybrid",
      type: "Full-time",
      workMode: "Remote",
      experienceLevel: "Mid-Senior Level",
      salaryRange: "Competitive",
      status: "published",
      description: aboutLines.join(" ") || rawText || "Parsed job specifications from content.",
      responsibilities: respLines.length > 0 ? respLines : ["Drive technical deliverables and collaborate with core product team."],
      requirements: {
        mustHave: reqLines.length > 0 ? reqLines : ["Relevant industry experience and domain expertise."],
        goodToHave: prefLines,
        softSkills: [],
        languages: []
      },
      preferredSkills: prefLines,
      benefits: benefitLines
    };

    return { success: true, data: [parsedJob] };
  },

  async importConfirm(jobs: any[]): Promise<any[]> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const imported = jobs.map(j => ({
      id: j.id || generateId("job"),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      ...j,
      status: (j.status === "published" ? "active" : j.status) || "active",
      title: j.title || "Imported Role",
      department: j.department || "Engineering",
      location: j.location || "Remote",
    }));

    const combined = [...imported, ...list];
    LocalStorageService.set("jobs", combined);
    return imported;
  }
};
