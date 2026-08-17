/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export const UserRepository = {
  async getAll(): Promise<any[]> {
    return LocalStorageService.get<any[]>("users", []);
  },

  async create(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();

    const newUser = {
      id: payload.id || generateId("usr"),
      createdAt: now,
      updatedAt: now,
      createdBy: "admin",
      status: payload.status || "Active",
      name: payload.name || "New Team Member",
      email: payload.email || "",
      phone: payload.phone || "",
      employeeId: payload.employeeId || generateId("ENC"),
      department: payload.department || "Talent Acquisition",
      designation: payload.designation || "Recruiter",
      role: payload.role || "Recruiter",
      manager: payload.manager || "HR Manager",
      avatarColor: payload.avatarColor || "bg-indigo-600 text-white",
      createdOn: new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' }),
      lastLogin: "Never",
      ...payload
    };

    list.push(newUser);
    LocalStorageService.set("users", list);
    return newUser;
  },

  async update(id: string, updates: any): Promise<any> {
    const list = await this.getAll();
    const index = list.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found.");

    const updated = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    LocalStorageService.set("users", list);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter(u => u.id !== id);
    LocalStorageService.set("users", filtered);
    return true;
  }
};
