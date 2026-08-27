import { describe, expect, it } from "vitest";
import { parseDepartureId, resolveDepartureIdentity } from "../parseDepartureId";
import { calculateBookingFinancialStatus } from "../paymentCalculator";
import { mapBookingsToDeparturePassengers, isTransportAllocatedForPassenger } from "../departurePassengers";
import { mergeOpsVendorPayments } from "../vendorIdentity";
import { matchPassengerForOpsRow } from "../passengerIdentity";
import { fetchAllDepartureBookings } from "../fetchDepartureBookings";
import { isMiscExpenseApproved } from "../miscExpenseApproval";
import { normalizeDepartureHubTab } from "../departureHubTab";
import { findHotelForDay } from "@/utils/accommodationCalculator";

describe("parseDepartureId", () => {
  it("parses a normal trip id", () => {
    const parsed = parseDepartureId("MKA-0705_2027-07-05");
    expect(parsed).toEqual({ ok: true, tripId: "MKA-0705", departureDate: "2027-07-05" });
  });

  it("parses trip ids containing underscores", () => {
    const parsed = parseDepartureId("ABC_TEST_TRIP_2027-07-05");
    expect(parsed).toEqual({
      ok: true,
      tripId: "ABC_TEST_TRIP",
      departureDate: "2027-07-05",
    });
  });

  it("rejects a malformed date", () => {
    expect(parseDepartureId("TRIP_2027-13-40").ok).toBe(false);
    expect(parseDepartureId("TRIP_not-a-date").ok).toBe(false);
  });

  it("rejects a missing date", () => {
    expect(parseDepartureId("TRIPONLY").ok).toBe(false);
  });

  it("rejects a missing trip id", () => {
    expect(parseDepartureId("_2027-07-05").ok).toBe(false);
  });

  it("does not invent a demo trip when identity is missing", () => {
    const resolved = resolveDepartureIdentity({});
    expect(resolved.ok).toBe(false);
  });
});

describe("departure passenger mapping", () => {
  it("leaves missing passenger fields missing", () => {
    const rows = mapBookingsToDeparturePassengers(
      [
        {
          id: "bk1",
          bookingId: "BK-1",
          fullName: "Amit",
          totalAmount: 20000,
          opsClientPayments: [],
        },
      ],
      "2027-07-05",
      {},
    );
    expect(rows[0].pickupPoint).toBe("—");
    expect(rows[0].dropPoint).toBe("—");
    expect(rows[0].emergencyContact).toBe("—");
    expect(rows[0].guideName).toBe("—");
    expect(rows[0].transportDetails).toBe("—");
    expect(rows[0].age).toBeNull();
    expect(rows[0].linkedBooking).toBeUndefined();
    expect(rows[0].bookingDate).toBe("—");
  });

  it("does not invent a 15-pax count from empty stats", () => {
    const rows = mapBookingsToDeparturePassengers([], "2027-07-05", {});
    expect(rows.length).toBe(0);
  });

  it("splits booking money across active co-passengers (not lead-only)", () => {
    const rows = mapBookingsToDeparturePassengers(
      [
        {
          id: "bk1",
          fullName: "Lead",
          totalAmount: 20000,
          opsClientPayments: [
            { id: "p1", amount: 5000, approvalStatus: "APPROVED_FOUNDER" },
          ],
          passengers: { persons: [{ name: "Co" }] },
        },
      ],
      "2027-07-05",
      {},
    );
    const lead = rows.find((r) => r.isLead);
    const co = rows.find((r) => !r.isLead);
    expect(lead.paidAmount).toBe(2500);
    expect(co.paidAmount).toBe(2500);
    expect(lead.balance).toBe(7500);
    expect(co.balance).toBe(7500);
    expect(lead.amount + co.amount).toBe(20000);
  });

  it("does not treat pickup point as vehicle allocation", () => {
    const passenger = { id: "p1", pickupPoint: "Ahmedabad" };
    expect(isTransportAllocatedForPassenger(passenger, {})).toBe(false);
    expect(
      isTransportAllocatedForPassenger(passenger, {
        p1: { vehicle: "Tempo-1" },
      }),
    ).toBe(true);
  });

  it("print/export fields stay empty when source fields are empty", () => {
    const rows = mapBookingsToDeparturePassengers(
      [{ id: "bk1", fullName: "Amit" }],
      "2027-07-05",
      {},
    );
    expect(rows[0].phone).toBe("—");
    expect(rows[0].age).toBeNull();
    expect(JSON.stringify(rows)).not.toContain("9876543211");
    expect(JSON.stringify(rows)).not.toContain("Dikshu Sharma");
  });
});

