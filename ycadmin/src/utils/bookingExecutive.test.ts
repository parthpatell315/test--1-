import { resolveBookingExecutiveName } from "./bookingExecutive";
import type { Booking } from "@/types";

describe("resolveBookingExecutiveName", () => {
  it("prefers salesAdmin.name over legacy salesPersonName", () => {
    const booking = {
      salesAdminId: "admin_1",
      salesAdmin: { id: "admin_1", name: "Priya Sales" },
      salesPersonName: "Direct",
      createdByName: "Priya Sales",
    } as Booking;

    expect(resolveBookingExecutiveName(booking)).toBe("Priya Sales");
  });

  it("uses createdByName when salesAdmin object is missing", () => {
    const booking = {
      salesAdminId: "admin_1",
      createdByName: "Rahul Ops",
      salesPersonName: "Direct",
    } as Booking;

    expect(resolveBookingExecutiveName(booking)).toBe("Rahul Ops");
  });

  it("falls back to Web Direct when unassigned", () => {
    const booking = {
      salesPersonName: "Direct",
    } as Booking;

    expect(resolveBookingExecutiveName(booking)).toBe("Web Direct");
  });

  it("resolves via adminMap when relation missing", () => {
    const booking = {
      salesAdminId: "cm123adminid",
    } as Booking;

    expect(
      resolveBookingExecutiveName(booking, { cm123adminid: "Mapped Name" }),
    ).toBe("Mapped Name");
  });
});
