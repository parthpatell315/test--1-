/**
 * Passenger Normalizer & Identity Utility
 * Guarantees all passenger operations key off passenger.id and cancelled records are normalized cleanly.
 */

export function isCancelled(record: any, parentBooking?: any): boolean {
  if (!record && !parentBooking) return false;

  if (parentBooking) {
    const bStatus = String(parentBooking.status || parentBooking.bookingStatus || "")
      .trim()
      .toUpperCase();
    if (
      bStatus === "CANCELLED" ||
      bStatus === "CANCELED" ||
      bStatus === "REFUNDED"
    ) {
      return true;
    }
  }

  const p = record || {};
  const statusStr = String(p.status || p.passengerStatus || p.bookingStatus || "")
    .trim()
    .toUpperCase();
  const notesStr = String(p.notes || p.remarks || "")
    .trim()
    .toUpperCase();
  const isCancelledFlag = p.isCancelled === true || p.cancelled === true;

  if (isCancelledFlag) return true;

  if (
    statusStr === "CANCELLED" ||
    statusStr === "CANCELED" ||
    statusStr === "REFUNDED"
  ) {
    return true;
  }

  if (notesStr === "CANCELLED" || notesStr === "CANCELED") {
    return true;
  }

  return false;
}

export function getPassengerId(passenger: any, fallbackIndex: number = 0): string {
  if (!passenger) return `pax_unknown_${fallbackIndex}`;

  const id = passenger.id || passenger.passengerId || passenger.idProofNumber;
  if (id && String(id).trim() !== "" && String(id) !== "undefined" && String(id) !== "null") {
    return String(id).trim();
  }

  return `pax_${fallbackIndex}_${Math.random().toString(36).substring(2, 7)}`;
}

export function getBookingGroupKey(passenger: any): string {
  if (!passenger) return "passenger:unknown";

  const bId = passenger.bookingId || passenger.bookingRef;
  if (bId && String(bId).trim() !== "" && String(bId) !== "undefined" && String(bId) !== "null") {
    return `booking:${String(bId).trim()}`;
  }

  const pId = getPassengerId(passenger);
  return `passenger:${pId}`;
}
