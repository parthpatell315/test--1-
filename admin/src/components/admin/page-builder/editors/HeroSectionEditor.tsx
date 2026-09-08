import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Sparkles,
  X,
  Plus,
  GripVertical,
  Type,
  Palette,
  Maximize2,
  Sliders,
  Layers,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface HeroSectionEditorProps {
  draft: Record<string, any>;
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

export function HeroSectionEditor({
  draft,
  onChange,
  onReset,
}: HeroSectionEditorProps) {
  const updateField = (field: string, value: any) => {
    if (field === "headlinePrefix") {
      onChange({ ...draft, headlinePrefix: value, headline: value });
    } else {
      onChange({ ...draft, [field]: value });
    }
  };

  const tagline = draft.tagline !== undefined ? draft.tagline : "";
  const headlinePrefix =
    draft.headlinePrefix !== undefined
      ? draft.headlinePrefix
      : draft.headline || "";
  const strikethroughWord =
    draft.strikethroughWord !== undefined ? draft.strikethroughWord : "";

  const rotatingWordsArray: string[] = Array.isArray(draft.rotatingWords)
    ? draft.rotatingWords
    : typeof draft.rotatingWords === "string"
      ? draft.rotatingWords
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

  const subheadline = draft.subheadline !== undefined ? draft.subheadline : "";

  // Background images array (single or multiple)
  const backgroundImages: string[] =
    Array.isArray(draft.backgroundImages) && draft.backgroundImages.length > 0
      ? draft.backgroundImages
      : draft.backgroundImage
        ? [draft.backgroundImage]
        : [
            "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1800&q=85",
          ];

  const activeBgImage = backgroundImages[0] || "";

  // 1. Typography Settings
  const headingSize: number = Number(
    draft.headingSize || draft.fontSizePx || 42,
  ); // 28 to 56
  const fontFamily: string = draft.fontFamily || "Montserrat";
  const accentColor: string = draft.accentColor || "#D97854";

  // 2. Spacing & Height Settings
  const heroHeight: number = Number(
    draft.heroHeight || draft.heroHeightPx || 460,
  ); // 300 to 800
  const topPadding: number = Number(draft.topPadding || draft.paddingTop || 32); // 0 to 100
  const bottomPadding: number = Number(
    draft.bottomPadding || draft.paddingBottom || 32,
  ); // 0 to 100

  // 3. Fade & Overlay Settings
  const fadeColor: string = draft.fadeColor || draft.overlayTheme || "white"; // white, black, navy, gradient
  const fadeOpacity: number = Number(
    draft.fadeOpacity || draft.overlayOpacity || 60,
  ); // 0 to 100
  const fadeDirection: string =
    draft.fadeDirection || draft.overlayDirection || "left-right"; // left-right, right-left, top-bottom, bottom-top, center-out

  const monthsArray: string[] = Array.isArray(draft.months)
    ? draft.months
    : [
        "All",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
      ];

  const handleRotatingWordsChange = (valStr: string) => {
    const arr = valStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField("rotatingWords", arr);
  };

  const handleMonthsChange = (valStr: string) => {
    const arr = valStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField("months", arr);
  };

  const addBgImage = (url: string) => {
    if (!url) return;
    const updated = [...backgroundImages, url];
    onChange({
      ...draft,
      backgroundImages: updated,
      backgroundImage: updated[0],
    });
  };

  const addMultipleBgImages = (urls: string[]) => {
    if (!urls || urls.length === 0) return;
    const updated = [...backgroundImages, ...urls];
    onChange({
      ...draft,
      backgroundImages: updated,
      backgroundImage: updated[0],
    });
  };

  const removeBgImage = (index: number) => {
    const updated = backgroundImages.filter((_, i) => i !== index);
    const finalArr =
      updated.length > 0
        ? updated
        : [
            "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1800&q=85",
          ];
    onChange({
      ...draft,
      backgroundImages: finalArr,
      backgroundImage: finalArr[0],
    });
  };

  // Preset Applier
  const applyPreset = (preset: "light" | "medium" | "dark" | "none") => {
    switch (preset) {
      case "light":
        onChange({
          ...draft,
          fadeColor: "white",
          fadeOpacity: 30,
          fadeDirection: "left-right",
          overlayTheme: "white",
        });
        break;
      case "medium":
        onChange({
          ...draft,
          fadeColor: "white",
          fadeOpacity: 60,
          fadeDirection: "left-right",
          overlayTheme: "white",
        });
        break;
      case "dark":
        onChange({
          ...draft,
          fadeColor: "black",
          fadeOpacity: 85,
          fadeDirection: "left-right",
          overlayTheme: "dark",
        });
        break;
      case "none":
        onChange({
          ...draft,
          fadeColor: "white",
          fadeOpacity: 0,
          fadeDirection: "left-right",
          overlayTheme: "none",
        });
        break;
    }
  };

  // Helper gradient style for preview
  const getGradientStyle = () => {
    const alpha = fadeOpacity / 100;
    let rgb = "255, 255, 255";
    if (fadeColor === "black") rgb = "0, 0, 0";
    if (fadeColor === "navy") rgb = "26, 35, 50";

    if (fadeColor === "gradient") {
      return {
        background: `linear-gradient(to right, rgba(26, 35, 50, ${alpha}) 0%, rgba(217, 120, 84, ${alpha * 0.4}) 50%, rgba(255, 255, 255, ${alpha * 0.2}) 100%)`,
      };
    }

    switch (fadeDirection) {
      case "right-left":
        return {
          background: `linear-gradient(to left, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, ${alpha * 0.3}) 100%)`,
        };
      case "top-bottom":
        return {
          background: `linear-gradient(to bottom, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, ${alpha * 0.3}) 100%)`,
        };
      case "bottom-top":
        return {
          background: `linear-gradient(to top, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, ${alpha * 0.3}) 100%)`,
        };
      case "center-out":
        return {
          background: `radial-gradient(circle, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, ${alpha * 0.2}) 100%)`,
        };
      default: // left-right
        return {
          background: `linear-gradient(to right, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, ${alpha * 0.6}) 55%, rgba(${rgb}, ${alpha * 0.2}) 100%)`,
        };
    }
  };

  const isWhiteTheme = fadeColor === "white";

  return (
    <div className="space-y-6 font-sans">
      {/* ─── LIVE HERO PREVIEW BANNER ─── */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-[#D97854] uppercase tracking-wider block flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D97854]" />
            Live Hero Preview ({fadeColor.toUpperCase()} FADE • {fadeOpacity}%)
          </span>
          <span className="text-[10.5px] font-mono text-slate-400">
            Height: {heroHeight}px • Padding: {topPadding}px/{bottomPadding}px
          </span>
        </Label>

        <div
          className={`relative w-full rounded-2xl overflow-hidden border p-6 sm:p-8 min-h-[220px] flex flex-col justify-center transition-all ${
            isWhiteTheme
              ? "bg-white border-[#e5e7eb] text-[#1A2332] shadow-xs"
              : "bg-zinc-900 border-zinc-700 text-white shadow-lg"
          }`}
          style={{
            paddingTop: `${Math.max(16, topPadding * 0.6)}px`,
            paddingBottom: `${Math.max(16, bottomPadding * 0.6)}px`,
          }}
        >
          {/* Background Image or Video Preview */}
          {activeBgImage && (
            <div className="absolute inset-0 z-0">
              {/\.(mp4|webm|mov|ogg)$/i.test(activeBgImage) ||
              activeBgImage.includes("/video/") ? (
                <video
                  src={activeBgImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={activeBgImage}
                  alt="Hero background"
                  className="w-full h-full object-cover"
                />
              )}
              <div
                className="absolute inset-0 z-10 pointer-events-none transition-all"
                style={getGradientStyle()}
              />
            </div>
          )}

          <div className="relative z-20 space-y-3 max-w-2xl mx-auto text-center">
            {/* Pill Tagline Badge */}
            {tagline && (
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#FF4D00]/5 text-[#D4541A] font-extrabold text-[10.5px] uppercase tracking-widest border border-[#FF4D00]/20/80 shadow-2xs">
                  {tagline}
                </span>
              </div>
            )}

            {/* Headline with Live Font Size */}
            <h2
              className={`font-black uppercase tracking-tight leading-none ${isWhiteTheme ? "text-[#0B1528]" : "text-white"}`}
              style={{ fontSize: `${Math.max(24, headingSize * 0.75)}px` }}
            >
              <div>{headlinePrefix}</div>
              {(Boolean(strikethroughWord) ||
                rotatingWordsArray.length > 0) && (
                <div className="flex items-center justify-center gap-2 flex-wrap mt-1">
                  {strikethroughWord ? (
                    <span
                      className={`relative inline-block ${isWhiteTheme ? "text-[#0B1528]" : "text-white"}`}
                    >
                      {strikethroughWord}
                      <svg
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-[112%] h-[20px] pointer-events-none"
                        style={{ color: accentColor }}
                        viewBox="0 0 120 30"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M 3 17 C 35 4, 85 24, 117 11"
                          stroke="currentColor"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                  {rotatingWordsArray.length > 0 ? (
                    <span className="font-black text-[#D4541A]">
                      {rotatingWordsArray[0]}
                    </span>
                  ) : null}
                </div>
              )}
            </h2>

            {/* Orange Divider Line Bar */}
            <div className="w-12 h-1 bg-[#D4541A] rounded-full mx-auto my-2" />

            {/* Subheadline */}
            <p
              className={`text-xs sm:text-sm font-semibold leading-relaxed max-w-xl mx-auto ${isWhiteTheme ? "text-zinc-600" : "text-zinc-300"}`}
            >
              {subheadline}
            </p>
          </div>
        </div>
      </div>

      {/* ─── FORM CONTENT ─── */}

      {/* 1. Tagline */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Tagline (Small Uppercase Header)
        </Label>
        <Input
          type="text"
          value={tagline}
          onChange={(e) => updateField("tagline", e.target.value)}
          placeholder="e.g. EXPLORE. CONNECT. BELONG."
          className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
        />
      </div>

      {/* 2. Headline Prefix & Strikethrough Word */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Headline Prefix
          </Label>
          <Input
            type="text"
            value={headlinePrefix}
            onChange={(e) => updateField("headlinePrefix", e.target.value)}
            placeholder="Trips for the"
            className="h-10 text-xs font-bold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block flex items-center justify-between">
            <span>Strikethrough Word</span>
            <span className="text-[10px] text-[#D97854] lowercase font-normal">
              (brush line)
            </span>
          </Label>
          <Input
            type="text"
            value={strikethroughWord}
            onChange={(e) => updateField("strikethroughWord", e.target.value)}
            placeholder="Ordinary"
            className="h-10 text-xs font-bold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>
      </div>

      {/* 3. Rotating Words List */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-[#D97854] uppercase tracking-wider block">
          Rotating Words List (Comma Separated)
        </Label>
        <Input
          type="text"
          value={rotatingWordsArray.join(", ")}
          onChange={(e) => handleRotatingWordsChange(e.target.value)}
          placeholder="Curious, Adventurous, Wanderlust-Struck, Colleagues, Strangers, Restless"
          className="h-10 text-xs font-bold text-[#D97854] rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
        />
      </div>

      {/* 4. Subheadline / Subtitle Text */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Subheadline / Subtitle Text
        </Label>
        <Input
          type="text"
          value={subheadline}
          onChange={(e) => updateField("subheadline", e.target.value)}
          placeholder="Pick a month and explore group adventures that bring stories to life."
          className="h-10 text-xs font-medium rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
        />
      </div>

      {/* ─── 5. ADVANCED CONTROLS 3-TAB SYSTEM ─── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
        <Label className="text-xs font-extrabold text-[#1A2332] uppercase tracking-wider block flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-[#D97854]" />
          <span>
            Advanced Design Controls (Typography, Spacing, Fade & Overlay)
          </span>
        </Label>

        <Tabs defaultValue="typography" className="w-full">
          <TabsList className="grid grid-cols-3 bg-white border border-slate-200 rounded-xl p-1 h-10">
            <TabsTrigger
              value="typography"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-[#D97854] data-[state=active]:text-white"
            >
              Typography
            </TabsTrigger>
            <TabsTrigger
              value="spacing"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-[#D97854] data-[state=active]:text-white"
            >
              Spacing & Size
            </TabsTrigger>
            <TabsTrigger
              value="fade"
              className="text-xs font-bold rounded-lg data-[state=active]:bg-[#D97854] data-[state=active]:text-white"
            >
              Fade & Overlay
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: TYPOGRAPHY ── */}
          <TabsContent value="typography" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Heading Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#1A2332]">
                    Heading Font Size
                  </Label>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-[#D97854]">
                    {headingSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="28"
                  max="56"
                  step="2"
                  value={headingSize}
                  onChange={(e) => {
                    updateField("headingSize", Number(e.target.value));
                    updateField("fontSizePx", Number(e.target.value));
                  }}
                  className="w-full accent-[#D97854] cursor-pointer"
                />
                <div
                  className="p-2 bg-white rounded-lg border text-center font-bold text-slate-800 truncate"
                  style={{ fontSize: `${Math.min(22, headingSize * 0.5)}px` }}
                >
                  Preview Size: {headingSize}px
                </div>
              </div>

              {/* Font Family Dropdown */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1A2332]">
                  Font Family
                </Label>
                <Select
                  value={fontFamily}
                  onValueChange={(val) => updateField("fontFamily", val)}
                >
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Font Family" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Montserrat">
                      Montserrat (Modern Sans)
                    </SelectItem>
                    <SelectItem value="Inter">Inter (Clean Sans)</SelectItem>
                    <SelectItem value="Poppins">Poppins (Bold Sans)</SelectItem>
                    <SelectItem value="Playfair">
                      Playfair Display (Serif)
                    </SelectItem>
                    <SelectItem value="Caveat">Caveat (Handwritten)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accent Color Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1A2332]">
                  Accent Color (Italic)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => updateField("accentColor", e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => updateField("accentColor", e.target.value)}
                    placeholder="#D97854"
                    className="h-10 text-xs font-mono rounded-xl border-slate-200 bg-white focus:border-[#D97854]"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 2: SPACING & SIZE ── */}
          <TabsContent value="spacing" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hero Height Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#1A2332]">
                    Hero Banner Height
                  </Label>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-[#D97854]">
                    {heroHeight}px
                  </span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="800"
                  step="10"
                  value={heroHeight}
                  onChange={(e) => {
                    updateField("heroHeight", Number(e.target.value));
                    updateField("heroHeightPx", Number(e.target.value));
                  }}
                  className="w-full accent-[#D97854] cursor-pointer"
                />
                <Select
                  value={String(heroHeight)}
                  onValueChange={(val) => {
                    updateField("heroHeight", Number(val));
                    updateField("heroHeightPx", Number(val));
                  }}
                >
                  <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Preset Height" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="300">Compact (300px)</SelectItem>
                    <SelectItem value="460">
                      Medium (460px - Default)
                    </SelectItem>
                    <SelectItem value="600">Large (600px)</SelectItem>
                    <SelectItem value="800">Full Screen (800px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Top Padding Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#1A2332]">
                    Top Padding
                  </Label>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-[#D97854]">
                    {topPadding}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="4"
                  value={topPadding}
                  onChange={(e) => {
                    updateField("topPadding", Number(e.target.value));
                    updateField("paddingTop", Number(e.target.value));
                  }}
                  className="w-full accent-[#D97854] cursor-pointer"
                />
              </div>

              {/* Bottom Padding Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#1A2332]">
                    Bottom Padding
                  </Label>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-[#D97854]">
                    {bottomPadding}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="4"
                  value={bottomPadding}
                  onChange={(e) => {
                    updateField("bottomPadding", Number(e.target.value));
                    updateField("paddingBottom", Number(e.target.value));
                  }}
                  className="w-full accent-[#D97854] cursor-pointer"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 3: FADE & OVERLAY ── */}
          <TabsContent value="fade" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fade Color */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1A2332]">
                  Fade Color Theme
                </Label>
                <Select
                  value={fadeColor}
                  onValueChange={(val) => {
                    updateField("fadeColor", val);
                    updateField("overlayTheme", val);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Fade Color" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="white">⚪ White (Light)</SelectItem>
                    <SelectItem value="black">⬛ Black (Dark)</SelectItem>
                    <SelectItem value="navy">🔵 Navy (Brand)</SelectItem>
                    <SelectItem value="gradient">
                      🌈 Gradient (Dark→Light)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fade Opacity Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#1A2332]">
                    Fade Opacity
                  </Label>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-[#D97854]">
                    {fadeOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fadeOpacity}
                  onChange={(e) => {
                    updateField("fadeOpacity", Number(e.target.value));
                    updateField("overlayOpacity", Number(e.target.value));
                  }}
                  className="w-full accent-[#D97854] cursor-pointer"
                />
                <div
                  className="h-8 rounded-md border text-center text-xs font-bold flex items-center justify-center"
                  style={getGradientStyle()}
                >
                  Fade Preview ({fadeOpacity}%)
                </div>
              </div>

              {/* Fade Direction */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#1A2332]">
                  Fade Direction
                </Label>
                <Select
                  value={fadeDirection}
                  onValueChange={(val) => {
                    updateField("fadeDirection", val);
                    updateField("overlayDirection", val);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="left-right">Left to Right</SelectItem>
                    <SelectItem value="right-left">Right to Left</SelectItem>
                    <SelectItem value="top-bottom">Top to Bottom</SelectItem>
                    <SelectItem value="bottom-top">Bottom to Top</SelectItem>
                    <SelectItem value="center-out">Center Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs font-bold text-[#1A2332] mb-2">
                Quick Presets
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("light")}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 bg-white hover:bg-[#FF4D00]/5 cursor-pointer"
                >
                  Light Fade
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("medium")}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 bg-white hover:bg-[#FF4D00]/5 cursor-pointer"
                >
                  Medium Fade
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("dark")}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 bg-white hover:bg-[#FF4D00]/5 cursor-pointer"
                >
                  Dark Fade
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("none")}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 bg-white hover:bg-[#FF4D00]/5 cursor-pointer"
                >
                  No Fade
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── 6. MULTIPLE BACKGROUND PHOTOS MANAGEMENT ─── */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Hero Background Photos ({backgroundImages.length} Photos)
        </Label>

        {/* Upload File / Gallery Uploader */}
        <ImageUpload
          label="UPLOAD PHOTOS FROM GALLERY (SINGLE OR MULTIPLE)"
          multiple={true}
          onUpload={addBgImage}
          onMultipleUpload={addMultipleBgImages}
        />

        {/* List of uploaded photos */}
        <div className="space-y-2 pt-1">
          {backgroundImages.map((imgUrl, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                {/\.(mp4|webm|mov|ogg)$/i.test(imgUrl) ||
                imgUrl.includes("/video/") ? (
                  <video
                    src={imgUrl}
                    muted
                    className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <img
                    src={imgUrl}
                    alt={`Hero media ${idx + 1}`}
                    className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1A2332] truncate">
                    {/\.(mp4|webm|mov|ogg)$/i.test(imgUrl) ||
                    imgUrl.includes("/video/")
                      ? "Video"
                      : "Photo"}{" "}
                    {idx + 1} {idx === 0 && "(Primary)"}
                  </p>
                  <p className="text-[10.5px] font-mono text-slate-400 truncate max-w-xs">
                    {imgUrl}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeBgImage(idx)}
                className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Automatic Dynamic Month Filter */}
      <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-extrabold text-[#1A2332] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D97854]" />
            Month Filter Mode
          </Label>
          <span className="text-[10px] font-extrabold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full uppercase">
            AUTO DYNAMIC
          </span>
        </div>

        <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
          Month filter pills on the website are now{" "}
          <strong>100% automatic</strong>. Past months (like May/Jun) are
          automatically removed as months end, and upcoming months auto-advance
          starting from the current month (
          {new Date().toLocaleString("default", {
            month: "short",
            year: "numeric",
          })}
          ).
        </p>

        {/* Live Auto Months Preview Pills */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Live Active Months Preview
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(function () {
              const curDate = new Date();
              const curMonth = curDate.getMonth();
              const curYear = curDate.getFullYear();
              const shortNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const preview = ["All"];
              for (let i = 0; i < 12; i++) {
                const d = new Date(curYear, curMonth + i, 1);
                preview.push(shortNames[d.getMonth()]);
              }
              return preview.map((lbl, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "text-[10.5px] font-bold px-2.5 py-1 rounded-full border transition-all",
                    idx === 0
                      ? "bg-[#1A2332] text-white border-[#1A2332]"
                      : "bg-white text-slate-700 border-slate-200",
                  )}
                >
                  {lbl}
                </span>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Reset Button */}
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

