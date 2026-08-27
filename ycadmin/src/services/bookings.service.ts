import axios from "axios";
import api from "./api";
import type { Booking, BookingPassenger, BookingPassengersPayload, BookingTrip } from "@/types";

/**
 * Normalize a raw backend booking row (Prisma Booking JSON) into the
 * canonical frontend `Booking` shape. The backend returns raw model rows,
 * so derived/legacy-compat fields are resolved here in ONE place instead of
 * being scattered through components.
 */
export function normalizeBooking(raw: any): Booking {
  if (!raw || typeof raw !== "object") return raw;

  const passengers: BookingPassengersPayload = raw.passengers;
  const persons: BookingPassenger[] = Array.isArray(passengers)
    ? (passengers as BookingPassenger[])
    : Array.isArray(passengers?.persons)
      ? (passengers.persons as BookingPassenger[])
      : [];
  const details =
    passengers && !Array.isArray(passengers)
      ? (passengers.details as Record<string, unknown> | undefined) || {}
      : {};
  const lead = persons[0] || {};

  const sourceMetaRaw = raw.sourceMeta;

  return {
    ...raw,
    // Contact fields — backend authoritative names
    name: raw.name ?? raw.fullName ?? null,
    fullName: raw.fullName ?? raw.name ?? null,
    phone: raw.phone ?? raw.mobile ?? null,
    mobile: raw.mobile ?? raw.phone ?? null,
    email: raw.email ?? null,
    age: raw.age ?? lead.age ?? details.age ?? null,
    gender: raw.gender ?? lead.gender ?? details.gender ?? null,
    // Derived ownership
    createdByName: raw.salesAdmin?.name ?? raw.createdByName,
    salesAdminId: raw.salesAdminId ?? null,
    // Derived operational fields (stored under passengers.details server-side)
    trainClass: (details.trainClass as string) ?? raw.trainClass,
    ticketStatus: (details.ticketStatus as string) ?? raw.ticketStatus,
    roomType: (details.roomType as string) ?? raw.roomType,
    roomSharing: (details.roomSharing as string) ?? lead.roomSharing ?? raw.roomSharing,
    foodPreference: (details.foodPreference as string) ?? lead.foodPreference ?? raw.foodPreference,
    // Derived attribution / pricing metadata
    leadSource: sourceMetaRaw?.source ?? (sourceMetaRaw?.utm_source as string) ?? raw.leadSource,
    source: sourceMetaRaw?.source ?? raw.source,
    discountAmount:
      typeof raw.discountAmount === "number"
        ? raw.discountAmount
        : typeof sourceMetaRaw?.discountAmount === "number"
          ? sourceMetaRaw.discountAmount
          : 0,
    duration: raw.tripRef?.duration ?? raw.duration,
  };
}

const normalizeList = (list: any[]): Booking[] =>
  Array.isArray(list) ? list.map((b) => normalizeBooking(b)) : [];

