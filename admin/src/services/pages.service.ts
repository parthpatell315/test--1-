import api from "./api";

export const pagesService = {
  getAll: async () => {
    const response = await api.get("/pages");
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get(`/pages/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post("/pages", data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/pages/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/pages/${id}`);
    return response.data;
  },
};
