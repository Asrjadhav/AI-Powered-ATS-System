/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Single definition of the FastAPI origin. Every backend call goes through
// this: a relative "/api/..." URL resolves to whichever server serves the
// frontend (Express), which is not the backend.
export const FASTAPI_BASE_URL: string =
  (import.meta as any).env?.VITE_FASTAPI_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "https://ats-fastapi-backend.onrender.com";

export const apiUrl = (path: string): string => `${FASTAPI_BASE_URL}${path}`;
