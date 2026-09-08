export type PermissionKey =
  | "dashboard.view"
  | "trips.view"
  | "trips.create"
  | "trips.edit"
  | "trips.publish"
  | "trips.archive"
  | "trips.delete"
  | "bookings.view"
  | "bookings.create"
  | "bookings.edit"
  | "bookings.approve"
  | "bookings.reject"
  | "bookings.verify"
  | "payments.view"
  | "payments.edit"
  | "inquiries.view"
  | "inquiries.create"
  | "inquiries.edit"
  | "quotations.view"
  | "quotations.create"
  | "quotations.edit"
  | "customers.view"
  | "customers.export"
  | "customers.timeline.view"
  | "seo.view"
  | "seo.edit"
  | "guides.view"
  | "guides.manage"
  | "operations.view"
  | "operations.edit"
  | "ops.view"
  | "ops.manage"
  | "ops.allocate"
  | "ops.checklist"
  | "vendors.view"
  | "vendors.create"
  | "vendors.edit"
  | "vendors.import"
  | "reports.view"
  | "reports.export"
  | "users.view"
  | "users.manage"
  | "roles.manage"
  | "staff_profiles.view"
  | "staff_profiles.manage"
  | "roles_permissions.manage"
  | "payroll.view"
  | "payroll.manage"
  | "attendance.view"
  | "attendance.manage"
  | "marketing.social"
  | "accounting.view"
  | "accounting.submit"
  | "accounting.approve"
  | "finance.control_center.view"
  | "finance.incoming.verify"
  | "finance.incoming.approve"
  | "finance.cash.verify"
  | "finance.cash.approve"
  | "finance.cash.reject"
  | "finance.outgoing.verify"
  | "finance.outgoing.approve"
  | "finance.outgoing.pay"
  | "finance.tickets.verify"
  | "finance.tickets.approve"
  | "finance.refund.create"
  | "finance.refund.view"
  | "finance.refund.approve"
  | "finance.refund.reject"
  | "finance.credit.view"
  | "finance.credit.apply"
  | "finance.coupons.view"
  | "finance.coupons.manage"
  | "finance.ticketing.view"
  | "finance.ticketing.create"
  | "finance.ticketing.verify"
  | "finance.ticketing.approve"
  | "finance.ticketing.bulk"
  | "finance.services.view"
  | "finance.services.manage"
  | "finance.services.verify"
  | "finance.tasks.view"
  | "finance.tasks.manage"
  | "finance.tasks.comment"
  | "finance.audit.view"
  | "finance.audit.export"
  | "finance.accounting.view"
  | "finance.accounting.manage"
  | "finance.discrepancy.manage"
  | "finance.reports.export"
  | "tickets.view"
  | "tickets.create"
  | "tickets.edit"
  | "tickets.submit"
  | "tickets.approve"
  | "tickets.templates.manage"
  | "emails.view"
  | "emails.send"
  | "emails.manage_templates"
  | "company_documents.view"
  | "audit.view"
  | "hr.view"
  | "settings.view"
  | "settings.edit";

export function isFounder(
  user: { role?: string; email?: string | null; name?: string | null } | null,
): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  return (
    user.role === "superadmin" &&
    (email === "hemal.patel@youthcamping.online" || email.includes("hemal"))
  );
}

/**
 * Profit / margin / P&L visibility — Founder & Superadmin roles only.
 * Role-based (matches backend canViewProfit); no email hardcoding.
 * Distinct from isFounder() which gates Hemal-only Staff Profiles routes.
 */
export function canViewProfit(
  user: { role?: string; isSuperuser?: boolean } | null | undefined,
): boolean {
  if (!user) return false;
  const role = String(user.role || "")
    .toLowerCase()
    .trim();
  if (
    role === "superadmin" ||
    role === "super_admin" ||
    role === "founder" ||
    role === "owner"
  ) {
    return true;
  }
  return user.isSuperuser === true;
}
