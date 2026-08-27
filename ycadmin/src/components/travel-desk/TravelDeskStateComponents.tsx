import React from "react";
import { Compass, Search, AlertTriangle } from "lucide-react";

export const TravelDeskLoadingState = ({
  message = "Loading Travel Desk",
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 font-sans">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E8EEF4] border-t-[#FF4D00]" />
    <p className="text-[12px] font-medium text-slate-500">{message}</p>
  </div>
);

export const TravelDeskErrorState = ({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center p-10 text-center font-sans">
    <AlertTriangle className="mb-3 h-7 w-7 text-red-600" />
    <h2 className="text-[14px] font-semibold text-[#0B1528]">
      Could not load trip data
    </h2>
    <p className="mt-1 max-w-md text-[12px] font-medium text-slate-500">
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 flex h-8 items-center rounded-md border border-[#0B1528]/15 bg-white px-3 text-[12px] font-medium text-[#0B1528] transition-colors hover:border-[#0B1528] hover:bg-[#0B1528] hover:text-white"
      >
        Try again
      </button>
    )}
  </div>
);

export const TravelDeskEmptyState = ({
  title = "No trips found",
  description = "We couldn't find any trips matching your criteria.",
  icon: Icon = Search,
  onClearFilters,
}: {
  title?: string;
  description?: string;
  icon?: any;
  onClearFilters?: () => void;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center p-10 text-center font-sans">
    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#E8EEF4] bg-white">
      <Icon className="h-4 w-4 text-slate-400" />
    </span>
    <h3 className="text-[14px] font-semibold text-[#0B1528]">{title}</h3>
    <p className="mt-1 max-w-sm text-[12px] font-medium text-slate-500">
      {description}
    </p>
    {onClearFilters && (
      <button
        onClick={onClearFilters}
        className="mt-4 flex h-8 items-center rounded-md border border-[#0B1528]/15 bg-white px-3 text-[12px] font-medium text-[#0B1528] transition-colors hover:border-[#0B1528] hover:bg-[#0B1528] hover:text-white"
      >
        Clear filters
      </button>
    )}
  </div>
);

export const TravelDeskActivationState = ({
  tripTitle,
  onActivate,
  isActivating,
}: {
  tripTitle: string;
  onActivate: () => void;
  isActivating: boolean;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center p-10 text-center font-sans">
    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#FFE1D1] bg-[#FFF3EC]">
      <Compass className="h-4 w-4 text-[#FF4D00]" />
    </span>
    <h3 className="text-[14px] font-semibold text-[#0B1528]">
      Activate the workspace
    </h3>
    <p className="mt-1 max-w-md text-[12px] font-medium leading-relaxed text-slate-500">
      No travel desk workspace exists for{" "}
      <span className="font-semibold text-[#0B1528]">{tripTitle}</span> yet.
      Activate it to track departures, itineraries, vendors and ticketing.
    </p>
    <button
      onClick={onActivate}
      disabled={isActivating}
      className="mt-4 flex h-9 items-center rounded-md bg-[#FF4D00] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#E04400] disabled:opacity-50"
    >
      {isActivating ? "Activating…" : "Activate workspace"}
    </button>
  </div>
);

