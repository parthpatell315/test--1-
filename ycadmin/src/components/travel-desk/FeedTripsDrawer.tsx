import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Check,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tripsService } from "@/services/trips.service";
import { travelDeskService } from "@/services/travelDesk.service";
import { Trip } from "@/types";
import { toast } from "sonner";

interface FeedTripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: (tripId: string) => void;
  activeTripIds: string[];
}

export const FeedTripsDrawer: React.FC<FeedTripsDrawerProps> = ({
  isOpen,
  onClose,
  onActivated,
  activeTripIds,
}) => {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllTrips();
    }
  }, [isOpen]);

  const loadAllTrips = async () => {
    setIsLoading(true);
    try {
      const trips = await tripsService.getAll();
      setAllTrips(trips || []);
    } catch (err) {
      toast.error("Failed to load trips from master");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTrips = allTrips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      (t.shortName && t.shortName.toLowerCase().includes(search.toLowerCase())),
  );

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleFeed = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const results = await travelDeskService.feedWorkspaces(
        Array.from(selectedIds),
      );

      const createdCount = results.filter(
        (r: any) => r.status === "created",
      ).length;
      if (createdCount > 0) {
        toast.success(`Successfully initialized ${createdCount} workspaces!`);
      } else {
        toast.info("Selected trips were already initialized.");
      }

      // Select the first successfully activated trip (if it wasn't already active)
      if (results.length > 0) {
        onActivated(results[0].tripId);
      }
      onClose();
    } catch (err) {
      toast.error("Failed to feed workspaces.");
    } finally {
      setIsSubmitting(false);
      setSelectedIds(new Set());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Activate Travel Desk
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Initialize a workspace for an existing trip
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search master trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-[#FF6B00] rounded-full animate-spin" />
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm font-semibold">
              No trips found matching your search.
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isAlreadyActive = activeTripIds.includes(trip.id);
              const isSelected = selectedIds.has(trip.id);

              return (
                <div
                  key={trip.id}
                  onClick={() => !isAlreadyActive && handleToggle(trip.id)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer",
                    isAlreadyActive
                      ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#FF4D00]/5 border-[#FF4D00]/30"
                        : "bg-white border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                      isAlreadyActive
                        ? "bg-slate-200 border-slate-300 text-slate-400"
                        : isSelected
                          ? "bg-[#FF6B00] border-[#FF6B00] text-white"
                          : "bg-white border-slate-300",
                    )}
                  >
                    {(isAlreadyActive || isSelected) && (
                      <Check className="w-3 h-3" strokeWidth={3} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">
                      {trip.title}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {trip.location} • {trip.category || "N/A"}
                    </p>
                  </div>

                  {isAlreadyActive && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            disabled={selectedIds.size === 0 || isSubmitting}
            onClick={handleFeed}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E66000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Activate Selected Trips ({selectedIds.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
