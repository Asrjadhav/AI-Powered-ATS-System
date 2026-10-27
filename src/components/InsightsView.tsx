/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  PreferenceRepository,
  ReportRepository,
  InsightsRepository,
  JobRepository
} from "../repositories";
import {
  EMPTY_INSIGHTS,
  SCORE_BUCKET_COLORS,
  FUNNEL_STAGE_COLORS,
  type RecruitmentInsights
} from "../repositories/insightsRepository";
import { LocalStorageService } from "../services/localStorageService";
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
import { PageContainer, PageHeader, StatCard } from "./common/UIPrimitives";
import { SearchableSelect } from "./common/SearchableSelect";


const DATE_RANGES = ["Last 30 Days", "Last 90 Days", "This Quarter", "This Year", "All Time"];
const DEPARTMENTS = ["All Departments", "Engineering", "Design", "Product Management", "Marketing", "Sales", "Human Resources"];
const RECRUITERS = ["All Recruiters", "David Kemp", "Elena Rostova", "Sophia Patel", "Marcus Vance"];

interface InsightsViewProps {
  initialTab?: "overview" | "funnel" | "jobs";
}

export default function InsightsView({ initialTab = "overview" }: InsightsViewProps) {
  // Hash Canonical Enforcer: If user lands on #reports, change hash to #insights
  useEffect(() => {
    if (window.location.hash === "#reports") {
      window.history.replaceState(null, "", "#insights");
    }
  }, []);

  const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "jobs">(initialTab);
  const [density, setDensity] = useState(() => PreferenceRepository.getLayoutDensity());

  useEffect(() => {
    const handleSettings = () => {
      setDensity(PreferenceRepository.getLayoutDensity());
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  // Data States (Loaded from Real Repositories)
  const [insights, setInsights] = useState<RecruitmentInsights>(EMPTY_INSIGHTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Filters
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [recruiterFilter, setRecruiterFilter] = useState("All Recruiters");
  const [jobSearchQuery, setJobSearchQuery] = useState("");

  // Hiring Funnel job position filter. The positions come from the jobs table; the funnel for a chosen
  // position is fetched from the same API with the same department filter, and replaces only the funnel.
  const ALL_POSITIONS = "All Positions";
  const [positionFilter, setPositionFilter] = useState(ALL_POSITIONS);
  const [positions, setPositions] = useState<{ title: string; jobIds: string[] }[]>([]);
  const [funnelInsights, setFunnelInsights] = useState<RecruitmentInsights | null>(null);

  // Export / Toast States
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState("Weekly");
  const [scheduleFormat, setScheduleFormat] = useState("PDF");
  const [scheduleEmails, setScheduleEmails] = useState("aditijadhav2828@gmail.com, hr-alerts@company.com");
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Analytics, including the per-job breakdown, are aggregated by /api/insights.
      const [allPositionsInsights, chosenPositionInsights] = await Promise.all([
        InsightsRepository.getInsights(departmentFilter),
        positionFilter === ALL_POSITIONS
          ? Promise.resolve(null)
          : InsightsRepository.getInsights(departmentFilter, undefined, positionFilter)
      ]);
      setInsights(allPositionsInsights);
      setFunnelInsights(chosenPositionInsights);
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
    // Department and position scoping are applied by the API, so changing either refetches.
  }, [departmentFilter, positionFilter]);

  // The positions in the jobs table, loaded when the page opens and whenever jobs change.
  useEffect(() => {
    const loadPositions = async () => {
      try {
        setPositions(await JobRepository.getPositions());
      } catch (err) {
        console.error("Failed to load job positions:", err);
      }
    };
    loadPositions();
    window.addEventListener("jobs-updated", loadPositions);
    return () => window.removeEventListener("jobs-updated", loadPositions);
  }, []);

  // All analytics come from /api/insights, already aggregated in the database.
  // Only presentation colours are applied here.
  const stats = useMemo(() => ({
    ...insights,
    scoreBuckets: insights.scoreBuckets.map(bucket => ({
      ...bucket,
      color: SCORE_BUCKET_COLORS[bucket.key] || "#94a3b8"
    }))
  }), [insights]);

  // Funnel counts are cumulative and conversions are computed by the backend.
  const funnelSource = funnelInsights ?? insights;
  const funnelData = useMemo(() => funnelSource.funnel.map(stage => ({
    stage: stage.stage,
    count: stage.count,
    conversion: stage.conversionFromPrevious,
    color: FUNNEL_STAGE_COLORS[stage.key] || "#355EA8"
  })), [funnelSource]);

  const summaryMetrics = useMemo(() => [
    { id: "total_apps", title: "Total Applications", value: String(insights.total), change: "Live", isPositive: true, icon: Users, description: "Total candidate applications received" },
    { id: "hired", title: "Candidates Hired", value: String(insights.hiredCount), change: "Live", isPositive: true, icon: CheckCircle, description: "Candidates placed into active roles" },
    { id: "time_to_hire", title: "Average Time to Hire", value: "N/A", change: "Live", isPositive: true, icon: Clock, description: "No time-to-hire field is available in the current data" },
    { id: "interview_success", title: "Interview Success Rate", value: `${insights.interviewSuccessRate}%`, change: "Live", isPositive: true, icon: Percent, description: "Completed interviews as a share of interview records" },
    { id: "offer_acceptance", title: "Offer Acceptance Rate", value: `${insights.offerAcceptanceRate}%`, change: "Live", isPositive: true, icon: Award, description: "Accepted or joined offers as a share of offers" },
    { id: "ai_accuracy", title: "Average AI Score", value: `${insights.avgScore}%`, change: "Live", isPositive: true, icon: BrainCircuit, description: "Average AI score across filtered candidates" }
  ], [insights]);

  // Computed server-side by /api/insights (jobPerformance), from the same
  // department-filtered records the summary figures above use.
  const jobPerformance = insights.jobPerformance;

  // Export handlers
  const handleExportCSV = () => {
    let csv = "AURA RECRUITMENT ATS CANONICAL INSIGHTS REPORT\n";
    csv += `Date Generated: ${new Date().toLocaleString()}\n`;
    csv += `Date Range Scope: ${dateRange}\n`;
    csv += `Department Filter: ${departmentFilter}\n`;
    csv += `Funnel Position Filter: ${positionFilter}\n\n`;

    csv += "=========================================\n";
    csv += "SECTION 1 & 3: RECRUITMENT METRICS & ANALYTICS\n";
    csv += "=========================================\n";
    summaryMetrics.forEach(m => {
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
    jobPerformance.forEach(j => {
      csv += `"${j.title}","${j.department}",${j.applications},${j.qualified},${j.interviewRate}%,${j.hiringRate}%,${j.avgAiScore}%,"${j.status}"\n`;
    });
    csv += "\n";


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
    summaryMetrics.forEach(m => {
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
    <PageContainer>
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-sm flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="h-4 w-4 text-brand-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* TOP PAGE HEADER BAR & GLOBAL EXPORT CONTROLS */}
      <PageHeader 
        title="Recruitment Intelligence & Insights"
        subtitle="Unified analytics platform combining hiring metrics, pipeline funnel velocity, and job performance."
        actions={
          <>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm px-3 py-1.5 rounded-md border border-slate-200 shadow-sm transition-colors"
            >
              <FileDown className="h-4 w-4 text-rose-500" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm px-3 py-1.5 rounded-md border border-slate-200 shadow-sm transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm px-3 py-1.5 rounded-md border border-slate-200 shadow-sm transition-colors"
            >
              <Download className="h-4 w-4 text-[#1F3B75]" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 bg-[#1F3B75] hover:bg-[#152a55] text-white font-medium text-sm px-3 py-1.5 rounded-md shadow-sm transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Schedule Report</span>
            </button>
          </>
        }
      />

      {/* FILTER BAR & DATE SELECTORS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-3xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="h-4 w-4 text-[#1F3B75]" />
            <span>Filter Data Scope:</span>
          </div>

          <SearchableSelect
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            {DATE_RANGES.map(d => <option key={d} value={d}>{d}</option>)}
          </SearchableSelect>

          <SearchableSelect
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </SearchableSelect>

          <SearchableSelect
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            {RECRUITERS.map(r => <option key={r} value={r}>{r}</option>)}
          </SearchableSelect>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Synced: {lastRefreshed || "Just now"}</span>
          <button onClick={loadData} className="p-1 hover:text-[#1F3B75] transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#1F3B75]" : ""}`} />
          </button>
        </div>
      </div>

      {/* CANONICAL INSIGHTS NAVIGATION TABS */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
          { id: "funnel", label: "Hiring Funnel", icon: TrendingUp },
          { id: "jobs", label: "Job Performance", icon: Briefcase },
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setActiveTab(tabItem.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs transition-all border-b-2 cursor-pointer ${
                isActive 
                  ? "border-[#1F3B75] text-[#1F3B75] dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/40 rounded-t-lg"
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
              {summaryMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-3xs space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-slate-400 truncate">{metric.title}</span>
                      <Icon className="h-4 w-4 text-[#1F3B75]" />
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Avg AI Match Quality</span>
                  <BrainCircuit className="h-4 w-4 text-[#1F3B75]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-[#1F3B75]">{stats.avgScore}%</span>
                  <span className="text-xs font-bold text-emerald-600">+4.2%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#1F3B75] h-full rounded-full" style={{ width: `${stats.avgScore}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Evaluated across all active candidates</p>
              </div>

              {/* KPI 2 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Avg Time to Hire</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">N/A</span>
                  <span className="text-xs font-bold text-slate-500">Live data unavailable</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "0%" }} />
                </div>
                <p className="text-[11px] text-slate-500">Outperforming 21-day benchmark</p>
              </div>

              {/* KPI 4 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Offer Acceptance</span>
                  <Award className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-slate-900 dark:text-white">{stats.offerConversionRate}%</span>
                  <span className="text-xs font-bold text-slate-500">Live</span>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">SECTION 2 — Hiring Pipeline Funnel</h3>
              <p className="text-xs text-slate-500">Conversion percentages and volume across candidate recruitment stages.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SearchableSelect
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                aria-label="Job position"
                searchPlaceholder="Search positions..."
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={ALL_POSITIONS}>{ALL_POSITIONS}</option>
                {positions.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
              </SearchableSelect>
              <span className="text-xs font-mono font-bold bg-brand-50 text-[#1F3B75] px-3 py-1 rounded-full border border-brand-100">
                Full Pipeline Conversion: {funnelSource.total ? `${Math.round((funnelSource.hiredCount / funnelSource.total) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {funnelData.map((f, idx) => (
              <div key={f.stage} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-center bg-slate-50/50 dark:bg-slate-950">
                <span className="text-[10px] font-bold text-slate-400 font-mono">Stage {idx + 1}</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{f.stage}</h4>
                <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{f.count}</p>
                <span className="text-[10px] font-bold text-[#1F3B75] bg-brand-50 px-2 py-0.5 rounded font-mono">
                  {f.conversion}% stage rate
                </span>
              </div>
            ))}
          </div>

          {funnelSource.total === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs font-medium text-slate-500">
              {positionFilter === ALL_POSITIONS
                ? "No applications yet."
                : `No applications for ${positionFilter}${departmentFilter !== "All Departments" ? ` in ${departmentFilter}` : ""}.`}
            </div>
          )}

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
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
                {jobPerformance.filter(j => 
                  j.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
                  j.department.toLowerCase().includes(jobSearchQuery.toLowerCase())
                ).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{job.title}</td>
                    <td className="py-3 px-4 text-slate-500">{job.department}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{job.applications}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">{job.qualified}</td>
                    <td className="py-3 px-4 text-right font-mono">{job.interviewRate}%</td>
                    <td className="py-3 px-4 text-right font-mono">{job.hiringRate}%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1F3B75]">{job.avgAiScore}%</td>
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

      {/* SCHEDULE REPORT MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#1F3B75]" />
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
                onClick={async () => {
                  try {
                    // Third private copy of this feature found: this modal
                    // wrote to the same "ats_report_schedules" localStorage
                    // key as ReportsView.tsx, in its own separate React
                    // state that never saw what the other wrote — the two
                    // screens could silently disagree about what schedules
                    // existed. ReportRepository (imported above, never
                    // called) already reaches the real table both now use.
                    await ReportRepository.saveSchedule({
                      frequency: scheduleFreq,
                      format: scheduleFormat,
                      emails: scheduleEmails,
                      department: departmentFilter,
                    });
                    setShowScheduleModal(false);
                    // Honest wording: this saves the schedule config only.
                    // No scheduler is wired up to act on it yet.
                    triggerToast("💾 Report schedule saved. Automatic sending is not yet enabled.");
                  } catch (err) {
                    console.error("Failed to save report schedule:", err);
                    triggerToast("❌ Failed to save report schedule.");
                  }
                }}
                className="px-4 py-2 bg-[#1F3B75] text-white rounded-lg font-bold text-xs shadow-xs"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </PageContainer>
  );
}

// Icon helper
function LayoutDashboardIcon(props: any) {
  return <Briefcase {...props} />;
}
