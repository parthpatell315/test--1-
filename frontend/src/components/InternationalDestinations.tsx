"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Globe2, ArrowRight } from "lucide-react";

export interface DestinationItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  tag: string;
  tripCount?: string;
  startingPrice?: string;
}

const INTERNATIONAL_DESTINATIONS: DestinationItem[] = [
  {
    id: "bali",
    name: "Bali",
    slug: "bali",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    tag: "Tropical Paradise",
    tripCount: "4 Curated Trips",
    startingPrice: "₹44,999",
  },
  {
    id: "vietnam",
    name: "Vietnam",
    slug: "vietnam",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80",
    tag: "Culture & Nature",
    tripCount: "5 Curated Trips",
    startingPrice: "₹38,999",
  },
  {
    id: "dubai",
    name: "Dubai",
    slug: "dubai",
    image: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&q=80",
    tag: "Skyline & Dunes",
    tripCount: "3 Curated Trips",
    startingPrice: "₹49,999",
  },
  {
    id: "thailand",
    name: "Thailand",
    slug: "thailand",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80",
    tag: "Island Escapes",
    tripCount: "6 Curated Trips",
    startingPrice: "₹32,999",
  },
  {
    id: "maldives",
    name: "Maldives",
    slug: "maldives",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80",
    tag: "Luxury Atolls",
    tripCount: "3 Curated Trips",
    startingPrice: "₹65,999",
  },
  {
    id: "singapore",
    name: "Singapore",
    slug: "singapore",
    image: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&q=80",
    tag: "Urban Marvel",
    tripCount: "4 Curated Trips",
    startingPrice: "₹42,999",
  },
  {
    id: "malaysia",
    name: "Malaysia",
    slug: "malaysia",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
    tag: "Rainforests & Towers",
    tripCount: "3 Curated Trips",
    startingPrice: "₹35,999",
  },
  {
    id: "kazakhstan",
    name: "Kazakhstan",
    slug: "kazakhstan",
    image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80",
    tag: "Alpine Landscapes",
    tripCount: "2 Curated Trips",
    startingPrice: "₹48,999",
  },
  {
    id: "georgia",
    name: "Georgia",
    slug: "georgia",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80",
    tag: "Caucasus Mountains",
    tripCount: "2 Curated Trips",
    startingPrice: "₹52,999",
  },
];

export default function InternationalDestinations() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
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

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = dir === "left" ? -380 : 380;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="w-full py-12 md:py-16 bg-[#F5F6F8]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#EC1D24] uppercase tracking-wider mb-1">
              <Globe2 className="w-4 h-4" />
              <span>Worldwide Expeditions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
              International Destinations
            </h2>
          </div>

          {/* Desktop Arrow Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous"
              className={`w-10 h-10 rounded-full border border-gray-200 bg-white shadow-xs flex items-center justify-center transition-all ${
                canScrollLeft
                  ? "text-gray-800 hover:text-[#EC1D24] hover:scale-105 active:scale-95 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Next"
              className={`w-10 h-10 rounded-full border border-gray-200 bg-white shadow-xs flex items-center justify-center transition-all ${
                canScrollRight
                  ? "text-gray-800 hover:text-[#EC1D24] hover:scale-105 active:scale-95 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cards Row */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-5 overflow-x-auto scrollbar-none pb-4 pt-1 px-1 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {INTERNATIONAL_DESTINATIONS.map((dest) => (
            <Link
              key={dest.id}
              href={`/trips?destination=${dest.slug}`}
              className="group shrink-0 w-[260px] sm:w-[280px] md:w-[310px] rounded-3xl overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col border border-gray-100/90"
            >
              {/* Image Box */}
              <div className="relative h-[320px] w-full overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Dark Gradient Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-xs text-[#1A1A1A] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  {dest.tag}
                </div>

                {/* Bottom Content on Image */}
                <div className="absolute bottom-4 left-4 right-4 z-10 text-white">
                  <span className="text-xs text-gray-300 font-medium block">
                    {dest.tripCount}
                  </span>
                  <h3 className="text-2xl font-black text-white group-hover:text-red-400 transition-colors">
                    {dest.name}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                    <span className="text-xs text-gray-200">
                      Starts from <strong className="text-white text-sm font-bold">{dest.startingPrice}</strong>
                    </span>
                    <span className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-[#EC1D24] text-white flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