export const bookingsService = {
  // ── BOOKINGS ──

  async getAll(
    filters?:
      | {
          status?: string;
          tripId?: string;
          paymentStatus?: string;
          payment_status?: string;
          search?: string;
          salesAdminId?: string;
          balanceOnly?: boolean | string;
          bookingStart?: string;
          bookingEnd?: string;
          depStart?: string;
          depEnd?: string;
          page?: number;
          limit?: number;
        }
      | number,
    signalOrLimit?: AbortSignal | number,
  ): Promise<any> {
    try {
      let filterObj: Record<string, any> = {};
      let actualSignal: AbortSignal | undefined = undefined;

      if (typeof filters === "number") {
        filterObj = {
          page: filters,
          limit: typeof signalOrLimit === "number" ? signalOrLimit : 1000,
        };
      } else if (filters && typeof filters === "object") {
        filterObj = filters;
        if (signalOrLimit instanceof AbortSignal) {
          actualSignal = signalOrLimit;
        }
      }

      const params = new URLSearchParams();
      if (filterObj) {
        Object.entries(filterObj).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            const isAllSentinel =
              String(val).toLowerCase() === "all" && key !== "search";
            if (!isAllSentinel) {
              params.append(key, String(val));
            }
          }
        });
      }

      const res = await api.get(`/bookings?${params.toString()}`, {
        signal: actualSignal,
      });
      if (
        res.data &&
        typeof res.data === "object" &&
        Array.isArray(res.data.data)
      ) {
        return { ...res.data, data: normalizeList(res.data.data) };
      }
      return res.data;
    } catch (err) {
      if (
        axios.isCancel?.(err) ||
        (err as any)?.name === "CanceledError" ||
        (err as any)?.name === "AbortError"
      ) {
        console.log("ℹ️ Request cancelled");
        throw err;
      }
      console.error("🔥 Bookings fetch failed:", err);
      throw err;
    }
  },

  async getById(id: string): Promise<Booking> {
    const res = await api.get(`/bookings/${id}`);
    return normalizeBooking(res.data.data);
  },

  async create(data: any): Promise<Booking> {
    const res = await api.post("/bookings", data);
    return normalizeBooking(res.data.data);
  },

  async update(id: string, data: any): Promise<Booking> {
    const res = await api.put(`/bookings/${id}`, data);
    return normalizeBooking(res.data.data);
  },

  async transferDepartureDate(
    id: string,
    data: { departureDate: string; reason: string },
  ): Promise<Booking> {
    const res = await api.put(`/bookings/${id}/departure-date`, data);
    return normalizeBooking(res.data.data);
  },

  async confirm(
    id: string,
    data: {
      totalAmount: number;
      advancePaid: number;
      paymentMode: string;
      paymentStatus: string;
      email?: string;
      trainTicketStatus?: string;
      trainTicketRequired?: boolean;
      collectionAccountId?: string;
      transactionId?: string;
      notes?: string;
      proofUrl?: string;
      proofUrls?: string[];
    },
  ): Promise<Booking> {
    const res = await api.put(`/bookings/${id}/confirm`, data);
    return normalizeBooking(res.data.data);
  },

  async confirmPayment(id: string): Promise<Booking> {
    const res = await api.patch(`/bookings/${id}/confirm-payment`);
    return normalizeBooking(res.data.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/bookings/${id}`);
  },

  async cancelWithRefund(
    id: string,
    data: {
      reason: string;
      cancellationCharges: number;
      refundAmount: number;
      refundPaymentMode: string;
    },
  ): Promise<Booking> {
    const res = await api.post(`/bookings/${id}/cancel`, data);
    return normalizeBooking(res.data.booking);
  },

  // ── TRIPS ──

  async getTrips(): Promise<BookingTrip[]> {
    try {
      const res = await api.get("/bookings/trips");
      return res.data.data;
    } catch (err) {
      console.error("🔥 Trips fetch failed:", err);
      throw err;
    }
  },

  async createTrip(data: {
    tripCode: string;
    tripName: string;
    price?: number;
  }): Promise<BookingTrip> {
    const res = await api.post("/bookings/trips", data);
    return res.data.data;
  },

  async updateTrip(
    id: string,
    data: { tripCode?: string; tripName?: string; price?: number },
  ): Promise<BookingTrip> {
    const res = await api.put(`/bookings/trips/${id}`, data);
    return res.data.data;
  },

  async deleteTrip(id: string): Promise<void> {
    await api.delete(`/bookings/trips/${id}`);
  },

  // ── EMAILS ──

  async sendEmail(
    bookingId: string,
    type: "confirmation" | "payment" | "reminder" | "cancellation" | "invoice",
    amount?: number,
    includeTicket?: boolean,
    ticketFile?: string | null,
    ticketFileName?: string | null,
    trainTicketStatus?: string,
    ticketFiles?: Array<{ name: string; content: string }>,
  ): Promise<void> {
    console.log("📡 [bookingsService] Sending email request:", {
      bookingId,
      type,
      amount,
      includeTicket,
      ticketFileName,
      trainTicketStatus,
      filesCount: ticketFiles?.length,
    });
    if (type === "invoice" && amount === undefined) {
      throw new Error("Amount is required for invoice emails");
    }
    await api.post("/emails/send", {
      bookingId,
      type,
      amount,
      includeTicket,
      ticketFile,
      ticketFileName,
      ticketFiles,
      trainTicketStatus,
    });
  },

  async getEmailLogs(bookingId: string): Promise<any[]> {
    try {
      const res = await api.get(`/emails/logs/booking/${bookingId}`);
      if (res.data?.data) return res.data.data;
    } catch (_) {}
    const res = await api.get(`/emails/logs/${bookingId}`);
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },

  async getActivityLogs(bookingId: string): Promise<any[]> {
    const res = await api.get(`/bookings/${bookingId}/activity-logs`);
    return res.data.data;
  },

  async getTasks(bookingId: string): Promise<any[]> {
    const res = await api.get(`/bookings/${bookingId}/tasks`);
    return res.data.data;
  },

  async createTask(bookingId: string, data: any): Promise<any> {
    const res = await api.post(`/bookings/${bookingId}/tasks`, data);
    return res.data.data;
  },

  async updateTask(taskId: string, status: string): Promise<any> {
    const res = await api.put(`/bookings/tasks/${taskId}`, { status });
    return res.data.data;
  },

  async getAllBookingTasks(params?: { status?: string; assignee?: string; type?: string }): Promise<any[]> {
    const res = await api.get(`/bookings/tasks/all`, { params });
    return res.data?.data || res.data || [];
  },

  async createUniversalOrBookingTask(data: {
    title: string;
    description?: string;
    assignedToId: string;
    dueDate?: string;
    priority?: string;
    taskType?: string;
    bookingId?: string;
  }): Promise<any> {
    const res = await api.post(`/bookings/tasks/create-universal`, data);
    return res.data?.data || res.data;
  },

  async getColleagues(): Promise<any[]> {
    const res = await api.get("/bookings/colleagues/list");
    return res.data.data;
  },

  async uploadDocument(
    bookingId: string,
    passengerId: string,
    file: File,
  ): Promise<any> {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentType", "ID Document");
    const res = await api.post(
      `/bookings/${bookingId}/passengers/${passengerId}/document`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data.data;
  },

  async downloadDocument(
    bookingId: string,
    passengerId: string,
    docId?: string,
  ): Promise<Blob> {
    const url = docId
      ? `/bookings/${bookingId}/documents/${docId}`
      : `/bookings/${bookingId}/passengers/${passengerId}/document`;
    const res = await api.get(url, {
      responseType: "blob",
    });
    return res.data;
  },

  async deleteDocument(
    bookingId: string,
    passengerId: string,
    docId?: string,
  ): Promise<any> {
    const url = docId
      ? `/bookings/${bookingId}/documents/${docId}`
      : `/bookings/${bookingId}/passengers/${passengerId}/document`;
    const res = await api.delete(url);
    return res.data;
  },
};
