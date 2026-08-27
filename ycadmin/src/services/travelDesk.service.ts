import api from "./api";
import { Trip } from "../types";

export interface TravelDeskWorkspace {
  id: string;
  tripId: string;
  status: string;
  readinessScore: number;
  categories: any[];
}

export interface TravelDeskVendorLink {
  id: string;
  workspaceId: string;
  vendorId: string;
  departureDate?: string;
  relationshipType: string;
  negotiatedRate?: number;
  validFrom?: string;
  validUntil?: string;
  internalNotes?: string;
  isPreferred: boolean;
  status: string;
  vendor: any;
}

export interface TravelDeskArticle {
  id: string;
  workspaceId: string;
  categoryId: string;
  title: string;
  summary?: string;
  content: string;
  status: string;
  category?: any;
  tags?: string | null;
  visibility?: string;
  effectiveFrom?: string;
  expiresAt?: string;
  effectiveStatus?: string;
}

export interface DepartureSummary {
  departureDate: string;
  confirmedPassengers: number;
  pendingPassengers: number;
  bookingsCount: number;
}

export interface TicketingSopItem {
  id: string;
  sopId: string;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketingSop {
  id: string;
  tripId: string;
  category: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  items: TicketingSopItem[];
  _count?: { items: number };
}

export interface TicketingLink {
  id: string;
  tripId: string;
  label: string;
  val: string;
  icon: string;
  linkUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  id: string;
  itineraryId: string;
  dayNumber: string;
  dayDate: string;
  plan: string;
  stay: string;
  meals: string;
  transport: string;
  distance: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryRouteMap {
  id: string;
  itineraryId: string;
  mapUrl?: string;
  description?: string;
}

export interface ItineraryInclusion {
  id: string;
  itineraryId: string;
  text: string;
}

export interface ItineraryExclusion {
  id: string;
  itineraryId: string;
  text: string;
}

export interface ItineraryNote {
  id: string;
  itineraryId: string;
  title: string;
  body: string;
}

export interface Itinerary {
  id: string;
  tripId: string;
  name: string;
  isDefault: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  days: ItineraryDay[];
  routeMaps: ItineraryRouteMap[];
  inclusions: ItineraryInclusion[];
  exclusions: ItineraryExclusion[];
  notes: ItineraryNote[];
}

export interface TripSopItem {
  id: string;
  sopId: string;
  title: string;
  content?: string;
}

export interface TripSop {
  id: string;
  tripId: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  items: TripSopItem[];
  _count?: { items: number };
}

export interface TripDocument {
  id: string;
  tripId: string;
  name: string;
  category: string;
  fileType: string;
  size?: string;
  addedBy: string;
  dateAdded: string;
  fileUrl?: string;
  title?: string;
  version?: number;
  visibility?: string;
  status?: string;
  approvalDetails?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TripGallery {
  id: string;
  tripId: string;
  title: string;
  imageUrl?: string;
}

export interface TripNote {
  id: string;
  tripId: string;
  title: string;
  content?: string;
  category: string;
  linkUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const travelDeskService = {
  // ── CORE WORKSPACE & TRIPS (Stage 3) ──
  getTravelDeskTrips: async (signal?: AbortSignal): Promise<any[]> => {
    const res = await api.get(`/travel-desk/trips`, { signal });
    return res.data.data;
  },
  feedWorkspaces: async (tripIds: string[]): Promise<any> => {
    const res = await api.post(`/travel-desk/workspaces/feed`, { tripIds });
    return res.data.data;
  },
  getWorkspace: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<TravelDeskWorkspace> => {
    const res = await api.get(`/travel-desk/workspaces/${tripId}`, { signal });
    return res.data.data;
  },
  getTripOverview: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<Trip> => {
    const res = await api.get(`/travel-desk/${tripId}/overview`, { signal });
    return res.data.data;
  },
  getOfficialItinerary: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<any> => {
    const res = await api.get(`/travel-desk/${tripId}/itinerary`, { signal });
    return res.data.data;
  },
  getDepartures: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<DepartureSummary[]> => {
    const res = await api.get(`/travel-desk/${tripId}/departures`, { signal });
    return res.data.data;
  },

  // ── VENDORS ──
  getVendors: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<TravelDeskVendorLink[]> => {
    const res = await api.get(`/travel-desk/${tripId}/vendors`, { signal });
    return res.data.data;
  },
  linkVendor: async (
    tripId: string,
    data: any,
  ): Promise<TravelDeskVendorLink> => {
    const res = await api.post(`/travel-desk/${tripId}/vendors/link`, data);
    return res.data.data;
  },
  unlinkVendor: async (tripId: string, linkId: string): Promise<void> => {
    await api.delete(`/travel-desk/${tripId}/vendors/${linkId}`);
  },

  // ── ARTICLES ──
  getArticles: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<TravelDeskArticle[]> => {
    const res = await api.get(`/travel-desk/${tripId}/articles`, { signal });
    return res.data.data;
  },
  createArticle: async (
    tripId: string,
    data: any,
  ): Promise<TravelDeskArticle> => {
    const res = await api.post(`/travel-desk/${tripId}/articles`, data);
    return res.data.data;
  },
  updateArticle: async (
    tripId: string,
    articleId: string,
    data: any,
  ): Promise<TravelDeskArticle> => {
    const res = await api.patch(
      `/travel-desk/${tripId}/articles/${articleId}`,
      data,
    );
    return res.data.data;
  },
  approveArticle: async (
    tripId: string,
    articleId: string,
  ): Promise<TravelDeskArticle> => {
    const res = await api.post(
      `/travel-desk/${tripId}/articles/${articleId}/approve`,
    );
    return res.data.data;
  },
  publishArticle: async (
    tripId: string,
    articleId: string,
  ): Promise<TravelDeskArticle> => {
    const res = await api.post(
      `/travel-desk/${tripId}/articles/${articleId}/publish`,
    );
    return res.data.data;
  },
  archiveArticle: async (
    tripId: string,
    articleId: string,
  ): Promise<TravelDeskArticle> => {
    const res = await api.post(
      `/travel-desk/${tripId}/articles/${articleId}/archive`,
    );
    return res.data.data;
  },
  getReadiness: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<{ readinessScore: number }> => {
    const res = await api.get(`/travel-desk/${tripId}/readiness`, { signal });
    return res.data.data;
  },

  // ── TICKETING ──
  getTicketing: async (
    tripId: string,
  ): Promise<{ sops: TicketingSop[]; links: TicketingLink[] }> => {
    const res = await api.get(`/travel-desk/ticketing/${tripId}`);
    return res.data.data;
  },
  createTicketingSop: async (
    data: Partial<TicketingSop>,
  ): Promise<TicketingSop> => {
    const res = await api.post(`/travel-desk/ticketing/sops`, data);
    return res.data.data;
  },
  updateTicketingSop: async (
    id: string,
    data: Partial<TicketingSop>,
  ): Promise<TicketingSop> => {
    const res = await api.put(`/travel-desk/ticketing/sops/${id}`, data);
    return res.data.data;
  },
  deleteTicketingSop: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/ticketing/sops/${id}`);
  },
  createTicketingLink: async (
    data: Partial<TicketingLink>,
  ): Promise<TicketingLink> => {
    const res = await api.post(`/travel-desk/ticketing/links`, data);
    return res.data.data;
  },
  updateTicketingLink: async (
    id: string,
    data: Partial<TicketingLink>,
  ): Promise<TicketingLink> => {
    const res = await api.put(`/travel-desk/ticketing/links/${id}`, data);
    return res.data.data;
  },
  deleteTicketingLink: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/ticketing/links/${id}`);
  },

