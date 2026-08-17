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
  ChevronLeft
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { email: string; name: string; role: string; isFirstLogin?: boolean }) => void;
  onForgotPassword?: () => void;
}

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
        const res = await axios.post("/api/auth/login", { email, password });
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
        const res = await axios.post("/api/auth/forgot-password", { email });
        if (res.data.success) {
          setSuccess(res.data.message || "Password recovery instructions dispatched.");
          if (res.data.isSandbox) {
            setSandboxResetLink(res.data.resetLink);
            setSandboxPreviewUrl(res.data.previewUrl);
          }
        }
      } else if (view === "reset") {
        const res = await axios.post("/api/auth/reset-password", { token: resetToken, password });
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
      className="h-screen w-full text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-y-auto lg:overflow-hidden font-sans"
      style={{
        backgroundImage: 'linear-gradient(135deg, rgba(8, 12, 32, 0.35) 0%, rgba(18, 8, 40, 0.65) 100%), url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Glow highlight visual elements with beautiful backdrop-blur */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full bg-pink-500/10 blur-[100px]" />
      </div>

      {/* Top Banner: Elevated Platform Logo */}
      <div className="w-full max-w-md mx-auto text-center mt-2 lg:mt-4 relative z-10 shrink-0">
        <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-black text-base">E</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight">
                Encure<span className="text-indigo-300">IT</span>
              </span>
            </div>
            <p className="text-[8px] text-slate-300 uppercase tracking-widest font-mono font-bold">Talent Acquisition Workspace</p>
          </div>
        </div>
      </div>

      {/* Center content: Single Premium Glassmorphic Card */}
      <div className="w-full max-w-md my-auto relative z-10 px-1 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/[0.05] backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
          >
            {/* Colorful light leaks inside card */}
            <div className="absolute -top-[120px] left-[20%] w-[250px] h-[250px] rounded-full bg-indigo-500/20 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-[120px] right-[20%] w-[250px] h-[250px] rounded-full bg-purple-500/20 blur-[60px] pointer-events-none" />

            {/* Header Content */}
            <div className="mb-6 text-center relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10 text-indigo-300 font-mono text-[9px] font-bold tracking-wider uppercase mb-3 shadow-inner">
                <ShieldCheck className="h-3 w-3 text-indigo-400" />
                <span>Secure Recruiter Gateway</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {view === "login" && "Welcome Back"}
                {view === "forgot" && "Reset Password"}
                {view === "reset" && "Update Passcode"}
              </h2>
              
              <p className="text-slate-300 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                {view === "login" && "Access your smart candidate profiles, resume analytics, and automated schedules."}
                {view === "forgot" && "Provide your email address to initiate the secure recovery handshake."}
                {view === "reset" && "Update your credentials for secure workspace entry."}
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
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Authorization Error</span>
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
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Operation Successful</span>
                      <span>{success}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input fields form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              
              {/* Email Address */}
              {view !== "reset" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block pl-1">
                    Recruiter Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="hr@encureit.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/10 hover:border-white/20 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-white transition-all placeholder:text-slate-500 shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Password or resetToken input block */}
              {view !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">
                      {view === "reset" ? "New Security Password" : "Password"}
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
                        className="text-[10px] text-indigo-300 hover:text-indigo-200 font-bold cursor-pointer transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/10 hover:border-white/20 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-white transition-all placeholder:text-slate-500 shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Remember credentials checkbox */}
              {view === "login" && (
                <div className="flex items-center justify-between py-0.5 text-xs text-slate-300 select-none pl-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-slate-900 h-4.5 w-4.5 cursor-pointer transition-all"
                    />
                    <span className="group-hover:text-white transition-colors">Keep me signed in</span>
                  </label>
                </div>
              )}

              {/* Action Button with fine-tuned micro-animation */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_25px_rgba(99,102,241,0.3)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.45)] cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? "Authenticating Session..." : (
                  <>
                    {view === "login" && "Access Workspace"}
                    {view === "forgot" && "Send Recovery Link"}
                    {view === "reset" && "Update Password"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Sandbox Developer Recovery Helper Info */}
            <AnimatePresence>
              {view === "forgot" && (sandboxResetLink || sandboxPreviewUrl) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-4 bg-black/50 border border-indigo-500/30 rounded-2xl p-4 text-xs font-sans relative"
                >
                  <div className="absolute top-[-8px] right-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-[8px] font-mono uppercase font-black px-2 py-0.5 rounded-full text-white tracking-widest">
                    Sandbox Mode
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-indigo-300">
                    <Sparkles className="h-4 w-4 shrink-0 text-indigo-400 animate-pulse" />
                    <span className="font-bold">Local Simulated Recovery Link</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed mb-3">
                    As there is no external SMTP relay in our sandbox, you can click the shortcut button below to apply the reset password token immediately:
                  </p>
                  <div className="space-y-2">
                    {sandboxResetLink && (
                      <a
                        href={sandboxResetLink}
                        className="block text-center py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-xl transition-all font-semibold font-mono text-[10px]"
                      >
                        Apply Reset Token & Go
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Back to sign in triggers */}
            {view !== "login" && (
              <div className="mt-4 text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setError(null);
                    setSuccess(null);
                    setSandboxResetLink(null);
                    setSandboxPreviewUrl(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-indigo-300 font-semibold bg-transparent border-0 outline-none cursor-pointer transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            )}

            {/* Handshake security metadata */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-slate-400 relative z-10">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[9px] font-mono tracking-widest uppercase font-semibold">
                SECURED SYSTEM PORTAL
              </span>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Footer Credits */}
      <div className="w-full max-w-md mx-auto text-center mb-2 lg:mb-4 relative z-10 shrink-0">
        <p className="text-xs text-slate-300">
          Need recruiter credentials?{" "}
          <a
            href="mailto:support@encureit.com"
            className="text-indigo-300 hover:text-indigo-200 font-bold transition-colors underline underline-offset-4"
          >
            Contact ATS Support
          </a>
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <span>&copy; {new Date().getFullYear()} EncureIT Systems</span>
        </div>
      </div>
      
    </div>
  );
}


