/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalStorageService } from "../services/localStorageService";

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

export function generateAIMatchScore(payload: any, candidateObj?: any): number {
  if (payload.aiMatchScore && typeof payload.aiMatchScore === "number" && payload.aiMatchScore > 0) {
    return payload.aiMatchScore;
  }
  if (payload.aiScore && typeof payload.aiScore === "number" && payload.aiScore > 0) {
    return payload.aiScore;
  }
  if (payload.aiEvaluation?.score && typeof payload.aiEvaluation.score === "number" && payload.aiEvaluation.score > 0) {
    return payload.aiEvaluation.score;
  }
  if (candidateObj?.aiScore && typeof candidateObj.aiScore === "number" && candidateObj.aiScore > 0) {
    return candidateObj.aiScore;
  }

  const textToScan = `${payload.skills || ""} ${payload.resumeText || ""} ${payload.currentRole || ""} ${payload.experienceYears || ""}`.toLowerCase();
  let baseScore = 75;
  if (textToScan.includes("react") || textToScan.includes("node") || textToScan.includes("python") || textToScan.includes("java")) baseScore += 8;
  if (textToScan.includes("senior") || textToScan.includes("lead") || textToScan.includes("architect")) baseScore += 6;
  if (textToScan.length > 200) baseScore += 5;
  
  const seed = (payload.email || payload.name || "candidate").length * 3;
  const score = Math.min(98, Math.max(68, baseScore + (seed % 11) - 4));
  return score;
}

