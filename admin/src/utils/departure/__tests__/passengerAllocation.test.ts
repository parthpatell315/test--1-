import { describe, it, expect } from "vitest";
import {
  getBookingGroupKey,
  groupPassengersByBooking,
  normalizeAllocationsToPassengerIds,
} from "../passengerAllocation";

describe("passengerAllocation - getBookingGroupKey & grouping", () => {
  it("should format valid bookingId key cleanly", () => {
    expect(getBookingGroupKey({ bookingId: "BK-1001", id: "p1" })).toBe("booking:BK-1001");
  });

  it("should fall back to passenger.id when bookingId is missing or undefined", () => {
    expect(getBookingGroupKey({ bookingId: undefined, id: "pax-999" })).toBe("passenger:pax-999");
    expect(getBookingGroupKey({ bookingId: null, id: "pax-888" })).toBe("passenger:pax-888");
    expect(getBookingGroupKey({ bookingId: "undefined", id: "pax-777" })).toBe("passenger:pax-777");
  });

  it("should keep distinct passengers with missing booking IDs separate", () => {
    const p1 = { id: "p1", name: "User One" };
    const p2 = { id: "p2", name: "User Two" };

    const grouped = groupPassengersByBooking([p1, p2]);
    expect(Object.keys(grouped).length).toBe(2);
    expect(grouped["passenger:p1"]).toBeDefined();
    expect(grouped["passenger:p2"]).toBeDefined();
  });

  it("should normalize legacy name-based allocation keys to passenger IDs", () => {
    const passengers = [
      { id: "id-101", name: "Vidhi Thummar", bookingId: "BK-1" },
      { id: "id-102", name: "Hemangi", bookingId: "BK-1" },
    ];

    const legacyAllocations = {
      "Vidhi Thummar": { room: "Room 101" },
      "Hemangi": { room: "Room 101" },
    };

    const normalized = normalizeAllocationsToPassengerIds(legacyAllocations, passengers);
    expect(normalized["id-101"]).toBeDefined();
    expect(normalized["id-101"].room).toBe("Room 101");
    expect(normalized["id-102"]).toBeDefined();
    expect(normalized["id-102"].room).toBe("Room 101");
  });

  it("should skip ambiguous duplicate passenger names during legacy migration", () => {
    const passengers = [
      { id: "id-1", name: "John Smith" },
      { id: "id-2", name: "John Smith" },
    ];

    const legacyAllocations = {
      "John Smith": { room: "Room 202" },
    };

    const normalized = normalizeAllocationsToPassengerIds(legacyAllocations, passengers);
    expect(Object.keys(normalized).length).toBe(0);
  });
});
