import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } from "./permissions";
import { generalWidgets } from "@/modules/general/general.widgets";
import { DASHBOARD_WIDGET_REGISTRY } from "@/config/dashboardWidgetRegistry";

/** Mirrors DashboardPage visibleWidgets filter. */
function visibleDashboardWidgets(
  userPerms: readonly string[],
  userRole?: string,
) {
  return DASHBOARD_WIDGET_REGISTRY.filter(
    (w) => !w.permission || hasPermission(userPerms, w.permission, userRole),
  );
}

describe("announcements dashboard widget permissions", () => {
  const announcementsWidget = generalWidgets.find((w) => w.id === "announcements");

  it("registers announcements without a view-permission gate", () => {
    expect(announcementsWidget).toBeDefined();
    expect(announcementsWidget?.permission).toBeUndefined();
  });

  it("shows announcements to operations even when customPermissions omit announcements.view", () => {
    const customWithoutAnnouncements = [
      "dashboard.view",
      "operations.view",
      "bookings.view",
    ];
    const visible = visibleDashboardWidgets(
      customWithoutAnnouncements,
      "operations",
    );
    expect(visible.some((w) => w.id === "announcements")).toBe(true);
  });

  it("shows announcements for unknown role names with no announcements.view grant", () => {
    // Role alias / legacy labels that miss ROLE_PERMISSIONS still see the widget.
    const visible = visibleDashboardWidgets([], "ops");
    expect(visible.some((w) => w.id === "announcements")).toBe(true);
  });

  it("still grants announcements.view on staff role maps (API / legacy callers)", () => {
    const staffRoles = [
      "operations",
      "sales",
      "finance",
      "finance_controller",
      "admin",
      "guide",
      "viewer",
      "booking_verifier",
    ];

    for (const role of staffRoles) {
      expect(
        ROLE_PERMISSIONS[role]?.includes(PERMISSIONS.ANNOUNCEMENTS_VIEW),
        `${role} should include announcements.view`,
      ).toBe(true);
      expect(
        hasPermission([], PERMISSIONS.ANNOUNCEMENTS_VIEW, role),
        `${role} should pass hasPermission for announcements.view`,
      ).toBe(true);
    }
  });

  it("keeps announcement create (+ Add) gated to settings.view, not all staff", () => {
    expect(hasPermission([], PERMISSIONS.SETTINGS_VIEW, "operations")).toBe(
      false,
    );
    expect(hasPermission([], PERMISSIONS.SETTINGS_VIEW, "sales")).toBe(false);
    expect(hasPermission([], PERMISSIONS.SETTINGS_VIEW, "admin")).toBe(true);
    expect(hasPermission([], PERMISSIONS.SETTINGS_VIEW, "founder")).toBe(true);
    expect(hasPermission([], PERMISSIONS.SETTINGS_VIEW, "superadmin")).toBe(
      true,
    );
  });

  it("scopes tasks.view_all to oversight roles only", () => {
    expect(hasPermission([], PERMISSIONS.TASKS_VIEW_ALL, "admin")).toBe(true);
    expect(hasPermission([], PERMISSIONS.TASKS_VIEW_ALL, "founder")).toBe(true);
    expect(
      hasPermission([], PERMISSIONS.TASKS_VIEW_ALL, "finance_controller"),
    ).toBe(true);
    expect(hasPermission([], PERMISSIONS.TASKS_VIEW_ALL, "sales")).toBe(false);
    expect(hasPermission([], PERMISSIONS.TASKS_VIEW_ALL, "operations")).toBe(
      false,
    );
    expect(ROLE_PERMISSIONS.admin).toContain("tasks.view_all");
    expect(ROLE_PERMISSIONS.sales).not.toContain("tasks.view_all");
  });
});