export function normalizePipelineStatus(rawStatus?: string): string {
  if (!rawStatus) return "Applied";
  const s = rawStatus.trim().toLowerCase();
  if (s === "new" || s === "applied") return "Applied";
  if (s === "pending evaluation" || s === "pending_evaluation" || s === "screening" || s === "under review") return "Pending Evaluation";
  if (s === "ai shortlisted" || s === "ai_shortlisted" || s === "shortlisted") return "Shortlisted";
  if (s === "interview scheduled" || s === "interview_scheduled" || s === "interviewing" || s === "scheduled" || s === "interview") return "Interviewing";
  if (s === "interview completed" || s === "interview_completed" || s === "interview complete" || s === "completed") return "Interviewing";
  if (s === "offer sent" || s === "offer_sent" || s === "offered" || s === "pending offer") return "Offered";
  if (s === "accepted" || s === "offer accepted") return "Offered";
  if (s === "hired") return "Hired";
  if (s === "rejected") return "Rejected";
  if (s === "talent pool" || s === "talent_pool") return "Talent Pool";
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

export function cleanOrphanCandidates(candidates: any[]): any[] {
  if (!Array.isArray(candidates) || candidates.length === 0) return candidates;

  const applications = LocalStorageService.get<any[]>("applications", []);
  const interviews = LocalStorageService.get<any[]>("interviews", []);
  const offers = LocalStorageService.get<any[]>("offers", []);
  const talentPool = LocalStorageService.get<any[]>("talentPool", []);

  const removedRecords: string[] = [];
  const validCandidates: any[] = [];

  for (const c of candidates) {
    if (!c) continue;
    const cId = String(c.id || c.candidateId || "").trim();
    const cCleanId = cId.replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
    const cEmail = String(c.email || c.candidate?.email || "").toLowerCase().trim();
    const cName = String(c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim()).toLowerCase();

    const isDemoSeed = (
      ["senior react engineer", "product designer", "backend developer", "software developer intern", "lead ai developer", "intern - marketing", "software developer", "fullstack developer", "data scientist", "devops engineer", "qa engineer"].includes(cName) ||
      cName.includes("intern") || cName.includes("engineer") || cName.includes("developer") || cName.includes("architect") || cName.includes("designer")
    ) && (!cEmail || cEmail.includes("example.com") || cEmail.includes("placeholder")) && (!c.phone || c.phone === "—" || c.phone === "");

    if (isDemoSeed) {
      removedRecords.push(`${cId} (${c.name || 'Demo'})`);
      continue;
    }

    const referencedApp = applications.find(a => {
      const aCandId = String(a.candidateId || a.candidate?.id || "").replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
      const aEmail = String(a.candidateEmail || a.email || a.candidate?.email || "").toLowerCase().trim();
      return (cCleanId && aCandId === cCleanId) || (cEmail && aEmail === cEmail);
    });

    const referencedInt = interviews.find(i => {
      const iCandId = String(i.candidateId || "").replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
      const iEmail = String(i.candidateEmail || "").toLowerCase().trim();
      return (cCleanId && iCandId === cCleanId) || (cEmail && iEmail === cEmail);
    });

    const referencedOff = offers.find(o => {
      const oCandId = String(o.candidateId || "").replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
      const oEmail = String(o.candidateEmail || o.email || "").toLowerCase().trim();
      return (cCleanId && oCandId === cCleanId) || (cEmail && oEmail === cEmail);
    });

    const referencedTP = talentPool.find(t => {
      const tCandId = String(t.candidateId || t.id || "").replace(/^app-/, "").replace(/^cand-/, "").toLowerCase();
      const tEmail = String(t.email || "").toLowerCase().trim();
      return (cCleanId && tCandId === cCleanId) || (cEmail && tEmail === cEmail);
    });

    const isReferenced = !!(referencedApp || referencedInt || referencedOff || referencedTP || cEmail || c.phone || c.source || (cName && cName !== "independent"));
    const isGenericIndependent = cName === "independent" || (cName === "" && !cEmail && !c.phone);

    if (!isReferenced && isGenericIndependent) {
      removedRecords.push(`${cId} (${c.name || 'Unknown'})`);
    } else {
      validCandidates.push(c);
    }
  }

  return validCandidates;
}

export function cleanDuplicateRecords(records: any[], type: 'interview' | 'offer'): any[] {
  if (!Array.isArray(records) || records.length <= 1) return records;

  const groups = new Map<string, any[]>();

  for (const record of records) {
    if (!record) continue;
    const appId = String(record.applicationId || record.jobId || "").replace(/^app-/, "").toLowerCase().trim();
    const candId = String(record.candidateId || "").replace(/^app-/, "").toLowerCase().trim();

    let groupKey = "";
    if (appId && candId) {
      groupKey = `${appId}_${candId}`;
    } else if (appId) {
      groupKey = `${appId}_${String(record.candidateEmail || record.email || record.candidateName || "").toLowerCase().trim()}`;
    } else if (candId) {
      groupKey = `cand_${candId}`;
    } else {
      groupKey = `id_${record.id}`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(record);
  }

  const cleaned: any[] = [];
  for (const [groupKey, groupItems] of groups.entries()) {
    if (groupItems.length === 1) {
      cleaned.push(groupItems[0]);
    } else {
      groupItems.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
        if (timeA !== timeB) return timeA - timeB;

        const fieldsA = Object.keys(a).filter(k => a[k] !== undefined && a[k] !== null && a[k] !== "").length;
        const fieldsB = Object.keys(b).filter(k => b[k] !== undefined && b[k] !== null && b[k] !== "").length;
        return fieldsB - fieldsA;
      });

      cleaned.push(groupItems[0]);
    }
  }

  return cleaned;
}

export function validateInterviewOrphans(interviews: any[]): any[] {
  const applications = LocalStorageService.get<any[]>("applications", []);
  const candidates = LocalStorageService.get<any[]>("candidates", []);
  if (!Array.isArray(applications) || applications.length === 0 || !Array.isArray(candidates) || candidates.length === 0) {
    return interviews;
  }

  return interviews.filter(item => {
    if (!item) return false;
    const appId = String(item.applicationId || "").replace(/^app-/, "").toLowerCase();
    const candId = String(item.candidateId || "").replace(/^app-/, "").toLowerCase();
    
    const foundApp = applications.find(a => {
      const aId = String(a.applicationId || a.id || "").replace(/^app-/, "").toLowerCase();
      const aCandId = String(a.candidateId || "").replace(/^app-/, "").toLowerCase();
      return (appId && aId === appId) || (candId && (aCandId === candId || aId === candId));
    });

    const foundCand = candidates.find(c => {
      const cId = String(c.candidateId || c.id || "").replace(/^app-/, "").toLowerCase();
      const cEmail = String(c.email || "").toLowerCase();
      const iEmail = String(item.candidateEmail || "").toLowerCase();
      return (candId && cId === candId) || (iEmail && cEmail === iEmail);
    });

    return !!(foundApp || foundCand);
  });
}

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
