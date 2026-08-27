import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { Blog, BlogFormData, BlogHighlight } from "@/types";
import {
  Plus,
  Trash2,
  Sparkles,
  MapPin,
  ShieldCheck,
  Quote,
} from "lucide-react";

const defaultForm: BlogFormData = {
  title: "",
  slug: "",
  category: "EXPEDITION GUIDE",
  intro: "",
  author: "Expedition Team",
  authorImage: "",
  authorRole: "Lead Himalayan Expedition Specialist",
  content: "",
  image: "",
  gallery: [],
  highlights: [
    {
      title: "Breathtaking Mountain Vistas",
      desc: "Experience 360-degree panoramic views of Himalayan alpine valleys.",
    },
    {
      title: "Guided Mountain Expeditions",
      desc: "Lead by certified safety professionals and local expedition guides.",
    },
    {
      title: "Curated Stays & Local Culture",
      desc: "Cozy fireside stays, regional cuisine, and authentic hospitality.",
    },
  ],
  tips: [
    "Layering is key: Pack high-density thermals, a windproof outer jacket, and fleece gloves.",
    "Footwear matters: Sturdy waterproof trekking boots with good ankle support are essential.",
    "Stay Hydrated: Cold weather masks dehydration; carry a thermal thermos flask on day hikes.",
  ],
  readTime: "5 MIN READ",
  hasVideo: false,
  status: "draft",
};

interface BlogFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Blog | null;
  onSave: (data: BlogFormData, editingId?: string) => Promise<void>;
}

