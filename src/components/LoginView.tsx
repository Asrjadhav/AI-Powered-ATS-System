import React, { useState } from "react";
import axios from "axios";
import { LocalStorageService } from "../services/localStorageService";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { email: string; name: string; role: string; isFirstLogin?: boolean }) => void;
  onForgotPassword?: () => void;
}

const FASTAPI_BASE_URL = (import.meta as any).env?.VITE_FASTAPI_BASE_URL || (import.meta as any).env?.VITE_API_URL || "https://ats-fastapi-backend.onrender.com";
const apiConfig = {
  headers: {
    "X-Skip-Interceptor": "true",
    "Content-Type": "application/json",
  },
};

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [view, setView] = useState<"login" | "forgot" | "reset">(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("resetToken")) {
      return "reset";
    }
    return "login";
  });

  const [resetToken, setResetToken] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("resetToken") || "";
  });

  const [rememberMe, setRememberMe] = useState(() => {
    return LocalStorageService.get<string>("remember_credentials", "false") === "true";
  });

  const [email, setEmail] = useState(() => {
    if (LocalStorageService.get<string>("remember_credentials", "false") === "true") {
      return LocalStorageService.get<string>("remembered_email", "");
    }
    return "";
  });
  const [password, setPassword] = useState(() => {
    if (LocalStorageService.get<string>("remember_credentials", "false") === "true") {
      return LocalStorageService.get<string>("remembered_password", "");
    }
    return "";
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Sandbox preview hooks
  const [sandboxResetLink, setSandboxResetLink] = useState<string | null>(null);
  const [sandboxPreviewUrl, setSandboxPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSandboxResetLink(null);
    setSandboxPreviewUrl(null);
    setLoading(true);

    try {
      if (view === "login") {
        const res = await axios.post(`${FASTAPI_BASE_URL}/api/auth/login`, { email, password }, apiConfig);
        if (res.data.success) {
          if (rememberMe) {
            LocalStorageService.set("remember_credentials", "true");
            LocalStorageService.set("remembered_email", email);
            LocalStorageService.set("remembered_password", password);
          } else {
            LocalStorageService.remove("remember_credentials");
            LocalStorageService.remove("remembered_email");
            LocalStorageService.remove("remembered_password");
          }
          
          setSuccess("Login successful! Redirecting to recruitment workspace...");
          setTimeout(() => {
            onLoginSuccess(res.data.token, res.data.user);
          }, 800);
        }
      } else if (view === "forgot") {
        const res = await axios.post(`${FASTAPI_BASE_URL}/api/auth/forgot-password`, { email }, apiConfig);
        if (res.data.success) {
          setSuccess(res.data.message || "Password recovery instructions dispatched.");
          if (res.data.isSandbox) {
            setSandboxResetLink(res.data.resetLink);
            setSandboxPreviewUrl(res.data.previewUrl);
          }
        }
      } else if (view === "reset") {
        const res = await axios.post(`${FASTAPI_BASE_URL}/api/auth/reset-password`, { token: resetToken, password }, apiConfig);
        if (res.data.success) {
          setSuccess("Password updated successfully! Transitioning to login...");
          // Clean token from address bar
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => {
            setView("login");
            setPassword("");
            setResetToken("");
          }, 1800);
        }
      }
    } catch (err: any) {
      console.error("Auth action error:", err);
      setError(err.response?.data?.error || "An error occurred. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full bg-[#07111F] flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-y-auto font-sans selection:bg-[#2563EB] selection:text-white"
      style={{
        backgroundColor: '#07111F',
        backgroundImage: 'linear-gradient(180deg, rgba(7, 17, 31, 0.50) 0%, rgba(11, 21, 37, 0.65) 100%), url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Top Header: Enterprise Platform Logo */}
      <header className="w-full max-w-md mx-auto text-center mt-3 sm:mt-6 relative z-10 shrink-0">
        <div className="inline-flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-xl">
          <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm overflow-hidden shrink-0">
            <img src="/encureit_icon.png" alt="EncureIT Symbol" className="h-full w-full object-contain" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base text-white tracking-tight">
                Encure<span className="text-[#2563EB]">IT</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-medium">
              TALENT ACQUISITION WORKSPACE
            </p>
          </div>
        </div>
      </header>

      {/* Main Enterprise SaaS Authentication Panel (Clean White Card) */}
      <main className="w-full max-w-md my-auto relative z-10 px-1 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white border border-[#E2E8F0] p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/50 relative"
          >
            {/* Header Content */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-[#2563EB] text-[11px] font-semibold mb-3">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>Secure Gateway</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
                {view === "login" && "Welcome back"}
                {view === "forgot" && "Reset your password"}
                {view === "reset" && "Update password"}
              </h1>
              
              <p className="text-[#64748B] text-xs sm:text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
                {view === "login" && "Sign in to your recruiter account to continue."}
                {view === "forgot" && "Enter your work email address to receive password recovery details."}
                {view === "reset" && "Enter a new password for your account."}
              </p>
            </div>

            {/* Notifications */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">Authentication error</span>
                      <span>{error}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">Success</span>
                      <span>{success}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Work Email */}
              {view !== "reset" && (
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-[#334155] block pl-0.5">
                    Work Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#2563EB] transition-colors">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      disabled={loading}
                      placeholder="you@company.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] hover:border-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 rounded-xl text-sm font-normal text-[#0F172A] placeholder:text-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              {view !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-0.5">
                    <label htmlFor="password" className="text-xs font-semibold text-[#334155] block">
                      {view === "reset" ? "New Password" : "Password"}
                    </label>
                    
                    {view === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setView("forgot");
                          setError(null);
                          setSuccess(null);
                          setSandboxResetLink(null);
                          setSandboxPreviewUrl(null);
                        }}
                        className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold cursor-pointer transition-colors focus:outline-none focus:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#2563EB] transition-colors">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={loading}
                      placeholder="••••••••••••"
                      autoComplete={view === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#CBD5E1] hover:border-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 rounded-xl text-sm font-normal text-[#0F172A] placeholder:text-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Keep me signed in */}
              {view === "login" && (
                <div className="flex items-center justify-between py-1 text-xs select-none pl-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/20 h-4 w-4 cursor-pointer transition-all"
                    />
                    <span className="group-hover:text-slate-800 transition-colors text-xs font-medium text-[#475569]">Keep me signed in</span>
                  </label>
                </div>
              )}

              {/* Sign In Button (Professional Enterprise Blue) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2 mt-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <>
                    {view === "login" && "Sign In"}
                    {view === "forgot" && "Send Recovery Link"}
                    {view === "reset" && "Update Password"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Sandbox Developer Recovery Helper */}
            <AnimatePresence>
              {view === "forgot" && (sandboxResetLink || sandboxPreviewUrl) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs relative"
                >
                  <div className="absolute top-[-8px] right-3 bg-[#2563EB] text-[9px] font-mono uppercase font-semibold px-2 py-0.5 rounded-full text-white tracking-wider">
                    Sandbox Mode
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-[#2563EB]">
                    <Sparkles className="h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="font-semibold">Simulated Recovery Link</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed mb-3">
                    Click below to apply the reset password token in sandbox mode:
                  </p>
                  <div>
                    {sandboxResetLink && (
                      <a
                        href={sandboxResetLink}
                        className="block text-center py-2 px-3 bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 rounded-lg transition-all font-mono text-xs font-medium"
                      >
                        Apply Reset Token & Go
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Return to Sign In button */}
            {view !== "login" && (
              <div className="mt-4 text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setError(null);
                    setSuccess(null);
                    setSandboxResetLink(null);
                    setSandboxPreviewUrl(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#2563EB] font-medium bg-transparent border-0 outline-none cursor-pointer transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            )}

            {/* Subtle Secured Portal Indicator inside card */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[#64748B] text-xs font-medium">
              <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>Secured System Portal</span>
            </div>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer outside card */}
      <footer className="w-full max-w-md mx-auto text-center mb-3 sm:mb-6 relative z-10 shrink-0">
        <p className="text-xs text-slate-300">
          Need help signing in?{" "}
          <a
            href="mailto:support@encureit.com"
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors underline underline-offset-4"
          >
            Contact your administrator
          </a>
        </p>
        <div className="mt-2 text-[11px] text-slate-400">
          <span>&copy; {new Date().getFullYear()} EncureIT Systems</span>
        </div>
      </footer>
      
    </div>
  );
}
