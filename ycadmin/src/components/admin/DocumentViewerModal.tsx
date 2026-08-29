import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Maximize2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  subtitle?: string;
  fileType?: string;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  url,
  title = "Document Preview",
  subtitle = "",
  fileType,
}: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation when url changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, url]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  const isPdf =
    fileType === "pdf" ||
    url.toLowerCase().includes(".pdf") ||
    url.toLowerCase().includes("application/pdf");

  const isImage =
    !isPdf &&
    (fileType === "image" ||
      ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "avif"].some((ext) =>
        url.toLowerCase().includes(ext),
      ) ||
      url.startsWith("data:image/") ||
      url.includes("cloudinary") ||
      url.includes("uploads/"));

  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex flex-col justify-between animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* TOP HEADER BAR */}
      <div
        className="w-full bg-slate-900/90 border-b border-slate-800 text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 select-none shrink-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF4D00]/20 border border-[#FF4D00]/40 flex items-center justify-center text-[#FF4D00] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white truncate max-w-md">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 shrink-0">
          {isImage && (
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                title="Zoom Out"
                className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono px-2 text-slate-300 font-bold min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                title="Zoom In"
                className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate"
                className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}

          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            title="Download Document"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center transition-colors border border-slate-700"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONTENT PREVIEW BODY */}
      <div
        className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {isPdf ? (
          <div
            className="w-full max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`${url}#toolbar=1`}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        ) : isImage ? (
          <div
            className="max-w-full max-h-full flex items-center justify-center overflow-auto p-4 transition-transform duration-150 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url}
              alt={title}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
              className="max-w-[90vw] max-h-[82vh] object-contain rounded-lg shadow-2xl border border-slate-800/80 select-none bg-slate-950"
            />
          </div>
        ) : (
          <div
            className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="w-14 h-14 text-slate-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white mb-1">{title}</h4>
            <p className="text-xs text-slate-400 mb-5">
              Direct preview is not available for this file type. Click download
              below to view it on your device.
            </p>
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Download File
            </a>
          </div>
        )}
      </div>

      {/* FOOTER HELPER */}
      <div className="py-2 text-center text-[11px] text-slate-500 shrink-0 select-none">
        Click anywhere outside or press <span className="font-mono text-slate-400">ESC</span> to close
      </div>
    </div>
  );
}
