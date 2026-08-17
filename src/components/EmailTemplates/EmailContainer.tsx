import React from "react";
import { Mail, ShieldCheck, AlertCircle } from "lucide-react";

export const EmailContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-2xl mx-auto p-6 bg-white border border-slate-200 rounded-lg shadow-sm font-sans text-slate-800">
    <div className="flex items-center gap-2 mb-6 border-b pb-4">
      <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
        <span className="text-white font-black text-xs">E</span>
      </div>
      <span className="font-black text-slate-900">EncureIT ATS</span>
    </div>
    {children}
    <div className="mt-8 pt-4 border-t text-[10px] text-slate-500 text-center">
      © 2026 EncureIT Technologies. All rights reserved.
    </div>
  </div>
);
