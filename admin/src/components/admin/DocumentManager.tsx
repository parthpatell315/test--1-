import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Camera,
  File as FileIcon,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const DOCUMENT_CATEGORIES = [
  "Aadhaar Front",
  "Aadhaar Back",
  "PAN",
  "Passport",
  "Driving Licence",
  "Visa",
  "Tickets",
  "Hotel Voucher",
  "Invoice",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface DocumentItem {
  id: string;
  bookingId: string;
  passengerId?: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  fileSize?: number;
  storagePath?: string;
  url?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  status?: "UPLOADED" | "UPLOADING" | "FAILED";
  previewUrl?: string;
}

interface DocumentManagerProps {
  bookingId: string;
  passengerId?: string;
  passengerName?: string;
  documents: DocumentItem[];
  onUpload: (
    file: File,
    category: string,
    passengerId?: string,
  ) => Promise<void>;
  onDelete: (docId: string, passengerId?: string) => Promise<void>;
  onViewDoc?: (doc: DocumentItem) => void;
  canEdit?: boolean;
}

// Compression helper for images
async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 2 * 1024 * 1024) {
    return file; // Don't compress non-images or files < 2MB
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxDim = 2048;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85,
        );
      } else {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  bookingId,
  passengerId,
  passengerName,
  documents = [],
  onUpload,
  onDelete,
  onViewDoc,
  canEdit = true,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Aadhaar Front");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    { name: string; progress: number; category: string }[]
  >([]);
  const [previewModalDoc, setPreviewModalDoc] = useState<DocumentItem | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const filterDocs = documents.filter(
    (d) => !passengerId || d.passengerId === passengerId,
  );

  const validateFile = (file: File): boolean => {
    const maxSizeMB = 20;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size exceeds limit of ${maxSizeMB} MB`);
      return false;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file format. Allowed formats: JPG, PNG, WEBP, PDF");
      return false;
    }

    return true;
  };

  const processAndUploadFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    for (const rawFile of fileList) {
      if (!validateFile(rawFile)) continue;

      const category = selectedCategory;
      setUploadingFiles((prev) => [
        ...prev,
        { name: rawFile.name, progress: 10, category },
      ]);

      try {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.name === rawFile.name ? { ...f, progress: 40 } : f,
          ),
        );

        const fileToUpload = await compressImageIfNeeded(rawFile);

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.name === rawFile.name ? { ...f, progress: 75 } : f,
          ),
        );

        await onUpload(fileToUpload, category, passengerId);

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.name === rawFile.name ? { ...f, progress: 100 } : f,
          ),
        );

        toast.success(`Uploaded ${rawFile.name} as ${category}`);
      } catch (err: any) {
        toast.error(
          `Upload failed for ${rawFile.name}: ${err.message || "Server error"}`,
        );
      } finally {
        setTimeout(() => {
          setUploadingFiles((prev) =>
            prev.filter((f) => f.name !== rawFile.name),
          );
        }, 800);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(e.dataTransfer.files);
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.includes("pdf"))
      return <FileText className="w-4 h-4 text-red-600" />;
    if (mimeType?.includes("image"))
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    return <FileIcon className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Header & Drag-Drop Zone */}
      {canEdit && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Document Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* File input (multi-file) */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
                onChange={(e) =>
                  e.target.files && processAndUploadFiles(e.target.files)
                }
              />
              {/* Mobile Camera Capture */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) =>
                  e.target.files && processAndUploadFiles(e.target.files)
                }
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="h-8 text-[11px] font-bold border-slate-200 text-slate-700 gap-1.5 sm:hidden"
              >
                <Camera className="w-3.5 h-3.5" /> Camera
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File(s)
              </Button>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5",
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-200 hover:border-slate-300 bg-white",
            )}
          >
            <Upload
              className={cn(
                "w-5 h-5",
                isDragging ? "text-blue-500" : "text-slate-400",
              )}
            />
            <p className="text-xs font-semibold text-slate-700">
              Drag & Drop document files here or{" "}
              <span className="text-blue-600 underline">browse</span>
            </p>
            <p className="text-[10px] text-slate-400">
              Supported: JPG, PNG, WEBP, PDF (Max file size: 20 MB)
            </p>
          </div>
        </div>
      )}

      {/* Progress Bars */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f, i) => (
            <div
              key={i}
              className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg space-y-1 text-xs"
            >
              <div className="flex justify-between font-medium text-slate-700">
                <span>
                  {f.name} ({f.category})
                </span>
                <span className="font-mono text-blue-600 font-bold">
                  {f.progress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${f.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Attached Documents ({filterDocs.length})</span>
          {passengerName && (
            <span className="text-slate-400 font-normal">
              for {passengerName}
            </span>
          )}
        </h4>

        {filterDocs.length === 0 ? (
          <div className="p-6 text-center border border-slate-100 rounded-xl bg-slate-50/50">
            <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-500">
              No documents uploaded yet.
            </p>
            <p className="text-[10px] text-slate-400">
              Upload Aadhaar, PAN, Passport, or vouchers above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                        {doc.documentType || "Document"}
                      </span>
                      <p
                        className="text-xs font-bold text-slate-800 truncate mt-0.5"
                        title={doc.originalFileName}
                      >
                        {doc.originalFileName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1 border-t border-slate-100">
                  <span>By: {doc.uploadedBy || "System"}</span>
                  <span>
                    {doc.uploadedAt
                      ? new Date(doc.uploadedAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onViewDoc) onViewDoc(doc);
                      else setPreviewModalDoc(doc);
                    }}
                    className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 gap-1"
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </Button>

                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(doc.id, passengerId)}
                      className="h-7 text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 gap-1 ml-auto"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Internal Preview Dialog */}
      <Dialog
        open={!!previewModalDoc}
        onOpenChange={() => setPreviewModalDoc(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] p-4 flex flex-col">
          <DialogHeader className="flex flex-row justify-between items-center border-b pb-2">
            <DialogTitle className="text-sm font-bold truncate">
              {previewModalDoc?.originalFileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-2 flex items-center justify-center min-h-[300px]">
            {previewModalDoc?.mimeType?.includes("pdf") ? (
              <iframe
                src={`/api/bookings/${bookingId}/passengers/${previewModalDoc.passengerId || "primary"}/document`}
                className="w-full h-[500px] border rounded"
                title="PDF Preview"
              />
            ) : (
              <img
                src={`/api/bookings/${bookingId}/passengers/${previewModalDoc?.passengerId || "primary"}/document`}
                alt="Document Preview"
                className="max-w-full max-h-[500px] object-contain rounded shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  toast.error("Failed to load document preview");
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManager;

