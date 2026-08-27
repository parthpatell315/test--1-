import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { toast } from "sonner";
import {
  Search,
  Plus,
  FileText,
  BookOpen,
  HelpCircle,
  ListChecks,
  Users,
  FileCode,
  Paperclip,
  Image,
  History,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";

export type KnowledgeSection =
  | "overview"
  | "sales_guide"
  | "faqs"
  | "itinerary"
  | "inclusions"
  | "vendors"
  | "sops"
  | "documents"
  | "gallery"
  | "activity_log";

export interface KnowledgeItem {
  id: string;
  tripId: string;
  section: KnowledgeSection;
  contentType: "text" | "file" | "structured_data";
  title: string;
  body: string;
  data?: any;
  status: "draft" | "published";
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface KnowledgeHubProps {
  tripId: string;
  initialTab?: KnowledgeSection;
}

const TABS: { key: KnowledgeSection; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "sales_guide", label: "Sales Guide", icon: FileText },
  { key: "faqs", label: "FAQs", icon: HelpCircle },
  { key: "inclusions", label: "Inclusions/Exclusions", icon: ListChecks },
  { key: "vendors", label: "Vendor Directory", icon: Users },
  { key: "sops", label: "SOPs", icon: FileCode },
  { key: "documents", label: "Documents", icon: Paperclip },
  { key: "gallery", label: "Gallery", icon: Image },
  { key: "activity_log", label: "Activity Log", icon: History },
];

export const KnowledgeHub: React.FC<KnowledgeHubProps> = ({
  tripId,
  initialTab = "overview",
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<KnowledgeSection>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formContentType, setFormContentType] = useState<
    "text" | "file" | "structured_data"
  >("text");
  const [formStatus, setFormStatus] = useState<"draft" | "published">("draft");

  // Debounce search query (500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 1. Fetch Section Items
  const {
    data: sectionData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["trip-knowledge", tripId, activeTab],
    queryFn: async () => {
      if (activeTab === "documents") {
        const res = await api.get(`/trips/${tripId}/documents`);
        return {
          items: (res.data?.data?.documents || []).map((doc: any) => ({
            id: doc.id,
            tripId: doc.tripId,
            section: "documents",
            contentType: "file",
            title: doc.name || doc.fileName,
            body: `Category: ${doc.category} | File URL: ${doc.fileUrl}`,
            status: doc.status || "published",
            version: doc.version || 1,
            createdBy: doc.uploadedBy,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt || doc.createdAt,
            author: doc.uploader,
          })),
          total: res.data?.data?.total || 0,
        };
      }
      if (activeTab === "sops") {
        const res = await api.get(`/trips/${tripId}/sops`);
        return {
          items: (res.data?.data?.sops || []).map((sop: any) => ({
            id: sop.id,
            tripId: sop.tripId,
            section: "sops",
            contentType: "structured_data",
            title: sop.title,
            body: sop.description,
            data: sop.steps,
            status: sop.status || "draft",
            version: sop.version || 1,
            createdBy: sop.createdBy,
            createdAt: sop.createdAt,
            updatedAt: sop.updatedAt,
            author: sop.author,
          })),
          total: res.data?.data?.total || 0,
        };
      }
      if (activeTab === "vendors") {
        const res = await api.get(`/trips/${tripId}/vendors`);
        return {
          items: (res.data?.data?.vendors || []).map((v: any) => ({
            id: v.id,
            tripId: v.tripId,
            section: "vendors",
            contentType: "structured_data",
            title: `${v.contactName || "Vendor"} (${v.role || "Partner"})`,
            body: `Phone: ${v.contactPhone || "N/A"} | Email: ${v.contactEmail || "N/A"} \nNotes: ${v.notes || "None"}`,
            status: "published",
            version: 1,
            createdBy: "system",
            createdAt: v.createdAt || new Date().toISOString(),
            updatedAt: v.createdAt || new Date().toISOString(),
          })),
          total: res.data?.data?.total || 0,
        };
      }
      if (activeTab === "activity_log") {
        const res = await api.get(`/trips/${tripId}/activity`);
        return {
          items: (res.data?.data?.activities || []).map((act: any) => ({
            id: act.id,
            tripId: act.tripId,
            section: "activity_log",
            contentType: "text",
            title: `${act.action.toUpperCase()} in ${act.section}`,
            body: JSON.stringify(act.changes, null, 2),
            status: "published",
            version: 1,
            createdBy: act.performedBy,
            createdAt: act.createdAt,
            updatedAt: act.createdAt,
            author: act.actor,
          })),
          total: res.data?.data?.total || 0,
        };
      }

      const res = await api.get(`/trips/${tripId}/knowledge/${activeTab}`);
      return {
        items: res.data?.data?.items || [],
        total: res.data?.data?.total || 0,
      };
    },
    enabled: !!tripId,
  });

  // 2. Global Search Query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["trip-knowledge-search", tripId, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const res = await api.get(
        `/trips/${tripId}/knowledge/search?q=${encodeURIComponent(debouncedSearch)}`,
      );
      return res.data?.data?.results || [];
    },
    enabled: !!debouncedSearch,
  });

  // 3. Create/Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formTitle,
        body: formBody,
        contentType: formContentType,
        status: formStatus,
      };
      if (editingItem) {
        return api.put(`/trips/${tripId}/knowledge/${editingItem.id}`, payload);
      }
      return api.post(`/trips/${tripId}/knowledge/${activeTab}`, payload);
    },
    onSuccess: () => {
      toast.success(
        editingItem ? "Knowledge item updated!" : "Knowledge item created!",
      );
      queryClient.invalidateQueries({
        queryKey: ["trip-knowledge", tripId, activeTab],
      });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Failed to save knowledge item",
      );
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/trips/${tripId}/knowledge/${id}`);
    },
    onSuccess: () => {
      toast.success("Item deleted successfully!");
      queryClient.invalidateQueries({
        queryKey: ["trip-knowledge", tripId, activeTab],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete item");
    },
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormBody("");
    setFormContentType("text");
    setFormStatus("draft");
    setIsModalOpen(true);
  };

  const openEditModal = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormBody(item.body);
    setFormContentType(item.contentType);
    setFormStatus(item.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormTitle("");
    setFormBody("");
  };

  const handleSearchResultClick = (result: any) => {
    if (result.section) {
      setActiveTab(result.section as KnowledgeSection);
    }
    setHighlightItemId(result.id);
    setSearchQuery("");
    setTimeout(() => {
      const el = document.getElementById(`item-${result.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };

  const itemsList: KnowledgeItem[] = sectionData?.items || [];

  return (
    <div className="admin-page text-[#0A192F]">
      {/* ─── Top Header & Global Search Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#0A192F]">
            Travel Desk Knowledge Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Central repository for trips, SOPs, FAQs, and vendor operations
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all knowledge items..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {debouncedSearch && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Searching...
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((res: any) => (
                  <div
                    key={res.id}
                    onClick={() => handleSearchResultClick(res)}
                    className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                      <span className="truncate pr-2">{res.title}</span>
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-100 text-[#FF4D00]">
                        {res.section || "General"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {res.body}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching items found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Navigation Tabs Strip ─── */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm mb-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#0A192F] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? "text-[#FF4D00]" : "text-slate-400"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Add Item CTAs */}
        {!["documents", "vendors", "activity_log"].includes(activeTab) && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-[#FF4D00] hover:bg-[#e06100] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all shadow-xs shrink-0 ml-4"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* ─── Main Content Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              <div className="h-16 bg-slate-50 rounded"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3 max-w-md mx-auto my-12">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            Failed to load knowledge content
          </h3>
          <p className="text-xs text-slate-500">
            {(error as any)?.response?.data?.message || (error as any)?.message}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : itemsList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 max-w-md mx-auto my-8 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            No items found in {activeTab.replace("_", " ")}
          </h3>
          <p className="text-xs text-slate-500">
            Create new items or SOPs to populate this knowledge section.
          </p>
          {!["documents", "vendors", "activity_log"].includes(activeTab) && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF4D00] text-white text-xs font-bold rounded-lg transition-all hover:bg-[#e06100]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Item</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {itemsList.map((item) => {
            const isHighlighted = highlightItemId === item.id;
            return (
              <div
                id={`item-${item.id}`}
                key={item.id}
                className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-md ${
                  isHighlighted
                    ? "border-[#FF4D00] ring-2 ring-[#FF4D00]/20 bg-[#FF4D00]/5/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                      {item.title}
                    </h3>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                        item.status === "published"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.body.length > 200
                      ? `${item.body.substring(0, 200)}...`
                      : item.body}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>{item.author?.name || "System"}</span>
                    <span>•</span>
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {!["documents", "vendors", "activity_log"].includes(
                      activeTab,
                    ) && (
                      <>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this item?",
                              )
                            ) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add / Edit Item Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0A192F]">
                {editingItem
                  ? "Edit Knowledge Item"
                  : `Add Item to ${activeTab.replace("_", " ")}`}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Content Body *
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Enter details, description, or instructions..."
                  rows={5}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Content Type
                  </label>
                  <select
                    value={formContentType}
                    onChange={(e: any) => setFormContentType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] font-medium"
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                    <option value="structured_data">Structured Data</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] font-medium"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  !formTitle.trim() ||
                  !formBody.trim()
                }
                className="px-5 py-2 bg-[#FF4D00] hover:bg-[#e06100] text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Item Preview Modal ─── */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-[#FF4D00] tracking-wider block">
                  {previewItem.section.replace("_", " ")}
                </span>
                <h2 className="text-base font-bold text-[#0A192F] mt-0.5">
                  {previewItem.title}
                </h2>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {previewItem.body}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>Author: {previewItem.author?.name || "System"}</span>
              <span>Version: v{previewItem.version}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeHub;

