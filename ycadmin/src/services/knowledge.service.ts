import api from "./api";

export interface KnowledgeSection {
  id: string;
  tripId: string;
  tabKey: string;
  title: string;
  description: string;
  itemCount: number;
}

export interface TripNotice {
  id: string;
  tripId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface TripCompact {
  id: string;
  title: string;
  tripType?: string; // domestic / international
  location: string;
  duration: string;
  maxAltitude?: string;
  maxGroupSize?: number;
}

export interface SearchResult {
  trips: any[];
  sections: KnowledgeSection[];
  notices: TripNotice[];
  vendors: any[];
}

export const knowledgeService = {
  // Navigation persistence state in DB
  getNavState: async (): Promise<string | null> => {
    try {
      const res = await api.get("/knowledge/nav-state");
      return res.data.success ? res.data.data : null;
    } catch (e) {
      console.error("Failed to get nav state from DB:", e);
      return null;
    }
  },

  saveNavState: async (expandedModule: string): Promise<boolean> => {
    try {
      const res = await api.post("/knowledge/nav-state", { expandedModule });
      return res.data.success;
    } catch (e) {
      console.error("Failed to save nav state to DB:", e);
      return false;
    }
  },

  // Fetch sections
  getSections: async (tripId: string): Promise<KnowledgeSection[]> => {
    try {
      const res = await api.get(`/knowledge/sections/${tripId}`);
      return res.data.success ? res.data.data : [];
    } catch (e) {
      console.error("Failed to fetch sections:", e);
      return [];
    }
  },

  // Fetch notices
  getNotices: async (tripId: string): Promise<TripNotice[]> => {
    try {
      const res = await api.get(`/knowledge/notices/${tripId}`);
      return res.data.success ? res.data.data : [];
    } catch (e) {
      console.error("Failed to fetch notices:", e);
      return [];
    }
  },

  // Search knowledge base
  search: async (query: string): Promise<SearchResult> => {
    try {
      const res = await api.get(
        `/knowledge/search?q=${encodeURIComponent(query)}`,
      );
      return res.data.success
        ? res.data.data
        : { trips: [], sections: [], notices: [], vendors: [] };
    } catch (e) {
      console.error("Failed to search knowledge base:", e);
      return { trips: [], sections: [], notices: [], vendors: [] };
    }
  },

  // Create or Update section
  upsertSection: async (data: {
    tripId: string;
    tabKey: string;
    title: string;
    description: string;
    itemCount: number;
  }): Promise<KnowledgeSection | null> => {
    try {
      const res = await api.post("/knowledge/sections", data);
      return res.data.success ? res.data.data : null;
    } catch (e) {
      console.error("Failed to upsert section:", e);
      return null;
    }
  },

  // Create notice
  createNotice: async (data: {
    tripId: string;
    title: string;
    body: string;
  }): Promise<TripNotice | null> => {
    try {
      const res = await api.post("/knowledge/notices", data);
      return res.data.success ? res.data.data : null;
    } catch (e) {
      console.error("Failed to create notice:", e);
      return null;
    }
  },
};
