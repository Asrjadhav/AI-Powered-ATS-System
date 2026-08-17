/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export const NotificationRepository = {
  async getAll(): Promise<any[]> {
    return LocalStorageService.get<any[]>("notifications", []);
  },

  async create(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();

    const newNotification = {
      id: payload.id || generateId("notif"),
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      status: "unread",
      title: payload.title || "New Notification",
      message: payload.message || "",
      type: payload.type || "info",
      read: false,
      timestamp: now,
      ...payload
    };

    list.unshift(newNotification);
    LocalStorageService.set("notifications", list);
    return newNotification;
  },

  async markAsRead(id: string): Promise<boolean> {
    const list = await this.getAll();
    const index = list.findIndex(n => n.id === id);
    if (index !== -1) {
      list[index].read = true;
      list[index].status = "read";
      list[index].updatedAt = new Date().toISOString();
      LocalStorageService.set("notifications", list);
      return true;
    }
    return false;
  },

  async markAllAsRead(): Promise<boolean> {
    const list = await this.getAll();
    const updated = list.map(n => ({ ...n, read: true, status: "read", updatedAt: new Date().toISOString() }));
    LocalStorageService.set("notifications", updated);
    return true;
  },

  async clearAll(): Promise<boolean> {
    LocalStorageService.set("notifications", []);
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter(n => n.id !== id);
    LocalStorageService.set("notifications", filtered);
    return true;
  },

  async simulate(): Promise<any> {
    const alerts = [
      { title: "Smart Candidate Match", message: "A new Lead Android Developer matching 94% skills applied.", type: "match" },
      { title: "Interview Feedback Pending", message: "Technical round completed. Feedback is pending.", type: "feedback" },
      { title: "Offer Letter Generated", message: "Draft Offer Letter generated.", type: "offer" }
    ];
    const picked = alerts[Math.floor(Math.random() * alerts.length)];
    return this.create(picked);
  }
};
