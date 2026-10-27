/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EncureIT ATS Dashboard View — Redesigned for Lever-inspired Compact Density
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import { LocalStorageService } from "../services/localStorageService";
import {
  ApplicationRepository,
  InterviewRepository,
  StatsRepository
} from "../repositories";
import { 
  PageContainer,
  PageHeader,
  StatCard,
  StatusBadge,
  DataTable,
  ScoreBadge,
  Avatar
} from "./common/UIPrimitives";
import { 
  Briefcase, 
  Users, 
  Clock, 
  Sparkles, 
  TrendingUp,
  AlertCircle,
  Calendar,
  Award,
  Database,
  Activity,
  ChevronRight,
  UserCheck,
  Plus
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
  const [aiShortlisted, setAiShortlisted] = useState(0);
  const [interviewStageCount, setInterviewStageCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [hiredCount, setHiredCount] = useState(0);
  const [activeVacancies, setActiveVacancies] = useState(0);
  const [interviewsToday, setInterviewsToday] = useState(0);
  const [interviewCompleted, setInterviewCompleted] = useState(0);
  const [pendingOffers, setPendingOffers] = useState(0);
  const [talentPoolTotal, setTalentPoolTotal] = useState(0);

  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      // Counts come from /api/stats, already aggregated in the database.
      // Applications and interviews are still fetched because the panels below
      // list individual records, not just totals.
      const [stats, applicationsList, interviewsList] = await Promise.all([
        StatsRepository.getDashboardStats(),
        ApplicationRepository.getAll(),
        InterviewRepository.getAll()
      ]);

      setTotalCandidates(stats.activeCandidates);
      setInterviewsTotal(stats.totalInterviews);
      setOffersTotal(stats.totalOffers);
      setNewApplications(stats.newApplicationsCount);
      setAiShortlisted(stats.aiShortlistedCount);
      setInterviewStageCount(stats.interviewStageCount);
      setOfferCount(stats.offerCount);
      setHiredCount(stats.hiredCount);
      setActiveVacancies(stats.totalJobs);
      setTalentPoolTotal(stats.talentPoolCount);
      setInterviewsToday(stats.todayInterviews);
      setInterviewCompleted(stats.completedInterviews);
      setPendingOffers(stats.pendingOffers);
      setUpcomingInterviews(interviewsList.filter((interview: any) => {
        const status = String(interview.status || "").toLowerCase();
        return interview.date >= new Date().toISOString().split("T")[0] && !["cancelled", "canceled", "completed"].includes(status);
      }).slice(0, 5));

      setAllApplications(applicationsList || []);

      // Sort recent applications
      if (applicationsList && applicationsList.length > 0) {
        const getAppTime = (app: any) => {
          const dateStr = app.appliedAt || app.appliedDate || app.createdAt || app.candidate?.createdAt;
          if (dateStr) return new Date(dateStr).getTime();
          if (Array.isArray(app.timeline) && app.timeline.length > 0) {
            return new Date(app.timeline[0].timestamp).getTime();
          }
          return 0;
        };
        const sortedApps = [...applicationsList]
          .sort((a: any, b: any) => getAppTime(b) - getAppTime(a))
          .slice(0, 5);
        setRecentApps(sortedApps);
      } else {
        setRecentApps([]);
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
    const handleSync = () => loadDashboardStats();

    window.addEventListener("trigger-notification-sync", handleSync);
    window.addEventListener("applications-updated", handleSync);
    window.addEventListener("jobs-updated", handleSync);
    window.addEventListener("candidates-updated", handleSync);
    window.addEventListener("interviews-updated", handleSync);
    window.addEventListener("offers-updated", handleSync);
    window.addEventListener("talent-pool-updated", handleSync);

    return () => {
      window.removeEventListener("trigger-notification-sync", handleSync);
      window.removeEventListener("applications-updated", handleSync);
      window.removeEventListener("jobs-updated", handleSync);
      window.removeEventListener("candidates-updated", handleSync);
      window.removeEventListener("interviews-updated", handleSync);
      window.removeEventListener("offers-updated", handleSync);
      window.removeEventListener("talent-pool-updated", handleSync);
    };
  }, []);

  // Dynamic weekly applications chart data computed from allApplications
  const weeklyApplicationsData = React.useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts: Record<string, number> = { "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0 };
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

  // Dynamic pipeline funnel chart data
  const pipelineFunnelData = React.useMemo(() => {
    const total = totalCandidates;
    return [
      { stage: "Applications", count: total, color: "#1F3B75" },
      { stage: "Shortlisted", count: aiShortlisted, color: "#2E549B" },
      { stage: "Interviewing", count: interviewStageCount, color: "#557DBF" },
      { stage: "Offer", count: offerCount, color: "#f59e0b" },
      { stage: "Hired", count: hiredCount, color: "#10b981" }
    ];
  }, [totalCandidates, aiShortlisted, interviewStageCount, offerCount, hiredCount]);

  const upcomingInterviewsList = upcomingInterviews.map((interview: any) => ({
    id: interview.id,
    candidate: interview.candidateName || "Candidate",
    role: interview.jobTitle || "Role not specified",
    time: interview.time || "Time not specified",
    interviewer: interview.interviewer || "Interviewer not specified"
  }));

  if (loading) {
    return (
      <PageContainer className="animate-pulse p-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[108px] bg-slate-200 dark:bg-slate-800 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display font-semibold text-rose-900 text-lg">System Dashboard Error</h3>
          <p className="text-sm text-rose-700 mt-1">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const recentAppsColumns = [
    { header: "Candidate", render: (row: any) => {
        const name = row.candidate?.name || row.candidateName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || `Candidate`;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name} size="sm" />
            <span className="font-medium text-slate-900">{name}</span>
          </div>
        );
      }
    },
    { header: "Applied Role", render: (row: any) => <span className="text-slate-500">{row.jobTitle || row.job?.title || row.position || "Software Role"}</span> },
    { header: "Match Score", render: (row: any) => <ScoreBadge score={Number(row.aiScore ?? row.matchScore ?? row.candidate?.aiScore ?? 0)} /> },
    { header: "Status", render: (row: any) => <StatusBadge status={row.status || "New"} /> }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard"
        subtitle="Overview of your recruitment pipeline and hiring activity"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-xs font-medium text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Sync
          </div>
        }
      />

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Active Vacancies"
          value={activeVacancies}
          icon={Briefcase}
          subtitle="Open requisitions"
          onClick={() => onNavigate("jobs")}
        />
        <StatCard 
          title="Total Applications"
          value={allApplications.length}
          icon={Users}
          subtitle="Total applications"
          onClick={() => onNavigate("applications")}
        />
        <StatCard 
          title="Interviews"
          value={interviewsTotal}
          icon={Calendar}
          subtitle="Scheduled & completed"
          onClick={() => onNavigate("interviews")}
        />
        <StatCard 
          title="New Applications"
          value={newApplications}
          icon={Plus}
          subtitle="Today"
          onClick={() => onNavigate("applications")}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate("applications")}
          className="w-full text-left bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-[#1F3B75]/30 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">AI</span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">AI Shortlisted</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-semibold leading-none text-slate-900">{aiShortlisted}</span>
              <span className="text-[10px] font-medium text-slate-500">Pending Review</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("talent_pool")}
          className="w-full text-left bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-[#1F3B75]/30 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Database className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Pool</span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Talent Pool</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-semibold leading-none text-slate-900">{talentPoolTotal}</span>
              <span className="text-[10px] font-medium text-slate-500">Sourced</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("interviews")}
          className="w-full text-left bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-[#1F3B75]/30 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Today</span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Interviews Today</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-semibold leading-none text-slate-900">{interviewsToday}</span>
              <span className="text-[10px] font-medium text-slate-500">Scheduled</span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("offers")}
          className="w-full text-left bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-[#1F3B75]/30 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700">
              <Award className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Offers</span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Pending Offers</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-semibold leading-none text-slate-900">{pendingOffers}</span>
              <span className="text-[10px] font-medium text-slate-500">Awaiting</span>
            </div>
          </div>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Application Inflow</h3>
              <p className="text-xs text-slate-500">Weekly volume across active jobs</p>
            </div>
            <span className="text-xs font-medium text-[#1F3B75] bg-slate-50 px-2 py-1 rounded border border-slate-200">
              +{weeklyApplicationsData.reduce((a, c) => a + c.count, 0)} This Week
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyApplicationsData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="brandInflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F3B75" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1F3B75" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} itemStyle={{ color: '#0f172a', fontWeight: 500 }} />
                <Area type="monotone" dataKey="count" stroke="#1F3B75" strokeWidth={2} fill="url(#brandInflowGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col h-[320px]">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Candidate Pipeline</h3>
            <p className="text-xs text-slate-500">Current stage progression</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineFunnelData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  {pipelineFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-500">Latest candidates requiring review</p>
            </div>
            <button onClick={() => onNavigate("applications")} className="text-sm font-medium text-[#1F3B75] hover:text-[#152a55] flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <DataTable 
            columns={recentAppsColumns} 
            data={recentApps.slice(0, 5)} 
            onRowClick={(row: any) => onSelectApplication(row)} 
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Upcoming Interviews</h3>
            <p className="text-xs text-slate-500">Today's schedule</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden divide-y divide-slate-100">
            {upcomingInterviewsList.map((int) => (
              <div key={int.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-900 text-sm">{int.candidate}</span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{int.time}</span>
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-2 mt-2">
                  <Briefcase className="h-3.5 w-3.5" /> <span className="truncate">{int.role}</span>
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-2 mt-1">
                  <UserCheck className="h-3.5 w-3.5" /> <span>{int.interviewer}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
