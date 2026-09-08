import { create } from "zustand";
import type { Admin } from "@/types";
import { authService } from "@/services/auth.service";

/**
 * Structural JWT check — verifies the token has 3 dot-separated parts.
 * Does NOT decode or check expiry.
 */
function isStructurallyValidJwt(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.split(".").length === 3;
}

/**
 * Check if a JWT token is expired (with optional buffer).
 * Returns true if the token IS expired or unreadable.
 */
function isJwtExpired(
  value: string | null | undefined,
  bufferMs = 60000,
): boolean {
  if (!value) return true;
  try {
    const parts = value.split(".");
    if (parts.length !== 3) return true;

    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    base64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const jsonString = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );

    const payload = JSON.parse(jsonString);
    if (payload && typeof payload.exp === "number") {
      return payload.exp * 1000 <= Date.now() + bufferMs;
    }
  } catch {
    return true;
  }
  return false;
}

/**
 * Returns true if the value is a non-empty, non-corrupted string
 * that is NOT the literal "undefined" or "null".
 */
function isValidTokenString(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed !== "" && trimmed !== "undefined" && trimmed !== "null";
}

interface AuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: (force?: boolean) => Promise<void>;
}

function getStoredAdmin(): Admin | null {
  try {
    const raw =
      typeof window !== "undefined" && typeof localStorage !== "undefined"
        ? localStorage.getItem("admin_user") || localStorage.getItem("admin")
        : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const initialToken =
  typeof window !== "undefined" && typeof localStorage !== "undefined"
    ? localStorage.getItem("token")
    : null;

const hasInitialAdminToken =
  isValidTokenString(initialToken) &&
  isStructurallyValidJwt(initialToken) &&
  !isJwtExpired(initialToken);

const initialAdmin = getStoredAdmin();
const initialHasAuth = hasInitialAdminToken && !!initialAdmin;

export const useAuthStore = create<AuthState>((set, get) => ({
  admin: initialAdmin,
  isAuthenticated: initialHasAuth,
  isLoading: hasInitialAdminToken && !initialAdmin,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const auth = await authService.login(email, password);
      if (!auth || !auth.token || !isValidTokenString(auth.token)) {
        throw new Error("Login failed: server returned an invalid token.");
      }
      localStorage.setItem("token", auth.token);
      if (auth.admin) {
        localStorage.setItem("admin_user", JSON.stringify(auth.admin));
      }
      set({ admin: auth.admin, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin");
    localStorage.removeItem("admin_user");
    sessionStorage.clear();
    set({ admin: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async (_force = false) => {
    const token = localStorage.getItem("token");

    const hasAdminToken =
      isValidTokenString(token) &&
      isStructurallyValidJwt(token) &&
      !isJwtExpired(token);

    if (!hasAdminToken) {
      localStorage.removeItem("token");
      localStorage.removeItem("admin_user");
      set({ admin: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const currentAdmin = get().admin;
    if (!currentAdmin) {
      set({ isLoading: true });
    }

    try {
      const admin = await authService.getMe();
      if (admin) {
        localStorage.setItem("admin_user", JSON.stringify(admin));
      }
      set({ admin, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("admin_user");
        set({ admin: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
}));
