/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { InterviewRepository } from "../repositories/interviewRepository";
import { ApplicationRepository } from "../repositories/applicationRepository";
import { CandidateRepository } from "../repositories/candidateRepository";
import { formatJobId } from "../repositories/repositoryUtils";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  Plus, 
  X, 
  Check, 
  MessageSquare, 
  User, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  Sparkles,
  Award,
  ThumbsUp,
  ThumbsDown,
  Info,
  ExternalLink,
  ChevronDown,
  Loader2,
  CalendarDays,
  UserCheck,
  CheckCircle2,
  FileText,
  Trash2,
  ArrowRight
} from "lucide-react";
import { Interview, InterviewStatus, InterviewType, RecommendationType, Application, ApplicationStatus } from "../types";

interface InterviewsViewProps {
  initialFilter?: "all" | "today" | "upcoming" | "completed" | "cancelled";
  clearInitialFilter?: () => void;
}

export default function InterviewsView({ initialFilter, clearInitialFilter }: InterviewsViewProps) {
  const [density, setDensity] = useState(() => localStorage.getItem("setting_layout_density") || "comfortable");
  
  useEffect(() => {
    const handleSettings = () => {
      setDensity(localStorage.getItem("setting_layout_density") || "comfortable");
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter/Tabs
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "upcoming" | "completed" | "cancelled">("all");

  useEffect(() => {
    if (initialFilter && initialFilter !== "all") {
      setActiveFilter(initialFilter);
      if (clearInitialFilter) {
        clearInitialFilter();
      }
    }
  }, [initialFilter, clearInitialFilter]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  
  // Date states for calendars (Initialized to current date)
  const [currentDate, setCurrentDate] = useState<Date>(new Date()); 
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(new Date());

  // Dialog / Modal triggers
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFeedbackDetailModal, setShowFeedbackDetailModal] = useState(false);
  
  // Selected interview for feedback
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Selected interview for editing
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [interviewIdPendingCancel, setInterviewIdPendingCancel] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form States - Scheduling
  const [selectedAppId, setSelectedAppId] = useState("");
  const [roundName, setRoundName] = useState("Technical Interview 1");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [interviewTime, setInterviewTime] = useState("14:00");
  const [interviewType, setInterviewType] = useState<InterviewType>(InterviewType.ONLINE);
  const [platform, setPlatform] = useState("Google Meet");
  const [location, setLocation] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // Form States - Feedback Submission
  const [technicalScore, setTechnicalScore] = useState(8);
  const [communicationScore, setCommunicationScore] = useState(8);
  const [problemSolvingScore, setProblemSolvingScore] = useState(8);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [recommendation, setRecommendation] = useState<RecommendationType>(RecommendationType.HIRE);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchInterviewsAndApps = async () => {
    try {
      setLoading(true);
      const [interviewsList, appsList, candidatesList] = await Promise.all([
        InterviewRepository.getAll(),
        ApplicationRepository.getAll(),
        CandidateRepository.getAll()
      ]);
      setInterviews(Array.isArray(interviewsList) ? interviewsList : []);
      setApplications(Array.isArray(appsList) ? appsList : []);
      
      const cList = Array.isArray(candidatesList) ? candidatesList : [];
      // Only show valid existing candidates; do not create dummy/placeholder candidates, remove Unnamed applicant
      const validCandidates = cList.filter(c => {
        if (!c) return false;
        const name = c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim();
        if (!name || name.toLowerCase().includes("unnamed") || name.toLowerCase().includes("new candidate") || name === "Candidate") return false;
        return !!(c.candidateId || c.id);
      });
      setCandidates(validCandidates);

      if (validCandidates.length > 0) {
        setSelectedAppId(validCandidates[0].candidateId || validCandidates[0].id);
      } else {
        const appData = Array.isArray(appsList) ? appsList : [];
        if (appData.length > 0) {
          setSelectedAppId(appData[0].applicationId || (appData[0] as any).id);
        }
      }
      
      setError(null);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError("Failed to load interview records and schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewsAndApps();

    const handleSync = () => {
      fetchInterviewsAndApps();
    };

    window.addEventListener("applications-updated", handleSync);
    window.addEventListener("interviews-updated", handleSync);
    window.addEventListener("candidates-updated", handleSync);
    window.addEventListener("trigger-notification-sync", handleSync);

    return () => {
      window.removeEventListener("applications-updated", handleSync);
      window.removeEventListener("interviews-updated", handleSync);
      window.removeEventListener("candidates-updated", handleSync);
      window.removeEventListener("trigger-notification-sync", handleSync);
    };
  }, []);

  // Format YYYY-MM-DD helper
  const formatDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isUpcomingStatus = (st: any): boolean => {
    const s = String(st || "").toUpperCase();
    return s === "UPCOMING" || s === "SCHEDULED" || s === "PENDING";
  };

  const isCompletedStatus = (st: any): boolean => {
    return String(st || "").toUpperCase() === "COMPLETED";
  };

  const isCancelledStatus = (st: any): boolean => {
    return String(st || "").toUpperCase() === "CANCELLED";
  };

  const isToday = (dateString: string): boolean => {
    if (!dateString) return false;
    const todayStr = formatDateString(new Date());
    return dateString === todayStr;
  };

  const isUpcoming = (dateString: string): boolean => {
    if (!dateString) return false;
    const todayStr = formatDateString(new Date());
    return dateString > todayStr;
  };

  // Helper to find associated application for an interview
  const getAssocApp = (item: any) => {
    if (!applications || !Array.isArray(applications)) return null;
    return applications.find(a => {
      const aId = String(a.id || "").replace(/^app-/, "").toLowerCase();
      const aCandId = String(a.candidateId || a.candidate?.id || "").replace(/^app-/, "").toLowerCase();
      const aEmail = String(a.candidate?.email || a.email || "").toLowerCase();
      
      const iAppId = String(item.applicationId || "").replace(/^app-/, "").toLowerCase();
      const iCandId = String(item.candidateId || "").replace(/^app-/, "").toLowerCase();
      const iEmail = String(item.candidateEmail || "").toLowerCase();

      return (
        (iAppId && (iAppId === aId || iAppId === aCandId)) ||
        (iCandId && (iCandId === aId || iCandId === aCandId)) ||
        (iEmail && aEmail && iEmail === aEmail)
      );
    });
  };

  const getResolvedCandidateName = (item: any) => {
    const assocApp = getAssocApp(item);
    const candFromApp = assocApp?.candidate || (assocApp && assocApp.firstName ? assocApp : null);

    const cId = String(item.candidateId || "").replace(/^app-/, "").toLowerCase();
    const cEmail = String(item.candidateEmail || "").toLowerCase();
    const foundCand = Array.isArray(candidates) ? candidates.find(c => {
      const idMatch = String(c.id || c.candidateId || "").replace(/^app-/, "").toLowerCase();
      const emailMatch = String(c.email || "").toLowerCase();
      return (cId && idMatch === cId) || (cEmail && emailMatch === cEmail);
    }) : null;

    const candidateObj = foundCand || candFromApp;
    if (candidateObj) {
      const realName = candidateObj.name || `${candidateObj.firstName || ""} ${candidateObj.lastName || ""}`.trim();
      if (realName && realName !== "Candidate" && !realName.toLowerCase().includes("unnamed")) {
        return realName;
      }
    }

    if (item.candidateName && item.candidateName !== "Candidate" && item.candidateName !== "Candidate Profile" && !item.candidateName.toLowerCase().includes("unnamed")) {
      return item.candidateName;
    }

    const readableCandId = formatJobId(item.candidateId || "CAND-0001").replace("JOB-", "CAND-");
    return `Candidate (${readableCandId})`;
  };

  const getResolvedJobTitle = (item: any) => {
    const assocApp = getAssocApp(item);
    return assocApp?.appliedJob || assocApp?.job?.title || assocApp?.jobTitle || assocApp?.candidate?.currentRole || item.jobTitle || "Open Position";
  };

  const getResolvedJobId = (item: any) => {
    const assocApp = getAssocApp(item);
    const rawId = item.jobId || assocApp?.jobId || assocApp?.job?.id || assocApp?.candidate?.jobId || "";
    return formatJobId(rawId);
  };

  const validInterviews = interviews.filter(item => {
    return !!item && (item.applicationId || item.candidateId);
  });

  // Filters logic
  const filteredInterviews = validInterviews.filter((item) => {
    if (viewMode === "calendar" && selectedCalendarDate) {
      return item.date === formatDateString(selectedCalendarDate);
    }

    switch (activeFilter) {
      case "today":
        return isToday(item.date) && isUpcomingStatus(item.status);
      case "upcoming":
        return isUpcoming(item.date) && isUpcomingStatus(item.status);
      case "completed":
        return isCompletedStatus(item.status);
      case "cancelled":
        return isCancelledStatus(item.status);
      default:
        return true;
    }
  });

  // Action Handlers
  const handleOpenEditModal = (interview: Interview) => {
    setEditingInterview(interview);
    setSelectedAppId(interview.applicationId);
    setRoundName(interview.round);
    setInterviewerName(interview.interviewer);
    setInterviewDate(interview.date);
    setInterviewTime(interview.time);
    setInterviewType(interview.type as InterviewType);
    setPlatform(interview.platform || "Google Meet");
    setLocation(interview.location || "");
    setScheduleNotes(interview.notes || "");
    setShowScheduleModal(true);
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !interviewerName || !interviewDate || !interviewTime) {
      triggerToast("Please fill in all required fields.", "error");
      return;
    }

    try {
      setScheduling(true);

      // Check interviewer availability (real-time ATS and Google Calendar check)
      const availabilityRes = await axios.get("/api/interviewer/availability", {
        params: {
          interviewer: interviewerName,
          date: interviewDate,
          time: interviewTime,
          excludeInterviewId: editingInterview ? editingInterview.id : undefined
        }
      });

      if (availabilityRes.data && !availabilityRes.data.available) {
        triggerToast(`⚠️ Scheduling Conflict: ${interviewerName} is not available at this time. Reason: ${availabilityRes.data.reason}`, "error");
        setScheduling(false);
        return;
      }

      if (editingInterview) {
        // Edit existing interview
        await InterviewRepository.update(editingInterview.id, {
          round: roundName,
          interviewer: interviewerName,
          date: interviewDate,
          time: interviewTime,
          type: interviewType,
          platform: interviewType === InterviewType.ONLINE ? platform : "",
          location: interviewType === InterviewType.OFFLINE ? location : "",
          notes: scheduleNotes
        });
      } else {
        // Create new interview using real candidateId, name, and applied job/position
        const selectedCand = candidates.find(c => String(c.candidateId || c.id) === String(selectedAppId));
        const candName = selectedCand ? (selectedCand.name || `${selectedCand.firstName || ""} ${selectedCand.lastName || ""}`.trim()) : "Candidate";
        const jobTitle = selectedCand ? (selectedCand.appliedJob || selectedCand.jobTitle || selectedCand.job?.title || selectedCand.currentRole || "Open Position") : "Open Position";
        const jobId = selectedCand ? (selectedCand.jobId || selectedCand.job?.id || "JOB-0001") : "JOB-0001";
        const candId = selectedCand ? (selectedCand.candidateId || selectedCand.id) : selectedAppId;

        const existingApp = applications.find(a => String(a.candidateId || "").replace(/^app-/, "").toLowerCase() === String(candId).replace(/^app-/, "").toLowerCase() || String(a.applicationId || "").replace(/^app-/, "").toLowerCase() === String(candId).replace(/^app-/, "").toLowerCase());
        const appId = existingApp ? (existingApp.applicationId || existingApp.id) : `app-${candId}`;
        if (!existingApp) {
          try {
            await ApplicationRepository.create({
              applicationId: appId,
              candidateId: candId,
              jobId: jobId,
              status: "Interviewing",
              appliedJob: jobTitle
            } as any);
          } catch (e) {
            // Ignored
          }
        }

        await InterviewRepository.create({
          applicationId: appId,
          candidateId: candId,
          candidateName: candName,
          jobId: jobId,
          jobTitle: jobTitle,
          round: roundName,
          interviewer: interviewerName,
          date: interviewDate,
          time: interviewTime,
          type: interviewType,
          platform: interviewType === InterviewType.ONLINE ? platform : "",
          location: interviewType === InterviewType.OFFLINE ? location : "",
          notes: scheduleNotes
        });
      }

      // Reset form & reload
      setShowScheduleModal(false);
      setEditingInterview(null);
      setInterviewerName("");
      setScheduleNotes("");
      setLocation("");
      setViewMode("list");
      const todayStr = formatDateString(new Date());
      if (interviewDate === todayStr) {
        setActiveFilter("today");
      } else if (interviewDate > todayStr) {
        setActiveFilter("upcoming");
      } else {
        setActiveFilter("all");
      }
      setSelectedCalendarDate(null);
      await fetchInterviewsAndApps();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("applications-updated"));
      window.dispatchEvent(new Event("interviews-updated"));
      window.dispatchEvent(new Event("candidates-updated"));
    } catch (err: any) {
      console.error("Error scheduling interview:", err);
      triggerToast(err.response?.data?.error || "Failed to schedule interview.", "error");
    } finally {
      setScheduling(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview || !feedbackComments) {
      triggerToast("Please write comments before submitting feedback.", "error");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await InterviewRepository.submitFeedback(selectedInterview.id, {
        technicalScore,
        communicationScore,
        problemSolvingScore,
        comments: feedbackComments,
        recommendation
      });

      setShowFeedbackModal(false);
      setSelectedInterview(null);
      setFeedbackComments("");
      setTechnicalScore(8);
      setCommunicationScore(8);
      setProblemSolvingScore(8);
      setRecommendation(RecommendationType.HIRE);
      await fetchInterviewsAndApps();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("applications-updated"));
      window.dispatchEvent(new Event("interviews-updated"));
      window.dispatchEvent(new Event("candidates-updated"));
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      triggerToast("Failed to submit review.", "error");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCancelInterview = async (interviewId: string, skipConfirm = false) => {
    try {
      await InterviewRepository.cancel(interviewId);
      triggerToast("Interview cancelled successfully.", "info");
      await fetchInterviewsAndApps();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("applications-updated"));
      window.dispatchEvent(new Event("interviews-updated"));
      window.dispatchEvent(new Event("candidates-updated"));
    } catch (err: any) {
      console.error("Error cancelling interview:", err);
      triggerToast("Failed to cancel interview.", "error");
    }
  };

  const handleDeleteInterview = async (interviewId: string, skipConfirm = false) => {
    if (!skipConfirm) {
      if (!window.confirm("Are you sure you want to delete this interview record permanently?")) {
        return;
      }
    }
    try {
      await InterviewRepository.delete(interviewId);
      triggerToast("Interview record deleted successfully.", "success");
      await fetchInterviewsAndApps();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("applications-updated"));
      window.dispatchEvent(new Event("interviews-updated"));
      window.dispatchEvent(new Event("candidates-updated"));
    } catch (err: any) {
      console.error("Error deleting interview:", err);
      triggerToast("Failed to delete interview record.", "error");
    }
  };

  const handleOpenInterviewDetails = (item: Interview) => {
    setSelectedInterview(item);
    if (item.status === InterviewStatus.COMPLETED && item.feedback) {
      setTechnicalScore(item.feedback.technicalScore || 8);
      setCommunicationScore(item.feedback.communicationScore || 8);
      setProblemSolvingScore(item.feedback.problemSolvingScore || 8);
      setFeedbackComments(item.feedback.comments || "");
      setRecommendation(item.feedback.recommendation || RecommendationType.HIRE);
    } else {
      setTechnicalScore(8);
      setCommunicationScore(8);
      setProblemSolvingScore(8);
      setFeedbackComments("");
      setRecommendation(RecommendationType.HIRE);
    }
    setShowFeedbackDetailModal(true);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Padding days from previous month
    const firstDayOfWeek = firstDayOfMonth.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Padding days for next month to complete standard 42 slots grid
    const totalSlots = 42;
    const nextMonthPadding = totalSlots - days.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getDaysInWeek = (date: Date) => {
    const dayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek); // set to Sunday
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (offset * 7));
    setCurrentDate(newDate);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Stats Counters
  const totalInterviewsCount = validInterviews.length;
  const todayCount = validInterviews.filter(i => isToday(i.date) && isUpcomingStatus(i.status)).length;
  const upcomingCount = validInterviews.filter(i => isUpcoming(i.date) && isUpcomingStatus(i.status)).length;
  const completedCount = validInterviews.filter(i => isCompletedStatus(i.status)).length;
  const cancelledCount = validInterviews.filter(i => isCancelledStatus(i.status)).length;

  const renderFeedbackStars = (score: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(10)].map((_, i) => (
          <span 
            key={i} 
            className={`h-2.5 w-2.5 rounded-full ${i < score ? "bg-indigo-600" : "bg-slate-200"}`}
          />
        ))}
        <span className="text-xs font-semibold font-mono ml-2 text-slate-700">{score}/10</span>
      </div>
    );
  };

  const getFeedbackObj = (interview: any) => {
    if (!interview) return null;
    const fb = interview.feedback;
    if (!fb && !interview.technicalScore && !interview.communicationScore) return null;

    if (typeof fb === "string" && fb.trim()) {
      try {
        const parsed = JSON.parse(fb);
        if (parsed && typeof parsed === "object") {
          return {
            technicalScore: Number(parsed.technicalScore ?? (interview.technicalScore || 8)),
            communicationScore: Number(parsed.communicationScore ?? (interview.communicationScore || 8)),
            problemSolvingScore: Number(parsed.problemSolvingScore ?? 8),
            comments: String(parsed.comments ?? fb),
            recommendation: String(parsed.recommendation || "Hire")
          };
        }
      } catch (e) {
        return {
          technicalScore: Number(interview.technicalScore || 8),
          communicationScore: Number(interview.communicationScore || 8),
          problemSolvingScore: 8,
          comments: String(fb),
          recommendation: "Hire"
        };
      }
    }

    if (typeof fb === "object" && fb !== null) {
      return {
        technicalScore: Number(fb.technicalScore ?? (interview.technicalScore || 8)),
        communicationScore: Number(fb.communicationScore ?? (interview.communicationScore || 8)),
        problemSolvingScore: Number(fb.problemSolvingScore ?? 8),
        comments: String(fb.comments || ""),
        recommendation: String(fb.recommendation || "Hire")
      };
    }

    return {
      technicalScore: Number(interview.technicalScore || 8),
      communicationScore: Number(interview.communicationScore || 8),
      problemSolvingScore: 8,
      comments: "",
      recommendation: "Hire"
    };
  };

  const getNextStageInfo = (interviewItem: any) => {
    const roundStr = String(interviewItem?.round || "").toLowerCase();
    if (roundStr.includes("hr")) {
      return { label: "Move to Offer Stage", target: "offer" };
    } else if (roundStr.includes("1") || (roundStr.includes("technical") && !roundStr.includes("2"))) {
      return { label: "Move to Technical Round 2", target: "tech2" };
    } else {
      return { label: "Move to HR Interview", target: "hr" };
    }
  };

  const handleMoveToNextStage = async (interviewItem: any) => {
    if (!interviewItem) return;
    const assocApp = getAssocApp(interviewItem);
    const roundInfo = getNextStageInfo(interviewItem);
    const candName = interviewItem.candidateName || assocApp?.candidateName || "Candidate";
    const jobTitle = interviewItem.jobTitle || assocApp?.appliedRole || "Job Position";

    try {
      setActionLoading(interviewItem.id);
      if (roundInfo.target === "tech2") {
        await InterviewRepository.create({
          candidateId: interviewItem.candidateId,
          jobId: interviewItem.jobId,
          applicationId: interviewItem.applicationId,
          candidateName: candName,
          candidateEmail: interviewItem.candidateEmail || assocApp?.candidateEmail || "",
          jobTitle: jobTitle,
          round: "Technical Round 2",
          date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          time: "11:00",
          interviewer: "Lead Technical Evaluator",
          status: "Scheduled",
          meetingLink: "Google Meet"
        });
        triggerToast(`Moved ${candName} to Technical Round 2!`, "success");
      } else if (roundInfo.target === "offer") {
        if (assocApp?.id) {
          await ApplicationRepository.updateStatus(assocApp.id, "Offered");
        } else if (interviewItem.candidateId) {
          await axios.patch(`/api/candidates/${interviewItem.candidateId}`, { status: "Offered" }, { headers: { "X-Skip-Interceptor": "true" } });
        }
        triggerToast(`Moved ${candName} to Offer Stage!`, "success");
      } else {
        await InterviewRepository.create({
          candidateId: interviewItem.candidateId,
          jobId: interviewItem.jobId,
          applicationId: interviewItem.applicationId,
          candidateName: candName,
          candidateEmail: interviewItem.candidateEmail || assocApp?.candidateEmail || "",
          jobTitle: jobTitle,
          round: "HR Interview",
          date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          time: "15:00",
          interviewer: "HR Manager",
          status: "Scheduled",
          meetingLink: "Google Meet"
        });
        triggerToast(`Moved ${candName} to HR Interview!`, "success");
      }

      await fetchInterviewsAndApps();
      window.dispatchEvent(new Event("trigger-notification-sync"));
      window.dispatchEvent(new Event("applications-updated"));
      window.dispatchEvent(new Event("interviews-updated"));
      window.dispatchEvent(new Event("candidates-updated"));
      window.dispatchEvent(new Event("offers-updated"));
      setShowFeedbackDetailModal(false);
      setSelectedInterview(null);
    } catch (err: any) {
      console.error("Error moving candidate to next stage:", err);
      triggerToast("Failed to move candidate to next stage.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Dynamic Timeline render component inside card and modal
  const renderCandidateStageTimeline = (app: any, interview?: any) => {
    const currentStatus = String(app?.status || interview?.status || "Applied");
    const appInterviews = interviews.filter(i => {
      if (app?.id && i.applicationId === app.id) return true;
      if (app?.candidateId && i.candidateId === app.candidateId) return true;
      if (interview?.candidateId && i.candidateId === interview.candidateId) return true;
      return false;
    });

    const isRejected =
      currentStatus.toLowerCase() === "rejected" ||
      String(interview?.status).toLowerCase() === "cancelled" ||
      (interview?.feedback?.recommendation && String(interview.feedback.recommendation).toLowerCase() === "reject");

    const currentRound = String(interview?.round || "").toLowerCase();

    const hasTech1 = appInterviews.some(i => {
      const r = String(i.round || "").toLowerCase();
      return r.includes("1") || r.includes("round 1");
    }) || currentRound.includes("1") || currentRound.includes("round 1");

    const hasTech2 = appInterviews.some(i => {
      const r = String(i.round || "").toLowerCase();
      return r.includes("2") || r.includes("round 2");
    }) || currentRound.includes("2") || currentRound.includes("round 2");

    const isSingleTech = (!hasTech1 && !hasTech2 && currentRound.includes("technical interview") && !currentRound.includes("1") && !currentRound.includes("2")) || 
      (appInterviews.length === 1 && String(appInterviews[0]?.round || "").toLowerCase() === "technical interview");

    const isAppliedDone = true;
    const isScreeningDone = currentStatus.toLowerCase() !== "applied";

    const isTech1Done = appInterviews.some(i => {
      const r = String(i.round || "").toLowerCase();
      return (r.includes("1") || r.includes("round 1")) && isCompletedStatus(i.status);
    }) || (hasTech2) || (interview && (currentRound.includes("1") || currentRound.includes("round 1")) && isCompletedStatus(interview.status));

    const isTech2Done = appInterviews.some(i => {
      const r = String(i.round || "").toLowerCase();
      return (r.includes("2") || r.includes("round 2")) && isCompletedStatus(i.status);
    }) || (interview && (currentRound.includes("2") || currentRound.includes("round 2")) && isCompletedStatus(interview.status));

    const isSingleTechDone = appInterviews.some(i => {
      const r = String(i.round || "").toLowerCase();
      return r === "technical interview" && isCompletedStatus(i.status);
    }) || (interview && currentRound === "technical interview" && isCompletedStatus(interview.status));

    const isHRInterviewDone = appInterviews.some(i => {
      const r = String(i.round || "").toLowerCase();
      return r.includes("hr") && isCompletedStatus(i.status);
    }) || (interview && currentRound.includes("hr") && isCompletedStatus(interview.status));

    const isOfferDone = currentStatus.toLowerCase() === "offered" || currentStatus.toLowerCase() === "hired";

    let stages: { key: string; label: string; isDone: boolean; isActive: boolean; isRejected?: boolean }[] = [];

    const isScheduledNow = isUpcomingStatus(interview?.status);
    const isHRRoundNow = currentRound.includes("hr");
    const isTech2Now = currentRound.includes("2") || currentRound.includes("round 2");

    if (isRejected) {
      stages = [
        { key: "applied", label: "Applied", isDone: isAppliedDone, isActive: false },
        { key: "screening", label: "AI Screening", isDone: isScreeningDone, isActive: false },
        { key: "interview", label: isSingleTech ? "Technical Interview" : "Technical Interview 1", isDone: isSingleTech ? isSingleTechDone : isTech1Done, isActive: false },
        { key: "rejected", label: "Rejected", isDone: false, isActive: true, isRejected: true },
      ];
    } else if (isSingleTech) {
      stages = [
        { key: "applied", label: "Applied", isDone: isAppliedDone, isActive: false },
        { key: "screening", label: "AI Screening", isDone: isScreeningDone, isActive: !isScreeningDone && currentStatus.toLowerCase() === "screening" },
        { key: "tech", label: "Technical Interview", isDone: isSingleTechDone, isActive: !isSingleTechDone && isScheduledNow && !isHRRoundNow },
        { key: "hr", label: "HR Interview", isDone: isHRInterviewDone, isActive: isSingleTechDone && !isHRInterviewDone && isHRRoundNow },
        { key: "offer", label: "Offer", isDone: isOfferDone, isActive: isOfferDone },
      ];
    } else {
      stages = [
        { key: "applied", label: "Applied", isDone: isAppliedDone, isActive: false },
        { key: "screening", label: "AI Screening", isDone: isScreeningDone, isActive: !isScreeningDone && currentStatus.toLowerCase() === "screening" },
        { key: "tech1", label: "Technical Interview 1", isDone: isTech1Done, isActive: !isTech1Done && isScheduledNow && !isTech2Now && !isHRRoundNow },
        { key: "tech2", label: "Technical Interview 2", isDone: isTech2Done, isActive: (isTech1Done || isTech2Now) && !isTech2Done && !isHRRoundNow },
        { key: "hr", label: "HR Interview", isDone: isHRInterviewDone, isActive: (isTech2Done || isHRRoundNow) && !isHRInterviewDone },
        { key: "offer", label: "Offer", isDone: isOfferDone, isActive: isOfferDone },
      ];
    }

    return (
      <div className="border-t border-slate-100 pt-4 mt-4 bg-slate-50/50 p-3.5 rounded-lg border">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Candidate Stage Progress</p>
        <div className="relative flex items-center justify-between">
          <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          {stages.map((stage, idx) => {
            const isCompleted = stage.isDone;
            const isActive = stage.isActive;
            const isRejectedStage = stage.isRejected;

            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  isRejectedStage
                    ? "bg-rose-600 border-rose-600 text-white shadow-xs animate-pulse"
                    : isCompleted 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                      : isActive 
                        ? "bg-white border-indigo-500 text-indigo-600 ring-4 ring-indigo-500/15 scale-110 font-bold" 
                        : "bg-white border-slate-300 text-slate-400 font-normal"
                }`}>
                  {isRejectedStage ? (
                    <XCircle className="h-3 w-3 text-white" />
                  ) : isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-[9px] font-semibold mt-1.5 whitespace-nowrap ${
                  isRejectedStage
                    ? "text-rose-600 font-bold"
                    : isCompleted
                      ? "text-indigo-600 font-bold"
                      : isActive
                        ? "text-slate-900 font-bold"
                        : "text-slate-400"
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`${density === "compact" ? "p-4 space-y-4" : "p-8 space-y-8"} max-w-7xl mx-auto text-slate-800 dark:text-slate-100 transition-all`}>
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Recruitment</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Interviews</span>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-indigo-600" />
            <span>Interview Management</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Coordinate, schedule, evaluate, and track candidate interviews and executive screening reviews.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {/* View Toggle */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex items-center shadow-xs">
            <button
              onClick={() => { setViewMode("list"); setSelectedCalendarDate(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => { setViewMode("calendar"); setSelectedCalendarDate(new Date(2026, 6, 1)); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Calendar
            </button>
          </div>

          <button
            onClick={() => {
              setEditingInterview(null);
              setSelectedAppId(applications[0]?.id || "");
              setRoundName("Technical Interview");
              setInterviewerName("");
              setInterviewDate(new Date().toISOString().split("T")[0]);
              setInterviewTime("14:00");
              setInterviewType(InterviewType.ONLINE);
              setPlatform("Google Meet");
              setLocation("");
              setScheduleNotes("");
              setShowScheduleModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer ml-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Interview</span>
          </button>
        </div>
      </div>

      {/* Stats Bento Grid Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => { setViewMode("list"); setActiveFilter("all"); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === "all" && viewMode === "list"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs"
          }`}
        >
          <p className={`text-xs font-medium ${activeFilter === "all" && viewMode === "list" ? "text-indigo-100" : "text-slate-400"}`}>
            All Interviews
          </p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold font-mono">{totalInterviewsCount}</p>
            <TrendingUp className={`h-4.5 w-4.5 ${activeFilter === "all" && viewMode === "list" ? "text-indigo-200" : "text-indigo-500"}`} />
          </div>
        </button>

        <button
          onClick={() => { setViewMode("list"); setActiveFilter("today"); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === "today" && viewMode === "list"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md animate-pulse"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs"
          }`}
        >
          <p className={`text-xs font-medium ${activeFilter === "today" && viewMode === "list" ? "text-indigo-100" : "text-slate-400"}`}>
            Today's Interviews
          </p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold font-mono">{todayCount}</p>
            <Clock className={`h-4.5 w-4.5 ${activeFilter === "today" && viewMode === "list" ? "text-indigo-200" : "text-indigo-500"}`} />
          </div>
        </button>

        <button
          onClick={() => { setViewMode("list"); setActiveFilter("upcoming"); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === "upcoming" && viewMode === "list"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs"
          }`}
        >
          <p className={`text-xs font-medium ${activeFilter === "upcoming" && viewMode === "list" ? "text-indigo-100" : "text-slate-400"}`}>
            Upcoming (Pending)
          </p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold font-mono">{upcomingCount}</p>
            <CalendarDays className={`h-4.5 w-4.5 ${activeFilter === "upcoming" && viewMode === "list" ? "text-indigo-200" : "text-indigo-500"}`} />
          </div>
        </button>

        <button
          onClick={() => { setViewMode("list"); setActiveFilter("completed"); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === "completed" && viewMode === "list"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs"
          }`}
        >
          <p className={`text-xs font-medium ${activeFilter === "completed" && viewMode === "list" ? "text-indigo-100" : "text-slate-400"}`}>
            Completed Reviews
          </p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold font-mono">{completedCount}</p>
            <CheckCircle className={`h-4.5 w-4.5 ${activeFilter === "completed" && viewMode === "list" ? "text-indigo-200" : "text-emerald-500"}`} />
          </div>
        </button>

        <button
          onClick={() => { setViewMode("list"); setActiveFilter("cancelled"); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeFilter === "cancelled" && viewMode === "list"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs"
          }`}
        >
          <p className={`text-xs font-medium ${activeFilter === "cancelled" && viewMode === "list" ? "text-indigo-100" : "text-slate-400"}`}>
            Cancelled Slots
          </p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold font-mono">{cancelledCount}</p>
            <XCircle className={`h-4.5 w-4.5 ${activeFilter === "cancelled" && viewMode === "list" ? "text-indigo-200" : "text-rose-500"}`} />
          </div>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-slate-400 text-sm font-medium mt-4">Assembling schedules...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Workspace (Interviews List OR Calendar Dashboard) */}
          <div className="lg:col-span-2 space-y-6">
            {viewMode === "list" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-lg text-slate-900 capitalize">
                    {activeFilter} Interviews
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Showing {filteredInterviews.length} entry/entries
                  </span>
                </div>

                {filteredInterviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl text-center space-y-3">
                    <CalendarDays className="h-10 w-10 text-slate-300" />
                    <h4 className="font-semibold text-slate-800">No scheduled sessions found</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      There are no interviews listed under this selection category. You can schedule a new round using the action button above.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredInterviews.map((item, idx) => {
                      const assocApp = applications.find(a => a.id === item.applicationId);
                      return (
                        <div 
                          key={item.id ? `${item.id}-${idx}` : `int-${idx}`}
                          onClick={() => handleOpenInterviewDetails(item)}
                          className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer hover:bg-slate-50/10"
                        >
                          {/* Card Top */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 border border-indigo-100 rounded-full">
                                {item.round}
                              </span>
                              <h4 className="font-display font-bold text-base text-slate-900 mt-1 flex items-center gap-1.5">
                                <User className="h-4 w-4 text-slate-400 shrink-0" />
                                <span>{getResolvedCandidateName(item)}</span>
                              </h4>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>Applied: {getResolvedJobTitle(item)}</span>
                                {getResolvedJobId(item) && (
                                  <span className="font-mono text-[10px] text-slate-400 font-semibold">({getResolvedJobId(item)})</span>
                                )}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                              item.status === InterviewStatus.UPCOMING
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 animate-pulse"
                                : item.status === InterviewStatus.COMPLETED
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          {/* Card Mid: Metadata */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                            <div className="space-y-1.5">
                              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Schedule Time</p>
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold font-mono">
                                <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{item.date}</span>
                                <span className="text-slate-300">|</span>
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{item.time}</span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Interviewer</p>
                              <p className="text-slate-700 font-semibold flex items-center gap-1.5 truncate">
                                <UserCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                <span>{item.interviewer}</span>
                              </p>
                            </div>

                            <div className="space-y-1.5 sm:col-span-2 border-t border-slate-200/50 pt-2.5 mt-1 flex justify-between items-center gap-4">
                              <div className="min-w-0">
                                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Venue / Channel</p>
                                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                  {item.type === InterviewType.ONLINE ? (
                                    <>
                                      <Video className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                      <span className="truncate">{item.meetingProvider || item.platform || "Google Meet"} Session</span>
                                      {item.calendarSynced && (
                                        <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm shrink-0">
                                          GCal Synced
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                      <span className="truncate">{item.location}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {item.type === InterviewType.ONLINE && (
                                <a 
                                  href={item.googleMeetUrl || "#"}
                                  target={item.googleMeetUrl ? "_blank" : undefined}
                                  rel={item.googleMeetUrl ? "noopener noreferrer" : undefined}
                                  onClick={(e) => { 
                                    if (!item.googleMeetUrl) {
                                      e.preventDefault(); 
                                      e.stopPropagation(); 
                                      triggerToast(`Launching meeting link for ${item.candidateName}'s interview via ${item.platform}...`, "info"); 
                                    } else {
                                      e.stopPropagation();
                                    }
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                                >
                                  <span>Join Meeting</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Notes Summary */}
                          {item.notes && (
                            <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2.5 rounded-md border border-dashed border-slate-200">
                              <strong className="not-italic text-slate-700">Notes: </strong>{item.notes}
                            </p>
                          )}

                          {/* Candidate stage progress bar */}
                          {renderCandidateStageTimeline(assocApp, item)}

                          {/* Feedback Details if Completed */}
                          {isCompletedStatus(item.status) && getFeedbackObj(item) && (() => {
                            const fbObj = getFeedbackObj(item)!;
                            return (
                              <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-lg mt-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-display font-semibold text-xs text-emerald-800 flex items-center gap-1">
                                    <Award className="h-4 w-4 text-emerald-600 animate-pulse" />
                                    <span>Candidate Evaluation Feedback</span>
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    fbObj.recommendation.toLowerCase().includes("hire")
                                      ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                                      : fbObj.recommendation.toLowerCase().includes("hold")
                                        ? "bg-amber-100 border-amber-300 text-amber-800"
                                        : "bg-rose-100 border-rose-300 text-rose-800"
                                  }`}>
                                    Rec: {fbObj.recommendation}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-t border-emerald-100/50 pt-2.5">
                                  <div>
                                    <p className="text-slate-400 font-semibold">Technical Panel</p>
                                    {renderFeedbackStars(fbObj.technicalScore)}
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-semibold">Communication</p>
                                    {renderFeedbackStars(fbObj.communicationScore)}
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-semibold">Problem Solving</p>
                                    {renderFeedbackStars(fbObj.problemSolvingScore)}
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-md border border-emerald-100 text-xs">
                                  <p className="text-slate-700 leading-relaxed font-serif italic">
                                    "{fbObj.comments || 'Evaluated session.'}"
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Card Footer: Interactive Actions */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInterview(item.id);
                              }}
                              className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                              title="Permanently remove interview session from database"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              <span>Delete Session</span>
                            </button>

                            <div className="flex items-center gap-2.5">
                              {isUpcomingStatus(item.status) ? (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(item);
                                    }}
                                    className="px-3 py-1.5 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 font-semibold text-xs rounded-md transition-all cursor-pointer"
                                  >
                                    Edit Schedule
                                  </button>
                                  {interviewIdPendingCancel === item.id ? (
                                    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <button 
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleCancelInterview(item.id, true);
                                          setInterviewIdPendingCancel(null);
                                        }}
                                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-md transition-all cursor-pointer"
                                      >
                                        Confirm Cancel
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setInterviewIdPendingCancel(null);
                                        }}
                                        className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-md transition-all cursor-pointer"
                                      >
                                        Dismiss
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInterviewIdPendingCancel(item.id);
                                      }}
                                      className="px-3 py-1.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-500 font-semibold text-xs rounded-md transition-all cursor-pointer"
                                    >
                                      Cancel Session
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenInterviewDetails(item);
                                    }}
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <MessageSquare className="h-3 w-3 text-white" />
                                    <span>Submit Review Feedback</span>
                                  </button>
                                </>
                              ) : isCompletedStatus(item.status) ? (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenInterviewDetails(item);
                                    }}
                                    className="px-3.5 py-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-md transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Award className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>View Details & Feedback</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveToNextStage(item);
                                    }}
                                    disabled={actionLoading === item.id}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                                  >
                                    {actionLoading === item.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    )}
                                    <span>{getNextStageInfo(item).label}</span>
                                  </button>
                                </div>
                              ) : isCancelledStatus(item.status) ? (
                                <span className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                                  Session Cancelled
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* CALENDAR VIEWS */
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                {/* Calendar View Selector / Month Navigator */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setCalendarView("month")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        calendarView === "month" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setCalendarView("week")}
                      className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        calendarView === "week" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Weekly
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => calendarView === "month" ? changeMonth(-1) : changeWeek(-1)}
                      className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h3 className="font-display font-bold text-base text-slate-900 select-none w-36 text-center font-mono">
                      {calendarView === "month" 
                        ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` 
                        : `Week of ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}`}
                    </h3>
                    <button 
                      onClick={() => calendarView === "month" ? changeMonth(1) : changeWeek(1)}
                      className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* MONTHLY CALENDAR GRID */}
                {calendarView === "month" ? (
                  <div>
                    {/* Days of week header */}
                    <div className="grid grid-cols-7 text-center font-bold text-slate-400 text-xs tracking-wider mb-2 py-1 select-none">
                      <span>SUN</span>
                      <span>MON</span>
                      <span>TUE</span>
                      <span>WED</span>
                      <span>THU</span>
                      <span>FRI</span>
                      <span>SAT</span>
                    </div>

                    <div className="grid grid-cols-7 border-l border-t border-slate-150 rounded-lg overflow-hidden bg-slate-50/50">
                      {getDaysInMonth(currentDate).map((day, idx) => {
                        const dateStr = formatDateString(day);
                        const dayInterviews = validInterviews.filter(i => i.date === dateStr);
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isSelected = selectedCalendarDate && formatDateString(selectedCalendarDate) === dateStr;
                        const isTodayDate = dateStr === formatDateString(new Date());

                        return (
                          <div
                            key={`month-day-${day.getTime()}-${idx}`}
                            onClick={() => setSelectedCalendarDate(day)}
                            className={`min-h-20 border-r border-b border-slate-150 p-1.5 flex flex-col justify-between transition-colors cursor-pointer relative ${
                              isCurrentMonth ? "bg-white" : "bg-slate-50/70 text-slate-300"
                            } ${isSelected ? "ring-2 ring-indigo-500 ring-inset bg-indigo-50/10 z-10" : "hover:bg-slate-50"}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`text-xs font-bold font-mono h-5 w-5 rounded-full flex items-center justify-center ${
                                isTodayDate 
                                  ? "bg-indigo-600 text-white font-bold" 
                                  : isSelected 
                                    ? "text-indigo-600 font-bold" 
                                    : isCurrentMonth ? "text-slate-700" : "text-slate-300"
                              }`}>
                                {day.getDate()}
                              </span>
                            </div>

                            {/* Interview dots or micro labels */}
                            <div className="space-y-1 mt-1.5">
                              {dayInterviews.map((int, i) => {
                                if (i >= 2) {
                                  if (i === 2) {
                                    return (
                                      <div key={`more-${i}`} className="text-[8px] font-mono font-bold text-indigo-500 text-center uppercase tracking-wider">
                                        + {dayInterviews.length - 2} more
                                      </div>
                                    );
                                  }
                                  return null;
                                }
                                const resName = getResolvedCandidateName(int);
                                return (
                                  <div 
                                    key={int.id ? `${int.id}-${i}` : `int-day-${i}`} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenInterviewDetails(int);
                                    }}
                                    className={`text-[9px] font-semibold px-1 py-0.5 rounded-sm truncate select-none leading-tight border cursor-pointer hover:border-indigo-400 transition-all ${
                                      int.status === InterviewStatus.UPCOMING 
                                        ? "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/50" 
                                        : int.status === InterviewStatus.COMPLETED 
                                          ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50" 
                                          : "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100/50"
                                    }`}
                                  >
                                    {int.time} {resName?.split(' ')[1] || resName}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* WEEKLY CALENDAR GRID */
                  <div className="grid grid-cols-7 gap-3">
                    {getDaysInWeek(currentDate).map((day, idx) => {
                      const dateStr = formatDateString(day);
                      const dayInterviews = validInterviews.filter(i => i.date === dateStr);
                      const isSelected = selectedCalendarDate && formatDateString(selectedCalendarDate) === dateStr;
                      const isTodayDate = dateStr === "2026-07-01";

                      return (
                        <div
                          key={`week-day-${day.getTime()}-${idx}`}
                          onClick={() => setSelectedCalendarDate(day)}
                          className={`rounded-xl border p-3 flex flex-col min-h-64 justify-between transition-all cursor-pointer ${
                            isTodayDate 
                              ? "bg-indigo-600/5 border-indigo-200 ring-1 ring-indigo-200" 
                              : isSelected 
                                ? "bg-white border-indigo-500 shadow-sm" 
                                : "bg-white border-slate-200 hover:border-slate-300 shadow-3xs"
                          }`}
                        >
                          {/* Day Header */}
                          <div className="text-center pb-2.5 border-b border-slate-100">
                            <p className={`text-[10px] font-bold tracking-wider ${isTodayDate ? "text-indigo-600" : "text-slate-400"}`}>
                              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][day.getDay()]}
                            </p>
                            <p className={`text-xl font-bold mt-1 h-8 w-8 rounded-full flex items-center justify-center mx-auto font-mono ${
                              isTodayDate ? "bg-indigo-600 text-white" : "text-slate-800"
                            }`}>
                              {day.getDate()}
                            </p>
                          </div>

                          {/* Interviews listed under the day */}
                          <div className="flex-1 mt-3 space-y-2 overflow-y-auto max-h-48">
                            {dayInterviews.length === 0 ? (
                              <p className="text-[10px] text-slate-300 italic text-center py-4 select-none">No sessions</p>
                            ) : (
                              dayInterviews.map((int, idx) => (
                                <div
                                  key={int.id ? `${int.id}-${idx}` : `int-week-${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInterviewDetails(int);
                                  }}
                                  className={`p-2 rounded-lg border text-left leading-normal cursor-pointer hover:border-indigo-400 hover:bg-white transition-all ${
                                    int.status === InterviewStatus.UPCOMING 
                                      ? "bg-indigo-50/50 border-indigo-100 text-indigo-700" 
                                      : int.status === InterviewStatus.COMPLETED 
                                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-700" 
                                        : "bg-rose-50/50 border-rose-100 text-rose-700"
                                  }`}
                                >
                                  <p className="text-[10px] font-bold font-mono text-slate-700">{int.time}</p>
                                  <p className="text-xs font-bold truncate mt-0.5 text-slate-950">{getResolvedCandidateName(int)}</p>
                                  <p className="text-[9px] text-slate-400 truncate mt-0.5">{int.round}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Hand Sidebar: Daily Focus Schedule details OR Candidate Pool info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <h4 className="font-display font-semibold text-sm text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-600" />
                  <span>
                    {viewMode === "calendar" && selectedCalendarDate 
                      ? `Schedule for ${selectedCalendarDate.toLocaleString("en-US", { month: "long" })} ${selectedCalendarDate.getDate()}` 
                      : "Today's Focus Schedule"}
                  </span>
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                  {viewMode === "calendar" && selectedCalendarDate 
                    ? formatDateString(selectedCalendarDate) 
                    : formatDateString(new Date())}
                </span>
              </div>

              {/* Day focus interviews listing */}
              <div className="space-y-3.5">
                {(() => {
                  const realTodayStr = formatDateString(new Date());
                  const targetDateStr = viewMode === "calendar" && selectedCalendarDate 
                    ? formatDateString(selectedCalendarDate) 
                    : realTodayStr;
                  
                  let targetDayInterviews = validInterviews.filter(i => (i.date === targetDateStr || isToday(i.date)) && isUpcomingStatus(i.status));
                  if (targetDayInterviews.length === 0 && viewMode !== "calendar") {
                    // Show upcoming focus interviews sorted by date
                    targetDayInterviews = validInterviews.filter(i => isUpcomingStatus(i.status)).slice(0, 5);
                  }
                  
                  if (targetDayInterviews.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400">
                        <Info className="h-5 w-5 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No interviews scheduled</p>
                        <p className="text-[10px] text-slate-400 mt-1">Select another date from calendar views or click dashboard metrics.</p>
                      </div>
                    );
                  }

                  return targetDayInterviews.map((int, idx) => (
                    <div 
                      key={int.id ? `${int.id}-${idx}` : `int-side-${idx}`}
                      onClick={() => handleOpenInterviewDetails(int)}
                      className="p-3 border border-slate-150 hover:border-indigo-300 rounded-lg transition-all bg-slate-50/50 hover:bg-indigo-50/10 space-y-2 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          {int.time} ({int.date})
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
                          isUpcomingStatus(int.status)
                            ? "bg-indigo-50 border-indigo-150 text-indigo-700 animate-pulse" 
                            : isCompletedStatus(int.status)
                              ? "bg-emerald-50 border-emerald-150 text-emerald-700" 
                              : "bg-rose-50 border-rose-150 text-rose-700"
                        }`}>
                          {int.status}
                        </span>
                      </div>

                      <div>
                        <h5 className="font-bold text-xs text-slate-900">{getResolvedCandidateName(int)}</h5>
                        <p className="text-[11px] text-slate-500 font-semibold">{int.round}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">By: {int.interviewer}</p>
                      </div>

                      {int.notes && (
                        <p className="text-[10px] text-slate-500 bg-white p-2 rounded border border-slate-150 italic">
                          "{int.notes}"
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-150/50 flex justify-end">
                        {isUpcomingStatus(int.status) ? (
                          <span className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>Add Feedback & Details</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">View Session Record</span>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Quick Helper Tips Panel */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10">
                <Sparkles className="h-32 w-32" />
              </div>

              <div className="space-y-1 relative z-10">
                <h4 className="font-display font-semibold text-sm flex items-center gap-2 text-indigo-300">
                  <Sparkles className="h-4 w-4 animate-spin-slow" />
                  <span>Executive AI Screen Assistance</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Before stepping into interviews, check out custom candidate profiles in the <strong>Candidate Profiles</strong> tab. 
                  Gemini has drafted customized, deep technical interview questions tailored strictly for each applicant.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-3 relative z-10 flex justify-between items-center">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Aura Systems active</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: SCHEDULE INTERVIEW */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4">
          <form 
            onSubmit={handleScheduleInterview}
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in border border-slate-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white rounded-t-xl">
              <div>
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-400" />
                  <span>{editingInterview ? "Edit Interview Schedule Details" : "Schedule Interview Round"}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {editingInterview ? "Modify slots, update interview format, and re-schedule interviewers." : "Define slots, select interview types, and map interviewers."}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-700">
              {/* Select Candidate/Application */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Candidate Portfolio Profile *</label>
                {editingInterview ? (
                  <input
                    type="text"
                    disabled
                    value={`${getResolvedCandidateName(editingInterview)} - ${getResolvedJobTitle(editingInterview)}`}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm font-semibold focus:outline-hidden"
                  />
                ) : (
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white"
                  >
                    {candidates.length === 0 ? (
                      <option value="">No candidates available</option>
                    ) : (
                      candidates.map((cand, candIdx) => {
                        const candId = cand.candidateId || cand.id;
                        const candName = cand.name || `${cand.firstName || ""} ${cand.lastName || ""}`.trim();
                        const jobPos = cand.appliedJob || cand.jobTitle || cand.job?.title || cand.currentRole || "Open Position";
                        return (
                          <option key={candId ? `${candId}-${candIdx}` : `cand-${candIdx}`} value={candId}>
                            {candName} - {jobPos}
                          </option>
                        );
                      })
                    )}
                  </select>
                )}
              </div>

              {/* Round & Interviewer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Interview Round Stage *</label>
                  <select
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white"
                  >
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="Technical Interview 1">Technical Interview 1</option>
                    <option value="Technical Interview 2">Technical Interview 2</option>
                    <option value="HR Interview">HR Interview</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Interviewer(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Aris Thorne (Core AI Architect)"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Schedule Date *</label>
                  <input
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              {/* Type Switch (Online / Offline) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Interview Format *</label>
                <div className="bg-slate-100 p-1.5 rounded-lg flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewType(InterviewType.ONLINE)}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      interviewType === InterviewType.ONLINE ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500"
                    }`}
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Online Session</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewType(InterviewType.OFFLINE)}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      interviewType === InterviewType.OFFLINE ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>In-Person (Offline)</span>
                  </button>
                </div>
              </div>

              {/* Conditional parameters based on format */}
              {interviewType === InterviewType.ONLINE ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Meeting Platform *</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white"
                  >
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Office Room / Conference Location *</label>
                  <input
                    type="text"
                    required={interviewType === InterviewType.OFFLINE}
                    placeholder="e.g., Suite 502, Boardroom A"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Brief Prep Notes / Directives</label>
                <textarea
                  rows={3}
                  placeholder="Focus points, links to test portfolios, or specific screening parameters..."
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={scheduling}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {scheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>{editingInterview ? "Saving..." : "Booking..."}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{editingInterview ? "Save Changes" : "Schedule Session"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SUBMIT INTERVIEW FEEDBACK */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4">
          <form 
            onSubmit={handleSubmitFeedback}
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in border border-slate-200"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white rounded-t-xl">
              <div>
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-400" />
                  <span>Submit Evaluation Feedback</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Submit score breakdowns, general commentary, and final hiring recommendation.</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedInterview(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Session</p>
                <h4 className="font-bold text-sm text-indigo-700 mt-1">{getResolvedCandidateName(selectedInterview)}</h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {selectedInterview.round} • {getResolvedJobTitle(selectedInterview)} {getResolvedJobId(selectedInterview) && `(Job ID: ${getResolvedJobId(selectedInterview)})`}
                </p>
              </div>

              {/* Technical Score Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Technical Capability Score</label>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {technicalScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={technicalScore}
                  onChange={(e) => setTechnicalScore(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>1 - Entry Level / Unsuitable</span>
                  <span>5 - Fully Competent</span>
                  <span>10 - Outstanding / Tech Lead</span>
                </div>
              </div>

              {/* Communication Score Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Communication & Presentation</label>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {communicationScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={communicationScore}
                  onChange={(e) => setCommunicationScore(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>1 - Extremely Poor / No Sync</span>
                  <span>5 - Articulate & Professional</span>
                  <span>10 - Perfect Cohesion / Lead Ability</span>
                </div>
              </div>

              {/* Problem Solving Score Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">Problem Solving & Critical Thinking</label>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {problemSolvingScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={problemSolvingScore}
                  onChange={(e) => setProblemSolvingScore(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>1 - Struggled / Incomplete logic</span>
                  <span>5 - Clean approach / Normal speed</span>
                  <span>10 - Blazing speed / Analytical genius</span>
                </div>
              </div>

              {/* Recommendation Options (Hire, Hold, Reject) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Hiring Board Recommendation *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecommendation(RecommendationType.HIRE)}
                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      recommendation === RecommendationType.HIRE
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <ThumbsUp className={`h-4 w-4 ${recommendation === RecommendationType.HIRE ? "text-emerald-600" : "text-slate-400"}`} />
                    <span>Hire Candidate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecommendation(RecommendationType.HOLD)}
                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      recommendation === RecommendationType.HOLD
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/10"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <Info className={`h-4 w-4 ${recommendation === RecommendationType.HOLD ? "text-amber-600" : "text-slate-400"}`} />
                    <span>Hold / Re-evaluate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecommendation(RecommendationType.REJECT)}
                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      recommendation === RecommendationType.REJECT
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/10"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <ThumbsDown className={`h-4 w-4 ${recommendation === RecommendationType.REJECT ? "text-rose-600" : "text-slate-400"}`} />
                    <span>Reject Candidate</span>
                  </button>
                </div>
              </div>

              {/* Comments Text Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Comments & Assessment Notes *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail candidate's strengths, responses to challenges, technical coding output, and cultural fit nuances..."
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-serif transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedInterview(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFeedback}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Submit Evaluation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showFeedbackDetailModal && selectedInterview && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white rounded-t-xl">
              <div>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/30 uppercase">
                  {selectedInterview.round} Details
                </span>
                <h3 className="font-display font-bold text-xl mt-1.5 flex items-center gap-2">
                  <User className="h-5.5 w-5.5 text-indigo-400" />
                  <span>{getResolvedCandidateName(selectedInterview)}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Comprehensive session schedule metrics, prep directives, and evaluation feedback.</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowFeedbackDetailModal(false);
                  setSelectedInterview(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Two Column Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-700">
              
              {/* Left Column: Interview Details */}
              <div className="space-y-5 pr-0 md:pr-4 md:border-r border-slate-100">
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-indigo-600" />
                    <span>Session Information</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Name</p>
                      <p className="text-sm font-semibold text-slate-800">{getResolvedCandidateName(selectedInterview)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applied Position</p>
                      <p className="text-sm font-semibold text-slate-800">{getResolvedJobTitle(selectedInterview)}</p>
                      {getResolvedJobId(selectedInterview) && (
                        <p className="text-xs font-mono text-slate-400 font-medium mt-0.5">Job ID: {getResolvedJobId(selectedInterview)}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Date</p>
                      <p className="text-sm font-semibold text-slate-800 font-mono">{selectedInterview.date}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Time</p>
                      <p className="text-sm font-semibold text-slate-800 font-mono">{selectedInterview.time}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedInterview.type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue / Platform</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedInterview.type === InterviewType.ONLINE ? (selectedInterview.meetingProvider || selectedInterview.platform || "Google Meet") : selectedInterview.location || "Office Boardroom"}
                      </p>
                    </div>
                    {selectedInterview.calendarSynced && (
                      <div className="space-y-1 col-span-2 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Google Calendar Synced</p>
                            <p className="text-[10px] font-mono text-emerald-600 truncate">ID: {selectedInterview.googleEventId}</p>
                          </div>
                        </div>
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Synced</span>
                      </div>
                    )}
                    <div className="space-y-1 col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interviewer Panel</p>
                      <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-indigo-500" />
                        <span>{selectedInterview.interviewer}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prep Notes */}
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brief Prep Notes & Directives</p>
                  {selectedInterview.notes ? (
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 text-xs text-slate-600 italic font-medium leading-relaxed">
                      "{selectedInterview.notes}"
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No preparation notes provided for this session.</p>
                  )}
                </div>

                {/* Candidate Stage Timeline */}
                {renderCandidateStageTimeline(getAssocApp(selectedInterview), selectedInterview)}

                {/* Join Session Link if Online & Upcoming */}
                {selectedInterview.type === InterviewType.ONLINE && selectedInterview.status === InterviewStatus.UPCOMING && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Video className="h-4 w-4 text-indigo-600" />
                        <span>Online Meeting Ready</span>
                      </p>
                      <p className="text-[10px] text-slate-500">Host and candidate can join the conference room directly.</p>
                    </div>
                    <a
                      href={selectedInterview.googleMeetUrl || "#"}
                      target={selectedInterview.googleMeetUrl ? "_blank" : undefined}
                      rel={selectedInterview.googleMeetUrl ? "noopener noreferrer" : undefined}
                      onClick={(e) => { 
                        if (!selectedInterview.googleMeetUrl) {
                          e.preventDefault(); 
                          triggerToast(`Launching meeting link for ${selectedInterview.candidateName}'s interview via ${selectedInterview.platform}...`, "info"); 
                        }
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center gap-1 shrink-0"
                    >
                      <span>Join Call</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Feedback Form OR Display */}
              <div className="space-y-5">
                {isCompletedStatus(selectedInterview.status) && getFeedbackObj(selectedInterview) ? (() => {
                  const fbObj = getFeedbackObj(selectedInterview)!;
                  return (
                    /* Feedback display for completed interviews */
                    <div className="space-y-4">
                      <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <span>Interviewer Feedback</span>
                      </h4>

                      <div className="flex items-center justify-between p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-lg">
                        <span className="text-xs font-bold text-emerald-800">Board Recommendation</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          fbObj.recommendation.toLowerCase().includes("hire")
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                            : fbObj.recommendation.toLowerCase().includes("hold")
                              ? "bg-amber-100 border-amber-300 text-amber-800"
                              : "bg-rose-100 border-rose-300 text-rose-800"
                        }`}>
                          {fbObj.recommendation}
                        </span>
                      </div>

                      <div className="space-y-3.5 border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-500">Technical Capability</span>
                          {renderFeedbackStars(fbObj.technicalScore)}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-500">Communication & Presentation</span>
                          {renderFeedbackStars(fbObj.communicationScore)}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-500">Problem Solving & Logic</span>
                          {renderFeedbackStars(fbObj.problemSolvingScore)}
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assessment Comments</p>
                        <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-lg p-4 text-xs text-slate-700 leading-relaxed font-serif italic">
                          "{fbObj.comments || 'Evaluated session details.'}"
                        </div>
                      </div>
                    </div>
                  );
                })() : isUpcomingStatus(selectedInterview.status) ? (
                  /* Feedback submission form for upcoming interviews */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!feedbackComments) {
                      triggerToast("Please write comments before submitting feedback.", "error");
                      return;
                    }
                    try {
                      setSubmittingFeedback(true);
                      await InterviewRepository.submitFeedback(selectedInterview.id, {
                        technicalScore,
                        communicationScore,
                        problemSolvingScore,
                        comments: feedbackComments,
                        recommendation
                      });
                      setShowFeedbackDetailModal(false);
                      setSelectedInterview(null);
                      setFeedbackComments("");
                      setTechnicalScore(8);
                      setCommunicationScore(8);
                      setProblemSolvingScore(8);
                      setRecommendation(RecommendationType.HIRE);
                      await fetchInterviewsAndApps();
                    } catch (err: any) {
                      console.error("Error submitting feedback:", err);
                      triggerToast("Failed to submit review.", "error");
                    } finally {
                      setSubmittingFeedback(false);
                    }
                  }} className="space-y-4">
                    <h4 className="font-display font-bold text-sm text-indigo-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                      <span>Submit Candidate Feedback</span>
                    </h4>

                    {/* Technical Score Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-600">Technical Capability</label>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px]">
                          {technicalScore} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={technicalScore}
                        onChange={(e) => setTechnicalScore(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Communication Score Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-600">Communication & Presentation</label>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px]">
                          {communicationScore} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={communicationScore}
                        onChange={(e) => setCommunicationScore(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Problem Solving Score Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-600">Problem Solving & Logic</label>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px]">
                          {problemSolvingScore} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={problemSolvingScore}
                        onChange={(e) => setProblemSolvingScore(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Recommendation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 block">Board Recommendation *</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setRecommendation(RecommendationType.HIRE)}
                          className={`py-2 rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                            recommendation === RecommendationType.HIRE
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          <ThumbsUp className={`h-3.5 w-3.5 ${recommendation === RecommendationType.HIRE ? "text-emerald-600" : "text-slate-400"}`} />
                          <span>Hire</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecommendation(RecommendationType.HOLD)}
                          className={`py-2 rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                            recommendation === RecommendationType.HOLD
                              ? "bg-amber-50 border-amber-500 text-amber-800"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          <Info className={`h-3.5 w-3.5 ${recommendation === RecommendationType.HOLD ? "text-amber-600" : "text-slate-400"}`} />
                          <span>Hold</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecommendation(RecommendationType.REJECT)}
                          className={`py-2 rounded-lg border text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                            recommendation === RecommendationType.REJECT
                              ? "bg-rose-50 border-rose-500 text-rose-800"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          <ThumbsDown className={`h-3.5 w-3.5 ${recommendation === RecommendationType.REJECT ? "text-rose-600" : "text-slate-400"}`} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 block">Assessment Notes *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail candidate's strengths and responses..."
                        value={feedbackComments}
                        onChange={(e) => setFeedbackComments(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-serif transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                    >
                      {submittingFeedback ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          <span>Saving Evaluation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Submit Session Evaluation</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Cancelled status feedback screen */
                  <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-xl text-center space-y-2">
                    <XCircle className="h-8 w-8 text-rose-400 mx-auto" />
                    <h5 className="font-bold text-xs text-rose-800">Session Cancelled</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      This interview session was cancelled. No evaluation feedback can be recorded for cancelled slots.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50 rounded-b-xl">
              <div className="flex items-center gap-2">
                {isUpcomingStatus(selectedInterview.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeedbackDetailModal(false);
                      handleOpenEditModal(selectedInterview);
                    }}
                    className="px-4 py-2 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Edit Schedule Details
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this interview record permanently?")) {
                      setShowFeedbackDetailModal(false);
                      await handleDeleteInterview(selectedInterview.id, true);
                    }
                  }}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  <span>Delete Session</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMoveToNextStage(selectedInterview)}
                  disabled={actionLoading === selectedInterview.id}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading === selectedInterview.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  <span>{getNextStageInfo(selectedInterview).label}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackDetailModal(false);
                    setSelectedInterview(null);
                  }}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-905 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in text-xs font-bold bg-slate-900">
          {toast.type === "success" ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
