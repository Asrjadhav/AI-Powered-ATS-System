/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export const EmailRepository = {
  async getAll(): Promise<any[]> {
    return LocalStorageService.get<any[]>("emails", []);
  },

  async send(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const newEmail = {
      id: generateId("em"),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      status: "sent",
      to: payload.to || "",
      subject: payload.subject || "No Subject",
      body: payload.body || payload.message || "",
      sentAt: now,
      ...payload
    };

    list.unshift(newEmail);
    LocalStorageService.set("emails", list);
    return newEmail;
  }
};
