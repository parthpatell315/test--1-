import { isCollectionVerified } from "@/utils/collectionVerification";

export type MappedVendorRow = {
  id?: string;
  name?: string;
  vendorType?: string;
  category?: string;
  vendorId?: any;
  sourceId?: string;
  sourceType?: string;
  agreedCost?: number;
  paidAmount?: number;
  balanceDue?: number;
  paymentStatus?: string;
  financeVerified?: boolean;
  rawAssignment?: any;
  [key: string]: any;
};

/** Stable identity for ops/finance vendor rows. Never display name. */
export function vendorStableKey(row: {
  id?: string | null;
  vendorId?: any;
  sourceId?: string | null;
  sourceType?: string | null;
  category?: string | null;
}): string | null {
  const sourceId = row.sourceId != null ? String(row.sourceId).trim() : "";
  const sourceType = row.sourceType != null ? String(row.sourceType).trim() : "";
  if (sourceType && sourceId) return `${sourceType}:${sourceId}`;
  const id = row.id != null ? String(row.id).trim() : "";
  if (id) return `row:${id}`;
  const vid =
    typeof row.vendorId === "object" && row.vendorId
      ? String(row.vendorId.id || row.vendorId.vendorId || "").trim()
      : String(row.vendorId || "").trim();
  if (vid) return `vendor:${vid}`;
  return null;
}

export function opsRecordedPaymentStatus(paid: number, agreed: number): string {
  if (agreed > 0 && paid >= agreed) return "ops_recorded";
  if (paid > 0) return "advance_paid";
  return "pending";
}

export function mergeOpsVendorPayments(
  mappedVendors: MappedVendorRow[],
  recordedPayments: any[],
): MappedVendorRow[] {
  const merged = [...mappedVendors];
  const indexByKey = new Map<string, number>();
  merged.forEach((v, idx) => {
    const key = vendorStableKey(v);
    if (key && !indexByKey.has(key)) indexByKey.set(key, idx);
  });

  (recordedPayments || []).forEach((vp: any) => {
    const vpId = vp.id != null ? String(vp.id) : "";
    const key =
      vendorStableKey({
        id: vp.sourceId || vp.assignmentId || vp.opsHotelBookingId || vp.opsTransportId || vp.opsGuideId,
        sourceId: vp.sourceId || vp.assignmentId || vp.hotelBookingId || vp.fleetBookingId || vp.guideId,
        sourceType: vp.sourceType || vp.category,
        vendorId: vp.vendorId,
      }) || (vpId ? `payment:${vpId}` : null);
    if (!key) return;

    const agreed = Number(vp.agreedAmount || 0);
    const paid = Number(vp.advancePaid || 0);
    const financeVerified = isCollectionVerified(vp.approvalStatus);
    const existingIdx = indexByKey.get(key);

    if (existingIdx != null && existingIdx >= 0) {
      const row = merged[existingIdx];
      row.agreedCost = Math.max(Number(row.agreedCost || 0), agreed);
      row.paidAmount = Math.max(Number(row.paidAmount || 0), paid);
      row.balanceDue = Math.max(0, Number(row.agreedCost || 0) - Number(row.paidAmount || 0));
      row.paymentStatus = opsRecordedPaymentStatus(
        Number(row.paidAmount || 0),
        Number(row.agreedCost || 0),
      );
      row.financeVerified = Boolean(row.financeVerified) || financeVerified;
      return;
    }

    const cat = String(vp.category || "").toLowerCase();
    const vType = cat.includes("hotel")
      ? "hotel"
      : cat.includes("transport")
        ? "transport"
        : cat.includes("guide")
          ? "guide"
          : "vendor";
    merged.push({
      id: vpId || key,
      name: vp.vendorName || "Vendor",
      vendorType: vType,
      category: vp.category || "Vendors",
      vendorId: vp.vendorId,
      sourceId: vp.sourceId || vp.assignmentId || vpId,
      sourceType: vp.sourceType || vp.category,
      agreedCost: agreed,
      paidAmount: paid,
      balanceDue: Math.max(0, agreed - paid),
      paymentStatus: opsRecordedPaymentStatus(paid, agreed),
      financeVerified,
      rawAssignment: vp,
    });
    indexByKey.set(key, merged.length - 1);
  });

  return merged;
}
