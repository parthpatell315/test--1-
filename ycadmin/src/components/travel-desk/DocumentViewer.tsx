import React, { useState } from "react";
import api from "../../services/api";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { Document, Page, pdfjs } from "react-pdf";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  FileText,
  RefreshCw,
  AlertCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Configure pdfjs worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DocumentViewerProps {
  document: {
    id: string;
    fileName?: string;
    name?: string;
    fileUrl: string;
    category?: string;
    fileSize?: number;
    size?: string;
    createdAt?: string;
    uploadedBy?: string;
    uploader?: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);

  if (!isOpen || !document) return null;

  const fileName = document.fileName || document.name || "Document Preview";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // Determine file type
  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
  const isPdf = ext === "pdf";

  // Construct absolute file URL
  const rawUrl = document.fileUrl || "";
  const fullFileUrl = rawUrl.startsWith("http")
    ? rawUrl
    : `${api.defaults.baseURL?.replace(/\/api$/, "")}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(100);
    setRotation(0);
    setPageNumber(1);
    setHasError(false);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setHasError(false);
  };

  const formatSize = (bytes?: number, sizeStr?: string) => {
    if (sizeStr) return sizeStr;
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ─── Header ─── */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#FF4D00]/10 text-[#FF4D00] rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#0A192F] truncate">
                  {fileName}
                </h2>
                {document.category && (
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                    {document.category}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Document Viewer
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2">
            {/* PDF Page Controls */}
            {isPdf && numPages && !hasError && (
              <div className="flex items-center bg-slate-200/70 rounded-lg p-1 text-slate-700 text-xs gap-1">
                <button
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-bold font-mono text-[11px] whitespace-nowrap">
                  {pageNumber} / {numPages}
                </span>
                <button
                  onClick={() =>
                    setPageNumber((prev) => Math.min(prev + 1, numPages))
                  }
                  disabled={pageNumber >= numPages}
                  className="p-1 hover:bg-white rounded transition-colors disabled:opacity-30"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            {(isImage || isPdf) && !hasError && (
              <div className="hidden sm:flex items-center bg-slate-200/70 rounded-lg p-1 text-slate-700 text-xs">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-white rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-bold font-mono text-[11px] min-w-[40px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-white rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {isImage && (
                  <button
                    onClick={handleRotate}
                    className="p-1 hover:bg-white rounded transition-colors ml-1"
                    title="Rotate"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <a
              href={fullFileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#e06100] text-white text-xs font-bold rounded-lg transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Main Viewer Body ─── */}
        <div className="flex-1 bg-slate-900/90 overflow-auto p-4 flex items-center justify-center min-h-[350px] relative">
          {hasError ? (
            <div className="bg-white rounded-xl p-8 max-w-sm text-center space-y-3 shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                Preview Not Available
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Unable to render preview for this file type or connection
                failed. Click download to view.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                  Retry
                </button>
                <a
                  href={fullFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 bg-[#FF4D00] text-white text-xs font-bold rounded-lg hover:bg-[#e06100]"
                >
                  Download File
                </a>
              </div>
            </div>
          ) : isImage ? (
            <div className="transition-all duration-200 max-w-full max-h-full flex items-center justify-center">
              <Zoom>
                <img
                  src={fullFileUrl}
                  alt={fileName}
                  onError={() => setHasError(true)}
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    maxHeight: "65vh",
                    objectFit: "contain",
                  }}
                  className="rounded shadow-lg transition-transform duration-200 cursor-zoom-in"
                />
              </Zoom>
            </div>
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center overflow-auto">
              <Document
                file={fullFileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={() => setHasError(true)}
                loading={
                  <div className="text-white text-xs font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FF4D00]" />
                    Loading PDF pages...
                  </div>
                }
                error={
                  <iframe
                    src={`${fullFileUrl}#toolbar=1`}
                    title={fileName}
                    className="w-full h-[65vh] rounded border-0 bg-white"
                  />
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={zoomLevel / 100}
                  className="shadow-2xl rounded overflow-hidden"
                />
              </Document>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 max-w-sm text-center space-y-3 shadow-lg">
              <FileText className="w-12 h-12 text-[#FF4D00] mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">{fileName}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Preview not available for this file type. Click below to
                download and view.
              </p>
              <a
                href={fullFileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#FF4D00] text-white text-xs font-bold rounded-lg hover:bg-[#e06100] shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </a>
            </div>
          )}
        </div>

        {/* ─── Footer Details Bar ─── */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Size:{" "}
              <strong className="text-slate-800">
                {formatSize(document.fileSize, document.size)}
              </strong>
            </span>
            <span>•</span>
            <span>
              Uploaded by:{" "}
              <strong className="text-slate-800">
                {document.uploader?.name || document.uploadedBy || "Admin"}
              </strong>
            </span>
          </div>

          <div>
            {document.createdAt && (
              <span>
                Date:{" "}
                <strong className="text-slate-800">
                  {new Date(document.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;

