import { describe, expect, it } from "vitest";
import { allocateWholeRupees, formatINR } from "./utils";

describe("INR helpers", () => {
  it("formats fractional API values as whole rupees", () => {
    expect(formatINR(20571.428571428572)).toBe("₹20,571");
  });

  it("allocates a booking total without losing remainder rupees", () => {
    const allocations = allocateWholeRupees(144000, 7);

    expect(allocations).toEqual([
      20572, 20572, 20572, 20571, 20571, 20571, 20571,
    ]);
    expect(allocations.reduce((sum, amount) => sum + amount, 0)).toBe(144000);
  });
});
