import { Trip, ItineraryDay } from "@/types";
import {
  CHROME_FETCH_TIMEOUT_MS,
  loadPublicJson,
  MARKETING_FETCH_TIMEOUT_MS,
  unwrapData,
  type PublicResult,
} from "./publicData";

export type { PublicResult };

const DEFAULT_API =
  process.env.NODE_ENV !== "production"
    ? "http://localhost:3001/api"
    : "https://api.youthcamping.in/api";
let apiURL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API;

if (!apiURL || apiURL.includes("onrender.com")) {
  apiURL = DEFAULT_API;
}

export const API_BASE_URL = apiURL.replace(/\/api$/, "") + "/api";
const IMAGE_BASE_URL = API_BASE_URL.replace("/api", "");

type PublicRequestInit = RequestInit & {
  next?: { revalidate?: number };
};

/** HTTP calls are no-store; stale-if-error lives in loadPublicJson / last-good. */
const publicFetchInit = (): PublicRequestInit => ({ cache: "no-store" });

function asRecord(json: unknown): { data?: unknown; success?: boolean } {
  return json && typeof json === "object" ? (json as any) : {};
}

function parseArray<T>(json: unknown): T[] {
  const data = asRecord(json).data;
  return Array.isArray(data) ? (data as T[]) : [];
}

function parseObject<T>(json: unknown): T | null {
  const data = asRecord(json).data;
  return data ? (data as T) : null;
}

function parsePage(json: unknown): any | null {
  const body = asRecord(json);
  if (body.success && body.data) {
    const page = body.data as any;
    return {
      ...page,
      sections: (page.sections || []).map((s: any) => ({
        ...s,
        data: s.draft || s.content || s.data || s,
      })),
    };
  }
  return null;
}

/**
 * Normalizes image URLs to be fully qualified and accessible.
 * Handles: local uploads (/uploads/...), external URLs (https://...), and empty values.
 */
export const normalizeImageUrl = (url: any): string | undefined => {
  if (!url || typeof url !== "string") return undefined;
  if (url.trim() === "") return undefined;

  if (
    url.includes("youthcamping.in/wp-content") ||
    url.includes("youthcamping.online/wp-content")
  ) {
    return undefined;
  }

  if (
    url.includes("image-1778570") ||
    url.includes("image-1778571") ||
    url.includes("177857099") ||
    url.includes("177857100")
  ) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url === "https://images.unsplash.com/photo-" || url.endsWith("photo-"))
      return undefined;
    // Old CMS files also live on BunnyCDN. Rewrite so .in retirement does not break images.
    if (/https?:\/\/(www\.)?youthcamping\.in\/system\/images\//i.test(url)) {
      return url.replace(
        /https?:\/\/(www\.)?youthcamping\.in\/system\/images\//i,
        "https://vl-prod-static.b-cdn.net/system/images/",
      );
    }
    return url;
  }

  const normalizedPath = (url || "").replace(/\\/g, "/");
  if (
    normalizedPath &&
    (normalizedPath.startsWith("/uploads/") ||
      normalizedPath.startsWith("uploads/"))
  ) {
    const fullPath = normalizedPath.startsWith("/")
      ? normalizedPath
      : `/${normalizedPath}`;
    return `${IMAGE_BASE_URL}${fullPath}`;
  }

  if (url.startsWith("/")) {
    return url;
  }

  return undefined;
};

function listFetch<T>(
  cacheKey: string,
  path: string,
  revalidateSeconds: number,
  init?: RequestInit,
): Promise<PublicResult<T[]>> {
  return loadPublicJson<T[]>({
    cacheKey,
    url: `${API_BASE_URL}${path}`,
    init: init ?? publicFetchInit(),
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds,
    parse: parseArray<T>,
    isEmpty: (data) => data.length === 0,
    emptyValue: [],
  });
}

export async function fetchTripsResult(
  init?: RequestInit,
): Promise<PublicResult<Trip[]>> {
  return listFetch<Trip>("trips", "/trips", 120, init);
}

