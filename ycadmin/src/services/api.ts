import axios from "axios";
import { ENV } from "../config/environment";

const api = axios.create({
  baseURL: ENV.API_BASE_URL.endsWith("/api")
    ? ENV.API_BASE_URL
    : `${ENV.API_BASE_URL}/api`,
  timeout: ENV.API_TIMEOUT_MS,
  withCredentials: true, // Support httpOnly secure session cookies
});

let requestIdCounter = 0;
let adminRedirectInProgress = false;

const TRACE_REQUESTS =
  ENV.IS_DEVELOPMENT && import.meta.env.VITE_TRACE_REQUESTS === "true";

api.interceptors.request.use((config) => {
  // Ensure relative endpoints don't get double prefixed if baseURL is fully configured
  if (
    config.url &&
    !config.url.startsWith("/") &&
    !config.url.startsWith("http")
  ) {
    config.url = `/${config.url}`;
  }

  // Token injection with Axios 1.x compatibility and sanitization
  const rawToken = localStorage.getItem("token");
  if (rawToken && rawToken !== "undefined" && rawToken !== "null") {
    let cleanToken = rawToken.trim().replace(/^["'\\]+|["'\\]+$/g, "");
    if (cleanToken.startsWith("Bearer ")) {
      cleanToken = cleanToken.slice(7).trim();
    }
    // Only attach if token is a structurally valid 3-part JWT
    if (cleanToken && cleanToken.split(".").length === 3) {
      const bearerValue = `Bearer ${cleanToken}`;
      if (config.headers && typeof (config.headers as any).set === "function") {
        (config.headers as any).set("Authorization", bearerValue);
      } else if (config.headers) {
        (config.headers as any)["Authorization"] = bearerValue;
      }
      adminRedirectInProgress = false;
    } else {
      localStorage.removeItem("token");
    }
  }

  if (TRACE_REQUESTS) {
    requestIdCounter++;
    const reqId = `REQ-${requestIdCounter}`;
    (config as any)._reqId = reqId;
    (config as any)._startTime = Date.now();
    // Log only basic sanitised infrastructure data, never tokens or request bodies
    console.log(`[TRACE][START] ID: ${reqId} | Endpoint: ${config.url}`);
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    if (TRACE_REQUESTS) {
      const config = res.config as any;
      if (config._reqId) {
        const duration = Date.now() - (config._startTime || Date.now());
        console.log(
          `[TRACE][DONE] ID: ${config._reqId} | Duration: ${duration}ms | Status: ${res.status}`,
        );
      }
    }
    return res;
  },
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url;

    // 401 Handling: Session expired or unauthorized
    if (status === 401 && !axios.isCancel(err)) {
      const isLoginRequest =
        url?.includes("/admin/login") ||
        url?.includes("/users/login") ||
        url?.includes("/login");

      // Any protected API returning 401 invalidates stored token session
      if (!isLoginRequest && !adminRedirectInProgress) {
        adminRedirectInProgress = true;
        console.warn(
          `[AUTH] Protected endpoint (${url}) returned 401 Unauthorized. Evicting session token.`,
        );
        localStorage.removeItem("token");
        if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
          window.location.href = "/admin/login?reason=session_expired";
        }
      }
    }
    return Promise.reject(err);
  },
);

export { api };
export default api;
