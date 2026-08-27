/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AccommodationWorkspace — YouthCamping Admin
 *
 * Production accommodation control screen for a departure.
 *
 * Architecture:
 *   - Passenger Sharing Config  = trip-level (Double/Triple/Quad groups)
 *   - Physical Hotel Rooms       = OpsHotelBooking.numberOfRooms
 *   - Cost per Pax               = totalAmount ÷ totalPax  (for full stay)
 *
 * All values come from live database data via props.
 * No hardcoded rates, names, fallbacks, or mock data.
 */

import React, { useMemo, useState } from "react";
import {
  MapPin,
  Hotel,
  Bed,
  ChevronRight,
  X,
  Pencil,
  Info,
  Users,
  Calendar,
  Hash,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  buildPhysicalRoomAllocation,
  deriveRoomCountsFromAllocations,
  calculateAccommodationCost,
  calculateHotelStayTotalFromBooking,
  derivePassengerSharing,
  derivePassengerSharingFromBookings,
  findHotelForDay,
  formatINR,
  getPrimaryRateFromBooking,
  normaliseDate,
  normalisePricingMode,
  resolveCityForItineraryDay,
  normalizeDestinationName,
  suggestRoomAllocation,
} from "@/utils/accommodationCalculator";
import { toast } from "react-hot-toast";
import { opsService } from "@/services/ops.service";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface AccommodationWorkspaceProps {
  /** Itinerary rows from tripDetails (computedItinerary) */
  computedItinerary: any[];
  /** Raw OpsHotelBooking records from GET /ops/hotels/:tripId */
  opsHotelBookings: any[];
  /** All departure passengers (allPassengers) */
  allPassengers: any[];
  /** Room-level passenger assignments: { passengerName: { room, vehicle, seat } } */
  passengerAllocations: Record<string, { room: string; vehicle: string; seat: string }>;
  departureDateStr: string;
  tripId: string;
  /** Opens the hotel assignment wizard or edit drawer */
  onEditHotel: (hotelRow: any, dayInfo?: any) => void;
  /** Triggers parent to refetch data after operations */
  onRefresh?: () => void;
}

// ─────────────────────────────────────────────
// Derived Row Type
// ─────────────────────────────────────────────

