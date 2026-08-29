"use client";

import { useState, useRef, useMemo } from "react";
import { Trip } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin, Clock, Search, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TripCard from "@/components/TripCard";

// Group trips by location
function groupByLocation(trips: Trip[]): Record<string, Trip[]> {
  const groups: Record<string, Trip[]> = {};
  trips.forEach((t) => {
    const loc = t.location || "Other";
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(t);
  });
  return groups;
}

// Destination accent images map
const DEST_BG: Record<string, string> = {
  "Himachal Pradesh": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=400&q=70",
  "Ladakh": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70",
  "Kerala": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&q=70",
  "Uttarakhand": "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=400&q=70",
  "Rajasthan": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400&q=70",
  "Kashmir": "https://images.unsplash.com/photo-1564051751008-c1ebeb8cf6bd?w=400&q=70",
  "Goa": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&q=70",
};

// ── Horizontal Row ───────────────────────────────────────────────────────
function DestinationRow({ location, trips }: { location: string; trips: Trip[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const bgImg = DEST_BG[location];

  const scroll = (dir: "l" | "r") => {
    scrollRef.current?.scrollBy({ left: dir === "l" ? -340 : 340, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-[#0B1528] font-montserrat tracking-tight leading-tight">
              {location}
            </h2>
            <span className="text-[#D4541A] font-bold text-2xl sm:text-3xl font-caveat leading-tight">
              Adventures
            </span>
            <span className="text-xs text-zinc-400 font-semibold ml-1 hidden sm:inline">
              {trips.length} {trips.length === 1 ? "trip" : "trips"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => scroll("l")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <button
            onClick={() => scroll("r")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      </div>

      {/* Cards Row */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-1 -mx-1 px-1"
      >
        {trips.map((trip, idx) => (
          <div key={trip.id} className="w-[280px] sm:w-[305px] shrink-0">
            <TripCard trip={trip} index={idx} />
          </div>
        ))}
      </div>

      {/* Thin divider */}
      <div className="w-full h-px bg-zinc-100 mt-2" />
    </div>
  );
}

// ── Category pill filter ─────────────────────────────────────────────────
const ALL_CATEGORIES = ["All", "Backpacking", "Road Trip", "Trekking", "Beach", "Wildlife", "Cultural"];

// ── Main Component ───────────────────────────────────────────────────────
interface Props { trips?: Trip[] }

export default function UpcomingTripsClient({ trips: propTrips = [] }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSearch, setShowSearch] = useState(false);

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
        t.location?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "All" ||
        t.category?.toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [sortedTrips, search, activeCategory]);

  const groups = groupByLocation(filtered);
  const locationKeys = Object.keys(groups);
  const totalTrips = filtered.length;

  return (
    <main className="bg-white min-h-screen font-montserrat">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-[#0B1528] pt-[88px] pb-0">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1800&q=80"
            alt="Adventure trips"
            fill
            unoptimized
            className="object-cover object-center opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1528]/60 via-[#0B1528]/80 to-[#0B1528]" />
        </div>

        <div className="relative z-10 max-w-[1200px] w-full mx-auto px-6 sm:px-10 pt-10 pb-12 md:pt-14 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="max-w-2xl"
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <span className="w-6 h-[2px] bg-[#D4541A] rounded-full" />
              <span className="text-[#D4541A] font-extrabold text-[10px] uppercase tracking-[0.2em] font-montserrat">
                Group Adventures · India
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-[0.95] font-montserrat mb-4">
              Find Your<br />
              <span className="text-[#D4541A]">Next Escape</span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base font-medium max-w-md leading-relaxed mb-8">
              Curated group journeys across India's most breathtaking destinations. Real people, real memories.
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { label: "Destinations", value: locationKeys.length || "8+" },
                { label: "Active Trips", value: totalTrips || "20+" },
                { label: "Travellers", value: "10K+" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-white font-black text-2xl leading-none">{s.value}</span>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom fade into white */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10" />
      </section>

      {/* ── STICKY FILTER BAR ─────────────────────────────────────────── */}
      <div className="sticky top-[72px] z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-10">
          <div className="flex items-center gap-3 py-3 overflow-x-auto no-scrollbar">

            {/* Search toggle */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                showSearch || search
                  ? "bg-[#0B1528] text-white border-[#0B1528]"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-zinc-200 shrink-0" />

            {/* Category filters */}
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-wide border transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-[#D4541A] text-white border-[#D4541A] shadow-sm"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-[#D4541A] hover:text-[#D4541A]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search input - expands below filter bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pb-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search destination or trip name..."
                    autoFocus
                    className="w-full pl-9 pr-9 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#D4541A] bg-zinc-50"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── TRIP LISTINGS ─────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-10 py-8 space-y-10">

        {/* Results count */}
        {(search || activeCategory !== "All") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <span className="text-sm text-zinc-500 font-semibold">
              {totalTrips} {totalTrips === 1 ? "trip" : "trips"} found
            </span>
            {(search || activeCategory !== "All") && (
              <button
                onClick={() => { setSearch(""); setActiveCategory("All"); }}
                className="text-xs text-[#D4541A] font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {locationKeys.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-zinc-400" />
            </div>
            <h3 className="text-lg font-black text-zinc-700 mb-1">No trips found</h3>
            <p className="text-zinc-400 text-sm mb-4">Try a different search or category</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All"); }}
              className="px-5 py-2 bg-[#D4541A] text-white text-sm font-bold rounded-full"
            >
              Show all trips
            </button>
          </motion.div>
        )}

        {/* Destination rows */}
        {locationKeys.map((loc, idx) => (
          <motion.div
            key={loc}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: idx * 0.04, duration: 0.4 }}
          >
            <DestinationRow location={loc} trips={groups[loc]} />
          </motion.div>
        ))}

        {/* Bottom CTA */}
        {locationKeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pt-4 pb-8 text-center"
          >
            <p className="text-zinc-400 text-sm font-semibold mb-4">
              Can't find what you're looking for?
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1528] text-white text-sm font-bold rounded-full hover:bg-[#D4541A] transition-colors"
            >
              Talk to our trip experts
            </Link>
          </motion.div>
        )}
      </section>
    </main>
  );
}
