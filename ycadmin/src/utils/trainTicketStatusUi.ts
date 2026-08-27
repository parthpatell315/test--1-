/**
 * Train ticketing UI helpers for the booking Ticketing tab.
 *
 * Req/non-req is decided at booking confirmation time via:
 * - `trainTicketRequired` (explicit flag)
 * - `trainTicketStatus` set on confirm (PENDING / CONFIRMED / SELF_BOOKED / NOT_REQUIRED / …)
 *
 * Matches PassengerTimeline / PassengerDrawer conventions.
 */

const NON_REQUIRED_STATUSES = new Set([
  "NOT_REQUIRED",
  "NOT_BOOKED",
  "SELF_BOOKED",
  "SELF BOOKED",
]);

const ACTIVE_REQUIRED_STATUSES = new Set([
  "PENDING",
  "PENDING_VERIFICATION",
  "BOOKED",
  "WAITLISTED",
  "CONFIRMED",
  "RAC",
  "ISSUED",
  "DRAFT",
]);

/** Ticket work is complete for ops purposes. */
const DONE_STATUSES = new Set([
  "CONFIRMED",
  "BOOKED",
  "ISSUED",
  "SELF_BOOKED",
  "SELF BOOKED",
  "RAC",
  "WAITLISTED",
]);

/** Ultra-simple ops states shown in Ticketing UI. */
export type SimpleTrainTicketState = "DONE" | "NOT_DONE" | "NOT_REQUIRED";

