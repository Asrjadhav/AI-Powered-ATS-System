/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helpers for the offer letter form (Email Templates page and the Draft Offer Letter dialog).
// The backend builds the letter and validates it again; these only keep the form honest.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function ordinal(day: number): string {
  const suffix = day >= 10 && day <= 20 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] || "th";
  return `${day}${suffix}`;
}

/** "2026-09-09" -> "9th September 2026" (the wording the offer letter and offer email use). Empty when not a date. */
export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!match) return "";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${ordinal(day)} ${MONTHS[month - 1]} ${match[1]}`;
}

/** "2.04" LPA -> 204000 rupees per year. Null when it is not a positive number. */
export function lpaToRupees(lpa: string): number | null {
  const value = parseFloat(lpa);
  if (!isFinite(value) || value <= 0) return null;
  return Math.round(value * 100000);
}

/** 204000 -> "2.04" (for showing a saved CTC in the LPA field). */
export function rupeesToLpa(rupees: number | null | undefined): string {
  if (!rupees || rupees <= 0) return "";
  return String(parseFloat((rupees / 100000).toFixed(2)));
}

export interface OfferLetterForm {
  jobTitle: string;
  annualCtcLpa: string;
  joiningDate: string;
  validTill: string;
  reportingManager: string;
}

export const EMPTY_OFFER_FORM: OfferLetterForm = {
  jobTitle: "",
  annualCtcLpa: "",
  joiningDate: "",
  validTill: "",
  reportingManager: ""
};

/** Names of the required values still missing, so the user is told exactly what to fill in. */
export function missingOfferFields(form: OfferLetterForm): string[] {
  const missing: string[] = [];
  if (!form.jobTitle.trim()) missing.push("job title");
  if (lpaToRupees(form.annualCtcLpa) === null) missing.push("annual CTC");
  if (!form.joiningDate) missing.push("joining date");
  if (!form.validTill) missing.push("offer valid till date");
  return missing;
}
