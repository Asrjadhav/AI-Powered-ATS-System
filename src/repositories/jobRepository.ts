/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { generateId, formatJobId } from "./repositoryUtils";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || "http://localhost:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export const JobRepository = {
  async getAll(): Promise<any[]> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/jobs`, apiConfig);
      return (response.data || []).map((job: any) => ({
        ...job,
        id: formatJobId(job.jobId || job.id),
        status: job.status === "published" ? "active" : job.status,
      }));
    } catch (err: any) {
      console.error("JobRepository.getAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve job openings from server.");
    }
  },

  async getActiveCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(j => {
      const s = String(j.status || "").toLowerCase();
      return s === "published" || s === "active" || s === "open";
    }).length;
  },

  async getById(id: string): Promise<any | null> {
    try {
      const targetId = formatJobId(id);
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/jobs/${encodeURIComponent(targetId)}`, apiConfig);
      if (response.data) {
        return {
          ...response.data,
          id: formatJobId(response.data.jobId || response.data.id),
          status: response.data.status === "published" ? "active" : response.data.status,
        };
      }
      return null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error("JobRepository.getById error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve job details.");
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const response = await axios.post(`${FASTAPI_BASE_URL}/api/jobs`, payload, apiConfig);
      const created = response.data;
      const formatted = {
        ...created,
        id: formatJobId(created.jobId || created.id),
        status: created.status === "published" ? "active" : created.status,
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("jobs-updated"));
      }
      return formatted;
    } catch (err: any) {
      console.error("JobRepository.create error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to create job posting.");
    }
  },

  async update(id: string, updates: any): Promise<any> {
    try {
      const targetId = formatJobId(id);
      const response = await axios.put(`${FASTAPI_BASE_URL}/api/jobs/${encodeURIComponent(targetId)}`, updates, apiConfig);
      const updated = response.data;
      const formatted = {
        ...updated,
        id: formatJobId(updated.jobId || updated.id),
        status: updated.status === "published" ? "active" : updated.status,
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("jobs-updated"));
      }
      return formatted;
    } catch (err: any) {
      console.error("JobRepository.update error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to update job details.");
    }
  },

  async updateStatus(id: string, newStatus: string): Promise<any> {
    try {
      const targetId = formatJobId(id);
      const response = await axios.patch(
        `${FASTAPI_BASE_URL}/api/jobs/${encodeURIComponent(targetId)}/status`,
        { status: newStatus },
        apiConfig
      );
      const updated = response.data;
      const formatted = {
        ...updated,
        id: formatJobId(updated.jobId || updated.id),
        status: updated.status === "published" ? "active" : updated.status,
      };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("jobs-updated"));
      }
      return formatted;
    } catch (err: any) {
      console.error("JobRepository.updateStatus error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to update job status.");
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const targetId = formatJobId(id);
      await axios.delete(`${FASTAPI_BASE_URL}/api/jobs/${encodeURIComponent(targetId)}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("jobs-updated"));
      }
      return true;
    } catch (err: any) {
      console.error("JobRepository.delete error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to delete job posting.");
    }
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
    const createdList: any[] = [];
    for (const job of jobs) {
      const created = await this.create(job);
      createdList.push(created);
    }
    return createdList;
  }
};
