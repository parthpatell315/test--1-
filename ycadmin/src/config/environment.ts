/**
 * Application environment configuration
 */

function normalizeUrl(value: string | undefined, defaultValue: string): string {
  if (!value) return defaultValue;
  const trimmed = value.trim();
  // Remove trailing slashes
  const cleaned = trimmed.replace(/\/+$/, "");

  // Basic absolute URL check
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    throw new Error(
      `Invalid base URL configured: "${cleaned}". URL must start with http:// or https://`,
    );
  }

  return cleaned;
}

function parseTimeout(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
}

function parseMaxBytes(value: string | undefined, defaultMb: number): number {
  if (!value) return defaultMb * 1024 * 1024;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return defaultMb * 1024 * 1024;
  }
  return parsed * 1024 * 1024;
}

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

// Resolve default configuration based on environment
const defaultApiUrl = IS_DEVELOPMENT
  ? "http://localhost:3001"
  : "https://api.youthcamping.online";

const defaultFrontendUrl = IS_DEVELOPMENT
  ? "http://localhost:3000"
  : "https://youthcamping.online";

const rawApiUrl = import.meta.env.VITE_API_URL || defaultApiUrl;

const API_BASE_URL = normalizeUrl(rawApiUrl, defaultApiUrl);
const FRONTEND_URL = normalizeUrl(
  import.meta.env.VITE_FRONTEND_URL,
  defaultFrontendUrl,
);
const API_TIMEOUT_MS = parseTimeout(import.meta.env.VITE_API_TIMEOUT_MS, 30000);
const DOCUMENT_MAX_BYTES = parseMaxBytes(
  import.meta.env.VITE_DOCUMENT_MAX_MB,
  10,
);
const IMAGE_MAX_BYTES = parseMaxBytes(import.meta.env.VITE_IMAGE_MAX_MB, 100);

export const ENV = Object.freeze({
  API_BASE_URL,
  FRONTEND_URL,
  API_TIMEOUT_MS,
  DOCUMENT_MAX_BYTES,
  IMAGE_MAX_BYTES,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
});

export default ENV;
