import { describe, it, expect } from "vitest";
import { calculateRoomOccupancy } from "../accommodationCalculator";

describe("accommodationCalculator", () => {
  it("should calculate exact room capacity from double, triple, and quad counts", () => {
    const bookings = [
      { doubleRoomsCount: 2, tripleRoomsCount: 1, quadRoomsCount: 1 },
    ];
    const pax = [
      { id: "1" }, { id: "2" }, { id: "3" },
      { id: "4" }, { id: "5" }, { id: "6 text" },
      { id: "7" }, { id: "8" }, { id: "9" }, { id: "10" },
    ];

    const summary = calculateRoomOccupancy(bookings, pax);
    // Capacity = 2*2 + 1*3 + 1*4 = 4 + 3 + 4 = 11
    expect(summary.totalRooms).toBe(4);
    expect(summary.roomCapacity).toBe(11);
    expect(summary.totalActivePax).toBe(10);
    expect(summary.isCapacityShortfall).toBe(false);
  });

  it("should detect capacity shortfall warning when pax exceeds room capacity", () => {
    const bookings = [
      { doubleRoomsCount: 1, tripleRoomsCount: 1, quadRoomsCount: 0 },
    ]; // Capacity = 2 + 3 = 5
    const pax = [
      { id: "1" }, { id: "2" }, { id: "3" },
      { id: "4" }, { id: "5" }, { id: "6" }, { id: "7" },
    ]; // 7 pax

    const summary = calculateRoomOccupancy(bookings, pax);
    expect(summary.roomCapacity).toBe(5);
    expect(summary.isCapacityShortfall).toBe(true);
    expect(summary.shortfallPax).toBe(2);
  });

  it("should return zero metrics when no accommodation is configured without inventing fallbacks", () => {
    const summary = calculateRoomOccupancy([], [{ id: "1" }]);
    expect(summary.totalRooms).toBe(0);
    expect(summary.roomCapacity).toBe(0);
    expect(summary.hasAccommodationConfigured).toBe(false);
  });
});
