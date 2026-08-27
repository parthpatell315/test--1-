import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GripVertical, MapPin, Loader2, Save } from "lucide-react";
import type { Trip } from "@/types";
import { tripsService } from "@/services/trips.service";
import { toast } from "sonner";

interface TripSortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trips: Trip[];
  onSaved: () => void;
}

export default function TripSortModal({
  open,
  onOpenChange,
  trips,
  onSaved,
}: TripSortModalProps) {
  const [items, setItems] = useState<Trip[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Sort initial items by current order
      setItems([...trips].sort((a, b) => (a.order || 999) - (b.order || 999)));
    }
  }, [open, trips]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const orderMap: Record<string, number> = {};
      items.forEach((trip, index) => {
        orderMap[trip.id] = index + 1; // 1-based ordering
      });

      await tripsService.bulkUpdateOrder(orderMap);
      toast.success("Trips sequence saved successfully");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save trips sequence");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg p-6 bg-white border border-slate-200 rounded-[6px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="pr-10 pb-4 border-b border-slate-100 flex flex-col text-left space-y-1 shrink-0">
          <DialogTitle className="text-base font-bold text-slate-900">
            Arrange Trips Manually
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Drag and drop trips to change their display order on the website.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-hidden min-h-0">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="trips-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar"
                >
                  {items.map((trip, index) => (
                    <Draggable
                      key={trip.id}
                      draggableId={trip.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm transition-all ${
                            snapshot.isDragging
                              ? "shadow-md border-primary ring-1 ring-primary/20 bg-slate-50"
                              : "hover:border-slate-350"
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="p-1 hover:bg-slate-100 rounded transition-colors cursor-grab active:cursor-grabbing shrink-0"
                          >
                            <GripVertical className="h-4 w-4 text-slate-400" />
                          </div>

                          <div className="flex-1 flex items-center gap-3 min-w-0">
                            {trip.heroImage || trip.images?.[0] ? (
                              <img
                                src={trip.heroImage || trip.images?.[0]}
                                alt=""
                                className="h-10 w-14 rounded object-cover bg-slate-50 border border-slate-100 shrink-0"
                                onError={(e) => {
                                  // Hide broken image and fallback to placeholder
                                  (e.target as HTMLElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <div className="h-10 w-14 rounded bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0 text-slate-300">
                                <MapPin className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate text-slate-800">
                                {trip.title}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
                                <span className="truncate">
                                  {trip.location}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-primary font-semibold">
                                  {trip.id}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-center h-6 w-6 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 font-mono shrink-0">
                            {index + 1}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100 flex items-center justify-end shrink-0">
          <Button
            variant="ghost"
            className="h-8 px-4 text-xs font-semibold text-slate-555 hover:text-slate-700 hover:bg-slate-50 rounded-[4px]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 bg-primary-orange hover:bg-primary-orange/90 text-white text-xs font-bold rounded-[4px] min-w-[130px] uppercase tracking-wider"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Sequence
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
