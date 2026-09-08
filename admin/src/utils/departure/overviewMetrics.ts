import {
  findHotelForDay,
  resolveCityForItineraryDay,
} from "@/utils/accommodationCalculator";

/** Default seat capacity when trip.maxGroupSize is missing (matches backend dashboard fallback). */
export const DEFAULT_DEPARTURE_CAPACITY = 40;

export type OverviewItineraryDay = {
  destination?: string;
  location?: string;
  sub?: string;
  plan?: string;
  day?: string;
  stay?: string;
  city?: string;
  dateStr?: string;
  date?: string;
  isNoStay?: boolean;
};

export type OverviewHotelBooking = {
  id?: string;
  hotelName?: string | null;
  name?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  location?: string | null;
  nightsCount?: number | null;
  confirmed?: string | boolean | null;
  status?: string | null;
  updatedAt?: string | null;
  numberOfRooms?: number | null;
};

/**
 * Stay nights for readiness: exclude first/last day and obvious enroute / no-stay days.
 */
export function isOverviewStayDay(
  day: OverviewItineraryDay,
  idx: number,
  totalDays: number,
): boolean {
  if (day?.isNoStay) return false;
  const dest = String(
    day?.destination || day?.location || day?.sub || day?.plan || "",
  ).toLowerCase();
  const dayLabel = String(day?.day || "").toLowerCase();
  const isEnroute =
    dest.includes("train") ||
    dest.includes("night journey") ||
    dest.includes("arrival in your city") ||
    dest.includes("your city") ||
    dest.includes("departure to your") ||
    dayLabel.includes("no stay") ||
    idx === 0 ||
    idx === totalDays - 1;
  return !isEnroute;
}

export function listOverviewStayDays(
  itinerary: OverviewItineraryDay[] | null | undefined,
): OverviewItineraryDay[] {
  const days = Array.isArray(itinerary) ? itinerary : [];
  return days.filter((d, idx) => isOverviewStayDay(d, idx, days.length));
}

function isRealHotelName(name: unknown): boolean {
  const n = String(name || "")
    .trim()
    .toUpperCase();
  return Boolean(n) && n !== "NO_STAY" && n !== "NO STAY" && n !== "—";
}

function isHotelBookingConfirmed(booking: OverviewHotelBooking | null | undefined): boolean {
  if (!booking) return false;
  const confirmed = booking.confirmed;
  if (confirmed === true) return true;
  const confStr = String(confirmed || "").trim().toUpperCase();
  if (confStr === "CONFIRMED" || confStr === "PAID") return true;
  const status = String(booking.status || "").trim().toUpperCase();
  return status === "CONFIRMED" || status === "PAID";
}

/**
 * Count stay nights that have a real hotel assigned (and optionally confirmed).
 * Uses per-night matching so duplicate / multi-night booking rows cannot exceed the stay-night target.
 */
export function computeHotelStayCoverage(params: {
  itinerary: OverviewItineraryDay[] | null | undefined;
  hotelBookings: OverviewHotelBooking[] | null | undefined;
  requireConfirmed?: boolean;
}): {
  target: number;
  assigned: number;
  confirmed: number;
  /** Count used for the KPI numerator (confirmed if requireConfirmed, else assigned). */
  covered: number;
  isComplete: boolean;
  displayValue: string;
} {
  const stayDays = listOverviewStayDays(params.itinerary);
  const bookings = Array.isArray(params.hotelBookings) ? params.hotelBookings : [];
  const realBookings = bookings.filter((h) =>
    isRealHotelName(h?.hotelName || h?.name),
  );

  let assigned = 0;
  let confirmed = 0;

  for (const day of stayDays) {
    const dayDate = String(day.dateStr || day.date || "");
    const city = resolveCityForItineraryDay(day);
    const match = findHotelForDay(dayDate, city, realBookings as any);
    if (!match || !isRealHotelName(match.hotelName || (match as any).name)) {
      continue;
    }
    assigned += 1;
    if (isHotelBookingConfirmed(match)) confirmed += 1;
  }

  const target = stayDays.length;
  const covered = params.requireConfirmed ? confirmed : assigned;
  const capped = Math.min(covered, target);
  const isComplete = target > 0 && covered >= target;

  return {
    target,
    assigned,
    confirmed,
    covered: capped,
    isComplete,
    displayValue: `${capped}/${target}`,
  };
}

