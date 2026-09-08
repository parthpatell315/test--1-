import { describe, expect, it } from "vitest";
import {
  allocateBookingPassengerAmounts,
  allocatePassengerMoneyWithGroupTotals,
  amountsFromBookingItems,
  personNameFromItemLabel,
  splitEvenly,
} from "../passengerAmounts";

describe("splitEvenly", () => {
  it("splits with remainder on the last slots", () => {
    expect(splitEvenly(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(splitEvenly(7, 2)).toEqual([3, 4]);
    expect(splitEvenly(42000, 2)).toEqual([21000, 21000]);
  });

  it("keeps 7-way paid/due/total shares summing exactly (Prince-style)", () => {
    const paid = splitEvenly(40000, 7);
    const due = splitEvenly(144000, 7);
    const total = splitEvenly(184000, 7);
    expect(paid.reduce((s, n) => s + n, 0)).toBe(40000);
    expect(due.reduce((s, n) => s + n, 0)).toBe(144000);
    expect(total.reduce((s, n) => s + n, 0)).toBe(184000);
    // Early rows show floor; remainder lands on the last seats.
    expect(paid.slice(0, 5)).toEqual([5714, 5714, 5714, 5714, 5714]);
    expect(paid.slice(5)).toEqual([5715, 5715]);
    expect(due.slice(0, 4)).toEqual([20571, 20571, 20571, 20571]);
    expect(due.slice(4)).toEqual([20572, 20572, 20572]);
  });
});

describe("personNameFromItemLabel", () => {
  it("reads trailing [Name] tags", () => {
    expect(personNameFromItemLabel("NON AC SLEEPER [Chirag patel]")).toBe(
      "Chirag patel",
    );
    expect(personNameFromItemLabel("Discount [Prince]")).toBe("Prince");
    expect(personNameFromItemLabel("Package only")).toBeNull();
  });
});

describe("group → passenger amount distribution", () => {
  it("does not dump full group paid/balance onto the lead", () => {
    const shares = allocateBookingPassengerAmounts({
      totalAmount: 52000,
      netPaidAmount: 10000,
      remainingAmount: 42000,
      passengers: [
        { name: "Dr Chirag patel" },
        { name: "Dr Drashti patel" },
      ],
    });

    expect(shares).toHaveLength(2);
    expect(shares[0].paidAmount).toBe(5000);
    expect(shares[1].paidAmount).toBe(5000);
    expect(shares[0].balance).toBe(21000);
    expect(shares[1].balance).toBe(21000);
    expect(shares[0].amount).toBe(26000);
    expect(shares[1].amount).toBe(26000);
    expect(
      (shares[0].paidAmount || 0) + (shares[1].paidAmount || 0),
    ).toBe(10000);
    expect(
      (shares[0].balance || 0) + (shares[1].balance || 0),
    ).toBe(42000);
    expect(shares[0].paidIsBookingShare).toBe(true);
  });

  it("splits a 7-pax booking so no one gets the full group due", () => {
    const names = [
      "Prince",
      "Sneha",
      "Saumya",
      "Vanshika",
      "Manav",
      "Hemal",
      "Extra",
    ];
    const shares = allocateBookingPassengerAmounts({
      totalAmount: 184000,
      netPaidAmount: 40000,
      remainingAmount: 144000,
      passengers: names.map((name) => ({ name })),
    });

    expect(shares.every((s) => (s.balance || 0) < 144000)).toBe(true);
    expect(shares.every((s) => (s.paidAmount || 0) < 40000)).toBe(true);
    expect(shares.reduce((sum, s) => sum + (s.paidAmount || 0), 0)).toBe(40000);
    expect(shares.reduce((sum, s) => sum + (s.balance || 0), 0)).toBe(144000);
    expect(shares.reduce((sum, s) => sum + (s.amount || 0), 0)).toBe(184000);
  });

  it("uses per-person booking line items for amount shares", () => {
    const items = [
      {
        name: "NON AC SLEEPER [Chirag]",
        rate: 23000,
        qty: 1,
        category: "transport",
      },
      {
        name: "NON AC SLEEPER [Drashti]",
        rate: 23000,
        qty: 1,
        category: "transport",
      },
      {
        name: "Discount [Chirag]",
        rate: -1000,
        qty: 1,
        category: "discounts",
      },
      {
        name: "Discount [Drashti]",
        rate: -1000,
        qty: 1,
        category: "discounts",
      },
    ];
    const fromItems = amountsFromBookingItems(items, [
      { name: "Chirag" },
      { name: "Drashti" },
    ]);
    expect(fromItems).toEqual([22000, 22000]);

    const shares = allocateBookingPassengerAmounts({
      totalAmount: 46200, // e.g. base + GST scaled
      netPaidAmount: 10000,
      remainingAmount: 36200,
      passengers: [{ name: "Chirag" }, { name: "Drashti" }],
      bookingItems: items,
    });

    expect(shares[0].amountFromLineItems).toBe(true);
    expect(shares[0].amount).toBe(23100);
    expect(shares[1].amount).toBe(23100);
    expect(shares[0].paidAmount).toBe(5000);
    expect(shares[1].paidAmount).toBe(5000);
  });

  it("uses aggregated package qty as per-person rate before scaling", () => {
    const shares = allocateBookingPassengerAmounts({
      totalAmount: 52000,
      netPaidAmount: 10000,
      remainingAmount: 42000,
      passengers: [{ name: "A" }, { name: "B" }],
      bookingItems: [
        { name: "NON AC SLEEPER", rate: 23000, qty: 2, category: "transport" },
      ],
    });
    expect(shares[0].amountFromLineItems).toBe(true);
    // 23000 each scaled up to sum 52000 → 26000 each
    expect(shares[0].amount).toBe(26000);
    expect(shares[1].amount).toBe(26000);
  });

  it("zeros cancelled passengers and splits only across active", () => {
    const shares = allocateBookingPassengerAmounts({
      totalAmount: 52000,
      netPaidAmount: 10000,
      remainingAmount: 42000,
      passengers: [
        { name: "Lead" },
        { name: "Co", isCancelled: true },
        { name: "Active2" },
      ],
    });
    expect(shares[1].amount).toBeNull();
    expect(shares[1].paidAmount).toBeNull();
    expect(shares[1].balance).toBeNull();
    expect(shares[0].paidAmount! + shares[2].paidAmount!).toBe(10000);
    expect(shares[0].balance! + shares[2].balance!).toBe(42000);
  });

  it("keeps unequal Excel rem when package prices differ (Khushi)", () => {
    // Group advance ₹21,000 on first Excel row; rem 18500+18500+15500.
    // Line items = rem + equal share of advance (7000) → 25500/25500/22500.
    const items = [
      {
        name: "3 TIER AC TRAIN (Ahmedabad) [Khushi]",
        rate: 25500,
        qty: 1,
        category: "transport",
      },
      {
        name: "3 TIER AC TRAIN (Ahmedabad) [Rushvi]",
        rate: 25500,
        qty: 1,
        category: "transport",
      },
      {
        name: "3 TIER AC TRAIN (Ahmedabad) [Khushbuben]",
        rate: 22500,
        qty: 1,
        category: "transport",
      },
    ];
    const shares = allocateBookingPassengerAmounts({
      totalAmount: 73500,
      netPaidAmount: 21000,
      remainingAmount: 52500,
      passengers: [
        { name: "Khushi" },
        { name: "Rushvi" },
        { name: "Umangiben", isCancelled: true },
        { name: "Khushbuben" },
      ],
      bookingItems: items,
    });

    expect(shares[0].amount).toBe(25500);
    expect(shares[1].amount).toBe(25500);
    expect(shares[2].amount).toBeNull();
    expect(shares[3].amount).toBe(22500);
    expect(shares[0].paidAmount).toBe(7000);
    expect(shares[1].paidAmount).toBe(7000);
    expect(shares[3].paidAmount).toBe(7000);
    // Must NOT even-split 52500 → 17500; rem follows amount − paid.
    expect(shares[0].balance).toBe(18500);
    expect(shares[1].balance).toBe(18500);
    expect(shares[3].balance).toBe(15500);
    expect(
      (shares[0].balance || 0) +
        (shares[1].balance || 0) +
        (shares[3].balance || 0),
    ).toBe(52500);
  });

  it("does not inflate active shares when stale total still includes cancelled seat", () => {
    // Stale sync wrote totalAmount=95000 (4 seats) while Umangiben is cancelled
    // and active line items already sum to the Excel package 73500.
    const items = [
      {
        name: "3 TIER AC TRAIN (Ahmedabad) [Khushi]",
        rate: 25500,
        qty: 1,
        category: "transport",
      },
      {
        name: "3 TIER AC TRAIN (Ahmedabad) [Rushvi]",
        rate: 25500,
        qty: 1,
        category: "transport",
      },
      {
        name: "3 TIER AC TRAIN (Ahmedabad) [Khushbuben]",
        rate: 22500,
        qty: 1,
        category: "transport",
      },
    ];
    const money = allocatePassengerMoneyWithGroupTotals({
      totalAmount: 95000,
      netPaidAmount: 21000,
      remainingAmount: 74000,
      passengers: [
        { name: "Khushi" },
        { name: "Rushvi" },
        { name: "Umangiben", isCancelled: true },
        { name: "Khushbuben" },
      ],
      bookingItems: items,
    });

    expect(money.totalAmount).toBe(73500);
    expect(money.netPaidAmount).toBe(21000);
    expect(money.remainingAmount).toBe(52500);
    expect(money.adjustedFromLineItems).toBe(true);
    expect(money.shares[0].balance).toBe(18500);
    expect(money.shares[1].balance).toBe(18500);
    expect(money.shares[2].amount).toBeNull();
    expect(money.shares[3].balance).toBe(15500);
    // Must NOT scale 73500 line items up to stale 95000 (~31667 equal rem).
    expect(money.shares[0].balance).not.toBe(31667);
    expect(money.shares[0].amount).toBe(25500);
  });
});
