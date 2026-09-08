import api from "./api";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  isActive: boolean;
  defaultAttachments?: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  senderId?: string;
  sender?: {
    name?: string;
    email?: string;
  };
  recipient: string;
  ccCount: number;
  bccCount: number;
  subject: string;
  body: string;
  templateId?: string;
  templateName?: string;
  attachments?: any;
  status: string;
  error?: string;
  isTest: boolean;
  sentAt: string;
}

export const emailsService = {
  // ── TEMPLATES ──
  async getTemplates(): Promise<EmailTemplate[]> {
    const res = await api.get("/emails/templates");
    return res.data.data;
  },

  async getTemplate(id: string): Promise<EmailTemplate> {
    const res = await api.get(`/emails/templates/${id}`);
    return res.data.data;
  },

  async createTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const res = await api.post("/emails/templates", data);
    return res.data.data;
  },

  async updateTemplate(
    id: string,
    data: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const res = await api.put(`/emails/templates/${id}`, data);
    return res.data.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/emails/templates/${id}`);
  },

  async duplicateTemplate(id: string): Promise<EmailTemplate> {
    const res = await api.post(`/emails/templates/${id}/duplicate`);
    return res.data.data;
  },

  // ── LOGS ──
  async getBookingLogs(bookingId: string): Promise<EmailLog[]> {
    const res = await api.get(`/emails/logs/booking/${bookingId}`);
    return res.data.data;
  },

  async getInquiryLogs(inquiryId: string): Promise<EmailLog[]> {
    const res = await api.get(`/emails/logs/inquiry/${inquiryId}`);
    return res.data.data;
  },

  async getTicketLogs(trainTicketId: string): Promise<EmailLog[]> {
    const res = await api.get(`/emails/logs/ticket/${trainTicketId}`);
    return res.data.data;
  },

  // ── SENDER ──
  async sendCustomEmail(formData: FormData): Promise<any> {
    const res = await api.post("/emails/send-custom", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async sendBulkEmails(data: {
    contextType: "booking" | "inquiry";
    selectedIds: string[];
    subject: string;
    body: string;
    templateId?: string;
  }): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const res = await api.post("/emails/send-bulk-custom", data);
    return res.data.data;
  },
};
