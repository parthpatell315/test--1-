import api from "./api";

export const reviewsService = {
  getAll: async (params?: any) => {
    const response = await api.get("/reviews", { params });
    return response.data.data;
  },

  create: async (data: any) => {
    const response = await api.post("/reviews", data);
    return response.data.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data.data;
  },

  remove: async (id: string) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
};
