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

export const EmailTemplateRepository = {
  async getAll(): Promise<any[]> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/templates`, apiConfig);
      return response.data || [];
    } catch (err: any) {
      console.error("EmailTemplateRepository.getAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to load email templates from FastAPI.");
    }
  },

  async getById(id: string): Promise<any | null> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/templates/${encodeURIComponent(id)}`, apiConfig);
      return response.data || null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error("EmailTemplateRepository.getById error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve template details from server.");
    }
  },

  async createOrUpdate(payload: any): Promise<any> {
    try {
      if (payload.id) {
        const response = await axios.patch(`${FASTAPI_BASE_URL}/api/templates/${encodeURIComponent(payload.id)}`, payload, apiConfig);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("templates-updated"));
        }
        return response.data;
      } else {
        const response = await axios.post(`${FASTAPI_BASE_URL}/api/templates`, payload, apiConfig);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("templates-updated"));
        }
        return response.data;
      }
    } catch (err: any) {
      console.error("EmailTemplateRepository.createOrUpdate error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to save email template.");
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/templates/${encodeURIComponent(id)}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("templates-updated"));
      }
      return true;
    } catch (err: any) {
      console.error("EmailTemplateRepository.delete error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to delete email template.");
    }
  }
};

export const TemplateRepository = EmailTemplateRepository;
