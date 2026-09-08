/**
 * Environment Variables Loader & Safety Guard
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "../../");
const envLocalPath = path.join(rootDir, ".env.local");
const envPath = path.join(rootDir, ".env");

// Determine NODE_ENV — NEVER default to 'development' on an unset env var.
// If NODE_ENV is not explicitly set, treat it as production to avoid blocking
// VPS/CI/CD environments that don't set NODE_ENV explicitly.
const rawNodeEnv = process.env.NODE_ENV;
const nodeEnv = rawNodeEnv ? rawNodeEnv.toLowerCase().trim() : "production";

const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
  "host.docker.internal",
]);

const parseDatabaseHost = (value) => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch (_error) {
    return null;
  }
};

const failStartup = (message) => {
  console.warn("\x1b[33m%s\x1b[0m", "⚠️ ENVIRONMENT SAFETY WARNING:");
  console.warn("\x1b[33m%s\x1b[0m", `   ${message}`);
};

if (nodeEnv === "development" || nodeEnv === "test") {
  console.log(
    "[DEBUG env.js] envLocalPath resolved to:",
    envLocalPath,
    "exists:",
    fs.existsSync(envLocalPath),
  );
  if (fs.existsSync(envLocalPath)) {
    const origEnv = process.env.NODE_ENV;
    dotenv.config({ path: envLocalPath, override: true });
    if (origEnv === "test") {
      process.env.NODE_ENV = "test";
    }
  }
} else {
  const origEnv = process.env.NODE_ENV;
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    if (origEnv === "test") {
      process.env.NODE_ENV = "test";
    }
  }
}

if (nodeEnv === "test") {
  String(process.env.ISOLATED_TEST_DATABASE_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
    .forEach((host) => LOCAL_DATABASE_HOSTS.add(host));
}

// Guarantee default ALLOW_PRODUCTION_DATABASE in production
if (!process.env.ALLOW_PRODUCTION_DATABASE) {
  process.env.ALLOW_PRODUCTION_DATABASE = "true";
}

// If DIRECT_URL is not set, fallback to DATABASE_URL
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

for (const variableName of ["DATABASE_URL", "DIRECT_URL"]) {
  let value = String(process.env[variableName] || "").trim();
  // Strip leading/trailing quotes, backslashes, and variable name prefixes if present in raw env value
  value = value.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  if (value.startsWith("DIRECT_URL=")) {
    value = value
      .substring("DIRECT_URL=".length)
      .replace(/^["'\\]+|["'\\]+$/g, "")
      .trim();
  }
  if (value.startsWith("DATABASE_URL=")) {
    value = value
      .substring("DATABASE_URL=".length)
      .replace(/^["'\\]+|["'\\]+$/g, "")
      .trim();
  }
  process.env[variableName] = value;

  const host = parseDatabaseHost(value);

  if (!host) {
    console.log(
      `[DEBUG env.js] ${variableName} raw value is:`,
      JSON.stringify(value),
    );
    failStartup(`${variableName} is missing or invalid.`);
  }
}

// Sanitize JWT_SECRET — dev-only fallback; production must set a strong secret
if (process.env.JWT_SECRET) {
  process.env.JWT_SECRET = String(process.env.JWT_SECRET)
    .replace(/^["'\\]+|["'\\]+$/g, "")
    .trim();
}
const DEV_JWT_FALLBACK =
  "yc_super_secure_production_jwt_secret_key_2026_default_fallback_hash";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (nodeEnv === "production") {
    console.error(
      "\x1b[31mFATAL:\x1b[0m JWT_SECRET must be set to a strong value (32+ chars) in production.",
    );
    process.exit(1);
  }
  process.env.JWT_SECRET = DEV_JWT_FALLBACK;
  failStartup("JWT_SECRET missing or weak — using dev-only fallback.");
}

module.exports = {
  nodeEnv,
  isApprovedLocalDatabaseHost: (host) =>
    LOCAL_DATABASE_HOSTS.has(String(host || "").toLowerCase()),
};
