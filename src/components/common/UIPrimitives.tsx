/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Standardized Reusable UI Primitives for EncureIT ATS
 */

import React from "react";

// 1. GLOBAL PAGE CONTAINER (Full Width, 28-32px top gap)
export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-8 space-y-5 sm:space-y-6 text-slate-800 dark:text-slate-100 transition-all select-none ${className}`}>
      {children}
    </div>
  );
}

// 2. PAGE HEADER (~70–80px height)
export function PageHeader({ 
  title, 
  subtitle, 
  actions 
}: { 
  title: string; 
  subtitle: string; 
  actions?: React.ReactNode 
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>{title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          {subtitle}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

// 3. COMPACT TOP KPI CARD (100–115px Height)
export function StatCard({
  title,
  value,
  icon: Icon,
  badgeText,
  badgeColor = "brand",
  subtitle,
  onClick
}: {
  title: string;
  value: string | number;
  icon: any;
  badgeText?: string;
  badgeColor?: "brand" | "blue" | "emerald" | "amber" | "rose";
  subtitle?: string;
  onClick?: () => void;
}) {
  const badgeStyles = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-950/50 border-brand-200",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 border-amber-200",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 border-rose-200"
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-3.5 h-[108px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-brand-600/50 transition-all ${
        onClick ? "cursor-pointer group" : ""
      } flex flex-col justify-between`}
    >
      <div className="flex justify-between items-start">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider truncate">{title}</span>
        <div className={`p-1 rounded-lg border ${badgeStyles[badgeColor]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none">{value}</h3>
        {subtitle && (
          <p className="text-[10.5px] text-slate-400 font-medium mt-1 truncate group-hover:text-brand-600 transition-colors">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// 4. SECONDARY ACTIVITY CARD (60–70px Height)
export function CompactActivityCard({
  title,
  value,
  badgeText,
  badgeColor = "brand",
  onClick
}: {
  title: string;
  value: string | number;
  badgeText: string;
  badgeColor?: "brand" | "blue" | "emerald" | "amber" | "rose";
  onClick?: () => void;
}) {
  const badgeStyles = {
    brand: "text-brand-600 bg-brand-50 border-brand-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    rose: "text-rose-600 bg-rose-50 border-rose-200"
  };

  return (
    <div
      onClick={onClick}
      className={`bg-slate-50/80 dark:bg-slate-950 p-3 h-[64px] rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs transition-all ${
        onClick ? "cursor-pointer hover:bg-white dark:hover:bg-slate-900" : ""
      }`}
    >
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">{title}</span>
        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${badgeStyles[badgeColor]}`}>
        {badgeText}
      </span>
    </div>
  );
}

// 5. STATUS BADGE (Pipeline & Job Statuses)
export function StatusBadge({ 
  status, 
  variant 
}: { 
  status: string; 
  variant?: "brand" | "success" | "warning" | "danger" | "neutral" 
}) {
  const normStatus = (status || "Applied").toLowerCase();
  
  let resolvedVariant = variant;
  if (!resolvedVariant) {
    if (normStatus.includes("shortlist") || normStatus.includes("hired") || normStatus.includes("joined") || normStatus.includes("accept")) {
      resolvedVariant = "success";
    } else if (normStatus.includes("interview") || normStatus.includes("screen") || normStatus.includes("offer") || normStatus.includes("review")) {
      resolvedVariant = "brand";
    } else if (normStatus.includes("pending") || normStatus.includes("discussion") || normStatus.includes("applied")) {
      resolvedVariant = "warning";
    } else if (normStatus.includes("reject") || normStatus.includes("withdrawn") || normStatus.includes("cancel")) {
      resolvedVariant = "danger";
    } else {
      resolvedVariant = "neutral";
    }
  }

  const variantStyles = {
    brand: "bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-950/50 dark:text-brand-400 dark:border-brand-900/40",
    success: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/40",
    warning: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/40",
    danger: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/40",
    neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
  };

  return (
    <span className={`inline-flex items-center gap-1 font-bold text-[10.5px] px-2 py-0.5 rounded-md border tracking-tight whitespace-nowrap ${variantStyles[resolvedVariant]}`}>
      {status}
    </span>
  );
}

// 6. SCORE BADGE (ATS Fit Score)
export function ScoreBadge({ score }: { score: number }) {
  let label = "Needs Review";
  let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
  
  if (score >= 80) {
    label = "High Match";
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
  } else if (score >= 65) {
    label = "Good Match";
    badgeStyle = "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800";
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${badgeStyle}`}>
        {score}%
      </span>
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden xl:inline">
        {label}
      </span>
    </div>
  );
}

// 7. BUTTON VARIANTS (34–38px Height)
export function PrimaryButton({ children, onClick, className = "", disabled }: { children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-xs px-3.5 py-2 h-9 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = "", disabled }: { children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs px-3.5 py-2 h-9 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick, className = "", disabled }: { children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 font-bold text-xs px-3.5 py-2 h-9 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs px-3 py-1.5 h-8 rounded-lg transition-all cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

// 8. SECTION HEADER
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-extrabold font-display text-slate-900 dark:text-white tracking-tight uppercase">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// 9. AI INSIGHT PANEL (#1F3B75 Dark Navy Accent Card)
export function AIInsightPanel({ title, description, children, className = "" }: { title: string; description?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gradient-to-br from-brand-950 via-slate-900 to-brand-900 text-white p-4 sm:p-5 rounded-xl border border-brand-800/80 shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5 font-mono">
          <span>✨</span>
          <span>{title}</span>
        </h4>
        <span className="text-[9px] font-mono font-bold bg-brand-500/30 text-brand-200 border border-brand-400/30 px-1.5 py-0.5 rounded">
          AI ENGINE
        </span>
      </div>
      {description && <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3">{description}</p>}
      {children}
    </div>
  );
}
