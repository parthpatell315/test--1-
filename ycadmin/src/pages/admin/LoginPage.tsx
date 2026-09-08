import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  Lock,
  Mail,
  ShieldCheck,
  Compass,
  CreditCard,
  Users,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { BrandLogo, brandConfig } from "@/config/brand.config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "forgot">("login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");

  const { admin, isAuthenticated, login } = useAuthStore();
  const navigate = useNavigate();

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && admin) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, admin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/admin");
    } catch (error: any) {
      console.error("Login attempt failed:", error);
      let message = "Incorrect email or password.";
      if (!error.response) {
        message = "Cannot connect to server. Please check your network connection.";
      } else if (error.response.status === 401) {
        message = "Incorrect email or password.";
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post("/admin/forgot-password", {
        email: forgotEmail,
      });
      toast.success(
        res.data?.message || "Password reset instructions sent to your email!",
      );
      setView("login");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to process forgot password request.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100/80 font-sans p-3 sm:p-6 md:p-10 select-none">
      {/* Outer Card Wrapper */}
      <div className="w-full max-w-[1040px] bg-white rounded-2xl shadow-[0_12px_48px_rgba(15,23,42,0.08)] border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* ─── LEFT HERO PANEL (Modern Slate SaaS Showcase) ─── */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B1528] p-8 sm:p-12 flex flex-col justify-between text-white min-h-[360px] lg:min-h-full border-r border-slate-800/60">
          
          {/* Top Hero Brand */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-9 w-9" iconClassName="h-5 w-5" />
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white">
                  {brandConfig.name}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/15 border border-blue-500/30 rounded px-1.5 py-0.5 leading-none">
                  {brandConfig.badgeText}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Intelligent Travel Operations & ERP
              </h1>
              <p className="text-xs sm:text-sm font-normal text-slate-400 max-w-sm leading-relaxed">
                {brandConfig.tagline}
              </p>
            </div>

            {/* Value Proposition Badges */}
            <div className="pt-2 space-y-2.5 max-w-sm">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Centralized Booking & Passenger Manifests</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Real-time Departure & Vendor Management</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Automated P&L, Ledgers & Daily Cash Closing</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Role-Based Access Control & Full Audit Trail</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 pt-8 flex items-center gap-2 text-[11px] text-slate-400 border-t border-white/[0.08]">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>Enterprise-grade security and encrypted authentication</span>
          </div>
        </div>

        {/* ─── RIGHT FORM PANEL (Clean White Form Layout) ─── */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 md:p-14 flex flex-col justify-between relative">
          
          {/* Brand Header for Form */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center">
              <BrandLogo className="h-10 w-10" iconClassName="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-blue-600 bg-blue-50 uppercase px-3 py-1 rounded-full border border-blue-200">
                STAFF & ADMIN PORTAL
              </span>
            </div>
          </div>

          {view === "login" ? (
            /* ─── LOGIN FORM VIEW ─── */
            <div className="space-y-5 my-auto py-4">
              {/* Heading */}
              <div className="text-center space-y-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Sign in to your {brandConfig.name} workspace
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-900">Unable to sign in</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email address */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email" className="text-xs font-semibold text-slate-700">
                    Email address
                  </Label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10 h-10 text-xs rounded-lg border-slate-200 focus-visible:ring-blue-600 focus-visible:border-blue-600 bg-white font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <Input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-10 text-xs rounded-lg border-slate-200 focus-visible:ring-blue-600 focus-visible:border-blue-600 bg-white font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 w-4 h-4 accent-blue-600"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot");
                      setErrorMessage(null);
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-70 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>SIGNING IN...</span>
                    </>
                  ) : (
                    <>
                      <span>SIGN IN</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            /* ─── FORGOT PASSWORD VIEW ─── */
            <div className="space-y-5 my-auto py-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Reset password
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Enter your registered work email to receive password reset instructions.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs font-semibold text-slate-700">
                    Email address
                  </Label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10 h-10 text-xs rounded-lg border-slate-200 focus-visible:ring-blue-600 bg-white font-medium text-slate-900"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>SEND RESET INSTRUCTIONS</span>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>
              </div>
            </div>
          )}

          {/* Card Footer Divider & Lock Badge */}
          <div className="pt-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10.5px]">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Protected by role-based access control · Authorized users only
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



