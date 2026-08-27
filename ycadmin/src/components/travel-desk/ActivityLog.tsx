import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { formatDistanceToNow } from "date-fns";
import {
  PlusCircle,
  Edit3,
  CheckCircle2,
  Trash2,
  UploadCloud,
  History,
  Filter,
  AlertCircle,
  User,
  ChevronDown,
} from "lucide-react";

export interface ActivityLogEntry {
  id: string;
  tripId: string;
  action: "create" | "edit" | "publish" | "delete" | "upload" | string;
  section: string;
  itemId?: string;
  changes?: any;
  performedBy: string;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface ActivityLogProps {
  tripId: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ tripId }) => {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [limit, setLimit] = useState<number>(20);

  // Fetch Activity Log Query
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["trip-activity-log", tripId, filterAction, filterSection, limit],
    queryFn: async () => {
      let url = `/trips/${tripId}/activity?limit=${limit}`;
      if (filterAction !== "all") {
        url += `&action=${filterAction}`;
      }
      if (filterSection !== "all") {
        url += `&section=${filterSection}`;
      }
      const res = await api.get(url);
      return {
        activities: (res.data?.data?.activities || []) as ActivityLogEntry[],
        total: res.data?.data?.total || 0,
      };
    },
    enabled: !!tripId,
  });

  const activitiesList = data?.activities || [];
  const total = data?.total || 0;
  const hasMore = activitiesList.length < total;

  const getActionConfig = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return {
          label: "Create",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          icon: PlusCircle,
          iconColor: "text-blue-600",
        };
      case "edit":
        return {
          label: "Edit",
          badgeClass: "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30",
          icon: Edit3,
          iconColor: "text-[#FF4D00]",
        };
      case "publish":
        return {
          label: "Publish",
          badgeClass: "bg-green-50 text-green-700 border-green-200",
          icon: CheckCircle2,
          iconColor: "text-green-600",
        };
      case "delete":
        return {
          label: "Delete",
          badgeClass: "bg-red-50 text-red-700 border-red-200",
          icon: Trash2,
          iconColor: "text-red-600",
        };
      case "upload":
        return {
          label: "Upload",
          badgeClass: "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30",
          icon: UploadCloud,
          iconColor: "text-[#FF4D00]",
        };
      default:
        return {
          label: action,
          badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
          icon: History,
          iconColor: "text-slate-600",
        };
    }
  };

  // Diff Preview Helper
  const renderDiffPreview = (changes: any) => {
    if (!changes || typeof changes !== "object") return null;

    if (changes.before && changes.after) {
      return (
        <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1 font-mono">
          {Object.keys(changes.after).map((key) => {
            const beforeVal = changes.before[key];
            const afterVal = changes.after[key];
            if (beforeVal !== afterVal) {
              return (
                <div key={key} className="space-y-0.5">
                  <span className="font-bold text-slate-500">{key}:</span>
                  <div className="text-red-600 line-through pl-2">
                    - {String(beforeVal ?? "null")}
                  </div>
                  <div className="text-green-600 font-bold pl-2">
                    + {String(afterVal ?? "null")}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Single object changes summary
    return (
      <div className="mt-1.5 text-[11px] text-slate-500 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
        {Object.entries(changes).map(([k, v]) => (
          <span
            key={k}
            className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]"
          >
            <strong className="text-slate-700">{k}:</strong>{" "}
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="admin-page text-[#0A192F]">
      {/* ─── Top Filter Header ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-[#FF4D00]/5 text-[#FF4D00] rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#0A192F]">
              Trip Audit Activity Log
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Chronological audit trail of all changes, uploads, and
              publications
            </p>
          </div>
        </div>

        {/* Action & Section Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500 text-[11px] uppercase">
              Action:
            </span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00]"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="edit">Edit</option>
              <option value="publish">Publish</option>
              <option value="delete">Delete</option>
              <option value="upload">Upload</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Activity Log Timeline List ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-700">
            Showing {activitiesList.length} of {total} entries
          </span>
          {isFetching && (
            <span className="text-[11px] text-[#FF4D00] font-bold animate-pulse">
              Refreshing...
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-50 rounded-xl border border-slate-100 animate-pulse"
              ></div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center border border-red-200 rounded-xl bg-red-50/20 space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">
              Failed to load activity log
            </p>
            <button
              onClick={() => refetch()}
              className="px-3.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700"
            >
              Retry
            </button>
          </div>
        ) : activitiesList.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 rounded-xl bg-slate-50/40 space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">
              No activity recorded yet
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              Actions like adding knowledge items, uploading documents, or
              editing SOPs will appear here.
            </p>
          </div>
        ) : (
          <div className="relative pl-4 sm:pl-6 border-l-2 border-slate-200 space-y-6">
            {activitiesList.map((entry) => {
              const config = getActionConfig(entry.action);
              const ActionIcon = config.icon;
              const formattedDate = entry.createdAt
                ? formatDistanceToNow(new Date(entry.createdAt), {
                    addSuffix: true,
                  })
                : "Just now";

              return (
                <div key={entry.id} className="relative group">
                  {/* Timeline Icon Node */}
                  <div className="absolute -left-[25px] sm:-left-[33px] top-1 p-1 bg-white border-2 border-slate-200 rounded-full shadow-xs group-hover:border-[#FF4D00] transition-colors">
                    <ActionIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                  </div>

                  {/* Main Entry Card */}
                  <div className="bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-4 transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {entry.section.replace("_", " ").toUpperCase()}
                        </span>
                        {entry.changes?.title || entry.changes?.fileName ? (
                          <span className="text-xs font-medium text-slate-600">
                            • "{entry.changes.title || entry.changes.fileName}"
                          </span>
                        ) : null}
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium shrink-0">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Actor details */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Performed by{" "}
                        <strong className="text-slate-800 font-bold">
                          {entry.actor?.name || entry.performedBy}
                        </strong>
                      </span>
                    </div>

                    {/* Diff Preview */}
                    {renderDiffPreview(entry.changes)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Load More Button ─── */}
        {hasMore && !isLoading && (
          <div className="pt-4 text-center border-t border-slate-100">
            <button
              onClick={() => setLimit((prev) => prev + 20)}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all"
            >
              <span>Load More Activity</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;

