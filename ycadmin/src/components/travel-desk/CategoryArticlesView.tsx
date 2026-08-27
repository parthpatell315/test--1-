import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Play,
  RefreshCw,
  Clock,
  Eye,
  AlertCircle,
  Save,
  CheckCircle,
  XCircle,
  Send,
  CheckSquare,
  FileText,
  Upload,
  Download,
  ExternalLink,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import api from "@/services/api";
import {
  travelDeskService,
  type TravelDeskArticle,
  type TripDocument,
} from "@/services/travelDesk.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategoryArticlesViewProps {
  tripId: string;
  category: { id: string; name: string; slug: string };
  onBack: () => void;
  onRefreshCount: () => void;
}

interface Article extends TravelDeskArticle {
  visibility: string;
}

export const CategoryArticlesView: React.FC<CategoryArticlesViewProps> = ({
  tripId,
  category,
  onBack,
  onRefreshCount,
}) => {
  // Main Tab State (only relevant for Sales Guide)
  const isSalesGuide = category.slug === "sales-guide";
  const [activeTab, setActiveTab] = useState<"articles" | "pdfs">("articles");

  // ARTICLES STATE
  const [articles, setArticles] = useState<TravelDeskArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");

  // Articles Form/Editor states
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<TravelDeskArticle> | null>(
    null,
  );
  const [activeArticleMenuId, setActiveArticleMenuId] = useState<string | null>(
    null,
  );

  // Article Form Fields
  const [artTitle, setArtTitle] = useState("");
  const [artSummary, setArtSummary] = useState("");
  const [artContent, setArtContent] = useState("");
  const [artTags, setArtTags] = useState("");
  const [artVisibility, setArtVisibility] = useState("INTERNAL");
  const [artEffectiveFrom, setArtEffectiveFrom] = useState("");
  const [artExpiresAt, setArtExpiresAt] = useState("");
  const [artSubmitting, setArtSubmitting] = useState(false);

  // PDF LIBRARY STATE
  const [pdfs, setPdfs] = useState<TripDocument[]>([]);
  const [pdfsLoading, setPdfsLoading] = useState(true);
  const [pdfsError, setPdfsError] = useState<string | null>(null);
  const [pdfSearchQuery, setPdfSearchQuery] = useState("");
  const [pdfRoleFilter, setPdfRoleFilter] = useState("ALL");

  // PDF Upload states
  const [dragOver, setDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    {
      name: string;
      progress: number;
      status: "uploading" | "success" | "error";
      errorMsg?: string;
    }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Actions states
  const [activePdfMenuId, setActivePdfMenuId] = useState<string | null>(null);
  const [editingPdf, setEditingPdf] = useState<TripDocument | null>(null);
  const [isEditingPdfMeta, setIsEditingPdfMeta] = useState(false);
  const [replacingPdf, setReplacingPdf] = useState<TripDocument | null>(null);

  // PDF Edit Metadata Form Fields
  const [pdfFormTitle, setPdfFormTitle] = useState("");
  const [pdfFormDesc, setPdfFormDesc] = useState("");
  const [pdfFormVisibility, setPdfFormVisibility] = useState("internal");
  const [pdfFormStatus, setPdfFormStatus] = useState("PUBLISHED");
  const [pdfFormSubmitting, setPdfFormSubmitting] = useState(false);

  // PDF Viewer states
  const [viewingPdf, setViewingPdf] = useState<TripDocument | null>(null);
  const [viewerZoom, setViewerZoom] = useState(100);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Articles
  const fetchArticles = async () => {
    setArticlesLoading(true);
    setArticlesError(null);
    try {
      const data = await travelDeskService.getArticles(tripId);
      const catArticles = (data || []).filter(
        (a: any) => a.categoryId === category.id,
      );
      setArticles(catArticles);
    } catch (err: any) {
      console.error(err);
      setArticlesError(
        err?.response?.data?.message || "Failed to load category content items",
      );
    } finally {
      setArticlesLoading(false);
    }
  };

  // Fetch PDFs
  const fetchPdfs = async () => {
    setPdfsLoading(true);
    setPdfsError(null);
    try {
      const res = await travelDeskService.getDocuments(tripId);
      if (res && res.data) {
        // Filter by Sales Guide category only
        const salesPdfs = res.data.filter(
          (d: any) => d.category === "Sales Guide",
        );
        setPdfs(salesPdfs);
      }
    } catch (err: any) {
      console.error(err);
      setPdfsError(
        err?.response?.data?.message || "Failed to load PDF library documents",
      );
    } finally {
      setPdfsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    if (isSalesGuide) {
      fetchPdfs();
    }
  }, [tripId, category.id]);

  // Bidirectional HTML/Bullet-points converters
  const convertHtmlToBullets = (html: string): string => {
    if (!html || !html.trim().startsWith("<")) return html;
    const liRegex = /<li>([\s\S]*?)<\/li>/gi;
    const items: string[] = [];
    let match;
    while ((match = liRegex.exec(html)) !== null) {
      items.push(`• ${match[1].trim()}`);
    }
    if (items.length > 0) return items.join("\n");
    return html;
  };

  const convertBulletsToHtml = (text: string): string => {
    if (!text) return "";
    const lines = text.split("\n");
    const hasBullets = lines.some((line) => /^\s*[•*\-]\s*/.test(line));
    if (!hasBullets) return text;

    const liItems = lines
      .map((line) => {
        const cleaned = line.replace(/^\s*[•*\-]\s*/, "").trim();
        if (!cleaned) return "";
        return `<li>${cleaned}</li>`;
      })
      .filter(Boolean);

    if (liItems.length > 0) {
      return `<ul>\n${liItems.join("\n")}\n</ul>`;
    }
    return text;
  };

  // Article handlers
  const handleOpenAddArticle = () => {
    setEditingArticle(null);
    setArtTitle("");
    setArtSummary("");
    setArtContent("");
    setArtTags("");
    setArtVisibility("INTERNAL");
    setArtEffectiveFrom("");
    setArtExpiresAt("");
    setIsEditingArticle(true);
  };

  const handleOpenEditArticle = (article: TravelDeskArticle) => {
    setEditingArticle(article);
    setArtTitle(article.title);
    setArtSummary(article.summary || "");
    setArtContent(convertHtmlToBullets(article.content));
    setArtTags(article.tags || "");
    setArtVisibility(article.visibility || "");
    setArtEffectiveFrom(
      article.effectiveFrom
        ? new Date(article.effectiveFrom).toISOString().split("T")[0]
        : "",
    );
    setArtExpiresAt(
      article.expiresAt
        ? new Date(article.expiresAt).toISOString().split("T")[0]
        : "",
    );
    setIsEditingArticle(true);
    setActiveArticleMenuId(null);
  };

  const handleSaveArticle = async (status: "DRAFT" | "UNDER_REVIEW") => {
    if (!artTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!artContent.trim()) {
      toast.error("Content is required");
      return;
    }

    setArtSubmitting(true);
    try {
      const payload = {
        categoryId: category.id,
        title: artTitle,
        summary: artSummary,
        content: convertBulletsToHtml(artContent),
        tags: artTags || null,
        visibility: artVisibility,
        effectiveFrom: artEffectiveFrom
          ? new Date(artEffectiveFrom).toISOString()
          : null,
        expiresAt: artExpiresAt ? new Date(artExpiresAt).toISOString() : null,
        status: status,
      };

      if (editingArticle?.id) {
        await travelDeskService.updateArticle(
          tripId,
          editingArticle.id,
          payload,
        );
        toast.success("Article updated successfully");
      } else {
        await travelDeskService.createArticle(tripId, payload);
        toast.success("Article created successfully");
      }

      setIsEditingArticle(false);
      fetchArticles();
      onRefreshCount();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save article");
    } finally {
      setArtSubmitting(false);
    }
  };

  const handleTransitionArticleStatus = async (
    articleId: string,
    targetStatus: string,
  ) => {
    try {
      await travelDeskService.changeArticleStatus(
        tripId,
        articleId,
        targetStatus,
      );
      toast.success(`Article status updated to ${targetStatus}`);
      fetchArticles();
      onRefreshCount();
      setActiveArticleMenuId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to update article status",
      );
    }
  };

  const handleArchiveArticle = async (articleId: string) => {
    if (!confirm("Are you sure you want to archive this article?")) return;
    try {
      await travelDeskService.changeArticleStatus(
        tripId,
        articleId,
        "ARCHIVED",
      );
      toast.success("Article archived successfully");
      fetchArticles();
      onRefreshCount();
      setActiveArticleMenuId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to archive article");
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this draft article?",
      )
    )
      return;
    try {
      await travelDeskService.changeArticleStatus(
        tripId,
        articleId,
        "ARCHIVED",
      );
      toast.success("Article deleted successfully (moved to archive)");
      fetchArticles();
      onRefreshCount();
      setActiveArticleMenuId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete article");
    }
  };

  // PDF Library upload handlers
  const handlePdfUpload = async (
    filesList: FileList | null,
    isReplacement: boolean = false,
  ) => {
    if (!filesList || filesList.length === 0) return;

    const validFiles: File[] = [];
    const newUploads = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      // Validation: PDF only
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        toast.error(`File ${file.name} is not a PDF.`);
        continue;
      }

      // Validation: Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds the 10MB limit.`);
        continue;
      }

      validFiles.push(file);
      newUploads.push({
        name: file.name,
        progress: 10,
        status: "uploading" as const,
      });
    }

    if (validFiles.length === 0) return;

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    for (const file of validFiles) {
      try {
        // Upload via service (if replacement, we can pass replacement parameters or let it version match name)
        const nameToUse =
          isReplacement && replacingPdf ? replacingPdf.name : file.name;

        // Construct custom FormData or override name
        const formData = new FormData();
        formData.append("tripId", tripId);
        formData.append("category", "Sales Guide");
        formData.append(
          "visibility",
          isReplacement && replacingPdf ? replacingPdf.visibility : "internal",
        );
        formData.append("files", file);

        // Hit api directly to handle custom file upload
        const res = await api.post(`/travel-desk/documents/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data && res.data.success) {
          // If it was a replacement, we automatically archive the old one
          if (isReplacement && replacingPdf) {
            await travelDeskService.reviewDocument(replacingPdf.id, "ARCHIVED");
            toast.success(
              `Preserved version ${replacingPdf.version} and uploaded version ${replacingPdf.version + 1}`,
            );
            setReplacingPdf(null);
          } else {
            toast.success(`Successfully uploaded ${file.name}`);
          }

          setUploadingFiles((prev) =>
            prev.map((u) =>
              u.name === file.name
                ? { ...u, progress: 100, status: "success" }
                : u,
            ),
          );
        } else {
          throw new Error("Upload failed");
        }
      } catch (err: any) {
        console.error(err);
        const errMsg = err?.response?.data?.message || "Upload failed";
        toast.error(`Failed to upload ${file.name}: ${errMsg}`);
        setUploadingFiles((prev) =>
          prev.map((u) =>
            u.name === file.name
              ? { ...u, status: "error", errorMsg: errMsg }
              : u,
          ),
        );
      }
    }

    // Refresh after completion
    fetchPdfs();
    onRefreshCount();

    // Clear progress indicator after 3 seconds
    setTimeout(() => {
      setUploadingFiles([]);
    }, 4000);
  };

  // PDF Action handlers
  const handleOpenEditPdfMeta = (pdf: TripDocument) => {
    setEditingPdf(pdf);
    setPdfFormTitle(pdf.title);
    setPdfFormDesc(pdf.approvalDetails?.description || "");
    setPdfFormVisibility(pdf.visibility || "internal");
    setPdfFormStatus(pdf.status);
    setIsEditingPdfMeta(true);
    setActivePdfMenuId(null);
  };

  const handleSavePdfMeta = async () => {
    if (!editingPdf) return;
    if (!pdfFormTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    setPdfFormSubmitting(true);
    try {
      await travelDeskService.updateDocument(editingPdf.id, {
        title: pdfFormTitle,
        description: pdfFormDesc,
        visibility: pdfFormVisibility,
        status: pdfFormStatus,
      });
      toast.success("Document metadata updated");
      setIsEditingPdfMeta(false);
      setEditingPdf(null);
      fetchPdfs();
      onRefreshCount();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update metadata");
    } finally {
      setPdfFormSubmitting(false);
    }
  };

  const handleArchivePdf = async (pdfId: string) => {
    if (
      !confirm(
        "Are you sure you want to archive this document? Published PDFs cannot be deleted; they must be archived.",
      )
    )
      return;
    try {
      await travelDeskService.reviewDocument(pdfId, "ARCHIVED");
      toast.success("Document archived successfully");
      fetchPdfs();
      onRefreshCount();
      setActivePdfMenuId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to archive document");
    }
  };

  const handleRestorePdf = async (pdfId: string) => {
    try {
      await travelDeskService.reviewDocument(pdfId, "PUBLISHED");
      toast.success("Document restored/published successfully");
      fetchPdfs();
      onRefreshCount();
      setActivePdfMenuId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to restore document");
    }
  };

  // Full Screen viewer trigger
  const handleToggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen().catch((err) => {
        toast.error("Error enabling full screen");
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handlePdfUpload(e.dataTransfer.files);
  };

  // Filters for Articles
  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      (a.summary &&
        a.summary.toLowerCase().includes(articleSearchQuery.toLowerCase())) ||
      a.content.toLowerCase().includes(articleSearchQuery.toLowerCase()),
  );

  // Filters for PDFs
  const groupedPdfsMap = new Map<string, TripDocument>();
  pdfs.forEach((p) => {
    const key = p.name.toLowerCase();
    const existing = groupedPdfsMap.get(key);
    if (!existing || p.version > existing.version) {
      groupedPdfsMap.set(key, p);
    }
  });

  const latestPdfs = Array.from(groupedPdfsMap.values());

  const filteredPdfs = latestPdfs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(pdfSearchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(pdfSearchQuery.toLowerCase()) ||
      (p.approvalDetails?.description &&
        p.approvalDetails.description
          .toLowerCase()
          .includes(pdfSearchQuery.toLowerCase()));

    const matchesRole =
      pdfRoleFilter === "ALL" ||
      p.visibility.toLowerCase() === pdfRoleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F4F7FB]">
      {/* HEADER SECTION */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {category.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Manage guides, pitch docs, objections and PDFs
            </p>
          </div>
        </div>

        {/* TAB CONTROLS (Only visible for Sales Guide category) */}
        {isSalesGuide && !isEditingArticle && !isEditingPdfMeta && (
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            <button
              onClick={() => setActiveTab("articles")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                activeTab === "articles"
                  ? "bg-white text-[#FF6B00] shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              Sales Articles
            </button>
            <button
              onClick={() => setActiveTab("pdfs")}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                activeTab === "pdfs"
                  ? "bg-white text-[#FF6B00] shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              PDF Library
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {(!isSalesGuide || activeTab === "articles") && !isEditingArticle && (
            <button
              onClick={handleOpenAddArticle}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#FF4D00] text-white rounded-lg text-xs font-black shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Article</span>
            </button>
          )}

          {isSalesGuide && activeTab === "pdfs" && !isEditingPdfMeta && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-black shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDFs</span>
            </button>
          )}
        </div>
      </div>

      {/* ARTICLE EDIT / CREATE FORM PANEL */}
      {isEditingArticle && (
        <div className="flex-1 overflow-y-auto p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {editingArticle?.id
                ? "Edit Content Article"
                : "Create Content Article"}
            </h3>
            <button
              onClick={() => setIsEditingArticle(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
              Title *
            </label>
            <input
              type="text"
              value={artTitle}
              onChange={(e) => setArtTitle(e.target.value)}
              placeholder="Enter title (e.g. FAQ Question)"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
              Tags
            </label>
            <input
              type="text"
              value={artTags}
              onChange={(e) => setArtTags(e.target.value)}
              placeholder="Comma separated keywords"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
              Summary / Pitch
            </label>
            <textarea
              value={artSummary}
              onChange={(e) => setArtSummary(e.target.value)}
              placeholder="Short elevator pitch..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
              Content Details *
            </label>
            <textarea
              value={artContent}
              onChange={(e) => setArtContent(e.target.value)}
              placeholder="Enter full descriptive details..."
              rows={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                Visibility
              </label>
              <select
                value={artVisibility}
                onChange={(e) => setArtVisibility(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              >
                <option value="INTERNAL">Internal Only (Sales/Ops)</option>
                <option value="PUBLIC">Public (Website/Documents)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                Effective From
              </label>
              <input
                type="date"
                value={artEffectiveFrom}
                onChange={(e) => setArtEffectiveFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                Expires At
              </label>
              <input
                type="date"
                value={artExpiresAt}
                onChange={(e) => setArtExpiresAt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 justify-end">
            <button
              onClick={() => handleSaveArticle("DRAFT")}
              disabled={artSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
            <button
              onClick={() => handleSaveArticle("UNDER_REVIEW")}
              disabled={artSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-black shadow-2xs hover:bg-slate-750 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Submit for Review
            </button>
          </div>
        </div>
      )}

      {/* PDF METADATA EDIT FORM PANEL */}
      {isEditingPdfMeta && (
        <div className="flex-1 overflow-y-auto p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Edit PDF Document Info
            </h3>
            <button
              onClick={() => setIsEditingPdfMeta(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
              Document Title *
            </label>
            <input
              type="text"
              value={pdfFormTitle}
              onChange={(e) => setPdfFormTitle(e.target.value)}
              placeholder="e.g. Sales Objection Handling Guide"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
              Description
            </label>
            <textarea
              value={pdfFormDesc}
              onChange={(e) => setPdfFormDesc(e.target.value)}
              placeholder="Detail what this pitch sheet or guide contains..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                Role Visibility
              </label>
              <select
                value={pdfFormVisibility}
                onChange={(e) => setPdfFormVisibility(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              >
                <option value="admin">Admin / Super Admin Only</option>
                <option value="sales_head">Sales Head & Admins</option>
                <option value="sales">Sales Team, Sales Head & Admins</option>
                <option value="operations">Operations & Admins</option>
                <option value="guide">Tour Guides / Leaders</option>
                <option value="internal">All Internal Staff (default)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">
                Publication Status
              </label>
              <select
                value={pdfFormStatus}
                onChange={(e) => setPdfFormStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              >
                <option value="DRAFT">Draft (Admin Only)</option>
                <option value="PUBLISHED">Published (Visible to roles)</option>
                <option value="ARCHIVED">Archived (Hidden)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 justify-end">
            <button
              onClick={handleSavePdfMeta}
              disabled={pdfFormSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs font-black shadow-2xs hover:bg-[#FF4D00] cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Document Info
            </button>
          </div>
        </div>
      )}

      {/* ARTICLES LISTING TAB */}
      {(!isSalesGuide || activeTab === "articles") &&
        !isEditingArticle &&
        !isEditingPdfMeta && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-white shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search Sales Articles...`}
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                />
                <Search className="absolute right-3 top-2 text-slate-400 w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {articlesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FF6B00]" />
                  <span className="text-xs font-bold">Loading guides...</span>
                </div>
              ) : articlesError ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{articlesError}</span>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto mt-6 shadow-2xs">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    No articles yet
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">
                    Add sales arguments, objection sheets or guidelines.
                  </p>
                  <button
                    onClick={handleOpenAddArticle}
                    className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs font-black shadow-2xs hover:bg-[#FF4D00] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Article
                  </button>
                </div>
              ) : (
                filteredArticles.map((art) => {
                  const effectiveStatus =
                    art.status === "PUBLISHED" &&
                    art.expiresAt &&
                    new Date(art.expiresAt) <= new Date()
                      ? "EXPIRED"
                      : art.status;
                  const showMenu = activeArticleMenuId === art.id;

                  return (
                    <div
                      key={art.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between relative"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                                effectiveStatus === "PUBLISHED"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : effectiveStatus === "UNDER_REVIEW"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : effectiveStatus === "CHANGES_REQUESTED"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : effectiveStatus === "ARCHIVED"
                                        ? "bg-slate-100 text-slate-600 border-slate-300"
                                        : "bg-blue-50 text-blue-700 border-blue-200",
                              )}
                            >
                              {effectiveStatus}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {art.visibility}
                            </span>
                          </div>

                          <h4 className="text-xs font-black text-slate-800 leading-snug break-words">
                            {art.title}
                          </h4>
                          {art.summary && (
                            <p className="text-[10px] font-semibold text-slate-500 italic mt-1 bg-slate-50/50 p-1.5 rounded-md border border-slate-100 leading-relaxed">
                              {art.summary}
                            </p>
                          )}
                          {art.content.trim().startsWith("<") ? (
                            <div className="text-[11px] font-medium text-slate-650 mt-2 leading-relaxed border-t border-slate-50 pt-2 pl-1 space-y-1">
                              <style>{`
                              .rich-content-list ul { list-style-type: disc !important; padding-left: 1.25rem !important; margin-top: 0.25rem !important; margin-bottom: 0.25rem !important; }
                              .rich-content-list li { display: list-item !important; list-style-type: disc !important; margin-bottom: 0.25rem !important; }
                            `}</style>
                              <div
                                className="rich-content-list"
                                dangerouslySetInnerHTML={{
                                  __html: art.content,
                                }}
                              />
                            </div>
                          ) : (
                            <p className="text-[11px] font-medium text-slate-650 mt-2 whitespace-pre-wrap leading-relaxed border-t border-slate-50 pt-2">
                              {art.content}
                            </p>
                          )}
                        </div>

                        <div className="relative shrink-0">
                          <button
                            onClick={() =>
                              setActiveArticleMenuId(showMenu ? null : art.id)
                            }
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {showMenu && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveArticleMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-md py-1 z-20 text-xs font-semibold text-slate-700">
                                <button
                                  onClick={() => handleOpenEditArticle(art)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                                  Edit Article
                                </button>

                                {effectiveStatus === "DRAFT" && (
                                  <button
                                    onClick={() =>
                                      handleTransitionArticleStatus(
                                        art.id,
                                        "UNDER_REVIEW",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-slate-400" />
                                    Submit Review
                                  </button>
                                )}

                                {effectiveStatus === "UNDER_REVIEW" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleTransitionArticleStatus(
                                          art.id,
                                          "APPROVED",
                                        )
                                      }
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-green-600"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                      Approve Draft
                                    </button>
                                  </>
                                )}

                                {effectiveStatus === "APPROVED" && (
                                  <button
                                    onClick={() =>
                                      handleTransitionArticleStatus(
                                        art.id,
                                        "PUBLISHED",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-blue-600 font-bold"
                                  >
                                    <Play className="w-3.5 h-3.5 text-blue-400" />
                                    Publish Article
                                  </button>
                                )}

                                {effectiveStatus === "PUBLISHED" && (
                                  <button
                                    onClick={() => handleArchiveArticle(art.id)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-slate-500"
                                  >
                                    <Archive className="w-3.5 h-3.5 text-slate-400" />
                                    Archive
                                  </button>
                                )}

                                {effectiveStatus === "ARCHIVED" && (
                                  <button
                                    onClick={() =>
                                      handleTransitionArticleStatus(
                                        art.id,
                                        "DRAFT",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-blue-600"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                                    Restore Draft
                                  </button>
                                )}

                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => {
                                    if (
                                      effectiveStatus === "DRAFT" ||
                                      effectiveStatus === "CHANGES_REQUESTED"
                                    ) {
                                      handleDeleteArticle(art.id);
                                    } else {
                                      handleArchiveArticle(art.id);
                                    }
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  Delete / Archive
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* PDF DOCUMENT LIBRARY TAB */}
      {isSalesGuide &&
        activeTab === "pdfs" &&
        !isEditingArticle &&
        !isEditingPdfMeta && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* DRAG AND DROP ZONE */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "m-4 border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center shrink-0 cursor-pointer",
                dragOver
                  ? "border-[#FF6B00] bg-[#FF4D00]/5/30 scale-98"
                  : "border-slate-350 hover:border-[#FF6B00] bg-white",
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf"
                className="hidden"
                onChange={(e) => handlePdfUpload(e.target.files)}
              />
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-550 border border-slate-150 mb-2">
                <Upload className="w-5 h-5 text-slate-500" />
              </div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Drag & Drop Sales Guides PDFs
              </h4>
              <p className="text-[10px] font-semibold text-slate-450 mt-1">
                Accepts PDF files only up to 10 MB each. Select multiple files
                to upload simultaneously.
              </p>
            </div>

            {/* UPLOAD STATUS PROGRESS LIST */}
            {uploadingFiles.length > 0 && (
              <div className="mx-4 p-3 bg-white border border-slate-200 rounded-xl space-y-2 shrink-0">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Uploading Progress ({uploadingFiles.length} files)
                </span>
                {uploadingFiles.map((uf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] font-bold"
                  >
                    <span className="truncate w-1/2 text-slate-700">
                      {uf.name}
                    </span>
                    <div className="w-1/3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          uf.status === "error"
                            ? "bg-red-500"
                            : "bg-green-600",
                        )}
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase font-black shrink-0",
                        uf.status === "success"
                          ? "text-green-600"
                          : uf.status === "error"
                            ? "text-red-600"
                            : "text-blue-600",
                      )}
                    >
                      {uf.status === "success"
                        ? "Success"
                        : uf.status === "error"
                          ? "Error"
                          : `${uf.progress}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* FILTERS & SEARCH ROW */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search PDF library..."
                  value={pdfSearchQuery}
                  onChange={(e) => setPdfSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                />
                <Search className="absolute right-3 top-2 text-slate-400 w-3.5 h-3.5" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-450">
                  Role Visibility:
                </span>
                <select
                  value={pdfRoleFilter}
                  onChange={(e) => setPdfRoleFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-[#FF6B00]"
                >
                  <option value="ALL">All Roles</option>
                  <option value="internal">All Internal</option>
                  <option value="admin">Admin Only</option>
                  <option value="sales_head">Sales Head</option>
                  <option value="sales">Sales Team</option>
                  <option value="operations">Operations</option>
                  <option value="guide">Guide</option>
                </select>
              </div>
            </div>

            {/* PDF LIST VIEW */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {pdfsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FF6B00]" />
                  <span className="text-xs font-bold">
                    Loading PDF documents...
                  </span>
                </div>
              ) : pdfsError ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{pdfsError}</span>
                </div>
              ) : filteredPdfs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto mt-6 shadow-2xs">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    No PDF Documents Yet
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">
                    Upload pitch sheets, Objections guides or policies.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs font-black shadow-2xs hover:bg-[#FF4D00] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First PDF</span>
                  </button>
                </div>
              ) : (
                filteredPdfs.map((pdf) => {
                  const showMenu = activePdfMenuId === pdf.id;

                  return (
                    <div
                      key={pdf.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-start justify-between gap-4 cursor-pointer hover:border-slate-350 transition-all"
                      onClick={() => setViewingPdf(pdf)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                pdf.status === "PUBLISHED"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : pdf.status === "ARCHIVED"
                                    ? "bg-slate-100 text-slate-600 border-slate-300"
                                    : "bg-blue-50 text-blue-700 border-blue-200",
                              )}
                            >
                              {pdf.status}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-50 px-1 border border-slate-150 rounded">
                              V{pdf.version}
                            </span>
                            <span className="text-[8.5px] font-black text-slate-450 uppercase tracking-wide">
                              Role: {pdf.visibility}
                            </span>
                          </div>
                          <h4
                            className="text-xs font-black text-slate-800 truncate pr-4"
                            title={pdf.title || pdf.name}
                          >
                            {pdf.title || pdf.name}
                          </h4>
                          {pdf.approvalDetails?.description && (
                            <p className="text-[10px] font-semibold text-slate-500 italic mt-0.5 line-clamp-2">
                              {pdf.approvalDetails.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[9.5px] font-bold text-slate-400">
                            <span>Size: {pdf.size || "N/A"}</span>
                            <span>•</span>
                            <span>By: {pdf.addedBy}</span>
                            <span>•</span>
                            <span>
                              {new Date(pdf.dateAdded).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PDF THREE-DOT ACTION MENU */}
                      <div
                        className="relative shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setActivePdfMenuId(showMenu ? null : pdf.id)
                          }
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActivePdfMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-md py-1 z-20 text-xs font-semibold text-slate-700">
                              <button
                                onClick={() => handleOpenEditPdfMeta(pdf)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-450" />
                                Rename / Visibility
                              </button>

                              <button
                                onClick={() => {
                                  setReplacingPdf(pdf);
                                  fileInputRef.current?.click();
                                  setActivePdfMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-450" />
                                Replace File (New V)
                              </button>

                              {pdf.status !== "ARCHIVED" ? (
                                <button
                                  onClick={() => handleArchivePdf(pdf.id)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-slate-500"
                                >
                                  <Archive className="w-3.5 h-3.5 text-slate-450" />
                                  Archive Document
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestorePdf(pdf.id)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-blue-600"
                                >
                                  <Play className="w-3.5 h-3.5 text-blue-450" />
                                  Restore & Publish
                                </button>
                              )}

                              {pdf.fileUrl && (
                                <>
                                  <div className="border-t border-slate-100 my-1" />
                                  <a
                                    href={pdf.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer text-blue-600 font-bold"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-450" />
                                    Open in New Tab
                                  </a>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* EMBEDDED PDF VIEWER OVERLAY */}
      {viewingPdf && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            ref={viewerContainerRef}
            className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col relative text-white"
          >
            {/* Viewer Control Bar */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-red-600 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider truncate pr-3">
                    {viewingPdf.title || viewingPdf.name}
                  </h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    Version {viewingPdf.version} • {viewingPdf.size}
                  </span>
                </div>
              </div>

              {/* View Control Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Zoom Controls */}
                <button
                  onClick={() =>
                    setViewerZoom((prev) => Math.max(50, prev - 10))
                  }
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-extrabold px-1 text-slate-300 shrink-0">
                  {viewerZoom}%
                </span>
                <button
                  onClick={() =>
                    setViewerZoom((prev) => Math.min(200, prev + 10))
                  }
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-700 mx-2 shrink-0" />

                {/* Full Screen */}
                <button
                  onClick={handleToggleFullscreen}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Full Screen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Download */}
                {viewingPdf.fileUrl && (
                  <a
                    href={viewingPdf.fileUrl}
                    download={viewingPdf.name}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Download Document"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {/* Open in New Tab */}
                {viewingPdf.fileUrl && (
                  <a
                    href={viewingPdf.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <div className="w-px h-4 bg-slate-700 mx-2 shrink-0" />

                {/* Close Viewer */}
                <button
                  onClick={() => setViewingPdf(null)}
                  className="p-1.5 hover:bg-slate-800 hover:text-red-400 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  title="Close Viewer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Iframe Body */}
            <div className="flex-1 bg-slate-850 p-6 flex items-center justify-center overflow-auto relative">
              {viewingPdf.fileUrl ? (
                (() => {
                  const apiBase =
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1"
                      ? "http://localhost:3001/api"
                      : "https://api.youthcamping.online/api";
                  const iframeUrl = `${apiBase}/travel-desk/documents/${viewingPdf.id}/view`;
                  return (
                    <iframe
                      src={iframeUrl}
                      title={viewingPdf.title || viewingPdf.name}
                      className="bg-white rounded-lg shadow-xl transition-all duration-250 border border-slate-700"
                      style={{
                        width: `${viewerZoom}%`,
                        height: "100%",
                        maxWidth: "100%",
                        minWidth: "60%",
                      }}
                    />
                  );
                })()
              ) : (
                <div className="text-center text-slate-400 text-xs">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <span>PDF location URL not found.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


