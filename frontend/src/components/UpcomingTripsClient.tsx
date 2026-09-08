"use client";

import { useState, useMemo } from "react";
import { Trip } from "@/types";
import Link from "next/link";
import { Search, Sparkles, Package, Compass, SlidersHorizontal, ArrowRight, ShieldCheck } from "lucide-react";
import TripCard from "@/components/TripCard";
import { cn } from "@/lib/utils";
import { brandConfig } from "@/config/brand.config";

interface Props {
  trips?: Trip[];
}

const DESTINATIONS = [
  "All",
  "Spiti Valley",
  "Himachal",
  "Ladakh",
  "Kashmir",
  "Meghalaya",
  "Uttarakhand",
  "Kerala",
  "Gokarna",
];

export default function UpcomingTripsClient({ trips: propTrips = [] }: Props) {
  const [search, setSearch] = useState("");
  const [activeDest, setActiveDest] = useState("All");
  const [activeTab, setActiveTab] = useState<"all" | "group" | "packages">("all");

  const sortedTrips = useMemo(() => {
    const raw = propTrips || [];
    const sorted = [...raw].sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 999;
      const orderB = typeof b.order === "number" ? b.order : 999;
      return orderA - orderB;
    });
    const seen = new Set<string>();
    return sorted.filter((t) => {
      const key = (t.id || t.slug || t.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [propTrips]);

  const filtered = useMemo(() => {
    return sortedTrips.filter((t) => {
      const matchesSearch =
        !search ||
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.location?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.toLowerCase().includes(search.toLowerCase());

      const matchesDest =
        activeDest === "All" ||
        t.location?.toLowerCase().includes(activeDest.toLowerCase()) ||
        t.title?.toLowerCase().includes(activeDest.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "group" && ((t as any).type === "group" || !(t as any).type)) ||
        (activeTab === "packages" && (t as any).type === "package");

      return matchesSearch && matchesDest && matchesTab;
    });
  }, [sortedTrips, search, activeDest, activeTab]);

  return (
    <main className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HEADER & MODE SWITCHER (Avian Signature Style) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-8">
        
        {/* Avian Pill Switcher */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center bg-[#E5E7EB] p-1 rounded-full border border-gray-300/80 shadow-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-5 sm:px-7 py-2 rounded-full text-xs sm:text-sm font-bold transition-all",
                activeTab === "all"
                  ? "bg-white text-[#EC1D24] shadow-md scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              All Trips
            </button>
            <button
              onClick={() => setActiveTab("group")}
              className={cn(
                "px-5 sm:px-7 py-2 rounded-full text-xs sm:text-sm font-bold transition-all",
                activeTab === "group"
                  ? "bg-white text-[#EC1D24] shadow-md scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Group Trips
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              className={cn(
                "px-5 sm:px-7 py-2 rounded-full text-xs sm:text-sm font-bold transition-all",
                activeTab === "packages"
                  ? "bg-white text-[#EC1D24] shadow-md scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Tour Packages
            </button>
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mb-2">
            Explore Extraordinary <span className="text-[#EC1D24]">Adventures</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-normal">
            Handcrafted group expeditions and boutique travel packages with verified stays, expert leaders, and No Cost EMI.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="max-w-xl mx-auto mb-8 relative">
          <input
            type="text"
            placeholder="Search tours, mountains, beach getaways..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-5 py-3.5 bg-white rounded-full border border-gray-200/90 shadow-sm text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#EC1D24] focus:ring-2 focus:ring-red-100 outline-none transition-all"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Destination Filter Chips */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar pb-3 px-1">
          {DESTINATIONS.map((dest) => {
            const isSelected = activeDest === dest;
            return (
              <button
                key={dest}
                onClick={() => setActiveDest(dest)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                  isSelected
                    ? "bg-[#EC1D24] text-white shadow-md shadow-red-500/20 scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/80 shadow-xs"
                )}
              >
                {dest}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. TRIPS GRID (Avian CardComponent Grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider">
            Showing {filtered.length} {filtered.length === 1 ? "Experience" : "Experiences"}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Guaranteed Departures</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-gray-200/80 shadow-sm space-y-4">
            <p className="text-base font-bold text-gray-800">
              No expeditions found matching "{search || activeDest}"
            </p>
            <p className="text-xs text-gray-500">
              Try adjusting your search terms or view our all-inclusive group departures.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveDest("All");
                setActiveTab("all");
              }}
              className="px-6 py-2.5 bg-[#EC1D24] text-white rounded-full text-xs font-bold hover:bg-[#D0171E] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((trip, idx) => (
              <TripCard key={trip.id || trip.slug || idx} trip={trip} index={idx} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
