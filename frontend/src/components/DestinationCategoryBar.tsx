"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Mountain, 
  Palmtree, 
  Building2, 
  Waves, 
  Snowflake, 
  Compass, 
  Castle, 
  CloudRain, 
  Trees, 
  Sun,
  Flame,
  Globe2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DestinationPill {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  tag?: string;
}

export const DESTINATION_PILLS: DestinationPill[] = [
  { id: "all", name: "All Trips", slug: "", icon: <Globe2 className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "spiti", name: "Spiti Valley", slug: "spiti-valley", icon: <Mountain className="w-5 h-5 text-[#EC1D24]" />, tag: "Popular" },
  { id: "ladakh", name: "Ladakh", slug: "ladakh", icon: <Mountain className="w-5 h-5 text-[#EC1D24]" />, tag: "Trending" },
  { id: "meghalaya", name: "Meghalaya", slug: "meghalaya", icon: <CloudRain className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "vietnam", name: "Vietnam", slug: "vietnam", icon: <Compass className="w-5 h-5 text-[#EC1D24]" />, tag: "International" },
  { id: "bali", name: "Bali", slug: "bali", icon: <Palmtree className="w-5 h-5 text-[#EC1D24]" />, tag: "International" },
  { id: "thailand", name: "Thailand", slug: "thailand", icon: <Sun className="w-5 h-5 text-[#EC1D24]" />, tag: "International" },
  { id: "kashmir", name: "Kashmir", slug: "kashmir", icon: <Snowflake className="w-5 h-5 text-[#EC1D24]" />, tag: "Winter Special" },
  { id: "manali", name: "Manali", slug: "manali", icon: <Mountain className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "goa", name: "Goa", slug: "goa", icon: <Waves className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "maldives", name: "Maldives", slug: "maldives", icon: <Palmtree className="w-5 h-5 text-[#EC1D24]" />, tag: "Luxury" },
  { id: "dubai", name: "Dubai", slug: "dubai", icon: <Building2 className="w-5 h-5 text-[#EC1D24]" />, tag: "International" },
  { id: "kerala", name: "Kerala", slug: "kerala", icon: <Palmtree className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "rajasthan", name: "Rajasthan", slug: "rajasthan", icon: <Castle className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "uttarakhand", name: "Uttarakhand", slug: "uttarakhand", icon: <Trees className="w-5 h-5 text-[#EC1D24]" /> },
  { id: "malaysia", name: "Malaysia", slug: "malaysia", icon: <Compass className="w-5 h-5 text-[#EC1D24]" /> },
];

interface DestinationCategoryBarProps {
  activeDestination?: string;
  onSelectDestination?: (slug: string) => void;
}

export default function DestinationCategoryBar({
  activeDestination,
  onSelectDestination,
}: DestinationCategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const currentParam = searchParams.get("destination") || "";
  const currentActive = activeDestination ?? currentParam;

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className="w-full bg-white border-b border-gray-200/80 sticky top-[72px] md:top-[76px] z-30 shadow-xs">
      <div className="max-w-[1440px] mx-auto relative px-4 sm:px-6">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:text-red-600 hover:scale-105 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Pills Row */}
        <div
          ref={scrollRef}
          className="flex items-center gap-6 md:gap-10 overflow-x-auto scrollbar-none py-3 px-2 transition-all scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {DESTINATION_PILLS.map((pill) => {
            const isActive = currentActive === pill.slug || (!currentActive && pill.slug === "");
            return (
              <button
                key={pill.id}
                onClick={() => {
                  if (onSelectDestination) {
                    onSelectDestination(pill.slug);
                  } else {
                    const url = pill.slug ? `/trips?destination=${pill.slug}` : "/trips";
                    window.location.href = url;
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 shrink-0 py-1 transition-all group relative cursor-pointer outline-none",
                  isActive ? "text-[#EC1D24]" : "text-gray-600 hover:text-gray-900"
                )}
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200",
                    isActive
                      ? "bg-red-50 text-[#EC1D24] shadow-xs scale-105"
                      : "bg-gray-100/80 text-gray-500 group-hover:bg-red-50/60 group-hover:text-[#EC1D24] group-hover:scale-105"
                  )}
                >
                  {pill.icon}
                </div>
                <span
                  className={cn(
                    "text-xs md:text-[13px] font-semibold tracking-tight whitespace-nowrap",
                    isActive ? "font-bold text-[#EC1D24]" : "text-gray-700 group-hover:text-[#EC1D24]"
                  )}
                >
                  {pill.name}
                </span>

                {/* Active Underline Pill Indicator */}
                {isActive && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-[#EC1D24] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:text-red-600 hover:scale-105 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
