/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import { LocalStorageService } from "../services/localStorageService";
import { formatJobId } from "../repositories/repositoryUtils";
import { 
  CandidateRepository, 
  InterviewRepository, 
  OfferRepository, 
  JobRepository, 
  TalentPoolRepository,
  ApplicationRepository,
  StatsRepository
} from "../repositories";
import { 
  Briefcase, 
  Users, 
  Clock, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  TrendingUp,
  AlertCircle,
  User,
  Plus,
  Trash2,
  Check,
  StickyNote,
  Calendar,
  Award,
  Database,
  Info,
  FileText
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { Application } from "../types";

interface DashboardViewProps {
  onNavigate: (tab: string, filters?: {
    candidatesFilterStatus?: string;
    candidatesFilterToday?: boolean;
    candidatesFilterJobId?: string;
    sortBy?: "date" | "score";
    interviewsFilter?: "all" | "today" | "upcoming" | "completed" | "cancelled";
    offersFilterStatus?: string;
  }) => void;
  onSelectApplication: (app: Application) => void;
}

export default function DashboardView({ onNavigate, onSelectApplication }: DashboardViewProps) {
  const { t } = useTranslation();

  // Metrics fetched directly via Repository layer (Single Source of Truth)
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [interviewsTotal, setInterviewsTotal] = useState(0);
  const [offersTotal, setOffersTotal] = useState(0);
  const [newApplications, setNewApplications] = useState(0);
  const [pendingEvaluation, setPendingEvaluation] = useState(0);
  const [aiShortlisted, setAiShortlisted] = useState(0);
  const [aiMatchScore, setAiMatchScore] = useState(0);
  const [activeVacancies, setActiveVacancies] = useState(0);
  const [interviewsToday, setInterviewsToday] = useState(0);
  const [interviewCompleted, setInterviewCompleted] = useState(0);
  const [pendingOffers, setPendingOffers] = useState(0);
  const [talentPoolTotal, setTalentPoolTotal] = useState(0);

  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sticky Notes / To Do state with local persistence
  const [todos, setTodos] = useState<{ id: string; text: string; completed: boolean; color: string }[]>(() => {
    const saved = localStorage.getItem("recruitment_todos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: "1", text: "Schedule technical interview with Sneha Patel for Lead UX Designer", completed: false, color: "amber" },
      { id: "2", text: "Send feedback mail to mid-level engineering candidates", completed: true, color: "blue" },
      { id: "3", text: "Discuss senior roles budget allocation with VP of Product", completed: false, color: "purple" },
      { id: "4", text: "Verify API reference payload for resume parser extractor", completed: false, color: "green" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("recruitment_todos", JSON.stringify(todos));
  }, [todos]);

  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoColor, setNewTodoColor] = useState("amber"); // amber, blue, purple, green

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newTodo = {
      id: `todo-${Date.now()}`,
      text: newTodoText.trim(),
      completed: false,
      color: newTodoColor
    };
    setTodos(prev => [newTodo, ...prev]);
    setNewTodoText("");
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  // Responsive Preferences
  const [density, setDensity] = useState(() => LocalStorageService.get<string>("setting_layout_density", "comfortable"));
  const [matchThreshold, setMatchThreshold] = useState(() => Number(LocalStorageService.get<string>("setting_match_threshold", "80")));
  const [highFitHighlight, setHighFitHighlight] = useState(() => LocalStorageService.get<string>("setting_high_fit_highlight", "true") !== "false");

  useEffect(() => {
    const handleSettings = () => {
      setDensity(LocalStorageService.get<string>("setting_layout_density", "comfortable"));
      setMatchThreshold(Number(LocalStorageService.get<string>("setting_match_threshold", "80")));
      setHighFitHighlight(LocalStorageService.get<string>("setting_high_fit_highlight", "true") !== "false");
    };
    window.addEventListener("settings-changed", handleSettings);
    return () => window.removeEventListener("settings-changed", handleSettings);
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const [stats, allAppsList, allJobsList] = await Promise.all([
        StatsRepository.getDashboardStats(),
        CandidateRepository.getAll(),
        JobRepository.getAll()
      ]);

      setTotalCandidates(stats.activeCandidates);
      setInterviewsTotal(stats.totalInterviews !== undefined ? stats.totalInterviews : (stats.upcomingInterviews + stats.completedInterviews + stats.cancelledInterviews + (stats.pendingFeedback || 0)));
      setOffersTotal(stats.totalOffers !== undefined ? stats.totalOffers : (stats.offeredCount + stats.pendingOffers));
      setNewApplications(stats.newApplicationsCount !== undefined ? stats.newApplicationsCount : stats.appsTodayCount);
      setPendingEvaluation(stats.pendingReviews);
      setAiShortlisted(stats.aiShortlistedCount);
      setAiMatchScore(stats.averageMatchScore);
      setActiveVacancies(stats.totalJobs);
      setTalentPoolTotal(stats.talentPoolCount);

      setAllApplications(allAppsList || []);

      // Sort recent applications
      if (allAppsList && allAppsList.length > 0) {
        const getAppTime = (app: any) => {
          const dateStr = app.appliedAt || app.appliedDate || app.createdAt || app.candidate?.createdAt;
          if (dateStr) return new Date(dateStr).getTime();
          if (Array.isArray(app.timeline) && app.timeline.length > 0) {
            return new Date(app.timeline[0].timestamp).getTime();
          }
          return 0;
        };
        const sortedApps = [...allAppsList]
          .sort((a: any, b: any) => getAppTime(b) - getAppTime(a))
          .slice(0, 4);
        setRecentApps(sortedApps);
      } else {
        setRecentApps([]);
      }

      // Sort recent jobs
      if (allJobsList && allJobsList.length > 0) {
        const sortedJobs = [...allJobsList]
          .sort((a: any, b: any) => {
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 4);
        setRecentJobs(sortedJobs);
      } else {
        setRecentJobs([]);
      }

      setError(null);
    } catch (err: any) {
      console.error("Error loading dashboard data via StatsRepository:", err);
      setError("Failed to fetch dashboard metrics. Please verify repository connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
    const handleSync = () => {
      loadDashboardStats();
    };

    window.addEventListener("trigger-notification-sync", handleSync);
    window.addEventListener("applications-updated", handleSync);
    window.addEventListener("jobs-updated", handleSync);
    window.addEventListener("candidates-updated", handleSync);
    window.addEventListener("interviews-updated", handleSync);
    window.addEventListener("offers-updated", handleSync);
    window.addEventListener("talent-pool-updated", handleSync);
    window.addEventListener("notifications-updated", handleSync);
    window.addEventListener("email-templates-updated", handleSync);

    return () => {
      window.removeEventListener("trigger-notification-sync", handleSync);
      window.removeEventListener("applications-updated", handleSync);
      window.removeEventListener("jobs-updated", handleSync);
      window.removeEventListener("candidates-updated", handleSync);
      window.removeEventListener("interviews-updated", handleSync);
      window.removeEventListener("offers-updated", handleSync);
      window.removeEventListener("talent-pool-updated", handleSync);
      window.removeEventListener("notifications-updated", handleSync);
      window.removeEventListener("email-templates-updated", handleSync);
    };
  }, [matchThreshold]);

  const getScoreColor = (score?: number) => {
    if (!score) return "text-slate-400 bg-slate-100 border-slate-200/50 dark:text-slate-500 dark:bg-slate-800 dark:border-slate-700";
    if (score >= matchThreshold) return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800";
    if (score >= matchThreshold - 15) return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800";
    return "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800";
  };

  // Dynamic weekly applications chart data computed from allApplications
  const weeklyApplicationsData = React.useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts: Record<string, number> = {
      "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0
    };
    (allApplications || []).forEach(app => {
      const dateStr = app.appliedAt || app.appliedDate || app.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const dayName = dayNames[d.getDay()];
          if (counts[dayName] !== undefined) {
            counts[dayName] += 1;
          }
        }
      }
    });
    return days.map(day => ({
      name: day,
      count: counts[day]
    }));
  }, [allApplications]);

  // Dynamic pipeline chart data computed from allApplications
  const pipelineChartData = React.useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts: Record<string, { Applied: number; Interviewed: number; Hired: number }> = {
      "Mon": { Applied: 0, Interviewed: 0, Hired: 0 },
      "Tue": { Applied: 0, Interviewed: 0, Hired: 0 },
      "Wed": { Applied: 0, Interviewed: 0, Hired: 0 },
      "Thu": { Applied: 0, Interviewed: 0, Hired: 0 },
      "Fri": { Applied: 0, Interviewed: 0, Hired: 0 },
      "Sat": { Applied: 0, Interviewed: 0, Hired: 0 },
      "Sun": { Applied: 0, Interviewed: 0, Hired: 0 },
    };
    (allApplications || []).forEach(app => {
      const dateStr = app.appliedAt || app.appliedDate || app.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const dayName = dayNames[d.getDay()];
          if (counts[dayName]) {
            counts[dayName].Applied += 1;
            const st = String(app.status || "").toLowerCase();
            if (st.includes("interview") || st === "interviewing") {
              counts[dayName].Interviewed += 1;
            }
            if (st.includes("hire") || st === "hired") {
              counts[dayName].Hired += 1;
            }
          }
        }
      }
    });
    return days.map(day => ({
      name: day,
      Applied: counts[day].Applied,
      Interviewed: counts[day].Interviewed,
      Hired: counts[day].Hired
    }));
  }, [allApplications]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display font-semibold text-rose-900 text-lg">System Dashboard Error</h3>
          <p className="text-sm text-rose-700 mt-1">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const COLORS = {
    Applied: "#6366f1",
    Interviewed: "#3b82f6",
    Hired: "#10b981"
  };

  return (
    <div className={`${density === "compact" ? "space-y-4 p-4" : "space-y-8 p-8"} max-w-7xl mx-auto dark:text-slate-100 transition-all`}>
      {/* Upper Executive Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${density === "compact" ? "gap-4" : "gap-6"}`}>
        {/* Card 1: Active Vacancies */}
        <div 
          onClick={() => onNavigate("jobs")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                <Briefcase className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">JOBS</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
              {t("active_vacancies")}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{activeVacancies}</h3>
          </div>
          <p className="text-xs text-green-600 font-medium mt-2 group-hover/card:underline">From JobRepository</p>
        </div>

        {/* Card 2: Total Candidates */}
        <div 
          onClick={() => onNavigate("candidates")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                <Users className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">CANDIDATES</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
              Total Candidates
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{totalCandidates}</h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">From CandidateRepository</p>
        </div>

        {/* Card 3: Talent Pool */}
        <div 
          onClick={() => onNavigate("talent_pool")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                <Database className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
              </div>
              <span className="text-[10px] font-mono font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-2.5 py-0.5 rounded-md">
                POOL
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
              Talent Pool
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{talentPoolTotal}</h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">From TalentPoolRepository</p>
        </div>

        {/* Card 5: Interviews */}
        <div 
          onClick={() => onNavigate("interviews")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-md">
                INTERVIEWS
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
              Interviews
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{interviewsTotal}</h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">From InterviewRepository</p>
        </div>

        {/* Card 6: Offers */}
        <div 
          onClick={() => onNavigate("offers")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                <Award className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-md">
                OFFERS
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
              Offers
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{offersTotal}</h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">From OfferRepository</p>
        </div>
      </div>

      {/* Operational KPI Grid */}
      <div className="mt-8 pt-2 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-slate-900 dark:text-white font-bold text-sm mb-4 font-display uppercase tracking-wider text-left flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <span>Operational Insights Today</span>
        </h4>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${density === "compact" ? "gap-4" : "gap-6"}`}>
          {/* Card 1: New Applications */}
          <div 
            onClick={() => onNavigate("candidates", { candidatesFilterStatus: "New Applications" })}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                  <Plus className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  NEW
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
                New Applications
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{newApplications}</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">Awaiting screening</p>
          </div>

          {/* Card 2: AI Shortlisted Candidates */}
          <div 
            onClick={() => onNavigate("candidates", { candidatesFilterStatus: "AI Shortlisted" })}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 group-hover/card:bg-indigo-100 dark:group-hover/card:bg-indigo-900/50 transition-colors">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-hover/card:text-indigo-700 dark:group-hover/card:text-indigo-300 transition-colors" />
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">
                  Avg Match: {aiMatchScore}%
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
                AI Shortlisted Candidates
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{aiShortlisted}</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">Score threshold &gt; {matchThreshold}%</p>
          </div>

          {/* Card 3: Interviews Today */}
          <div 
            onClick={() => onNavigate("interviews", { interviewsFilter: "today" })}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                  <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-md">
                  SCHEDULED
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
                Interviews Today
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{interviewsToday}</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">Scheduled for today</p>
          </div>

          {/* Card 4: Interview Completed */}
          <div 
            onClick={() => onNavigate("interviews", { interviewsFilter: "completed" })}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
                </div>
                <span className="text-[10px] font-mono font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-2.5 py-0.5 rounded-md">
                  Completed
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
                Interview Completed
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{interviewCompleted}</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">Total completed reviews</p>
          </div>

          {/* Card 5: Pending Offers */}
          <div 
            onClick={() => onNavigate("offers", { offersFilterStatus: "Pending" })}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover/card:bg-indigo-50 dark:group-hover/card:bg-indigo-950/50 transition-colors">
                  <Award className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" />
                </div>
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-md">
                  PENDING
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mt-4">
                Pending Offers
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-1">{pendingOffers}</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 group-hover/card:underline">Offers awaiting response</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${density === "compact" ? "gap-4" : "gap-6"}`}>
        {/* Application Volume Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-semibold text-slate-900 dark:text-white text-base">Application Inflow Trends</h4>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Applications received across active postings this week.</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
              WEEKLY ACTIVITY
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyApplicationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "12px" }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-semibold text-slate-900 dark:text-white text-base">Candidate Progression</h4>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Volume distribution across pipeline stages.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "12px" }}
                />
                <Bar dataKey="Applied" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Interviewed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hired" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Applications & To-Do Sticky Board Section */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 ${density === "compact" ? "gap-4" : "gap-6"}`}>
        {/* Left Side: Recent Applications Listing */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-semibold text-slate-900 dark:text-white text-base">Recent Applications</h4>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Latest submissions requiring review or AI grading.</p>
            </div>
            <button 
              onClick={() => onNavigate("candidates")} 
              className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold uppercase transition-all cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.isArray(recentApps) && recentApps.map((app, idx) => {
              const cand = app.candidate;
              const job = app.job;
              const score = app.aiEvaluation?.score;

              return (
                <div 
                  key={`${app.id || 'app'}-${idx}`} 
                  onClick={() => {
                    onNavigate("candidates");
                    onSelectApplication(app);
                  }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between first:pt-0 last:pb-0 gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800/20 -mx-6 px-6 rounded-xl transition-all cursor-pointer ${density === "compact" ? "py-2" : "py-4"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 group-hover:border-indigo-350 dark:group-hover:border-indigo-800 transition-colors">
                      <User className="h-5 w-5 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cand?.firstName} {cand?.lastName}
                      </h5>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{cand?.currentRole} at {cand?.currentCompany}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="text-slate-400 dark:text-slate-500 text-xs">Applying for</span>
                        <span className="text-slate-700 dark:text-slate-350 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{job?.title} {job?.id ? `(${formatJobId(job.id)})` : ""}</span>
                      </div>

                      {/* Candidate Employment Status and Experience */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Experience:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/50 px-1.5 py-0.5 rounded-md">
                          {cand?.experienceYears ? `${cand.experienceYears} Yrs` : "3 Yrs"}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-slate-400 font-medium">Status:</span>
                        <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                          {cand?.currentCompany && cand.currentCompany.toLowerCase() !== "none" && cand.currentCompany.toLowerCase() !== "freelance" ? "Employed" : "Open to Work"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Phase badge */}
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                      {app.status}
                    </span>

                    {/* AI Score pill */}
                    {score ? (
                      <div className={`flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-full ${getScoreColor(score)} shadow-2xs`}>
                        <Sparkles className="h-3 w-3" />
                        <span>{score}% Match</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 font-mono">
                        <span>No AI score</span>
                      </div>
                    )}

                    {/* Action button */}
                    <button 
                      onClick={() => {
                        onNavigate("candidates");
                        onSelectApplication(app);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      title="Open details"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Sticky Notes / To Do List */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all flex flex-col h-full min-h-[460px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-display font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 tracking-tight">
                <StickyNote className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>To Do List</span>
              </h4>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Capture quick hiring reminders and tasks.</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md shrink-0">
              {todos.filter(t => !t.completed).length} PENDING
            </span>
          </div>

          {/* Quick Input Form */}
          <form onSubmit={handleAddTodo} className="mb-4 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Write a quick sticky note..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all cursor-pointer flex items-center justify-center"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Note Color Pickers */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Note Theme:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { name: "amber", color: "bg-amber-400 ring-amber-300" },
                  { name: "blue", color: "bg-blue-400 ring-blue-300" },
                  { name: "purple", color: "bg-purple-400 ring-purple-300" },
                  { name: "green", color: "bg-emerald-400 ring-emerald-300" }
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setNewTodoColor(item.name)}
                    className={`h-4 w-4 rounded-full transition-all border border-white dark:border-slate-900 cursor-pointer ${item.color} ${
                      newTodoColor === item.name ? "ring-2 scale-110 shadow-xs" : "opacity-80 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </form>

          {/* Sticky Notes Container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[340px] scrollbar-thin">
            {todos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 my-auto">
                <StickyNote className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">No recruitment notes yet.</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Use the input above to pin critical hiring items.</p>
              </div>
            ) : (
              todos.map((todo) => {
                const isAmber = todo.color === "amber";
                const isBlue = todo.color === "blue";
                const isPurple = todo.color === "purple";
                const isGreen = todo.color === "green";

                let cardBg = "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/10 border-amber-250 dark:border-amber-900/40 text-amber-900 dark:text-amber-200";
                let checkboxBorder = "border-amber-400 text-amber-600";
                let checkedBg = "bg-amber-600";
                if (isBlue) {
                  cardBg = "bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/10 border-blue-250 dark:border-blue-900/40 text-blue-900 dark:text-blue-200";
                  checkboxBorder = "border-blue-400 text-blue-600";
                  checkedBg = "bg-blue-600";
                } else if (isPurple) {
                  cardBg = "bg-purple-50/70 hover:bg-purple-50 dark:bg-purple-950/10 border-purple-250 dark:border-purple-900/40 text-purple-900 dark:text-purple-200";
                  checkboxBorder = "border-purple-400 text-purple-600";
                  checkedBg = "bg-purple-600";
                } else if (isGreen) {
                  cardBg = "bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200";
                  checkboxBorder = "border-emerald-400 text-emerald-600";
                  checkedBg = "bg-emerald-600";
                }

                return (
                  <div
                    key={todo.id}
                    className={`p-3 rounded-xl border transition-all duration-200 flex items-start gap-2.5 group relative ${cardBg} ${
                      todo.completed ? "opacity-60 grayscale-[15%]" : ""
                    }`}
                  >
                    {/* Toggle button / Custom Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`h-4.5 w-4.5 rounded-md border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all cursor-pointer ${checkboxBorder} ${
                        todo.completed ? `${checkedBg} border-transparent` : "bg-white dark:bg-slate-900"
                      }`}
                    >
                      {todo.completed && <Check className="h-3 w-3 text-white stroke-[3.5]" />}
                    </button>

                    {/* Todo Text */}
                    <p
                      className={`text-xs font-medium leading-relaxed break-words flex-1 pr-6 ${
                        todo.completed ? "line-through text-slate-400 dark:text-slate-500" : ""
                      }`}
                    >
                      {todo.text}
                    </p>

                    {/* Delete trigger */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 hover:bg-white/80 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Job Posts Visual */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="font-display font-semibold text-slate-900 dark:text-white text-base">Recent Job Posts</h4>
            <p className="text-slate-400 dark:text-slate-500 text-xs">Latest corporate openings, talent demand, and workplace allocations.</p>
          </div>
          <button 
            onClick={() => onNavigate("jobs")} 
            className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <span>Manage Jobs</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Job Information</th>
                <th className="pb-3 font-semibold">Employment Status</th>
                <th className="pb-3 font-semibold">Work Place</th>
                <th className="pb-3 font-semibold">Vacancy</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Array.isArray(recentJobs) && recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <tr 
                    key={job.id} 
                    onClick={() => onNavigate("jobs")}
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    {/* Job Information */}
                    <td className="py-4">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block">
                          {job.title}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                          {job.department} &middot; <span className="font-mono text-slate-500 dark:text-slate-400">Job ID: {formatJobId(job.id)}</span>
                        </span>
                      </div>
                    </td>

                    {/* Employment Status */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 px-2 py-0.5 rounded-md">
                          {job.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          job.status === "active" || job.status === "published"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}>
                          {job.status?.toUpperCase() || "ACTIVE"}
                        </span>
                      </div>
                    </td>

                    {/* Work Place */}
                    <td className="py-4">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium font-mono">
                        {job.location}
                      </span>
                    </td>

                    {/* Vacancy */}
                    <td className="py-4">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-bold bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 px-2 py-1 rounded-lg">
                        {job.candidateCount > 0 ? `${job.candidateCount} Candidates` : "1 Open Position"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onNavigate("jobs")}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition-all cursor-pointer border border-transparent dark:border-indigo-900/40"
                      >
                        View Openings
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400 italic">No recent job posts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
