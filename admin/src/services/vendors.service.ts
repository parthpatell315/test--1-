import api from "./api";
import type { Vendor, TripVendor, TripVendorSummary } from "@/types";

export const vendorsService = {
  // ─── Vendor CRUD ──────────────────────────
  async getAll(): Promise<Vendor[]> {
    const res = await api.get("/vendors/directory");
    return (res.data.data || []).map((v: any) => ({
      id: v.id,
      name: v.name || "",
      type: (v.type || "other").toLowerCase() as any,
      phone: v.contactNumber || v.phone || "",
      email: v.email || "",
      location: v.city || v.location || "",
      notes: v.notes || "",
      isActive: v.isActive !== false,
      sourceSheet: v.sourceSheet || "",
      tripMappings: v.tripMappings || [],
    }));
  },

  async getById(id: string): Promise<Vendor> {
    const res = await api.get(`/vendors/directory/${id}`);
    const v = res.data.data;
    return {
      id: v.id,
      name: v.name || "",
      type: (v.type || "other").toLowerCase() as any,
      phone: v.contactNumber || v.phone || "",
      email: v.email || "",
      location: v.city || v.location || "",
      notes: v.notes || "",
      isActive: v.isActive !== false,
      roomRates: v.roomRates || [],
      transportRates: v.transportRates || [],
      miscCharges: v.miscCharges || v.foodRates || v.guideRates || [],
      tripId: v.tripMappings?.[0]?.tripId || "",
    } as any;
  },

  async create(data: any): Promise<any> {
    const res = await api.post("/vendors/directory", {
      name: data.name,
      type: data.type ? data.type.toUpperCase() : "HOTEL",
      contactNumber: data.phone,
      email: data.email,
      city: data.location,
      notes: data.notes,
      isActive: data.isActive !== false,
      contactPerson: data.contactPerson || "Primary Contact",
      tripId: data.tripId || undefined,
    });
    const v = res.data.data;
    return {
      id: v.id,
      name: v.name || "",
      type: (v.type || "other").toLowerCase() as any,
      phone: v.contactNumber || v.phone || "",
      email: v.email || "",
      location: v.city || v.location || "",
      notes: v.notes || "",
      isActive: v.isActive !== false,
      tripId: data.tripId || "",
    };
  },

  async update(id: string, data: any): Promise<any> {
    const res = await api.patch(`/vendors/directory/${id}`, {
      name: data.name,
      type: data.type ? data.type.toUpperCase() : "HOTEL",
      contactNumber: data.phone,
      email: data.email,
      city: data.location,
      notes: data.notes,
      isActive: data.isActive !== false,
      contactPerson: data.contactPerson || "Primary Contact",
      tripId: data.tripId || undefined,
    });
    const v = res.data.data;
    return {
      id: v.id,
      name: v.name || "",
      type: (v.type || "other").toLowerCase() as any,
      phone: v.contactNumber || v.phone || "",
      email: v.email || "",
      location: v.city || v.location || "",
      notes: v.notes || "",
      isActive: v.isActive !== false,
      tripId: data.tripId || "",
    };
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/vendors/directory/${id}`);
  },

  // ─── Trip-Vendor Assignments ──────────────
  async getForTrip(
    tripId: string,
  ): Promise<{ assignments: TripVendor[]; summary: TripVendorSummary }> {
    const res = await api.get(`/vendors/trip/${tripId}`);
    return { assignments: res.data.data, summary: res.data.summary };
  },

  async getBulkForTrips(
    tripIds?: string[],
  ): Promise<Record<string, TripVendor[]>> {
    const query =
      tripIds && tripIds.length > 0 ? `?tripIds=${tripIds.join(",")}` : "";
    const res = await api.get(`/vendors/bulk${query}`);
    return res.data.data;
  },

  async assignToTrip(data: {
    tripId: string;
    vendorId: string;
    agreedCost: number;
    notes?: string;
  }): Promise<TripVendor> {
    const res = await api.post("/vendors/trip-assign", data);
    return res.data.data;
  },

  async updateAssignment(
    id: string,
    data: Partial<TripVendor>,
  ): Promise<TripVendor> {
    const res = await api.put(`/vendors/trip-assign/${id}`, data);
    return res.data.data;
  },

  async removeAssignment(id: string): Promise<void> {
    await api.delete(`/vendors/trip-assign/${id}`);
  },

  // ─── Ops Vendor Directory (Normalized Rates & Allocations) ───
  async getVendorsByTrip(tripId: string, params?: any): Promise<any[]> {
    const res = await api.get(`/vendors/trips/${tripId}`, { params });
    return res.data.data || [];
  },

  async getVendorsByTripAndCategory(
    tripId: string,
    category: string,
  ): Promise<any[]> {
    const res = await api.get(
      `/vendors/trips/${tripId}/categories/${category}`,
    );
    return res.data.data || [];
  },

  async getVendorsByTripAndCity(tripId: string, city: string): Promise<any[]> {
    const res = await api.get(`/vendors/trips/${tripId}/cities/${city}`);
    return res.data.data || [];
  },

  async getTripVendorRates(tripId: string): Promise<any[]> {
    const res = await api.get(`/vendors/trips/${tripId}/rates`);
    return res.data.data || [];
  },

  async createTripVendorMapping(data: any): Promise<any> {
    const res = await api.post("/vendors/trip-mapping", data);
    return res.data.data;
  },

  async createTripVendorRate(data: any): Promise<any> {
    const res = await api.post("/vendors/rates", data);
    return res.data.data;
  },

  async updateTripVendorRate(rateId: string, data: any): Promise<any> {
    const res = await api.put(`/vendors/rates/${rateId}`, data);
    return res.data.data;
  },

  async getOpsVendors(params?: {
    type?: string;
    city?: string;
    active?: boolean;
    search?: string;
  }): Promise<any[]> {
    const res = await api.get("/vendors/ops", { params });
    return res.data.data;
  },

  async getOpsVendorById(id: string): Promise<any> {
    const res = await api.get(`/vendors/ops/${id}`);
    return res.data.data;
  },

  async createOpsVendor(data: any): Promise<any> {
    const res = await api.post("/vendors/ops", data);
    return res.data.data;
  },

  async updateOpsVendor(id: string, data: any): Promise<any> {
    const res = await api.put(`/vendors/ops/${id}`, data);
    return res.data.data;
  },

  async activateOpsVendor(id: string): Promise<any> {
    const res = await api.post(`/vendors/ops/${id}/activate`);
    return res.data;
  },

  // Rates Directory search
  async getAccommodationRates(params?: {
    city?: string;
    sharingType?: string;
    seasonType?: string;
  }): Promise<any[]> {
    const res = await api.get("/vendors/rates/accommodation", { params });
    return res.data.data;
  },

  async createAccommodationRate(data: any): Promise<any> {
    const res = await api.post("/vendors/rates/accommodation", data);
    return res.data.data;
  },

  async getTransportRates(params?: {
    tripCode?: string;
    vehicleType?: string;
  }): Promise<any[]> {
    const res = await api.get("/vendors/rates/transport", { params });
    return res.data.data;
  },

  async createTransportRate(data: any): Promise<any> {
    const res = await api.post("/vendors/rates/transport", data);
    return res.data.data;
  },

  async getAdditionalCharges(params?: {
    tripCode?: string;
    city?: string;
  }): Promise<any[]> {
    const res = await api.get("/vendors/rates/additional-charges", { params });
    return res.data.data;
  },

  async createAdditionalCharge(data: any): Promise<any> {
    const res = await api.post("/vendors/rates/additional-charges", data);
    return res.data.data;
  },

  // Excel Importer
  async getImportPreview(): Promise<any> {
    const res = await api.get("/vendors/import/preview");
    return res.data.data;
  },

  async confirmImport(data: {
    hotels: any[];
    transport: any[];
    additionalCharges: any[];
  }): Promise<any> {
    const res = await api.post("/vendors/import/confirm", data);
    return res.data;
  },

  // Departure Allocation Persistence
  async getDepartureAllocations(departureId: string): Promise<any[]> {
    const res = await api.get(`/vendors/departures/${departureId}/allocations`);
    return res.data.data;
  },

  async saveDepartureAllocations(
    departureId: string,
    allocations: any[],
  ): Promise<any> {
    const res = await api.post(
      `/vendors/departures/${departureId}/allocations`,
      { allocations },
    );
    return res.data;
  },
};
