import React, { useState } from "react";
import { Search, ChevronDown, Check, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`ats-enterprise-page w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5 text-slate-900 bg-slate-50 min-h-screen ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function StatCard({ title, value, icon: Icon, badgeText, badgeColor = "brand", subtitle, onClick }: any) {
  return (
    <div onClick={onClick} className={`bg-white p-4 h-[104px] rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between ${onClick ? "cursor-pointer hover:border-[#1F3B75]/30 hover:shadow-md transition-all duration-200" : ""}`}>
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-slate-500 truncate">{title}</span>
        <div className="p-1.5 rounded-md bg-slate-50 text-slate-400">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-semibold text-slate-900">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

export function StatusBadge({ status, variant = "neutral" }: any) {
  const normStatus = (status || "").toLowerCase();
  let v = variant;
  if (variant === "neutral") {
    if (normStatus.includes("hired") || normStatus.includes("success") || normStatus.includes("joined") || normStatus.includes("offer")) v = "success";
    else if (normStatus.includes("reject") || normStatus.includes("cancel") || normStatus.includes("fail")) v = "danger";
    else if (normStatus.includes("interview") || normStatus.includes("screen") || normStatus.includes("review")) v = "brand";
    else if (normStatus.includes("pending")) v = "warning";
  }
  
  const styles: any = {
    brand: "bg-[#1F3B75]/10 text-[#1F3B75] border-[#1F3B75]/20",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-50 text-slate-600 border-slate-200"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[v]}`}>{status}</span>;
}

export function ScoreBadge({ score }: { score: number }) {
  const style = score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : score >= 60 ? "bg-[#1F3B75]/10 text-[#1F3B75] border-[#1F3B75]/20" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${style}`}>{score}%</span>;
}

export function Button({ children, onClick, variant = "primary", className = "", disabled, icon: Icon }: any) {
  const styles: any = {
    primary: "bg-[#1F3B75] hover:bg-[#152a55] text-white border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white border-transparent",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 px-4 h-9 rounded-md text-sm font-medium border shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Input({ placeholder, value, onChange, className = "", icon: Icon, ...props }: any) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />}
      <input value={value} onChange={onChange} placeholder={placeholder} className={`w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1F3B75] focus:outline-none focus:ring-1 focus:ring-[#1F3B75] ${Icon ? "pl-9" : ""}`} {...props} />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: any) {
  return <Input icon={Search} value={value} onChange={onChange} placeholder={placeholder} />;
}

export function Select({ value, onChange, options, className = "" }: any) {
  return (
    <div className={`relative ${className}`}>
      <SearchableSelect value={value} onChange={onChange} className="w-full h-9 appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-900 focus:border-[#1F3B75] focus:outline-none focus:ring-1 focus:ring-[#1F3B75]">
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </SearchableSelect>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

export function FilterBar({ children, className = "" }: any) {
  return <div className={`flex flex-col sm:flex-row items-center gap-3 bg-white p-3 border border-slate-200 rounded-md shadow-sm ${className}`}>{children}</div>;
}

export function DataTable({ columns, data, onRowClick, className = "" }: any) {
  return (
    <div className={`w-full overflow-x-auto border border-slate-200 rounded-md bg-white shadow-sm ${className}`}>
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
          <tr>
            {columns.map((col: any, i: number) => (
              <th key={i} className="px-6 py-3">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">No data available</td></tr>
          ) : (
            data.map((row: any, i: number) => (
              <tr key={i} onClick={() => onRowClick && onRowClick(row)} className={`group ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""} bg-white`}>
                {columns.map((col: any, j: number) => (
                  <td key={j} className="px-6 py-3">{col.render ? col.render(row) : row[col.accessor]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({ tabs, activeTab, onChange }: any) {
  return (
    <div className="flex items-center gap-6 border-b border-slate-200 w-full overflow-x-auto no-scrollbar">
      {tabs.map((tab: any) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-[#1F3B75] text-[#1F3B75]" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, src, size = "md", className = "" }: any) {
  const sizes: any = { sm: "h-6 w-6 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  const initials = name ? name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "?";
  return (
    <div className={`rounded-full bg-[#1F3B75] text-white flex items-center justify-center font-medium overflow-hidden shrink-0 ${sizes[size]} ${className}`}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }: any) {
  if (!isOpen) return null;
  const sizes: any = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl", full: "max-w-[95vw]" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-xl w-full flex flex-col max-h-[90vh] ${sizes[size]}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><AlertCircle className="h-5 w-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ isOpen, onClose, title, children, footer }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: any) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 px-4 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
      {Icon && <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-4"><Icon className="h-8 w-8" /></div>}
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ message = "Loading..." }: any) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#1F3B75]" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function ErrorState({ title = "Error", message, onRetry }: any) {
  return (
    <div className="w-full p-6 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-semibold text-rose-800">{title}</h4>
        <p className="text-sm text-rose-600 mt-1">{message}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry} className="mt-4 !h-8 text-xs">Try Again</Button>}
      </div>
    </div>
  );
}

export function AIInsightPanel({ title, description, children, className = "" }: any) {
  return (
    <div className={`bg-[#F4F7FB] border border-[#1F3B75]/20 p-5 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#1F3B75]">✨</span>
        <h4 className="text-sm font-semibold text-[#1F3B75] uppercase tracking-wide">{title}</h4>
      </div>
      {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
      {children}
    </div>
  );
}

export function ActionMenu({ options }: any) {
  return null; // Implemented dynamically in views
}

export function Pagination({ currentPage, totalPages, onPageChange }: any) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button variant="secondary" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
        <Button variant="secondary" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div><p className="text-sm text-slate-700">Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span></p></div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        </div>
      </div>
    </div>
  );
}

// Temporary exports for compatibility with existing imports
export const PrimaryButton = (props: any) => <Button variant="primary" {...props} />;
export const SecondaryButton = (props: any) => <Button variant="secondary" {...props} />;
export const DangerButton = (props: any) => <Button variant="danger" {...props} />;
export const GhostButton = (props: any) => <Button variant="ghost" {...props} />;
export const CompactActivityCard = StatCard;
