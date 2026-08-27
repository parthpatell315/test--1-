import api from "./api";

export interface TicketApproval {
  id: string;
  bookingId: string;
  ticketType: "train" | "flight" | "bus";
  status: "pending" | "approved" | "rejected";
  ticketNumber?: string | null;
  ticketFileUrl?: string | null;
  requestedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionNote?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    bookingId: string;
    name: string;
    fullName?: string;
    tripName?: string;
    departureDate?: string;
    phone?: string;
    email?: string;
    numberOfTravelers?: number;
    totalAmount?: number;
    paymentStatus?: string;
    salesAdminId?: string;
  };
  requestedByAdmin?: { id: string; name: string; role: string };
  reviewedByAdmin?: { id: string; name: string; role: string } | null;
}

export interface TicketApprovalStats {
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
}

export const ticketApprovalService = {
  async generate(
    bookingId: string,
    data: { ticketType: string; ticketNumber?: string; ticketFileUrl?: string },
  ): Promise<TicketApproval> {
    const res = await api.post(`/tickets/${bookingId}/generate`, data);
    return res.data.data;
  },

  async getApprovals(params?: {
    status?: string;
    ticketType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: TicketApproval[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }> {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "")
          qs.append(key, String(val));
      });
    }
    const res = await api.get(`/tickets/approvals?${qs.toString()}`);
    return {
      data: res.data?.data || [],
      pagination: res.data?.pagination || {
        page: 1,
        limit: 25,
        totalCount: 0,
        totalPages: 1,
      },
    };
  },

  async getStats(): Promise<TicketApprovalStats> {
    const res = await api.get("/tickets/approvals/stats");
    return (
      res.data?.data || { pendingCount: 0, approvedToday: 0, rejectedToday: 0 }
    );
  },

  async getDetail(id: string): Promise<TicketApproval> {
    const res = await api.get(`/tickets/approvals/${id}`);
    return res.data.data;
  },

  async approve(id: string): Promise<TicketApproval> {
    const res = await api.post(`/tickets/approvals/${id}/approve`);
    return res.data.data;
  },

  async reject(id: string, rejectionNote: string): Promise<TicketApproval> {
    const res = await api.post(`/tickets/approvals/${id}/reject`, {
      rejectionNote,
    });
    return res.data.data;
  },

  async getPendingCount(): Promise<number> {
    const res = await api.get("/tickets/approvals/pending-count");
    return res.data?.data?.pendingCount || 0;
  },
};

export default ticketApprovalService;
