"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Trip } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { normalizeImageUrl } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

interface TripCardProps {
  trip: Trip;
  index?: number;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  activeMonth?: string;
}

const splitTripTitle = (fullTitle: string) => {
  const keywords = [
    "Backpacking Trip",
    "Road Trip",
    "Group Trip",
    "Backpacking",
    "Roadtrip",
    "Trek",
    "Expedition",
    "Tour",
    "Trip",
  ];
  for (const kw of keywords) {
    const idx = fullTitle.toLowerCase().lastIndexOf(kw.toLowerCase());
    if (idx > 0) {
      return {
        main: fullTitle.substring(0, idx).trim(),
        sub: fullTitle.substring(idx).trim(),
      };
    }
  }
  const words = fullTitle.split(" ");
  if (words.length > 1) {
    return {
      main: words.slice(0, -1).join(" "),
      sub: words[words.length - 1],
    };
  }
  return { main: fullTitle, sub: "" };
};

export default function TripCard({
  trip,
  index = 0,
  className,
  onClick,
}: TripCardProps) {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const canTiltRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingPtr = useRef<{ x: number; y: number } | null>(null);

  const applyTilt = useCallback((x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const px = (x - rect.left) / rect.width;
    const py = (y - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 2 * 7;
    const rotateX = (py - 0.5) * 2 * 5.5;
    stage.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
    stage.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
  }, []);

  const resetTilt = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.classList.remove("is-tilting");
    stage.style.removeProperty("--tilt-x");
    stage.style.removeProperty("--tilt-y");
  }, []);

  useEffect(() => {
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncTiltMode = () => {
      canTiltRef.current = fineHover.matches && !reduceMotion.matches;
      if (!canTiltRef.current) resetTilt();
    };

    syncTiltMode();
    fineHover.addEventListener("change", syncTiltMode);
    reduceMotion.addEventListener("change", syncTiltMode);
    return () => {
      fineHover.removeEventListener("change", syncTiltMode);
      reduceMotion.removeEventListener("change", syncTiltMode);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [resetTilt]);

  const onPointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTiltRef.current) return;
    pendingPtr.current = { x: e.clientX, y: e.clientY };
    stageRef.current?.classList.add("is-tilting");
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pt = pendingPtr.current;
      if (pt) applyTilt(pt.x, pt.y);
    });
  };

  const price = Number(trip.price);

  // Build unique images list STRICTLY from Admin uploaded trip.heroImage and trip.images
  const imagesList = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const heroNorm = normalizeImageUrl(trip.heroImage);
    if (heroNorm) { seen.add(heroNorm); list.push(heroNorm); }

    if (trip.images && Array.isArray(trip.images)) {
      trip.images.forEach((img) => {
        const norm = normalizeImageUrl(img);
        if (norm && !seen.has(norm)) { seen.add(norm); list.push(norm); }
      });
    }

    return list;
  }, [trip.heroImage, trip.images]);

  // Staggered automatic photo slider — stagger start time per card index
  useEffect(() => {
    if (imagesList.length <= 1) return;

    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setCurrentImgIdx((prev) => (prev + 1) % imagesList.length);
      }, 3000);
    }, (index % 10) * 300);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [imagesList.length, index]);

  const activePhotoIndex = imagesList.length
    ? currentImgIdx % imagesList.length
    : 0;

  // Location Badge (e.g., HIMACHAL, LADAKH, UTTARAKHAND, KERALA)
  const locationBadge = (trip.location || "").toUpperCase();

  const durationText = formatDuration(trip.duration);

  const exCity = (() => {
    let raw = "";
    if (trip.departureCity) {
      raw = trip.departureCity;
    } else if (
      trip.variants &&
      trip.variants.length > 0 &&
      trip.variants[0].location
    ) {
      raw = trip.variants[0].location;
    }
    if (!raw) return "";
    const clean = raw
      .replace(/\s+to\s+.*$/i, "")
      .replace(/\s*\(.*?\)/g, "")
      .split("/")[0]
      .split("&")[0]
      .split(",")[0]
      .trim();
    return clean ? `Ex. ${clean}` : "";
  })();

  const title = trip.title || "Untitled Trip";

  const { main: mainTitle, sub: subTitle } = splitTripTitle(title);
  const tagline = (trip.description || "")
    .replace(/<[^>]*>/g, "")
    .trim();

  return (
    <div
      ref={stageRef}
      className={`trip-card-stage ${className || ""}`}
      onMouseMove={onPointerMove}
      onMouseLeave={resetTilt}
    >
      <Link
        href={`/trips/${trip.slug}`}
        prefetch={false}
        onClick={onClick}
        className="trip-card group relative flex flex-col w-full block text-inherit no-underline cursor-pointer"
      >
        {/* TOP FLOATING PHOTO CONTAINER */}
        <div
          className="trip-card-photo relative z-20 w-full rounded-[26px] overflow-hidden bg-zinc-100"
          style={{ aspectRatio: "16/10.5" }}
        >
          <div className="trip-card-photo-zoom absolute inset-0">
            {/* CINEMATIC SLIDE + ZOOM PHOTO CAROUSEL */}
            {imagesList.map((imgUrl, imgIdx) => {
          const isActive = imgIdx === activePhotoIndex;
          // Premium slow diagonal drift — 4 variants cycling by imgIdx % 4
          const diagonalVariants = [
            { idle: "scale-100 translate-x-[3%] translate-y-[2%]",   active: "scale-[1.05] translate-x-[-2%] translate-y-[-1%]" },
            { idle: "scale-100 translate-x-[-3%] translate-y-[-2%]", active: "scale-[1.05] translate-x-[2%] translate-y-[1%]" },
            { idle: "scale-100 translate-x-[3%] translate-y-[-2%]",  active: "scale-[1.05] translate-x-[-2%] translate-y-[1%]" },
            { idle: "scale-100 translate-x-[-3%] translate-y-[2%]",  active: "scale-[1.05] translate-x-[2%] translate-y-[-1%]" },
          ];
          const variant = diagonalVariants[imgIdx % 4];
          const idle = variant.idle;
          const active = variant.active;

          return (
            <div
              key={imgIdx}
              className={`absolute inset-0 transition-opacity duration-[600ms] ease-in-out ${
                isActive ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
            >
              <img
                src={imgUrl}
                alt={title}
                loading={imgIdx === 0 ? "eager" : "lazy"}
                className={`absolute inset-0 w-full h-full object-cover will-change-transform transition-transform duration-[4000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                  isActive ? active : idle
                }`}
              />
            </div>
          );
        })}
        </div>

        {/* TOP LEFT BADGE */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none max-w-[85%]">
          <span className="inline-block bg-[#0a0f1d]/90 text-white font-montserrat font-semibold text-[9px] sm:text-[10px] tracking-wider uppercase px-3 py-1 rounded-full backdrop-blur-sm shadow-sm truncate max-w-full">
            {locationBadge}
          </span>
        </div>

        {/* BOTTOM PAGINATION DOTS FOR AESTHETIC AUTO-SLIDER */}
        {imagesList.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-auto">
            {imagesList.slice(0, 8).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentImgIdx(dotIdx);
                }}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  dotIdx === activePhotoIndex
                    ? "w-2.5 h-2.5 bg-white shadow-md scale-110"
                    : "w-1.5 h-1.5 bg-white/60 backdrop-blur-sm hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* LOWER WHITE CARD CONTENT CONTAINER WITH GENEROUS SIDE WHITESPACE PADDING */}
      <div className="trip-card-body relative z-10 -mt-4 pt-6 pb-5 px-6 sm:px-7 mx-1 sm:mx-1.5 bg-white rounded-b-[26px] rounded-t-[16px] border border-zinc-200/80 flex flex-col flex-1 font-montserrat justify-between">
        <div>
          {/* META ROW: DURATION & EX-CITY */}
          <div className="flex items-center justify-between font-montserrat text-[12px] sm:text-[13px] font-normal text-[#666666] mb-2.5 gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{durationText}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 ml-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{exCity}</span>
            </div>
          </div>

          {/* TITLE — MONTSERRAT EXTRA BOLD (800) + CAVEAT ORANGE HANDWRITTEN SUBTITLE */}
          <div className="min-h-[50px] flex flex-col justify-center mb-1">
            <h3
              className="trip-card-title font-montserrat text-[17px] sm:text-[18px] leading-[1.25] font-black group-hover:text-[#0B1528] transition-colors"
              style={{ fontWeight: 800, color: "#0B1528" }}
            >
              {mainTitle}
            </h3>
            {subTitle && (
              <span className="font-caveat font-bold text-[#D4541A] text-[20px] sm:text-[22px] leading-none block mt-0.5">
                {subTitle}
              </span>
            )}
          </div>

          {/* TAGLINE — MONTSERRAT REGULAR (400), 13-14PX, #666666 */}
          <p className="font-montserrat text-[#666666] text-[13px] sm:text-[14px] font-normal line-clamp-1 mb-3.5">
            {tagline}
          </p>
        </div>

        <div className="mt-auto">
          {/* PRICE ROW — MONTSERRAT BOLD 700, 16-18PX, #D4541A */}
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="font-montserrat text-[#D4541A] font-normal text-xs sm:text-sm">
              From
            </span>
            <span className="font-montserrat text-[#D4541A] font-bold text-[16px] sm:text-[18px] leading-none">
              {Number.isFinite(price) && price > 0
                ? `₹${price.toLocaleString("en-IN")}`
                : "Price unavailable"}
            </span>
          </div>

          {/* VIEW TRIP LINK */}
          <div className="trip-card-cta inline-flex items-center gap-1.5 font-montserrat font-bold text-xs sm:text-[14px] text-[#0B1528] group-hover:text-[#D4541A]">
            <span>View Trip</span>
            <span className="text-[#D4541A] font-bold text-sm">→</span>
          </div>
        </div>
        </div>
      </Link>
    </div>
  );
}
