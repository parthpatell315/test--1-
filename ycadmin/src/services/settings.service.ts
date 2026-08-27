import api from "./api";
import { Admin, LoginSession, APIKeyItem, IntegrationItem } from "@/types";

export interface UpdateProfilePayload {
  phone?: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  uiSettings?: Record<string, any>;
  notificationPreferences?: Record<string, any>;
  preferences?: Record<string, any>;
}

export interface PasswordChangePayload {
  currentPassword?: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface APIKeyPayload {
  name: string;
  permissions: string[];
  expiresAt?: string | null;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  details: string;
  status: "success" | "failed";
  ipAddress: string;
}

export const settingsService = {
  // General website / app settings helpers
  get: async (): Promise<any> => {
    try {
      const response = await api.get("/settings/public");
      return response.data?.data || response.data || {};
    } catch {
      return {};
    }
  },

  update: async (payload: any): Promise<any> => {
    try {
      const response = await api.put("/settings", payload);
      return response.data?.data || response.data || {};
    } catch {
      return {};
    }
  },

  getFooter: async (): Promise<any> => {
    try {
      const response = await api.get("/settings/footer");
      return response.data?.data || response.data || {};
    } catch {
      return {};
    }
  },

  updateFooter: async (payload: any): Promise<any> => {
    try {
      const response = await api.put("/settings/footer", payload);
      return response.data?.data || response.data || {};
    } catch {
      return {};
    }
  },

  // Get current admin details
  getProfile: async (): Promise<Admin> => {
    const response = await api.get("/admin/me");
    return response.data.data;
  },

  // Update profile and settings
  updateProfile: async (payload: UpdateProfilePayload): Promise<Admin> => {
    const response = await api.put("/admin/me", payload);
    return response.data.data;
  },

  // Update password
  changePassword: async (payload: PasswordChangePayload): Promise<void> => {
    await api.put("/admin/me/password", payload);
  },

  // Sessions management
  getSessions: async (): Promise<LoginSession[]> => {
    const response = await api.get("/admin/me/sessions");
    return response.data.sessions;
  },

  logoutSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/admin/me/sessions/${sessionId}`);
  },

  logoutAllExceptCurrent: async (): Promise<number> => {
    const response = await api.post(
      "/admin/me/sessions/logout-all-except-current",
    );
    return response.data.closedSessions || 0;
  },

  // Activity logs & audit
  getActivityLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    status?: string;
  }): Promise<{ logs: ActivityLogItem[]; totalCount: number }> => {
    const response = await api.get("/admin/me/activity-logs", { params });
    return response.data;
  },

  exportAuditCSV: async (): Promise<void> => {
    const response = await api.get("/admin/me/audit", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `audit_log_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // API Keys
  getAPIKeys: async (): Promise<APIKeyItem[]> => {
    const response = await api.get("/admin/me/api-keys");
    return response.data.keys;
  },

  generateAPIKey: async (
    payload: APIKeyPayload,
  ): Promise<{
    keyId: string;
    keySecret: string;
    createdAt: string;
    permissions: string[];
  }> => {
    const response = await api.post("/admin/me/api-keys", payload);
    return response.data;
  },

  deleteAPIKey: async (keyId: string): Promise<void> => {
    await api.delete(`/admin/me/api-keys/${keyId}`);
  },

  // Data & Privacy
  exportUserDataJSON: async (): Promise<void> => {
    const response = await api.get("/admin/me/export", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `youthcamping_data_export_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete("/admin/me", { data: { password } });
  },

  // Integrations
  getIntegrations: async (): Promise<IntegrationItem[]> => {
    const response = await api.get("/admin/me/integrations");
    return response.data.integrations;
  },

  connectIntegration: async (
    service: string,
    payload: { provider: string; credentials: any },
  ): Promise<IntegrationItem> => {
    const response = await api.post(
      `/admin/me/integrations/${service}/connect`,
      payload,
    );
    return response.data.integration;
  },

  testIntegration: async (service: string): Promise<string> => {
    const response = await api.post(`/admin/me/integrations/${service}/test`);
    return response.data.message;
  },
};
