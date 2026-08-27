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
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#ECECF0] font-sans p-3 sm:p-6 md:p-10 select-none">
      {/* Outer Card Wrapper */}
      <div className="w-full max-w-[1080px] bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* ─── LEFT HERO PANEL (Scenic Dusk Mountain + Tent) ─── */}
        <div
          className="lg:col-span-6 relative bg-cover bg-center p-8 sm:p-12 flex flex-col justify-between text-white min-h-[380px] lg:min-h-full"
          style={{ backgroundImage: `url('/camping_mountain_bg.png')` }}
        >
          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 pointer-events-none" />

          {/* Top Hero Text */}
          <div className="relative z-10 space-y-1">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white/90">
              One trip
            </h1>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#FF5400]">
              at a time.
            </h1>

            <div className="w-10 h-1 bg-[#FF5400] rounded-full my-4" />

            <p className="text-xs sm:text-sm font-medium text-white/80 max-w-xs leading-relaxed">
              The all-in-one ERP built for YouthCamping operations.
            </p>
          </div>


        </div>

        {/* ─── RIGHT FORM PANEL (Crisp White Overlapping Card Layout) ─── */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 md:p-14 flex flex-col justify-between relative">
          
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center">
              <img
                src="/logo.png"
                alt="YouthCamping Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="inline-block">
              <span className="text-[10px] font-extrabold tracking-widest text-[#FF5400] bg-[#FF4D00]/5/80 uppercase px-3.5 py-1 rounded-full border border-[#FF4D00]/30/50">
                ADMIN PORTAL
              </span>
            </div>
          </div>

          {view === "login" ? (
            /* ─── LOGIN FORM VIEW ─── */
            <div className="space-y-6 my-auto py-4">
              {/* Heading */}
              <div className="text-center space-y-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back!
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Sign in to access the YouthCamping ERP
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900">Unable to sign in</p>
                    <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
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
                      className="pl-10 h-11 text-xs rounded-xl border-slate-200 focus-visible:ring-[#FF5400] focus-visible:border-[#FF5400] bg-white font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
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
                      className="pl-10 pr-10 h-11 text-xs rounded-xl border-slate-200 focus-visible:ring-[#FF5400] focus-visible:border-[#FF5400] bg-white font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
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
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#FF5400] focus:ring-[#FF5400] w-4 h-4 accent-[#FF5400]"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot");
                      setErrorMessage(null);
                    }}
                    className="text-[#FF5400] font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#FF5400] to-[#FF3B00] hover:from-[#E04800] hover:to-[#E03300] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all active:scale-[0.99] disabled:opacity-70 mt-2 cursor-pointer"
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
            <div className="space-y-6 my-auto py-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Reset password
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Enter your admin email to receive reset instructions.
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
                      className="pl-10 h-11 text-xs rounded-xl border-slate-200 focus-visible:ring-[#FF5400] bg-white font-medium text-slate-900"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#FF5400] to-[#FF3B00] hover:from-[#E04800] hover:to-[#E03300] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all"
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#FF5400] transition-colors"
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
                  Secure access for authorized YouthCamping personnel
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-[#FF4D00]/5 border border-[#FF4D00]/20 text-[#FF5400] flex items-center justify-center shadow-2xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


