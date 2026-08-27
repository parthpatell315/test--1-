import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Plus, X, GripVertical } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface PhotoItem {
  id: string;
  src: string;
  caption?: string;
}

interface RecentPhotosEditorProps {
  draft: Record<string, any>;
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

export function RecentPhotosEditor({
  draft,
  onChange,
  onReset,
}: RecentPhotosEditorProps) {
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");

  const photos: PhotoItem[] = draft.photos || [
    {
      id: "p1",
      src: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80",
      caption: "Snow Peak Camp",
    },
    {
      id: "p2",
      src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      caption: "Valley Pass Trail",
    },
    {
      id: "p3",
      src: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80",
      caption: "Spiti Monastery",
    },
    {
      id: "p4",
      src: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
      caption: "Campfire Night",
    },
  ];

  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const addPhoto = () => {
    if (!newUrl.trim()) return;
    const updated = [
      ...photos,
      { id: `p-${Date.now()}`, src: newUrl.trim(), caption: newCaption.trim() },
    ];
    updateField("photos", updated);
    setNewUrl("");
    setNewCaption("");
  };

  const removePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    updateField("photos", updated);
  };

  const updateCaption = (id: string, caption: string) => {
    const updated = photos.map((p) => (p.id === id ? { ...p, caption } : p));
    updateField("photos", updated);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Section Title Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Title Text
          </Label>
          <Input
            type="text"
            value={draft.titlePrimary ?? "Recent Photos"}
            onChange={(e) => updateField("titlePrimary", e.target.value)}
            placeholder="Recent Photos"
            className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#D97854] uppercase tracking-wider block flex items-center gap-1">
            <span>Accent Word</span>{" "}
            <span className="italic text-[#D97854] font-normal">
              (Italic Orange)
            </span>
          </Label>
          <Input
            type="text"
            value={draft.titleAccent ?? "From Our Trips"}
            onChange={(e) => updateField("titleAccent", e.target.value)}
            placeholder="From Our Trips"
            className="h-10 text-xs font-bold text-[#D97854] rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>
      </div>

      {/* Layout & View All Link Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Grid Layout
          </Label>
          <Select
            value={draft.layout || "grid"}
            onValueChange={(val) => updateField("layout", val)}
          >
            <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb]">
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="grid">Grid (6 Columns)</SelectItem>
              <SelectItem value="masonry">Masonry Layout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={draft.showViewAllLink !== false}
              onCheckedChange={(chk) => updateField("showViewAllLink", !!chk)}
            />
            <span className="text-xs font-bold text-[#1A2332]">
              Show "View All Photos" Link
            </span>
          </label>
        </div>
      </div>

      {/* Add New Photo Input / Gallery File Uploader */}
      <div className="space-y-2 pt-1">
        <ImageUpload
          label="UPLOAD PHOTOS FROM GALLERY (SINGLE OR BULK)"
          multiple={true}
          onUpload={(url) => {
            if (!url) return;
            const updated = [
              ...photos,
              { id: `p-${Date.now()}`, src: url, caption: "" },
            ];
            updateField("photos", updated);
          }}
          onMultipleUpload={(urls) => {
            if (!urls || urls.length === 0) return;
            const newPhotos = urls.map((u, i) => ({
              id: `p-${Date.now()}-${i}`,
              src: u,
              caption: "",
            }));
            updateField("photos", [...photos, ...newPhotos]);
          }}
        />
      </div>

      {/* Photos List */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-bold text-[#6b7280] uppercase tracking-wider block">
          Photos ({photos.length})
        </Label>
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 no-scrollbar">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-[#e5e7eb] bg-slate-50/50 hover:bg-white transition-all"
            >
              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
              <img
                src={photo.src}
                alt={photo.caption || "Photo"}
                className="w-12 h-12 rounded-xl object-cover border border-[#e5e7eb] shrink-0"
              />
              <Input
                type="text"
                value={photo.caption || ""}
                onChange={(e) => updateCaption(photo.id, e.target.value)}
                placeholder="Caption (optional)"
                className="h-8 text-xs font-medium rounded-lg border-[#e5e7eb]"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reset button */}
      <div className="pt-3 border-t border-[#e5e7eb]">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-8 px-4 text-xs font-bold text-[#6b7280] hover:text-[#1A2332] border-[#e5e7eb] rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#6b7280]" /> Reset to
          Default
        </Button>
      </div>
    </div>
  );
}
