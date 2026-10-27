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
 * A recurring report configuration, mirroring ReportScheduleResponse in
 * backend/schemas/report_schedule.py.
 *
 * Scope note: only the schedule itself is persisted. Nothing currently sends
 * a report on this cadence — there is no scheduler wired up yet — so
 * lastSent stays "Never" until that is built separately.
 */
export interface ReportSchedule {
  id: string;
  frequency: string;
  format: string;
  emails: string;
  department?: string;
  status?: string;
  lastSent?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

/**
 * ReportRepository
 *
 * Previously backed by localStorage under the key "report_schedules",
 * disconnected from the Reports screen's own localStorage key
 * ("ats_report_schedules"). Both now converge on this one API.
 */
export const ReportRepository = {
  async getSchedules(): Promise<ReportSchedule[]> {
    const res = await axios.get(`${FASTAPI_BASE_URL}/api/report-schedules`, apiConfig);
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Creates a schedule when it has no id yet, otherwise updates the
   * existing one — matching the previous upsert-style call sites.
   */
  async saveSchedule(schedule: Partial<ReportSchedule>): Promise<ReportSchedule> {
    if (schedule.id) {
      const res = await axios.put(
        `${FASTAPI_BASE_URL}/api/report-schedules/${encodeURIComponent(schedule.id)}`,
        schedule,
        apiConfig
      );
      return res.data;
    }
    const res = await axios.post(
      `${FASTAPI_BASE_URL}/api/report-schedules`,
      schedule,
      apiConfig
    );
    return res.data;
  },

  async deleteSchedule(id: string): Promise<boolean> {
    const res = await axios.delete(
      `${FASTAPI_BASE_URL}/api/report-schedules/${encodeURIComponent(id)}`,
      apiConfig
    );
    return Boolean(res.data?.success);
  },
};
