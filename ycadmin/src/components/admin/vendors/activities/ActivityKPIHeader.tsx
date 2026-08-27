import React from "react";
import {
  Activity,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Users,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { canViewProfit } from "@/config/permissions.config";

interface ActivityKPIProps {
  stats?: {
    todayActivities: number;
    pendingVendorConfirmations: number;
    passengersBooked: number;
    totalRevenue: number;
    totalVendorCost: number;
    grossProfit: number;
  };
}

export default function ActivityKPIHeader({ stats }: ActivityKPIProps) {
  const { admin } = useAuthStore();
  const canSeeProfit = canViewProfit(admin);

  const data = stats || {
    todayActivities: 0,
    pendingVendorConfirmations: 0,
    passengersBooked: 0,
    totalRevenue: 0,
    totalVendorCost: 0,
    grossProfit: 0,
  };

  const margin =
    data.totalRevenue > 0
      ? Math.round((data.grossProfit / data.totalRevenue) * 100)
      : 0;

  const kpis = [
    {
      label: "Total Activities",
      value: data.todayActivities.toString(),
      subtext: "In departure itinerary",
      icon: Activity,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
    },
    {
      label: "Revenue",
      value: `₹${data.totalRevenue.toLocaleString("en-IN")}`,
      subtext: canSeeProfit
        ? `Cost ₹${data.totalVendorCost.toLocaleString("en-IN")}`
        : "Activity booking revenue",
      icon: DollarSign,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
    },
    ...(canSeeProfit
      ? [
          {
            label: "Profit",
            value: `₹${data.grossProfit.toLocaleString("en-IN")}`,
            subtext: `${margin}% net margin`,
            icon: TrendingUp,
            color: "text-green-600 bg-green-50 border-green-200",
            iconColor: "text-green-600",
          },
        ]
      : []),
    {
      label: "Pending",
      value: data.pendingVendorConfirmations.toString(),
      subtext: "Vendor confirmations due",
      icon: AlertCircle,
      color: "text-red-600 bg-red-50 border-red-200",
      iconColor: "text-red-600",
    },
    {
      label: "Passengers Booked",
      value: data.passengersBooked.toString(),
      subtext: "Total activity seat-slots",
      icon: Users,
      color: "text-[#FF4D00] bg-[#FF4D00]/5 border-[#FF4D00]/30",
      iconColor: "text-[#FF4D00]",
    },
    {
      label: "Vendor Cost",
      value: `₹${data.totalVendorCost.toLocaleString("en-IN")}`,
      subtext: "Direct vendor liabilities",
      icon: CreditCard,
      color: "text-slate-700 bg-slate-50 border-slate-200",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 gap-3 mb-4",
        canSeeProfit ? "lg:grid-cols-6" : "lg:grid-cols-5",
      )}
    >
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className={cn("p-1.5 rounded-lg border", kpi.color)}>
                <Icon className={cn("w-4 h-4", kpi.iconColor)} />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {kpi.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{kpi.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
