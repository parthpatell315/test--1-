import React, { useState } from "react";
import {
  Users,
  ShieldCheck,
  UserCheck,
  PhoneCall,
  Award,
  Clock,
  Compass,
  Heart,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit2,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AboutTripCard, AboutTripCmsData } from "@/types/tripV2";

const ICON_OPTIONS = [
  { name: "Users", icon: Users, label: "Group / People" },
  { name: "ShieldCheck", icon: ShieldCheck, label: "Verified & Safe" },
  { name: "UserCheck", icon: UserCheck, label: "Trip Captain" },
  { name: "PhoneCall", icon: PhoneCall, label: "24x7 Support" },
  { name: "Award", icon: Award, label: "Certified" },
  { name: "Clock", icon: Clock, label: "Flexible Timing" },
  { name: "Compass", icon: Compass, label: "Guided Adventure" },
  { name: "Heart", icon: Heart, label: "Loved by Travelers" },
  { name: "MapPin", icon: MapPin, label: "Handpicked Locations" },
  { name: "Sparkles", icon: Sparkles, label: "Premium Experience" },
];

const DEFAULT_CARDS: AboutTripCard[] = [
  {
    id: "card-1",
    title: "Group Trips",
    subtitle: "For Solo & Friends",
    icon: "Users",
    iconColor: "#ea580c",
    bgColor: "#fff7ed",
    borderColor: "#ffedd5",
    isVisible: true,
    order: 1,
  },
  {
    id: "card-2",
    title: "Verified & Safe",
    subtitle: "Trusted by 10K+",
    icon: "ShieldCheck",
    iconColor: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#dcfce7",
    isVisible: true,
    order: 2,
  },
  {
    id: "card-3",
    title: "Trip Captain",
    subtitle: "Expert & Friendly",
    icon: "UserCheck",
    iconColor: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#dbeafe",
    isVisible: true,
    order: 3,
  },
  {
    id: "card-4",
    title: "24×7 Support",
    subtitle: "We're here for you",
    icon: "PhoneCall",
    iconColor: "#9333ea",
    bgColor: "#faf5ff",
    borderColor: "#f3e8ff",
    isVisible: true,
    order: 4,
  },
];

interface AboutTripCmsEditorProps {
  data?: AboutTripCmsData;
  onChange: (updated: AboutTripCmsData) => void;
}

