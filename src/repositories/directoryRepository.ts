/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { DirectoryPerson } from "../types";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * People who can be picked as interviewer, CC or BCC. The list comes from the backend
 * (GET /api/directory/people), which will be fed by the Resource Hub (ERA) later (see changes.md).
 */
export const DirectoryRepository = {
  async getPeople(): Promise<DirectoryPerson[]> {
    try {
      const res = await axios.get(`${FASTAPI_BASE_URL}/api/directory/people`, {
        headers: { "X-Skip-Interceptor": "true" },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      console.error("DirectoryRepository.getPeople error:", err?.response?.data || err.message);
      throw new Error(err?.response?.data?.detail || "Failed to load the people list.");
    }
  },
};
