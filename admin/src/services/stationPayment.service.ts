import api from "./api";

export interface PaymentReceivingAccount {
  id: string;
  accountName: string;
  accountHolderName: string;
  accountType: "BANK" | "UPI";
  ownershipType: "COMPANY" | "STAFF" | "PARTNER";
  bankName?: string;
  maskedAccountNumber?: string;
  upiId?: string;
  linkedAdminId?: string;
  linkedAdmin?: { id: string; name: string };
  isApproved: boolean;
  isActive: boolean;
  approvedByAdminId?: string;
  approvedBy?: { id: string; name: string };
  createdByAdminId?: string;
  createdBy?: { id: string; name: string };
  description?: string;
}

export interface StationPaymentCollection {
  id: string;
  receiptNumber: string;
  bookingId: string;
  tripId: string;
  departureDate: string;
  station: string;
  platform?: string;
  paymentMode: "CASH" | "UPI";
  amount: number;
  previousPaid: number;
  newTotalPaid: number;
  newRemaining: number;
  paymentStatus: string;
  collectedByAdminId: string;
  collectedBy?: { id: string; name: string };
  collectedAt: string;
  collectedFrom: string;
  collectedFromMobile?: string;
  remarks?: string;
  proofImageUrl?: string;
  utrNumber?: string;
  receivingAccountId?: string;
  receivingAccount?: PaymentReceivingAccount;
  upiVerificationStatus?: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  verifiedBy?: { id: string; name: string };
  verifiedAt?: string;
  collectionStatus: "COLLECTED" | "CANCELLED" | "REVERSED";
  emailStatus: string;
  isReversed: boolean;
  createdAt: string;
}

export interface StationCashHandover {
  id: string;
  collectorId: string;
  collector?: { id: string; name: string };
  tripId: string;
  departureDate: string;
  station: string;
  amountExpected: number;
  amountHandedOver: number;
  handoverStatus: "PENDING" | "HANDED_OVER" | "CONFIRMED" | "RECONCILED";
  handoverRecipientId?: string;
  handoverRecipient?: { id: string; name: string };
  handoverAt?: string;
  handoverReference?: string;
  shortageAmount: number;
  excessAmount: number;
  financeConfirmedById?: string;
  financeConfirmedAt?: string;
  reconciledById?: string;
  reconciledAt?: string;
  remarks?: string;
}

export interface DashboardStats {
  totalBookings: number;
  totalPackageAmount: number;
  totalPreviouslyPaid: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalVerifiedUpi: number;
  totalUnverifiedUpi: number;
  totalStationCollection: number;
  grandTotalReceived: number;
  totalRemaining: number;
  fullyPaid: number;
  partiallyPaid: number;
  unpaid: number;
  cashAwaitingHandover: number;
  cashHandedOver: number;
  cashReconciled: number;
  collectorCashSummary: Array<{ id: string; name: string; cash: number }>;
  collectorUpiSummary: Array<{
    id: string;
    name: string;
    upi: number;
    verified: number;
  }>;
}

export interface BookingRow {
  id: string;
  bookingId: string;
  name: string;
  phone?: string;
  email?: string;
  pickupCity?: string;
  salesperson?: string;
  salespersonId?: string;
  numberOfPersons?: number;
  members?: { name: string; phone: string }[];
  finalAmount: number;
  previousPaid: number;
  remaining: number;
  cashCollected: number;
  upiCollected: number;
  verifiedUpi: number;
  pendingUpi: number;
  stationTotal: number;
  grandTotal: number;
  grandRemaining: number;
  paymentStatus: string;
  collectionStatus: string;
  stationPayments: StationPaymentCollection[];
}

export interface CollectPayload {
  bookingId: string;
  tripId: string;
  departureDate: string;
  station: string;
  platform?: string;
  paymentMode: "CASH" | "UPI";
  amount: number;
  collectedFrom: string;
  collectedFromMobile?: string;
  collectedAt?: string;
  remarks?: string;
  proofImageUrl?: string;
  utrNumber?: string;
  receivingAccountId?: string;
  customAccountName?: string;
}

export const stationPaymentService = {
  // Dashboard
  getDashboard: async (params: {
    tripId: string;
    departureDate: string;
    [key: string]: string;
  }) => {
    if (!params.tripId || !params.departureDate) {
      return {
        success: true,
        stats: {
          totalDue: 0,
          totalCollected: 0,
          balanceRemaining: 0,
          cashInHand: 0,
          upiVerified: 0,
          upiPending: 0,
        },
        bookings: [],
        handovers: [],
      };
    }
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const r = await api.get(`/station-payments?${qs}`);
    return r.data as {
      success: boolean;
      stats: DashboardStats;
      bookings: BookingRow[];
      handovers: StationCashHandover[];
    };
  },

  // Accounts
  getAccounts: async () => {
    const r = await api.get("/station-payments/accounts");
    return r.data.data as PaymentReceivingAccount[];
  },

  createAccount: async (payload: Partial<PaymentReceivingAccount>) => {
    const r = await api.post("/station-payments/accounts", payload);
    return r.data;
  },

  approveAccount: async (
    id: string,
    data: { isApproved?: boolean; isActive?: boolean },
  ) => {
    const r = await api.patch(`/station-payments/accounts/${id}/approve`, data);
    return r.data;
  },

  // Collection
  collect: async (payload: CollectPayload) => {
    const r = await api.post("/station-payments/collect", payload);
    return r.data;
  },

  getOne: async (id: string) => {
    const r = await api.get(`/station-payments/${id}`);
    return r.data.data as StationPaymentCollection;
  },

  cancel: async (id: string, reversalReason: string) => {
    const r = await api.post(`/station-payments/${id}/cancel`, {
      reversalReason,
    });
    return r.data;
  },

  verifyUpi: async (
    id: string,
    action: "VERIFY" | "REJECT",
    rejectionReason?: string,
  ) => {
    const r = await api.post(`/station-payments/${id}/verify-upi`, {
      action,
      rejectionReason,
    });
    return r.data;
  },

  resendEmail: async (id: string) => {
    const r = await api.post(`/station-payments/${id}/resend-email`, {});
    return r.data;
  },

  getReceipt: async (id: string) => {
    const r = await api.get(`/station-payments/receipt/${id}`);
    return r.data.data;
  },

  // Handover
  createHandover: async (payload: {
    tripId: string;
    departureDate: string;
    station: string;
    amountHandedOver: number;
    handoverRecipientId: string;
    handoverReference?: string;
    remarks?: string;
  }) => {
    const r = await api.post("/station-payments/handover", payload);
    return r.data;
  },

  confirmHandover: async (id: string) => {
    const r = await api.post(`/station-payments/handover/${id}/confirm`, {});
    return r.data;
  },

  reconcileHandover: async (id: string) => {
    const r = await api.post(`/station-payments/handover/${id}/reconcile`, {});
    return r.data;
  },

  // Reports
  getReports: async (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    const r = await api.get(`/station-payments/reports?${qs}`);
    return r.data.data;
  },
};
