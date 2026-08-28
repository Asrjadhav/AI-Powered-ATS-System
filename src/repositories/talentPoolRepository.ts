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

export const TalentPoolRepository = {
  async getTotal(): Promise<number> {
    const list = await this.getAll();
    return list.length;
  },

  async getAll(): Promise<any[]> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/talent-pool`, apiConfig);
      return response.data || [];
    } catch (err: any) {
      console.error("TalentPoolRepository.getAll error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve talent pool candidates from server.");
    }
  },

  async getById(id: string): Promise<any | null> {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/api/talent-pool/${encodeURIComponent(id)}`, apiConfig);
      return response.data || null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error("TalentPoolRepository.getById error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to retrieve talent pool candidate details.");
    }
  },

  async create(payload: any): Promise<any> {
    try {
      const response = await axios.post(`${FASTAPI_BASE_URL}/api/talent-pool`, payload, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("talent-pool-updated"));
        window.dispatchEvent(new CustomEvent("candidates-updated"));
      }
      return response.data;
    } catch (err: any) {
      console.error("TalentPoolRepository.create error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to add candidate to talent pool.");
    }
  },

  async update(id: string, updates: any): Promise<any> {
    try {
      const response = await axios.patch(`${FASTAPI_BASE_URL}/api/talent-pool/${encodeURIComponent(id)}`, updates, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("talent-pool-updated"));
      }
      return response.data;
    } catch (err: any) {
      console.error("TalentPoolRepository.update error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to update talent pool candidate.");
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await axios.delete(`${FASTAPI_BASE_URL}/api/talent-pool/${encodeURIComponent(id)}`, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("talent-pool-updated"));
      }
      return true;
    } catch (err: any) {
      console.error("TalentPoolRepository.delete error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to remove candidate from talent pool.");
    }
  },

  async deleteMultiple(ids: string[]): Promise<boolean> {
    try {
      await axios.post(`${FASTAPI_BASE_URL}/api/talent-pool/bulk-delete`, { ids }, apiConfig);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("talent-pool-updated"));
      }
      return true;
    } catch (err: any) {
      console.error("TalentPoolRepository.deleteMultiple error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to bulk remove candidates from talent pool.");
    }
  }
};
