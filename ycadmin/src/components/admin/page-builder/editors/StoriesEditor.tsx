import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, BookOpen, Clock } from "lucide-react";

interface StoryItem {
  id: string;
  title: string;
  author: string;
  readTime: string;
  image?: string;
}

interface StoriesEditorProps {
  draft: Record<string, any>;
  stories?: StoryItem[];
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: "st1",
    title: "Top 10 Stargazing Spots in Spiti Valley",
    author: "Devanshi Patel",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80",
  },
  {
    id: "st2",
    title: "Solo Female Backpacking Guide to Manali",
    author: "Hetvi Mehta",
    readTime: "8 min read",
    image:
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&q=80",
  },
  {
    id: "st3",
    title: "How to Prepare for Your First Himalayan Winter Trek",
    author: "Hemal Shah",
    readTime: "7 min read",
    image:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=600&q=80",
  },
  {
    id: "st4",
    title: "Kerala Backwaters & Houseboat Travel Tips",
    author: "Parth Patel",
    readTime: "6 min read",
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&q=80",
  },
];

export function StoriesEditor({
  draft,
  stories = DEFAULT_STORIES,
  onChange,
  onReset,
}: StoriesEditorProps) {
  const selectedStoryIds: string[] = draft.selectedStoryIds || [
    "st1",
    "st2",
    "st3",
    "st4",
  ];

  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const toggleStory = (id: string) => {
    let updated: string[];
    if (selectedStoryIds.includes(id)) {
      updated = selectedStoryIds.filter((sId) => sId !== id);
    } else {
      updated = [...selectedStoryIds, id];
    }
    updateField("selectedStoryIds", updated);
  };

  const availableStories = stories.length > 0 ? stories : DEFAULT_STORIES;

  return (
    <div className="space-y-5 font-sans">
      {/* Section Title Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
            Title Text
          </Label>
          <Input
            type="text"
            value={draft.titlePrimary ?? "Stories"}
            onChange={(e) => updateField("titlePrimary", e.target.value)}
            placeholder="Stories"
            className="h-10 text-xs font-semibold rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#D97854] uppercase tracking-wider block flex items-center gap-1">
            <span>Accent Word</span>{" "}
            <span className="italic text-[#D97854] font-normal">
              (Italic Orange)
            </span>
          </Label>
          <Input
            type="text"
            value={draft.titleAccent ?? "From The Road"}
            onChange={(e) => updateField("titleAccent", e.target.value)}
            placeholder="From The Road"
            className="h-10 text-xs font-bold text-[#D97854] rounded-xl border-[#e5e7eb] focus:border-[#D97854]"
          />
        </div>
      </div>

      {/* Show View All Link Toggle */}
      <div className="pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <Checkbox
            checked={draft.showViewAllLink !== false}
            onCheckedChange={(chk) => updateField("showViewAllLink", !!chk)}
          />
          <span className="text-xs font-bold text-[#1A2332]">
            Show "View All Stories" Link
          </span>
        </label>
      </div>

      {/* Select Stories to Feature */}
      <div className="space-y-2 pt-1">
        <Label className="text-xs font-bold text-[#1A2332] uppercase tracking-wider block">
          Select Stories to Feature ({selectedStoryIds.length} Selected)
        </Label>

        <div className="border border-[#e5e7eb] rounded-xl p-3 bg-slate-50/50 max-h-[260px] overflow-y-auto space-y-2.5 no-scrollbar">
          {availableStories.map((st) => {
            const isChecked = selectedStoryIds.includes(st.id);
            return (
              <label
                key={st.id}
                onClick={() => toggleStory(st.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isChecked
                    ? "bg-white border-[#D97854] shadow-xs"
                    : "bg-white/80 border-[#e5e7eb] hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isChecked} />
                  {st.image && (
                    <img
                      src={st.image}
                      alt={st.title}
                      className="w-10 h-10 rounded-lg object-cover border border-[#e5e7eb] shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A2332] truncate">
                      {st.title}
                    </p>
                    <p className="text-[10.5px] text-[#6b7280] font-medium flex items-center gap-1">
                      by{" "}
                      <span className="font-semibold text-slate-700">
                        {st.author}
                      </span>{" "}
                      • <Clock className="w-2.5 h-2.5 text-[#D97854]" />{" "}
                      {st.readTime}
                    </p>
                  </div>
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
