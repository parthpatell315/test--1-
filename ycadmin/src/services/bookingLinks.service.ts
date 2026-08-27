import api from "./api";

export interface BookingLinkRecord {
  id: string;
  tripId: string;
  tripName: string | null;
  departureDate: string | null;
  pickupCity: string | null;
  paymentMode: string | null;
  customAmount: number | null;
  customTime: string | null;
  headerTitle: string | null;
  headerSubtitle: string | null;
  expiresAt: string | null;
  status: string;
  tokenPrefix: string;
  openedCount: number;
  completedCount: number;
  createdByAdminId: string | null;
  createdAt: string;
  shareUrl?: string | null;
}

export const bookingLinksService = {
  async create(data: {
    tripId: string;
    departureDate: string; // yyyy-mm-dd or ISO
    paymentMode: string; // "Full Payment" | "Partial Payment"
    customAmount: number;
    pickupCity: string;
    customTime?: string; // e.g. "9:00 AM – 6:00 PM IST"
    headerTitle?: string; // e.g. "Talk That Damn Point"
    headerSubtitle?: string; // e.g. "Join the wait list for Before Monday Begins"
    expiresAt?: string | null; // optional
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    travelerCount?: number;
    internalNote?: string;
  }): Promise<BookingLinkRecord> {
    const res = await api.post("/booking-links", data);
    return res.data.data;
  },

  async getAll(
    page = 1,
    limit = 25,
  ): Promise<{
    data: BookingLinkRecord[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }> {
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const res = await api.get(
      `/booking-links?page=${page}&limit=${cappedLimit}`,
    );
    return { data: res.data.data || [], pagination: res.data.pagination };
  },

  async revoke(id: string): Promise<BookingLinkRecord> {
    const res = await api.post(`/booking-links/${id}/revoke`);
    return res.data.data;
  },

  async getAnalytics(params?: {
    from?: string;
    to?: string;
    salesAdminId?: string;
  }): Promise<{
    linksGenerated: number;
    opened: number;
    completedBookings: number;
    revenueGenerated: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.salesAdminId) qs.set("salesAdminId", params.salesAdminId);

    const url = qs.toString()
      ? `/booking-links/analytics?${qs.toString()}`
      : "/booking-links/analytics";
    const res = await api.get(url);
    return res.data.data;
  },
};
