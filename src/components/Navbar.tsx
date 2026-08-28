/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTranslation } from "../utils/i18n";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Calendar, 
  FileText, 
  Compass, 
  Bell,
  Menu,
  X,
  Cpu,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Settings
} from "lucide-react";
import { NotificationItem } from "../types";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  onSimulateNotification: () => void;
  currentUser: { email: string; name: string; role: string; profileImage?: string } | null;
  onLogout: () => void;
}

export default function Navbar({ activeTab, setActiveTab, notifications, onSimulateNotification, currentUser, onLogout }: NavbarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreditsDropdown, setShowCreditsDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  
  // Interactive Admin Settings
  const [adminName, setAdminName] = useState(currentUser?.name || "Aditi Jadhav");
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || "aditijadhav2828@gmail.com");
  const [adminRole, setAdminRole] = useState(currentUser?.role || "Lead Recruiting Admin");
  const [adminProfileImage, setAdminProfileImage] = useState(currentUser?.profileImage || "");

  React.useEffect(() => {
    if (currentUser) {
      setAdminName(currentUser.name);
      setAdminEmail(currentUser.email);
      setAdminRole(currentUser.role);
      setAdminProfileImage(currentUser.profileImage || "");
    }
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navItems = [
    { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { id: "jobs", label: t("jobs"), icon: Briefcase },
    { id: "candidates", label: t("candidates"), icon: Users, showAIBadge: true },
    { id: "interviews", label: t("interviews"), icon: Calendar },
    { id: "reports", label: t("reports"), icon: FileText },
    { id: "insights", label: t("insights"), icon: Compass, showAIBadge: true },
    { id: "notifications", label: t("notifications"), icon: Bell },
  ];

  return (
    <nav className="w-full bg-slate-950 border-b border-slate-900 text-slate-300 select-none sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Left: Sleek, bold logo for encureIT */}
          <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="h-8 w-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
              <img src="/encureit_icon.png" alt="EncureIT Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-display font-extrabold text-base text-white tracking-tight">
                Encure<span className="text-indigo-400">IT</span>
              </span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-1" title="AI Core Active" />
            </div>
          </div>

          {/* Center: Desktop Navigation links - optimized sizing, bolder and larger */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 h-full mx-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isNotifications = item.id === "notifications";
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isNotifications ? "Notifications" : undefined}
                  className={`relative flex items-center rounded-lg font-semibold text-[13.5px] transition-all duration-150 cursor-pointer h-10 ${
                    isNotifications 
                      ? "p-2.5 hover:bg-slate-900/50 ml-6 xl:ml-8 border-l border-slate-800/80 pl-4" 
                      : "gap-2 px-3.5 py-2"
                  } ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm border-b-2 border-indigo-500"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  {!isNotifications && <span className="tracking-tight">{item.label}</span>}
                  
                  {isNotifications && unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}

                  {item.showAIBadge && (
                    <span className="text-[9px] bg-indigo-950 text-indigo-400 font-bold px-1.5 py-0.2 rounded-sm border border-indigo-500/20 uppercase">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Unified, clean System status dropdown + Admin Profile Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {/* System active credits dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowCreditsDropdown(!showCreditsDropdown);
                  setShowAdminDropdown(false);
                }}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer transition-all shadow-xs"
              >
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">System Active</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showCreditsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-950 border border-slate-900 rounded-xl p-4 shadow-2xl z-50 space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-1">
                    <span className="text-[10px] text-slate-400 font-mono">MODEL INFRASTRUCTURE</span>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.2 rounded-sm font-bold uppercase">Connected</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-white">
                    <Cpu className="h-4 w-4 text-indigo-400" />
                    <span className="font-semibold">Gemini 3.5 Flash</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>AI MATCH CREDITS</span>
                      <span className="font-mono text-indigo-400 font-bold">75% (750 left)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full w-3/4"></div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono pt-1 leading-relaxed border-t border-slate-900">
                    SaaS subscription active. Evaluated resume documents are automatically indexed.
                  </div>

                  <button
                    onClick={() => {
                      onSimulateNotification();
                      setShowCreditsDropdown(false);
                    }}
                    className="w-full mt-2.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold tracking-tight transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-sm uppercase"
                  >
                    <Bell className="h-3 w-3 animate-bounce shrink-0" />
                    <span>Simulate New Notification</span>
                  </button>
                </div>
              )}
            </div>

            {/* Subtle separator on desktop */}
            <div className="hidden sm:block h-6 w-px bg-slate-800" />

            {/* Top Right Profile Icon with Dropdown */}
            <div className="relative group">
              <button
                onClick={() => {
                  setShowAdminDropdown(!showAdminDropdown);
                  setShowCreditsDropdown(false);
                }}
                className="flex items-center gap-1 p-0.5 rounded-full hover:bg-slate-900/80 transition-all cursor-pointer border border-slate-800 hover:border-slate-700 shadow-md relative shrink-0 bg-slate-950"
                title="Admin Profile Settings"
              >
                <div className="h-8.5 w-8.5 rounded-full bg-slate-900 flex items-center justify-center border border-indigo-400/30 overflow-hidden relative">
                  {adminProfileImage ? (
                    <img src={adminProfileImage} alt={adminName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="h-4.5 w-4.5 text-slate-100" />
                  )}
                </div>
                {/* Active pulsating green dot */}
                <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
                </span>
              </button>

              {showAdminDropdown && (
                <div className="absolute right-0 mt-2.5 w-72 bg-slate-950 border border-slate-900 rounded-xl p-4 shadow-2xl z-50 space-y-3.5 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider font-bold">ADMIN PROFILE SETTINGS</span>
                    <span className="text-[8px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.2 rounded-sm font-bold uppercase">Active</span>
                  </div>
                  
                  {/* Avatar & Info preview */}
                  <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-lg border border-slate-900">
                    <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white border border-indigo-400/30 shrink-0 overflow-hidden">
                      {adminProfileImage ? (
                        <img src={adminProfileImage} alt={adminName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="h-4.5 w-4.5 text-indigo-100" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-100 truncate">{adminName}</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{adminEmail}</p>
                    </div>
                  </div>

                  {/* Settings Link Button */}
                  <div className="pt-1.5 pb-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("profile");
                        setShowAdminDropdown(false);
                      }}
                      id="navbar-dropdown-settings-btn"
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <User className="h-3.5 w-3.5 text-indigo-200" />
                      <span>Edit Profile & Settings</span>
                    </button>
                  </div>

                  <div className="text-[9px] text-slate-500 font-mono pt-1.5 leading-relaxed border-t border-slate-900 flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-indigo-400 shrink-0" />
                    <span className="truncate font-semibold text-slate-400">Role: {adminRole}</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowAdminDropdown(false);
                      onLogout();
                    }}
                    className="w-full py-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 text-rose-400 rounded-md text-[10px] font-bold tracking-tight transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer uppercase mt-2"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-hidden cursor-pointer"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-xs">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isNotifications = item.id === "notifications";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`relative flex items-center transition-all duration-200 cursor-pointer ${
                    isNotifications
                      ? "w-11 h-11 justify-center rounded-full bg-slate-950/50 hover:bg-slate-900 mx-auto my-2"
                      : "w-full gap-3 px-4 py-3 rounded-lg font-medium text-sm"
                  } ${
                    isActive && !isNotifications
                      ? "bg-slate-800 text-white shadow-xs border-l-4 border-indigo-500 pl-3"
                      : isNotifications && isActive
                      ? "text-indigo-400 border border-indigo-500/30"
                      : isNotifications
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className={`${isNotifications ? "h-5 w-5" : "h-5 w-5 shrink-0"} ${isActive ? "text-indigo-400 animate-pulse" : "text-slate-400"}`} />
                  {!isNotifications && <span>{item.label}</span>}
                  {isNotifications && unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                  {item.showAIBadge && !isNotifications && (
                    <span className="text-[10px] bg-slate-800 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/20">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Bottom Meta Stats */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>AI Match Credits</span>
              <span className="font-mono text-indigo-300">750 / 1000</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full">
              <div className="bg-indigo-500 h-1 rounded-full w-3/4"></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span>Model: Gemini 3.5 Flash</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer uppercase"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
