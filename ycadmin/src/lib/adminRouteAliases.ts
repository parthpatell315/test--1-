/**
 * Maps legacy / renamed admin paths to live routes.
 * Used by mobile nav, search, notifications, and dashboard deep links.
 */
export function resolveAdminRoute(path: string): string {
  if (!path) return "/admin";

  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);

  const exact: Record<string, string> = {
    "/admin/dashboard": "/admin",
    "/admin/staff-directory": "/admin/staff-profiles",
    "/admin/approval-center/incoming": "/admin/approvals-hub?tab=payment-approvals",
    "/admin/travel-desk/train-tickets": "/admin/travel-desk",
    "/admin/finance-control-center": "/admin/finance",
    "/admin/finance-verification":
      "/admin/approvals-hub?tab=payment-approvals",
    "/admin/verification-queue": "/admin/approvals-hub?tab=payment-approvals",
  };

  if (exact[pathname]) {
    return exact[pathname];
  }

  if (pathname.startsWith("/admin/approval-center/")) {
    return "/admin/approvals-hub?tab=payment-approvals";
  }

  if (pathname.startsWith("/admin/settings/users/")) {
    const id = pathname.slice("/admin/settings/users/".length);
    return id ? `/admin/staff-profiles/${id}` : "/admin/staff-profiles";
  }

  const listFallbacks: [string, string][] = [
    ["/admin/bookings/", "/admin/bookings"],
    ["/admin/inquiries/", "/admin/inquiries"],
    ["/admin/trips/", "/admin/trips"],
    ["/admin/vendors/", "/admin/vendors"],
    ["/admin/company-documents/", "/admin/company-documents"],
  ];

  for (const [prefix, target] of listFallbacks) {
    if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
      return target;
    }
  }

  if (pathname === "/admin/approvals-hub") {
    const tab = params.get("tab");
    const tabAliases: Record<string, string> = {
      "booking-verification": "payment-approvals",
      "ticket-approvals": "payment-approvals",
      verification: "payment-approvals",
      queue: "payment-approvals",
    };
    if (tab && tabAliases[tab]) {
      params.set("tab", tabAliases[tab]);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    }
  }

  if (pathname === "/admin/finance" || pathname === "/admin/accounting") {
    const tab = params.get("tab");
    const tabAliases: Record<string, string> = {
      "vendor-payments": "expenses",
      vendor_payments: "expenses",
    };
    if (tab && tabAliases[tab]) {
      params.set("tab", tabAliases[tab]);
      const qs = params.toString();
      const base = "/admin/finance";
      return qs ? `${base}?${qs}` : base;
    }
    if (pathname === "/admin/accounting") {
      const qs = params.toString();
      return qs ? `/admin/finance?${qs}` : "/admin/finance";
    }
  }

  return path;
}
