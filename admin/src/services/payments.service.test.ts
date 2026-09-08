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
import { paymentsService } from "./payments.service";

describe("paymentsService.add", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("posts full payment details including proofUrl and transaction reference", async () => {
    const receipt = {
      id: "cp_1",
      amount: 1500,
      proofUrl: "/uploads/proof.jpg",
      transactionId: "UTR123",
      status: "Pending Verification",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: receipt },
    });

    const result = await paymentsService.add({
      bookingId: "bk_1",
      amount: 1500,
      paymentMode: "UPI",
      collectionAccountId: "acc_1",
      reference: "UTR123",
      paymentDate: "2026-08-26T00:00:00.000Z",
      notes: "Collected from Parth",
      proofUrl: "/uploads/proof.jpg",
    });

    expect(api.post).toHaveBeenCalledWith(
      "/payments/client/add/bk_1",
      expect.objectContaining({
        amount: 1500,
        paymentMode: "UPI",
        collectionAccountId: "acc_1",
        transactionId: "UTR123",
        paymentDate: "2026-08-26T00:00:00.000Z",
        remarks: "Collected from Parth",
        proofUrl: "/uploads/proof.jpg",
        status: "Pending Verification",
      }),
    );
    expect(result).toEqual(receipt);
  });

  it("omits proofUrl from the body when not provided", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { id: "cp_2" } },
    });

    await paymentsService.add({
      bookingId: "bk_2",
      amount: 500,
      paymentMode: "Cash",
    });

    const body = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("proofUrl");
    expect(body.transactionId).toMatch(/^TXN-/);
  });
});

describe("paymentsService.uploadProof", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("returns the persisted payment only after the API reports success with a proof URL", async () => {
    const payment = {
      id: "pay_1",
      proofFileUrl: "/uploads/payment-proofs/receipt.jpg",
      proofUrl: "/uploads/payment-proofs/receipt.jpg",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: true,
        payment,
        proof_url: payment.proofFileUrl,
      },
    });

    const result = await paymentsService.uploadProof(
      "pay_1",
      new File(["x"], "receipt.jpg", { type: "image/jpeg" }),
    );

    expect(api.post).toHaveBeenCalledWith(
      "/finance/collections/pay_1/upload-proof",
      expect.any(FormData),
      expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.payment.proofFileUrl).toBe(
      "/uploads/payment-proofs/receipt.jpg",
    );
  });

  it("does not treat a success flag without a persisted proof as complete", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, payment: { id: "pay_1" } },
    });

    await expect(
      paymentsService.uploadProof(
        "pay_1",
        new File(["x"], "receipt.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow(/not persisted/i);
  });

  it("throws when the API reports failure so callers cannot show a success toast", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: false,
        message: "Collection payment not found or access denied",
      },
    });

    await expect(
      paymentsService.uploadProof(
        "pay_1",
        new File(["x"], "receipt.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow(/not found|access denied/i);
  });
});
