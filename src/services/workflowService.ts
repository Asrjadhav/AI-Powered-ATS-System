import { CandidateRepository, InterviewRepository, OfferRepository, ApplicationRepository } from "../repositories";
import { normalizeCandidateStatus } from "../utils/pipelineUtils";

/**
 * CandidateWorkflowService
 * The Workflow/Application Service layer responsible for coordinating multiple repositories.
 * - Repositories own only a single entity.
 * - This service handles cross-repository orchestration (e.g. updating candidate status and creating/updating interviews or offers).
 */
export const CandidateWorkflowService = {
  async updateCandidateStatus(id: string, newStatusRaw: string, currentUserSession?: any): Promise<any> {
    const newStatus = normalizeCandidateStatus(newStatusRaw);
    const now = new Date().toISOString();

    // 1. Update CandidateRepository & ApplicationRepository
    const updatedCandidate = await CandidateRepository.updateStatus(id, newStatus, currentUserSession);
    await ApplicationRepository.updateStatusByCandidateOrAppId(id, newStatus);
    const candObj = updatedCandidate || await CandidateRepository.getById(id);

    if (candObj) {
      const candId = candObj.id || candObj.candidateId || id;
      const candidateName = candObj.name || `${candObj.firstName || ""} ${candObj.lastName || ""}`.trim() || "Candidate";
      const candidateEmail = candObj.email || "";
      const jobTitle = candObj.appliedJob || candObj.job?.title || candObj.currentRole || "Software Engineer";
      const jobId = candObj.jobId || "JOB-0001";

      // 2. Coordinate with InterviewRepository if moving to Interview stage
      if (newStatus === "Interviewing" || newStatus === "Interview" || newStatus === "Technical Interview") {
        const interviews = await InterviewRepository.getAll();
        const cleanCandId = String(candId).replace(/^app-/, "").toLowerCase();
        const existingInt = interviews.find(i => {
          const iCandId = String(i.candidateId || "").replace(/^app-/, "").toLowerCase();
          return iCandId === cleanCandId || (i.candidateEmail && candidateEmail && i.candidateEmail.toLowerCase() === candidateEmail.toLowerCase());
        });

        if (!existingInt) {
          await InterviewRepository.create({
            id: `int-${cleanCandId}-${Date.now()}`,
            applicationId: `app-${cleanCandId}`,
            candidateId: candId,
            candidateName,
            candidateEmail,
            jobId,
            jobTitle,
            round: "Technical Interview",
            interviewer: "Hiring Manager",
            date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
            time: "14:00",
            type: "Online",
            platform: "Google Meet",
            status: "Upcoming",
            notes: "Automated workflow service coordination to Interview stage.",
            meetingProvider: "Google Meet",
            meetingStatus: "Confirmed",
            calendarSynced: true,
            duration: 60,
            createdAt: now,
            updatedAt: now
          });
        }
      }

      // 3. Coordinate with OfferRepository if moving to Offer stage
      if (newStatus === "Offered" || newStatus === "Offer") {
        const offers = await OfferRepository.getAll();
        const cleanCandId = String(candId).replace(/^app-/, "").toLowerCase();
        const cleanAppId = String(candObj.applicationId || candObj.id || "").replace(/^app-/, "").toLowerCase();
        const targetEmail = (candidateEmail || "").toLowerCase();

        const existingOffer = offers.find(o => {
          const oCandId = String(o.candidateId || "").replace(/^app-/, "").toLowerCase();
          const oAppId = String(o.applicationId || "").replace(/^app-/, "").toLowerCase();
          const oEmail = String(o.candidateEmail || o.email || "").toLowerCase();

          // Prefer applicationId + candidateId as uniqueness key when available
          if (cleanAppId && oAppId && cleanAppId === oAppId) return true;
          if (cleanCandId && oCandId && cleanCandId === oCandId) return true;
          if (cleanAppId && oCandId && cleanAppId === oCandId) return true;
          if (cleanCandId && oAppId && cleanCandId === oAppId) return true;
          if (targetEmail && oEmail && targetEmail === oEmail) return true;
          return false;
        });

        if (!existingOffer) {
          await OfferRepository.create({
            id: `OFF-2026-${cleanCandId || cleanAppId}`,
            candidateId: candId,
            applicationId: `app-${cleanCandId || cleanAppId}`,
            candidateName,
            candidateEmail,
            jobTitle,
            department: candObj.department || "Engineering",
            recruiter: "Hiring Manager",
            location: candObj.location || "Remote",
            offerDate: now.split("T")[0],
            joiningDate: new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0],
            status: "Pending",
            salary: "$120,000",
            timeline: {
              generated: now.split("T")[0] + " 10:00 AM",
              sent: null,
              viewed: null,
              responded: null,
              joined: null
            },
            createdAt: now,
            updatedAt: now
          });
        }
      }
    }

    // 4. Dispatch update events
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("candidates-updated"));
      window.dispatchEvent(new CustomEvent("interviews-updated"));
      window.dispatchEvent(new CustomEvent("offers-updated"));
      window.dispatchEvent(new CustomEvent("trigger-notification-sync"));
    }

    return updatedCandidate;
  },

  async moveToScreening(id: string, session?: any): Promise<any> {
    return this.updateCandidateStatus(id, "Pending Evaluation", session);
  },

  async moveToInterview(id: string, session?: any): Promise<any> {
    return this.updateCandidateStatus(id, "Interviewing", session);
  },

  async moveToOffer(id: string, session?: any): Promise<any> {
    return this.updateCandidateStatus(id, "Offered", session);
  },

  async moveToHired(id: string, session?: any): Promise<any> {
    return this.updateCandidateStatus(id, "Hired", session);
  },

  async rejectCandidate(id: string, session?: any): Promise<any> {
    return this.updateCandidateStatus(id, "Rejected", session);
  }
};
