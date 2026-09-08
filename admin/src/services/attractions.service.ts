import api from "./api";

export interface Attraction {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  location: string;
  altitude: string;
  bestTime: string;
  category: string;
  visitingHours?: string;
  entryFee?: string;
  etiquette?: string[];
  faqs?: { question: string; answer: string }[];
  isFeatured: boolean;
  order: number;
}

export const attractionsService = {
  getAll: async () => {
    const response = await api.get("/attractions");
    return response.data.data || [];
  },
  create: async (data: any) => {
    const response = await api.post("/attractions", data);
    return response.data.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/attractions/${id}`, data);
    return response.data.data;
  },
  remove: async (id: string) => {
    const response = await api.delete(`/attractions/${id}`);
    return response.data.data;
  },
};
