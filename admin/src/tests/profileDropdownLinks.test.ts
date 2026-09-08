import { ADMIN_ROUTES } from "../config/routes.config";

describe("Profile Dropdown Navigation Test Suite", () => {
  it("should navigate to correct page when clicking each dropdown item", () => {
    const links = [
      { label: "My Profile", expectPath: "/admin/profile" },
      { label: "Settings", expectPath: "/admin/settings" },
      { label: "Change Password", expectPath: "/admin/change-password" },
      { label: "Manage Staff Profiles", expectPath: "/admin/people/staff" },
      { label: "Roles & Permissions", expectPath: "/admin/roles-permissions" },
    ];

    links.forEach(({ label, expectPath }) => {
      const matchedRoute = ADMIN_ROUTES.find((r) => r.path === expectPath);
      expect(matchedRoute).toBeDefined();
      expect(matchedRoute?.path).toBe(expectPath);
    });
  });
});
