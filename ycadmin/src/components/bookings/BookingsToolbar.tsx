import {
  Search,
  RotateCw,
  Filter,
  FileDown,
  Link2,
  HelpCircle,
  Wallet,
  Ticket,
  ShieldAlert,
  Compass,
  AlertCircle,
  CheckCircle2,
  LayoutList,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type BookingQueueId =
  | "all"
  | "needs_attention"
  | "payment_pending"
  | "ticket_pending"
  | "ops_pending"
  | "today_departure"
  | "refund_approval"
  | "completed_bookings";

interface BookingsToolbarProps {
  searchInput: string;
  setSearchInput: (val: string) => void;
  quickFilter: string;
  setQuickFilter: (val: string) => void;
  showSidebar: boolean;
  setShowSidebar: (val: boolean) => void;
  fetchAll: () => void;
  handleExportCSV: () => void;
  setShowTrips: (val: boolean) => void;
  counts?: Partial<Record<BookingQueueId, number>>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const CHIPS: {
  label: string;
  value: BookingQueueId;
  icon: typeof LayoutList;
}[] = [
  { label: "All", value: "all", icon: LayoutList },
  { label: "Attention", value: "needs_attention", icon: HelpCircle },
  { label: "Payment due", value: "payment_pending", icon: Wallet },
  { label: "Tickets", value: "ticket_pending", icon: Ticket },
  { label: "Operations", value: "ops_pending", icon: ShieldAlert },
  { label: "Today", value: "today_departure", icon: Compass },
  { label: "Refunds", value: "refund_approval", icon: AlertCircle },
  { label: "Completed", value: "completed_bookings", icon: CheckCircle2 },
];

export function BookingsToolbar({
  searchInput,
  setSearchInput,
  quickFilter,
  setQuickFilter,
  showSidebar,
  setShowSidebar,
  fetchAll,
  handleExportCSV,
  setShowTrips,
  counts = {},
  hasActiveFilters = false,
  onClearFilters,
}: BookingsToolbarProps) {
  return (
    <div className="flex flex-col shrink-0 border-b border-[#E8EEF4]">
      <div className="admin-toolbar-row items-center gap-3 px-4 md:px-5 h-12">
        <div className="relative flex-1 max-w-sm min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
          <Input
            type="text"
            className="w-full h-8 pl-8 pr-3 bg-[#F8FAFC] border-[#E8EEF4] rounded-md text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/30"
            placeholder="Search booking ID, guest, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-9 min-w-[44px] px-2.5 text-[11px] font-semibold text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded-md touch-manipulation"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-[#0B1528]"
            onClick={fetchAll}
            title="Refresh"
            aria-label="Refresh bookings"
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={cn(
              "flex h-9 w-9 touch-manipulation items-center justify-center rounded-md md:hidden",
              showSidebar
                ? "text-[#FF4D00] bg-[#FF4D00]/5"
                : "text-slate-500 hover:text-[#0B1528] hover:bg-slate-50",
            )}
            onClick={() => setShowSidebar(!showSidebar)}
            title="Filters"
            aria-label="Toggle filters"
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={cn(
              "hidden md:flex h-8 w-8 rounded-md items-center justify-center",
              showSidebar
                ? "text-[#FF4D00] bg-[#FF4D00]/5"
                : "text-slate-500 hover:text-[#0B1528] hover:bg-slate-50",
            )}
            onClick={() => setShowSidebar(!showSidebar)}
            title="Filters"
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-[#0B1528] md:h-8 md:w-8"
            onClick={handleExportCSV}
            title="Export CSV"
            aria-label="Export CSV"
          >
            <FileDown className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-[#0B1528] sm:hidden"
            onClick={() => setShowTrips(true)}
            title="Trip Manager"
            aria-label="Trip Manager"
          >
            <Link2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="hidden h-8 px-2.5 rounded-md text-[12px] font-semibold text-slate-600 hover:text-[#0B1528] hover:bg-slate-50 sm:flex items-center gap-1.5 touch-manipulation"
            onClick={() => setShowTrips(true)}
            title="Trip Manager"
          >
            <Link2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            Trips
          </button>
        </div>
      </div>

      <div className="flex items-end gap-0 px-2 md:px-4 overflow-x-auto no-scrollbar">
        {CHIPS.map((chip) => {
          const isActive = quickFilter === chip.value;
          const count = counts[chip.value];
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setQuickFilter(isActive && chip.value !== "all" ? "all" : chip.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-colors shrink-0",
                isActive
                  ? "border-[#FF4D00] text-[#0B1528] font-semibold"
                  : "border-transparent text-slate-500 hover:text-[#0B1528] font-medium",
              )}
            >
              <chip.icon
                className={cn("w-3.5 h-3.5", isActive ? "text-[#FF4D00]" : "text-slate-400")}
                strokeWidth={1.75}
              />
              <span>{chip.label}</span>
              {typeof count === "number" && (
                <span
                  className={cn(
                    "min-w-[1.25rem] text-center text-[10px] tabular-nums",
                    isActive ? "text-[#FF4D00] font-semibold" : "text-slate-400",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
