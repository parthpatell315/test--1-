/**
 * Passenger Allocation & Grouping Utility
 * Ensures all allocations (rooms, transport, activities) are keyed strictly by passenger.id
 * and booking grouping never falls back to undefined or passenger name.
 */

import { isPassengerCancelled } from "./passengerStatus";

export interface PassengerAllocationItem {
  passengerId: string;
  bookingId?: string;
  passengerName: string;
  room?: string;
  vehicle?: string;
  activity?: string;
  seat?: string;
  notes?: string;
}

/**
 * Returns a stable grouping key for a booking or passenger.
 * Rule:
 * - If bookingId exists -> "booking:${bookingId}"
 * - If missing -> "passenger:${passenger.id}" (never String(undefined) or name)
 */
export function getBookingGroupKey(passenger: any): string {
  if (!passenger) return "passenger:unknown";
  const linkedId =
    passenger.linkedBooking ||
    passenger.linkedBookingId ||
    passenger.groupBookingId;
  if (linkedId && String(linkedId).trim() !== "" && String(linkedId) !== "undefined") {
    return `booking:${String(linkedId).trim()}`;
  }
  const bId =
    passenger.bookingId ||
    passenger.rawBooking?.bookingId ||
    passenger.rawBooking?.id ||
    passenger.bookingRef;
  if (bId && String(bId).trim() !== "" && String(bId) !== "undefined" && String(bId) !== "null") {
    return `booking:${String(bId).trim()}`;
  }
  const pId = passenger.id || passenger.passengerId || passenger.idProofNumber;
  if (pId && String(pId).trim() !== "" && String(pId) !== "undefined" && String(pId) !== "null") {
    return `passenger:${String(pId).trim()}`;
  }
  return `passenger:${passenger.name || Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Group active passengers by booking group key.
 */
export function groupPassengersByBooking(passengers: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  if (!Array.isArray(passengers)) return groups;

  passengers.forEach((p) => {
    if (isPassengerCancelled(p)) return;
    const key = getBookingGroupKey(p);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  return groups;
}

/**
 * Safe migration helper to convert legacy name-keyed allocations
 * into passenger.id-keyed allocations without silent name collision bugs.
 */
export function normalizeAllocationsToPassengerIds(
  legacyAllocations: Record<string, any>,
  allPassengers: any[]
): Record<string, PassengerAllocationItem> {
  const normalized: Record<string, PassengerAllocationItem> = {};
  if (!legacyAllocations || typeof legacyAllocations !== "object") return normalized;

  // Build name count map to detect ambiguous names
  const nameMap: Record<string, any[]> = {};
  allPassengers.forEach((p) => {
    if (p.name) {
      const cleanName = String(p.name).trim().toLowerCase();
      if (!nameMap[cleanName]) nameMap[cleanName] = [];
      nameMap[cleanName].push(p);
    }
  });

  Object.entries(legacyAllocations).forEach(([key, alloc]) => {
    // If key is already an ID (e.g. p.id)
    const directMatch = allPassengers.find((p) => String(p.id) === key);
    if (directMatch) {
      normalized[directMatch.id] = {
        passengerId: directMatch.id,
        bookingId: directMatch.bookingId,
        passengerName: directMatch.name,
        ...alloc,
      };
      return;
    }

    // Legacy fallback: key was passenger name
    const cleanKey = key.trim().toLowerCase();
    const matchingPax = nameMap[cleanKey] || [];
    if (matchingPax.length === 1) {
      // Unambiguous match
      const p = matchingPax[0];
      normalized[p.id] = {
        passengerId: p.id,
        bookingId: p.bookingId,
        passengerName: p.name,
        ...alloc,
      };
    } else {
      // Ambiguous or missing — do not silently assign
      console.warn(`[Allocation Normalizer] Skipped ambiguous/unmatched legacy allocation key: "${key}"`);
    }
  });

  return normalized;
}
