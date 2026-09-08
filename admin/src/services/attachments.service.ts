import api from "./api";

export interface BookingAttachment {
  id: string;
  tenantId: string;
  bookingId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  title?: string;
  description?: string;
  uploadedBy?: string;
  uploadedById?: string;
  uploadedAt: string;
  version: number;
  sentStatus: "NOT_SENT" | "SENT_EMAIL" | "SENT_WHATSAPP" | "SENT_BOTH";
  sentAt?: string;
  versionHistory?: Array<{
    version: number;
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    uploadedBy?: string;
    uploadedAt: string;
  }>;
}

export const attachmentsService = {
  async getByBooking(bookingId: string): Promise<BookingAttachment[]> {
    const res = await api.get(`/attachments/booking/${bookingId}`);
    return res.data?.data || [];
  },

  async upload(
    bookingId: string,
    formData: FormData,
  ): Promise<BookingAttachment[]> {
    const res = await api.post(`/attachments/booking/${bookingId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data || [];
  },

  async replace(id: string, formData: FormData): Promise<BookingAttachment> {
    const res = await api.put(`/attachments/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data;
  },

  async updateMetadata(
    id: string,
    title: string,
    description: string,
  ): Promise<BookingAttachment> {
    const res = await api.patch(`/attachments/${id}/metadata`, {
      title,
      description,
    });
    return res.data?.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/attachments/${id}`);
  },

  async send(
    bookingId: string,
    payload: {
      attachmentIds?: string[];
      channel: "EMAIL" | "WHATSAPP" | "BOTH";
      customEmail?: string;
      customSubject?: string;
      customMessage?: string;
    },
  ): Promise<{
    emailSent: boolean;
    whatsappGenerated: boolean;
    whatsappLink?: string;
    sentCount: number;
  }> {
    const res = await api.post(
      `/attachments/send/booking/${bookingId}`,
      payload,
    );
    return res.data?.data;
  },

  getDownloadUrl(id: string): string {
    const baseURL = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
    return `${baseURL}/api/attachments/download/${id}`;
  },
};
