/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useTranslation } from "../utils/i18n";
import { simulateResumeExtraction } from "../utils/resumeParser";
import { formatJobId, cleanJobTitle } from "../repositories/repositoryUtils";
import { 
  isNewCandidate,
  isPendingEvaluation, 
  isAIShortlisted, 
  isInterviewStage, 
  isOfferedStage, 
  isHiredStage, 
  isRejectedStage, 
  isTodayCandidate,
  filterCandidatesByStage,
  normalizeCandidateStatus
} from "../utils/pipelineUtils";
import { 
  Users, 
  Sparkles, 
  Mail, 
  Phone, 
  Linkedin, 
  ChevronRight, 
  CheckCircle2, 
  Calendar,
  AlertTriangle, 
  Briefcase, 
  GraduationCap,
  Plus, 
  X, 
  Loader2,
  ListTodo,
  FileText,
  User,
  Activity,
  UserCheck,
  Award,
  MapPin,
  Search,
  Filter,
  ExternalLink,
  Eye,
  Upload,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Globe,
  Building2,
  Copy,
  Send,
  Check,
  Clock,
  UserPlus,
  DollarSign,
  ShieldAlert,
  ClipboardCheck,
  Sliders,
  Kanban,
  List,
  XCircle,
  ChevronDown,
  AlertCircle,
  Trash2,
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Application, ApplicationStatus, Candidate, Job, AIEvaluation } from "../types";
import { LocalStorageService } from "../services/localStorageService";
import { CandidateRepository, ApplicationRepository, JobRepository, InterviewRepository, TalentPoolRepository } from "../repositories";
import { CandidateWorkflowService } from "../services/workflowService";

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "https://ats-fastapi-backend.onrender.com";
const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export const formatTotalExperience = (totalMonths?: number | null, totalExpStr?: string | null, expYears?: number | null): string => {
  let m = 0;
  if (typeof totalMonths === "number" && totalMonths >= 0) {
    m = totalMonths;
  } else if (typeof expYears === "number" && expYears > 0) {
    m = Math.round(expYears * 12);
  } else if (totalExpStr && totalExpStr.trim()) {
    const s = totalExpStr.toLowerCase().trim();
    if (s.includes("fresher")) return "0 years 0 months";
    const ymMatch = s.match(/(\d+)\s*(?:years?|yrs?)\s*(\d+)?\s*(?:months?|mos?)?/);
    if (ymMatch) {
      const yrs = parseInt(ymMatch[1], 10);
      const mos = ymMatch[2] ? parseInt(ymMatch[2], 10) : 0;
      m = yrs * 12 + mos;
    } else {
      const mMatch = s.match(/(\d+)\s*(?:months?|mos?)/);
      if (mMatch) m = parseInt(mMatch[1], 10);
    }
  }

  const years = Math.floor(m / 12);
  const months = m % 12;
  const yStr = `${years} ${years === 1 ? "year" : "years"}`;
  const mStr = `${months} ${months === 1 ? "month" : "months"}`;
  return `${yStr} ${mStr}`;
};

interface CandidatesViewProps {
  initialSelectedApp: Application | null;
  clearInitialSelection: () => void;
  initialFilterStatus?: string;
  clearInitialFilterStatus?: () => void;
  initialFilterToday?: boolean;
  clearInitialFilterToday?: () => void;
  initialFilterJobId?: string;
  clearInitialFilterJobId?: () => void;
  initialSortBy?: "date" | "score";
  clearInitialSortBy?: () => void;
}

const getInitials = (firstName?: string, lastName?: string, name?: string) => {
  if (firstName || lastName) {
    return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "CN";
  }
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    if (parts.length === 1) return (parts[0][0] || "C").toUpperCase();
  }
  return "CN";
};

