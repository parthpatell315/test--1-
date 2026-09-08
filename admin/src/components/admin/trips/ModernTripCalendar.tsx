import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  X,
  Check,
  Users,
  DollarSign,
  UserCheck,
  Truck,
  Hotel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DepartureDateV2 } from "@/types/tripV2";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  GUARANTEED: {
    label: "Guaranteed",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  FEW_SEATS: {
    label: "Few Seats",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  AVAILABLE: {
    label: "Available",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
  },
  SOLD_OUT: {
    label: "Sold Out",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-200",
    text: "text-slate-500",
    border: "border-slate-300",
  },
};

interface ModernTripCalendarProps {
  departures?: DepartureDateV2[];
  basePrice?: number;
  onChange: (updated: DepartureDateV2[]) => void;
}

export const ModernTripCalendar: React.FC<ModernTripCalendarProps> = ({
  departures = [],
  basePrice = 12999,
  onChange,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth(),
  ); // 0-indexed
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selection state for Bulk Editing
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  // Drawer state for single departure edit
  const [drawerDeparture, setDrawerDeparture] =
    useState<DepartureDateV2 | null>(null);

  // Bulk Edit Form state
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkOfferPrice, setBulkOfferPrice] = useState<string>("");
  const [bulkCapacity, setBulkCapacity] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("GUARANTEED");
  const [bulkGuide, setBulkGuide] = useState<string>("");
  const [bulkVehicle, setBulkVehicle] = useState<string>("");

  // Filter departures by current month/year and status filter
  const monthDepartures = useMemo(() => {
    return departures.filter((dep) => {
      if (!dep.date) return false;
      const d = new Date(dep.date);
      if (isNaN(d.getTime())) return false;
      const matchMonth =
        d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      if (!matchMonth) return false;

      if (statusFilter !== "ALL" && dep.status !== statusFilter) return false;
      return true;
    });
  }, [departures, currentYear, currentMonth, statusFilter]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const handleToggleSelectDate = (dateStr: string) => {
    const updated = new Set(selectedDates);
    if (updated.has(dateStr)) updated.delete(dateStr);
    else updated.add(dateStr);
    setSelectedDates(updated);
  };

  const handleSelectAllMonth = () => {
    const monthDateStrs = monthDepartures.map((d) => d.date);
    if (selectedDates.size === monthDateStrs.length) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(monthDateStrs));
    }
  };

  const handleAddDepartureDate = () => {
    const newDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-15`;
    const newDep: DepartureDateV2 = {
      id: `dep-${Date.now()}`,
      date: newDateStr,
      status: "AVAILABLE",
      price: basePrice,
      offerPrice: basePrice,
      capacity: 30,
      bookedSeats: 0,
      isPublished: true,
    };
    const updated = [...departures, newDep];
    onChange(updated);
    setDrawerDeparture(newDep);
    toast.success("New departure date added");
  };

  const handleSaveDrawerDeparture = () => {
    if (!drawerDeparture) return;
    const exists = departures.some(
      (d) => d.date === drawerDeparture.date || d.id === drawerDeparture.id,
    );
    let updated: DepartureDateV2[];
    if (exists) {
      updated = departures.map((d) =>
        d.date === drawerDeparture.date || d.id === drawerDeparture.id
          ? drawerDeparture
          : d,
      );
    } else {
      updated = [...departures, drawerDeparture];
    }
    onChange(updated);
    setDrawerDeparture(null);
    toast.success("Departure details saved");
  };

  const handleApplyBulkUpdate = () => {
    if (selectedDates.size === 0) {
      toast.error("No dates selected");
      return;
    }

    const updated = departures.map((dep) => {
      if (selectedDates.has(dep.date)) {
        return {
          ...dep,
          ...(bulkPrice ? { price: parseFloat(bulkPrice) } : {}),
          ...(bulkOfferPrice ? { offerPrice: parseFloat(bulkOfferPrice) } : {}),
          ...(bulkCapacity ? { capacity: parseInt(bulkCapacity, 10) } : {}),
          ...(bulkStatus ? { status: bulkStatus as any } : {}),
          ...(bulkGuide ? { guideName: bulkGuide } : {}),
          ...(bulkVehicle ? { vehicleName: bulkVehicle } : {}),
        };
      }
      return dep;
    });

    onChange(updated);
    setShowBulkModal(false);
    setSelectedDates(new Set());
    setIsBulkMode(false);
    toast.success(`Updated ${selectedDates.size} departure dates`);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* ─── CALENDAR HEADER & CONTROLS ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-bold text-slate-800 text-sm w-36 text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-8 text-[11px] font-bold"
            >
              Today
            </Button>

            {/* Quick Month & Year Jump */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
              className="h-8 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={mName} value={idx}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
              className="h-8 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isBulkMode ? "default" : "outline"}
              onClick={() => setIsBulkMode(!isBulkMode)}
              className={cn(
                "h-8 text-[11px] font-bold gap-1",
                isBulkMode && "bg-blue-600 text-white",
              )}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {isBulkMode
                ? `Bulk Select (${selectedDates.size})`
                : "Bulk Select"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleAddDepartureDate}
              className="h-8 text-[11px] font-bold bg-green-600 hover:bg-green-600 text-white gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Departure
            </Button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {[
              "ALL",
              "GUARANTEED",
              "FEW_SEATS",
              "AVAILABLE",
              "SOLD_OUT",
              "COMPLETED",
              "CANCELLED",
            ].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all border",
                  statusFilter === st
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                )}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {isBulkMode && selectedDates.size > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowBulkModal(true)}
              className="h-7 text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-500 gap-1 animate-pulse"
            >
              Update Selected ({selectedDates.size})
            </Button>
          )}
        </div>
      </div>

      {/* ─── MODERN COMPACT DEPARTURE CARDS GRID ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-2">
          <span>
            Active Departures for {MONTH_NAMES[currentMonth]} (
            {monthDepartures.length})
          </span>
          {isBulkMode && (
            <button
              type="button"
              onClick={handleSelectAllMonth}
              className="text-blue-600 hover:underline"
            >
              {selectedDates.size === monthDepartures.length
                ? "Deselect Month"
                : "Select All Month"}
            </button>
          )}
        </div>

        {monthDepartures.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl bg-slate-50/50 text-slate-400 italic">
            No departure dates scheduled for {MONTH_NAMES[currentMonth]}{" "}
            {currentYear}. Click "+ Add Departure" above to create dates.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {monthDepartures.map((dep) => {
              const dateObj = new Date(dep.date);
              const dayNum = dateObj.getDate();
              const dayStr = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
              });
              const cfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.AVAILABLE;
              const isSelected = selectedDates.has(dep.date);

              return (
                <div
                  key={dep.id || dep.date}
                  onClick={() => {
                    if (isBulkMode) handleToggleSelectDate(dep.date);
                    else setDrawerDeparture(dep);
                  }}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 relative group",
                    cfg.bg,
                    cfg.border,
                    isSelected &&
                      "ring-2 ring-blue-600 border-blue-600 bg-blue-50/80 shadow-xs",
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {isBulkMode && (
                        <div className="text-blue-600">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <span className="font-black text-sm text-slate-900">
                          {dayNum}{" "}
                          {MONTH_NAMES[currentMonth].slice(0, 3).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {dayStr} {currentYear}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        cfg.bg,
                        cfg.text,
                        cfg.border,
                      )}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Pricing & Capacity */}
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 font-mono">
                    <span className="font-bold text-slate-800">
                      ₹
                      {(
                        dep.offerPrice ||
                        dep.price ||
                        basePrice
                      ).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans font-semibold">
                      {dep.capacity || 30} Seats ({dep.bookedSeats || 0} Booked)
                    </span>
                  </div>

                  {/* Extra Metadata tags */}
                  {(dep.guideName || dep.vehicleName) && (
                    <div className="flex flex-wrap gap-1 text-[9px] text-slate-500 pt-0.5">
                      {dep.guideName && (
                        <span className="bg-white/80 border px-1.5 py-0.2 rounded font-medium">
                          👤 {dep.guideName}
                        </span>
                      )}
                      {dep.vehicleName && (
                        <span className="bg-white/80 border px-1.5 py-0.2 rounded font-medium">
                          🚍 {dep.vehicleName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SINGLE DEPARTURE EDIT DRAWER ─── */}
      <Dialog
        open={!!drawerDeparture}
        onOpenChange={() => setDrawerDeparture(null)}
      >
        <DialogContent className="max-w-md p-5 space-y-4">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <span>Edit Departure Date</span>
              <span className="text-xs font-mono font-normal text-slate-500">
                {drawerDeparture?.date}
              </span>
            </DialogTitle>
          </DialogHeader>

          {drawerDeparture && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Departure Date
                  </label>
                  <Input
                    type="date"
                    value={drawerDeparture.date}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        date: e.target.value,
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Departure Status
                  </label>
                  <select
                    value={drawerDeparture.status}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        status: e.target.value as any,
                      })
                    }
                    className="h-8 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 w-full"
                  >
                    <option value="GUARANTEED">Guaranteed</option>
                    <option value="FEW_SEATS">Few Seats</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="SOLD_OUT">Sold Out</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Standard Price (₹)
                  </label>
                  <Input
                    type="number"
                    value={drawerDeparture.price || ""}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Offer Price (₹)
                  </label>
                  <Input
                    type="number"
                    value={drawerDeparture.offerPrice || ""}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        offerPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono font-bold text-green-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Total Capacity
                  </label>
                  <Input
                    type="number"
                    value={drawerDeparture.capacity || 30}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        capacity: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Booked Seats
                  </label>
                  <Input
                    type="number"
                    value={drawerDeparture.bookedSeats || 0}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        bookedSeats: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Assigned Guide
                  </label>
                  <Input
                    value={drawerDeparture.guideName || ""}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        guideName: e.target.value,
                      })
                    }
                    placeholder="e.g. Suresh Kumar"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Assigned Vehicle
                  </label>
                  <Input
                    value={drawerDeparture.vehicleName || ""}
                    onChange={(e) =>
                      setDrawerDeparture({
                        ...drawerDeparture,
                        vehicleName: e.target.value,
                      })
                    }
                    placeholder="e.g. Tempo Traveller (13 Seat)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerDeparture(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveDrawerDeparture}
                  className="h-8 text-xs bg-slate-900 text-white font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── BULK EDIT MODAL (REQUIREMENT 6) ─── */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-md p-5 space-y-4">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-sm font-bold text-blue-600">
              Bulk Update {selectedDates.size} Departure Dates
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">
                  Set Status
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="h-8 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 w-full"
                >
                  <option value="GUARANTEED">Guaranteed</option>
                  <option value="FEW_SEATS">Few Seats</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="SOLD_OUT">Sold Out</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">
                  Set Capacity
                </label>
                <Input
                  type="number"
                  value={bulkCapacity}
                  onChange={(e) => setBulkCapacity(e.target.value)}
                  placeholder="e.g. 30"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">
                  Set Standard Price (₹)
                </label>
                <Input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="e.g. 12999"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">
                  Set Offer Price (₹)
                </label>
                <Input
                  type="number"
                  value={bulkOfferPrice}
                  onChange={(e) => setBulkOfferPrice(e.target.value)}
                  placeholder="e.g. 11999"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyBulkUpdate}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Apply to {selectedDates.size} Dates
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernTripCalendar;

