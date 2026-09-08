import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { settingsService } from "@/services/settings.service";
import { useWebsitePages } from "@/hooks/admin/useWebsitePages";
import { toast } from "sonner";
import { ENV } from "@/config/environment";
import {
  Loader2,
  Layout,
  Megaphone,
  Compass,
  ImageIcon,
  MessageSquare,
  BookOpen,
  Sparkles,
  ExternalLink,
  Edit3,
  Globe,
  Palette,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Layers,
  FileText,
  HelpCircle,
  Plus,
  Clock,
  AlertCircle,
} from "lucide-react";
import api from "@/services/api";
import {
  pageBuilderApi,
  PageSectionConfig,
} from "@/lib/admin/page-builder-api";
import { tripsService } from "@/services/trips.service";

import { WebsiteHeader } from "@/components/admin/website/WebsiteHeader";
import { FocusedSectionModal } from "@/components/admin/website/FocusedSectionModal";

interface SectionShortcut {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const SECTION_SHORTCUTS: SectionShortcut[] = [
  {
    id: "hero",
    name: "Hero Section",
    badge: "HERO",
    description:
      "Main hero banner, tagline, rotating headline & month filter bar.",
    icon: Layout,
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "featured_trips",
    name: "Upcoming Group Trips",
    badge: "TRIPS",
    description:
      "Featured trip cards carousel with duration, price & View Trip CTA.",
    icon: Megaphone,
    color: "bg-green-50 text-green-600 border-green-100",
  },
  {
    id: "destinations",
    name: "Popular Destinations",
    badge: "DESTINATIONS",
    description:
      "Portrait photo cards & inquiry popup modal for top locations.",
    icon: Compass,
    color: "bg-[#FF4D00]/5 text-[#D4541A] border-[#FF4D00]/20",
  },
  {
    id: "cta_slider",
    name: "Media Banner Slider",
    badge: "CTA SLIDER",
    description: "Auto-playing video clips and photo slideshow banner.",
    icon: Sparkles,
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "reviews",
    name: "What Travelers Say",
    badge: "REVIEWS",
    description: "Customer review cards with 5-star ratings & trip links.",
    icon: MessageSquare,
    color: "bg-[#FF4D00]/5 text-[#FF4D00] border-[#FF4D00]/20",
  },
  {
    id: "stories",
    name: "Stories From The Road",
    badge: "JOURNAL",
    description:
      "Blog & travel journal story cards with author avatars & read time.",
    icon: BookOpen,
    color: "bg-[#FF4D00]/5 text-[#FF4D00] border-[#FF4D00]/20",
  },
  {
    id: "recent_photos",
    name: "Recent Photos From Our Trips",
    badge: "PHOTOS",
    description: "Infinite marquee photo gallery with lightbox modal preview.",
    icon: ImageIcon,
    color: "bg-pink-50 text-pink-600 border-pink-100",
  },
];

// Hardcoded sub-pages removed — now loaded dynamically from useWebsitePages hook

export default function WebsiteControlCenterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [websiteStatus, setWebsiteStatus] = useState<
    "live" | "draft" | "review_needed"
  >("live");
  const [lastPublished, setLastPublished] = useState("July 26, 2:30 PM");

  const [sections, setSections] = useState<PageSectionConfig[]>([]);
  const [dbTrips, setDbTrips] = useState<any[]>([]);
  const [focusedSectionType, setFocusedSectionType] = useState<string | null>(
    null,
  );

  // Data-driven website pages from DB
  const {
    pages: dbPages,
    loading: pagesLoading,
    error: pagesError,
    refetch: refetchPages,
  } = useWebsitePages({ pollInterval: 5000 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const frontendUrl = ENV.FRONTEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [layout, trips] = await Promise.all([
        pageBuilderApi.getPageLayout("home").catch(() => []),
        tripsService.getAll().catch(() => []),
      ]);
      setSections(layout || []);
      setDbTrips(trips || []);
      setWebsiteStatus("live");
    } catch (err) {
      console.warn("Website settings load notice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await pageBuilderApi.publishPage("home", sections);
      const nowFormatted = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      setLastPublished(nowFormatted);
      toast.success("Website changes published successfully to live site!");
    } catch (err) {
      toast.error("Failed to publish website changes");
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveFocusedSection = async (
    sectionId: string,
    updatedDraft: Record<string, any>,
  ) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, draft: updatedDraft } : s,
    );
    if (!sections.some((s) => s.id === sectionId)) {
      const targetType = focusedSectionType || "section";
      updated.push({
        id: sectionId,
        type: targetType,
        name: targetType.replace(/_/g, " ").toUpperCase(),
        visible: true,
        draft: updatedDraft,
      });
    }
    setSections(updated);
    await pageBuilderApi.publishPage("home", updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4541A]" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#0B1528]">
          Loading Website Control Center...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-[1440px] mx-auto pb-16">
      {/* ─── 1. TOP HEADER & PUBLISH BAR ─── */}
      <WebsiteHeader
        status={websiteStatus}
        lastPublished={lastPublished}
        onPublish={handlePublish}
        isPublishing={publishing}
      />

      {/* ─── 2. SECTION 1: HOMEPAGE SECTIONS CONTROL TOWER ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-[#0B1528] tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#D4541A]" />
              <span>Homepage Section Editors</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Click any section to edit it directly in place without losing your
              spot
            </p>
          </div>

          <button
            onClick={() => navigate("/admin/page-builder")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1528] hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#D4541A]" />
            <span>Open Full Page Builder</span>
          </button>
        </div>

        {/* 7 Section Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {SECTION_SHORTCUTS.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                onClick={() => setFocusedSectionType(sec.id)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-[#D4541A] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-8 h-8 rounded-xl ${sec.color} flex items-center justify-center border font-bold shrink-0`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {sec.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-[#0B1528] group-hover:text-[#D4541A] transition-colors leading-tight">
                      {sec.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">
                      {sec.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#D4541A] group-hover:underline">
                  <span>Edit Section</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3. SECTION 2: ALL WEBSITE SUB-PAGES & LANDING PAGES (DATA-DRIVEN) ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-[#0B1528] tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Website Pages & Sub-Pages ({dbPages.length})</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Manage public website routes, landing pages, policy documents and
              live URLs
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4541A] hover:bg-[#C04A16] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Page</span>
          </button>
        </div>

        {/* Loading state */}
        {pagesLoading && dbPages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#D4541A]" />
            <span className="ml-2 text-xs font-bold text-slate-400">
              Loading pages...
            </span>
          </div>
        )}

