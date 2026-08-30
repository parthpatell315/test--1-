import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  ExternalLink,
  Activity,
  TrendingUp,
  Users,
  Globe,
  MousePointerClick,
  Timer,
  ArrowUpRight,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  MapPin,
  Flame,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  analyticsService,
  AnalyticsOverviewData,
  AnalyticsRealtimeData,
} from "@/services/analytics.service";
import { toast } from "sonner";

const GA_MEASUREMENT_ID = "G-6PY1J19BZQ";
const GA_PROPERTY_ID = "435934492";
const GA_DASHBOARD_URL = `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/intelligenthome`;

export default function AnalyticsPage() {
  const [range, setRange] = useState<string>("30d");
  const [overview, setOverview] = useState<AnalyticsOverviewData | null>(null);
  const [realtime, setRealtime] = useState<AnalyticsRealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async (selectedRange: string) => {
    try {
      setLoading(true);
      const data = await analyticsService.getOverview(selectedRange);
      setOverview(data);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
      toast.error(err.message || "Failed to load Google Analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRealtime = useCallback(async () => {
    try {
      const data = await analyticsService.getRealtime();
      setRealtime(data);
    } catch (err) {
      console.error("Failed to load realtime:", err);
    }
  }, []);

  useEffect(() => {
    fetchOverview(range);
  }, [range, fetchOverview]);

  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 20000); // 20s realtime polling
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(range), fetchRealtime()]);
    setRefreshing(false);
    toast.success("Analytics refreshed with live Google data");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Find max value in trend for simple SVG chart scaling
  const maxTrendViews = Math.max(
    ...(overview?.trend?.map((t) => t.pageviews) || [10]),
    1
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* ── TOP BAR / HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#0B1528] tracking-tight">
                Live Google Analytics
              </h1>
              <Badge
                variant="outline"
                className="border-green-300 bg-green-50 text-green-700 font-medium text-[11px] gap-1 px-2 py-0.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live GA4 Connected
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Domain: <span className="font-semibold text-slate-700">youthcamping.in</span> · Property ID:{" "}
              <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.2 rounded text-slate-700">
                {GA_PROPERTY_ID}
              </code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  range === r.id
                    ? "bg-white text-[#0B1528] shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="h-8 gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#FF4D00]" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => window.open(GA_DASHBOARD_URL, "_blank")}
            className="h-8 gap-1.5 text-xs bg-[#0B1528] hover:bg-[#152238] text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            GA4 Console
          </Button>
        </div>
      </div>

      {/* ── REALTIME & KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Realtime Live Pulse */}
        <Card className="col-span-2 sm:col-span-1 lg:col-span-1 p-4 bg-gradient-to-br from-[#0B1528] to-[#152238] text-white border-0 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Right Now
            </span>
            <Flame className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-white tabular-nums">
              {realtime?.activeUsers ?? overview?.summary?.realtimeActiveUsers ?? 0}
            </div>
            <p className="text-[11px] text-emerald-300 font-medium">active visitors on site</p>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {realtime?.activePages?.[0]?.page
              ? `Top: ${realtime.activePages[0].page}`
              : "youthcamping.in"}
          </p>
        </Card>

        {/* Total Users */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Visitors</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.activeUsers?.toLocaleString() || "—"}
            </div>
            <p className="text-[11px] text-slate-500">
              {overview?.summary?.newUsers?.toLocaleString() || "0"} new visitors
            </p>
          </div>
          <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full w-4/5" />
          </div>
        </Card>

        {/* Page Views */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Page Views</span>
            <Eye className="h-4 w-4 text-[#FF4D00]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.pageViews?.toLocaleString() || "—"}
            </div>
            <p className="text-[11px] text-slate-500">
              {overview?.summary?.sessions?.toLocaleString() || "0"} sessions
            </p>
          </div>
          <div className="h-1 w-full bg-[#FF4D00]/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF4D00] rounded-full w-3/4" />
          </div>
        </Card>

        {/* Sessions */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Sessions</span>
            <MousePointerClick className="h-4 w-4 text-purple-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.sessions?.toLocaleString() || "—"}
            </div>
            <p className="text-[11px] text-slate-500">
              {(
                (overview?.summary?.pageViews || 0) /
                Math.max(overview?.summary?.sessions || 1, 1)
              ).toFixed(1)}{" "}
              pages / session
            </p>
          </div>
          <div className="h-1 w-full bg-purple-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full w-2/3" />
          </div>
        </Card>

        {/* Avg Duration */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Avg. Duration</span>
            <Timer className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.avgDurationSec
                ? formatDuration(overview.summary.avgDurationSec)
                : "—"}
            </div>
            <p className="text-[11px] text-slate-500">time spent on site</p>
          </div>
          <div className="h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full w-3/5" />
          </div>
        </Card>

        {/* Bounce Rate */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Bounce Rate</span>
            <ArrowUpRight className="h-4 w-4 text-amber-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.bounceRatePercentage !== undefined
                ? `${overview.summary.bounceRatePercentage}%`
                : "—"}
            </div>
            <p className="text-[11px] text-slate-500">single-page visits</p>
          </div>
          <div className="h-1 w-full bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{
                width: `${Math.min(overview?.summary?.bounceRatePercentage || 25, 100)}%`,
              }}
            />
          </div>
        </Card>
      </div>

      {/* ── TRAFFIC TIMELINE CHART ── */}
      <Card className="p-5 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#0B1528] tracking-tight">
              Traffic Activity Trend
            </h2>
            <p className="text-xs text-slate-500">
              Daily page views and active visitors across selected period
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FF4D00]" />
              <span className="text-slate-600 font-medium">Page Views</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
              <span className="text-slate-600 font-medium">Visitors</span>
            </span>
          </div>
        </div>

        {/* SVG Daily Chart */}
        {overview?.trend && overview.trend.length > 0 ? (
          <div className="w-full h-48 sm:h-56 flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-100">
            {overview.trend.map((day, idx) => {
              const heightPercent = Math.max(
                Math.round((day.pageviews / maxTrendViews) * 100),
                6
              );
              const userHeightPercent = Math.max(
                Math.round((day.users / maxTrendViews) * 100),
                4
              );
              const formattedDate = day.date.length >= 10 ? day.date.slice(5) : day.date;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-[#0B1528] text-white text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap">
                      <p className="font-bold">{day.date}</p>
                      <p className="text-[#FF7A30]">Views: {day.pageviews.toLocaleString()}</p>
                      <p className="text-blue-300">Visitors: {day.users.toLocaleString()}</p>
                    </div>
                    <div className="w-2 h-2 bg-[#0B1528] rotate-45 -mt-1" />
                  </div>

                  {/* Dual Bar */}
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-1/2 max-w-[12px] bg-[#FF4D00] rounded-t-sm transition-all group-hover:bg-[#FF6B00]"
                    />
                    <div
                      style={{ height: `${userHeightPercent}%` }}
                      className="w-1/2 max-w-[12px] bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-400"
                    />
                  </div>

                  {/* X Axis Label */}
                  <span className="text-[9px] text-slate-400 mt-1 truncate w-full text-center hidden md:block">
                    {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
            Loading activity trend...
          </div>
        )}
      </Card>

      {/* ── BREAKDOWN SECTIONS (TOP PAGES, SOURCES, DEVICES, CITIES) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. TOP PAGES */}
        <Card className="lg:col-span-2 p-5 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B1528] tracking-tight">
                Top Visited Pages
              </h3>
              <p className="text-xs text-slate-500">Most viewed URLs on youthcamping.in</p>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono">
              Top 10
            </Badge>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100">
                  <th className="pb-2">Page URL</th>
                  <th className="pb-2 text-right">Views</th>
                  <th className="pb-2 text-right">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overview?.pages && overview.pages.length > 0 ? (
                  overview.pages.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 pr-2 font-mono text-slate-800 truncate max-w-[280px]">
                        <span className="font-semibold text-slate-900">{p.path}</span>
                        {p.title && p.title !== p.path && (
                          <span className="block font-sans text-[11px] text-slate-400 truncate">
                            {p.title}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[#0B1528] tabular-nums">
                        {p.views.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 tabular-nums">
                        {p.users.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      No page data recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 2. TRAFFIC SOURCES */}
        <Card className="p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1528] tracking-tight">
                  Traffic Sources
                </h3>
                <p className="text-xs text-slate-500">How travelers find your website</p>
              </div>
              <Globe className="h-4 w-4 text-slate-400" />
            </div>

            <div className="space-y-3 mt-4">
              {overview?.sources && overview.sources.length > 0 ? (
                overview.sources.map((src, idx) => {
                  const maxSessions = Math.max(
                    ...(overview.sources.map((s) => s.sessions) || [1]),
                    1
                  );
                  const pct = Math.round((src.sessions / maxSessions) * 100);

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 capitalize truncate">
                          {src.channel}
                        </span>
                        <span className="font-mono text-slate-600 font-semibold tabular-nums">
                          {src.sessions.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF4D00] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No source data yet</p>
              )}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Device Categories</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {overview?.devices?.map((dev, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {dev.category.toLowerCase().includes("mobile") && (
                    <Smartphone className="h-3.5 w-3.5 mx-auto text-slate-600 mb-1" />
                  )}
                  {dev.category.toLowerCase().includes("desktop") && (
                    <Monitor className="h-3.5 w-3.5 mx-auto text-slate-600 mb-1" />
                  )}
                  {dev.category.toLowerCase().includes("tablet") && (
                    <Tablet className="h-3.5 w-3.5 mx-auto text-slate-600 mb-1" />
                  )}
                  <p className="text-[10px] text-slate-500 capitalize">{dev.category}</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{dev.percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── TOP CITIES & QUICK ACCESS STRIP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Cities */}
        <Card className="lg:col-span-1 p-5 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B1528] tracking-tight">
                Top Visitor Cities
              </h3>
              <p className="text-xs text-slate-500">Where your travelers live</p>
            </div>
            <MapPin className="h-4 w-4 text-[#FF4D00]" />
          </div>

          <div className="space-y-2 mt-3">
            {overview?.cities && overview.cities.length > 0 ? (
              overview.cities.map((loc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 text-xs"
                >
                  <span className="text-slate-800 font-medium flex items-center gap-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D00]" />
                    {loc.city}, {loc.country}
                  </span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {loc.users.toLocaleString()} users
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No city data available</p>
            )}
          </div>
        </Card>

        {/* GA4 Quick Access shortcuts */}
        <Card className="lg:col-span-2 p-5 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1528] tracking-tight">
                  Direct Google Analytics Reports
                </h3>
                <p className="text-xs text-slate-500">
                  Open deep dive reports directly in the Google Analytics 4 console
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
              {[
                {
                  title: "Realtime View",
                  desc: "Live active users map & events",
                  url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/realtime/overview`,
                  icon: Activity,
                },
                {
                  title: "Traffic Acquisition",
                  desc: "Channels, Google ads & campaigns",
                  url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/dashboard?r=lifecycle-traffic-acquisition`,
                  icon: TrendingUp,
                },
                {
                  title: "User Demographics",
                  desc: "Age, gender, cities & devices",
                  url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/dashboard?r=user-demographics-overview`,
                  icon: Users,
                },
                {
                  title: "Pages & Screens",
                  desc: "Scroll depth & engagement",
                  url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/dashboard?r=lifecycle-engagement-pages`,
                  icon: MousePointerClick,
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => window.open(item.url, "_blank")}
                  className="group text-left border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-300 hover:shadow-sm rounded-lg p-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <item.icon className="h-4 w-4 text-[#FF4D00]" />
                    <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Last synchronized: {new Date().toLocaleTimeString()}</span>
            <span className="text-[#FF4D00] font-medium">YouthCamping OS × Google Analytics 4</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
