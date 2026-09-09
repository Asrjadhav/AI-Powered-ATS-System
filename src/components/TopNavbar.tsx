/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import { 
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Compass,
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Search, 
  Sparkles,
  ChevronDown,
  Mail,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Database,
  Award,
  Link as LinkIcon,
  Shield,
  Menu,
  X,
  Cpu
} from "lucide-react";
import { NotificationItem } from "../types";

interface TopNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  onSimulateNotification?: () => void;
  currentUser: { email: string; name: string; role: string; profileImage?: string } | null;
  onLogout: () => void;
}

export default function TopNavbar({ 
  activeTab, 
  setActiveTab, 
  notifications, 
  onSimulateNotification,
  currentUser, 
  onLogout 
}: TopNavbarProps) {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Click outside listener to close dropdown popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;

  // Global Navigation Links (Center/Left)
  const navItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "candidates", label: "Candidates", icon: Users, showAIBadge: true },
    { id: "talent_pool", label: "Talent Pool", icon: Database, showAIBadge: true, matchTabs: ["talent_pool", "talent-pool"] },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "interviews", label: "Interviews", icon: Calendar },
    { id: "offers", label: "Offers", icon: Award },
    { id: "insights", label: "Insights", icon: Compass, showAIBadge: true, matchTabs: ["insights", "reports"] },
  ];

  // Check if a nav item is active
  const isTabActive = (item: typeof navItems[0]) => {
    if (item.matchTabs) {
      return item.matchTabs.includes(activeTab);
    }
    return activeTab === item.id;
  };

  const isMoreActive = activeTab === "email_templates" || activeTab === "integrations";

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "candidate_applied": return <User className="h-4 w-4 text-brand-600" />;
      case "interview_scheduled": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "ai_screening_completed": return <Sparkles className="h-4 w-4 text-brand-600 animate-pulse" />;
      default: return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    setShowMore(false);
  };

  return (
    <header className="w-full max-w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 h-16 shadow-xs select-none overflow-hidden">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 h-full box-border min-w-0">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-3 w-full min-w-0">
          
          {/* ================= GROUP 1: BRAND LOGO (FAR LEFT EDGE) ================= */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div 
              onClick={() => handleNavClick("dashboard")}
              className="flex items-center gap-2 cursor-pointer bg-transparent shrink-0 group"
            >
              <img 
                src="/encureit_logo.png" 
                alt="EncureIT Logo" 
                className="h-8 sm:h-9 w-auto object-contain bg-transparent group-hover:opacity-90 transition-opacity" 
              />
            </div>
            
            {/* Subtle vertical separator */}
            <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* ================= GROUP 2: MAIN NAVIGATION ================= */}
          <nav className="hidden lg:flex items-center gap-0.5 sm:gap-1 font-sans text-[13.5px] font-semibold h-full min-w-0 flex-1 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-[13px] xl:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer relative h-9.5 whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-brand-50/90 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 shadow-2xs font-extrabold"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`} />
                  <span>{item.label}</span>

                  {item.showAIBadge && (
                    <span className="text-[9px] bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-extrabold px-1 py-0.2 rounded border border-brand-200 dark:border-brand-800/60 uppercase flex items-center gap-0.5 shrink-0">
                      <Sparkles className="h-2.5 w-2.5 text-brand-600 dark:text-brand-400" />
                      <span>AI</span>
                    </span>
                  )}
                </button>
              );
            })}

            {/* MORE DROPDOWN MENU */}
            <div className="relative shrink-0" ref={moreRef}>
              <button
                onClick={() => setShowMore(!showMore)}
                className={`flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-lg text-[13px] xl:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer relative h-9.5 whitespace-nowrap ${
                  isMoreActive
                    ? "bg-brand-50/90 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 shadow-2xs font-extrabold"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                }`}
              >
                <span>More</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180 text-brand-600" : "text-slate-400"}`} />
              </button>

              {showMore && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1.5 text-left text-xs font-bold animate-in fade-in duration-150">
                  <button
                    onClick={() => handleNavClick("email_templates")}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors cursor-pointer ${
                      activeTab === "email_templates" ? "text-brand-600 dark:text-brand-400 font-extrabold bg-brand-50/50" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <Mail className="h-4 w-4 text-brand-600" />
                    <span>Email Templates</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("integrations")}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors cursor-pointer ${
                      activeTab === "integrations" ? "text-brand-600 dark:text-brand-400 font-extrabold bg-brand-50/50" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <LinkIcon className="h-4 w-4 text-emerald-500" />
                    <span>Integration Hub</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* ================= GROUP 3: RIGHT UTILITIES (SEARCH, NOTIF, PROFILE) ================= */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto box-border min-w-0">
            
            {/* Global Search Bar (Responsive flex-1 min-w-0 max-w-[200px], shrinks first) */}
            <div className="hidden md:flex items-center relative flex-1 min-w-0 max-w-[180px] xl:max-w-[220px] shrink">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates, jobs..." 
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all shadow-xs h-9"
              />
            </div>

            {/* Notifications Icon Button */}
            <div className="relative shrink-0" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg border text-slate-600 dark:text-slate-300 transition-all cursor-pointer relative flex items-center justify-center h-10 w-10 ${
                  showNotifications 
                    ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" 
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 text-slate-500"
                }`}
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-bold text-white bg-brand-600 rounded-full border-2 border-white dark:border-slate-900 font-mono animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                  <div className="p-3.5 bg-slate-950 text-white flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-brand-400" />
                      <span className="text-xs font-bold tracking-tight">System Alerts</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded">
                      {unreadCount} unread
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No notifications available.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            handleNavClick("notifications");
                            setShowNotifications(false);
                          }}
                          className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex gap-3 items-start ${!n.isRead ? "bg-brand-50/40 dark:bg-brand-950/20" : ""}`}
                        >
                          <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start gap-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                              {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0 mt-1" />}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{n.description}</p>
                            <span className="text-[9px] text-slate-400 font-medium mt-1 block font-mono">{n.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      handleNavClick("notifications");
                      setShowNotifications(false);
                    }}
                    className="w-full py-2.5 text-center text-xs font-bold text-brand-600 dark:text-brand-400 bg-slate-50 dark:bg-slate-950 hover:bg-brand-50 dark:hover:bg-brand-950/50 border-t border-slate-100 dark:border-slate-800 cursor-pointer block transition-all uppercase tracking-wider text-[10px]"
                  >
                    Open Notification Center
                  </button>
                </div>
              )}
            </div>

            {/* Profile Control (Exact: width 128px, height 40px, flex-shrink: 0, 30px avatar, visible right border) */}
            <div className="relative shrink-0 w-[128px] min-w-[128px] max-w-[128px]" ref={profileRef}>
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="w-full flex items-center justify-between gap-1.5 px-2 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100/70 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-lg transition-all cursor-pointer h-10 shadow-2xs box-border overflow-hidden"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="h-[30px] w-[30px] rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-xs overflow-hidden shrink-0 border border-brand-400/30">
                    {currentUser?.profileImage ? (
                      <img src={currentUser.profileImage} alt={currentUser.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>

                  <div className="text-left min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                      {currentUser?.name ? currentUser.name.split(" ")[0] : "Aditi"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium font-mono leading-none truncate whitespace-nowrap overflow-hidden">
                      {currentUser?.role || "Admin"}
                    </p>
                  </div>
                </div>

                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 ml-auto transition-transform ${showProfile ? "rotate-180 text-brand-600" : ""}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfile && (
                <div className="absolute right-0 mt-2.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                  
                  {/* User Bio Header */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || "Aditi Jadhav"}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>{currentUser?.email || "aditijadhav2828@gmail.com"}</span>
                    </p>
                    <span className="inline-block text-[9px] font-extrabold tracking-wider font-mono bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded mt-2 uppercase">
                      {currentUser?.role || "Lead Recruiting Admin"}
                    </span>
                  </div>

                  {/* Navigation Links inside Dropdown */}
                  <div className="p-1.5 space-y-0.5">
                    <button
                      onClick={() => {
                        handleNavClick("profile");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                    >
                      <Settings className="h-4 w-4 text-indigo-500" />
                      <span>Settings & Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick("talent_pool");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                    >
                      <Database className="h-4 w-4 text-indigo-600" />
                      <span>Talent Pool Database</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick("offers");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                    >
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>Offers & Contracts</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick("email_templates");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                    >
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span>Email Templates</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick("integrations");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                    >
                      <LinkIcon className="h-4 w-4 text-emerald-500" />
                      <span>Integrations Hub</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick("users_roles");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
                    >
                      <Shield className="h-4 w-4 text-rose-500" />
                      <span>System Administrator</span>
                    </button>

                    {onSimulateNotification && (
                      <button
                        onClick={() => {
                          onSimulateNotification();
                          setShowProfile(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer transition-all border border-indigo-100 dark:border-indigo-900/40 my-1"
                      >
                        <Bell className="h-3.5 w-3.5 text-indigo-500 animate-bounce" />
                        <span>Simulate Test Alert</span>
                      </button>
                    )}
                  </div>

                  {/* Sign Out Button */}
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-all uppercase tracking-wider text-[10px]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* ================= MOBILE MENU DRAWER / OVERLAY ================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in fade-in duration-150">
          <div className="p-4 space-y-3">
            
            {/* Mobile Search */}
            <div className="relative w-full mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search candidates, jobs..." 
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
              />
            </div>

            {/* Main Nav Links */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Main Navigation</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isTabActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      active 
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.showAIBadge && (
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">AI</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Secondary Admin Links */}
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Recruitment & Admin</p>
              
              <button onClick={() => handleNavClick("talent_pool")} className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Database className="h-4 w-4 text-indigo-600" />
                <span>Talent Pool</span>
              </button>

              <button onClick={() => handleNavClick("offers")} className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Offers</span>
              </button>

              <button onClick={() => handleNavClick("email_templates")} className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Email Templates</span>
              </button>

              <button onClick={() => handleNavClick("profile")} className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Settings className="h-4 w-4 text-indigo-500" />
                <span>Settings</span>
              </button>

              <button onClick={() => handleNavClick("integrations")} className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <LinkIcon className="h-4 w-4 text-emerald-500" />
                <span>Integrations</span>
              </button>

              <button onClick={() => handleNavClick("users_roles")} className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                <Shield className="h-4 w-4 text-rose-500" />
                <span>System Administrator</span>
              </button>
            </div>

            {/* Mobile Footer / Sign Out */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </header>
  );
}
