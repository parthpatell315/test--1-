import { describe, expect, it } from "vitest";
import { formatDueTabBadge, isClearedReceipt } from "../paymentUtils";

describe("formatDueTabBadge", () => {
  it("shows exact due instead of rounding 18500 up to 19k", () => {
    expect(formatDueTabBadge(18500)).toBe("Due ₹18,500");
    expect(formatDueTabBadge(18500)).not.toContain("19k");
  });

  it("returns Paid when nothing is due", () => {
    expect(formatDueTabBadge(0)).toBe("Paid");
    expect(formatDueTabBadge(-10)).toBe("Paid");
  });

  it("uses compact k only for large dues", () => {
    expect(formatDueTabBadge(150000)).toBe("Due ₹150k");
    expect(formatDueTabBadge(185000)).toBe("Due ₹185k");
  });
});

describe("isClearedReceipt", () => {
  it("treats legacy success Payment without approvalStatus as cleared", () => {
    expect(isClearedReceipt({ status: "success" })).toBe(true);
  });

  it("requires APPROVED_FOUNDER when approvalStatus is present", () => {
    expect(
      isClearedReceipt({ status: "success", approvalStatus: "PENDING" }),
    ).toBe(false);
    expect(
      isClearedReceipt({
        status: "Pending Verification",
        approvalStatus: "APPROVED_FOUNDER",
      }),
    ).toBe(true);
  });
});
