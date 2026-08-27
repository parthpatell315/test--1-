// Train Ticket Service - Backend API integration
import api from "./api";

export interface TrainTicket {
  id: string;
  tenantId: string;
  bookingId: string;
  travelerName: string;
  passengerReference?: string;
  pnr?: string;
  trainName?: string;
  trainNumber?: string;
  journeyDate?: string;
  sourceStation?: string;
  destinationStation?: string;
  coach?: string;
  seatNumber?: string;
  berthType?: string;
  ticketStatus:
    | "PENDING"
    | "BOOKED"
    | "WAITLISTED"
    | "CONFIRMED"
    | "RAC"
    | "SELF_BOOKED"
    | "CANCELLED";
  approvalStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "REOPENED";
  isLocked: boolean;
  ticketAmount: number;
  paidBy?: "COMPANY" | "CUSTOMER" | string;
  fareBreakdown?: {
    baseFare?: number;
    reservationCharge?: number;
    superfastCharge?: number;
    gst?: number;
    otherCharges?: number;
  };
  amountMode?: string;
  refundAmount: number;
  railwayCancellationCharge?: number;
  ycCancellationCharge?: number;
  refundStatus?: "NONE" | "PENDING" | "INITIATED" | "COMPLETED" | "FAILED" | string;
  refundCompletedAt?: string;
  refundTransactionRef?: string;
  reticketAdjustment?: number;
  cancellationReason?: string;
  internalNote?: string;
  ticketBookingPerson?: string;
  supersedesTicketId?: string;
  supersededByTicketId?: string;
  reopenReason?: string;
  submittedByAdminId?: string;
  createdAt: string;
  updatedAt: string;
  history?: any[];
  supersedes?: TrainTicket;
  supersededBy?: TrainTicket;
  submittedBy?: { id: string; name: string };
  booking?: {
    id?: string;
    bookingId: string;
    name: string;
    fullName?: string;
    tripId?: string;
    tripName?: string;
    departureDate?: string;
    totalAmount?: number;
    advancePaid?: number;
    remainingAmount?: number;
    salesAdminId?: string;
  };
}

export interface TrainTemplate {
  id: string;
  tenantId: string;
  tripId?: string;
  tripTitle?: string;
  departureDate?: string;
  scope: "TRIP" | "DEPARTURE";
  transportMode: "TRAIN" | "FLIGHT" | "BUS";

  trainName?: string;
  trainNumber?: string;
  source?: string;
  destination?: string;
  defaultClass?: string;
  defaultCoach?: string;
  journeyDate?: string;
  boardingPoint?: string;
  droppingPoint?: string;
  estimatedTicketCost?: number;

  flightAirline?: string;
  flightNumber?: string;
  flightOrigin?: string;
  flightDestination?: string;
  flightTerminal?: string;
  baggageGuidance?: string;

  reportingTime?: string;
  arrivalTime?: string;

  waitlistDisclaimer?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trip?: { id: string; title: string };
}

export interface TicketFinanceSummary {
  summary: {
    totalTickets: number;
    totalCost: number;
    confirmedCost: number;
    pendingCost: number;
    cancelledCost: number;
    railwayCancellationCharges: number;
    ycCancellationCharges: number;
    refundsPending: number;
    refundsCompleted: number;
    companyPaidCost: number;
    customerPaidCost: number;
    netCompanyCost: number;
  };
  tickets: TrainTicket[];
}

