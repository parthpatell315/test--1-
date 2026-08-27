import { describe, expect, it } from "vitest";
import { normalizeOpsDayTitle, opsDayDateKey, pickOpsDayRow } from "../opsDayItineraryMatch";

describe("opsDayItineraryMatch", () => {
  it("normalizes DAY 1 and Day 01", () => {
    expect(normalizeOpsDayTitle("DAY 1")).toBe("day 1");
    expect(normalizeOpsDayTitle("Day 01")).toBe("day 1");
  });

  it("keys ISO and display dates to the same calendar day", () => {
    expect(opsDayDateKey("2026-09-08T00:00:00.000Z")).toBe("2026-09-08");
    expect(opsDayDateKey("08 Sep 2026")).toBe("2026-09-08");
  });

  it("prefers the latest ops-typed remark when duplicate day rows exist", () => {
    const picked = pickOpsDayRow(
      [
        { dayTitle: "Day 1", date: "2026-09-08", remarks: "Starting location: Manali\nDestination: Shimla", updatedAt: "2026-01-01" },
        { dayTitle: "DAY 1", date: "2026-09-08", remarks: "UBGUIBUB", updatedAt: "2026-08-23" },
      ],
      "DAY 1",
      "08 Sep 2026",
    );
    expect(picked?.remarks).toBe("UBGUIBUB");
  });
});
