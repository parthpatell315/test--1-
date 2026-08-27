import { api } from "./api";

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isCustom: boolean;
  isArchived: boolean;
  status: string;
  assignedUsersCount: number;
  permissionsCount: number;
  permissions: Array<{
    id: string;
    action: string;
    name: string;
    module: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description?: string;
  resourceType?: string;
  tier: string;
}

export interface PermissionMatrixRow {
  permissionId: string;
  module: string;
  action: string;
  name: string;
  description?: string;
  roles: Record<string, boolean>;
}

export interface UserAccessDetails {
  userId: string;
  roles: Array<{
    roleId: string;
    roleName: string;
    isPrimary: boolean;
    isSystem: boolean;
  }>;
  customPermissions: Array<{
    id: string;
    permissionId: string;
    action: string;
    name: string;
    module: string;
    isDenied: boolean;
    expiresAt?: string;
  }>;
  delegations: Array<{
    id: string;
    fromUserId: string;
    action: string;
    name: string;
    expiresAt: string;
  }>;
  effectivePermissions: string[];
}

export interface RbacAuditLogItem {
  id: string;
  tenantId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const rbacService = {
  getRoles: async (includeArchived = false, search = ""): Promise<Role[]> => {
    const res = await api.get("/admin/rbac/roles", {
      params: { includeArchived, search },
    });
    return res.data.data;
  },

  getRoleById: async (id: string): Promise<Role> => {
    const res = await api.get(`/admin/rbac/roles/${id}`);
    return res.data.data;
  },

  createRole: async (payload: {
    name: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<Role> => {
    const res = await api.post("/admin/rbac/roles", payload);
    return res.data.data;
  },

  updateRole: async (
    id: string,
    payload: { name?: string; description?: string; permissionIds?: string[] },
  ): Promise<Role> => {
    const res = await api.put(`/admin/rbac/roles/${id}`, payload);
    return res.data.data;
  },

  cloneRole: async (id: string, newName?: string): Promise<Role> => {
    const res = await api.post(`/admin/rbac/roles/${id}/clone`, { newName });
    return res.data.data;
  },

  deleteRole: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/admin/rbac/roles/${id}`);
    return res.data;
  },

  getPermissions: async (): Promise<{
    permissions: Permission[];
    grouped: Record<string, Permission[]>;
  }> => {
    const res = await api.get("/admin/rbac/permissions");
    return res.data.data;
  },

  getPermissionMatrix: async (): Promise<{
    roles: Array<{ id: string; name: string; isSystem: boolean }>;
    matrix: PermissionMatrixRow[];
  }> => {
    const res = await api.get("/admin/rbac/matrix");
    return res.data.data;
  },

  getUserAccessDetails: async (userId: string): Promise<UserAccessDetails> => {
    const res = await api.get(`/admin/rbac/users/${userId}/access`);
    return res.data.data;
  },

  updateUserRoles: async (
    userId: string,
    roleIds: string[],
    primaryRoleId?: string,
  ): Promise<{ success: boolean }> => {
    const res = await api.put(`/admin/rbac/users/${userId}/roles`, {
      roleIds,
      primaryRoleId,
    });
    return res.data;
  },

  setUserCustomPermission: async (
    userId: string,
    payload: { permissionId: string; isDenied?: boolean; expiresAt?: string },
  ): Promise<any> => {
    const res = await api.post(
      `/admin/rbac/users/${userId}/custom-permissions`,
      payload,
    );
    return res.data.data;
  },

  removeUserCustomPermission: async (
    userId: string,
    permissionId: string,
  ): Promise<{ success: boolean }> => {
    const res = await api.delete(
      `/admin/rbac/users/${userId}/custom-permissions/${permissionId}`,
    );
    return res.data;
  },

  delegatePermission: async (payload: {
    toUserId: string;
    permissionId: string;
    expiresAt: string;
  }): Promise<any> => {
    const res = await api.post("/admin/rbac/delegations", payload);
    return res.data.data;
  },

  revokeDelegation: async (
    delegationId: string,
  ): Promise<{ success: boolean }> => {
    const res = await api.delete(`/admin/rbac/delegations/${delegationId}`);
    return res.data;
  },

  getAuditLog: async (params?: {
    userId?: string;
    action?: string;
    resourceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: RbacAuditLogItem[]; pagination: any }> => {
    const res = await api.get("/admin/rbac/audit-log", { params });
    return res.data.data;
  },
};
