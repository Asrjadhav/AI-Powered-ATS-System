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
  Settings,
  ChevronRight,
  Sparkles,
  Link,
  Award,
  Mail,
  Database,
  ClipboardList
} from "lucide-react";
import { NotificationItem } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  onSimulateNotification: () => void;
  currentUser: { email: string; name: string; role: string; profileImage?: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  notifications, 
  onSimulateNotification, 
  currentUser, 
  onLogout 
}: SidebarProps) {
  const { t } = useTranslation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showCreditsMenu, setShowCreditsMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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

  // Define section-wise navigation items with explicit types
  const sections: {
    title: string;
    items: {
      id: string;
      label: string;
      icon: any;
      badgeCount?: number;
      showAIBadge?: boolean;
    }[];
  }[] = [
    {
      title: "Core Workspace",
      items: [
        { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
      ]
    },
    {
      title: "Recruitment & Hiring",
      items: [
        { id: "jobs", label: t("jobs"), icon: Briefcase },
        { id: "candidates", label: t("candidates"), icon: Users, showAIBadge: true },
        { id: "talent_pool", label: t("talent_pool"), icon: Database, showAIBadge: true },
        { id: "interviews", label: t("interviews"), icon: Calendar },
        { id: "offers", label: t("offers"), icon: Award },
        { id: "email_templates", label: "Email Templates", icon: Mail, showAIBadge: true },
      ]
    },
    {
      title: "Analytics & Strategy",
      items: [
        { id: "reports", label: t("reports"), icon: FileText },
        { id: "insights", label: t("insights"), icon: Compass, showAIBadge: true },
      ]
    },
    {
      title: "Administration",
      items: [
        { id: "integrations", label: "Integrations Hub", icon: Link },
        { id: "users_roles", label: "System Administrator", icon: Shield },
        { id: "profile", label: "Settings", icon: Settings },
      ]
    }
  ];

  const handleNavigate = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300 border-r border-slate-900 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate("dashboard")}>
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-900/45">
            <span className="text-white font-black text-xl">E</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-[18px] text-white tracking-tight">
                encure<span className="text-indigo-400">IT</span>
              </span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="AI Core Active" />
            </div>
            <span className="text-[11px] text-slate-400 tracking-wider uppercase font-semibold font-mono">Talent AI Console</span>
          </div>
        </div>
      </div>

      {/* Nav Groups / Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <h4 className="text-[12.5px] font-bold text-slate-500 uppercase tracking-widest px-3.5">
              {section.title}
            </h4>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[14.5px] font-medium tracking-wide transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm border-l-2 border-indigo-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                      <span className="tracking-tight">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/15 text-rose-400 rounded-md border border-rose-500/20 font-mono">
                          {item.badgeCount}
                        </span>
                      )}
                      {item.showAIBadge && (
                        <span className="text-[9px] bg-indigo-950 text-indigo-400 font-black px-1.5 py-0.2 rounded-sm border border-indigo-500/20 uppercase flex items-center gap-0.5">
                          <Sparkles className="h-2 w-2 text-indigo-400" />
                          <span>AI</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Dynamic System Infrastructure Info Panel (Persistent in Sidebar) */}
        <div className="pt-4 border-t border-slate-900">
          <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">SYSTEM ACTIVE</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">Gemini 3.5 Flash</p>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>AI MATCH CREDITS</span>
                <span className="text-indigo-400 font-bold">75% (750 Left)</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full w-3/4"></div>
              </div>
            </div>

            <button
              onClick={onSimulateNotification}
              className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bell className="h-3 w-3 animate-bounce" />
              <span>Simulate Notification</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Footer Section */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 shrink-0 relative">
        {/* Profile Popover / Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute left-4 bottom-20 right-4 bg-slate-950 border border-slate-900 rounded-xl p-3.5 shadow-2xl z-50 space-y-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[9px] text-slate-400 font-mono tracking-wider font-bold">PROFILE CONSOLE</span>
              <span className="text-[8px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.2 rounded-sm font-bold uppercase">Active</span>
            </div>
            
            <button
              onClick={() => {
                handleNavigate("profile");
                setShowProfileMenu(false);
              }}
              className="w-full py-2 px-2.5 hover:bg-slate-900 rounded-lg text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer transition-all border border-transparent hover:border-slate-800"
            >
              <Settings className="h-3.5 w-3.5 text-indigo-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setShowProfileMenu(false);
                onLogout();
              }}
              className="w-full py-2 px-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-bold tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Disconnect Console</span>
            </button>
          </div>
        )}

        {/* Profile Button */}
        <div 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center border border-indigo-400/30 overflow-hidden shrink-0 relative">
              {adminProfileImage ? (
                <img src={adminProfileImage} alt={adminName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="h-5 w-5 text-slate-100" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14.5px] font-bold text-slate-100 truncate">{adminName}</p>
              <p className="text-[12px] text-slate-400 truncate font-mono mt-0.5">{adminRole}</p>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:flex flex-col w-64 h-screen shrink-0 sticky top-0 z-40">
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Header/Top-Bar (Hidden on Desktop) */}
      <header className="lg:hidden w-full bg-slate-950 border-b border-slate-900 text-slate-300 h-14 flex items-center justify-between px-4 shrink-0 z-40 sticky top-0">
        <div className="flex items-center gap-2" onClick={() => handleNavigate("dashboard")}>
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-display font-extrabold text-sm text-white tracking-tight">
            encure<span className="text-indigo-400">IT</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button 
              onClick={() => handleNavigate("notifications")}
              className="relative p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white"
            >
              <Bell className="h-4.5 w-4.5 text-indigo-400" />
              <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>
          )}

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-hidden cursor-pointer"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* 3. Mobile Sidebar Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative flex flex-col w-4/5 max-w-sm h-full bg-slate-950 animate-slide-in-from-left">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 h-full overflow-y-auto">
              {renderSidebarContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
