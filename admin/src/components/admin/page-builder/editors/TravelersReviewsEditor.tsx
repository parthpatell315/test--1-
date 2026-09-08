import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Star } from "lucide-react";

interface ReviewItem {
  id: string;
  name: string;
  tripName: string;
  comment: string;
  rating: number;
  avatar?: string;
}

interface TravelersReviewsEditorProps {
  draft: Record<string, any>;
  reviews?: ReviewItem[];
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: "gr1",
    name: "Kathan Patel",
    tripName: "Spiti Valley Bike Trip",
    comment:
      "I travelled with YouthCamping Spiti Valley Bike Trip this June. My experience was super thrilling and captains were supportive!",
    rating: 5,
  },
  {
    id: "gr2",
    name: "Bhumit Rabadiya",
    tripName: "Manali Kasol Backpacking",
    comment:
      "Thank you for crafting a trip that perfectly matched our style! Stays, bonfire nights, and riverfront camping were out of this world.",
    rating: 5,
  },
  {
    id: "gr3",
    name: "Janak Chauhan",
    tripName: "Kedarkantha Trek",
    comment:
      "Just a few weeks back I took the trek with YouthCamping and believe me I had an amazing expedition of a lifetime!",
    rating: 5,
  },
];

export function TravelersReviewsEditor({
  draft,
  reviews = DEFAULT_REVIEWS,
  onChange,
  onReset,
}: TravelersReviewsEditorProps) {
  const selectedReviewIds: string[] = draft.selectedReviewIds || [
    "gr1",
    "gr2",
    "gr3",
  ];

  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const toggleReview = (id: string) => {
    let updated: string[];
    if (selectedReviewIds.includes(id)) {
      updated = selectedReviewIds.filter((rId) => rId !== id);
    } else {
      updated = [...selectedReviewIds, id];
    }
    updateField("selectedReviewIds", updated);
  };

  const availableReviews = reviews.length > 0 ? reviews : DEFAULT_REVIEWS;

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
          placeholder="e.g. What Travelers Say"
          className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
        />
      </div>

      {/* Show View All Link Toggle */}
      <div className="pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <Checkbox
            checked={draft.showViewAllLink !== false}
            onCheckedChange={(chk) => updateField("showViewAllLink", !!chk)}
          />
          <span className="text-xs font-bold text-[#1A2332]">
            Show "View All Reviews" Link
          </span>
        </label>
      </div>

      {/* Select Reviews to Feature */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Select Reviews to Feature ({selectedReviewIds.length} Selected)
        </Label>

        <div className="border border-[#e5e7eb] rounded-xl p-3 bg-slate-50/50 max-h-[260px] overflow-y-auto space-y-2.5 no-scrollbar">
          {availableReviews.map((rev) => {
            const isChecked = selectedReviewIds.includes(rev.id);
            return (
              <label
                key={rev.id}
                onClick={() => toggleReview(rev.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isChecked
                    ? "bg-white border-[#D97854] shadow-xs"
                    : "bg-white/80 border-[#e5e7eb] hover:bg-white"
                }`}
              >
                <Checkbox checked={isChecked} className="mt-1" />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#1A2332]">
                      {rev.name}
                    </p>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-bold text-[#1A2332]">
                        5.0
                      </span>
                    </div>
                  </div>
                  <p className="text-[10.5px] font-bold text-[#D97854]">
                    {rev.tripName}
                  </p>
                  <p className="text-[11px] text-[#6b7280] font-medium line-clamp-2 leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>
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
