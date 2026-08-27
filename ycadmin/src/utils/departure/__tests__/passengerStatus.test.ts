import { describe, it, expect } from "vitest";
import { isPassengerCancelled, filterActivePassengers } from "../passengerStatus";

describe("passengerStatus - isPassengerCancelled", () => {
  it("should detect cancelled status in different casings and whitespaces", () => {
    expect(isPassengerCancelled({ status: "cancelled" })).toBe(true);
    expect(isPassengerCancelled({ status: "Cancelled" })).toBe(true);
    expect(isPassengerCancelled({ status: "CANCELLED" })).toBe(true);
    expect(isPassengerCancelled({ status: " canceled " })).toBe(true);
    expect(isPassengerCancelled({ status: "REFUNDED" })).toBe(true);
  });

  it("should detect parent booking cancellation", () => {
    expect(isPassengerCancelled({ status: "CONFIRMED" }, { status: "CANCELLED" })).toBe(true);
    expect(isPassengerCancelled({ status: "CONFIRMED" }, { status: "CANCELED" })).toBe(true);
    expect(isPassengerCancelled({ status: "CONFIRMED" }, { bookingStatus: "REFUNDED" })).toBe(true);
  });

  it("should return false for active passengers", () => {
    expect(isPassengerCancelled({ status: "CONFIRMED" }, { status: "CONFIRMED" })).toBe(false);
    expect(isPassengerCancelled({ status: "Form complete" }, { status: "PARTIAL" })).toBe(false);
  });

  it("should filter out cancelled passengers from list", () => {
    const list = [
      { id: "p1", name: "Alice", status: "CONFIRMED" },
      { id: "p2", name: "Bob", status: "CANCELLED" },
      { id: "p3", name: "Charlie", status: " canceled " },
      { id: "p4", name: "Dave", status: "Form complete" },
    ];

    const active = filterActivePassengers(list);
    expect(active.length).toBe(2);
    expect(active.map((p) => p.name)).toEqual(["Alice", "Dave"]);
  });
});
