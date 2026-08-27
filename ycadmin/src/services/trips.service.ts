import api from "./api";
import type { Trip, TripFormData, CompactTrip } from "@/types";

export const tripsService = {
  async getAll(): Promise<Trip[]> {
    const res = await api.get("/trips?status=all");
    return res.data.data;
  },

  async getCompact(): Promise<CompactTrip[]> {
    const res = await api.get("/trips?status=all&compact=true");
    return res.data.data.map((trip: any) => ({
      id: trip.id,
      code: trip.shortName || null,
      title: trip.title,
      status: trip.status,
      availableDates: trip.availableDates || [],
    }));
  },

  async getById(id: string): Promise<Trip | undefined> {
    const res = await api.get(`/trips/${id}`);
    return res.data.data;
  },

  async create(data: TripFormData): Promise<Trip> {
    const res = await api.post("/trips", data);
    return res.data.data;
  },

  async update(id: string, data: Partial<TripFormData>): Promise<Trip> {
    const res = await api.put(`/trips/${id}`, data);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/trips/${id}`);
  },
  async shuffle(): Promise<void> {
    await api.post("/trips/shuffle");
  },
  async bulkUpdateOrder(orderMap: Record<string, number>): Promise<void> {
    await api.post("/trips/bulk-order", { orderMap });
  },
};