export async function fetchTrips(init?: RequestInit): Promise<Trip[]> {
  return unwrapData(await fetchTripsResult(init), []);
}

export async function fetchPublicTripsResult(
  init?: PublicRequestInit,
): Promise<PublicResult<Trip[]>> {
  return listFetch<Trip>("trips:public-cards", "/trips/public/cards", 180, init);
}

export async function fetchPublicTrips(
  init?: PublicRequestInit,
): Promise<Trip[]> {
  return unwrapData(await fetchPublicTripsResult(init), []);
}

export async function fetchHomepageTripsResult(
  limit = 50,
): Promise<PublicResult<Trip[]>> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  return listFetch<Trip>(
    `trips:home:${safeLimit}`,
    `/trips/public/cards?limit=${safeLimit}`,
    180,
  );
}

export async function fetchHomepageTrips(limit = 50): Promise<Trip[]> {
  return unwrapData(await fetchHomepageTripsResult(limit), []);
}

export async function fetchTripBySlugResult(
  slug: string,
  init?: PublicRequestInit,
): Promise<PublicResult<Trip | null>> {
  return loadPublicJson<Trip | null>({
    cacheKey: `trip:${slug}`,
    url: `${API_BASE_URL}/trips/${encodeURIComponent(slug)}`,
    init: init ?? publicFetchInit(),
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds: 60,
    parse: parseObject<Trip>,
    isEmpty: (data) => data == null,
    emptyValue: null,
    treat404AsEmpty: true,
  });
}

export async function fetchTripBySlug(
  slug: string,
  init?: PublicRequestInit,
): Promise<Trip | null> {
  const result = await fetchTripBySlugResult(slug, init);
  return result.ok ? result.data : null;
}

export async function fetchItineraryResult(
  tripId: string,
): Promise<PublicResult<ItineraryDay[]>> {
  return listFetch<ItineraryDay>(
    `itinerary:${tripId}`,
    `/itinerary/${encodeURIComponent(tripId)}`,
    300,
  );
}

export async function fetchItinerary(tripId: string): Promise<ItineraryDay[]> {
  return unwrapData(await fetchItineraryResult(tripId), []);
}

export async function fetchReviewsResult(
  init?: RequestInit,
): Promise<PublicResult<any[]>> {
  return listFetch("reviews", "/reviews", 30, init ?? { cache: "no-store" });
}

export async function fetchReviews(init?: RequestInit): Promise<any[]> {
  return unwrapData(await fetchReviewsResult(init), []);
}

export async function fetchPublicReviewsResult(
  init?: PublicRequestInit,
): Promise<PublicResult<any[]>> {
  return listFetch("reviews:public", "/reviews", 30, init);
}

export async function fetchPublicReviews(
  init?: PublicRequestInit,
): Promise<any[]> {
  return unwrapData(await fetchPublicReviewsResult(init), []);
}

export async function fetchHomepageReviewsResult(
  limit = 8,
): Promise<PublicResult<any[]>> {
  const safeLimit = Math.max(1, Math.min(16, Math.trunc(limit)));
  return listFetch(
    `reviews:home:${safeLimit}`,
    `/reviews?limit=${safeLimit}`,
    30,
  );
}

export async function fetchHomepageReviews(limit = 8): Promise<any[]> {
  return unwrapData(await fetchHomepageReviewsResult(limit), []);
}

export async function fetchBlogsResult(
  init?: RequestInit,
): Promise<PublicResult<any[]>> {
  return listFetch("blogs", "/blogs", 30, init ?? { cache: "no-store" });
}

export async function fetchBlogs(init?: RequestInit): Promise<any[]> {
  return unwrapData(await fetchBlogsResult(init), []);
}

export async function fetchPublicBlogsResult(
  init?: PublicRequestInit,
): Promise<PublicResult<any[]>> {
  return listFetch("blogs:public-cards", "/blogs/public/cards", 30, init);
}

