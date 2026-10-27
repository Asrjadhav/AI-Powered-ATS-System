/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";

const FASTAPI_BASE_URL =
  (import.meta as any).env?.VITE_FASTAPI_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://127.0.0.1:8000";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

/**
 * A team member (recruiter, HR, admin), mirroring UserResponse in
 * backend/schemas/user.py.
 *
 * This is the same "users" table /api/auth/login writes to on first sign-in.
 * A user created here can log in immediately; their first successful login
 * sets their password from whatever they enter.
 */
export interface User {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  department?: string;
  designation?: string;
  manager?: string;
  employeeId?: string;
  phone?: string;
  avatarUrl?: string;
  avatarColor?: string;
  status?: string;
  lastLogin?: string;
  changePasswordOnFirstLogin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * UserRepository
 *
 * Previously backed entirely by localStorage under the key "users",
 * disconnected from the Users & Roles screen's own localStorage key
 * ("ats_users") and from the "users" table /api/auth/login writes to. All
 * three now converge on this one API, backed by that same table.
 */
export const UserRepository = {
  async getAll(department?: string): Promise<User[]> {
    const res = await axios.get(`${FASTAPI_BASE_URL}/api/users`, {
      ...apiConfig,
      params: department && department !== "All Departments" ? { department } : undefined,
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getById(id: string): Promise<User | null> {
    try {
      const res = await axios.get(
        `${FASTAPI_BASE_URL}/api/users/${encodeURIComponent(id)}`,
        apiConfig
      );
      return res.data ?? null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Adds a team member. Throws with the server's detail message on failure,
   * including a 409 when the email is already in use.
   */
  async create(payload: Partial<User>): Promise<User> {
    const res = await axios.post(`${FASTAPI_BASE_URL}/api/users`, payload, apiConfig);
    return res.data;
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const res = await axios.patch(
      `${FASTAPI_BASE_URL}/api/users/${encodeURIComponent(id)}`,
      updates,
      apiConfig
    );
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    const res = await axios.delete(
      `${FASTAPI_BASE_URL}/api/users/${encodeURIComponent(id)}`,
      apiConfig
    );
    return Boolean(res.data?.success);
  },
};
