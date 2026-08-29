"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeImageUrl } from "@/lib/api";
import { useWheelPassThrough } from "@/lib/useWheelPassThrough";

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

  const basePhotos = displayPhotos;

  const marqueePhotos = useMemo(
    () => [...basePhotos, ...basePhotos, ...basePhotos, ...basePhotos],
    [basePhotos],
  );

  // High-performance smooth continuous scroll loop only when in viewport
  useEffect(() => {
    if (isHovered || isDragging || selectedIndex !== null) return;
    const el = scrollRef.current;
    if (!el) return;

    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    observer.observe(el);

    let isWindowScrolling = false;
    let scrollTimeout: any = null;
    const onWindowScroll = () => {
      isWindowScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isWindowScrolling = false;
      }, 100);
    };
    window.addEventListener("scroll", onWindowScroll, { passive: true });

    let animationId: number;
    let lastTime = performance.now();

    const step = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (isVisible && !isWindowScrolling && el) {
        // Move proportionally to elapsed time (approx 60px/sec)
        const move = (delta / 1000) * 60;
        el.scrollLeft += move;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener("scroll", onWindowScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isHovered, isDragging, selectedIndex]);

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
      className="py-4 sm:py-5 font-montserrat overflow-hidden bg-[#E2E7ED]"
      style={{ backgroundColor: "#E2E7ED" }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12">
        {/* HEADER ROW - FITS TITLE ON ONE LINE */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 flex-nowrap">
          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden whitespace-nowrap">
            <h2 className="text-[#1B2A4A] font-montserrat font-black text-2xl sm:text-3xl md:text-4xl lg:text-[40px] tracking-tight capitalize leading-tight">
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

        {/* AUTOMATIC SMOOTH CINEMATIC PHOTO MARQUEE SLIDER */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsDragging(false);
          }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="w-full max-w-full flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-2.5 cursor-grab active:cursor-grabbing select-none"
        >
          {marqueePhotos.map((photo, idx) => {
            const actualIndex = idx % displayPhotos.length;
            return (
              <div
                key={`${photo.id}-${idx}`}
                onClick={() => setSelectedIndex(actualIndex)}
                className="group relative shrink-0 flex-none w-[130px] sm:w-[155px] md:w-[175px] aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-100 shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer isolate"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "YouthCamping photo"}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* BOTTOM HASHTAG FEATURE BAR - FITS ON ONE SINGLE LINE */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-4 text-[11px] sm:text-[13px] md:text-sm text-zinc-600 font-montserrat whitespace-nowrap overflow-hidden">
          <Camera className="w-4 h-4 text-[#D4541A] shrink-0" />
          <span className="truncate">
            Tag us{" "}
            <strong className="text-[#0B1528] font-bold">
              @youthcamping.in
            </strong>{" "}
            and use{" "}
            <strong className="text-[#D4541A] font-bold">#YouthCamping</strong>{" "}
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
