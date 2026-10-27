import axios from "axios";
import { CandidateRepository, EmailRepository } from "../repositories";

/**
 * Register Axios Sync Interceptors
 *
 * Originally intercepted every /api/* call and answered it from
 * LocalStorageService instead of the network — meaning candidates, jobs,
 * applications, interviews, offers, notifications, templates and users were
 * all being written to one browser's localStorage instead of the real
 * Postgres-backed FastAPI endpoints that already existed for every one of
 * them. Those eight have been repointed at FastAPI directly (see each
 * repository under src/repositories/) and no longer pass through here.
 *
 * What's left is genuinely unbuilt on FastAPI yet, not merely unwired:
 *   - /api/emails, /api/emails/send, /api/emails/outreach — email sending
 *     is out of scope for now (see EmailRepository).
 *   - /api/apply, /api/public/apply — the public job-application flow has
 *     no FastAPI endpoint at all yet.
 * Relative calls to either of these still resolve to Express if this
 * interceptor doesn't handle them, so they stay intercepted here rather
 * than silently hitting the wrong backend.
 */
export const registerAxiosSyncInterceptors = () => {
  axios.interceptors.request.use(async (config) => {
    const rawUrl = config.url || "";

    // Check for X-Skip-Interceptor header in both object keys and AxiosHeaders methods
    const hasSkipHeader =
      Boolean(config.headers?.["X-Skip-Interceptor"]) ||
      Boolean(config.headers?.["x-skip-interceptor"]) ||
      Boolean(config.headers?.get && (config.headers.get("X-Skip-Interceptor") || config.headers.get("x-skip-interceptor")));

    // Bypass interception if URL is absolute (points to FastAPI backend) or skip header is present
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || hasSkipHeader) {
      if (config.headers) {
        if (typeof config.headers.delete === "function") {
          config.headers.delete("X-Skip-Interceptor");
          config.headers.delete("x-skip-interceptor");
        } else {
          delete config.headers["X-Skip-Interceptor"];
          delete config.headers["x-skip-interceptor"];
        }
      }
      return config;
    }

    const url = rawUrl.split("?")[0];
    const method = (config.method || "").toLowerCase();

    // GET Requests Interception
    if (method === "get") {
      if (url === "/api/emails") {
        const data = await EmailRepository.getAll();
        config.adapter = () => Promise.resolve({
          data,
          status: 200,
          statusText: "OK",
          headers: {},
          config
        });
      }
      // /api/stats and /api/insights are deliberately not intercepted —
      // those figures are aggregated by the backend and must reach it.
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

      if (url === "/api/public/apply" || url === "/api/apply") {
        resolvedData = await CandidateRepository.createApplication(body);
      }
      else if (url === "/api/emails/outreach" || url === "/api/emails/send") {
        resolvedData = await EmailRepository.send(body);
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
