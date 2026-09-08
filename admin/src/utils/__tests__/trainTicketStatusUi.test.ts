import { describe, expect, it } from "vitest";
import {
  dedupeActiveTicketsPerTraveler,
  isGroupTrainTicketingDone,
  isTrainTicketDone,
  isTrainTicketRequired,
  simpleTrainTicketStateToApi,
  toSimpleTrainTicketState,
  trainTicketProgressLabel,
  trainTicketRequirementLabel,
} from "../trainTicketStatusUi";

describe("isTrainTicketRequired / req vs non-req", () => {
  it("marks NOT_REQUIRED / SELF_BOOKED / explicit false as non-req", () => {
    expect(
      trainTicketRequirementLabel({
        trainTicketRequired: false,
        trainTicketStatus: "PENDING",
      }),
    ).toBe("non-req");
    expect(
      trainTicketRequirementLabel({
        trainTicketRequired: true,
        trainTicketStatus: "NOT_REQUIRED",
      }),
    ).toBe("non-req");
    expect(
      trainTicketRequirementLabel({
        trainTicketStatus: "SELF_BOOKED",
      }),
    ).toBe("non-req");
  });

  it("marks confirmation-time PENDING / CONFIRMED as req", () => {
    expect(
      trainTicketRequirementLabel({
        trainTicketStatus: "PENDING",
        status: "confirmed",
      }),
    ).toBe("req");
    expect(
      trainTicketRequirementLabel({
        trainTicketRequired: true,
        trainTicketStatus: "CONFIRMED",
      }),
    ).toBe("req");
  });

  it("honours explicit trainTicketRequired true", () => {
    expect(isTrainTicketRequired({ trainTicketRequired: true })).toBe(true);
  });
});

describe("ticket done vs not done", () => {
  it("PENDING is not done with clear label", () => {
    expect(isTrainTicketDone({ ticketStatus: "PENDING" })).toBe(false);
    expect(trainTicketProgressLabel({ ticketStatus: "PENDING" })).toBe(
      "Not done",
    );
    expect(toSimpleTrainTicketState({ ticketStatus: "PENDING" })).toBe(
      "NOT_DONE",
    );
  });

  it("CONFIRMED / BOOKED / RAC are done", () => {
    expect(isTrainTicketDone({ ticketStatus: "CONFIRMED" })).toBe(true);
    expect(isTrainTicketDone({ ticketStatus: "BOOKED" })).toBe(true);
    expect(isTrainTicketDone({ ticketStatus: "RAC" })).toBe(true);
    expect(toSimpleTrainTicketState({ ticketStatus: "ISSUED" })).toBe("DONE");
    expect(trainTicketProgressLabel({ ticketStatus: "CONFIRMED" })).toBe(
      "Done",
    );
  });

  it("NOT_REQUIRED maps to Not required", () => {
    expect(toSimpleTrainTicketState({ ticketStatus: "NOT_REQUIRED" })).toBe(
      "NOT_REQUIRED",
    );
    expect(trainTicketProgressLabel({ ticketStatus: "NOT_REQUIRED" })).toBe(
      "Not required",
    );
  });

  it("maps simple UI state to API without downgrading ISSUED", () => {
    expect(simpleTrainTicketStateToApi("DONE")).toBe("CONFIRMED");
    expect(simpleTrainTicketStateToApi("DONE", "ISSUED")).toBe("ISSUED");
    expect(simpleTrainTicketStateToApi("NOT_DONE", "ISSUED")).toBe("PENDING");
    expect(simpleTrainTicketStateToApi("NOT_REQUIRED")).toBe("NOT_REQUIRED");
  });
});

describe("isGroupTrainTicketingDone", () => {
  it("is green/clear when non-req", () => {
    expect(
      isGroupTrainTicketingDone(
        { trainTicketStatus: "NOT_REQUIRED" },
        [{ ticketStatus: "PENDING" }],
      ),
    ).toBe(true);
  });

  it("is not done when required and any live ticket pending", () => {
    expect(
      isGroupTrainTicketingDone(
        { trainTicketRequired: true, trainTicketStatus: "PENDING" },
        [
          { ticketStatus: "CONFIRMED" },
          { ticketStatus: "PENDING" },
        ],
      ),
    ).toBe(false);
  });

  it("is done when all live tickets confirmed", () => {
    expect(
      isGroupTrainTicketingDone(
        { trainTicketRequired: true, trainTicketStatus: "PENDING" },
        [
          { ticketStatus: "CONFIRMED" },
          { ticketStatus: "CONFIRMED" },
        ],
      ),
    ).toBe(true);
  });
});

describe("dedupeActiveTicketsPerTraveler", () => {
  it("collapses duplicate departure rows keeping Done", () => {
    const tickets = [
      {
        id: "1",
        travelerName: "Ayan Lakhani",
        passengerReference: "DEPARTURE",
        ticketStatus: "CONFIRMED",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "2",
        travelerName: "Ayan Lakhani",
        passengerReference: "DEPARTURE",
        ticketStatus: "PENDING",
        createdAt: "2026-08-20T00:00:00.000Z",
      },
      {
        id: "3",
        travelerName: "Ayan Lakhani",
        passengerReference: "RETURN",
        ticketStatus: "PENDING",
      },
      {
        id: "4",
        travelerName: "Ayan Lakhani",
        passengerReference: "DEPARTURE",
        ticketStatus: "CANCELLED",
      },
    ];
    const out = dedupeActiveTicketsPerTraveler(tickets as any);
    expect(out).toHaveLength(2);
    expect(out.find((t) => t.passengerReference === "DEPARTURE")?.id).toBe("1");
    expect(out.find((t) => t.passengerReference === "RETURN")?.id).toBe("3");
  });
});
