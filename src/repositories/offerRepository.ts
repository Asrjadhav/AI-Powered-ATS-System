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

export const OfferRepository = {
  async getAll(): Promise<any[]> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/offers`, apiConfig);
      return response.data || [];
    } catch (err: any) {
      console.error("OfferRepository.getAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve offer records from server.");
    }
  },

  async getPendingCount(): Promise<number> {
    const list = await this.getAll();
    return list.filter(o => {
      const st = String(o.status || "").toLowerCase();
      return st === "pending" || st === "draft";
    }).length;
  },

  async getById(id: string): Promise<any | null> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/offers/${encodeURIComponent(id)}`, apiConfig);
      return response.data || null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error("OfferRepository.getById error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve offer details.");
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const response = await axios.post(`${FASTAPI_BASE_URL}/api/offers`, payload, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("offers-updated"));
        window.dispatchEvent(new CustomEvent("applications-updated"));
        window.dispatchEvent(new CustomEvent("candidates-updated"));
      }
      return response.data;
    } catch (err: any) {
      console.error("OfferRepository.create error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to create offer record.");
    }
  },

  async update(id: string, updates: any): Promise<any> {
    try {
      const response = await axios.patch(`${FASTAPI_BASE_URL}/api/offers/${encodeURIComponent(id)}`, updates, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("offers-updated"));
        window.dispatchEvent(new CustomEvent("applications-updated"));
        window.dispatchEvent(new CustomEvent("candidates-updated"));
      }
      return response.data;
    } catch (err: any) {
      console.error("OfferRepository.update error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to update offer record.");
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/offers/${encodeURIComponent(id)}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("offers-updated"));
        window.dispatchEvent(new CustomEvent("applications-updated"));
        window.dispatchEvent(new CustomEvent("candidates-updated"));
      }
      return true;
    } catch (err: any) {
      console.error("OfferRepository.delete error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to delete offer record.");
    }
  }
};
