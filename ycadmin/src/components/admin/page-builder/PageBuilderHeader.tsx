import React from "react";
import {
  ChevronDown,
  Undo2,
  Redo2,
  Eye,
  Save,
  Rocket,
  Loader2,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageBuilderHeaderProps {
  currentPage: string;
  pages: { id: string; name: string }[];
  onSelectPage: (pageId: string) => void;
  status: "saved" | "draft" | "saving";
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  isSaving: boolean;
}

export function PageBuilderHeader({
  currentPage,
  pages,
  onSelectPage,
  status,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onSave,
  onPublish,
  isPublishing,
  isSaving,
}: PageBuilderHeaderProps) {
  const currentPageObj = pages.find((p) => p.id === currentPage) || {
    id: "home",
    name: "Homepage",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
      {/* Left: Page Title & Page Selector Dropdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 text-[#D4541A] flex items-center justify-center font-bold shrink-0">
          <Layers className="w-5 h-5 text-[#D4541A]" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Website Page Builder
            </span>
            <span className="text-slate-300">•</span>

            {/* Status Pill Badge */}
            {status === "saving" || isSaving ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : status === "saved" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                SAVED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                UNSAVED DRAFT
              </span>
            )}
          </div>

          {/* Page Dropdown Trigger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-base font-extrabold text-[#0B1528] hover:text-[#D4541A] transition-colors cursor-pointer group mt-0.5"
              >
                <span>{currentPageObj.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-[#D4541A] transition-transform group-hover:translate-y-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 rounded-xl p-1.5 shadow-lg border-slate-200"
            >
              {pages.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onSelectPage(p.id)}
                  className={`rounded-lg text-xs font-bold px-3 py-2 cursor-pointer flex items-center justify-between ${
                    p.id === currentPage
                      ? "bg-[#FF4D00]/5 text-[#D4541A]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{p.name}</span>
                  {p.id === currentPage && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4541A]" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right: Actions (Undo, Redo, Preview, Save Draft, Publish) */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 mr-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            onClick={onUndo}
            className="h-8 w-8 p-0 rounded-lg text-slate-600 disabled:opacity-30 hover:bg-white cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            onClick={onRedo}
            className="h-8 w-8 p-0 rounded-lg text-slate-600 disabled:opacity-30 hover:bg-white cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Live Preview Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          className="h-8 px-3.5 text-xs font-bold text-slate-700 hover:text-[#0B1528] border-slate-200 rounded-xl cursor-pointer shadow-xs hover:border-slate-300"
        >
          <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Live Website
        </Button>

        {/* Save Draft Button */}
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onSave}
          className="h-8 px-3.5 text-xs font-bold text-slate-700 hover:text-[#0B1528] border-slate-200 rounded-xl cursor-pointer shadow-xs hover:border-slate-300"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#D4541A]" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          )}
          Save Draft
        </Button>

        {/* Publish Button */}
        <Button
          type="button"
          disabled={isPublishing}
          onClick={onPublish}
          className="h-8 px-4 text-xs font-extrabold bg-[#D4541A] hover:bg-[#c24610] text-white rounded-xl shadow-xs cursor-pointer transition-all active:scale-[0.98]"
        >
          {isPublishing ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" />
          ) : (
            <Rocket className="w-3.5 h-3.5 mr-1.5 text-white" />
          )}
          Publish Live
        </Button>
      </div>
    </div>
  );
}

