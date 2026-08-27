import React, { useRef } from "react";
import { Upload, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  name: string;
  onAvatarChange: (newUrl: string) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  name,
  onAvatarChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAvatarChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onAvatarChange("");
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "YC";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
      <div className="relative group shrink-0">
        <div className="w-20 h-20 rounded-full border-2 border-[#FF4D00] bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] text-2xl font-bold uppercase overflow-hidden shadow-xs">
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-center sm:text-left">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-slate-800">Profile Photo</h4>
          <p className="text-[11px] text-slate-500">
            JPG, PNG or GIF. Maximum file size 5MB.
          </p>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-3 text-xs font-semibold border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Upload New Photo
          </Button>

          {currentAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 px-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

