import React from "react";
import {
  Building2,
  Hotel,
  Bus,
  Compass,
  ShieldCheck,
  MapPin,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Star,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VendorDashboardViewProps {
  vendors: any[];
  onSelectCategory: (category: string) => void;
}

export function VendorDashboardView({
  vendors,
  onSelectCategory,
}: VendorDashboardViewProps) {
  const total = vendors.length;
  const hotels = vendors.filter((v) =>
    [
      "HOTEL",
      "RESORT",
      "HOMESTAY",
      "HOSTEL",
      "GUEST_HOUSE",
      "VILLA",
      "CAMP",
      "COTTAGE",
      "APARTMENT",
      "DORMITORY",
      "LUXURY_TENT",
    ].includes(v.type),
  );
  const transport = vendors.filter((v) => v.type === "TRANSPORT");
  const guides = vendors.filter((v) => v.type === "GUIDE");
  const preferred = vendors.filter((v) => v.isPreferred);
  const active = vendors.filter((v) => v.isActive !== false);

  const stats = [
    {
      title: "Total Partners",
      value: total,
      sub: "Across all categories",
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Accommodations & Stays",
      value: hotels.length,
      sub: "Hotels, Resorts & Camps",
      icon: Hotel,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Transport Fleet",
      value: transport.length,
      sub: "Vehicles & Drivers",
      icon: Bus,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Mountain Guides",
      value: guides.length,
      sub: "Expedition Leaders",
      icon: Compass,
      color: "text-[#FF4D00]",
      bg: "bg-[#FF4D00]/5",
    },
    {
      title: "Preferred Partners",
      value: preferred.length,
      sub: "Top Vetted Vendors",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50/80",
    },
    {
      title: "Active Status Rate",
      value:
        total > 0 ? `${Math.round((active.length / total) * 100)}%` : "100%",
      sub: `${active.length} Active Partners`,
      icon: ShieldCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  const categories = [
    {
      id: "accommodation",
      label: "Accommodation",
      count: hotels.length,
      icon: Hotel,
      desc: "Hotels, Resorts, Homestays, Hostels & Camps",
      color: "border-amber-200 hover:border-amber-400 bg-amber-50/20",
    },
    {
      id: "transport",
      label: "Transport",
      count: transport.length,
      icon: Bus,
      desc: "Bus, Tempo Traveller, SUV & Fleet Operators",
      color: "border-green-200 hover:border-green-400 bg-green-50/20",
    },
    {
      id: "activities",
      label: "Activities",
      count: vendors.filter((v) => v.type === "ACTIVITIES").length,
      icon: Compass,
      desc: "Rafting, Paragliding, Trekking Operators",
      color: "border-[#FF4D00]/30 hover:border-[#FF4D00]/60 bg-[#FF4D00]/5/20",
    },
    {
      id: "restaurants",
      label: "Restaurants",
      count: vendors.filter(
        (v) =>
          v.type === "RESTAURANT" || v.type === "FOOD" || v.type === "MEALS",
      ).length,
      icon: DollarSign,
      desc: "Cafes, Dhabas & Group Meal Outlets",
      color: "border-blue-200 hover:border-blue-400 bg-blue-50/20",
    },
    {
      id: "guides",
      label: "Guides",
      count: guides.length,
      icon: CheckCircle2,
      desc: "Mountain Guides, Tour Leaders & Experts",
      color: "border-[#FF4D00]/30 hover:border-[#FF4D00]/60 bg-[#FF4D00]/5/20",
    },
    {
      id: "other",
      label: "Other Vendors",
      count: vendors.filter((v) => v.type === "OTHER").length,
      icon: Building2,
      desc: "Porters, Equipment Rental & Support Services",
      color: "border-slate-200 hover:border-slate-400 bg-slate-50/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Card
              key={idx}
              className="p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all bg-white flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {s.title}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    s.bg,
                  )}
                >
                  <Icon className={cn("w-4 h-4", s.color)} />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {s.value}
                </span>
                <p className="text-[10px] text-slate-450 font-medium mt-0.5">
                  {s.sub}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Enterprise Categories Navigation Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#FF4D00]" />
          Vendor Category Hubs
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCategory(c.id)}
                className={cn(
                  "p-5 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[130px]",
                  c.color,
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-slate-700" />
                      <h4 className="text-sm font-extrabold text-slate-800">
                        {c.label}
                      </h4>
                    </div>
                    <span className="text-xs font-black bg-white px-2.5 py-1 rounded-md text-slate-700 border border-slate-200 shadow-3xs">
                      {c.count} Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {c.desc}
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-[#FF4D00] hover:underline">
                  Manage Directory & Rates →
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


