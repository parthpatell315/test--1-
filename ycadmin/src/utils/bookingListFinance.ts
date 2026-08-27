import { sumReceipts } from "@/utils/paymentUtils";

/**
 * Booking list / card due amount aligned with Payments CLEARED receipts
 * when receipt rows are present on the booking payload.
 */
export function bookingListDueAmount(booking: {
  totalAmount?: number | null;
  advancePaid?: number | null;
  remainingAmount?: number | null;
  payments?: Array<{ amount?: number; status?: string; approvalStatus?: string }>;
  opsClientPayments?: Array<{
    amount?: number;
    status?: string;
    approvalStatus?: string;
  }>;
}): number {
  const total = Math.max(0, Number(booking?.totalAmount) || 0);
  const ops = Array.isArray(booking?.opsClientPayments)
    ? booking.opsClientPayments
    : [];
  const legacy = Array.isArray(booking?.payments) ? booking.payments : [];
  const opsCleared = sumReceipts(ops, "success");
  const receipts = opsCleared > 0 ? ops : legacy;
  if (receipts.length > 0) {
    const cleared = sumReceipts(receipts, "success");
    if (cleared > 0) return Math.max(0, total - cleared);
  }
  if (booking?.remainingAmount != null) {
    return Math.max(0, Number(booking.remainingAmount) || 0);
  }
  return Math.max(0, total - (Number(booking?.advancePaid) || 0));
}

export function bookingListPaidAmount(booking: {
  totalAmount?: number | null;
  advancePaid?: number | null;
  payments?: Array<{ amount?: number; status?: string; approvalStatus?: string }>;
  opsClientPayments?: Array<{
    amount?: number;
    status?: string;
    approvalStatus?: string;
  }>;
}): number {
  const total = Math.max(0, Number(booking?.totalAmount) || 0);
  const due = bookingListDueAmount(booking);
  const ops = Array.isArray(booking?.opsClientPayments)
    ? booking.opsClientPayments
    : [];
  const legacy = Array.isArray(booking?.payments) ? booking.payments : [];
  const opsCleared = sumReceipts(ops, "success");
  const fromReceipts = sumReceipts(opsCleared > 0 ? ops : legacy, "success");
  if (fromReceipts > 0) return fromReceipts;
  if (booking?.advancePaid != null) return Math.max(0, Number(booking.advancePaid) || 0);
  return Math.max(0, total - due);
}
