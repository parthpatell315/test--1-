export type PassengerAlloc = {
  room?: string;
  vehicle?: string;
  seat?: string;
  fleetId?: string;
  name?: string;
  id?: string;
};

export function isActualVehicleAllocated(alloc?: PassengerAlloc | null): boolean {
  if (!alloc) return false;
  const vehicle = String(alloc.vehicle || "").trim();
  return Boolean(vehicle && vehicle !== "—" && vehicle !== "Unassigned");
}

/** Prefer passenger id; never treat display name as unique identity. */
export function resolvePassengerAlloc(
  allocations: Record<string, PassengerAlloc> | undefined,
  passenger: { id?: string; bookingId?: string; name?: string } | null,
): PassengerAlloc | null {
  if (!allocations || !passenger) return null;
  if (passenger.id && allocations[passenger.id]) return allocations[passenger.id];
  const composite =
    passenger.bookingId && passenger.id
      ? `${passenger.bookingId}:${passenger.id}`
      : "";
  if (composite && allocations[composite]) return allocations[composite];
  return null;
}

function passengerBookingKeys(
  passenger: { bookingId?: string; bookingRef?: string; id?: string },
): string[] {
  return [passenger.bookingId, passenger.bookingRef, passenger.id]
    .filter(Boolean)
    .map((v) => String(v).trim());
}

/** Match ops allocation rows (display bookingId or UUID) to departure passengers. */
export function matchPassengerForOpsRow(
  passengers: Array<{ id?: string; name?: string; bookingId?: string; bookingRef?: string }>,
  row: { passengerId?: string; bookingId?: string; travelerName?: string },
  claimedIds: Set<string>,
): (typeof passengers)[0] | null {
  if (row.passengerId) {
    const byPid = passengers.find((p) => p.id && p.id === row.passengerId && !claimedIds.has(String(p.id)));
    if (byPid) return byPid;
  }
  const bookingId = String(row.bookingId || "").trim();
  if (bookingId) {
    const inBooking = passengers.filter((p) => {
      if (!p.id || claimedIds.has(String(p.id))) return false;
      return passengerBookingKeys(p).includes(bookingId);
    });
    if (row.travelerName) {
      const nameMatch = inBooking.filter(
        (p) => String(p.name || "").trim() === String(row.travelerName).trim(),
      );
      if (nameMatch.length === 1) return nameMatch[0];
      if (nameMatch.length === 0 && inBooking.length === 1) return inBooking[0];
      if (nameMatch.length > 1) return null;
    }
    if (inBooking.length === 1) return inBooking[0];
  }
  return null;
}
