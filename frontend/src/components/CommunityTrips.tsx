"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Trip } from "@/types";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseTripDate } from "@/lib/parseTripDate";
import TripCard from "@/components/TripCard";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ROTATING_WORDS = [
  "Curious",
  "Adventurous",
  "Wanderlust-Struck",
  "Colleagues",
  "Strangers",
  "Restless",
];

function getAutoMonths() {
  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const currentYear = today.getFullYear();
  const monthShortNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const autoList = [{ label: "All", month: -1, year: 0 }];

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonthIdx + i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    autoList.push({
      label: monthShortNames[m],
      month: m,
      year: y,
    });
  }

  return autoList;
}


function monthMatch(trip: Trip, m: { month: number; year: number }): boolean {
  if (m.month === -1) return true;
  if (!trip.availableDates?.length) return true;
  const dates =
    typeof trip.availableDates === "string"
      ? (() => {
          try {
            return JSON.parse(trip.availableDates as any);
          } catch (_) {
            return [];
          }
        })()
      : trip.availableDates;
  return (dates as any[]).some((d: any) => {
    const p = parseTripDate(d.date || d);
    return p ? p.getMonth() === m.month && p.getFullYear() === m.year : false;
  });
}

function SkeletonCard() {
  return (
    <div className="rounded-[24px] overflow-hidden bg-white p-4 shadow-sm border border-zinc-100 max-w-[480px] mx-auto">
      <div
        className="relative w-full rounded-[20px] overflow-hidden bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 animate-pulse"
        style={{ aspectRatio: "16/10.5" }}
      />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-zinc-200 rounded-full w-1/3 animate-pulse" />
        <div className="h-4 bg-zinc-200 rounded-full w-5/6 animate-pulse" />
        <div className="h-3 bg-zinc-200 rounded-full w-4/5 animate-pulse" />
        <div className="h-6 bg-zinc-200 rounded-full w-1/3 mt-3 animate-pulse" />
      </div>
    </div>
  );
}

interface CommunityTripsProps {
  trips?: Trip[];
  title?: string;
  backgroundImage?: string;
  tagline?: string;
  headline?: string;
  subheadline?: string;
  [key: string]: any;
}

