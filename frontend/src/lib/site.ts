/** Canonical public origin for the production website. */
export const PUBLIC_SITE_ORIGIN = "https://youthcamping.in";
export const PUBLIC_SITE_URL = `${PUBLIC_SITE_ORIGIN}/`;

export function absoluteSiteUrl(path: string = "/"): string {
  if (!path || path === "/") return PUBLIC_SITE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_ORIGIN}${normalized}`;
}
