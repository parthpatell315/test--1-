import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Loader2,
  Image as ImageIcon,
  X,
  RefreshCw,
} from "lucide-react";
import api from "@/services/api";
import { ENV } from "@/config/environment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload?: (url: string) => void;
  onMultipleUpload?: (urls: string[]) => void;
  onChange?: (urls: string[]) => void;
  label?: string;
  value?: string | string[];
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  compact?: boolean;
  accept?: string;
}

/**
 * Converts relative upload path to a full URL for display.
 */
const formatUrl = (url: any): string => {
  if (!url || typeof url !== "string") return "";
  if (
    url.startsWith("http") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  )
    return url;
  const serverBase = ENV.API_BASE_URL.replace(/\/api$/, "");
  return `${serverBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

export function ImageUpload({
  onUpload,
  onMultipleUpload,
  onChange,
  label,
  value,
  multiple = false,
  maxFiles,
  className,
  compact = false,
  accept = "*",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [id] = useState(() => Math.random().toString(36).substring(7));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notifySingle = (url: string) => {
    if (typeof onUpload === "function") onUpload(url);
    if (typeof onChange === "function") onChange(url ? [url] : []);
    if (typeof onMultipleUpload === "function") onMultipleUpload(url ? [url] : []);
  };

  const notifyMultiple = (urls: string[]) => {
    if (typeof onMultipleUpload === "function") onMultipleUpload(urls);
    if (typeof onChange === "function") onChange(urls);
    if (typeof onUpload === "function") urls.forEach((u) => onUpload(u));
  };

  const multiUrls: string[] = Array.isArray(value)
    ? value.filter((v) => typeof v === "string" && Boolean(v.trim()))
    : value && typeof value === "string" && Boolean(value.trim())
      ? [value]
      : [];

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const maxLimitBytes = ENV.IMAGE_MAX_BYTES;
    const maxLimitMb = ENV.IMAGE_MAX_BYTES / (1024 * 1024);

    const isMultiMode = multiple || (maxFiles !== undefined && maxFiles > 1);

    if (isMultiMode) {
      const formData = new FormData();
      let validCount = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxLimitBytes) {
          toast.error(`File ${files[i].name} exceeds ${maxLimitMb}MB limit`);
          continue;
        }
        formData.append("images", files[i]);
        validCount++;
      }
      if (validCount === 0) return;

      setUploading(true);
      setImgError(false);
      try {
        const res = await api.post("/upload/multiple", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / (e.total || 1)));
          },
        });
        if (res.data.success) {
          const currentList = Array.isArray(value)
            ? value.filter((v) => typeof v === "string" && Boolean(v.trim()))
            : value && typeof value === "string" && Boolean(value.trim())
              ? [value]
              : [];
          const combined = [...currentList, ...(res.data.urls || [])];
          notifyMultiple(combined);
          toast.success("Uploaded successfully");
        } else {
          toast.error(
            "Upload failed: " + (res.data.message || "Unknown error"),
          );
        }
      } catch (err: any) {
        console.error("Upload failed:", err);
        toast.error(
          "Upload failed: " +
            (err.response?.data?.message || err.message || "Network error"),
        );
      } finally {
        setUploading(false);
        setProgress(0);
      }
    } else {
      const file = files[0];
      if (file.size > maxLimitBytes) {
        toast.error(`File size exceeds ${maxLimitMb}MB limit`);
        return;
      }
      const formData = new FormData();
      formData.append("image", file);

      setUploading(true);
      setImgError(false);
      try {
        const res = await api.post("/upload/single", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / (e.total || 1)));
          },
        });
        if (res.data.success) {
          notifySingle(res.data.url);
          toast.success("Photo updated");
        } else {
          toast.error(
            "Upload failed: " + (res.data.message || "Unknown error"),
          );
        }
      } catch (err: any) {
        console.error("Upload failed:", err);
        toast.error(
          "Upload failed: " +
            (err.response?.data?.message || err.message || "Network error"),
        );
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleReplace = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveIndex = (idxToRemove: number) => {
    const updated = multiUrls.filter((_, idx) => idx !== idxToRemove);
    notifyMultiple(updated);
  };

  const handleRemove = async () => {
    const currentVal = Array.isArray(value) ? value[0] : value;
    if (!currentVal) return;
    if (typeof currentVal === "string" && currentVal.startsWith("/uploads/")) {
      try {
        await api.delete("/upload/photo", { data: { url: currentVal } });
      } catch (err) {
        console.warn("Server delete failed (continuing):", err);
      }
    }
    notifySingle("");
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [multiple, value],
  );

  const singleValue = Array.isArray(value) ? value[0] || "" : value || "";
  const displayUrl = formatUrl(singleValue);
  const isMultiMode = multiple || (maxFiles !== undefined && maxFiles > 1);
  const hasValue = Array.isArray(value)
    ? value.length > 0 && Boolean(value[0])
    : Boolean(value);

  return (
    <div className={cn("space-y-2 w-full", className)}>
      {label && !compact && (
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {label}
          </Label>
          {isMultiMode && multiUrls.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400">
              {multiUrls.length} {maxFiles ? `/ ${maxFiles}` : ""} Photos
            </span>
          )}
        </div>
      )}

      {/* Multi-mode Photo Grid */}
      {isMultiMode && multiUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 w-full">
          {multiUrls.map((url, i) => (
            <div
              key={i}
              className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200 shadow-2xs"
            >
              <img
                src={formatUrl(url)}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveIndex(i);
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition cursor-pointer"
                title="Remove photo"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={isMultiMode}
        onChange={handleFileChange}
        className="hidden"
        id={`file-replace-${id}`}
      />

      {/* Upload Drop Zone / Single Preview Card */}
      {(!isMultiMode || !maxFiles || multiUrls.length < maxFiles) && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center transition-all rounded-xl border-2 border-dashed select-none overflow-hidden h-full w-full",
            compact ? "p-1 min-h-[64px]" : "p-5 gap-3 min-h-[110px]",
            isDragging
              ? "border-[#FF6B00] bg-[#FF6B00]/5 scale-[1.01]"
              : "border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-300",
          )}
        >
          {hasValue && !isMultiMode ? (
            <div className="relative w-full h-full min-h-[56px] rounded-lg overflow-hidden bg-slate-900/5 border border-slate-200 group/preview flex items-center justify-center">
              {!imgError ? (
                <img
                  src={displayUrl}
                  className="w-full h-full object-cover"
                  alt="Uploaded preview"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <ImageIcon className={cn(compact ? "w-4 h-4" : "w-6 h-6")} />
                  {!compact && (
                    <p className="text-[10px] font-bold uppercase opacity-60">
                      Failed to load
                    </p>
                  )}
                </div>
              )}

              {/* Control overlay buttons */}
              <div
                className={cn(
                  "absolute flex items-center gap-1 z-10 transition-opacity",
                  compact ? "top-1 right-1" : "top-2.5 right-2.5",
                )}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "rounded-full shadow-md bg-white/90 hover:bg-white text-slate-700 p-0 border border-slate-200",
                    compact ? "w-5 h-5" : "w-7 h-7",
                  )}
                  title="Replace image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReplace();
                  }}
                >
                  <RefreshCw
                    className={cn(compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5")}
                  />
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className={cn(
                    "rounded-full shadow-md bg-red-600 hover:bg-red-700 text-white p-0 flex items-center justify-center",
                    compact ? "w-5 h-5" : "w-7 h-7",
                  )}
                  title="Remove image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <X className={cn(compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleReplace}
              className={cn(
                "flex flex-col items-center justify-center text-center cursor-pointer h-full w-full",
                compact ? "p-1 space-y-0.5" : "space-y-2",
              )}
            >
              <div
                className={cn(
                  "bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-2xs shrink-0",
                  compact ? "w-6 h-6" : "w-10 h-10",
                )}
              >
                <Upload
                  className={cn(
                    compact
                      ? "w-3 h-3 text-[#FF6B00]"
                      : "w-4 h-4 text-[#FF6B00]",
                  )}
                />
              </div>

              {compact ? (
                <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-tight leading-tight">
                  {isMultiMode ? "+ Add Photo" : "Add Photo"}
                </span>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">
                    Drag &amp; drop {isMultiMode ? "photos" : "photo"} here, or{" "}
                    <span
                      className="text-[#FF6B00] underline"
                      onClick={handleReplace}
                    >
                      browse
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    JPG, PNG, WEBP, MP4 &middot; Max 100MB
                  </p>
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl z-20 p-2 space-y-1.5">
              <Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" />
              <div className="w-full max-w-[120px] h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-[#FF6B00] transition-all duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] font-black uppercase text-slate-600">
                {progress}%
              </span>
            </div>
          )}

          {!compact && (!hasValue || isMultiMode) && (
            <div className="flex w-full gap-2 items-center justify-center mt-1">
              <Input
                type="file"
                accept={accept}
                multiple={isMultiMode}
                onChange={handleFileChange}
                className="hidden"
                id={`file-upload-${id}`}
                disabled={uploading}
              />
              <Label
                htmlFor={`file-upload-${id}`}
                className="flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 shadow-2xs px-3.5 h-8 transition-all"
              >
                {isMultiMode ? "Add Photos" : "Choose File"}
              </Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageUpload;

