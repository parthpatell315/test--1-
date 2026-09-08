/**
 * Accommodation Calculator — YouthCamping Admin
 *
 * BUSINESS MODEL:
 *   Passenger Sharing Configuration = how passengers are grouped (Double/Triple/Quad)
 *   Physical Hotel Rooms            = actual rooms booked at the hotel
 *
 * These are DISTINCT concepts. A physical hotel room can hold 2, 3, or 4 pax
 * depending on actual allocation — it is NOT necessarily a "double room" or a "triple room".
 *
 * Cost = (totalPhysicalRooms × roomRate × nights) ÷ totalPax       [PER_ROOM pricing]
 * Cost = (totalPax × personRate × nights)                          [PER_PAX pricing]
 *
 * All functions are pure — no side effects, no API calls, no hardcoded rates.
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type SharingType = "Double" | "Triple" | "Quad";
export type PricingMode = "PER_ROOM" | "PER_PAX" | "room-wise" | "per-person" | "per_room" | "per_pax";

/** Passenger sharing configuration at departure level */
export interface PassengerSharingConfig {
  doublePax: number;   // # of passengers in double-sharing groups
  triplePax: number;   // # of passengers in triple-sharing groups
  quadPax: number;     // # of passengers in quad-sharing groups
  otherPax: number;    // # of passengers with unknown/individual sharing
}

/** A physical hotel room with its occupants */
export interface PhysicalRoom {
  roomLabel: string;         // e.g. "Room 101" or "Room 1"
  occupants: string[];       // passenger names in this room
  paxCount: number;          // number of occupants
}

/** Physical room allocation summary */
export interface PhysicalRoomAllocation {
  rooms: PhysicalRoom[];
  totalRooms: number;
  totalPax: number;
}

/** Accommodation cost result */
export interface AccommodationCostResult {
  /** Pricing mode used */
  pricingMode: string;
  /** Room rate per room per night (if PER_ROOM) or per person per night (if PER_PAX) */
  baseRate: number;
  /** Number of physical rooms */
  physicalRooms: number;
  /** Number of nights */
  nights: number;
  /** Total accommodated passengers */
  totalPax: number;
  /** Total cost before tax */
  totalCostPreTax: number;
  /** Tax percentage */
  taxPercent: number;
  /** Tax amount */
  taxAmount: number;
  /** Total cost including tax */
  grandTotal: number;
  /** Cost per pax per night */
  costPerPaxPerNight: number;
  /** Cost per pax for entire stay */
  costPerPaxStay: number;
  /** Human-readable calculation steps */
  steps: CalculationStep[];
}

