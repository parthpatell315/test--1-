import { opsOnlyRemark } from "./vendorFoodMenu";

export function normalizeOpsDayTitle(raw: string): string {
  const t = String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const m = t.match(/day\s*0*(\d+)/);
  return m ? `day ${m[1]}` : t;
}

export function opsDayDateKey(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

export function pickOpsDayRow<T extends { dayTitle?: string; date?: string | Date | null; remarks?: string | null; updatedAt?: string; createdAt?: string }>(
  rows: T[] | undefined,
  dayLabel: string,
  dateStr: string,
): T | undefined {
  if (!rows?.length) return undefined;
  const titleKey = normalizeOpsDayTitle(dayLabel);
  const dateKey = opsDayDateKey(dateStr);
  const matches = rows.filter((d) => {
    if (titleKey && normalizeOpsDayTitle(String(d.dayTitle || "")) === titleKey) return true;
    if (dateKey && opsDayDateKey(d.date) === dateKey) return true;
    return false;
  });
  if (matches.length === 0) return undefined;
  const sorted = [...matches].sort((a, b) =>
    String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")),
  );
  return sorted.find((d) => Boolean(opsOnlyRemark(d.remarks || ""))) || sorted[0];
}
