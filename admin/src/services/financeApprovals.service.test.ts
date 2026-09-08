import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "./api";
import { financeApprovalsService } from "./financeApprovals.service";

describe("financeApprovalsService.verifyCollection", () => {
  beforeEach(() => {
    vi.mocked(api.patch).mockReset();
  });

  it("completes single verification through the founder-approve endpoint", async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        success: true,
        payment: { id: "pay_1", approvalStatus: "APPROVED_FOUNDER", status: "Verified" },
      },
    });

    const result = await financeApprovalsService.verifyCollection("pay_1", {
      reason: "Bank credit seen",
    });

    expect(api.patch).toHaveBeenCalledWith(
      "/finance/collections/pay_1/approve-founder",
      { reason: "Bank credit seen" },
    );
    expect(result.payment.approvalStatus).toBe("APPROVED_FOUNDER");
    expect(result.payment.status).toBe("Verified");
  });
});

describe("financeApprovalsService vendor two-step", () => {
  it("reviews through the FC endpoint and approves through the founder endpoint", async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { success: true, payment: { approvalStatus: "REVIEWED_FINANCE_CONTROLLER" } },
    });
    await financeApprovalsService.reviewVendorPaymentFC("vp_1", { reason: "Invoice checked" });
    expect(api.patch).toHaveBeenCalledWith("/finance/vendor-payments/vp_1/review-fc", {
      reason: "Invoice checked",
    });

    vi.mocked(api.patch).mockResolvedValue({
      data: { success: true, payment: { approvalStatus: "APPROVED_FOUNDER", status: "Paid" } },
    });
    await financeApprovalsService.approveVendorPaymentFounder("vp_1", { reason: "Cleared" });
    expect(api.patch).toHaveBeenCalledWith("/finance/vendor-payments/vp_1/approve-founder", {
      reason: "Cleared",
    });
  });
});
