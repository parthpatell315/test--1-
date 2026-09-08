"use client";

import React, { useState, useMemo, useRef } from "react";
import { Trip } from "@/types";
import TripCard from "@/components/TripCard";
import { ChevronLeft, ChevronRight, Flame, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TrendingTripsProps {
  trips?: Trip[];
  title?: string;
  subtitle?: string;
}

const CATEGORIES = ["All", "Spiti", "Ladakh", "Meghalaya", "Vietnam", "Bali", "Kashmir"];

export default function TrendingTrips({
  trips = [],
  title = "Trending Experiences",
  subtitle = "Our most loved adventures curated by travel specialists",
}: TrendingTripsProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter trips based on category
  const filteredTrips = useMemo(() => {
    if (activeCategory === "All") return trips;
    const catLower = activeCategory.toLowerCase();
    return trips.filter((t) => {
      const matchText = `${t.title} ${t.location} ${t.slug}`.toLowerCase();
      return matchText.includes(catLower);
    });
  }, [trips, activeCategory]);

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = dir === "left" ? -350 : 350;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="w-full py-12 md:py-16 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Header with Title & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-[#EC1D24] uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4" />
              <span>POPULAR RIGHT NOW</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {subtitle}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-[#EC1D24] text-white shadow-sm shadow-red-500/20"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Trips Grid / Carousel */}
        {filteredTrips.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-base font-semibold">No trips found in this category.</p>
            <Link
              href="/trips"
              className="inline-block mt-3 text-sm font-bold text-[#EC1D24] hover:underline"
            >
              View all available trips →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTrips.slice(0, 8).map((trip, idx) => (
              <TripCard key={trip.id || trip.slug || idx} trip={trip} index={idx} />
            ))}
          </div>
        )}

        {/* Bottom View All Link */}
        <div className="mt-12 text-center">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white font-bold text-sm sm:text-base transition-all duration-300"
          >
            <span>Explore All 25+ Experiences</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