        {/* Error state */}
        {pagesError && dbPages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-bold text-red-600">{pagesError}</p>
            <button
              onClick={refetchPages}
              className="text-xs font-bold text-[#D4541A] hover:underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!pagesLoading && !pagesError && dbPages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-500">No pages yet</p>
            <p className="text-xs text-slate-400">
              Create your first website page to get started
            </p>
          </div>
        )}

        {/* Pages grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dbPages.map((page) => {
            const isPublished = page.published;
            const updatedAt = page.updatedAt
              ? new Date(page.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—";

            return (
              <div
                key={page.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-400">
                      /{page.slug}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                        isPublished
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3 h-3 ${isPublished ? "text-green-600" : "text-amber-500"}`}
                      />
                      <span>{isPublished ? "Live" : "Draft"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#0B1528]">
                      {page.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated {updatedAt}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`${frontendUrl}/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#D4541A] transition-colors"
                  >
                    <span>Preview Live</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <button
                    onClick={() =>
                      navigate(`/admin/website/editor/${page.slug}`)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#0B1528] hover:text-white text-[#0B1528] text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Content</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── CREATE NEW PAGE MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h3 className="text-lg font-black text-[#0B1528]">
                Create New Page
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Add a new website page that you can edit and publish
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    setNewPageSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, ""),
                    );
                  }}
                  placeholder="e.g. Privacy Policy"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/30 focus:border-[#D4541A] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-mono text-slate-400">
                    /
                  </span>
                  <input
                    type="text"
                    value={newPageSlug}
                    onChange={(e) =>
                      setNewPageSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      )
                    }
                    placeholder="privacy-policy"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-mono font-semibold text-[#0B1528] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4541A]/30 focus:border-[#D4541A] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPageTitle("");
                  setNewPageSlug("");
                }}
                className="px-4 py-2 text-xs font-extrabold text-slate-600 hover:text-[#0B1528] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newPageTitle.trim() || !newPageSlug.trim()) {
                    toast.error("Title and slug are required");
                    return;
                  }
                  setCreating(true);
                  try {
                    const { websiteService } =
                      await import("@/services/website.service");
                    await websiteService.createPage({
                      title: newPageTitle.trim(),
                      slug: newPageSlug.trim(),
                      content: { body: "" },
                      published: false,
                    });
                    toast.success(`Page "${newPageTitle}" created!`);
                    setShowCreateModal(false);
                    setNewPageTitle("");
                    setNewPageSlug("");
                    refetchPages();
                  } catch (err: any) {
                    toast.error(
                      err?.response?.data?.message || "Failed to create page",
                    );
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={
                  creating || !newPageTitle.trim() || !newPageSlug.trim()
                }
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm ${
                  creating || !newPageTitle.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-[#D4541A] hover:bg-[#C04A16] text-white"
                }`}
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{creating ? "Creating..." : "Create Page"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. SECTION 3: UTILITY & BRAND SETTINGS QUICK DOCK ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* SEO & Search Meta Tags */}
        <div
          onClick={() => navigate("/admin/seo")}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-500 transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#0B1528] group-hover:text-blue-600 transition-colors">
              SEO & Meta Tags
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Search titles, meta descriptions & OG tags
            </p>
          </div>
        </div>

        {/* System Revalidation & Status */}
        <div
          onClick={handlePublish}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-green-500 transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold shrink-0 border border-green-100">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#0B1528] group-hover:text-green-600 transition-colors">
              Flush & Sync Cache
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Instant edge revalidation to live site
            </p>
          </div>
        </div>
      </div>

      {/* ─── 5. FOCUSED SECTION EDITING MODAL ─── */}
      <FocusedSectionModal
        isOpen={Boolean(focusedSectionType)}
        onClose={() => setFocusedSectionType(null)}
        sectionType={focusedSectionType}
        sections={sections}
        dbTrips={dbTrips}
        onSaveSection={handleSaveFocusedSection}
      />
    </div>
  );
}


