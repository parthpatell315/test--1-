import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  Edit,
  Copy,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Calendar,
  Layers,
  Check,
  ArrowRight,
  DollarSign,
  Train,
  Bed,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LocationVariantV2, VariantItineraryDay } from "@/types/tripV2";

interface VariantsManagerProps {
  variants?: LocationVariantV2[];
  globalItinerary?: any[];
  onChange: (updated: LocationVariantV2[]) => void;
}

export const VariantsManager: React.FC<VariantsManagerProps> = ({
  variants = [],
  globalItinerary = [],
  onChange,
}) => {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variants[0]?.id || null,
  );
  const [activeSubTab, setActiveSubTab] = useState<
    "pricing" | "options" | "itinerary" | "gallery"
  >("pricing");

  const currentVariant =
    variants.find((v) => v.id === activeVariantId) || variants[0];

  const handleAddVariant = () => {
    const newVar: LocationVariantV2 = {
      id: `var-${Date.now()}`,
      name: "New Departure City",
      duration: "9D/8N",
      price: 12999,
      originalPrice: 14999,
      isDirectJoin: false,
      travelOptions: [
        { name: "NON AC SLEEPER", priceDelta: 0, isDefault: true },
        { name: "3 AC TRAIN", priceDelta: 2000 },
      ],
      roomOptions: [
        { name: "Quad Sharing (4 Person)", priceDelta: 0, isDefault: true },
        { name: "Triple Sharing", priceDelta: 999 },
        { name: "Double Sharing", priceDelta: 2500 },
      ],
      itinerary:
        globalItinerary.length > 0
          ? [...globalItinerary]
          : [
              {
                day: 0,
                title: "Departure & Train Journey",
                description: "Board train from departure city.",
                meals: "Train Food",
                hotel: "Overnight Train",
                transport: "Sleeper Class",
              },
              {
                day: 1,
                title: "Arrival & Sightseeing",
                description: "Reach destination and check in to hotel.",
                meals: "Dinner",
                hotel: "Resort Stay",
                transport: "Private Tempo",
              },
            ],
    };
    const updated = [...variants, newVar];
    onChange(updated);
    setActiveVariantId(newVar.id);
    toast.success("New location variant created");
  };

  const handleDeleteVariant = (varId: string) => {
    if (variants.length <= 1) {
      toast.error("At least one location variant is required");
      return;
    }
    const updated = variants.filter((v) => v.id !== varId);
    onChange(updated);
    if (activeVariantId === varId) setActiveVariantId(updated[0].id);
    toast.success("Variant deleted");
  };

  const handleUpdateVariantField = (
    varId: string,
    field: keyof LocationVariantV2,
    value: any,
  ) => {
    const updated = variants.map((v) =>
      v.id === varId ? { ...v, [field]: value } : v,
    );
    onChange(updated);
  };

  // Itinerary builder helpers inside variant
  const handleAddDayToVariant = (varId: string) => {
    const target = variants.find((v) => v.id === varId);
    if (!target) return;
    const days = target.itinerary || [];
    const nextDayNum =
      days.length > 0 ? Math.max(...days.map((d) => d.day)) + 1 : 1;
    const newDay: VariantItineraryDay = {
      day: nextDayNum,
      title: `Day ${nextDayNum} Exploration`,
      description: "Detailed itinerary description for this day...",
      meals: "Breakfast & Dinner",
      hotel: "Mountain Resort",
      transport: "Private Vehicle",
    };
    handleUpdateVariantField(varId, "itinerary", [...days, newDay]);
    toast.success(`Day ${nextDayNum} added to ${target.name}`);
  };

  const handleUpdateVariantDay = (
    varId: string,
    dayIndex: number,
    field: keyof VariantItineraryDay,
    value: any,
  ) => {
    const target = variants.find((v) => v.id === varId);
    if (!target) return;
    const days = [...(target.itinerary || [])];
    if (days[dayIndex]) {
      days[dayIndex] = { ...days[dayIndex], [field]: value };
      handleUpdateVariantField(varId, "itinerary", days);
    }
  };

  const handleDeleteVariantDay = (varId: string, dayIndex: number) => {
    const target = variants.find((v) => v.id === varId);
    if (!target) return;
    const days = (target.itinerary || []).filter((_, idx) => idx !== dayIndex);
    handleUpdateVariantField(varId, "itinerary", days);
    toast.success("Itinerary day removed");
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Location Variant Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Location Variants & Variant-wise Itineraries ({variants.length})
            </h3>
            <p className="text-[10px] text-slate-400">
              Configure independent pricing, travel modes, and day-wise
              itineraries for each departure city
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAddVariant}
            className="h-8 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Add Variant
          </Button>
        </div>

        {/* Variant Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {variants.map((v) => {
            const isActive = v.id === activeVariantId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVariantId(v.id)}
                className={cn(
                  "px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border transition-all shrink-0",
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                )}
              >
                <span>{v.name}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded",
                    isActive
                      ? "bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  ₹{(v.price || 0).toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Variant Active Editor */}
      {currentVariant && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
          {/* Header & Subtabs */}
          <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm">
                {currentVariant.name}
              </h4>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                {currentVariant.duration || "9D/8N"}
              </span>
              {currentVariant.isDirectJoin && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                  Direct Join
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(["pricing", "options", "itinerary", "gallery"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSubTab(tab)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-bold uppercase rounded-md transition-all",
                      activeSubTab === tab
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {tab === "pricing"
                      ? "Basic & Price"
                      : tab === "options"
                        ? "Options & Upgrades"
                        : tab === "itinerary"
                          ? `Itinerary (${(currentVariant.itinerary || []).length} Days)`
                          : "Gallery"}
                  </button>
                ),
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteVariant(currentVariant.id)}
              className="h-7 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Variant
            </Button>
          </div>

          {/* Subtab 1: Basic & Price */}
          {activeSubTab === "pricing" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Variant Name / Departure City
                </label>
                <Input
                  value={currentVariant.name}
                  onChange={(e) =>
                    handleUpdateVariantField(
                      currentVariant.id,
                      "name",
                      e.target.value,
                    )
                  }
                  className="h-9 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Duration (e.g. 9D/8N)
                </label>
                <Input
                  value={currentVariant.duration || ""}
                  onChange={(e) =>
                    handleUpdateVariantField(
                      currentVariant.id,
                      "duration",
                      e.target.value,
                    )
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Base Price (₹)
                </label>
                <Input
                  type="number"
                  value={currentVariant.price}
                  onChange={(e) =>
                    handleUpdateVariantField(
                      currentVariant.id,
                      "price",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-9 text-xs font-mono font-bold text-green-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Original Price (₹)
                </label>
                <Input
                  type="number"
                  value={currentVariant.originalPrice || 0}
                  onChange={(e) =>
                    handleUpdateVariantField(
                      currentVariant.id,
                      "originalPrice",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id={`direct-join-${currentVariant.id}`}
                  checked={currentVariant.isDirectJoin || false}
                  onChange={(e) =>
                    handleUpdateVariantField(
                      currentVariant.id,
                      "isDirectJoin",
                      e.target.checked,
                    )
                  }
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor={`direct-join-${currentVariant.id}`}
                  className="text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Direct Join (Exclude train/travel options)
                </label>
              </div>
            </div>
          )}

          {/* Subtab 2: Travel & Room Options */}
          {activeSubTab === "options" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Travel Mode Options */}
              <div className="space-y-3 p-4 bg-slate-50 border rounded-xl">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Train className="w-4 h-4 text-green-600" /> Travel Mode
                  Upgrades
                </h5>
                {(currentVariant.travelOptions || []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.name}
                      onChange={(e) => {
                        const updatedOpts = [
                          ...(currentVariant.travelOptions || []),
                        ];
                        updatedOpts[idx].name = e.target.value;
                        handleUpdateVariantField(
                          currentVariant.id,
                          "travelOptions",
                          updatedOpts,
                        );
                      }}
                      placeholder="e.g. 3 AC TRAIN"
                      className="h-8 text-xs bg-white"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">+₹</span>
                      <Input
                        type="number"
                        value={opt.priceDelta}
                        onChange={(e) => {
                          const updatedOpts = [
                            ...(currentVariant.travelOptions || []),
                          ];
                          updatedOpts[idx].priceDelta =
                            parseFloat(e.target.value) || 0;
                          handleUpdateVariantField(
                            currentVariant.id,
                            "travelOptions",
                            updatedOpts,
                          );
                        }}
                        className="h-8 text-xs font-mono w-24 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Room Sharing Options */}
              <div className="space-y-3 p-4 bg-slate-50 border rounded-xl">
                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-blue-600" /> Room Sharing
                  Upgrades
                </h5>
                {(currentVariant.roomOptions || []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.name}
                      onChange={(e) => {
                        const updatedOpts = [
                          ...(currentVariant.roomOptions || []),
                        ];
                        updatedOpts[idx].name = e.target.value;
                        handleUpdateVariantField(
                          currentVariant.id,
                          "roomOptions",
                          updatedOpts,
                        );
                      }}
                      placeholder="e.g. Double Sharing"
                      className="h-8 text-xs bg-white"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">+₹</span>
                      <Input
                        type="number"
                        value={opt.priceDelta}
                        onChange={(e) => {
                          const updatedOpts = [
                            ...(currentVariant.roomOptions || []),
                          ];
                          updatedOpts[idx].priceDelta =
                            parseFloat(e.target.value) || 0;
                          handleUpdateVariantField(
                            currentVariant.id,
                            "roomOptions",
                            updatedOpts,
                          );
                        }}
                        className="h-8 text-xs font-mono w-24 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 3: Variant-wise Day-by-Day Itinerary Builder */}
          {activeSubTab === "itinerary" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">
                    Variant-Specific Itinerary for {currentVariant.name}
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    This itinerary will be shown whenever a user selects the{" "}
                    {currentVariant.name} departure option on the website.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddDayToVariant(currentVariant.id)}
                  className="h-7 text-[10px] font-bold bg-green-600 hover:bg-green-600 text-white gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Day
                </Button>
              </div>

              {(currentVariant.itinerary || []).length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-xl bg-slate-50/50 text-slate-400 italic">
                  No variant-specific itinerary added yet. Click "+ Add Day" to
                  create day 0/1 itinerary for {currentVariant.name}.
                </div>
              ) : (
                <div className="space-y-3">
                  {(currentVariant.itinerary || []).map((dayItem, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-black text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          Day {dayItem.day}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteVariantDay(currentVariant.id, dIdx)
                          }
                          className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Day
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Day Title
                          </label>
                          <Input
                            value={dayItem.title}
                            onChange={(e) =>
                              handleUpdateVariantDay(
                                currentVariant.id,
                                dIdx,
                                "title",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. Reach Amritsar & Golden Temple Visit"
                            className="h-8 text-xs font-bold bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-400">
                            Day Number
                          </label>
                          <Input
                            type="number"
                            value={dayItem.day}
                            onChange={(e) =>
                              handleUpdateVariantDay(
                                currentVariant.id,
                                dIdx,
                                "day",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="h-8 text-xs font-mono bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Description & Schedule
                        </label>
                        <Textarea
                          value={dayItem.description}
                          onChange={(e) =>
                            handleUpdateVariantDay(
                              currentVariant.id,
                              dIdx,
                              "description",
                              e.target.value,
                            )
                          }
                          rows={3}
                          className="text-xs bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <label className="font-bold text-slate-400 uppercase">
                            Meals
                          </label>
                          <Input
                            value={dayItem.meals || ""}
                            onChange={(e) =>
                              handleUpdateVariantDay(
                                currentVariant.id,
                                dIdx,
                                "meals",
                                e.target.value,
                              )
                            }
                            placeholder="Breakfast, Dinner"
                            className="h-7 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-400 uppercase">
                            Hotel / Stay
                          </label>
                          <Input
                            value={dayItem.hotel || ""}
                            onChange={(e) =>
                              handleUpdateVariantDay(
                                currentVariant.id,
                                dIdx,
                                "hotel",
                                e.target.value,
                              )
                            }
                            placeholder="Resort Stay"
                            className="h-7 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-400 uppercase">
                            Transport
                          </label>
                          <Input
                            value={dayItem.transport || ""}
                            onChange={(e) =>
                              handleUpdateVariantDay(
                                currentVariant.id,
                                dIdx,
                                "transport",
                                e.target.value,
                              )
                            }
                            placeholder="Sleeper Train / Tempo"
                            className="h-7 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VariantsManager;