/**
 * Seat fill % for timeline "50% Seats Filled".
 * When capacity is missing/0 but participants exist, fall back to DEFAULT_DEPARTURE_CAPACITY
 * so the UI never shows "0% filled" with active pax.
 */
export function computeSeatsFilledPercent(
  participants: number,
  capacity: number | null | undefined,
  fallbackCapacity: number = DEFAULT_DEPARTURE_CAPACITY,
): number {
  const pax = Math.max(0, Number(participants) || 0);
  let cap = Number(capacity);
  if (!Number.isFinite(cap) || cap <= 0) {
    if (pax <= 0) return 0;
    cap = Math.max(1, Number(fallbackCapacity) || DEFAULT_DEPARTURE_CAPACITY);
  }
  return Math.min(100, (pax / cap) * 100);
}

/**
 * Count travelers on a booking, preferring passenger list length over stale numberOfTravelers.
 */
export function countBookingTravelers(booking: any): number {
  if (!booking) return 0;

  let passengers = booking.passengers;
  if (typeof passengers === "string") {
    try {
      passengers = JSON.parse(passengers);
    } catch {
      passengers = null;
    }
  }

  if (Array.isArray(passengers?.persons) && passengers.persons.length > 0) {
    const active = passengers.persons.filter((p: any) => {
      const cancelled =
        p?.isCancelled === true ||
        p?.cancelled === true ||
        String(p?.status || "").toLowerCase() === "cancelled";
      return !cancelled;
    });
    // persons often excludes lead — add 1 for lead when lead is active
    const leadCancelled =
      booking.isCancelled === true ||
      booking.cancelled === true ||
      String(booking.status || "").toLowerCase() === "cancelled";
    if (!leadCancelled) {
      const leadName = String(booking.fullName || booking.name || "")
        .toLowerCase()
        .trim();
      const leadInPersons = active.some(
        (p: any) =>
          String(p?.name || "")
            .toLowerCase()
            .trim() === leadName,
      );
      return leadInPersons ? active.length : active.length + 1;
    }
    return active.length;
  }

  if (Array.isArray(passengers) && passengers.length > 0) {
    return passengers.filter((p: any) => {
      const cancelled =
        p?.isCancelled === true ||
        p?.cancelled === true ||
        String(p?.status || "").toLowerCase() === "cancelled";
      return !cancelled;
    }).length;
  }

  const fromFields =
    Number(booking.numberOfTravelers) ||
    Number(booking.numberOfPersons) ||
    0;
  if (fromFields > 0) return fromFields;
  return 1;
}

/**
 * Participants still owing money — prefer mapped active passengers (same source as header).
 * Falls back to booking traveler counts, capped at active passenger total when provided.
 */
export function countOutstandingParticipants(params: {
  bookings?: any[] | null;
  activePassengers?: any[] | null;
}): number {
  const passengers = Array.isArray(params.activePassengers)
    ? params.activePassengers.filter((p) => !p?.isCancelled)
    : [];

  if (passengers.length > 0) {
    const owingBookingIds = new Set<string>();
    passengers.forEach((p) => {
      const bal = Number(p.bookingBalance ?? p.balance ?? 0);
      if (bal > 0 && p.bookingId != null) {
        owingBookingIds.add(String(p.bookingId));
      }
    });
    if (owingBookingIds.size > 0) {
      return passengers.filter((p) => owingBookingIds.has(String(p.bookingId)))
        .length;
    }
  }

  const bookings = (Array.isArray(params.bookings) ? params.bookings : []).filter(
    (b: any) => {
      const cancelled =
        b?.isCancelled === true ||
        b?.cancelled === true ||
        String(b?.status || "").toLowerCase() === "cancelled";
      return !cancelled && (Number(b?.remainingAmount) || 0) > 0;
    },
  );

  const fromBookings = bookings.reduce(
    (sum, b) => sum + countBookingTravelers(b),
    0,
  );

  if (passengers.length > 0) {
    return Math.min(fromBookings, passengers.length);
  }
  return fromBookings;
}
