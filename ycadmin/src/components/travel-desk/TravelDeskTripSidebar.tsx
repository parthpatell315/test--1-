import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Compass,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelDeskTripSidebarProps {
  trips: any[];
  activeTripId?: string;
  isLoading: boolean;
  onFeedClick: () => void;
  onAddTripClick?: () => void;
}

export const TravelDeskTripSidebar: React.FC<TravelDeskTripSidebarProps> = ({
  trips,
  activeTripId,
  isLoading,
  onFeedClick,
  onAddTripClick,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "knowledge";

  const [tripTypeFilter, setTripTypeFilter] = useState<
    "domestic" | "international"
  >("domestic");
  const [search, setSearch] = useState("");

  const filteredTrips = trips.filter((t) => {
    const type = t.tripType?.toLowerCase() || t.category?.toLowerCase() || "";
    const isInternational =
      type.includes("international") ||
      t.location?.toLowerCase().includes("vietnam") ||
      t.location?.toLowerCase().includes("thailand") ||
      t.location?.toLowerCase().includes("dubai") ||
      t.location?.toLowerCase().includes("bali");
    const isMatchedType =
      tripTypeFilter === "international" ? isInternational : !isInternational;

    const isMatchedSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.toLowerCase().includes(search.toLowerCase()) ||
      (t.shortName && t.shortName.toLowerCase().includes(search.toLowerCase()));
    return isMatchedType && isMatchedSearch;
  });

  return (
    <div className="flex min-h-0 min-w-0 shrink-0 flex-col border-b border-[#E8EEF4] bg-white font-sans lg:h-full lg:w-[240px] lg:overflow-hidden lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-2 border-b border-[#E8EEF4] p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[13px] font-semibold tracking-tight text-[#0B1528]">
            My trips
          </h3>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
            {filteredTrips.length} active
          </span>
        </div>

        {/* TRIP TYPE FILTER */}
        <div className="flex items-center gap-0.5 rounded-lg border border-[#E8EEF4] bg-[#F8FAFC] p-0.5">
          {(["domestic", "international"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTripTypeFilter(type)}
              className={cn(
                "h-7 min-w-0 flex-1 truncate rounded-md px-1 text-[11.5px] font-medium capitalize transition-colors",
                tripTypeFilter === type
                  ? "bg-white text-[#FF4D00] shadow-xs"
                  : "text-slate-500 hover:text-[#0B1528]",
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search trips"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-[#E8EEF4] bg-[#F8FAFC] pl-8 pr-2.5 text-[12px] font-medium text-[#0B1528] placeholder-slate-400 transition-colors focus:border-[#0B1528]/20 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            onClick={onAddTripClick}
            aria-label="New trip"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF4D00] text-white transition-colors hover:bg-[#E04400]"
            title="Add a destination trip manually"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <button
          onClick={onFeedClick}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#0B1528]/15 bg-white px-2 text-[11.5px] font-medium text-[#0B1528] transition-colors hover:border-[#0B1528] hover:bg-[#0B1528] hover:text-white"
          title="Activate an existing master trip"
        >
          <Compass className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Activate existing trip
        </button>
      </div>

      <div className="min-h-0 max-h-[320px] flex-1 space-y-1.5 overflow-y-auto p-3 lg:max-h-none">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E8EEF4] border-t-[#FF4D00]" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <p className="py-6 text-center text-[12px] font-medium text-slate-500">
            No matching trips.
          </p>
        ) : (
          filteredTrips.map((trip) => {
            const isActive = trip.id === activeTripId;
            const score = trip.travelDeskWorkspace?.readinessScore || 0;

            return (
              <div
                key={trip.id}
                onClick={() =>
                  setSearchParams({ tripId: trip.id, tab: currentTab })
                }
                className={cn(
                  "cursor-pointer rounded-lg border px-2 py-1.5 transition-colors",
                  isActive
                    ? "border-[#0B1528]/15 bg-[#F8FAFC]"
                    : "border-transparent hover:bg-[#F8FAFC]",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[#E8EEF4] bg-[#F8FAFC]">
                    {trip.heroImage ? (
                      <img
                        src={trip.heroImage}
                        className="h-full w-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Compass className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4
                        className={cn(
                          "min-w-0 flex-1 truncate text-[12px] leading-tight text-[#0B1528]",
                          isActive ? "font-semibold" : "font-medium",
                        )}
                        title={trip.shortName || trip.title}
                      >
                        {trip.shortName || trip.title}
                      </h4>
                      {score < 50 && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                      )}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1">
                      <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-500">
                        {trip.code || trip.id}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium tabular-nums",
                          score >= 80
                            ? "text-green-600"
                            : score >= 50
                              ? "text-[#FF4D00]"
                              : "text-red-600",
                        )}
                      >
                        {score}%
                      </span>
                    </div>
                  </div>

                  {isActive && (
                    <span
                      aria-hidden
                      className="h-8 w-[3px] shrink-0 rounded-full bg-[#FF4D00]"
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-[#E8EEF4] px-3 py-2.5">
        <Link
          to="/admin/trips"
          className="inline-flex items-center gap-0.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-[#FF4D00]"
        >
          View all trips <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};

