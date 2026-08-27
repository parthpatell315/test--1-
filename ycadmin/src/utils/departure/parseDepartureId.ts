const DATE_SUFFIX_RE = /_(\d{4}-\d{2}-\d{2})$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedDepartureId =
  | { ok: true; tripId: string; departureDate: string }
  | { ok: false; reason: string };

function isValidCalendarDate(ymd: string): boolean {
  if (!ISO_DATE_RE.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Parse `{tripId}_{YYYY-MM-DD}` using the final date suffix so trip IDs may contain `_`. */
export function parseDepartureId(raw: string | null | undefined): ParsedDepartureId {
  const value = String(raw || "").trim();
  if (!value) {
    return { ok: false, reason: "missing_departure_id" };
  }
  const match = value.match(DATE_SUFFIX_RE);
  if (!match) {
    return { ok: false, reason: "missing_or_malformed_date" };
  }
  const departureDate = match[1];
  const tripId = value.slice(0, value.length - match[0].length).trim();
  if (!tripId) {
    return { ok: false, reason: "missing_trip_id" };
  }
  if (!isValidCalendarDate(departureDate)) {
    return { ok: false, reason: "malformed_date" };
  }
  return { ok: true, tripId, departureDate };
}

export function resolveDepartureIdentity(params: {
  departureId?: string | null;
  tripId?: string | null;
  departureDate?: string | null;
  date?: string | null;
}): ParsedDepartureId {
  const departureId = String(params.departureId || "").trim();
  if (departureId) {
    return parseDepartureId(departureId);
  }
  const tripId = String(params.tripId || "").trim();
  const departureDate = String(params.departureDate || params.date || "").trim();
  if (!tripId && !departureDate) {
    return { ok: false, reason: "missing_departure_id" };
  }
  if (!tripId) {
    return { ok: false, reason: "missing_trip_id" };
  }
  if (!departureDate || !isValidCalendarDate(departureDate)) {
    return { ok: false, reason: "malformed_date" };
  }
  return { ok: true, tripId, departureDate };
}
