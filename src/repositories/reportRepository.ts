/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";

export const ReportRepository = {
  async getSchedules(): Promise<any[]> {
    return LocalStorageService.get<any[]>("report_schedules", []);
  },

  async saveSchedule(schedule: any): Promise<any> {
    const list = await this.getSchedules();
    const now = new Date().toISOString();

    const existingIndex = list.findIndex(s => s.id === schedule.id);
    let result: any;

    if (existingIndex !== -1) {
      result = {
        ...list[existingIndex],
        ...schedule,
        updatedAt: now
      };
      list[existingIndex] = result;
    } else {
      result = {
        id: schedule.id || generateId("rep-sch"),
        createdAt: now,
        updatedAt: now,
        createdBy: LocalStorageService.getCurrentUserEmail(),
        status: "Active",
        lastSent: "Never",
        ...schedule
      };
      list.push(result);
    }

    LocalStorageService.set("report_schedules", list);
    return result;
  },

  async deleteSchedule(id: string): Promise<boolean> {
    const list = await this.getSchedules();
    const filtered = list.filter(s => s.id !== id);
    LocalStorageService.set("report_schedules", filtered);
    return true;
  }
};
