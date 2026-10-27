/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: string;
}

export const generateId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

export function cleanJobTitle(title?: string | null): string {
  if (!title) return "Position";
  let str = String(title).trim();
  // Strip prefixes like "Job:", "Job Title:", "Role:", "Position:", "Job Opening:", "Vacancy:" at beginning of title
  str = str.replace(/^(?:job\s*title|job\s*opening|job\s*position|job|role\s*title|role|position|vacancy)\s*:\s*/i, "").trim();
  return str || "Position";
}

/**
 * Display format for an Indian mobile number: "+91 98765 43210".
 * Accepts the usual ways it gets typed: "9876543210", "09876543210", "+91 98765 43210",
 * "91-9876543210", "0091 98765 43210". Returns null when the value cannot be read as a
 * 10-digit mobile number, so callers can show the original text instead of guessing.
 * Display only: the stored value is never changed.
 */
export function formatIndianMobile(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function formatJobId(id?: string | null): string {
  if (!id) return "";
  const str = String(id).trim();
  if (/^JOB-\d{4,}$/i.test(str)) {
    return str.toUpperCase();
  }
  const match = str.match(/^(?:j|job|job-)?0*([1-9]\d*)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return `JOB-${String(num).padStart(4, "0")}`;
  }
  if (str.toLowerCase().startsWith("job-")) {
    return str.toUpperCase();
  }
  return str;
}

export function getNextJobId(jobs: any[]): string {
  let maxNum = 0;
  if (Array.isArray(jobs)) {
    jobs.forEach((j: any) => {
      const jid = j?.id || j?.jobId;
      if (jid) {
        const match = String(jid).match(/^(?:j|job|job-)?0*([1-9]\d*)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
  }
  maxNum++;
  return `JOB-${String(maxNum).padStart(4, "0")}`;
}

// Maps any spelling of a status onto one of the application stages the backend stores:
// New, Shortlisted, Interviewing, Offer, Hired, Rejected.
export function normalizePipelineStatus(rawStatus?: string): string {
  if (!rawStatus) return "New";
  const s = rawStatus.trim().toLowerCase();
  if (s === "new" || s === "applied") return "New";
  if (s === "pending evaluation" || s === "pending_evaluation" || s === "screening" || s === "under review") return "New";
  if (s === "ai shortlisted" || s === "ai_shortlisted" || s === "shortlisted") return "Shortlisted";
  if (s === "interview scheduled" || s === "interview_scheduled" || s === "interviewing" || s === "scheduled" || s === "interview") return "Interviewing";
  if (s === "interview completed" || s === "interview_completed" || s === "interview complete" || s === "completed") return "Interviewing";
  if (s === "offer" || s === "offer sent" || s === "offer_sent" || s === "offered" || s === "pending offer") return "Offer";
  if (s === "accepted" || s === "offer accepted" || s === "joined" || s === "hired") return "Hired";
  if (s === "rejected") return "Rejected";
  if (s === "talent pool" || s === "talent_pool") return "New";
  return rawStatus;
}

export function formatCandidateId(num: number): string {
  return `C${String(num).padStart(3, "0")}`;
}

export function parseCandidateNum(id: string): number {
  if (!id) return 0;
  const str = String(id).trim();
  const match = str.match(/[cC](?:and-)?0*([1-9][0-9]*)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const digits = str.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

// cleanOrphanCandidates, cleanDuplicateRecords and validateInterviewOrphans
// were removed here.
//
// cleanDuplicateRecords and validateInterviewOrphans had zero callers
// anywhere in the app — dead code.
//
// cleanOrphanCandidates was live (called from candidateRepository), but it
// solved a problem that no longer exists and had become actively unsafe:
//   - Its "is this a demo seed" check matched literal names like "Senior
//     React Engineer" — leftover mock data detection for the old
//     Express/JSON-file backend. The real Postgres `candidates` table has
//     no such rows.
//   - Its "is this candidate referenced by a real application/interview/
//     offer" check read applications/interviews/offers/talentPool from
//     localStorage keys populated exactly once, on this browser's very
//     first page load ever (see localStorageService.ts init()), and never
//     refreshed after. A real candidate created since then — with a
//     common-sounding role and no phone on file — could be silently
//     filtered out of the candidate list based on a stale, possibly
//     months-old snapshot. That's not a cleanup step, that's a
//     correctness bug: GET /api/candidates already returns exactly the
//     real, current candidates; nothing further needs to decide whether
//     they're "real".

export function assignSequentialCandidateIds(candidates: any[]): any[] {
  if (!Array.isArray(candidates) || candidates.length === 0) return candidates;
  const sorted = [...candidates].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return 0;
  });
  return sorted.map((c, index) => {
    const seqNum = index + 1;
    const fallbackId = `CAND-${String(seqNum).padStart(4, '0')}`;
    const canonicalCandidateId = c.candidateId || c.id || fallbackId;
    const canonicalId = c.id || c.candidateId || fallbackId;
    return {
      ...c,
      id: canonicalId,
      candidateId: canonicalCandidateId
    };
  });
}
