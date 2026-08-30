const path = require("path");
const fs = require("fs");
const { GoogleAuth } = require("google-auth-library");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || "435934492";

function getCredentials() {
  if (process.env.GA4_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error("Failed to parse GA4_SERVICE_ACCOUNT_JSON env var:", e);
    }
  }

  const credentialsPath = path.join(__dirname, "../../config/google-service-account.json");
  if (fs.existsSync(credentialsPath)) {
    try {
      return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    } catch (e) {
      console.error("Failed to read google-service-account.json:", e);
    }
  }

  return null;
}

let tokenExpiry = 0;
let cachedToken = null;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("Google Analytics service account credentials not configured.");
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  const client = await auth.getClient();
  const res = await client.getAccessToken();
  cachedToken = res.token;
  tokenExpiry = now + 3500 * 1000;
  return cachedToken;
}

// Helper to humanize URL paths
function humanizePath(urlPath, pageTitle) {
  if (!urlPath || urlPath === "/" || urlPath === "/home") return "Home Page";
  if (urlPath === "/trips" || urlPath === "/collections" || urlPath === "/collections/tours") return "Explore Trips Catalog";
  if (urlPath === "/about-us" || urlPath === "/about") return "About Us";
  if (urlPath === "/contact" || urlPath === "/contact-us") return "Contact Us";
  if (urlPath === "/blogs") return "Blogs & Travel Stories";
  if (urlPath === "/reviews") return "Traveler Reviews";
  if (urlPath === "/questions" || urlPath === "/faqs") return "FAQ & Support";
  if (urlPath === "/privacy-policy" || urlPath === "/privacy") return "Privacy Policy";
  if (urlPath === "/terms-and-conditions" || urlPath === "/terms") return "Terms & Conditions";
  if (urlPath === "/cancellation-policy") return "Cancellation Policy";
  if (urlPath.startsWith("/book/confirmation")) return "Booking Confirmation";
  if (urlPath.startsWith("/book/")) return "Trip Booking Checkout";
  if (urlPath.startsWith("/quote/")) return "Custom Quotation";

  // Trip detail paths: /trips/manali-kasol-adventure or /tours/manali-kasol-amritsar...
  if (urlPath.startsWith("/trips/") || urlPath.startsWith("/tours/")) {
    const slug = urlPath.replace(/^\/(trips|tours)\//, "").split("?")[0];
    const cleaned = slug
      .replace(/-\d+$/, "") // remove trailing numeric ids like -137856
      .replace(/-trip$/, "")
      .replace(/-road-trip$/, " Road Trip")
      .replace(/-adventure$/, " Adventure")
      .replace(/-expedition(-\d+)?$/, " Expedition")
      .replace(/-summer(-\d+)?$/, " Summer")
      .replace(/-/g, " ");

    return cleaned
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (pageTitle && pageTitle !== "YouthCamping" && !pageTitle.includes("404")) {
    return pageTitle.replace(/\s*\|\s*YouthCamping.*$/i, "").trim();
  }

  return urlPath;
}

/**
 * @desc Get real-time active users
 * @route GET /api/analytics/realtime
 */
exports.getRealtime = async (req, res) => {
  try {
    const token = await getAccessToken();

    const [activeRes, pagesRes] = await Promise.all([
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metrics: [{ name: "activeUsers" }],
        }),
      }),
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dimensions: [{ name: "unifiedScreenName" }],
          metrics: [{ name: "activeUsers" }],
          limit: 5,
        }),
      }),
    ]);

    const activeData = await activeRes.json();
    const pagesData = await pagesRes.json();

    const activeUsers = parseInt(activeData?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);
    const activePages = (pagesData?.rows || []).map((row) => ({
      page: row.dimensionValues?.[0]?.value || "/",
      activeUsers: parseInt(row.metricValues?.[0]?.value || "0", 10),
    }));

    return res.json({
      success: true,
      data: {
        activeUsers,
        activePages,
        propertyId: PROPERTY_ID,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Analytics realtime error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch realtime analytics",
    });
  }
};

/**
 * @desc Get complete analytics overview with comparison, top trips, and conversion funnel
 * @route GET /api/analytics/overview
 */
