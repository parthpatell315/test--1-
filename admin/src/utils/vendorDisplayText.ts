/**
 * Vendor payout cells must never render hotel-pricing JSON or `{` blobs.
 * Hotel notes / serviceDescription often store `{ __isHotelPricing, rates, allocations }`.
 */

export function collapseText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function looksLikeJsonBlob(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "object") return true;
  const text = String(value).trim();
  if (!text) return false;
  if (text.includes("__isHotelPricing")) return true;
  if (/"pricingMethod"\s*:/.test(text)) return true;
  if (/"doubleRate"\s*:/.test(text) || /"tripleRate"\s*:/.test(text) || /"quadRate"\s*:/.test(text)) {
    return true;
  }
  if (/"allocations"\s*:/.test(text) && /RoomsCount/.test(text)) return true;
  if (/^\s*[{\[]/.test(text)) return true;
  if (/[{[]/.test(text) && /"\s*:/.test(text)) return true;
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function isHotelPricing(value: unknown): boolean {
  const record = asRecord(value);
  if (!record) return false;
  if (record.__isHotelPricing) return true;
  const rates = record.rates;
  const allocations = record.allocations;
  if (record.pricingMethod && (rates || allocations)) return true;
  if (rates && typeof rates === "object") {
    const r = rates as Record<string, unknown>;
    if (r.doubleRate != null || r.tripleRate != null || r.quadRate != null) return true;
  }
  if (allocations && typeof allocations === "object") {
    const a = allocations as Record<string, unknown>;
    if (a.doubleRoomsCount != null || a.tripleRoomsCount != null || a.quadRoomsCount != null) {
      return true;
    }
  }
  if (record.doubleRoomsCount != null || record.tripleRoomsCount != null) {
    return Boolean(record.pricingMethod) || record.doubleRate != null;
  }
  return false;
}

function countPart(value: unknown, letter: string): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${Math.round(n)} ${letter}`;
}

function roomMixLabel(source: Record<string, unknown>): string {
  const alloc =
    source.allocations && typeof source.allocations === "object"
      ? (source.allocations as Record<string, unknown>)
      : source;
  return [
    countPart(alloc.doubleRoomsCount ?? alloc.doubleRooms, "D"),
    countPart(alloc.tripleRoomsCount ?? alloc.tripleRooms, "T"),
    countPart(alloc.quadRoomsCount ?? alloc.quadRooms, "Q"),
    countPart(alloc.extraPersonsCount ?? alloc.extraPersons, "E"),
  ]
    .filter(Boolean)
    .join(" / ");
}

function pricingMethodLabel(method: unknown): string {
  const normalized = String(method || "room-wise")
    .toLowerCase()
    .replace(/_/g, "-");
  if (normalized.includes("person") || normalized.includes("pax")) return "Per person";
  if (normalized === "per-room" || normalized === "perroom") return "Per room";
  return "Room-wise";
}

export function formatHotelPricingSummary(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const mix = roomMixLabel(record);
  const method = pricingMethodLabel(record.pricingMethod);
  if (mix) return `${method} · ${mix}`;
  const userNotes = collapseText(record.userNotes);
  if (userNotes && !looksLikeJsonBlob(userNotes)) return userNotes;
  if (isHotelPricing(record)) return method;
  return null;
}

export function fallbackServiceLabel(category: string | undefined | null): string {
  switch (String(category || "")) {
    case "Hotels":
      return "Hotel stay";
    case "Transport":
      return "Transport fleet";
    case "Guides":
      return "Guide assignment";
    case "Activities":
      return "Activity";
    default:
      return category || "Service";
  }
}

export function sanitizeDisplayText(value: unknown, fallback = ""): string {
  if (value == null || value === "") return fallback;
  const hotel = formatHotelPricingSummary(value);
  if (hotel) return hotel;
  if (looksLikeJsonBlob(value)) return fallback;
  const text = collapseText(value);
  return text || fallback;
}

/** Vendor / category / trip labels: drop JSON entirely, never substitute a pricing summary. */
export function sanitizePlainLabel(value: unknown, fallback = ""): string {
  if (value == null || value === "") return fallback;
  if (looksLikeJsonBlob(value)) return fallback;
  const text = collapseText(value);
  return text || fallback;
}

const CATEGORY_TAG = /\s*\((hotel|hotels|transport|guide|guides|activity|activities|vendor|misc|miscellaneous)\)\s*/gi;

export function stripCategoryTag(value: unknown): string {
  return collapseText(String(value || "").replace(CATEGORY_TAG, " "));
}

/** One display name everywhere: no ALL CAPS, no “(HOTEL)” suffix. */
export function formatVendorName(value: unknown, fallback = "Vendor"): string {
  let text = stripCategoryTag(sanitizePlainLabel(value));
  if (!text) return fallback;
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters && (letters === letters.toUpperCase() || letters === letters.toLowerCase())) {
    text = text
      .toLowerCase()
      .replace(/\b([a-z])/g, (match) => match.toUpperCase());
  }
  return text;
}

export function refineServiceAgainstVendor(description: unknown, vendorName?: unknown): string {
  const vendor = formatVendorName(vendorName, "").toLowerCase();
  const raw = stripCategoryTag(sanitizeDisplayText(description)).replace(/\s*[•|/]\s*/g, " · ");
  if (!raw) return "";
  return raw
    .split(/\s*·\s*/)
    .map((part) => collapseText(part))
    .filter((part) => {
      const token = part.toLowerCase();
      if (!token) return false;
      if (vendor && token === vendor) return false;
      if (vendor && vendor.includes(token) && token.length <= 18) return false;
      return true;
    })
    .join(" · ");
}

export function hotelServiceLine(record: {
  location?: unknown;
  numberOfRooms?: unknown;
  rooms?: unknown;
  roomType?: unknown;
  hotelName?: unknown;
  vendorName?: unknown;
  serviceDescription?: unknown;
}): string {
  const vendor = formatVendorName(record.hotelName || record.vendorName, "");
  const rooms = Number(record.numberOfRooms ?? record.rooms);
  const loc = sanitizePlainLabel(record.location);
  const roomType = sanitizePlainLabel(record.roomType);
  const parts: string[] = [];
  if (Number.isFinite(rooms) && rooms > 0) {
    parts.push(`${Math.round(rooms)} ${rooms === 1 ? "room" : "rooms"}`);
  }
  if (roomType && !/^(standard|hotel|custom(\s+prop.*)?)$/i.test(roomType)) {
    parts.push(roomType);
  }
  if (loc && !vendor.toLowerCase().includes(loc.toLowerCase())) {
    parts.push(loc);
  }
  const pricing = formatHotelPricingSummary(record.serviceDescription);
  if (!parts.length && pricing) return pricing;
  if (parts.length && pricing && !parts.join(" ").toLowerCase().includes(pricing.toLowerCase())) {
    parts.push(pricing);
  }
  return parts.join(" · ") || fallbackServiceLabel("Hotels");
}

export function extractBillReference(value: unknown, id?: string): string {
  const raw = collapseText(value);
  const matched = raw.match(/BILL-[A-Za-z0-9]+/i);
  if (matched) return `BILL-${matched[0].slice(5)}`;
  if (!looksLikeJsonBlob(value) && raw && raw.length <= 48 && !/^https?:\/\//i.test(raw) && !raw.includes("/uploads/")) {
    return raw;
  }
  if (id) return `BILL-${String(id).slice(-6)}`;
  return "";
}

export function formatVendorService(item: {
  id?: string;
  vendorName?: unknown;
  category?: unknown;
  serviceDescription?: unknown;
  billReference?: unknown;
  notes?: unknown;
  remarks?: unknown;
}): { primary: string; secondary: string; tooltip: string } {
  const vendor = formatVendorName(item.vendorName).toLowerCase();
  const category = sanitizePlainLabel(item.category);
  const rawDescription = item.serviceDescription ?? item.notes ?? item.remarks;
  const description = refineServiceAgainstVendor(rawDescription, item.vendorName);
  const reference = extractBillReference(item.billReference, item.id);
  const repeatsVendor = Boolean(description) && description.toLowerCase() === vendor;
  const repeatsCategory =
    Boolean(description) && Boolean(category) && description.toLowerCase() === category.toLowerCase();

  let primary = description;
  if (!primary || repeatsVendor || repeatsCategory) {
    primary = fallbackServiceLabel(category);
  }

  const secondary =
    reference &&
    reference !== primary &&
    reference.toLowerCase() !== vendor &&
    !looksLikeJsonBlob(reference)
      ? reference
      : "";

  const tooltip = [primary, secondary].filter((part, index, all) => part && all.indexOf(part) === index).join(" · ");
  return { primary, secondary, tooltip: tooltip || primary };
}
