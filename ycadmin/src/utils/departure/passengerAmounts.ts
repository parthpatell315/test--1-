/**
 * Allocate booking-level totals onto passenger rows for Departure Hub.
 * Payments are booking-level; we never dump the full group paid/due onto the lead
 * and label it "/ pax". Prefer per-person bookingItems when present.
 */

export type PassengerMoneyShare = {
  /** This passenger's share of booking total (from line items or equal split). */
  amount: number | null;
  /** Share of booking net paid (equal split when not passenger-allocated). */
  paidAmount: number | null;
  /** Share of booking remaining due. */
  balance: number | null;
  /** True when amount came from per-person line items (not equal split). */
  amountFromLineItems: boolean;
  /** True when paid/balance are equal shares of booking-level money. */
  paidIsBookingShare: boolean;
};

function safeNum(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned) return 0;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeCompareName(nameStr: string): string {
  if (!nameStr) return "";
  let clean = nameStr.toLowerCase().trim();
  if (clean.startsWith("mr. ")) clean = clean.substring(4).trim();
  else if (clean.startsWith("mrs. ")) clean = clean.substring(5).trim();
  else if (clean.startsWith("ms. ")) clean = clean.substring(4).trim();
  return clean;
}

/** Split `total` into `count` integer parts that sum exactly to `total`. */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const rounded = Math.round(safeNum(total));
  if (count === 1) return [rounded];
  const base = Math.floor(rounded / count);
  const parts = Array.from({ length: count }, () => base);
  let remainder = rounded - base * count;
  // Distribute remainder to the end so early rows stay stable.
  for (let i = count - 1; i >= 0 && remainder !== 0; i--) {
    const step = remainder > 0 ? 1 : -1;
    parts[i] += step;
    remainder -= step;
  }
  return parts;
}

function parseSourceMeta(booking: any): Record<string, any> {
  if (!booking) return {};
  let raw = booking.sourceMeta;
  while (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? raw : {};
}

export function getBookingItems(booking: any): any[] {
  const meta = parseSourceMeta(booking);
  const items = meta.bookingItems;
  return Array.isArray(items) ? items : [];
}

/** Extract `[Person Name]` suffix used on per-person booking line items. */
export function personNameFromItemLabel(name: string): string | null {
  if (!name) return null;
  const match = String(name).match(/\[([^\]]+)\]\s*$/);
  if (!match) return null;
  const inner = match[1].trim();
  return inner || null;
}

function activeItemContribution(item: any): number {
  const rate = safeNum(item?.rate);
  const qty = safeNum(item?.qty);
  if (qty === 0 && rate >= 0) return 0;
  const effectiveQty = qty === 0 && rate < 0 ? 1 : qty || 1;
  return rate * effectiveQty;
}

/**
 * Try to build per-passenger base amounts from bookingItems tagged with person names
 * (or personId). Returns null when items cannot be mapped cleanly.
 */
export function amountsFromBookingItems(
  items: any[],
  passengers: Array<{ name: string; isCancelled?: boolean; id?: string | null }>,
): number[] | null {
  const activeIdx: number[] = [];
  passengers.forEach((p, i) => {
    if (!p?.isCancelled) activeIdx.push(i);
  });
  if (activeIdx.length === 0) return null;

  const byNormName = new Map<string, number[]>();
  activeIdx.forEach((i) => {
    const key = normalizeCompareName(passengers[i].name || "");
    if (!key) return;
    const list = byNormName.get(key) || [];
    list.push(i);
    byNormName.set(key, list);
  });

  const raw = passengers.map(() => 0);
  let taggedHits = 0;

  const activeItems = (items || []).filter(
    (item) => activeItemContribution(item) !== 0 || safeNum(item?.qty) > 0,
  );

  activeItems.forEach((item) => {
    const contrib = activeItemContribution(item);
    if (contrib === 0) return;
    const tagged = personNameFromItemLabel(item?.name || "");
    if (!tagged) return;
    const key = normalizeCompareName(tagged);
    const idxs = byNormName.get(key);
    if (!idxs || idxs.length === 0) return;
    // If duplicate names, put full contrib on the first unmatched active slot.
    const target = idxs[0];
    raw[target] += contrib;
    taggedHits += 1;
  });

  if (taggedHits > 0) {
    const covered = activeIdx.filter((i) => raw[i] !== 0).length;
    // Accept if we covered at least one active pax and have some positive totals
    // (discounts-only coverage still scales via totalAmount later).
    if (covered >= 1) return raw;
  }

  // Aggregated package rows: same positive rate with qty == active pax count.
  const packageLike = activeItems.filter((item) => {
    const rate = safeNum(item?.rate);
    const qty = safeNum(item?.qty) || 1;
    const name = String(item?.name || "").toLowerCase();
    const isDiscount =
      rate < 0 ||
      item?.category === "discounts" ||
      name.includes("discount") ||
      name.includes("gst");
    return !isDiscount && rate > 0 && qty === activeIdx.length;
  });

  if (packageLike.length > 0) {
    const perPaxBase = packageLike.reduce(
      (sum, item) => sum + safeNum(item.rate),
      0,
    );
    const discountTotal = activeItems
      .filter((item) => {
        const rate = safeNum(item?.rate);
        const name = String(item?.name || "").toLowerCase();
        return (
          rate < 0 ||
          item?.category === "discounts" ||
          name.includes("discount")
        );
      })
      .reduce((sum, item) => sum + Math.abs(activeItemContribution(item)), 0);
    const perPaxDiscountParts = splitEvenly(discountTotal, activeIdx.length);
    activeIdx.forEach((passengerIdx, j) => {
      raw[passengerIdx] = perPaxBase - perPaxDiscountParts[j];
    });
    return raw;
  }

  return null;
}

