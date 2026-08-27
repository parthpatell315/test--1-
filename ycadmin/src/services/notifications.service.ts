import api from "./api";

export const notificationsService = {
  getAll: async () => {
    const res = await api.get("/notifications");
    return res.data;
  },
  markAsRead: async (id: string) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.put("/notifications/read-all");
    return res.data;
  },
  sendTest: async () => {
    const res = await api.post("/notifications/test");
    return res.data;
  },
  clearAll: async () => {
    const res = await api.delete("/notifications/clear-all");
    return res.data;
  },
};