export const trainTicketService = {
  // Booking-level operations
  async getTicketsByBooking(bookingId: string): Promise<TrainTicket[]> {
    const res = await api.get(`/train-tickets/booking/${bookingId}`);
    return res.data?.data || [];
  },

  async createTicket(bookingId: string, data: any): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/booking/${bookingId}`, {
      travelerName: data.travelerName || "Guest",
      passengerReference: data.passengerReference || "DEPARTURE",
      pnr: data.pnr || "",
      trainName: data.trainName || "",
      trainNumber: data.trainNumber || "",
      journeyDate: data.journeyDate || "",
      sourceStation: data.sourceStation || "",
      destinationStation: data.destinationStation || "",
      coach: data.coach || "",
      seatNumber: data.seatNumber || "",
      berthType: data.berthType || "",
      ticketStatus: data.ticketStatus || "PENDING",
      approvalStatus: data.approvalStatus || "DRAFT",
      ticketAmount: parseFloat(data.ticketAmount) || 0,
      paidBy: data.paidBy || "COMPANY",
      fareBreakdown: data.fareBreakdown || null,
      internalNote: data.internalNote || "",
      ticketBookingPerson: data.ticketBookingPerson || "",
      amountMode: data.amountMode || "PAYMENT_LINK",
    });
    return res.data?.data;
  },

  async autoGenerateTickets(bookingId: string): Promise<{
    message: string;
    data: { created: number; skipped: number; tickets: TrainTicket[] };
  }> {
    const res = await api.post(
      `/train-tickets/booking/${bookingId}/auto-generate`,
    );
    return res.data;
  },

  async syncTicketsWithTemplate(bookingId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    const res = await api.post(
      `/train-tickets/booking/${bookingId}/sync-template`,
    );
    return res.data;
  },

  // Ticket-level operations
  async updateTicket(ticketId: string, data: any): Promise<TrainTicket> {
    const res = await api.put(`/train-tickets/${ticketId}`, data);
    return res.data?.data;
  },

  async submitTicket(ticketId: string): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/${ticketId}/submit`);
    return res.data?.data;
  },

  async approveTicket(ticketId: string): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/${ticketId}/approve`);
    return res.data?.data;
  },

  async rejectTicket(ticketId: string, notes?: string): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/${ticketId}/reject`, { notes });
    return res.data?.data;
  },

  async reopenTicket(ticketId: string, reason: string): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/${ticketId}/reopen`, { reason });
    return res.data?.data;
  },

  async cancelTicket(
    ticketId: string,
    data: {
      reason: string;
      railwayCancellationCharge?: number;
      ycCancellationCharge?: number;
      refundAmount?: number;
      notes?: string;
    },
  ): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/${ticketId}/cancel`, data);
    return res.data?.data;
  },

  async rebookTicket(
    ticketId: string,
    data?: any,
  ): Promise<{ oldTicketId: string; newTicket: TrainTicket; financials?: any }> {
    const res = await api.post(`/train-tickets/${ticketId}/rebook`, data || {});
    return res.data?.data;
  },

  async recordRefund(
    ticketId: string,
    data: {
      refundStatus: string;
      transactionRef?: string;
      amount?: number;
      notes?: string;
      paymentMode?: string;
    },
  ): Promise<TrainTicket> {
    const res = await api.post(`/train-tickets/${ticketId}/record-refund`, data);
    return res.data?.data;
  },

  async getFinanceSummary(params?: {
    tripId?: string;
    departureDate?: string;
    status?: string;
    paidBy?: string;
  }): Promise<TicketFinanceSummary> {
    const res = await api.get("/train-tickets/finance-summary", { params });
    return res.data?.data || { summary: {}, tickets: [] };
  },

  // Bulk operation
  async bulkUpdateTickets(data: {
    ticketIds: string[];
    status?: string;
    trainNumber?: string;
    journeyDate?: string;
    pnr?: string;
    coach?: string;
    seatNumber?: string;
    berthType?: string;
    notes?: string;
  }): Promise<{ updatedCount: number; tickets: TrainTicket[] }> {
    const res = await api.post("/train-tickets/bulk-update", data);
    return res.data?.data || { updatedCount: 0, tickets: [] };
  },

  // Queues and Alerts
  async getApprovalsQueue(
    params?: Record<string, string>,
  ): Promise<{
    data: TrainTicket[];
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
    const res = await api.get(`/train-tickets/approvals?${qs.toString()}`);
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

  async getTicketHistory(ticketId: string): Promise<any[]> {
    const res = await api.get(`/train-tickets/${ticketId}/history`);
    return res.data?.data || [];
  },

  async getAlerts(): Promise<any[]> {
    const res = await api.get("/train-tickets/alerts");
    return res.data?.data || [];
  },

  // Template CRUD operations
  async getTemplates(params?: {
    tripId?: string;
    departureDate?: string;
  }): Promise<TrainTemplate[]> {
    const res = await api.get("/train-ticket-templates", { params });
    return (res.data?.data || []).filter((x: TrainTemplate) => x.isActive);
  },

  async getEffectiveTemplates(
    tripId: string,
    departureDate: string,
  ): Promise<any[]> {
    const res = await api.get("/train-ticket-templates/effective", {
      params: { tripId, departureDate },
    });
    return res.data?.data || [];
  },

  async createTemplate(data: any): Promise<TrainTemplate> {
    const res = await api.post("/train-ticket-templates", data);
    return res.data?.data;
  },

  async updateTemplate(id: string, data: any): Promise<TrainTemplate> {
    const res = await api.put(`/train-ticket-templates/${id}`, data);
    return res.data?.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/train-ticket-templates/${id}`);
  },

  async archiveTemplate(id: string): Promise<void> {
    await api.post(`/train-ticket-templates/${id}/archive`);
  },

  async restoreTemplate(id: string): Promise<void> {
    await api.post(`/train-ticket-templates/${id}/restore`);
  },
};

export default trainTicketService;