export default function BlogFormModal({
  open,
  onOpenChange,
  editing,
  onSave,
}: BlogFormModalProps) {
  const [form, setForm] = useState<BlogFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [newTip, setNewTip] = useState("");

  // Sync form when editing changes
  const [lastEditingId, setLastEditingId] = useState<string | null>(null);
  if ((editing?.id ?? null) !== lastEditingId) {
    setLastEditingId(editing?.id ?? null);
    if (editing) {
      setForm({
        title: editing.title || "",
        slug: editing.slug || "",
        category: editing.category || "EXPEDITION GUIDE",
        intro: editing.intro || "",
        author: editing.author || "Expedition Team",
        authorImage: editing.authorImage || "",
        authorRole:
          editing.authorRole || "Lead Himalayan Expedition Specialist",
        content: editing.content || "",
        image: editing.image || "",
        gallery: editing.gallery || [],
        highlights:
          editing.highlights && editing.highlights.length > 0
            ? editing.highlights
            : defaultForm.highlights,
        tips:
          editing.tips && editing.tips.length > 0
            ? editing.tips
            : defaultForm.tips,
        readTime: editing.readTime || "5 MIN READ",
        hasVideo: !!editing.hasVideo,
        status: editing.status || "draft",
      });
    } else {
      setForm(defaultForm);
    }
  }

  const handleAddGalleryImage = (url: string) => {
    if (!url) return;
    setForm((prev) => ({
      ...prev,
      gallery: [...(prev.gallery || []), url],
    }));
    setNewGalleryUrl("");
  };

  const handleRemoveGalleryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).filter((_, i) => i !== index),
    }));
  };

  const handleHighlightChange = (
    index: number,
    field: "title" | "desc",
    val: string,
  ) => {
    const list = [...(form.highlights || [])];
    if (list[index]) {
      list[index][field] = val;
      setForm({ ...form, highlights: list });
    }
  };

  const handleAddTip = () => {
    if (!newTip.trim()) return;
    setForm((prev) => ({
      ...prev,
      tips: [...(prev.tips || []), newTip.trim()],
    }));
    setNewTip("");
  };

  const handleRemoveTip = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tips: (prev.tips || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form, editing?.id || (editing as any)?._id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-[32px] p-0 border border-slate-200 shadow-2xl">
        {/* Header Bar */}
        <div className="p-6 sm:p-8 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-extrabold uppercase tracking-tight text-slate-900 font-montserrat">
              {editing
                ? "Edit Travel Story & Modules"
                : "Compose New Expedition Story"}
            </DialogTitle>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Manage story hero quote, highlights, visual storyboard gallery,
              and travel tips
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* SECTION 1: HEADER & METADATA */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5400] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 1. Main Header & Hero Banner
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Category / Badge
                </Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value.toUpperCase() })
                  }
                  placeholder="EXPEDITION GUIDE"
                  className="rounded-xl h-11 border-slate-200 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Reading Time
                </Label>
                <Input
                  value={form.readTime}
                  onChange={(e) =>
                    setForm({ ...form, readTime: e.target.value })
                  }
                  placeholder="7 MIN READ"
                  className="rounded-xl h-11 border-slate-200 text-xs font-bold uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Story Headline *
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. The Pristine Colors of Kasol..."
                className="rounded-xl h-12 font-extrabold text-base border-slate-200 px-4"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                URL Slug *
              </Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/ /g, "-"),
                  })
                }
                placeholder="the-pristine-colors-of-kasol"
                className="rounded-xl h-10 border-slate-200 bg-slate-50 px-4 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <ImageUpload
                label="Featured Main Hero Image *"
                value={form.image}
                onUpload={(url) => setForm({ ...form, image: url })}
              />
            </div>
          </div>

          {/* SECTION 2: HERO PULL QUOTE */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5400] flex items-center gap-1.5">
              <Quote className="w-4 h-4" /> 2. Hero Pull Quote / Lead Intro
            </h3>
            <Textarea
              value={form.intro}
              onChange={(e) => setForm({ ...form, intro: e.target.value })}
              placeholder="From the serene banks of the Parvati River to the hidden high-altitude trails..."
              className="rounded-2xl min-h-[90px] border-slate-200 p-4 text-xs font-medium leading-relaxed bg-[#FF4D00]/5/20"
            />
          </div>

          {/* SECTION 3: EXPEDITION HIGHLIGHTS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5400] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 3. Expedition Highlights Cards (3
              Cards)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(form.highlights || []).slice(0, 3).map((h, hIdx) => (
                <div
                  key={hIdx}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2"
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Card #{hIdx + 1}
                  </span>
                  <Input
                    value={h.title}
                    onChange={(e) =>
                      handleHighlightChange(hIdx, "title", e.target.value)
                    }
                    placeholder="Highlight Title"
                    className="rounded-lg h-9 border-slate-200 text-xs font-bold bg-white"
                  />
                  <Textarea
                    value={h.desc}
                    onChange={(e) =>
                      handleHighlightChange(hIdx, "desc", e.target.value)
                    }
                    placeholder="Highlight Description..."
                    className="rounded-lg min-h-[60px] border-slate-200 text-[11px] font-medium bg-white p-2.5"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: MAIN STORY ARTICLE */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5400]">
              4. Overview & Story Content *
            </h3>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="rounded-2xl min-h-[220px] border-slate-200 p-5 text-xs font-medium leading-relaxed bg-white"
              placeholder="Write the detailed story content here..."
            />
          </div>

          {/* SECTION 5: VISUAL STORYBOARD GALLERY */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5400] flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> 5. Visual Storyboard (Gallery
              Photos)
            </h3>

            {/* Gallery Thumbnails */}
            {form.gallery && form.gallery.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {form.gallery.map((gUrl, gIdx) => (
                  <div
                    key={gIdx}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 group"
                  >
                    <img
                      src={gUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(gIdx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                placeholder="Paste gallery image URL..."
                className="rounded-xl h-11 border-slate-200 text-xs flex-1"
              />
              <Button
                type="button"
                onClick={() => handleAddGalleryImage(newGalleryUrl)}
                disabled={!newGalleryUrl}
                className="rounded-xl h-11 px-4 bg-[#FF5400] hover:bg-[#D4541A] text-white text-xs font-bold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Image
              </Button>
            </div>
          </div>

          {/* SECTION 6: PACKING & TRAVEL TIPS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5400] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> 6. Essential Travel & Packing
              Tips
            </h3>

            <div className="space-y-2">
              {(form.tips || []).map((t, tIdx) => (
                <div
                  key={tIdx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                >
                  <span>• {t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTip(tIdx)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                placeholder="e.g. Carry sturdy waterproof trekking boots..."
                className="rounded-xl h-11 border-slate-200 text-xs flex-1"
              />
              <Button
                type="button"
                onClick={handleAddTip}
                disabled={!newTip.trim()}
                className="rounded-xl h-11 px-4 bg-slate-900 text-white text-xs font-bold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Tip
              </Button>
            </div>
          </div>

          {/* SECTION 7: AUTHOR & PUBLICATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Author / Explorer Name
              </Label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Siddharth"
                className="rounded-xl h-11 border-slate-200 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Author Designation / Role
              </Label>
              <Input
                value={form.authorRole}
                onChange={(e) =>
                  setForm({ ...form, authorRole: e.target.value })
                }
                placeholder="Lead Himalayan Expedition Specialist"
                className="rounded-xl h-11 border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <ImageUpload
                label="Author Avatar Photo"
                value={form.authorImage || ""}
                onUpload={(url) => setForm({ ...form, authorImage: url })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Publication Status
              </Label>
              <Select
                value={form.status}
                onValueChange={(v: "draft" | "published") =>
                  setForm({ ...form, status: v })
                }
              >
                <SelectTrigger className="rounded-xl h-11 border-slate-200 font-bold uppercase text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem
                    value="draft"
                    className="font-bold uppercase text-xs"
                  >
                    Save as Draft
                  </SelectItem>
                  <SelectItem
                    value="published"
                    className="font-bold uppercase text-xs text-green-600"
                  >
                    Go Live (Public)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 sm:p-8 border-t bg-slate-50 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 px-6 font-bold text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title || !form.content || !form.image}
            className="rounded-xl h-11 px-8 bg-[#FF5400] hover:bg-[#D4541A] text-white font-extrabold text-xs shadow-lg shadow-orange-500/20"
          >
            {saving
              ? "Saving..."
              : editing
                ? "Update Story Modules"
                : "Publish Story"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

