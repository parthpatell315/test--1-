import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus, X, Link2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface LinkItem {
  text: string;
  url: string;
}

interface FooterEditorProps {
  draft: Record<string, any>;
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

export function FooterEditor({ draft, onChange, onReset }: FooterEditorProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const quickLinks: LinkItem[] = draft.quickLinks || [
    { text: "All Trips", url: "/trips" },
    { text: "About Us", url: "/about-us" },
    { text: "Contact Us", url: "/contact" },
  ];

  const usefulLinks: LinkItem[] = draft.usefulLinks || [
    { text: "Terms & Conditions", url: "/terms-and-conditions" },
    { text: "Cancellation Policy", url: "/cancellation-policy" },
    { text: "Privacy Policy", url: "/privacy-policy" },
  ];

  const socialLinks = draft.socialLinks || {
    instagram: "https://instagram.com/youthcamping",
    facebook: "https://facebook.com/youthcamping",
    youtube: "https://youtube.com/youthcamping",
    whatsapp: "https://wa.me/919999999999",
  };

  const addQuickLink = () => {
    updateField("quickLinks", [...quickLinks, { text: "New Link", url: "#" }]);
  };

  const removeQuickLink = (idx: number) => {
    updateField(
      "quickLinks",
      quickLinks.filter((_, i) => i !== idx),
    );
  };

  const updateQuickLink = (idx: number, key: "text" | "url", val: string) => {
    const updated = quickLinks.map((item, i) =>
      i === idx ? { ...item, [key]: val } : item,
    );
    updateField("quickLinks", updated);
  };

  const addUsefulLink = () => {
    updateField("usefulLinks", [
      ...usefulLinks,
      { text: "New Policy", url: "#" },
    ]);
  };

  const removeUsefulLink = (idx: number) => {
    updateField(
      "usefulLinks",
      usefulLinks.filter((_, i) => i !== idx),
    );
  };

  const updateUsefulLink = (idx: number, key: "text" | "url", val: string) => {
    const updated = usefulLinks.map((item, i) =>
      i === idx ? { ...item, [key]: val } : item,
    );
    updateField("usefulLinks", updated);
  };

  const updateSocialLink = (key: string, val: string) => {
    updateField("socialLinks", { ...socialLinks, [key]: val });
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Logo Upload & Address */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <ImageUpload
            label="FOOTER LOGO (UPLOAD FROM GALLERY / PC)"
            value={draft.logoUrl || ""}
            onUpload={(url) => updateField("logoUrl", url)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            HQ Office Address
          </Label>
          <Textarea
            value={draft.address || ""}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Money Plant High Street, A 738, Jagatpur Rd, Gota, Ahmedabad, Gujarat 382470"
            className="text-xs font-medium rounded-xl min-h-[70px] border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>
      </div>

      {/* Quick Links Column */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Quick Links Column ({quickLinks.length})
          </Label>
          <Button
            type="button"
            variant="ghost"
            onClick={addQuickLink}
            className="h-7 px-2.5 text-xs font-bold text-[#D97854] hover:bg-[#FF4D00]/5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Link
          </Button>
        </div>

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
          {quickLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                type="text"
                value={link.text}
                onChange={(e) => updateQuickLink(idx, "text", e.target.value)}
                placeholder="Link Label"
                className="h-9 text-xs font-semibold rounded-xl border-[#e5e7eb] flex-1"
              />
              <Input
                type="text"
                value={link.url}
                onChange={(e) => updateQuickLink(idx, "url", e.target.value)}
                placeholder="URL Target"
                className="h-9 text-xs font-mono rounded-xl border-[#e5e7eb] flex-1"
              />
              <button
                type="button"
                onClick={() => removeQuickLink(idx)}
                className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Useful Links Column */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Useful / Legal Links Column ({usefulLinks.length})
          </Label>
          <Button
            type="button"
            variant="ghost"
            onClick={addUsefulLink}
            className="h-7 px-2.5 text-xs font-bold text-[#D97854] hover:bg-[#FF4D00]/5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Link
          </Button>
        </div>

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
          {usefulLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                type="text"
                value={link.text}
                onChange={(e) => updateUsefulLink(idx, "text", e.target.value)}
                placeholder="Link Label"
                className="h-9 text-xs font-semibold rounded-xl border-[#e5e7eb] flex-1"
              />
              <Input
                type="text"
                value={link.url}
                onChange={(e) => updateUsefulLink(idx, "url", e.target.value)}
                placeholder="URL Target"
                className="h-9 text-xs font-mono rounded-xl border-[#e5e7eb] flex-1"
              />
              <button
                type="button"
                onClick={() => removeUsefulLink(idx)}
                className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Newsletter Heading
          </Label>
          <Input
            type="text"
            value={draft.newsletterHeading ?? "STAY UPDATED"}
            onChange={(e) => updateField("newsletterHeading", e.target.value)}
            placeholder="STAY UPDATED"
            className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Copyright Text
          </Label>
          <Input
            type="text"
            value={
              draft.copyright ?? "© 2026 YouthCamping. All Rights Reserved."
            }
            onChange={(e) => updateField("copyright", e.target.value)}
            placeholder="© 2026 YouthCamping. All Rights Reserved."
            className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb]"
          />
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Social Links
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-[#6b7280]">
              Instagram URL
            </span>
            <Input
              type="url"
              value={socialLinks.instagram || ""}
              onChange={(e) => updateSocialLink("instagram", e.target.value)}
              placeholder="https://instagram.com/..."
              className="h-9 text-xs font-mono rounded-xl border-[#e5e7eb]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-[#6b7280]">
              Facebook URL
            </span>
            <Input
              type="url"
              value={socialLinks.facebook || ""}
              onChange={(e) => updateSocialLink("facebook", e.target.value)}
              placeholder="https://facebook.com/..."
              className="h-9 text-xs font-mono rounded-xl border-[#e5e7eb]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-[#6b7280]">
              YouTube URL
            </span>
            <Input
              type="url"
              value={socialLinks.youtube || ""}
              onChange={(e) => updateSocialLink("youtube", e.target.value)}
              placeholder="https://youtube.com/..."
              className="h-9 text-xs font-mono rounded-xl border-[#e5e7eb]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-[#6b7280]">
              WhatsApp URL
            </span>
            <Input
              type="url"
              value={socialLinks.whatsapp || ""}
              onChange={(e) => updateSocialLink("whatsapp", e.target.value)}
              placeholder="https://wa.me/..."
              className="h-9 text-xs font-mono rounded-xl border-[#e5e7eb]"
            />
          </div>
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
