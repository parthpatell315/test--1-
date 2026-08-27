import { describe, expect, it } from "vitest";
import {
  applyGroupNameToItems,
  applyGroupQtyToItems,
  aggregateBookingItemsForGroupView,
  stripPersonTag,
} from "../bookingItemGrouping";

describe("bookingItemGrouping", () => {
  it("preserves [Person] tags when renaming a group row", () => {
    const items = [
      { id: "a", name: "NON AC SLEEPER [Chirag]", rate: 23000, qty: 1 },
      { id: "b", name: "NON AC SLEEPER [Drashti]", rate: 23000, qty: 1 },
    ];
    const next = applyGroupNameToItems(items, ["a", "b"], "3AC SLEEPER");
    expect(next[0].name).toBe("3AC SLEEPER [Chirag]");
    expect(next[1].name).toBe("3AC SLEEPER [Drashti]");
  });

  it("does not collapse per-person rows when group qty stays at pax count", () => {
    const items = [
      { id: "a", name: "Pkg [A]", rate: 20000, qty: 1 },
      { id: "b", name: "Pkg [B]", rate: 20000, qty: 1 },
      { id: "c", name: "Pkg [C]", rate: 20000, qty: 1 },
    ];
    const next = applyGroupQtyToItems(items, ["a", "b", "c"], 3);
    expect(next.filter((x) => x.qty === 1)).toHaveLength(3);
    expect(next.map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("deactivates extra person rows when group qty shrinks", () => {
    const items = [
      { id: "a", name: "Pkg [A]", rate: 20000, qty: 1 },
      { id: "b", name: "Pkg [B]", rate: 20000, qty: 1 },
      { id: "c", name: "Pkg [C]", rate: 20000, qty: 1 },
    ];
    const next = applyGroupQtyToItems(items, ["a", "b", "c"], 2);
    expect(next).toHaveLength(2);
    expect(next.every((x) => x.qty === 1)).toBe(true);
  });

  it("aggregates same-rate per-person lines into one group row", () => {
    const rows = aggregateBookingItemsForGroupView([
      { id: "a", name: "NON AC [A]", rate: 23000, qty: 1 },
      { id: "b", name: "NON AC [B]", rate: 23000, qty: 1 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(2);
    expect(stripPersonTag(rows[0].name)).toBe("NON AC");
    expect(rows[0].originalIds).toEqual(["a", "b"]);
  });
});
