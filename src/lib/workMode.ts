/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Work Mode is the CANDIDATE's preferred way of working (saved on the candidate as preferredWorkMode).
// It is separate from the job's own work mode (Remote / Hybrid / On-site), which a candidate never changes.
// The same rules are enforced by the backend (backend/services/work_mode.py).

export const WORK_FROM_OFFICE = "Work from Office";
export const HYBRID = "Hybrid";
export const WORK_FROM_HOME = "Work from Home";
export const WORK_MODE_OPTIONS = [WORK_FROM_OFFICE, HYBRID, WORK_FROM_HOME];

/**
 * The work modes a candidate may choose for a job, from what the job offers:
 * Remote -> Work from Home, On-site -> Work from Office, and all three for a Hybrid job or a job that does not say.
 */
export function workModeOptionsForJob(jobWorkMode?: string | null): string[] {
  const configured = String(jobWorkMode || "").trim().toLowerCase();
  if (configured === "remote") return [WORK_FROM_HOME];
  if (configured === "on-site" || configured === "onsite" || configured === "on site") return [WORK_FROM_OFFICE];
  return [...WORK_MODE_OPTIONS];
}

/** The value to keep when the job (and so the options) changes: the same choice if still offered, one option if only one is, else none. */
export function workModeForJob(current: string, jobWorkMode?: string | null): string {
  const options = workModeOptionsForJob(jobWorkMode);
  if (current && options.includes(current)) return current;
  return options.length === 1 ? options[0] : "";
}
