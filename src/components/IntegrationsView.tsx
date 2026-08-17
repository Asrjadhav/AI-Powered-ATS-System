/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { googleSignIn } from "../lib/firebaseAuth";
import { 
  Link, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Briefcase, 
  Calendar, 
  Video, 
  Mail, 
  MessageSquare, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Globe, 
  Settings, 
  Send, 
  Key, 
  Sparkles, 
  Lock, 
  ShieldAlert,
  Sliders,
  Check,
  Building,
  Info,
  Flame,
  Power,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface IntegrationsViewProps {
  currentUser?: { email: string; name: string; role: string } | null;
}

// Interface for Integration Services
interface IntegrationService {
  id: string;
  name: string;
  category: "job_portals" | "calendars" | "video_platforms" | "emails" | "comms" | "ai" | "bg_verification";
  connectionStatus: "connected" | "disconnected" | "error";
  connectedAccount?: string;
  lastSync?: string;
  details?: Record<string, any>;
  hasConfigureModal?: boolean;
}

export default function IntegrationsView({ currentUser }: IntegrationsViewProps) {
  // Check authorization (dummy role-based check)
  const userRole = currentUser?.role || "Lead Recruiting Admin";
  const isAuthorized = 
    userRole.toLowerCase().includes("admin") || 
    userRole.toLowerCase().includes("hr") || 
    userRole.toLowerCase().includes("manager") ||
    userRole.toLowerCase().includes("executive");

  // State for all integration services
  const [services, setServices] = useState<IntegrationService[]>([
    // Category: Job Portals
    { id: "linkedin", name: "LinkedIn Jobs", category: "job_portals", connectionStatus: "connected", connectedAccount: "encureit_enterprise_jobs", lastSync: "12 mins ago" },
    { id: "indeed", name: "Indeed Enterprise", category: "job_portals", connectionStatus: "connected", connectedAccount: "recruitment@encureit.com", lastSync: "1 hour ago" },
    { id: "naukri", name: "Naukri Recruiter", category: "job_portals", connectionStatus: "disconnected" },
    { id: "foundit", name: "Foundit (Monster)", category: "job_portals", connectionStatus: "connected", connectedAccount: "monster_it_procurement", lastSync: "4 hours ago" },
    { id: "glassdoor", name: "Glassdoor Business", category: "job_portals", connectionStatus: "error", lastSync: "Failed on Jul 15" },
    { id: "career_site", name: "Company Career Website", category: "job_portals", connectionStatus: "connected", connectedAccount: "https://careers.encureit.com", lastSync: "Just now" },

    // Category: Calendars
    { 
      id: "gcal", 
      name: "Google Calendar", 
      category: "calendars", 
      connectionStatus: "disconnected", 
      details: { syncInterviews: true, duration: 45, tz: "Asia/Kolkata (IST)", autoCreate: true }
    },
    { 
      id: "outlook_cal", 
      name: "Microsoft Outlook Calendar", 
      category: "calendars", 
      connectionStatus: "disconnected",
      details: { syncInterviews: false, duration: 30, tz: "UTC", autoCreate: false }
    },

    // Category: Video Interview Platforms
    { id: "gmeet", name: "Google Meet", category: "video_platforms", connectionStatus: "disconnected", details: { isDefault: true, autoGenLink: true } },
    { id: "teams", name: "Microsoft Teams", category: "video_platforms", connectionStatus: "disconnected", details: { isDefault: false, autoGenLink: false } },
    { id: "zoom", name: "Zoom Video Rooms", category: "video_platforms", connectionStatus: "connected", connectedAccount: "zoom_corporate_pro_3", details: { isDefault: false, autoGenLink: true } },

    // Category: Email Services
    { id: "smtp", name: "SMTP Relay", category: "emails", connectionStatus: "connected", connectedAccount: "smtp.encureit-mail.com:587", details: { sender: "no-reply@encureit.com", hasSignature: true } },
    { id: "outlook_mail", name: "Microsoft Outlook Mail", category: "disconnected", connectionStatus: "disconnected" },
    { id: "gmail_api", name: "Gmail API Service", category: "emails", connectionStatus: "connected", connectedAccount: "hr-comms@encureit.com", details: { sender: "aditi.j@encureit.com", hasSignature: true } },
    { id: "sendgrid", name: "SendGrid Comms", category: "emails", connectionStatus: "connected", connectedAccount: "sg_api_sub_recruit", details: { sender: "system@encureit.com", hasSignature: false } },

    // Category: Communication Platforms
    { id: "slack", name: "Slack Notifications", category: "comms", connectionStatus: "connected", connectedAccount: "#recruiting-pipeline", details: { sendHiring: true, sendInterviews: true, sendOffers: true } },
    { id: "teams_chat", name: "Microsoft Teams Chat", category: "comms", connectionStatus: "disconnected", details: { sendHiring: false, sendInterviews: false, sendOffers: false } },
    { id: "discord", name: "Discord Webhook", category: "comms", connectionStatus: "error", lastSync: "Failed to post webhook", details: { sendHiring: true, sendInterviews: false, sendOffers: false } },

    // Category: AI Services
    { id: "gemini", name: "Gemini Pro Engine", category: "ai", connectionStatus: "connected", lastSync: "3 secs ago", details: { apiStatus: "Optimal", requestsCount: 4210, latency: "230ms" }, hasConfigureModal: true },
    { id: "openai", name: "OpenAI GPT-4o", category: "ai", connectionStatus: "connected", lastSync: "2 mins ago", details: { apiStatus: "Optimal", requestsCount: 1530, latency: "420ms" }, hasConfigureModal: true },
    { id: "parser", name: "Aura Resume Parser", category: "ai", connectionStatus: "connected", lastSync: "Just now", details: { apiStatus: "Optimal", requestsCount: 890, latency: "120ms" }, hasConfigureModal: false },
    { id: "nlp", name: "NLP Sentiment Analyzer", category: "ai", connectionStatus: "error", lastSync: "Invalid API Key", details: { apiStatus: "Unreachable", requestsCount: 0, latency: "N/A" }, hasConfigureModal: true },

    // Category: Background Verification
    { id: "hireright", name: "HireRight Screening", category: "bg_verification", connectionStatus: "connected", connectedAccount: "HR_ENC_9829", details: { verifStatus: "Active" } },
    { id: "first_adv", name: "First Advantage", category: "bg_verification", connectionStatus: "disconnected", details: { verifStatus: "None" } },
    { id: "checkr", name: "Checkr API", category: "bg_verification", connectionStatus: "connected", connectedAccount: "chk_enterprise_prod", details: { verifStatus: "Active" } }
  ]);

  // Syncing state tracker
  const [syncingId, setSyncingId] = useState<string | null>(null);
  // Testing connection state tracker
  const [testingId, setTestingId] = useState<string | null>(null);
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  // Configuration modal state
  const [configService, setConfigService] = useState<IntegrationService | null>(null);
  const [tempApiKey, setTempApiKey] = useState("");
  const [serviceIdPendingDisconnect, setServiceIdPendingDisconnect] = useState<string | null>(null);
  const [previewSignatureId, setPreviewSignatureId] = useState<string | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load connection status from backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get("/api/auth/google/status");
        if (res.data.connected) {
          setServices(prev => prev.map(s => {
            if (s.id === "gcal") {
              return { 
                ...s, 
                connectionStatus: "connected", 
                connectedAccount: res.data.email,
                lastSync: res.data.connectedAt ? "Connected on " + new Date(res.data.connectedAt).toLocaleDateString() : "Active" 
              };
            }
            if (s.id === "gmeet") {
              return {
                ...s,
                connectionStatus: "connected",
                connectedAccount: res.data.email
              };
            }
            return s;
          }));
        } else {
          setServices(prev => prev.map(s => {
            if (s.id === "gcal" || s.id === "gmeet") {
              return { ...s, connectionStatus: "disconnected", connectedAccount: undefined };
            }
            return s;
          }));
        }
      } catch (err) {
        console.error("Failed to load Google Calendar connection status:", err);
      }
    };
    fetchStatus();
  }, []);

  // Connect / Disconnect Handler
  const handleToggleConnection = async (id: string, skipConfirm = false) => {
    if (id === "gcal" || id === "gmeet") {
      const isConnected = services.find(s => s.id === id)?.connectionStatus === "connected";
      if (isConnected) {
        if (!skipConfirm && serviceIdPendingDisconnect !== id) {
          setServiceIdPendingDisconnect(id);
          return;
        }

        try {
          await axios.post("/api/auth/google/disconnect");
          setServices(prev => prev.map(s => {
            if (s.id === "gcal" || s.id === "gmeet") {
              return { ...s, connectionStatus: "disconnected", connectedAccount: undefined };
            }
            return s;
          }));
          triggerToast("🔌 Disconnected from Google Workspace successfully.", "info");
        } catch (e) {
          triggerToast("Failed to disconnect from Google account.", "error");
        } finally {
          setServiceIdPendingDisconnect(null);
        }
      } else {
        try {
          triggerToast("Initiating secure Google Workspace login...", "info");
          const authResult = await googleSignIn();
          if (authResult) {
            setServices(prev => prev.map(s => {
              if (s.id === "gcal" || s.id === "gmeet") {
                return { 
                  ...s, 
                  connectionStatus: "connected", 
                  connectedAccount: authResult.email,
                  lastSync: "Connected just now"
                };
              }
              return s;
            }));
            triggerToast(`✅ Connected as ${authResult.email}! Google Calendar and Google Meet are fully integrated.`, "success");
          }
        } catch (authError) {
          triggerToast("Google Sign-In was cancelled or failed to connect.", "error");
        }
      }
      return;
    }

    setServices(prev => prev.map(s => {
      if (s.id === id) {
        const isCurrentlyConnected = s.connectionStatus === "connected" || s.connectionStatus === "error";
        if (isCurrentlyConnected) {
          triggerToast(`🔌 Disconnected from ${s.name} successfully.`, "info");
          return { ...s, connectionStatus: "disconnected", connectedAccount: undefined };
        } else {
          triggerToast(`✅ Connected to ${s.name}! Initializing sync pipeline...`, "success");
          return { 
            ...s, 
            connectionStatus: "connected", 
            connectedAccount: s.category === "calendars" ? "hr-calendar@encureit.com" : "admin_manual_auth",
            lastSync: "Just now"
          };
        }
      }
      return s;
    }));
  };

  // Sync Now Handler
  const handleSyncNow = async (id: string, name: string) => {
    if (id === "gcal") {
      setSyncingId(id);
      triggerToast("🔄 Synchronizing interviews with Google Calendar...", "info");
      try {
        const res = await axios.post("/api/interviews/sync-gcal");
        setSyncingId(null);
        triggerToast(`✨ GCal Sync Complete! Synchronized ${res.data.updatedCount || 0} event changes with Google Calendar.`, "success");
      } catch (err) {
        setSyncingId(null);
        triggerToast("Failed to sync with Google Calendar. Ensure your account is connected.", "error");
      }
      return;
    }

    setSyncingId(id);
    triggerToast(`🔄 Initiated manual synchronization for ${name}...`, "info");
    setTimeout(() => {
      setServices(prev => prev.map(s => {
        if (s.id === id) {
          return { ...s, lastSync: "Just now", connectionStatus: "connected" };
        }
        return s;
      }));
      setSyncingId(null);
      triggerToast(`✨ Successfully synchronized all records with ${name}!`, "success");
    }, 1800);
  };

  // Test Connection Handler
  const handleTestConnection = (id: string, name: string) => {
    setTestingId(id);
    triggerToast(`⚡ Pinging API endpoints for ${name}...`, "info");
    setTimeout(() => {
      setTestingId(null);
      const isOk = Math.random() > 0.15; // 85% success rate for simulation
      if (isOk) {
        triggerToast(`🟢 Connection test PASSED for ${name}. Latency: ${Math.floor(Math.random() * 200) + 80}ms`, "success");
      } else {
        triggerToast(`🔴 Connection test FAILED for ${name}. Handshake timeout.`, "error");
      }
    }, 1500);
  };

  // Save Config handler
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configService) return;
    
    setServices(prev => prev.map(s => {
      if (s.id === configService.id) {
        return { 
          ...s, 
          connectionStatus: "connected",
          details: { ...s.details, apiStatus: "Optimal", lastVerifiedKey: tempApiKey.substring(0, 6) + "..." }
        };
      }
      return s;
    }));

    triggerToast(`🔑 Saved configurations and updated credentials for ${configService.name}.`, "success");
    setConfigService(null);
    setTempApiKey("");
  };

  // Group services by category
  const jobPortals = services.filter(s => s.category === "job_portals");
  const calendars = services.filter(s => s.category === "calendars");
  const videoPlatforms = services.filter(s => s.category === "video_platforms");
  const emails = services.filter(s => s.category === "emails");
  const comms = services.filter(s => s.category === "comms");
  const aiServices = services.filter(s => s.category === "ai");
  const bgVerification = services.filter(s => s.category === "bg_verification");

  // Health summary metrics
  const totalConnected = services.filter(s => s.connectionStatus === "connected").length;
  const totalPending = services.filter(s => s.connectionStatus === "disconnected").length;
  const totalFailed = services.filter(s => s.connectionStatus === "error").length;

  // Access Restricted View if not Admin/HR
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
        <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-200 dark:border-rose-900/30">
          <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="font-display font-black text-2xl text-slate-950 dark:text-white tracking-tight text-center">
          Access Restricted
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md text-center">
          The Integrations Hub is reserved exclusively for HR Directors, Executives, and System Administrators. Your current role (<span className="font-mono font-bold text-slate-800 dark:text-slate-200">{userRole}</span>) does not have permission to view or manage third-party APIs.
        </p>
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mt-6 max-w-md">
          <div className="flex gap-3 items-start">
            <Lock className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Need access?</span>
              <span className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Contact your IT Administrator or Chief Recruiting Officer to elevate your profile permissions to "Admin" inside the Settings menu.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Administration</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Integrations</span>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all transform translate-y-0 scale-100 ${
          toast.type === "success" 
            ? "bg-slate-900 border-indigo-500/30 text-white" 
            : toast.type === "error" 
              ? "bg-rose-950 border-rose-900/50 text-rose-100" 
              : "bg-slate-950 border-slate-800 text-slate-200"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : toast.type === "error" ? (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-indigo-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Link className="h-7 w-7 text-indigo-600 shrink-0" />
            <span>Integrations Hub</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-3xl">
            Configure, monitor, and synchronize your central Applicant Tracking System with external job boards, company career channels, video engines, calendars, secure back-office verification systems, and state-of-the-art AI parsing modules.
          </p>
        </div>

        {/* Global Hub Action */}
        <button 
          onClick={() => {
            triggerToast("⚡ Initiated comprehensive system-wide integration refresh...", "info");
            setSyncingId("global");
            setTimeout(() => {
              setSyncingId(null);
              triggerToast("🟢 All connected enterprise channels synchronized successfully!", "success");
            }, 2000);
          }}
          disabled={syncingId !== null}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${syncingId === "global" ? "animate-spin" : ""}`} />
          <span>Sync All Active Services</span>
        </button>
      </div>

      {/* SECTION 1: Job Portals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Briefcase className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Job Portals & Distribution</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobPortals.map((job) => (
            <div key={job.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  {/* Service Logo & Name */}
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                      job.id === "linkedin" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                      job.id === "indeed" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" :
                      job.id === "naukri" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                      job.id === "foundit" ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" :
                      job.id === "glassdoor" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {job.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{job.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">distribution channel</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
                    job.connectionStatus === "connected" 
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400" 
                      : job.connectionStatus === "error"
                        ? "bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-400 animate-pulse"
                        : "bg-slate-100 border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      job.connectionStatus === "connected" ? "bg-emerald-500" :
                      job.connectionStatus === "error" ? "bg-rose-500" : "bg-slate-400"
                    }`} />
                    {job.connectionStatus === "connected" ? "CONNECTED" : job.connectionStatus === "error" ? "ERROR" : "DISCONNECTED"}
                  </span>
                </div>

                {/* Account Details */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Connected ID:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono truncate max-w-[150px]">
                      {job.connectedAccount || "Not authenticated"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Last Sync:</span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {job.lastSync || "Never"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action footer buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 shrink-0">
                <button
                  onClick={() => handleToggleConnection(job.id)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all border ${
                    job.connectionStatus === "connected" || job.connectionStatus === "error"
                      ? "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100/50 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {job.connectionStatus === "connected" || job.connectionStatus === "error" ? "Disconnect" : "Connect Now"}
                </button>

                <button
                  onClick={() => handleSyncNow(job.id, job.name)}
                  disabled={job.connectionStatus !== "connected" || syncingId === job.id}
                  className="px-3 py-1.5 rounded-md text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:disabled:bg-slate-950 dark:disabled:text-slate-600 cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${syncingId === job.id ? "animate-spin" : ""}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Calendar Integrations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Calendar Integrations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {calendars.map((cal) => (
            <div key={cal.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    cal.id === "gcal" ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300" : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                  }`}>
                    {cal.id === "gcal" ? "G" : "O"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cal.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Interview Scheduling Sync</span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
                  cal.connectionStatus === "connected" 
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400" 
                    : "bg-slate-100 border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cal.connectionStatus === "connected" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {cal.connectionStatus === "connected" ? "CONNECTED" : "DISCONNECTED"}
                </span>
              </div>

              {/* Advanced Calendar Options (Form controls inside cards) */}
              <div className="mt-5 space-y-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Option 1: Connect Calendar */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider">Sync Active</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id={`sync-${cal.id}`}
                        disabled={cal.connectionStatus !== "connected"}
                        checked={cal.details?.syncInterviews || false}
                        onChange={(e) => {
                          setServices(prev => prev.map(s => s.id === cal.id ? { ...s, details: { ...s.details, syncInterviews: e.target.checked } } : s));
                          triggerToast(`📅 Updated scheduling sync setting for ${cal.name}.`);
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label htmlFor={`sync-${cal.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Sync Interviews
                      </label>
                    </div>
                  </div>

                  {/* Option 2: Auto Create Interview Events */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider">Auto creation</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id={`autocreate-${cal.id}`}
                        disabled={cal.connectionStatus !== "connected"}
                        checked={cal.details?.autoCreate || false}
                        onChange={(e) => {
                          setServices(prev => prev.map(s => s.id === cal.id ? { ...s, details: { ...s.details, autoCreate: e.target.checked } } : s));
                          triggerToast(`⚡ Configured auto-invite event delivery for scheduled interviews.`);
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <label htmlFor={`autocreate-${cal.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Auto Calendar Invites
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  {/* Option 3: Default Meeting Duration */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider">Default Duration</label>
                    <select
                      disabled={cal.connectionStatus !== "connected"}
                      value={cal.details?.duration || 30}
                      onChange={(e) => {
                        setServices(prev => prev.map(s => s.id === cal.id ? { ...s, details: { ...s.details, duration: Number(e.target.value) } } : s));
                        triggerToast(`⏱️ Set default interview duration to ${e.target.value} minutes.`);
                      }}
                      className="w-full text-xs font-semibold px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden disabled:bg-slate-100 dark:disabled:bg-slate-950 dark:text-slate-200"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                    </select>
                  </div>

                  {/* Option 4: Time Zone */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider">Time Zone</label>
                    <select
                      disabled={cal.connectionStatus !== "connected"}
                      value={cal.details?.tz || "Asia/Kolkata (IST)"}
                      onChange={(e) => {
                        setServices(prev => prev.map(s => s.id === cal.id ? { ...s, details: { ...s.details, tz: e.target.value } } : s));
                        triggerToast(`🌐 Calendar timezone synchronized to: ${e.target.value}`);
                      }}
                      className="w-full text-xs font-semibold px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden disabled:bg-slate-100 dark:disabled:bg-slate-950 dark:text-slate-200"
                    >
                      <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC / Coordinated Time</option>
                      <option value="America/New_York (EST)">New York (EST)</option>
                      <option value="Europe/London (GMT)">London (GMT)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                {serviceIdPendingDisconnect === cal.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleConnection(cal.id, true)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all"
                    >
                      Disconnect?
                    </button>
                    <button
                      onClick={() => setServiceIdPendingDisconnect(null)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer transition-all dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleConnection(cal.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                      cal.connectionStatus === "connected"
                        ? "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100/50 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {cal.connectionStatus === "connected" ? "Disconnect Calendar" : "Connect Calendar"}
                  </button>
                )}

                <button
                  onClick={() => handleTestConnection(cal.id, cal.name)}
                  disabled={cal.connectionStatus !== "connected" || testingId === cal.id}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-950 dark:disabled:text-slate-600 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  {testingId === cal.id && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Test Connection</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Video Interview Platforms */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Video className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Video Interview Platforms</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {videoPlatforms.map((vid) => (
            <div key={vid.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-2xl">{vid.id === "gmeet" ? "🟢" : vid.id === "teams" ? "🟣" : "🔵"}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
                    vid.connectionStatus === "connected" 
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400" 
                      : "bg-slate-100 border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                  }`}>
                    {vid.connectionStatus === "connected" ? "CONNECTED" : "DISCONNECTED"}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{vid.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Automated video link generator</p>
                </div>

                {/* Status Options */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Default Meeting Platform</span>
                    <button
                      disabled={vid.connectionStatus !== "connected"}
                      onClick={() => {
                        setServices(prev => prev.map(s => {
                          if (s.category === "video_platforms") {
                            return { ...s, details: { ...s.details, isDefault: s.id === vid.id } };
                          }
                          return s;
                        }));
                        triggerToast(`🎯 ${vid.name} is now set as your primary video conference platform.`);
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer ${
                        vid.details?.isDefault
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                    >
                      {vid.details?.isDefault ? "PRIMARY" : "SET DEFAULT"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Generate Room Link</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {vid.connectionStatus === "connected" ? "On Schedule" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2 justify-between">
                {serviceIdPendingDisconnect === vid.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleConnection(vid.id, true)}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Disconnect?
                    </button>
                    <button
                      onClick={() => setServiceIdPendingDisconnect(null)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleConnection(vid.id)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {vid.connectionStatus === "connected" ? "Disconnect" : "Connect"}
                  </button>
                )}

                <button
                  disabled={vid.connectionStatus !== "connected" || testingId === vid.id}
                  onClick={() => {
                    setTestingId(vid.id);
                    triggerToast(`🔗 Creating live sandbox room for ${vid.name}...`, "info");
                    setTimeout(() => {
                      setTestingId(null);
                      triggerToast(`🚀 Success! Standard room generated: https://meet.encureit.com/test-${vid.id}`, "success");
                    }, 1200);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  {testingId === vid.id && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Test API Link</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Email Services */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Mail className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Email Services & Relays</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {emails.map((mail) => (
            <div key={mail.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Mail className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide font-mono ${
                    mail.connectionStatus === "connected" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {mail.connectionStatus === "connected" ? "CONNECTED" : "INACTIVE"}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{mail.name}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{mail.connectedAccount || "no-reply-comms"}</p>
                </div>

                {/* Sub configuration options */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2 text-[11px]">
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Sender Email Address:</span>
                    <input 
                      type="text" 
                      placeholder="e.g. support@corp.com"
                      disabled={mail.connectionStatus !== "connected"}
                      value={mail.details?.sender || ""}
                      onChange={(e) => {
                        setServices(prev => prev.map(s => s.id === mail.id ? { ...s, details: { ...s.details, sender: e.target.value } } : s));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded font-mono text-[10px] focus:outline-hidden dark:text-slate-200"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Signature HTML:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {mail.details?.hasSignature ? "Active (Preview Available)" : "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions block */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                <button
                  disabled={mail.connectionStatus !== "connected"}
                  onClick={() => {
                    triggerToast(`📧 Sent testing email relay template to ${currentUser?.email || "aditijadhav2828@gmail.com"} from ${mail.details?.sender || "system"}`);
                  }}
                  className="w-full text-center py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-40"
                >
                  Test Outbound Email
                </button>

                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <button
                    onClick={() => handleToggleConnection(mail.id)}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {mail.connectionStatus === "connected" ? "Disconnect" : "Connect"}
                  </button>
                  <div className="relative">
                    <button
                      disabled={!mail.details?.hasSignature}
                      onClick={() => {
                        setPreviewSignatureId(previewSignatureId === mail.id ? null : mail.id);
                      }}
                      className="text-slate-400 hover:text-slate-600 font-bold transition-all"
                    >
                      Preview Signature
                    </button>
                    {previewSignatureId === mail.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 text-left text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-100 dark:border-slate-700">
                          <span className="font-bold text-[10px] text-slate-400 uppercase">Signature Preview</span>
                          <button onClick={() => setPreviewSignatureId(null)} className="text-slate-400 hover:text-slate-600 text-[10px]">✕</button>
                        </div>
                        <div className="font-serif leading-relaxed italic">
                          Kind Regards,<br />
                          <strong>{currentUser?.name || "Aditi Jadhav"}</strong><br />
                          <span className="text-[11px] text-slate-500">{currentUser?.role || "HR Executive"}</span><br />
                          <span className="text-indigo-600 dark:text-indigo-400 font-sans text-[10px] font-semibold">encureIT Technologies</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: Communication Platforms */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Communication Platforms & Webhooks</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {comms.map((comm) => (
            <div key={comm.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xl font-mono">{comm.id === "slack" ? "💬 Slack" : comm.id === "teams_chat" ? "👥 Teams" : "👾 Discord"}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
                    comm.connectionStatus === "connected" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                    comm.connectionStatus === "error" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400" :
                    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {comm.connectionStatus === "connected" ? "ACTIVE" : comm.connectionStatus === "error" ? "ERROR" : "INACTIVE"}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Hook: {comm.connectedAccount || "None"}</h4>
                </div>

                {/* Integration Checkbox configurations */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Send Hiring Notifications</span>
                    <input 
                      type="checkbox" 
                      disabled={comm.connectionStatus !== "connected"}
                      checked={comm.details?.sendHiring || false}
                      onChange={(e) => {
                        setServices(prev => prev.map(s => s.id === comm.id ? { ...s, details: { ...s.details, sendHiring: e.target.checked } } : s));
                        triggerToast(`📢 Configured Slack hiring dispatch alert preference.`);
                      }}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Interview Notifications</span>
                    <input 
                      type="checkbox" 
                      disabled={comm.connectionStatus !== "connected"}
                      checked={comm.details?.sendInterviews || false}
                      onChange={(e) => {
                        setServices(prev => prev.map(s => s.id === comm.id ? { ...s, details: { ...s.details, sendInterviews: e.target.checked } } : s));
                        triggerToast(`📢 Configured Slack interview schedule dispatch alert preference.`);
                      }}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Offer Notifications</span>
                    <input 
                      type="checkbox" 
                      disabled={comm.connectionStatus !== "connected"}
                      checked={comm.details?.sendOffers || false}
                      onChange={(e) => {
                        setServices(prev => prev.map(s => s.id === comm.id ? { ...s, details: { ...s.details, sendOffers: e.target.checked } } : s));
                        triggerToast(`📢 Configured Slack active candidate offers dispatch alert preference.`);
                      }}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Connection Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
                <button
                  onClick={() => handleToggleConnection(comm.id)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {comm.connectionStatus === "connected" || comm.connectionStatus === "error" ? "Disconnect Webhook" : "Connect Webhook"}
                </button>

                <button
                  disabled={comm.connectionStatus !== "connected"}
                  onClick={() => {
                    triggerToast(`💬 Dispatched test payload to ${comm.connectedAccount || "channel"}`);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Send Test Message
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: AI Services */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">AI Services & Models</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {aiServices.map((ai) => (
            <div key={ai.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:shadow-xl hover:border-slate-700 text-white flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide font-mono ${
                    ai.connectionStatus === "connected" ? "bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 animate-pulse" : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {ai.connectionStatus === "connected" ? "ACTIVE" : "ERROR"}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-bold font-display">{ai.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Status: {ai.details?.apiStatus}</p>
                </div>

                {/* Request Analytics */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-[10.5px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>API Latency:</span>
                    <span className="text-white font-bold">{ai.details?.latency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requests Run:</span>
                    <span className="text-indigo-400 font-bold">{ai.details?.requestsCount} calls</span>
                  </div>
                </div>
              </div>

              {/* AI Key configuration controls */}
              <div className="mt-5 pt-3 border-t border-slate-800 space-y-2 shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setConfigService(ai);
                      setTempApiKey("API_KEY_SECURE_HASH_77209");
                    }}
                    className="flex-1 py-1.5 text-center text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded cursor-pointer transition-all"
                  >
                    Configure API
                  </button>
                  <button
                    onClick={() => {
                      triggerToast(`⚡ Testing API handshake for ${ai.name}...`, "info");
                      setTimeout(() => {
                        if (ai.id === "nlp") {
                          triggerToast(`🔴 Error: Invalid Token signature for NLP.`, "error");
                        } else {
                          triggerToast(`🟢 Handshake verified! ${ai.name} response code 200 OK.`, "success");
                        }
                      }, 1200);
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 7: Background Verification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Background Verification Providers</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {bgVerification.map((bg) => (
            <div key={bg.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
                    bg.connectionStatus === "connected" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {bg.connectionStatus === "connected" ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{bg.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Automated screening & background checks</p>
                </div>

                {/* Verification Metadata */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification Stage Status:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{bg.details?.verifStatus === "Active" ? "✓ Fully Operational" : "Unlinked"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auth Token ID:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">{bg.connectedAccount || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2 justify-between">
                <button
                  onClick={() => handleToggleConnection(bg.id)}
                  className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                    bg.connectionStatus === "connected"
                      ? "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100/50 dark:border-rose-900/30 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {bg.connectionStatus === "connected" ? "Disconnect Channel" : "Connect"}
                </button>

                <button
                  disabled={bg.connectionStatus !== "connected"}
                  onClick={() => {
                    triggerToast(`🛡️ HireRight API sandbox connection: SUCCESS. Checked status code 200.`);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Test Connection
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 8: Integration Health Summary */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Sliders className="h-4.5 w-4.5 text-slate-400" />
          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white tracking-tight">Integration Health Summary</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold font-mono block uppercase tracking-wider">Connected Services</span>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">{totalConnected}</span>
            <p className="text-[10px] text-slate-400 mt-1">Services syncing optimal</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold font-mono block uppercase tracking-wider">Pending Connections</span>
            <span className="text-3xl font-black text-slate-500 mt-1 block font-mono">{totalPending}</span>
            <p className="text-[10px] text-slate-400 mt-1">Available third-party modules</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold font-mono block uppercase tracking-wider">Failed Connections</span>
            <span className="text-3xl font-black text-rose-500 mt-1 block font-mono">{totalFailed}</span>
            <p className="text-[10px] text-slate-400 mt-1">Requires re-authorization</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold font-mono block uppercase tracking-wider">Last Successful Sync</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 block truncate">
              Today, 3:15 AM
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Autonomous pipeline run</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4">
            <span className="text-[10px] text-slate-400 font-bold font-mono block uppercase tracking-wider">Last Failed Sync</span>
            <span className="text-xs font-bold text-rose-500 mt-2 block truncate">
              Jul 15, 11:42 PM
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Glassdoor credential expired</p>
          </div>
        </div>
      </div>

      {/* Configure API Slide-over / Modal (Dummy configuration) */}
      {configService && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setConfigService(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XCircle className="h-6 w-6" />
            </button>

            <div className="flex gap-3 items-center mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white">Configure API Secret</h3>
                <p className="text-xs text-slate-400">{configService.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Secure API Token / Key</label>
                <input 
                  type="password" 
                  required
                  placeholder="Paste your private API key here"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 dark:text-slate-100"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>API secret configurations are safely preserved in the environment session memory and never transmitted to our external databases without standard Transport Layer Security (TLS) handshake procedures.</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfigService(null)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/15"
                >
                  Save Integration Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
