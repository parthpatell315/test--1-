import api from "./api";
import type { Payment, PaymentSummary } from "@/types";

export const paymentsService = {
  async getByBooking(
    bookingId: string,
  ): Promise<{ payments: Payment[]; summary: PaymentSummary }> {
    try {
      const res = await api.get(`/payments/booking/${bookingId}`);
      const rawData = res.data?.data || res.data || [];
      const payments = Array.isArray(rawData)
        ? rawData
        : rawData.payments || [];
      const summary = rawData.summary || {
        totalPaid: 0,
        paymentsCount: 0,
      };
      return { payments, summary };
    } catch (e) {
      console.warn("Failed to fetch payments by booking:", e);
      return {
        payments: [],
        summary: {
          totalPaid: 0,
          paymentsCount: 0,
        },
      };
    }
  },

  async add(data: {
    bookingId: string;
    amount: number;
    paymentMode: string;
    collectionAccountId?: string;
    collectedByAdminId?: string;
    paymentDate?: string;
    reference?: string;
    notes?: string;
    status?: string;
    remarks?: string;
    proofUrl?: string;
    proofUrls?: string[];
  }): Promise<any> {
    try {
      const proofUrls = Array.isArray(data.proofUrls)
        ? data.proofUrls.filter((u) => typeof u === "string" && u.trim())
        : [];
      const primaryProof =
        (typeof data.proofUrl === "string" && data.proofUrl.trim()) ||
        proofUrls[0] ||
        undefined;
      // Primary backend endpoint: POST /payments/client/add/:bookingId
      const res = await api.post(`/payments/client/add/${data.bookingId}`, {
        amount: data.amount,
        paymentMode: data.paymentMode,
        collectionAccountId: data.collectionAccountId,
        collectedByAdminId: data.collectedByAdminId,
        transactionId: data.reference || `TXN-${Date.now()}`,
        paymentDate: data.paymentDate || new Date().toISOString(),
        status: data.status || "Pending Verification",
        remarks: data.notes || data.remarks || "Collected Payment",
        ...(primaryProof ? { proofUrl: primaryProof } : {}),
        ...(proofUrls.length > 0 ? { proofUrls } : {}),
      });
      return res.data?.data || res.data;
    } catch (e: any) {
      console.warn(
        "Primary endpoint /payments/client/add failed, trying fallback /payments endpoint:",
        e,
      );
      const res = await api.post("/payments", data);
      return res.data?.data || res.data;
    }
  },

  async getAll(): Promise<{ payments: Payment[]; totalRevenue: number }> {
    try {
      const res = await api.get("/payments");
      return {
        payments: res.data?.data || [],
        totalRevenue: res.data?.totalRevenue || 0,
      };
    } catch (e) {
      console.warn("Failed to fetch all payments:", e);
      return { payments: [], totalRevenue: 0 };
    }
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/payments/${id}`);
  },

  async refund(
    id: string,
    data: { reason: string; amount?: number },
  ): Promise<void> {
    await api.post(`/payments/${id}/refund`, data);
  },

  async reverse(id: string, data: { reason: string }): Promise<void> {
    await api.post(`/payments/${id}/reverse`, data);
  },

  async updatePaymentAccount(
    paymentId: string,
    collectionAccountId: string,
  ): Promise<any> {
    const res = await api.patch(`/payments/client/${paymentId}/account`, {
      collectionAccountId,
    });
    return res.data;
  },

  async syncTreasuryMappings(): Promise<any> {
    const res = await api.post("/payments/sync-treasury-mappings");
    return res.data;
  },

  async uploadProof(paymentId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("proofFileName", file.name);
    formData.append("proofFileType", file.type || "application/octet-stream");
    const res = await api.post(
      `/finance/collections/${paymentId}/upload-proof`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    const payload = res.data || {};
    if (!payload.success) {
      throw new Error(payload.message || "Failed to upload payment proof");
    }
    const persistedUrl =
      payload.payment?.proofFileUrl ||
      payload.payment?.proofUrl ||
      payload.proof_url;
    if (!persistedUrl) {
      throw new Error("Proof was not persisted on the payment record");
    }
    return payload;
  },

  async uploadProofs(paymentId: string, files: File[]): Promise<any> {
    if (!files?.length) {
      throw new Error("No proof files provided");
    }
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("document", file);
    });
    formData.append("proofFileName", files[0].name);
    formData.append(
      "proofFileType",
      files[0].type || "application/octet-stream",
    );
    const res = await api.post(
      `/finance/collections/${paymentId}/upload-proof`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    const payload = res.data || {};
    if (!payload.success) {
      throw new Error(payload.message || "Failed to upload payment proof");
    }
    const persistedUrl =
      payload.payment?.proofFileUrl ||
      payload.payment?.proofUrl ||
      payload.proof_url;
    if (!persistedUrl) {
      throw new Error("Proof was not persisted on the payment record");
    }
    return payload;
  },
};
