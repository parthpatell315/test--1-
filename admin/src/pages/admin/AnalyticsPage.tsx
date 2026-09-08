import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  ExternalLink,
  Activity,
  TrendingUp,
  TrendingDown,
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
  Compass,
  ArrowRight,
  IndianRupee,
  Layers,
  FileText,
  Percent,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  analyticsService,
  AnalyticsOverviewData,
  AnalyticsRealtimeData,
} from "@/services/analytics.service";
import { toast } from "sonner";

const GA_PROPERTY_ID = "435934492";
const GA_DASHBOARD_URL = `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/intelligenthome`;

export default function AnalyticsPage() {
  const [range, setRange] = useState<string>("30d");
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);
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
    const interval = setInterval(fetchRealtime, 20000);
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(range), fetchRealtime()]);
    setRefreshing(false);
    toast.success("Analytics refreshed");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format short readable date label (e.g. "Aug 24")
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(5);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr.slice(5);
    }
  };

  // Delta Badge component
  const DeltaBadge = ({
    value,
    inverted = false,
  }: {
    value?: number | null;
    inverted?: boolean;
  }) => {
    if (!comparePrevious || value === undefined || value === null) return null;
    const isPositive = value > 0;
    const isGood = inverted ? !isPositive : isPositive;
    const isNeutral = value === 0;

    if (isNeutral) {
      return (
        <span className="text-[11px] text-slate-400 font-medium ml-1">
          0.0% vs prev
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
          isGood ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3 inline" />
        ) : (
          <TrendingDown className="h-3 w-3 inline" />
        )}
        {isPositive ? `+${value}%` : `${value}%`}
        <span className="text-[10px] text-slate-400 font-normal ml-0.5">
          vs prev
        </span>
      </span>
    );
  };

  // Max views for chart scale
  const maxTrendViews = useMemo(() => {
    if (!overview?.trend?.length) return 10;
    return Math.max(...overview.trend.map((t) => t.pageviews), 1);
  }, [overview?.trend]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1440px] mx-auto font-sans text-slate-900">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1528]">
              Analytics
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium text-xs gap-1.5 px-2.5 py-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Google Analytics 4 • Connected
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking website growth & conversions for{" "}
            <span className="font-semibold text-slate-800">
              {overview?.domain || "youthcamping.in"}
            </span>
          </p>
        </div>

        {/* Controls: Date Range, Compare Toggle, Refresh, GA4 Link */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Compare toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span>Compare prev period</span>
            <Switch
              checked={comparePrevious}
              onCheckedChange={setComparePrevious}
              className="data-[state=checked]:bg-[#0B1528] scale-75"
            />
          </div>

          {/* Range tabs */}
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
                    ? "bg-white text-[#0B1528] shadow-sm font-bold"
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
            className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshing ? "animate-spin text-[#FF4D00]" : ""
              }`}
            />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => window.open(GA_DASHBOARD_URL, "_blank")}
            className="h-8 gap-1.5 text-xs bg-[#0B1528] hover:bg-[#152238] text-white shadow-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open GA4
          </Button>
        </div>
      </div>

      {/* ── 2. KPI SECTION (CLEAN & NON-HEAVY) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Live Visitors Pulse */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#0B1528] to-[#152238] text-white flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Visitors
            </span>
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-white tabular-nums">
              {realtime?.activeUsers ??
                overview?.summary?.realtimeActiveUsers ??
                0}
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">
              on youthcamping.in
            </p>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {realtime?.activePages?.[0]?.page
              ? `Viewing ${realtime.activePages[0].page}`
              : "Active now"}
          </p>
        </div>

        {/* Visitors */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Visitors</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.activeUsers?.toLocaleString() || "—"}
            </div>
            <DeltaBadge value={overview?.changes?.users} />
          </div>
          <p className="text-[11px] text-slate-500">
            {overview?.summary?.newUsers?.toLocaleString() || "0"} new travelers
          </p>
        </div>

        {/* Sessions */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Sessions</span>
            <MousePointerClick className="h-4 w-4 text-purple-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.sessions?.toLocaleString() || "—"}
            </div>
            <DeltaBadge value={overview?.changes?.sessions} />
          </div>
          <p className="text-[11px] text-slate-500">
            {(
              (overview?.summary?.pageViews || 0) /
              Math.max(overview?.summary?.sessions || 1, 1)
            ).toFixed(1)}{" "}
            pages / visit
          </p>
        </div>

        {/* Page Views */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Page Views</span>
            <Eye className="h-4 w-4 text-[#FF4D00]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.pageViews?.toLocaleString() || "—"}
            </div>
            <DeltaBadge value={overview?.changes?.pageViews} />
          </div>
          <p className="text-[11px] text-slate-500">total content impressions</p>
        </div>

        {/* Avg Engagement Time */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Avg Engagement Time</span>
            <Timer className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-[#0B1528] tabular-nums">
              {overview?.summary?.avgDurationSec
                ? formatDuration(overview.summary.avgDurationSec)
                : "—"}
            </div>
            <DeltaBadge value={overview?.changes?.avgDuration} />
          </div>
          <p className="text-[11px] text-slate-500">avg time per active session</p>
        </div>

        {/* Bounce Rate */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
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
            <DeltaBadge
              value={overview?.changes?.bounceRate}
              inverted={true}
            />
          </div>
          <p className="text-[11px] text-slate-500">single-page session rate</p>
        </div>
      </div>

      {/* ── 3. TRAFFIC ACTIVITY CHART ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0B1528] tracking-tight">
              Traffic Activity
            </h2>
            <p className="text-xs text-slate-500">
              Daily trend of page views and unique visitors
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FF4D00]" />
              <span className="text-slate-700 font-medium">Page Views</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
              <span className="text-slate-700 font-medium">Visitors</span>
            </span>
          </div>
        </div>

        {overview?.trend && overview.trend.length > 0 ? (
          <div className="w-full h-52 sm:h-60 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 border-b border-slate-100">
            {overview.trend.map((day, idx) => {
              const heightPercent = Math.max(
                Math.round((day.pageviews / maxTrendViews) * 100),
                6
              );
              const userHeightPercent = Math.max(
                Math.round((day.users / maxTrendViews) * 100),
                4
              );
              const formattedDate = formatShortDate(day.date);

              // Show label on every nth bar for clean spacing
              const showLabel =
                overview.trend.length <= 10 ||
                idx === 0 ||
                idx === overview.trend.length - 1 ||
                idx % Math.ceil(overview.trend.length / 8) === 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-[#0B1528] text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                      <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                        {formattedDate} ({day.date})
                      </p>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-[#FF7A30] font-semibold">
                          Views: {day.pageviews.toLocaleString()}
                        </span>
                        <span className="text-blue-300 font-semibold">
                          Visitors: {day.users.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-[#0B1528] rotate-45 -mt-1" />
                  </div>

                  {/* Dual Bar */}
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-1/2 max-w-[14px] bg-[#FF4D00] rounded-t-sm transition-all group-hover:bg-[#FF6B00]"
                    />
                    <div
                      style={{ height: `${userHeightPercent}%` }}
                      className="w-1/2 max-w-[14px] bg-blue-600 rounded-t-sm transition-all group-hover:bg-blue-500"
                    />
                  </div>

                  {/* X Axis Label */}
                  <span
                    className={`text-[10px] text-slate-500 mt-1.5 truncate w-full text-center ${
                      showLabel ? "block" : "hidden sm:block opacity-0"
                    }`}
                  >
                    {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
            Loading activity trend...
          </div>
        )}
      </div>

      {/* ── 4. CONVERSION FUNNEL (FOUNDER / BUSINESS VIEW) ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base font-bold text-[#0B1528] tracking-tight">
              Conversion Funnel
            </h2>
            <p className="text-xs text-slate-500">
              End-to-end journey from website visitor to confirmed tour booking
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[11px] font-mono text-slate-700 self-start sm:self-auto"
          >
            Real ERP & GA4 Data
          </Badge>
        </div>

        {/* Funnel Pipeline Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {[
            {
              stage: "1. Visitors",
              count: overview?.funnel?.visitors?.toLocaleString() ?? "—",
              sub: "Total unique traffic",
              color: "border-blue-200 bg-blue-50/50 text-blue-700",
              badgeColor: "bg-blue-100 text-blue-800",
            },
            {
              stage: "2. Trip Views",
              count: overview?.funnel?.tripViews?.toLocaleString() ?? "—",
              sub: "Explored itineraries",
              color: "border-indigo-200 bg-indigo-50/50 text-indigo-700",
              badgeColor: "bg-indigo-100 text-indigo-800",
            },
            {
              stage: "3. Enquiries",
              count: overview?.funnel?.enquiries?.toLocaleString() ?? "0",
              sub: "CRM leads created",
              color: "border-amber-200 bg-amber-50/50 text-amber-700",
              badgeColor: "bg-amber-100 text-amber-800",
            },
            {
              stage: "4. Booking Requests",
              count:
                overview?.funnel?.bookingRequests?.toLocaleString() ?? "0",
              sub: "Forms initiated",
              color: "border-orange-200 bg-orange-50/50 text-orange-700",
              badgeColor: "bg-orange-100 text-orange-800",
            },
            {
              stage: "5. Confirmed Bookings",
              count:
                overview?.funnel?.confirmedBookings?.toLocaleString() ?? "0",
              sub: "Paid & verified seats",
              color: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
              badgeColor: "bg-emerald-100 text-emerald-800",
            },
            {
              stage: "6. Revenue Generated",
              count: overview?.funnel?.revenue
                ? formatCurrency(overview.funnel.revenue)
                : "₹0",
              sub: "Confirmed booking volume",
              color:
                "border-[#0B1528]/20 bg-[#0B1528] text-white shadow-sm font-semibold",
              badgeColor: "bg-[#FF4D00] text-white",
              isRevenue: true,
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between relative ${step.color}`}
            >
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${step.badgeColor}`}
                >
                  {step.stage}
                </span>
                <div
                  className={`text-xl font-bold mt-2.5 tabular-nums ${
                    step.isRevenue ? "text-white" : "text-slate-900"
                  }`}
                >
                  {step.count}
                </div>
              </div>
              <p
                className={`text-[10px] mt-1 ${
                  step.isRevenue ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {step.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. TOP PERFORMING TRIPS & TOP VISITED PAGES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Performing Trips */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0B1528] tracking-tight">
                Top Performing Trips
              </h3>
              <p className="text-xs text-slate-500">
                Combined page views, CRM enquiries, and bookings per package
              </p>
            </div>
            <Compass className="h-4 w-4 text-[#FF4D00]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100">
                  <th className="pb-2.5">Trip Package</th>
                  <th className="pb-2.5 text-right">Views</th>
                  <th className="pb-2.5 text-right">Enquiries</th>
                  <th className="pb-2.5 text-right">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview?.topTrips && overview.topTrips.length > 0 ? (
                  overview.topTrips.map((trip, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 pr-2 font-medium text-slate-900 truncate max-w-[200px]">
                        <span className="font-semibold">{trip.title}</span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">
                        {trip.views ? trip.views.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 text-right font-medium text-amber-700 tabular-nums">
                        {trip.enquiries ? trip.enquiries : "0"}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                        {trip.bookings ? trip.bookings : "0"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No trip performance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Visited Pages (Human-friendly) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0B1528] tracking-tight">
                Top Visited Pages
              </h3>
              <p className="text-xs text-slate-500">
                Most engaged content on youthcamping.in
              </p>
            </div>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100">
                  <th className="pb-2.5">Page</th>
                  <th className="pb-2.5 text-right">Views</th>
                  <th className="pb-2.5 text-right">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview?.pages && overview.pages.length > 0 ? (
                  overview.pages.slice(0, 8).map((p, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 pr-2 truncate max-w-[220px]">
                        <span className="font-semibold text-slate-900 block">
                          {p.humanTitle || p.path}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 truncate block">
                          {p.path}
                        </span>
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
                      No page data recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 6. TRAFFIC SOURCES & AUDIENCE (DEVICES + CITIES) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Traffic Sources */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0B1528] tracking-tight">
                Traffic Sources
              </h3>
              <p className="text-xs text-slate-500">
                Acquisition channels and traveler share
              </p>
            </div>
            <Globe className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {overview?.sources && overview.sources.length > 0 ? (
              overview.sources.map((src, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 capitalize truncate">
                      {src.channel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {src.users.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({src.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF4D00] rounded-full"
                      style={{ width: `${Math.min(src.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No source data recorded.
              </p>
            )}
          </div>
        </div>

        {/* Compact Device Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0B1528] tracking-tight">
              Device Categories
            </h3>
            <p className="text-xs text-slate-500">
              Visitor distribution across screen formats
            </p>
          </div>

          {/* Compact Horizontal Device Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {overview?.devices && overview.devices.length > 0 ? (
              overview.devices.map((dev, idx) => {
                const cat = dev.category.toLowerCase();
                const isMobile = cat.includes("mobile");
                const isDesktop = cat.includes("desktop");

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col items-center justify-center text-center space-y-1"
                  >
                    {isMobile && (
                      <Smartphone className="h-4 w-4 text-[#FF4D00]" />
                    )}
                    {isDesktop && (
                      <Monitor className="h-4 w-4 text-blue-600" />
                    )}
                    {!isMobile && !isDesktop && (
                      <Tablet className="h-4 w-4 text-purple-600" />
                    )}
                    <span className="text-[11px] font-semibold text-slate-600 capitalize">
                      {dev.category}
                    </span>
                    <span className="text-lg font-black text-slate-900 tabular-nums">
                      {dev.percentage}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {dev.users.toLocaleString()} users
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center text-xs text-slate-400 py-6">
                No device data available.
              </div>
            )}
          </div>

          {/* Compact visual bar */}
          <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-100 mt-3">
            {overview?.devices?.map((dev, idx) => (
              <div
                key={idx}
                style={{ width: `${dev.percentage}%` }}
                className={`${
                  idx === 0
                    ? "bg-[#FF4D00]"
                    : idx === 1
                    ? "bg-blue-600"
                    : "bg-purple-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Top Visitor Cities */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0B1528] tracking-tight">
                Top Visitor Cities
              </h3>
              <p className="text-xs text-slate-500">
                Key geographic markets in India & abroad
              </p>
            </div>
            <MapPin className="h-4 w-4 text-[#FF4D00]" />
          </div>

          <div className="space-y-2">
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
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {loc.users.toLocaleString()}{" "}
                    <span className="text-slate-400 font-normal text-[10px]">
                      visitors
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No city data recorded.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 7. GA4 SHORTCUTS (COMPACT STRIP NEAR BOTTOM) ── */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/60 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Google Analytics 4 Shortcuts
          </span>
          <span className="text-[11px] text-slate-400">
            Direct deep links to Google Analytics reports
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              title: "Realtime View",
              desc: "Live users & active events",
              url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/realtime/overview`,
              icon: Activity,
            },
            {
              title: "Traffic Acquisition",
              desc: "Channels & campaigns",
              url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/dashboard?r=lifecycle-traffic-acquisition`,
              icon: TrendingUp,
            },
            {
              title: "User Demographics",
              desc: "Audience & geo breakdown",
              url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/dashboard?r=user-demographics-overview`,
              icon: Users,
            },
            {
              title: "Pages & Screens",
              desc: "Engagement & content",
              url: `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID}/reports/dashboard?r=lifecycle-engagement-pages`,
              icon: MousePointerClick,
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => window.open(item.url, "_blank")}
              className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200/70 hover:border-[#FF4D00]/40 hover:shadow-xs transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 truncate">
                <item.icon className="h-3.5 w-3.5 text-[#FF4D00] shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.desc}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-slate-600 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