export default function CommunityTrips({
  trips: propTrips = [],
  backgroundImage,
  backgroundImages,
  tagline = "EXPLORE. CONNECT. BELONG.",
  headline = "Trips for the",
  headlinePrefix,
  strikethroughWord = "Ordinary",
  rotatingWords,
  subheadline = "10,000+ travelers. Trusted since 2019. Government registered.",
  fadeColor,
  fadeOpacity,
  fadeDirection,
  overlayTheme,
  overlayOpacity,
  overlayDirection,
  fontSize = "medium",
  fontFamily = "montserrat",
  accentColor = "#D4541A",
  heroHeight = "medium",
  paddingTop = "28",
  paddingBottom = "60",
  selectedTripIds,
}: CommunityTripsProps) {
  const MONTHS = useMemo(() => getAutoMonths(), []);
  const [activeMonth, setActiveMonth] = useState(0); // "All"
  const [currentTripIdx, setCurrentTripIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const tripCardsScrollRef = useRef<HTMLDivElement>(null);

  // Reset trip index when active month selection changes
  useEffect(() => {
    setCurrentTripIdx(0);
  }, [activeMonth]);

  // Parse multiple photos or single fallback
  const bgPhotosList: string[] =
    Array.isArray(backgroundImages) && backgroundImages.length > 0
      ? backgroundImages
      : backgroundImage
        ? [backgroundImage]
      : [];

  const currentBgPhoto =
    bgPhotosList.length > 0
      ? bgPhotosList[bgIdx % bgPhotosList.length]
      : "";

  const activeHeadlinePrefix =
    headlinePrefix !== undefined ? headlinePrefix : headline;
  const activeStrikethroughWord =
    strikethroughWord !== undefined ? strikethroughWord : "Ordinary";
  const activeRotatingWords: string[] =
    Array.isArray(rotatingWords) && rotatingWords.length > 0
      ? rotatingWords
      : !rotatingWords
        ? ROTATING_WORDS
        : [];

  // Cycle rotating words
  useEffect(() => {
    const wordTimer = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % activeRotatingWords.length);
    }, 2200);
    return () => clearInterval(wordTimer);
  }, [activeRotatingWords.length]);

  // Cycle background photos if multiple provided
  useEffect(() => {
    if (bgPhotosList.length <= 1) return;
    const bgTimer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % bgPhotosList.length);
    }, 6000);
    return () => clearInterval(bgTimer);
  }, [bgPhotosList.length]);

  // Sort trips strictly by their order sequence field (1, 2, 3, 4...)
  const sortedTrips = useMemo(() => {
    const raw = propTrips || [];
    return [...raw].sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 999;
      const orderB = typeof b.order === "number" ? b.order : 999;
      return orderA - orderB;
    });
  }, [propTrips]);

  // If the admin panel specified selectedTripIds, order by them first and append all remaining trips so all published trips stay scrollable
  const sourceTrips = useMemo(() => {
    let baseList = sortedTrips;
    if (Array.isArray(selectedTripIds) && selectedTripIds.length > 0) {
      const chosen = selectedTripIds
        .map((id) =>
          sortedTrips.find(
            (t) => t.id === id || t.slug === id || t.shortName === id,
          ),
        )
        .filter(Boolean) as Trip[];
      const remaining = sortedTrips.filter(
        (t) => !chosen.some((c) => c.id === t.id || c.slug === t.slug),
      );
      baseList = [...chosen, ...remaining];
    }

    // Strict deduplication by trip ID & Slug so duplicate cards are impossible
    const seen = new Set<string>();
    return baseList.filter((t) => {
      const key = (t.id || t.slug || t.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedTripIds, sortedTrips]);

  const pickMonth = useCallback(
    (i: number) => {
      if (i === activeMonth) return;
      setIsLoading(true);
      setActiveMonth(i);
      const t = setTimeout(() => setIsLoading(false), 250);
      return () => clearTimeout(t);
    },
    [activeMonth],
  );

  const nudge = (dir: "l" | "r") =>
    barRef.current?.scrollBy({
      left: dir === "l" ? -220 : 220,
      behavior: "smooth",
    });

  const md = MONTHS[activeMonth];
  const display = useMemo(() => {
    const filtered = sourceTrips.filter((t) => monthMatch(t, md));
    return filtered.length > 0 ? filtered : sourceTrips;
  }, [sourceTrips, md]);

  // Preload upcoming trip images for silky 60 FPS transitions
  useEffect(() => {
    if (!display || display.length === 0) return;
    display.slice(0, 5).forEach((trip) => {
      const src = trip.heroImage || (trip.images && trip.images[0]);
      if (src && typeof window !== "undefined") {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [display]);

  const safeTripIdx = Math.min(currentTripIdx, Math.max(0, display.length - 1));
  const activeTrip = display[safeTripIdx] || display[0];

  const goToNextTrip = () => {
    setCurrentTripIdx((prev) => (prev + 1) % display.length);
  };

  const goToPrevTrip = () => {
    setCurrentTripIdx((prev) => (prev - 1 + display.length) % display.length);
  };

  // Font size mapping helper
  const getFontSizeClass = () => {
    switch (fontSize) {
      case "small":
        return "text-2xl sm:text-3xl md:text-4xl";
      case "large":
        return "text-4xl sm:text-5xl md:text-6xl";
      default:
        return "text-3xl sm:text-4xl md:text-5xl"; // medium
    }
  };

  const isWhiteOverlay = (fadeColor || overlayTheme || "white") === "white";

  // Active Fade Properties (Supports both fadeColor & overlayTheme)
  const activeFadeColor = fadeColor || overlayTheme || "white";
  const activeFadeOpacity =
    fadeOpacity !== undefined
      ? Number(fadeOpacity)
      : overlayOpacity !== undefined
        ? Number(overlayOpacity)
        : 60;
  const activeFadeDirection = fadeDirection || overlayDirection || "left-right";
  const useCinematicWhiteFade =
    isWhiteOverlay &&
    (activeFadeDirection === "left-right" ||
      activeFadeDirection === "horizontal");

  // Build dynamic overlay background style
  const getDynamicOverlayStyle = () => {
    if (activeFadeColor === "none") return { display: "none" };
    const alpha = Math.max(0.25, activeFadeOpacity / 100);

    let rgb = "255, 255, 255";
    if (activeFadeColor === "black" || activeFadeColor === "dark")
      rgb = "0, 0, 0";
    if (activeFadeColor === "navy") rgb = "26, 35, 50";

    if (activeFadeColor === "gradient") {
      return {
        background: `linear-gradient(to right, rgba(26, 35, 50, ${alpha}) 0%, rgba(217, 120, 84, ${alpha * 0.5}) 50%, rgba(255, 255, 255, ${alpha * 0.8}) 100%)`,
      };
    }

    switch (activeFadeDirection) {
      case "right-left":
        return {
          background: `linear-gradient(to left, rgba(${rgb}, ${Math.min(0.98, alpha * 1.25)}) 0%, rgba(${rgb}, ${alpha * 0.85}) 55%, rgba(${rgb}, ${alpha * 0.35}) 100%)`,
        };
      case "top-bottom":
      case "vertical":
        return {
          background: `linear-gradient(to bottom, rgba(${rgb}, ${Math.min(0.98, alpha * 1.25)}) 0%, rgba(${rgb}, ${alpha * 0.85}) 55%, rgba(${rgb}, ${alpha * 0.35}) 100%)`,
        };
      case "bottom-top":
        return {
          background: `linear-gradient(to top, rgba(${rgb}, ${Math.min(0.98, alpha * 1.25)}) 0%, rgba(${rgb}, ${alpha * 0.85}) 55%, rgba(${rgb}, ${alpha * 0.35}) 100%)`,
        };
      case "center-out":
      case "radial":
        return {
          background: `radial-gradient(circle, rgba(${rgb}, ${Math.min(0.98, alpha * 1.25)}) 0%, rgba(${rgb}, ${alpha * 0.45}) 100%)`,
        };
      default: // left-right / horizontal
        return {
          background: [
            `linear-gradient(to top, rgba(${rgb}, ${Math.min(0.4, alpha * 0.5)}) 0%, transparent 26%)`,
            `linear-gradient(to right, rgba(${rgb}, ${Math.min(0.92, alpha * 1.15)}) 0%, rgba(${rgb}, ${alpha * 0.7}) 28%, rgba(${rgb}, ${alpha * 0.18}) 52%, transparent 68%)`,
          ].join(", "),
        };
    }
  };

  return (
    <section
      className="relative overflow-hidden bg-white"
      style={{ paddingTop: "var(--navbar-height, 80px)" }}
    >
      {/* HERO SECTION WRAPPER */}
      <div
        className="relative flex flex-col justify-center min-h-[260px] sm:min-h-[340px] md:min-h-[400px]"
        style={{
          paddingTop: `${paddingTop}px`,
          paddingBottom: `${paddingBottom}px`,
        }}
      >
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBgPhoto}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="w-full h-full relative"
              style={{ willChange: "opacity", transform: "translateZ(0)" }}
            >
              {currentBgPhoto &&
              (/\.(mp4|webm|mov|ogg)$/i.test(currentBgPhoto) ||
                currentBgPhoto.includes("/video/")) ? (
                <video
                  src={currentBgPhoto}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  disablePictureInPicture
                  className="hide-native-video-play w-full h-full object-cover object-center"
                />
              ) : (
                <img
                  src={currentBgPhoto}
                  alt="Group of young travellers"
                  loading="eager"
                  className="absolute inset-0 w-full h-full object-cover object-center carousel-image-cinematic"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* DYNAMIC OVERLAY */}
          <div
            className={`absolute inset-0 z-10 pointer-events-none transition-all duration-300${
              useCinematicWhiteFade ? " hero-cinematic-fade" : ""
            }`}
            style={useCinematicWhiteFade ? undefined : getDynamicOverlayStyle()}
          />
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-6 sm:px-8 md:px-12">
          <div className="max-w-[850px]">
            <p
              className="font-extrabold text-xs sm:text-sm tracking-[2.5px] uppercase mb-2 drop-shadow-xs"
              style={{ color: accentColor }}
            >
              {(tagline || "").replace(/^[Ââ€¢\s•-]+/, "").trim() || "EXPLORE. CONNECT. BELONG."}
            </p>

            <h2
              className={`font-montserrat font-extrabold leading-[1.15] tracking-tight mb-2 text-[32px] sm:text-5xl md:text-6xl lg:text-7xl ${isWhiteOverlay ? "text-[#0B1528]" : "text-white drop-shadow-md"}`}
            >
              <span className="block">{activeHeadlinePrefix}</span>
              {(Boolean(activeStrikethroughWord) ||
                activeRotatingWords.length > 0) && (
                <span className="flex items-center gap-2 sm:gap-3.5 flex-nowrap mt-0.5 whitespace-nowrap">
                  {Boolean(activeStrikethroughWord) && (
                    <span
                      className={`relative inline-block whitespace-nowrap ${isWhiteOverlay ? "text-[#0B1528]" : "text-white"}`}
                    >
                      {activeStrikethroughWord}
                      <svg
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-[114%] h-[18px] sm:h-[30px] md:h-[38px] pointer-events-none overflow-visible"
                        style={{ color: accentColor }}
                        viewBox="0 0 120 30"
                        fill="none"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M 3 17 C 35 4, 85 24, 117 11"
                          stroke="currentColor"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}

                  {activeRotatingWords.length > 0 && (
                    <span
                      className="inline-flex relative h-[38px] sm:h-[56px] md:h-[72px] items-center whitespace-nowrap pr-2 sm:pr-3"
                      style={{ overflow: "hidden", minWidth: "max-content" }}
                    >
                      <AnimatePresence initial={false}>
                        <motion.span
                          key={
                            activeRotatingWords[
                              wordIdx % activeRotatingWords.length
                            ]
                          }
                          initial={{ y: 35, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -35, opacity: 0 }}
                          transition={{
                            duration: 0.45,
                            ease: [0.25, 0.1, 0.25, 1.0],
                          }}
                          className="font-black inline-block whitespace-nowrap absolute"
                          style={{ color: accentColor }}
                        >
                          {
                            activeRotatingWords[
                              wordIdx % activeRotatingWords.length
                            ]
                          }
                        </motion.span>
                      </AnimatePresence>
                      {/* Invisible spacer sized to the longest word to reserve width */}
                      <span className="font-black whitespace-nowrap invisible pointer-events-none select-none" aria-hidden="true">
                        {activeRotatingWords.reduce((a, b) => a.length >= b.length ? a : b, "")}
                      </span>
                    </span>
                  )}
                </span>
              )}
            </h2>

            <p
              className={`text-xs sm:text-sm md:text-base font-semibold leading-relaxed max-w-[580px] ${isWhiteOverlay ? "text-[#1B2A4A]" : "text-zinc-200 drop-shadow-sm"}`}
            >
              {subheadline}
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector Pill Bar */}
      <div className="-mt-1 sm:-mt-2 relative z-20 px-6 sm:px-8 md:px-12 mb-0.5 sm:mb-1">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 bg-white border border-zinc-200/80 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-2.5 sm:p-3.5">
            <button
              type="button"
              onClick={() => nudge("l")}
              aria-label="Previous months"
              className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 transition-all flex items-center justify-center text-zinc-700 cursor-pointer shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-700" />
            </button>

            <div
              ref={barRef}
              className="no-scrollbar flex gap-2.5 overflow-x-auto py-1 flex-1 min-w-0 scroll-smooth"
            >
              {MONTHS.map((m: any, i: number) => {
                const on = activeMonth === i;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => pickMonth(i)}
                    className="relative flex-shrink-0 px-5 sm:px-6 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors duration-200 cursor-pointer select-none"
                  >
                    {on && (
                      <motion.div
                        layoutId="activeCommunityMonthPillBg"
                        className="absolute inset-0 bg-[#0a0f1d] rounded-full shadow-md z-0"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${on ? "text-white" : "text-zinc-700 hover:text-zinc-900"}`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => nudge("r")}
              aria-label="Next months"
              className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 transition-all flex items-center justify-center text-zinc-700 cursor-pointer shadow-sm active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-zinc-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Trip Cards Carousel Container */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 md:px-14 lg:px-16 relative group pb-6 pt-0">
        {/* Scrollable Trips Carousel */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMonth}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              ref={tripCardsScrollRef}
              className="trip-cards-row flex gap-6 sm:gap-8 overflow-x-auto overflow-y-hidden pb-1 pt-2 px-0 scroll-smooth snap-x snap-mandatory no-scrollbar touch-manipulation cursor-grab"
            >
              {display.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="w-[62vw] min-w-[220px] max-w-[270px] sm:w-[310px] md:w-[330px] shrink-0 snap-start carousel-card-animated"
                >
                  <TripCard trip={t} index={idx} />
                </div>
              ))}
              {/* Extra empty div to ensure padding at the end of the scroll */}
              <div className="w-1 shrink-0" />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