export const AboutTripCmsEditor: React.FC<AboutTripCmsEditorProps> = ({
  data,
  onChange,
}) => {
  const cmsTitle = data?.title || "About This Trip";
  const cmsDescription =
    data?.description ||
    "Get ready for an unforgettable journey through Northern India! Begin with a train journey from your city. Explore the cultural richness, mountain landscapes, and vibrant local traditions with expert guides.";
  const cards =
    data?.cards && data.cards.length > 0 ? data.cards : DEFAULT_CARDS;

  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const updateData = (
    title: string,
    description: string,
    updatedCards: AboutTripCard[],
  ) => {
    onChange({ title, description, cards: updatedCards });
  };

  const handleAddCard = () => {
    const newCard: AboutTripCard = {
      id: `card-${Date.now()}`,
      title: "New Highlight",
      subtitle: "Short tagline",
      icon: "Sparkles",
      iconColor: "#ea580c",
      bgColor: "#fff7ed",
      borderColor: "#ffedd5",
      isVisible: true,
      order: cards.length + 1,
    };
    const updated = [...cards, newCard];
    updateData(cmsTitle, cmsDescription, updated);
    setEditingCardId(newCard.id);
    toast.success("New highlight card added");
  };

  const handleDuplicateCard = (card: AboutTripCard) => {
    const dup: AboutTripCard = {
      ...card,
      id: `card-${Date.now()}`,
      title: `${card.title} (Copy)`,
      order: cards.length + 1,
    };
    const updated = [...cards, dup];
    updateData(cmsTitle, cmsDescription, updated);
    toast.success("Card duplicated");
  };

  const handleDeleteCard = (cardId: string) => {
    if (cards.length <= 1) {
      toast.error("At least one card is required");
      return;
    }
    const updated = cards.filter((c) => c.id !== cardId);
    updateData(cmsTitle, cmsDescription, updated);
    if (editingCardId === cardId) setEditingCardId(null);
    toast.success("Card deleted");
  };

  const handleToggleVisibility = (cardId: string) => {
    const updated = cards.map((c) =>
      c.id === cardId ? { ...c, isVisible: !c.isVisible } : c,
    );
    updateData(cmsTitle, cmsDescription, updated);
  };

  const handleMoveCard = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cards.length) return;
    const updated = [...cards];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    updateData(cmsTitle, cmsDescription, updated);
  };

  const handleUpdateCardField = (
    cardId: string,
    field: keyof AboutTripCard,
    value: any,
  ) => {
    const updated = cards.map((c) =>
      c.id === cardId ? { ...c, [field]: value } : c,
    );
    updateData(cmsTitle, cmsDescription, updated);
  };

  const renderIcon = (iconName: string, className?: string, color?: string) => {
    const found = ICON_OPTIONS.find((i) => i.name === iconName);
    const IconComp = found ? found.icon : Sparkles;
    return <IconComp className={className || "w-5 h-5"} style={{ color }} />;
  };

  return (
    <div className="space-y-6 text-xs">
      {/* CMS Header & Description Editor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF4D00]" />
            "About This Trip" CMS Editor
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
            Rich CMS Section
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Section Title
            </label>
            <Input
              value={cmsTitle}
              onChange={(e) =>
                updateData(e.target.value, cmsDescription, cards)
              }
              placeholder="e.g. About This Trip"
              className="h-9 text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Trip Overview Description
            </label>
            <Textarea
              value={cmsDescription}
              onChange={(e) => updateData(cmsTitle, e.target.value, cards)}
              placeholder="Write trip summary..."
              rows={4}
              className="text-xs leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Cards Builder & Reordering */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Highlight Badges & Cards ({cards.length})
            </h4>
            <p className="text-[10px] text-slate-400">
              Reorder, edit titles, change icons & customize theme colors
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAddCard}
            className="h-8 text-[11px] font-bold bg-[#FF4D00] hover:bg-[#FF4D00] text-white gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Highlight Card
          </Button>
        </div>

        {/* Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((card, idx) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className={cn(
                  "border rounded-xl p-3.5 transition-all space-y-3",
                  card.isVisible
                    ? "bg-white border-slate-200"
                    : "bg-slate-50 border-slate-200/60 opacity-60",
                  isEditing && "ring-2 ring-[#FF4D00]/20 border-[#FF4D00]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="p-2 rounded-lg shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor: card.bgColor || "#fff7ed",
                        border: `1px solid ${card.borderColor || "#ffedd5"}`,
                      }}
                    >
                      {renderIcon(
                        card.icon,
                        "w-4 h-4",
                        card.iconColor || "#ea580c",
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">
                        {card.title || "Untitled"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {card.subtitle || "No subtitle"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveCard(idx, "UP")}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveCard(idx, "DOWN")}
                      disabled={idx === cards.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(card.id)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title={card.isVisible ? "Hide" : "Show"}
                    >
                      {card.isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingCardId(isEditing ? null : card.id)
                      }
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateCard(card)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Card Settings */}
                {isEditing && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3 rounded-lg mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Card Title
                        </label>
                        <Input
                          value={card.title}
                          onChange={(e) =>
                            handleUpdateCardField(
                              card.id,
                              "title",
                              e.target.value,
                            )
                          }
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Subtitle
                        </label>
                        <Input
                          value={card.subtitle}
                          onChange={(e) =>
                            handleUpdateCardField(
                              card.id,
                              "subtitle",
                              e.target.value,
                            )
                          }
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Icon Selection */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">
                        Select Icon
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ICON_OPTIONS.map((opt) => {
                          const IconComp = opt.icon;
                          const isSel = card.icon === opt.name;
                          return (
                            <button
                              key={opt.name}
                              type="button"
                              onClick={() =>
                                handleUpdateCardField(card.id, "icon", opt.name)
                              }
                              className={cn(
                                "p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all",
                                isSel
                                  ? "bg-[#FF4D00]/5 border-[#FF4D00] text-[#FF4D00] font-bold"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span className="text-[10px]">{opt.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Theme Colors */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Icon Color
                        </label>
                        <Input
                          type="color"
                          value={card.iconColor || "#ea580c"}
                          onChange={(e) =>
                            handleUpdateCardField(
                              card.id,
                              "iconColor",
                              e.target.value,
                            )
                          }
                          className="h-7 p-0.5 bg-white cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Background
                        </label>
                        <Input
                          type="color"
                          value={card.bgColor || "#fff7ed"}
                          onChange={(e) =>
                            handleUpdateCardField(
                              card.id,
                              "bgColor",
                              e.target.value,
                            )
                          }
                          className="h-7 p-0.5 bg-white cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">
                          Border
                        </label>
                        <Input
                          type="color"
                          value={card.borderColor || "#ffedd5"}
                          onChange={(e) =>
                            handleUpdateCardField(
                              card.id,
                              "borderColor",
                              e.target.value,
                            )
                          }
                          className="h-7 p-0.5 bg-white cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── LIVE PREVIEW SECTION (REQUIREMENT 9) ─── */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#FF4D00] flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Live Frontend Preview
          </h4>
          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            Real-time CMS Output
          </span>
        </div>

        <div className="bg-white text-slate-900 rounded-xl p-6 space-y-5 shadow-xs">
          <h3 className="font-bold text-xl text-slate-900">{cmsTitle}</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {cmsDescription}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {cards
              .filter((c) => c.isVisible)
              .map((card) => (
                <div
                  key={card.id}
                  className="p-3.5 rounded-xl flex items-center gap-3 transition-all"
                  style={{
                    backgroundColor: card.bgColor || "#fff7ed",
                    border: `1px solid ${card.borderColor || "#ffedd5"}`,
                  }}
                >
                  <div className="p-2 rounded-lg shrink-0">
                    {renderIcon(
                      card.icon,
                      "w-5 h-5",
                      card.iconColor || "#ea580c",
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">
                      {card.title}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutTripCmsEditor;

