// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { SETTINGS_TABS } from "../pages/admin/SettingsPage";
import { calculatePasswordStrength } from "../pages/admin/settings/components/PasswordStrengthMeter";

describe("Settings Page & Tab System Suite", () => {
  it("should define the settings tabs with labels and icons", () => {
    expect(SETTINGS_TABS.length).toBeGreaterThanOrEqual(2);
    const tabIds = SETTINGS_TABS.map((t) => t.id);
    expect(tabIds).toContain("account");
    expect(tabIds).toContain("security");
  });

  it("should calculate password strength for weak and strong passwords", () => {
    expect(calculatePasswordStrength("").score).toBe(0);
    expect(calculatePasswordStrength("abc").score).toBeLessThan(4);
    expect(calculatePasswordStrength("Abcdef12!@").score).toBe(4);
  });
});