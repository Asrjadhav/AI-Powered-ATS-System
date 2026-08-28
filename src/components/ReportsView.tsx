/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { formatJobId } from "../repositories/repositoryUtils";
import { LocalStorageService } from "../services/localStorageService";
import { ReportRepository } from "../repositories";
import { 
  FileText, 
  Download, 
  Share2, 
  Calendar, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  ArrowUpRight, 
  ArrowDownRight, 
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
  CalendarDays,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Bell,
  Plus,
  Trash2,
  Mail,
  Check,
  X,
  Sparkles
} from "lucide-react";

// ==========================================
// MOCK JSON DATA FOR REPORTS
// ==========================================

const INITIAL_SUMMARY_METRICS = [
  {
    id: "total_apps",
    title: "Total Applications",
    value: "1,482",
    change: "+12.4%",
    isPositive: true,
    icon: Users,
    description: "Total candidate applications received across all channels"
  },
  {
    id: "hired",
    title: "Candidates Hired",
    value: "42",
    change: "+8.2%",
    isPositive: true,
    icon: CheckCircle,
    description: "Successful candidates placed into active roles"
  },
  {
    id: "time_to_hire",
    title: "Average Time to Hire",
    value: "18.5 Days",
    change: "-3.1 Days",
    isPositive: true, // fewer days is positive
    icon: Clock,
    description: "Average days elapsed from application to offer acceptance"
  },
  {
    id: "interview_success",
    title: "Interview Success Rate",
    value: "68.4%",
    change: "+2.1%",
    isPositive: true,
    icon: Percent,
    description: "Ratio of interviews passing screening and evaluations"
  },
  {
    id: "offer_acceptance",
    title: "Offer Acceptance Rate",
    value: "84.6%",
    change: "+4.5%",
    isPositive: true,
    icon: Award,
    description: "Percentage of extended offers accepted by candidates"
  },
  {
    id: "ai_accuracy",
    title: "AI Screening Accuracy",
    value: "96.2%",
    change: "+1.8%",
    isPositive: true,
    icon: BrainCircuit,
    description: "Model alignment with human recruiter shortlist approvals"
  }
];

const FUNNEL_DATA = [
  { stage: "Applications", count: 1482, conversion: 100 },
  { stage: "AI Screening", count: 912, conversion: 61.5 },
  { stage: "Recruiter Review", count: 486, conversion: 32.7 },
  { stage: "Interview", count: 164, conversion: 11.1 },
  { stage: "Offer", count: 51, conversion: 3.4 },
  { stage: "Hired", count: 42, conversion: 2.8 }
];

const RECRUITER_LEADERBOARD = [
  {
    id: "rec-1",
    name: "David Kemp",
    reviewed: 420,
    scheduled: 112,
    offers: 18,
    hires: 15,
    avgTime: 16.2,
    score: 96,
    isTop: true
  },
  {
    id: "rec-2",
    name: "Sophia Patel",
    reviewed: 382,
    scheduled: 98,
    offers: 15,
    hires: 13,
    avgTime: 17.8,
    score: 93,
    isTop: false
  },
  {
    id: "rec-3",
    name: "Elena Rostova",
    reviewed: 310,
    scheduled: 85,
    offers: 12,
    hires: 10,
    avgTime: 19.5,
    score: 89,
    isTop: false
  },
  {
    id: "rec-4",
    name: "Marcus Vance",
    reviewed: 290,
    scheduled: 74,
    offers: 8,
    hires: 6,
    avgTime: 22.1,
    score: 82,
    isTop: false
  }
];

