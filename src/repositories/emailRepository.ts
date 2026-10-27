/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { generateId } from "./repositoryUtils";
import { apiUrl } from "../lib/api";

const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export interface EmailRecipient {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  /** The mobile number saved on the candidate's profile (printed on the offer letter). */
  phone: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  atsScore: string;
  interviewStatus: string;
  offerStatus: string;
  /** What the offer letter form starts with: the candidate's saved offer, if any (no invented values). */
  offerDefaults?: { annualCtc: number | null; joiningDate: string };
  variables: Record<string, string>;
}

/** What HR confirms before an offer letter PDF is generated. The backend refuses to generate it without these. */
export interface OfferLetterDetails {
  jobTitle: string;
  /** Rupees per year (the form takes LPA and converts). */
  annualCtc: number | null;
  joiningDate: string;
  validTill: string;
  reportingManager: string;
}

/** One automatic email and its on/off switch (Email Templates > Automation Triggers). */
export interface EmailTrigger {
  event: string;
  label: string;
  when: string;
  templateName: string | null;
  enabled: boolean;
}

export interface EmailRecipientsResponse {
  configured: boolean;
  sender: { name: string; email: string };
  recipients: EmailRecipient[];
}

export const EmailRepository = {
  /** Real candidates the Email Templates page can send to, with their template variables. */
  async getRecipients(): Promise<EmailRecipientsResponse> {
    const res = await axios.get(apiUrl("/api/emails/recipients"), apiConfig);
    return res.data;
  },

  /** The automatic emails and whether each is switched on. */
  async getTriggers(): Promise<EmailTrigger[]> {
    const res = await axios.get(apiUrl("/api/emails/triggers"), apiConfig);
    return Array.isArray(res.data) ? res.data : [];
  },

  /** Switches one automatic email on or off. Takes effect on the backend immediately. */
  async setTrigger(event: string, enabled: boolean): Promise<EmailTrigger> {
    try {
      const res = await axios.put(apiUrl(`/api/emails/triggers/${encodeURIComponent(event)}`), { enabled }, apiConfig);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.detail || "Failed to update the trigger.");
    }
  },

  /**
   * Sends an email to one candidate through the backend (SMTP). The address is
   * looked up server-side from candidateId. On success the email is also
   * recorded in the local email log shown on the page.
   */
  async sendToCandidate(payload: { candidateId: string; subject: string; body: string; templateId?: string; templateName?: string; variables?: any; offerLetter?: OfferLetterDetails }): Promise<any> {
    try {
      const res = await axios.post(
        apiUrl("/api/emails/send"),
        { candidateId: payload.candidateId, subject: payload.subject, body: payload.body, templateId: payload.templateId, offerLetter: payload.offerLetter },
        apiConfig
      );
      return this.send({
        to: res.data.to,
        candidateName: res.data.candidateName,
        subject: res.data.subject,
        body: res.data.body,
        variables: payload.variables,
        templateName: payload.templateName,
        // Files the backend attached (the offer letter PDF for Offer Letter templates)
        attachmentNames: res.data.attachments || [],
        sentAt: res.data.sentAt
      });
    } catch (err: any) {
      throw new Error(err?.response?.data?.detail || "Failed to send email.");
    }
  },

  /** The offer letter PDF for the form as it stands, to read before sending. Nothing is sent or saved. */
  async previewOfferLetter(candidateId: string, offerLetter: OfferLetterDetails): Promise<Blob> {
    try {
      const res = await axios.post(
        apiUrl("/api/emails/offer-letter/preview"),
        { candidateId, offerLetter },
        { ...apiConfig, responseType: "blob" }
      );
      return res.data;
    } catch (err: any) {
      // With responseType "blob" an error body arrives as a Blob; read the message out of it.
      let detail = "";
      try {
        const data = err?.response?.data;
        detail = data instanceof Blob ? JSON.parse(await data.text())?.detail : data?.detail;
      } catch {
        detail = "";
      }
      throw new Error(detail || "Failed to prepare the offer letter.");
    }
  },

  async getAll(): Promise<any[]> {
    return LocalStorageService.get<any[]>("emails", []);
  },

  async send(payload: any): Promise<any> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const currentUser = LocalStorageService.getCurrentUserEmail();

    const newEmail = {
      id: generateId("em"),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      status: "sent",
      to: payload.to || "",
      subject: payload.subject || "No Subject",
      body: payload.body || payload.message || "",
      sentAt: now,
      ...payload
    };

    list.unshift(newEmail);
    LocalStorageService.set("emails", list);
    return newEmail;
  }
};
