import api from "./api";
import type { Blog, BlogFormData } from "@/types";

export const blogsService = {
  getAll: async () => {
    const res = await api.get("/blogs");
    return res.data.data.map((b: any) => ({ ...b, id: b.id || b._id }));
  },

  getOne: async (id: string) => {
    const res = await api.get(`/blogs/${id}`);
    const b = res.data.data;
    return { ...b, id: b.id || b._id };
  },

  create: async (data: BlogFormData) => {
    const res = await api.post("/blogs", data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<BlogFormData>) => {
    const res = await api.put(`/blogs/${id}`, data);
    return res.data.data;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/blogs/${id}`);
    return res.data;
  },
};
