/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { formatJobId } from "../repositories/repositoryUtils";
import { 
  FileText, 
  Search, 
  Filter, 
  Users, 
  Briefcase, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Sparkles, 
  ChevronDown, 
  Eye, 
  MoreHorizontal, 
  Download, 
  ExternalLink,
  Building,
  UserCheck
} from "lucide-react";
import { ApplicationRepository, ApplicationRecord } from "../repositories/applicationRepository";
import { CandidateRepository, JobRepository } from "../repositories/index";

interface ApplicationDisplayItem {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar: string;
  appliedJob: string;
  department: string;
  recruiter: string;
  appliedDate: string;
  atsScore: number;
  pipelineStage: "New" | "Screening" | "Shortlisted" | "Interviewing" | "Offered" | "Rejected" | "Hired" | string;
  interviewStatus: "Scheduled" | "Completed" | "None";
  offerStatus: "Pending" | "Accepted" | "None";
  source: string;
}

interface ApplicationsViewProps {
  initialJobId?: string;
  clearInitialJobId?: () => void;
}

export default function ApplicationsView({ initialJobId = "all", clearInitialJobId }: ApplicationsViewProps = {}) {
  const [applications, setApplications] = useState<ApplicationDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState(initialJobId);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [selectedRecruiterFilter, setSelectedRecruiterFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");

  const [selectedApplication, setSelectedApplication] = useState<ApplicationDisplayItem | null>(null);

  useEffect(() => {
    if (initialJobId && initialJobId !== "all") {
      setSelectedJobFilter(initialJobId);
      if (clearInitialJobId) clearInitialJobId();
    }
  }, [initialJobId]);

  useEffect(() => {
    async function loadData() {
      try {
        const [appRecords, candidates, jobs] = await Promise.all([
          ApplicationRepository.getAllApplications(),
          CandidateRepository.getAll().catch(() => []),
          JobRepository.getAll().catch(() => [])
        ]);

        const mapped: ApplicationDisplayItem[] = appRecords.map((rec) => {
          const cand = candidates.find((c: any) => 
            (rec.candidateId && (c.id === rec.candidateId || c.candidateId === rec.candidateId || `app-${c.id}` === rec.applicationId)) ||
            (rec.candidateEmail && c.email && c.email.toLowerCase() === rec.candidateEmail.toLowerCase())
          );
          const job = jobs.find((j: any) => 
            (rec.jobId && j.id === rec.jobId) || 
            (cand && cand.jobId && j.id === cand.jobId)
          );

          return {
            id: rec.applicationId,
            jobId: rec.jobId || (job ? job.id : "JOB-0001"),
            candidateName: cand ? (cand.name || `${cand.firstName || ""} ${cand.lastName || ""}`.trim() || "Candidate") : "Candidate",
            candidateEmail: cand ? (cand.email || "candidate@example.com") : "candidate@example.com",
            candidateAvatar: cand ? (cand.profileImage || cand.avatar || "") : "",
            appliedJob: job ? (job.title || "Software Engineer") : "Software Engineer",
            department: job ? (job.department || "Engineering") : "Engineering",
            recruiter: job ? (job.hiringManager || job.recruiter || "Hiring Team") : "Hiring Team",
            appliedDate: (rec.createdAt || rec.createdDate || "").split("T")[0] || "2026-08-01",
            atsScore: rec.atsScore ?? (cand ? (cand.aiScore || 85) : 75),
            pipelineStage: rec.status || (cand ? cand.status : "New") || "New",
            interviewStatus: rec.status === "Interviewing" ? "Scheduled" : "None",
            offerStatus: rec.status === "Offered" ? "Pending" : "None",
            source: rec.source || (cand ? cand.source : "Career Website") || "Career Website"
          };
        });

        setApplications(mapped);
      } catch (err) {
        console.error("Failed to load applications:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.appliedJob.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesJob = selectedJobFilter === "all" || app.appliedJob === selectedJobFilter || app.jobId === selectedJobFilter;
    const matchesDept = selectedDeptFilter === "all" || app.department === selectedDeptFilter;
    const matchesRecruiter = selectedRecruiterFilter === "all" || app.recruiter === selectedRecruiterFilter;
    const matchesStatus = selectedStatusFilter === "all" || app.pipelineStage.toLowerCase() === selectedStatusFilter.toLowerCase();
    const matchesSource = selectedSourceFilter === "all" || app.source === selectedSourceFilter;

    return matchesSearch && matchesJob && matchesDept && matchesRecruiter && matchesStatus && matchesSource;
  });

  const getStageBadgeColor = (stage: string) => {
    const s = (stage || "").toLowerCase();
    if (s.includes("new")) return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
    if (s.includes("screen")) return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    if (s.includes("shortlist")) return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800";
    if (s.includes("interview")) return "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800";
    if (s.includes("offer")) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    if (s.includes("hire")) return "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300 dark:border-green-700";
    if (s.includes("reject")) return "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">Applications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track every job application submitted into the recruitment pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors">
            <FileText className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Applications", count: "1,284", icon: FileText, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50" },
          { label: "New Applications", count: "142", icon: Clock, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" },
          { label: "Pending Screening", count: "88", icon: Filter, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50" },
          { label: "AI Shortlisted", count: "320", icon: Sparkles, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50" },
          { label: "Interviewing", count: "156", icon: Calendar, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50" },
          { label: "Offered", count: "45", icon: Award, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" },
          { label: "Rejected", count: "412", icon: XCircle, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50" },
          { label: "Hired", count: "121", icon: UserCheck, color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50" }
        ].map((kpi, idx) => {
          const IconComp = kpi.icon;
          return (
            <div key={`app-kpi-${kpi.label}-${idx}`} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.color}`}>
                  <IconComp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-display text-slate-900 dark:text-white">{kpi.count}</div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search applications by candidate name, ID, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Job Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Job</label>
            <select 
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Jobs</option>
              <option value="Senior AI Engineer">Senior AI Engineer</option>
              <option value="Lead Product Designer">Lead Product Designer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="DevOps Architect">DevOps Architect</option>
              <option value="Product Marketing Manager">Product Marketing Manager</option>
              <option value="Data Scientist">Data Scientist</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Department</label>
            <select 
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="DevOps">DevOps</option>
            </select>
          </div>

          {/* Recruiter Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Recruiter</label>
            <select 
              value={selectedRecruiterFilter}
              onChange={(e) => setSelectedRecruiterFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Recruiters</option>
              <option value="Sarah Jenkins">Sarah Jenkins</option>
              <option value="Alex Morgan">Alex Morgan</option>
              <option value="David Kim">David Kim</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Status</label>
            <select 
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Screening">Screening</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offered">Offered</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Source</label>
            <select 
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Sources</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Careers Page">Careers Page</option>
              <option value="Indeed">Indeed</option>
              <option value="Referral">Referral</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Date</label>
            <select 
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Application Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Applied Job</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Applied Date</th>
                <th className="py-3.5 px-4">ATS Score</th>
                <th className="py-3.5 px-4">Pipeline Stage</th>
                <th className="py-3.5 px-4">Interview Status</th>
                <th className="py-3.5 px-4">Offer Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No applications found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app, idx) => (
                  <tr key={`${app.id || 'app'}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {app.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={app.candidateAvatar} 
                          alt={app.candidateName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{app.candidateName}</div>
                          <div className="text-[11px] text-slate-400">{app.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{app.appliedJob}</div>
                      {app.jobId && (
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Job ID: {formatJobId(app.jobId)}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {app.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {app.appliedDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold font-mono ${
                          app.atsScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                          app.atsScore >= 80 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {app.atsScore}%
                        </span>
                        <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              app.atsScore >= 90 ? 'bg-emerald-500' :
                              app.atsScore >= 80 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${app.atsScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStageBadgeColor(app.pipelineStage)}`}>
                        {app.pipelineStage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {app.interviewStatus === "Scheduled" ? (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                          <Calendar className="w-3.5 h-3.5" /> Scheduled
                        </span>
                      ) : app.interviewStatus === "Completed" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {app.offerStatus === "Pending" ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      ) : app.offerStatus === "Accepted" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Award className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => setSelectedApplication(app)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                        title="View Application Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination Info */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredApplications.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{applications.length}</span> applications</div>
          <div className="flex items-center gap-2">
            <button disabled className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">Previous</button>
            <button disabled className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>

      {/* Application Detail Modal (Placeholder) */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img src={selectedApplication.candidateAvatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/20" />
                <div>
                  <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">{selectedApplication.candidateName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedApplication.id} • {selectedApplication.candidateEmail}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedApplication(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Applied Position</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">{selectedApplication.appliedJob}</span>
                  {selectedApplication.jobId && (
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 font-medium block mt-0.5">Job ID: {formatJobId(selectedApplication.jobId)}</span>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Department</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedApplication.department}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Recruiter</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedApplication.recruiter}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Source</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedApplication.source}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">ATS Match Score</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedApplication.atsScore}% Optimal Fit</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Pipeline Stage</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStageBadgeColor(selectedApplication.pipelineStage)}`}>
                  {selectedApplication.pipelineStage}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setSelectedApplication(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  alert(`Placeholder action: managing application ${selectedApplication.id}`);
                  setSelectedApplication(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm transition-colors"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