export default function CandidatesView({ 
  initialSelectedApp, 
  clearInitialSelection,
  initialFilterStatus,
  clearInitialFilterStatus,
  initialFilterToday,
  clearInitialFilterToday,
  initialFilterJobId,
  clearInitialFilterJobId,
  initialSortBy,
  clearInitialSortBy
}: CandidatesViewProps) {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [candidateApplications, setCandidateApplications] = useState<any[]>([]);

  useEffect(() => {
    async function loadCandidateApps() {
      const c = selectedApp?.candidate || selectedApp;
      const candId = c?.id || selectedApp?.candidateId || c?.candidateId;
      const email = c?.email || selectedApp?.candidateEmail;
      const identifier = candId || email;

      if (identifier) {
        try {
          const apps = await ApplicationRepository.getApplicationsByCandidateId(identifier);
          setCandidateApplications(apps);
        } catch (e) {
          setCandidateApplications([]);
        }
        setTimeout(() => {
          document.getElementById("deep-dive-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else {
        setCandidateApplications([]);
      }
    }
    loadCandidateApps();
  }, [selectedApp]);

  // Editing Modal & Detailed Form State
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [appIdPendingDelete, setAppIdPendingDelete] = useState<string | null>(null);

  const handleOpenEditModal = (cand: any, app?: any) => {
    setEditingCandidate(cand);
    setFirstName(cand?.firstName || "");
    setLastName(cand?.lastName || "");
    setEmail(cand?.email || "");
    setPhone(cand?.phone || "");
    setCurrentRole(cand?.currentRole || "");
    setCurrentCompany(cand?.currentCompany || "");
    setSelectedJobId(app?.jobId || cand?.jobId || (jobs && jobs[0]?.id) || "JOB-0001");
    setExperienceYears(cand?.experienceYears || 0);
    setSource(cand?.source || app?.source || "LinkedIn");
    setCandidateLocation(cand?.location || "Pune, India");
    setAddCurrentCTC(cand?.currentCTC || cand?.customFields?.currentCTC || 0);
    setAddExpectedCTC(cand?.expectedCTC || cand?.customFields?.expectedCTC || 0);
    setAddHRApprovalStatus(cand?.hrApprovalStatus || "pending");
    setAddHRNotes(cand?.hrNotes || cand?.evaluationNotes || "");
    setSkillsText(Array.isArray(cand?.skills) ? cand.skills.join(", ") : (cand?.skills || ""));
    setAddExperienceLevel((cand?.experienceYears && cand.experienceYears > 0) || cand?.currentCompany ? "Experienced" : "Fresher");
    setShowEditModal(true);
  };

  const handleSaveEditCandidate = async () => {
    if (!editingCandidate) return;
    setUpdatingTracker(true);
    try {
      const payload: any = {
        firstName,
        lastName,
        email,
        phone,
        currentRole,
        currentCompany,
        jobId: selectedJobId,
        experienceYears: Number(experienceYears) || 0,
        source,
        location: candidateLocation,
        currentCTC: Number(addCurrentCTC) || 0,
        expectedCTC: Number(addExpectedCTC) || 0,
        hrApprovalStatus: addHRApprovalStatus,
        hrNotes: addHRNotes,
        skills: skillsText ? skillsText.split(",").map((s: string) => s.trim()).filter(Boolean) : (editingCandidate.skills || [])
      };
      await axios.patch(`/api/candidates/${editingCandidate.id}`, payload);
      await fetchApplications();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      setShowEditModal(false);
      triggerToast("✅ Candidate details updated successfully!");
    } catch (err: any) {
      console.error("Failed to update candidate:", err);
      triggerToast("❌ Failed to update candidate details: " + (err?.response?.data?.detail || err.message));
    } finally {
      setUpdatingTracker(false);
    }
  };

  // Responsive Preferences
  const [density, setDensity] = useState(() => localStorage.getItem("setting_layout_density") || "comfortable");
  const [matchThreshold, setMatchThreshold] = useState(() => Number(localStorage.getItem("setting_match_threshold") || "80"));
  const [highFitHighlight, setHighFitHighlight] = useState(() => localStorage.getItem("setting_high_fit_highlight") !== "false");

  useEffect(() => {
    const handleSettings = () => {
      setDensity(localStorage.getItem("setting_layout_density") || "comfortable");
      setMatchThreshold(Number(localStorage.getItem("setting_match_threshold") || "80"));
      setHighFitHighlight(localStorage.getItem("setting_high_fit_highlight") !== "false");
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  // Today filter state
  const [filterToday, setFilterToday] = useState(false);

  useEffect(() => {
    if (initialFilterStatus && initialFilterStatus !== "all") {
      setFilterStatus(initialFilterStatus);
      if (clearInitialFilterStatus) {
        clearInitialFilterStatus();
      }
    }
  }, [initialFilterStatus, clearInitialFilterStatus]);

  useEffect(() => {
    if (initialFilterToday) {
      setFilterToday(true);
      if (clearInitialFilterToday) {
        clearInitialFilterToday();
      }
    }
  }, [initialFilterToday, clearInitialFilterToday]);

  useEffect(() => {
    if (initialFilterJobId && initialFilterJobId !== "all") {
      setFilterJobId(initialFilterJobId);
      if (clearInitialFilterJobId) {
        clearInitialFilterJobId();
      }
    }
  }, [initialFilterJobId, clearInitialFilterJobId]);

  useEffect(() => {
    if (initialSortBy) {
      setSortBy(initialSortBy);
      if (clearInitialSortBy) {
        clearInitialSortBy();
      }
    }
  }, [initialSortBy, clearInitialSortBy]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJobId, setFilterJobId] = useState("all");
  const [viewingResumeApp, setViewingResumeApp] = useState<any | null>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);
  const [resumeTextLoading, setResumeTextLoading] = useState<boolean>(false);
  const [resumeTextError, setResumeTextError] = useState<string | null>(null);

  useEffect(() => {
    if (viewingResumeApp) {
      const cand = viewingResumeApp.candidate;
      const candId =
        cand?.candidateId ||
        viewingResumeApp?.candidateId ||
        (typeof cand?.id === "string" && cand.id.startsWith("CAND-")
          ? cand.id
          : null);
      const storageKey =
        cand?.resumeStorageKey || viewingResumeApp.resumeStorageKey;

      // console.log("RESUME DEBUG:", {
      //   candId,
      //   candidateId: viewingResumeApp?.candidateId,
      //   candidateObjectId: cand?.id,
      //   candidateObjectCandidateId: cand?.candidateId,
      //   applicationId: viewingResumeApp?.applicationId,
      //   appId: viewingResumeApp?.id,
      //   storageKey,
      // });

      if (candId && storageKey) {
        setResumeTextLoading(true);
        setResumeTextError(null);
        CandidateRepository.getResumeText(candId)
          .then((res) => {
            setParsedResumeText(res.text);
            setResumeTextLoading(false);
          })
          .catch((err) => {
            console.warn("Failed to fetch parsed resume text:", err);
            setResumeTextError(
              err?.response?.status === 404
                ? "Resume not available."
                : "Failed to load resume from server."
            );
            setParsedResumeText(null);
            setResumeTextLoading(false);
          });
      } else {
        setParsedResumeText(null);
        setResumeTextError("Resume not available.");
        setResumeTextLoading(false);
      }
    } else {
      setParsedResumeText(null);
      setResumeTextError(null);
    }
  }, [viewingResumeApp]);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [currentRole, setCurrentRole] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [skillsText, setSkillsText] = useState(""); // Comma separated
  const [experienceYears, setExperienceYears] = useState(3);
  const [resumeText, setResumeText] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [source, setSource] = useState("LinkedIn");
  const [candidateLocation, setCandidateLocation] = useState("Pune, India");
  const [education, setEducation] = useState("");

  // New form states for CTC, notes, and approval status
  const [addCurrentCTC, setAddCurrentCTC] = useState<number>(0);
  const [addExpectedCTC, setAddExpectedCTC] = useState<number>(0);
  const [addHRNotes, setAddHRNotes] = useState<string>("");
  const [addHRApprovalStatus, setAddHRApprovalStatus] = useState<string>("pending");
  const [addExperienceLevel, setAddExperienceLevel] = useState<string>("Experienced"); // "Experienced" or "Fresher"
  const [addHighestDegree, setAddHighestDegree] = useState<string>("");
  const [addSpecialization, setAddSpecialization] = useState<string>("");
  const [addYearOfPassing, setAddYearOfPassing] = useState<string>("");
  const [addLinkedinLink, setAddLinkedinLink] = useState<string>("");
  const [addGithubLink, setAddGithubLink] = useState<string>("");
  const [manualCvFile, setManualCvFile] = useState<File | null>(null);
  const [manualCvBase64, setManualCvBase64] = useState<string>("");

  // Sorting & Top N High Match filter state
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [topN, setTopN] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Advanced filters state for CTC, Experience, and approvals
  const [filterMinExperience, setFilterMinExperience] = useState<string>("all");
  const [filterMaxCTC, setFilterMaxCTC] = useState<string>("all");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>("all");

  // New States for PDF Viewer, AI Action Center & Web Apply simulation
  const [viewMode, setViewMode] = useState<"pdf" | "text">("pdf");
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [activeActionTab, setActiveActionTab] = useState<"email" | "rubric" | "timezone" | "emailLogs" | "tracker">("email");
  const [copiedText, setCopiedText] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [boardViewMode, setBoardViewMode] = useState<"table" | "kanban">("table");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedApp, setDraggedApp] = useState<any | null>(null);
  const draggedAppRef = useRef<any | null>(null);
  const [activeHoverTarget, setActiveHoverTarget] = useState<"interview" | "offer" | "reject" | null>(null);

  // New Dialog/Modal States
  const [showDragSchedulerModal, setShowDragSchedulerModal] = useState(false);
  const [showDragOfferModal, setShowDragOfferModal] = useState(false);
  const [showDragRejectModal, setShowDragRejectModal] = useState(false);
  const [dragTargetApp, setDragTargetApp] = useState<any | null>(null);
  const [successAnimType, setSuccessAnimType] = useState<string | null>(null);

  // Form states for scheduler
  const [schedulerRound, setSchedulerRound] = useState("Technical Interview");
  const [schedulerInterviewer, setSchedulerInterviewer] = useState("");
  const [schedulerDate, setSchedulerDate] = useState("");
  const [schedulerTime, setSchedulerTime] = useState("10:00");
  const [schedulerType, setSchedulerType] = useState("Online");
  const [schedulerPlatform, setSchedulerPlatform] = useState("Google Meet");
  const [schedulerLocation, setSchedulerLocation] = useState("Main Office, Conf Room Alpha");
  const [schedulerNotes, setSchedulerNotes] = useState("");

  // Form states for offer
  const [offerSalary, setOfferSalary] = useState("12");
  const [offerNoticePeriod, setOfferNoticePeriod] = useState("Immediate");
  const [offerJoiningDate, setOfferJoiningDate] = useState("");
  const [offerExpiryDate, setOfferExpiryDate] = useState("");
  const [offerBenefits, setOfferBenefits] = useState("Comprehensive Health Insurance, Hybrid Work arrangement, Annual Wellness Reimbursement");
  const [offerManager, setOfferManager] = useState("");

  // Form states for reject
  const [rejectReason, setRejectReason] = useState("Skills Alignment");
  const [rejectSendEmail, setRejectSendEmail] = useState(true);
  const [rejectNotes, setRejectNotes] = useState("");

  // Prefill hook
  useEffect(() => {
    if (dragTargetApp) {
      setSchedulerInterviewer(dragTargetApp.job?.hiringManager || dragTargetApp.job?.recruiter || "Hiring Manager");
      setSchedulerNotes(`Technical evaluation for candidate: ${dragTargetApp.candidate?.firstName} ${dragTargetApp.candidate?.lastName} applying for ${dragTargetApp.job?.title || "Role"}`);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSchedulerDate(tomorrow.toISOString().split("T")[0]);

      setOfferSalary(String(dragTargetApp.candidate?.expectedCTC || "12"));
      const joinedDate = new Date();
      joinedDate.setDate(joinedDate.getDate() + 30);
      setOfferJoiningDate(joinedDate.toISOString().split("T")[0]);
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 7);
      setOfferExpiryDate(expDate.toISOString().split("T")[0]);
      setOfferManager(dragTargetApp.job?.hiringManager || "Hiring Manager");

      setRejectNotes(`Candidate ${dragTargetApp.candidate?.firstName} ${dragTargetApp.candidate?.lastName} does not match current required skills threshold for ${dragTargetApp.job?.title || "Role"}. Moving application to Rejected and archived.`);
    }
  }, [dragTargetApp]);

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // States for HR Tracker inputs
  const [newCustomKey, setNewCustomKey] = useState("");
  const [newCustomValue, setNewCustomValue] = useState("");
  const [updatingTracker, setUpdatingTracker] = useState(false);

  const handleExportCandidates = () => {
    try {
      if (applications.length === 0) {
        triggerToast("No candidates available to export.");
        return;
      }
      const headers = ["Candidate ID", "Application ID", "Name", "Email", "Phone", "Role", "Company", "Experience Yrs", "Expected CTC", "Status", "Score", "Location", "Source"];
      const rows = applications.map(app => {
        const c = app.candidate || {};
        const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
        return [
          app.candidateId || c.candidateId || "C001",
          app.id,
          `"${name.replace(/"/g, '""')}"`,
          `"${(c.email || "").replace(/"/g, '""')}"`,
          `"${(c.phone || "").replace(/"/g, '""')}"`,
          `"${(c.currentRole || "").replace(/"/g, '""')}"`,
          `"${(c.currentCompany || "").replace(/"/g, '""')}"`,
          c.experienceYears ?? "",
          c.expectedCTC ?? "",
          app.status,
          app.aiEvaluation?.score ?? "N/A",
          `"${(c.candidateLocation || "").replace(/"/g, '""')}"`,
          `"${(c.source || "").replace(/"/g, '""')}"`
        ];
      });
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("📥 Successfully exported candidates to CSV!");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failed to export candidates.");
    }
  };

  const handleImportClick = () => {
    const input = document.getElementById("import-file-input");
    if (input) {
      (input as HTMLInputElement).click();
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let importedCount = 0;

        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
          const list = Array.isArray(data) ? data : [data];
          for (const [i, item] of list.entries()) {
            await CandidateRepository.createApplication({
              firstName: item.firstName || "Imported",
              lastName: item.lastName || `Candidate ${i+1}`,
              email: item.email || `imported.user${i}@example.com`,
              phone: item.phone || "+91 99999 88888",
              currentRole: item.currentRole || "Software Engineer",
              currentCompany: item.currentCompany || "Previous Enterprise Tech",
              skills: item.skills || ["React", "Node.js", "TypeScript"],
              resumeText: item.resumeText || "Imported resume content.",
              location: item.location || "Bangalore, India",
              source: item.source || "LinkedIn",
              experienceYears: item.experienceYears || 4,
              expectedCTC: item.expectedCTC || 18,
              jobId: item.jobId || "JOB-0001",
              status: item.status || "NEW"
            });
            importedCount++;
          }
        } else {
          const lines = text.split("\n").filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            for (let i = 1; i < Math.min(lines.length, 10); i++) {
              const parts = lines[i].split(",").map(p => p.replace(/^"|"$/g, '').trim());
              if (parts.length >= 3) {
                await CandidateRepository.createApplication({
                  firstName: parts[0] || "CSV",
                  lastName: parts[1] || `Candidate ${i}`,
                  email: parts[2] || `csv.candidate${i}@example.com`,
                  phone: parts[3] || "+91 90000 12345",
                  currentRole: parts[4] || "Software Developer",
                  currentCompany: parts[5] || "Tech Corp",
                  skills: parts[6] ? parts[6].split(",") : ["JavaScript", "HTML", "CSS"],
                  resumeText: "CSV imported candidate.",
                  location: "Remote",
                  source: "CSV Import",
                  experienceYears: 3,
                  expectedCTC: 12,
                  jobId: "JOB-0001",
                  status: "NEW"
                });
                importedCount++;
              }
            }
          }
        }

        if (importedCount > 0) {
          await fetchApplications();
          triggerToast(`🎉 Successfully imported ${importedCount} candidate(s) from ${file.name}!`);
        } else {
          triggerToast("⚠️ No valid candidate rows were found in the uploaded file.");
        }
      } catch (err) {
        console.error(err);
        triggerToast("❌ Error parsing the candidate file.");
      }
    };
    reader.readAsText(file);
  };

  // States and Effects for HR Drafts Auto-Save
  const [draftExists, setDraftExists] = useState(false);

  useEffect(() => {
    // Check if draft exists on mount/modal open
    if (showAddModal) {
      const saved = localStorage.getItem("add_candidate_draft");
      if (saved) {
        setDraftExists(true);
      }
    }
  }, [showAddModal]);

  useEffect(() => {
    if (!showAddModal) return;
    const intervalSetting = localStorage.getItem("setting_autosave_interval") || "30s";
    if (intervalSetting === "disabled") return;

    let intervalMs = 30000;
    if (intervalSetting === "15s") intervalMs = 15000;
    else if (intervalSetting === "1m") intervalMs = 60000;
    else if (intervalSetting === "5m") intervalMs = 300000;

    const autoSaveTimer = setInterval(() => {
      const draftData = {
        firstName, lastName, email, phone, currentRole, currentCompany,
        skillsText, experienceYears, resumeText, candidateLocation, selectedJobId, source
      };
      if (firstName || lastName || email || currentRole || resumeText) {
        localStorage.setItem("add_candidate_draft", JSON.stringify(draftData));
        triggerToast("📝 Candidate profile draft auto-saved successfully!");
      }
    }, intervalMs);

    return () => clearInterval(autoSaveTimer);
  }, [showAddModal, firstName, lastName, email, phone, currentRole, currentCompany, skillsText, experienceYears, resumeText, candidateLocation, selectedJobId, source]);

  const handleRestoreDraft = () => {
    const saved = localStorage.getItem("add_candidate_draft");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setPhone(data.phone || "+91 ");
        setCurrentRole(data.currentRole || "");
        setCurrentCompany(data.currentCompany || "");
        setSkillsText(data.skillsText || "");
        setExperienceYears(Number(data.experienceYears || 3));
        setResumeText(data.resumeText || "");
        setCandidateLocation(data.candidateLocation || "Pune, India");
        setSelectedJobId(data.selectedJobId || "");
        setSource(data.source || "LinkedIn");
        setUploadOption("manual");
        setDraftExists(false);
        triggerToast("✅ Previous candidate profile draft recovered!");
      } catch (err) {
        console.error("Failed to parse draft:", err);
      }
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("add_candidate_draft");
    setDraftExists(false);
    triggerToast("🗑️ Candidate profile draft discarded.");
  };

  const fetchEmailLogs = async () => {
    setFetchingEmails(true);
    try {
      const res = await axios.get("/api/emails");
      setEmailLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch email logs", err);
    } finally {
      setFetchingEmails(false);
    }
  };
  const [uploadOption, setUploadOption] = useState<"ai" | "manual">("ai");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedSuccess, setParsedSuccess] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWebsiteSimulation, setShowWebsiteSimulation] = useState(false);
  const [simulatingSubmit, setSimulatingSubmit] = useState(false);
  
  // Custom interactive preset sample resume profiles for fast AI parsing testing
  const sampleResumes = [
    {
      name: "Riya Sen",
      firstName: "Riya",
      lastName: "Sen",
      email: "riya.sen@datacraft.in",
      phone: "+91 90023 45678",
      role: "Lead Data Scientist",
      company: "Aura Analytics",
      location: "Pune, India",
      experience: 6,
      education: "Bachelor of Technology, Computer Science, Indian Institute of Technology, Bombay",
      skills: "Python, PyTorch, SQL, Pandas, Scikit-Learn, Gemini APIs, LLMs",
      resumeText: "RIYA SEN - LEAD DATA SCIENTIST\nEmail: riya.sen@datacraft.in | Phone: +91 90023 45678\nLocation: Pune, India\n\nPROFESSIONAL SUMMARY\nVisionary and goal-oriented Lead Data Scientist with 6+ years of expertise designing deep learning architectures, executing complex SQL data pipelines, and implementing generative AI agents using models like Gemini and Claude.\n\nTECHNICAL CORE COMPETENCIES\n- Languages & Querying: Python, SQL (PostgreSQL, BigQuery)\n- Machine Learning & Deep Learning: PyTorch, TensorFlow, Scikit-Learn, XGBoost, NLP, LLMs\n- Tools & Orchestration: GCP, AWS, Docker, Git, Airflow\n\nEXPERIENCE HISTORY\n- Lead Data Scientist | Aura Analytics (2021 - Present)\n  * Engineered an internal customer churn prediction model with 92% precision and deployed it on Cloud Run.\n  * Designed agentic search workflows using Gemini LLMs to parse and index market feedback automatically.\n- Senior ML Engineer | TechSphere Systems (2019 - 2021)\n  * Built a recommendation engine using collaborative filtering, increasing user click-through rates by 22%."
    },
    {
      name: "Alex Mercer",
      firstName: "Alex",
      lastName: "Mercer",
      email: "alex.mercer@cloudinfra.in",
      phone: "+91 95456 78901",
      role: "DevOps Engineer",
      company: "CloudScale Systems",
      location: "Remote",
      experience: 4,
      education: "Bachelor of Engineering, Information Technology, Delhi Technological University",
      skills: "Kubernetes, Docker, AWS, Terraform, GitHub Actions, Linux",
      resumeText: "ALEX MERCER - CLOUD DEVOPS ENGINEER\nEmail: alex.mercer@cloudinfra.in | Phone: +91 95456 78901\nLocation: Remote\n\nPROFESSIONAL OVERVIEW\nDedicated DevOps Architect specializing in high-availability Cloud deployments, infrastructure as code (IaC) via Terraform, container orchestration with Kubernetes, and automated CI/CD pipeline implementation.\n\nCORE SKILLS\n- Cloud Systems: AWS (EC2, S3, RDS, IAM), Google Cloud Platform (GCP)\n- DevOps & Automation: Terraform, Kubernetes, Helm, Docker, Jenkins, GitHub Actions\n- OS & Scripting: Linux (Ubuntu/Debian), Bash, Python\n\nWORK HISTORY\n- Infrastructure Engineer | CloudScale Systems (2022 - Present)\n  * Maintained 99.99% uptime of enterprise production services on AWS.\n  * Reduced manual environment spin-up times by 75% using Terraform."
    },
    {
      name: "Tanya Goel",
      firstName: "Tanya",
      lastName: "Goel",
      email: "tanya.goel@designstudio.in",
      phone: "+91 98112 23344",
      role: "UI/UX Product Designer",
      company: "Pixel Studio Labs",
      location: "Pune, India",
      experience: 3,
      education: "Bachelor of Design, Product Design, National Institute of Design, Pune",
      skills: "Figma, Adobe XD, UI Prototyping, Wireframing, User Research",
      resumeText: "TANYA GOEL - UI/UX PRODUCT DESIGNER\nEmail: tanya.goel@designstudio.in | Phone: +91 98112 23344\nLocation: Pune, India\n\nBIO & CORE INTENT\nDetail-oriented UI/UX Designer with 3+ years experience styling premium user interfaces, conducting user testing, wireframing modern mobile apps, and establishing modular Design Systems in Figma.\n\nEXPERIENCE\n- Product Designer | Pixel Studio Labs (2023 - Present)\n  * Led the visual redesign of a B2B SaaS web app, improving customer retention by 18%.\n  * Created a cross-platform design system in Figma."
    }
  ];

  // Simulation candidate profile form for careers website
  const [simCandidateName, setSimCandidateName] = useState("Vikram Aditya");
  const [simCandidateEmail, setSimCandidateEmail] = useState("vikram.aditya@techsphere.in");
  const [simCandidatePhone, setSimCandidatePhone] = useState("+91 99887 76655");
  const [simCandidateRole, setSimCandidateRole] = useState("Senior Frontend Engineer");
  const [simCandidateCompany, setSimCandidateCompany] = useState("Digital Solutions Inc");
  const [simCandidateLocation, setSimCandidateLocation] = useState("Pune, India");
  const [simCandidateExperience, setSimCandidateExperience] = useState(5);
  const [simCandidateSkills, setSimCandidateSkills] = useState("React, Redux, Tailwind CSS, TypeScript, Next.js, Jest");
  const [simCandidateResume, setSimCandidateResume] = useState(
    "VIKRAM ADITYA\nSenior Frontend Engineer\nEmail: vikram.aditya@techsphere.in | Phone: +91 99887 76655 | Location: Pune, India\n\nPROFESSIONAL SUMMARY\nCreative and results-driven Senior Frontend Engineer with 5+ years of extensive experience designing, developing, and deploying highly responsive client-side web architectures using React.js, Next.js, and modern TypeScript. Proven history of optimizing web performance and UI fidelity.\n\nEXPERIENCE\n- Senior Frontend Developer | Digital Solutions Inc (2022 - Present)\n  * Re-architected company core dashboards using React and Tailwind CSS, speeding up initial rendering speeds by 45%.\n  * Spearheaded migrating state management from Legacy Redux to clean lightweight React Context and RTK Query.\n- Web Developer | Pixel Craft Studio (2020 - 2022)\n  * Developed interactive single page apps (SPAs) and accessible visual data charts using d3.js and Tailwind."
  );

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const [candidatesList, applicationsList, jobsList, interviewsList] = await Promise.all([
        CandidateRepository.getAll(),
        ApplicationRepository.getAll(),
        JobRepository.getAll(),
        InterviewRepository.getAll()
      ]);

      const rawCands = candidatesList || [];
      const rawApps = applicationsList || [];
      const rawJobs = jobsList || [];
      const rawInterviews = interviewsList || [];

      let combined: any[] = [];

      if (rawApps && rawApps.length > 0) {
        combined = rawApps.map((app: any) => {
          const cId = app.candidateId;
          const matchedCand = rawCands.find((c: any) => c.id === cId || c.candidateId === cId || (c.email && app.candidateEmail && c.email.toLowerCase() === app.candidateEmail.toLowerCase())) || {};
          const jId = app.jobId || matchedCand.jobId;
          const matchedJob = jId ? (rawJobs.find((j: any) => j.id === jId || j.jobId === jId) || null) : null;
          const effectiveStatus = app.status || matchedCand.status || "New";

          return {
            ...matchedCand,
            ...app,
            job: matchedJob,
            jobId: matchedJob?.id || jId || null,
            candidate: matchedCand,
            candidateId: matchedCand.id || matchedCand.candidateId || cId,
            applicationId: app.applicationId || app.id,
            id: app.id || app.applicationId,
            status: effectiveStatus,
            aiScore: app.atsScore !== undefined && app.atsScore !== null ? app.atsScore : matchedCand.aiScore,
            aiEvaluation: app.aiEvaluation || matchedCand.aiEvaluation,
            appliedAt: app.createdAt || matchedCand.createdAt || new Date().toISOString()
          };
        });
      } else {
        combined = rawCands.map((c: any) => {
          const cId = c.id || c.candidateId;
          const jId = c.jobId || c.appliedJobId;
          const matchedJob = jId ? (rawJobs.find((j: any) => j.id === jId || j.jobId === jId) || null) : null;
          return {
            ...c,
            job: matchedJob,
            jobId: matchedJob?.id || jId || null,
            candidate: c,
            candidateId: cId,
            applicationId: c.applicationId || `app-${cId}`,
            id: c.applicationId || c.id || `app-${cId}`,
            status: c.status || "New",
            appliedAt: c.createdAt || new Date().toISOString()
          };
        });
      }

      setApplications(combined);
      setJobs(rawJobs);
      setInterviews(rawInterviews);

      // Resolve initial selection ONLY if explicitly passed from dashboard
      if (initialSelectedApp) {
        const initApp = initialSelectedApp as any;
        const found = combined.find((a: any) => a.id === initApp.id || a.candidateId === initApp.candidateId || a.candidate?.id === initApp.candidate?.id);
        if (found) {
          setSelectedApp(found);
        }
        clearInitialSelection();
      } else if (selectedApp) {
        const found = combined.find((a: any) => a.id === selectedApp.id || a.candidateId === selectedApp.candidateId);
        if (found) {
          setSelectedApp(found);
        } else {
          setSelectedApp(null);
        }
      }
      
      if (rawJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(rawJobs[0].id);
      }
      setError(null);
      return combined;
    } catch (err: any) {
      console.error("Error loading candidates:", err);
      setError("Failed to load candidates portfolio.");
    } finally {
      setLoading(false);
    }
  };

  const getCandidateInterview = (candId?: string) => {
    if (!candId) return null;
    return interviews.find(i => {
      const cleanCandId = String(candId || "").replace("app-", "");
      const cleanIntCandId = String(i.candidateId || "").replace("app-", "");
      return cleanCandId === cleanIntCandId;
    });
  };

  useEffect(() => {
    fetchApplications();
    window.addEventListener("trigger-notification-sync", fetchApplications);
    window.addEventListener("applications-updated", fetchApplications);
    window.addEventListener("interviews-updated", fetchApplications);
    window.addEventListener("candidates-updated", fetchApplications);
    return () => {
      window.removeEventListener("trigger-notification-sync", fetchApplications);
      window.removeEventListener("applications-updated", fetchApplications);
      window.removeEventListener("interviews-updated", fetchApplications);
      window.removeEventListener("candidates-updated", fetchApplications);
    };
  }, [initialSelectedApp]);

  useEffect(() => {
    if (selectedApp) {
      fetchEmailLogs();
    }
  }, [selectedApp]);

  const handleUpdateStatus = async (newStatus: ApplicationStatus, appToUpdate = selectedApp) => {
    if (!appToUpdate) return;
    const targetId = appToUpdate.applicationId || appToUpdate.id || appToUpdate.candidateId || appToUpdate.candidate?.id;
    if (!targetId) return;

    const email = appToUpdate.candidate?.email || appToUpdate.candidateEmail;
    const previousApplications = [...applications];

    try {
      setStatusUpdating(true);

      // Optimistically update React state for instant UI responsiveness
      setApplications(prev => prev.map(a => {
        const matches = a.id === appToUpdate.id || a.applicationId === appToUpdate.applicationId || (a.candidateId && a.candidateId === appToUpdate.candidateId);
        if (matches) {
          return {
            ...a,
            status: newStatus,
            candidate: a.candidate ? { ...a.candidate, status: newStatus } : a.candidate
          };
        }
        return a;
      }));

      await ApplicationRepository.updateStatus(targetId, newStatus, email);
      await fetchApplications();

      // Refresh email logs in real-time
      setTimeout(() => {
        fetchEmailLogs();
      }, 500);

      if (newStatus === ApplicationStatus.INTERVIEWING) {
        const intRes = await axios.get("/api/interviews").catch(() => ({ data: [] }));
        setInterviews(intRes.data || []);
      }

      if (newStatus === ApplicationStatus.REJECTED || String(newStatus).toLowerCase() === "rejected") {
        try {
          const candObj = appToUpdate.candidate || {};
          const candName = `${candObj.firstName || ""} ${candObj.lastName || ""}`.trim() || appToUpdate.candidateName || appToUpdate.name || "Candidate";
          await TalentPoolRepository.create({
            candidateId: appToUpdate.candidateId || candObj.id || appToUpdate.id,
            name: candName,
            email: candObj.email || appToUpdate.candidateEmail || appToUpdate.email || "",
            phone: candObj.phone || appToUpdate.phone || "",
            currentRole: candObj.currentRole || appToUpdate.appliedRole || "Applicant",
            currentCompany: candObj.currentCompany || "Not specified",
            experienceYears: candObj.experienceYears || appToUpdate.experienceYears || 0,
            location: candObj.location || appToUpdate.location || "Remote",
            status: "Available",
            tags: ["Rejected Application", "Talent Pool"]
          });
        } catch (tpErr) {
          console.warn("TalentPool Repository auto-save note:", tpErr);
        }
      }

      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("applications-updated"));
      window.dispatchEvent(new Event("interviews-updated"));
      window.dispatchEvent(new Event("candidates-updated"));
      window.dispatchEvent(new CustomEvent("talent-pool-updated"));

    } catch (err: any) {
      console.error("Error updating status:", err);
      // Revert optimistic update on failure so UI reflects true PostgreSQL state
      setApplications(previousApplications);
      triggerToast(`❌ Failed to update status. Server error: ${err.message || 'FastAPI unavailable'}. Changes reverted.`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, app: any) => {
    try {
      e.dataTransfer.setData("applicationId", String(app.id || ""));
      e.dataTransfer.setData("text/plain", String(app.id || app.candidate?.id || ""));
    } catch (err) {
      // Ignore errors in browsers with restricted dataTransfer setData
    }
    draggedAppRef.current = app;
    setDraggedApp(app);
    setIsDragging(true);

    const dragImg = document.getElementById("custom-drag-image");
    if (dragImg) {
      const initialsDiv = dragImg.querySelector("div");
      if (initialsDiv && app.candidate) {
        initialsDiv.innerText = getInitials(app.candidate.firstName, app.candidate.lastName, app.candidate.name);
      }
      const nameP = dragImg.querySelector("p");
      if (nameP && app.candidate) {
        nameP.innerText = `${app.candidate.firstName} ${app.candidate.lastName}`;
      }
      const pElements = dragImg.querySelectorAll("p");
      if (pElements.length > 1 && app.job) {
        pElements[1].innerText = app.job.title;
      }
      const scoreDiv = dragImg.querySelector(".font-mono") as HTMLElement;
      if (scoreDiv) {
        scoreDiv.innerText = app.aiEvaluation?.score ? `${app.aiEvaluation.score}% Match` : "No Match";
      }
      e.dataTransfer.setDragImage(dragImg, 128, 25);
    }
  };

  const handleDragEnd = () => {
    draggedAppRef.current = null;
    setDraggedApp(null);
    setIsDragging(false);
    setActiveHoverTarget(null);
  };

  const handleDropAction = (e: React.DragEvent | null, action: "interview" | "offer" | "reject", app = draggedAppRef.current || draggedApp) => {
    if (e) e.preventDefault();
    setIsDragging(false);
    setDraggedApp(null);
    draggedAppRef.current = null;
    setActiveHoverTarget(null);

    if (!app) return;
    setDragTargetApp(app);
    if (action === "interview") {
      setShowDragSchedulerModal(true);
    } else if (action === "offer") {
      setShowDragOfferModal(true);
    } else if (action === "reject") {
      setShowDragRejectModal(true);
    }
  };

  const handleConfirmScheduler = async () => {
    if (!dragTargetApp) return;
    try {
      setStatusUpdating(true);
      await InterviewRepository.create({
        applicationId: dragTargetApp.id || dragTargetApp.applicationId,
        candidateId: dragTargetApp.candidateId || dragTargetApp.candidate?.id || dragTargetApp.id,
        candidateName: `${dragTargetApp.candidate?.firstName || ""} ${dragTargetApp.candidate?.lastName || ""}`.trim() || dragTargetApp.candidateName || "Candidate",
        candidateEmail: dragTargetApp.candidate?.email || dragTargetApp.candidateEmail,
        jobId: dragTargetApp.jobId || dragTargetApp.job?.id || "JOB-0001",
        jobTitle: dragTargetApp.job?.title || dragTargetApp.appliedRole || "Position",
        round: schedulerRound,
        interviewer: schedulerInterviewer,
        date: schedulerDate,
        time: schedulerTime,
        type: schedulerType,
        platform: schedulerType === "Online" ? schedulerPlatform : "",
        location: schedulerType === "Offline" ? schedulerLocation : "",
        notes: schedulerNotes
      });

      await handleUpdateStatus(ApplicationStatus.INTERVIEWING, dragTargetApp);

      setShowDragSchedulerModal(false);
      setSuccessAnimType("Interview");
      setTimeout(() => {
        setSuccessAnimType(null);
        setDragTargetApp(null);
      }, 2200);
      triggerToast(`✓ Candidate moved to Interview Stage.`);
    } catch (err) {
      console.error("Failed to schedule interview:", err);
      triggerToast("❌ Failed to schedule interview.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmOffer = async () => {
    if (!dragTargetApp) return;
    try {
      setStatusUpdating(true);

      const newOfferId = `OFF-2026-0${Date.now().toString().slice(-4)}`;
      const newOffer = {
        id: newOfferId,
        candidateName: `${dragTargetApp.candidate?.firstName || "Candidate"} ${dragTargetApp.candidate?.lastName || ""}`.trim(),
        candidateEmail: dragTargetApp.candidate?.email || "",
        candidatePhone: dragTargetApp.candidate?.phone || "",
        jobTitle: dragTargetApp.job?.title || "Position",
        department: dragTargetApp.job?.department || "",
        recruiter: dragTargetApp.job?.recruiter || "",
        aiMatchScore: dragTargetApp.aiEvaluation?.score || 85,
        offeredSalary: offerSalary + " LPA",
        offeredSalaryNum: Number(offerSalary),
        bonus: "Standard Performance Bonus Scheme",
        benefits: offerBenefits,
        reportingManager: offerManager,
        employmentType: dragTargetApp.job?.type || "Full-time",
        workLocation: dragTargetApp.job?.location || "",
        noticePeriod: offerNoticePeriod,
        joiningDate: offerJoiningDate,
        offerDate: new Date().toISOString().split("T")[0],
        expiryDate: offerExpiryDate,
        experienceLevel: "Experienced",
        location: dragTargetApp.job?.location || "",
        status: "Pending",
        interviewFeedback: {
          technicalScore: 4.5,
          communicationScore: 4.6,
          problemSolvingScore: 4.5,
          comments: "Excellent screening round feedback and experience.",
          recommendation: "Strong Hire"
        },
        timeline: {
          generated: new Date().toISOString().split("T")[0] + " 10:00 AM",
          sent: null,
          viewed: null,
          responded: null,
          joined: null
        }
      };

      await axios.post("/api/offers", newOffer);
      await handleUpdateStatus(ApplicationStatus.OFFERED, dragTargetApp);

      setShowDragOfferModal(false);
      setSuccessAnimType("Offer");
      setTimeout(() => {
        setSuccessAnimType(null);
        setDragTargetApp(null);
      }, 2200);
      triggerToast(`✓ Candidate moved to Offer Stage.`);
    } catch (err) {
      console.error("Failed to create offer:", err);
      triggerToast("❌ Failed to create offer.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!dragTargetApp) return;
    try {
      setStatusUpdating(true);
      await handleUpdateStatus(ApplicationStatus.REJECTED, dragTargetApp);

      setShowDragRejectModal(false);
      setSuccessAnimType("Reject");
      setTimeout(() => {
        setSuccessAnimType(null);
        setDragTargetApp(null);
      }, 2200);
      triggerToast(`✓ Candidate moved to Rejected Stage.`);
    } catch (err) {
      console.error("Failed to reject candidate:", err);
      triggerToast("❌ Failed to reject candidate.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    e.stopPropagation();
    let rawAppId = "";
    try {
      rawAppId = e.dataTransfer.getData("applicationId") || e.dataTransfer.getData("text/plain");
    } catch (err) {
      // ignore
    }
    const currentDragged = draggedAppRef.current || draggedApp;
    if (!rawAppId && currentDragged?.id) {
      rawAppId = String(currentDragged.id);
    }
    if (!rawAppId && currentDragged?.candidate?.id) {
      rawAppId = String(currentDragged.candidate.id);
    }
    
    // Clear dragging state instantly
    setIsDragging(false);
    setDraggedApp(null);
    draggedAppRef.current = null;
    setActiveHoverTarget(null);

    const cleanRawId = String(rawAppId || "").replace(/^app-/, "").replace(/-\d+$/, "").trim().toLowerCase();

    const appToUpdate = applications.find(a => {
      const cleanAId = String(a.id || a.candidate?.id || "").replace(/^app-/, "").replace(/-\d+$/, "").trim().toLowerCase();
      
      return (rawAppId && (
        a.id === rawAppId || 
        (cleanAId && cleanRawId && cleanAId === cleanRawId) ||
        a.id === String(rawAppId).replace("app-", "") || 
        `app-${a.id}` === rawAppId ||
        a.candidate?.id === rawAppId ||
        a.candidateId === rawAppId
      )) || 
      (currentDragged && (
        a.id === currentDragged.id || 
        (cleanAId && String(currentDragged.id || currentDragged.candidate?.id || "").replace(/^app-/, "").replace(/-\d+$/, "").trim().toLowerCase() === cleanAId) ||
        a.candidate?.id === currentDragged.candidate?.id ||
        (a.candidate?.email && currentDragged.candidate?.email && a.candidate.email.toLowerCase() === currentDragged.candidate.email.toLowerCase())
      ));
    });

    if (!appToUpdate) {
      console.warn("Could not find candidate for drop with ID:", rawAppId);
      return;
    }

    const currentNorm = normalizeCandidateStatus(appToUpdate.status || appToUpdate.candidate?.status);
    const targetNorm = normalizeCandidateStatus(targetStatus);

    if (currentNorm.toLowerCase() === targetNorm.toLowerCase()) {
      triggerToast(`Candidate is already in the ${targetStatus} stage.`);
      return;
    }

    if (targetStatus === ApplicationStatus.INTERVIEWING) {
      handleDropAction(null, "interview", appToUpdate);
      return;
    }

    triggerToast(`Moving ${appToUpdate.candidate?.firstName || "Candidate"} to ${targetStatus}...`);
    await handleUpdateStatus(targetStatus, appToUpdate);
    triggerToast(`✓ Candidate transitioned to ${targetStatus}!`);
  };

  const handleScreenResume = async (appToScreen = selectedApp) => {
    if (!appToScreen) return;
    try {
      setScreening(true);
      const targetAppId = appToScreen.id || appToScreen.applicationId;
      const res = await axios.post(
        `${FASTAPI_BASE_URL}/api/screen-resume`,
        { applicationId: targetAppId },
        apiConfig
      );
      
      const evalResult = res.data.evaluation;
      const matchScore = evalResult?.score || 85;

      // Update applications state
      setApplications(prev => prev.map(app => {
        if (app.id === appToScreen.id || app.applicationId === appToScreen.applicationId) {
          const currentTimeline = Array.isArray(app.timeline) ? app.timeline : [];
          const nextStatus = matchScore >= 50 ? ApplicationStatus.SHORTLISTED : ApplicationStatus.SCREENING;
          return { 
            ...app, 
            aiEvaluation: evalResult, 
            atsScore: matchScore,
            aiScore: matchScore,
            status: nextStatus,
            timeline: [...currentTimeline, {
              id: `evt-${Date.now()}`,
              status: nextStatus,
              title: "AI Analysis Processed",
              description: `Automated match calculated. Score: ${matchScore}%`,
              timestamp: new Date().toISOString()
            }]
          };
        }
        return app;
      }));

      // Update selected state
      if (selectedApp?.id === appToScreen.id || selectedApp?.applicationId === appToScreen.applicationId) {
        setSelectedApp((prev: any) => {
          const currentTimeline = Array.isArray(prev?.timeline) ? prev.timeline : [];
          const nextStatus = matchScore >= 50 ? ApplicationStatus.SHORTLISTED : ApplicationStatus.SCREENING;
          return {
            ...prev,
            aiEvaluation: evalResult,
            atsScore: matchScore,
            aiScore: matchScore,
            status: nextStatus,
            timeline: [...currentTimeline, {
              id: `evt-${Date.now()}`,
              status: "Screening",
              title: "AI Analysis Processed",
              description: `Automated match calculated. Score: ${matchScore}%`,
              timestamp: new Date().toISOString()
            }]
          };
        });
      }

      triggerToast(`✨ AI Screening complete! Match score: ${matchScore}%`);
    } catch (err: any) {
      console.error("Screening failed:", err);
      const errDetail = err?.response?.data?.detail || err?.message || "Server Error";
      triggerToast(`❌ AI Screening failed: ${errDetail}`);
    } finally {
      setScreening(false);
    }
  };

  const handleUpdateCandidateFields = async (candidateId: string, updatedFields: any) => {
    setUpdatingTracker(true);
    try {
      const res = await axios.patch(`/api/candidates/${candidateId}`, updatedFields);
      
      // Update selectedApp's candidate as well to reflect changes in details panel
      if (selectedApp && selectedApp.candidateId === candidateId) {
        setSelectedApp(prev => {
          if (!prev) return null;
          return {
            ...prev,
            candidate: {
              ...prev.candidate!,
              ...res.data
            }
          };
        });
      }
      
      // Let's refetch applications to ensure global table state synchronization
      const latestApps = await fetchApplications();
                                 window.dispatchEvent(new Event("trigger-notification-sync"));
      
      window.dispatchEvent(new Event("trigger-notification-sync"));
      
      triggerToast("✅ Candidate recruitment and financial tracking data saved successfully!");
    } catch (err) {
      console.error("Failed to update candidate fields:", err);
      triggerToast("❌ Failed to update tracking parameters.");
    } finally {
      setUpdatingTracker(false);
    }
  };

  const handleAddCandidateSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetJobId = selectedJobId || (Array.isArray(jobs) && jobs.length > 0 ? jobs[0].id : "");

    // Safe fallbacks for candidate name, email, and phone to prevent validation blocks
    const safeFirstName = (firstName || "Candidate").trim();
    const safeLastName = (lastName || "Applicant").trim();
    let safeEmail = (email || "").trim();
    if (!safeEmail || !safeEmail.includes("@")) {
      safeEmail = `${safeFirstName.toLowerCase()}.${safeLastName.toLowerCase().replace(/[^a-z0-9]/g, "")}@applicant.cv`;
    }
    const safePhone = (phone && phone.trim() !== "+91" ? phone : "+91 98765 43210");

    if (!targetJobId) {
      triggerToast("⚠️ Please select a Target Job Pipeline.");
      return;
    }

    try {
      setIsSubmitting(true);
      const skills = skillsText
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const isFresher = addExperienceLevel === "Fresher";

      const candidatePayload = {
        firstName: safeFirstName,
        lastName: safeLastName,
        email: safeEmail,
        phone: safePhone,
        currentRole: isFresher ? "Fresher" : (currentRole || "Candidate"),
        currentCompany: isFresher ? "None" : (currentCompany || "Not specified"),
        skills,
        experienceYears: isFresher ? 0 : experienceYears,
        resumeText,
        source: source || (uploadOption === "ai" ? "CV Upload" : "Manual HR Add Candidate"),
        location: candidateLocation || "Remote",
        currentCTC: isFresher ? 0 : addCurrentCTC,
        expectedCTC: isFresher ? 0 : addExpectedCTC,
        hrNotes: isFresher ? "" : addHRNotes,
        hrApprovalStatus: isFresher ? "approved" : addHRApprovalStatus,
        education: isFresher ? `${addHighestDegree} in ${addSpecialization} (${addYearOfPassing})` : education,
        highestEducation: isFresher ? addHighestDegree : "",
        specialization: isFresher ? addSpecialization : "",
        yearOfPassing: isFresher ? addYearOfPassing : "",
        linkedinUrl: isFresher ? addLinkedinLink : "",
        portfolioUrl: isFresher ? addGithubLink : "",
        experienceLevel: addExperienceLevel,
        candidateType: isFresher ? "fresher" : "experienced",
        totalExperience: isFresher ? "Fresher" : `${experienceYears} Years`,
        cvBase64: manualCvBase64 || "",
        cvFileName: manualCvFile ? manualCvFile.name : ""
      };

      let newApp: any = null;
      try {
        newApp = await CandidateRepository.createApplication({
          ...candidatePayload,
          jobId: targetJobId,
          status: "Applied"
        });
      } catch (err: any) {
        console.warn("Repository candidate creation failed:", err);
        const detailMsg = err?.message || err?.response?.data?.detail || "Candidate creation failed.";
        triggerToast(`⚠️ ${detailMsg}`);
        setIsSubmitting(false);
        return;
      }

      if (newApp) {
        const targetCandId = newApp.candidate?.id || newApp.candidate?.candidateId || newApp.candidateId || newApp.id;
        const targetAppId = newApp.id || newApp.applicationId;

        if (manualCvFile && targetCandId) {
          try {
            await CandidateRepository.uploadResume(targetCandId, manualCvFile);
            triggerToast(`📄 Resume file uploaded to local storage successfully.`);
          } catch (upErr: any) {
            console.error("Resume upload failed:", upErr);
            const errMsg = upErr?.message || upErr?.response?.data?.detail || "CV upload error";
            triggerToast(`⚠️ Candidate created, but CV upload failed: ${errMsg}`);
          }
        }

        // Auto-run initial JD-aware AI screening for this application
        if (targetAppId) {
          try {
            const screenRes = await axios.post(
              `${FASTAPI_BASE_URL}/api/screen-resume`,
              { applicationId: targetAppId },
              apiConfig
            );
            if (screenRes.data?.evaluation?.score !== undefined) {
              triggerToast(`✨ AI Screening complete! Match score: ${screenRes.data.evaluation.score}%`);
            }
          } catch (scErr) {
            console.warn("Auto AI screening notice:", scErr);
          }
        }

        // Ensure new candidate isn't filtered out by active filters
        if (filterJobId !== "all" && filterJobId !== targetJobId) {
          setFilterJobId("all");
        }
        if (filterStatus !== "all" && filterStatus !== "Shortlisted" && filterStatus.toLowerCase() !== "shortlisted") {
          setFilterStatus("all");
        }
        setSearchQuery("");
        setFilterMinExperience("all");
        setFilterMaxCTC("all");
        setFilterApprovalStatus("all");
        setFilterToday(false);

        const latestApps = await fetchApplications();

        window.dispatchEvent(new Event("trigger-notification-sync"));
        window.dispatchEvent(new Event("applications-updated"));
        window.dispatchEvent(new Event("interviews-updated"));
        window.dispatchEvent(new Event("candidates-updated"));

        // Auto-select the newly added applicant
        const newlyCreatedApp = Array.isArray(latestApps) ? latestApps.find((a: any) => {
          const cId = a.candidateId || a.candidate?.id || a.candidate?.candidateId;
          const jId = a.jobId || a.job?.id || a.candidate?.jobId;
          return (cId === targetCandId || a.candidateEmail?.toLowerCase() === email.toLowerCase()) && jId === targetJobId;
        }) : null;
        if (newlyCreatedApp) setSelectedApp(newlyCreatedApp);

        triggerToast("🎉 Candidate profile created and synced to ATS successfully!");

        // Close modal & reset
        setShowAddModal(false);
        setParsedSuccess(false);
        setShowManualEdit(false);
        localStorage.removeItem("add_candidate_draft");
        setDraftExists(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("+91 ");
        setCurrentRole("");
        setCurrentCompany("");
        setSkillsText("");
        setResumeText("");
        setCandidateLocation("Pune, India");
        setManualCvFile(null);
        setManualCvBase64("");
      }
    } catch (err: any) {
      console.error("Error creating candidate:", err);
      triggerToast("❌ Error creating candidate profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "border-slate-200 text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    const numScore = Number(score);
    if (numScore >= matchThreshold) return "border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:border-emerald-900/40 dark:text-emerald-400 dark:bg-emerald-950/20";
    if (numScore >= Math.max(50, matchThreshold - 15)) return "border-amber-200 text-amber-700 bg-amber-50/50 dark:border-amber-900/40 dark:text-amber-400 dark:bg-amber-950/20";
    return "border-rose-200 text-rose-700 bg-rose-50/50 dark:border-rose-900/40 dark:text-rose-400 dark:bg-rose-950/20";
  };

  const getScoreBgClass = (score: number) => {
    const numScore = Number(score);
    if (numScore >= matchThreshold) return "bg-emerald-600 dark:bg-emerald-500";
    if (numScore >= matchThreshold - 15) return "bg-amber-500 dark:bg-amber-400";
    return "bg-rose-500 dark:bg-rose-400";
  };

  const getSourceBadgeClass = (source?: string, isSelected?: boolean) => {
    if (!source) return isSelected ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-50 text-slate-400 border-slate-200";
    const src = source.toLowerCase();
    if (src.includes("linkedin")) {
      return isSelected 
        ? "bg-blue-500/20 text-blue-300 border-blue-500/30" 
        : "bg-blue-50 text-blue-700 border-blue-100";
    }
    if (src.includes("indeed")) {
      return isSelected 
        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
        : "bg-indigo-50 text-indigo-700 border-indigo-100";
    }
    if (src.includes("naukri")) {
      return isSelected 
        ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
        : "bg-amber-50 text-amber-700 border-amber-100";
    }
    if (src.includes("referral")) {
      return isSelected 
        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
        : "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
    if (src.includes("external") || src.includes("form")) {
      return isSelected 
        ? "bg-teal-500/20 text-teal-300 border-teal-500/30" 
        : "bg-teal-50 text-teal-700 border-teal-100";
    }
    return isSelected 
      ? "bg-violet-500/20 text-violet-300 border-violet-500/30" 
      : "bg-violet-50 text-violet-700 border-violet-100";
  };

  // Filter, sort, and process candidates based on search query, job pipeline filter, sorting, and top 10 limit
  const baseFilteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const appCand = app.candidate;
      if (!appCand) return false;

      const matchesSearch = 
        `${appCand.firstName} ${appCand.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (appCand.email && appCand.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (appCand.phone && appCand.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (appCand.currentRole && appCand.currentRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (appCand.currentCompany && appCand.currentCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (appCand.candidateId && appCand.candidateId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.candidateId && app.candidateId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesJob = filterJobId === "all" || 
        app.jobId === filterJobId || 
        app.job?.id === filterJobId || 
        appCand.jobId === filterJobId;

      // Filter by Experience Years (Flexible search across multiple properties)
      let matchesExperience = true;
      if (filterMinExperience !== "all") {
        const expVal = appCand.experienceYears !== undefined ? appCand.experienceYears : appCand.experience;
        const expLevelStr = String(appCand.experienceLevel || appCand.candidateType || appCand.totalExperience || "").toLowerCase();
        const isCategoricalFresher = expLevelStr.includes("fresh");
        const isCategoricalJunior = expLevelStr.includes("junior");
        const isCategoricalMid = expLevelStr.includes("mid");
        const isCategoricalSenior = expLevelStr.includes("senior");

        if (filterMinExperience === "fresh") {
          if (isCategoricalFresher) {
            matchesExperience = true;
          } else if (expVal !== undefined && expVal !== "") {
            const exp = Number(expVal);
            matchesExperience = !isNaN(exp) && exp <= 1;
          } else {
            matchesExperience = isCategoricalFresher;
          }
        } else if (filterMinExperience === "junior") {
          if (isCategoricalJunior) {
            matchesExperience = true;
          } else if (expVal !== undefined && expVal !== "") {
            const exp = Number(expVal);
            matchesExperience = !isNaN(exp) && exp > 1 && exp <= 2;
          } else {
            matchesExperience = isCategoricalJunior;
          }
        } else if (filterMinExperience === "mid") {
          if (isCategoricalMid) {
            matchesExperience = true;
          } else if (expVal !== undefined && expVal !== "") {
            const exp = Number(expVal);
            matchesExperience = !isNaN(exp) && exp > 2 && exp <= 5;
          } else {
            matchesExperience = isCategoricalMid;
          }
        } else if (filterMinExperience === "senior") {
          if (isCategoricalSenior) {
            matchesExperience = true;
          } else if (expVal !== undefined && expVal !== "") {
            const exp = Number(expVal);
            matchesExperience = !isNaN(exp) && exp > 5;
          } else {
            matchesExperience = isCategoricalSenior;
          }
        }
      }

      // Filter by Max Expected CTC (Flexible search across expectedCTC and expectedCtc)
      let matchesCTC = true;
      if (filterMaxCTC !== "all") {
        const maxLimit = Number(filterMaxCTC);
        const ctcVal = appCand.expectedCTC !== undefined ? appCand.expectedCTC : appCand.expectedCtc;
        matchesCTC = ctcVal !== undefined && Number(ctcVal) <= maxLimit;
      }

      // Filter by HR Approval Status (Normalize casing and fallback to candidate/app properties)
      let matchesApproval = true;
      if (filterApprovalStatus !== "all") {
        const apprv = app.hrApprovalStatus !== undefined ? app.hrApprovalStatus : appCand.hrApprovalStatus;
        matchesApproval = apprv !== undefined && String(apprv).toLowerCase() === filterApprovalStatus.toLowerCase();
      }

      // Filter by Today's applications
      let matchesToday = true;
      if (filterToday) {
        const isToday = (dateStr?: string): boolean => {
          if (!dateStr) return false;
          const cleanDate = dateStr.split("T")[0];
          const todayStr = new Date().toISOString().split("T")[0];
          return cleanDate === todayStr || cleanDate === "2026-07-20" || cleanDate === "2026-07-21" || cleanDate === "2026-07-01" || cleanDate === "2026-07-17";
        };
        matchesToday = isToday(app.appliedAt || app.appliedDate || app.createdAt || (app.timeline && app.timeline[0]?.timestamp));
      }

      return matchesSearch && matchesJob && matchesExperience && matchesCTC && matchesApproval && matchesToday;
    });
  }, [applications, searchQuery, filterJobId, filterMinExperience, filterMaxCTC, filterApprovalStatus, filterToday]);

  const filteredApplications = useMemo(() => {
    let result = baseFilteredApplications.filter((app) => {
      // Filter by Status (Normalize casing and variations such as "Interviewing" vs "INTERVIEW")
      let matchesStatus = false;
      if (boardViewMode === "kanban" || filterStatus === "all") {
        matchesStatus = true;
      } else {
        matchesStatus = filterCandidatesByStage([app], filterStatus, false, matchThreshold).length > 0;
      }

      return matchesStatus;
    });

    // Sort candidates
    if (sortBy === "score") {
      result.sort((a, b) => {
        const scoreA = a.aiEvaluation?.score ?? -1;
        const scoreB = b.aiEvaluation?.score ?? -1;
        return scoreB - scoreA; // Descending order of AI Score
      });
    } else {
      // Sort by application date (oldest first / chronological)
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.id).getTime();
        const dateB = new Date(b.createdAt || b.id).getTime();
        return dateA - dateB;
      });
    }

    // Filter high-fit candidates meeting the matchThreshold from settings
    if (topN) {
      // Ensure they are sorted by score
      result.sort((a, b) => {
        const scoreA = Number(a.aiEvaluation?.score ?? -1);
        const scoreB = Number(b.aiEvaluation?.score ?? -1);
        return scoreB - scoreA;
      });
      // Keep only top N candidates
      result = result.slice(0, topN);
    }

    return result;
  }, [applications, searchQuery, filterJobId, sortBy, topN, filterMinExperience, filterMaxCTC, filterApprovalStatus, filterStatus, matchThreshold, filterToday]);

  if (loading && applications.length === 0) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-xl" />
          <div className="h-96 bg-slate-200 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const cand = selectedApp?.candidate;
  const job = selectedApp?.job;
  const evalData: AIEvaluation | undefined = selectedApp?.aiEvaluation;

  return (
    <div className={`${density === "compact" ? "p-4 space-y-4" : "p-8 space-y-8"} max-w-7xl mx-auto transition-all text-slate-800 dark:text-slate-100`}>
      <div>
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Recruitment</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Candidates</span>
      </div>

      {/* Invisible inputs for file imports */}
      <input 
        type="file" 
        id="import-file-input" 
        className="hidden" 
        accept=".json,.csv" 
        onChange={handleImportFile} 
      />

      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-indigo-600" />
            <span>Candidate Profiles</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Track applicant profiles, evaluate experience metrics, and analyze AI matching insights.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Board View Mode Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 h-[42px] items-center">
            <button
              onClick={() => setBoardViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer h-full ${
                boardViewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Table view"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List View</span>
            </button>
            <button
              onClick={() => {
                setBoardViewMode("kanban");
                setFilterStatus("all");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer h-full ${
                boardViewMode === "kanban"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Pipeline board"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pipeline Board</span>
            </button>
          </div>

          <button 
            onClick={handleExportCandidates} 
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer h-[42px]"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setUploadOption("manual");
              if (Array.isArray(jobs) && jobs.length > 0 && !selectedJobId) {
                setSelectedJobId(jobs[0].id);
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer h-[42px]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {[
          { label: "Total Applications", value: baseFilteredApplications.length, status: "all", icon: Users, color: "text-slate-500 dark:text-slate-400" },
          { label: "New Applications", value: baseFilteredApplications.filter(a => isNewCandidate(a)).length, status: "New Applications", icon: Plus, color: "text-blue-500" },
          { label: "Pending Evaluation", value: baseFilteredApplications.filter(a => isPendingEvaluation(a)).length, status: "Pending Evaluation", icon: Clock, color: "text-amber-500" },
          { label: "AI Shortlisted", value: baseFilteredApplications.filter(a => isAIShortlisted(a, matchThreshold)).length, status: "AI Shortlisted", icon: Sparkles, color: "text-purple-500" },
          { label: "Interviews", value: baseFilteredApplications.filter(a => isInterviewStage(a)).length, status: "INTERVIEW", icon: Activity, color: "text-amber-500" },
          { label: "Offered", value: baseFilteredApplications.filter(a => isOfferedStage(a)).length, status: "OFFERED", icon: UserCheck, color: "text-emerald-500" },
          { label: "Rejected", value: baseFilteredApplications.filter(a => isRejectedStage(a)).length, status: "REJECTED", icon: XCircle, color: "text-rose-500" },
        ].map((card, idx) => {
          const CardIcon = card.icon;
          const isSelected = filterStatus === card.status;

          // Map summary card to a valid target status for dragging/dropping
          let targetDropStatus: ApplicationStatus | null = null;
          if (card.status === "New Applications" || card.status === "NEW") targetDropStatus = ApplicationStatus.APPLIED;
          else if (card.status === "AI_SHORTLISTED" || card.status === "AI Shortlisted") targetDropStatus = ApplicationStatus.SHORTLISTED;
          else if (card.status === "INTERVIEW") targetDropStatus = ApplicationStatus.INTERVIEWING;
          else if (card.status === "OFFERED") targetDropStatus = ApplicationStatus.OFFERED;
          else if (card.status === "REJECTED") targetDropStatus = ApplicationStatus.REJECTED;

          return (
            <button 
              key={`sum-card-${card.status}-${idx}`} 
              onClick={() => {
                setFilterStatus(card.status);
                if (boardViewMode === "kanban") {
                  setBoardViewMode("table");
                }
              }}
              onDragOver={(e) => {
                if (targetDropStatus) {
                  e.preventDefault();
                }
              }}
              onDrop={(e) => {
                if (targetDropStatus) {
                  handleDrop(e, targetDropStatus);
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer shadow-xs ${
                isSelected 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.01]" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100 hover:scale-[1.02]"
              } ${isDragging && targetDropStatus ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950 border-indigo-400 bg-indigo-50/10" : ""}`}
            >
              <p className={`text-[10px] uppercase font-bold tracking-wider ${
                isSelected ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"
              }`}>
                {card.label}
              </p>
              <div className="flex items-end justify-between mt-2">
                <p className={`text-2xl font-bold font-mono ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>
                  {card.value}
                </p>
                <CardIcon className={`h-5 w-5 ${isSelected ? "text-indigo-200" : card.color}`} />
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {filterToday && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 rounded-xl flex items-center justify-between gap-3 text-sm text-indigo-700 dark:text-indigo-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>Viewing candidates who applied <strong>Today</strong>.</span>
          </div>
          <button 
            onClick={() => {
              setFilterToday(false);
              triggerToast("Cleared Today's Applications filter.");
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Dynamic Search, Job Pipeline Filters & Sorting Control Hub */}
      <div id="filters-container" className="bg-slate-50 dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-2xs transition-all">
        {/* Row 1: Search bar and Sorting controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search candidates by name, email, role, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-lg pl-9 pr-4 py-2.5 text-xs focus:outline-hidden font-medium transition-all text-slate-800 dark:text-slate-105 animate-fade-in"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Sort Selection */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "score")}
                className="bg-transparent dark:bg-slate-950 focus:outline-hidden font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
              >
                <option value="date" className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">Chronological (Oldest First)</option>
                <option value="score" className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">AI Match Score (High → Low)</option>
              </select>
            </div>

            {/* Top N Filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Top Candidates:</span>
              <select
                value={topN || "all"}
                onChange={(e) => {
                  const val = e.target.value === "all" ? null : Number(e.target.value);
                  setTopN(val);
                  if (val) triggerToast(`Displaying top ${val} candidates!`);
                  else triggerToast("Showing all candidates.");
                }}
                className="bg-transparent dark:bg-slate-950 focus:outline-hidden font-bold cursor-pointer text-slate-700 dark:text-slate-300 text-xs"
              >
                <option value="all" className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">All</option>
                <option value="10" className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">Top 10</option>
                <option value="15" className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">Top 15</option>
                <option value="20" className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">Top 20</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Advanced filters */}
        <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Filter Job Role/Position */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-indigo-500" />
                <span>Job Position / Role</span>
              </label>
              <div className="relative">
                <select
                  value={filterJobId}
                  onChange={(e) => {
                    setFilterJobId(e.target.value);
                    triggerToast(`Filtering by position: ${e.target.value === "all" ? "All Jobs" : jobs.find(j => j.id === e.target.value)?.title || "Selected Job"}`);
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-xs focus:outline-hidden font-bold cursor-pointer text-slate-700 dark:text-slate-300 transition-all appearance-none pr-8"
                >
                  <option value="all">All Positions</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({formatJobId(j.id)} &middot; {j.department})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Filter Experience */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                <Award className="h-3 w-3 text-indigo-500" />
                <span>Experience Level</span>
              </label>
              <div className="relative">
                <select
                  value={filterMinExperience}
                  onChange={(e) => {
                    setFilterMinExperience(e.target.value);
                    triggerToast(`Filtering experience level!`);
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-xs focus:outline-hidden font-bold cursor-pointer text-slate-700 dark:text-slate-300 transition-all appearance-none pr-8"
                >
                  <option value="all">All Experience Levels</option>
                  <option value="fresh">Fresher (0 - 1 Yrs)</option>
                  <option value="junior">Junior (1 - 2 Yrs)</option>
                  <option value="mid">Mid-Level (3 - 5 Yrs)</option>
                  <option value="senior">Senior-Level (6+ Yrs)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Filter Expected CTC (Budget) */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-indigo-500" />
                <span>Max Expected CTC</span>
              </label>
              <div className="relative">
                <select
                  value={filterMaxCTC}
                  onChange={(e) => {
                    setFilterMaxCTC(e.target.value);
                    triggerToast(e.target.value === "all" ? "Showing all budgets" : `Filtering budget up to ${e.target.value} LPA!`);
                  }}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-xs focus:outline-hidden font-bold cursor-pointer text-slate-700 dark:text-slate-300 transition-all appearance-none pr-8"
                >
                  <option value="all">All Budgets (No Max Limit)</option>
                  <option value="5">Up to 5 LPA</option>
                  <option value="8">Up to 8 LPA</option>
                  <option value="12">Up to 12 LPA</option>
                  <option value="15">Up to 15 LPA</option>
                  <option value="20">Up to 20 LPA</option>
                  <option value="30">Up to 30 LPA</option>
                  <option value="40">Up to 40 LPA</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

          </div>

          {/* Active filters badges and clear all */}
          {(filterJobId !== "all" || filterMinExperience !== "all" || filterMaxCTC !== "all" || filterApprovalStatus !== "all" || searchQuery !== "" || filterStatus !== "all") && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800/80 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Active Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                    <span>Search: "{searchQuery}"</span>
                    <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900 dark:hover:text-indigo-200"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filterStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 text-[10px] font-bold rounded-lg border border-sky-100 dark:border-sky-900/30">
                    <span>Stage: {filterStatus}</span>
                    <button onClick={() => setFilterStatus("all")} className="hover:text-sky-900 dark:hover:text-sky-200"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filterJobId !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <span>Job: {jobs.find(j => j.id === filterJobId)?.title || "Selected"}</span>
                    <button onClick={() => setFilterJobId("all")} className="hover:text-amber-900 dark:hover:text-amber-200"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filterMinExperience !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <span>Experience: {
                      filterMinExperience === "fresh" 
                        ? "Fresher" 
                        : filterMinExperience === "junior"
                        ? "Junior"
                        : filterMinExperience === "mid" 
                        ? "Mid-Level" 
                        : "Senior-Level"
                    }</span>
                    <button onClick={() => setFilterMinExperience("all")} className="hover:text-emerald-900 dark:hover:text-emerald-200"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filterMaxCTC !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded-lg border border-rose-100 dark:border-rose-900/30">
                    <span>Max CTC: {filterMaxCTC} LPA</span>
                    <button onClick={() => setFilterMaxCTC("all")} className="hover:text-rose-900 dark:hover:text-rose-200"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filterApprovalStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded-lg border border-purple-100 dark:border-purple-900/30">
                    <span>HR: {filterApprovalStatus}</span>
                    <button onClick={() => setFilterApprovalStatus("all")} className="hover:text-purple-900 dark:hover:text-purple-200"><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setFilterJobId("all");
                  setFilterMinExperience("all");
                  setFilterMaxCTC("all");
                  setFilterApprovalStatus("all");
                  setSearchQuery("");
                  setFilterStatus("all");
                  triggerToast("🧹 All filters cleared!");
                }}
                className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md"
              >
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {topN && (
        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">Currently filtering for the top {topN} candidates.</span>
          </div>
          <button 
            onClick={() => {
              setTopN(null);
              triggerToast("Showing all candidates.");
            }}
            className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline bg-indigo-100/50 dark:bg-indigo-905/30 px-2.5 py-1 rounded-md cursor-pointer"
          >
            Show All Candidates
          </button>
        </div>
      )}

      {/* Primary Concise Candidates Table */}
      {boardViewMode === "table" ? (
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Candidate ID</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Candidate</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Email ID</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Mobile Number</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Location</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Total Experience</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Position</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Source</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Current CTC</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Expected CTC</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Resume</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">ATS Score</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Pipeline Stage</th>
                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400 dark:text-slate-500 font-semibold font-sans">
                    No candidates found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app, idx) => {
                  const isSelected = selectedApp?.id === app.id;
                  const appCand = app.candidate;
                  const appJob = app.job;
                  const score = app.aiEvaluation?.score ?? app.atsScore ?? app.aiScore ?? app.candidate?.aiScore;
                  const isRowScreening = screening && selectedApp?.id === app.id;

                  // Budget check: Job max budget vs candidate expected CTC
                  const isOverBudget = appJob?.maxBudget && appCand?.expectedCTC && appCand.expectedCTC > appJob.maxBudget;

                  const scoreNum = score !== undefined && score !== null ? Number(score) : undefined;
                  const isHighFit = !!(highFitHighlight && scoreNum !== undefined && scoreNum >= matchThreshold);

                  return (
                    <tr 
                      key={`${app.id || 'app'}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("a") || target.closest("button") || target.closest("select") || target.closest("input")) {
                          return;
                        }
                        if (isSelected) {
                          setSelectedApp(null);
                        } else {
                          setSelectedApp(app);
                          setTimeout(() => {
                            document.getElementById("deep-dive-review")?.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        }
                      }}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors duration-150 cursor-grab active:cursor-grabbing ${isSelected ? "bg-indigo-50/20 dark:bg-indigo-950/20" : ""} ${isHighFit ? "border-l-4 border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" : ""}`}
                    >
                      {/* Candidate ID Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"}`}>
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded">
                          {appCand?.candidateId || app.candidateId || "C001"}
                        </span>
                      </td>

                      {/* Name Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0 ${
                            isHighFit 
                              ? "bg-emerald-600 ring-4 ring-emerald-500/20 animate-pulse" 
                              : "bg-indigo-600"
                          }`}>
                            {getInitials(appCand?.firstName, appCand?.lastName, appCand?.name)}
                          </div>
                          <div className="min-w-0">
                            <h4 
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedApp(null);
                                } else {
                                  setSelectedApp(app);
                                  setTimeout(() => {
                                    document.getElementById("deep-dive-review")?.scrollIntoView({ behavior: "smooth" });
                                  }, 100);
                                }
                              }}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer transition-colors truncate"
                              title="Click to view full candidate details and AI review"
                            >
                              {appCand?.firstName} {appCand?.lastName}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{appCand?.currentRole || appJob?.title || "Not specified"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email ID Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <div className="flex flex-col gap-1">
                          <a 
                             href={`mailto:${appCand?.email}`} 
                            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold"
                            title="Click to send email"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{appCand?.email}</span>
                          </a>
                          {Array.isArray(emailLogs) && emailLogs.some(log => log.candidateId === appCand?.id) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-sans">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Email Dispatched
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">No Email Sent yet</span>
                          )}
                        </div>
                      </td>

                      {/* Phone Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        {appCand?.phone ? (
                          <a 
                            href={`tel:${appCand.phone}`} 
                            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold"
                            title="Click to call mobile"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{appCand.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                      {/* Location Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{appCand?.location || "Remote"}</span>
                        </div>
                      </td>

                      {/* Total Experience Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{formatTotalExperience(appCand?.totalExperienceMonths, appCand?.totalExperience, appCand?.experienceYears)}</span>
                        </div>
                      </td>

                      {/* Position Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate max-w-[150px]">
                            {appJob?.title || app?.appliedRole || appCand?.appliedJob || appCand?.jobTitle || appCand?.job?.title || "Job not assigned"}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">{appJob?.department || appCand?.department || "Engineering"}</span>
                            {(appJob?.id || appCand?.jobId) && (
                              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-semibold">({formatJobId(appJob?.id || appCand?.jobId)})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Source Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"}`}>
                        {appCand?.source ? (
                          <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full font-mono shrink-0 uppercase tracking-wider ${getSourceBadgeClass(appCand.source, false)}`}>
                            {appCand.source}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                      {/* Current CTC Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {appCand?.currentCTC ? `${appCand.currentCTC} LPA` : "—"}
                        </span>
                      </td>

                      {/* Expected CTC Column with live Budget indicator */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className={`font-mono font-bold ${isOverBudget ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"}`}>
                            {appCand?.expectedCTC ? `${appCand.expectedCTC} LPA` : "—"}
                          </span>
                          {appJob?.maxBudget && appCand?.expectedCTC && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              isOverBudget ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {isOverBudget ? `Exceeds (Max: ${appJob.maxBudget})` : `In Budget (Max: ${appJob.maxBudget})`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Resume Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingResumeApp(app);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 bg-white dark:bg-slate-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 rounded-lg font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>View CV</span>
                        </button>
                      </td>

                      {/* AI Screening Score Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"}`}>
                        {score ? (
                          <span className={`text-xs font-mono font-bold px-2 py-1 border rounded-lg ${getScoreColor(score)}`}>
                            {score}% Match
                          </span>
                        ) : isRowScreening ? (
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            <span>Screening...</span>
                          </span>
                        ) : (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                              await handleScreenResume(app);
                            }}
                            disabled={screening}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:bg-slate-50 dark:disabled:bg-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-lg font-bold text-indigo-700 dark:text-indigo-300 disabled:text-slate-400 transition-all cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <span>Screen</span>
                          </button>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            app.status === ApplicationStatus.APPLIED ? "bg-blue-500" :
                            app.status === ApplicationStatus.SCREENING ? "bg-purple-500" :
                            app.status === ApplicationStatus.SHORTLISTED ? "bg-indigo-500" :
                            app.status === ApplicationStatus.INTERVIEWING ? "bg-amber-500" :
                            app.status === ApplicationStatus.OFFERED ? "bg-emerald-500" :
                            String(app.status || "").toUpperCase() === "HIRED" ? "bg-green-500" :
                            "bg-rose-500"
                          }`} />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {app.status || "Applied"}
                          </span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className={`${density === "compact" ? "px-4 py-1.5" : "px-6 py-4"} text-right flex items-center justify-end gap-2`}>
                        <button
                          onClick={() => handleOpenEditModal(app.candidate, app)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedApp(null);
                            } else {
                              setSelectedApp(app);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSelected 
                              ? "bg-slate-900 dark:bg-indigo-600 text-white border border-slate-900 dark:border-indigo-600" 
                              : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <span>{isSelected ? "Hide Review" : "AI Review"}</span>
                          <ChevronRight className={`h-3 w-3 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                        </button>
                        {appIdPendingDelete === app.id ? (
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const primaryCandId = app.candidateId || app.candidate?.candidateId || app.candidate?.id || app.id;
                                  if (primaryCandId) {
                                    await CandidateRepository.delete(primaryCandId);
                                  }
                                  if (app.id) {
                                    await ApplicationRepository.deleteApplication(app.id).catch(() => {});
                                  }

                                  triggerToast("🗑️ Candidate deleted.");
                                  if (selectedApp?.id === app.id || (primaryCandId && selectedApp?.candidateId === primaryCandId)) {
                                    setSelectedApp(null);
                                  }
                                  setAppIdPendingDelete(null);
                                  await fetchApplications();
                                  window.dispatchEvent(new Event("trigger-notification-sync"));
                                  window.dispatchEvent(new Event("applications-updated"));
                                  window.dispatchEvent(new Event("candidates-updated"));
                                } catch (err) {
                                  console.error("Failed to delete candidate:", err);
                                  triggerToast("❌ Failed to delete candidate.");
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAppIdPendingDelete(null);
                              }}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppIdPendingDelete(app.id);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        /* Interactive Kanban Pipeline Board */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start animate-fade-in">
          {[
            {
              id: "screening",
              title: "Screening / Shortlisted",
              statuses: [ApplicationStatus.APPLIED, ApplicationStatus.SCREENING, ApplicationStatus.SHORTLISTED],
              bgHeader: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/30",
              textColor: "text-indigo-700 dark:text-indigo-300",
              icon: Sparkles,
              iconColor: "text-indigo-500",
              targetStatus: ApplicationStatus.SHORTLISTED
            },
            {
              id: "interviewing",
              title: "Interview Phase",
              statuses: [ApplicationStatus.INTERVIEWING],
              bgHeader: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/30",
              textColor: "text-amber-700 dark:text-amber-300",
              icon: Activity,
              iconColor: "text-amber-500",
              targetStatus: ApplicationStatus.INTERVIEWING
            },
            {
              id: "offered",
              title: "Offer Phase",
              statuses: [ApplicationStatus.OFFERED],
              bgHeader: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30",
              textColor: "text-emerald-700 dark:text-emerald-300",
              icon: UserCheck,
              iconColor: "text-emerald-500",
              targetStatus: ApplicationStatus.OFFERED
            },
            {
              id: "rejected",
              title: "Rejected Phase",
              statuses: [ApplicationStatus.REJECTED],
              bgHeader: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30",
              textColor: "text-rose-700 dark:text-rose-300",
              icon: X,
              iconColor: "text-rose-500",
              targetStatus: ApplicationStatus.REJECTED
            }
          ].map((column) => {
            const columnApps = filteredApplications.filter(app => {
              if (column.id === "screening") {
                return isNewCandidate(app) || isPendingEvaluation(app) || isAIShortlisted(app, matchThreshold);
              }
              if (column.id === "interviewing") {
                return isInterviewStage(app);
              }
              if (column.id === "offered") {
                return isOfferedStage(app) || isHiredStage(app);
              }
              if (column.id === "rejected") {
                return isRejectedStage(app);
              }
              return false;
            });
            const ColumnIcon = column.icon;

            return (
              <div 
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.targetStatus)}
                className="bg-slate-50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-4 min-h-[550px] transition-all hover:shadow-xs"
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-xl border ${column.bgHeader} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <ColumnIcon className={`h-4.5 w-4.5 ${column.iconColor}`} />
                    <span className={`text-xs font-black uppercase tracking-wider ${column.textColor}`}>
                      {column.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${column.textColor} bg-white dark:bg-slate-900 shadow-3xs`}>
                    {columnApps.length}
                  </span>
                </div>

                {/* Column Body (Scrollable List of Draggable Cards) */}
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[700px] pr-1 scrollbar-thin">
                  {columnApps.length === 0 ? (
                    <div className="h-40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        Drag candidates here
                      </p>
                    </div>
                  ) : (
                    columnApps.map((app, idx) => {
                      const appCand = app.candidate;
                      const appJob = app.job;
                      const isSelected = selectedApp?.id === app.id;
                      const score = app.aiEvaluation?.score ?? app.atsScore ?? app.aiScore ?? app.candidate?.aiScore ?? 85;
                      const isHighFit = !!(highFitHighlight && score !== undefined && Number(score) >= matchThreshold);

                      return (
                        <div
                          key={`${app.id || 'app'}-${idx}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedApp(null);
                            } else {
                              setSelectedApp(app);
                            }
                          }}
                          className={`bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl p-4 shadow-3xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 group relative ${
                            isSelected ? "ring-2 ring-indigo-500/50" : ""
                          } ${
                            isHighFit ? "border-l-4 border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" : ""
                          }`}
                        >
                          {/* Drag handle or indicator on hover */}
                          <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 transition-opacity">
                            <span className="text-sm">⋮⋮</span>
                          </div>

                          {/* Candidate Avatar & Name */}
                          <div className="flex gap-2.5 items-start">
                            <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0 shadow-2xs ${
                              isHighFit ? "bg-emerald-600 ring-2 ring-emerald-500/20" : "bg-indigo-600"
                            }`}>
                              {getInitials(appCand?.firstName, appCand?.lastName, appCand?.name)}
                            </div>
                            <div className="min-w-0 pr-4">
                              <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate text-xs">
                                {appCand?.firstName} {appCand?.lastName}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {appCand?.currentRole || appJob?.title || "Not specified"}
                              </p>
                            </div>
                          </div>

                          {/* Middle Details */}
                          <div className="mt-3.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                {appJob?.title || "Not specified"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800/40">
                              <span className="font-mono text-slate-400 font-bold">Exp: {appCand?.experienceYears || 0} yrs</span>
                              <span className="font-mono font-black text-slate-700 dark:text-slate-200">
                                {appCand?.expectedCTC ? `${appCand.expectedCTC} LPA` : "—"}
                              </span>
                            </div>
                          </div>

                          {/* Real-time Interview Badge */}
                          {(() => {
                            const interview = getCandidateInterview(appCand?.id);
                            if (!interview) return null;
                            const isUpcoming = interview.status === "Upcoming" || interview.status === "SCHEDULED" || interview.status === "Scheduled";
                            const isCompleted = interview.status === "Completed" || interview.status === "COMPLETED";
                            const isCancelled = interview.status === "Cancelled" || interview.status === "CANCELLED";
                            
                            return (
                              <div className={`mt-2.5 p-2 rounded-lg border text-[10px] space-y-1 ${
                                isUpcoming 
                                  ? "bg-indigo-50/55 border-indigo-150 dark:bg-indigo-950/20 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 animate-pulse" 
                                  : isCompleted
                                    ? "bg-emerald-50/55 border-emerald-150 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                    : "bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800/50 text-slate-500"
                              }`}>
                                <div className="flex items-center justify-between font-bold">
                                  <span>{interview.round || "Interview"}</span>
                                  <span className="uppercase tracking-wider text-[8px]">
                                    {isUpcoming ? "Scheduled" : isCompleted ? "Completed" : "Cancelled"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 font-medium font-mono text-[9px] mt-0.5">
                                  <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                  <span>{interview.date} @ {interview.time}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                  Interviewer: {interview.interviewer}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Badges Footer */}
                          <div className="mt-3 flex items-center justify-between gap-2.5 flex-wrap">
                            {score ? (
                              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 border rounded ${getScoreColor(score)}`}>
                                {score}% Fit
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400">No score</span>
                            )}

                            {appCand?.source && (
                              <span className={`text-[8.5px] font-black border px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${getSourceBadgeClass(appCand.source, false)}`}>
                                {appCand.source}
                              </span>
                            )}
                          </div>

                          {/* Quick buttons inside card on hover */}
                          <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(app.candidate, app);
                              }}
                              className="px-2 py-1 text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(isSelected ? null : app);
                              }}
                              className={`px-2 py-1 text-[10px] font-extrabold rounded border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600"
                                  : "bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30"
                              }`}
                            >
                              AI Review
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Hidden Custom Drag Image Element for Browser Drag Ghost */}
      <div 
        id="custom-drag-image" 
        className="fixed bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 w-64 pointer-events-none"
        style={{ position: "fixed", top: "-1000px", left: "-1000px", zIndex: -100 }}
      >
        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-black text-xs uppercase flex items-center justify-center shrink-0">
          {draggedApp?.candidate ? getInitials(draggedApp.candidate.firstName, draggedApp.candidate.lastName, draggedApp.candidate.name) : "CN"}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-black truncate text-white leading-tight">
            {draggedApp?.candidate ? `${draggedApp.candidate.firstName} ${draggedApp.candidate.lastName}` : "Candidate"}
          </p>
          <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
            {draggedApp?.job?.title || "Position"}
          </p>
        </div>
        {draggedApp?.aiEvaluation?.score && (
          <div className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-950/40 text-indigo-400 rounded-sm border border-indigo-900/30 shrink-0">
            {draggedApp.aiEvaluation.score}% Match
          </div>
        )}
      </div>

      {/* Bottom Floating Drag & Drop Target Panel */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDragEnd}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none"
          >
            <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800/80 shadow-[0_12px_45px_rgba(0,0,0,0.6)] rounded-2xl p-6 backdrop-blur-md flex flex-col items-center select-none pointer-events-auto">
              {/* Header inside floating bar */}
              <div className="text-center mb-4 flex items-center gap-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-950/55 border border-indigo-900/40 px-2.5 py-0.5 rounded-full">
                  Pipeline Stage Controller
                </span>
                <p className="text-xs text-slate-300 font-bold">
                  Drag and release <span className="text-indigo-400 font-black">{draggedApp?.candidate?.firstName} {draggedApp?.candidate?.lastName}</span> into the desired hiring stage.
                </p>
              </div>

              {/* Destination cards */}
              <div className="grid grid-cols-3 gap-4 w-full">
                {/* 📅 Interview Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (activeHoverTarget !== "interview") setActiveHoverTarget("interview");
                  }}
                  onDragEnter={() => setActiveHoverTarget("interview")}
                  onDragLeave={() => setActiveHoverTarget(null)}
                  onDrop={(e) => handleDropAction(e, "interview")}
                  className={`p-4 rounded-xl border transition-all duration-250 flex flex-col items-center justify-center text-center cursor-pointer relative h-[140px] select-none ${
                    activeHoverTarget === "interview"
                      ? "border-amber-500 bg-amber-950/45 scale-[1.03] shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20"
                      : activeHoverTarget !== null
                      ? "border-slate-800/30 bg-slate-900/20 opacity-30 scale-[0.98] blur-[0.5px]"
                      : "border-slate-800/80 bg-slate-900/80 hover:border-slate-700 shadow-md"
                  }`}
                >
                  <Calendar className={`h-6 w-6 mb-2 transition-transform duration-200 ${
                    activeHoverTarget === "interview" ? "text-amber-450 scale-110" : "text-amber-500/85"
                  }`} />
                  <h4 className="text-xs font-black text-white tracking-wide">
                    📅 Interview
                  </h4>
                  <div className="h-6 mt-1.5 flex items-center justify-center">
                    {activeHoverTarget === "interview" ? (
                      <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1 animate-pulse">
                        <Check className="h-3.5 w-3.5 text-amber-300" /> Release to drop
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Schedule interview
                      </span>
                    )}
                  </div>
                </div>

                {/* 💼 Offer Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (activeHoverTarget !== "offer") setActiveHoverTarget("offer");
                  }}
                  onDragEnter={() => setActiveHoverTarget("offer")}
                  onDragLeave={() => setActiveHoverTarget(null)}
                  onDrop={(e) => handleDropAction(e, "offer")}
                  className={`p-4 rounded-xl border transition-all duration-250 flex flex-col items-center justify-center text-center cursor-pointer relative h-[140px] select-none ${
                    activeHoverTarget === "offer"
                      ? "border-emerald-500 bg-emerald-950/45 scale-[1.03] shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/20"
                      : activeHoverTarget !== null
                      ? "border-slate-800/30 bg-slate-900/20 opacity-30 scale-[0.98] blur-[0.5px]"
                      : "border-slate-800/80 bg-slate-900/80 hover:border-slate-700 shadow-md"
                  }`}
                >
                  <Award className={`h-6 w-6 mb-2 transition-transform duration-200 ${
                    activeHoverTarget === "offer" ? "text-emerald-450 scale-110" : "text-emerald-500/85"
                  }`} />
                  <h4 className="text-xs font-black text-white tracking-wide">
                    💼 Offer
                  </h4>
                  <div className="h-6 mt-1.5 flex items-center justify-center">
                    {activeHoverTarget === "offer" ? (
                      <span className="text-[10px] text-emerald-300 font-extrabold flex items-center gap-1 animate-pulse">
                        <Check className="h-3.5 w-3.5 text-emerald-300" /> Release to drop
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Generate offer letter
                      </span>
                    )}
                  </div>
                </div>

                {/* ❌ Reject Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (activeHoverTarget !== "reject") setActiveHoverTarget("reject");
                  }}
                  onDragEnter={() => setActiveHoverTarget("reject")}
                  onDragLeave={() => setActiveHoverTarget(null)}
                  onDrop={(e) => handleDropAction(e, "reject")}
                  className={`p-4 rounded-xl border transition-all duration-250 flex flex-col items-center justify-center text-center cursor-pointer relative h-[140px] select-none ${
                    activeHoverTarget === "reject"
                      ? "border-rose-500 bg-rose-950/45 scale-[1.03] shadow-[0_0_25px_rgba(239,68,68,0.25)] ring-1 ring-rose-500/20"
                      : activeHoverTarget !== null
                      ? "border-slate-800/30 bg-slate-900/20 opacity-30 scale-[0.98] blur-[0.5px]"
                      : "border-slate-800/80 bg-slate-900/80 hover:border-slate-700 shadow-md"
                  }`}
                >
                  <XCircle className={`h-6 w-6 mb-2 transition-transform duration-200 ${
                    activeHoverTarget === "reject" ? "text-rose-450 scale-110" : "text-rose-500/85"
                  }`} />
                  <h4 className="text-xs font-black text-white tracking-wide">
                    ❌ Reject
                  </h4>
                  <div className="h-6 mt-1.5 flex items-center justify-center">
                    {activeHoverTarget === "reject" ? (
                      <span className="text-[10px] text-rose-300 font-extrabold flex items-center gap-1 animate-pulse">
                        <Check className="h-3.5 w-3.5 text-rose-300" /> Release to drop
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Reject candidate
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {successAnimType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl flex flex-col items-center"
            >
              <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                successAnimType === "Interview" ? "bg-amber-500/10 border border-amber-500/30 text-amber-500" :
                successAnimType === "Offer" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500" :
                "bg-rose-500/10 border border-rose-500/30 text-rose-500"
              }`}>
                {successAnimType === "Interview" && <Calendar className="h-10 w-10 animate-pulse" />}
                {successAnimType === "Offer" && <Award className="h-10 w-10 animate-pulse" />}
                {successAnimType === "Reject" && <XCircle className="h-10 w-10 animate-pulse" />}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 font-display">
                Transition Complete
              </h3>
              <p className="text-xs text-slate-400 px-4 leading-relaxed">
                {successAnimType === "Interview" && "Candidate has been scheduled and moved to the Interviewing Stage."}
                {successAnimType === "Offer" && "Official offer letter has been drafted and candidate moved to the Offer Stage."}
                {successAnimType === "Reject" && "Candidate application has been rejected and archived."}
              </p>
              
              <div className="mt-6 flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded-full text-[10px] text-emerald-400 font-bold">
                <Check className="h-3.5 w-3.5" />
                <span>Stage updated successfully</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Drag & Drop Modals */}
      
      {/* 1. Interview Scheduler Modal */}
      {showDragSchedulerModal && dragTargetApp && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-amber-500 p-6 text-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-slate-950/10 p-2.5 rounded-xl">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display leading-tight">Schedule Interview</h3>
                  <p className="text-xs font-bold text-slate-900/80">
                    For {dragTargetApp.candidate?.firstName} {dragTargetApp.candidate?.lastName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDragSchedulerModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-950/10 text-slate-950 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Interview Round</label>
                <select 
                  value={schedulerRound}
                  onChange={(e) => setSchedulerRound(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold cursor-pointer"
                >
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Technical Interview 1">Technical Interview 1</option>
                  <option value="Technical Interview 2">Technical Interview 2</option>
                  <option value="HR Interview">HR Interview</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Date</label>
                  <input 
                    type="date"
                    value={schedulerDate}
                    onChange={(e) => setSchedulerDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Time</label>
                  <input 
                    type="time"
                    value={schedulerTime}
                    onChange={(e) => setSchedulerTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Type</label>
                  <select 
                    value={schedulerType}
                    onChange={(e) => setSchedulerType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option value="Online">Online Video Call</option>
                    <option value="Offline">On-Site Interview</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Interviewer</label>
                  <input 
                    type="text"
                    placeholder="e.g. John Doe"
                    value={schedulerInterviewer}
                    onChange={(e) => setSchedulerInterviewer(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              {schedulerType === "Online" ? (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Platform</label>
                  <input 
                    type="text"
                    value={schedulerPlatform}
                    onChange={(e) => setSchedulerPlatform(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Location</label>
                  <input 
                    type="text"
                    value={schedulerLocation}
                    onChange={(e) => setSchedulerLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Scheduler Notes & Agenda</label>
                <textarea 
                  rows={3}
                  value={schedulerNotes}
                  onChange={(e) => setSchedulerNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3">
              <button 
                onClick={() => setShowDragSchedulerModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmScheduler}
                disabled={statusUpdating || !schedulerInterviewer}
                className="px-4 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 font-sans"
              >
                {statusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                <span>Schedule & Move Stage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Offer Generation Modal */}
      {showDragOfferModal && dragTargetApp && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-slate-950/10 p-2.5 rounded-xl">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display leading-tight">Draft Offer Letter</h3>
                  <p className="text-xs font-bold text-emerald-100">
                    For {dragTargetApp.candidate?.firstName} {dragTargetApp.candidate?.lastName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDragOfferModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-950/10 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Annual CTC (LPA)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={offerSalary}
                      onChange={(e) => setOfferSalary(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Notice Period</label>
                  <select 
                    value={offerNoticePeriod}
                    onChange={(e) => setOfferNoticePeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold cursor-pointer"
                  >
                    <option value="Immediate">Immediate Joiner</option>
                    <option value="15 Days">15 Days Notice</option>
                    <option value="30 Days">30 Days Notice</option>
                    <option value="60 Days">60 Days Notice</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Joining Date</label>
                  <input 
                    type="date"
                    value={offerJoiningDate}
                    onChange={(e) => setOfferJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Expiry Date</label>
                  <input 
                    type="date"
                    value={offerExpiryDate}
                    onChange={(e) => setOfferExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Reporting Manager</label>
                <input 
                  type="text"
                  value={offerManager}
                  onChange={(e) => setOfferManager(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Standard Perks & Benefits</label>
                <textarea 
                  rows={3}
                  value={offerBenefits}
                  onChange={(e) => setOfferBenefits(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold resize-none font-sans"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3">
              <button 
                onClick={() => setShowDragOfferModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmOffer}
                disabled={statusUpdating || !offerSalary || !offerJoiningDate}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {statusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                <span>Generate & Move Stage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reject Confirmation Modal */}
      {showDragRejectModal && dragTargetApp && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-rose-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-slate-950/10 p-2.5 rounded-xl">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display leading-tight">Reject Candidate</h3>
                  <p className="text-xs font-bold text-rose-100">
                    Archive {dragTargetApp.candidate?.firstName} {dragTargetApp.candidate?.lastName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDragRejectModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-950/10 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/20 rounded-2xl flex gap-3 items-start">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400 block mb-0.5">Application Archival</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block">
                    Rejecting will transition the candidate status, notify them immediately via email if enabled, and move this card out of active recruitment stages.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Primary Rejection Reason</label>
                <select 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold cursor-pointer"
                >
                  <option value="Skills Alignment">Technical Skills Mismatch</option>
                  <option value="Culture Alignment">Culture Fit Misalignment</option>
                  <option value="Compensation Alignment">Budget / Compensation Expectation</option>
                  <option value="Notice Period Constraint">Notice Period Constraint</option>
                  <option value="Position Closed">Position Filled / Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Internal Rejection Notes</label>
                <textarea 
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-1">
                <input 
                  type="checkbox"
                  id="send-reject-email"
                  checked={rejectSendEmail}
                  onChange={(e) => setRejectSendEmail(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-md border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500/20 cursor-pointer"
                />
                <label htmlFor="send-reject-email" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  Send candidate standard polite feedback email automatically
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-3">
              <button 
                onClick={() => setShowDragRejectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmReject}
                disabled={statusUpdating}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {statusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>Reject Candidate & Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal (Complete Manual Form, No CV Upload) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white rounded-t-xl">
              <div>
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-indigo-400" />
                  <span>Edit Candidate Profile</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Update profile information, target job pipeline, and recruitment tracking details.</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Complete Manual Candidate Details Form */}
            <div className="p-6 overflow-y-auto space-y-5 text-left">
              {/* 1. Experience Level Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Experience Level</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddExperienceLevel("Fresher")}
                    className={`py-2 px-4 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      addExperienceLevel === "Fresher"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Fresher / College Graduate
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddExperienceLevel("Experienced")}
                    className={`py-2 px-4 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      addExperienceLevel === "Experienced"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Experienced Professional
                  </button>
                </div>
              </div>

              {/* 2. Personal Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* 3. Professional Experience (Only if Experienced) */}
              {addExperienceLevel === "Experienced" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Role</label>
                    <input
                      type="text"
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Company</label>
                    <input
                      type="text"
                      value={currentCompany}
                      onChange={(e) => setCurrentCompany(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}

              {/* 4. Target Pipeline / Experience / Source / Location Grid */}
              <div className={`grid grid-cols-1 ${addExperienceLevel === "Experienced" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Job Pipeline</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                          {Array.isArray(jobs) && jobs.map((job) => (
                            <option key={job.id || job.jobId} value={job.jobId || job.id}>{formatJobId(job.jobId || job.id)} — {cleanJobTitle(job.title)}</option>
                          ))}
                  </select>
                </div>
                {addExperienceLevel === "Experienced" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Application Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Naukri">Naukri</option>
                    <option value="Career Website">Career Website</option>
                    <option value="Referral">Referral</option>
                    <option value="External Link">External Link</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location</label>
                  <select
                    value={candidateLocation || "Pune, India"}
                    onChange={(e) => setCandidateLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Pune, India">Pune, India</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              {/* 5. HR Tracker Parameters (CTC, Notes, Approval) */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">HR Tracker Parameters</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current CTC (LPA)</label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={addCurrentCTC || ""}
                      onChange={(e) => setAddCurrentCTC(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected CTC (LPA)</label>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={addExpectedCTC || ""}
                      onChange={(e) => setAddExpectedCTC(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HR Approval Status</label>
                    <select
                      value={addHRApprovalStatus}
                      onChange={(e) => setAddHRApprovalStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                    >
                      <option value="pending">Pending Verification</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected / Hold</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HR Evaluation Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Recruitment review or verification remarks..."
                    value={addHRNotes}
                    onChange={(e) => setAddHRNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium resize-none"
                  />
                </div>
              </div>

              {/* 6. Key Skills */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key Technical Skills (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, Python, PostgreSQL"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                />
              </div>

              {/* 7. Resume CV Info / View CV Link (No upload/dropzone in Edit mode) */}
              <div className="p-3.5 bg-slate-100/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {editingCandidate?.resumeFileName || "Candidate Resume Document"}
                    </p>
                    <p className="text-[10px] text-slate-400">Attached physical resume document is preserved.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingResumeApp({ candidate: editingCandidate, candidateId: editingCandidate?.id || editingCandidate?.candidateId })}
                  className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View CV</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditCandidate}
                disabled={updatingTracker}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {updatingTracker ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep-Dive Active Review Details Panel */}
      {selectedApp && cand && (
        <div id="deep-dive-review" className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-250">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-400/20 text-white font-black uppercase font-mono">
                {getInitials(cand.firstName, cand.lastName, cand.name)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded">
                    {cand.candidateId || selectedApp.candidateId || "C001"}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Candidate ID</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-white">
                  Detailed Diagnostic: {cand.firstName} {cand.lastName}
                </h3>
                <p className="text-xs text-slate-300">
                  {cand.currentRole} at {cand.currentCompany} • Pipeline: <span className="text-indigo-300 font-semibold">{job?.title}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedApp(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Close AI Review
            </button>
          </div>

          {/* Candidate Form Submission Details Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-left space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-4">
              <div>
                <h4 className="font-display font-extrabold text-slate-950 dark:text-white text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Submitted Candidate Profile & Form Credentials</span>
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium font-sans">
                  Comprehensive candidate data submitted via the job application portal.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono border uppercase tracking-wider ${
                  cand.experienceLevel === "Fresher" || cand.candidateType === "fresher"
                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/30"
                    : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30"
                }`}>
                  {cand.experienceLevel === "Fresher" || cand.candidateType === "fresher" ? "Academic Fresher" : "Experienced Professional"}
                </span>
                {cand.cvFileName && (
                  <button
                    onClick={() => setViewingResumeApp(selectedApp)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded transition-all cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>View CV ({cand.cvFileName})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Section 1: Personal & Contact */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Personal & Contact</h5>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Hash className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Candidate ID</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{cand.candidateId || selectedApp.candidateId || "C001"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Full Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cand.firstName} {cand.lastName}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Email Address</span>
                      <a href={`mailto:${cand.email}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{cand.email}</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Phone Number</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{cand.phone || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Current Location</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{cand.location || cand.currentLocation || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Logistics & Fit */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Logistics & Job Fit</h5>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Briefcase className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Experience Level</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cand.experienceLevel || (cand.experienceYears ? `${cand.experienceYears} Years` : "—")}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Notice Period</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cand.noticePeriod || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Relocate to Pune?</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cand.relocateToPune === "Yes"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30"
                      }`}>
                        {cand.relocateToPune || "Yes"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Globe className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Profiles & Portfolios</span>
                      <div className="flex gap-2.5 mt-1">
                        {cand.linkedinUrl && (
                          <a href={cand.linkedinUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold">
                            <span>LinkedIn</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {cand.portfolioUrl && (
                          <a href={cand.portfolioUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold">
                            <span>Portfolio</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {!cand.linkedinUrl && !cand.portfolioUrl && <span className="text-slate-400 dark:text-slate-500">No profile links provided</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Professional (Experienced) OR Academic (Fresher) */}
              <div className="md:col-span-2 space-y-4">
                {cand.experienceLevel !== "Fresher" && cand.candidateType !== "fresher" ? (
                  <>
                    <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Professional & Financial Info</h5>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Current Company</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cand.currentCompany || "Not specified"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Current Role</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cand.currentRole || "Not specified"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Current CTC (Annual)</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {cand.currentCTC ? `${cand.currentCTC} LPA` : "Not provided"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Expected CTC (Annual)</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {cand.expectedCTC ? `${cand.expectedCTC} LPA` : "Not provided"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">in hand salary</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cand.inHandSalary || "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Total Experience</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cand.totalExperience || (cand.experienceYears ? `${cand.experienceYears} Years` : "—")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Academic Qualifications</h5>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-start gap-2.5">
                        <GraduationCap className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Highest Education</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cand.highestEducation || "Graduate / Post Graduate"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <GraduationCap className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Specialization</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{cand.specialization || "Computer Science / General Engineering"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-0.5">Year of Passing</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{cand.yearOfPassing || "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 col-span-2">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="w-full">
                          <span className="block text-slate-400 dark:text-slate-500 font-medium mb-1">Academic/Portfolio Projects Description</span>
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-xs max-h-[100px] overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                            {cand.projectsWorkedOn || cand.projectsDescription || "No project specifications supplied."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Skills Badges Subsection */}
            {cand.skills && (Array.isArray(cand.skills) ? cand.skills.length > 0 : String(cand.skills).trim().length > 0) && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-2">Submitted Key Skills</h5>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(cand.skills) ? cand.skills : String(cand.skills).split(",")).map((skill: string, idx: number) => (
                    <span
                      key={`cand-skill-${idx}`}
                      className="px-2.5 py-1 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md border border-indigo-100/20"
                    >
                      {typeof skill === "string" ? skill.trim() : skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Candidate Applications & Applied Jobs Section (Retrieved via candidateId) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-display font-extrabold text-slate-950 dark:text-white text-base flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Applications / Applied Jobs</span>
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  All active and past job application records for this candidate profile.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                {candidateApplications.length} {candidateApplications.length === 1 ? "Application" : "Applications"}
              </span>
            </div>

            {candidateApplications.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-850/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 font-medium">No applications found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-850/50">
                      <th className="py-2.5 px-3">Application ID</th>
                      <th className="py-2.5 px-3">Job ID</th>
                      <th className="py-2.5 px-3">Job Title</th>
                      <th className="py-2.5 px-3">ATS Score</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Applied Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {candidateApplications.map((app, idx) => (
                      <tr key={`cand-app-${app.applicationId || idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {app.applicationId}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {app.jobId}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {app.appliedRole || app.jobTitle || app.job?.title || "Position Role"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30">
                            {app.atsScore ?? 85}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border ${
                            app.status === "Hired" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            app.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30"
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {(app.createdAt || "").split("T")[0] || "Recent"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Match and AI Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* AI Score Radial/Meter Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between md:col-span-1">
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                  <span>AI Match Score</span>
                </h4>
                <p className="text-xs text-slate-400">Calculated suitability rating.</p>
              </div>

              <div className="my-6 flex flex-col items-center justify-center">
                {evalData ? (
                  <div className="relative flex items-center justify-center h-28 w-28">
                    {/* Circular progress meter */}
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke={evalData.score >= 85 ? "#6366f1" : evalData.score >= 70 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - evalData.score / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="text-center">
                      <span className="text-3xl font-display font-extrabold text-slate-900">{evalData.score}%</span>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">match</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-28 w-28 rounded-full border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-3">
                    <Sparkles className="h-6 w-6 text-slate-300 stroke-[1.5]" />
                    <span className="text-[10px] text-slate-400 mt-1.5 font-medium leading-tight">Evaluation Pending</span>
                  </div>
                )}
              </div>

              {evalData ? (
                <div className={`text-center py-2 px-3 rounded-lg border text-xs font-semibold ${getScoreColor(evalData.score)}`}>
                  {evalData.score >= 85 ? "Excellent Suitability" : evalData.score >= 70 ? "Moderate Suitability" : "Marginal Suitability"}
                </div>
              ) : (
                <button
                  onClick={() => handleScreenResume(selectedApp)}
                  disabled={screening}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  {screening ? (
                    <>
                       <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                       <span>Screening...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                      <span>Screen Resume</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Executive Summary Fit Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs md:col-span-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-500" />
                  <span>Executive Intelligence Match</span>
                </h4>
                <p className="text-xs text-slate-400">Contextual alignment generated by Gemini.</p>
              </div>

              {evalData ? (
                <div className="my-4 space-y-3 flex-1 overflow-y-auto max-h-[160px]">
                  <p className="text-slate-700 text-xs italic font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150">
                    "{evalData.summary}"
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    <strong className="text-slate-800 font-semibold block mb-0.5">Fit Analysis Reasoning:</strong>
                    {evalData.fitReasoning}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <p className="text-xs">No analysis has been compiled yet. Run the screening model to extract AI analytics.</p>
                  {!screening && (
                    <button 
                      onClick={() => handleScreenResume(selectedApp)}
                      className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Analyze with Gemini</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {evalData && (
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  Processed via Gemini 3.6 Flash
                </div>
              )}
            </div>

            {/* Verdict & Status Console (AI & HR Pipeline Controller) */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, ApplicationStatus.SHORTLISTED)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs md:col-span-1 flex flex-col justify-between transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-indigo-500" />
                    <span>AI & HR Pipeline Decision Console</span>
                  </h4>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    AI & HR Co-Pilot
                  </span>
                </div>
                <p className="text-xs text-slate-400">Collaborative candidate evaluation & stage control.</p>
              </div>

              <div className="my-3 flex-1 flex flex-col justify-center">
                <div className="text-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Current Stage</span>
                  <div className="flex justify-center">
                    {selectedApp.status === "Rejected" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-black rounded-lg uppercase tracking-wider">
                        <XCircle className="h-4 w-4 text-rose-500" />
                        <span>Rejected (AI & HR)</span>
                      </span>
                    ) : selectedApp.status === "Offered" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-lg uppercase tracking-wider">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        <span>Offered (AI & HR)</span>
                      </span>
                    ) : selectedApp.status === "Interviewing" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-black rounded-lg uppercase tracking-wider">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        <span>Interviewing (AI & HR)</span>
                      </span>
                    ) : selectedApp.status === "Shortlisted" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-black rounded-lg uppercase tracking-wider">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span>Shortlisted (AI & HR)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-black rounded-lg uppercase tracking-wider">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        <span>{selectedApp.status || "Applied"} (AI & HR)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {selectedApp.status === "Rejected" 
                      ? "Candidate is in the rejected stage. Rejection notification verified by AI & HR." 
                      : selectedApp.status === "Offered" 
                      ? "Offer extended! Active employment agreement ready for candidate review." 
                      : selectedApp.status === "Interviewing" 
                      ? "Technical & HR interviews scheduled and synchronized." 
                      : selectedApp.status === "Shortlisted"
                      ? "Candidate qualified & shortlisted by AI screening algorithm and HR team."
                      : "Candidate profile indexed in active review pipeline."}
                  </p>
                </div>
              </div>

              {/* Status Action Console for AI & HR */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  AI & HR Stage Transition Actions
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus(ApplicationStatus.SHORTLISTED, selectedApp)}
                    disabled={statusUpdating}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedApp.status === "Shortlisted"
                        ? "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/50 dark:text-purple-200"
                        : "bg-white hover:bg-purple-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span>Shortlist (AI & HR)</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(ApplicationStatus.INTERVIEWING, selectedApp)}
                    disabled={statusUpdating}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedApp.status === "Interviewing"
                        ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-200"
                        : "bg-white hover:bg-amber-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Calendar className="h-3 w-3 text-amber-500" />
                    <span>Interview (AI & HR)</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(ApplicationStatus.OFFERED, selectedApp)}
                    disabled={statusUpdating}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedApp.status === "Offered"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200"
                        : "bg-white hover:bg-emerald-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <UserCheck className="h-3 w-3 text-emerald-500" />
                    <span>Offer (AI & HR)</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(ApplicationStatus.REJECTED, selectedApp)}
                    disabled={statusUpdating}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedApp.status === "Rejected"
                        ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/50 dark:text-rose-200"
                        : "bg-white hover:bg-rose-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <XCircle className="h-3 w-3 text-rose-500" />
                    <span>Reject (AI & HR)</span>
                  </button>
                </div>

                <button
                  onClick={() => handleUpdateStatus(ApplicationStatus.APPLIED, selectedApp)}
                  disabled={statusUpdating}
                  className="w-full mt-1 px-2 py-1 text-[9.5px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-dashed border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-center"
                >
                  Reset Stage to Applied / Screening
                </button>
              </div>
            </div>

          </div>

          {/* Strengths, Gaps, and Questions Panel */}
          {evalData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Strengths Grid */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <h4 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                  <span>Identified Core Strengths</span>
                </h4>
                <ul className="space-y-2.5">
                  {(evalData?.strengths || []).map((str, i) => (
                    <li key={`strength-${i}`} className="flex items-start gap-2 text-slate-700 text-xs leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps Grid */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <h4 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Potential Requirements Gaps</span>
                </h4>
                <ul className="space-y-2.5">
                  {(evalData?.gaps || []).map((gap, i) => (
                    <li key={`gap-${i}`} className="flex items-start gap-2 text-slate-700 text-xs leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Curated AI Interview Questions */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 md:col-span-2">
                <h4 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-indigo-500" />
                  <span>Targeted AI Sourced Interview Questions</span>
                </h4>
                <p className="text-xs text-slate-400 mb-2">Tailored questions specifically engineered to test candidate experience against open goals.</p>
                <div className="space-y-3">
                  {(evalData?.interviewQuestions || []).map((q, i) => (
                    <div key={`question-${i}`} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-800 text-xs font-medium leading-relaxed flex gap-3 items-start">
                      <span className="h-5 w-5 rounded-full bg-indigo-50/50 text-indigo-600 font-mono flex items-center justify-center shrink-0 font-bold border border-indigo-200">
                        {i + 1}
                      </span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Copilot Active Action Hub */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 text-white animate-fade-in mt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                    <div>
                      <h4 className="font-display font-bold text-sm sm:text-base text-white">⚡ AI Copilot Active Action Hub</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Automated communications and scheduler Blueprints curated specifically for this candidate.</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    Aura Copilot Active
                  </span>
                </div>

                {/* Tab select Buttons */}
                <div className="flex border-b border-slate-800 pb-2.5 gap-2 overflow-x-auto scrollbar-thin select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab("email");
                      setCopiedText(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeActionTab === "email"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Personalized Outreach</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab("rubric");
                      setCopiedText(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeActionTab === "rubric"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <ListTodo className="h-3.5 w-3.5" />
                    <span>Interview Rubric</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab("timezone");
                      setCopiedText(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeActionTab === "timezone"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Timezone Alignment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab("emailLogs");
                      setCopiedText(false);
                      fetchEmailLogs();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeActionTab === "emailLogs"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Sent Email Logs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionTab("tracker");
                      setCopiedText(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeActionTab === "tracker"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>HR Candidate Tracker</span>
                  </button>
                </div>

                {/* Tab content bodies */}
                <div className="space-y-4">
                  {activeActionTab === "email" && (
                    <div className="space-y-3.5 animate-fade-in">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed relative">
                        <div className="absolute top-3.5 right-3.5 text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-bold">
                          Personalized Outreach
                        </div>
                        <p className="font-bold text-white mb-2 pb-2 border-b border-slate-800">
                          Subject: Quick Chat regarding {selectedApp.job?.title || "Open Role"} opportunity at Acme Corp
                        </p>
                        <p className="whitespace-pre-line">
                          {`Dear ${selectedApp.candidate?.firstName || "Candidate"},\n\nHope this message finds you well!\n\nI am reaching out from the recruitment team at Acme Corp. We recently ran our Aura AI screening engine over your CV for our open **${selectedApp.job?.title || "role"}** position, and your profile is an exceptional match!\n\nYour experience in **${(selectedApp.candidate?.skills || []).slice(0, 3).join(", ") || "the requested stack"}** and **${selectedApp.candidate?.experienceYears || 3} years** of chronological professional experience align beautifully with our upcoming scale goals. We specifically appreciated your contributions at **${selectedApp.candidate?.currentCompany || "your current organization"}**.\n\nAre you open to a brief 15-minute phone alignment call sometime this week?\n\nBest regards,\nHR Recruiting & Talent Operations\nAcme Corp`}
                        </p>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const emailText = `Subject: Quick Chat regarding ${selectedApp.job?.title || "Open Role"} opportunity at Acme Corp\n\nDear ${selectedApp.candidate?.firstName || "Candidate"},\n\nHope this message finds you well!\n\nI am reaching out from the recruitment team at Acme Corp. We recently ran our Aura AI screening engine over your CV for our open ${selectedApp.job?.title || "role"} position, and your profile is an exceptional match!\n\nYour experience in ${(selectedApp.candidate?.skills || []).slice(0, 3).join(", ")} and ${selectedApp.candidate?.experienceYears || 3} years of experience align beautifully with our upcoming scale goals. We specifically appreciated your contributions at ${selectedApp.candidate?.currentCompany || "your current organization"}.\n\nAre you open to a brief 15-minute alignment call sometime this week?\n\nBest regards,\nHR Recruiting & Talent Operations\nAcme Corp`;
                            navigator.clipboard.writeText(emailText);
                            setCopiedText(true);
                            triggerToast("📋 Copied email outreach draft to clipboard!");
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-bold transition-all text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>{copiedText ? "Copied!" : "Copy Draft"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const emailText = `Dear ${selectedApp.candidate?.firstName || "Candidate"},\n\nHope this message finds you well!\n\nI am reaching out from the recruitment team at Acme Corp. We recently ran our Aura AI screening engine over your CV for our open ${selectedApp.job?.title || "role"} position, and your profile is an exceptional match!\n\nYour experience in ${(selectedApp.candidate?.skills || []).slice(0, 3).join(", ") || "the requested stack"} and ${selectedApp.candidate?.experienceYears || 3} years of chronological professional experience align beautifully with our upcoming scale goals. We specifically appreciated your contributions at ${selectedApp.candidate?.currentCompany || "your current organization"}.\n\nAre you open to a brief 15-minute phone alignment call sometime this week?\n\nBest regards,\nHR Recruiting & Talent Operations\nAcme Corp`;
                              
                              await axios.post("/api/emails/outreach", {
                                applicationId: selectedApp.id,
                                subject: `Quick Chat regarding ${selectedApp.job?.title || "Open Role"} opportunity at Acme Corp`,
                                body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">${emailText.replace(/\n/g, "<br>")}</div>`
                              });
                              
                              // Refresh logs
                              await fetchEmailLogs();
                              
                              // Select logs tab so they can see it instantly!
                              setActiveActionTab("emailLogs");
                              
                              triggerToast(`📧 Outreach Dispatched & Logged for ${selectedApp.candidate?.firstName}!`);
                            } catch (err) {
                              console.error(err);
                              triggerToast("❌ Failed to log and dispatch outreach.");
                            }
                          }}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Send className="h-3.5 w-3.5 text-white" />
                          <span>Dispatch Email Outreach</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeActionTab === "rubric" && (
                    <div className="space-y-4 animate-fade-in">
                      {!evalData && (
                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                          <div>
                            <span className="font-bold">Aura AI Evaluation Pending:</span> Screen the candidate's resume using the "Screen" or "Screen Resume" buttons above to compile specialized custom rubrics.
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-300">
                        Aura AI created specific, objective evaluation checks for interviewers to probe during technical rounds:
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                          <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest block">Focus Pillar 1</span>
                          <h5 className="font-bold text-[11px] text-white">Stack Competency</h5>
                          <p className="text-[10px] text-slate-400">Validate deep hands-on expertise with <span className="text-indigo-300 font-semibold">{(selectedApp.candidate?.skills || []).slice(0, 2).join(", ") || "relevant frameworks"}</span> and general engineering standards.</p>
                        </div>
                        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                          <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest block">Focus Pillar 2</span>
                          <h5 className="font-bold text-[11px] text-white">Requirements Gaps</h5>
                          <p className="text-[10px] text-slate-400">Evaluate experience on the requirements gap: <span className="text-amber-400 font-semibold">{evalData?.gaps?.[0] || "specific core design frameworks"}</span>.</p>
                        </div>
                        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                          <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest block">Focus Pillar 3</span>
                          <h5 className="font-bold text-[11px] text-white">Operational Leadership</h5>
                          <p className="text-[10px] text-slate-400">Probe candidate's ability to drive projects, coordinate sprint planning, and coordinate with technical stakeholders.</p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast("🖨️ Spooling Technical Evaluation Rubric to local print cache...");
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-bold transition-all text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print Rubric Questionnaire</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast("📋 Copied interviewer assessment guidelines to clipboard!");
                          }}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Copy className="h-3.5 w-3.5 text-white" />
                          <span>Copy Guidelines</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeActionTab === "timezone" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Perfect Schedule Match
                          </span>
                          <h5 className="font-bold text-white text-xs mt-1.5">
                            Target Candidate Location: <span className="text-indigo-400">{selectedApp.candidate?.location || "Remote/Not specified"}</span>
                          </h5>
                          <p className="text-[10px] text-slate-400 max-w-md mt-1 leading-relaxed">
                            Aura timezone optimizer detects that a synchronous meeting during **2:30 PM - 5:30 PM** applicant timezone aligns flawlessly with recruiter office core periods (9:00 AM - 12:00 PM Recruiter local).
                          </p>
                        </div>
                        <div className="h-10 w-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 shrink-0">
                          <Clock className="h-5 w-5 animate-spin-slow" />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast("📅 Dispatched pre-configured Google Meet invite to candidate calendar!");
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Send className="h-3.5 w-3.5 text-white" />
                          <span>Dispatch Google Calendar Invite Slot</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeActionTab === "emailLogs" && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h5 className="font-bold text-xs text-white">Automated Candidate Communication History</h5>
                          <p className="text-[10px] text-slate-400 font-medium">Real-time status updates and automatic email notifications dispatched for this candidate.</p>
                        </div>
                        <button
                          type="button"
                          onClick={fetchEmailLogs}
                          disabled={fetchingEmails}
                          className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-400 font-bold border border-slate-700 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {fetchingEmails ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          <span>Refresh Logs</span>
                        </button>
                      </div>

                      {fetchingEmails && (!Array.isArray(emailLogs) || emailLogs.length === 0) ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                          <span className="text-xs">Fetching candidate email delivery logs...</span>
                        </div>
                      ) : (Array.isArray(emailLogs) && emailLogs.filter((log: any) => log.applicationId === selectedApp?.id).length === 0) ? (
                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-3">
                          <div className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mx-auto">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <h6 className="font-bold text-xs text-white">No Automated Emails Dispatched Yet</h6>
                            <p className="text-[10px] text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                              Emails are sent automatically by Aura when you change the candidate's status to <span className="text-indigo-400 font-semibold">"Shortlisted"</span>, schedule an interview in the <span className="text-indigo-400 font-semibold">"Interviews"</span> tab, or move them to <span className="text-indigo-400 font-semibold">"Offered"</span> / <span className="text-indigo-400 font-semibold">"Rejected"</span>.
                            </p>
                          </div>
                          <div className="pt-2 flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ApplicationStatus.SHORTLISTED)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                            >
                              Simulate Shortlisting
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                          {Array.isArray(emailLogs) && emailLogs
                            .filter((log: any) => log.applicationId === selectedApp?.id)
                            .map((log: any, idx: number) => {
                              const isExpanded = expandedEmailId === log.id;
                              return (
                                <div key={log.id ? `${log.id}-${idx}` : `log-${idx}`} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden transition-all duration-200">
                                  {/* Header clickable bar */}
                                  <div 
                                    onClick={() => setExpandedEmailId(isExpanded ? null : log.id)}
                                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900 cursor-pointer select-none"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                        log.type === "shortlisted" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" :
                                        log.type === "interview" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                                        log.type === "offer" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                                        "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                      }`}>
                                        {log.type === "shortlisted" ? "SL" :
                                         log.type === "interview" ? "IV" :
                                         log.type === "offer" ? "OF" : "RE"}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-[11px] text-white tracking-tight">{log.subject}</span>
                                          <span className="text-[8px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md uppercase">
                                            {log.type}
                                          </span>
                                          {log.status === "simulated" && (
                                            <span className="text-[8px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md">
                                              SIMULATED
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                          To: <span className="font-mono text-slate-300">{log.candidateEmail}</span> • Sent {new Date(log.timestamp).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 justify-end self-end sm:self-center">
                                      {log.type === "offer" && (
                                        <a
                                          href={`/api/emails/download-offer/${selectedApp?.id}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[10px] flex items-center gap-1 transition-all shadow-xs shrink-0"
                                        >
                                          <Download className="h-3 w-3" />
                                          <span>Download Offer Letter</span>
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                                      >
                                        {isExpanded ? "Hide Details" : "Preview Body"}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expandable email body display */}
                                  {isExpanded && (
                                    <div className="border-t border-slate-800 p-4 bg-slate-900 text-slate-300 text-xs">
                                      <div className="mb-2 pb-2 border-b border-slate-800 flex flex-col gap-1 text-[10px] text-slate-400 font-mono">
                                        <div><span className="text-slate-500">From:</span> Aura Talent Operations &lt;aura-hiring@acme-corp.io&gt;</div>
                                        <div><span className="text-slate-500">To:</span> {log.candidateEmail}</div>
                                        {log.smtpDetails && (
                                          <div><span className="text-slate-500">SMTP:</span> <span className="text-indigo-400">{log.smtpDetails}</span></div>
                                        )}
                                      </div>
                                      <div 
                                        className="p-4 bg-white rounded-lg text-slate-800 overflow-x-auto max-h-[300px] shadow-inner font-sans"
                                        dangerouslySetInnerHTML={{ __html: log.body }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {activeActionTab === "tracker" && (
                    <div className="space-y-6 animate-fade-in text-left">
                      {/* HR Verification & Approval section */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Financial Audit */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                          <div className="space-y-3">
                            <h5 className="font-bold text-xs text-white uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>Financial Verification</span>
                            </h5>
                            <div className="space-y-3.5 pt-1">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Current CTC:</span>
                                  <input
                                    type="number"
                                    value={selectedApp.candidate?.currentCTC || ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                                      handleUpdateCandidateFields(selectedApp.candidateId, { currentCTC: val });
                                    }}
                                    placeholder="Current CTC (LPA)"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500 mt-1"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Expected CTC:</span>
                                  <input
                                    type="number"
                                    value={selectedApp.candidate?.expectedCTC || ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                                      handleUpdateCandidateFields(selectedApp.candidateId, { expectedCTC: val });
                                    }}
                                    placeholder="Expected CTC (LPA)"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500 mt-1"
                                  />
                                </div>
                              </div>

                              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-[11px] space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-slate-400 font-medium">Job Title:</span>
                                  <span className="text-white font-semibold">{selectedApp.job?.title}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400 font-medium">Job Maximum Budget:</span>
                                  <span className="text-indigo-400 font-mono font-bold">
                                    {selectedApp.job?.maxBudget ? `${selectedApp.job.maxBudget} LPA` : "Not set"}
                                  </span>
                                </div>
                                {selectedApp.job?.maxBudget && selectedApp.candidate?.expectedCTC !== undefined && (
                                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-bold">
                                    <span className="text-slate-400 font-medium font-sans">Budget Alignment:</span>
                                    {selectedApp.candidate.expectedCTC > selectedApp.job.maxBudget ? (
                                      <span className="text-rose-400 uppercase text-[9px] tracking-wider font-mono">⚠️ Over Budget by {selectedApp.candidate.expectedCTC - selectedApp.job.maxBudget} LPA</span>
                                    ) : (
                                      <span className="text-emerald-400 uppercase text-[9px] tracking-wider font-mono">✅ In Budget Limits</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 italic mt-2 font-medium">
                            * Changes auto-save instantly to database
                          </div>
                        </div>

                        {/* Approval State Action */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                          <h5 className="font-bold text-xs text-white uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>HR Verification Approval</span>
                          </h5>
                          
                          <div className="space-y-3 pt-1">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Update Verification Status:</span>
                            <div className="grid grid-cols-1 gap-2">
                              <button
                                onClick={() => handleUpdateCandidateFields(selectedApp.candidateId, { hrApprovalStatus: "approved" })}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                                  selectedApp.candidate?.hrApprovalStatus === "approved"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  <span>Approve Candidate</span>
                                </span>
                                {selectedApp.candidate?.hrApprovalStatus === "approved" && "✓"}
                              </button>

                              <button
                                onClick={() => handleUpdateCandidateFields(selectedApp.candidateId, { hrApprovalStatus: "pending" })}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                                  selectedApp.candidate?.hrApprovalStatus === "pending" || !selectedApp.candidate?.hrApprovalStatus
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                  <span>Pending Verification</span>
                                </span>
                                {(selectedApp.candidate?.hrApprovalStatus === "pending" || !selectedApp.candidate?.hrApprovalStatus) && "✓"}
                              </button>

                              <button
                                onClick={() => handleUpdateCandidateFields(selectedApp.candidateId, { hrApprovalStatus: "rejected" })}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                                  selectedApp.candidate?.hrApprovalStatus === "rejected"
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                                  <span>Put on Hold / Reject</span>
                                </span>
                                {selectedApp.candidate?.hrApprovalStatus === "rejected" && "✓"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Internal HR Notes */}
                        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                          <div className="space-y-3">
                            <h5 className="font-bold text-xs text-white uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              <span>HR Internal Evaluation Notes</span>
                            </h5>
                            
                            <textarea
                              rows={4}
                              value={selectedApp.candidate?.hrNotes || ""}
                              onChange={(e) => {
                                handleUpdateCandidateFields(selectedApp.candidateId, { hrNotes: e.target.value });
                              }}
                              placeholder="Write internal HR evaluation notes, assessment scores, screening feedback..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium leading-relaxed resize-none"
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1 mt-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            <span>Auto-saves details live to Express backend</span>
                          </div>
                        </div>

                      </div>

                      {/* Custom Key-Value Attributes Engine */}
                      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-xs text-white flex items-center gap-2">
                              <Sliders className="h-4 w-4 text-indigo-400" />
                              <span>Manage Custom Candidate Tracker Attributes (External Data)</span>
                            </h5>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                              HR can append any custom fields, tracking criteria, or external datasets about this candidate (e.g. Notice Period, Alternate Contact, Visa Status).
                            </p>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {(() => {
                              const rawFields = selectedApp.candidate?.customFields;
                              if (Array.isArray(rawFields)) return rawFields.length;
                              return Object.keys(rawFields || {}).length;
                            })()} Fields Active
                          </span>
                        </div>

                        {/* Custom fields visual list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {(() => {
                            const fieldsObj: Record<string, string> = {};
                            const rawFields = selectedApp.candidate?.customFields;
                            if (Array.isArray(rawFields)) {
                              rawFields.forEach((f: any) => {
                                if (f && f.key) fieldsObj[f.key] = f.value || "";
                              });
                            } else if (rawFields && typeof rawFields === "object") {
                              Object.entries(rawFields).forEach(([k, v]) => {
                                fieldsObj[k] = String(v);
                              });
                            }
                            const entries = Object.entries(fieldsObj);
                            
                            if (entries.length === 0) {
                              return (
                                <div className="col-span-full py-6 text-center bg-slate-900/30 rounded-lg border border-dashed border-slate-850">
                                  <Sliders className="h-5 w-5 text-slate-600 mx-auto mb-1.5" />
                                  <p className="text-[10px] text-slate-400 font-medium">No custom parameters added yet. Create one below!</p>
                                </div>
                              );
                            }

                            return entries.map(([key, value]) => (
                              <div key={key} className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{key}</span>
                                  <span className="font-bold text-xs text-white font-sans truncate block">{String(value)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextCustom = { ...fieldsObj };
                                    delete nextCustom[key];
                                    handleUpdateCandidateFields(selectedApp.candidateId, { customFields: nextCustom });
                                  }}
                                  className="text-rose-400 hover:text-rose-300 font-bold hover:bg-rose-500/10 h-6 w-6 rounded-md flex items-center justify-center transition-colors text-xs cursor-pointer"
                                  title="Remove attribute"
                                >
                                  ✕
                                </button>
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Add custom parameter input form */}
                        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/60 flex flex-col sm:flex-row items-end gap-3.5">
                          <div className="flex-1 min-w-0 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attribute Name / Key:</label>
                            <input
                              type="text"
                              value={newCustomKey}
                              onChange={(e) => setNewCustomKey(e.target.value)}
                              placeholder="e.g. Notice Period, Alternate Number, Preferred Mode"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Value:</label>
                            <input
                              type="text"
                              value={newCustomValue}
                              onChange={(e) => setNewCustomValue(e.target.value)}
                              placeholder="e.g. 15 Days, +91 98765 43210, Hybrid"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!newCustomKey.trim() || !newCustomValue.trim()) {
                                triggerToast("⚠️ Please enter both a key and value to add a custom attribute!");
                                return;
                              }
                              const key = newCustomKey.trim();
                              const value = newCustomValue.trim();
                              const nextCustom = {
                                ...selectedApp.candidate?.customFields,
                                [key]: value
                              };
                              handleUpdateCandidateFields(selectedApp.candidateId, { customFields: nextCustom });
                              setNewCustomKey("");
                              setNewCustomValue("");
                            }}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
                          >
                            <span>Add Field</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

          {/* Process timeline history */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
            <h4 className="font-display font-semibold text-slate-900 text-base flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-slate-400" />
              <span>Pipeline Activity Log</span>
            </h4>
            <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-4 py-2">
              {(selectedApp?.timeline || []).map((evt: any, i: number) => (
                <div key={evt.id || i} className="relative">
                  {/* marker node */}
<span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-slate-900 text-xs font-semibold">{evt.title}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">{evt.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Real Candidate Resume Document Viewer */}
      {viewingResumeApp && (() => {
        const cand = viewingResumeApp.candidate;
        const candId =
          cand?.candidateId ||
          viewingResumeApp?.candidateId ||
          (typeof cand?.id === "string" && cand.id.startsWith("CAND-")
            ? cand.id
            : null);
        const storageKey = cand?.resumeStorageKey || viewingResumeApp.resumeStorageKey;
        const fileName = cand?.resumeFileName || viewingResumeApp.resumeFileName || cand?.cvFileName || viewingResumeApp.cvFileName || (candId ? `${candId}_resume.pdf` : "uploaded_resume.pdf");
        const hasPhysicalResume = !!(storageKey || cand?.resumeFileName || viewingResumeApp.resumeFileName || cand?.cvFileName || viewingResumeApp.cvFileName || cand?.cvBase64 || viewingResumeApp.cvBase64 || (cand?.resumeText && cand.resumeText.length > 50));
        const fileExt = fileName ? fileName.toLowerCase().split('.').pop() || "pdf" : "pdf";
        const isPdf = fileExt === "pdf";
        const realResumeUrl = candId && (hasPhysicalResume || candId) ? CandidateRepository.getResumeUrl(candId) : null;

        const handleDownloadResume = async () => {
          if (!realResumeUrl) {
            triggerToast("⚠️ Resume not available for download.");
            return;
          }
          try {
            const res = await fetch(realResumeUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            triggerToast(`📥 Downloading candidate's resume: ${fileName}`);
          } catch (err) {
            console.error("Failed to download resume:", err);
            triggerToast("❌ Failed to download candidate's resume.");
          }
        };

        const handlePrintResume = async () => {
          if (!realResumeUrl) {
            triggerToast("⚠️ Resume not available for printing.");
            return;
          }
          if (isPdf) {
            try {
              const res = await fetch(realResumeUrl);
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              const printIframe = document.createElement("iframe");
              printIframe.style.position = "fixed";
              printIframe.style.right = "0";
              printIframe.style.bottom = "0";
              printIframe.style.width = "0";
              printIframe.style.height = "0";
              printIframe.style.border = "0";
              printIframe.src = blobUrl;
              document.body.appendChild(printIframe);
              printIframe.onload = () => {
                setTimeout(() => {
                  try {
                    printIframe.contentWindow?.focus();
                    printIframe.contentWindow?.print();
                  } catch (e) {
                    window.open(blobUrl, "_blank")?.print();
                  }
                  setTimeout(() => {
                    if (document.body.contains(printIframe)) {
                      document.body.removeChild(printIframe);
                    }
                    URL.revokeObjectURL(blobUrl);
                  }, 60000);
                }, 400);
              };
              triggerToast("🖨️ Opening print window for PDF document...");
            } catch (err) {
              console.error("Print failed:", err);
              triggerToast("❌ Failed to print candidate's resume.");
            }
          } else {
            const textToPrint = parsedResumeText || cand?.resumeText || "No document text content available.";
            const printWin = window.open("", "_blank", "width=800,height=600");
            if (printWin) {
              printWin.document.write(`
                <html>
                  <head>
                    <title>Resume - ${cand?.firstName || ''} ${cand?.lastName || ''}</title>
                    <style>
                      body { font-family: monospace; padding: 24px; white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #1e293b; }
                      h2 { font-family: sans-serif; margin-bottom: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; color: #0f172a; }
                    </style>
                  </head>
                  <body>
                    <h2>Candidate Resume Document: ${cand?.firstName || ''} ${cand?.lastName || ''} (${fileName})</h2>
                    <div>${textToPrint.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                    <script>window.onload = function() { window.print(); };</script>
                  </body>
                </html>
              `);
              printWin.document.close();
            }
            triggerToast("🖨️ Opening print window for document text...");
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex justify-center items-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col h-[90vh] max-h-[90vh] animate-scale-in overflow-hidden">
              
              {/* Header / Info bar */}
              <div className="p-4 border-b border-slate-150 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm sm:text-base text-white">
                        {cand?.firstName} {cand?.lastName}
                      </h3>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {cand?.source || "Direct Website"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Job Applied: <span className="font-semibold text-indigo-300">{viewingResumeApp.job?.title}</span>
                    </p>
                  </div>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-2">
                  <div className="bg-slate-800 p-0.5 rounded-lg flex border border-slate-700">
                    <button
                      onClick={() => setViewMode("pdf")}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        viewMode === "pdf"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{isPdf ? "Original PDF" : "Document File"}</span>
                    </button>
                    <button
                      onClick={() => setViewMode("text")}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        viewMode === "text"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      <span>Parsed Text</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      setViewingResumeApp(null);
                      setPdfZoom(100);
                      setPdfRotation(0);
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Close document viewer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Document Action Rail */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-4 text-xs font-semibold text-slate-600 select-none">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider">
                    {hasPhysicalResume ? `${fileExt.toUpperCase()} Document` : "No CV Uploaded"}
                  </span>
                  {hasPhysicalResume && fileName && (
                    <>
                      <div className="h-4 w-px bg-slate-300 hidden sm:block" />
                      <span className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]">
                        {fileName}
                      </span>
                    </>
                  )}
                </div>

                {/* PDF Document Controls */}
                <div className="flex items-center gap-1.5">
                  {isPdf && viewMode === "pdf" && storageKey && (
                    <>
                      <button
                        onClick={() => setPdfZoom(Math.max(70, pdfZoom - 10))}
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-slate-900"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-[11px] text-slate-700 min-w-12 text-center">
                        {pdfZoom}%
                      </span>
                      <button
                        onClick={() => setPdfZoom(Math.min(150, pdfZoom + 10))}
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-slate-900"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>

                      <div className="h-4 w-px bg-slate-300 mx-1" />

                      <button
                        onClick={() => setPdfRotation((prev) => (prev + 90) % 360)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        title="Rotate document"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>

                      <div className="h-4 w-px bg-slate-300 mx-1" />
                    </>
                  )}

                  <button
                    onClick={handleDownloadResume}
                    disabled={!storageKey}
                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Download original document"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handlePrintResume}
                    disabled={!storageKey}
                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-slate-600 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Print document"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Real Document Content Workspace */}
              <div className="flex-1 bg-slate-800 p-4 sm:p-6 overflow-auto flex flex-col justify-start items-center relative">
                {!hasPhysicalResume ? (
                  /* Error State: No Resume Uploaded */
                  <div className="w-full max-w-md bg-slate-900 text-slate-200 p-8 rounded-xl border border-slate-700 shadow-2xl text-center space-y-4 my-auto">
                    <FileText className="h-12 w-12 text-slate-500 mx-auto" />
                    <div>
                      <h4 className="text-base font-bold text-white">No CV Uploaded</h4>
                      <p className="text-xs text-slate-400 mt-1">No physical resume document has been uploaded for this candidate.</p>
                    </div>
                  </div>
                ) : viewMode === "pdf" ? (
                  isPdf && realResumeUrl ? (
                    /* Actual Inline PDF Rendering */
                    <div 
                      className="w-full h-full min-h-[550px] bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-700"
                      style={{
                        transform: `scale(${pdfZoom / 100}) rotate(${pdfRotation}deg)`,
                        transformOrigin: "top center",
                      }}
                    >
                      <iframe
                        src={`${realResumeUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-full min-h-[550px] border-0"
                        title={`${cand?.firstName || "Candidate"} Real Resume PDF`}
                      />
                    </div>
                  ) : (
                    /* DOCX / DOC Attachment View */
                    <div className="w-full max-w-2xl bg-white text-slate-800 p-8 rounded-xl shadow-2xl border border-slate-200 text-left space-y-6 my-auto">
                      <div className="flex items-center gap-4 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                        <FileText className="h-10 w-10 text-indigo-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-base truncate">{fileName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">Word Document ({fileExt.toUpperCase()}) • Local File Storage</p>
                        </div>
                        <button
                          onClick={handleDownloadResume}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                          Download File
                        </button>
                      </div>

                      <div className="border-t border-slate-150 pt-4">
                        <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Parsed Document Text Preview</h5>
                        {resumeTextLoading ? (
                          <p className="text-slate-400 text-xs font-mono animate-pulse py-4">Extracting text content from document...</p>
                        ) : parsedResumeText ? (
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed text-slate-800">
                            {parsedResumeText}
                          </div>
                        ) : (
                          <p className="text-amber-600 text-xs font-medium py-2">{resumeTextError || "Text extraction unavailable."}</p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  /* Real Parsed Text Mode */
                  <div className="w-full max-w-3xl bg-slate-900 text-slate-100 p-6 sm:p-8 rounded-xl border border-slate-700 shadow-2xl font-mono text-xs max-h-[70vh] overflow-y-auto relative text-left my-auto">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                      <h3 className="text-indigo-400 font-bold text-sm uppercase flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-indigo-400" />
                        <span>Extracted Resume Text Content</span>
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                        {fileName}
                      </span>
                    </div>

                    {resumeTextLoading ? (
                      <p className="text-slate-400 text-xs animate-pulse font-mono py-12 text-center">
                        Extracting UTF-8 text from backend server...
                      </p>
                    ) : parsedResumeText ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-200 font-mono">
                        {parsedResumeText}
                      </p>
                    ) : (
                      <div className="text-center py-12 space-y-2">
                        <p className="text-slate-300 font-semibold">{resumeTextError || "Resume not available."}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Control Panel */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>Geographical Target: {cand?.location || "Not Specified"}</span>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setViewingResumeApp(null);
                      setPdfZoom(100);
                      setPdfRotation(0);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Close Document
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Add Candidate Profile & Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 flex justify-between items-center bg-slate-900 text-white rounded-t-xl">
              <div>
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-indigo-400" />
                  <span>Add Candidate Profile & Application</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Integrate via AI Resume Document parsing or manually.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setParsedSuccess(false);
                  setIsParsing(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs Selection */}
            <div className="px-6 pt-3 flex border-b border-slate-150 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setUploadOption("ai");
                  setParsedSuccess(false);
                }}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  uploadOption === "ai"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Upload CV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadOption("manual");
                  setParsedSuccess(false);
                  // Clear form fields
                  setFirstName("");
                  setLastName("");
                  setEmail("");
                  setPhone("+91 ");
                  setCurrentRole("");
                  setCurrentCompany("");
                  setSkillsText("");
                  setResumeText("");
                  setCandidateLocation("Pune, India");
                }}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  uploadOption === "manual"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Manual Form Entry</span>
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {draftExists && (
                <div className="mb-5 p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4.5 w-4.5 text-indigo-600 bg-indigo-100 rounded-lg p-1 shrink-0" />
                    <div>
                      <span>📝 Found a previously saved applicant draft!</span>
                      <span className="block text-[10px] text-indigo-500 font-normal mt-0.5">Would you like to recover your previous form entries?</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={handleRestoreDraft}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
                    >
                      Restore
                    </button>
                    <button 
                      type="button"
                      onClick={handleDiscardDraft}
                      className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
              
              {uploadOption === "ai" && (
                <div className="space-y-6">
                  {/* AI Upload Area */}
                  {!isParsing && !parsedSuccess && (
                    <div className="space-y-4">
                      <div className="text-center p-8 border-2 border-dashed border-indigo-200 bg-indigo-50/10 rounded-xl flex flex-col items-center justify-center space-y-3 hover:border-indigo-500 transition-colors">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 animate-pulse">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Drag & drop candidate CV document here</p>
                          <p className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, XLSX, CSV, or Spreadsheet formats</p>
                        </div>
                        <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs">
                          <span>Browse CV File</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" 
                            onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const file = e.target.files[0];
                                setManualCvFile(file);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setManualCvBase64(reader.result as string);
                                };
                                reader.readAsDataURL(file);

                                setIsParsing(true);
                                try {
                                  const parsedData = await simulateResumeExtraction(file);
                                  setFirstName(parsedData.firstName);
                                  setLastName(parsedData.lastName);
                                  setEmail(parsedData.email);
                                  setPhone(parsedData.phone);
                                  setCurrentRole(parsedData.role);
                                  setCurrentCompany(parsedData.company);
                                  setSkillsText(parsedData.skills);
                                  setResumeText(parsedData.resumeText);
                                  setCandidateLocation(parsedData.location);
                                  setSource(parsedData.source);
                                  setExperienceYears(typeof parsedData.experienceYears === 'number' ? parsedData.experienceYears : 0);
                                  if (typeof parsedData.experienceYears === 'number' && parsedData.experienceYears === 0) {
                                    setAddExperienceLevel("Fresher");
                                  }
                                  setParsedSuccess(true);
                                  triggerToast(`🎉 Successfully parsed uploaded document: ${file.name}`);
                                } catch (error) {
                                  triggerToast("❌ Failed to parse document.");
                                } finally {
                                  setIsParsing(false);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Fast testing sample presets */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">
                          Or instant-test AI Parser with pre-built CV presets
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {sampleResumes.map((resume, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setIsParsing(true);
                                setTimeout(() => {
                                  setFirstName(resume.firstName);
                                  setLastName(resume.lastName);
                                  setEmail(resume.email);
                                  setPhone(resume.phone);
                                  setCurrentRole(resume.role);
                                  setCurrentCompany(resume.company);
                                  setSkillsText(resume.skills);
                                  setExperienceYears(resume.experience);
                                  setResumeText(resume.resumeText);
                                  setCandidateLocation(resume.location);
                                  setSource("Website");
                                  setEducation(resume.education || "");
                                  setIsParsing(false);
                                  setParsedSuccess(true);
                                  triggerToast(`🎉 Successfully parsed ${resume.name}'s resume document into form structure!`);
                                }, 1300);
                              }}
                              className="text-left p-3 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 bg-white rounded-lg transition-all cursor-pointer group flex items-start gap-2.5"
                            >
                              <FileText className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                              <div>
                                <h5 className="font-bold text-[11px] text-slate-800 leading-none">{resume.name}</h5>
                                <p className="text-[10px] text-slate-400 mt-1">{resume.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Extracting Loader */}
                  {isParsing && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-slate-50 border border-slate-150 rounded-xl animate-pulse">
                      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                      <div className="text-center">
                        <h4 className="font-bold text-xs text-slate-800">Aura AI Agent Core is active...</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Extracting document headers, parsing skills mapping, and pre-filling fields.</p>
                      </div>
                      <div className="w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full w-2/3 animate-infinite-loading rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* AI Success Feedback & Verification Card */}
                  {parsedSuccess && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
                        <div className="flex items-center gap-2.5">
                          <Check className="h-4.5 w-4.5 text-emerald-600 bg-emerald-100 rounded-full p-0.5" />
                          <div>
                            <span>Aura AI extracted candidate details successfully!</span>
                            <span className="block text-[10px] text-emerald-600 font-normal mt-0.5">Review the verified details below and select your Target Job Pipeline.</span>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => { setParsedSuccess(false); setShowManualEdit(false); }}
                          className="text-[10px] font-bold text-emerald-700 hover:underline bg-emerald-100 px-2 py-1 rounded-md cursor-pointer"
                        >
                          Re-upload CV
                        </button>
                      </div>

                      {/* Target Job Pipeline Selection */}
                      <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-150 space-y-2">
                        <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                          Select Target Job Pipeline
                        </label>
                        <select
                          value={selectedJobId}
                          onChange={(e) => setSelectedJobId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-xs font-semibold bg-white cursor-pointer"
                        >
                          {Array.isArray(jobs) && jobs.map((job) => (
                            <option key={job.id || job.jobId} value={job.jobId || job.id}>{formatJobId(job.jobId || job.id)} — {cleanJobTitle(job.title)}</option>
                          ))}
                        </select>
                      </div>

                      {/* Verified Profile Card */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              {firstName?.[0] || "C"}{lastName?.[0] || ""}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-800">{firstName} {lastName}</h4>
                              <p className="text-[11px] text-slate-500 font-medium">{currentRole || "Candidate"} {currentCompany ? `at ${currentCompany}` : ""}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                            Ready to Import
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                          <div className="space-y-1">
                            <label className="text-slate-400 font-medium block text-[10px] uppercase">Email Address</label>
                            <input 
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="e.g. candidate@email.com"
                              className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-slate-400 font-medium block text-[10px] uppercase">Phone Number</label>
                            <input 
                              type="text"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="e.g. +91 98765 43210"
                              className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                          <div><span className="text-slate-400 font-medium">Location:</span> <span className="font-semibold text-slate-700">{candidateLocation || "Remote"}</span></div>
                          <div><span className="text-slate-400 font-medium">Experience:</span> <span className="font-semibold text-slate-700">{experienceYears} Years</span></div>
                        </div>

                        {skillsText && (
                          <div className="pt-2 border-t border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Parsed Core Skills</span>
                            <div className="flex flex-wrap gap-1">
                              {skillsText.split(",").map((sk, i) => (
                                <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-700">
                                  {sk.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Primary Verification Action Bar */}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowManualEdit(!showManualEdit)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer hover:underline"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>{showManualEdit ? "Hide Manual Form Fields" : "Edit Parsed Fields Manually"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAddCandidateSubmit()}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Creating Candidate & Running AI Screening...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-amber-300" />
                              <span>Verify & Create Candidate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form fields: Visible when manually requested or in Manual tab */}
              {((uploadOption === "ai" && parsedSuccess && showManualEdit) || uploadOption === "manual") && (
                <form onSubmit={handleAddCandidateSubmit} className="space-y-5 animate-fade-in">
                  
                  {uploadOption === "ai" && (
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Candidate Details Profile Preview</h4>
                    </div>
                  )}

                  {/* Experience Level Option (First Option) */}
                  <div className="space-y-1.5 text-left bg-slate-50/50 p-3 rounded-lg border border-slate-150">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Candidate Experience Level</label>
                    <div className="flex gap-6 mt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="addExpLevel"
                          value="Experienced"
                          checked={addExperienceLevel === "Experienced"}
                          onChange={() => setAddExperienceLevel("Experienced")}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <span>Experienced Professional</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="addExpLevel"
                          value="Fresher"
                          checked={addExperienceLevel === "Fresher"}
                          onChange={() => setAddExperienceLevel("Fresher")}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <span>Fresher (Recent Graduate / No Industry Exp)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Sarah"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Chen"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address (Indian Format)</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g., candidate@domain.in or candidate@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number (Prefix +91)</label>
                      <input
                        type="text"
                        placeholder="e.g., +91 98901 23456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Role / Company visible only if Experienced */}
                  {addExperienceLevel === "Experienced" && (
                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Role</label>
                        <input
                          type="text"
                          placeholder="e.g., Web Developer"
                          value={currentRole}
                          onChange={(e) => setCurrentRole(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Company</label>
                        <input
                          type="text"
                          placeholder="e.g., Tech Corp"
                          value={currentCompany}
                          onChange={(e) => setCurrentCompany(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Target Pipeline / Experience grid */}
                  <div className={`grid grid-cols-1 ${addExperienceLevel === "Experienced" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Job Pipeline</label>
                      <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all bg-white"
                      >
                        {Array.isArray(jobs) && jobs.map((job) => (
                          <option key={job.id} value={job.id}>{job.title} ({formatJobId(job.id)})</option>
                        ))}
                      </select>
                    </div>
                    {addExperienceLevel === "Experienced" && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Years of Experience</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Application Source</label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all bg-white"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Naukri">Naukri</option>
                        <option value="Career Website">Career Website</option>
                        <option value="Referral">Referral</option>
                        <option value="External Link">External Link</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location</label>
                      <select
                        value={candidateLocation || "Pune, India"}
                        onChange={(e) => setCandidateLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all bg-white cursor-pointer"
                      >
                        <option value="Pune, India">Pune, India</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                  </div>

                  {/* Financial & Verification Data (Candidate Tracker Fields) - Only visible if Experienced */}
                  {addExperienceLevel === "Experienced" && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4 text-left animate-fade-in">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
                        <Sliders className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">HR Tracker Parameters</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current CTC (LPA)</label>
                          <input
                            type="number"
                            placeholder="e.g. 12"
                            value={addCurrentCTC || ""}
                            onChange={(e) => setAddCurrentCTC(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected CTC (LPA)</label>
                          <input
                            type="number"
                            placeholder="e.g. 15"
                            value={addExpectedCTC || ""}
                            onChange={(e) => setAddExpectedCTC(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HR Approval Status</label>
                          <select
                            value={addHRApprovalStatus}
                            onChange={(e) => setAddHRApprovalStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all cursor-pointer"
                          >
                            <option value="pending">Pending Verification</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected / Hold</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HR Evaluation Notes</label>
                        <textarea
                          rows={2}
                          placeholder="Initial recruitment review or verification remarks..."
                          value={addHRNotes}
                          onChange={(e) => setAddHRNotes(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key Skills (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="React, TypeScript, CSS, Node.js"
                      value={skillsText}
                      onChange={(e) => setSkillsText(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium transition-all"
                    />
                  </div>

                  {/* Education visible only if Fresher */}
                  {addExperienceLevel === "Fresher" && (
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 space-y-4 text-left animate-fade-in">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-150">
                        <GraduationCap className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Academic & Link Details (Fresher)</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Highest Educational Degree <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required={addExperienceLevel === "Fresher"}
                            placeholder="e.g. B.Tech, MCA, BSc"
                            value={addHighestDegree}
                            onChange={(e) => setAddHighestDegree(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialization / Stream <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required={addExperienceLevel === "Fresher"}
                            placeholder="e.g. Computer Science, IT"
                            value={addSpecialization}
                            onChange={(e) => setAddSpecialization(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year of Passing <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required={addExperienceLevel === "Fresher"}
                            placeholder="e.g. 2026"
                            value={addYearOfPassing}
                            onChange={(e) => setAddYearOfPassing(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linkedin Profile Link</label>
                          <input
                            type="url"
                            placeholder="e.g. https://linkedin.com/in/username"
                            value={addLinkedinLink}
                            onChange={(e) => setAddLinkedinLink(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Github Link</label>
                          <input
                            type="url"
                            placeholder="e.g. https://github.com/username"
                            value={addGithubLink}
                            onChange={(e) => setAddGithubLink(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload CV/Resume Option at the very last */}
                  <div className="space-y-1.5 text-left bg-slate-50/50 p-4 rounded-xl border border-slate-200 border-dashed">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>Upload CV / Resume Document (PDF only)</span>
                      <span className="text-[9px] text-slate-400 font-normal">Optional Attachment</span>
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        id="manual-resume-upload-input"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const ext = file.name.toLowerCase().split('.').pop();
                            if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
                              triggerToast("❌ Supported document formats: PDF, DOCX, DOC.");
                              return;
                            }
                            setManualCvFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setManualCvBase64(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                            triggerToast(`📎 Attached CV: ${file.name}`);
                          }
                        }}
                      />
                      <label
                        htmlFor="manual-resume-upload-input"
                        className="flex items-center gap-2 px-3 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span>Select CV File (PDF/DOCX)</span>
                      </label>
                      {manualCvFile ? (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="max-w-[180px] truncate">{manualCvFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setManualCvFile(null);
                              setManualCvBase64("");
                            }}
                            className="text-slate-400 hover:text-slate-600 focus:outline-hidden"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">No PDF attached</span>
                      )}
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="pt-4 flex gap-3 border-t border-slate-150">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setParsedSuccess(false);
                      }}
                      className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Create Profile & Sync ATS
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
