import { describe, expect, it } from "vitest";
import {
  computeHotelStayCoverage,
  computeSeatsFilledPercent,
  countBookingTravelers,
  countOutstandingParticipants,
  DEFAULT_DEPARTURE_CAPACITY,
  listOverviewStayDays,
} from "../overviewMetrics";

describe("listOverviewStayDays", () => {
  it("excludes first/last and enroute days", () => {
    const days = [
      { plan: "Train Journey Ahmedabad to Chandigarh", day: "Day 1" },
      { plan: "Amritsar Sightseeing", stay: "Amritsar", day: "Day 2" },
      { plan: "Kasol", stay: "Kasol", day: "Day 3" },
      { plan: "Arrival in your city", day: "Day 4" },
    ];
    expect(listOverviewStayDays(days)).toHaveLength(2);
  });
});

describe("computeHotelStayCoverage", () => {
  const itinerary = [
    { plan: "Train Journey", day: "Day 1", dateStr: "2026-09-08" },
    {
      plan: "Amritsar",
      stay: "Amritsar",
      day: "Day 2",
      dateStr: "2026-09-09",
    },
    { plan: "Kasol", stay: "Kasol", day: "Day 3", dateStr: "2026-09-10" },
    { plan: "Kaza", stay: "Kaza", day: "Day 4", dateStr: "2026-09-11" },
    {
      plan: "Arrival in your city",
      day: "Day 5",
      dateStr: "2026-09-12",
    },
  ];

  it("never reports covered > target when duplicate hotel rows exist", () => {
    const hotelBookings = [
      {
        id: "1",
        hotelName: "Hotel A",
        location: "Amritsar",
        checkIn: "2026-09-09",
        checkOut: "2026-09-10",
        nightsCount: 1,
        confirmed: "CONFIRMED",
      },
      {
        id: "1b",
        hotelName: "Hotel A Dup",
        location: "Amritsar",
        checkIn: "2026-09-09",
        checkOut: "2026-09-10",
        nightsCount: 1,
        confirmed: "CONFIRMED",
      },
      {
        id: "2",
        hotelName: "Hotel B",
        location: "Kasol",
        checkIn: "2026-09-10",
        checkOut: "2026-09-11",
        nightsCount: 1,
        confirmed: "CONFIRMED",
      },
      {
        id: "3",
        hotelName: "Hotel C",
        location: "Kaza",
        checkIn: "2026-09-11",
        checkOut: "2026-09-12",
        nightsCount: 1,
        confirmed: "CONFIRMED",
      },
      {
        id: "orphan",
        hotelName: "Orphan Extra",
        location: "Somewhere",
        checkIn: "2026-09-07",
        checkOut: "2026-09-08",
        nightsCount: 1,
        confirmed: "CONFIRMED",
      },
    ];

    const result = computeHotelStayCoverage({ itinerary, hotelBookings });
    // 3 stay nights (days 2–4); raw booking rows = 5
    expect(result.target).toBe(3);
    expect(result.assigned).toBe(3);
    expect(result.covered).toBe(3);
    expect(result.displayValue).toBe("3/3");
    expect(result.isComplete).toBe(true);
  });

  it("counts assigned nights even when unconfirmed", () => {
    const hotelBookings = [
      {
        id: "1",
        hotelName: "Hotel A",
        location: "Amritsar",
        checkIn: "2026-09-09",
        nightsCount: 1,
        confirmed: "PENDING",
      },
    ];
    const result = computeHotelStayCoverage({ itinerary, hotelBookings });
    expect(result.target).toBe(3);
    expect(result.assigned).toBe(1);
    expect(result.confirmed).toBe(0);
    expect(result.displayValue).toBe("1/3");
    expect(result.isComplete).toBe(false);
  });
});

describe("computeSeatsFilledPercent", () => {
  it("shows 0 when no participants and no capacity", () => {
    expect(computeSeatsFilledPercent(0, 0)).toBe(0);
    expect(computeSeatsFilledPercent(0, undefined)).toBe(0);
  });

  it("does not show 0% when participants exist but capacity is missing", () => {
    const pct = computeSeatsFilledPercent(20, 0);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBe((20 / DEFAULT_DEPARTURE_CAPACITY) * 100);
  });

  it("uses configured capacity when present", () => {
    expect(computeSeatsFilledPercent(20, 40)).toBe(50);
    expect(computeSeatsFilledPercent(10, 20)).toBe(50);
  });

  it("caps at 100%", () => {
    expect(computeSeatsFilledPercent(50, 40)).toBe(100);
  });
});

describe("countOutstandingParticipants", () => {
  it("uses active passenger list so cancelled pax are not over-counted", () => {
    const bookings = [
      {
        id: "b1",
        remainingAmount: 5000,
        numberOfTravelers: 3,
        passengers: {
          persons: [
            { name: "Lead" },
            { name: "Co1" },
            { name: "Co2", isCancelled: true },
          ],
        },
        fullName: "Lead",
      },
    ];
    const activePassengers = [
      { bookingId: "b1", isLead: true, balance: 5000, bookingBalance: 5000 },
      { bookingId: "b1", isLead: false, balance: null, bookingBalance: 5000 },
    ];

    expect(
      countOutstandingParticipants({ bookings, activePassengers }),
    ).toBe(2);
  });

  it("caps booking-based count at active passenger total", () => {
    const bookings = [
      { id: "b1", remainingAmount: 1000, numberOfTravelers: 21 },
    ];
    const activePassengers = Array.from({ length: 20 }, (_, i) => ({
      bookingId: i < 19 ? "b1" : "b2",
      balance: i < 19 ? 100 : 0,
      bookingBalance: i < 19 ? 100 : 0,
    }));

    expect(
      countOutstandingParticipants({ bookings, activePassengers }),
    ).toBe(19);
  });
});

describe("countBookingTravelers", () => {
  it("prefers active persons list over stale numberOfTravelers", () => {
    expect(
      countBookingTravelers({
        numberOfTravelers: 5,
        fullName: "Lead",
        passengers: {
          persons: [{ name: "Co1" }, { name: "Co2", isCancelled: true }],
        },
      }),
    ).toBe(2); // lead + Co1
  });
});
