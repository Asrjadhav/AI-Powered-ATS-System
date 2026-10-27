/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";

const FASTAPI_BASE_URL =
  (import.meta as any).env?.VITE_FASTAPI_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "https://ats-fastapi-backend.onrender.com";

/**
 * Candidate details extracted from a CV.
 *
 * This mirrors the `ParsedResume` model in backend/schemas/resume.py. Every
 * field arrives ready to assign straight onto a form input — there is no
 * client-side derivation, formatting or re-parsing. If an extraction rule needs
 * to change, change it in backend/services/candidate_service.parse_resume_document.
 */
export interface ParsedResume {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  company: string;

  /** Whole years of experience, already computed server-side. */
  experienceYears: number;
  /** Display form, e.g. "5 Years" or "Fresher (6 Months)". */
  experienceLabel: string;
  isFresher: boolean;

  /** Comma-separated, ready for the Key Skills input. */
  skills: string;
  educationText: string;
  /** Full extracted document text for the resume panel. */
  resumeText: string;
  source: string;
  fileName: string | null;
}

/**
 * Uploads a CV to the backend and returns the extracted candidate details.
 *
 * The file is sent as multipart/form-data, so the browser never reads,
 * decodes or inspects the document. Text extraction (PDF via pypdf, DOCX via
 * python-docx) and all field derivation happen server-side.
 *
 * Throws if the upload or extraction fails, so callers can surface the real
 * error rather than silently showing guessed data.
 */
export async function parseResume(file: File): Promise<ParsedResume> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(
    `${FASTAPI_BASE_URL}/api/candidates/parse-resume`,
    formData,
    {
      headers: {
        "X-Skip-Interceptor": "true",
        "Content-Type": "multipart/form-data",
      },
    }
  );

  const parsed = res.data?.parsed;
  if (!parsed) {
    throw new Error("Resume parsing returned no data.");
  }
  return parsed as ParsedResume;
}
