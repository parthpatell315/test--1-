import { describe, expect, it } from "vitest";
import {
  isAllocOnFleet,
  renumberVehicleAllocations,
  withSequentialSeats,
} from "../vehicleSeatAlloc";

describe("vehicleSeatAlloc", () => {
  it("renumbers display seats 1..n with no skips or duplicates", () => {
    const numbered = withSequentialSeats([
      { travelerName: "Riddhi", seatNumber: "13" },
      { travelerName: "Sanjay", seatNumber: "13" },
      { travelerName: "Asha", seatNumber: "1" },
      { travelerName: "Bina", seatNumber: "12" },
    ]);
    expect(numbered.map((t) => t.displaySeat)).toEqual([1, 2, 3, 4]);
    expect(numbered.map((t) => t.travelerName)).toEqual(["Asha", "Bina", "Riddhi", "Sanjay"]);
  });

  it("does not put two hashed vehicles on the same list just because both have #1", () => {
    const fleet = [
      { id: "f1", name: "Om Sir Rudraksh 14 Seater #1" },
      { id: "f2", name: "Other Operator 14 Seater #1" },
    ];
    expect(
      isAllocOnFleet({ vehicle: "Other Operator 14 Seater #1", fleetId: "f2" }, fleet[0], 0, fleet),
    ).toBe(false);
    expect(
      isAllocOnFleet({ vehicle: "Other Operator 14 Seater #1", fleetId: "f2" }, fleet[1], 1, fleet),
    ).toBe(true);
  });

  it("renumbers persisted seats uniquely per fleet", () => {
    const out = renumberVehicleAllocations([
      { fleetId: "a", travelerName: "Zed", seatNumber: 12 },
      { fleetId: "a", travelerName: "Ann", seatNumber: 12 },
      { fleetId: "b", travelerName: "Kay", seatNumber: 3 },
    ]);
    const a = out.filter((r) => r.fleetId === "a").map((r) => r.seatNumber);
    const b = out.filter((r) => r.fleetId === "b").map((r) => r.seatNumber);
    expect(a).toEqual([1, 2]);
    expect(b).toEqual([1]);
  });
});
