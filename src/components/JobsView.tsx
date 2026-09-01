/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { JobRepository, PreferenceRepository } from "../repositories";
import { formatJobId, cleanJobTitle } from "../repositories/repositoryUtils";
import { 
  Briefcase, 
  MapPin, 
  Building, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock,
  Search,
  Filter,
  Upload,
  FileSpreadsheet,
  Loader2,
  Trash2,
  CheckCircle2,
  Eye,
  Link,
  Edit,
  SlidersHorizontal,
  ChevronRight,
  Share2,
  Users,
  MessageSquare,
  Send,
  Check,
  Globe,
  ExternalLink,
  Sparkles,
  Info,
  Settings,
  Award,
  Gift,
  DollarSign,
  Calendar,
  CalendarCheck,
  Laptop,
  Tag
} from "lucide-react";
import { Job, JobStatus, JobType } from "../types";
import PublicApplyForm from "./PublicApplyForm";

export function cleanJobDescription(text?: string): string {
  if (!text) return "";
  if (text.startsWith("Extracted description for")) return text;
  
  let cleaned = text
    .split("\n")
    .filter(line => !/^(?:Job Title|Title|Department|Location|Work Mode|Job Type|Employment Type|Experience|Experience Level|Experience Range|Salary|Salary Range|Openings|Vacancies|Application Deadline|Deadline|Expected Joining Date|Target Joining Date|Joining Date|Hiring Manager|Recruiter|Status)\s*:/i.test(line.trim()))
    .join("\n")
    .trim();

  return cleaned.length > 10 ? cleaned : text;
}

interface JobsViewProps {
  onNavigate?: (tab: string, filters?: any) => void;
}

