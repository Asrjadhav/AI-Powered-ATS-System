/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { LocalStorageService } from "./services/localStorageService";
import { NotificationRepository, PreferenceRepository } from "./repositories";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./components/Sidebar";
import TopNavbar from "./components/TopNavbar";
import DashboardView from "./components/DashboardView";
import JobsView from "./components/JobsView";
import CandidatesView from "./components/CandidatesView";
import InterviewsView from "./components/InterviewsView";
import ReportsView from "./components/ReportsView";
import VisualInsightsView from "./components/VisualInsightsView";
import OffersView from "./components/OffersView";
import EmailTemplatesView from "./components/EmailTemplatesView";
import NotificationsView, { INITIAL_NOTIFICATIONS } from "./components/NotificationsView";
import { Application, NotificationItem } from "./types";
import { Bell, X, UserPlus, Calendar, CheckCircle2, XCircle, AlertTriangle, FileText, Sparkles, Briefcase, UserCheck, Info } from "lucide-react";
import axios from "axios";
import LoginView from "./components/LoginView";
import ProfileView from "./components/ProfileView";
import IntegrationsView from "./components/IntegrationsView";
import UsersRolesView from "./components/UsersRolesView";
import PublicApplyForm from "./components/PublicApplyForm";
import ForgotPasswordView from "./components/ForgotPasswordView";
import ResetPasswordView from "./components/ResetPasswordView";
import ChangePasswordView from "./components/ChangePasswordView";
import TalentPoolView from "./components/TalentPoolView";

