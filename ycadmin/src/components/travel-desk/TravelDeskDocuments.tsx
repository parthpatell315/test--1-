import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import { travelDeskService } from "@/services/travelDesk.service";
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  TravelDeskLoadingState,
  TravelDeskEmptyState,
} from "./TravelDeskStateComponents";
import { cn } from "@/lib/utils";
import { TravelDeskUploadDocumentModal } from "./TravelDeskUploadDocumentModal";
import { toast } from "sonner";

interface TravelDeskDocumentsProps {
  trip: Trip;
}

export const TravelDeskDocuments: React.FC<TravelDeskDocumentsProps> = ({
  trip,
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data } = await travelDeskService.getDocuments(trip.id);
        setDocuments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [trip.id]);

  if (loading) return <TravelDeskLoadingState message="Loading Documents..." />;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          color: "text-green-700 bg-green-50 border-green-200",
          icon: CheckCircle2,
        };
      case "UNDER_REVIEW":
        return {
          color: "text-yellow-700 bg-yellow-50 border-yellow-200",
          icon: Clock,
        };
      case "REJECTED":
        return {
          color: "text-red-700 bg-red-50 border-red-200",
          icon: XCircle,
        };
      default:
        return {
          color: "text-slate-700 bg-slate-50 border-slate-200",
          icon: FileText,
        };
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await travelDeskService.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      toast.success("Document deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Operational Documents
          </h2>
          <p className="text-xs text-slate-550 mt-0.5 font-bold">
            Manage all files, permits, and references for this trip
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E66000] shadow-sm"
        >
          + Upload Document
        </button>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="mt-8">
          <TravelDeskEmptyState
            title="No Documents"
            description="Upload operational documents like manifests, permits, and tickets here."
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Document Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Added By</th>
                <th className="p-4">Date</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
              {documents.map((doc: any) => {
                const StatusIcon = getStatusConfig(doc.status).icon;
                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-slate-800 font-bold">
                            {doc.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            v{doc.version || 1} •{" "}
                            {doc.fileSize || doc.size || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600">
                      {doc.category}
                    </td>
                    <td className="p-4">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border",
                          getStatusConfig(doc.status).color,
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {doc.status}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {doc.uploadedBy || doc.addedBy || "System"}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(
                        doc.createdAt || doc.dateAdded,
                      ).toLocaleDateString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.fileUrl && (
                          <>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <a
                              href={doc.fileUrl}
                              download
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <TravelDeskUploadDocumentModal
          tripId={trip.id}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newDocs) => {
            setDocuments([...newDocs, ...documents]);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