export default function JobsView({ onNavigate }: JobsViewProps = {}) {
  const [density, setDensity] = useState(() => PreferenceRepository.getLayoutDensity());
  
  useEffect(() => {
    const handleSettings = () => {
      setDensity(PreferenceRepository.getLayoutDensity());
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [previewApplicationJobId, setPreviewApplicationJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobIdPendingDelete, setJobIdPendingDelete] = useState<string | null>(null);
  
  // Floating Toast State
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Multi-Channel Publishing State (lazy-initialized per job in UI)
  const [publishingStates, setPublishingStates] = useState<Record<string, Record<string, { status: string; budget?: number; sponsor?: boolean; category?: string; link?: string }>>>({});

  // Collaborative Reviewers state (lazy-initialized per job in UI)
  const [collaborators, setCollaborators] = useState<Record<string, Array<{ name: string; role: string; status: "Approved" | "Pending" | "Needs Changes"; avatarUrl?: string }>>>({});

  // Internal activity comments thread (lazy-initialized per job in UI)
  const [jobComments, setJobComments] = useState<Record<string, Array<{ id: string; author: string; role: string; text: string; timestamp: string }>>>({});

  // Input states for collaboration
  const [newCommentText, setNewCommentText] = useState("");
  const [collabName, setCollabName] = useState("");
  const [collabRole, setCollabRole] = useState("Hiring Manager");
  const [showAddCollabInput, setShowAddCollabInput] = useState(false);

  // Create Job Form slide-over states
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [hiringManager, setHiringManager] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<JobType>(JobType.FULL_TIME);
  const [workMode, setWorkMode] = useState<"Remote" | "Hybrid" | "On-site">("Remote");
  const [experienceRange, setExperienceRange] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [openings, setOpenings] = useState(1);
  const [deadline, setDeadline] = useState("");
  const [targetJoiningDate, setTargetJoiningDate] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [reqsText, setReqsText] = useState(""); // Comma separated
  const [preferredSkillsText, setPreferredSkillsText] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [status, setStatus] = useState<JobStatus>(JobStatus.DRAFT);

  // Left Sidebar Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterLoc, setFilterLoc] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Right Drawer Details state
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Import Modal & Wizard states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"text" | "file">("text");
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileBase64, setImportFileBase64] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseStep, setParseStep] = useState(0);
  const [parsedPreviewJobs, setParsedPreviewJobs] = useState<any[]>([]);
  const [parsedWarning, setParsedWarning] = useState<string | null>(null);
  const [editingImportJobIdx, setEditingImportJobIdx] = useState<number | null>(null);
  const [editingImportJobData, setEditingImportJobData] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lazy initialize publishing and collaboration state for selected job
  useEffect(() => {
    if (selectedJob) {
      const jobId = selectedJob.id;
      
      // Initialize Publishing States
      if (!publishingStates[jobId]) {
        const isJobActive = selectedJob.status === JobStatus.ACTIVE;
        setPublishingStates(prev => ({
          ...prev,
          [jobId]: {
            linkedin: { status: isJobActive ? "published" : "draft", budget: 0, link: `https://www.linkedin.com/jobs/view/sim-${jobId}` },
            indeed: { status: isJobActive ? "published" : "draft", sponsor: false, link: `https://www.indeed.com/viewjob?jk=sim-${jobId}` },
            naukri: { status: "draft", category: "Software Engineering", link: `https://www.naukri.com/job-listings-sim-${jobId}` },
            careers: { status: isJobActive ? "published" : "draft", link: `${window.location.origin}/?apply=true` }
          }
        }));
      }

      // Initialize Collaborators list
      if (!collaborators[jobId]) {
        setCollaborators(prev => ({
          ...prev,
          [jobId]: [
            { name: "Aditi Jadhav", role: "Hiring Manager", status: "Approved", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" },
            { name: "Hrishi P.", role: "Lead Recruiter", status: "Approved", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" },
            { name: "Tanya Goel", role: "Hiring Reviewer", status: "Pending", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100" }
          ]
        }));
      }

      // Initialize Recruiter activity comments
      if (!jobComments[jobId]) {
        setJobComments(prev => ({
          ...prev,
          [jobId]: [
            { id: "1", author: "Hrishi P.", role: "Lead Recruiter", text: "I have structured the AI screening requirements. Ready for team alignment.", timestamp: "2 hours ago" },
            { id: "2", author: "Aditi Jadhav", role: "Hiring Manager", text: "Looks very comprehensive! Let's syndicate to LinkedIn and Indeed once we have Tanya's signoff.", timestamp: "1 hour ago" }
          ]
        }));
      }
    }
  }, [selectedJob]);

  // Toggle Publish Status to simulated platforms
  const handleTogglePublish = (platform: string) => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    
    // Set to loading to show engaging micro-interactions
    setPublishingStates(prev => {
      const currentJobPubs = prev[jobId] || {};
      const currentPlatform = currentJobPubs[platform] || { status: "draft" };
      return {
        ...prev,
        [jobId]: {
          ...currentJobPubs,
          [platform]: {
            ...currentPlatform,
            status: "loading"
          }
        }
      };
    });

    setTimeout(() => {
      setPublishingStates(prev => {
        const currentJobPubs = prev[jobId] || {};
        const currentPlatform = currentJobPubs[platform] || { status: "draft" };
        const nextStatus = currentPlatform.status === "published" || currentPlatform.status === "loading" ? "draft" : "published";
        
        if (nextStatus === "published") {
          triggerToast(`🚀 Syndicated "${selectedJob.title}" to ${platform.toUpperCase()} Job Portal successfully!`);
        } else {
          triggerToast(`🛑 Stopped synchronization and removed vacancy on ${platform.toUpperCase()}.`);
        }

        return {
          ...prev,
          [jobId]: {
            ...currentJobPubs,
            [platform]: {
              ...currentPlatform,
              status: nextStatus
            }
          }
        };
      });
    }, 1000);
  };

  // Configure Channel parameter
  const handleConfigurePlatform = (platform: string, configKey: string, configValue: any) => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    setPublishingStates(prev => {
      const currentJobPubs = prev[jobId] || {};
      const currentPlatform = currentJobPubs[platform] || {};
      return {
        ...prev,
        [jobId]: {
          ...currentJobPubs,
          [platform]: {
            ...currentPlatform,
            [configKey]: configValue
          }
        }
      };
    });
    triggerToast(`⚡ Updated ${platform.toUpperCase()} configuration: ${configKey} set to ${configValue}.`);
  };

  // Toggle collaborator approvals
  const handleToggleApproval = (collabIdx: number) => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    setCollaborators(prev => {
      const currentCollabs = [...(prev[jobId] || [])];
      if (currentCollabs[collabIdx]) {
        const currentStatus = currentCollabs[collabIdx].status;
        let nextStatus: "Approved" | "Pending" | "Needs Changes" = "Pending";
        if (currentStatus === "Pending") nextStatus = "Approved";
        else if (currentStatus === "Approved") nextStatus = "Needs Changes";
        else nextStatus = "Pending";

        currentCollabs[collabIdx] = {
          ...currentCollabs[collabIdx],
          status: nextStatus
        };

        triggerToast(`🤝 Updated ${currentCollabs[collabIdx].name}'s approval status to "${nextStatus}".`);
      }
      return {
         ...prev,
         [jobId]: currentCollabs
      };
    });
  };

  // Add collaborator
  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !collabName.trim()) return;
    const jobId = selectedJob.id;
    
    const newCollab = {
      name: collabName.trim(),
      role: collabRole,
      status: "Pending" as const,
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?auto=format&fit=crop&q=80&w=100`
    };

    setCollaborators(prev => ({
      ...prev,
      [jobId]: [...(prev[jobId] || []), newCollab]
    }));

    triggerToast(`👥 Assigned ${collabName} as a ${collabRole} for alignment.`);
    setCollabName("");
    setShowAddCollabInput(false);
  };

  // Post notes
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !newCommentText.trim()) return;
    const jobId = selectedJob.id;

    const newComment = {
      id: Date.now().toString(),
      author: "Aditi Jadhav",
      role: "Hiring Manager (You)",
      text: newCommentText.trim(),
      timestamp: "Just now"
    };

    setJobComments(prev => ({
      ...prev,
      [jobId]: [...(prev[jobId] || []), newComment]
    }));

    setNewCommentText("");
    triggerToast("💬 Note posted successfully to recruitment chat board.");
  };

  const handleEditJobClick = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title || "");
    setDepartment(job.department || "");
    setHiringManager(job.hiringManager || "");
    setRecruiter(job.recruiter || "");
    setLocation(job.location || "");
    setType(job.type || JobType.FULL_TIME);
    setWorkMode(job.workMode || "Remote");
    setExperienceRange(job.experienceRange || "");
    setSalaryRange(job.salaryRange || "");
    setOpenings(job.openings || 1);
    setDeadline(job.deadline || "");
    setTargetJoiningDate(job.targetJoiningDate || "");
    setDescription(job.description || "");
    setStatus(job.status || JobStatus.DRAFT);
    
    let respText = "";
    if (job.responsibilities) {
      if (Array.isArray(job.responsibilities)) {
        respText = job.responsibilities.join("\n");
      } else if (typeof job.responsibilities === "string") {
        respText = job.responsibilities;
      }
    }
    setResponsibilitiesText(respText);

    let reqs = "";
    if (job.requirements) {
      if (Array.isArray(job.requirements)) {
        reqs = job.requirements.join("\n");
      } else if (Array.isArray(job.requirements.mustHave)) {
        reqs = job.requirements.mustHave.join("\n");
      }
    }
    setReqsText(reqs);

    let pref = "";
    if (job.preferredSkills && Array.isArray(job.preferredSkills)) {
      pref = job.preferredSkills.join("\n");
    } else if (job.requirements && typeof job.requirements === "object" && Array.isArray(job.requirements.goodToHave)) {
      pref = job.requirements.goodToHave.join("\n");
    }
    setPreferredSkillsText(pref);

    let ben = "";
    if (job.benefits && Array.isArray(job.benefits)) {
      ben = job.benefits.join("\n");
    }
    setBenefitsText(ben);

    setShowForm(true);
  };

  const handleNewJobClick = () => {
    setEditingJob(null);
    setTitle("");
    setDepartment("");
    setHiringManager("");
    setRecruiter("");
    setLocation("");
    setType(JobType.FULL_TIME);
    setWorkMode("Remote");
    setExperienceRange("");
    setSalaryRange("");
    setOpenings(1);
    setDeadline("");
    setTargetJoiningDate("");
    setDescription("");
    setResponsibilitiesText("");
    setReqsText("");
    setPreferredSkillsText("");
    setBenefitsText("");
    setStatus(JobStatus.ACTIVE);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingJob(null);
    setTitle("");
    setDepartment("");
    setHiringManager("");
    setRecruiter("");
    setLocation("");
    setType(JobType.FULL_TIME);
    setWorkMode("Remote");
    setExperienceRange("");
    setSalaryRange("");
    setOpenings(1);
    setDeadline("");
    setTargetJoiningDate("");
    setDescription("");
    setResponsibilitiesText("");
    setReqsText("");
    setPreferredSkillsText("");
    setBenefitsText("");
    setStatus(JobStatus.DRAFT);
    setShowForm(false);
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await JobRepository.getAll();
      setJobs(data);
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]);
      } else if (selectedJob) {
        // Keep selection updated
        const updated = data.find((j: Job) => j.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
      }
      setError(null);
    } catch (err: any) {
      console.error("Error fetching jobs:", err);
      setError("Failed to retrieve pipeline vacancies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department) return;

    try {
      const requirementsList = reqsText
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const responsibilitiesList = responsibilitiesText
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const preferredSkillsList = preferredSkillsText
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const benefitsList = benefitsText
        .split("\n")
        .map(r => r.trim())
        .filter(r => r.length > 0);

      const payload = {
        title,
        department,
        hiringManager,
        recruiter,
        location: location || "Remote",
        type,
        workMode,
        experienceRange,
        salaryRange,
        openings,
        deadline,
        targetJoiningDate,
        description: cleanJobDescription(description),
        responsibilities: responsibilitiesList,
        requirements: { mustHave: requirementsList, goodToHave: preferredSkillsList, softSkills: [], languages: [] },
        preferredSkills: preferredSkillsList,
        benefits: benefitsList,
        status,
      };

      if (editingJob) {
        const updated = await JobRepository.update(editingJob.id, payload);
        setJobs(prev => prev.map(j => j.id === editingJob.id ? updated : j));
        setSelectedJob(updated);
        window.dispatchEvent(new Event("trigger-notification-sync"));
        window.dispatchEvent(new Event("jobs-updated"));
        triggerToast("✏️ Updated job vacancy specifications successfully!");
      } else {
        const created = await JobRepository.create(payload);
        setJobs(prev => [...prev, created]);
        setSelectedJob(created);
        window.dispatchEvent(new Event("trigger-notification-sync"));
        window.dispatchEvent(new Event("jobs-updated"));
        triggerToast("🚀 Created and published new job vacancy successfully!");
      }
      
      // Reset form
      setEditingJob(null);
      setTitle("");
      setDepartment("");
      setHiringManager("");
      setRecruiter("");
      setLocation("");
      setType(JobType.FULL_TIME);
      setWorkMode("Remote");
      setExperienceRange("");
      setSalaryRange("");
      setOpenings(1);
      setDeadline("");
      setTargetJoiningDate("");
      setDescription("");
      setResponsibilitiesText("");
      setReqsText("");
      setStatus(JobStatus.DRAFT);
      setShowForm(false);
      
      // Open details drawer
      setShowDetailDrawer(true);
    } catch (err: any) {
      console.error("Error saving job:", err);
      triggerToast("Failed to save job vacancy details.");
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: JobStatus) => {
    try {
      const updated = await JobRepository.updateStatus(jobId, newStatus);
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
      if (selectedJob?.id === jobId) {
        setSelectedJob(updated);
      }
    } catch (err: any) {
      console.error("Error updating job status:", err);
      triggerToast("Failed to update status.");
    }
  };

  const handleDeleteJob = async (jobId: string, skipConfirm = false) => {
    if (!skipConfirm && jobIdPendingDelete !== jobId) {
      setJobIdPendingDelete(jobId);
      return;
    }
    try {
      await JobRepository.delete(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("jobs-updated"));
      triggerToast("🗑️ Job opening successfully deleted.");
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
        setShowDetailDrawer(false);
      }
    } catch (err: any) {
      console.error("[JOB DELETE ERROR DIAGNOSTICS]", {
        url: err?.config?.url || "DELETE /api/jobs/" + jobId,
        method: err?.config?.method || "DELETE",
        status: err?.response?.status || "Network/CORS Error",
        response: err?.response?.data || null,
        code: err?.code || "ERR_UNKNOWN",
        message: err?.message || String(err)
      });
      triggerToast(`❌ ${err?.response?.data?.detail || err?.message || "Failed to delete the job opening."}`);
    } finally {
      setJobIdPendingDelete(null);
    }
  };

  // Handle Drag & Drop / File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImportFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          const base64Data = dataUrl.split(",")[1] || "";
          setImportFileBase64(base64Data);
          
          if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
            try {
              const decoded = atob(base64Data);
              setImportText(decoded);
            } catch (err) {
              setImportText(`[Text File: ${file.name}]\nFile loaded successfully. Click "Analyze & Map with AI" to parse.`);
            }
          } else {
            setImportText(`[Document File: ${file.name} - ${Math.round(file.size / 1024)} KB]\nFile loaded successfully. Click "Analyze & Map with AI" to let Gemini extract the job details (Title, Department, Location, Type, and Requirements).`);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI Import Parser
  const handleImportAnalyze = async () => {
    if (!importText.trim() && !importFile) return;
    
    setIsParsing(true);
    setParseStep(1);

    try {
      const res = await JobRepository.importParse({
        content: importText,
        fileData: importFileBase64,
        fileName: importFile ? importFile.name : null
      });
      if (res.success) {
        setParsedPreviewJobs(res.data);
        setParsedWarning(res.warning || null);
        triggerToast(`Successfully extracted ${res.data.length} job role(s) with AI.`);
      }
    } catch (err: any) {
      console.error("AI Import failed:", err);
      setError("AI Parser met an issue. Trying direct parsing.");
      triggerToast(err.message || "Failed to parse content. Please ensure valid document structure.");
    } finally {
      setIsParsing(false);
      setParseStep(0);
    }
  };

  // Commit all imported jobs
  const handleConfirmImport = async () => {
    if (parsedPreviewJobs.length === 0) return;
    
    try {
      const sanitizedJobs = parsedPreviewJobs.map(j => ({
        ...j,
        title: cleanJobTitle(j.title),
        location: j.location || "Not specified",
        department: j.department || "Software Engineering"
      }));
      await JobRepository.importConfirm(sanitizedJobs);
      await fetchJobs();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("jobs-updated"));
      setShowImportModal(false);
      setParsedPreviewJobs([]);
      setImportText("");
      setImportFile(null);
      setImportFileBase64("");
      triggerToast(`📋 Successfully imported and saved ${sanitizedJobs.length} Job Openings!`);
    } catch (err: any) {
      console.error("Failed to confirm import:", err);
      triggerToast(err.response?.data?.error || "Failed to save the imported job openings.");
    }
  };

  // Heuristic status badge colors
  const getJobStatusBadge = (status: JobStatus) => {
    switch (status) {
      case JobStatus.ACTIVE:
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case JobStatus.DRAFT:
        return "bg-amber-50 text-amber-700 border-amber-100";
      case JobStatus.CLOSED:
        return "bg-rose-50 text-rose-700 border-rose-100";
    }
  };

  // Compute dynamic filters based on current jobs database
  const jobList = Array.isArray(jobs) ? jobs : [];
  const departments = ["All", ...Array.from(new Set(jobList.map(j => j?.department).filter(Boolean)))];
  const locations = ["All", ...Array.from(new Set(jobList.map(j => j?.location ? j.location.split("(")[0].trim() : "").filter(Boolean)))];
  const jobTypes = ["All", ...Object.values(JobType)];
  const jobStatuses = ["All", ...Object.values(JobStatus)];

  // Apply real-time reactive filters
  const filteredJobs = jobList.filter(job => {
    const matchesSearch = 
      (job.id && job.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesDept = filterDept === "All" || job.department === filterDept;
    const matchesLoc = filterLoc === "All" || job.location.includes(filterLoc);
    const matchesType = filterType === "All" || job.type === filterType;
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;

    return matchesSearch && matchesDept && matchesLoc && matchesType && matchesStatus;
  });

  const handleRowClick = (job: Job) => {
    setSelectedJob(job);
    setShowDetailDrawer(true);
  };

  return (
    <div className={`${density === "compact" ? "p-4 space-y-4" : "p-6 sm:p-8 space-y-6"} max-w-full mx-auto relative text-slate-800 dark:text-slate-100 transition-all`}>
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Recruitment</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Job Openings</span>
      </div>

      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-indigo-600" />
            <span>Job Openings</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Publish and manage enterprise vacancies, qualifications, and AI matching parameters.
          </p>
        </div>
        
        {/* Actions bar: Copy Link, Import Wizard, New Job */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const masterUrl = `${window.location.origin}/?apply=true`;
              navigator.clipboard.writeText(masterUrl);
              triggerToast("📋 Copied Master Public Careers Link!");
            }}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-xs px-3.5 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Link className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Copy Master Careers Link</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-400" />
            <span>Import Openings</span>
          </button>
          
          <button
            onClick={handleNewJobClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Job Posting</span>
          </button>
        </div>
      </div>

      {/* Real-time search and stats strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search openings, specifications, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
          <span>Active: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{jobList.filter(j => j.status === JobStatus.ACTIVE).length}</span></span>
          <span className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <span>Drafts: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{jobList.filter(j => j.status === JobStatus.DRAFT).length}</span></span>
          <span className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <span>Total: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{jobList.length}</span></span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Structural Layout: Filters Sidebar (Left) + Table View (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Filters Sidebar Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden sticky top-20">
          <div className="p-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
              <span>Filter Openings</span>
            </h3>
            {(filterDept !== "All" || filterLoc !== "All" || filterType !== "All" || filterStatus !== "All") && (
              <button
                onClick={() => {
                  setFilterDept("All");
                  setFilterLoc("All");
                  setFilterType("All");
                  setFilterStatus("All");
                }}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Reset All
              </button>
            )}
          </div>

          <div className="p-5 space-y-6">
            {/* Department Section */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Department</label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {departments.map((dept) => {
                  const count = dept === "All" ? jobList.length : jobList.filter(j => j.department === dept).length;
                  const isSelected = filterDept === dept;
                  return (
                    <button
                      key={dept}
                      onClick={() => setFilterDept(dept)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-55 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{dept}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Office Location</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {locations.map((loc) => {
                  const count = loc === "All" ? jobList.length : jobList.filter(j => j.location.includes(loc)).length;
                  const isSelected = filterLoc === loc;
                  return (
                    <button
                      key={loc}
                      onClick={() => setFilterLoc(loc)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-55 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Employment Type Section */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Job Type</label>
              <div className="flex flex-wrap gap-1.5">
                {jobTypes.map((t) => {
                  const isSelected = filterType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1.2 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600" 
                          : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pipeline Status</label>
              <div className="space-y-1.5">
                {jobStatuses.map((stat) => {
                  const isSelected = filterStatus === stat;
                  const isDot = stat !== "All";
                  return (
                    <button
                      key={stat}
                      onClick={() => setFilterStatus(stat)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-55 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {isDot && (
                        <span className={`h-2 w-2 rounded-full ${
                          stat === "active" ? "bg-emerald-500" : stat === "draft" ? "bg-amber-500" : "bg-rose-500"
                        }`} />
                      )}
                      <span className="capitalize">
                        {stat === "All" 
                          ? "All Statuses" 
                          : stat === "active" 
                            ? "Open" 
                            : stat === "closed" 
                              ? "Closed" 
                              : "Drafts"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Jobs Table Format View */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all">
          {loading && jobs.length === 0 ? (
            <div className="p-8 space-y-4 animate-pulse">
              <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={`job-skel-${i}`} className="h-16 bg-slate-150 dark:bg-slate-800 rounded-lg" />
                ))}
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <Briefcase className="h-12 w-12 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mt-4">No matching openings found</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-sm">
                Try loosening your left sidebar filters or modifying your active search keyword.
              </p>
              <button
                onClick={() => {
                  setFilterDept("All");
                  setFilterLoc("All");
                  setFilterType("All");
                  setFilterStatus("All");
                  setSearchQuery("");
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700"
              >
                Clear all active filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Job Openings & Dept</th>
                    <th className="py-4 px-6">Job ID</th>
                    <th className="py-4 px-6">Location</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Pipeline Status</th>
                    <th className="py-4 px-6 text-center">Applied</th>
                    <th className="py-4 px-6">Created On</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm">
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJob?.id === job.id;
                    return (
                      <tr
                        key={job.id}
                        onClick={() => handleRowClick(job)}
                        className={`hover:bg-indigo-50/10 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group ${
                          isSelected ? "bg-indigo-50/5 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        {/* Title & Department */}
                        <td className="py-4 px-6">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-xs sm:max-w-md">
                                {job.title}
                              </h4>
                              {job.status === "active" && (
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewApplicationJobId(job.id)}
                                    className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                                    title="Open interactive application form preview"
                                  >
                                    <Globe className="h-3 w-3" />
                                    <span>Open Form</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/?applyJobId=${job.id}`);
                                      triggerToast("📋 Copied direct applicant form link to clipboard!");
                                    }}
                                    className="p-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-400 transition-all cursor-pointer"
                                    title="Copy direct applicant link"
                                  >
                                    <Link className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-0.5">{job.department}</p>
                          </div>
                        </td>
                        
                        {/* Job ID */}
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-mono text-xs font-semibold whitespace-nowrap">
                          {formatJobId(job.id)}
                        </td>
                        
                        {/* Location */}
                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{job.location}</span>
                          </span>
                        </td>
                        
                        {/* Employment Type */}
                        <td className="py-4 px-6">
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                            {job.type}
                          </span>
                        </td>
                        
                        {/* Status */}
                        <td className="py-4 px-6">
                          <span className={`text-[11px] font-bold font-mono px-2.5 py-0.8 border rounded-full ${getJobStatusBadge(job.status)}`}>
                            {job.status === "active" ? "OPEN" : job.status === "closed" ? "CLOSED" : "DRAFT"}
                          </span>
                        </td>
                        
                        {/* Applied Count */}
                        <td className="py-4 px-6 text-center" onClick={(e) => {
                          if (onNavigate) {
                            e.stopPropagation();
                            onNavigate("candidates", { candidatesFilterJobId: job.id });
                          }
                        }}>
                          <span className="text-xs font-bold font-mono px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all cursor-pointer" title="Click to view applied candidates applications">
                            {job.candidateCount} applied candidates
                          </span>
                        </td>
                        
                        {/* Created Date */}
                        <td className="py-4 px-6 text-slate-400 dark:text-slate-500 text-xs font-mono">
                          {new Date(job.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>
                        
                        {/* Action buttons */}
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              title="Edit Job Opportunity"
                              onClick={() => handleEditJobClick(job)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                              title="View Specifications"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowDetailDrawer(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {jobIdPendingDelete === job.id ? (
                              <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteJob(job.id, true);
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-all cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setJobIdPendingDelete(null);
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                title="Delete Job Opportunity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteJob(job.id);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            
                            {/* Simple Quick Status Change Selector */}
                            <select
                              value={job.status}
                              onChange={(e) => handleUpdateStatus(job.id, e.target.value as JobStatus)}
                              className="text-xs font-semibold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="active">OPEN</option>
                              <option value="draft">DRAFT</option>
                              <option value="closed">CLOSED</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Slide-over Right Drawer for Selected Job Specifications */}
      {showDetailDrawer && selectedJob && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setShowDetailDrawer(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white h-full shadow-2xl flex flex-col relative animate-slide-in">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-900 text-white">
                <div className="space-y-1 flex-1 min-w-0 pr-4 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950/70 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
                      {selectedJob.department}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md">
                      Job ID: {formatJobId(selectedJob.id)}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl tracking-tight leading-snug mt-1 truncate">
                    {selectedJob.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigate && (
                    <button
                      onClick={() => {
                        onNavigate("candidates", { candidatesFilterJobId: selectedJob.id });
                        setShowDetailDrawer(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 hover:text-white font-bold text-xs rounded-lg transition-all cursor-pointer border border-indigo-500/20"
                      title="View applied candidates applications for this job opening"
                    >
                      <Users className="h-3.5 w-3.5 text-indigo-300" />
                      <span>Applied Candidates</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleEditJobClick(selectedJob);
                      setShowDetailDrawer(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                    title="Edit vacancy details"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Job</span>
                  </button>
                  {jobIdPendingDelete === selectedJob.id ? (
                    <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-rose-400 font-bold px-1.5">Delete?</span>
                      <button
                        onClick={() => handleDeleteJob(selectedJob.id, true)}
                        className="px-2 py-1 bg-red-600 text-white font-bold text-[10px] rounded hover:bg-red-700 cursor-pointer transition-all"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setJobIdPendingDelete(null)}
                        className="px-2 py-1 bg-slate-700 text-slate-300 font-bold text-[10px] rounded hover:bg-slate-600 cursor-pointer transition-all"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        handleDeleteJob(selectedJob.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                      title="Delete vacancy details"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Job</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowDetailDrawer(false)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                
                {/* Job Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs text-slate-700">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Department</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{selectedJob.department || "General"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Location</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{selectedJob.location || "Remote"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Work Mode</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Laptop className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{selectedJob.workMode || "Remote"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Employment Type</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <span>{selectedJob.type || "Full-time"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Experience Level</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{selectedJob.experienceRange || "Mid-Senior Level"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Salary Range</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{selectedJob.salaryRange || "Competitive"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Vacancies / Openings</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      <span>{selectedJob.openings || 1} position(s)</span>
                    </span>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Application Deadline</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : "Open"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60 col-span-2 sm:col-span-2">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Target Joining Date</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{selectedJob.targetJoiningDate ? new Date(selectedJob.targetJoiningDate).toLocaleDateString() : "ASAP"}</span>
                    </span>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200/60 col-span-2 sm:col-span-2 sm:border-l border-slate-200/80 sm:pl-3">
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Status & Application Link</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 border rounded-full capitalize ${
                        selectedJob.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : selectedJob.status === "draft" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {selectedJob.status === "active" ? "Open" : selectedJob.status === "closed" ? "Closed" : "Draft"}
                      </span>
                      {selectedJob.status === "active" && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setPreviewApplicationJobId(selectedJob.id)}
                            className="text-[10px] font-mono font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                            title="Open Applicant Form Preview"
                          >
                            <Globe className="h-2.5 w-2.5" />
                            <span>Apply Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/?applyJobId=${selectedJob.id}`);
                              triggerToast("📋 Copied direct applicant form link to clipboard!");
                            }}
                            className="p-1 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Copy Link"
                          >
                            <Link className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3 Sections: About, Responsibilities, Requirements */}
                <div className="space-y-5 pt-4 border-t border-slate-100">
                  {/* About the Job */}
                  <div className="space-y-2.5">
                    <h4 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      <span>About the Job</span>
                    </h4>
                    <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-150 text-left">
                      {cleanJobDescription(selectedJob.description) || "No description provided for this job opening."}
                    </div>
                  </div>

                  {/* Responsibilities */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100/60">
                    <h4 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      <span>Responsibilities</span>
                    </h4>
                    {(() => {
                      const responsibilitiesArray = (() => {
                        if (!selectedJob.responsibilities) return [];
                        if (Array.isArray(selectedJob.responsibilities)) return selectedJob.responsibilities;
                        if (typeof selectedJob.responsibilities === "string") {
                          return (selectedJob.responsibilities as string).split("\n").filter(Boolean);
                        }
                        return [];
                      })();
                      return responsibilitiesArray.length > 0 ? (
                        <ul className="list-disc pl-5 text-slate-600 text-xs sm:text-sm space-y-1.5 text-left">
                          {responsibilitiesArray.map((resp, i) => (
                            <li key={`resp-${i}`} className="leading-relaxed font-medium">{resp}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-left">No responsibilities defined for this role.</p>
                      );
                    })()}
                  </div>

                  {/* Requirements */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100/60">
                    <h4 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Requirements (Must Have)</span>
                    </h4>
                    {(() => {
                      const reqsArray = (() => {
                        if (!selectedJob.requirements) return [];
                        if (Array.isArray(selectedJob.requirements)) return selectedJob.requirements;
                        if (typeof selectedJob.requirements === "object") {
                          return (selectedJob.requirements as any).mustHave || [];
                        }
                        if (typeof selectedJob.requirements === "string") {
                          return (selectedJob.requirements as string).split("\n").filter(Boolean);
                        }
                        return [];
                      })();
                      return reqsArray.length > 0 ? (
                        <ul className="list-disc pl-5 text-slate-600 text-xs sm:text-sm space-y-1.5 text-left">
                          {reqsArray.map((req, i) => (
                            <li key={`req-${i}`} className="leading-relaxed font-medium">{req}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-left">No mandatory requirements defined for this role.</p>
                      );
                    })()}
                  </div>

                  {/* Preferred Skills */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100/60">
                    <h4 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>Preferred Skills / Nice to Have</span>
                    </h4>
                    {(() => {
                      const prefArray = (() => {
                        if (selectedJob.preferredSkills && Array.isArray(selectedJob.preferredSkills)) return selectedJob.preferredSkills;
                        if (selectedJob.requirements && typeof selectedJob.requirements === "object") {
                          return (selectedJob.requirements as any).goodToHave || [];
                        }
                        return [];
                      })();
                      return prefArray.length > 0 ? (
                        <ul className="list-disc pl-5 text-slate-600 text-xs sm:text-sm space-y-1.5 text-left">
                          {prefArray.map((pref, i) => (
                            <li key={`pref-${i}`} className="leading-relaxed font-medium">{pref}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-left">No preferred skills specified.</p>
                      );
                    })()}
                  </div>

                  {/* Benefits & Perks */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100/60">
                    <h4 className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <Gift className="h-4 w-4 text-emerald-500" />
                      <span>Benefits & Perks</span>
                    </h4>
                    {(() => {
                      const benefitsArray = selectedJob.benefits && Array.isArray(selectedJob.benefits) ? selectedJob.benefits : [];
                      return benefitsArray.length > 0 ? (
                        <ul className="list-disc pl-5 text-slate-600 text-xs sm:text-sm space-y-1.5 text-left">
                          {benefitsArray.map((ben, i) => (
                            <li key={`ben-${i}`} className="leading-relaxed font-medium">{ben}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-left">No specific benefits listed.</p>
                      );
                    })()}
                  </div>
                </div>

                {/* 📢 Multi-Channel Publishing & Syndication Hub */}
                {(() => {
                  const activePubs = publishingStates[selectedJob.id] || {
                    linkedin: { status: selectedJob.status === "active" ? "published" : "draft", budget: 0, link: `https://www.linkedin.com/jobs/view/sim-${selectedJob.id}` },
                    indeed: { status: selectedJob.status === "active" ? "published" : "draft", sponsor: false, link: `https://www.indeed.com/viewjob?jk=sim-${selectedJob.id}` },
                    naukri: { status: "draft", category: "Software Engineering", link: `https://www.naukri.com/job-listings-sim-${selectedJob.id}` },
                    careers: { status: selectedJob.status === "active" ? "published" : "draft", link: `${window.location.origin}/?apply=true` }
                  };

                  const activeCollabs = collaborators[selectedJob.id] || [];
                  const activeComments = jobComments[selectedJob.id] || [];

                  return (
                    <>
                      {/* 📢 Multi-Channel Publishing & Syndication Hub */}
                      <div className="space-y-4 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                              <Share2 className="h-4 w-4 text-indigo-500" />
                              <span>Multi-Channel Publishing & Syndication</span>
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Broadcast this vacancy to third-party portals and synchronize candidate pools automatically.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* LinkedIn */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-black text-xs">
                                  in
                                </div>
                                <div className="text-left">
                                  <h5 className="text-xs font-bold text-slate-900">LinkedIn Careers</h5>
                                  <span className="text-[10px] text-slate-400 font-medium">Automatic pool syncing</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                activePubs.linkedin.status === "published" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : activePubs.linkedin.status === "loading"
                                  ? "bg-slate-100 text-slate-600 animate-pulse"
                                  : "bg-slate-100 text-slate-500 border border-slate-200/60"
                              }`}>
                                {activePubs.linkedin.status === "published" ? "● Active" : activePubs.linkedin.status === "loading" ? "Syncing..." : "Offline"}
                              </span>
                            </div>

                            {activePubs.linkedin.status === "published" && (
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] space-y-1.5">
                                <div className="flex justify-between items-center text-slate-500">
                                  <span className="font-semibold">Daily Sponsor Budget:</span>
                                  <span className="font-mono font-bold text-slate-900">${activePubs.linkedin.budget || 0}/day</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="50" 
                                  step="5"
                                  value={activePubs.linkedin.budget || 0}
                                  onChange={(e) => handleConfigurePlatform("linkedin", "budget", parseInt(e.target.value))}
                                  className="w-full accent-indigo-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePublish("linkedin")}
                                disabled={activePubs.linkedin.status === "loading"}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  activePubs.linkedin.status === "published"
                                    ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                              >
                                {activePubs.linkedin.status === "published" ? "Unpublish" : activePubs.linkedin.status === "loading" ? "Syndicating..." : "Publish Job"}
                              </button>
                              {activePubs.linkedin.status === "published" && (
                                <a 
                                  href={activePubs.linkedin.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white border border-slate-250 rounded-lg text-slate-500 hover:text-indigo-600 transition-all hover:border-indigo-200"
                                  title="Open external job board link"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Indeed */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-black text-xs">
                                  id
                                </div>
                                <div className="text-left">
                                  <h5 className="text-xs font-bold text-slate-900">Indeed Board</h5>
                                  <span className="text-[10px] text-slate-400 font-medium">Free + Sponsored options</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                activePubs.indeed.status === "published" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : activePubs.indeed.status === "loading"
                                  ? "bg-slate-100 text-slate-600 animate-pulse"
                                  : "bg-slate-100 text-slate-500 border border-slate-200/60"
                              }`}>
                                {activePubs.indeed.status === "published" ? "● Active" : activePubs.indeed.status === "loading" ? "Syncing..." : "Offline"}
                              </span>
                            </div>

                            {activePubs.indeed.status === "published" && (
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] flex items-center justify-between text-slate-500">
                                <span className="font-semibold">Sponsor & Boost:</span>
                                <button
                                  type="button"
                                  onClick={() => handleConfigurePlatform("indeed", "sponsor", !activePubs.indeed.sponsor)}
                                  className={`px-2 py-0.8 rounded text-[10px] font-bold ${
                                    activePubs.indeed.sponsor 
                                      ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {activePubs.indeed.sponsor ? "★ Premium Boosted" : "Boost Free Post"}
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePublish("indeed")}
                                disabled={activePubs.indeed.status === "loading"}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  activePubs.indeed.status === "published"
                                    ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                              >
                                {activePubs.indeed.status === "published" ? "Unpublish" : activePubs.indeed.status === "loading" ? "Syndicating..." : "Publish Job"}
                              </button>
                              {activePubs.indeed.status === "published" && (
                                <a 
                                  href={activePubs.indeed.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white border border-slate-250 rounded-lg text-slate-500 hover:text-indigo-600 transition-all hover:border-indigo-200"
                                  title="Open external job board link"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Naukri.com */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-700 font-bold text-xs">
                                  N
                                </div>
                                <div className="text-left">
                                  <h5 className="text-xs font-bold text-slate-900">Naukri.com</h5>
                                  <span className="text-[10px] text-slate-400 font-medium">Asia-Pacific reach</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                activePubs.naukri.status === "published" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : activePubs.naukri.status === "loading"
                                  ? "bg-slate-100 text-slate-600 animate-pulse"
                                  : "bg-slate-100 text-slate-500 border border-slate-200/60"
                              }`}>
                                {activePubs.naukri.status === "published" ? "● Active" : activePubs.naukri.status === "loading" ? "Syncing..." : "Offline"}
                              </span>
                            </div>

                            {activePubs.naukri.status === "published" && (
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] flex items-center justify-between text-slate-500">
                                <span className="font-semibold">Listing Category:</span>
                                <select
                                  value={activePubs.naukri.category || "Software Engineering"}
                                  onChange={(e) => handleConfigurePlatform("naukri", "category", e.target.value)}
                                  className="bg-slate-100 hover:bg-slate-200 rounded px-1.5 py-0.5 text-[10px] border-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
                                >
                                  <option value="Software Engineering">IT & Software</option>
                                  <option value="Data & Analytics">Analytics & DS</option>
                                  <option value="Product Design">UI/UX Design</option>
                                  <option value="Management">Product Management</option>
                                </select>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePublish("naukri")}
                                disabled={activePubs.naukri.status === "loading"}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  activePubs.naukri.status === "published"
                                    ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                              >
                                {activePubs.naukri.status === "published" ? "Unpublish" : activePubs.naukri.status === "loading" ? "Syndicating..." : "Publish Job"}
                              </button>
                              {activePubs.naukri.status === "published" && (
                                <a 
                                  href={activePubs.naukri.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white border border-slate-250 rounded-lg text-slate-500 hover:text-indigo-600 transition-all hover:border-indigo-200"
                                  title="Open external job board link"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Careers Website */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                  <Globe className="h-4.5 w-4.5" />
                                </div>
                                <div className="text-left">
                                  <h5 className="text-xs font-bold text-slate-900">Company Careers</h5>
                                  <span className="text-[10px] text-slate-400 font-medium">Synced with ATS database</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                activePubs.careers.status === "published" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : activePubs.careers.status === "loading"
                                  ? "bg-slate-100 text-slate-600 animate-pulse"
                                  : "bg-slate-100 text-slate-500 border border-slate-200/60"
                              }`}>
                                {activePubs.careers.status === "published" ? "● Synced" : activePubs.careers.status === "loading" ? "Syncing..." : "Offline"}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-400 font-semibold truncate">
                              Internal Link: {activePubs.careers.link}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePublish("careers")}
                                disabled={activePubs.careers.status === "loading"}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  activePubs.careers.status === "published"
                                    ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                              >
                                {activePubs.careers.status === "published" ? "Disconnect" : activePubs.careers.status === "loading" ? "Syndicating..." : "Connect Page"}
                              </button>
                              {activePubs.careers.status === "published" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(activePubs.careers.link || "");
                                    triggerToast("📋 Copied careers site application link to clipboard!");
                                  }}
                                  className="p-1.5 bg-white border border-slate-250 rounded-lg text-slate-500 hover:text-indigo-600 transition-all hover:border-indigo-200 cursor-pointer"
                                  title="Copy Career Page Application URL"
                                >
                                  <span className="text-[10px] font-bold px-0.5">Copy Link</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 🤝 Collaborative Draft Approval & Alignment Team */}
                      <div className="space-y-3.5 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                              <Users className="h-4 w-4 text-indigo-500" />
                              <span>Hiring Alignment & Sign-offs</span>
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Assign recruitment collaborators and track alignment sign-offs before posting go-live.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddCollabInput(!showAddCollabInput)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Collaborator</span>
                          </button>
                        </div>

                        {showAddCollabInput && (
                          <form onSubmit={handleAddCollaborator} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="text" 
                                required
                                placeholder="Collaborator Name"
                                value={collabName}
                                onChange={(e) => setCollabName(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold text-slate-800"
                              />
                              <select
                                value={collabRole}
                                onChange={(e) => setCollabRole(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold text-slate-700"
                              >
                                <option value="Hiring Manager">Hiring Manager</option>
                                <option value="Lead Recruiter">Lead Recruiter</option>
                                <option value="Hiring Reviewer">Hiring Reviewer</option>
                                <option value="Tech Lead">Tech Lead</option>
                                <option value="Department Head">Department Head</option>
                              </select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button 
                                type="button" 
                                onClick={() => {
                                  setShowAddCollabInput(false);
                                  setCollabName("");
                                }}
                                className="px-2 py-1 border border-slate-200 hover:bg-white text-[10px] font-bold text-slate-500 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit" 
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold text-white rounded cursor-pointer"
                              >
                                Assign Member
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {activeCollabs.map((collab, idx) => (
                            <div 
                              key={`collab-${collab.name || idx}`} 
                              className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col justify-between space-y-2.5 hover:shadow-xs transition-shadow"
                            >
                              <div className="flex items-center gap-2">
                                <img 
                                  src={collab.avatarUrl} 
                                  alt={collab.name}
                                  referrerPolicy="no-referrer"
                                  className="h-7 w-7 rounded-full object-cover border border-slate-100"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{collab.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium truncate">{collab.role}</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                                <span className="text-[10px] text-slate-400 font-semibold">Sign-off:</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleApproval(idx)}
                                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.8 rounded-md transition-all cursor-pointer ${
                                    collab.status === "Approved"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : collab.status === "Needs Changes"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {collab.status === "Approved" && <Check className="h-3 w-3" />}
                                  <span>{collab.status}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 💬 Recruitment Activity & Discussion Board */}
                      <div className="space-y-3.5 pt-5 border-t border-slate-100 font-sans text-left">
                        <h4 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-indigo-500" />
                          <span>Internal Recruitment Discussion</span>
                        </h4>

                        {/* Comments Thread list */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {activeComments.length > 0 ? (
                            activeComments.map((comment) => (
                              <div key={comment.id} className="p-3 rounded-xl bg-slate-50 border border-slate-150 text-xs text-left space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{comment.author}</span>
                                    <span className="text-[9px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.2 rounded">
                                      {comment.role}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-medium font-mono">{comment.timestamp}</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed font-medium">{comment.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">No notes created yet. Use the thread below to coordinate on vacancy requisitions.</p>
                          )}
                        </div>

                        {/* Add note input form */}
                        <form onSubmit={handlePostComment} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            required
                            placeholder="Discuss channel budgets, sponsor guidelines, or requirements..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs outline-none font-semibold text-slate-700 transition-all"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>
                    </>
                  );
                })()}

                {/* Created date & actions */}
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>Pipeline ID: <span className="font-bold text-slate-600">{selectedJob.id}</span></span>
                  <span>Published on {new Date(selectedJob.createdAt).toLocaleDateString()}</span>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Manual Slide-over Overlay Drawer for Creating New Job */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            {/* Form Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="text-left">
                <h3 className="font-display font-bold text-lg">
                  {editingJob ? `Edit Specifications: ${editingJob.title}` : "Define New Vacancy"}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {editingJob ? "Modify vacancy parameters and AI filtering values." : "Define core scope and AI analysis metrics."}
                </p>
              </div>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <form onSubmit={handleSubmitJob} className="flex-1 overflow-y-auto p-6 space-y-6">
              
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
                <input type="text" required placeholder="e.g., Senior Full-Stack Engineer" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                <input type="text" required placeholder="e.g., AI Research" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                <input type="text" placeholder="e.g., Pune" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Mode</label>
                <select value={workMode} onChange={(e) => setWorkMode(e.target.value as any)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white">
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience Range</label>
                <input type="text" placeholder="e.g., 3-5 Years" value={experienceRange} onChange={(e) => setExperienceRange(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as JobType)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white">
                  {Object.values(JobType).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Openings</label>
                <input type="number" min="1" value={openings} onChange={(e) => setOpenings(parseInt(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joining Date</label>
                <input type="date" value={targetJoiningDate} onChange={(e) => setTargetJoiningDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Publish / Pipeline Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white">
                <option value={JobStatus.ACTIVE}>Active / Open</option>
                <option value={JobStatus.DRAFT}>Draft</option>
                <option value={JobStatus.CLOSED}>Closed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">About the Job</label>
              <textarea rows={3} placeholder="Brief details about the company, department, and general scope of this opportunity..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Responsibilities</label>
              <textarea rows={4} placeholder="Core responsibilities, daily objectives, and role expectations (one per line)..." value={responsibilitiesText} onChange={(e) => setResponsibilitiesText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Must-Have Requirements</span>
              </label>
              <textarea rows={3} placeholder="Must-have technical competencies, skills, and qualifications (one per line)..." value={reqsText} onChange={(e) => setReqsText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Preferred Skills (Nice to Have)</span>
              </label>
              <textarea rows={2} placeholder="Nice-to-have skills, preferred certifications, or secondary tech stack (one per line)..." value={preferredSkillsText} onChange={(e) => setPreferredSkillsText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Benefits & Perks</span>
              </label>
              <textarea rows={2} placeholder="Health insurance, remote stipends, learning allowance, equity, or PTO (one per line)..." value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium resize-none" />
            </div>

              {/* Action Bar */}
              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-all cursor-pointer"
                >
                  {editingJob ? "Save Changes" : "Publish Opening"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Advanced AI Smart Import Modal Panel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5.5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base sm:text-lg tracking-tight">AI Smart Import Openings</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Import job criteria instantly from documents, raw notes or spreadsheet files.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPreviewJobs([]);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Content Container */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-[350px]">
              
              {parsedPreviewJobs.length === 0 ? (
                <>
                  {/* Select Entry Mode Tabs */}
                  <div className="flex border-b border-slate-100">
                    <button
                      onClick={() => setImportTab("text")}
                      className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-4 transition-all ${
                        importTab === "text" 
                          ? "border-indigo-600 text-indigo-600" 
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Paste Text / Notes
                    </button>
                    <button
                      onClick={() => setImportTab("file")}
                      className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-4 transition-all ${
                        importTab === "file" 
                          ? "border-indigo-600 text-indigo-600" 
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Upload Spreadsheet / Doc
                    </button>
                  </div>

                  {importTab === "text" ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Raw Content Input</label>
                      <textarea
                        rows={10}
                        placeholder={`Paste raw unstructured content here. Example format:
                        
Job: Senior Backend Engineer
Team: Core Infrastructure
Offices: Austin, TX (Hybrid)
Role details: We require a Node.js veteran...
- 6+ years with TypeScript & Express
- Experience building fast Redis/Postgres databases
- Mastered esbuild and bundle tools`}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all resize-none leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Drag & Drop simulated box */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-indigo-50/10 cursor-pointer transition-all space-y-3"
                      >
                        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">
                            {importFile ? importFile.name : "Select or drag PDF, Excel, CSV, Word, or plain TXT document"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {importFile ? `${Math.round(importFile.size / 1024)} KB file uploaded` : "Supports .pdf, .xlsx, .csv, .tsv, .docx, .txt"}
                          </p>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".csv,.txt,.xlsx,.xls,.docx,.pdf"
                          className="hidden"
                        />
                      </div>
                      
                      {importText && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase block">Extracted File Data Preview</label>
                          <textarea
                            rows={4}
                            readOnly
                            value={importText}
                            className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 leading-relaxed resize-none focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Analyze Action Button */}
                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportText("");
                        setImportFile(null);
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportAnalyze}
                      disabled={isParsing || (!importText.trim() && !importFile)}
                      className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 text-white shadow-xs transition-all ${
                        isParsing || (!importText.trim() && !importFile)
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                      }`}
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Analyze & Map with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Stage 2: Parsed Preview Screen */
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-indigo-950">AI Extraction Complete</p>
                        <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                          {parsedWarning ? parsedWarning : "Successfully processed text into standardized job postings structure."}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold font-mono text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                      {parsedPreviewJobs.length} roles found
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Role Title</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">AI Structured Analysis</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreviewJobs.map((pJob, idx) => (
                          <tr key={`parsed-job-${pJob.title || idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <input
                                type="text"
                                value={pJob.title}
                                onChange={(e) => {
                                  const updated = [...parsedPreviewJobs];
                                  updated[idx].title = e.target.value;
                                  setParsedPreviewJobs(updated);
                                }}
                                className="bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 border-none rounded px-1.5 py-0.5 w-full font-bold text-slate-800 focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{pJob.department || "General"}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              <div className="space-y-0.5">
                                <span className="font-semibold block">{pJob.location || "Remote"}</span>
                                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 inline-block">{pJob.workMode || "Remote"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                <span className="font-semibold text-slate-800 block">{pJob.type || "Full-time"}</span>
                                <div className="text-[10px] text-slate-500 flex flex-wrap gap-1 font-mono">
                                  <span>Exp: {pJob.experienceRange || "2-5 yrs"}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 font-semibold">{pJob.salaryRange || "Competitive"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold font-mono border border-indigo-100">
                                    {Array.isArray(pJob.responsibilities) ? pJob.responsibilities.length : 0} Resp.
                                  </span>
                                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-mono border border-emerald-100">
                                    {(() => {
                                      if (Array.isArray(pJob.requirements)) return pJob.requirements.length;
                                      if (typeof pJob.requirements === "object") return pJob.requirements?.mustHave?.length || 0;
                                      return 0;
                                    })()} Reqs.
                                  </span>
                                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold font-mono border border-amber-100">
                                    {(pJob.preferredSkills?.length || pJob.requirements?.goodToHave?.length || 0)} Pref.
                                  </span>
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold font-mono border border-purple-100">
                                    {(pJob.benefits?.length || 0)} Benefits
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                                  <span>{pJob.openings || 1} Openings</span>
                                  <span>•</span>
                                  <span>Deadline: {pJob.deadline || "N/A"}</span>
                                  <span>•</span>
                                  <span>Joining: {pJob.targetJoiningDate || "ASAP"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingImportJobIdx(idx);
                                    setEditingImportJobData({
                                      ...pJob,
                                      requiredSkills: Array.isArray(pJob.requiredSkills) ? pJob.requiredSkills.join("\n") : (Array.isArray(pJob.requirements?.mustHave) ? pJob.requirements.mustHave.join("\n") : (pJob.requiredSkills || "")),
                                      preferredSkills: Array.isArray(pJob.preferredSkills) ? pJob.preferredSkills.join("\n") : (Array.isArray(pJob.requirements?.goodToHave) ? pJob.requirements.goodToHave.join("\n") : (pJob.preferredSkills || "")),
                                      responsibilities: Array.isArray(pJob.responsibilities) ? pJob.responsibilities.join("\n") : (pJob.responsibilities || ""),
                                      benefits: Array.isArray(pJob.benefits) ? pJob.benefits.join("\n") : (pJob.benefits || "")
                                    });
                                  }}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 border border-indigo-200"
                                  title="Edit Extracted Job Details"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setParsedPreviewJobs(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Discard Role"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit Controls */}
                  <div className="pt-4 flex justify-between items-center border-t border-slate-150">
                    <button
                      onClick={() => setParsedPreviewJobs([])}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      ← Re-enter document / back
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowImportModal(false);
                          setParsedPreviewJobs([]);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        disabled={parsedPreviewJobs.length === 0}
                        className={`px-5 py-2 font-bold text-xs rounded-lg text-white shadow-xs transition-all ${
                          parsedPreviewJobs.length === 0 
                            ? "bg-slate-300 cursor-not-allowed" 
                            : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                        }`}
                      >
                        Confirm & Add {parsedPreviewJobs.length} Openings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Parsing Steps Loader Overlay */}
              {isParsing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 animate-spin">
                    <Loader2 className="h-6 w-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-bold text-slate-900 text-sm">Structuring content with AI...</p>
                    <p className="text-xs text-indigo-600 font-bold tracking-tight animate-pulse">
                      {parseStep === 1 ? "Extracting schema layouts..." : 
                       parseStep === 2 ? "Compiling qualifications & skills criteria..." :
                       parseStep === 3 ? "Standardizing employment modes..." : "Injecting metadata mapping..."}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Edit Extracted AI Job Modal */}
      {editingImportJobIdx !== null && editingImportJobData !== null && (
        <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-xs flex justify-center items-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-scale-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white rounded-t-2xl">
              <div>
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Edit className="h-5 w-5 text-indigo-400" />
                  <span>Edit Extracted Job Opening</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Modify extracted AI details before confirming import into database.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingImportJobIdx(null);
                  setEditingImportJobData(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-left">
              {/* Job Title & Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job Title / Role</label>
                  <input
                    type="text"
                    value={editingImportJobData.title || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department / Team</label>
                  <input
                    type="text"
                    value={editingImportJobData.department || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, department: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Location & Work Mode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    value={editingImportJobData.location || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, location: e.target.value })}
                    placeholder="e.g. Pune, India"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job Type</label>
                  <select
                    value={editingImportJobData.type || "Full-time"}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Work Mode</label>
                  <select
                    value={editingImportJobData.workMode || "On-site"}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, workMode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              {/* Experience Range & Salary & Openings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Experience Range</label>
                  <input
                    type="text"
                    value={editingImportJobData.experienceRange || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, experienceRange: e.target.value })}
                    placeholder="e.g. 0–2 years"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Salary Range</label>
                  <input
                    type="text"
                    value={editingImportJobData.salaryRange || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, salaryRange: e.target.value })}
                    placeholder="e.g. Competitive"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Openings</label>
                  <input
                    type="number"
                    min="1"
                    value={editingImportJobData.openings || 1}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, openings: Number(e.target.value) || 1 })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Deadlines & Joining */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Application Deadline</label>
                  <input
                    type="date"
                    value={editingImportJobData.deadline || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, deadline: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Joining / Notice Period</label>
                  <input
                    type="date"
                    value={editingImportJobData.targetJoiningDate || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, targetJoiningDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Key Responsibilities */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsibilities (Line separated)</label>
                <textarea
                  rows={3}
                  value={editingImportJobData.responsibilities || ""}
                  onChange={(e) => setEditingImportJobData({ ...editingImportJobData, responsibilities: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium resize-none"
                />
              </div>

              {/* Required & Preferred Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Required Skills (Must Have)</label>
                  <textarea
                    rows={3}
                    value={editingImportJobData.requiredSkills || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, requiredSkills: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preferred Skills (Good To Have)</label>
                  <textarea
                    rows={3}
                    value={editingImportJobData.preferredSkills || ""}
                    onChange={(e) => setEditingImportJobData({ ...editingImportJobData, preferredSkills: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium resize-none"
                  />
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Benefits & Perks (Line separated)</label>
                <textarea
                  rows={2}
                  value={editingImportJobData.benefits || ""}
                  onChange={(e) => setEditingImportJobData({ ...editingImportJobData, benefits: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setEditingImportJobIdx(null);
                  setEditingImportJobData(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingImportJobIdx === null || !editingImportJobData) return;
                  const updatedJobs = [...parsedPreviewJobs];
                  const cleanTitle = cleanJobTitle(editingImportJobData.title);
                  
                  const reqMust = typeof editingImportJobData.requiredSkills === "string"
                    ? editingImportJobData.requiredSkills.split("\n").map((s: string) => s.trim()).filter(Boolean)
                    : (editingImportJobData.requiredSkills || []);
                  const reqGood = typeof editingImportJobData.preferredSkills === "string"
                    ? editingImportJobData.preferredSkills.split("\n").map((s: string) => s.trim()).filter(Boolean)
                    : (editingImportJobData.preferredSkills || []);
                  const respList = typeof editingImportJobData.responsibilities === "string"
                    ? editingImportJobData.responsibilities.split("\n").map((s: string) => s.trim()).filter(Boolean)
                    : (editingImportJobData.responsibilities || []);
                  const benList = typeof editingImportJobData.benefits === "string"
                    ? editingImportJobData.benefits.split("\n").map((s: string) => s.trim()).filter(Boolean)
                    : (editingImportJobData.benefits || []);

                  const updatedRole = {
                    ...editingImportJobData,
                    title: cleanTitle,
                    department: editingImportJobData.department || "Software Engineering",
                    location: editingImportJobData.location || "Not specified",
                    experienceRange: editingImportJobData.experienceRange || "0–2 years",
                    requiredSkills: reqMust,
                    preferredSkills: reqGood,
                    responsibilities: respList,
                    benefits: benList,
                    requirements: {
                      mustHave: reqMust,
                      goodToHave: reqGood,
                      softSkills: editingImportJobData.requirements?.softSkills || [],
                      languages: editingImportJobData.requirements?.languages || []
                    }
                  };
                  updatedJobs[editingImportJobIdx] = updatedRole;
                  setParsedPreviewJobs(updatedJobs);
                  setEditingImportJobIdx(null);
                  setEditingImportJobData(null);
                  triggerToast(`Updated job role details for "${cleanTitle}".`);
                }}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] bg-slate-900 border border-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-in">
          <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span>{toast}</span>
        </div>
      )}

      {/* Interactive In-App Application Form Modal */}
      {previewApplicationJobId !== null && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto border border-slate-200 dark:border-slate-800">
            <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    Live Job Application
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                      Interactive Form
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preview, fill out, and test direct candidate job applications seamlessly without 403 errors.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewApplicationJobId(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Close Form Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-50 dark:bg-slate-950">
              <PublicApplyForm 
                jobId={previewApplicationJobId === "all" ? "" : previewApplicationJobId} 
                onClose={() => setPreviewApplicationJobId(null)} 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
