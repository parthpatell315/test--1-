/**
 * Helpers for Accounting tab group vs per-person line items.
 */

export function personTagFromItemName(name: string): string | null {
  if (!name) return null;
  const match = String(name).match(/\[([^\]]+)\]\s*$/);
  return match ? match[0] : null;
}

export function stripPersonTag(name: string): string {
  return String(name || "")
    .replace(/\s*\[[^\]]*\]\s*$/, "")
    .trim();
}

/** When editing a group row name, keep each original item's [Person] suffix. */
export function applyGroupNameToItems(
  items: Array<{ id: string; name?: string; [k: string]: any }>,
  originalIds: string[],
  cleanName: string,
) {
  const base = stripPersonTag(cleanName) || cleanName;
  return items.map((x) => {
    if (!originalIds.includes(x.id)) return x;
    const tag = personTagFromItemName(x.name || "");
    return {
      ...x,
      name: tag ? `${base} ${tag}` : base,
    };
  });
}

/**
 * Group qty edit across multiple per-person rows:
 * keep one active slot per original id at qty 1 when newQty matches count;
 * otherwise set first item to newQty and deactivate extras (legacy single-line),
 * but prefer redistributing as qty=1 across min(newQty, count) people.
 */
export function applyGroupQtyToItems(
  items: Array<{ id: string; qty?: number; rate?: number; [k: string]: any }>,
  originalIds: string[],
  newQty: number,
) {
  const qty = Math.max(0, Math.floor(Number(newQty) || 0));
  if (originalIds.length <= 1) {
    return items.map((x) =>
      x.id === originalIds[0] ? { ...x, qty } : x,
    );
  }

  // Prefer keeping per-person rows: activate first `qty` originals at qty 1.
  const activateCount = Math.min(qty, originalIds.length);
  const updated = items.map((x) => {
    const idx = originalIds.indexOf(x.id);
    if (idx < 0) return x;
    if (idx < activateCount) return { ...x, qty: 1 };
    return { ...x, qty: 0 };
  });

  // If group qty exceeds number of person rows, put remainder on the last active.
  if (qty > originalIds.length) {
    const lastId = originalIds[originalIds.length - 1];
    return updated.map((x) =>
      x.id === lastId ? { ...x, qty: qty - (originalIds.length - 1) } : x,
    );
  }

  return updated.filter((x) => (x.qty || 0) > 0 || (x.rate || 0) < 0);
}

export function aggregateBookingItemsForGroupView(
  items: Array<{
    id?: string;
    name?: string;
    rate?: number;
    qty?: number;
    category?: string;
  }>,
) {
  const groupMap = new Map<
    string,
    {
      key: string;
      name: string;
      category?: string;
      rate: number;
      qty: number;
      originalIds: string[];
    }
  >();

  (items || [])
    .filter((item) => (item.qty || 0) > 0 || (item.rate || 0) < 0)
    .forEach((item, idx) => {
      const cleanName =
        stripPersonTag(item.name || "")
          .replace(/^Transport\s*-\s*/i, "")
          .replace(/^Accommodation\s*-\s*Room\s*\d+:\s*/i, "")
          .replace(/^Accommodation\s*-\s*/i, "")
          .trim() || "Booking Option";
      const key = `${cleanName}__${item.rate || 0}`;
      const id = item.id || `item_${idx}`;
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.qty += item.qty || 1;
        existing.originalIds.push(id);
      } else {
        groupMap.set(key, {
          key,
          name: cleanName,
          category: item.category,
          rate: item.rate || 0,
          qty: item.qty || 1,
          originalIds: [id],
        });
      }
    });

  return Array.from(groupMap.values());
}
