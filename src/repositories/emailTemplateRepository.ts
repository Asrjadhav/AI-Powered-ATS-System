/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export const EmailTemplateRepository = {
  async getAll(): Promise<any[]> {
    try {
      const res = await axios.get("/api/templates", { headers: { "X-Skip-Interceptor": "true" } });
      if (Array.isArray(res.data) && res.data.length > 0) {
        LocalStorageService.set("templates", res.data);
        return res.data;
      }
    } catch (e) {
      console.error("Error fetching templates from API, falling back to local storage:", e);
    }
    const list = LocalStorageService.get<any[]>("templates", []);
    return list || [];
  },

  async createOrUpdate(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const existingIndex = payload.id ? list.findIndex(t => t.id === payload.id) : -1;
    let result: any;

    if (existingIndex !== -1) {
      result = {
        ...list[existingIndex],
        ...payload,
        updatedAt: now
      };
      list[existingIndex] = result;
    } else {
      result = {
        id: payload.id || generateId("temp"),
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser,
        status: payload.status || "Active",
        ...payload
      };
      list.push(result);
    }

    LocalStorageService.set("templates", list);

    try {
      await axios.post("/api/templates", result, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      console.error("Failed to sync template to backend:", e);
    }

    return result;
  },

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter(t => t.id !== id);
    LocalStorageService.set("templates", filtered);

    try {
      await axios.delete(`/api/templates/${id}`, { headers: { "X-Skip-Interceptor": "true" } });
    } catch (e) {
      console.error("Failed to delete template on backend:", e);
    }

    return true;
  }
};

export const TemplateRepository = EmailTemplateRepository;
