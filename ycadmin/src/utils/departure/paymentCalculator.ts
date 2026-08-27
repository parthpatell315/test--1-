/**
 * Financial & Payment Status Calculator Utility
 * Departure Hub collected money matches booking Payments CLEARED rules
 * (isClearedReceipt): founder-approved ops receipts, or legacy Payment rows
 * with success status and no approval workflow.
 */

import { isClearedReceipt } from "@/utils/paymentUtils";

export type CanonicalPaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "OVERPAID"
  | "REFUNDED"
  | "CANCELLED";

export interface BookingFinancialSummary {
  totalAmount: number;
  paidAmount: number;
  refundAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  overpaymentAmount: number;
  paymentStatus: CanonicalPaymentStatus;
}

export function safeNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "").trim();
    if (!cleaned) return 0;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function calculateBookingFinancialStatus(booking: any): BookingFinancialSummary {
  if (!booking) {
    return {
      totalAmount: 0,
      paidAmount: 0,
      refundAmount: 0,
      netPaidAmount: 0,
      remainingAmount: 0,
      overpaymentAmount: 0,
      paymentStatus: "UNPAID",
    };
  }

  // Check booking cancellation state
  const bookingStatus = String(booking.status || booking.bookingStatus || "")
    .trim()
    .toUpperCase();
  const isCancelled =
    bookingStatus === "CANCELLED" ||
    bookingStatus === "CANCELED" ||
    booking.isCancelled === true;

  // Determine total amount
  const totalAmount = Math.max(
    0,
    safeNumber(booking.totalAmount || booking.amount || booking.price || booking.totalPrice)
  );

  let paidAmount = 0;
  let refundAmount = 0;

  // Prefer OpsClientPayment when any cleared ops receipt exists. Legacy Payment
  // rows are often the same advance keyed by internal booking cuid; summing both
  // double-counts (e.g. 5k ops + 5k legacy → Paid 10k / rem 13k on a 23k booking).
  const opsRows = Array.isArray(booking.opsClientPayments)
    ? booking.opsClientPayments
    : [];
  const legacyRows = Array.isArray(booking.payments) ? booking.payments : [];
  const hasClearedOps = opsRows.some((p: any) => isClearedReceipt(p));
  const receiptRows = hasClearedOps ? opsRows : legacyRows;
  const seen = new Set<string>();
  receiptRows.forEach((p: any) => {
    const key = String(p?.id || `${p?.amount}-${p?.approvalStatus}-${p?.createdAt || ""}`);
    if (seen.has(key)) return;
    seen.add(key);
    // Same clearance rule as BookingDetailsView Payments CLEARED tab.
    if (!isClearedReceipt(p)) return;
    const pAmt = safeNumber(p.amount || p.paidAmount);
    const pType = String(p.type || p.entryType || "").toUpperCase();
    if (pType.includes("REFUND") || pAmt < 0) {
      refundAmount += Math.abs(pAmt);
    } else {
      paidAmount += Math.max(0, pAmt);
    }
  });

  const netPaidAmount = Math.max(0, paidAmount - refundAmount);

  let remainingAmount = 0;
  let overpaymentAmount = 0;

  if (netPaidAmount > totalAmount && totalAmount > 0) {
    overpaymentAmount = netPaidAmount - totalAmount;
    remainingAmount = 0;
  } else {
    remainingAmount = Math.max(0, totalAmount - netPaidAmount);
  }

  // Determine Canonical Status
  let paymentStatus: CanonicalPaymentStatus = "UNPAID";

  if (isCancelled) {
    paymentStatus = "CANCELLED";
  } else if (refundAmount > 0 && netPaidAmount === 0) {
    paymentStatus = "REFUNDED";
  } else if (overpaymentAmount > 0) {
    paymentStatus = "OVERPAID";
  } else if (netPaidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = "PAID";
  } else if (netPaidAmount > 0) {
    paymentStatus = "PARTIAL";
  } else {
    paymentStatus = "UNPAID";
  }

  return {
    totalAmount,
    paidAmount,
    refundAmount,
    netPaidAmount,
    remainingAmount,
    overpaymentAmount,
    paymentStatus,
  };
}
