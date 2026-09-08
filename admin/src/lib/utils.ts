import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: unknown): string {
  const amount = Number(value);
  return inrFormatter.format(Number.isFinite(amount) ? Math.round(amount) : 0);
}

export function allocateWholeRupees(
  total: unknown,
  recipientCount: number,
): number[] {
  const count = Math.max(1, Math.trunc(recipientCount) || 1);
  const numericTotal = Number(total);
  const roundedTotal = Number.isFinite(numericTotal)
    ? Math.round(numericTotal)
    : 0;
  const sign = roundedTotal < 0 ? -1 : 1;
  const absoluteTotal = Math.abs(roundedTotal);
  const baseAmount = Math.floor(absoluteTotal / count);
  const remainder = absoluteTotal % count;

  return Array.from(
    { length: count },
    (_, index) => sign * (baseAmount + (index < remainder ? 1 : 0)),
  );
}

export function safeFormatDate(
  dateVal: any,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = "N/A",
): string {
  if (!dateVal) return fallback;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);
  return date.toLocaleDateString(
    "en-IN",
    options || { day: "2-digit", month: "short", year: "numeric" },
  );
}

export function safeFormatDateTime(
  dateVal: any,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = "N/A",
): string {
  if (!dateVal) return fallback;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);
  return date.toLocaleDateString(
    "en-IN",
    options || {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  );
}

/** Booking created stamp like "27 Jun, 5:40 pm" */
export function formatBookingCreatedAt(
  dateVal: any,
  fallback: string = "",
): string {
  if (!dateVal) return fallback;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return fallback;
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
}

export function formatDate(dateVal: any, fallback: string = "N/A"): string {
  if (!dateVal) return fallback;
  const clean =
    typeof dateVal === "string" ? dateVal : dateVal?.date || String(dateVal);
  const date = new Date(clean);
  if (isNaN(date.getTime())) return String(clean);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const TRAIN_TICKET_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  BOOKED: "bg-green-100 text-green-700",
  ISSUED: "bg-green-100 text-green-700",
  WAITLISTED: "bg-[#FF4D00]/10 text-[#C2410C]",
  CONFIRMED: "bg-green-100 text-green-700",
  RAC: "bg-pink-100 text-pink-700",
  SELF_BOOKED: "bg-[#FF4D00]/10 text-[#C2410C]",
  NOT_REQUIRED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export const TRAIN_TICKET_APPROVAL_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  REOPENED: "bg-[#FF4D00]/10 text-[#C2410C]",
};

export function getUpcomingDefaultDates(
  count = 6,
  startDaysFromNow = 7,
): string[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + startDaysFromNow + i * 7);
    return d.toISOString().split("T")[0];
  });
}

export function computeGst(
  basePrice: number,
  discount: number,
  gstRate: number,
): number {
  const rawGst = Math.max(0, basePrice - discount) * gstRate;
  return Math.round(rawGst);
}