const JOB_PERFORMANCE = [
  {
    id: "JOB-0001",
    title: "Senior React Engineer",
    department: "Engineering",
    applications: 245,
    qualified: 98,
    interviewRate: "40.0%",
    hiringRate: "4.1%",
    avgAiScore: 88,
    status: "Active"
  },
  {
    id: "JOB-0003",
    title: "Lead AI Developer",
    department: "Engineering",
    applications: 180,
    qualified: 82,
    interviewRate: "45.5%",
    hiringRate: "5.5%",
    avgAiScore: 92,
    status: "Active"
  },
  {
    id: "JOB-0002",
    title: "Product Designer",
    department: "Design",
    applications: 142,
    qualified: 48,
    interviewRate: "33.8%",
    hiringRate: "2.8%",
    avgAiScore: 84,
    status: "Active"
  },
  {
    id: "JOB-0004",
    title: "Lead Technical Recruiter",
    department: "Human Resources",
    applications: 94,
    qualified: 31,
    interviewRate: "32.9%",
    hiringRate: "3.2%",
    avgAiScore: 81,
    status: "On Hold"
  },
  {
    id: "JOB-0005",
    title: "Senior Product Manager",
    department: "Product Management",
    applications: 110,
    qualified: 42,
    interviewRate: "38.1%",
    hiringRate: "1.8%",
    avgAiScore: 87,
    status: "Closed"
  }
];

const EXPORT_HISTORY_LOGS = [
  {
    filename: "Hiring_Pipeline_Q2_Report.pdf",
    type: "PDF Document",
    size: "4.8 MB",
    generatedBy: "David Kemp",
    timestamp: "2026-06-28 14:32"
  },
  {
    filename: "Recruiter_Productivity_June_Matrix.xlsx",
    type: "Excel Workbook",
    size: "1.2 MB",
    generatedBy: "Elena Rostova",
    timestamp: "2026-06-25 09:15"
  },
  {
    filename: "AI_Screening_Validation_Export.csv",
    type: "CSV Dataset",
    size: "820 KB",
    generatedBy: "System Automated",
    timestamp: "2026-06-20 00:05"
  },
  {
    filename: "Engineering_Department_Hiring_Insights.pdf",
    type: "PDF Document",
    size: "3.5 MB",
    generatedBy: "David Kemp",
    timestamp: "2026-06-15 11:40"
  }
];

// Options for filters
const DATE_RANGES = ["Last 30 Days", "Last 90 Days", "This Quarter", "This Year", "All Time"];
const DEPARTMENTS = ["All Departments", "Engineering", "Design", "Product Management", "Marketing", "Sales", "Human Resources"];
const RECRUITERS = ["All Recruiters", "David Kemp", "Elena Rostova", "Sophia Patel", "Marcus Vance"];
const JOB_POSITIONS = ["All Positions", "Senior React Engineer", "Lead AI Developer", "Product Designer", "Senior Product Manager"];
const CANDIDATE_SOURCES = ["All Sources", "LinkedIn", "Indeed", "Company Website", "Referral", "Campus"];
const HIRING_STATUSES = ["All Statuses", "Applied", "AI Screening", "Interviewing", "Offered", "Hired", "Rejected"];

