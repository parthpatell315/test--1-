import api from "./api";

export interface TripVendorDirectoryResponse {
  success: boolean;
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  categoryCounts: {
    total: number;
    accommodation: number;
    transport: number;
    activities: number;
    restaurants: number;
    guides: number;
    other: number;
  };
  destinations?: string[];
  trip: {
    id: string;
    title: string;
    location?: string;
    vendorCount: number;
  };
}

const tripVendorMemoryCache = new Map<string, TripVendorDirectoryResponse>();

export const clearTripVendorCache = (tripId?: string) => {
  if (!tripId) {
    tripVendorMemoryCache.clear();
  } else {
    for (const key of tripVendorMemoryCache.keys()) {
      if (key.startsWith(`${tripId}:`)) {
        tripVendorMemoryCache.delete(key);
      }
    }
  }
};

export const categoryToTypeParam = (category: string): string => {
  switch (category) {
    case "accommodation":
      return "ACCOMMODATION";
    case "transport":
      return "TRANSPORT";
    case "activities":
      return "ACTIVITIES";
    case "restaurants":
      return "RESTAURANTS";
    case "guides":
      return "GUIDE";
    case "other":
      return "OTHER";
    default:
      return "ALL";
  }
};

export const fetchTripVendorDirectory = async (
  tripId: string,
  category: string,
  filters: {
    search?: string;
    destination?: string;
    status?: string;
    page?: number;
    limit?: number;
    forceFresh?: boolean;
  } = {}
): Promise<TripVendorDirectoryResponse> => {
  if (!tripId) {
    throw new Error("tripId is required to fetch vendor directory");
  }

  const typeParam = categoryToTypeParam(category);
  const cacheKey = `${tripId}:${typeParam}:${filters.search || ""}:${filters.destination || ""}:${filters.status || ""}:${filters.page || 1}`;

  if (!filters.forceFresh && tripVendorMemoryCache.has(cacheKey)) {
    return tripVendorMemoryCache.get(cacheKey)!;
  }

  const queryParams = new URLSearchParams();
  if (typeParam !== "ALL") {
    queryParams.set("type", typeParam);
  }
  if (filters.search?.trim()) {
    queryParams.set("search", filters.search.trim());
  }
  if (filters.destination && filters.destination !== "ALL") {
    queryParams.set("destination", filters.destination);
  }
  if (filters.status && filters.status !== "ALL") {
    queryParams.set("isActive", filters.status === "ACTIVE" ? "true" : "false");
  }
  if (filters.page) {
    queryParams.set("page", filters.page.toString());
  }
  queryParams.set("limit", (filters.limit || 500).toString());

  const res = await api.get(`/trips/${tripId}/vendor-directory?${queryParams.toString()}`);
  if (res.data?.success) {
    tripVendorMemoryCache.set(cacheKey, res.data);
  }
  return res.data;
};

export const fetchTripDestinations = async (tripId: string): Promise<string[]> => {
  if (!tripId) return [];
  const res = await api.get(`/trips/${tripId}/vendor-directory/destinations`);
  return res.data?.data || [];
};

export const fetchTripsList = async (): Promise<any[]> => {
  const res = await api.get("/vendors/trips");
  return res.data?.data || [];
};