/** Scale raw person bases so they sum to booking totalAmount (handles pre-GST items). */
function scaleToTotal(raw: number[], totalAmount: number, activeIdx: number[]): number[] {
  const out = raw.map((v) => Math.round(safeNum(v)));
  const activeSum = activeIdx.reduce((s, i) => s + out[i], 0);
  const target = Math.round(safeNum(totalAmount));
  if (activeIdx.length === 0) return out;
  if (activeSum <= 0 || target <= 0) {
    const parts = splitEvenly(target, activeIdx.length);
    activeIdx.forEach((i, j) => {
      out[i] = parts[j];
    });
    return out;
  }
  if (activeSum === target) return out;

  const scaled = activeIdx.map((i) => (out[i] / activeSum) * target);
  const rounded = scaled.map((v) => Math.round(v));
  let drift = target - rounded.reduce((s, v) => s + v, 0);
  for (let k = rounded.length - 1; k >= 0 && drift !== 0; k--) {
    const step = drift > 0 ? 1 : -1;
    rounded[k] += step;
    drift -= step;
  }
  activeIdx.forEach((i, j) => {
    out[i] = rounded[j];
  });
  return out;
}

function activePassengerIndexes(
  passengers: Array<{ isCancelled?: boolean }>,
): number[] {
  const activeIdx: number[] = [];
  passengers.forEach((p, i) => {
    if (!p?.isCancelled) activeIdx.push(i);
  });
  return activeIdx;
}

/**
 * When co-travelers are cancelled, booking.totalAmount may still include their
 * seat (e.g. stale sync 95k for Khushi). Prefer active per-person line items.
 * Do not proportionally shrink totals without line items — the stored total may
 * already exclude cancelled seats.
 */
export function resolveCancellationAdjustedTotals(params: {
  totalAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  passengers: Array<{ name: string; isCancelled?: boolean; id?: string | null }>;
  bookingItems?: any[] | null;
}): {
  totalAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  adjustedFromLineItems: boolean;
  fromItems: number[] | null;
  activeIdx: number[];
} {
  const netPaidAmount = Math.max(0, Math.round(safeNum(params.netPaidAmount)));
  const storedTotal = Math.max(0, Math.round(safeNum(params.totalAmount)));
  const storedRemaining = Math.max(0, Math.round(safeNum(params.remainingAmount)));
  const passengers = params.passengers || [];
  const activeIdx = activePassengerIndexes(passengers);
  const items = Array.isArray(params.bookingItems) ? params.bookingItems : [];
  const fromItems = amountsFromBookingItems(items, passengers);
  const hasCancelled = activeIdx.length < passengers.length;

  if (fromItems && hasCancelled && activeIdx.length > 0) {
    const itemSum = activeIdx.reduce(
      (s, i) => s + Math.round(safeNum(fromItems[i])),
      0,
    );
    const covered = activeIdx.every((i) => Math.round(safeNum(fromItems[i])) !== 0);
    // Stale booking.totalAmount still includes cancelled seat — trust line items.
    if (covered && itemSum > 0 && itemSum < storedTotal) {
      return {
        totalAmount: itemSum,
        netPaidAmount,
        remainingAmount: Math.max(0, itemSum - netPaidAmount),
        adjustedFromLineItems: true,
        fromItems,
        activeIdx,
      };
    }
  }

  return {
    totalAmount: storedTotal,
    netPaidAmount,
    remainingAmount: storedRemaining,
    adjustedFromLineItems: false,
    fromItems,
    activeIdx,
  };
}