export async function fetchPublicBlogs(
  init?: PublicRequestInit,
): Promise<any[]> {
  return unwrapData(await fetchPublicBlogsResult(init), []);
}

export async function fetchHomepageBlogsResult(
  limit = 8,
): Promise<PublicResult<any[]>> {
  const safeLimit = Math.max(1, Math.min(16, Math.trunc(limit)));
  return listFetch(
    `blogs:home:${safeLimit}`,
    `/blogs/public/cards?limit=${safeLimit}`,
    30,
  );
}

export async function fetchHomepageBlogs(limit = 8): Promise<any[]> {
  return unwrapData(await fetchHomepageBlogsResult(limit), []);
}

export async function fetchAttractionsResult(): Promise<PublicResult<any[]>> {
  return listFetch("attractions", "/attractions", 300);
}

export async function fetchAttractions(): Promise<any[]> {
  return unwrapData(await fetchAttractionsResult(), []);
}

export async function fetchAttractionBySlugResult(
  slug: string,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: `attraction:${slug}`,
    url: `${API_BASE_URL}/attractions/slug/${encodeURIComponent(slug)}`,
    init: publicFetchInit(),
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds: 300,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
    treat404AsEmpty: true,
  });
}

export async function fetchAttractionBySlug(slug: string): Promise<any | null> {
  const result = await fetchAttractionBySlugResult(slug);
  return result.ok ? result.data : null;
}

export async function fetchBlogBySlugResult(
  slug: string,
  init?: PublicRequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: `blog:${slug}`,
    url: `${API_BASE_URL}/blogs/public/slug/${encodeURIComponent(slug)}`,
    init: init ?? publicFetchInit(),
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds: 30,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
    treat404AsEmpty: true,
  });
}

export async function fetchBlogBySlug(
  slug: string,
  init?: PublicRequestInit,
): Promise<any | null> {
  const result = await fetchBlogBySlugResult(slug, init);
  return result.ok ? result.data : null;
}

export async function fetchPageBySlugResult(
  slug: string,
  init?: PublicRequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: `page:${slug}`,
    url: `${API_BASE_URL}/page-builder/public/${encodeURIComponent(slug)}`,
    init: init ?? publicFetchInit(),
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds: 60,
    parse: parsePage,
    isEmpty: (data) =>
      data == null || !Array.isArray(data.sections) || data.sections.length === 0,
    emptyValue: null,
    treat404AsEmpty: true,
  });
}

export async function fetchPageBySlug(
  slug: string,
  init?: PublicRequestInit,
): Promise<any | null> {
  const result = await fetchPageBySlugResult(slug, init);
  return result.ok ? result.data : null;
}

export async function fetchDraftPageBySlugResult(
  slug: string,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: `page-draft:${slug}`,
    url: `${API_BASE_URL}/page-builder/${encodeURIComponent(slug)}/draft`,
    init: { cache: "no-store" },
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds: 1,
    parse: parsePage,
    isEmpty: (data) => data == null,
    emptyValue: null,
    treat404AsEmpty: true,
    skipCache: true,
  });
}

export async function fetchDraftPageBySlug(slug: string): Promise<any | null> {
  const result = await fetchDraftPageBySlugResult(slug);
  return result.ok ? result.data : null;
}

export async function fetchSettingsResult(
  init?: RequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: "settings",
    url: `${API_BASE_URL}/settings`,
    init: init ?? publicFetchInit(),
    timeoutMs: CHROME_FETCH_TIMEOUT_MS,
    revalidateSeconds: 300,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
  });
}

export async function fetchSettings(init?: RequestInit): Promise<any | null> {
  const result = await fetchSettingsResult(init);
  return result.ok ? result.data : null;
}

export async function fetchPublicSettingsResult(
  init?: PublicRequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: "settings:public",
    url: `${API_BASE_URL}/settings/public`,
    init: init ?? publicFetchInit(),
    timeoutMs: CHROME_FETCH_TIMEOUT_MS,
    revalidateSeconds: 600,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
  });
}

