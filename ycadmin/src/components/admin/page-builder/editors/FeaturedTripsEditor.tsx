import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, MapPin } from "lucide-react";

interface TripItem {
  id: string;
  title: string;
  location?: string;
  destination?: string;
  price?: number;
}

interface FeaturedTripsEditorProps {
  draft: Record<string, any>;
  trips?: TripItem[];
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

const DEFAULT_TRIPS: TripItem[] = [];

export function FeaturedTripsEditor({
  draft,
  trips = DEFAULT_TRIPS,
  onChange,
  onReset,
}: FeaturedTripsEditorProps) {
  const selectedTripIds: string[] = draft.selectedTripIds || [];

  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const toggleTrip = (tripId: string) => {
    let updated: string[];
    if (selectedTripIds.includes(tripId)) {
      updated = selectedTripIds.filter((id) => id !== tripId);
    } else {
      updated = [...selectedTripIds, tripId];
    }
    updateField("selectedTripIds", updated);
  };

  const availableTrips = trips.length > 0 ? trips : DEFAULT_TRIPS;
  const carouselType = draft.carouselType || "carousel";

  return (
    <div className="space-y-5 font-sans">
      {/* Section Title */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Section Title
        </Label>
        <Input
          type="text"
          value={draft.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="e.g. Featured Adventures"
          className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
        />
      </div>

      {/* Carousel Type & Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Carousel / Display Type
          </Label>
          <Select
            value={carouselType}
            onValueChange={(val) => updateField("carouselType", val)}
          >
            <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb]">
              <SelectValue placeholder="Carousel Type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="carousel">
                Carousel (Horizontal Scroll)
              </SelectItem>
              <SelectItem value="grid">Grid Layout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {carouselType === "grid" ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
              Grid Columns
            </Label>
            <Select
              value={String(draft.columns || "3")}
              onValueChange={(val) => updateField("columns", val)}
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb]">
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
              Trip Card Style
            </Label>
            <Select
              value={draft.cardStyle || "full"}
              onValueChange={(val) => updateField("cardStyle", val)}
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb]">
                <SelectValue placeholder="Card Style" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="full">
                  Full (Image + Duration + Price + View Trip)
                </SelectItem>
                <SelectItem value="compact">
                  Compact (Image + Title + Price)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Select Trips to Feature */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Select Trips to Feature ({selectedTripIds.length} Selected)
        </Label>

        <div className="border border-[#e5e7eb] rounded-xl p-3 bg-slate-50/50 max-h-[240px] overflow-y-auto space-y-2 no-scrollbar">
          {availableTrips.map((t) => {
            const isChecked = selectedTripIds.includes(t.id);
            return (
              <label
                key={t.id}
                onClick={() => toggleTrip(t.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isChecked
                    ? "bg-white border-[#D97854] shadow-xs"
                    : "bg-white/80 border-[#e5e7eb] hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isChecked} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A2332] truncate">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-[#6b7280] font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#D97854]" />{" "}
                      {t.location || t.destination || "India"}
                    </p>
                  </div>
                </div>
                {t.price && (
                  <span className="text-xs font-extrabold text-[#D97854] shrink-0">
                    ₹{t.price.toLocaleString("en-IN")}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Reset button */}
      <div className="pt-3 border-t border-[#e5e7eb]">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-8 px-4 text-xs font-bold text-[#6b7280] hover:text-[#1A2332] border-[#e5e7eb] rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#6b7280]" /> Reset to
          Default
        </Button>
      </div>
    </div>
  );
}
