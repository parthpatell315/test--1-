import { describe, expect, it } from "vitest";
import {
  combineVendorPayableTotals,
  hasRecordedVendorPayout,
} from "../vendorPayableMerge";

describe("vendorPayableMerge", () => {
  it("does not add hotel write-back onto a recorded 22000 payout", () => {
    const existing = {
      agreedAmount: 44000,
      advancePaid: 22000,
      transactionId: "TXN-1787470413189",
      history: [{ txnId: "TXN-1787470413189", amount: 22000 }],
    };
    const merged = combineVendorPayableTotals(existing, { agreed: 44000, paid: 22000 }, false);
    expect(hasRecordedVendorPayout(existing)).toBe(true);
    expect(merged.agreedAmount).toBe(44000);
    expect(merged.advancePaid).toBe(22000);
  });

  it("still sums distinct unpaid hotel nights for the same vendor name", () => {
    const existing = { agreedAmount: 22000, advancePaid: 0, history: [] };
    const merged = combineVendorPayableTotals(existing, { agreed: 22000, paid: 0 }, false);
    expect(merged.agreedAmount).toBe(44000);
    expect(merged.advancePaid).toBe(0);
  });
});
