import { describe, expect, it } from "vitest";
import {
  isGuideExpenseType,
  listActiveAssignedGuides,
} from "../guideAssignments";

describe("listActiveAssignedGuides", () => {
  it("counts one assigned guide and ignores cancelled duplicates", () => {
    const rows = [
      {
        id: "1",
        guideName: "Dikshu Sharma",
        assignmentType: "TRIP_LEADER",
        assignmentStatus: "ASSIGNED",
        agreedAmount: 9000,
      },
      {
        id: "2",
        guideName: "Dikshu Sharma",
        assignmentType: "PRIMARY_GUIDE",
        assignmentStatus: "CANCELLED",
        agreedAmount: 9000,
      },
      {
        id: "3",
        assignmentType: "EXPENSE_FOOD",
        assignmentStatus: "ASSIGNED",
        agreedAmount: 1000,
      },
    ];
    const active = listActiveAssignedGuides(rows);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("1");
    expect(active.reduce((s, g) => s + (g.agreedAmount || 0), 0)).toBe(9000);
  });

  it("does not treat trip expenses as assigned guides", () => {
    expect(isGuideExpenseType("EXPENSE_TRANSPORTATION")).toBe(true);
    expect(listActiveAssignedGuides([{ assignmentType: "EXPENSE" }])).toEqual(
      [],
    );
  });
});
