import React, { useState, useEffect, useRef } from "react";
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  File,
  Trash2,
  RefreshCw,
  Eye,
  Download,
  Send,
  History,
  Check,
  X,
  Search,
  Filter,
  ExternalLink,
  MessageSquare,
  Mail,
  AlertCircle,
  Plus,
  Edit2,
  ShieldAlert,
} from "lucide-react";
import {
  attachmentsService,
  BookingAttachment,
} from "@/services/attachments.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingAttachmentsTabProps {
  bookingId: string;
  booking: any;
  userRole?: string; // 'superadmin' | 'admin' | 'operations' | 'sales'
}

export default function BookingAttachmentsTab({
  bookingId,
  booking,
  userRole,
}: BookingAttachmentsTabProps) {
  const isReadOnly = userRole === "sales";

  const [attachments, setAttachments] = useState<BookingAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Selection state for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Upload modal & Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [fileTitles, setFileTitles] = useState<string[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Replace modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [targetAttachment, setTargetAttachment] =
    useState<BookingAttachment | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceTitle, setReplaceTitle] = useState("");
  const [replaceDescription, setReplaceDescription] = useState("");
  const [replacing, setReplacing] = useState(false);

  // Edit metadata modal state
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingMetadata, setUpdatingMetadata] = useState(false);

  // Version history modal state
  const [versionHistoryModalOpen, setVersionHistoryModalOpen] = useState(false);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFileType, setPreviewFileType] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Send modal state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState<"EMAIL" | "WHATSAPP" | "BOTH">(
    "EMAIL",
  );
  const [sendTargetIds, setSendTargetIds] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await attachmentsService.getByBooking(bookingId);
      setAttachments(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load booking attachments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchAttachments();
    }
  }, [bookingId]);

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get file type icon & badge styling
  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
    const type = (fileType || "").toLowerCase();

    if (type.includes("pdf") || ext === "pdf") {
      return {
        icon: FileText,
        color: "text-red-600",
        bg: "bg-red-50 border-red-100",
        label: "PDF",
      };
    }
    if (
      type.includes("image") ||
      ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ) {
      return {
        icon: ImageIcon,
        color: "text-blue-500",
        bg: "bg-blue-50 border-blue-100",
        label: "IMAGE",
      };
    }
    if (
      type.includes("zip") ||
      type.includes("compressed") ||
      ["zip", "rar", "7z", "tar", "gz"].includes(ext)
    ) {
      return {
        icon: FileArchive,
        color: "text-amber-500",
        bg: "bg-amber-50 border-amber-100",
        label: "ZIP",
      };
    }
    if (
      type.includes("sheet") ||
      type.includes("excel") ||
      ["xls", "xlsx", "csv"].includes(ext)
    ) {
      return {
        icon: FileSpreadsheet,
        color: "text-green-600",
        bg: "bg-green-50 border-green-100",
        label: "EXCEL",
      };
    }
    return {
      icon: File,
      color: "text-slate-500",
      bg: "bg-slate-50 border-slate-200",
      label: ext.toUpperCase() || "DOC",
    };
  };

  // Handle Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isReadOnly) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isReadOnly) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      prepareUploadModal(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      prepareUploadModal(selectedFiles);
    }
  };

  const prepareUploadModal = (files: File[]) => {
    setUploadFiles(files);
    setFileTitles(files.map((f) => f.name.replace(/\.[^/.]+$/, "")));
    setFileDescriptions(files.map(() => ""));
    setUploadModalOpen(true);
  };

  // Execute Upload
  const handleConfirmUpload = async () => {
    if (uploadFiles.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      uploadFiles.forEach((file, idx) => {
        formData.append("files", file);
        formData.append("titles", fileTitles[idx] || file.name);
        formData.append("descriptions", fileDescriptions[idx] || "");
      });

      await attachmentsService.upload(bookingId, formData);
      toast.success(`${uploadFiles.length} file(s) uploaded successfully!`);
      setUploadModalOpen(false);
      setUploadFiles([]);
      fetchAttachments();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to upload attachments",
      );
    } finally {
      setUploading(false);
    }
  };

  // Replace Attachment
  const handleOpenReplace = (att: BookingAttachment) => {
    setTargetAttachment(att);
    setReplaceFile(null);
    setReplaceTitle(att.title || att.originalName);
    setReplaceDescription(att.description || "");
    setReplaceModalOpen(true);
  };

  const handleConfirmReplace = async () => {
    if (!targetAttachment || !replaceFile) {
      toast.error("Please select a new file to replace");
      return;
    }
    try {
      setReplacing(true);
      const formData = new FormData();
      formData.append("file", replaceFile);
      formData.append("title", replaceTitle);
      formData.append("description", replaceDescription);

      await attachmentsService.replace(targetAttachment.id, formData);
      toast.success("Attachment version updated successfully!");
      setReplaceModalOpen(false);
      setTargetAttachment(null);
      setReplaceFile(null);
      fetchAttachments();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to replace attachment",
      );
    } finally {
      setReplacing(false);
    }
  };

  // Edit Metadata
  const handleOpenEditMetadata = (att: BookingAttachment) => {
    setTargetAttachment(att);
    setEditTitle(att.title || att.originalName);
    setEditDescription(att.description || "");
    setEditMetadataModalOpen(true);
  };

  const handleConfirmEditMetadata = async () => {
    if (!targetAttachment) return;
    try {
      setUpdatingMetadata(true);
      await attachmentsService.updateMetadata(
        targetAttachment.id,
        editTitle,
        editDescription,
      );
      toast.success("Metadata updated!");
      setEditMetadataModalOpen(false);
      fetchAttachments();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update metadata");
    } finally {
      setUpdatingMetadata(false);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (att: BookingAttachment) => {
    if (
      !confirm(
        `Are you sure you want to delete attachment "${att.title || att.originalName}"?`,
      )
    )
      return;
    try {
      toast.loading("Deleting attachment...", { id: `del-${att.id}` });
      await attachmentsService.delete(att.id);
      toast.success("Attachment deleted", { id: `del-${att.id}` });
      fetchAttachments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete attachment", { id: `del-${att.id}` });
    }
  };

  // Preview Attachment
  const handlePreview = (att: BookingAttachment) => {
    const rawUrl = att.fileUrl.startsWith("http")
      ? att.fileUrl
      : `https://youthcamping.online${att.fileUrl}`;
    setPreviewUrl(rawUrl);
    setPreviewFileType(att.fileType || "");
    setPreviewTitle(att.title || att.originalName);
    setPreviewModalOpen(true);
  };

  // Download Attachment
  const handleDownload = (att: BookingAttachment) => {
    const downloadUrl = attachmentsService.getDownloadUrl(att.id);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = att.originalName || att.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  // Open Send Modal
  const handleOpenSend = (targetIds: string[]) => {
    setSendTargetIds(targetIds);
    setCustomEmail(booking.email || "");
    setCustomSubject(
      `Important Attachments for your Booking ${booking.bookingId} - YouthCamping`,
    );
    setCustomMessage(
      `Please find attached important travel documents and vouchers for your upcoming trip.`,
    );
    setSendModalOpen(true);
  };

  // Execute Send
  const handleConfirmSend = async () => {
    if (sendTargetIds.length === 0) {
      toast.error("No attachments selected to send");
      return;
    }
    try {
      setSending(true);
      const res = await attachmentsService.send(bookingId, {
        attachmentIds: sendTargetIds,
        channel: sendChannel,
        customEmail,
        customSubject,
        customMessage,
      });

      if (res.emailSent) {
        toast.success(
          `Email sent successfully to ${customEmail || booking.email}`,
        );
      }

      if (res.whatsappGenerated && res.whatsappLink) {
        window.open(res.whatsappLink, "_blank");
        toast.success("WhatsApp window opened!");
      }

      setSendModalOpen(false);
      setSelectedIds(new Set());
      fetchAttachments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send attachments");
    } finally {
      setSending(false);
    }
  };

  // Selection toggles
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAttachments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAttachments.map((a) => a.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Filtering
  const filteredAttachments = attachments.filter((att) => {
    const nameMatch = (att.title || att.originalName || att.fileName)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const descMatch = (att.description || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (selectedCategory === "ALL") return nameMatch || descMatch;
    if (selectedCategory === "PDF")
      return (
        (nameMatch || descMatch) && att.fileType.toLowerCase().includes("pdf")
      );
    if (selectedCategory === "IMAGE")
      return (
        (nameMatch || descMatch) &&
        (att.fileType.toLowerCase().includes("image") ||
          ["jpg", "png", "webp"].some((x) =>
            att.fileName.toLowerCase().endsWith(x),
          ))
      );
    if (selectedCategory === "SENT")
      return (nameMatch || descMatch) && att.sentStatus !== "NOT_SENT";
    return nameMatch || descMatch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-primary-orange" />
            <h3 className="font-bold text-slate-800 text-base">
              Booking Attachments & Documents
            </h3>
            <span className="bg-slate-100 text-slate-600 font-mono text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {attachments.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generic attachment module for vouchers, tickets, IDs, itineraries,
            and trip documents.
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-orange hover:bg-primary-orange/90 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Attachment
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={() => handleOpenSend(Array.from(selectedIds))}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-all animate-fade-in"
              >
                <Send className="w-4 h-4 text-green-500" />
                Send Selected ({selectedIds.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drag & Drop Zone */}
      {!isReadOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2",
            isDragOver
              ? "border-primary-orange bg-[#FF4D00]/5/50 scale-[1.01]"
              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300",
          )}
        >
          <div className="w-10 h-10 rounded-full bg-[#FF4D00]/10 text-primary-orange flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              Drag & Drop files here, or{" "}
              <span className="text-primary-orange underline">
                browse files
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports PDF, Images (JPG, PNG, WEBP), Excel, Word, ZIP, and
              generic documents up to 25 MB
            </p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search attachments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-primary-orange"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {["ALL", "PDF", "IMAGE", "SENT"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0",
                selectedCategory === cat
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {cat === "ALL" ? "All Files" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Attachments List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-orange" />
          <p className="text-xs font-medium">Loading booking attachments...</p>
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">
            No Attachments Found
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No files match your search query."
              : "No documents or attachments have been uploaded for this booking yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Batch Selection Bar */}
          {!isReadOnly && (
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === filteredAttachments.length &&
                    filteredAttachments.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-primary-orange focus:ring-primary-orange"
                />
                Select All ({filteredAttachments.length})
              </label>
              {selectedIds.size > 0 && (
                <span className="text-xs font-semibold text-primary-orange">
                  {selectedIds.size} file(s) selected for dispatch
                </span>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {filteredAttachments.map((att) => {
              const fileMeta = getFileIcon(
                att.fileType,
                att.originalName || att.fileName,
              );
              const IconComp = fileMeta.icon;
              const isSelected = selectedIds.has(att.id);

              return (
                <div
                  key={att.id}
                  className={cn(
                    "p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors",
                    isSelected && "bg-[#FF4D00]/5/30",
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {!isReadOnly && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectId(att.id)}
                        className="mt-1 rounded border-slate-300 text-primary-orange focus:ring-primary-orange cursor-pointer"
                      />
                    )}

                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                        fileMeta.bg,
                      )}
                    >
                      <IconComp className={cn("w-5 h-5", fileMeta.color)} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-sm truncate">
                          {att.title || att.originalName}
                        </h4>

                        <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200">
                          v{att.version}
                        </span>

                        {att.sentStatus !== "NOT_SENT" && (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                              att.sentStatus === "SENT_BOTH"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : att.sentStatus === "SENT_EMAIL"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200",
                            )}
                          >
                            {att.sentStatus === "SENT_BOTH"
                              ? "Sent (Email + WA)"
                              : att.sentStatus === "SENT_EMAIL"
                                ? "Email Sent"
                                : "WhatsApp Sent"}
                          </span>
                        )}
                      </div>

                      {att.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {att.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                        <span>{att.originalName}</span>
                        <span>•</span>
                        <span>{formatFileSize(att.fileSize)}</span>
                        <span>•</span>
                        <span>
                          Uploaded by{" "}
                          <strong className="text-slate-600">
                            {att.uploadedBy || "Staff"}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(att.uploadedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handlePreview(att)}
                      title="Preview Attachment"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownload(att)}
                      title="Download Attachment"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {!isReadOnly && (
                      <>
                        <button
                          onClick={() => handleOpenSend([att.id])}
                          title="Send to Customer"
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenReplace(att)}
                          title="Replace New Version"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditMetadata(att)}
                          title="Edit Title & Description"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {att.versionHistory &&
                          att.versionHistory.length > 0 && (
                            <button
                              onClick={() => {
                                setTargetAttachment(att);
                                setVersionHistoryModalOpen(true);
                              }}
                              title="Version History"
                              className="p-1.5 text-slate-500 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded-lg transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}

                        <button
                          onClick={() => handleDeleteAttachment(att)}
                          title="Delete Attachment"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Upload Files Modal ─── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                Confirm Attachment Upload ({uploadFiles.length})
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {uploadFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-xs truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Attachment Title"
                    value={fileTitles[idx] || ""}
                    onChange={(e) => {
                      const updated = [...fileTitles];
                      updated[idx] = e.target.value;
                      setFileTitles(updated);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Optional description / notes..."
                    value={fileDescriptions[idx] || ""}
                    onChange={(e) => {
                      const updated = [...fileDescriptions];
                      updated[idx] = e.target.value;
                      setFileDescriptions(updated);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={uploading}
                onClick={handleConfirmUpload}
                className="px-4 py-2 bg-primary-orange text-white rounded-lg font-bold text-xs hover:bg-primary-orange/90 flex items-center gap-1.5"
              >
                {uploading && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                Upload Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Replace Version Modal ─── */}
      {replaceModalOpen && targetAttachment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Replace Attachment Version
                </h3>
                <p className="text-xs text-slate-400">
                  Current version v{targetAttachment.version} will be archived
                </p>
              </div>
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New File (Required)
                </label>
                <input
                  type="file"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#FF4D00]/5 file:text-primary-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={replaceTitle}
                  onChange={(e) => setReplaceTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={replaceDescription}
                  onChange={(e) => setReplaceDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={replacing}
                onClick={handleConfirmReplace}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 flex items-center gap-1.5"
              >
                {replacing && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                Replace Version (v{targetAttachment.version + 1})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Metadata Modal ─── */}
      {editMetadataModalOpen && targetAttachment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                Edit Attachment Details
              </h3>
              <button
                onClick={() => setEditMetadataModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setEditMetadataModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={updatingMetadata}
                onClick={handleConfirmEditMetadata}
                className="px-4 py-2 bg-primary-orange text-white rounded-lg font-bold text-xs hover:bg-primary-orange/90 flex items-center gap-1.5"
              >
                {updatingMetadata && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ─── */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm truncate max-w-md">
                {previewTitle}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-auto flex items-center justify-center">
              {previewFileType.includes("image") ||
              ["jpg", "jpeg", "png", "webp", "gif"].some((x) =>
                previewUrl.toLowerCase().endsWith(x),
              ) ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                />
              ) : previewFileType.includes("pdf") ||
                previewUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  title={previewTitle}
                  className="w-full h-full border-0 rounded-lg bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                  <File className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Preview not available for this file type
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Please download the file to view its contents.
                  </p>
                  <a
                    href={previewUrl}
                    download
                    className="mt-4 inline-flex items-center gap-2 bg-primary-orange text-white font-bold text-xs px-4 py-2 rounded-lg"
                  >
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Send Modal (Email / WhatsApp) ─── */}
      {sendModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Send Attachments to Customer
                </h3>
                <p className="text-xs text-slate-400">
                  {sendTargetIds.length} file(s) selected for dispatch
                </p>
              </div>
              <button
                onClick={() => setSendModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dispatch Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendChannel("EMAIL")}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      sendChannel === "EMAIL"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600",
                    )}
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel("WHATSAPP")}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      sendChannel === "WHATSAPP"
                        ? "bg-green-50 border-green-500 text-green-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600",
                    )}
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel("BOTH")}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      sendChannel === "BOTH"
                        ? "bg-[#FF4D00]/5 border-[#FF4D00] text-[#C2410C] shadow-xs"
                        : "bg-white border-slate-200 text-slate-600",
                    )}
                  >
                    <Send className="w-4 h-4" /> Both
                  </button>
                </div>
              </div>

              {(sendChannel === "EMAIL" || sendChannel === "BOTH") && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Note
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={sending}
                onClick={handleConfirmSend}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 flex items-center gap-1.5 shadow-xs"
              >
                {sending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Version History Modal ─── */}
      {versionHistoryModalOpen && targetAttachment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Version History
                </h3>
                <p className="text-xs text-slate-400">
                  {targetAttachment.title || targetAttachment.originalName}
                </p>
              </div>
              <button
                onClick={() => setVersionHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {/* Current Version */}
              <div className="bg-[#FF4D00]/5/50 p-3 rounded-xl border border-[#FF4D00]/30 flex items-center justify-between">
                <div>
                  <span className="bg-primary-orange text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Current (v{targetAttachment.version})
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {targetAttachment.originalName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Uploaded by {targetAttachment.uploadedBy || "Staff"} on{" "}
                    {new Date(targetAttachment.uploadedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(targetAttachment)}
                  className="p-2 text-slate-600 hover:bg-white rounded-lg"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Archived Versions */}
              {targetAttachment.versionHistory?.map((ver, vIdx) => (
                <div
                  key={vIdx}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      v{ver.version}
                    </span>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {ver.originalName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Uploaded by {ver.uploadedBy || "Staff"} on{" "}
                      {new Date(ver.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={ver.fileUrl}
                    download
                    className="p-2 text-slate-600 hover:bg-white rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setVersionHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


