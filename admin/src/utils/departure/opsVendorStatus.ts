import { isCollectionVerified } from "@/utils/collectionVerification";

/** Labels for trip-control / export. Ops recorded ≠ Finance verified. */
export function vendorPayoutExportStatus(row: {
  total?: number;
  paid?: number;
  due?: number;
  approvalStatus?: string | null;
  financeVerified?: boolean;
}): string {
  if (row.financeVerified || isCollectionVerified(row.approvalStatus)) {
    return "Finance verified";
  }
  const due = Number(row.due ?? Math.max(0, Number(row.total || 0) - Number(row.paid || 0)));
  const paid = Number(row.paid || 0);
  if (due === 0 && Number(row.total || 0) > 0) return "Ops recorded";
  if (paid > 0) return "Ops partial";
  return "Due";
}
