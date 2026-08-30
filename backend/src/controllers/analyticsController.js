const path = require("path");
const fs = require("fs");
const { GoogleAuth } = require("google-auth-library");

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

let cachedAuthClient = null;
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

/**
 * @desc Get real-time active users and recent pages
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
 * @desc Get complete analytics overview (metrics, trends, sources, pages, devices)
 * @route GET /api/analytics/overview
 */
exports.getOverview = async (req, res) => {
  try {
    const token = await getAccessToken();
    const range = req.query.range || "30d";

    let startDate = "30daysAgo";
    let prevStartDate = "60daysAgo";
    let prevEndDate = "30daysAgo";

    if (range === "today") {
      startDate = "today";
      prevStartDate = "yesterday";
      prevEndDate = "yesterday";
    } else if (range === "7d") {
      startDate = "7daysAgo";
      prevStartDate = "14daysAgo";
      prevEndDate = "7daysAgo";
    } else if (range === "90d") {
      startDate = "90daysAgo";
      prevStartDate = "180daysAgo";
      prevEndDate = "90daysAgo";
    }

    const [mainReport, trendReport, pagesReport, sourcesReport, devicesReport, citiesReport, realtimeReport] =
      await Promise.all([
        // 1. Overall Summary
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

        // 2. Daily Trend for Chart
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

        // 3. Top Pages
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate: "today" }],
            dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
            metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: 10,
          }),
        }).then((r) => r.json()),

        // 4. Traffic Sources
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate: "today" }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 8,
          }),
        }).then((r) => r.json()),

        // 5. Device Categories
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

        // 6. Top Cities
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

        // 7. Realtime Users
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
        }).then((r) => r.json()).catch(() => ({ rows: [] })),
      ]);

    // Parse KPI summary
    const summaryRow = mainReport?.rows?.[0]?.metricValues || [];
    const activeUsers = parseInt(summaryRow[0]?.value || "0", 10);
    const pageViews = parseInt(summaryRow[1]?.value || "0", 10);
    const sessions = parseInt(summaryRow[2]?.value || "0", 10);
    const avgDurationSec = parseFloat(summaryRow[3]?.value || "0");
    const bounceRate = parseFloat(summaryRow[4]?.value || "0");
    const newUsers = parseInt(summaryRow[5]?.value || "0", 10);
    const realtimeActiveUsers = parseInt(realtimeReport?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

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

    // Format top pages
    const pages = (pagesReport?.rows || []).map((r) => ({
      path: r.dimensionValues?.[0]?.value || "/",
      title: r.dimensionValues?.[1]?.value || "Page",
      views: parseInt(r.metricValues?.[0]?.value || "0", 10),
      users: parseInt(r.metricValues?.[1]?.value || "0", 10),
    }));

    // Format traffic sources
    const sources = (sourcesReport?.rows || []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value || "Direct",
      sessions: parseInt(r.metricValues?.[0]?.value || "0", 10),
      users: parseInt(r.metricValues?.[1]?.value || "0", 10),
    }));

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

    return res.json({
      success: true,
      data: {
        propertyId: PROPERTY_ID,
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
        trend,
        pages,
        sources,
        devices,
        cities,
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
