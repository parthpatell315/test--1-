import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Save,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { AvatarUpload } from "./components/AvatarUpload";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { Admin } from "@/types";
import { settingsService } from "@/services/settings.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

interface MyAccountTabProps {
  profile: Admin;
  onRefresh: () => void;
}

export function MyAccountTab({ profile, onRefresh }: MyAccountTabProps) {
  const { checkAuth, logout } = useAuthStore();

  const [phone, setPhone] = useState(profile.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [location, setLocation] = useState(profile.uiSettings?.location || "");
  const [bio, setBio] = useState(profile.uiSettings?.bio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await settingsService.updateProfile({
        phone,
        avatarUrl,
        location,
        bio,
      });
      await checkAuth();
      onRefresh();
      toast.success("Profile saved successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    await settingsService.deleteAccount(password);
    toast.success("Account deleted. Logging out...");
    logout();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Upload Section */}
        <AvatarUpload
          currentAvatarUrl={avatarUrl}
          name={profile.name}
          onAvatarChange={(newUrl) => setAvatarUrl(newUrl)}
        />

        {/* Read-Only Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-200 bg-white">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Account Status
            </span>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              Active Member
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Member Since
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "July 2024"}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Last Active
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {profile.lastLoginAt
                ? new Date(profile.lastLoginAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now"}
            </div>
          </div>
        </div>

        {/* Editable Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" /> Full Name (Locked)
            </Label>
            <Input
              value={profile.name}
              disabled
              className="bg-slate-100/70 border-slate-200 text-xs font-semibold text-slate-700 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-400">
              Locked for identity & authorization records
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              (Locked)
            </Label>
            <Input
              value={profile.email || ""}
              disabled
              className="bg-slate-100/70 border-slate-200 text-xs font-semibold text-slate-700 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-400">
              Linked to authentication credentials
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
            </Label>
            <Input
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-xs border-slate-300 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location / City
            </Label>
            <Input
              placeholder="e.g. Mumbai, Ahmedabad, Manali"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-xs border-slate-300 font-medium"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-700">
                Bio / About
              </Label>
              <span className="text-[10px] text-slate-400">
                {bio.length}/500
              </span>
            </div>
            <Textarea
              placeholder="Brief description about your role or specialization..."
              maxLength={500}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="text-xs border-slate-300 resize-none font-normal"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Delete Account
          </Button>

          <Button
            id="settings-tab-save-btn"
            type="submit"
            disabled={isSaving}
            className="h-9 px-5 text-xs font-bold uppercase tracking-wider bg-[#FF4D00] hover:bg-[#EA580C] text-white shadow-xs rounded-lg flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" /> Save Profile
              </>
            )}
          </Button>
        </div>
      </form>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

