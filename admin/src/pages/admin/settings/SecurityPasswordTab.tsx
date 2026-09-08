import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Key,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { PasswordStrengthMeter } from "./components/PasswordStrengthMeter";
import { SessionTable } from "./components/SessionTable";
import { Admin, LoginSession } from "@/types";
import { settingsService } from "@/services/settings.service";
import { toast } from "sonner";

interface SecurityPasswordTabProps {
  profile: Admin;
  onRefresh: () => void;
}

export function SecurityPasswordTab({
  profile,
  onRefresh,
}: SecurityPasswordTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const list = await settingsService.getSessions();
      setSessions(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    try {
      setIsChanging(true);
      await settingsService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setIsChanging(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      await settingsService.logoutSession(sessionId);
      toast.success("Signed out of session");
      fetchSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to logout session");
    }
  };

  const handleLogoutAllOthers = async () => {
    try {
      const closed = await settingsService.logoutAllExceptCurrent();
      toast.success(`Signed out of ${closed} other device sessions`);
      fetchSessions();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to logout other devices",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Change Password Form */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="text-sm font-bold text-slate-900">
              Change Password & Authentication
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            {showPassword ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {showPassword ? "Hide" : "Show"} Passwords
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Current Password
            </Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="text-xs border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              New Password
            </Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="text-xs border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Confirm New Password
            </Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-xs border-slate-300"
            />
          </div>
        </div>

        <PasswordStrengthMeter password={newPassword} />

        <div className="flex justify-end pt-2">
          <Button
            id="settings-tab-save-btn"
            type="submit"
            disabled={
              isChanging || !newPassword || newPassword !== confirmPassword
            }
            className="h-9 px-5 text-xs font-bold uppercase tracking-wider bg-[#FF4D00] hover:bg-[#EA580C] text-white shadow-xs rounded-lg flex items-center gap-1.5"
          >
            {isChanging ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-1.5" />
            )}
            Update Password
          </Button>
        </div>
      </form>

      {/* Active Login Activity */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <SessionTable
          sessions={sessions}
          onLogoutSession={handleLogoutSession}
          onLogoutAllOthers={handleLogoutAllOthers}
          isLoading={isLoadingSessions}
        />
      </div>
    </div>
  );
}

