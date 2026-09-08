import api from "./api";

export interface CollectionAccount {
  id: string;
  accountName: string;
  accountHolderName: string;
  accountType: "COMPANY" | "INDIVIDUAL" | "BANK" | "UPI" | "CASH" | "CARD" | "OTHER";
  ownershipType?: string;
  paymentMethods: string[];
  bankName?: string | null;
  accountNumber?: string | null;
  maskedAccountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
  description?: string | null;
  isActive: boolean;
  totalCollected: number;
  totalSubmitted: number;
  pending: number;
  status: "SETTLED" | "PENDING";
  lastCollection?: string | null;
  lastSubmission?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionAccountsResponse {
  data: CollectionAccount[];
  summary: {
    totalCollected: number;
    totalSubmitted: number;
    totalPending: number;
  };
}

export const collectionAccountsService = {
  async getAccounts(params?: { activeOnly?: boolean }): Promise<CollectionAccountsResponse> {
    const query = params?.activeOnly ? "?activeOnly=true" : "";
    const res = await api.get(`/payments/accounts${query}`);
    return {
      data: res.data?.data || [],
      summary: res.data?.summary || { totalCollected: 0, totalSubmitted: 0, totalPending: 0 },
    };
  },

  async createAccount(data: {
    accountName: string;
    accountHolderName?: string;
    accountType: string;
    paymentMethods: string[];
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<CollectionAccount> {
    const res = await api.post("/payments/accounts", data);
    return res.data?.data;
  },

  async updateAccount(
    id: string,
    data: Partial<CollectionAccount>,
  ): Promise<CollectionAccount> {
    const res = await api.put(`/payments/accounts/${id}`, data);
    return res.data?.data;
  },

  async deleteAccount(id: string): Promise<any> {
    const res = await api.delete(`/payments/accounts/${id}`);
    return res.data;
  },

  async getAccountLedger(id: string): Promise<any> {
    const res = await api.get(`/payments/accounts/${id}/ledger`);
    return res.data?.data;
  },

  async recordAccountSubmission(
    id: string,
    data: {
      amount: number;
      submissionMode?: string;
      paymentMode?: string;
      referenceNumber?: string;
      notes?: string;
    },
  ): Promise<any> {
    const res = await api.post(`/payments/accounts/${id}/submit`, {
      ...data,
      paymentMode: data.paymentMode || data.submissionMode || "BANK_TRANSFER",
    });
    return res.data;
  },

  async recordSubmission(
    id: string,
    data: {
      amount: number;
      paymentMode?: string;
      referenceNumber?: string;
      notes?: string;
    },
  ): Promise<any> {
    const res = await api.post(`/payments/accounts/${id}/submit`, data);
    return res.data;
  },

  async recordTransfer(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    paymentMode?: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<any> {
    await api.post(`/payments/accounts/${data.fromAccountId}/submit`, {
      amount: data.amount,
      paymentMode: data.paymentMode || "BANK_TRANSFER",
      referenceNumber: data.referenceNumber,
      notes: `Transfer Out to account ID: ${data.toAccountId}. ${data.notes || ""}`,
    });

    const res = await api.post(`/payments/accounts/${data.toAccountId}/submit`, {
      amount: data.amount,
      paymentMode: data.paymentMode || "BANK_TRANSFER",
      referenceNumber: data.referenceNumber,
      notes: `Recharge / Inward Transfer from account ID: ${data.fromAccountId}. ${data.notes || ""}`,
    });
    return res.data;
  },

  async getVerificationQueue(): Promise<any> {
    const res = await api.get("/payments/verification-queue");
    return res.data?.data;
  },

  async getRiyaSummary(): Promise<any> {
    const res = await api.get("/payments/riya-summary");
    return res.data?.data;
  },
};

export default collectionAccountsService;
