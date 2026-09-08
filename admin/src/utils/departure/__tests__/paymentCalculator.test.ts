import { describe, it, expect } from "vitest";
import {
  calculateBookingFinancialStatus,
  safeNumber,
} from "../paymentCalculator";

describe("paymentCalculator", () => {
  it("should convert numeric strings, null, and undefined cleanly", () => {
    expect(safeNumber("10000")).toBe(10000);
    expect(safeNumber("₹15,000")).toBe(15000);
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber(0)).toBe(0);
  });

  it("should calculate UNPAID status when 0 paid", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 0,
    });
    expect(res.paymentStatus).toBe("UNPAID");
    expect(res.remainingAmount).toBe(10000);
  });

  it("treats advancePaid with PENDING approval as unverified UNPAID", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 5000,
      opsClientPayments: [
        { id: "p1", amount: 5000, approvalStatus: "PENDING" },
      ],
    });
    expect(res.paymentStatus).toBe("UNPAID");
    expect(res.paidAmount).toBe(0);
    expect(res.remainingAmount).toBe(10000);
  });

  it("treats advancePaid with REJECTED approval as unverified UNPAID", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 5000,
      opsClientPayments: [
        { id: "p1", amount: 5000, approvalStatus: "REJECTED" },
      ],
    });
    expect(res.paymentStatus).toBe("UNPAID");
    expect(res.paidAmount).toBe(0);
    expect(res.remainingAmount).toBe(10000);
  });

  it("treats Ops advancePaid alone as zero verified collection", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 5000,
    });
    expect(res.paymentStatus).toBe("UNPAID");
    expect(res.paidAmount).toBe(0);
    expect(res.remainingAmount).toBe(10000);
  });

  it("calculates PARTIAL when founder-approved collection is less than total", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 5000,
      opsClientPayments: [
        { id: "p1", amount: 5000, approvalStatus: "APPROVED_FOUNDER" },
      ],
    });
    expect(res.paymentStatus).toBe("PARTIAL");
    expect(res.paidAmount).toBe(5000);
    expect(res.remainingAmount).toBe(5000);
  });

  it("calculates PAID when founder-approved collection covers the total", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 10000,
      opsClientPayments: [
        { id: "p1", amount: 10000, approvalStatus: "APPROVED_FOUNDER" },
      ],
    });
    expect(res.paymentStatus).toBe("PAID");
    expect(res.remainingAmount).toBe(0);
  });

  it("calculates OVERPAID when founder-approved collection exceeds total", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 12000,
      opsClientPayments: [
        { id: "p1", amount: 12000, approvalStatus: "APPROVED_FOUNDER" },
      ],
    });
    expect(res.paymentStatus).toBe("OVERPAID");
    expect(res.overpaymentAmount).toBe(2000);
    expect(res.remainingAmount).toBe(0);
  });

  it("calculates REFUNDED when founder-approved refunds net collection to zero", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 5000,
      opsClientPayments: [
        { id: "p1", amount: 5000, approvalStatus: "APPROVED_FOUNDER" },
        {
          id: "r1",
          amount: 5000,
          type: "REFUND",
          approvalStatus: "APPROVED_FOUNDER",
        },
      ],
    });
    expect(res.paymentStatus).toBe("REFUNDED");
    expect(res.netPaidAmount).toBe(0);
    expect(res.remainingAmount).toBe(10000);
  });

  it("should calculate CANCELLED status when booking is cancelled", () => {
    const res = calculateBookingFinancialStatus({
      totalAmount: 10000,
      advancePaid: 5000,
      status: "CANCELLED",
    });
    expect(res.paymentStatus).toBe("CANCELLED");
  });
});
