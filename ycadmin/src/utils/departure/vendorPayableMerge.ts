/** Merge hotel/fleet assignment rows with OpsVendorPayment without double-counting. */

function txnLooksRecorded(txn: unknown): boolean {
  const id = String(txn || "").trim();
  if (!id || id === "N/A") return false;
  if (id === "AUTO-SYNC" || id === "HOTEL-ADVANCE") return false;
  return true;
}

export function hasRecordedVendorPayout(row: {
  transactionId?: string | null;
  history?: Array<{ txnId?: string; transactionId?: string; amount?: number }>;
} | null | undefined): boolean {
  if (!row) return false;
  if (txnLooksRecorded(row.transactionId)) return true;
  return (row.history || []).some((h) => txnLooksRecorded(h?.txnId || h?.transactionId) && Number(h?.amount || 0) > 0);
}

export function combineVendorPayableTotals(
  existing: {
    agreedAmount?: number;
    advancePaid?: number;
    transactionId?: string | null;
    history?: Array<{ txnId?: string; transactionId?: string; amount?: number }>;
  },
  incoming: { agreed: number; paid: number },
  isSameRecord: boolean,
): { agreedAmount: number; advancePaid: number } {
  const shouldAddDistinctAssignments =
    !isSameRecord && !hasRecordedVendorPayout(existing);

  if (shouldAddDistinctAssignments) {
    return {
      agreedAmount: Number(existing.agreedAmount || 0) + incoming.agreed,
      advancePaid: Number(existing.advancePaid || 0) + incoming.paid,
    };
  }

  return {
    agreedAmount: Math.max(Number(existing.agreedAmount || 0), incoming.agreed),
    advancePaid: Math.max(Number(existing.advancePaid || 0), incoming.paid),
  };
}
