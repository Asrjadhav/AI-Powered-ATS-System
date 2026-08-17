/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LocalStorageService } from "../services/localStorageService";
import { 
  Shield, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Lock, 
  Check, 
  Clock, 
  Activity, 
  Download, 
  Edit2, 
  Key, 
  RefreshCw, 
  FileText, 
  Settings, 
  Eye,
  CheckSquare,
  Sparkles,
  AlertCircle,
  Hash,
  Fingerprint,
  X,
  Plus,
  Trash2,
  Search,
  MoreVertical,
  ShieldCheck,
  UserPlus,
  UserX,
  MailCheck,
  CalendarDays,
  Building2,
  LockKeyhole,
  Sliders,
  ChevronRight
} from "lucide-react";

interface UsersRolesViewProps {
  currentUser?: { email: string; name: string; role: string } | null;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  designation: string;
  role: string;
  manager: string;
  status: "Active" | "Inactive" | "Pending";
  lastLogin: string;
  createdOn: string;
  avatarColor: string;
  changePasswordOnFirstLogin?: boolean;
}

export default function UsersRolesView({ currentUser }: UsersRolesViewProps) {
  // Toast notifications for interactive mock feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  
  const triggerToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // State to track users. Initially has only Yogesh Adsul
  const [users, setUsers] = useState<UserRecord[]>(() => {
    const defaultUsers: UserRecord[] = [
      {
        id: "u-1",
        name: "Yogesh Adsul",
        email: "yogesh.adsul@encureit.com",
        phone: "+91 99999 99999",
        employeeId: "ENC-HR-001",
        department: "Human Resources",
        designation: "HR Manager",
        role: "System Administrator",
        manager: "System Board",
        status: "Active",
        lastLogin: "Today, 10:25 AM",
        createdOn: "15 June 2026",
        avatarColor: "bg-indigo-600 text-white",
        changePasswordOnFirstLogin: false
      }
    ];
    const stored = LocalStorageService.get<UserRecord[]>("ats_users", defaultUsers);
    return stored.length > 0 ? stored : defaultUsers;
  });

  useEffect(() => {
    LocalStorageService.set("ats_users", users);
  }, [users]);

  // Modal active states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeAdminActionModal, setActiveAdminActionModal] = useState<string | null>(null);
  const [userIdPendingDelete, setUserIdPendingDelete] = useState<string | null>(null);
  const [pending2FAReset, setPending2FAReset] = useState(false);

  // Selected records for viewing or editing
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [activeRowActionMenuId, setActiveRowActionMenuId] = useState<string | null>(null);

  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    employeeId: "",
    department: "Talent Acquisition",
    designation: "",
    role: "Recruiter",
    manager: "Yogesh Adsul",
    status: "Active" as "Active" | "Inactive" | "Pending",
    tempPassword: "",
    sendWelcomeEmail: true
  });

  const [editUserForm, setEditUserForm] = useState<UserRecord | null>(null);

  // Security Status metrics
  const securityMetrics = {
    passwordStrength: "Strong",
    mfa: "Enabled",
    lastPasswordChange: "22 June 2026",
    lastSuccessfulLogin: "Today, 10:25 AM",
    activeSessions: 1
  };

  // Read-only checkboxes for system permissions
  const systemPermissions = [
    { id: "p1", name: "Manage Jobs", desc: "Create / Edit / Close / Delete Jobs" },
    { id: "p2", name: "Manage Candidates", desc: "View & shortlists applicant dossiers" },
    { id: "p3", name: "Schedule Interviews", desc: "Proctor interview slots & sync calendars" },
    { id: "p4", name: "Manage Interviewers", desc: "Assign technical panel evaluators" },
    { id: "p5", name: "Send Emails", desc: "Disseminate invitations & status alerts" },
    { id: "p6", name: "Publish Jobs to External Portals", desc: "Syndicate roles to global boards" },
    { id: "p7", name: "Manage Integrations", desc: "Access API keys & communications hub" },
    { id: "p8", name: "Manage Reports", desc: "Generate metrics, hire ratios & analytics" },
    { id: "p9", name: "Manage AI Settings", desc: "Configure match scoring & resume parsing" },
    { id: "p10", name: "Manage Users & Roles", desc: "Control RBAC & workspace access rules" },
    { id: "p11", name: "Configure System Settings", desc: "System localization & core definitions" },
    { id: "p12", name: "Access Audit Logs", desc: "Inspect administrator & recruiter event lines" },
    { id: "p13", name: "Export Data", desc: "Download full application records & statistics" },
    { id: "p14", name: "Manage Recruitment Workflow", desc: "Modify steps, pipeline milestones & actions" }
  ];

  // Dummy activity timeline for Yogesh Adsul
  const recentActivities = [
    { id: "act-1", event: "Logged into ATS", time: "Today, 10:25 AM", type: "session" },
    { id: "act-2", event: "Published Java Backend Developer Job", time: "Yesterday, 3:14 PM", type: "publish" },
    { id: "act-3", event: "Scheduled Technical Interview", time: "14 July 2026, 11:00 AM", type: "interview" },
    { id: "act-4", event: "Connected LinkedIn Integration", time: "12 July 2026, 4:50 PM", type: "integration" },
    { id: "act-5", event: "Updated Recruitment Settings", time: "10 July 2026, 9:15 AM", type: "settings" }
  ];

  // Generate temporary password
  const handleGeneratePassword = (isEdit: boolean = false) => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    const all = uppercase + lowercase + numbers + special;
    
    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = 0; i < 6; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    
    if (isEdit && editUserForm) {
      // not applicable or for reset
    } else {
      setAddUserForm(prev => ({ ...prev, tempPassword: password }));
    }
    triggerToast(`🔑 Generated secure temporary password: ${password}`, "info");
  };

  // Submit new user
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.name || !addUserForm.email) {
      triggerToast("⚠️ Name and Email are required fields.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addUserForm.email)) {
      triggerToast("⚠️ Please enter a valid email address.", "warning");
      return;
    }

    const colors = [
      "bg-indigo-600 text-white",
      "bg-emerald-600 text-white",
      "bg-purple-600 text-white",
      "bg-amber-600 text-white",
      "bg-rose-600 text-white",
      "bg-sky-600 text-white",
      "bg-pink-600 text-white"
    ];

    const newUser: UserRecord = {
      id: `u-${Date.now()}`,
      name: addUserForm.name,
      email: addUserForm.email,
      phone: addUserForm.phone || "+91 XXXXX XXXXX",
      employeeId: addUserForm.employeeId || `ENC-${addUserForm.role.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      department: addUserForm.department,
      designation: addUserForm.designation || `${addUserForm.role} Professional`,
      role: addUserForm.role,
      manager: addUserForm.manager || "Yogesh Adsul",
      status: addUserForm.status,
      lastLogin: "Never",
      createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      changePasswordOnFirstLogin: true
    };

    setUsers(prev => [...prev, newUser]);
    setIsAddModalOpen(false);
    
    // Build simulated success details
    let successMessage = `👤 User ${newUser.name} created successfully!`;
    if (addUserForm.sendWelcomeEmail) {
      successMessage += " Simulating welcome email dispatch.";
    }
    triggerToast(successMessage, "success");

    // Reset Form
    setAddUserForm({
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      department: "Talent Acquisition",
      designation: "",
      role: "Recruiter",
      manager: "Yogesh Adsul",
      status: "Active",
      tempPassword: "",
      sendWelcomeEmail: true
    });
  };

  // Submit edited user
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserForm) return;

    setUsers(prev => prev.map(u => u.id === editUserForm.id ? editUserForm : u));
    setIsEditModalOpen(false);
    triggerToast(`✏️ Details updated for user: ${editUserForm.name}`, "success");
    setEditUserForm(null);
  };

  // Actions trigger helpers
  const handleResetPassword = (user: UserRecord) => {
    triggerToast(`✉️ Password reset instructions generated and sent to ${user.email}`, "success");
    setActiveRowActionMenuId(null);
  };

  const handleDeactivateToggle = (user: UserRecord) => {
    const currentStatus = user.status;
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    triggerToast(`🔒 User ${user.name} has been ${nextStatus === "Active" ? "Activated" : "Deactivated"}.`, "info");
    setActiveRowActionMenuId(null);
  };

  const handleDeleteUser = (userId: string, name: string, skipConfirm = false) => {
    if (!skipConfirm && userIdPendingDelete !== userId) {
      setUserIdPendingDelete(userId);
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    triggerToast(`🗑️ User ${name} has been removed from organization registries.`, "warning");
    setActiveRowActionMenuId(null);
    setUserIdPendingDelete(null);
  };

  // Filtered users for list display
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* Breadcrumb Section */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">
        <span>Administration</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300 font-extrabold">System Administrator</span>
      </div>

      {/* Toast Notification Container */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all transform translate-y-0 scale-100 ${
          toast.type === "success" 
            ? "bg-slate-950 border-emerald-500/20 text-white" 
            : toast.type === "warning" 
              ? "bg-rose-950 border-rose-900/50 text-rose-100" 
              : "bg-slate-900 border-indigo-500/20 text-indigo-100"
        }`}>
          {toast.type === "success" ? (
            <Check className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : toast.type === "warning" ? (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          ) : (
            <InfoIcon className="h-5 w-5 text-indigo-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 id="page-title-admin" className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <User className="h-7 w-7 text-indigo-600 shrink-0" />
            <span>System Administrator</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-3xl">
            Manage the primary administrator account, security permissions, system ownership and recruiter access.
          </p>
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center gap-3">
          <button 
            id="btn-add-user-top"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>➕ Add User</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Users */}
        <div id="kpi-total-users" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{users.length}</span>
            <span className="text-[11px] font-bold text-slate-400">Account{users.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, users.length * 10)}%` }} />
          </div>
        </div>

        {/* KPI 2: Active Users */}
        <div id="kpi-active-users" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Users</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {users.filter(u => u.status === "Active").length}
            </span>
            <span className="text-[11px] font-bold text-emerald-500/85">Online</span>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(users.filter(u => u.status === "Active").length / users.length) * 100}%` }} />
          </div>
        </div>

        {/* KPI 3: System Administrators */}
        <div id="kpi-system-admins" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Administrators</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {users.filter(u => u.role === "System Administrator").length}
            </span>
            <span className="text-[11px] font-bold text-slate-400">Primary</span>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* KPI 4: Account Status */}
        <div id="kpi-account-status" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Status</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Active</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-2">Authenticated SSO Verified</p>
        </div>
      </div>

      {/* Main Core Section Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card + Security Status */}
        <div className="space-y-8">
          
          {/* Component: Administrator Details */}
          <div id="card-admin-details" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                <span>Administrator Details</span>
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Photo & Basics */}
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div className="relative group shrink-0">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xs opacity-50" />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-lg">
                    <span className="font-display font-black text-xl text-white">YA</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-slate-950 dark:text-white leading-tight">
                    Yogesh Adsul
                  </h4>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                    HR Manager
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider mt-1.5 border border-purple-200/20">
                    <Shield className="h-3 w-3" />
                    <span>System Administrator</span>
                  </div>
                </div>
              </div>

              {/* Data rows list */}
              <div className="space-y-3.5 text-xs font-semibold">
                
                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-400 font-medium">Department</span>
                  <span className="text-slate-900 dark:text-slate-200">Human Resources</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-400 font-medium">Employee ID</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">ENC-HR-001</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-400 font-medium">Email Address</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono text-[11px]">yogesh.adsul@encureit.com</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-400 font-medium">Phone Number</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">+91 XXXXX XXXXX</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-400 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-mono font-bold text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ACTIVE
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/40 pb-2">
                  <span className="text-slate-400 font-medium">Last Login</span>
                  <span className="text-slate-900 dark:text-slate-200">Today, 10:25 AM</span>
                </div>

                <div className="flex justify-between items-center pb-1">
                  <span className="text-slate-400 font-medium">Account Created</span>
                  <span className="text-slate-900 dark:text-slate-200">15 June 2026</span>
                </div>

              </div>
            </div>
          </div>

          {/* Component: Security Status Card */}
          <div id="card-security-status" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-indigo-500" />
                <span>Security Status</span>
              </h3>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/30">
                <span className="text-slate-400 font-medium">Password Strength</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded text-[10px]">
                  {securityMetrics.passwordStrength}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/30">
                <span className="text-slate-400 font-medium">Two-Factor Authentication</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded text-[10px]">
                  {securityMetrics.mfa}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/30">
                <span className="text-slate-400 font-medium">Last Password Change</span>
                <span className="text-slate-900 dark:text-slate-200">{securityMetrics.lastPasswordChange}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/30">
                <span className="text-slate-400 font-medium">Last Successful Login</span>
                <span className="text-slate-900 dark:text-slate-200 font-mono">{securityMetrics.lastSuccessfulLogin}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">Active Session</span>
                <span className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 text-[10px] font-mono font-black">
                  {securityMetrics.activeSessions}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Columns (lg:col-span-2): System Permissions & Admin Actions & Account Activity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Component: System Permissions */}
          <div id="card-system-permissions" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-indigo-500" />
                <span>System Permissions</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                FULL ROOT PRIVILEGES
              </span>
            </div>

            <div className="p-6">
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-5">
                This administrator account acts as the primary root tenant controller. The following privileges are inherited and granted unconditionally:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {systemPermissions.map((perm) => (
                  <div key={perm.id} className="flex gap-3 items-start p-3 bg-slate-50/55 dark:bg-slate-850/40 border border-slate-200/40 dark:border-slate-800/30 rounded-lg">
                    <div className="h-5 w-5 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {perm.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal font-semibold">
                        {perm.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Component: Administrator Actions */}
          <div id="card-admin-actions" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-500" />
                <span>Administrator Actions</span>
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                
                {/* Action 1: Edit Profile */}
                <button 
                  onClick={() => {
                    setActiveAdminActionModal("edit-profile");
                    triggerToast("ℹ️ Loaded edit interface for Yogesh Adsul.", "info");
                  }}
                  className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs p-3 rounded-lg transition-all text-left group cursor-pointer"
                >
                  <Edit2 className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span>Edit Profile</span>
                </button>

                {/* Action 2: Change Password */}
                <button 
                  onClick={() => {
                    setActiveAdminActionModal("change-password");
                    triggerToast("ℹ️ Loaded system credentials change workflow.", "info");
                  }}
                  className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs p-3 rounded-lg transition-all text-left group cursor-pointer"
                >
                  <Key className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span>Change Password</span>
                </button>

                {/* Action 3: View Login Activity */}
                <button 
                  onClick={() => {
                    triggerToast("📊 Logged session lines queried and refreshed.", "success");
                  }}
                  className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs p-3 rounded-lg transition-all text-left group cursor-pointer"
                >
                  <Eye className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>View Login Activity</span>
                </button>

                {/* Action 4: Reset Two-Factor Authentication */}
                {pending2FAReset ? (
                  <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800 border border-amber-200/60 dark:border-amber-700/50 p-3 rounded-lg transition-all text-left">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      Reset 2FA for Yogesh Adsul?
                    </span>
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => {
                          triggerToast("🔒 Two-Factor security credentials marked for reset code generation.", "success");
                          setPending2FAReset(false);
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded cursor-pointer transition-all"
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setPending2FAReset(false)}
                        className="px-2 py-1 bg-slate-250 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded cursor-pointer transition-all hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setPending2FAReset(true);
                    }}
                    className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs p-3 rounded-lg transition-all text-left group cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 text-amber-500 group-hover:rotate-45 transition-transform" />
                    <span>Reset Two-Factor Authentication</span>
                  </button>
                )}

                {/* Action 5: Download Activity Report */}
                <button 
                  onClick={() => {
                    triggerToast("📥 Initiating download. Compiled secure CSV audit log downloaded.", "success");
                  }}
                  className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs p-3 rounded-lg transition-all text-left group cursor-pointer"
                >
                  <Download className="h-4 w-4 text-indigo-500 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Activity Report</span>
                </button>

              </div>
            </div>
          </div>

          {/* Component: Recent Account Activity Timeline */}
          <div id="card-recent-activity" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <span>Recent Account Activity</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">IP: 192.168.1.45</span>
            </div>

            <div className="p-6">
              <div className="relative border-l-2 border-slate-100 dark:border-slate-850 pl-6 space-y-6">
                {recentActivities.map((act) => (
                  <div key={act.id} className="relative group">
                    <div className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center group-hover:scale-125 transition-transform">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {act.event}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase font-mono ${
                          act.type === "session" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300" :
                          act.type === "integration" ? "bg-purple-50 text-purple-750 dark:bg-purple-950/20 dark:text-purple-300" :
                          act.type === "settings" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300" :
                          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        }`}>
                          {act.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{act.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SECTION: Searchable Users Table Area */}
      <div id="card-users-access-directory" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-xl shadow-xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div>
            <h3 className="font-display font-black text-base text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span>Users Directory</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Query active corporate workspace recruiter records, security roles, and system logins.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search name, email, department..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-8.5 pr-4 py-1.5 rounded-lg text-xs font-semibold focus:outline-hidden dark:text-slate-200"
              />
            </div>

            {/* Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Security Roles</option>
              <option value="System Administrator">System Administrator</option>
              <option value="Recruiter">Recruiter</option>
              <option value="HR Executive">HR Executive</option>
              <option value="Hiring Manager">Hiring Manager</option>
              <option value="Technical Interviewer">Technical Interviewer</option>
              <option value="Interview Coordinator">Interview Coordinator</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/40 border-b border-slate-100 dark:border-slate-800/80">
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-14 text-center">Profile</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name & Employee ID</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role & Designation</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    {/* Profile Avatar Column */}
                    <td className="px-6 py-4 text-center">
                      <div className={`h-8.5 w-8.5 rounded-full ${user.avatarColor} flex items-center justify-center font-bold text-xs font-mono shadow-inner mx-auto`}>
                        {user.name?.split(" ").map(n => n[0]).join("") || ""}
                      </div>
                    </td>

                    {/* Name & ID Column */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">{user.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold block mt-0.5">{user.employeeId}</span>
                    </td>

                    {/* Email Column */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">{user.email}</span>
                      <span className="text-[9.5px] text-slate-400 block mt-0.5 font-medium">{user.phone}</span>
                    </td>

                    {/* Department Column */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {user.department}
                    </td>

                    {/* Role & Designation Badge Column */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        user.role === "System Administrator" ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" :
                        user.role === "Hiring Manager" ? "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" :
                        user.role === "Technical Interviewer" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" :
                        user.role === "HR Executive" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" :
                        user.role === "Interview Coordinator" ? "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300" :
                        "bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        <Shield className="h-3 w-3 shrink-0" />
                        {user.role}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">{user.designation}</span>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                        user.status === "Active" 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" 
                          : user.status === "Inactive"
                            ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse"
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${
                          user.status === "Active" ? "bg-emerald-500" :
                          user.status === "Inactive" ? "bg-slate-400" : "bg-amber-500"
                        }`} />
                        {user.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Last Login Column */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {user.lastLogin}
                    </td>

                    {/* Dropdown Menu actions */}
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => {
                          setActiveRowActionMenuId(activeRowActionMenuId === user.id ? null : user.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-all"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeRowActionMenuId === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveRowActionMenuId(null)}
                          />
                          <div className="absolute right-6 top-10 z-50 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                            
                            {/* View Action */}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsViewModalOpen(true);
                                setActiveRowActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-500" />
                              <span>View Profile</span>
                            </button>

                            {/* Edit Action */}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setEditUserForm({ ...user });
                                setIsEditModalOpen(true);
                                setActiveRowActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Edit User</span>
                            </button>

                            {/* Reset Password Action */}
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left cursor-pointer"
                            >
                              <Key className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Reset Password</span>
                            </button>

                            {/* Deactivate Action */}
                            <button
                              onClick={() => handleDeactivateToggle(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left cursor-pointer"
                            >
                              <Lock className="h-3.5 w-3.5 text-amber-500" />
                              <span>{user.status === "Active" ? "Deactivate" : "Activate"}</span>
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                            {/* Delete Action */}
                            {userIdPendingDelete === user.id ? (
                              <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-100 dark:border-rose-900/30" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Sure?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUser(user.id, user.name, true);
                                    }}
                                    className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUserIdPendingDelete(null);
                                      setActiveRowActionMenuId(null);
                                    }}
                                    className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-250 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete User</span>
                              </button>
                            )}

                          </div>
                        </>
                      )}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-semibold text-xs">
                    No corporate user records match your filter criteria or search string.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: ADD NEW CORPORATE USER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 my-8">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-slate-950 dark:text-white tracking-tight">Add New Workspace User</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Provision corporate recruiters, interviewers or workspace viewer roles.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sneha Kulkarni"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                />
              </div>

              {/* Grid 2-col fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="sneha.k@encureit.com"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+91 90112 33445"
                    value={addUserForm.phone}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Employee ID</label>
                  <input 
                    type="text" 
                    placeholder="ENC-REC-002 (Optional)"
                    value={addUserForm.employeeId}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Department</label>
                  <select
                    value={addUserForm.department}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  >
                    <option value="Human Resources">Human Resources</option>
                    <option value="Talent Acquisition">Talent Acquisition</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product Management">Product Management</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Talent Partner"
                    value={addUserForm.designation}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Security Role</label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  >
                    <option value="Recruiter">Recruiter</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="Hiring Manager">Hiring Manager</option>
                    <option value="Technical Interviewer">Technical Interviewer</option>
                    <option value="Interview Coordinator">Interview Coordinator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                {/* Reporting Manager */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reporting Manager</label>
                  <input 
                    type="text" 
                    placeholder="Yogesh Adsul"
                    value={addUserForm.manager}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, manager: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</label>
                  <select
                    value={addUserForm.status}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, status: e.target.value as "Active" | "Inactive" | "Pending" }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

              </div>

              {/* Password Section */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Credentials Setting</label>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    placeholder="Generate secure temporary password"
                    value={addUserForm.tempPassword}
                    className="flex-1 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-300 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleGeneratePassword(false)}
                    className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-800 text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    Generate Password
                  </button>
                </div>

                {addUserForm.tempPassword && (
                  <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/10">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Password saved. User will be forced to update password on first session login.</span>
                  </p>
                )}

                {/* Checkbox settings */}
                <div className="space-y-2 pt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={addUserForm.sendWelcomeEmail}
                      onChange={(e) => setAddUserForm(prev => ({ ...prev, sendWelcomeEmail: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 border-slate-350 dark:border-slate-700 rounded focus:ring-indigo-500/30 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-650 dark:text-slate-350 select-none">Send Welcome Email containing connection link & temp credentials</span>
                  </label>
                </div>

              </div>

              {/* Form Actions Footer */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 dark:border-slate-750 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  Create User
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW WORKSPACE USER DOSSIER */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="font-display font-black text-sm text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span>User Security Dossier</span>
              </h3>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedUser(null);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dossier details */}
            <div className="p-6 space-y-5">
              
              <div className="flex items-center gap-4.5 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/30 dark:border-slate-800">
                <div className={`h-12 w-12 rounded-full ${selectedUser.avatarColor} flex items-center justify-center font-bold text-sm font-mono shadow`}>
                  {selectedUser.name?.split(" ").map(n => n[0]).join("") || ""}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950 dark:text-white leading-tight">{selectedUser.name}</h4>
                  <span className="text-[10px] text-slate-450 block mt-0.5">{selectedUser.designation}</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1 block">{selectedUser.role}</span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                
                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Employee ID</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">{selectedUser.employeeId}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Email Address</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono text-[11.5px]">{selectedUser.email}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Phone Number</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">{selectedUser.phone}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Department</span>
                  <span className="text-slate-900 dark:text-slate-200">{selectedUser.department}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Reporting Manager</span>
                  <span className="text-slate-900 dark:text-slate-200">{selectedUser.manager}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 font-mono text-[9.5px]">
                    {selectedUser.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Last Login</span>
                  <span className="text-slate-900 dark:text-slate-200">{selectedUser.lastLogin}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-800/20 pb-2">
                  <span className="text-slate-400 font-medium">Created On</span>
                  <span className="text-slate-900 dark:text-slate-200 font-mono">{selectedUser.createdOn}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Change Password on Login</span>
                  <span className="text-slate-900 dark:text-slate-200">{selectedUser.changePasswordOnFirstLogin ? "Yes (Forced)" : "No"}</span>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDIT WORKSPACE USER */}
      {isEditModalOpen && editUserForm && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="font-display font-black text-sm text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-500" />
                <span>Modify Recruiter Details</span>
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditUserForm(null);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Department</label>
                <select
                  value={editUserForm.department}
                  onChange={(e) => setEditUserForm(prev => prev ? ({ ...prev, department: e.target.value }) : null)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                >
                  <option value="Human Resources">Human Resources</option>
                  <option value="Talent Acquisition">Talent Acquisition</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Security Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm(prev => prev ? ({ ...prev, role: e.target.value }) : null)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                >
                  <option value="System Administrator">System Administrator</option>
                  <option value="Recruiter">Recruiter</option>
                  <option value="HR Executive">HR Executive</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                  <option value="Technical Interviewer">Technical Interviewer</option>
                  <option value="Interview Coordinator">Interview Coordinator</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Account Status</label>
                <select
                  value={editUserForm.status}
                  onChange={(e) => setEditUserForm(prev => prev ? ({ ...prev, status: e.target.value as "Active" | "Inactive" | "Pending" }) : null)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden dark:text-slate-200"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditUserForm(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN DIRECT ACTION MOCK WORKFLOWS */}
      {activeAdminActionModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="font-display font-black text-sm text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-500" />
                <span>
                  {activeAdminActionModal === "edit-profile" ? "Edit Superuser Profile" : "Change System Password"}
                </span>
              </h3>
              <button 
                onClick={() => setActiveAdminActionModal(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex gap-3 items-start bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                  You are adjusting administrative attributes for Yogesh Adsul. In production setups, these operations map to secure, SSO identity models.
                </p>
              </div>

              {activeAdminActionModal === "edit-profile" ? (
                <div className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue="Yogesh Adsul" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:outline-hidden dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Designation</label>
                    <input 
                      type="text" 
                      defaultValue="HR Manager" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:outline-hidden dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      defaultValue="+91 99999 99999" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:outline-hidden dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:outline-hidden dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Secure Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter new complex password" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:outline-hidden dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-2">
              <button 
                onClick={() => setActiveAdminActionModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setActiveAdminActionModal(null);
                  triggerToast("🔒 Saved changes successfully.");
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Draft
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Simple fallback icon to prevent missing imports
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