export default function ReportsView() {
  const [density, setDensity] = useState(() => LocalStorageService.get<string>("setting_layout_density", "comfortable"));
  
  React.useEffect(() => {
    const handleSettings = () => {
      setDensity(LocalStorageService.get<string>("setting_layout_density", "comfortable"));
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  // Filter States
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [department, setDepartment] = useState("All Departments");
  const [recruiter, setRecruiter] = useState("All Recruiters");
  const [jobPosition, setJobPosition] = useState("All Positions");
  const [candidateSource, setCandidateSource] = useState("All Sources");
  const [hiringStatus, setHiringStatus] = useState("All Statuses");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Skeleton / Loading states (simulation)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Floating Toast State
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Schedule Report Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState("Weekly");
  const [scheduleFormat, setScheduleFormat] = useState("PDF");
  const [scheduleEmails, setScheduleEmails] = useState("aditijadhav2828@gmail.com, hr-alerts@company.com");
  const [scheduleDept, setScheduleDept] = useState("All Departments");
  const [activeSchedules, setActiveSchedules] = useState<Array<{id: string, frequency: string, format: string, emails: string, department: string, lastSent: string}>>(() => {
    const list = LocalStorageService.get<any[]>("ats_report_schedules", []);
    return list.length > 0 ? list : [
      { id: "sch-1", frequency: "Weekly", format: "PDF", emails: "aditijadhav2828@gmail.com", department: "Engineering", lastSent: "2026-07-05 08:00" },
      { id: "sch-2", frequency: "Monthly", format: "Excel", emails: "exec-board@company.com", department: "All Departments", lastSent: "2026-07-01 00:00" }
    ];
  });

  React.useEffect(() => {
    LocalStorageService.set("ats_report_schedules", activeSchedules);
  }, [activeSchedules]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      triggerToast("🔄 Report dashboard successfully re-synchronized with latest ATS metrics!");
    }, 800);
  };

  const generateCSVData = () => {
    let csv = "AURA RECRUITMENT ATS INTELLIGENCE REPORT\n";
    csv += `Date Generated: ${new Date().toLocaleString()}\n`;
    csv += `Date Scope Range: ${dateRange}\n`;
    csv += `Department Focus: ${department}\n`;
    csv += `Recruiter Segment: ${recruiter}\n\n`;

    csv += "=========================================\n";
    csv += "I. EXECUTIVE CRITICAL METRICS SUMMARY\n";
    csv += "=========================================\n";
    csv += "Metric Title,Value,Monthly Rate Change,Status\n";
    INITIAL_SUMMARY_METRICS.forEach(m => {
      csv += `"${m.title}","${m.value}","${m.change}","${m.isPositive ? 'Positive Trend' : 'Review Warning'}"\n`;
    });
    csv += "\n";

    csv += "=========================================\n";
    csv += "II. HIRING FUNNEL STAGE CONVERSIONS\n";
    csv += "=========================================\n";
    csv += "Pipeline Stage,Active Candidates,Stage-to-Stage Conversion %\n";
    FUNNEL_DATA.forEach(s => {
      csv += `"${s.stage}",${s.count},${s.conversion}%\n`;
    });
    csv += "\n";

    csv += "=========================================\n";
    csv += "III. RECRUITER PERFORMANCE SCORECARD\n";
    csv += "=========================================\n";
    csv += "Recruiter,Candidates Reviewed,Interviews Scheduled,Offers Extended,Successful Hires,Avg Time to Hire,Fulfillment Score\n";
    RECRUITER_LEADERBOARD.forEach(r => {
      csv += `"${r.name}",${r.reviewed},${r.scheduled},${r.offers},${r.hires},${r.avgTime} Days,${r.score}%\n`;
    });
    csv += "\n";

    csv += "=========================================\n";
    csv += "IV. JOB ROLE PIPELINE HEALTH DIAGNOSTICS\n";
    csv += "=========================================\n";
    csv += "Job Title,Department,Total Applications,AI-Qualified Shortlist,Interview Rate,Hiring Rate,Avg AI Match Score,Pipeline Status\n";
    
    // Filter the jobs being downloaded
    const currentFilteredJobs = JOB_PERFORMANCE.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            job.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = department === "All Departments" || job.department === department;
      return matchesSearch && matchesDept;
    });

    currentFilteredJobs.forEach(j => {
      csv += `"${j.title}","${j.department}",${j.applications},${j.qualified},"${j.interviewRate}","${j.hiringRate}",${j.avgAiScore}%,"${j.status}"\n`;
    });

    return csv;
  };

  const handleExport = (format: string) => {
    setIsExporting(format);
    
    setTimeout(() => {
      setIsExporting(null);
      const csvContent = generateCSVData();
      
      if (format === "CSV") {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Aura_ATS_Recruitment_Report_${dateRange.replace(/\s+/g, "_")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerToast("📊 Download CSV started! Raw tabular dataset exported.");
      } else if (format === "Excel") {
        // Excel ready CSV with UTF-8 BOM
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Aura_Hiring_Spreadsheet_Report_${dateRange.replace(/\s+/g, "_")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerToast("📈 Excel Export complete! Grid-aligned CSV downloaded.");
      } else if (format === "PDF") {
        // Direct download of text file with beautiful structure
        const header = "=========================================================================\n" +
                       "              AURA INTELLECTUAL HIRING SUITE - EXECUTIVE REPORT\n" +
                       "=========================================================================\n" +
                       `Generated On: ${new Date().toLocaleString()}\n` +
                       `Active Date Range: ${dateRange}\n` +
                       `Department: ${department}\n` +
                       "-------------------------------------------------------------------------\n\n";
        const docContent = header + csvContent;
        const blob = new Blob([docContent], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Aura_Executive_Recruitment_Digest_${dateRange.replace(/\s+/g, "_")}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        triggerToast("📄 Downloaded Executive Report Text Digest! Standard Print-to-PDF triggered as well.");
        // Standard print trigger so they can save exactly the visually rich UI as PDF!
        setTimeout(() => {
          window.print();
        }, 800);
      }
    }, 1200);
  };

  const handleDownloadHistoryLog = (log: { filename: string, type: string, size: string, generatedBy: string, timestamp: string }) => {
    triggerToast(`📥 Retrieving archived snapshot: ${log.filename}...`);
    
    setTimeout(() => {
      let content = "";
      let contentType = "text/plain;charset=utf-8;";
      
      if (log.filename.endsWith(".pdf")) {
        content = `=========================================================================\n` +
                  `              AURA INTELLECTUAL HIRING SUITE - ARCHIVED EXECUTIVE DIGEST\n` +
                  `=========================================================================\n` +
                  `Archive Filename : ${log.filename}\n` +
                  `Document Format  : PDF Snapshot (Standard formatted text digest)\n` +
                  `File Size        : ${log.size}\n` +
                  `Generated By     : ${log.generatedBy}\n` +
                  `Timestamp        : ${log.timestamp}\n` +
                  `-------------------------------------------------------------------------\n\n` +
                  `SUMMARY HIGHLIGHTS FOR Q2 / JUNE METRICS:\n` +
                  `- Active Postings Checked: 18 key positions\n` +
                  `- Aggregate Candidates Reviewed: 1,482 total entries\n` +
                  `- Screening Funnel Efficacy: 61.5% filtered to AI Shortlist\n` +
                  `- Core Placement Level: 42 final successful recruits\n` +
                  `- Top Performer: David Kemp (96% Fulfillment Performance)\n\n` +
                  `-------------------------------------------------------------------------\n` +
                  `Note: This is a read-only historical vault record. To view live updates,\n` +
                  `please trigger a fresh 'Export PDF' directly from the main Reports dashboard.`;
        contentType = "text/plain;charset=utf-8;";
      } else {
        // Excel / CSV format
        contentType = "text/csv;charset=utf-8;";
        content = `AURA ARCHIVE INDEX,${log.filename}\n` +
                  `Record Type,${log.type}\n` +
                  `Data Footprint,${log.size}\n` +
                  `Compiled By,${log.generatedBy}\n` +
                  `System Timestamp,${log.timestamp}\n\n` +
                  `Recruiter Performance Matrix:\n` +
                  `Recruiter,Reviewed Candidates,Scheduled Interviews,Offers Extended,Placements Completed,Avg Days to Hire\n` +
                  `David Kemp,420,112,18,15,16.2\n` +
                  `Sophia Patel,382,98,15,13,17.8\n` +
                  `Elena Rostova,310,85,12,10,19.5\n` +
                  `Marcus Vance,290,74,8,6,22.1\n`;
      }
      
      const BOM = log.filename.endsWith(".xlsx") ? "\uFEFF" : "";
      const blob = new Blob([BOM + content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Excel workbook downloads are saved as a fully-compliant comma-separated spreadsheet with Excel compatibility
      const downloadName = log.filename.endsWith(".xlsx") ? log.filename.replace(".xlsx", ".csv") : log.filename;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerToast(`✅ Successfully downloaded archived file: ${downloadName}!`);
    }, 900);
  };

  const filteredJobs = JOB_PERFORMANCE.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = department === "All Departments" || job.department === department;
    return matchesSearch && matchesDept;
  });

  return (
    <div className={`${density === "compact" ? "p-4 space-y-4" : "p-8 space-y-8"} max-w-7xl mx-auto text-slate-800 dark:text-slate-100 transition-all`}>
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Analytics</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Reports</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-indigo-600" />
            <span>Reports</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze hiring performance, recruiter productivity, and recruitment trends.
          </p>
        </div>
        
        {/* Top Right Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => handleExport("PDF")}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-3xs"
          >
            <FileDown className="h-4 w-4 text-rose-500" />
            <span>Export PDF</span>
          </button>
          
          <button
            onClick={() => handleExport("Excel")}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-3xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export Excel</span>
          </button>
          
          <button
            onClick={() => handleExport("CSV")}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-3xs"
          >
            <Download className="h-4 w-4 text-indigo-500" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={() => {
              setShowScheduleModal(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            <span>Schedule Report</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR - STICKY PANEL */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs sticky top-0 z-20 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Report Filter Bar</h3>
          </div>
          <button 
            onClick={handleRefresh}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            title="Reload report data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* Date Range Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Range</label>
            <div className="relative">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {DATE_RANGES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Department Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
            <div className="relative">
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {DEPARTMENTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Recruiter Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recruiter</label>
            <div className="relative">
              <select 
                value={recruiter}
                onChange={(e) => setRecruiter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {RECRUITERS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Job Position Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Position</label>
            <div className="relative">
              <select 
                value={jobPosition}
                onChange={(e) => setJobPosition(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {JOB_POSITIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Candidate Source Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Source</label>
            <div className="relative">
              <select 
                value={candidateSource}
                onChange={(e) => setCandidateSource(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {CANDIDATE_SOURCES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Hiring Status Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hiring Status</label>
            <div className="relative">
              <select 
                value={hiringStatus}
                onChange={(e) => setHiringStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer appearance-none"
              >
                {HIRING_STATUSES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY METRICS GRID */}
      {isRefreshing ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded-sm w-3/4" />
              <div className="h-8 bg-slate-200 rounded-sm w-1/2" />
              <div className="h-3 bg-slate-200 rounded-sm w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {INITIAL_SUMMARY_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div 
                key={metric.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-all duration-300" />
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 truncate">{metric.title}</span>
                    <span className={`p-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors`}>
                      <Icon className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-xl font-bold font-mono text-slate-900 tracking-tight">{metric.value}</h4>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                    metric.isPositive 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}>
                    {metric.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{metric.change}</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400">vs LMonth</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HIRING FUNNEL SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-950 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <span>Hiring Pipeline Funnel Conversion</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visualizes candidates passing successfully from initial application through AI matching, reviews, and placement.
            </p>
          </div>
          <span className="text-xs text-indigo-600 bg-indigo-50 font-bold border border-indigo-100 px-3 py-1 rounded-full">
            Full Pipeline Conversion: 2.8%
          </span>
        </div>

        {/* Funnel Visual representation */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {FUNNEL_DATA.map((stage, idx) => {
            const percentageFromFirst = ((stage.count / FUNNEL_DATA[0].count) * 100).toFixed(1);
            
            // Calculate a color weighting to render a nice vertical visual stack
            const opacityClass = idx === 0 ? "bg-indigo-600 text-white" :
                                 idx === 1 ? "bg-indigo-500 text-white" :
                                 idx === 2 ? "bg-indigo-400/90 text-slate-900" :
                                 idx === 3 ? "bg-indigo-300 text-slate-900" :
                                 idx === 4 ? "bg-indigo-200 text-indigo-950" :
                                 "bg-indigo-100 text-indigo-950 border border-indigo-200";

            return (
              <div 
                key={stage.stage}
                className="flex flex-col rounded-xl overflow-hidden border border-slate-250 hover:border-indigo-300 hover:shadow-xs transition-all p-4 space-y-3 relative group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Stage {idx + 1}</span>
                  <span className="text-[10px] font-bold text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">
                    {stage.conversion}% Stage
                  </span>
                </div>

                <div className={`p-3 rounded-lg ${opacityClass} text-center shadow-3xs transition-all group-hover:scale-[1.02]`}>
                  <h5 className="text-xs font-bold font-display truncate">{stage.stage}</h5>
                  <p className="text-lg font-bold font-mono mt-1">{stage.count}</p>
                </div>

                <div className="text-center pt-1 text-[10px] text-slate-500 font-semibold">
                  <span className="font-mono text-slate-800">{percentageFromFirst}%</span> of initial pool
                </div>

                {idx < 5 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10 bg-indigo-500/10 p-1 rounded-full border border-indigo-100 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-indigo-500 transform -rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* RECRUITER PERFORMANCE (Leaderboard) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-950 flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-500 animate-bounce" />
                <span>Recruiter Performance Leaderboard</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Leaderboard evaluation based on active response time, candidate review volumes, and successful placements.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Active Cycle</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3">Recruiter</th>
                  <th className="py-3 text-center">Reviewed</th>
                  <th className="py-3 text-center">Scheduled</th>
                  <th className="py-3 text-center">Offers</th>
                  <th className="py-3 text-center">Hires</th>
                  <th className="py-3 text-center">Avg Days</th>
                  <th className="py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {RECRUITER_LEADERBOARD.map((rec) => (
                  <tr 
                    key={rec.id}
                    className="border-b border-slate-100/70 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3.5 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border text-slate-600 font-bold font-mono">
                        {rec.name?.split(" ").map(n => n[0]).join("") || ""}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{rec.name}</span>
                          {rec.isTop && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              👑 Top Performer
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 text-center font-semibold text-slate-700 font-mono">{rec.reviewed}</td>
                    <td className="py-3.5 text-center font-semibold text-slate-700 font-mono">{rec.scheduled}</td>
                    <td className="py-3.5 text-center font-semibold text-slate-700 font-mono">{rec.offers}</td>
                    <td className="py-3.5 text-center font-semibold text-emerald-600 font-mono font-bold">{rec.hires}</td>
                    <td className="py-3.5 text-center font-semibold text-slate-700 font-mono">{rec.avgTime}d</td>
                    <td className="py-3.5 text-right font-bold text-indigo-600 font-mono">{rec.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* EXPORT HISTORY LOGS */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display font-semibold text-sm text-slate-950 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span>Export History Log</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Recent spreadsheet archives and PDF summary digests generated by recruiters.
            </p>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-72 pr-1">
            {EXPORT_HISTORY_LOGS.map((log) => (
              <div 
                key={log.filename}
                className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-start justify-between gap-3 hover:border-slate-300 transition-all text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <h5 className="font-bold text-slate-900 truncate flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{log.filename}</span>
                  </h5>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {log.type} &middot; <span className="font-mono">{log.size}</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono">
                    By: {log.generatedBy} &middot; {log.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadHistoryLog(log)}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer shadow-3xs shrink-0 transition-colors"
                  title="Download File"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <button 
              onClick={() => triggerToast("📂 Complete Historical Reports directory is already loaded on this page.")}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <span>View Full Archives</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* JOB PERFORMANCE TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-950 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-500" />
              <span>Job Role Pipeline Performance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Performance diagnostics broken down by individual postings, indicating AI evaluation averages and applicant response success.
            </p>
          </div>

          {/* Table Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3">Job Title</th>
                <th className="py-3">Department</th>
                <th className="py-3 text-center">Applications</th>
                <th className="py-3 text-center">Qualified (AI Approved)</th>
                <th className="py-3 text-center">Interview Rate</th>
                <th className="py-3 text-center">Hiring Rate</th>
                <th className="py-3 text-center">Avg AI Match Score</th>
                <th className="py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    <Info className="h-5 w-5 mx-auto text-slate-300 mb-1" />
                    <p className="font-semibold text-slate-700">No matching pipeline roles found</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr 
                    key={job.title}
                    className="border-b border-slate-100/70 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3.5 font-bold text-slate-900">{job.title} {job.id ? <span className="font-mono text-xs font-normal text-slate-400 font-semibold">({formatJobId(job.id)})</span> : ""}</td>
                    <td className="py-3.5 text-slate-600 font-semibold">{job.department}</td>
                    <td className="py-3.5 text-center font-semibold font-mono text-slate-700">{job.applications}</td>
                    <td className="py-3.5 text-center font-semibold font-mono text-indigo-600 font-bold">{job.qualified}</td>
                    <td className="py-3.5 text-center font-semibold font-mono text-slate-700">{job.interviewRate}</td>
                    <td className="py-3.5 text-center font-semibold font-mono text-emerald-600 font-bold">{job.hiringRate}</td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                          {job.avgAiScore}%
                        </span>
                        <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-indigo-600 h-1 rounded-full" 
                            style={{ width: `${job.avgAiScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-full ${
                        job.status === "Active" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : job.status === "On Hold"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 📅 SCHEDULE REPORT MODAL                                  */}
      {/* ========================================================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Calendar className="h-5.5 w-5.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950">Automated Report Scheduling Hub</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure recurring intelligence digests delivered directly to stakeholder inboxes.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-left">
              
              {/* 💡 EDUCATIONAL EXPLANATION BOX */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3">
                <Info className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Why Use Scheduled Reports?</h4>
                  <ul className="text-[11px] text-indigo-800 list-disc list-inside space-y-1 font-medium leading-relaxed">
                    <li><strong className="font-bold">Zero Manual Effort:</strong> Keeps executives, department leads, and clients aligned on hiring pipeline velocity without manual sheet compilation.</li>
                    <li><strong className="font-bold">Proactive Botlleneck Warnings:</strong> Automatically flags metrics like high Average Time-to-Hire or falling Offer Acceptance rates.</li>
                    <li><strong className="font-bold">Historic Audit Compliance:</strong> Preserves automated archive points of recruiter scorecards and candidate pools.</li>
                  </ul>
                </div>
              </div>

              {/* Configure Schedule Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Delivery Frequency */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recurrence Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Daily", "Weekly", "Monthly", "Quarterly"].map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setScheduleFreq(freq)}
                        className={`py-2 px-3 border text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                          scheduleFreq === freq
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Report Format */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Export File Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["PDF", "Excel", "CSV"].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setScheduleFormat(fmt)}
                        className={`py-2 px-3 border text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                          scheduleFormat === fmt
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {fmt === "Excel" ? "XLSX" : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Scope (Department) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Scope</label>
                  <select
                    value={scheduleDept}
                    onChange={(e) => setScheduleDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Recipient Emails */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stakeholder Email Recipients</label>
                  <div className="relative">
                    <Mail className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text"
                      placeholder="e.g. board@company.com, ceo@company.com"
                      value={scheduleEmails}
                      onChange={(e) => setScheduleEmails(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* ACTIVE SCHEDULES LOG PANEL */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  <span>Currently Configured Recurrent Schedules</span>
                </h4>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {activeSchedules.length > 0 ? (
                    activeSchedules.map((schedule) => (
                      <div 
                        key={schedule.id}
                        className="bg-slate-50 border border-slate-200/60 hover:border-slate-300 rounded-xl p-3 flex items-center justify-between gap-4 transition-all text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[10px]">
                              {schedule.frequency}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-bold font-mono">
                              Format: {schedule.format} &middot; Scope: {schedule.department}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-sm sm:max-w-md">
                            Delivery: {schedule.emails}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            Last Dispatch: {schedule.lastSent}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setActiveSchedules(prev => prev.filter(s => s.id !== schedule.id));
                            triggerToast("🗑️ Report schedule removed from continuous automation loops.");
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer shrink-0"
                          title="Delete Schedule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No schedules defined yet. Construct one above to automate stakeholder intelligence!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-3 py-2 border border-slate-200 hover:bg-white text-xs font-bold text-slate-500 rounded-lg cursor-pointer transition-colors"
              >
                Close Panel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!scheduleEmails.trim()) {
                    triggerToast("⚠️ Stakeholder recipient list cannot be blank!");
                    return;
                  }
                  const newSched = {
                    id: `sch-${Date.now()}`,
                    frequency: scheduleFreq,
                    format: scheduleFormat,
                    emails: scheduleEmails.trim(),
                    department: scheduleDept,
                    lastSent: "Scheduled / Waiting"
                  };
                  setActiveSchedules(prev => [...prev, newSched]);
                  triggerToast(`🚀 Automated ${scheduleFreq} ${scheduleFormat} Report successfully saved and linked to ATS scheduler!`);
                  setShowScheduleModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Schedule & Activate Loop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* FLOAT TOAST NOTIFICATIONS                                 */}
      {/* ========================================================== */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border border-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-in">
          <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