interface AccommodationRow {
  key: string;
  dayLabel: string;
  date: string;       // display format ("05 Oct 2026") for UI rendering
  dateStr: string;    // YYYY-MM-DD for programmatic use
  destination: string;
  hasStay: boolean;
  nightsText: string;
  nights: number;
  hotelName: string;
  physicalRooms: number;
  costPerPaxPerNight: number;
  costPerPaxStay: number;
  totalAmount: number;
  status: "configured" | "pending" | "no-stay";
  booking: any | null; // raw OpsHotelBooking
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function AccommodationWorkspace({
  computedItinerary,
  opsHotelBookings,
  allPassengers,
  passengerAllocations,
  departureDateStr,
  tripId,
  onEditHotel,
  onRefresh,
}: AccommodationWorkspaceProps) {
function formatDateToYMD(dateVal: any, fallbackDeparture?: string, dayOffset = 0): string {
  if (dateVal) {
    if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      return dateVal.trim();
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (fallbackDeparture) {
    const parsed = new Date(fallbackDeparture);
    if (!isNaN(parsed.getTime())) {
      if (dayOffset > 0) parsed.setDate(parsed.getDate() + dayOffset);
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return "";
}

  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [stayOverrides, setStayOverrides] = useState<Record<string, boolean>>({});
  const [isTogglingStay, setIsTogglingStay] = useState(false);

  const handleToggleStay = async (row: AccommodationRow, explicitValue?: boolean) => {
    if (isTogglingStay) return;
    setIsTogglingStay(true);

    const current = stayOverrides[row.key] !== undefined ? stayOverrides[row.key] : row.hasStay;
    const next = explicitValue !== undefined ? explicitValue : !current;

    // Normalise check-in date to strict YYYY-MM-DD
    const cinStr = formatDateToYMD(row.date, departureDateStr, 0);
    const cinDate = new Date(cinStr);
    let coutStr = "";
    if (!isNaN(cinDate.getTime())) {
      const coutDate = new Date(cinDate);
      coutDate.setDate(coutDate.getDate() + 1);
      const y = coutDate.getFullYear();
      const m = String(coutDate.getMonth() + 1).padStart(2, "0");
      const d = String(coutDate.getDate()).padStart(2, "0");
      coutStr = `${y}-${m}-${d}`;
    } else {
      coutStr = formatDateToYMD(row.date, departureDateStr, 1);
    }

    try {
      if (next === false) {
        // Explicitly saving NO STAY
        const payload = {
          hotelName: "NO_STAY",
          location: row.destination || "Enroute",
          roomType: "None",
          numberOfRooms: 1,
          totalAmount: 0,
          advancePaid: 0,
          confirmed: "CONFIRMED",
          pricingMethod: "per-person",
          doubleRoomsCount: 0,
          tripleRoomsCount: 0,
          quadRoomsCount: 0,
          extraPersonsCount: 0,
          nightsCount: 1,
          checkIn: cinStr,
          checkOut: coutStr,
          vendorId: null,
          notes: "Explicit No Stay",
        };
        await opsService.saveHotelBookings(tripId, departureDateStr, [payload]);
        setStayOverrides((prev) => ({ ...prev, [row.key]: false }));
        toast.success("Saved No Stay for " + row.date);
      } else {
        // Removing explicit NO STAY from database for this date
        const cinNorm = normaliseDate(cinStr) || normaliseDate(row.date);
        const existingNoStay = (opsHotelBookings || []).find((b: any) => {
          const name = String(b?.hotelName || "").trim().toUpperCase();
          return (
            (name === "NO_STAY" || name === "NO STAY") &&
            normaliseDate(b.checkIn) === cinNorm
          );
        });

        if (existingNoStay?.id) {
          await opsService.deleteHotelBooking(existingNoStay.id);
          toast.success("Enabled Stay for " + row.date);
        } else if (
          row.booking?.id &&
          (row.booking.hotelName === "NO_STAY" ||
            row.booking.hotelName === "NO STAY")
        ) {
          await opsService.deleteHotelBooking(row.booking.id);
          toast.success("Enabled Stay for " + row.date);
        }
        setStayOverrides((prev) => ({ ...prev, [row.key]: true }));
      }
      if (next === false && onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to toggle stay status:", err);
      toast.error("Failed to update stay status");
    } finally {
      setIsTogglingStay(false);
    }
  };

  const totalPax = allPassengers.length;

  // ── Derive passenger sharing from actual room allocations ──
  const passengerSharing = useMemo(() => {
    const hasAllocations = Object.values(passengerAllocations).some(
      (a) => a.room && a.room !== "—" && a.room !== "Unassigned"
    );
    if (hasAllocations) {
      return derivePassengerSharing(passengerAllocations, allPassengers);
    }
    // Fallback: derive from booking passenger data
    return derivePassengerSharingFromBookings(allPassengers);
  }, [passengerAllocations, allPassengers]);

  // ── Physical room allocation (from saved room assignments) ──
  const physicalRoomAllocation = useMemo(
    () => buildPhysicalRoomAllocation(passengerAllocations, allPassengers),
    [passengerAllocations, allPassengers]
  );

  // ── Build accommodation rows (one per itinerary day) ──
  const rows = useMemo<AccommodationRow[]>(() => {
    return computedItinerary.map((day: any, idx: number) => {
      // Use YYYY-MM-DD dateStr for all programmatic matching; display date only for UI
      const dayDateStr = day.dateStr || ""; // YYYY-MM-DD (reliable)
      const dayDate = dayDateStr || day.date || ""; // fallback to display format
      const rowKey = dayDateStr || day.date || day.day || `day-${idx}`;

      // Extract stay or destination city
      const parsedStay =
        day.stay && day.stay !== "—"
          ? day.stay
          : day.destination && day.destination !== "—"
            ? day.destination
            : day.city || "";

      const cityLocation = resolveCityForItineraryDay(day);

      // Explicit NO_STAY saved for this check-in date
      const noStayBooking = (opsHotelBookings || []).find((b: any) => {
        const name = String(b?.hotelName || "").trim().toUpperCase();
        if (name !== "NO_STAY" && name !== "NO STAY") return false;
        return normaliseDate(b.checkIn) === dayDateStr;
      });

      // 1. Try finding a saved hotel booking for this day date (check-in / multi-night)
      const booking = noStayBooking
        ? null
        : findHotelForDay(dayDateStr, cityLocation, opsHotelBookings);

      // 2. Check default stay day status
      const isEnrouteDay =
        (day.plan || "").toLowerCase().includes("train journey") ||
        (day.sub || "").toLowerCase().includes("arrival in your city") ||
        (day.plan || "").toLowerCase().includes("your city");

      const defaultHasStay = noStayBooking
        ? false
        : !!booking ||
          (!isEnrouteDay && idx > 0 && idx < computedItinerary.length - 1) ||
          (!!parsedStay && !parsedStay.toLowerCase().includes("no stay"));

      const hasStay = stayOverrides[rowKey] !== undefined ? stayOverrides[rowKey] : defaultHasStay;

      const destination =
        (hasStay && cityLocation && cityLocation !== "—" ? cityLocation : "") ||
        booking?.location ||
        parsedStay ||
        (day.plan ? day.plan.split("/")[0].split("-")[0].trim() : "—");

      // Authoritative room count: Explicit Booking Config > Room & Vehicle Allocation tab > totalPax / 2
      const explicitBookingRooms = booking
        ? (booking.doubleRoomsCount || 0) + (booking.tripleRoomsCount || 0) + (booking.quadRoomsCount || 0)
        : 0;

      const authoritativeRooms =
        explicitBookingRooms > 0
          ? explicitBookingRooms
          : physicalRoomAllocation.totalRooms > 0
            ? physicalRoomAllocation.totalRooms
            : booking?.numberOfRooms && booking.numberOfRooms > 0
              ? booking.numberOfRooms
              : totalPax > 0
                ? Math.ceil(totalPax / 2)
                : 1;

      // Always derive physical room count regardless of booking status
      let physicalRooms = authoritativeRooms;
      let costPerPaxPerNight = 0;
      let costPerPaxStay = 0;
      let totalAmount = 0;
      let nights = 1;
      let status: AccommodationRow["status"] = "no-stay";

      if (hasStay && booking) {
        // Each itinerary row corresponds to exactly 1 night
        nights = 1;
        const derivedRooms = deriveRoomCountsFromAllocations(passengerAllocations, allPassengers);
        const hasExplicitBookingRooms = explicitBookingRooms > 0;

        const dRooms = hasExplicitBookingRooms
          ? (booking.doubleRoomsCount ?? 0)
          : (derivedRooms.totalRooms > 0 ? derivedRooms.doubleRooms : authoritativeRooms);
        const tRooms = hasExplicitBookingRooms
          ? (booking.tripleRoomsCount ?? 0)
          : (derivedRooms.totalRooms > 0 ? derivedRooms.tripleRooms : 0);
        const qRooms = hasExplicitBookingRooms
          ? (booking.quadRoomsCount ?? 0)
          : (derivedRooms.totalRooms > 0 ? derivedRooms.quadRooms : 0);
        const exPax = hasExplicitBookingRooms
          ? (booking.extraPersonsCount ?? 0)
          : (derivedRooms.totalRooms > 0 ? derivedRooms.extraPersons : 0);

        const dRate = Number(booking.doubleRate) || 0;
        const tRate = Number(booking.tripleRate) || 0;
        const qRate = Number(booking.quadRate) || 0;
        const exRate = Number(booking.extraBedRate) || 0;

        // Prefer live calc from rates×rooms so a stale/wrong totalAmount
        // (e.g. backend previously ignored per-person occupancy) cannot
        // understate the hotel price in the table/details.
        const stayTotal = calculateHotelStayTotalFromBooking({
          pricingMethod: booking.pricingMethod || "per-person",
          doubleRoomsCount: dRooms,
          tripleRoomsCount: tRooms,
          quadRoomsCount: qRooms,
          extraPersonsCount: exPax,
          nightsCount: booking.nightsCount || 1,
          doubleRate: dRate,
          tripleRate: tRate,
          quadRate: qRate,
          extraBedRate: exRate,
          totalAmount: booking.totalAmount,
        });

        const nightsForStay = Math.max(1, Number(booking.nightsCount) || 1);
        totalAmount = stayTotal / nightsForStay;
        status = "configured";

        const effectivePaxCount = totalPax > 0 ? totalPax : Math.max(1, authoritativeRooms * 2);
        costPerPaxStay = effectivePaxCount > 0 ? totalAmount / effectivePaxCount : 0;
        costPerPaxPerNight = costPerPaxStay;

      } else if (hasStay) {
        status = "pending";
      } else {
        status = "no-stay";
      }

      const isCheckInDay =
        booking &&
        normaliseDate(booking.checkIn) === dayDateStr;
      const bookingNights = booking?.nightsCount || 1;
      const nightsText =
        !hasStay
          ? "No Stay"
          : bookingNights > 1
            ? isCheckInDay
              ? `${bookingNights} Nights`
              : `Cont. (${bookingNights}N)`
            : "1 Night";

      return {
        key: rowKey,
        dayLabel: day.day || `Day ${idx + 1}`,
        date: day.date || "",   // display format for UI rendering ("05 Oct 2026")
        dateStr: dayDateStr,     // YYYY-MM-DD for wizard & programmatic use
        destination,
        hasStay,
        nightsText,
        nights,
        hotelName: hasStay ? (booking?.hotelName || "— Pending Assignment —") : "—",
        // Room allocation is only authoritative once a hotel booking is saved.
        // Unassigned stay days must remain visibly pending, not look configured
        // because a trip-level room plan happens to exist.
        physicalRooms: hasStay && booking ? physicalRooms : 0,
        costPerPaxPerNight: hasStay ? costPerPaxPerNight : 0,
        costPerPaxStay: hasStay ? costPerPaxStay : 0,
        totalAmount: hasStay ? totalAmount : 0,
        status,
        booking: hasStay ? booking : null,
      };
    });
  }, [computedItinerary, opsHotelBookings, physicalRoomAllocation, totalPax, stayOverrides]);

  // ── Summary bar values ──
  const summary = useMemo(() => {
    const stayNights = rows.reduce((sum, r) => sum + (r.hasStay ? r.nights : 0), 0);
    const uniqueHotels = new Set(
      rows.filter((r) => r.booking?.hotelName).map((r) => r.booking!.hotelName)
    ).size;

    const peakRooms = Math.max(0, ...rows.map((r) => (r.hasStay ? r.physicalRooms : 0)));
    const roomNights = rows.reduce((sum, r) => sum + (r.hasStay ? r.physicalRooms * r.nights : 0), 0);
    const totalDepartureCost = rows.reduce((sum, r) => sum + (r.hasStay ? r.totalAmount : 0), 0);
    const costPerPaxTrip = totalPax > 0 ? totalDepartureCost / totalPax : 0;

    return { stayNights, uniqueHotels, peakRooms, roomNights, totalDepartureCost, costPerPaxTrip };
  }, [rows, totalPax]);

  const selectedRow = selectedDayIdx !== null ? rows[selectedDayIdx] : null;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[#0B1528]">Hotels & Accommodations</h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Click a day to view hotel details, room allocation and per-pax cost
          </p>
        </div>
      </div>

      {/* ── Accommodation Summary Bar ── */}
      {summary.stayNights > 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Accommodation Summary
          </span>
          <SummaryPill icon={<Calendar className="w-3 h-3" />} label={`${summary.stayNights} Stay Night${summary.stayNights !== 1 ? "s" : ""}`} />
          <SummaryPill icon={<Hotel className="w-3 h-3" />} label={`${summary.uniqueHotels} Hotel${summary.uniqueHotels !== 1 ? "s" : ""}`} />
          {summary.peakRooms > 0 && (
            <SummaryPill
              icon={<Bed className="w-3 h-3" />}
              label={`${summary.peakRooms} Rooms / Night (${summary.roomNights} Room Nights)`}
            />
          )}
          {summary.totalDepartureCost > 0 && (
            <SummaryPill
              icon={<Users className="w-3 h-3" />}
              label={`${formatINR(summary.totalDepartureCost, 0)} Total Stay Cost (${formatINR(summary.costPerPaxTrip, 0)} / pax)`}
              highlight
            />
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-[6px] px-4 py-3 text-xs text-slate-400 font-medium">
          No accommodation configured yet for this departure.
        </div>
      )}

      {/* ── Accommodation Table (desktop) ── */}
      <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-4 py-3 w-20">Day</th>
              <th className="px-4 py-3 whitespace-nowrap">Date</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3 whitespace-nowrap">Stay</th>
              <th className="px-4 py-3">Hotel</th>
              <th className="px-4 py-3 whitespace-nowrap">Rooms</th>
              <th className="px-4 py-3 whitespace-nowrap">Total Amount</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-slate-700">
            {rows.map((row, idx) => (
              <AccommodationTableRow
                key={row.key || idx}
                row={row}
                onClick={() => setSelectedDayIdx(idx)}
                onToggleStay={(e) => {
                  e.stopPropagation();
                  handleToggleStay(row);
                }}
                onAssignClick={(e) => {
                  e.stopPropagation();
                  onEditHotel(row.booking || { id: "" }, {
                    dayNum: idx + 1,
                    dayLabel: row.dayLabel,
                    destination: row.destination,
                    dateStr: row.dateStr,
                    existingBooking: row.booking,
                  });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked cards ── */}
      <div className="md:hidden space-y-2">
        {rows.map((row, idx) => (
          <AccommodationMobileCard
            key={row.key || idx}
            row={row}
            onClick={() => setSelectedDayIdx(idx)}
          />
        ))}
      </div>

      {/* ── Info footer ── */}
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-[11px] text-slate-500 font-medium">
          {totalPax > 0
            ? `${totalPax} passengers on this departure. Click a day to view hotel details and room allocation.`
            : "No passengers confirmed yet. Add bookings to see room allocation."}
        </p>
      </div>

      {/* ── Day Detail Drawer ── */}
      <Dialog open={selectedDayIdx !== null} onOpenChange={() => setSelectedDayIdx(null)}>
        <DialogContent hideClose className="max-w-lg bg-white p-0 rounded-[12px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Day Stay Details</DialogTitle>
            <DialogDescription>
              Details and room allocations for {selectedRow?.dayLabel || "itinerary day"}
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <DayDetailDrawer
              row={selectedRow}
              allPassengers={allPassengers}
              passengerAllocations={passengerAllocations}
              passengerSharing={passengerSharing}
              physicalRoomAllocation={physicalRoomAllocation}
              totalPax={totalPax}
              onClose={() => setSelectedDayIdx(null)}
              onToggleStay={(key, val) => handleToggleStay(key, val)}
              onEditHotel={() => {
                setSelectedDayIdx(null);
                onEditHotel(selectedRow.booking || { id: "" }, {
                  dayNum: selectedDayIdx !== null ? selectedDayIdx + 1 : 1,
                  dayLabel: selectedRow.dayLabel,
                  destination: selectedRow.destination,
                  dateStr: selectedRow.dateStr,
                  existingBooking: selectedRow.booking,
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Summary Pill
// ─────────────────────────────────────────────

function SummaryPill({
  icon,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-bold",
        highlight ? "text-[#FF4D00]" : "text-slate-700"
      )}
    >
      <span className={highlight ? "text-[#FF4D00]" : "text-slate-400"}>{icon}</span>
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────
// Table Row
// ─────────────────────────────────────────────

function AccommodationTableRow({
  row,
  onClick,
  onAssignClick,
  onToggleStay,
}: {
  row: AccommodationRow;
  onClick: () => void;
  onAssignClick: (e: React.MouseEvent) => void;
  onToggleStay: (e: React.MouseEvent) => void;
}) {
  return (
    <tr
      className="hover:bg-slate-50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Day */}
      <td className="px-4 py-3.5 font-black text-slate-900 whitespace-nowrap">
        {row.dayLabel}
      </td>

      {/* Date */}
      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap font-medium">
        {row.date || "—"}
      </td>

      {/* Destination */}
      <td className="px-4 py-3.5">
        {row.hasStay ? (
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <MapPin className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
            <span className="truncate max-w-[140px]">{row.destination}</span>
          </div>
        ) : (
          <span className="text-slate-400 font-medium">{row.destination}</span>
        )}
      </td>

      {/* Stay (Interactive Toggle) */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <button
          type="button"
          onClick={onToggleStay}
          title="Click to toggle Stay / No Stay for this day"
          className={cn(
            "px-2 py-1 rounded-[4px] font-extrabold text-[10px] uppercase transition-all inline-flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 border shadow-2xs",
            row.hasStay
              ? "bg-green-50 text-green-700 border-green-200/80 hover:bg-green-100"
              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800"
          )}
        >
          {row.hasStay ? (
            <>
              <Bed className="w-3 h-3 text-green-600 shrink-0" />
              <span>{row.nightsText}</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span>NO STAY</span>
            </>
          )}
        </button>
      </td>

      {/* Hotel */}
      <td className="px-4 py-3.5">
        {row.hasStay ? (
          <span
            className={cn(
              "font-bold text-slate-900 truncate max-w-[160px] block",
              row.hotelName === "— Pending Assignment —" && "text-slate-400 font-medium"
            )}
          >
            {row.hotelName}
          </span>
        ) : (
          <span className="text-slate-400 font-bold">—</span>
        )}
      </td>

      {/* Rooms */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {row.hasStay ? (
          row.physicalRooms > 0 ? (
            <span className="font-black text-slate-800">
              {row.physicalRooms} {row.physicalRooms === 1 ? "Room" : "Rooms"}
            </span>
          ) : (
            <span className="text-slate-400 font-medium text-[10px]">Pending</span>
          )
        ) : (
          <span className="text-slate-400 font-bold">—</span>
        )}
      </td>

      {/* Total Amount */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {row.hasStay && (row.totalAmount > 0 || row.costPerPaxPerNight > 0) ? (
          <div>
            <div className="font-extrabold text-green-600 flex items-center gap-1">
              <span>{formatINR(row.totalAmount > 0 ? row.totalAmount : row.costPerPaxStay)}</span>
              {row.booking && (row.booking.nightsCount || 1) > 1 && (
                <span className="text-[10px] font-semibold text-slate-500">/ night</span>
              )}
            </div>
            {row.costPerPaxStay > 0 && (
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                <span>{formatINR(row.costPerPaxStay)} / pax</span>
                {row.booking && (row.booking.nightsCount || 1) > 1 && (
                  <span className="text-[#FF4D00] font-bold ml-1.5">
                    (Stay Total: {formatINR(row.booking.totalAmount || (row.totalAmount * (row.booking.nightsCount || 1)))})
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400 font-bold">—</span>
        )}
      </td>

      {/* Status & Action */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <Button
            size="xs"
            variant="outline"
            onClick={onAssignClick}
            className="h-6 text-[10px] font-bold text-[#FF4D00] border-[#FF4D00]/30 hover:bg-[#FF4D00]/5"
          >
            {row.booking ? "Edit" : "+ Assign"}
          </Button>
        </div>
      </td>

      {/* Chevron */}
      <td className="px-4 py-3.5">
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FF4D00] transition-colors" />
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Mobile Card
// ─────────────────────────────────────────────

function AccommodationMobileCard({
  row,
  onClick,
}: {
  row: AccommodationRow;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-white border border-[#E2E8F0] rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition-colors shadow-xs"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-sm">{row.dayLabel}</span>
            <span className="text-[10px] text-slate-500 font-medium">{row.date}</span>
            <StatusBadge status={row.status} />
          </div>
          <div className="flex items-center gap-1 mt-1">
            {row.hasStay && <MapPin className="w-3 h-3 text-[#FF4D00] shrink-0" />}
            <span className={cn(
              "text-xs font-bold truncate",
              row.hasStay ? "text-slate-800" : "text-slate-400"
            )}>
              {row.destination}
            </span>
          </div>
          {row.hasStay && (
            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate">
              {row.hotelName}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {row.hasStay && row.physicalRooms > 0 && (
            <div className="font-black text-slate-800 text-sm">
              {row.physicalRooms} Rooms
            </div>
          )}
          {row.hasStay && row.costPerPaxPerNight > 0 && (
            <div className="text-xs font-bold text-green-600 mt-0.5">
              {formatINR(row.costPerPaxPerNight)}/pax
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300 mt-1 ml-auto" />
        </div>
      </div>
      {!row.hasStay && (
        <div className="mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">No Overnight Stay</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: AccommodationRow["status"] }) {
  if (status === "configured") {
    return (
      <span className="px-2 py-0.5 rounded-[4px] font-black text-[10px] uppercase bg-green-50 text-green-600">
        Configured
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="px-2 py-0.5 rounded-[4px] font-black text-[10px] uppercase bg-amber-50 text-amber-600">
        Pending
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-[4px] font-black text-[10px] uppercase bg-slate-100 text-slate-500">
      No Stay
    </span>
  );
}

// ─────────────────────────────────────────────
// Day Detail Drawer
// ─────────────────────────────────────────────

interface DayDetailDrawerProps {
  row: AccommodationRow;
  allPassengers: any[];
  passengerAllocations: Record<string, { room: string; vehicle: string; seat: string }>;
  passengerSharing: ReturnType<typeof derivePassengerSharing>;
  physicalRoomAllocation: ReturnType<typeof buildPhysicalRoomAllocation>;
  totalPax: number;
  onClose: () => void;
  onEditHotel: () => void;
  onToggleStay: (row: AccommodationRow, explicitValue?: boolean) => void;
}

function DayDetailDrawer({
  row,
  allPassengers,
  passengerAllocations,
  passengerSharing,
  physicalRoomAllocation,
  totalPax,
  onClose,
  onEditHotel,
  onToggleStay,
}: DayDetailDrawerProps) {
  const booking = row.booking;

  // ── Cost calculation ──
  const costResult = useMemo(() => {
    if (!booking) return null;
    const rate = getPrimaryRateFromBooking(booking);
    const stayTotal = calculateHotelStayTotalFromBooking({
      pricingMethod: booking.pricingMethod || "per-person",
      doubleRoomsCount: booking.doubleRoomsCount,
      tripleRoomsCount: booking.tripleRoomsCount,
      quadRoomsCount: booking.quadRoomsCount,
      extraPersonsCount: booking.extraPersonsCount,
      nightsCount: booking.nightsCount || 1,
      doubleRate: booking.doubleRate,
      tripleRate: booking.tripleRate,
      quadRate: booking.quadRate,
      extraBedRate: booking.extraBedRate,
      totalAmount: booking.totalAmount,
    });
    if (rate <= 0 && stayTotal <= 0) return null;

    const nightsForStay = Math.max(1, Number(booking.nightsCount) || 1);
    const effectiveTotal =
      row.totalAmount > 0
        ? row.totalAmount
        : stayTotal > 0
          ? stayTotal / nightsForStay
          : 0;

    if (effectiveTotal > 0 && totalPax > 0) {
      const nights = 1; // Itinerary day row represents exactly 1 night
      const rooms = booking.numberOfRooms || 0;
      const costPerPaxStay = effectiveTotal / totalPax;
      const costPerPaxPerNight = costPerPaxStay;
      const mode = normalisePricingMode(booking.pricingMethod);

      const steps = [];
      if (mode === "PER_ROOM" && rooms > 0) {
        const roomRate = rooms > 0 && nights > 0 ? effectiveTotal / rooms / nights : rate;
        steps.push({
          label: "Room Rate",
          formula: `${formatINR(roomRate)} / Room / Night`,
          result: "",
        });
        steps.push({
          label: `${rooms} Rooms × ${formatINR(roomRate)} × ${nights} Night${nights !== 1 ? "s" : ""}`,
          formula: `${rooms} × ${formatINR(roomRate)}`,
          result: formatINR(effectiveTotal),
        });
        steps.push({
          label: "Cost per Pax",
          formula: `${formatINR(effectiveTotal)} ÷ ${totalPax} Pax`,
          result: formatINR(costPerPaxStay, 2),
        });
      } else {
        const paxRate = totalPax > 0 && nights > 0 ? effectiveTotal / totalPax / nights : rate;
        steps.push({
          label: "Rate",
          formula: `${formatINR(paxRate)} / Pax / Night`,
          result: "",
        });
        steps.push({
          label: `${totalPax} Pax × ${nights} Night${nights !== 1 ? "s" : ""}`,
          formula: `${totalPax} × ${formatINR(paxRate)}`,
          result: formatINR(effectiveTotal),
        });
        steps.push({
          label: "Cost per Pax",
          formula: `${formatINR(paxRate)} × ${nights} Night`,
          result: formatINR(costPerPaxStay, 2),
        });
      }

      return {
        grandTotal: effectiveTotal,
        costPerPaxPerNight,
        costPerPaxStay,
        steps,
        pricingMode: mode,
      };
    }

    // No stored total — calculate from rates
    const mode = normalisePricingMode(booking.pricingMethod);
    return calculateAccommodationCost({
      physicalRooms: booking.numberOfRooms || 0,
      baseRate: rate,
      nights: booking.nightsCount || 1,
      totalPax,
      pricingMode: mode,
      taxPercent: booking.taxPercent || 0,
    });
  }, [booking, totalPax, row.totalAmount]);

  // ── Derive day-specific sharing: physical allocation is ground truth ──
  const daySharing = useMemo(() => {
    // When we have actual physical room assignments, always use passengerSharing
    // (which is derived from the deduplicated physical allocation).
    // Booking room counts may be stale/wrong from previous saves.
    if (physicalRoomAllocation.rooms.length > 0) {
      return passengerSharing;
    }
    // No physical allocation — fall back to booking saved data
    if (booking) {
      const dPax = booking.doublePax ?? ((booking.doubleRoomsCount || 0) * 2);
      const tPax = booking.triplePax ?? ((booking.tripleRoomsCount || 0) * 3);
      const qPax = booking.quadPax ?? ((booking.quadRoomsCount || 0) * 4);
      const exPax = booking.extraPersonsCount || 0;
      if (dPax > 0 || tPax > 0 || qPax > 0 || exPax > 0) {
        return {
          doublePax: dPax,
          triplePax: tPax,
          quadPax: qPax,
          otherPax: exPax,
        };
      }
    }
    return passengerSharing;
  }, [booking, passengerSharing, physicalRoomAllocation]);

  // ── Room allocation display: physical allocation > booking room counts > suggestion ──
  const roomsToShow = useMemo(() => {
    // 1. Physical room allocation (actual saved room assignments) is the ground truth
    if (physicalRoomAllocation.rooms.length > 0) {
      return physicalRoomAllocation.rooms;
    }

    // 2. Booking saved room counts (only used if no physical allocation exists)
    if (booking && (booking.doubleRoomsCount || booking.tripleRoomsCount || booking.quadRoomsCount || booking.extraPersonsCount)) {
      const list: Array<{ roomLabel: string; occupants: string[]; paxCount: number }> = [];
      let roomCounter = 1;
      for (let i = 0; i < (booking.doubleRoomsCount || 0); i++) {
        list.push({ roomLabel: `Room ${roomCounter++} (Double)`, occupants: [], paxCount: 2 });
      }
      for (let i = 0; i < (booking.tripleRoomsCount || 0); i++) {
        list.push({ roomLabel: `Room ${roomCounter++} (Triple)`, occupants: [], paxCount: 3 });
      }
      for (let i = 0; i < (booking.quadRoomsCount || 0); i++) {
        list.push({ roomLabel: `Room ${roomCounter++} (Quad)`, occupants: [], paxCount: 4 });
      }
      if (booking.extraPersonsCount > 0) {
        list.push({ roomLabel: `Extra Mattress`, occupants: [], paxCount: booking.extraPersonsCount });
      }
      if (list.length > 0) return list;
    }

    // 3. Suggested allocation from sharing config
    const sizes = suggestRoomAllocation(daySharing);
    return sizes.map((paxCount, i) => ({
      roomLabel: `Room ${i + 1}`,
      occupants: [],
      paxCount,
    }));
  }, [booking, physicalRoomAllocation, daySharing]);

  const isSuggestedAllocation = !booking && physicalRoomAllocation.rooms.length === 0;
  const effectiveTotalRooms = roomsToShow.length;
  const effectiveTotalPax = roomsToShow.reduce((s, r) => s + r.paxCount, 0);

  // ── Format check-in/out dates ──
  const checkIn = row.date || (booking?.checkIn ? formatDisplayDate(booking.checkIn) : "—");
  const checkOut = booking?.checkOut ? formatDisplayDate(booking.checkOut) : "—";

  return (
    <div className="flex flex-col h-full max-h-[85vh] bg-white overflow-hidden rounded-[12px]">
      {/* Fixed Header */}
      <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-white shrink-0">
        <div>
          <span className="text-[10px] font-black uppercase text-[#FF4D00] tracking-wider block">
            {row.dayLabel} · {row.destination}
          </span>
          <h3 className="text-base font-black text-slate-800 mt-0.5">
            Accommodation Details
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {row.date}
            </span>
            <span className="flex items-center gap-1">
              <Bed className="w-3 h-3 text-slate-400" />
              {row.nightsText}
            </span>
            {totalPax > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                {totalPax} Pax
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* ── Manual Stay / No Stay Switch Bar ── */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 transition-colors",
              row.hasStay ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
            )}>
              <Bed className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 block">
                Stay Setting
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {row.hasStay ? "Overnight stay required for this day" : "No hotel stay required for this day"}
              </span>
            </div>
          </div>
          <div className="flex bg-slate-200/70 p-1 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => onToggleStay(row, true)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                row.hasStay
                  ? "bg-white text-green-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Bed className="w-3.5 h-3.5" />
              Stay
            </button>
            <button
              type="button"
              onClick={() => onToggleStay(row, false)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                !row.hasStay
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              No Stay
            </button>
          </div>
        </div>

        {!booking ? (
          /* ── Unassigned State: Single Clean Actionable Card ── */
          <div className="bg-[#FF4D00]/5/50 border border-[#FF4D00]/30/70 rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FF4D00]/10/80 text-[#FF4D00] flex items-center justify-center shadow-xs">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                No Hotel Assigned
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs font-medium">
                No accommodation configured for {row.destination} on {row.date} ({row.nightsText}).
              </p>
            </div>
            <Button
              onClick={onEditHotel}
              className="bg-[#FF4D00] hover:bg-[#FF4D00] text-white font-black text-xs h-9 px-4 rounded-lg shadow-sm flex items-center gap-1.5 transition-all mt-1"
            >
              <Plus className="w-4 h-4" />
              Assign Hotel
            </Button>
          </div>
        ) : (
          /* ── Section 1: Hotel Info ── */
          <Section title="Hotel" icon={<Hotel className="w-3.5 h-3.5" />}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-sm">
                  {booking.hotelName}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                    booking.confirmed === "CONFIRMED"
                      ? "bg-green-50 text-green-600 border border-green-200/50"
                      : "bg-amber-50 text-amber-600 border border-amber-200/50"
                  )}
                >
                  {booking.confirmed || "UNCONFIRMED"}
                </span>
              </div>
              {(row.destination || booking.location) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                  <span>{row.destination || booking.location}</span>
                  {booking.location &&
                    row.destination &&
                    normalizeDestinationName(booking.location) !== normalizeDestinationName(row.destination) && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Property in {booking.location})
                      </span>
                    )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <InfoChip label="Check-in" value={checkIn} />
                <InfoChip label="Check-out" value={checkOut} />
                <InfoChip label="Nights" value={String(booking.nightsCount || 1)} />
              </div>
              {booking.roomType && (
                <InfoChip label="Room Type" value={booking.roomType} />
              )}
            </div>
          </Section>
        )}

        {/* ── Room Allocation (Only render if there are rooms or passenger sharing data) ── */}
        {(roomsToShow.length > 0 || daySharing.doublePax > 0 || daySharing.triplePax > 0 || daySharing.quadPax > 0 || daySharing.otherPax > 0) && (
          <Section title="Room Allocation & Sharing" icon={<Hash className="w-3.5 h-3.5" />}>
            {isSuggestedAllocation && roomsToShow.length > 0 && (
              <p className="text-[10px] text-amber-600 font-bold mb-2 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Suggested allocation — save from Room & Allocation tab to confirm
              </p>
            )}

            {/* Sharing Badges */}
            {(daySharing.doublePax > 0 || daySharing.triplePax > 0 || daySharing.quadPax > 0 || daySharing.otherPax > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {daySharing.doublePax > 0 && (
                  <SharingDisplay
                    type="Double"
                    pax={daySharing.doublePax}
                    color="bg-blue-50 border-blue-200 text-blue-700"
                  />
                )}
                {daySharing.triplePax > 0 && (
                  <SharingDisplay
                    type="Triple"
                    pax={daySharing.triplePax}
                    color="bg-[#FF4D00]/5 border-[#FF4D00]/30 text-[#C2410C]"
                  />
                )}
                {daySharing.quadPax > 0 && (
                  <SharingDisplay
                    type="Quad"
                    pax={daySharing.quadPax}
                    color="bg-amber-50 border-amber-200 text-amber-700"
                  />
                )}
                {daySharing.otherPax > 0 && (
                  <SharingDisplay
                    type="Other"
                    pax={daySharing.otherPax}
                    color="bg-slate-100 border-slate-200 text-slate-600"
                  />
                )}
              </div>
            )}

            {/* Physical Rooms */}
            {roomsToShow.length > 0 && (
              <>
                <div className="space-y-1.5">
                  {roomsToShow.map((room, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700">
                          {room.roomLabel}
                        </span>
                        {room.occupants.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]">
                            {room.occupants.join(", ")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500 shrink-0">
                        {room.paxCount} Pax
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-black text-slate-700 border-t border-slate-100 pt-2">
                  <span>Total</span>
                  <span>
                    {effectiveTotalRooms} Room{effectiveTotalRooms !== 1 ? "s" : ""} · {effectiveTotalPax} Pax
                  </span>
                </div>
              </>
            )}
          </Section>
        )}

        {/* ── Cost Calculation (Only if hasStay and booking exists) ── */}
        {row.hasStay && booking && (
          <Section title="Accommodation Cost" icon={<Hash className="w-3.5 h-3.5" />}>
            {costResult ? (
              <div className="space-y-2">
                {/* Pricing mode badge */}
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Pricing:{" "}
                  <span className="text-slate-600">
                    {costResult.pricingMode === "PER_ROOM"
                      ? "Per Physical Room / Night"
                      : "Per Person / Night"}
                  </span>
                </div>

                {/* Calculation steps */}
                <div className="space-y-1.5">
                  {costResult.steps.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between text-xs",
                        i === costResult.steps.length - 1
                          ? "font-black text-slate-900 border-t border-slate-100 pt-2 mt-1"
                          : "text-slate-600 font-medium"
                      )}
                    >
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {step.label}
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {step.result || step.formula}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Primary numbers */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Cost / Pax / Night</span>
                    <span className="text-base font-black text-green-600">
                      {formatINR(costResult.costPerPaxPerNight, 2)}
                    </span>
                  </div>
                  {row.nights > 1 && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Cost / Pax / Stay ({row.nights} nights)</span>
                      <span className="text-sm font-extrabold text-[#FF4D00]">
                        {formatINR(costResult.costPerPaxStay, 2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline border-t border-slate-200 pt-1.5 mt-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Cost</span>
                    <span className="text-sm font-black text-slate-800">
                      {formatINR(costResult.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Tax note */}
                {booking?.taxPercent > 0 && (
                  <p className="text-[10px] text-slate-400 font-medium">
                    Includes {booking.taxPercent}% GST on total
                  </p>
                )}

                {/* Balance */}
                {(booking.advancePaid > 0 || booking.balanceAmount > 0) && (
                  <div className="mt-2 space-y-1">
                    {booking.advancePaid > 0 && (
                      <div className="flex justify-between text-xs font-bold text-green-600">
                        <span>Advance Paid</span>
                        <span>{formatINR(booking.advancePaid)}</span>
                      </div>
                    )}
                    {booking.balanceAmount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-red-600">
                        <span>Balance Due</span>
                        <span>{formatINR(booking.balanceAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-medium py-1 flex items-center justify-between">
                <span>No rates configured.</span>
                <button onClick={onEditHotel} className="text-[#FF4D00] hover:text-[#FF4D00] font-bold underline">
                  Add hotel rates
                </button>
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-3 flex justify-between items-center shrink-0 bg-slate-50/50">
        <span className="text-[10px] font-bold text-slate-400">
          {booking ? `ID: ${booking.id?.substring(0, 12)}...` : "Unassigned"}
        </span>
        <div className="flex gap-2">
          {booking ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditHotel}
                className="h-8 text-xs font-bold border-slate-200"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Hotel
              </Button>
              <Button
                size="sm"
                onClick={onClose}
                className="h-8 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white"
              >
                Close
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white px-4"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper Sub-Components
// ─────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400">{icon}</span>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xs font-bold text-slate-700 mt-0.5">{value || "—"}</p>
    </div>
  );
}

function SharingDisplay({
  type,
  pax,
  color,
}: {
  type: string;
  pax: number;
  color: string;
}) {
  return (
    <div
      className={cn(
        "border rounded-lg px-3 py-2 text-center",
        color
      )}
    >
      <p className="text-[10px] font-black uppercase">{type}</p>
      <p className="text-lg font-black mt-0.5">{pax}</p>
      <p className="text-[9px] font-semibold opacity-70">Pax</p>
    </div>
  );
}

/** Format date for display: "2026-08-19" → "19 Aug 2026" */
function formatDisplayDate(raw: string): string {
  if (!raw) return "—";
  try {
    const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00Z");
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return raw;
  }
}

