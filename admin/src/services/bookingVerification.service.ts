import api from "./api";

export const bookingVerificationService = {
  // ── VERIFICATION STATUS ──

  async getVerificationStatus(bookingId: string): Promise<any> {
    try {
      const res = await api.get(`/booking-verifications/${bookingId}/status`);
      return res.data.data;
    } catch (err) {
      console.error("🔥 Verification status fetch failed:", err);
      throw err;
    }
  },

  async submitForVerification(bookingId: string): Promise<any> {
    try {
      const res = await api.post(`/booking-verifications/${bookingId}/submit`);
      return res.data.data;
    } catch (err) {
      console.error("🔥 Submit for verification failed:", err);
      throw err;
    }
  },

  // ── VERIFICATION QUEUE ──

  async getVerificationQueue(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            queryParams.append(key, String(val));
          }
        });
      }
      const res = await api.get(
        `/booking-verifications/queue?${queryParams.toString()}`,
      );
      return res.data;
    } catch (err) {
      console.error("🔥 Verification queue fetch failed:", err);
      throw err;
    }
  },

  // ── VERIFICATION ACTIONS ──

  async performVerificationAction(
    bookingId: string,
    data: { action: string; notes?: string; checklist?: any },
  ): Promise<any> {
    try {
      const res = await api.post(
        `/booking-verifications/${bookingId}/action`,
        data,
      );
      return res.data.data;
    } catch (err) {
      console.error("🔥 Verification action failed:", err);
      throw err;
    }
  },

  // ── TRAIN TICKETS ──

  async getTrainTicket(bookingId: string): Promise<any> {
    try {
      const res = await api.get(
        `/booking-verifications/${bookingId}/train-ticket`,
      );
      return res.data.data;
    } catch (err) {
      console.error("🔥 Train ticket fetch failed:", err);
      throw err;
    }
  },

  async saveTrainTicket(bookingId: string, data: any): Promise<any> {
    try {
      const res = await api.post(
        `/booking-verifications/${bookingId}/train-ticket`,
        data,
      );
      return res.data.data;
    } catch (err) {
      console.error("🔥 Train ticket save failed:", err);
      throw err;
    }
  },

  async performTicketAction(
    bookingId: string,
    data: {
      action: string;
      notes?: string;
      pnr?: string;
      ticketDetails?: string;
    },
  ): Promise<any> {
    try {
      const res = await api.post(
        `/booking-verifications/${bookingId}/train-ticket/action`,
        data,
      );
      return res.data.data;
    } catch (err) {
      console.error("🔥 Ticket action failed:", err);
      throw err;
    }
  },

  async getTicketTemplates(): Promise<any> {
    try {
      const res = await api.get(`/booking-verifications/templates`);
      return res.data.data;
    } catch (err) {
      console.error("🔥 Ticket templates fetch failed:", err);
      throw err;
    }
  },

  async bulkUpdateTickets(data: {
    bookingIds: string[];
    action: string;
    notes?: string;
    pnr?: string;
    ticketDetails?: string;
  }): Promise<any> {
    try {
      const res = await api.post(`/booking-verifications/bulk-update`, data);
      return res.data.data;
    } catch (err) {
      console.error("🔥 Bulk ticket update failed:", err);
      throw err;
    }
  },

  async triggerTicketAlerts(data?: { bookingIds?: string[] }): Promise<any> {
    try {
      const res = await api.post(`/booking-verifications/alerts`, data || {});
      return res.data.data;
    } catch (err) {
      console.error("🔥 Ticket alert trigger failed:", err);
      throw err;
    }
  },
};
