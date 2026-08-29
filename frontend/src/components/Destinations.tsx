"use client";

import { useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeImageUrl } from "@/lib/api";
import { useWheelPassThrough } from "@/lib/useWheelPassThrough";

const DestinationInquiryModal = dynamic(
  () => import("./DestinationInquiryModal"),
  { ssr: false },
);

interface Destination {
  name: string;
  img: string;
  subtext?: string;
  href?: string;
}

interface DestinationsProps {
  title?: string;
  subtitle?: string;
  titlePrimary?: string;
  titleAccent?: string;
  destinations?: Destination[];
}

function destinationHref(d: any): string | undefined {
  if (!d || typeof d !== "object") return undefined;
  const raw = d.href || d.link || d.url;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof d.slug === "string" && d.slug.trim()) {
    return `/trips/${d.slug.trim()}`;
  }
  if (typeof d.tripSlug === "string" && d.tripSlug.trim()) {
    return `/trips/${d.tripSlug.trim()}`;
  }
  return undefined;
}

export default function Destinations({
  title = "Popular Destinations",
  titlePrimary,
  titleAccent,
  destinations,
}: DestinationsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const reduceMotion = useReducedMotion();
  useWheelPassThrough(scrollRef);

  const sourceList =
    Array.isArray(destinations) && destinations.length > 0 ? destinations : [];

  const displayItems: Destination[] = useMemo(
    () =>
      sourceList.map((d: any) => {
        const rawName = typeof d === "string" ? d : d?.name || "";
        const customImg =
          typeof d === "object" && (d?.img || d?.imageUrl)
            ? normalizeImageUrl(d.img || d.imageUrl)
            : "";
        return {
          name: rawName,
          subtext: typeof d === "object" && d?.subtext ? d.subtext : "",
          img: customImg || "",
          href: destinationHref(d),
        };
      }).filter((d) => d.name),
    [sourceList],
  );

  if (displayItems.length === 0) return null;

  const primaryWord = (
    titlePrimary ||
    title.split(" ")[0] ||
    "Popular"
  ).toLowerCase();
  const accentWord = (
    titleAccent ||
    title.split(" ").slice(1).join(" ") ||
    "Destinations"
  ).toLowerCase();

  const nudge = (dir: "l" | "r") => {
    if (!scrollRef.current) return;
    const cardEl = scrollRef.current.firstElementChild as HTMLElement | null;
    const gap = 16;
    const scrollAmount = cardEl ? cardEl.offsetWidth + gap : 220;
    scrollRef.current.scrollBy({
      left: dir === "l" ? -scrollAmount : scrollAmount,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section
      className="popular-destinations popular-section destinations-grid w-full pt-4 pb-2 sm:pt-5 sm:pb-2 font-montserrat overflow-hidden border-0 outline-none shadow-none bg-[#E2E7ED]"
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12 min-w-0 w-full">
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 flex-nowrap">
          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden whitespace-nowrap">
            <h2 className="text-[#0B1528] font-montserrat font-black text-2xl sm:text-3xl md:text-4xl lg:text-[40px] tracking-tight capitalize leading-tight">
              {primaryWord}
            </h2>
            <span className="font-caveat font-bold text-[#FF4D00] text-[26px] sm:text-[34px] md:text-[40px] lg:text-[46px] leading-none shrink-0 capitalize pr-2 sm:pr-3">
              {accentWord}
            </span>
          </div>

          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => nudge("l")}
              aria-label="Previous Destinations"
              className="dest-nav"
            >
              <ChevronLeft className="w-5 h-5 text-[#0B1528]" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => nudge("r")}
              aria-label="Next Destinations"
              className="dest-nav dest-nav-next"
            >
              <ChevronRight className="w-5 h-5 text-[#0B1528]" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="relative min-w-0">
          <div
            ref={scrollRef}
            className="carousel-track w-full max-w-full min-w-0 flex gap-3.5 sm:gap-4 overflow-x-auto overflow-y-hidden no-scrollbar py-2 scroll-smooth snap-x snap-mandatory"
            style={{ touchAction: "pan-x" }}
          >
            {displayItems.map((item, idx) => {
              const useScript = idx % 2 === 1;
              const cardClass =
                "dest-photo-card group relative block w-full aspect-[9/14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4D00]";
              const inner = (
                <>
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      className="dest-photo-img absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-300" aria-hidden />
                  )}
                  <div
                    className="dest-photo-fade pointer-events-none absolute inset-0 z-[1]"
                    aria-hidden
                  />
                  <span
                    className={`absolute top-0 inset-x-0 z-[2] px-3 pt-5 sm:pt-6 text-center text-white ${
                      useScript
                        ? "font-caveat font-bold text-[28px] sm:text-[32px] leading-none"
                        : "font-montserrat font-extrabold text-[16px] sm:text-[18px] tracking-[0.06em] uppercase leading-tight"
                    }`}
                  >
                    {item.name}
                  </span>
                </>
              );

              return (
                <motion.div
                  key={item.name + idx}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : idx * 0.06,
                    duration: reduceMotion ? 0 : 0.45,
                  }}
                  viewport={{ once: true }}
                  className="relative flex-none snap-start min-w-0 w-[46vw] max-w-[210px] sm:w-[188px] md:w-[210px]"
                >
                  {item.href ? (
                    <Link href={item.href} prefetch={false} className={cardClass}>
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedDest(item)}
                      className={cardClass}
                    >
                      {inner}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>

      <DestinationInquiryModal
        isOpen={!!selectedDest}
        onClose={() => setSelectedDest(null)}
        destination={selectedDest}
      />
    </section>
  );
}
