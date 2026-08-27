/**
 * Canonical Passenger Status & Cancellation Helper
 * Used to ensure cancelled passengers or bookings never enter active allocations.
 */

export function isPassengerCancelled(passenger: any, booking?: any): boolean {
  if (!passenger && !booking) return false;

  // Check parent booking status if provided
  if (booking) {
    const bookingStatus = String(booking.status || booking.bookingStatus || "")
      .trim()
      .toUpperCase();
    if (
      bookingStatus === "CANCELLED" ||
      bookingStatus === "CANCELED" ||
      bookingStatus === "REFUNDED"
    ) {
      return true;
    }
  }

  // Extract passenger-level fields
  const p = passenger || {};
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

export function filterActivePassengers(passengers: any[]): any[] {
  if (!Array.isArray(passengers)) return [];
  return passengers.filter((p) => !isPassengerCancelled(p));
}
