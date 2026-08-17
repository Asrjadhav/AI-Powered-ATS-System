/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { NotificationRepository } from "../repositories";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  UserPlus, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Check, 
  RefreshCw,
  UserCheck,
  Briefcase,
  FileText,
  ChevronRight,
  X
} from "lucide-react";
import axios from "axios";

import { NotificationItem } from "../types";

export interface NotificationSettingsState {
  interviewReminders: boolean;
  candidateUpdates: boolean;
  offerNotifications: boolean;
  aiAlerts: boolean;
  emailNotifications: boolean;
  desktopNotifications: boolean;
  weeklyReports: boolean;
}

// Initial mock data
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
/*
const OLD_NOTIFS = [
  {
    id: "notif-1",
    type: "ai_screening_completed",
    title: "AI Screening Completed",
    description: "Aura AI completed evaluating candidate Rahul Sharma for the Senior Java Developer posting.",
    timestamp: "10 mins ago",
    isRead: false,
    priority: "HIGH",
    candidateName: "Rahul Sharma",
    jobTitle: "Senior Java Developer",
    recruiterName: "David Kemp",
    matchScore: 92,
    actionLabel: "View AI Report"
  },
  {
    id: "notif-2",
    type: "interview_reminder",
    title: "Interview Reminder",
    description: "Technical architecture evaluation panel with candidate Priya Patel starts in 30 minutes.",
    timestamp: "30 mins ago",
    isRead: false,
    priority: "HIGH",
    candidateName: "Priya Patel",
    jobTitle: "Product Designer",
    recruiterName: "Elena Rostova",
    actionLabel: "Open Interview"
  },
  {
    id: "notif-3",
    type: "offer_accepted",
    title: "Offer Accepted",
    description: "Amit Sharma accepted the Software Engineer employment contract offer.",
    timestamp: "2 hours ago",
    isRead: false,
    priority: "HIGH",
    candidateName: "Amit Sharma",
    jobTitle: "Software Engineer",
    recruiterName: "David Kemp",
    actionLabel: "View Offer"
  },
  {
    id: "notif-4",
    type: "candidate_applied",
    title: "Candidate Applied",
    description: "Rahul Sharma submitted a formal application for Senior Java Developer.",
    timestamp: "4 hours ago",
    isRead: true,
    priority: "MEDIUM",
    candidateName: "Rahul Sharma",
    jobTitle: "Senior Java Developer",
    recruiterName: "David Kemp",
    actionLabel: "View Candidate"
  },
  {
    id: "notif-5",
    type: "new_referral",
    title: "New Employee Referral",
    description: "Marcus Vance referred candidate Priya Patel for the open Product Designer vacancy.",
    timestamp: "5 hours ago",
    isRead: false,
    priority: "MEDIUM",
    candidateName: "Priya Patel",
    jobTitle: "Product Designer",
    recruiterName: "Marcus Vance",
    actionLabel: "Review Referral"
  },
  {
    id: "notif-6",
    type: "resume_uploaded",
    title: "Resume Auto-Uploaded",
    description: "Parsed PDF document 'Resume_JaneSmith.pdf' added to Jane Smith's profile dossier.",
    timestamp: "1 day ago",
    isRead: true,
    priority: "LOW",
    candidateName: "Jane Smith",
    jobTitle: "Software Engineer",
    recruiterName: "Sophia Patel",
    actionLabel: "View Resume"
  },
  {
    id: "notif-7",
    type: "offer_rejected",
    title: "Offer Rejected",
    description: "Sarah Chen rejected the Senior Frontend Engineer position due to a competing remote offer.",
    timestamp: "1 day ago",
    isRead: false,
    priority: "HIGH",
    candidateName: "Sarah Chen",
    jobTitle: "Senior React Engineer",
    recruiterName: "Sophia Patel",
    actionLabel: "Review Details"
  },
  {
    id: "notif-8",
    type: "candidate_withdrawn",
    title: "Candidate Withdrawn",
    description: "Candidate John Doe withdrew their application for the Lead AI Developer position.",
    timestamp: "2 days ago",
    isRead: true,
    priority: "MEDIUM",
    candidateName: "John Doe",
    jobTitle: "Lead AI Developer",
    recruiterName: "Elena Rostova",
    actionLabel: "Acknowledge"
  },
  {
    id: "notif-9",
    type: "job_published",
    title: "New Job Posting Published",
    description: "Role 'Senior Product Manager' published live on Ashby, LinkedIn and company board.",
    timestamp: "2 days ago",
    isRead: true,
    priority: "LOW",
    jobTitle: "Senior Product Manager",
    recruiterName: "Sophia Patel",
    actionLabel: "View Job"
  },
  {
    id: "notif-10",
    type: "system",
    title: "AI Model Upgrade",
    description: "System completed optimization routines for Resume Matcher engine to build 3.5.2.",
    timestamp: "3 days ago",
    isRead: true,
    priority: "LOW",
    actionLabel: "View System Status"
  },
  {
    id: "notif-11",
    type: "ai_screening_completed",
    title: "AI Match Calibration",
    description: "Aura AI match rating for candidate Priya Patel processed. High match alignment at 88%.",
    timestamp: "4 days ago",
    isRead: true,
    priority: "MEDIUM",
    candidateName: "Priya Patel",
    jobTitle: "Product Designer",
    recruiterName: "Elena Rostova",
    matchScore: 88,
    actionLabel: "View AI Report"
  },
  {
    id: "notif-12",
    type: "system",
    title: "Weekly Summary Delivered",
    description: "Recruiter performance analytics and hiring speed metrics report emailed to administration.",
    timestamp: "5 days ago",
    isRead: true,
    priority: "LOW",
    actionLabel: "Dismiss"
  }
];
*/

