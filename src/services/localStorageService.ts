import axios from "axios";

/**
 * LocalStorageService
 * The single source of truth for interacting with browser localStorage.
 * Handles safe read, write, removal, validation, and silent error recovery.
 */
export const LocalStorageService = {
  get<T>(key: string, defaultValue: T): T {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;

    try {
      return JSON.parse(stored) as T;
    } catch (e) {
      // If it is not valid JSON, but the default value suggests a string or nullable string,
      // return the raw stored string directly without logging an error.
      if (typeof defaultValue === "string" || defaultValue === null || defaultValue === undefined) {
        return stored as unknown as T;
      }
      
      // If it's expected to be something else (like an object/array) but failed JSON parsing,
      // then we log and fall back to the default value.
      console.error(`LocalStorageService: Invalid JSON for key "${key}", recovering with default value.`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e: any) {
      const isQuotaError = 
        e.name === "QuotaExceededError" || 
        e.name === "NS_ERROR_DOM_QUOTA_REACHED" || 
        e.code === 22 || 
        String(e.message || "").toLowerCase().includes("quota") ||
        String(e.name || "").toLowerCase().includes("quota");

      if (isQuotaError) {
        console.warn(`LocalStorageService: Quota exceeded for key "${key}". Initiating aggressive self-healing and pruning...`);
        try {
          // 1. Try to prune the current value first!
          const prunedValue = pruneLargeData(value);
          localStorage.setItem(key, JSON.stringify(prunedValue));
          console.log(`LocalStorageService: Successfully wrote pruned version of key "${key}".`);
          return;
        } catch (pruneErr) {
          console.error(`LocalStorageService: Even pruned version of key "${key}" failed. Clearing older collections...`, pruneErr);
        }

        try {
          // 2. Clear non-critical or temporary keys
          const keysToClean = [
            "add_candidate_draft",
            "ats_notifications",
            "app_notifications",
            "ats_emails",
            "app_emails",
            "ats_templates",
            "app_templates",
            "ats_offers",
            "ats_jobs",
            "app_jobs",
            "ats_local_jobs",
            "ats_candidates",
            "app_candidates",
            "ats_local_applications",
            "app_applications",
            "ats_interviews",
            "app_interviews",
            "ats_talent_pool",
            "talent_pool_candidates"
          ];
          for (const k of keysToClean) {
            localStorage.removeItem(k);
          }

          // Let's also prune stored collections to free up space
          const collectionsToPrune = ["applications", "candidates", "jobs", "interviews", "offers", "talentPool", "notifications"];
          for (const colKey of collectionsToPrune) {
            const raw = localStorage.getItem(colKey);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                const pruned = pruneLargeData(parsed);
                localStorage.setItem(colKey, JSON.stringify(pruned));
              } catch (colErr) {}
            }
          }

          // Now write pruned version of our target key again
          const prunedValue = pruneLargeData(value);
          localStorage.setItem(key, JSON.stringify(prunedValue));
          console.log(`LocalStorageService: Self-healing successful! Wrote key "${key}".`);
          return;
        } catch (healErr) {
          console.error(`LocalStorageService: Self-healing critical failure for key "${key}". Truncating array completely as last resort.`, healErr);
          try {
            if (Array.isArray(value)) {
              const tinyArray = pruneLargeData(value.slice(-5));
              localStorage.setItem(key, JSON.stringify(tinyArray));
              console.log(`LocalStorageService: Successfully wrote tiny fallback array for key "${key}".`);
              return;
            }
          } catch (lastErr) {
            console.error(`LocalStorageService: Total storage failure for key "${key}":`, lastErr);
          }
        }
      } else {
        console.error(`LocalStorageService: Failed to write key "${key}".`, e);
      }
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`LocalStorageService: Failed to remove key "${key}".`, e);
    }
  },

  getCurrentUserEmail(): string {
    try {
      const user = sessionStorage.getItem("talent_ai_user") || localStorage.getItem("talent_ai_user");
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.email || "system";
      }
    } catch (e) {}
    return "system";
  },

  /**
   * Safe bootstrap to initialize local storage from server databases/endpoints
   * on first application launch ONLY. Once loaded, setting 'ats_initialized' is set
   * to true, and we never fetch demo data again.
   */
  async init(): Promise<void> {
    // 1. Perform automatic migration of legacy keys if present
    this.migrateLegacyKeys();

    if (localStorage.getItem("ats_initialized") === "true") {
      return;
    }

    try {
      console.log("LocalStorageService: Initializing collections from separate API endpoints...");

      // Pull default server data into localStorage from individual endpoints
      const [candidatesRes, appsRes, jobsRes, interviewsRes, templatesRes, emailsRes, notificationsRes, offersRes] = await Promise.all([
        axios.get("/api/candidates", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/applications", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/jobs", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/interviews", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/templates", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/emails", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/notifications", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] })),
        axios.get("/api/offers", { headers: { "X-Skip-Interceptor": "true" } }).catch(() => ({ data: [] }))
      ]);

      // Seed each collection strictly from its own endpoint
      this.set("candidates", candidatesRes.data || []);
      this.set("applications", appsRes.data || []);
      this.set("talentPool", candidatesRes.data || []);
      this.set("jobs", jobsRes.data || []);
      this.set("interviews", interviewsRes.data || []);
      this.set("offers", offersRes.data || []);
      this.set("notifications", notificationsRes.data || []);

      // Supporting structures
      this.set("templates", templatesRes.data || []);
      this.set("emails", emailsRes.data || []);

      // Default recruiters (users & roles)
      const defaultUsers = [
        {
          id: "u-1",
          name: "Yogesh Adsul",
          email: "yogesh.adsul@encureit.com",
          phone: "+91 99999 99999",
          employeeId: "ENC-HR-001",
          department: "Human Resources",
          designation: "HR Manager",
          role: "System Administrator",
          manager: "System Board",
          status: "Active",
          lastLogin: "Today, 10:25 AM",
          createdOn: "15 June 2026",
          avatarColor: "bg-indigo-600 text-white",
          changePasswordOnFirstLogin: false
        }
      ];
      this.set("users", defaultUsers);

      // Default report schedules
      const defaultReportSchedules = [
        {
          id: "rep-sch-1",
          frequency: "Weekly",
          format: "PDF",
          emails: "aditijadhav2828@gmail.com, hr-alerts@company.com",
          department: "All Departments",
          lastSent: "Yesterday, 04:00 PM"
        }
      ];
      this.set("report_schedules", defaultReportSchedules);

      localStorage.setItem("ats_initialized", "true");
      console.log("LocalStorageService: Initialized successfully with separated collections.");
    } catch (err) {
      console.error("LocalStorageService: Critical failure bootstrapping collections, initializing empty fallback.", err);
      this.set("applications", []);
      this.set("jobs", []);
      this.set("interviews", []);
      this.set("offers", []);
      this.set("notifications", []);
      this.set("candidates", []);
      this.set("talentPool", []);
      localStorage.setItem("ats_initialized", "true");
    }
  },

  /**
   * Consolidate duplicate legacy LocalStorage keys into standard collections
   * and delete duplicate keys without cross-copying candidates and applications.
   */
  migrateLegacyKeys(): void {
    const legacyMappings: Array<{ target: string; legacyKeys: string[] }> = [
      { target: "jobs", legacyKeys: ["ats_jobs", "app_jobs", "ats_local_jobs"] },
      { target: "candidates", legacyKeys: ["ats_candidates", "app_candidates"] },
      { target: "applications", legacyKeys: ["ats_local_applications", "app_applications"] },
      { target: "interviews", legacyKeys: ["ats_interviews", "app_interviews"] },
      { target: "offers", legacyKeys: ["ats_offers"] },
      { target: "talentPool", legacyKeys: ["ats_talent_pool", "talent_pool_candidates"] },
      { target: "notifications", legacyKeys: ["ats_notifications", "app_notifications"] }
    ];

    for (const mapping of legacyMappings) {
      let existingTarget = LocalStorageService.get<any[]>(mapping.target, []);
      let targetChanged = false;

      for (const legacyKey of mapping.legacyKeys) {
        const rawLegacy = localStorage.getItem(legacyKey);
        if (rawLegacy) {
          try {
            const parsedLegacy = JSON.parse(rawLegacy);
            if (Array.isArray(parsedLegacy)) {
              parsedLegacy.forEach((item: any) => {
                const uniqueKey = item.id || item.applicationId || item.candidateId;
                if (item && uniqueKey && !existingTarget.some((e: any) => (e.id || e.applicationId || e.candidateId) === uniqueKey)) {
                  existingTarget.push(item);
                  targetChanged = true;
                }
              });
            }
          } catch (e) {}
          localStorage.removeItem(legacyKey);
        }
      }

      if (targetChanged) {
        LocalStorageService.set(mapping.target, existingTarget);
      }
    }
  },

  clearAll(): void {
    try {
      localStorage.setItem("jobs", JSON.stringify([]));
      localStorage.setItem("candidates", JSON.stringify([]));
      localStorage.setItem("applications", JSON.stringify([]));
      localStorage.setItem("interviews", JSON.stringify([]));
      localStorage.setItem("offers", JSON.stringify([]));
      localStorage.setItem("talentPool", JSON.stringify([]));
      localStorage.setItem("notifications", JSON.stringify([]));
      localStorage.setItem("ats_initialized", "true");

      // Clean legacy keys
      const legacyKeys = [
        "ats_jobs", "app_jobs", "ats_local_jobs",
        "ats_candidates", "app_candidates",
        "ats_local_applications", "app_applications",
        "ats_interviews", "app_interviews",
        "ats_offers",
        "ats_talent_pool", "talent_pool_candidates",
        "ats_notifications", "app_notifications"
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));

      console.log("LocalStorageService: All 7 collections cleared successfully.");
    } catch (e) {
      console.error("Failed to clear collections", e);
    }
  }
};

