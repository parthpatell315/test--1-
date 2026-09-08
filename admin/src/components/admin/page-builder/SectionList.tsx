import React from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Layout,
  Megaphone,
  Compass,
  ImageIcon,
  MessageSquare,
  BookOpen,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

export interface SectionItem {
  id: string;
  type: string;
  name?: string;
  visible?: boolean;
  draft?: Record<string, any>;
  [key: string]: any;
}

interface SectionListProps {
  sections: SectionItem[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onOpenAddModal: () => void;
  onReorder: (newSections: SectionItem[]) => void;
}

export function SectionList({
  sections,
  selectedSectionId,
  onSelectSection,
  onToggleVisibility,
  onDeleteSection,
  onOpenAddModal,
  onReorder,
}: SectionListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "hero":
        return Layout;
      case "featured_trips":
      case "upcoming_trips":
      case "trips":
      case "trending_trips":
        return Megaphone;
      case "destinations":
        return Compass;
      case "vibe":
      case "recent_photos":
      case "photo_grid":
        return ImageIcon;
      case "reviews":
        return MessageSquare;
      case "stories":
      case "journal":
      case "blogs":
        return BookOpen;
      default:
        return Layers;
    }
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
      case "vibe":
        return "Media Banner Slider";
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onReorder(items);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-4 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#0B1528] tracking-tight">
              Page Layout Sections
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-slate-100 text-slate-600">
              {sections.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Drag handle to reorder, click to edit fields
          </p>
        </div>
      </div>

      {/* Sections Cards List with DragDropContext */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="page-sections-droppable">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 min-h-[100px]"
            >
              {sections.map((item, index) => {
                const IconComp = getIcon(item.type);
                const isSelected = item.id === selectedSectionId;
                const isVisible = item.visible !== false;

                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        onClick={() => onSelectSection(item.id)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-[#FF4D00]/5/60 border-[#D4541A] shadow-xs"
                            : "bg-slate-50/50 hover:bg-white border-slate-200/80 hover:border-slate-300"
                        } ${!isVisible ? "opacity-60 bg-slate-100/50" : ""} ${
                          snapshot.isDragging
                            ? "shadow-xl border-[#D4541A] bg-white z-50 scale-[1.02]"
                            : ""
                        }`}
                      >
                        {/* Selected Left Accent Bar */}
                        {isSelected && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#D4541A] rounded-r-full" />
                        )}

                        {/* Drag Handle & Info */}
                        <div className="flex items-center gap-2.5 min-w-0 pl-1">
                          <div
                            {...draggableProvided.dragHandleProps}
                            className="p-1 text-slate-300 hover:text-[#D4541A] cursor-grab active:cursor-grabbing transition-colors shrink-0"
                            title="Drag to reorder section"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#D4541A] text-white"
                                : "bg-white text-slate-600 border border-slate-200/80 group-hover:border-slate-300"
                            }`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate leading-tight ${
                                isSelected ? "text-[#0B1528]" : "text-slate-700"
                              }`}
                            >
                              {getSectionTitle(item)}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5 uppercase tracking-wider">
                              {item.type}
                            </p>
                          </div>
                        </div>

                        {/* Actions (Toggle Visibility & Delete) */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Visibility Eye */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleVisibility(item.id);
                            }}
                            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all cursor-pointer ${
                              !isVisible
                                ? "text-amber-500 hover:text-amber-600"
                                : ""
                            }`}
                            title={isVisible ? "Hide section" : "Show section"}
                          >
                            {isVisible ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Button (Keep Hero safe) */}
                          {item.type !== "hero" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSection(item.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add New Section Button */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={onOpenAddModal}
          className="w-full h-10 border-2 border-dashed border-[#D4541A]/40 hover:border-[#D4541A] bg-[#FF4D00]/5/30 hover:bg-[#FF4D00]/5 text-[#D4541A] text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-[#D4541A]" /> Add New Section
        </Button>
      </div>
    </div>
  );
}
