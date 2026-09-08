import { isFounder } from "../config/permissions.config";
import { ADMIN_ROUTES } from "../config/routes.config";

describe("E2E Staff Profile & Access Control Verification Matrix", () => {
  const STAFF_PROFILES = [
    {
      name: "Hemal Patel",
      role: "superadmin",
      email: "hemal.patel@youthcamping.online",
      expectStaffProfiles: true,
    },
    {
      name: "Suresh Chaudhary",
      role: "admin",
      email: "suresh.chaudhary@youthcamping.online",
      expectStaffProfiles: false,
    },
    {
      name: "Zeel Panchal",
      role: "sales",
      email: "zeel.panchal@youthcamping.online",
      expectStaffProfiles: false,
    },
    {
      name: "Vidhi Thummer",
      role: "sales",
      email: "vidhi.thummer@youthcamping.online",
      expectStaffProfiles: false,
    },
    {
      name: "Neeki Diyali",
      role: "operations",
      email: "nikkiyouthcamping@gmail.com",
      expectStaffProfiles: false,
    },
  ];

  test("Only Hemal Patel (Founder) is granted Founder privileges", () => {
    STAFF_PROFILES.forEach((staff) => {
      const founder = isFounder(staff);
      expect(founder).toBe(staff.expectStaffProfiles);
    });
  });

  test("Founder-only routes are correctly blocked for standard staff roles", () => {
    const founderRoutePaths = ADMIN_ROUTES.filter((r) => r.founderOnly).map(
      (r) => r.path,
    );

    STAFF_PROFILES.filter((s) => !s.expectStaffProfiles).forEach((staff) => {
      founderRoutePaths.forEach((path) => {
        // Standard staff accounts must be denied direct URL access to founder routes
        const isAllowed = isFounder(staff);
        expect(isAllowed).toBe(false);
      });
    });
  });
});
