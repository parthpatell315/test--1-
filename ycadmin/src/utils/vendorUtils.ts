/**
 * Generates or cleans up vendor codes for display.
 * Replaces raw Prisma CUIDs (e.g. cmslhrdo2001b52m1opzs1etu) with clean human-readable codes.
 */
export function getDisplayVendorCode(vendor: any): string {
  if (!vendor) return "VND-000";

  const rawCode = (vendor.vendorCode || "").toString().trim();
  
  // If a valid short vendor code was provided, return it
  if (
    rawCode &&
    !rawCode.toLowerCase().startsWith("cmsl") &&
    !rawCode.toLowerCase().startsWith("cuid") &&
    rawCode.length <= 20
  ) {
    return rawCode.toUpperCase();
  }

  // Derive a clean human-readable code: VND-[TYPE]-[CITY]-[SHORT_ID]
  const typeStr = (vendor.type || vendor.accommodationType || "").toUpperCase();
  let typePrefix = "VND";
  if (
    typeStr.includes("HOTEL") ||
    typeStr.includes("RESORT") ||
    typeStr.includes("HOMESTAY") ||
    typeStr.includes("CAMP") ||
    typeStr.includes("HOSTEL")
  ) {
    typePrefix = "ACC";
  } else if (typeStr.includes("TRANSPORT")) {
    typePrefix = "TRP";
  } else if (typeStr.includes("ACTIVITIES") || typeStr.includes("ACTIVITY")) {
    typePrefix = "ACT";
  } else if (typeStr.includes("RESTAURANT") || typeStr.includes("FOOD")) {
    typePrefix = "RST";
  } else if (typeStr.includes("GUIDE")) {
    typePrefix = "GDE";
  }

  const location = (vendor.city || vendor.location || vendor.name || "OPS")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const locPrefix = location.slice(0, 3) || "GEN";

  const rawId = (vendor.id || "").toString();
  const shortId = rawId.length >= 4 ? rawId.slice(-4).toUpperCase() : "01";

  return `VND-${typePrefix}-${locPrefix}-${shortId}`;
}
