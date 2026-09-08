/**
 * Accommodation & Room Occupancy Calculator Utility
 * Derives operational room statistics strictly from OpsHotelBooking records
 * and active passenger counts, eliminating all fabricated fallback metrics.
 */

import { safeNumber } from "./paymentCalculator";

export interface RoomOccupancySummary {
  totalActivePax: number;
  totalRooms: number;
  doubleRooms: number;
  tripleRooms: number;
  quadRooms: number;
  roomCapacity: number;
  allocatedPax: number;
  unallocatedPax: number;
  isCapacityShortfall: boolean;
  shortfallPax: number;
  configuredNights: number;
  hasAccommodationConfigured: boolean;
}

export function calculateRoomOccupancy(
  opsHotelBookings: any[],
  activePassengers: any[],
  passengerAllocations?: Record<string, any>
): RoomOccupancySummary {
  const totalActivePax = Array.isArray(activePassengers) ? activePassengers.length : 0;
  const bookingsList = Array.isArray(opsHotelBookings) ? opsHotelBookings : [];

  let doubleRooms = 0;
  let tripleRooms = 0;
  let quadRooms = 0;
  let configuredNights = 0;

  bookingsList.forEach((b) => {
    doubleRooms += safeNumber(b.doubleRoomsCount || b.doubleRooms || b.doubleCount);
    tripleRooms += safeNumber(b.tripleRoomsCount || b.tripleRooms || b.tripleCount);
    quadRooms += safeNumber(b.quadRoomsCount || b.quadRooms || b.quadCount);
    configuredNights += safeNumber(b.nightsCount || b.nights || b.totalNights);
  });

  const totalRooms = doubleRooms + tripleRooms + quadRooms;
  const roomCapacity = doubleRooms * 2 + tripleRooms * 3 + quadRooms * 4;

  let allocatedPax = 0;
  if (passengerAllocations && typeof passengerAllocations === "object") {
    allocatedPax = Object.keys(passengerAllocations).length;
  }

  const unallocatedPax = Math.max(0, totalActivePax - allocatedPax);
  const isCapacityShortfall = roomCapacity < totalActivePax && totalActivePax > 0;
  const shortfallPax = isCapacityShortfall ? totalActivePax - roomCapacity : 0;
  const hasAccommodationConfigured = bookingsList.length > 0 && totalRooms > 0;

  return {
    totalActivePax,
    totalRooms,
    doubleRooms,
    tripleRooms,
    quadRooms,
    roomCapacity,
    allocatedPax,
    unallocatedPax,
    isCapacityShortfall,
    shortfallPax,
    configuredNights,
    hasAccommodationConfigured,
  };
}
