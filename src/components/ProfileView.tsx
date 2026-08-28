/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { LocalStorageService } from "../services/localStorageService";
import { 
  User, 
  Mail, 
  Shield, 
  Phone, 
  Clock, 
  FileText, 
  Camera, 
  Upload, 
  Trash2, 
  Key, 
  Save, 
  Check, 
  Loader2, 
  Globe,
  Settings,
  Volume2,
  Sparkles,
  Sliders,
  Languages,
  RefreshCw,
  Monitor,
  Briefcase,
  Building,
  Calendar,
  Bell,
  Palette,
  Info,
  Laptop,
  Smartphone,
  LogOut,
  ChevronRight,
  LayoutGrid,
  Lock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  ExternalLink,
  Link,
  AlertCircle
} from "lucide-react";
import axios from "axios";

interface ProfileViewProps {
  currentUser: { 
    email: string; 
    name: string; 
    role: string; 
    profileImage?: string; 
    phone?: string; 
    bio?: string; 
    timezone?: string; 
  } | null;
  onProfileUpdate: (updatedUser: { 
    email: string; 
    name: string; 
    role: string; 
    profileImage?: string; 
    phone?: string; 
    bio?: string; 
    timezone?: string; 
  }) => void;
}

// Creative built-in avatar presets for users
const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=60", // Professional female HR
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=60", // Executive male
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=60", // Female researcher
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60", // Tech candidate
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60", // Casual male tech
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60", // Creative designer
];

const SETTINGS_NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User, desc: "Manage your personal information and account details." },
  { id: "workspace", label: "Workspace", icon: LayoutGrid, desc: "Manage workspace-level ATS preferences and integrations." },
  { id: "security", label: "Security", icon: Lock, desc: "Manage your account security and authentication." },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Control which ATS notifications you receive." },
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Customize how the ATS looks." },
  { id: "about", label: "About", icon: Info, desc: "Concise ATS platform information and legal policies." },
];

