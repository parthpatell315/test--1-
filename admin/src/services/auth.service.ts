import api from "./api";
import type { Admin, AuthResponse } from "@/types";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    // Correct backend endpoint for admin login
    const res = await api.post("/admin/login", { email, password });
    return res.data.data;
  },

  async getMe(): Promise<Admin> {
    // Correct backend endpoint for current admin
    const res = await api.get("/admin/me");
    return res.data.data;
  },

  logout() {
    localStorage.removeItem("token");
  },
};
