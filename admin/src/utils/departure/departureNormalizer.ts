/**
 * Departure Normalizer Utility
 * Standardizes departure identification and context.
 */

export interface DepartureContext {
  departureId: string;
  tripId: string;
  departureDate: string;
}

export function getDepartureId(record: any): string {
  if (!record) return "";
  if (typeof record === "string") return record.trim();

  const depId = record.departureId || record.id || record.code;
  if (depId && String(depId).trim() !== "" && String(depId) !== "undefined") {
    return String(depId).trim();
  }

  const tripId = record.tripId || "";
  const dateStr = record.departureDate ? String(record.departureDate).substring(0, 10) : "";

  if (tripId && dateStr) {
    return `${tripId}_${dateStr}`;
  }

  return "";
}

export function resolveDepartureContext(
  departureIdParam?: string | null,
  tripIdParam?: string | null,
  departureDateParam?: string | null
): DepartureContext {
  let tripId = tripIdParam || "SPT-1";
  let departureDate = departureDateParam || "2026-08-18";
  let departureId = departureIdParam || `${tripId}_${departureDate}`;

  if (departureIdParam && departureIdParam.includes("_")) {
    const idx = departureIdParam.indexOf("_");
    tripId = departureIdParam.substring(0, idx);
    departureDate = departureIdParam.substring(idx + 1);
  }

  return {
    departureId,
    tripId,
    departureDate,
  };
}
