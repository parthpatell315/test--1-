import api from "./api";
import type { DashboardStats } from "@/types";

export const dashboardService = {
  async getStats(dateRange?: string): Promise<DashboardStats> {
    const res = await api.get("/admin/stats", {
      params: { dateFilter: dateRange },
    });
    if (!res.data?.success) {
      throw new Error(res.data?.error || "Dashboard stats unavailable");
    }
    return res.data.data;
  },
};
