/**
 * Normalize any booking/departure timestamp to an India calendar date key (YYYY-MM-DD).
 * Matches backend normalizeDepartureDateIndia used in ops controllers.
 */
export function toDepartureDateKey(
  dateInput: string | Date | null | undefined,
): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function isSameDepartureDate(
  bookingDate: string | Date | null | undefined,
  departureDateStr: string,
): boolean {
  if (!departureDateStr) return false;
  return toDepartureDateKey(bookingDate) === toDepartureDateKey(departureDateStr);
}