  // ── ITINERARY ──
  getItineraries: async (tripId: string): Promise<Itinerary[]> => {
    const res = await api.get(`/travel-desk/itineraries/${tripId}`);
    return res.data.data;
  },
  createItinerary: async (data: Partial<Itinerary>): Promise<Itinerary> => {
    const res = await api.post(`/travel-desk/itineraries`, data);
    return res.data.data;
  },
  duplicateItinerary: async (id: string): Promise<Itinerary> => {
    const res = await api.post(`/travel-desk/itineraries/${id}/duplicate`);
    return res.data.data;
  },
  updateItinerary: async (
    id: string,
    data: Partial<Itinerary>,
  ): Promise<Itinerary> => {
    const res = await api.put(`/travel-desk/itineraries/${id}`, data);
    return res.data.data;
  },
  deleteItinerary: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/itineraries/${id}`);
  },
  setDefaultItinerary: async (id: string): Promise<Itinerary> => {
    const res = await api.put(`/travel-desk/itineraries/${id}/default`);
    return res.data.data;
  },

  // ── SOPs ──
  getSops: async (tripId: string): Promise<TripSop[]> => {
    const res = await api.get(`/travel-desk/sops/${tripId}`);
    return res.data.data;
  },
  createSop: async (data: {
    tripId: string;
    title: string;
    description?: string;
    category?: string;
    icon?: string;
    items?: { title: string; content?: string }[];
  }): Promise<TripSop> => {
    const res = await api.post(`/travel-desk/sops`, data);
    return res.data.data;
  },
  updateSop: async (
    id: string,
    data: {
      tripId?: string;
      title?: string;
      description?: string;
      category?: string;
      icon?: string;
      items?: { title: string; content?: string }[];
    },
  ): Promise<TripSop> => {
    const res = await api.put(`/travel-desk/sops/${id}`, data);
    return res.data.data;
  },
  deleteSop: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/sops/${id}`);
  },

