import api from "./api";
import type { Inquiry } from "@/types";

export const inquiriesService = {
  async getAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });
    }
    const res = await api.get(`/inquiries?${params.toString()}`);
    return res.data;
  },

  async markAsRead(id: string): Promise<Inquiry> {
    const res = await api.patch(`/inquiries/${id}/status`, { status: "read" });
    return res.data.data;
  },

  async update(id: string, data: Partial<Inquiry>): Promise<Inquiry> {
    const res = await api.patch(`/inquiries/${id}/status`, data);
    return res.data.data;
  },
};
