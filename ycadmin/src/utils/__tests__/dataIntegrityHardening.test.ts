import { describe, expect, it } from "vitest";
import { inquiryTabCount, printTripTitle } from "../inquiryCounts";
import { MASTER_DATABASE_API_CONNECTED } from "../../pages/admin/MasterDatabasePage";
import {
  isDemoTripDataEnabled,
  listUpcomingDepartures,
} from "../../../../frontend/src/lib/upcomingDepartures";

describe("BookingOptions / upcoming departures", () => {
  const now = new Date("2026-08-24T12:00:00");

  it("returns no dates when availableDates is empty", () => {
    expect(listUpcomingDepartures([], now)).toEqual([]);
    expect(listUpcomingDepartures(undefined, now)).toEqual([]);
  });

  it("never synthesizes 5/12/19/26 sample dates", () => {
    const dates = listUpcomingDepartures([], now).map((d) => d.dayStr);
    expect(dates).not.toContain("5");
    expect(dates).not.toContain("12");
    expect(dates).not.toContain("19");
    expect(dates).not.toContain("26");
  });

  it("does not invent capacity 20 when capacity is missing", () => {
    const [row] = listUpcomingDepartures(
      [{ date: "2026-09-01", bookedCount: 2 }],
      now,
    );
    expect(row.capacity).toBeNull();
  });
});

describe("Inquiries counts", () => {
  it("displays 0 for an empty response", () => {
    expect(
      inquiryTabCount({
        key: "all",
        activeTab: "all",
        totalCount: 0,
        inquiries: [],
      }),
    ).toBe(0);
    expect(
      inquiryTabCount({
        key: "new",
        activeTab: "contacted",
        totalCount: 0,
        inquiries: [],
      }),
    ).toBe(0);
  });

  it("does not display fake counts on API failure", () => {
    expect(
      inquiryTabCount({
        key: "all",
        activeTab: "all",
        totalCount: 0,
        inquiries: [],
        loadFailed: true,
      }),
    ).toBeNull();
  });
});

describe("Master Database and demo trips", () => {
  it("does not present seed INITIAL_RECORDS as a live API", () => {
    expect(MASTER_DATABASE_API_CONNECTED).toBe(false);
  });

  it("does not enable MOCK trip data from NODE_ENV alone", () => {
    expect(isDemoTripDataEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(
      isDemoTripDataEnabled({
        NODE_ENV: "development",
        NEXT_PUBLIC_ENABLE_DEMO_DATA: "true",
      }),
    ).toBe(true);
    expect(
      isDemoTripDataEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_ENABLE_DEMO_DATA: "true",
      }),
    ).toBe(false);
  });
});

describe("Print and passenger integrity", () => {
  it("does not fall back to Spiti Valley Road Trip", () => {
    expect(printTripTitle("")).toBe("Trip title unavailable");
    expect(printTripTitle(null)).toBe("Trip title unavailable");
    expect(printTripTitle("Spiti Valley Road Trip")).toBe(
      "Spiti Valley Road Trip",
    );
  });
});
