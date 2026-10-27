/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { generateId, formatJobId, cleanJobTitle } from "./repositoryUtils";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

// Changing a job's status or deleting it also changes its applications (On Hold / Open /
// deleted) and the Talent Pool on the backend, so those screens refresh too.
const notifyJobLifecycleChange = () => {
  if (typeof window === "undefined") return;
  ["jobs-updated", "applications-updated", "candidates-updated", "talent-pool-updated"].forEach((name) =>
    window.dispatchEvent(new CustomEvent(name))
  );
};

export const JobRepository = {
  /** The distinct positions (job titles) in the jobs table, for the Applications page filter. */
  async getPositions(): Promise<{ title: string; jobIds: string[] }[]> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/jobs/positions`, apiConfig);
      return Array.isArray(response.data) ? response.data : [];
    } catch (err: any) {
      console.error("JobRepository.getPositions error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve job positions from server.");
    }
  },

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
      notifyJobLifecycleChange();
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
      notifyJobLifecycleChange();
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
      notifyJobLifecycleChange();
      return true;
    } catch (err: any) {
      console.error("JobRepository.delete error:", err?.response?.data || err.message);
      const detailMsg = err?.response?.data?.detail || err?.message || "Failed to delete job posting.";
      throw new Error(detailMsg);
    }
  },

  /**
   * Extracts job postings from an uploaded document or pasted text.
   *
   * The file is sent as multipart/form-data and read entirely by the backend
   * (PDF, DOCX, XLSX, CSV, TSV, TXT). There is deliberately no client-side
   * fallback parser: if extraction fails the error is surfaced, because a
   * guessed job posting is worse than an honest failure.
   */
  async importParse(payload: { file?: File | null; content?: string }): Promise<{
    success: boolean;
    data: any[];
    warning?: string | null;
    sourceFileName?: string | null;
    extractedCharacters?: number;
  }> {
    const formData = new FormData();
    if (payload.file) {
      formData.append("file", payload.file);
    }
    if (payload.content && payload.content.trim()) {
      formData.append("content", payload.content);
    }

    const res = await axios.post(`${FASTAPI_BASE_URL}/api/jobs/import`, formData, {
      headers: {
        "X-Skip-Interceptor": "true",
        "Content-Type": "multipart/form-data",
      },
    });

    const data = Array.isArray(res.data?.data) ? res.data.data : [];
    return {
      success: Boolean(res.data?.success),
      data: data.map((job: any) => ({
        id: generateId("job"),
        ...job,
        title: cleanJobTitle(job.title),
      })),
      warning: res.data?.warning ?? null,
      sourceFileName: res.data?.sourceFileName ?? null,
      extractedCharacters: res.data?.extractedCharacters ?? 0,
    };
  },

  /**
   * Saves reviewed job postings in one request.
   *
   * The backend writes them in a single transaction, so an import either
   * saves every posting or none. Previously this looped create() once per
   * job, which could leave a partial import behind on failure.
   */
  async importConfirm(jobs: any[]): Promise<any[]> {
    const res = await axios.post(
      `${FASTAPI_BASE_URL}/api/jobs/import/confirm`,
      { jobs },
      {
        headers: {
          "X-Skip-Interceptor": "true",
          "Content-Type": "application/json",
        },
      }
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobs-updated"));
    }
    return Array.isArray(res.data?.jobs) ? res.data.jobs : [];
  }
};
