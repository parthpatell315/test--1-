import React from "react";
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
  Zap,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GA_MEASUREMENT_ID = "G-6PY1J19BZQ";
const GA_DASHBOARD_URL = `https://analytics.google.com/analytics/web/#/report-home/a0p0`;

const QUICK_LINKS = [
  {
    label: "Realtime",
    desc: "See who's on your site right now",
    icon: Activity,
    url: "https://analytics.google.com/analytics/web/#/realtime/overview",
    color: "text-green-600 bg-green-50",
  },
  {
    label: "Acquisition",
    desc: "Where your traffic comes from",
    icon: TrendingUp,
    url: "https://analytics.google.com/analytics/web/#/report/acquisition-overview",
    color: "text-blue-600 bg-blue-50",
  },
  {
    label: "Audience",
    desc: "Who visits your website",
    icon: Users,
    url: "https://analytics.google.com/analytics/web/#/report/visitors-overview",
    color: "text-purple-600 bg-purple-50",
  },
  {
    label: "Engagement",
    desc: "How users interact with your site",
    icon: MousePointerClick,
    url: "https://analytics.google.com/analytics/web/#/report/content-overview",
    color: "text-[#FF4D00] bg-[#FF4D00]/5",
  },
];

const KEY_METRICS = [
  {
    label: "Active Users",
    icon: Users,
    desc: "Total unique users visiting your website",
  },
  {
    label: "Page Views",
    icon: Eye,
    desc: "Total number of pages viewed across all sessions",
  },
  {
    label: "Avg. Session Duration",
    icon: Timer,
    desc: "Average time users spend per session",
  },
  {
    label: "Bounce Rate",
    icon: ArrowUpRight,
    desc: "Percentage of single-page visits",
  },
  {
    label: "Conversions",
    icon: Zap,
    desc: "Goal completions (inquiries, bookings)",
  },
  {
    label: "Traffic Sources",
    icon: Globe,
    desc: "Organic, social, direct, referral breakdown",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-[#FF4D00]" />
            <h1 className="text-xl font-bold text-[#0B1528] tracking-tight">
              Website Analytics
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Google Analytics 4 is connected and tracking all visitors on{" "}
            <span className="font-medium text-slate-700">youthcamping.in</span>
          </p>
        </div>

        <Button
          className="bg-[#0B1528] hover:bg-[#152238] text-white gap-2 shadow-sm"
          onClick={() => window.open(GA_DASHBOARD_URL, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          Open Google Analytics
        </Button>
      </div>

      {/* Status Card */}
      <Card className="border border-green-200 bg-green-50/50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              GA4 is Active
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Measurement ID:{" "}
              <code className="bg-green-100 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                {GA_MEASUREMENT_ID}
              </code>{" "}
              · Tracking all pages on youthcamping.in
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          Quick Access Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => window.open(link.url, "_blank")}
              className="group text-left border border-slate-200 bg-white rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${link.color}`}
                >
                  <link.icon className="h-4.5 w-4.5" />
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {link.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Section */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          Key Metrics You Can Track
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KEY_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="flex items-start gap-3 border border-slate-100 bg-slate-50/50 rounded-xl p-4"
            >
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <metric.icon className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {metric.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{metric.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded GA4 iframe — Google blocks iframe for analytics.google.com,
          so we provide a direct-link UX instead. */}
      <Card className="border border-slate-200 bg-white p-6">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-xl bg-[#FF4D00]/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-[#FF4D00]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            Full Dashboard
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            View detailed analytics, custom reports, user flows, and conversion
            funnels directly in your Google Analytics dashboard.
          </p>
          <Button
            variant="outline"
            className="gap-2 border-[#FF4D00]/30 text-[#FF4D00] hover:bg-[#FF4D00]/5"
            onClick={() => window.open(GA_DASHBOARD_URL, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Full GA4 Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
