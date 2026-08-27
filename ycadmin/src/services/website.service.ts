import api from "./api";

// ── Types ───────────────────────────────────────────────────────────
export interface WebsitePage {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  content: Record<string, any>;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  published: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitePageSummary {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  published: boolean;
  updatedAt: string;
}

export interface WebsiteSetting {
  id: string;
  tenantId: string;
  key: string;
  value: any;
  updatedAt: string;
}

export interface CreatePagePayload {
  slug: string;
  title: string;
  content?: Record<string, any>;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  published?: boolean;
}

export interface UpdatePagePayload {
  slug?: string;
  title?: string;
  content?: Record<string, any>;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  published?: boolean;
}

// ── Service ─────────────────────────────────────────────────────────
export const websiteService = {
  // Pages — Public
  async getPublishedPages(): Promise<WebsitePageSummary[]> {
    const res = await api.get("/website/pages");
    return res.data.data || [];
  },

  // Pages — Admin (all including drafts)
  async getAllPages(): Promise<WebsitePage[]> {
    const res = await api.get("/website/pages/all");
    return res.data.data || [];
  },

  // Single page by slug
  async getPageBySlug(slug: string): Promise<WebsitePage | null> {
    const res = await api.get(`/website/pages/${encodeURIComponent(slug)}`);
    return res.data.data || null;
  },

  // Create page
  async createPage(data: CreatePagePayload): Promise<WebsitePage> {
    const res = await api.post("/website/pages", data);
    return res.data.data;
  },

  // Update page
  async updatePage(id: string, data: UpdatePagePayload): Promise<WebsitePage> {
    const res = await api.patch(`/website/pages/${id}`, data);
    return res.data.data;
  },

  // Soft-delete page
  async deletePage(id: string): Promise<void> {
    await api.delete(`/website/pages/${id}`);
  },

  // Settings — Public (key-value map)
  async getSettings(): Promise<Record<string, any>> {
    const res = await api.get("/website/settings");
    return res.data.data || {};
  },

  // Settings — Admin (all with metadata)
  async getAllSettings(): Promise<WebsiteSetting[]> {
    const res = await api.get("/website/settings/all");
    return res.data.data || [];
  },

  // Upsert setting
  async upsertSetting(key: string, value: any): Promise<WebsiteSetting> {
    const res = await api.patch(
      `/website/settings/${encodeURIComponent(key)}`,
      { value },
    );
    return res.data.data;
  },
};