describe("finance-verified passenger money", () => {
  it("does not count a pending receipt as paid or reduce due", () => {
    const fin = calculateBookingFinancialStatus({
      totalAmount: 20000,
      advancePaid: 5000,
      payments: [{ amount: 5000, status: "success", approvalStatus: "PENDING" }],
      opsClientPayments: [{ amount: 5000, approvalStatus: "PENDING" }],
    });
    expect(fin.netPaidAmount).toBe(0);
    expect(fin.remainingAmount).toBe(20000);
    expect(fin.paymentStatus).toBe("UNPAID");
  });

  it("counts APPROVED_FOUNDER receipts as collected", () => {
    const fin = calculateBookingFinancialStatus({
      totalAmount: 20000,
      opsClientPayments: [
        { id: "1", amount: 5000, approvalStatus: "APPROVED_FOUNDER" },
      ],
    });
    expect(fin.netPaidAmount).toBe(5000);
    expect(fin.remainingAmount).toBe(15000);
    expect(fin.paymentStatus).toBe("PARTIAL");
  });

  it("does not double-count ops + legacy Payment for the same advance", () => {
    // Gautam/Riddhi-style: OpsClientPayment ₹5k + legacy Payment ₹5k (cuid key)
    const fin = calculateBookingFinancialStatus({
      totalAmount: 23000,
      advancePaid: 5000,
      opsClientPayments: [
        { id: "ops1", amount: 5000, approvalStatus: "APPROVED_FOUNDER" },
      ],
      payments: [
        { id: "leg1", amount: 5000, status: "success" },
      ],
    });
    expect(fin.netPaidAmount).toBe(5000);
    expect(fin.remainingAmount).toBe(18000);
    expect(fin.paymentStatus).toBe("PARTIAL");
  });

  it("counts legacy Payment success (no approvalStatus) like booking CLEARED", () => {
    // Sanjay-style: website/UPI row in Payment table, not OpsClientPayment
    const fin = calculateBookingFinancialStatus({
      totalAmount: 23500,
      advancePaid: 5000,
      payments: [{ id: "cmszrz2im0043ncbb614sxsfo", amount: 5000, status: "success" }],
      opsClientPayments: [],
    });
    expect(fin.netPaidAmount).toBe(5000);
    expect(fin.remainingAmount).toBe(18500);
    expect(fin.paymentStatus).toBe("PARTIAL");
  });

  it("does not treat advancePaid alone as collected", () => {
    const fin = calculateBookingFinancialStatus({
      totalAmount: 23500,
      advancePaid: 5000,
      remainingAmount: 18500,
    });
    expect(fin.netPaidAmount).toBe(0);
    expect(fin.remainingAmount).toBe(23500);
    expect(fin.paymentStatus).toBe("UNPAID");
  });
});

describe("pagination", () => {
  it("does not silently drop bookings after the first 100", async () => {
    const pages = [
      { data: Array.from({ length: 100 }, (_, i) => ({ id: `a${i}` })), pagination: { totalCount: 150, hasNextPage: true } },
      { data: Array.from({ length: 50 }, (_, i) => ({ id: `b${i}` })), pagination: { totalCount: 150, hasNextPage: false } },
    ];
    const result = await fetchAllDepartureBookings({
      getPage: async (page) => pages[page - 1],
    });
    expect(result.bookings).toHaveLength(150);
    expect(result.incomplete).toBe(false);
  });
});

