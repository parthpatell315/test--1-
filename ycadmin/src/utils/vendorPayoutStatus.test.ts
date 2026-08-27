import { describe, expect, it } from "vitest";
import { vendorPayoutQueueLabel } from "./vendorPayoutStatus";

describe("vendorPayoutQueueLabel", () => {
  it("keeps a fully paid but unapproved payout in the finance verify queue", () => {
    expect(
      vendorPayoutQueueLabel({
        approvalStatus: "PENDING",
        status: "paid",
      }),
    ).toBe("Pending");
  });

  it("marks founder-approved payouts as settled", () => {
    expect(
      vendorPayoutQueueLabel({
        approvalStatus: "APPROVED_FOUNDER",
        status: "Paid",
      }),
    ).toBe("Settled");
  });
});
