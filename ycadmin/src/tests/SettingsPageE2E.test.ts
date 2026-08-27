// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ADMIN_ROUTES } from "../config/routes.config";
import { COMPONENT_REGISTRY } from "../config/componentRegistry";

describe("Settings Page E2E & Routing Verification", () => {
  it("should have canonical registered routes for settings and profile aliases", () => {
    const settingsRoute = ADMIN_ROUTES.find(
      (r) => r.path === "/admin/settings",
    );
    const profileRoute = ADMIN_ROUTES.find((r) => r.path === "/admin/profile");
    const securityRoute = ADMIN_ROUTES.find(
      (r) => r.path === "/admin/security",
    );

    expect(settingsRoute).toBeDefined();
    expect(profileRoute).toBeDefined();
    expect(securityRoute).toBeDefined();
  });

  it("should map settings and profile keys in componentRegistry to lazy SettingsPage component", () => {
    expect(COMPONENT_REGISTRY["settings"]).toBeDefined();
    expect(COMPONENT_REGISTRY["profile"]).toBeDefined();
    expect(COMPONENT_REGISTRY["security"]).toBeDefined();
    expect(COMPONENT_REGISTRY["change-password"]).toBeDefined();
  });
});
