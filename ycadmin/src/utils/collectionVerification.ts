export const TERMINAL_APPROVED = "APPROVED_FOUNDER";

const FOUNDER_ROLES = new Set(["superadmin", "super_admin", "founder"]);
const FINANCE_CONTROLLER_ROLES = new Set(["finance_controller"]);
const PROTECTED_FOUNDER_EMAILS = new Set(["hemal.patel@youthcamping.online"]);

export type CollectionDisplayStatus = "VERIFIED" | "PENDING" | "REJECTED";

export type CollectionVerifier = {
  role?: string | null;
  email?: string | null;
  permissions?: string[] | null;
  customPermissions?: string[] | null;
  isSuperuser?: boolean | null;
} | null | undefined;

function normalizeStatus(value?: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function isCollectionVerified(approvalStatus?: string | null): boolean {
  return normalizeStatus(approvalStatus) === TERMINAL_APPROVED;
}

export function isCollectionRejected(
  approvalStatus?: string | null,
  status?: string | null,
): boolean {
  return (
    normalizeStatus(approvalStatus) === "REJECTED" ||
    normalizeStatus(status) === "REJECTED"
  );
}

export function canonicalCollectionStatus(
  approvalStatus?: string | null,
  status?: string | null,
): CollectionDisplayStatus {
  if (isCollectionVerified(approvalStatus)) return "VERIFIED";
  if (isCollectionRejected(approvalStatus, status)) return "REJECTED";
  return "PENDING";
}

export function isCollectionPending(
  approvalStatus?: string | null,
  status?: string | null,
): boolean {
  return canonicalCollectionStatus(approvalStatus, status) === "PENDING";
}

function isProtectedFounderEmail(email?: string | null): boolean {
  if (!email) return false;
  return PROTECTED_FOUNDER_EMAILS.has(String(email).trim().toLowerCase());
}

export function canVerifyCollection(user: CollectionVerifier): boolean {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase().trim();
  if (FOUNDER_ROLES.has(role) || FINANCE_CONTROLLER_ROLES.has(role)) return true;
  if (isProtectedFounderEmail(user.email)) return true;
  return false;
}

/** Station cash stays Founder / superadmin / isSuperuser. Not Finance Controller. */
export function canApproveStationCash(user: CollectionVerifier): boolean {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase().trim();
  if (["superadmin", "super_admin", "founder"].includes(role)) return true;
  if (user.isSuperuser) return true;
  return isProtectedFounderEmail(user.email);
}

export function isEligibleCollectionAssignee(user: CollectionVerifier): boolean {
  return canVerifyCollection(user);
}

/** Only Founder or Finance Controller may verify a vendor payout. */
export function canReviewVendorPayout(user: CollectionVerifier): boolean {
  return canVerifyCollection(user);
}

export function canApproveVendorPayoutFounder(user: CollectionVerifier): boolean {
  return canReviewVendorPayout(user);
}
