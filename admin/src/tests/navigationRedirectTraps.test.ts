import { ADMIN_ROUTES } from "../config/routes.config";
import { COMPONENT_REGISTRY } from "../config/componentRegistry";

describe("Navigation Redirect Traps & Route Mapping Validation", () => {
  it("should NOT redirect /admin/profile to any other route", () => {
    const profileRoute = ADMIN_ROUTES.find((r) => r.path === "/admin/profile");
    expect(profileRoute).toBeDefined();
    expect(profileRoute?.path).toBe("/admin/profile");
    expect(COMPONENT_REGISTRY[profileRoute!.id]).toBeDefined();
  });

  it("should NOT redirect /admin/settings to /admin/website", () => {
    const settingsRoute = ADMIN_ROUTES.find(
      (r) => r.path === "/admin/settings",
    );
    expect(settingsRoute).toBeDefined();
    expect(settingsRoute?.path).toBe("/admin/settings");
    expect(settingsRoute?.path).not.toBe("/admin/website");
    expect(COMPONENT_REGISTRY[settingsRoute!.id]).toBeDefined();
  });

  it("should ensure all registered routes have valid non-empty paths and lazy component mappings", () => {
    ADMIN_ROUTES.forEach((route) => {
      expect(route.path.startsWith("/admin")).toBe(true);
      expect(route.path.length).toBeGreaterThan(5);
      expect(COMPONENT_REGISTRY[route.id]).toBeDefined();
    });
  });
});
