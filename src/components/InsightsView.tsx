/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  CandidateRepository, 
  JobRepository, 
  InterviewRepository, 
  OfferRepository, 
  UserRepository,
  PreferenceRepository,
  ReportRepository
} from "../repositories";
import { LocalStorageService } from "../services/localStorageService";
import {
  normalizeCandidateStatus,
  getCandidateAIScore,
  isInterviewStage,
  isOfferedStage,
  isHiredStage,
  isRejectedStage,
  isAIShortlisted,
  isPendingEvaluation
} from "../utils/pipelineUtils";
import { 
  Compass, 
  FileText, 
  BarChart2, 
  Download, 
  FileSpreadsheet, 
  FileDown, 
  Calendar, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock, 
  Percent, 
  Award, 
  BrainCircuit, 
  Briefcase, 
  CheckCircle2, 
  Search, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  PieChart as PieIcon, 
  ChevronDown, 
  Check, 
  X, 
  Plus, 
  Sparkles, 
  AlertCircle, 
  Building2, 
  Bell, 
  ShieldCheck, 
  UserCheck 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

// ==========================================
// MOCK DATA FALLBACKS (FOR STATIC EXPORTS/BENCHMARKS)
// ==========================================

const INITIAL_SUMMARY_METRICS = [
  { id: "total_apps", title: "Total Applications", value: "1,482", change: "+12.4%", isPositive: true, icon: Users, description: "Total candidate applications received" },
  { id: "hired", title: "Candidates Hired", value: "42", change: "+8.2%", isPositive: true, icon: CheckCircle, description: "Candidates placed into active roles" },
  { id: "time_to_hire", title: "Average Time to Hire", value: "18.5 Days", change: "-3.1 Days", isPositive: true, icon: Clock, description: "Average days elapsed from application to offer" },
  { id: "interview_success", title: "Interview Success Rate", value: "68.4%", change: "+2.1%", isPositive: true, icon: Percent, description: "Ratio of interviews passing evaluation" },
  { id: "offer_acceptance", title: "Offer Acceptance Rate", value: "84.6%", change: "+4.5%", isPositive: true, icon: Award, description: "Percentage of extended offers accepted" },
  { id: "ai_accuracy", title: "AI Screening Accuracy", value: "96.2%", change: "+1.8%", isPositive: true, icon: BrainCircuit, description: "Model alignment with recruiter approvals" }
];

const JOB_PERFORMANCE = [
  { id: "JOB-0001", title: "Senior React Engineer", department: "Engineering", applications: 245, qualified: 98, interviewRate: "40.0%", hiringRate: "4.1%", avgAiScore: 88, status: "Active" },
  { id: "JOB-0003", title: "Lead AI Developer", department: "Engineering", applications: 180, qualified: 82, interviewRate: "45.5%", hiringRate: "5.5%", avgAiScore: 92, status: "Active" },
  { id: "JOB-0002", title: "Product Designer", department: "Design", applications: 142, qualified: 48, interviewRate: "33.8%", hiringRate: "2.8%", avgAiScore: 84, status: "Active" },
  { id: "JOB-0004", title: "Lead Technical Recruiter", department: "Human Resources", applications: 94, qualified: 31, interviewRate: "32.9%", hiringRate: "3.2%", avgAiScore: 81, status: "On Hold" },
  { id: "JOB-0005", title: "Senior Product Manager", department: "Product Management", applications: 110, qualified: 42, interviewRate: "38.1%", hiringRate: "1.8%", avgAiScore: 87, status: "Closed" }
];

const DATE_RANGES = ["Last 30 Days", "Last 90 Days", "This Quarter", "This Year", "All Time"];
const DEPARTMENTS = ["All Departments", "Engineering", "Design", "Product Management", "Marketing", "Sales", "Human Resources"];
const RECRUITERS = ["All Recruiters", "David Kemp", "Elena Rostova", "Sophia Patel", "Marcus Vance"];

interface InsightsViewProps {
  initialTab?: "overview" | "funnel" | "jobs" | "recruiters" | "ai_insights";
}

export default function InsightsView({ initialTab = "overview" }: InsightsViewProps) {
  // Hash Canonical Enforcer: If user lands on #reports, change hash to #insights
  useEffect(() => {
    if (window.location.hash === "#reports") {
      window.history.replaceState(null, "", "#insights");
    }
  }, []);

  const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "jobs" | "recruiters" | "ai_insights">(initialTab);
  const [density, setDensity] = useState(() => PreferenceRepository.getLayoutDensity());

  useEffect(() => {
    const handleSettings = () => {
      setDensity(PreferenceRepository.getLayoutDensity());
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  // Data States (Loaded from Real Repositories)
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Filters
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [recruiterFilter, setRecruiterFilter] = useState("All Recruiters");
  const [jobSearchQuery, setJobSearchQuery] = useState("");

  // Export / Toast States
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState("Weekly");
  const [scheduleFormat, setScheduleFormat] = useState("PDF");
  const [scheduleEmails, setScheduleEmails] = useState("aditijadhav2828@gmail.com, hr-alerts@company.com");
  const [activeSchedules, setActiveSchedules] = useState<Array<{id: string, frequency: string, format: string, emails: string, department: string, lastSent: string}>>(() => {
    const list = LocalStorageService.get<any[]>("ats_report_schedules", []);
    return list.length > 0 ? list : [
      { id: "sch-1", frequency: "Weekly", format: "PDF", emails: "aditijadhav2828@gmail.com", department: "Engineering", lastSent: "2026-08-28 08:00" },
      { id: "sch-2", frequency: "Monthly", format: "Excel", emails: "exec-board@company.com", department: "All Departments", lastSent: "2026-09-01 00:00" }
    ];
  });

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [candData, jobData, intData, offData, userData] = await Promise.all([
        CandidateRepository.getAll(),
        JobRepository.getAll(),
        InterviewRepository.getAll(),
        OfferRepository.getAll(),
        UserRepository.getAll()
      ]);
      setCandidates(candData || []);
      setJobs(jobData || []);
      setInterviews(intData || []);
      setOffers(offData || []);
      setUsers(userData || []);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error("Failed to load analytics repositories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener("trigger-notification-sync", handleSync);
    window.addEventListener("applications-updated", handleSync);
    window.addEventListener("interviews-updated", handleSync);
    window.addEventListener("offers-updated", handleSync);
    return () => {
      window.removeEventListener("trigger-notification-sync", handleSync);
      window.removeEventListener("applications-updated", handleSync);
      window.removeEventListener("interviews-updated", handleSync);
      window.removeEventListener("offers-updated", handleSync);
    };
  }, []);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(cand => {
      const candDept = cand.department || cand.job?.department || cand.candidate?.department || "";
      if (departmentFilter !== "All Departments" && candDept.toLowerCase() !== departmentFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [candidates, departmentFilter]);

  // Aggregation Calculations
  const stats = useMemo(() => {
    const total = filteredCandidates.length || candidates.length || 1;
    let totalAIScore = 0;
    let score90Plus = 0, score75To89 = 0, score60To74 = 0, scoreBelow60 = 0;
    let appliedCount = 0, shortlistedCount = 0, interviewCount = 0, offeredCount = 0, hiredCount = 0, rejectedCount = 0;

    filteredCandidates.forEach(cand => {
      const score = getCandidateAIScore(cand);
      totalAIScore += score;
      if (score >= 90) score90Plus++;
      else if (score >= 75) score75To89++;
      else if (score >= 60) score60To74++;
      else scoreBelow60++;

      const normStatus = normalizeCandidateStatus(cand.status || cand.candidate?.status).toLowerCase();
      if (normStatus === "new" || normStatus === "applied") appliedCount++;
      else if (normStatus === "shortlisted") shortlistedCount++;
      else if (normStatus.includes("interview")) interviewCount++;
      else if (normStatus === "offered") offeredCount++;
      else if (normStatus === "hired") hiredCount++;
      else if (normStatus === "rejected") rejectedCount++;
      else appliedCount++;
    });

    const avgScore = Math.round(totalAIScore / total);
    const activePipeline = shortlistedCount + interviewCount + offeredCount + hiredCount;
    const conversionRate = Math.round((activePipeline / total) * 100);
    const offerConversionRate = (offeredCount + hiredCount) > 0 ? Math.round((hiredCount / (offeredCount + hiredCount)) * 100) : 85;

    return {
      total,
      avgScore,
      appliedCount,
      shortlistedCount,
      interviewCount,
      offeredCount,
      hiredCount,
      rejectedCount,
      conversionRate,
      offerConversionRate,
      scoreBuckets: [
        { name: "Exceptional (90-100)", count: score90Plus, percentage: Math.round((score90Plus / total) * 100), color: "#1F3B75" },
        { name: "Strong (75-89)", count: score75To89, percentage: Math.round((score75To89 / total) * 100), color: "#355EA8" },
        { name: "Moderate (60-74)", count: score60To74, percentage: Math.round((score60To74 / total) * 100), color: "#f59e0b" },
        { name: "Needs Review (<60)", count: scoreBelow60, percentage: Math.round((scoreBelow60 / total) * 100), color: "#94a3b8" }
      ]
    };
  }, [filteredCandidates, candidates]);

  // Stage-by-stage Funnel Data
  const funnelData = useMemo(() => {
    const total = stats.total || 1482;
    const stageApplied = total;
    const stageShortlisted = Math.round(total * 0.615);
    const stageReview = Math.round(total * 0.327);
    const stageInterview = Math.round(total * 0.111);
    const stageOffer = Math.round(total * 0.034);
    const stageHired = Math.round(total * 0.028);

    return [
      { stage: "Applications", count: stageApplied, conversion: 100, color: "#1F3B75" },
      { stage: "AI Screening", count: stageShortlisted, conversion: 61.5, color: "#2E549B" },
      { stage: "Recruiter Review", count: stageReview, conversion: 32.7, color: "#355EA8" },
      { stage: "Interview", count: stageInterview, conversion: 11.1, color: "#557DBF" },
      { stage: "Offer", count: stageOffer, conversion: 3.4, color: "#f59e0b" },
      { stage: "Hired", count: stageHired, conversion: 2.8, color: "#10b981" }
    ];
  }, [stats]);

  // Recruiter Performance Matrix
  const recruiterData = useMemo(() => {
    return [
      { id: "rec-1", name: "David Kemp", reviewed: 420, scheduled: 112, offers: 18, hires: 15, avgTime: 16.2, score: 96, status: "Optimal" },
      { id: "rec-2", name: "Sophia Patel", reviewed: 382, scheduled: 98, offers: 15, hires: 13, avgTime: 17.8, score: 93, status: "Optimal" },
      { id: "rec-3", name: "Elena Rostova", reviewed: 310, scheduled: 85, offers: 12, hires: 10, avgTime: 19.5, score: 89, status: "Balanced" },
      { id: "rec-4", name: "Marcus Vance", reviewed: 290, scheduled: 74, offers: 8, hires: 6, avgTime: 22.1, score: 82, status: "Review" }
    ];
  }, []);

  // Export handlers
  const handleExportCSV = () => {
    let csv = "AURA RECRUITMENT ATS CANONICAL INSIGHTS REPORT\n";
    csv += `Date Generated: ${new Date().toLocaleString()}\n`;
    csv += `Date Range Scope: ${dateRange}\n`;
    csv += `Department Filter: ${departmentFilter}\n\n`;

    csv += "=========================================\n";
    csv += "SECTION 1 & 3: RECRUITMENT METRICS & ANALYTICS\n";
    csv += "=========================================\n";
    INITIAL_SUMMARY_METRICS.forEach(m => {
      csv += `"${m.title}","${m.value}","${m.change}"\n`;
    });
    csv += "\n";

    csv += "=========================================\n";
    csv += "SECTION 2: HIRING FUNNEL STAGE CONVERSIONS\n";
    csv += "=========================================\n";
    funnelData.forEach(s => {
      csv += `"${s.stage}",${s.count},${s.conversion}%\n`;
    });
    csv += "\n";

    csv += "=========================================\n";
    csv += "SECTION 4: JOB PERFORMANCE MATRIX\n";
    csv += "=========================================\n";
    JOB_PERFORMANCE.forEach(j => {
      csv += `"${j.title}","${j.department}",${j.applications},${j.qualified},"${j.interviewRate}","${j.hiringRate}",${j.avgAiScore}%,"${j.status}"\n`;
    });
    csv += "\n";

    csv += "=========================================\n";
    csv += "SECTION 5: RECRUITER PERFORMANCE SCORECARD\n";
    csv += "=========================================\n";
    recruiterData.forEach(r => {
      csv += `"${r.name}",${r.reviewed},${r.scheduled},${r.offers},${r.hires},${r.avgTime} Days,${r.score}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ATS_Insights_Report_${dateRange.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("📊 Downloaded CSV Report successfully!");
  };

  const handleExportExcel = () => {
    const BOM = "\uFEFF";
    let csv = "AURA RECRUITMENT EXCEL DIGEST\n";
    INITIAL_SUMMARY_METRICS.forEach(m => {
      csv += `"${m.title}","${m.value}"\n`;
    });
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ATS_Excel_Report_${dateRange.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("📈 Exported Excel Spreadsheet!");
  };

  const handleExportPDF = () => {
    triggerToast("📄 Triggered Executive Print-to-PDF!");
    setTimeout(() => {
      window.print();
    }, 600);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-8 space-y-5 sm:space-y-6 text-slate-800 dark:text-slate-100 transition-all select-none">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="h-4 w-4 text-brand-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* TOP PAGE HEADER BAR & GLOBAL EXPORT CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Console</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-brand-600 dark:text-brand-400 font-extrabold">Insights</span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Compass className="h-7 w-7 text-brand-600 dark:text-brand-400" />
            <span>Recruitment Intelligence & Insights</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unified analytics platform combining hiring metrics, pipeline funnel velocity, job performance, recruiter scorecards, and predictive AI.
          </p>
        </div>

        {/* SECTION 7: EXPORT CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 transition-all shadow-3xs cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-rose-500" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 transition-all shadow-3xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 transition-all shadow-3xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-brand-600" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Schedule Report</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR & DATE SELECTORS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-3xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="h-4 w-4 text-brand-600" />
            <span>Filter Data Scope:</span>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            {DATE_RANGES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            {RECRUITERS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Synced: {lastRefreshed || "Just now"}</span>
          <button onClick={loadData} className="p-1 hover:text-brand-600 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-brand-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* CANONICAL INSIGHTS NAVIGATION TABS */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
          { id: "funnel", label: "Hiring Funnel", icon: TrendingUp },
          { id: "jobs", label: "Job Performance", icon: Briefcase },
          { id: "recruiters", label: "Recruiter Performance", icon: Award },
          { id: "ai_insights", label: "AI Predictive Insights", icon: BrainCircuit }
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setActiveTab(tabItem.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs transition-all border-b-2 cursor-pointer ${
                isActive 
                  ? "border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/40 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tabItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==========================================
          TAB 1: OVERVIEW (SECTION 1 & SECTION 3)
          ========================================== */}
      {(activeTab === "overview") && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* SECTION 1: RECRUITMENT OVERVIEW SUMMARY CARDS */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">SECTION 1 — Recruitment Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {INITIAL_SUMMARY_METRICS.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-3xs space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-slate-400 truncate">{metric.title}</span>
                      <Icon className="h-4 w-4 text-brand-600" />
                    </div>
                    <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{metric.value}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                      {metric.change}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: RECRUITMENT ANALYTICS KPI MATRIX */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">SECTION 3 — Recruitment Analytics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* KPI 1 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Avg AI Match Quality</span>
                  <BrainCircuit className="h-4 w-4 text-brand-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-brand-600">{stats.avgScore}%</span>
                  <span className="text-xs font-bold text-emerald-600">+4.2%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-600 h-full rounded-full" style={{ width: `${stats.avgScore}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Evaluated across all active candidates</p>
              </div>

              {/* KPI 2 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Pipeline Progression</span>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">{stats.conversionRate}%</span>
                  <span className="text-xs font-bold text-emerald-600">+2.8%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.conversionRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Ratio converted into active pipeline</p>
              </div>

              {/* KPI 3 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Avg Time to Hire</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">18.4 Days</span>
                  <span className="text-xs font-bold text-emerald-600">-3 Days</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "68%" }} />
                </div>
                <p className="text-[11px] text-slate-500">Outperforming 21-day benchmark</p>
              </div>

              {/* KPI 4 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Offer Acceptance</span>
                  <Award className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">{stats.offerConversionRate}%</span>
                  <span className="text-xs font-bold text-emerald-600">Strong</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.offerConversionRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Offers accepted by candidates</p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: HIRING FUNNEL (SECTION 2)
          ========================================== */}
      {(activeTab === "funnel") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">SECTION 2 — Hiring Pipeline Funnel</h3>
              <p className="text-xs text-slate-500">Conversion percentages and volume across candidate recruitment stages.</p>
            </div>
            <span className="text-xs font-mono font-bold bg-brand-50 text-brand-600 px-3 py-1 rounded-full border border-brand-100">
              Full Pipeline Conversion: 2.8%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {funnelData.map((f, idx) => (
              <div key={f.stage} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-center bg-slate-50/50 dark:bg-slate-950">
                <span className="text-[10px] font-bold text-slate-400 font-mono">Stage {idx + 1}</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{f.stage}</h4>
                <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{f.count}</p>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded font-mono">
                  {f.conversion}% stage rate
                </span>
              </div>
            ))}
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: JOB PERFORMANCE (SECTION 4)
          ========================================== */}
      {(activeTab === "jobs") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">SECTION 4 — Job Performance Diagnostics</h3>
              <p className="text-xs text-slate-500">Track total applications, qualification rates, interview rates, and AI match scores per requisition.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                placeholder="Search job title or department..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950">
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Applications</th>
                  <th className="py-3 px-4 text-right">Qualified</th>
                  <th className="py-3 px-4 text-right">Interview Rate</th>
                  <th className="py-3 px-4 text-right">Hiring Rate</th>
                  <th className="py-3 px-4 text-right">Avg AI Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {JOB_PERFORMANCE.filter(j => 
                  j.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
                  j.department.toLowerCase().includes(jobSearchQuery.toLowerCase())
                ).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{job.title}</td>
                    <td className="py-3 px-4 text-slate-500">{job.department}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{job.applications}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">{job.qualified}</td>
                    <td className="py-3 px-4 text-right font-mono">{job.interviewRate}</td>
                    <td className="py-3 px-4 text-right font-mono">{job.hiringRate}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-brand-600">{job.avgAiScore}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        job.status === "Active" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                        job.status === "On Hold" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: RECRUITER PERFORMANCE (SECTION 5)
          ========================================== */}
      {(activeTab === "recruiters") && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">SECTION 5 — Recruiter Performance Leaderboard</h3>
            <p className="text-xs text-slate-500">Evaluates review velocity, scheduled interviews, extended offers, placements, and time-to-hire.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950">
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4 text-right">Reviewed</th>
                  <th className="py-3 px-4 text-right">Scheduled</th>
                  <th className="py-3 px-4 text-right">Offers</th>
                  <th className="py-3 px-4 text-right">Hires</th>
                  <th className="py-3 px-4 text-right">Avg Days</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {recruiterData.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs">
                        {rec.name.charAt(0)}
                      </div>
                      <span>{rec.name}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{rec.reviewed}</td>
                    <td className="py-3 px-4 text-right font-mono">{rec.scheduled}</td>
                    <td className="py-3 px-4 text-right font-mono">{rec.offers}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{rec.hires}</td>
                    <td className="py-3 px-4 text-right font-mono">{rec.avgTime} d</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-brand-600">{rec.score}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rec.status === "Optimal" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                        rec.status === "Balanced" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                        "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: AI PREDICTIVE INSIGHTS (SECTION 6)
          ========================================== */}
      {(activeTab === "ai_insights") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          
          {/* AI Match Cohort Donut Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-brand-600" />
                <span>AI Candidate Score Cohorts</span>
              </h3>
              <p className="text-xs text-slate-400">Match score compatibility distribution.</p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.scoreBuckets} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="count">
                    {stats.scoreBuckets.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {stats.scoreBuckets.map((b) => (
                <div key={b.name} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                  <span className="font-semibold">{b.name}</span>
                  <span className="font-mono font-bold text-brand-600">{b.count} ({b.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Bottleneck & Risk Signals */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span>SECTION 6 — AI Predictive Signals & Diagnosis</span>
              </h3>
              <p className="text-xs text-slate-400">Real-time candidate risk detection and automated hiring funnel velocity diagnosis.</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-700">
                <AlertCircle className="h-4 w-4" />
                <span>Primary Bottleneck Detected</span>
              </div>
              <p className="text-xs leading-relaxed">
                Candidate transition from <span className="font-bold">Shortlisted → Interview</span> is taking an average of 8.2 days due to panel schedule availability. Enabling candidate self-scheduling links reduces scheduling lag by 65%.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Screening Velocity</span>
                <p className="font-bold text-emerald-600 font-mono">1.2 Days (Optimal)</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Offer Approval Speed</span>
                <p className="font-bold text-emerald-600 font-mono">24 Hours (Fast)</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Candidate Drop-off Risk</span>
                <p className="font-bold text-amber-600 font-mono">12.4% (Low)</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SCHEDULE REPORT MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Schedule Automated Report</h3>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Frequency</label>
                <select value={scheduleFreq} onChange={(e) => setScheduleFreq(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
                  <option value="Daily">Daily Summary</option>
                  <option value="Weekly">Weekly Digest</option>
                  <option value="Monthly">Monthly Executive Review</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Export Format</label>
                <select value={scheduleFormat} onChange={(e) => setScheduleFormat(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
                  <option value="PDF">PDF Report Document</option>
                  <option value="Excel">Excel Spreadsheet (.csv)</option>
                  <option value="CSV">Raw CSV Dataset</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Recipient Email Addresses</label>
                <input type="text" value={scheduleEmails} onChange={(e) => setScheduleEmails(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs">
                Cancel
              </button>
              <button 
                onClick={() => {
                  const newSch = { id: `sch-${Date.now()}`, frequency: scheduleFreq, format: scheduleFormat, emails: scheduleEmails, department: departmentFilter, lastSent: "Pending First Run" };
                  const updated = [...activeSchedules, newSch];
                  setActiveSchedules(updated);
                  LocalStorageService.set("ats_report_schedules", updated);
                  setShowScheduleModal(false);
                  triggerToast("✓ Automated report schedule active!");
                }}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg font-bold text-xs shadow-xs"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Icon helper
function LayoutDashboardIcon(props: any) {
  return <Briefcase {...props} />;
}
