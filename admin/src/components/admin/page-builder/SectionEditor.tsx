import React from "react";
import { Sparkles, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSectionEditor } from "./editors/HeroSectionEditor";
import { FeaturedTripsEditor } from "./editors/FeaturedTripsEditor";
import { PopularDestinationsEditor } from "./editors/PopularDestinationsEditor";
import { RecentPhotosEditor } from "./editors/RecentPhotosEditor";
import { TravelersReviewsEditor } from "./editors/TravelersReviewsEditor";
import { StoriesEditor } from "./editors/StoriesEditor";
import { FooterEditor } from "./editors/FooterEditor";
import { CTASliderEditor } from "./editors/CTASliderEditor";

interface SectionItem {
  id: string;
  type: string;
  name?: string;
  visible?: boolean;
  draft?: Record<string, any>;
  [key: string]: any;
}

interface SectionEditorProps {
  section: SectionItem | null;
  trips?: any[];
  onChangeDraft: (sectionId: string, updatedDraft: Record<string, any>) => void;
  onResetSection: (sectionId: string) => void;
}

export function SectionEditor({
  section,
  trips = [],
  onChangeDraft,
  onResetSection,
}: SectionEditorProps) {
  if (!section) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm text-center flex flex-col items-center justify-center min-h-[460px] space-y-3 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-[#FF4D00]/5 text-[#D4541A] border border-[#FF4D00]/20 flex items-center justify-center font-bold">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-extrabold text-[#0B1528]">
            No Section Selected
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Select a live frontend section from the left panel to configure its
            text fields, photo galleries, and visual layout parameters.
          </p>
        </div>
      </div>
    );
  }

  const draft = section.draft || {};

  const handleDraftChange = (newDraft: Record<string, any>) => {
    onChangeDraft(section.id, newDraft);
  };

  const getSectionTitle = (item: SectionItem) => {
    switch (item.type) {
      case "hero":
        return "Hero Section";
      case "featured_trips":
      case "upcoming_trips":
      case "trips":
      case "trending_trips":
        return "Upcoming Group Trips";
      case "destinations":
        return "Popular Destinations";
      case "cta_slider":
      case "cta_banner":
      case "cinematic_banner":
        return "Media Banner Slider";
      case "vibe":
      case "recent_photos":
      case "photo_grid":
        return "Recent Photos From Our Trips";
      case "reviews":
        return "What Travelers Say";
      case "stories":
      case "journal":
      case "blogs":
        return "Stories From The Road";
      case "footer":
        return "Footer";
      default:
        return item.name || item.type.replace(/_/g, " ").toUpperCase();
    }
  };

  const getSectionBadge = (type: string) => {
    return type.replace(/_/g, " ").toUpperCase();
  };

  const renderEditor = () => {
    switch (section.type) {
      case "hero":
        return (
          <HeroSectionEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "featured_trips":
      case "upcoming_trips":
      case "trips":
        return (
          <FeaturedTripsEditor
            draft={draft}
            trips={trips}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "destinations":
        return (
          <PopularDestinationsEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "recent_photos":
      case "photo_grid":
        return (
          <RecentPhotosEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "reviews":
        return (
          <TravelersReviewsEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "stories":
      case "journal":
        return (
          <StoriesEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "footer":
        return (
          <FooterEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      case "cta_slider":
      case "cta_banner":
      case "cinematic_banner":
      case "vibe":
        return (
          <CTASliderEditor
            draft={draft}
            onChange={handleDraftChange}
            onReset={() => onResetSection(section.id)}
          />
        );
      default:
        return (
          <div className="p-6 text-center text-xs text-slate-500 font-medium">
            No custom configuration fields available for {section.type}.
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-6 font-sans">
      {/* Dynamic Header for Section Editor */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#0B1528]">
              Configure: {getSectionTitle(section)}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF4D00]/5 text-[#D4541A] border border-[#FF4D00]/20 uppercase tracking-wider">
              {getSectionBadge(section.type)}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Section ID: {section.id}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onResetSection(section.id)}
          className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 border-slate-200 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Reset
          Section
        </Button>
      </div>

      {/* Main Editor Component */}
      <div>{renderEditor()}</div>
    </div>
  );
}
