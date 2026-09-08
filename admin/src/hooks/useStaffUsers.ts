import { useState, useEffect } from "react";
import { adminUsersService } from "@/services/adminUsers.service";
import { Admin } from "@/types";

export interface StaffOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export function useStaffUsers() {
  const [staffUsers, setStaffUsers] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      try {
        const fetchedAdmins: Admin[] = await adminUsersService.listAdmins();
        if (mounted && Array.isArray(fetchedAdmins) && fetchedAdmins.length > 0) {
          setStaffUsers(
            fetchedAdmins.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email || "",
              role: u.role ? u.role.toUpperCase() : "STAFF",
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load live staff members in useStaffUsers:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    staffUsers,
    loading,
  };
}
