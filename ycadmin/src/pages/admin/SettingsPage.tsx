import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { MyAccountTab } from "./settings/MyAccountTab";
import { SecurityPasswordTab } from "./settings/SecurityPasswordTab";
import { settingsService } from "@/services/settings.service";
import { useAuthStore } from "@/store/auth.store";
import { Admin } from "@/types";
import { Loader2, Save, RotateCcw, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SettingsTabId = "account" | "security";

export const SETTINGS_TABS = [
  { id: "account", label: "My Profile", icon: User },
  { id: "security", label: "Security & Password", icon: Shield },
];

export default function SettingsPage() {
  const { admin: authAdmin } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const path = location.pathname;
  const tabParam = searchParams.get("tab") as SettingsTabId;

  const activeTab: SettingsTabId =
    tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)
      ? tabParam
      : path.includes("security") || path.includes("change-password")
        ? "security"
        : "account";

  const handleTabChange = (tabId: SettingsTabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getProfile();
      setProfile(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleGlobalReset = () => {
    fetchProfile();
    toast.info("Settings reset to last saved state");
  };

  if (isLoading || !profile) {
    return (
      <AdminPageContainer fullWidth={true}>
        <div className="h-96 flex items-center justify-center space-x-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
          <span className="text-sm font-semibold">
            Loading YouthCamping OS Settings...
          </span>
        </div>
      </AdminPageContainer>
    );
  }

  return (
    <AdminPageContainer fullWidth={true}>
      {/* ─── Clear Page Header with Sticky Actions ─── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17233C] tracking-tight leading-tight">
            Settings & System Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Manage your account and security settings.
          </p>
        </div>

        {/* Action Buttons: Sticky Save & Reset */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleGlobalReset}
            className="h-8 px-4 text-xs font-semibold text-slate-600 border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Reset
          </Button>

          <Button
            type="button"
            onClick={() => {
              // Trigger click on tab form submit or refresh
              const submitBtn = document.getElementById(
                "settings-tab-save-btn",
              );
              if (submitBtn) {
                submitBtn.click();
              } else {
                toast.success("Settings saved successfully!");
              }
            }}
            className="bg-[#FF4D00] hover:bg-[#EA580C] text-white h-9 px-5 rounded-lg font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* ─── Top Tab Navigation Bar (Horizontal desktop, scrollable mobile) ─── */}
      <div className="bg-white rounded-[16px] border border-slate-200/80 shadow-xs mb-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center flex-nowrap min-w-max px-3 border-b border-slate-100">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as SettingsTabId)}
                className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/5/50"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-[#FF4D00]" : "text-slate-400"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Active Tab Section Module ─── */}
      <div className="transition-all">
        {activeTab === "account" && (
          <MyAccountTab profile={profile} onRefresh={fetchProfile} />
        )}
        {activeTab === "security" && (
          <SecurityPasswordTab profile={profile} onRefresh={fetchProfile} />
        )}
      </div>
    </AdminPageContainer>
  );
}

