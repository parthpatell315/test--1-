import type { Booking } from "@/types";

type SalesAdminRef = {
  id?: string;
  name?: string | null;
  fullName?: string | null;
  email?: string | null;
};

/**
 * Resolve the display name for the booking executive / salesperson.
 * Prefer the salesAdmin relation (and normalized createdByName) over
 * stale URL/meta fields like salesPersonName ("Direct").
 */
export function resolveBookingExecutiveName(
  booking: Booking | null | undefined,
  adminMap?: Record<string, string>,
): string {
  if (!booking) return "Web Direct";

  const salesAdminId = (booking as any).salesAdminId as string | undefined;
  const salesAdminObj = (booking as any).salesAdmin as SalesAdminRef | undefined;

  if (salesAdminObj?.name?.trim()) return salesAdminObj.name.trim();
  if (salesAdminObj?.fullName?.trim()) return salesAdminObj.fullName.trim();
  if ((booking as any).salesAdminName?.trim?.())
    return String((booking as any).salesAdminName).trim();
  if (booking.createdByName?.trim()) return booking.createdByName.trim();

  if (
    (booking as any).assignedSalesPerson?.name &&
    String((booking as any).assignedSalesPerson.name).trim()
  ) {
    return String((booking as any).assignedSalesPerson.name).trim();
  }

  if (salesAdminId && adminMap?.[salesAdminId]) {
    return adminMap[salesAdminId];
  }

  if (salesAdminId) {
    return salesAdminId.startsWith("cm") || salesAdminId.length > 20
      ? "Sales Executive"
      : salesAdminId;
  }

  // Last resort: only use salesPersonName when it is a real person name
  const legacyName = String(
    (booking as any).salesPersonName || "",
  ).trim();
  if (
    legacyName &&
    !/^direct$/i.test(legacyName) &&
    !/^web\s*direct$/i.test(legacyName)
  ) {
    return legacyName;
  }

  return "Web Direct";
}
