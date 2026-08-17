/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Search, 
  Check, 
  Sparkles,
  ChevronDown,
  Mail,
  ShieldCheck,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { NotificationItem } from "../types";

interface TopNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  currentUser: { email: string; name: string; role: string; profileImage?: string } | null;
  onLogout: () => void;
}

export default function TopNavbar({ 
  activeTab, 
  setActiveTab, 
  notifications, 
  currentUser, 
  onLogout 
}: TopNavbarProps) {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;

  // Get localized active tab name
  const getTabLabel = () => {
    switch (activeTab) {
      case "dashboard": return t("dashboard");
      case "jobs": return t("jobs");
      case "candidates": return "Candidate Profiles";
      case "interviews": return t("interviews");
      case "offers": return t("offers");
      case "talent_pool": return t("talent_pool");
      case "reports": return t("reports");
      case "insights": return t("insights");
      case "notifications": return t("notifications");
      case "profile": return "Settings";
      case "integrations": return "Integrations Hub";
      case "users_roles": return "System Administrator";
      default: return "Talent Console";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "candidate_applied": return <User className="h-4 w-4 text-indigo-500" />;
      case "interview_scheduled": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "ai_screening_completed": return <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />;
      default: return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <header className="hidden lg:flex w-full h-16 bg-white border-b border-slate-200/80 items-center justify-between px-8 shrink-0 z-30 sticky top-0">
      
      {/* Left: Active Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="font-display font-extrabold text-[16px] text-slate-800 tracking-tight">
          {getTabLabel()}
        </h1>
        <div className="h-4 w-px bg-slate-200" />
        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">
          Workspace
        </span>
      </div>

      {/* Middle: Integrated Search (Visual Decorator & Quick Match helper) */}
      <div className="hidden xl:flex items-center w-80 relative">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input 
          type="text" 
          placeholder="Global pipeline search (jobs, names, scores...)" 
          className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-slate-700 placeholder-slate-400 transition-all"
        />
      </div>

      {/* Right: Notification Trigger & Profile Trigger */}
      <div className="flex items-center gap-4">
        
        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 rounded-lg border text-slate-600 transition-all cursor-pointer relative ${
              showNotifications 
                ? "bg-slate-100 border-slate-300 text-slate-900" 
                : "border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500"
            }`}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center text-[9px] font-bold text-white bg-indigo-600 rounded-full border-2 border-white font-mono animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold tracking-tight">Active Alerts</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  {unreadCount} unread
                </span>
              </div>

              {/* List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No notifications available.
                  </div>
                ) : (
                  notifications.slice(0, 4).map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        setActiveTab("notifications");
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition-all cursor-pointer flex gap-3 items-start ${!n.isRead ? "bg-slate-50/60" : ""}`}
                    >
                      <div className="p-1.5 rounded-md bg-slate-100 shrink-0 mt-0.5">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0 mt-1" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{n.description}</p>
                        <span className="text-[9px] text-slate-400 font-medium mt-1 block">{n.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer action */}
              <button
                onClick={() => {
                  setActiveTab("notifications");
                  setShowNotifications(false);
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-indigo-600 bg-slate-50 hover:bg-indigo-100/50 border-t border-slate-100 cursor-pointer block transition-all"
              >
                Open Notification Center
              </button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-200" />

        {/* Profile Popover / Trigger */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-400/20 overflow-hidden shrink-0">
              {currentUser?.profileImage ? (
                <img src={currentUser.profileImage} alt={currentUser.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="h-4.5 w-4.5 text-indigo-600" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-700 leading-none">
                {currentUser?.name || "Aditi Jadhav"}
              </p>
              <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5 leading-none">
                {currentUser?.role || "Lead HR Executive"}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* User Bio Card */}
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name || "Aditi Jadhav"}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{currentUser?.email || "aditijadhav2828@gmail.com"}</span>
                </p>
                <span className="inline-block text-[8px] font-bold tracking-wider font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded mt-2.5 uppercase">
                  {currentUser?.role || "Lead Recruiting Admin"}
                </span>
              </div>

              {/* Actions */}
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setShowProfile(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Sign Out */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => {
                    setShowProfile(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                >
                  <LogOut className="h-4 w-4 text-rose-400" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
