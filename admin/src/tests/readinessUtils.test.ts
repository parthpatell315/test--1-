import { describe, it, expect } from "vitest";
import { calculateReadinessScore } from "../utils/readinessUtils";

describe("calculateReadinessScore Utility Suite", () => {
  it("should return 0 when params are null or undefined (API loading or error state)", () => {
    expect(calculateReadinessScore(null)).toBe(0);
    expect(calculateReadinessScore(undefined)).toBe(0);
  });

  it("should return 0 for an empty departure with no bookings, vendors, or fleet", () => {
    expect(calculateReadinessScore({})).toBe(0);
    expect(
      calculateReadinessScore({
        stats: { totalParticipants: 0, totalRevenue: 0 },
        vendors: [],
        fleet: [],
        documents: [],
      }),
    ).toBe(0);
  });

  it("should calculate correctly when hotels are loaded but guides are not yet loaded", () => {
    const result = calculateReadinessScore({
      stats: {
        totalParticipants: 10,
        totalRevenue: 100000,
        customerOutstanding: 0,
        customerPaid: 100000,
      },
      vendors: [{ vendorType: "hotel", paymentStatus: "paid" }],
      fleet: [],
      documents: [],
    });
    // 20 (participants) + 30 (paid revenue) + 15 (hotel confirmed) = 65
    expect(result).toBe(65);
  });

  it("should handle null/malformed items inside vendors or fleet arrays gracefully", () => {
    const result = calculateReadinessScore({
      stats: {
        totalParticipants: 5,
        totalRevenue: 50000,
        customerOutstanding: 25000,
        customerPaid: 25000,
      },
      vendors: [
        null,
        undefined,
        { vendorType: "hotel", paymentStatus: "paid" },
      ],
      fleet: [null],
      documents: [undefined],
    });
    // 20 (participants) + 15 (50% paid revenue) + 15 (hotels) = 50
    expect(result).toBe(50);
  });

  it("should calculate 100% when all criteria (participants, revenue, hotels, guides, transport, docs) are fulfilled", () => {
    const result = calculateReadinessScore({
      stats: {
        totalParticipants: 20,
        totalRevenue: 200000,
        customerOutstanding: 0,
        customerPaid: 200000,
      },
      vendors: [
        { vendorType: "hotel", paymentStatus: "paid" },
        { vendorType: "guide", name: "Ramesh Guide" },
      ],
      fleet: [{ id: "v1", vehicle: "Tempo 1" }],
      documents: [{ status: "VERIFIED" }],
    });
    // 20 + 30 + 15 + 15 + 10 + 10 = 100
    expect(result).toBe(100);
  });
});