function playAcousticChime() {
  const isEnabled = LocalStorageService.get<string>("setting_sound_alerts", "true") !== "false";
  if (!isEnabled) return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Tone 1: High frequency sweet tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    // Tone 2: rich harmony
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.12); // C6
      
      gain2.gain.setValueAtTime(0.06, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.4);
    }, 60);
  } catch (e) {
    console.warn("Audio Context chime failed:", e);
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Force existing sessions to log in again on page reload
    LocalStorageService.remove("talent_ai_token");
    LocalStorageService.remove("talent_ai_user");

    const token = sessionStorage.getItem("talent_ai_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return true;
    }
    return false;
  });
  const [user, setUser] = useState<any | null>(() => {
    const savedUser = sessionStorage.getItem("talent_ai_user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Dynamic Settings
  const [theme, setTheme] = useState(() => PreferenceRepository.getTheme());
  const [refreshRate, setRefreshRate] = useState(() => PreferenceRepository.getRefreshRate());

  const handleLoginSuccess = (token: string, userData: any) => {
    sessionStorage.setItem("talent_ai_token", token);
    sessionStorage.setItem("talent_ai_user", JSON.stringify(userData));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleProfileUpdate = (updatedUser: any) => {
    setUser(updatedUser);
    sessionStorage.setItem("talent_ai_user", JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    try {
      const storedToken = sessionStorage.getItem("talent_ai_token");
      if (storedToken) {
        await axios.post("/api/auth/logout", {}, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
      }
    } catch (err) {
      console.error("Logout API request failed:", err);
    } finally {
      sessionStorage.removeItem("talent_ai_token");
      sessionStorage.removeItem("talent_ai_user");
      delete axios.defaults.headers.common["Authorization"];
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSettingsChanged = () => {
      const currentTheme = LocalStorageService.get<string>("setting_dashboard_theme", "light");
      setTheme(currentTheme);
      setRefreshRate(LocalStorageService.get<string>("setting_refresh_rate", "realtime"));

      // Apply root HTML dark mode class
      const isDark = currentTheme === "dark" || 
        (currentTheme === "system" && mediaQuery.matches);
      
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    handleSettingsChanged();
    window.addEventListener("settings-changed", handleSettingsChanged);
    mediaQuery.addEventListener("change", handleSettingsChanged);
    return () => {
      window.removeEventListener("settings-changed", handleSettingsChanged);
      mediaQuery.removeEventListener("change", handleSettingsChanged);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Navigation filters passed from dashboard card clicks
  const [candidatesFilterStatus, setCandidatesFilterStatus] = useState<string>("all");
  const [candidatesFilterToday, setCandidatesFilterToday] = useState<boolean>(false);
  const [candidatesFilterJobId, setCandidatesFilterJobId] = useState<string>("all");
  const [candidatesSortBy, setCandidatesSortBy] = useState<"date" | "score">("date");
  const [interviewsFilter, setInterviewsFilter] = useState<"all" | "today" | "upcoming" | "completed" | "cancelled">("all");
  const [offersFilterStatus, setOffersFilterStatus] = useState<string>("all");

  const handleNavigateWithFilters = (tab: string, filters?: {
    candidatesFilterStatus?: string;
    candidatesFilterToday?: boolean;
    candidatesFilterJobId?: string;
    sortBy?: "date" | "score";
    interviewsFilter?: "all" | "today" | "upcoming" | "completed" | "cancelled";
    offersFilterStatus?: string;
  }) => {
    if (filters) {
      if (filters.candidatesFilterStatus !== undefined) {
        setCandidatesFilterStatus(filters.candidatesFilterStatus);
      }
      if (filters.candidatesFilterToday !== undefined) {
        setCandidatesFilterToday(filters.candidatesFilterToday);
      }
      if (filters.candidatesFilterJobId !== undefined) {
        setCandidatesFilterJobId(filters.candidatesFilterJobId);
      }
      if (filters.sortBy !== undefined) {
        setCandidatesSortBy(filters.sortBy);
      }
      if (filters.interviewsFilter !== undefined) {
        setInterviewsFilter(filters.interviewsFilter);
      }
      if (filters.offersFilterStatus !== undefined) {
        setOffersFilterStatus(filters.offersFilterStatus);
      }
    } else {
      // Clear filters on manual navigation from Sidebar
      setCandidatesFilterStatus("all");
      setCandidatesFilterToday(false);
      setCandidatesFilterJobId("all");
      setCandidatesSortBy("date");
      setInterviewsFilter("all");
      setOffersFilterStatus("all");
    }
    setActiveTab(tab);
  };
  
  // Auth view state
  const [authView, setAuthView] = useState<"login" | "forgot" | "reset" | "changePassword">("login");

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastNotif, setToastNotif] = useState<NotificationItem | null>(null);
  const lastNotifCountRef = useRef<number>(-1);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = async (isInitial = false) => {
    try {
      const fetchedNotifs = await NotificationRepository.getAll();
      
      if (!Array.isArray(fetchedNotifs)) {
        console.error("Failed to fetch notifications: Expected an array but received:", fetchedNotifs);
        return;
      }
      
      const typedNotifs = fetchedNotifs as NotificationItem[];
      setNotifications(typedNotifs);

      if (isInitial || lastNotifCountRef.current === -1) {
        knownNotifIdsRef.current = new Set(typedNotifs.map(n => n.id));
        lastNotifCountRef.current = typedNotifs.length;
        return;
      }

      // Check for any new unread notifications that we haven't seen in this session
      const newUnread = typedNotifs.find(n => !n.isRead && !knownNotifIdsRef.current.has(n.id));
      if (newUnread) {
        knownNotifIdsRef.current.add(newUnread.id);
        setToastNotif(newUnread);
        playAcousticChime();
        setTimeout(() => {
          setToastNotif(prev => prev?.id === newUnread.id ? null : prev);
        }, 6000);
      }

      // Sync all fetched IDs into known set
      typedNotifs.forEach(n => {
        knownNotifIdsRef.current.add(n.id);
      });
      lastNotifCountRef.current = typedNotifs.length;
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const triggerSimulatedNotification = async () => {
    try {
      await NotificationRepository.simulate();
      fetchNotifications(false);
    } catch (err) {
      console.error("Failed to simulate notification:", err);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    if (refreshRate === "manual") {
      return;
    }

    let pollInterval = 30000;
    if (refreshRate === "realtime") {
      pollInterval = 10000; // Conservative 10-second poll interval to avoid overloading or 429 errors
    } else if (refreshRate === "30s") {
      pollInterval = 30000;
    } else if (refreshRate === "5m") {
      pollInterval = 300000;
    }

    const timer = setInterval(() => {
      fetchNotifications(false);
    }, pollInterval);

    return () => clearInterval(timer);
  }, [refreshRate]);

  useEffect(() => {
    const handleSync = () => {
      fetchNotifications(false);
    };
    const handleTriggerToast = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      if (customEvent.detail) {
        setToastNotif(customEvent.detail);
        playAcousticChime();
        // Clear toast after 6 seconds
        const toastId = customEvent.detail.id;
        setTimeout(() => {
          setToastNotif(prev => prev?.id === toastId ? null : prev);
        }, 6000);
      }
    };
    window.addEventListener("trigger-notification-sync", handleSync);
    window.addEventListener("trigger-toast-notification", handleTriggerToast);
    return () => {
      window.removeEventListener("trigger-notification-sync", handleSync);
      window.removeEventListener("trigger-toast-notification", handleTriggerToast);
    };
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardView onNavigate={handleNavigateWithFilters} onSelectApplication={setSelectedApplication} />;
      case "jobs": return <JobsView onNavigate={handleNavigateWithFilters} />;
      case "candidates": return (
        <CandidatesView 
          initialSelectedApp={selectedApplication} 
          clearInitialSelection={() => setSelectedApplication(null)}
          initialFilterStatus={candidatesFilterStatus}
          clearInitialFilterStatus={() => setCandidatesFilterStatus("all")}
          initialFilterToday={candidatesFilterToday}
          clearInitialFilterToday={() => setCandidatesFilterToday(false)}
          initialFilterJobId={candidatesFilterJobId}
          clearInitialFilterJobId={() => setCandidatesFilterJobId("all")}
          initialSortBy={candidatesSortBy}
          clearInitialSortBy={() => setCandidatesSortBy("date")}
        />
      );
      case "interviews": return (
        <InterviewsView 
          initialFilter={interviewsFilter}
          clearInitialFilter={() => setInterviewsFilter("all")}
        />
      );
      case "offers": return (
        <OffersView 
          initialStatusFilter={offersFilterStatus}
          clearInitialStatusFilter={() => setOffersFilterStatus("all")}
        />
      );
      case "email_templates": return <EmailTemplatesView />;
      case "reports": return <ReportsView />;
      case "insights": return <VisualInsightsView />;
      case "notifications": return <NotificationsView notifications={notifications} setNotifications={setNotifications} />;
      case "talent_pool": return <TalentPoolView />;
      case "profile": return <ProfileView currentUser={user} onProfileUpdate={handleProfileUpdate} />;
      case "integrations": return <IntegrationsView currentUser={user} />;
      case "users_roles": return <UsersRolesView currentUser={user} />;
      default: return null;
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const applyJobId = urlParams.get("applyJobId");
  const applyGeneral = urlParams.get("apply");
  if (applyJobId || applyGeneral) {
    return (
      <PublicApplyForm 
        jobId={applyJobId || ""} 
        onClose={() => {
          window.history.pushState({}, "", window.location.pathname);
          window.location.reload();
        }} 
      />
    );
  }

  if (!isAuthenticated) {
    switch (authView) {
      case "forgot": return <ForgotPasswordView onBack={() => setAuthView("login")} />;
      case "reset": return <ResetPasswordView onSuccess={() => setAuthView("login")} />;
      default: return <LoginView onLoginSuccess={(token, userData) => {
            handleLoginSuccess(token, userData);
            if (userData.isFirstLogin) setAuthView("changePassword");
        }} onForgotPassword={() => setAuthView("forgot")} />;
    }
  }

  if (user?.isFirstLogin) {
      return <ChangePasswordView onSuccess={() => {
          handleProfileUpdate({...user, isFirstLogin: false});
          setAuthView("login");
      }} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-100 antialiased">
      <Sidebar activeTab={activeTab} setActiveTab={handleNavigateWithFilters} notifications={notifications} onSimulateNotification={triggerSimulatedNotification} currentUser={user} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopNavbar activeTab={activeTab} setActiveTab={handleNavigateWithFilters} notifications={notifications} currentUser={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto h-full min-w-0">
          <AnimatePresence mode="wait">
            {renderActiveView()}
          </AnimatePresence>
        </main>
      </div>
      {toastNotif && (() => {
        const getIconAndColors = (type: NotificationItem["type"]) => {
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

        const { icon: Icon, bg: iconBg } = getIconAndColors(toastNotif.type);

        return (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex gap-3 overflow-hidden cursor-pointer hover:shadow-3xl transition-shadow"
            onClick={() => { 
              setActiveTab("notifications"); 
              setToastNotif(null); 
            }}
          >
            {/* Left accent priority bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              toastNotif.priority === "HIGH" 
                ? "bg-rose-500" 
                : toastNotif.priority === "MEDIUM" 
                ? "bg-indigo-500" 
                : "bg-slate-400"
            }`} />

            {/* Icon Container */}
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${iconBg} shadow-sm`}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs tracking-tight line-clamp-1">{toastNotif.title}</h4>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  toastNotif.priority === "HIGH"
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                    : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                }`}>
                  {toastNotif.priority}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                {toastNotif.description}
              </p>
            </div>

            {/* Close Button */}
            <button 
              className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setToastNotif(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        );
      })()}
    </div>
  );
}
