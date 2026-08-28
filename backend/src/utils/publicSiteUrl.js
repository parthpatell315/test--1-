/**
 * Canonical public website origin for customer-facing links.
 */
function getPublicSiteBaseUrl() {
  const candidates = [
    process.env.PUBLIC_SITE_URL,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    let url = raw.trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, "");
  }

  return "https://youthcamping.in";
}

module.exports = { getPublicSiteBaseUrl };