/**
 * Recursively inspects and prunes large text/base64 strings and limits array sizes 
 * to guarantee that localStorage keys remain within their storage limits and quota.
 */
function pruneLargeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    // Keep only the most recent 20 entries to free up space under quota pressure
    let arrayToProcess = data;
    if (data.length > 20) {
      arrayToProcess = data.slice(-20);
    }
    return arrayToProcess.map(item => pruneLargeData(item));
  }

  if (typeof data === "object") {
    const copy: any = {};
    for (const k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        const val = data[k];
        const lowerK = k.toLowerCase();
        const isPotentialHugeString = 
          lowerK.includes("resume") || 
          lowerK.includes("cv") || 
          lowerK.includes("base64") || 
          lowerK.includes("text") || 
          lowerK.includes("content") || 
          lowerK.includes("file") || 
          lowerK.includes("pdf") ||
          lowerK.includes("image") ||
          lowerK.includes("avatar") ||
          lowerK.includes("description") ||
          lowerK.includes("notes");

        if (typeof val === "string") {
          if (isPotentialHugeString && val.length > 500) {
            copy[k] = val.substring(0, 300) + "\n... [Truncated due to local storage quota limit] ...";
          } else if (val.length > 3000) {
            copy[k] = val.substring(0, 500) + "\n... [Truncated due to local storage quota limit] ...";
          } else {
            copy[k] = val;
          }
        } else if (typeof val === "object" && val !== null) {
          copy[k] = pruneLargeData(val);
        } else {
          copy[k] = val;
        }
      }
    }
    return copy;
  }

  return data;
}
