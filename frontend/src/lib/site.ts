/** Canonical public origin for the production website. */
export const PUBLIC_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL || "https://trrabb.com";
export const PUBLIC_SITE_URL = `${PUBLIC_SITE_ORIGIN}/`;

export function absoluteSiteUrl(path: string = "/"): string {
  if (!path || path === "/") return PUBLIC_SITE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_ORIGIN}${normalized}`;
}