export interface CalculationStep {
  label: string;
  formula: string;
  result: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Normalise pricing mode strings from DB into a canonical value */
export function normalisePricingMode(raw: string | undefined | null): "PER_ROOM" | "PER_PAX" {
  if (!raw) return "PER_ROOM";
  const u = raw.toUpperCase();
  if (u === "PER_PAX" || u === "PER_PERSON" || u === "PER-PERSON" || u === "PERPAX") return "PER_PAX";
  return "PER_ROOM";
}

/** Pax capacity for a sharing type */
export function paxPerSharing(sharing: SharingType): number {
  return sharing === "Double" ? 2 : sharing === "Triple" ? 3 : 4;
}

/** Format Indian currency */
export function formatINR(amount: number, decimals = 0): string {
  const rounded = decimals > 0 ? amount : Math.round(amount);
  return "₹" + rounded.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─────────────────────────────────────────────
// 1. Passenger Sharing Configuration
// ─────────────────────────────────────────────

/**
 * Derive passenger sharing configuration from the room allocations saved in the DB.
 *
 * passengerAllocations = { [passengerName]: { room: "Room 101", vehicle: "...", seat: "..." } }
 * We group passengers by room label → count occupants per room → determine sharing type.
 */
export function derivePassengerSharing(
  passengerAllocations: Record<string, { room: string; vehicle: string; seat: string }>,
  allPassengers?: Array<{ id: string; name: string }>
): PassengerSharingConfig {
  // Use buildPhysicalRoomAllocation (which already deduplicates) to get correct room groups
  const allocation = buildPhysicalRoomAllocation(passengerAllocations, allPassengers);

  let doublePax = 0;
  let triplePax = 0;
  let quadPax = 0;
  let otherPax = 0;

  allocation.rooms.forEach((room) => {
    const n = room.paxCount;
    if (n === 2) doublePax += 2;
    else if (n === 3) triplePax += 3;
    else if (n >= 4) quadPax += n;
    else otherPax += n; // 1 = single/individual
  });

  return { doublePax, triplePax, quadPax, otherPax };
}

/**
 * Derive passenger sharing from booking passenger data (roomSharing/roomType fields)
 * when actual room allocations are not yet saved.
 */
export function derivePassengerSharingFromBookings(
  passengers: Array<{ name: string; roomSharing?: string; roomType?: string }>
): PassengerSharingConfig {
  let doublePax = 0;
  let triplePax = 0;
  let quadPax = 0;
  let otherPax = 0;

  passengers.forEach((p) => {
    const s = (p.roomSharing || p.roomType || "").toLowerCase();
    if (s.includes("triple")) triplePax++;
    else if (s.includes("quad") || s.includes("four")) quadPax++;
    else if (s.includes("double") || s.includes("twin") || s.includes("couple")) doublePax++;
    else otherPax++;
  });

  return { doublePax, triplePax, quadPax, otherPax };
}

// ─────────────────────────────────────────────
// 2. Physical Room Allocation
// ─────────────────────────────────────────────

/**
 * Build physical room allocation from passengerAllocations.
 * Each unique room label = one physical room.
 * Deduplicates dual-key ID/name entries so each person is counted strictly once.
 */
export function buildPhysicalRoomAllocation(
  passengerAllocations: Record<string, { room: string; vehicle: string; seat: string }>,
  allPassengers?: Array<{ id: string; name: string }>
): PhysicalRoomAllocation {
  const roomGroups: Record<string, string[]> = {};

  if (allPassengers && Array.isArray(allPassengers) && allPassengers.length > 0) {
    allPassengers.forEach((p) => {
      const alloc = passengerAllocations[p.id] || passengerAllocations[p.name];
      if (!alloc || !alloc.room || alloc.room === "—" || alloc.room === "Unassigned") return;
      if (!roomGroups[alloc.room]) roomGroups[alloc.room] = [];
      const displayName = p.name || p.id;
      if (!roomGroups[alloc.room].includes(displayName)) {
        roomGroups[alloc.room].push(displayName);
      }
    });
  } else {
    // If no explicit passenger list is supplied, filter out opaque CUID/UUID keys
    // when a friendly name entry is already present, and deduplicate occupants per room.
    const seenOccupants = new Set<string>();

    Object.entries(passengerAllocations).forEach(([key, alloc]) => {
      if (!alloc.room || alloc.room === "—" || alloc.room === "Unassigned") return;
      
      // If the key looks like an internal CUID/UUID (starts with 'c' or 'cm' and has no spaces, or 20+ chars)
      const isOpaqueId = /^[a-z0-9_-]{20,}$/i.test(key) || /^c[a-z0-9]{20,}$/i.test(key);
      if (isOpaqueId) return;

      if (!roomGroups[alloc.room]) roomGroups[alloc.room] = [];
      if (!seenOccupants.has(key) && !roomGroups[alloc.room].includes(key)) {
        roomGroups[alloc.room].push(key);
        seenOccupants.add(key);
      }
    });

    // Fallback: If only opaque keys exist
    if (Object.keys(roomGroups).length === 0) {
      Object.entries(passengerAllocations).forEach(([key, alloc]) => {
        if (!alloc.room || alloc.room === "—" || alloc.room === "Unassigned") return;
        if (!roomGroups[alloc.room]) roomGroups[alloc.room] = [];
        if (!roomGroups[alloc.room].includes(key)) {
          roomGroups[alloc.room].push(key);
        }
      });
    }
  }

  const rooms: PhysicalRoom[] = Object.entries(roomGroups)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([label, occupants]) => ({
      roomLabel: label,
      occupants,
      paxCount: occupants.length,
    }));

  return {
    rooms,
    totalRooms: rooms.length,
    totalPax: rooms.reduce((sum, r) => sum + r.paxCount, 0),
  };
}

/**
 * Derive room count breakdown (Double, Triple, Quad, Extra) directly from room allocations.
 */
export function deriveRoomCountsFromAllocations(
  passengerAllocations: Record<string, { room: string; vehicle: string; seat: string }>,
  allPassengers?: Array<{ id: string; name: string }>
) {
  const allocation = buildPhysicalRoomAllocation(passengerAllocations, allPassengers);
  let doubleRooms = 0;
  let tripleRooms = 0;
  let quadRooms = 0;
  let extraPersons = 0;

  allocation.rooms.forEach((r) => {
    if (r.paxCount === 2 || r.paxCount === 1) {
      doubleRooms += 1;
    } else if (r.paxCount === 3) {
      tripleRooms += 1;
    } else if (r.paxCount === 4) {
      quadRooms += 1;
    } else if (r.paxCount > 4) {
      quadRooms += 1;
      extraPersons += (r.paxCount - 4);
    }
  });

  return {
    doubleRooms,
    tripleRooms,
    quadRooms,
    extraPersons,
    totalRooms: allocation.totalRooms,
    totalPax: allocation.totalPax,
  };
}

/**
 * Calculate minimum physical rooms required from passenger sharing config.
 * Used when actual allocation is not yet saved.
 *
 * Example: doublePax=2, triplePax=6, quadPax=4
 * → ceil(2/2) + ceil(6/3) + ceil(4/4) = 1 + 2 + 1 = 4 physical rooms
 */
export function calculateMinPhysicalRooms(config: PassengerSharingConfig): number {
  return (
    Math.ceil(config.doublePax / 2) +
    Math.ceil(config.triplePax / 3) +
    Math.ceil(config.quadPax / 4) +
    (config.otherPax > 0 ? Math.ceil(config.otherPax / 1) : 0)
  );
}

/**
 * Generate a suggested physical room allocation from passenger sharing config.
 * Returns an array of room sizes (pax per room).
 *
 * Example: doublePax=2, triplePax=6, quadPax=4
 * → [2, 3, 3, 4]
 */
export function suggestRoomAllocation(config: PassengerSharingConfig): number[] {
  const rooms: number[] = [];

  // Double rooms: 2 pax each
  for (let i = 0; i < config.doublePax; i += 2) {
    const paxInRoom = Math.min(2, config.doublePax - i);
    if (paxInRoom > 0) rooms.push(paxInRoom);
  }

  // Triple rooms: 3 pax each
  for (let i = 0; i < config.triplePax; i += 3) {
    const paxInRoom = Math.min(3, config.triplePax - i);
    if (paxInRoom > 0) rooms.push(paxInRoom);
  }

  // Quad rooms: 4 pax each
  for (let i = 0; i < config.quadPax; i += 4) {
    const paxInRoom = Math.min(4, config.quadPax - i);
    if (paxInRoom > 0) rooms.push(paxInRoom);
  }

  // Other/single pax
  for (let i = 0; i < config.otherPax; i++) {
    rooms.push(1);
  }

  return rooms.sort((a, b) => b - a); // descending order
}

// ─────────────────────────────────────────────
// 3. Accommodation Cost Calculation
// ─────────────────────────────────────────────

/**
 * Calculate accommodation cost.
 *
 * For PER_ROOM pricing:
 *   totalCost = physicalRooms × roomRate × nights
 *   costPerPaxPerNight = totalCost ÷ totalPax ÷ nights
 *   costPerPaxStay = totalCost ÷ totalPax
 *
 * For PER_PAX pricing:
 *   totalCost = totalPax × personRate × nights
 *   costPerPaxPerNight = personRate
 *   costPerPaxStay = personRate × nights
 *
 * Tax is applied on the pre-tax total.
 */
export function calculateAccommodationCost(params: {
  physicalRooms: number;
  baseRate: number;         // per room per night (PER_ROOM) OR per person per night (PER_PAX)
  nights: number;
  totalPax: number;
  pricingMode: string;      // raw value from DB
  taxPercent?: number;
}): AccommodationCostResult {
  const { physicalRooms, baseRate, nights, totalPax, taxPercent = 0 } = params;
  const mode = normalisePricingMode(params.pricingMode);
  const steps: CalculationStep[] = [];

  let totalCostPreTax = 0;
  let costPerPaxPerNight = 0;
  let costPerPaxStay = 0;

  if (mode === "PER_ROOM") {
    // Per room pricing
    const nightCost = physicalRooms * baseRate;
    totalCostPreTax = nightCost * nights;

    steps.push({
      label: "Room Rate",
      formula: `${formatINR(baseRate)} / Room / Night`,
      result: "",
    });
    steps.push({
      label: "Physical Rooms",
      formula: `${physicalRooms} Rooms × ${formatINR(baseRate)}`,
      result: `${formatINR(nightCost)} / Night`,
    });
    if (nights > 1) {
      steps.push({
        label: "Total Nights",
        formula: `${formatINR(nightCost)} × ${nights} Nights`,
        result: formatINR(totalCostPreTax),
      });
    }
    if (totalPax > 0) {
      costPerPaxStay = totalCostPreTax / totalPax;
      costPerPaxPerNight = costPerPaxStay / nights;
      steps.push({
        label: "Cost per Pax / Stay",
        formula: `${formatINR(totalCostPreTax)} ÷ ${totalPax} Pax`,
        result: formatINR(costPerPaxStay, 2),
      });
      if (nights > 1) {
        steps.push({
          label: "Cost per Pax / Night",
          formula: `${formatINR(costPerPaxStay, 2)} ÷ ${nights} Nights`,
          result: formatINR(costPerPaxPerNight, 2),
        });
      }
    }
  } else {
    // Per person pricing — do NOT divide by paxPerRoom
    costPerPaxPerNight = baseRate;
    costPerPaxStay = baseRate * nights;
    totalCostPreTax = totalPax * costPerPaxStay;

    steps.push({
      label: "Room Rate",
      formula: `${formatINR(baseRate)} / Pax / Night`,
      result: "",
    });
    steps.push({
      label: "Total Pax",
      formula: `${totalPax} Pax × ${formatINR(baseRate)}`,
      result: `${formatINR(totalPax * baseRate)} / Night`,
    });
    if (nights > 1) {
      steps.push({
        label: "Total Stay",
        formula: `${formatINR(totalPax * baseRate)} × ${nights} Nights`,
        result: formatINR(totalCostPreTax),
      });
    }
    if (nights > 1) {
      steps.push({
        label: "Cost per Pax / Night",
        formula: `${formatINR(baseRate)} / Pax`,
        result: `${formatINR(baseRate)} / Night`,
      });
    }
    steps.push({
      label: "Cost per Pax / Stay",
      formula: `${formatINR(baseRate)} × ${nights} Nights`,
      result: formatINR(costPerPaxStay, 2),
    });
  }

  // Apply tax
  const taxAmount = (totalCostPreTax * taxPercent) / 100;
  const grandTotal = totalCostPreTax + taxAmount;
  if (taxPercent > 0) {
    steps.push({
      label: `Tax (${taxPercent}%)`,
      formula: `${formatINR(totalCostPreTax)} × ${taxPercent}%`,
      result: formatINR(taxAmount),
    });
    steps.push({
      label: "Grand Total (incl. Tax)",
      formula: `${formatINR(totalCostPreTax)} + ${formatINR(taxAmount)}`,
      result: formatINR(grandTotal),
    });
  }

  return {
    pricingMode: mode,
    baseRate,
    physicalRooms,
    nights,
    totalPax,
    totalCostPreTax,
    taxPercent,
    taxAmount,
    grandTotal,
    costPerPaxPerNight,
    costPerPaxStay,
    steps,
  };
}

// ─────────────────────────────────────────────
// 4. Determine Primary Rate from OpsHotelBooking
// ─────────────────────────────────────────────

/**
 * Stay total from OpsHotelBooking room counts + rates.
 * Prefer this over a possibly stale totalAmount when rates are present.
 * Does not invent rates — returns 0 if no rate/room inputs yield a cost.
 */
export function calculateHotelStayTotalFromBooking(booking: {
  pricingMethod?: string | null;
  doubleRoomsCount?: number | null;
  tripleRoomsCount?: number | null;
  quadRoomsCount?: number | null;
  extraPersonsCount?: number | null;
  nightsCount?: number | null;
  doubleRate?: number | null;
  tripleRate?: number | null;
  quadRate?: number | null;
  extraBedRate?: number | null;
  totalAmount?: number | null;
}): number {
  if (!booking) return 0;
  if (String(booking.pricingMethod || "").toLowerCase() === "manual") {
    return Number(booking.totalAmount) > 0 ? Number(booking.totalAmount) : 0;
  }

  const dRooms = Math.max(0, Math.trunc(Number(booking.doubleRoomsCount) || 0));
  const tRooms = Math.max(0, Math.trunc(Number(booking.tripleRoomsCount) || 0));
  const qRooms = Math.max(0, Math.trunc(Number(booking.quadRoomsCount) || 0));
  const exPax = Math.max(0, Math.trunc(Number(booking.extraPersonsCount) || 0));
  const nights = Math.max(1, Math.trunc(Number(booking.nightsCount) || 1));

  const dRate = Number(booking.doubleRate) || 0;
  const tRate = Number(booking.tripleRate) || 0;
  const qRate = Number(booking.quadRate) || 0;
  const exRate = Number(booking.extraBedRate) || 0;

  const mode = normalisePricingMode(booking.pricingMethod);
  const daily =
    mode === "PER_PAX"
      ? dRooms * 2 * dRate +
        tRooms * 3 * tRate +
        qRooms * 4 * qRate +
        exPax * exRate
      : dRooms * dRate + tRooms * tRate + qRooms * qRate + exPax * exRate;

  if (daily > 0) return daily * nights;

  return Number(booking.totalAmount) > 0 ? Number(booking.totalAmount) : 0;
}

/**
 * Determine the primary room rate from an OpsHotelBooking record.
 *
 * The DB stores doubleRate/tripleRate/quadRate for legacy billing breakdowns.
 * We pick the best available rate based on what's actually filled.
 *
 * This function does NOT invent a rate — it returns 0 if no rate is configured.
 */
export function getPrimaryRateFromBooking(booking: {
  doubleRate?: number | null;
  tripleRate?: number | null;
  quadRate?: number | null;
  totalAmount?: number | null;
  numberOfRooms?: number | null;
  nightsCount?: number | null;
}): number {
  // Prefer doubleRate as the representative rate (most commonly set)
  if (booking.doubleRate && booking.doubleRate > 0) return booking.doubleRate;
  if (booking.tripleRate && booking.tripleRate > 0) return booking.tripleRate;
  if (booking.quadRate && booking.quadRate > 0) return booking.quadRate;

  // Fallback: derive from totalAmount / rooms / nights
  const rooms = booking.numberOfRooms || 0;
  const nights = booking.nightsCount || 1;
  if (booking.totalAmount && rooms > 0 && nights > 0) {
    return booking.totalAmount / rooms / nights;
  }

  return 0; // no rate configured
}

// ─────────────────────────────────────────────
// 5. Itinerary Day ↔ Hotel Booking Mapping
// ─────────────────────────────────────────────

/**
 * Match an itinerary day to an OpsHotelBooking by checkIn date.
 *
 * A hotel booking covers checkIn date up to (but not including) checkOut date.
 * Multiple itinerary days can map to the same booking (multi-night stays).
 *
 * Falls back to location string matching if date matching fails.
 */
export function resolveCityForItineraryDay(item: any): string {
  if (!item) return "";

  const cleanStay = (item.stay && item.stay !== "—" ? item.stay : "").trim();
  const cleanCity = (item.city && item.city !== "—" ? item.city : "").trim();
  const cleanLoc = (item.location && item.location !== "—" ? item.location : "").trim();
  const cleanDest = (item.destination && item.destination !== "—" ? item.destination : "").trim();

  let targetStr = cleanStay || cleanCity || cleanLoc || cleanDest;

  if (!targetStr) {
    targetStr = `${item.plan || ""} ${item.sub || ""}`;
  }

  const raw = targetStr.toLowerCase();

  if (raw.includes("wagah") || raw.includes("amritsar") || raw.includes("golden temple") || raw.includes("jallianwala")) {
    return "Amritsar";
  }
  if (raw.includes("jalandhar")) {
    return "Jalandhar";
  }
  if (raw.includes("kasol") || raw.includes("parvati") || raw.includes("chalal") || raw.includes("manikaran") || raw.includes("tosh")) {
    return "Kasol";
  }
  if (raw.includes("kaza") || raw.includes("key") || raw.includes("komic") || raw.includes("langza") || raw.includes("hikkim") || raw.includes("kibber") || raw.includes("chicham")) {
    return "Kaza";
  }
  if (raw.includes("tabo") || raw.includes("dhankar") || raw.includes("nako")) {
    return "Tabo";
  }
  if (raw.includes("chandratal") || raw.includes("chandra taal") || raw.includes("batal")) {
    return "Chandratal";
  }
  if (raw.includes("manali") || raw.includes("solang") || raw.includes("mall road") || raw.includes("sissu")) {
    return "Manali";
  }
  if (raw.includes("kullu") || raw.includes("risan")) {
    return "Kullu";
  }
  if (raw.includes("shimla") || raw.includes("narkanda") || raw.includes("kufri") || raw.includes("mashobra")) {
    return "Shimla";
  }
  if (raw.includes("chitkul")) {
    return "Chitkul";
  }
  if (raw.includes("sangla") || raw.includes("rakcham")) {
    return "Sangla";
  }
  if (raw.includes("kalpa") || raw.includes("reckong peo")) {
    return "Kalpa";
  }
  if (raw.includes("leh") || raw.includes("shanti stupa") || raw.includes("hall of fame")) {
    return "Leh";
  }
  if (raw.includes("nubra") || raw.includes("hunder") || raw.includes("diskit")) {
    return "Nubra Valley";
  }
  if (raw.includes("pangong")) {
    return "Pangong Tso";
  }
  if (raw.includes("munnar")) {
    return "Munnar";
  }
  if (raw.includes("thekkady") || raw.includes("periyar")) {
    return "Thekkady";
  }
  if (raw.includes("alleppey") || raw.includes("alappuzha")) {
    return "Alleppey";
  }
  if (raw.includes("kochi") || raw.includes("cochin")) {
    return "Kochi";
  }
  if (raw.includes("kedarkantha") || raw.includes("sankri") || raw.includes("juda ka talab")) {
    return "Sankri";
  }
  if (raw.includes("rishikesh") || raw.includes("haridwar")) {
    return "Rishikesh";
  }

  // Clean fallback from stay or location
  let fallback = item.city || item.location || item.destination || item.stay || "";
  if (fallback.toLowerCase().startsWith("hotel or cottages in ")) {
    fallback = fallback.replace(/hotel or cottages in\s+/i, "");
  } else if (fallback.toLowerCase().startsWith("hotel in ")) {
    fallback = fallback.replace(/hotel in\s+/i, "");
  }
  return fallback.split("/")[0].split("-")[0].trim() || "—";
}

export function findHotelForDay(
  dayDate: string,   // YYYY-MM-DD or display string
  dayLocation: string,
  hotelBookings: Array<{
    id: string;
    checkIn?: string | null;
    checkOut?: string | null;
    location?: string | null;
    hotelName?: string | null;
    numberOfRooms?: number | null;
    nightsCount?: number | null;
    doubleRoomsCount?: number | null;
    doubleRate?: number | null;
    tripleRoomsCount?: number | null;
    tripleRate?: number | null;
    quadRoomsCount?: number | null;
    quadRate?: number | null;
    extraPersonsCount?: number | null;
    extraBedRate?: number | null;
    pricingMethod?: string | null;
    totalAmount?: number | null;
    updatedAt?: string | null;
  }>
): typeof hotelBookings[0] | null {
  if (!hotelBookings || hotelBookings.length === 0) return null;

  const normDay = normaliseDate(dayDate);
  if (!normDay) return null;

  // Ignore explicit NO_STAY rows when resolving a real hotel for display
  const realBookings = hotelBookings.filter((b) => {
    const name = (b.hotelName || "").trim().toUpperCase();
    return name && name !== "NO_STAY" && name !== "NO STAY";
  });
  if (realBookings.length === 0) return null;

  const pickLatest = (matches: typeof realBookings) => {
    const sorted = [...matches].sort((a: any, b: any) => {
      const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tA - tB;
    });
    return sorted[sorted.length - 1];
  };

  // 1. EXACT Check-In Date match (primary key for each itinerary day)
  const exactMatches = realBookings.filter(
    (b) => normaliseDate(b.checkIn) === normDay,
  );
  if (exactMatches.length > 0) {
    const normLoc = normalizeDestinationName(dayLocation);
    if (normLoc) {
      const locMatches = exactMatches.filter((b) => {
        const bLoc = normalizeDestinationName(b.location || "");
        return bLoc && (bLoc === normLoc || bLoc.includes(normLoc) || normLoc.includes(bLoc));
      });
      if (locMatches.length > 0) return pickLatest(locMatches);
    }
    return pickLatest(exactMatches);
  }

  // 2. Multi-night range only — never reuse a 1-night booking on other days
  const dayMs = new Date(normDay + "T12:00:00").getTime();
  if (!Number.isNaN(dayMs)) {
    const rangeMatches = realBookings.filter((b) => {
      const nights = Number(b.nightsCount || 0);
      const cinStr = normaliseDate(b.checkIn);
      const coutStr = normaliseDate(b.checkOut);
      if (!cinStr) return false;

      const cinMs = new Date(cinStr + "T12:00:00").getTime();
      if (Number.isNaN(cinMs)) return false;

      // Prefer explicit multi-night stay window
      if (coutStr) {
        const coutMs = new Date(coutStr + "T12:00:00").getTime();
        if (Number.isNaN(coutMs) || coutMs <= cinMs + 86400000) {
          // checkOut is same day or next morning → single night only
          return false;
        }
        return dayMs >= cinMs && dayMs < coutMs;
      }

      // nightsCount > 1 without checkOut: cover checkIn .. checkIn+(nights-1)
      if (nights > 1) {
        const endMs = cinMs + nights * 86400000;
        return dayMs >= cinMs && dayMs < endMs;
      }

      return false;
    });
    if (rangeMatches.length > 0) {
      const normLoc = normalizeDestinationName(dayLocation);
      if (normLoc) {
        const locMatches = rangeMatches.filter((b) => {
          const bLoc = normalizeDestinationName(b.location || "");
          return !bLoc || bLoc === normLoc || bLoc.includes(normLoc) || normLoc.includes(bLoc);
        });
        if (locMatches.length > 0) return pickLatest(locMatches);
        // Do not bleed a hotel from another city into this day if day has a distinct destination
        return null;
      }
      return pickLatest(rangeMatches);
    }
  }

  return null;
}

/** Normalise various date formats (Date object, ISO string, display string) to YYYY-MM-DD */
export function normaliseDate(raw: any): string {
  if (!raw) return "";

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return "";
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(raw).trim();
  if (!str) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // ISO string or display date
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch (_) { /* fall through */ }

  return "";
}

/**
 * Shared normalization helper for destination names
 * e.g. " Kasol " -> "kasol", "KASOL" -> "kasol"
 */
export function normalizeDestinationName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Interface for hotel-eligible stay destinations
 */
export interface HotelEligibleDestination {
  name: string;
  normalizedName: string;
  sourceDayNumbers: number[];
  isCurrentDay: boolean;
  hotelCount: number;
}

/**
 * Extract structured, hotel-eligible stay destinations from trip itinerary.
 *
 * Rules:
 * 1. Inspect ONLY structured stay/accommodation fields (`item.stay`, `item.location`, `item.destination`, `item.city`).
 * 2. NEVER use plan, title, activities, travel, description, or journey titles.
 * 3. Ignore non-accommodation terms like "—", "No Stay", "Enroute", "Train", "Overnight Train", "Return", "Home", "Arrival", "Departure", etc.
 * 4. Ignore text containing activity indicators like "visit", "trek", "exploration", "sightseeing", "waterfall", "activities".
 * 5. Deduplicate using `normalizeDestinationName`.
 * 6. Return unique hotel-eligible destinations with hotel counts.
 */
export function getHotelEligibleDestinations(
  computedItinerary: any[],
  currentDayNum?: number | string,
  dbVendors: any[] = []
): HotelEligibleDestination[] {
  const seenMap = new Map<string, HotelEligibleDestination>();

  const currentDayNumber =
    typeof currentDayNum === "number"
      ? currentDayNum
      : typeof currentDayNum === "string"
        ? parseInt(currentDayNum.replace(/\D/g, ""), 10) || undefined
        : undefined;

  computedItinerary.forEach((item, idx) => {
    const dayNum = item.day
      ? typeof item.day === "number"
        ? item.day
        : parseInt(String(item.day).replace(/\D/g, ""), 10) || idx + 1
      : idx + 1;

    // 1. Structured stay/location fields
    let rawStay =
      item.stay && item.stay !== "—"
        ? item.stay
        : item.location && item.location !== "—"
          ? item.location
          : item.destination && item.destination !== "—"
            ? item.destination
            : item.city || "";

    const sub = `${item.description || ""} ${item.sub || ""}`;

    // 2. Regex parsing from description if structured stay is empty
    if (!rawStay && sub) {
      const destMatch = sub.match(/•?\s*Destination\s*:\s*([^\n•\r]+)/i);
      if (destMatch && destMatch[1]) {
        rawStay = destMatch[1].trim();
      }
    }

    if (!rawStay && sub) {
      const stayMatch = sub.match(/•?\s*(?:Hotel\/stay|Stay|Hotel|Accommodation)\s*:\s*([^\n•\r]+)/i);
      if (stayMatch && stayMatch[1]) {
        rawStay = stayMatch[1].trim();
      }
    }

    if (!rawStay) return;

    const lower = rawStay.toLowerCase().trim();

    // Filter out non-hotel/enroute values and activity phrases
    if (
      lower.includes("no stay") ||
      lower.includes("enroute") ||
      lower.includes("train") ||
      lower.includes("return") ||
      lower.includes("home") ||
      lower.includes("your city") ||
      lower.includes("arrival") ||
      lower.includes("departure") ||
      lower.includes("visit ") ||
      lower.includes("trek") ||
      lower.includes("exploration") ||
      lower.includes("sightseeing") ||
      lower.includes("waterfall") ||
      lower.includes("activities") ||
      lower.includes("day for") ||
      lower === "—"
    ) {
      return;
    }

    // Clean destination name (e.g. "Hotel in Shimla" -> "Shimla", "Chitkul / Sangla" -> "Chitkul")
    let cleanName = rawStay;
    if (cleanName.toLowerCase().startsWith("hotel in ") || cleanName.toLowerCase().startsWith("homestay in ") || cleanName.toLowerCase().startsWith("cottage in ") || cleanName.toLowerCase().startsWith("camp in ")) {
      cleanName = cleanName.replace(/^(hotel|homestay|cottage|camp|resort)\s+in\s+/i, "");
    }
    cleanName = cleanName.split("/")[0].split("-")[0].trim();
    if (!cleanName) return;

    const norm = normalizeDestinationName(cleanName);
    if (!norm) return;

    const isCurrent = currentDayNumber ? dayNum === currentDayNumber : false;

    if (seenMap.has(norm)) {
      const existing = seenMap.get(norm)!;
      if (!existing.sourceDayNumbers.includes(dayNum)) {
        existing.sourceDayNumbers.push(dayNum);
      }
      if (isCurrent) {
        existing.isCurrentDay = true;
      }
    } else {
      const entry: HotelEligibleDestination = {
        name: cleanName,
        normalizedName: norm,
        sourceDayNumbers: [dayNum],
        isCurrentDay: isCurrent,
        hotelCount: 0,
      };
      seenMap.set(norm, entry);
    }
  });

  // Calculate matching hotel counts ONLY for the current trip's itinerary destinations using dbVendors
  seenMap.forEach((dest) => {
    const matchingCount = dbVendors.filter((v: any) => {
      const vLoc = (v.city || v.location || v.vendorId?.city || v.vendorId?.location || "").toLowerCase().trim();
      const normLoc = normalizeDestinationName(vLoc);
      return normLoc.includes(dest.normalizedName) || dest.normalizedName.includes(normLoc);
    }).length;
    dest.hotelCount = matchingCount;
  });

  return Array.from(seenMap.values());
}

