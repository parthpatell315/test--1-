import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Save,
  Eye,
  Loader2,
  Globe,
  FileText,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Check,
} from "lucide-react";
import { WebsitePage, UpdatePagePayload } from "@/services/website.service";
import { ENV } from "@/config/environment";

interface WebsiteEditorProps {
  page: WebsitePage;
  onSave: (id: string, data: UpdatePagePayload) => Promise<WebsitePage | null>;
  onBack: () => void;
}

export function WebsiteEditor({ page, onSave, onBack }: WebsiteEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [metaTitle, setMetaTitle] = useState(page.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(
    page.metaDescription || "",
  );
  const [published, setPublished] = useState(page.published);
  const [content, setContent] = useState<Record<string, any>>(
    typeof page.content === "object" && page.content !== null
      ? page.content
      : {},
  );
  const [bodyHtml, setBodyHtml] = useState<string>(
    (typeof page.content === "object" && page.content !== null
      ? (page.content as any).body
      : "") || "",
  );

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const frontendUrl = ENV.FRONTEND_URL;

  // Track unsaved changes
  useEffect(() => {
    const changed =
      title !== page.title ||
      slug !== page.slug ||
      metaTitle !== (page.metaTitle || "") ||
      metaDescription !== (page.metaDescription || "") ||
      published !== page.published ||
      bodyHtml !== ((page.content as any)?.body || "");
    setDirty(changed);
  }, [title, slug, metaTitle, metaDescription, published, bodyHtml, page]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setJustSaved(false);
    try {
      const updatedContent = { ...content, body: bodyHtml };
      const data: UpdatePagePayload = {
        title,
        slug,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        published,
        content: updatedContent,
      };

      const result = await onSave(page.id, data);
      if (result) {
        setDirty(false);
        setJustSaved(true);
        setIsPreviewRefreshing(true);
        setPreviewKey(Date.now()); // Force iframe refresh
        setTimeout(() => setJustSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, [
    title,
    slug,
    metaTitle,
    metaDescription,
    published,
    bodyHtml,
    content,
    page.id,
    onSave,
    saving,
  ]);

  // Keyboard shortcut: Ctrl/Cmd + S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, saving, handleSave]);

  const refreshPreview = () => {
    setIsPreviewRefreshing(true);
    setPreviewKey(Date.now());
  };

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-4">
      {/* ─── HEADER BAR ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-[#0B1528] text-xs font-extrabold rounded-xl transition-all duration-100 ease-out cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div>
            <h1 className="text-lg font-black text-[#0B1528] tracking-tight leading-tight">
              {title || "Untitled Page"}
            </h1>
            <span className="text-xs text-slate-400 font-mono">/{slug}</span>
          </div>

          {dirty && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-in fade-in duration-150 ease-out">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Published toggle */}
          <button
            onClick={() => setPublished(!published)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-xl cursor-pointer border transition-all duration-150 ease-out active:scale-95 ${
              published
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            }`}
          >
            {published ? (
              <ToggleRight className="w-4 h-4 text-green-600 transition-transform duration-150 ease-out" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400 transition-transform duration-150 ease-out" />
            )}
            <span>{published ? "Published" : "Draft"}</span>
          </button>

          {/* Preview link */}
          <a
            href={`${frontendUrl}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-[#0B1528] text-xs font-extrabold rounded-xl transition-all duration-100 ease-out"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview</span>
          </a>

          {/* Save button with Emil Kowalski animation feedback */}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-xl cursor-pointer shadow-sm transition-all duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none ${
              justSaved
                ? "bg-green-600 text-white shadow-green-600/20"
                : dirty && !saving
                  ? "bg-[#D4541A] hover:bg-[#C04A16] text-white shadow-orange-500/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : justSaved ? (
              <Check className="w-3.5 h-3.5 text-white animate-in zoom-in-50 duration-150" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {saving ? "Saving..." : justSaved ? "Saved!" : "Save Page"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── SPLIT PANE: EDITOR (50%) | PREVIEW (50%) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* LEFT: Editor Form */}
        <div className="space-y-4">
          {/* Page Identity */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#0B1528] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4541A]" />
              Page Details
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. About Us"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/20 focus:border-[#D4541A] transition-all duration-150 ease-out"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  URL Slug
                </label>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-mono text-slate-400">
                    /
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      )
                    }
                    placeholder="about-us"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-mono font-semibold text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/20 focus:border-[#D4541A] transition-all duration-150 ease-out"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEO / Meta */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#0B1528] flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              SEO & Meta
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Page title for search engines"
                  maxLength={120}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/20 focus:border-[#D4541A] transition-all duration-150 ease-out"
                />
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block text-right">
                  {metaTitle.length}/120
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Meta Description
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief description for search results"
                  maxLength={320}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/20 focus:border-[#D4541A] transition-all duration-150 ease-out resize-none"
                />
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block text-right">
                  {metaDescription.length}/320
                </span>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#0B1528] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#FF4D00]" />
              Page Content
            </h3>

            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="Enter page content (HTML supported)..."
              rows={16}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/20 focus:border-[#D4541A] transition-all duration-150 ease-out resize-y leading-relaxed"
            />
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="lg:sticky lg:top-[88px] space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 ease-out">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <span className="text-[11px] font-bold text-slate-400 font-mono ml-2">
                  {frontendUrl}/{slug}
                </span>
              </div>
              <button
                onClick={refreshPreview}
                className="p-1 hover:bg-slate-200 active:scale-90 rounded-lg transition-all duration-100 ease-out cursor-pointer"
                title="Refresh preview"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-400 ${isPreviewRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="relative w-full">
              {isPreviewRefreshing && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center transition-all duration-150 ease-out">
                  <Loader2 className="w-6 h-6 animate-spin text-[#D4541A]" />
                </div>
              )}
              <iframe
                ref={iframeRef}
                key={previewKey}
                src={`${frontendUrl}/${slug}?preview=1&t=${previewKey}`}
                onLoad={() => setIsPreviewRefreshing(false)}
                className="w-full border-0 transition-opacity duration-200 ease-out"
                style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
                title="Page Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


