
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
   * Seeds the one localStorage collection still genuinely backed by this
   * service: "emails". Runs once per browser (guarded by "ats_initialized").
   *
   * This used to bootstrap eight collections — candidates, applications,
   * jobs, interviews, templates, notifications, offers, plus a talentPool
   * copy — every one fetched via a *relative* URL, meaning every one of
   * them actually hit Express, not FastAPI, on every browser's first ever
   * load. All eight repositories for those entities now call FastAPI
   * directly with no localStorage involved at all (see
   * candidateRepository.ts, jobRepository.ts, etc.), so seeding those keys
   * had become pure dead weight: data fetched from the wrong backend,
   * written to browser storage, and read by nothing.
   *
   * "emails" is the one exception. Email sending is explicitly out of
   * scope for now (see EmailRepository), so it still needs somewhere to
   * read from, and this remains that somewhere. It starts empty: the seed
   * used to come from Express's sent_emails.json, and no frontend call may
   * reach Express.
   */
  async init(): Promise<void> {
    if (localStorage.getItem("ats_initialized") === "true") {
      return;
    }

    this.set("emails", []);
    localStorage.setItem("ats_initialized", "true");
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
