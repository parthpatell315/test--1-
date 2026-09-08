import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useAuthStore } from "@/store/auth.store";
import { rbacService, UserAccessDetails } from "@/services/rbac.service";

interface PermissionContextType {
  userPermissions: string[];
  isLoading: boolean;
  userAccessDetails: UserAccessDetails | null;
  hasPermission: (required: string) => boolean;
  hasAnyPermission: (requiredList: string[]) => boolean;
  hasAllPermissions: (requiredList: string[]) => boolean;
  can: (action: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { admin: currentAdmin } = useAuthStore();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userAccessDetails, setUserAccessDetails] =
    useState<UserAccessDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshPermissions = async () => {
    if (!currentAdmin?.id) {
      setUserPermissions([]);
      setUserAccessDetails(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const accessDetails = await rbacService.getUserAccessDetails(
        currentAdmin.id,
      );
      setUserAccessDetails(accessDetails);
      setUserPermissions(accessDetails.effectivePermissions || []);
    } catch (err) {
      // Fallback permission calculation from AuthContext currentAdmin role
      const tokenPerms = Array.isArray((currentAdmin as any)?.permissions)
        ? (currentAdmin as any).permissions
        : [];
      const custom = (currentAdmin as any)?.customPermissions || [];
      const unionSet = new Set([...tokenPerms, ...custom]);
      setUserPermissions(Array.from(unionSet));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [currentAdmin?.id, currentAdmin?.role]);

  const value = useMemo(() => {
    const isSuperAdmin =
      (currentAdmin?.role || "").toLowerCase() === "superadmin";

    const hasPermission = (required: string): boolean => {
      if (isSuperAdmin) return true;
      return userPermissions.includes(required);
    };

    const hasAnyPermission = (requiredList: string[]): boolean => {
      if (isSuperAdmin) return true;
      return requiredList.some((req) => userPermissions.includes(req));
    };

    const hasAllPermissions = (requiredList: string[]): boolean => {
      if (isSuperAdmin) return true;
      return requiredList.every((req) => userPermissions.includes(req));
    };

    const can = (action: string): boolean => {
      return hasPermission(action);
    };

    return {
      userPermissions,
      isLoading,
      userAccessDetails,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      can,
      refreshPermissions,
    };
  }, [userPermissions, isLoading, userAccessDetails, currentAdmin?.role]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
};