export default function ProfileView({ currentUser, onProfileUpdate }: ProfileViewProps) {
  // Navigation State (Vertical Left Nav)
  const [activeSubTab, setActiveSubTab] = useState<string>("profile");

  // General Profile States
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [role, setRole] = useState(currentUser?.role || "HR Recruiter");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [timezone, setTimezone] = useState(currentUser?.timezone || "Asia/Kolkata");
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || "");
  const [isEditingHrEmail, setIsEditingHrEmail] = useState(false);
  
  // Security Change Password Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // File Upload & Preset Avatar States
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Indicators & Toast
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Google Calendar Connection State
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalEmail, setGcalEmail] = useState("");
  const [connectingGcal, setConnectingGcal] = useState(false);

  // Workspace Preference States (Persisted in localStorage)
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_sound_alerts", "true") !== "false";
  });
  const [dailyDigest, setDailyDigest] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_daily_digest", "false") === "true";
  });
  const [highFitHighlight, setHighFitHighlight] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_high_fit_highlight", "true") !== "false";
  });
  const [dashboardTheme, setDashboardTheme] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_dashboard_theme", "light");
  });
  const [layoutDensity, setLayoutDensity] = useState<"comfortable" | "compact">(() => {
    return (LocalStorageService.get<string>("setting_layout_density", "comfortable") as "comfortable" | "compact") || "comfortable";
  });
  const [matchThreshold, setMatchThreshold] = useState<number>(() => {
    return Number(LocalStorageService.get<string>("setting_match_threshold", "80"));
  });
  const [refreshRate, setRefreshRate] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_refresh_rate", "realtime");
  });
  const [preferredLanguage, setPreferredLanguage] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_preferred_language", "en");
  });
  const [autoSaveInterval, setAutoSaveInterval] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_autosave_interval", "30s");
  });
  const [defaultLandingPage, setDefaultLandingPage] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_default_landing_page", "dashboard");
  });
  const [dateFormat, setDateFormat] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_date_format", "DD/MM/YYYY");
  });
  const [timeFormat, setTimeFormat] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_time_format", "12 Hour");
  });
  const [defaultInterviewDuration, setDefaultInterviewDuration] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_default_interview_duration", "45 Minutes");
  });
  const [autoGenerateMeetLink, setAutoGenerateMeetLink] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_auto_generate_meet_link", "true") !== "false";
  });
  const [autoShortlistEmail, setAutoShortlistEmail] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_auto_shortlist_email", "true") !== "false";
  });

  // Notifications Tab States
  const [emailNotifications, setEmailNotifications] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_email_notifications", "true") !== "false";
  });
  const [pushNotifications, setPushNotifications] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_push_notifications", "true") !== "false";
  });
  const [candidateAlerts, setCandidateAlerts] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_candidate_alerts", "true") !== "false";
  });
  const [interviewReminders, setInterviewReminders] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_interview_reminders", "true") !== "false";
  });
  const [interviewChanges, setInterviewChanges] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_interview_changes", "true") !== "false";
  });
  const [systemNotifications, setSystemNotifications] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_system_notifications", "true") !== "false";
  });

  // Appearance Tab States
  const [sidebarSetting, setSidebarSetting] = useState<"expanded" | "collapsed">((): "expanded" | "collapsed" => {
    return (LocalStorageService.get<string>("setting_sidebar", "expanded") as "expanded" | "collapsed") || "expanded";
  });
  const [enableAnimations, setEnableAnimations] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_enable_animations", "true") !== "false";
  });

  // Security 2FA State & Active Sessions
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_2fa", "false") === "true";
  });
  const [activeSessions] = useState([
    { id: 1, device: "Windows 11", browser: "Chrome", location: "Pune, India", status: "Active Now" },
    { id: 2, device: "MacBook Pro", browser: "Chrome", location: "Mumbai, India", status: "Yesterday" }
  ]);

  const toggleTwoFactor = () => {
    setTwoFactorEnabled(prev => !prev);
  };

  // Check Google Calendar connection status on mount
  useEffect(() => {
    axios.get("/api/auth/google/status")
      .then(res => {
        if (res.data?.connected) {
          setGcalConnected(true);
          setGcalEmail(res.data.email || "");
        }
      })
      .catch(err => console.warn("Google calendar status check:", err));
  }, []);

  // Toast Notification Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const updateSettingState = (value: any, setter: (val: any) => void) => {
    setter(value);
  };

  // Image Upload handler
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB Limit
      setErrorMsg("Image size should be less than 2MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setProfileImage(e.target.result);
        triggerToast("Profile photo selected. Remember to Save Changes.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Google Calendar Integration Handlers
  const handleConnectGcal = async () => {
    try {
      setConnectingGcal(true);
      setErrorMsg(null);
      const { googleSignIn } = await import("../lib/firebaseAuth");
      const res = await googleSignIn();
      setGcalConnected(true);
      setGcalEmail(res.email || res.user?.email || "");
      triggerToast("✓ Google Calendar connected successfully!");
    } catch (err: any) {
      console.error("Google Calendar connection error:", err);
      const msg = err?.message || "Failed to connect Google Calendar. Please check popup permissions.";
      setErrorMsg(`⚠️ Google Calendar: ${msg}`);
      triggerToast(`⚠️ ${msg}`);
    } finally {
      setConnectingGcal(false);
    }
  };

  const handleDisconnectGcal = async () => {
    try {
      await axios.post("/api/auth/google/disconnect");
      setGcalConnected(false);
      setGcalEmail("");
      triggerToast("Disconnected Google Calendar.");
    } catch (err) {
      console.error("Google Calendar disconnect error:", err);
    }
  };

  // Save All Settings handler (triggers Save toast)
  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    // Validate passwords if user is on security tab and trying to change password
    if (activeSubTab === "security" && (newPassword || confirmPassword)) {
      if (!currentPassword) {
        setErrorMsg("Your current password is required to set a new password.");
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("New passwords do not match.");
        setSaving(false);
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg("New password must be at least 6 characters long.");
        setSaving(false);
        return;
      }
    }

    try {
      // Save Profile & Security info via API if relevant
      if (activeSubTab === "profile" || activeSubTab === "security") {
        const payload: any = {
          name,
          email,
          role,
          profileImage,
          phone,
          bio,
          timezone,
          originalEmail: currentUser?.email,
        };

        if (newPassword) {
          payload.currentPassword = currentPassword;
          payload.newPassword = newPassword;
        }

        const res = await axios.post("/api/auth/update-profile", payload);
        if (res.data.success) {
          onProfileUpdate(res.data.user);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      }

      // Sync and Persist all configurations in localStorage
      LocalStorageService.set("setting_sound_alerts", String(soundAlerts));
      LocalStorageService.set("setting_daily_digest", String(dailyDigest));
      LocalStorageService.set("setting_high_fit_highlight", String(highFitHighlight));
      LocalStorageService.set("setting_dashboard_theme", dashboardTheme);
      LocalStorageService.set("setting_layout_density", layoutDensity);
      LocalStorageService.set("setting_match_threshold", String(matchThreshold));
      LocalStorageService.set("setting_refresh_rate", refreshRate);
      LocalStorageService.set("setting_preferred_language", preferredLanguage);
      LocalStorageService.set("setting_autosave_interval", autoSaveInterval);
      LocalStorageService.set("setting_default_landing_page", defaultLandingPage);
      LocalStorageService.set("setting_date_format", dateFormat);
      LocalStorageService.set("setting_time_format", timeFormat);
      LocalStorageService.set("setting_default_interview_duration", defaultInterviewDuration);
      LocalStorageService.set("setting_auto_generate_meet_link", String(autoGenerateMeetLink));
      LocalStorageService.set("setting_auto_shortlist_email", String(autoShortlistEmail));
      LocalStorageService.set("setting_email_notifications", String(emailNotifications));
      LocalStorageService.set("setting_push_notifications", String(pushNotifications));
      LocalStorageService.set("setting_candidate_alerts", String(candidateAlerts));
      LocalStorageService.set("setting_interview_reminders", String(interviewReminders));
      LocalStorageService.set("setting_interview_changes", String(interviewChanges));
      LocalStorageService.set("setting_system_notifications", String(systemNotifications));
      LocalStorageService.set("setting_sidebar", sidebarSetting);
      LocalStorageService.set("setting_enable_animations", String(enableAnimations));
      LocalStorageService.set("setting_2fa", String(twoFactorEnabled));

      // Trigger standard application theme/sidebar changed events
      window.dispatchEvent(new Event("settings-changed"));
      
      triggerToast("✓ Changes saved successfully.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || "Failed to update settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Cancel Handler: resets current local state values
  const handleCancelSettings = () => {
    setName(currentUser?.name || "");
    setRole(currentUser?.role || "HR Recruiter");
    setPhone(currentUser?.phone || "");
    setBio(currentUser?.bio || "");
    setTimezone(currentUser?.timezone || "Asia/Kolkata");
    setProfileImage(currentUser?.profileImage || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setSoundAlerts(LocalStorageService.get<string>("setting_sound_alerts", "true") !== "false");
    setDailyDigest(LocalStorageService.get<string>("setting_daily_digest", "false") === "true");
    setHighFitHighlight(LocalStorageService.get<string>("setting_high_fit_highlight", "true") !== "false");
    setDashboardTheme(LocalStorageService.get<string>("setting_dashboard_theme", "light"));
    setLayoutDensity((LocalStorageService.get<string>("setting_layout_density", "comfortable") as "comfortable" | "compact") || "comfortable");
    setMatchThreshold(Number(LocalStorageService.get<string>("setting_match_threshold", "80")));
    setRefreshRate(LocalStorageService.get<string>("setting_refresh_rate", "realtime"));
    setPreferredLanguage(LocalStorageService.get<string>("setting_preferred_language", "en"));
    setAutoSaveInterval(LocalStorageService.get<string>("setting_autosave_interval", "30s"));
    setDefaultLandingPage(LocalStorageService.get<string>("setting_default_landing_page", "dashboard"));
    setDateFormat(LocalStorageService.get<string>("setting_date_format", "DD/MM/YYYY"));
    setTimeFormat(LocalStorageService.get<string>("setting_time_format", "12 Hour"));
    setDefaultInterviewDuration(LocalStorageService.get<string>("setting_default_interview_duration", "45 Minutes"));

    setEmailNotifications(LocalStorageService.get<string>("setting_email_notifications", "true") !== "false");
    setPushNotifications(LocalStorageService.get<string>("setting_push_notifications", "true") !== "false");
    setCandidateAlerts(LocalStorageService.get<string>("setting_candidate_alerts", "true") !== "false");
    setInterviewReminders(LocalStorageService.get<string>("setting_interview_reminders", "true") !== "false");

    setSidebarSetting((LocalStorageService.get<string>("setting_sidebar", "expanded") as "expanded" | "collapsed") || "expanded");
    setEnableAnimations(LocalStorageService.get<string>("setting_enable_animations", "true") !== "false");

    setTwoFactorEnabled(LocalStorageService.get<string>("setting_2fa", "false") === "true");

    setErrorMsg(null);
    triggerToast("Changes discarded successfully.");
  };

  const currentNav = SETTINGS_NAV_ITEMS.find(i => i.id === activeSubTab) || SETTINGS_NAV_ITEMS[0];

  return (
    <div className={`${layoutDensity === "compact" ? "max-w-7xl mx-auto px-4 py-4 sm:py-6" : "max-w-7xl mx-auto px-4 py-6 sm:py-10"} text-slate-800 dark:text-slate-100 transition-all`}>
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider text-left">
        <span>Administration</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Settings</span>
      </div>

      {/* Main Settings Grid: Vertical Navigation (Left) + Content Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT VERTICAL NAVIGATION PANEL */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs lg:sticky top-20 text-left space-y-5">
          {/* Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-1">
            <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Settings className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Settings</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Manage your account, workspace and ATS preferences.
            </p>
          </div>

          {/* Vertical Stack Navigation List */}
          <nav className="space-y-1.5">
            {SETTINGS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSubTab(item.id);
                    setErrorMsg(null);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-l-3 border-indigo-600 dark:border-indigo-400 shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Role Status Summary */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Role</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{role}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SETTINGS CONTENT PANEL */}
        <div className="lg:col-span-9 space-y-6 text-left">

          {/* Top Section Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {React.createElement(currentNav.icon, { className: "h-5 w-5 text-indigo-600 dark:text-indigo-400" })}
                <span>{currentNav.label}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {currentNav.desc}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-semibold animate-in fade-in duration-200">
              {errorMsg}
            </div>
          )}

          {/* SECTION 1: PROFILE */}
          {activeSubTab === "profile" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Personal Information Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Personal Information</span>
                </h4>

                {/* Profile Photo (Compact Layout) */}
                <div className="flex items-center gap-5 p-4 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                  <div className="relative w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-sm overflow-hidden shrink-0">
                    {profileImage ? (
                      <img src={profileImage} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Photo</span>
                      </button>

                      {profileImage && (
                        <button
                          type="button"
                          onClick={() => setProfileImage("")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-lg transition-all cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">PNG, JPG or WEBP up to 2MB.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </div>
                </div>

                {/* Form Fields: Two-Column Compact Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Aditi Jadhav"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="aditijadhav2828@gmail.com"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Contact Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30) - India</option>
                      <option value="America/New_York">Eastern Time (EST, GMT-5)</option>
                      <option value="America/Los_Angeles">Pacific Time (PST, GMT-8)</option>
                      <option value="Europe/London">London (GMT+0)</option>
                      <option value="Asia/Singapore">Singapore (GMT+8)</option>
                    </select>
                  </div>

                  {/* Professional Bio */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Professional Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Brief details about your recruiting background..."
                    />
                  </div>
                </div>
              </div>

              {/* Primary HR Email Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Primary HR Email</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingHrEmail(!isEditingHrEmail)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isEditingHrEmail ? "Done Editing" : "Edit Email"}
                  </button>
                </div>

                <div className="space-y-2">
                  {isEditingHrEmail ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full sm:w-80 px-3 py-2 text-xs font-semibold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                        {email || "aditijadhav2828@gmail.com"}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Verified Primary</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Used as the sender for candidate emails, interview notifications and invitations.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* SECTION 2: WORKSPACE */}
          {activeSubTab === "workspace" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Workspace Preferences */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Workspace Preferences</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Company / Workspace Name</label>
                    <input
                      type="text"
                      defaultValue="EncureIT Systems Pvt Ltd"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Default Interview Duration</label>
                    <select
                      value={defaultInterviewDuration}
                      onChange={(e) => updateSettingState(e.target.value, setDefaultInterviewDuration)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="30 Minutes">30 Minutes</option>
                      <option value="45 Minutes">45 Minutes</option>
                      <option value="60 Minutes">60 Minutes</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Default Landing Page</label>
                    <select
                      value={defaultLandingPage}
                      onChange={(e) => updateSettingState(e.target.value, setDefaultLandingPage)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="candidates">Candidates Table</option>
                      <option value="jobs">Job Openings</option>
                      <option value="interviews">Interviews Schedule</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => updateSettingState(e.target.value, setDateFormat)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Integrations: Google Calendar Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Integrations</span>
                </h4>

                <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-3">
                      <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">Google Calendar</h5>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        gcalConnected 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" 
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {gcalConnected ? "Connected" : "Not Connected"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Sync interviews, check interviewer availability and automatically generate Google Meet links.
                    </p>

                    {gcalConnected && gcalEmail && (
                      <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        Connected Account: {gcalEmail}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {gcalConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => triggerToast("Google Calendar integration is active and managed.")}
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectGcal}
                          className="px-3.5 py-2 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectGcal}
                        disabled={connectingGcal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        {connectingGcal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                        <span>Connect Google Calendar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* SECTION 3: SECURITY */}
          {activeSubTab === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Authentication & Password */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Account Security</span>
                </h4>

                {/* Google Account Row */}
                <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Google OAuth Authentication</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Logged in via {currentUser?.email || "aditijadhav2828@gmail.com"}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Verified</span>
                </div>

                {/* Change Password Form */}
                <div className="space-y-4 pt-2">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Update Password</h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                {/* 2FA Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Require a security verification code upon signing into your ATS account.</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTwoFactor}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      twoFactorEnabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      twoFactorEnabled ? "translate-x-4.5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Active Login Sessions</span>
                </h4>

                <div className="space-y-2">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Laptop className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{session.device} · {session.browser}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{session.location}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {session.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* SECTION 4: NOTIFICATIONS */}
          {activeSubTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Notification Preferences</span>
                </h4>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Candidate Updates */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Candidate updates</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Receive real-time alerts when candidates submit applications or update CV profiles.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettingState(!candidateAlerts, setCandidateAlerts)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        candidateAlerts ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        candidateAlerts ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Interview Reminders */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Interview reminders</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Get automated calendar reminders 15 minutes prior to scheduled interview rounds.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettingState(!interviewReminders, setInterviewReminders)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        interviewReminders ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        interviewReminders ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Interview Changes */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Interview changes</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Notify when an interview date, time, or interviewer round is rescheduled or cancelled.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettingState(!interviewChanges, setInterviewChanges)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        interviewChanges ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        interviewChanges ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Application Alerts */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Application alerts</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Alerts for new application inflows matching high-fit match score thresholds.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettingState(!highFitHighlight, setHighFitHighlight)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        highFitHighlight ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        highFitHighlight ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Email Notifications */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Email notifications</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Send email summaries for new applications and daily digest reports.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettingState(!emailNotifications, setEmailNotifications)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        emailNotifications ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        emailNotifications ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* System Notifications */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">System notifications</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Operational announcements, platform updates, and integration status logs.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSettingState(!systemNotifications, setSystemNotifications)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        systemNotifications ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        systemNotifications ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* SECTION 5: APPEARANCE */}
          {activeSubTab === "appearance" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Appearance Customization</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Theme Option */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Console Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["light", "dark", "system"].map((tOption) => (
                        <button
                          key={tOption}
                          type="button"
                          onClick={() => updateSettingState(tOption, setDashboardTheme)}
                          className={`px-3 py-2.5 border rounded-xl text-xs font-bold transition-all text-center capitalize cursor-pointer ${
                            dashboardTheme === tOption
                              ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-950"
                          }`}
                        >
                          {tOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workspace Density */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Workspace Density</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["comfortable", "compact"].map((dOption) => (
                        <button
                          key={dOption}
                          type="button"
                          onClick={() => updateSettingState(dOption, setLayoutDensity)}
                          className={`px-3 py-2.5 border rounded-xl text-xs font-bold transition-all text-center capitalize cursor-pointer ${
                            layoutDensity === dOption
                              ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-950"
                          }`}
                        >
                          {dOption}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* UI Animations Toggle */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Enable UI Transitions & Motion</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Control standard layout slide-in animations and smooth visual transitions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettingState(!enableAnimations, setEnableAnimations)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      enableAnimations ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      enableAnimations ? "translate-x-4.5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SECTION 6: ABOUT */}
          {activeSubTab === "about" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>About EncureIT Talent AI Console</span>
                </h4>

                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 rounded-xl space-y-2">
                    <h5 className="text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Enterprise Recruitment Console</span>
                    </h5>
                    <p className="text-[11.5px] text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
                      EncureIT AI ATS is a next-generation recruitment platform engineered for streamlined candidate screening, high-precision resume matching powered by state-of-the-art Gemini AI, and end-to-end recruiter workspace workflows.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Application Name</span>
                      <span className="font-bold text-slate-900 dark:text-white">EncureIT Talent AI Console</span>
                    </div>

                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Version</span>
                      <span className="font-bold text-slate-900 dark:text-white">v2.5.0 Enterprise</span>
                    </div>

                    <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Powered By</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Google Gemini AI</span>
                    </div>

                    <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Support Email</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">support@encureit.com</span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <a href="https://encureit.com" target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                      <span>Documentation & Guide</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a href="https://encureit.com" target="_blank" rel="noreferrer" className="hover:underline">Privacy Policy</a>
                    <a href="https://encureit.com" target="_blank" rel="noreferrer" className="hover:underline">Terms of Service</a>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STICKY / BOTTOM SAVE ACTIONS PANEL */}
          {activeSubTab !== "about" && (
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelSettings}
                className="px-5 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-98"
              >
                Discard Changes
              </button>

              <button
                type="button"
                onClick={() => handleSaveAllSettings()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-98"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-slate-100 animate-in slide-in-from-bottom-5 duration-300">
          <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-extrabold text-xs">
            ✓
          </div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
