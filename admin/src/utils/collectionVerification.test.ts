import { describe, expect, it } from "vitest";
import {
  canVerifyCollection,
  canonicalCollectionStatus,
  isCollectionPending,
  isCollectionVerified,
  isEligibleCollectionAssignee,
  canApproveStationCash,
  canReviewVendorPayout,
  canApproveVendorPayoutFounder,
} from "./collectionVerification";

describe("canonicalCollectionStatus", () => {
  it("does not display a pending approval as verified", () => {
    expect(canonicalCollectionStatus("PENDING", "Verified")).toBe("PENDING");
    expect(canonicalCollectionStatus("REVIEWED_FINANCE_CONTROLLER", "Pending Verification")).toBe(
      "PENDING",
    );
    expect(isCollectionVerified("PENDING")).toBe(false);
    expect(isCollectionPending("PENDING", "Verified")).toBe(true);
  });

  it("displays APPROVED_FOUNDER as verified even if receipt text differs", () => {
    expect(canonicalCollectionStatus("APPROVED_FOUNDER", "Pending Verification")).toBe(
      "VERIFIED",
    );
    expect(isCollectionVerified("APPROVED_FOUNDER")).toBe(true);
    expect(isCollectionPending("APPROVED_FOUNDER", "Verified")).toBe(false);
    expect(canonicalCollectionStatus(null, "Verified")).toBe("PENDING");
    expect(canonicalCollectionStatus(null, "APPROVED")).toBe("PENDING");
    expect(isCollectionPending(null, "APPROVED")).toBe(true);
  });
});

describe("canVerifyCollection identity", () => {
  it("allows founder and finance controller", () => {
    expect(canVerifyCollection({ role: "founder" })).toBe(true);
    expect(canVerifyCollection({ role: "superadmin" })).toBe(true);
    expect(canVerifyCollection({ role: "finance_controller" })).toBe(true);
  });

  it("allows admin only when they are the protected founder identity", () => {
    expect(canVerifyCollection({ role: "admin" })).toBe(false);
    expect(
      canVerifyCollection({
        role: "admin",
        email: "hemal.patel@youthcamping.online",
      }),
    ).toBe(true);
  });

  it("only Founder and Finance Controller are eligible approval assignees", () => {
    expect(isEligibleCollectionAssignee({ role: "founder" })).toBe(true);
    expect(isEligibleCollectionAssignee({ role: "finance_controller" })).toBe(true);
    expect(isEligibleCollectionAssignee({ role: "admin" })).toBe(false);
    expect(isEligibleCollectionAssignee({ role: "sales" })).toBe(false);
    expect(isEligibleCollectionAssignee({ role: "operations" })).toBe(false);
  });

  it("denies sales, viewer, ops, guide, generic finance, and custom roles", () => {
    expect(canVerifyCollection({ role: "sales" })).toBe(false);
    expect(canVerifyCollection({ role: "viewer" })).toBe(false);
    expect(canVerifyCollection({ role: "operations" })).toBe(false);
    expect(canVerifyCollection({ role: "guide" })).toBe(false);
    expect(canVerifyCollection({ role: "finance" })).toBe(false);
    expect(
      canVerifyCollection({
        role: "custom",
        permissions: ["finance.incoming.verify", "accounting.approve", "ops.manage"],
      }),
    ).toBe(false);
  });

  it("does not let isSuperuser bypass Founder / Finance Controller", () => {
    expect(canVerifyCollection({ role: "admin", isSuperuser: true })).toBe(false);
    expect(
      canVerifyCollection({
        role: "admin",
        isSuperuser: true,
        permissions: ["accounting.approve", "finance.incoming.verify", "ops.manage", "bookings.edit", "payments.edit"],
      }),
    ).toBe(false);
  });
});

describe("canApproveStationCash", () => {
  it("allows founder/superadmin/isSuperuser and protected founder email, not finance_controller or email substring", () => {
    expect(canApproveStationCash({ role: "superadmin" })).toBe(true);
    expect(canApproveStationCash({ role: "founder" })).toBe(true);
    expect(canApproveStationCash({ role: "admin", isSuperuser: true })).toBe(true);
    expect(canApproveStationCash({ role: "admin", email: "hemal.patel@youthcamping.online" })).toBe(true);
    expect(canApproveStationCash({ role: "finance_controller" })).toBe(false);
    expect(canApproveStationCash({ role: "admin", email: "hemal.assistant@youthcamping.online" })).toBe(false);
  });
});

describe("vendor payout one-step verify", () => {
  it("lets only Finance Controller and Founder verify", () => {
    expect(canReviewVendorPayout({ role: "finance_controller" })).toBe(true);
    expect(canApproveVendorPayoutFounder({ role: "finance_controller" })).toBe(true);
    expect(canReviewVendorPayout({ role: "founder" })).toBe(true);
    expect(canReviewVendorPayout({ role: "superadmin" })).toBe(true);
    expect(canReviewVendorPayout({ role: "operations" })).toBe(false);
    expect(canReviewVendorPayout({ role: "finance" })).toBe(false);
    expect(canReviewVendorPayout({ role: "admin" })).toBe(false);
    expect(canReviewVendorPayout({ role: "sales" })).toBe(false);
  });
});