export function normalizeTrainTicketStatus(status?: string | null): string {
  return String(status || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Map API ticketStatus → Done / Not done / Not required. */
export function toSimpleTrainTicketState(ticket: {
  ticketStatus?: string | null;
  status?: string | null;
} | null | undefined): SimpleTrainTicketState {
  const st = normalizeTrainTicketStatus(
    ticket?.ticketStatus || (ticket as any)?.status,
  );
  if (st === "NOT_REQUIRED" || st === "NOT_BOOKED") return "NOT_REQUIRED";
  if (DONE_STATUSES.has(st)) return "DONE";
  return "NOT_DONE";
}

export function simpleTrainTicketStateLabel(
  state: SimpleTrainTicketState,
): string {
  if (state === "DONE") return "Done";
  if (state === "NOT_REQUIRED") return "Not required";
  return "Not done";
}

/**
 * Map simple UI state → API ticketStatus.
 * When the simple bucket is unchanged, keep the previous API value
 * (e.g. ISSUED stays ISSUED instead of forcing CONFIRMED).
 */
export function simpleTrainTicketStateToApi(
  state: SimpleTrainTicketState,
  previousApiStatus?: string | null,
): string {
  const prev = normalizeTrainTicketStatus(previousApiStatus);
  const prevSimple = toSimpleTrainTicketState({ ticketStatus: prev || null });
  if (prev && prevSimple === state && prev !== "CANCELLED") {
    return prev;
  }
  if (state === "DONE") return "CONFIRMED";
  if (state === "NOT_REQUIRED") return "NOT_REQUIRED";
  return "PENDING";
}

/**
 * Whether company/ops must issue a train ticket for this booking.
 * Prefer flags written at confirmation; fall back to status vocabulary.
 */
export function isTrainTicketRequired(booking: {
  trainTicketRequired?: boolean | null;
  trainTicketStatus?: string | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!booking) return false;

  const ticketStatus = normalizeTrainTicketStatus(booking.trainTicketStatus);

  if (booking.trainTicketRequired === false) return false;
  if (NON_REQUIRED_STATUSES.has(ticketStatus)) return false;
  if (booking.trainTicketRequired === true) return true;
  if (ACTIVE_REQUIRED_STATUSES.has(ticketStatus)) return true;

  // Confirmed bookings historically defaulted trainTicketStatus to PENDING at confirm.
  const bookingStatus = String(booking.status || "").toLowerCase();
  if (bookingStatus === "confirmed" && ticketStatus && ticketStatus !== "NOT_REQUIRED") {
    return true;
  }

  return false;
}

export function trainTicketRequirementLabel(
  booking: Parameters<typeof isTrainTicketRequired>[0],
): "req" | "non-req" {
  return isTrainTicketRequired(booking) ? "req" : "non-req";
}

export function isTrainTicketDone(ticket: {
  ticketStatus?: string | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!ticket) return false;
  const st = normalizeTrainTicketStatus(
    ticket.ticketStatus || (ticket as any).status,
  );
  return DONE_STATUSES.has(st);
}

/** Human label for row status — Done / Not done / Not required (or Cancelled). */
export function trainTicketProgressLabel(ticket: {
  ticketStatus?: string | null;
  status?: string | null;
} | null | undefined): string {
  if (!ticket) return "Not done";
  const st = normalizeTrainTicketStatus(
    ticket.ticketStatus || (ticket as any).status,
  );
  if (st === "CANCELLED") return "Cancelled";
  return simpleTrainTicketStateLabel(toSimpleTrainTicketState(ticket));
}

/**
 * Group / summary train icon: green when ticketing is clear, red when work remains.
 * Non-req bookings are treated as clear (green).
 */
export function isGroupTrainTicketingDone(
  booking: Parameters<typeof isTrainTicketRequired>[0],
  tickets: Array<{ ticketStatus?: string | null; status?: string | null }> = [],
): boolean {
  if (!isTrainTicketRequired(booking)) return true;

  const live = tickets.filter((t) => {
    const st = normalizeTrainTicketStatus(
      t.ticketStatus || (t as any).status,
    );
    return st !== "CANCELLED";
  });

  if (live.length === 0) return false;
  return live.every((t) => isTrainTicketDone(t));
}

export function normalizeTravelerName(name?: string | null): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** null / empty / DEPARTURE → DEPARTURE; RETURN stays RETURN. */
export function normalizeJourneyRef(ref?: string | null): "DEPARTURE" | "RETURN" {
  const r = String(ref || "")
    .trim()
    .toUpperCase();
  return r === "RETURN" ? "RETURN" : "DEPARTURE";
}

function scoreTicketForDedupe(ticket: {
  ticketStatus?: string | null;
  status?: string | null;
  pnr?: string | null;
  trainNumber?: string | null;
  trainName?: string | null;
  seatNumber?: string | null;
  coach?: string | null;
  sourceStation?: string | null;
  destinationStation?: string | null;
  createdAt?: string | null;
  supersededByTicketId?: string | null;
}): number {
  const st = normalizeTrainTicketStatus(
    ticket.ticketStatus || (ticket as any).status,
  );
  if (st === "CANCELLED" || ticket.supersededByTicketId) return -1;

  let score = 0;
  if (DONE_STATUSES.has(st)) score += 1000;
  if (ticket.pnr && String(ticket.pnr).trim()) score += 100;
  if (ticket.trainNumber || ticket.trainName) score += 50;
  if (ticket.seatNumber || ticket.coach) score += 20;
  if (ticket.sourceStation || ticket.destinationStation) score += 10;
  const created = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0;
  score += Math.max(0, 1_000_000_000_000 - created) / 1_000_000_000_000;
  return score;
}

/**
 * One active ticket per traveler per journey. Drops cancelled / superseded.
 * Belt-and-suspenders for Ticketing UI when API still returns ghosts.
 */
export function dedupeActiveTicketsPerTraveler<
  T extends {
    id?: string;
    travelerName?: string | null;
    passengerReference?: string | null;
    ticketStatus?: string | null;
    status?: string | null;
    pnr?: string | null;
    trainNumber?: string | null;
    trainName?: string | null;
    seatNumber?: string | null;
    coach?: string | null;
    sourceStation?: string | null;
    destinationStation?: string | null;
    createdAt?: string | null;
    supersededByTicketId?: string | null;
  },
>(tickets: T[] = []): T[] {
  const byKey = new Map<string, T>();
  for (const t of tickets) {
    const st = normalizeTrainTicketStatus(
      t.ticketStatus || (t as any).status,
    );
    if (st === "CANCELLED" || t.supersededByTicketId) continue;
    const key = `${normalizeTravelerName(t.travelerName)}|${normalizeJourneyRef(t.passengerReference)}`;
    const existing = byKey.get(key);
    if (!existing || scoreTicketForDedupe(t) > scoreTicketForDedupe(existing)) {
      byKey.set(key, t);
    }
  }
  return Array.from(byKey.values());
}
