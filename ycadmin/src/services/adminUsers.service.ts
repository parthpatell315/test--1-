import { api } from "./api";
import { Admin, AuditLog } from "@/types";

export const adminUsersService = {
  listAdmins: async (): Promise<Admin[]> => {
    const response = await api.get("/admin/users");
    return response.data.data;
  },

  getSalesExecutives: async (): Promise<
    Array<{ id: string; name: string; email: string; role: string }>
  > => {
    try {
      const response = await api.get("/admin/users/sales-executives");
      return response.data?.data || [];
    } catch (e) {
      return [];
    }
  },

  createAdmin: async (adminData: any): Promise<Admin> => {
    const response = await api.post("/admin/users", adminData);
    return response.data.data;
  },

  updateAdminRole: async (
    id: string,
    role: string,
    customPermissions?: string[],
  ): Promise<{ id: string; role: string; customPermissions?: string[] }> => {
    const response = await api.put(`/admin/users/${id}/role`, {
      role,
      customPermissions,
    });
    return response.data.data;
  },

  updateAdminPermissions: async (
    id: string,
    payload: { role?: string; customPermissions?: string[] },
  ): Promise<{ id: string; role: string; customPermissions?: string[] }> => {
    const response = await api.put(`/admin/users/${id}/permissions`, payload);
    return response.data.data;
  },

  toggleAdminActive: async (
    id: string,
  ): Promise<{ id: string; isActive: boolean }> => {
    const response = await api.put(`/admin/users/${id}/toggle-active`);
    return response.data.data;
  },

  resetAdminPassword: async (
    id: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.put(`/admin/users/${id}/reset-password`, {
      password,
    });
    return response.data;
  },

  deleteAdmin: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getMyProfile: async (): Promise<Admin> => {
    const response = await api.get("/admin/me");
    return response.data.data;
  },

  updateMyProfile: async (data: {
    phone?: string;
    avatarUrl?: string;
    notificationPreferences?: any;
    uiSettings?: any;
  }): Promise<Admin> => {
    const response = await api.put("/admin/me", data);
    return response.data.data;
  },

  updateMyPassword: async (payload: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> => {
    const response = await api.put("/admin/me/password", payload);
    return response.data;
  },

  listAuditLogs: async (): Promise<AuditLog[]> => {
    const response = await api.get("/admin/audit-logs");
    return response.data.data;
  },
};
