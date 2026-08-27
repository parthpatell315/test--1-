import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { tripsService } from "@/services/trips.service";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import TripFormEditor from "@/components/admin/TripFormEditor";
import TripSortModal from "@/components/admin/TripSortModal";
import { sopsService } from "@/services/sops.service";
import type { Trip, TripFormData } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  Map,
  CalendarDays,
  Building2,
  Shuffle,
  GripVertical,
  Compass,
  CheckCircle2,
  FileEdit,
  Globe,
  Sparkles,
  ArrowUpDown,
  Search,
  Filter,
  Eye,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import TripVendorsPanel from "@/components/admin/TripVendorsPanel";
import { cn } from "@/lib/utils";

export default function TripsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryTab, setCategoryTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [vendorTrip, setVendorTrip] = useState<Trip | null>(null);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(12);

  const editParam = searchParams.get("edit");
  const isNewParam = searchParams.get("new") === "true";

  useEffect(() => {
    if (isNewParam) {
      setIsEditingMode(true);
      setEditing(null);
    } else if (editParam) {
      setIsEditingMode(true);
      const found = trips.find(
        (t) =>
          String(t.id) === String(editParam) ||
          String((t as any)._id) === String(editParam) ||
          String((t as any).slug) === String(editParam) ||
          String((t as any).code || (t as any).shortName || "") ===
            String(editParam),
      );
      if (found) {
        setEditing(found);
      }
      tripsService
        .getById(editParam)
        .then((fullTrip) => {
          if (fullTrip) {
            setEditing(fullTrip);
            setIsEditingMode(true);
          }
        })
        .catch(() => {});
    } else {
      setIsEditingMode(false);
      setEditing(null);
    }
  }, [editParam, isNewParam]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tripsService.getAll();
      const arr = Array.isArray(data) ? data : [];
      setTrips(arr);
    } catch (err) {
      console.error(err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setSearchParams({ new: "true", tab: "overview" });
  };

  const openEdit = (t: Trip) => {
    const identifier =
      t.id || (t as any)._id || (t as any).slug || (t as any).shortName || "trip";
    setSearchParams({
      edit: String(identifier),
      tab: searchParams.get("tab") || "overview",
    });
  };

  const closeEditor = () => {
    setSearchParams({});
  };

  // Quick Metrics Stats
  const metrics = useMemo(() => {
    const total = trips.length;
    const published = trips.filter((t) => t.status === "published").length;
    const draft = trips.filter((t) => t.status !== "published").length;
    const categories = new Set(trips.map((t) => t.category).filter(Boolean))
      .size;
    return { total, published, draft, categories };
  }, [trips]);

  // Filtered trips
  const filtered = useMemo(() => {
    return (trips || []).filter((t) => {
      if (!t) return false;

      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // Category Tab filter
      if (categoryTab !== "all") {
        const cat = (t.category || "").toLowerCase();
        if (categoryTab === "backpacking" && !cat.includes("backpack"))
          return false;
        if (categoryTab === "roadtrip" && !cat.includes("road")) return false;
        if (categoryTab === "international" && !cat.includes("inter"))
          return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || "").toLowerCase().includes(q);
        const matchCode = (((t as any).shortName || t.id) || "")
          .toLowerCase()
          .includes(q);
        const matchLoc = (t.location || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchLoc) return false;
      }

      return true;
    });
  }, [trips, statusFilter, categoryTab, searchQuery]);

  useEffect(() => {
    setMobileVisibleCount(12);
  }, [statusFilter, categoryTab, searchQuery]);

  const handleSave = async (data: TripFormData, editingId?: string) => {
    const payload = {
      ...data,
      title: data.title || "Untitled Trip",
      location: data.location || "TBD",
      price: data.price || 0,
      duration: data.duration || "TBD",
      description: data.description || "No description provided.",
      status: data.status || "draft",
    };

    try {
      if (editingId) {
        await tripsService.update(editingId, payload);
        toast.success("Trip updated successfully");
      } else {
        await tripsService.create(payload);
        toast.success("New trip created");
      }
      load();
      closeEditor();
    } catch (error: any) {
      console.error("❌ SAVE ERROR:", error);
      const msg = error.response?.data?.message || "Failed to save trip";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || !confirm("Are you sure you want to delete this trip itinerary?"))
      return;
    try {
      await tripsService.remove(id);
      toast.success("Trip deleted");
      load();
    } catch (error: any) {
      console.error("❌ DELETE ERROR:", error);
      const msg = error.response?.data?.message || "Failed to delete trip";
      toast.error(msg);
    }
  };

  const toggleStatus = async (t: Trip) => {
    if (!t?.id) return;
    try {
      const newStatus = t.status === "published" ? "draft" : "published";
      await tripsService.update(t.id, { status: newStatus });
      toast.success(`Trip status changed to ${newStatus}`);
      load();
    } catch (error: any) {
      console.error("❌ STATUS ERROR:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDuplicateTrip = async (t: Trip) => {
    if (!t || !t.id) return;
    const copySop = confirm(
      `Duplicate Trip "${t.title}"?\n\nWould you like to COPY the Operations SOP & Master Checklist for this new trip?`,
    );

    try {
      const duplicatedTitle = `${t.title} (Copy)`;
      const duplicatedSlug = `${t.slug || t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-copy-${Date.now()}`;

      const payload: TripFormData = {
        ...t,
        title: duplicatedTitle,
        slug: duplicatedSlug,
        status: "draft",
      };

      delete (payload as any).id;
      delete (payload as any).createdAt;
      delete (payload as any).updatedAt;

      const newTrip = await tripsService.create(payload);

      if (copySop && t.id && newTrip?.id) {
        try {
          const sourceSop = await sopsService.getSopByTrip(t.id);
          const sourceVersion = sourceSop?.versions?.find(
            (v) => v.id === sourceSop?.activeVersionId,
          );
          if (sourceSop && sourceVersion && sourceVersion.taskTemplates) {
            const newTemplate = await sopsService.createSopTemplate({
              tripId: newTrip.id,
              name: `${duplicatedTitle} Operations SOP`,
              description: `Copied Operations SOP from ${t.title}`,
            });

            const newVersion = newTemplate?.versions?.find(
              (v) => v.id === newTemplate?.activeVersionId,
            );
            if (newTemplate && newVersion) {
              for (const task of sourceVersion.taskTemplates) {
                await sopsService.createTaskTemplate(newVersion.id, {
                  taskName: task.taskName,
                  instructions: task.instructions,
                  stage: task.stage,
                  relativeOffset: task.relativeOffset,
                  defaultAssignee: task.defaultAssignee,
                  priority: task.priority,
                  isRequired: task.isRequired,
                });
              }
            }
          }
        } catch (sopErr) {
          console.error("Error duplicating SOP:", sopErr);
        }
      }

      toast.success(
        `Duplicated trip "${newTrip.title}" ${copySop ? "with Operations SOP" : ""}`,
      );
      load();
    } catch (err) {
      console.error("Duplicate trip error:", err);
      toast.error("Failed to duplicate trip");
    }
  };

  const handleShuffle = async () => {
    try {
      await tripsService.shuffle();
      toast.success("Trips shuffled successfully!");
      load();
    } catch (error) {
      toast.error("Failed to shuffle trips");
    }
  };

  const columns = [
    {
      key: "title",
      header: "Trip",
      render: (t: Trip) => {
        if (!t) return null;
        const img =
          t.heroImage ||
          t.images?.[0] ||
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400";
        return (
          <div className="flex items-center gap-3 min-w-[280px]">
            <img
              src={img}
              alt={t.title || ""}
              className="h-8 w-8 rounded-md object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <p
                className="font-medium text-slate-900 text-sm hover:text-[#D4541A] transition-colors cursor-pointer truncate"
                onClick={() => openEdit(t)}
              >
                {t.title || "Untitled Expedition"}
              </p>
              {t.location && t.location.toLowerCase() !== "destination" && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {t.location}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "tripCode",
      header: "Code",
      render: (t: Trip) => (
        <span className="text-xs text-slate-600 font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
          {t?.shortName || t?.id?.substring(0, 8) || "N/A"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (t: Trip) => (
        <span className="text-xs text-slate-600 capitalize">
          {t?.category?.replace(/-/g, " ") || "Expedition"}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (t: Trip) => {
        const price = Number(t?.price);
        return (
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900">
              ₹{isNaN(price) ? "0" : price.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              per traveler
            </span>
          </div>
        );
      },
    },
    {
      key: "order",
      header: "Order",
      render: (t: Trip) => (
        <span className="text-xs font-black text-[#FF5400]">
          #{t?.order || 0}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (t: Trip) => (
        <span className="text-xs text-slate-700 font-medium">
          {t?.duration || "N/A"}
        </span>
      ),
    },
    {
      key: "itinerary",
      header: "Itinerary",
      render: (t: Trip) => {
        const durationStr = String(t?.duration || "");
        const daysMatch = durationStr.match(/(\d+)\s*(?:Days?|D)/i);
        const daysVal = daysMatch ? daysMatch[1] : "N/A";
        return (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md w-fit">
            <CalendarDays className="w-3.5 h-3.5 text-[#FF5400]" />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-bold text-slate-700">
                {daysVal}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Days
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (t: Trip) => {
        if (!t?.status) return null;
        const isPub = t.status === "published";
        return (
          <button
            type="button"
            onClick={() => toggleStatus(t)}
            className={cn(
              "cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors",
              isPub
                ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100"
                : "bg-[#FF4D00]/5 text-[#FF5400] border-[#FF4D00]/20 hover:bg-[#FF4D00]/10",
            )}
            title="Click to toggle status"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isPub ? "bg-green-600" : "bg-[#FF5400]",
              )}
            />
            {isPub ? "ACTIVE" : "DRAFT"}
          </button>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (t: Trip) => {
        if (!t) return null;
        return (
          <div className="flex gap-1 items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVendorTrip(t)}
              title="Manage Hotel & Transport Vendors"
              className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <Building2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(t)}
              title="Edit Itinerary & Pricing"
              className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDuplicateTrip(t)}
              title="Duplicate Trip (Copy Itinerary & SOP)"
              className="h-7 w-7 text-slate-400 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded-md"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(t.id)}
              title="Delete Trip"
              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (isEditingMode) {
    return (
      <TripFormEditor
        editing={editing}
        onSave={handleSave}
        onCancel={closeEditor}
      />
    );
  }

  return (
    <div className="p-0 md:p-0 pb-32 md:pb-0 bg-transparent min-h-0 text-[#0B1528]">
      {/* ─── Page Header & Key Actions ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 mb-3 md:mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
              Expeditions
            </h1>
            <span className="bg-[#FF4D00]/5 text-[#FF4D00] text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full border border-[#FF4D00]/20 uppercase tracking-wider shrink-0">
              Catalog OS
            </span>
          </div>
          <p className="hidden md:block text-xs text-slate-500 mt-0.5">
            Manage itineraries, pricing, variants & website display.
          </p>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 md:flex-wrap">
          <Button
            variant="outline"
            onClick={() => setSortModalOpen(true)}
            title="Reorder catalog"
            aria-label="Reorder catalog"
            className="h-9 w-9 md:h-8 md:w-auto px-0 md:px-3 rounded-lg text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs gap-1.5 shrink-0"
          >
            <GripVertical className="w-4 h-4 md:w-3.5 md:h-3.5 text-slate-400" />
            <span className="hidden md:inline">Reorder</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleShuffle}
            title="Shuffle catalog order"
            aria-label="Shuffle catalog order"
            className="h-9 w-9 md:h-8 md:w-auto px-0 md:px-3 rounded-lg text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs gap-1.5 shrink-0"
          >
            <Shuffle className="w-4 h-4 md:w-3.5 md:h-3.5 text-slate-400" />
            <span className="hidden md:inline">Shuffle</span>
          </Button>
          <Button
            onClick={openCreate}
            className="h-9 md:h-8 flex-1 md:flex-none px-3 md:px-3.5 rounded-lg text-xs font-bold bg-[#FF4D00] hover:bg-[#E04400] text-white shadow-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" /> New Expedition
          </Button>
        </div>
      </div>

      {/* ─── Compact Metrics Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-5">
        {[
          {
            label: "Total",
            value: metrics.total,
            valueClass: "text-slate-900",
            badge: "ALL",
            badgeClass: "bg-slate-50 border-slate-100 text-slate-400",
          },
          {
            label: "Published",
            value: metrics.published,
            valueClass: "text-green-600",
            badge: "LIVE",
            badgeClass: "bg-green-50 border-green-100 text-green-600",
          },
          {
            label: "Drafts",
            value: metrics.draft,
            valueClass: "text-amber-600",
            badge: "DEV",
            badgeClass: "bg-amber-50 border-amber-100 text-amber-600",
          },
          {
            label: "Categories",
            value: metrics.categories,
            valueClass: "text-[#FF5400]",
            badge: "CAT",
            badgeClass: "bg-[#FF4D00]/5 border-[#FF4D00]/20 text-[#FF5400]",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200/80 rounded-xl p-2.5 md:p-3.5 shadow-2xs flex items-center justify-between gap-2 min-w-0"
          >
            <div className="min-w-0">
              <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest block truncate">
                {card.label}
              </span>
              <span
                className={cn(
                  "text-lg md:text-xl font-black mt-0.5 block tabular-nums",
                  card.valueClass,
                )}
              >
                {card.value}
              </span>
            </div>
            <div
              className={cn(
                "w-7 h-7 md:w-8 md:h-8 rounded-lg border flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0",
                card.badgeClass,
              )}
            >
              {card.badge}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Compact Controls Bar & Data Table Container ─── */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-2.5 md:p-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 bg-slate-50/50">
          {/* Category Tabs — scroll-snapped chip strip on mobile */}
          <div className="flex items-center gap-1.5 md:gap-1 overflow-x-auto no-scrollbar snap-x scroll-px-2.5 -mx-2.5 px-2.5 md:mx-0 md:px-0">
            {[
              { id: "all", label: "All Catalog" },
              { id: "backpacking", label: "Backpacking" },
              { id: "roadtrip", label: "Road Trips" },
              { id: "international", label: "International" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryTab(tab.id)}
                className={cn(
                  "shrink-0 snap-start px-3 py-1.5 text-[11px] md:text-xs font-semibold rounded-full md:rounded-md transition-all whitespace-nowrap border",
                  categoryTab === tab.id
                    ? "bg-[#0B1528] border-[#0B1528] text-white md:bg-white md:border-slate-200/80 md:text-[#FF4D00] md:shadow-2xs"
                    : "bg-white border-slate-200 text-slate-600 md:border-transparent md:bg-transparent md:text-slate-500 md:hover:text-slate-900 md:hover:bg-slate-100/60",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Single search field + compact status filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trips..."
                className="h-9 md:h-8 w-full md:w-48 pl-8 pr-3 text-xs bg-white border border-slate-200/80 rounded-lg md:rounded-md outline-none focus:border-[#FF4D00] transition-all"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 md:h-8 text-xs font-semibold bg-white border border-slate-200/80 rounded-lg md:rounded-md px-2 md:px-2.5 text-slate-700 outline-none cursor-pointer focus:border-[#FF4D00] shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          </div>
        </div>

        {/* Mobile: card list (the desktop table has too many columns for 430px) */}
        <div className="md:hidden">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 flex gap-3">
                  <div className="h-12 w-12 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3 bg-slate-100 animate-pulse rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Search className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-xs font-medium text-slate-400 italic">
                No expeditions found
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {filtered.slice(0, mobileVisibleCount).map((t, idx) => {
                  const img =
                    t.heroImage ||
                    t.images?.[0] ||
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400";
                  const isPub = t.status === "published";
                  const price = Number(t?.price);
                  const meta = [
                    t.location &&
                    t.location.toLowerCase() !== "destination"
                      ? t.location
                      : null,
                    t.duration,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div key={t.id || idx} className="p-3 flex gap-3">
                      <img
                        src={img}
                        alt={t.title || ""}
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="text-sm font-semibold text-slate-900 text-left leading-snug line-clamp-2 min-w-0"
                          >
                            {t.title || "Untitled Expedition"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(t)}
                            className={cn(
                              "shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              isPub
                                ? "bg-green-50 text-green-600 border-green-100"
                                : "bg-[#FF4D00]/5 text-[#FF5400] border-[#FF4D00]/20",
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isPub ? "bg-green-600" : "bg-[#FF5400]",
                              )}
                            />
                            {isPub ? "Active" : "Draft"}
                          </button>
                        </div>

                        {meta && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {meta}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-slate-600 font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {t?.shortName || t?.id?.substring(0, 8) || "N/A"}
                            </span>
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                              ₹{isNaN(price) ? "0" : price.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setVendorTrip(t)}
                              aria-label="Manage vendors"
                              className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            >
                              <Building2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(t)}
                              aria-label="Edit expedition"
                              className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicateTrip(t)}
                              aria-label="Duplicate expedition"
                              className="h-8 w-8 text-slate-400 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded-lg"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(t.id)}
                              aria-label="Delete expedition"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length > mobileVisibleCount && (
                <div className="p-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={() => setMobileVisibleCount((c) => c + 12)}
                    className="w-full h-9 rounded-lg text-xs font-semibold border-slate-200 text-slate-700 bg-white"
                  >
                    Load more ({filtered.length - mobileVisibleCount} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop: full data table */}
        <div className="hidden md:block p-2">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            searchKey="title"
            searchPlaceholder="Search trips..."
            emptyMessage="No expeditions found"
            emptyIcon={<Search className="h-6 w-6 text-slate-300" />}
          />
        </div>
      </div>

      {/* Vendor Allocation Drawer Modal */}
      {vendorTrip && (
        <TripVendorsPanel
          tripId={vendorTrip.id}
          tripTitle={vendorTrip.title}
          tripPrice={vendorTrip.price}
          open={!!vendorTrip}
          onOpenChange={(open) => {
            if (!open) setVendorTrip(null);
          }}
        />
      )}

      {/* Sort Reorder Modal */}
      <TripSortModal
        open={sortModalOpen}
        onOpenChange={setSortModalOpen}
        trips={trips}
        onSaved={load}
      />
    </div>
  );
}

