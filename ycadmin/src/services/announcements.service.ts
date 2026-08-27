import api from "./api";

export interface Announcement {
  id: string;
  title: string;
  author: string;
  createdAt: string;
}

export const announcementsService = {
  async getAll(): Promise<Announcement[]> {
    const res = await api.get("/announcements");
    return res.data.data;
  },

  async create(title: string): Promise<Announcement> {
    const res = await api.post("/announcements", { title });
    return res.data.data;
  },
};