interface NotificationsViewProps {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
}

export default function NotificationsView({ notifications, setNotifications }: NotificationsViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await NotificationRepository.getAll();
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        console.error("Failed to refresh notifications: Expected an array but received:", data);
      }
    } catch (err) {
      console.error("Failed to refresh notifications:", err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const toggleReadStatus = async (id: string) => {
    setNotifications(prev => prev.map(notif => {
      if (notif.id === id) {
        return { ...notif, isRead: !notif.isRead };
      }
      return notif;
    }));
    try {
      await NotificationRepository.markAsRead(id);
    } catch (err) {
      console.error("Failed to sync read status:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    try {
      await NotificationRepository.markAllAsRead();
    } catch (err) {
      console.error("Failed to sync mark all read:", err);
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
    try {
      await NotificationRepository.clearAll();
    } catch (err) {
      console.error("Failed to sync clear notifications:", err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    try {
      await NotificationRepository.delete(id);
    } catch (err) {
      console.error("Failed to delete notification on server:", err);
    }
  };

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "candidate_applied":
        return { icon: UserPlus, bg: "bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-400" };
      case "interview_reminder":
        return { icon: Calendar, bg: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-400 animate-pulse" };
      case "offer_accepted":
        return { icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-400" };
      case "offer_rejected":
        return { icon: XCircle, bg: "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-400" };
      case "candidate_withdrawn":
        return { icon: AlertTriangle, bg: "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400" };
      case "resume_uploaded":
        return { icon: FileText, bg: "bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-950/40 dark:border-sky-900/40 dark:text-sky-400" };
      case "ai_screening_completed":
        return { icon: Sparkles, bg: "bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-950/40 dark:border-violet-900/40 dark:text-violet-400" };
      case "job_published":
        return { icon: Briefcase, bg: "bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-950/40 dark:border-purple-900/40 dark:text-purple-400" };
      case "new_referral":
        return { icon: UserCheck, bg: "bg-teal-50 border-teal-100 text-teal-600 dark:bg-teal-950/40 dark:border-teal-900/40 dark:text-teal-400" };
      case "system":
      default:
        return { icon: Info, bg: "bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400" };
    }
  };

  const getPriorityBadgeClass = (priority: NotificationItem["priority"]) => {
    switch (priority) {
      case "HIGH":
        return "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-semibold";
      case "MEDIUM":
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold";
      case "LOW":
      default:
        return "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 font-medium";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto text-slate-800 dark:text-slate-100 transition-all">
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider text-left">
        <span>System</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Notifications</span>
      </div>

      {/* Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
        
        {/* Header - Simple & Professional */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-xl">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full font-mono animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Your recruitment stream updates.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh notifications"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={notifications.every(n => n.isRead)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="divide-y divide-slate-100 dark:divide-slate-850">
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 px-6 text-center"
              >
                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 border border-slate-100 dark:border-slate-700">
                  <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">All caught up!</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  You don't have any notifications right now. Any active updates will show up here.
                </p>
              </motion.div>
            ) : (
              notifications.map((notif) => {
                const { icon: Icon, bg: iconBg } = getNotificationIcon(notif.type);
                
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.12 }}
                    className={`p-4 transition-all flex items-start justify-between gap-3.5 relative overflow-hidden group ${
                      notif.isRead 
                        ? "opacity-65 hover:opacity-100" 
                        : "bg-indigo-50/15 dark:bg-indigo-950/5"
                    }`}
                  >
                    {/* Visual blue indicator of unread at left border */}
                    {!notif.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-md" />
                    )}

                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${iconBg} shadow-3xs`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 border uppercase font-mono tracking-wider ${getPriorityBadgeClass(notif.priority)}`}>
                            {notif.priority}
                          </span>
                          
                          <h4 className={`text-xs font-bold leading-tight truncate ${notif.isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
                            {notif.title}
                          </h4>

                          {notif.matchScore && (
                            <span className="text-[9.5px] font-bold font-mono bg-indigo-950 text-indigo-200 px-1.5 py-0.2 rounded-sm">
                              {notif.matchScore}% match
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-medium mt-0.5 font-sans">
                          {notif.description}
                        </p>

                        {/* Metadata line */}
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 font-semibold font-mono pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{notif.timestamp}</span>
                          </span>
                          
                          {notif.candidateName && (
                            <span>&middot; Candidate: <span className="text-slate-600 dark:text-slate-300 font-bold">{notif.candidateName}</span></span>
                          )}

                          {notif.jobTitle && (
                            <span>&middot; Role: <span className="text-slate-600 dark:text-slate-300 font-bold">{notif.jobTitle}</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Simple Action buttons on hover/select */}
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <button
                        onClick={() => toggleReadStatus(notif.id)}
                        className={`p-1 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                          notif.isRead 
                            ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600"
                            : "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:text-indigo-800"
                        }`}
                        title={notif.isRead ? "Mark Unread" : "Mark Read"}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="p-1 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer flex items-center justify-center"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {notifications.length > 0 && (
          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-850 flex justify-end">
            <button
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All Notifications</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