  // ── DOCUMENTS ──
  getDocuments: async (
    tripId: string,
  ): Promise<{ data: TripDocument[]; summary: Record<string, number> }> => {
    const res = await api.get(`/travel-desk/documents/${tripId}`);
    return res.data;
  },
  uploadDocuments: async (
    tripId: string,
    files: File[],
    category?: string,
    visibility?: string,
    validFrom?: string,
    validUntil?: string,
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("tripId", tripId);
    if (category) formData.append("category", category);
    if (visibility) formData.append("visibility", visibility);
    if (validFrom) formData.append("validFrom", validFrom);
    if (validUntil) formData.append("validUntil", validUntil);
    files.forEach((file) => {
      formData.append("files", file);
    });
    const res = await api.post(`/travel-desk/documents/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
  reviewDocument: async (
    id: string,
    status: string,
    approvalDetails?: any,
  ): Promise<TripDocument> => {
    const res = await api.put(`/travel-desk/documents/${id}/status`, {
      status,
      approvalDetails,
    });
    return res.data.data;
  },
  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/documents/${id}`);
  },
  updateDocument: async (id: string, data: any): Promise<any> => {
    const res = await api.patch(`/travel-desk/documents/${id}`, data);
    return res.data.data;
  },

  // ── GALLERY ──
  getGallery: async (tripId: string): Promise<TripGallery[]> => {
    const res = await api.get(`/travel-desk/gallery/${tripId}`);
    return res.data.data;
  },
  uploadGallery: async (formData: FormData): Promise<any> => {
    const res = await api.post(`/travel-desk/gallery`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
  deleteGalleryItem: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/gallery/${id}`);
  },

  // ── NOTES & UPDATES ──
  getNotes: async (
    tripId: string,
  ): Promise<{ data: TripNote[]; summary: Record<string, number> }> => {
    const res = await api.get(`/travel-desk/notes/${tripId}`);
    return res.data;
  },
  createNote: async (data: Partial<TripNote>): Promise<TripNote> => {
    const res = await api.post(`/travel-desk/notes`, data);
    return res.data.data;
  },
  updateNote: async (
    id: string,
    data: Partial<TripNote>,
  ): Promise<TripNote> => {
    const res = await api.put(`/travel-desk/notes/${id}`, data);
    return res.data.data;
  },
  deleteNote: async (id: string): Promise<void> => {
    await api.delete(`/travel-desk/notes/${id}`);
  },

  // ── KNOWLEDGE BASE ITEMS ──
  getKnowledgeItems: async (
    tripId: string,
    filters?: { category?: string; search?: string; status?: string },
  ): Promise<any[]> => {
    const res = await api.get(`/travel-desk/knowledge-items/${tripId}`, {
      params: filters,
    });
    return res.data.data;
  },
  updateKnowledgeItem: async (id: string, data: any): Promise<any> => {
    const res = await api.put(`/travel-desk/knowledge-items/${id}`, data);
    return res.data.data;
  },

  // ── TRAVEL AI ──
  askTravelAi: async (
    tripId: string,
    message: string,
  ): Promise<{ answer: string; answerUnavailable?: boolean }> => {
    const res = await api.post(`/travel-desk/ai/chat`, { tripId, message });
    return res.data;
  },

  // ── ESCALATED QUESTIONS ──
  getEscalatedQuestions: async (tripId: string): Promise<any[]> => {
    const res = await api.get(`/travel-desk/questions/${tripId}`);
    return res.data.data;
  },
  createEscalatedQuestion: async (
    tripId: string,
    question: string,
    escalatedTo: string,
  ): Promise<any> => {
    const res = await api.post(`/travel-desk/questions`, {
      tripId,
      question,
      escalatedTo,
    });
    return res.data.data;
  },
  answerEscalatedQuestion: async (
    id: string,
    answer: string,
    status: string,
  ): Promise<any> => {
    const res = await api.put(`/travel-desk/questions/${id}/answer`, {
      answer,
      status,
    });
    return res.data.data;
  },

  // ── TRIP NOTICES & UPDATES ACKS ──
  acknowledgeNotice: async (id: string): Promise<any> => {
    const res = await api.post(`/travel-desk/notices/${id}/acknowledge`);
    return res.data.data;
  },
  getNoticeAcks: async (id: string): Promise<any[]> => {
    const res = await api.get(`/travel-desk/notices/${id}/acks`);
    return res.data.data;
  },

  // ── QUICK SALES ACTION ──
  createSalesRecord: async (data: {
    type: "inquiry" | "quotation" | "booking";
    tripId: string;
    departureDate?: string;
    joiningCity?: string;
    price?: number;
    passengerName: string;
    passengerPhone?: string;
    passengerEmail?: string;
  }): Promise<any> => {
    const res = await api.post(`/travel-desk/create-record`, data);
    return res.data.data;
  },

  bulkCreateTrips: async (trips?: string[]): Promise<any> => {
    const res = await api.post(`/travel-desk/bulk-trips`, { trips });
    return res.data;
  },

  // ── CONTENT MANAGEMENT & APPROVALS (STAGE 4) ──
  requestArticleChanges: async (
    tripId: string,
    articleId: string,
    comment: string,
  ): Promise<any> => {
    const res = await api.post(
      `/travel-desk/${tripId}/articles/${articleId}/request-changes`,
      { comment },
    );
    return res.data.data;
  },
  changeArticleStatus: async (
    tripId: string,
    articleId: string,
    status: string,
  ): Promise<any> => {
    const res = await api.patch(
      `/travel-desk/${tripId}/articles/${articleId}/status`,
      { status },
    );
    return res.data.data;
  },
  getPendingApprovals: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<any> => {
    const res = await api.get(`/travel-desk/${tripId}/approvals`, { signal });
    return res.data.data;
  },

  // ── ACTIVITY LOG ──
  getActivityLog: async (
    tripId: string,
    signal?: AbortSignal,
  ): Promise<any> => {
    const res = await api.get(`/travel-desk/${tripId}/activity-log`, {
      signal,
    });
    return res.data.data;
  },
};
