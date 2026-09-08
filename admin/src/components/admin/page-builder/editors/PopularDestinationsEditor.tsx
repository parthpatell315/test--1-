import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  RotateCcw,
  MapPin,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

interface DestinationObject {
  id?: string;
  name: string;
  subtext?: string;
  imageUrl?: string;
  img?: string;
}

interface PopularDestinationsEditorProps {
  draft: Record<string, any>;
  onChange: (updatedDraft: Record<string, any>) => void;
  onReset: () => void;
}

const DEFAULT_ITEMS: DestinationObject[] = [
  {
    name: "Himachal Pradesh",
    subtext: "Snow Peaks & Valleys",
    imageUrl:
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&q=80",
  },
  {
    name: "Uttarakhand",
    subtext: "Trekking & Temple Trails",
    imageUrl:
      "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=600&q=80",
  },
  {
    name: "Spiti Valley",
    subtext: "High Altitude Desert",
    imageUrl:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80",
  },
  {
    name: "Ladakh",
    subtext: "Passes & Pangong Lake",
    imageUrl:
      "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&q=80",
  },
  {
    name: "Kerala",
    subtext: "Backwaters & Tropical Hills",
    imageUrl:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&q=80",
  },
];

export function PopularDestinationsEditor({
  draft,
  onChange,
  onReset,
}: PopularDestinationsEditorProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const destinationsList: DestinationObject[] =
    Array.isArray(draft.destinations) && draft.destinations.length > 0
      ? draft.destinations.map((d: any) =>
          typeof d === "string"
            ? { name: d, imageUrl: "" }
            : { ...d, imageUrl: d.imageUrl || d.img },
        )
      : Array.isArray(draft.selectedDestinations) &&
          draft.selectedDestinations.length > 0
        ? draft.selectedDestinations.map((name: string) => {
            const found = DEFAULT_ITEMS.find(
              (i) => i.name.toLowerCase() === name.toLowerCase(),
            );
            return found || { name, imageUrl: "" };
          })
        : DEFAULT_ITEMS;

  const [newName, setNewName] = useState("");
  const [newSubtext, setNewSubtext] = useState("");
  const [newImage, setNewImage] = useState("");

  const handleUpdateItem = (
    index: number,
    updatedItem: Partial<DestinationObject>,
  ) => {
    const updated = destinationsList.map((item, i) => {
      if (i === index) {
        return { ...item, ...updatedItem };
      }
      return item;
    });
    updateField("destinations", updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = destinationsList.filter((_, i) => i !== index);
    updateField("destinations", updated);
  };

  const handleAddDestination = () => {
    if (!newName.trim()) return;
    const newItem: DestinationObject = {
      name: newName.trim(),
      subtext: newSubtext.trim() || "Explore Group Trip",
      imageUrl:
        newImage ||
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    };
    updateField("destinations", [...destinationsList, newItem]);
    setNewName("");
    setNewSubtext("");
    setNewImage("");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#0B1528] uppercase tracking-wider block">
            Title Text
          </Label>
          <Input
            type="text"
            value={draft.titlePrimary ?? "Popular"}
            onChange={(e) => updateField("titlePrimary", e.target.value)}
            placeholder="Popular"
            className="h-10 text-xs font-semibold rounded-xl border-slate-200 focus:border-[#D4541A]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#D4541A] uppercase tracking-wider block flex items-center gap-1">
            <span>Accent Word</span>{" "}
            <span className="italic text-[#D4541A] font-normal">
              (Italic Orange)
            </span>
          </Label>
          <Input
            type="text"
            value={draft.titleAccent ?? "Destinations"}
            onChange={(e) => updateField("titleAccent", e.target.value)}
            placeholder="Destinations"
            className="h-10 text-xs font-bold text-[#D4541A] rounded-xl border-slate-200 focus:border-[#D4541A]"
          />
        </div>
      </div>

      {/* Destinations List with Image Upload & Subtext */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-[#0B1528] uppercase tracking-wider block flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#D4541A]" />
          Manage Destinations ({destinationsList.length})
        </Label>

        <div className="space-y-3">
          {destinationsList.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#FF4D00]/10 text-[#D4541A] font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <Input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      handleUpdateItem(idx, { name: e.target.value })
                    }
                    placeholder="Destination Name (e.g. Manali)"
                    className="h-9 text-xs font-bold text-[#0B1528] rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemoveItem(idx)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold text-slate-500 uppercase">
                    Subtext / Tagline
                  </Label>
                  <Input
                    type="text"
                    value={item.subtext || ""}
                    onChange={(e) =>
                      handleUpdateItem(idx, { subtext: e.target.value })
                    }
                    placeholder="e.g. Snow Peaks & Valleys"
                    className="h-8 text-xs font-medium rounded-xl border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold text-slate-500 uppercase">
                    Upload Card Photo
                  </Label>
                  <ImageUpload
                    value={item.imageUrl || item.img}
                    onUpload={(url) =>
                      handleUpdateItem(idx, { imageUrl: url, img: url })
                    }
                    label="Upload Photo"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Destination Card */}
      <div className="p-4 rounded-2xl border border-dashed border-[#FF4D00]/30 bg-[#FF4D00]/5/40 space-y-3">
        <Label className="text-xs font-bold text-[#D4541A] uppercase tracking-wider block flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#D4541A]" /> Add New Destination Card
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Destination Name (e.g. Gokarna)"
            className="h-9 text-xs font-bold rounded-xl border-slate-200 bg-white"
          />
          <Input
            type="text"
            value={newSubtext}
            onChange={(e) => setNewSubtext(e.target.value)}
            placeholder="Subtext (e.g. Beach & Cliff Trek)"
            className="h-9 text-xs font-medium rounded-xl border-slate-200 bg-white"
          />
        </div>

        <ImageUpload
          value={newImage}
          onUpload={(url) => setNewImage(url)}
          label="Upload Destination Photo"
        />

        <Button
          type="button"
          onClick={handleAddDestination}
          disabled={!newName.trim()}
          className="w-full h-9 bg-[#D4541A] hover:bg-[#b84312] text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Destination
        </Button>
      </div>

      {/* Reset button */}
      <div className="pt-3 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-8 px-4 text-xs font-bold text-slate-600 hover:text-[#0B1528] border-slate-200 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Reset to
          Default
        </Button>
      </div>
    </div>
  );
}
