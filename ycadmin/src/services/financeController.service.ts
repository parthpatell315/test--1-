import { api } from "./api";
import type {
  FinanceControlCenterStats,
  CashSubmissionItem,
  IncomingPaymentItem,
  VendorPaymentRequestItem,
  TicketFinanceAuditItem,
  DiscrepancyItem,
  FinancialAuditLogItem,
  DeparturePayoutItem,
  MiscellaneousExpenseItem,
  RefundTransactionItem,
  CreditNoteUsageItem,
  CouponItem,
  FinanceTicketItem,
  ServiceRegistryItem,
  TaskAllotmentItem,
  TaskCommentItem,
  TaskDashboardData,
  AuditLogItem,
  TripPnLData,
} from "@/types";

export const financeControllerService = {
  // ── Stats & Verification Queues ──
  getStats: async (): Promise<FinanceControlCenterStats> => {
    const res = await api.get("/finance/control-center/stats");
    return res.data.data;
  },

  getCashQueue: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CashSubmissionItem[]; pagination: any }> => {
    const res = await api.get("/finance/control-center/cash-queue", { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getStationCashQueue: async (params?: {
    departureDate?: string;
    tripId?: string;
    station?: string;
    status?: string;
    search?: string;
  }): Promise<{
    summary: {
      totalCashCollected: number;
      totalCashPending: number;
      totalCashVerified: number;
      totalDepartures: number;
      totalStations: number;
      totalPassengers: number;
      pendingCount: number;
      verifiedCount: number;
    };
    dateGroups: Array<{
      departureDate: string;
      totalAmount: number;
      pendingAmount: number;
      verifiedAmount: number;
      passengersCount: number;
      stationsCount: number;
      stationGroups: Array<{
        stationKey: string;
        tripId: string;
        tripName: string;
        station: string;
        departureDate: string;
        totalAmount: number;
        pendingAmount: number;
        verifiedAmount: number;
        pendingItems: number;
        verifiedItems: number;
        collectors: string[];
        isFullyVerified: boolean;
        items: any[];
      }>;
    }>;
    allCollections: any[];
  }> => {
    const res = await api.get("/finance/control-center/station-cash-queue", { params });
    return res.data.data;
  },

  batchVerifyStationCash: async (payload: {
    collectionIds?: string[];
    tripId?: string;
    departureDate?: string;
    station?: string;
    action?: "APPROVE" | "REJECT";
    notes?: string;
  }): Promise<any> => {
    const res = await api.post("/finance/control-center/station-cash/batch-verify", payload);
    return res.data;
  },

  getIncomingQueue: async (params?: {
    status?: string;
    paymentMode?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: IncomingPaymentItem[]; pagination: any }> => {
    const res = await api.get("/finance/control-center/incoming-queue", { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getVendorQueue: async (params?: {
    tripId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: VendorPaymentRequestItem[]; pagination: any }> => {
    const res = await api.get("/finance/control-center/vendor-queue", { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getTripWiseVendorAccounts: async (params?: {
    tripId?: string;
    category?: string;
    search?: string;
  }): Promise<{
    success: boolean;
    summary: {
      totalAgreed: number;
      totalPaid: number;
      totalDue: number;
      totalTrips: number;
      totalVendors: number;
      pendingBillsCount: number;
    };
    tripGroups: Array<{
      tripId: string;
      tripCode: string;
      tripTitle: string;
      tripLocation: string;
      totalAgreed: number;
      totalPaid: number;
      totalDue: number;
      pendingApprovals: number;
      categories: {
        hotels: { count: number; agreed: number; paid: number; due: number };
        transport: { count: number; agreed: number; paid: number; due: number };
        activities: { count: number; agreed: number; paid: number; due: number };
        guides: { count: number; agreed: number; paid: number; due: number };
        meals_other: { count: number; agreed: number; paid: number; due: number };
      };
      items: Array<{
        id: string;
        sourceType: string;
        tripId: string;
        tripCode: string;
        tripTitle: string;
        tripLocation: string;
        vendorName: string;
        category: "HOTELS" | "TRANSPORT" | "ACTIVITIES" | "GUIDES" | "MEALS_OTHER";
        categoryLabel: string;
        serviceDescription: string;
        departureDate: string | null;
        agreedAmount: number;
        advancePaid: number;
        remainingPayable: number;
        status: string;
        approvalStatus: string;
        requiresFounderApproval: boolean;
        invoiceFileUrl: string | null;
        createdAt: string;
      }>;
    }>;
    items: any[];
  }> => {
    const res = await api.get("/finance/control-center/tripwise-vendor-accounts", { params });
    return res.data;
  },

  getTicketingQueue: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TicketFinanceAuditItem[]; pagination: any }> => {
    const res = await api.get("/finance/control-center/ticketing-queue", { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getDeparturesQueue: async (): Promise<DeparturePayoutItem[]> => {
    const res = await api.get("/finance/control-center/departures-queue");
    return res.data.data;
  },

  getExpensesQueue: async (): Promise<MiscellaneousExpenseItem[]> => {
    const res = await api.get("/finance/control-center/expenses-queue");
    return res.data.data;
  },

  getDiscrepanciesQueue: async (): Promise<DiscrepancyItem[]> => {
    const res = await api.get("/finance/control-center/discrepancies-queue");
    return res.data.data;
  },

  getAuditLog: async (limit = 50): Promise<FinancialAuditLogItem[]> => {
    const res = await api.get("/finance/control-center/audit-log", { params: { limit } });
    return res.data.data;
  },

  // ── Verification Actions ──
  performCashAction: async (
    id: string,
    payload: {
      action:
        | "APPROVE"
        | "APPROVE_WITH_DISCREPANCY"
        | "REJECT"
        | "REQUEST_CLARIFICATION"
        | "RECORD_ADJUSTMENT"
        | "FLAG_DISCREPANCY";
      notes?: string;
      reason?: string;
      adjustmentAmount?: number;
      adjustmentNote?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/cash/${id}/action`, payload);
    return res.data;
  },

  performIncomingAction: async (
    id: string,
    payload: {
      action: "VERIFY" | "REJECT" | "FLAG_DISCREPANCY";
      notes?: string;
      reason?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/incoming/${id}/action`, payload);
    return res.data;
  },

  assignIncomingPayment: async (
    id: string,
    assigneeId: string | null
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/incoming/${id}/assign`, { assigneeId });
    return res.data;
  },

  listCollectionVerifiers: async (): Promise<
    { id: string; name: string; email?: string; role?: string }[]
  > => {
    const res = await api.get("/finance/control-center/collection-verifiers");
    return res.data?.data || [];
  },

  performVendorAction: async (
    id: string,
    payload: {
      action: "VERIFY" | "APPROVE_AND_PAY" | "RECORD_PAYMENT";
      paidAmount?: number;
      paymentMode?: string;
      transactionRef?: string;
      notes?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/vendor/${id}/action`, payload);
    return res.data;
  },

  performTicketingAction: async (
    id: string,
    payload: {
      action: "APPROVE" | "FLAG_VARIANCE" | "REJECT";
      auditedCost?: number;
      notes?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/ticketing/${id}/action`, payload);
    return res.data;
  },

  performDepartureAction: async (
    id: string,
    payload: {
      action: "APPROVE" | "PAID" | "REJECT";
      notes?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/departures/${id}/action`, payload);
    return res.data;
  },

  performExpenseAction: async (
    id: string,
    payload: {
      action: "APPROVE" | "REJECT";
      notes?: string;
      reason?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/finance/control-center/expenses/${id}/action`, payload);
    return res.data;
  },

  createExpense: async (payload: {
    type: "MISCELLANEOUS" | "ACTIVITY";
    tripId: string;
    departureDate: string;
    category?: string;
    description?: string;
    amount?: number;
    activity?: string;
    paymentDate?: string;
    totalAmount?: number;
    amountPaid?: number;
    remarks?: string;
    receiptUrl?: string;
    paymentMode?: string;
  }): Promise<any> => {
    const res = await api.post("/finance/control-center/expenses", payload);
    return res.data;
  },

  // ── 1. Refunds & Credits API ──
  refunds: {
    list: async (params?: {
      status?: string;
      bookingId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<{ data: RefundTransactionItem[]; pagination: any }> => {
      const res = await api.get("/finance/refunds", { params });
      return { data: res.data.data, pagination: res.data.pagination };
    },

    create: async (payload: {
      bookingId: string;
      refundReason: string;
      refundMethod: "CASH_REFUND" | "CREDIT_NOTE" | "HYBRID";
      refundAmount?: number;
      creditNoteAmount?: number;
      notes?: string;
    }): Promise<RefundTransactionItem> => {
      const res = await api.post("/finance/refunds", payload);
      return res.data.data;
    },

    approve: async (
      id: string,
      payload?: {
        refundReference?: string;
        validityMonths?: number;
        notes?: string;
      }
    ): Promise<RefundTransactionItem> => {
      const res = await api.patch(`/finance/refunds/${id}/approve`, payload || {});
      return res.data.data;
    },

    reject: async (id: string, reason: string): Promise<RefundTransactionItem> => {
      const res = await api.patch(`/finance/refunds/${id}/reject`, { reason });
      return res.data.data;
    },
  },

  credits: {
    getActive: async (): Promise<any[]> => {
      const res = await api.get("/finance/credits/active");
      return res.data.data;
    },

    getDetails: async (refundId: string): Promise<any> => {
      const res = await api.get(`/finance/credits/${refundId}`);
      return res.data.data;
    },

    apply: async (
      refundId: string,
      payload: {
        targetBookingId: string;
        amountToUse: number;
        notes?: string;
      }
    ): Promise<any> => {
      const res = await api.patch(`/finance/credits/${refundId}/apply`, payload);
      return res.data.data;
    },
  },

  // ── 2. Coupons & Discounts API ──
  coupons: {
    list: async (params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<{ data: CouponItem[]; pagination: any }> => {
      const res = await api.get("/finance/coupons", { params });
      return { data: res.data.data, pagination: res.data.pagination };
    },

    create: async (payload: Partial<CouponItem>): Promise<CouponItem> => {
      const res = await api.post("/finance/coupons", payload);
      return res.data.data;
    },

    update: async (id: string, payload: Partial<CouponItem>): Promise<CouponItem> => {
      const res = await api.patch(`/finance/coupons/${id}`, payload);
      return res.data.data;
    },

    validate: async (
      code: string,
      payload: { bookingAmount: number; tripId?: string; customerPhone?: string }
    ): Promise<{
      isValid: boolean;
      message: string;
      data?: {
        code: string;
        discountType: string;
        discountValue: number;
        discountAmount: number;
        originalAmount: number;
        finalAmount: number;
        savings: number;
      };
    }> => {
      const res = await api.post(`/finance/coupons/${encodeURIComponent(code)}/validate`, payload);
      return res.data;
    },
  },

  // ── 3. Ticket Repository & Audit API ──
  tickets: {
    search: async (params?: {
      pnr?: string;
      query?: string;
      bookingId?: string;
      type?: string;
      status?: string;
      page?: number;
      limit?: number;
    }): Promise<{ data: FinanceTicketItem[]; pagination: any }> => {
      const res = await api.get("/finance/tickets/search", { params });
      return { data: res.data.data, pagination: res.data.pagination };
    },

    create: async (payload: Partial<FinanceTicketItem>): Promise<FinanceTicketItem> => {
      const res = await api.post("/finance/tickets", payload);
      return res.data.data;
    },

    verify: async (
      id: string,
      payload: { cost?: number; packageAllowance?: number; notes?: string }
    ): Promise<FinanceTicketItem> => {
      const res = await api.patch(`/finance/tickets/${id}/verify`, payload);
      return res.data.data;
    },

    getLinkedBookings: async (id: string): Promise<any> => {
      const res = await api.get(`/finance/tickets/${id}/linked-bookings`);
      return res.data.data;
    },

    bulkUpload: async (tickets: any[]): Promise<{
      ingestedCount: number;
      duplicateCount: number;
      unmatchedCount: number;
      ingested: any[];
      duplicates: any[];
      unmatched: any[];
    }> => {
      const res = await api.post("/finance/tickets/bulk-upload", { tickets });
      return res.data.data;
    },
  },

  // ── 4. Booking Auxiliary Services Registry API ──
  services: {
    listByBooking: async (bookingId: string): Promise<ServiceRegistryItem[]> => {
      const res = await api.get(`/finance/bookings/${bookingId}/services`);
      return res.data.data;
    },

    create: async (payload: Partial<ServiceRegistryItem>): Promise<ServiceRegistryItem> => {
      const res = await api.post("/finance/services", payload);
      return res.data.data;
    },

    update: async (id: string, payload: Partial<ServiceRegistryItem>): Promise<ServiceRegistryItem> => {
      const res = await api.patch(`/finance/services/${id}`, payload);
      return res.data.data;
    },
  },

  // ── 5. Task Allotment & Workload Dashboard API ──
  tasks: {
    list: async (params?: {
      assignedToId?: string;
      status?: string;
      priority?: string;
      bookingId?: string;
      taskType?: string;
      isOverdue?: boolean | string;
      page?: number;
      limit?: number;
    }): Promise<{ data: TaskAllotmentItem[]; pagination: any }> => {
      const res = await api.get("/finance/tasks", { params });
      return { data: res.data.data, pagination: res.data.pagination };
    },

    create: async (payload: Partial<TaskAllotmentItem>): Promise<TaskAllotmentItem> => {
      const res = await api.post("/finance/tasks", payload);
      return res.data.data;
    },

    updateStatus: async (
      id: string,
      payload: { status: string; note?: string }
    ): Promise<TaskAllotmentItem> => {
      const res = await api.patch(`/finance/tasks/${id}/status`, payload);
      return res.data.data;
    },

    addComment: async (
      id: string,
      payload: { comment: string; isInternal?: boolean }
    ): Promise<TaskCommentItem> => {
      const res = await api.post(`/finance/tasks/${id}/comments`, payload);
      return res.data.data;
    },

    getDashboard: async (): Promise<TaskDashboardData> => {
      const res = await api.get("/finance/tasks/dashboard");
      return res.data.data;
    },
  },

  // ── 6. Financial Audit Trail & Reports API ──
  audit: {
    list: async (params?: {
      entityType?: string;
      action?: string;
      actorUserId?: string;
      bookingId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }): Promise<{ data: AuditLogItem[]; pagination: any }> => {
      const res = await api.get("/finance/audit", { params });
      return { data: res.data.data, pagination: res.data.pagination };
    },

    getEntityTrail: async (
      entityType: string,
      entityId: string,
      format?: string
    ): Promise<any> => {
      const res = await api.get("/finance/audit/reports/trail-by-entity", {
        params: { entityType, entityId, format },
        responseType: format === "csv" ? "blob" : "json",
      });
      return res.data;
    },
  },

  // ── 7. Trip Accounting & P&L API ──
  tripAccounting: {
    getPnL: async (tripId: string, departureDate?: string): Promise<TripPnLData> => {
      const res = await api.get(`/finance/trip-accounting/${tripId}`, {
        params: { departureDate },
      });
      return res.data.data;
    },

    snapshotDeparture: async (payload: { tripId: string; departureDate?: string }): Promise<any> => {
      const res = await api.post("/finance/trip-accounting/snapshot", payload);
      return res.data.data;
    },
  },
};
