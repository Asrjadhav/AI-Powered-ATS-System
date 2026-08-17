import axios from "axios";
import {
  CandidateRepository,
  JobRepository,
  InterviewRepository,
  NotificationRepository,
  TemplateRepository,
  EmailRepository,
  OfferRepository,
  UserRepository,
  StatsRepository
} from "../repositories";
import { CandidateWorkflowService } from "../services/workflowService";

/**
 * Register Axios Sync Interceptors
 * Intercepts Axios requests and routes them through the Repository layer
 * which uses the central LocalStorageService.
 * Keeps axiosSync.ts active for seamless, non-breaking backward compatibility
 * and primes it for future FastAPI/MySQL integration.
 */
export const registerAxiosSyncInterceptors = () => {
  axios.interceptors.request.use(async (config) => {
    // 1. Bypass interception if skipping header is present (for future server integration)
    if (config.headers && config.headers["X-Skip-Interceptor"]) {
      delete config.headers["X-Skip-Interceptor"];
      return config;
    }

    const rawUrl = config.url || "";
    const url = rawUrl.split("?")[0];
    const method = (config.method || "").toLowerCase();

    // GET Requests Interception
    if (method === "get") {
      if (url === "/api/applications") {
        const data = await CandidateRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/jobs" || url === "/api/public/jobs") {
        const data = await JobRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/interviews") {
        const data = await InterviewRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/templates") {
        const data = await TemplateRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/emails") {
        const data = await EmailRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/notifications") {
        const data = await NotificationRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/offers") {
        const data = await OfferRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/users") {
        const data = await UserRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url.startsWith("/api/candidates")) {
        const data = await CandidateRepository.getAllCandidates();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      } else if (url === "/api/stats") {
        const data = await StatsRepository.getDashboardStats();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      }
    }

    // Mutation Requests Interception (POST, PUT, PATCH, DELETE)
    if (method === "post" || method === "put" || method === "patch" || method === "delete") {
      let resolvedData: any = null;
      let body: any = {};
      if (config.data) {
        if (typeof config.data === "string") {
          try {
            body = JSON.parse(config.data);
          } catch {
            body = {};
          }
        } else {
          body = config.data;
        }
      }

      if (url === "/api/candidates") {
        resolvedData = await CandidateRepository.create(body);
      } 
      else if (url === "/api/applications" || url === "/api/public/apply" || url === "/api/apply") {
        resolvedData = await CandidateRepository.createApplication(body);
      } 
      else if (url.startsWith("/api/applications/") && url.endsWith("/status")) {
        const idMatch = url.match(/\/api\/applications\/([^\/]+)\/status/);
        if (idMatch) {
          const id = idMatch[1];
          resolvedData = await CandidateWorkflowService.updateCandidateStatus(id, body.status, body.metadata);
        }
      } 
      else if (url.startsWith("/api/applications/")) {
        const idMatch = url.match(/\/api\/applications\/([^\/]+)/);
        if (idMatch) {
          const appId = idMatch[1];
          if (method === "delete") {
            await CandidateRepository.delete(appId);
            resolvedData = { success: true };
          }
        }
      }
      else if (url.startsWith("/api/candidates/")) {
        const idMatch = url.match(/\/api\/candidates\/([^\/]+)/);
        if (idMatch) {
          const candId = idMatch[1];
          if (method === "delete") {
            await CandidateRepository.delete(candId);
            resolvedData = { success: true };
          } else {
            resolvedData = await CandidateRepository.update(candId, body);
          }
        }
      } 
      else if (url === "/api/jobs") {
        resolvedData = await JobRepository.create(body);
      } 
      else if (url.startsWith("/api/jobs/") && url.endsWith("/status")) {
        const idMatch = url.match(/\/api\/jobs\/([^\/]+)\/status/);
        if (idMatch) {
          const jobId = idMatch[1];
          resolvedData = await JobRepository.updateStatus(jobId, body.status);
        }
      } 
      else if (url.startsWith("/api/jobs/")) {
        const idMatch = url.match(/\/api\/jobs\/([^\/]+)/);
        if (idMatch) {
          const jobId = idMatch[1];
          if (method === "delete") {
            await JobRepository.delete(jobId);
            resolvedData = { success: true };
          } else if (method === "put" || method === "patch") {
            resolvedData = await JobRepository.update(jobId, body);
          }
        }
      } 
      else if (url === "/api/interviews") {
        resolvedData = await InterviewRepository.create(body);
      } 
      else if (url.startsWith("/api/interviews/") && url.endsWith("/feedback")) {
        const idMatch = url.match(/\/api\/interviews\/([^\/]+)\/feedback/);
        if (idMatch) {
          const interviewId = idMatch[1];
          resolvedData = await InterviewRepository.submitFeedback(interviewId, body);
        }
      } 
      else if (url.startsWith("/api/interviews/") && url.endsWith("/cancel")) {
        const idMatch = url.match(/\/api\/interviews\/([^\/]+)\/cancel/);
        if (idMatch) {
          const interviewId = idMatch[1];
          resolvedData = await InterviewRepository.cancel(interviewId);
        }
      } 
      else if (url === "/api/templates") {
        resolvedData = await TemplateRepository.createOrUpdate(body);
      } 
      else if (url.startsWith("/api/templates/")) {
        const idMatch = url.match(/\/api\/templates\/([^\/]+)/);
        if (idMatch) {
          const templateId = idMatch[1];
          if (method === "delete") {
            const success = await TemplateRepository.delete(templateId);
            resolvedData = { success };
          }
        }
      } 
      else if (url === "/api/emails/outreach" || url === "/api/emails/send") {
        resolvedData = await EmailRepository.send(body);
      } 
      else if (url === "/api/offers") {
        resolvedData = await OfferRepository.create(body);
      } 
      else if (url.startsWith("/api/offers/")) {
        const idMatch = url.match(/\/api\/offers\/([^\/]+)/);
        if (idMatch) {
          const offerId = idMatch[1];
          resolvedData = await OfferRepository.update(offerId, body);
        }
      } 
      else if (url.startsWith("/api/notifications/read/")) {
        const idMatch = url.match(/\/api\/notifications\/read\/([^\/]+)/);
        if (idMatch) {
          const id = idMatch[1];
          const success = await NotificationRepository.markAsRead(id);
          resolvedData = { success };
        }
      } 
      else if (url === "/api/notifications/read-all") {
        const success = await NotificationRepository.markAllAsRead();
        resolvedData = { success };
      } 
      else if (url === "/api/notifications/clear") {
        const success = await NotificationRepository.clearAll();
        resolvedData = { success };
      } 
      else if (url.startsWith("/api/notifications/")) {
        const idMatch = url.match(/\/api\/notifications\/([^\/]+)/);
        if (idMatch) {
          const id = idMatch[1];
          if (method === "delete") {
            const success = await NotificationRepository.delete(id);
            resolvedData = { success };
          }
        }
      } 
      else if (url === "/api/notifications/simulate") {
        resolvedData = await NotificationRepository.simulate();
      }

      // Return local storage response if handled via repositories
      if (resolvedData !== null) {
        config.adapter = () => Promise.resolve({
          data: resolvedData,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      }
    }

    return config;
  }, (err) => Promise.reject(err));
};
