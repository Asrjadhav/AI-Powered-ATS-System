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
    { id: "applications", label: "Applications", icon: Users, showAIBadge: true },
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
      case "candidate_applied": return <User className="h-4 w-4 text-[#1F3B75]" />;
      case "interview_scheduled": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "ai_screening_completed": return <Sparkles className="h-4 w-4 text-[#1F3B75] animate-pulse" />;
      default: return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    setShowMore(false);
  };

  return (
    <header className="w-full bg-[#0F172A] border-b border-[#1F3B75]/40 sticky top-0 z-40 h-[60px] shadow-[0_8px_24px_rgba(15,23,42,0.18)] select-none overflow-visible">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-full box-border">
        <div className="flex items-center justify-between h-full gap-4 w-full">
          
          {/* ================= BRAND LOGO ================= */}
          <div className="flex items-center gap-4 shrink-0">
            <div 
              onClick={() => handleNavClick("dashboard")}
              className="flex items-center gap-2 cursor-pointer bg-transparent shrink-0 group"
            >
              <img 
                src="/encureit_icon.png" 
                alt="EncureIT Logo" 
                className="h-7 w-7 object-contain bg-transparent group-hover:opacity-90 transition-opacity" 
              />
              <span className="font-display font-extrabold text-base text-white tracking-tight">EncureIT</span>
            </div>
            
            {/* Vertical separator */}
            <div className="hidden lg:block h-6 w-px bg-slate-700" />
          </div>

          {/* ================= MAIN NAVIGATION ================= */}
          <nav className="hidden lg:flex items-center gap-1 font-sans text-sm font-medium h-full flex-1 py-1">
            {navItems.map((item) => {
              const active = isTabActive(item);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer relative whitespace-nowrap ${
                    active
                      ? "bg-[#1F3B75] text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* MORE DROPDOWN MENU */}
            <div className="relative shrink-0" ref={moreRef}>
              <button
                onClick={() => setShowMore(!showMore)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer relative whitespace-nowrap ${
                  isMoreActive || showMore
                    ? "bg-[#1F3B75] text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <span>More</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
              </button>

              {showMore && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-md shadow-[0_16px_32px_rgba(2,6,23,0.35)] z-50 py-1 text-left text-sm font-medium">
                  <button
                    onClick={() => handleNavClick("email_templates")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 transition-colors cursor-pointer ${
                      activeTab === "email_templates" ? "text-white font-semibold bg-slate-800" : "text-slate-300"
                    }`}
                  >
                    <Mail className="h-4 w-4 text-[#5FA8FF]" />
                    <span>Email Templates</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("integrations")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 transition-colors cursor-pointer ${
                      activeTab === "integrations" ? "text-white font-semibold bg-slate-800" : "text-slate-300"
                    }`}
                  >
                    <LinkIcon className="h-4 w-4 text-[#5FA8FF]" />
                    <span>Integrations</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* ================= RIGHT UTILITIES (SEARCH, NOTIF, PROFILE) ================= */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            
            {/* Global Search Bar */}
            <div className="hidden md:flex items-center relative w-48 lg:w-64">
              <Search className="absolute left-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..." 
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5FA8FF] focus:border-[#5FA8FF] text-slate-100 placeholder-slate-400 h-9"
              />
            </div>

            {/* Notifications Icon Button */}
            <div className="relative shrink-0" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-md transition-colors cursor-pointer relative flex items-center justify-center h-9 w-9 ${
                  showNotifications 
                    ? "bg-slate-800 text-white border border-slate-700" 
                    : "hover:bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 items-center justify-center bg-rose-500 rounded-full ring-2 ring-[#0F172A]" />
                )}
              </button>

              {/* Notifications Popover Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-md shadow-[0_16px_32px_rgba(2,6,23,0.35)] z-50 overflow-hidden text-left">
                  <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-[#5FA8FF] font-medium bg-[#1F3B75]/40 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        No new notifications.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {notifications.slice(0, 5).map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              handleNavClick("notifications");
                              setShowNotifications(false);
                            }}
                            className={`p-3 hover:bg-slate-800 transition-colors cursor-pointer flex gap-3 items-start ${!n.isRead ? "bg-slate-800/60" : ""}`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {getNotificationIcon(n.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-start gap-1">
                                <p className={`text-sm ${!n.isRead ? "font-semibold text-white" : "font-medium text-slate-200"} truncate`}>{n.title}</p>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{n.description}</p>
                              <span className="text-[10px] text-slate-500 font-medium mt-1 block">{n.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      handleNavClick("notifications");
                      setShowNotifications(false);
                    }}
                    className="w-full p-2 text-center text-xs font-medium text-[#5FA8FF] hover:bg-slate-800 border-t border-slate-700 transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            {/* Profile Control */}
            <div className="relative shrink-0" ref={profileRef}>
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 hover:bg-slate-800 rounded-md p-1 pr-2 transition-colors cursor-pointer h-9 border border-transparent hover:border-slate-700"
              >
                <div className="h-7 w-7 rounded-full bg-[#1F3B75] flex items-center justify-center text-white font-medium text-xs overflow-hidden shrink-0 border border-white/10">
                  {currentUser?.profileImage ? (
                    <img src={currentUser.profileImage} alt={currentUser.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white leading-none">
                    {currentUser?.name ? currentUser.name.split(" ")[0] : "Aditi"}
                  </p>
                </div>
                <ChevronDown className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${showProfile ? "rotate-180" : ""}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfile && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-[0_16px_32px_rgba(2,6,23,0.35)] z-50 overflow-hidden text-left">
                  
                  <div className="p-3 border-b border-slate-700 bg-slate-800/80">
                    <p className="text-sm font-semibold text-white truncate">{currentUser?.name || "Aditi Jadhav"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {currentUser?.email || "aditijadhav2828@gmail.com"}
                    </p>
                    <p className="text-xs text-[#5FA8FF] font-medium mt-1">
                      {currentUser?.role || "Lead Recruiting Admin"}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleNavClick("profile");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-[#5FA8FF]" />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick("users_roles");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Shield className="h-4 w-4 text-[#5FA8FF]" />
                      <span>Administration</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-700 py-1">
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-300 hover:bg-slate-800 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-700 bg-[#0F172A]">
          <div className="p-4 space-y-4">
            
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-100 placeholder-slate-400"
              />
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isTabActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      active 
                        ? "bg-[#1F3B75] text-white" 
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <div className="border-t border-slate-700 my-2 pt-2 flex flex-col gap-1">
                <button 
                  onClick={() => handleNavClick("email_templates")} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'email_templates' ? "bg-[#1F3B75] text-white" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  Email Templates
                </button>
                <button 
                  onClick={() => handleNavClick("integrations")} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'integrations' ? "bg-[#1F3B75] text-white" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  Integrations
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
