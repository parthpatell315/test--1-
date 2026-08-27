import React from "react";
import { Sparkles, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebsiteHeaderProps {
  status: "live" | "draft" | "review_needed";
  lastPublished?: string;
  onPublish: () => void;
  isPublishing?: boolean;
}

export function WebsiteHeader({
  status,
  lastPublished = "July 26, 2:30 PM",
  onPublish,
  isPublishing = false,
}: WebsiteHeaderProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
            </span>
            Live
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            Draft
          </span>
        );
      case "review_needed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Needs Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] tracking-tight leading-tight">
            Website Manager
          </h1>
          {getStatusBadge()}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Last published: {lastPublished}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button
          onClick={onPublish}
          disabled={isPublishing}
          className="h-10 px-5 bg-[#D4541A] hover:bg-[#B8451A] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          {isPublishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
          Publish Changes
        </Button>
      </div>
    </div>
  );
}