export function allocateBookingPassengerAmounts(params: {
  totalAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  passengers: Array<{ name: string; isCancelled?: boolean; id?: string | null }>;
  bookingItems?: any[] | null;
}): PassengerMoneyShare[] {
  const { passengers } = params;
  const n = passengers.length;
  if (n === 0) return [];

  const adjusted = resolveCancellationAdjustedTotals(params);
  const {
    totalAmount,
    netPaidAmount,
    remainingAmount,
    fromItems,
    activeIdx,
  } = adjusted;

  const result: PassengerMoneyShare[] = passengers.map((p) =>
    p?.isCancelled
      ? {
          amount: null,
          paidAmount: null,
          balance: null,
          amountFromLineItems: false,
          paidIsBookingShare: true,
        }
      : {
          amount: 0,
          paidAmount: 0,
          balance: 0,
          amountFromLineItems: false,
          paidIsBookingShare: true,
        },
  );

  if (activeIdx.length === 0) return result;

  let amountParts: number[];

  if (fromItems) {
    // When we already trusted item sums for a cancelled booking, keep those
    // bases (scaleToTotal is a no-op when sums match).
    amountParts = scaleToTotal(fromItems, totalAmount, activeIdx);
    activeIdx.forEach((i) => {
      result[i].amount = amountParts[i];
      result[i].amountFromLineItems = true;
    });
  } else {
    const parts = splitEvenly(totalAmount, activeIdx.length);
    activeIdx.forEach((i, j) => {
      result[i].amount = parts[j];
      result[i].amountFromLineItems = false;
    });
  }

  const paidParts = splitEvenly(netPaidAmount, activeIdx.length);
  activeIdx.forEach((i, j) => {
    result[i].paidAmount = paidParts[j];
    result[i].paidIsBookingShare = true;
  });

  // Derive per-pax due from amount − paid. Even-splitting remainingAmount
  // erases unequal package prices (Khushi Excel rem 18500/18500/15500).
  const targetDue = Math.round(safeNum(remainingAmount));
  const dueParts = activeIdx.map((i) => {
    const amt = Math.round(safeNum(result[i].amount));
    const paid = Math.round(safeNum(result[i].paidAmount));
    return amt - paid;
  });
  let dueDrift = targetDue - dueParts.reduce((s, v) => s + v, 0);
  for (let k = dueParts.length - 1; k >= 0 && dueDrift !== 0; k--) {
    const step = dueDrift > 0 ? 1 : -1;
    dueParts[k] += step;
    dueDrift -= step;
  }
  activeIdx.forEach((i, j) => {
    result[i].balance = dueParts[j];
  });

  return result;
}

export type BookingPassengerMoneyAllocation = {
  shares: PassengerMoneyShare[];
  totalAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  adjustedFromLineItems: boolean;
};

/** Allocate + return cancellation-adjusted group totals for Departure Hub headers. */
export function allocatePassengerMoneyWithGroupTotals(params: {
  totalAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  passengers: Array<{ name: string; isCancelled?: boolean; id?: string | null }>;
  bookingItems?: any[] | null;
}): BookingPassengerMoneyAllocation {
  const adjusted = resolveCancellationAdjustedTotals(params);
  // Pass original params — allocate resolves cancellation once internally.
  const shares = allocateBookingPassengerAmounts(params);
  return {
    shares,
    totalAmount: adjusted.totalAmount,
    netPaidAmount: adjusted.netPaidAmount,
    remainingAmount: adjusted.remainingAmount,
    adjustedFromLineItems: adjusted.adjustedFromLineItems,
  };
}

/** Convenience: allocate using booking.sourceMeta.bookingItems + financial summary. */
export function allocatePassengerAmountsForBooking(
  booking: any,
  passengers: Array<{ name: string; isCancelled?: boolean; id?: string | null }>,
  financials: {
    totalAmount: number;
    netPaidAmount: number;
    remainingAmount: number;
  },
): PassengerMoneyShare[] {
  return allocateBookingPassengerAmounts({
    ...financials,
    passengers,
    bookingItems: getBookingItems(booking),
  });
}

export function allocatePassengerMoneyForBookingWithTotals(
  booking: any,
  passengers: Array<{ name: string; isCancelled?: boolean; id?: string | null }>,
  financials: {
    totalAmount: number;
    netPaidAmount: number;
    remainingAmount: number;
  },
): BookingPassengerMoneyAllocation {
  return allocatePassengerMoneyWithGroupTotals({
    ...financials,
    passengers,
    bookingItems: getBookingItems(booking),
  });
}
