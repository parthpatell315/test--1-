import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  RotateCcw,
  Video,
  Film,
  Sparkles,
  X,
  GripVertical,
  Image as ImageIcon,
} from "lucide-react";

interface CTASliderEditorProps {
  draft: Record<string, any>;
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

export function CTASliderEditor({
  draft,
  onChange,
  onReset,
}: CTASliderEditorProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const title = draft.title ?? "Experience The Thrill Of Adventure";
  const showTitle = draft.showTitle !== false;

  // Media items array (videos and/or photos)
  const mediaList: string[] =
    Array.isArray(draft.mediaList) && draft.mediaList.length > 0
      ? draft.mediaList
      : draft.videoUrl
        ? [draft.videoUrl]
        : [
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=85",
          ];

  const activeMedia = mediaList[0] || "";
  const videoPosterUrl =
    draft.videoPosterUrl ||
    "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=1600&q=80";
  const borderRadius = draft.borderRadius || "rounded-[24px]";

  const addMedia = (url: string) => {
    if (!url) return;
    const updated = [...mediaList, url];
    onChange({ ...draft, mediaList: updated, videoUrl: updated[0] });
  };

  const addMultipleMedia = (urls: string[]) => {
    if (!urls || urls.length === 0) return;
    const updated = [...mediaList, ...urls];
    onChange({ ...draft, mediaList: updated, videoUrl: updated[0] });
  };

  const removeMedia = (index: number) => {
    const updated = mediaList.filter((_, i) => i !== index);
    const finalArr =
      updated.length > 0
        ? updated
        : [
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=85",
          ];
    onChange({ ...draft, mediaList: finalArr, videoUrl: finalArr[0] });
  };

  const isVideo = (url: string) =>
    url && (/\.(mp4|webm|mov|ogg)$/i.test(url) || url.includes("/video/"));
  const isYouTube = (url: string) => url && /youtube\.com|youtu\.be/.test(url);
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Live Preview Banner */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-[#D4541A] uppercase tracking-wider block flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#D4541A]" />
          CTA Slider Media Preview ({mediaList.length} Items)
        </Label>

        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-zinc-900 h-[240px] flex items-center justify-center shadow-md">
          {activeMedia ? (
            isYouTube(activeMedia) ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none rounded-inherit">
                <iframe
                  className="absolute top-1/2 left-1/2 w-[250%] h-[250%] max-w-none -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  src={`https://www.youtube.com/embed/${getYouTubeId(activeMedia)}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeId(activeMedia)}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1`}
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : isVideo(activeMedia) ? (
              <video
                src={activeMedia}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={activeMedia}
                alt="CTA Slider Preview"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="text-white text-xs font-bold flex flex-col items-center gap-2">
              <Film className="w-8 h-8 text-slate-400" />
              <span>No media file uploaded</span>
            </div>
          )}

          {/* Overlay Badge */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10.5px] font-bold flex items-center gap-1.5 border border-white/10">
            {isVideo(activeMedia) || isYouTube(activeMedia) ? (
              <Video className="w-3.5 h-3.5 text-[#D4541A]" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-green-500" />
            )}
            <span>
              {isVideo(activeMedia) || isYouTube(activeMedia)
                ? "Video Background"
                : "Photo Banner"}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Upload Media Section (Videos & Photos) */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-[#0B1528] uppercase tracking-wider block">
          Upload Videos & Photos (Single or Multiple)
        </Label>
        <p className="text-[11px] text-slate-500 font-medium">
          Upload video clips (.mp4, .webm, .mov) or photos (.jpg, .png, .webp).
          Multiple files will auto-slideshow on the website!
        </p>

        <ImageUpload
          label="DROP VIDEOS OR PHOTOS HERE"
          multiple={true}
          accept="*"
          onUpload={addMedia}
          onMultipleUpload={addMultipleMedia}
        />

        {/* Media Items List */}
        <div className="space-y-2 pt-1">
          {mediaList.map((url, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                {isYouTube(url) ? (
                  <div className="w-14 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-slate-200 shrink-0">
                    <Video className="w-5 h-5 text-slate-400" />
                  </div>
                ) : isVideo(url) ? (
                  <video
                    src={url}
                    muted
                    className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0B1528] truncate flex items-center gap-1.5">
                    {isVideo(url) || isYouTube(url) ? (
                      <Video className="w-3.5 h-3.5 text-[#D4541A]" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-green-600" />
                    )}
                    <span>
                      {isVideo(url) || isYouTube(url) ? "Video" : "Photo"}{" "}
                      {idx + 1} {idx === 0 && "(Active)"}
                    </span>
                  </p>
                  <p className="text-[10.5px] font-mono text-slate-400 truncate max-w-xs">
                    {url}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeMedia(idx)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors shrink-0"
                title="Remove media file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Direct Video URL Input */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-[#0B1528] uppercase tracking-wider block">
          Primary Video or Image Direct URL
        </Label>
        <Input
          type="text"
          value={activeMedia}
          onChange={(e) => {
            const val = e.target.value;
            const updated = [...mediaList];
            updated[0] = val;
            onChange({ ...draft, mediaList: updated, videoUrl: val });
          }}
          placeholder="https://example.com/video.mp4 or https://images.unsplash.com/..."
          className="h-10 text-xs font-mono rounded-xl border-slate-200 focus:border-[#D4541A]"
        />
      </div>

      {/* 3. Section Title Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#0B1528] uppercase tracking-wider block">
            Section Title (Optional)
          </Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Experience The Thrill Of Adventure"
            className="h-10 text-xs font-bold rounded-xl border-slate-200 focus:border-[#D4541A]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#0B1528] uppercase tracking-wider block">
            Container Border Radius
          </Label>
          <Select
            value={borderRadius}
            onValueChange={(val) => updateField("borderRadius", val)}
          >
            <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="Select radius" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="rounded-[16px]">Compact (16px)</SelectItem>
              <SelectItem value="rounded-[24px]">
                Medium Rounded (24px)
              </SelectItem>
              <SelectItem value="rounded-[32px]">
                Large Rounded (32px)
              </SelectItem>
              <SelectItem value="rounded-[44px]">Full Pill (44px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-3 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-8 px-4 text-xs font-bold text-slate-600 hover:text-[#0B1528] border-slate-200 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Reset
          Section
        </Button>
      </div>
    </div>
  );
}


