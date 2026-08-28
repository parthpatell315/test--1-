const cors = require("cors");

/**
 * Explicit CORS Configuration Middleware
 *
 * Allowed origins come from the ALLOWED_ORIGINS environment variable
 * (comma-separated). When not set, defaults to the production domains plus
 * localhost for development. The blanket "allow everything" fallback has been
 * removed: unknown origins are rejected in production.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://youthcamping.in",
  "https://www.youthcamping.in",
  "https://admin.youthcamping.in",
  "https://youthcamping.online",
  "https://www.youthcamping.online",
  "https://admin.youthcamping.online",
];

const DEV_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

const getAllowedOrigins = () => {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "").trim();
  const fromEnv = envOrigins
    ? envOrigins
        .split(",")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)
    : [];
  const base = Array.from(new Set([...fromEnv, ...DEFAULT_ALLOWED_ORIGINS]));
  if (process.env.NODE_ENV !== "production") {
    return Array.from(new Set([...base, ...DEV_ALLOWED_ORIGINS]));
  }
  return base;
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = getAllowedOrigins();
    const isProd = process.env.NODE_ENV === "production";
    const isLocal =
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    // Localhost only outside production
    if (!isProd && isLocal) {
      return callback(null, true);
    }
    // Staging/admin (and future .in) subdomains
    if (
      origin.endsWith(".youthcamping.online") ||
      origin.endsWith(".youthcamping.in")
    ) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  maxAge: 86400, // 24 hours preflight cache in browser
};

const setupCORS = (app) => {
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
};

module.exports = setupCORS;
module.exports.setupCORS = setupCORS;
module.exports.getAllowedOrigins = getAllowedOrigins;
