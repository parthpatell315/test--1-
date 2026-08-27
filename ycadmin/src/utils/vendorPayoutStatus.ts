export type VendorPayoutQueueLabel =
  | "Rejected"
  | "Settled"
  | "Reviewed"
  | "Overpaid"
  | "Pending";

/**
 * Operational status "Paid" only means the invoice remaining is zero.
 * Finance still must FC-review / founder-verify before the bill is Settled.
 */
export function vendorPayoutQueueLabel(item: {
  approvalStatus?: string;
  status?: string;
  isOverpaid?: boolean;
}): VendorPayoutQueueLabel {
  const approval = String(item.approvalStatus || "").toUpperCase();
  const status = String(item.status || "").toUpperCase();
  if (approval === "REJECTED" || status === "REJECTED") return "Rejected";
  if (approval === "APPROVED_FOUNDER") return "Settled";
  if (approval === "REVIEWED_FINANCE_CONTROLLER") return "Reviewed";
  if (item.isOverpaid) return "Overpaid";
  return "Pending";
}
