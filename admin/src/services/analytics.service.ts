import api from "./api";

export interface AnalyticsRealtimeData {
  activeUsers: number;
  activePages: { page: string; activeUsers: number }[];
  propertyId: string;
  timestamp: string;
}

export interface AnalyticsOverviewData {
  propertyId: string;
  domain: string;
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
  changes?: {
    users: number | null;
    pageViews: number | null;
    sessions: number | null;
    avgDuration: number | null;
    bounceRate: number | null;
  };
  trend: {
    date: string;
    users: number;
    pageviews: number;
    sessions: number;
  }[];
  pages: {
    path: string;
    humanTitle: string;
    views: number;
    users: number;
  }[];
  sources: {
    channel: string;
    users: number;
    sessions: number;
    percentage: number;
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
  topTrips?: {
    tripId: string;
    title: string;
    slug: string;
    views: number;
    enquiries: number;
    bookings: number;
  }[];
  funnel?: {
    visitors: number;
    tripViews: number;
    enquiries: number;
    bookingRequests: number;
    confirmedBookings: number;
    revenue: number;
  };
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
