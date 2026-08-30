import api from "./api";

export interface AnalyticsRealtimeData {
  activeUsers: number;
  activePages: { page: string; activeUsers: number }[];
  propertyId: string;
  timestamp: string;
}

export interface AnalyticsOverviewData {
  propertyId: string;
  range: string;
  summary: {
    realtimeActiveUsers: number;
    activeUsers: number;
    newUsers: number;
    pageViews: number;
    sessions: number;
    avgDurationSec: number;
    bounceRatePercentage: number;
  };
  trend: {
    date: string;
    users: number;
    pageviews: number;
    sessions: number;
  }[];
  pages: {
    path: string;
    title: string;
    views: number;
    users: number;
  }[];
  sources: {
    channel: string;
    sessions: number;
    users: number;
  }[];
  devices: {
    category: string;
    users: number;
    percentage: number;
  }[];
  cities: {
    city: string;
    country: string;
    users: number;
  }[];
  updatedAt: string;
}

export const analyticsService = {
  async getRealtime(): Promise<AnalyticsRealtimeData> {
    const res = await api.get("/analytics/realtime");
    return res.data.data;
  },

  async getOverview(range = "30d"): Promise<AnalyticsOverviewData> {
    const res = await api.get("/analytics/overview", {
      params: { range },
    });
    return res.data.data;
  },
};
