import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export const TRAVEL_DESK_TABS = [
  { id: "knowledge", label: "Knowledge hub" },
  { id: "departures", label: "Departures" },
  { id: "vendors", label: "Vendors" },
  { id: "itinerary", label: "Itinerary" },
  { id: "documents", label: "Documents" },
  { id: "sops", label: "SOPs" },
  { id: "gallery", label: "Gallery" },
  { id: "activity", label: "Activity" },
];

interface TravelDeskTabsProps {
  tripId: string;
}

export const TravelDeskTabs: React.FC<TravelDeskTabsProps> = ({ tripId }) => {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "knowledge";

  return (
    <div className="min-w-0 shrink-0 border-b border-[#E8EEF4] bg-white px-3 font-sans">
      <div className="flex min-w-0 items-center gap-4 overflow-x-auto no-scrollbar">
        {TRAVEL_DESK_TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={`/admin/travel-desk?tripId=${tripId}&tab=${tab.id}`}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 py-2.5 text-[12.5px] transition-colors",
                isActive
                  ? "border-[#FF4D00] font-semibold text-[#FF4D00]"
                  : "border-transparent font-medium text-slate-500 hover:text-[#0B1528]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