export async function fetchPublicSettings(
  init?: PublicRequestInit,
): Promise<any | null> {
  const result = await fetchPublicSettingsResult(init);
  return result.ok ? result.data : null;
}

export async function submitInquiry(
  data: any,
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/inquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15_000),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      return {
        success: false,
        message:
          json?.message ||
          (res.status >= 500
            ? "Our servers are temporarily unavailable. Please try again shortly."
            : "Failed to submit inquiry"),
      };
    }
    return {
      success: Boolean(json?.success),
      message: json?.message,
    };
  } catch {
    return {
      success: false,
      message:
        "Our servers are temporarily unavailable. Please try again shortly.",
    };
  }
}

export async function fetchThemeResult(
  init?: PublicRequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: "theme:public",
    url: `${API_BASE_URL}/theme/public`,
    init: init ?? publicFetchInit(),
    timeoutMs: CHROME_FETCH_TIMEOUT_MS,
    revalidateSeconds: 600,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
  });
}

export async function fetchTheme(init?: PublicRequestInit): Promise<any> {
  const result = await fetchThemeResult(init);
  return result.ok ? result.data : null;
}

export async function fetchWebsitePagesResult(
  init?: PublicRequestInit,
): Promise<PublicResult<any[]>> {
  return listFetch("website:pages", "/website/pages", 60, init);
}

export async function fetchWebsitePages(
  init?: PublicRequestInit,
): Promise<any[]> {
  return unwrapData(await fetchWebsitePagesResult(init), []);
}

export async function fetchWebsitePageBySlugResult(
  slug: string,
  init?: PublicRequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: `website-page:${slug}`,
    url: `${API_BASE_URL}/website/pages/${encodeURIComponent(slug)}`,
    init: init ?? publicFetchInit(),
    timeoutMs: MARKETING_FETCH_TIMEOUT_MS,
    revalidateSeconds: 60,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
    treat404AsEmpty: true,
  });
}

export async function fetchWebsitePageBySlug(
  slug: string,
  init?: PublicRequestInit,
): Promise<any | null> {
  const result = await fetchWebsitePageBySlugResult(slug, init);
  return result.ok ? result.data : null;
}

export async function fetchPublicFooterSettingsResult(
  init?: PublicRequestInit,
): Promise<PublicResult<any | null>> {
  return loadPublicJson({
    cacheKey: "settings:footer",
    url: `${API_BASE_URL}/settings/footer/public`,
    init: init ?? publicFetchInit(),
    timeoutMs: CHROME_FETCH_TIMEOUT_MS,
    revalidateSeconds: 600,
    parse: parseObject,
    isEmpty: (data) => data == null,
    emptyValue: null,
  });
}

export async function fetchPublicFooterSettings(
  init?: PublicRequestInit,
): Promise<any | null> {
  const result = await fetchPublicFooterSettingsResult(init);
  return result.ok ? result.data : null;
}

export async function fetchWebsiteSettingsResult(
  init?: PublicRequestInit,
): Promise<PublicResult<Record<string, any>>> {
  return loadPublicJson<Record<string, any>>({
    cacheKey: "website:settings",
    url: `${API_BASE_URL}/website/settings`,
    init: init ?? publicFetchInit(),
    timeoutMs: CHROME_FETCH_TIMEOUT_MS,
    revalidateSeconds: 600,
    parse: (json) => {
      const data = asRecord(json).data;
      return data && typeof data === "object"
        ? (data as Record<string, any>)
        : {};
    },
    isEmpty: (data) => Object.keys(data).length === 0,
    emptyValue: {},
  });
}

export async function fetchWebsiteSettings(
  init?: PublicRequestInit,
): Promise<Record<string, any>> {
  const result = await fetchWebsiteSettingsResult(init);
  return result.ok ? result.data : {};
}
