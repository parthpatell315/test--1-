import { isCollectionVerified, isCollectionRejected } from "@/utils/collectionVerification";

/** Misc approval is Finance status only — never remarks text. */
export function isMiscExpenseApproved(row: {
  approvalStatus?: string | null;
  remarks?: string | null;
  status?: string | null;
}): boolean {
  if (isCollectionRejected(row.approvalStatus, row.status)) return false;
  return isCollectionVerified(row.approvalStatus);
}

export function deriveMiscApprovalUiStatus(row: {
  approvalStatus?: string | null;
  remarks?: string | null;
  status?: string | null;
}): "APPROVED" | "REJECTED" | "PENDING" {
  if (isCollectionRejected(row.approvalStatus, row.status)) return "REJECTED";
  if (isMiscExpenseApproved(row)) return "APPROVED";
  return "PENDING";
}

export function resolveMiscApproverDisplay(row: {
  approvalStatus?: string | null;
  remarks?: string | null;
  status?: string | null;
  paidBy?: string | null;
  approvedBy?: string | null;
}): string {
  if (deriveMiscApprovalUiStatus(row) !== "APPROVED") return "—";
  return row.approvedBy || "—";
}
