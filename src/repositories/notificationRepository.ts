/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || "http://localhost:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export const NotificationRepository = {
  async getAll(): Promise<any[]> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/notifications`, apiConfig);
      return response.data || [];
    } catch (err: any) {
      console.error("NotificationRepository.getAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to load notifications from FastAPI.");
    }
  },

  async getById(id: string): Promise<any | null> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/notifications/${encodeURIComponent(id)}`, apiConfig);
      return response.data || null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error("NotificationRepository.getById error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve notification details from server.");
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const response = await axios.post(`${FASTAPI_BASE_URL}/api/notifications`, payload, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
      }
      return response.data;
    } catch (err: any) {
      console.error("NotificationRepository.create error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to create notification.");
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      await axios.patch(`${FASTAPI_BASE_URL}/api/notifications/${encodeURIComponent(id)}/read`, {}, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
      }
      return true;
    } catch (err: any) {
      console.error("NotificationRepository.markAsRead error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to mark notification as read.");
    }
  },

  async markAllAsRead(): Promise<boolean> {
    try {
      await axios.patch(`${FASTAPI_BASE_URL}/api/notifications/read-all`, {}, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
      }
      return true;
    } catch (err: any) {
      console.error("NotificationRepository.markAllAsRead error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to mark all notifications as read.");
    }
  },

  async clearAll(): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/notifications`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
      }
      return true;
    } catch (err: any) {
      console.error("NotificationRepository.clearAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to clear notifications.");
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/notifications/${encodeURIComponent(id)}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
      }
      return true;
    } catch (err: any) {
      console.error("NotificationRepository.delete error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to delete notification.");
    }
  },

  async simulate(): Promise<any> {
    const alerts = [
      { title: "Smart Candidate Match", message: "A new Lead Android Developer matching 94% skills applied.", type: "ai_screening_completed" },
      { title: "Interview Feedback Pending", message: "Technical round completed. Feedback is pending.", type: "interview_reminder" },
      { title: "Offer Letter Generated", message: "Draft Offer Letter generated.", type: "offer_accepted" }
    ];
    const picked = alerts[Math.floor(Math.random() * alerts.length)];
    return this.create(picked);
  }
};