describe("duplicate identity matching", () => {
  it("does not merge two vendors that share a display name", () => {
    const merged = mergeOpsVendorPayments(
      [
        { id: "h1", sourceId: "h1", sourceType: "hotel", name: "Hotel A", agreedCost: 1000, paidAmount: 0 },
        { id: "h2", sourceId: "h2", sourceType: "hotel", name: "Hotel A", agreedCost: 2000, paidAmount: 0 },
      ],
      [
        { id: "pay1", sourceId: "h1", sourceType: "hotel", vendorName: "Hotel A", agreedAmount: 1000, advancePaid: 100, approvalStatus: "PENDING" },
        { id: "pay2", sourceId: "h2", sourceType: "hotel", vendorName: "Hotel A", agreedAmount: 2000, advancePaid: 50, approvalStatus: "PENDING" },
      ],
    );
    const h1 = merged.find((v) => v.id === "h1");
    const h2 = merged.find((v) => v.id === "h2");
    expect(h1?.paidAmount).toBe(100);
    expect(h2?.paidAmount).toBe(50);
  });

  it("does not collide duplicate passenger names when matching rooms", () => {
    const passengers = [
      { id: "bk1", name: "Amit", bookingId: "BK-1" },
      { id: "bk1-co-0", name: "Amit", bookingId: "BK-2" },
    ];
    const claimed = new Set<string>();
    const first = matchPassengerForOpsRow(
      passengers,
      { bookingId: "BK-1", travelerName: "Amit" },
      claimed,
    );
    claimed.add(String(first?.id));
    const second = matchPassengerForOpsRow(
      passengers,
      { bookingId: "BK-2", travelerName: "Amit" },
      claimed,
    );
    expect(first?.id).toBe("bk1");
    expect(second?.id).toBe("bk1-co-0");
  });

  it("matches ops room rows that store display bookingId against UUID passenger bookingId + bookingRef", () => {
    const passengers = [
      {
        id: "uuid-lead",
        name: "Sanjay Vasaiya",
        bookingId: "uuid-lead",
        bookingRef: "YC-1001",
      },
      {
        id: "uuid-lead-co-0",
        name: "Meet Asheshkumar Gandhi",
        bookingId: "uuid-lead",
        bookingRef: "YC-1001",
      },
    ];
    const claimed = new Set<string>();
    const first = matchPassengerForOpsRow(
      passengers,
      { bookingId: "YC-1001", travelerName: "Sanjay Vasaiya" },
      claimed,
    );
    claimed.add(String(first?.id));
    const second = matchPassengerForOpsRow(
      passengers,
      { bookingId: "YC-1001", travelerName: "Meet Asheshkumar Gandhi" },
      claimed,
    );
    expect(first?.id).toBe("uuid-lead");
    expect(second?.id).toBe("uuid-lead-co-0");
  });
});

describe("hotel-for-day matching", () => {
  const hotels = [
    {
      id: "stay1",
      hotelName: "Lake View",
      checkIn: "2027-07-05",
      checkOut: "2027-07-07",
      nightsCount: 2,
      location: "Manali",
    },
  ];

  it("attaches on the correct check-in date", () => {
    expect(findHotelForDay("2027-07-05", "Manali", hotels)?.id).toBe("stay1");
  });

  it("does not attach on a wrong check-in date outside the stay", () => {
    expect(findHotelForDay("2027-07-08", "Manali", hotels)).toBeNull();
  });

  it("covers an adjacent night inside a multi-night stay", () => {
    expect(findHotelForDay("2027-07-06", "Manali", hotels)?.id).toBe("stay1");
  });

  it("does not attach merely because the hotel is on the same trip/city after checkout", () => {
    expect(findHotelForDay("2027-07-10", "Manali", hotels)).toBeNull();
  });
});

describe("documents tab and remarks", () => {
  it("opens documents for tab=documents", () => {
    expect(normalizeDepartureHubTab("documents")).toBe("documents");
    expect(normalizeDepartureHubTab("docs")).toBe("documents");
  });

  it("does not treat remarks as finance approval", () => {
    expect(
      isMiscExpenseApproved({
        approvalStatus: "PENDING",
        remarks: "approved verified paid STATUS: APPROVED",
      }),
    ).toBe(false);
    expect(
      isMiscExpenseApproved({
        approvalStatus: "APPROVED_FOUNDER",
        remarks: "",
      }),
    ).toBe(true);
  });
});
