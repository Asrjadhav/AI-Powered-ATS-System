import React, { useState } from "react";
import { Mail, ArrowRight, RotateCcw } from "lucide-react";
import { ResetPasswordEmailTemplate } from "./EmailTemplates/ResetPasswordEmail";

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordView({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [view, setView] = useState<"form" | "preview">("form");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setView("preview");
  };

  return (
    <div className="w-full max-w-lg bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl text-white">
      <h2 className="text-2xl font-bold mb-4">{view === "form" ? "Forgot Password" : "Reset Password Email Preview"}</h2>
      
      {view === "form" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs font-medium text-rose-300">
              ⚠️ {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@encureit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
          >
            Send Reset Link <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full py-2 text-xs text-indigo-400 flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-3 w-3" /> Back to Login
          </button>
        </form>
      ) : (
        <div className="space-y-4">
            <p className="text-xs text-emerald-400">Password reset link has been sent to your registered email address.</p>
            <ResetPasswordEmailTemplate name="Jane Doe" />
            <button
                onClick={onBack}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
            >
                Back to Login
            </button>
        </div>
      )}
    </div>
  );
}
