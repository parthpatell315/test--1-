"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeImageUrl } from "@/lib/api";
import { useWheelPassThrough } from "@/lib/useWheelPassThrough";
import { cn } from "@/lib/utils";

interface RecentPhoto {
  id: string;
  url: string;
  caption: string;
  location: string;
}

interface RecentPhotosSectionProps {
  photos?: RecentPhoto[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_RECENT_PHOTOS: RecentPhoto[] = [
  {
    id: "rp-1",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    caption: "Sunset at Gokarna Cliff",
    location: "Gokarna, Karnataka",
  },
  {
    id: "rp-2",
    url: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80",
    caption: "High Mountain Pass Trek",
    location: "Spiti Valley, Himachal",
  },
  {
    id: "rp-3",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    caption: "Summit Sunrise at Kedarkantha",
    location: "Uttarakhand",
  },
  {
    id: "rp-4",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    caption: "Starlit Camp Under the Milky Way",
    location: "Pangong Tso, Ladakh",
  },
  {
    id: "rp-5",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    caption: "Crystal Waterfall Expedition",
    location: "Cherrapunji, Meghalaya",
  },
  {
    id: "rp-6",
    url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
    caption: "Misty Backwaters Canoe Cruise",
    location: "Alleppey, Kerala",
  },
  {
    id: "rp-7",
    url: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=800&q=80",
    caption: "Alpine Meadow Campsite",
    location: "Kasol & Kheerganga",
  },
  {
    id: "rp-8",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    caption: "Emerald Valley Vista",
    location: "Manali, Himachal",
  },
];

export default function RecentPhotosSection({
  photos = [],
  title = "Recent Photos",
  subtitle = "From Our Trips",
}: RecentPhotosSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useWheelPassThrough(scrollRef);
  const animationFrameRef = useRef<number | null>(null);

  const rawPhotos = photos && Array.isArray(photos) ? photos : [];

  const displayPhotos = rawPhotos
    .map((p: any, idx: number) => ({
      id: p.id || `photo-${idx}`,
      url: normalizeImageUrl(p.url || p.image || p.src || "") ?? "",
      caption: p.caption || p.title || "",
      location: p.location || "",
    }))
    .filter((p): p is RecentPhoto => Boolean(p.url));

  const basePhotos = displayPhotos.length > 0 ? displayPhotos : DEFAULT_RECENT_PHOTOS;

  const marqueePhotos = useMemo(
    () => [...basePhotos, ...basePhotos, ...basePhotos, ...basePhotos],
    [basePhotos],
  );

  // No JS scroll loop needed — powered 100% by GPU compositor CSS marquee

  const handlePrevModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) return;
    setSelectedIndex(
      (selectedIndex - 1 + basePhotos.length) % basePhotos.length,
    );
  };

  const handleNextModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % basePhotos.length);
  };

  if (basePhotos.length === 0) return null;

  return (
    <section
      className="py-4 sm:py-5 font-sans overflow-hidden bg-[#E2E7ED]"
      style={{ backgroundColor: "#E2E7ED" }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12">
        {/* HEADER ROW - FITS TITLE ON ONE LINE */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 flex-nowrap">
          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden whitespace-nowrap">
            <h2 className="text-[#1B2A4A] font-sans font-black text-2xl sm:text-3xl md:text-4xl lg:text-[40px] tracking-tight capitalize leading-tight">
              {title.toLowerCase()}
            </h2>
            <span className="font-caveat font-bold text-[#D4541A] text-[26px] sm:text-[34px] md:text-[40px] lg:text-[46px] leading-none shrink-0 capitalize pr-2 sm:pr-3">
              {subtitle ? subtitle.toLowerCase() : "From our trips"}
            </span>
          </div>

          <Link
            href="/trips"
            prefetch={false}
            className="group shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-[15px] font-bold text-[#0B1528] hover:text-[#D4541A] transition-colors whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4541A] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* AUTOMATIC SMOOTH GPU-ACCELERATED PHOTO MARQUEE */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-full max-w-full overflow-hidden py-2.5 select-none"
        >
          <div
            className={cn(
              "flex gap-3 sm:gap-4 w-max",
              !isHovered && "animate-marquee-smooth",
            )}
            style={{
              animationPlayState: isHovered ? "paused" : "running",
              willChange: "transform",
            }}
          >
            {marqueePhotos.map((photo, idx) => {
              const actualIndex = idx % basePhotos.length;
              return (
                <div
                  key={`${photo.id}-${idx}`}
                  onClick={() => setSelectedIndex(actualIndex)}
                  className="group relative shrink-0 flex-none w-[130px] sm:w-[155px] md:w-[175px] aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-100 shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer isolate"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Trrabb photo"}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_RECENT_PHOTOS[idx % DEFAULT_RECENT_PHOTOS.length].url;
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM HASHTAG FEATURE BAR - FITS ON ONE SINGLE LINE */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-4 text-[11px] sm:text-[13px] md:text-sm text-zinc-600 font-sans whitespace-nowrap overflow-hidden">
          <Camera className="w-4 h-4 text-[#D4541A] shrink-0" />
          <span className="truncate">
            Tag us{" "}
            <strong className="text-[#0B1528] font-bold">
              @trrabb
            </strong>{" "}
            and use{" "}
            <strong className="text-[#D4541A] font-bold">#Trrabb</strong>{" "}
            to get featured!
          </span>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
            className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8"
          >
            {/* TOP BAR */}
            <div className="flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold bg-[#D4541A] px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-xs">
                  {selectedIndex + 1} of {basePhotos.length}
                </span>
                <span className="text-sm font-semibold text-zinc-300 hidden sm:inline">
                  {basePhotos[selectedIndex].location}
                </span>
              </div>

              <button
                onClick={() => setSelectedIndex(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close photo"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* MAIN IMAGE CONTAINER WITH NAVIGATION ARROWS */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <button
                onClick={handlePrevModal}
                className="absolute left-2 sm:left-6 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-[#D4541A] text-white flex items-center justify-center transition-all border border-white/20 active:scale-95 shadow-lg cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="relative w-full h-full max-w-5xl max-h-[75vh] flex items-center justify-center">
                <img
                  src={basePhotos[selectedIndex].url}
                  alt={basePhotos[selectedIndex].caption}
                  className="max-w-full max-h-[75vh] object-contain"
                />
              </div>

              <button
                onClick={handleNextModal}
                className="absolute right-2 sm:right-6 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-[#D4541A] text-white flex items-center justify-center transition-all border border-white/20 active:scale-95 shadow-lg cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* BOTTOM CAPTION BAR */}
            <div className="text-center text-white z-10 pb-2">
              <h3 className="font-bold text-lg sm:text-xl text-white mb-1">
                {basePhotos[selectedIndex].caption}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                {basePhotos[selectedIndex].location}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
