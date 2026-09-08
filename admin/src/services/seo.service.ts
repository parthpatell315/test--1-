import api from "./api";

export const seoService = {
  async get(page: string) {
    const res = await api.get(`/seo/${page}`);
    return res.data.data;
  },

  async update(page: string, data: any) {
    const res = await api.put(`/seo/${page}`, data);
    return res.data.data;
  },
};
