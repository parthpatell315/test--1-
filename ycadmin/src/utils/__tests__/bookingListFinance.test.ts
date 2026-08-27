import { describe, expect, it } from "vitest";
import {
  bookingListDueAmount,
  bookingListPaidAmount,
} from "../bookingListFinance";

describe("bookingListFinance", () => {
  it("uses cleared legacy receipts for due when present", () => {
    const b = {
      totalAmount: 23500,
      advancePaid: 0,
      remainingAmount: 23500,
      payments: [{ amount: 5000, status: "success" }],
    };
    expect(bookingListDueAmount(b)).toBe(18500);
    expect(bookingListPaidAmount(b)).toBe(5000);
  });

  it("falls back to remainingAmount when no receipts", () => {
    const b = {
      totalAmount: 184000,
      advancePaid: 40000,
      remainingAmount: 144000,
      payments: [],
      opsClientPayments: [],
    };
    expect(bookingListDueAmount(b)).toBe(144000);
    expect(bookingListPaidAmount(b)).toBe(40000);
  });

  it("prefers cleared ops over duplicate legacy Payment", () => {
    const b = {
      totalAmount: 23000,
      advancePaid: 5000,
      remainingAmount: 18000,
      opsClientPayments: [
        { amount: 5000, approvalStatus: "APPROVED_FOUNDER" },
      ],
      payments: [{ amount: 5000, status: "success" }],
    };
    expect(bookingListPaidAmount(b)).toBe(5000);
    expect(bookingListDueAmount(b)).toBe(18000);
  });
});
