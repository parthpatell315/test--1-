import { describe, expect, it } from "vitest";
import {
  computeOperationalReadinessScore,
  readinessInputFromOpsSummary,
  calculateReadinessScore,
} from "../readinessUtils";

describe("computeOperationalReadinessScore", () => {
  it("matches SPT-style overview: hotels/transport/guides full, low payments, no tasks", () => {
    const result = computeOperationalReadinessScore({
      hotelsAssigned: 8,
      hotelsTarget: 8,
      transportAssigned: 2,
      transportRequired: 2,
      guideCount: 1,
      tasksDone: 0,
      tasksTotal: 32,
      paymentsCollectedPercent: 23.1,
    });
    // 25 + 25 + 20 + 0 + ~3.465 → 73
    expect(result.score).toBe(73);
    expect(result.isReady).toBe(false);
  });

  it("returns 100 when all dimensions complete", () => {
    const result = computeOperationalReadinessScore({
      hotelsAssigned: 5,
      hotelsTarget: 5,
      transportAssigned: 2,
      transportRequired: 2,
      guideCount: 1,
      tasksDone: 10,
      tasksTotal: 10,
      paymentsCollectedPercent: 100,
    });
    expect(result.score).toBe(100);
    expect(result.isReady).toBe(true);
  });

  it("does not hardcode 50% for bookings-only stubs", () => {
    // Old bug: participants + fake outstanding=0 → always 50
    const withPaxNoOps = computeOperationalReadinessScore({
      hotelsAssigned: 0,
      hotelsTarget: 0, // no hotel rows yet → hotels slice complete (25)
      transportAssigned: 0,
      transportRequired: 2,
      guideCount: 0,
      tasksDone: 0,
      tasksTotal: 0, // no tasks yet → tasks slice complete (15)
      paymentsCollectedPercent: 23.1,
    });
    // 25 + 0 + 0 + 15 + ~3.465 → 43
    expect(withPaxNoOps.score).not.toBe(50);
    expect(withPaxNoOps.score).toBe(43);
  });
});

describe("readinessInputFromOpsSummary", () => {
  it("maps workspace summary + booking money into operational inputs", () => {
    const input = readinessInputFromOpsSummary({
      summary: {
        acceptedTravelerCount: 20,
        hotelTransportStatus: {
          hotelsTotal: 8,
          hotelsConfirmed: 8,
          transportTotal: 2,
        },
        checklistCompletion: { completed: 0, total: 32 },
        leaders: [{ id: "1" }],
      },
      totalRevenue: 100000,
      customerOutstanding: 76900,
      customerPaid: 23100,
      participantCount: 20,
    });
    expect(input.hotelsAssigned).toBe(8);
    expect(input.hotelsTarget).toBe(8);
    expect(input.transportAssigned).toBe(2);
    expect(input.transportRequired).toBe(2); // ceil(20/17)=2
    expect(input.guideCount).toBe(1);
    expect(input.tasksDone).toBe(0);
    expect(input.tasksTotal).toBe(32);
    expect(input.paymentsCollectedPercent).toBe(23.1);
    expect(computeOperationalReadinessScore(input).score).toBe(73);
  });
});

describe("calculateReadinessScore (legacy bridge)", () => {
  it("no longer returns a flat 50 for participants + zero outstanding stub", () => {
    const score = calculateReadinessScore({
      stats: {
        totalParticipants: 10,
        totalRevenue: 1,
        customerOutstanding: 0,
      },
      vendors: [],
      fleet: [],
    });
    // hotelsTarget 0 → 25, transport 0/1 → 0, guides 0, tasks none → 15, paid 100% → 15 = 55
    expect(score).toBe(55);
    expect(score).not.toBe(50);
  });
});
