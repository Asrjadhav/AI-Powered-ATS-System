/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { formatJobId } from "./repositoryUtils";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || "http://localhost:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

const parseFeedbackObj = (fb: any, techScore?: any, commScore?: any) => {
  if (!fb && !techScore && !commScore) return null;
  if (typeof fb === "string" && fb.trim()) {
    try {
      const parsed = JSON.parse(fb);
      if (parsed && typeof parsed === "object") {
        return {
          technicalScore: parsed.technicalScore ?? (techScore || 8),
          communicationScore: parsed.communicationScore ?? (commScore || 8),
          problemSolvingScore: parsed.problemSolvingScore ?? 8,
          comments: parsed.comments ?? fb,
          recommendation: parsed.recommendation || "Hire"
        };
      }
    } catch (e) {
      return {
        technicalScore: techScore || 8,
        communicationScore: commScore || 8,
        problemSolvingScore: 8,
        comments: fb,
        recommendation: "Hire"
      };
    }
  }
  if (typeof fb === "object" && fb !== null) {
    return {
      technicalScore: fb.technicalScore ?? (techScore || 8),
      communicationScore: fb.communicationScore ?? (commScore || 8),
      problemSolvingScore: fb.problemSolvingScore ?? 8,
      comments: fb.comments || "",
      recommendation: fb.recommendation || "Hire"
    };
  }
  if (techScore || commScore) {
    return {
      technicalScore: techScore || 8,
      communicationScore: commScore || 8,
      problemSolvingScore: 8,
      comments: typeof fb === "string" ? fb : "",
      recommendation: "Hire"
    };
  }
  return null;
};

export const InterviewRepository = {
  async getAll(): Promise<any[]> {
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/interviews`, apiConfig);
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map((item: any) => ({
          ...item,
          jobId: formatJobId(item.jobId || "JOB-0001"),
          date: item.date || new Date().toISOString().split("T")[0],
          time: item.time || "14:00",
          status: item.status || "Scheduled",
          round: item.round || "Technical Interview",
          interviewer: item.interviewer || "Panel Evaluator",
          feedback: parseFeedbackObj(item.feedback, item.technicalScore, item.communicationScore)
        }));

        const seen = new Set<string>();
        return mapped.filter((item: any) => {
          const key = `${item.candidateId || item.applicationId}-${item.round}-${item.date}-${item.time}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return [];
    } catch (err: any) {
      console.error("InterviewRepository.getAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to load interviews from FastAPI.");
    }
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
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/interviews/${encodeURIComponent(id)}`, apiConfig);
      if (res.data) return res.data;
      return null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error("InterviewRepository.getById error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve interview details.");
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const schedulePayload = {
        candidateId: payload.candidateId || "",
        jobId: payload.jobId || "",
        applicationId: payload.applicationId || "",
        candidateName: payload.candidateName || "Candidate",
        candidateEmail: payload.candidateEmail || "",
        jobTitle: payload.jobTitle || "Job Position",
        round: payload.round || "Technical Round 1",
        date: payload.date || new Date().toISOString().split("T")[0],
        time: payload.time || "14:00",
        interviewer: payload.interviewer || "Panel Evaluator",
        status: payload.status || "Scheduled",
        meetingLink: payload.meetingLink || payload.platform || "Google Meet",
        notes: payload.notes || "",
        ...payload
      };

      const res = await axios.post(`${FASTAPI_BASE_URL}/api/interviews`, schedulePayload, apiConfig);

      // Trigger real-time Google Calendar API event creation on Node server
      try {
        await axios.post("/api/interviews", schedulePayload, { headers: { "X-Skip-Interceptor": "true" } });
      } catch (gcalErr) {
        console.warn("Real-time Google Calendar sync note:", gcalErr);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("interviews-updated"));
      }
      return res.data;
    } catch (err: any) {
      console.error("InterviewRepository.create error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to schedule interview.");
    }
  },

  async update(id: string, updates: any): Promise<any> {
    try {
      const res = await axios.put(`${FASTAPI_BASE_URL}/api/interviews/${encodeURIComponent(id)}`, updates, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("interviews-updated"));
      }
      return res.data;
    } catch (err: any) {
      console.error("InterviewRepository.update error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to update interview.");
    }
  },

  async cancel(id: string): Promise<any> {
    try {
      const res = await axios.patch(`${FASTAPI_BASE_URL}/api/interviews/${encodeURIComponent(id)}/cancel`, {}, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("interviews-updated"));
      }
      return res.data;
    } catch (err: any) {
      console.error("InterviewRepository.cancel error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to cancel interview.");
    }
  },

  async submitFeedback(id: string, payload: any): Promise<any> {
    try {
      const res = await axios.post(`${FASTAPI_BASE_URL}/api/interviews/${encodeURIComponent(id)}/feedback`, payload, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("interviews-updated"));
      }
      return res.data;
    } catch (err: any) {
      console.error("InterviewRepository.submitFeedback error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to submit interview feedback.");
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/interviews/${encodeURIComponent(id)}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("interviews-updated"));
      }
      return true;
    } catch (err: any) {
      console.error("InterviewRepository.delete error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to delete interview.");
    }
  }
};