exports.getOverview = async (req, res) => {
  try {
    const token = await getAccessToken();
    const range = req.query.range || "30d";

    let startDate = "30daysAgo";
    let prevStartDate = "60daysAgo";
    let prevEndDate = "31daysAgo";
    let daysCount = 30;

    if (range === "today") {
      startDate = "today";
      prevStartDate = "yesterday";
      prevEndDate = "yesterday";
      daysCount = 1;
    } else if (range === "7d") {
      startDate = "7daysAgo";
      prevStartDate = "14daysAgo";
      prevEndDate = "8daysAgo";
      daysCount = 7;
    } else if (range === "90d") {
      startDate = "90daysAgo";
      prevStartDate = "180daysAgo";
      prevEndDate = "91daysAgo";
      daysCount = 90;
    }

    const rangeDateStart = new Date(Date.now() - daysCount * 24 * 60 * 60 * 1000);

    const [
      mainReport,
      prevReport,
      trendReport,
      pagesReport,
      sourcesReport,
      devicesReport,
      citiesReport,
      realtimeReport,
      tripsList,
      dbInquiries,
      dbBookings,
    ] = await Promise.all([
      // 1. Current Period Summary
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "sessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "newUsers" },
          ],
        }),
      }).then((r) => r.json()),

      // 2. Previous Period Summary for Comparison Deltas
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "sessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        }),
      }).then((r) => r.json()).catch(() => ({ rows: [] })),

      // 3. Daily Trend
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "sessions" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      }).then((r) => r.json()),

      // 4. Top Pages
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 15,
        }),
      }).then((r) => r.json()),

      // 5. Traffic Sources
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 8,
        }),
      }).then((r) => r.json()),

      // 6. Device Categories
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        }),
      }).then((r) => r.json()),

      // 7. Top Cities
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "city" }, { name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 8,
        }),
      }).then((r) => r.json()),

      // 8. Realtime Users
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
      }).then((r) => r.json()).catch(() => ({ rows: [] })),

      // 9. Prisma Trips
      prisma.trip.findMany({
        select: { id: true, title: true, slug: true },
      }),

      // 10. Prisma Inquiries in Range
      prisma.inquiry.findMany({
        where: { createdAt: { gte: rangeDateStart } },
        select: { id: true, tripId: true, tripTitle: true, createdAt: true },
      }),

      // 11. Prisma Bookings in Range
      prisma.booking.findMany({
        where: { createdAt: { gte: rangeDateStart } },
        select: {
          id: true,
          tripId: true,
          tripName: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
    ]);

    // Parse current summary
    const summaryRow = mainReport?.rows?.[0]?.metricValues || [];
    const activeUsers = parseInt(summaryRow[0]?.value || "0", 10);
    const pageViews = parseInt(summaryRow[1]?.value || "0", 10);
    const sessions = parseInt(summaryRow[2]?.value || "0", 10);
    const avgDurationSec = parseFloat(summaryRow[3]?.value || "0");
    const bounceRate = parseFloat(summaryRow[4]?.value || "0");
    const newUsers = parseInt(summaryRow[5]?.value || "0", 10);
    const realtimeActiveUsers = parseInt(realtimeReport?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

    // Parse previous summary for percentage calculations
    const prevRow = prevReport?.rows?.[0]?.metricValues || [];
    const prevUsers = parseInt(prevRow[0]?.value || "0", 10);
    const prevPageViews = parseInt(prevRow[1]?.value || "0", 10);
    const prevSessions = parseInt(prevRow[2]?.value || "0", 10);
    const prevDurationSec = parseFloat(prevRow[3]?.value || "0");
    const prevBounceRate = parseFloat(prevRow[4]?.value || "0");

    const calcChange = (curr, prev) => {
      if (!prev || prev === 0) return null;
      const pct = ((curr - prev) / prev) * 100;
      return Math.round(pct * 10) / 10;
    };

    const changes = {
      users: calcChange(activeUsers, prevUsers),
      pageViews: calcChange(pageViews, prevPageViews),
      sessions: calcChange(sessions, prevSessions),
      avgDuration: calcChange(avgDurationSec, prevDurationSec),
      bounceRate: calcChange(bounceRate, prevBounceRate),
    };

    // Format daily trend
    const trend = (trendReport?.rows || []).map((r) => {
      const rawDate = r.dimensionValues?.[0]?.value || "";
      const formattedDate =
        rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate;
      return {
        date: formattedDate,
        users: parseInt(r.metricValues?.[0]?.value || "0", 10),
        pageviews: parseInt(r.metricValues?.[1]?.value || "0", 10),
        sessions: parseInt(r.metricValues?.[2]?.value || "0", 10),
      };
    });

    // Format top pages with humanized titles
    const rawPages = pagesReport?.rows || [];
    let tripViewsTotal = 0;
    const pageViewsByPath = {};

    const pages = rawPages.map((r) => {
      const rawPath = r.dimensionValues?.[0]?.value || "/";
      const rawTitle = r.dimensionValues?.[1]?.value || "";
      const views = parseInt(r.metricValues?.[0]?.value || "0", 10);
      const users = parseInt(r.metricValues?.[1]?.value || "0", 10);

      pageViewsByPath[rawPath] = views;

      if (rawPath.startsWith("/trips/") || rawPath.startsWith("/tours/")) {
        tripViewsTotal += views;
      }

      return {
        path: rawPath,
        humanTitle: humanizePath(rawPath, rawTitle),
        views,
        users,
      };
    });

    // Format traffic sources (with user counts and percentages)
    const totalSourceUsers = (sourcesReport?.rows || []).reduce(
      (acc, r) => acc + parseInt(r.metricValues?.[0]?.value || "0", 10),
      0
    );
    const sources = (sourcesReport?.rows || []).map((r) => {
      const users = parseInt(r.metricValues?.[0]?.value || "0", 10);
      const sess = parseInt(r.metricValues?.[1]?.value || "0", 10);
      const percentage = totalSourceUsers > 0 ? Math.round((users / totalSourceUsers) * 100) : 0;
      return {
        channel: r.dimensionValues?.[0]?.value || "Direct",
        users,
        sessions: sess,
        percentage,
      };
    });

    // Format devices
    const totalDeviceUsers = (devicesReport?.rows || []).reduce(
      (acc, r) => acc + parseInt(r.metricValues?.[0]?.value || "0", 10),
      0
    );
    const devices = (devicesReport?.rows || []).map((r) => {
      const users = parseInt(r.metricValues?.[0]?.value || "0", 10);
      const percentage = totalDeviceUsers > 0 ? Math.round((users / totalDeviceUsers) * 100) : 0;
      return {
        category: r.dimensionValues?.[0]?.value || "desktop",
        users,
        percentage,
      };
    });

    // Format top cities
    const cities = (citiesReport?.rows || [])
      .filter((r) => r.dimensionValues?.[0]?.value && r.dimensionValues?.[0]?.value !== "(not set)")
      .map((r) => ({
        city: r.dimensionValues?.[0]?.value,
        country: r.dimensionValues?.[1]?.value,
        users: parseInt(r.metricValues?.[0]?.value || "0", 10),
      }));

    // ── TOP PERFORMING TRIPS ──
    // Match real DB Inquiries and Bookings with GA4 Views
    const topTrips = tripsList.map((trip) => {
      const tripSlugPath = `/trips/${trip.slug}`;
      const tripLegacyPath = `/tours/${trip.slug}`;
      const views = (pageViewsByPath[tripSlugPath] || 0) + (pageViewsByPath[tripLegacyPath] || 0);

      const enquiriesCount = dbInquiries.filter(
        (i) => i.tripId === trip.id || (i.tripTitle && i.tripTitle.toLowerCase() === trip.title.toLowerCase())
      ).length;

      const bookingsCount = dbBookings.filter(
        (b) => b.tripId === trip.id || (b.tripName && b.tripName.toLowerCase() === trip.title.toLowerCase())
      ).length;

      return {
        tripId: trip.id,
        title: trip.title,
        slug: trip.slug,
        views,
        enquiries: enquiriesCount,
        bookings: bookingsCount,
      };
    })
    // Sort by views + enquiries + bookings
    .sort((a, b) => b.views + b.enquiries * 10 + b.bookings * 50 - (a.views + a.enquiries * 10 + a.bookings * 50))
    .slice(0, 8);

    // ── CONVERSION FUNNEL ──
    const enquiriesTotal = dbInquiries.length;
    const bookingRequestsTotal = dbBookings.length;
    const confirmedBookings = dbBookings.filter(
      (b) =>
        ["confirmed", "completed", "approved"].includes((b.status || "").toLowerCase()) ||
        (b.paymentStatus || "").toLowerCase() === "paid"
    );
    const confirmedBookingsCount = confirmedBookings.length;
    const revenueTotal = confirmedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const funnel = {
      visitors: activeUsers || 0,
      tripViews: Math.max(tripViewsTotal, topTrips.reduce((acc, t) => acc + t.views, 0)),
      enquiries: enquiriesTotal,
      bookingRequests: bookingRequestsTotal,
      confirmedBookings: confirmedBookingsCount,
      revenue: revenueTotal,
    };

    return res.json({
      success: true,
      data: {
        propertyId: PROPERTY_ID,
        domain: "youthcamping.in",
        range,
        summary: {
          realtimeActiveUsers,
          activeUsers,
          newUsers,
          pageViews,
          sessions,
          avgDurationSec: Math.round(avgDurationSec),
          bounceRatePercentage: Math.round(bounceRate * 100 * 10) / 10,
        },
        changes,
        trend,
        pages,
        sources,
        devices,
        cities,
        topTrips,
        funnel,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics overview",
    });
  }
};
