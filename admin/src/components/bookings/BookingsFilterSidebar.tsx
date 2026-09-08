import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookingsFilterSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  filterTrip: string;
  setFilterTrip: (v: string) => void;
  trips: Array<{
    id: string;
    tripName?: string;
    tripCode?: string;
    title?: string;
    name?: string;
    code?: string;
  }>;
  bookingStart: string;
  setBookingStart: (v: string) => void;
  bookingEnd: string;
  setBookingEnd: (v: string) => void;
  depStart: string;
  setDepStart: (v: string) => void;
  depEnd: string;
  setDepEnd: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (v: string) => void;
  balanceOnly: boolean;
  setBalanceOnly: (v: boolean) => void;
  filterSalesAdmin: string;
  setFilterSalesAdmin: (v: string) => void;
  salesOptions: string[];
  onApply: () => void;
  onClear: () => void;
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div className="border-b border-[#E8EEF4]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50/80"
        aria-expanded={expanded}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && <div className="space-y-2 px-4 pb-3.5">{children}</div>}
    </div>
  );
}

const fieldClass =
  "h-8 w-full rounded-md border border-[#E8EEF4] bg-white px-2.5 text-[12px] text-[#0B1528] shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/30";

export function BookingsFilterSidebar({
  open,
  onOpenChange,
  searchInput,
  setSearchInput,
  filterTrip,
  setFilterTrip,
  trips,
  bookingStart,
  setBookingStart,
  bookingEnd,
  setBookingEnd,
  depStart,
  setDepStart,
  depEnd,
  setDepEnd,
  statusFilter,
  setStatusFilter,
  paymentStatusFilter,
  setPaymentStatusFilter,
  balanceOnly,
  setBalanceOnly,
  filterSalesAdmin,
  setFilterSalesAdmin,
  salesOptions,
  onApply,
  onClear,
}: BookingsFilterSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => onOpenChange(false)}
      />

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-[100dvh] w-[min(100vw,320px)] flex-col border-r border-[#E8EEF4] bg-white shadow-xl transition-transform duration-200 md:static md:z-0 md:h-auto md:w-[280px] md:shrink-0 md:self-stretch md:overflow-hidden md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-[48px]",
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E8EEF4] px-2 py-2 md:px-3 md:py-3">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className={cn(
              "flex min-h-9 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50",
              !open && "md:justify-center md:px-0",
            )}
            aria-expanded={open}
            aria-label={open ? "Collapse booking filters" : "Open booking filters"}
            title={open ? "Collapse filters" : "Open filters"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                open ? "rotate-0" : "-rotate-90",
              )}
            />
            <h3
              className={cn(
                "text-[13px] font-bold text-[#0B1528]",
                !open && "md:hidden",
              )}
            >
              Booking Filters
            </h3>
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700",
              !open && "hidden",
              "md:hidden",
            )}
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <>
            <div className="flex-1 overflow-y-auto">
              <Section title="Search for a booking" defaultOpen>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Booking ID, name, phone, email…"
                    className={cn(fieldClass, "pl-8")}
                  />
                </div>
                <p className="text-[10px] font-medium text-slate-400">
                  Search by booking ID, guest name, phone, or email.
                </p>
              </Section>

              <Section title="Quick filters">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#0B1528]">
                  <input
                    type="checkbox"
                    checked={balanceOnly}
                    onChange={(e) => setBalanceOnly(e.target.checked)}
                    className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00]"
                  />
                  Balance payment due
                </label>
              </Section>

              <Section title="Trips">
                <select
                  value={filterTrip}
                  onChange={(e) => setFilterTrip(e.target.value)}
                  className={fieldClass}
                >
                  <option value="all">All trips</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tripCode ||
                        t.code ||
                        t.tripName ||
                        t.title ||
                        t.name ||
                        t.id}
                    </option>
                  ))}
                </select>
              </Section>

              <Section title="Booking dates">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">
                      From
                    </label>
                    <Input
                      type="date"
                      value={bookingStart}
                      onChange={(e) => setBookingStart(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">
                      To
                    </label>
                    <Input
                      type="date"
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Departure dates">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">
                      From
                    </label>
                    <Input
                      type="date"
                      value={depStart}
                      onChange={(e) => setDepStart(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-bold uppercase text-slate-400">
                      To
                    </label>
                    <Input
                      type="date"
                      value={depEnd}
                      onChange={(e) => setDepEnd(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Booking status">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={fieldClass}
                >
                  <option value="all">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="draft">Draft</option>
                </select>
              </Section>

              <Section title="Payment type">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className={fieldClass}
                >
                  <option value="all">All payments</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </Section>

              <Section title="Search by agent">
                <select
                  value={filterSalesAdmin}
                  onChange={(e) => setFilterSalesAdmin(e.target.value)}
                  className={fieldClass}
                >
                  <option value="all">All agents</option>
                  {salesOptions.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </Section>
            </div>

            <div className="flex gap-2 border-t border-[#E8EEF4] bg-[#F8FAFC] p-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 text-[12px] font-bold"
                onClick={onClear}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 bg-[#FF4D00] text-[12px] font-bold text-white hover:bg-[#E84712]"
                onClick={() => {
                  onApply();
                  if (
                    typeof window !== "undefined" &&
                    window.matchMedia("(max-width: 767px)").matches
                  ) {
                    onOpenChange(false);
                  }
                }}
              >
                Filter
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
