/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
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
  ChevronRight
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

export default function ProfileView({ currentUser, onProfileUpdate }: ProfileViewProps) {
  // General Profile States
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [role, setRole] = useState(currentUser?.role || "HR Recruiter");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [timezone, setTimezone] = useState(currentUser?.timezone || "Asia/Kolkata");
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || "");
  
  // Security Change Password Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // File Upload & Preset Avatar States
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Indicators
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Sub-Tab Navigation System
  const [activeSubTab, setActiveSubTab] = useState<string>("profile");

  // Application Settings States (Persisted in localStorage)
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

  // New Workspace Preference States
  const [defaultLandingPage, setDefaultLandingPage] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_default_landing_page", "dashboard");
  });
  const [dateFormat, setDateFormat] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_date_format", "DD/MM/YYYY");
  });
  const [timeFormat, setTimeFormat] = useState<string>(() => {
    return LocalStorageService.get<string>("setting_time_format", "12 Hour");
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

  // Appearance Tab States
  const [sidebarSetting, setSidebarSetting] = useState<"expanded" | "collapsed">(() => {
    return (LocalStorageService.get<string>("setting_sidebar", "expanded") as "expanded" | "collapsed") || "expanded";
  });
  const [enableAnimations, setEnableAnimations] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_enable_animations", "true") !== "false";
  });

  // Security 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => {
    return LocalStorageService.get<string>("setting_2fa", "false") === "true";
  });

  // Active Sessions State
  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: "Windows 11", browser: "Chrome", location: "Pune", status: "Active Now" },
    { id: 2, device: "MacBook", browser: "Chrome", location: "Mumbai", status: "Yesterday" }
  ]);

  // Toast Notification Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const toggleSoundAlerts = () => {
    const nextVal = !soundAlerts;
    setSoundAlerts(nextVal);
  };

  const toggleDailyDigest = () => {
    const nextVal = !dailyDigest;
    setDailyDigest(nextVal);
  };

  const toggleHighFitHighlight = () => {
    const nextVal = !highFitHighlight;
    setHighFitHighlight(nextVal);
  };

  const toggleTwoFactor = () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
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
          // Clear passwords
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
      LocalStorageService.set("setting_email_notifications", String(emailNotifications));
      LocalStorageService.set("setting_push_notifications", String(pushNotifications));
      LocalStorageService.set("setting_candidate_alerts", String(candidateAlerts));
      LocalStorageService.set("setting_interview_reminders", String(interviewReminders));
      LocalStorageService.set("setting_sidebar", sidebarSetting);
      LocalStorageService.set("setting_enable_animations", String(enableAnimations));
      LocalStorageService.set("setting_2fa", String(twoFactorEnabled));

      // Trigger standard application theme/sidebar changed events
      window.dispatchEvent(new Event("settings-changed"));
      
      triggerToast("✓ Changes saved successfully.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || "Failed to update profile settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Cancel Handler: resets current local state values from backend & localStorage
  const handleCancelSettings = () => {
    // Reset Profile
    setName(currentUser?.name || "");
    setRole(currentUser?.role || "HR Recruiter");
    setPhone(currentUser?.phone || "");
    setBio(currentUser?.bio || "");
    setTimezone(currentUser?.timezone || "Asia/Kolkata");
    setProfileImage(currentUser?.profileImage || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    // Reset Preferences
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

    // Reset Notifications
    setEmailNotifications(LocalStorageService.get<string>("setting_email_notifications", "true") !== "false");
    setPushNotifications(LocalStorageService.get<string>("setting_push_notifications", "true") !== "false");
    setCandidateAlerts(LocalStorageService.get<string>("setting_candidate_alerts", "true") !== "false");
    setInterviewReminders(LocalStorageService.get<string>("setting_interview_reminders", "true") !== "false");

    // Reset Appearance
    setSidebarSetting((LocalStorageService.get<string>("setting_sidebar", "expanded") as "expanded" | "collapsed") || "expanded");
    setEnableAnimations(LocalStorageService.get<string>("setting_enable_animations", "true") !== "false");

    // Reset Security
    setTwoFactorEnabled(LocalStorageService.get<string>("setting_2fa", "false") === "true");

    setErrorMsg(null);
    triggerToast("Changes discarded successfully.");
  };

  return (
    <div className={`${layoutDensity === "compact" ? "max-w-6xl mx-auto px-4 py-4 sm:py-6" : "max-w-6xl mx-auto px-4 py-8 sm:py-12"} text-slate-800 dark:text-slate-100 transition-all`}>
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Administration</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">Settings</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-8">
        <div className="space-y-1 text-left">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-indigo-600 shrink-0" />
            <span>Settings</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Manage your profile, security, workspace preferences, notifications and personal application settings.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl text-sm font-semibold mb-6 animate-in fade-in duration-200 text-left">
          {errorMsg}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-8 gap-4">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("profile");
              setErrorMsg(null);
            }}
            id="subtab-profile-btn"
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "profile"
                ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("preferences");
              setErrorMsg(null);
            }}
            id="subtab-preferences-btn"
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "preferences"
                ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Workspace Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("security");
              setErrorMsg(null);
            }}
            id="subtab-security-btn"
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "security"
                ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            }`}
          >
            <Key className="h-4 w-4 shrink-0" />
            <span>Login & Security</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("notifications");
              setErrorMsg(null);
            }}
            id="subtab-notifications-btn"
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "notifications"
                ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            }`}
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("appearance");
              setErrorMsg(null);
            }}
            id="subtab-appearance-btn"
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "appearance"
                ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            }`}
          >
            <Palette className="h-4 w-4 shrink-0" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab("about");
              setErrorMsg(null);
            }}
            id="subtab-about-btn"
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "about"
                ? "bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            }`}
          >
            <Info className="h-4 w-4 shrink-0" />
            <span>About ATS</span>
          </button>
        </div>

        {/* Quick Workspace Status Info */}
        <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-50 dark:bg-slate-900/30 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Role:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{role}</span>
          </div>
          <div className="h-3 w-px bg-slate-250 dark:bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Timezone:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{timezone.split("/")[1] || timezone}</span>
          </div>
          <div className="h-3 w-px bg-slate-250 dark:bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Status:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Sync Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="w-full">
               {/* Sub-Tab 1: MY PROFILE */}
        {activeSubTab === "profile" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250">
            {/* Top Section: Profile Photo & Customization */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs text-left space-y-6 hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3.5 flex items-center gap-2">
                <Camera className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Profile Photo Customization</span>
              </h3>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Left: Avatar Picker */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-32 h-32 rounded-full bg-slate-50 dark:bg-slate-950 border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden group">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt={name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400">
                        <User className="h-16 w-16" />
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10.5px] font-bold cursor-pointer"
                    >
                      <Camera className="h-5 w-5 mb-1.5" />
                      <span>Update Photo</span>
                    </button>
                  </div>
                </div>

                {/* Right: Upload controls and preset selector */}
                <div className="flex-1 w-full space-y-5">
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upload or Choose Preset</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                      Upload your high-resolution headshot (supports PNG, JPG, WEBP formats up to 2MB) or choose one of our professionally illustrated recruiter avatar presets.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload New Photo</span>
                    </button>

                    {profileImage && (
                      <button
                        type="button"
                        onClick={() => setProfileImage("")}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-100/60 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    )}

                    {/* Drag & Drop mini target */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`hidden lg:flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-xl cursor-pointer text-xs font-bold transition-all ${
                        dragOver 
                          ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 text-indigo-600" 
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50/20 dark:bg-slate-950/10"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Drag a file here</span>
                    </div>
                  </div>

                  {/* Input Element */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                  />

                  {/* Preset Selection (Choose Avatar) */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Or Select From Premium Recruiter Presets</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_PRESETS.map((preset, idx) => (
                        <button
                          key={`avatar-${idx}`}
                          type="button"
                          onClick={() => setProfileImage(preset)}
                          className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                            profileImage === preset ? "border-indigo-600 dark:border-indigo-500 ring-4 ring-indigo-500/10 scale-105" : "border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100"
                          }`}
                        >
                          <img src={preset} alt="Preset Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Personal Information Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 text-left hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3.5 flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Personal Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      placeholder="Aditi Jadhav"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Email Address</span>
                    <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-extrabold uppercase font-mono tracking-wider">Editable</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-indigo-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      placeholder="hr@example.com"
                    />
                  </div>
                </div>

                {/* Explanation Banner for Email */}
                <div className="sm:col-span-2 p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl flex items-start gap-3">
                  <Info className="h-5 w-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Primary HR Email Settings
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      You can change this to any email of your choice (e.g. your company's actual HR or personal email address). Changing this will immediately update your admin profile settings, which are used as the sender name/signature for outgoing emails, automated candidate interview alerts, and template invitations.
                    </p>
                  </div>
                </div>

                {/* Security Role */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Security Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold transition-all appearance-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="Lead Recruiting Admin">Lead Recruiting Admin</option>
                      <option value="System Administrator">System Administrator</option>
                      <option value="HR Director">HR Director</option>
                      <option value="HR Recruiter">HR Recruiter</option>
                    </select>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                {/* Timezone Location */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Timezone Location
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all appearance-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30) - Pune / Mumbai</option>
                      <option value="America/New_York">Eastern Time (EST, GMT-5)</option>
                      <option value="America/Los_Angeles">Pacific Time (PST, GMT-8)</option>
                      <option value="Europe/London">London (GMT+0)</option>
                      <option value="Asia/Singapore">Singapore (GMT+8)</option>
                      <option value="Australia/Sydney">Sydney (GMT+10)</option>
                    </select>
                  </div>
                </div>

                {/* Professional Bio */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Professional Bio
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      placeholder="Brief details about your role and background..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Read-Only Employee Information */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5 text-left hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Employee Placement Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1 hover:bg-slate-100/35 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-slate-450" />
                    <span>Employee ID</span>
                  </span>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-250">
                    ENC-HR-001
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1 hover:bg-slate-100/35 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-slate-450" />
                    <span>Department</span>
                  </span>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-250">
                    Talent Acquisition
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1 hover:bg-slate-100/35 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-450" />
                    <span>Designation</span>
                  </span>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-250">
                    Lead HR Manager
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1 hover:bg-slate-100/35 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-slate-450" />
                    <span>Office Location</span>
                  </span>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-250">
                    Pune Office
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1 lg:col-span-4 hover:bg-slate-100/35 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-450" />
                    <span>Official Joining Date</span>
                  </span>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-250">
                    15 January 2025 (Registered)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: WORKSPACE PREFERENCES */}
        {activeSubTab === "preferences" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 text-left">
            
            {/* Workspace Navigation & Formats card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 hover:shadow-sm transition-all duration-200">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sliders className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Workspace Navigation & Formats</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Default Landing Page
                  </label>
                  <select
                    value={defaultLandingPage}
                    onChange={(e) => updateSettingState(e.target.value, setDefaultLandingPage)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="jobs">Jobs</option>
                    <option value="candidates">Candidates</option>
                    <option value="interviews">Interviews</option>
                    <option value="reports">Reports</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date Format
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => updateSettingState(e.target.value, setDateFormat)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 16/07/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/16/2026)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Time Format
                  </label>
                  <select
                    value={timeFormat}
                    onChange={(e) => updateSettingState(e.target.value, setTimeFormat)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="12 Hour">12 Hour (e.g. 10:45 AM)</option>
                    <option value="24 Hour">24 Hour (e.g. 22:45)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Real-time Workspace Alerts & Digests Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Real-time Workspace Alerts & Digests</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Acoustic Cues */}
                <div className="py-4 flex items-center justify-between gap-4" id="setting-row-sound">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Acoustic Cues</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                        Play realistic sound cues when new candidates trigger recruiter screening evaluations or schedules.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSoundAlerts}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      soundAlerts ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        soundAlerts ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Daily Digest */}
                <div className="py-4 flex items-center justify-between gap-4" id="setting-row-digest">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Recruitment Daily Digest</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                        Receive compiled PDF summaries, candidate matching matrix ratings, and system interview schedule digests daily.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDailyDigest}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      dailyDigest ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        dailyDigest ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Fit Highlight */}
                <div className="py-4 flex items-center justify-between gap-4" id="setting-row-highlight">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Glow Border Fit Highlights</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-455 leading-relaxed font-medium">
                        Glow borders around premium candidate avatars with match indexes higher than 85% to immediately draw recruiter focus.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHighFitHighlight}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      highFitHighlight ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        highFitHighlight ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Model & Match Thresholds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-sm transition-all duration-200">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <Sliders className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>AI Match Threshold & Refresh</span>
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Recruitment Fit Cut-Off
                      </label>
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {matchThreshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="95"
                      step="5"
                      value={matchThreshold}
                      onChange={(e) => updateSettingState(Number(e.target.value), setMatchThreshold)}
                      className="w-full h-1.5 bg-slate-150 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>60% (Low bar)</span>
                      <span>80% (Recommended)</span>
                      <span>95% (Top elite)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Workspace Auto-Refresh Rate
                    </label>
                    <select
                      value={refreshRate}
                      onChange={(e) => updateSettingState(e.target.value, setRefreshRate)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="realtime">Real-time (Active Connection)</option>
                      <option value="30s">Every 30 seconds</option>
                      <option value="5m">Every 5 minutes</option>
                      <option value="manual">Manual Refresh Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Regional Preferences Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-sm transition-all duration-200">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <Globe className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>Regionalization & Sync</span>
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5 text-slate-400" />
                      <span>Console UI Language</span>
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => updateSettingState(e.target.value, setPreferredLanguage)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="en">English (United States)</option>
                      <option value="mr">Marathi (मराठी)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="es">Spanish (Español)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Drafts Auto-Save Interval</span>
                    </label>
                    <select
                      value={autoSaveInterval}
                      onChange={(e) => updateSettingState(e.target.value, setAutoSaveInterval)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="instant">Instant Real-time Saving</option>
                      <option value="30s">Every 30 seconds</option>
                      <option value="1m">Every 1 minute</option>
                      <option value="5m">Every 5 minutes</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Sub-Tab 3: LOGIN & SECURITY */}
        {activeSubTab === "security" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 text-left">
            
            {/* Update password card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Key className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Update Console Password
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                 Keep your recruiter portal credentials secure. It is recommended to use at least 8 characters, with capital letters and special symbols.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    placeholder="At least 6 chars"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium transition-all bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Security Information Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5 text-left hover:shadow-sm transition-all duration-200">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Security Information</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Login</p>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">16 July 2026, 10:45 AM</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Password Changed</p>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">15 April 2026, 11:20 AM</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Password Expiry</p>
                  <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">15 October 2026</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Created</p>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">15 January 2025</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Device</p>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5 text-indigo-500" />
                    Windows 11
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Browser</p>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-indigo-500" />
                    Chrome
                  </p>
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs text-left space-y-4 hover:shadow-sm transition-all duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Two-Factor Authentication (2FA)</span>
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  twoFactorEnabled 
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50" 
                    : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/50"
                }`}>
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Two-Factor Authentication</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                    Secure your recruitment account by requiring a temporary verification code in addition to your password during console logins.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleTwoFactor}
                  className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    twoFactorEnabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      twoFactorEnabled ? "translate-x-4.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Active Sessions Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs text-left space-y-4 hover:shadow-sm transition-all duration-200">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Monitor className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Active Sessions</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You are currently logged into the AI ATS recruiter console from these devices. If you see unrecognized access, sign out immediately.
              </p>
              <div className="divide-y divide-slate-150 dark:divide-slate-850">
                {activeSessions.map((session) => (
                  <div key={session.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-100 dark:border-slate-900">
                        {session.device.includes("Mac") ? (
                          <Smartphone className="h-5 w-5 text-indigo-500" />
                        ) : (
                          <Laptop className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-250 flex items-center gap-1.5">
                          <span>{session.device} • {session.browser}</span>
                          {session.status === "Active Now" && (
                            <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                              Active Now
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          Location: {session.location} • Status: {session.status}
                        </p>
                      </div>
                    </div>
                    {session.status !== "Active Now" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSessions(activeSessions.filter(s => s.id !== session.id));
                          triggerToast(`Successfully signed out from ${session.device} session.`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900 hover:border-transparent rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <LogOut className="h-3 w-3" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Sub-Tab 4: NOTIFICATIONS */}
        {activeSubTab === "notifications" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 text-left">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 hover:shadow-sm transition-all duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Notification Settings</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {/* Acoustic Cues */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Acoustic Cues (Sound Alerts)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Play real-time sound effects on candidate match screening triggers.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSoundAlerts}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      soundAlerts ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        soundAlerts ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Daily Digest */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Recruitment Daily Digest</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Receive compiled PDF summaries and match ratings every morning in your inbox.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDailyDigest}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      dailyDigest ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        dailyDigest ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Email Notifications */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Email System Notifications</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Receive critical alerts regarding job application status updates and candidate interview slots.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettingState(!emailNotifications, setEmailNotifications)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      emailNotifications ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        emailNotifications ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Candidate Alerts */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Candidate Match Alerts</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Get notified when a highly-rated candidate matches existing open job profiles.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettingState(!candidateAlerts, setCandidateAlerts)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      candidateAlerts ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        candidateAlerts ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Push Notifications */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Desktop Push Notifications</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Display immediate banner popups on candidate actions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettingState(!pushNotifications, setPushNotifications)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      pushNotifications ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        pushNotifications ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Interview Reminders */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Interview Slot Reminders</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Send alert 15 minutes before an interview starts.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettingState(!interviewReminders, setInterviewReminders)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      interviewReminders ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        interviewReminders ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Sub-Tab 5: APPEARANCE */}
        {activeSubTab === "appearance" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 text-left">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 hover:shadow-sm transition-all duration-200">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Palette className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Appearance Customization</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme Option */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="h-4 w-4 text-slate-400" />
                    <span>Console theme</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["light", "dark", "system"].map((tOption) => (
                      <button
                        key={tOption}
                        type="button"
                        onClick={() => updateSettingState(tOption, setDashboardTheme)}
                        className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition-all text-center capitalize cursor-pointer ${
                          dashboardTheme === tOption
                            ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-950"
                        }`}
                      >
                        {tOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Option */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-slate-400" />
                    <span>Sidebar Navigation Mode</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["expanded", "collapsed"].map((sOption) => (
                      <button
                        key={sOption}
                        type="button"
                        onClick={() => updateSettingState(sOption, setSidebarSetting)}
                        className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition-all text-center capitalize cursor-pointer ${
                          sidebarSetting === sOption
                            ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-950"
                        }`}
                      >
                        {sOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density Option */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-slate-400" />
                    <span>Workspace density</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["comfortable", "compact"].map((dOption) => (
                      <button
                        key={dOption}
                        type="button"
                        onClick={() => updateSettingState(dOption, setLayoutDensity)}
                        className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition-all text-center capitalize cursor-pointer ${
                          layoutDensity === dOption
                            ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-950"
                        }`}
                      >
                        {dOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Display */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-slate-400" />
                    <span>Console Brand Accent Color</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 dark:border-slate-750 rounded-lg bg-slate-50/50 dark:bg-slate-950/50">
                    <span className="h-4 w-4 rounded-full bg-indigo-650 border-2 border-white dark:border-slate-900 shadow-xs" />
                    <span className="text-xs font-semibold text-slate-750 dark:text-slate-300">EncureIT Purple (Selected)</span>
                  </div>
                </div>
              </div>

              {/* UI Animations Toggle */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable UI Transitions & Animations</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                    Control standard layout slide-in animations and micro-interaction visual ripples.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettingState(!enableAnimations, setEnableAnimations)}
                  className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    enableAnimations ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-750"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      enableAnimations ? "translate-x-4.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Sub-Tab 6: ABOUT ATS */}
        {activeSubTab === "about" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-250 text-left">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 sm:p-8 shadow-xs text-left space-y-6 hover:shadow-sm transition-all duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  About EncureIT AI ATS
                </h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 rounded-xl space-y-2">
                  <h4 className="text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span>Enterprise HR Solutions</span>
                  </h4>
                  <p className="text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
                    EncureIT AI ATS is a next-generation recruitment portal engineered for streamlined candidate screening, high-precision resume matching powered by state-of-the-art Gemini AI, and end-to-end recruiter workspace workflows.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Application</span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">EncureIT AI Applicant Tracking System</span>
                  </div>

                  <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Version</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">v1.0.0</span>
                  </div>

                  <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Build Release</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">July 2026</span>
                  </div>

                  <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Powered By</span>
                    <span className="text-xs font-extrabold text-indigo-650 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                      <Sparkles className="h-3 w-3 animate-pulse text-indigo-500" />
                      <span>Gemini AI</span>
                    </span>
                  </div>

                  <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Frontend Stack</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">React + TypeScript</span>
                  </div>

                  <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Backend Service</span>
                    <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-0.5 rounded">FastAPI (Coming Soon)</span>
                  </div>
                </div>

                <div className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20 sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Parent Organization</span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">EncureIT Systems Pvt. Ltd.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Changes & Cancel Buttons */}
        {activeSubTab !== "about" && (
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800/60 mt-8">
            <button
              type="button"
              onClick={handleCancelSettings}
              className="px-5 py-2.5 rounded-xl border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-98"
            >
              Cancel
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

      {/* Premium Floating Success Toast */}
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
