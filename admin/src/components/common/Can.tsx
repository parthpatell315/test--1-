import React from "react";
import { usePermission } from "@/contexts/PermissionContext";

interface CanProps {
  permission?: string;
  permissions?: string[];
  mode?: "all" | "any";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  permissions = [],
  mode = "any",
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermission();

  let isAuthorized = false;

  if (permission) {
    isAuthorized = hasPermission(permission);
  } else if (permissions.length > 0) {
    if (mode === "all") {
      isAuthorized = hasAllPermissions(permissions);
    } else {
      isAuthorized = hasAnyPermission(permissions);
    }
  } else {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
