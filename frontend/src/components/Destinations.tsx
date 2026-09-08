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

const DESTINATION_PHOTOS: Record<string, string> = {
  "uttarakhand": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=85",
  "spiti valley": "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=800&q=85",
  "spiti": "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=800&q=85",
  "ladakh": "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800&q=85",
  "leh": "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800&q=85",
  "kerala": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=85",
  "himachal pradesh": "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&q=85",
  "himachal": "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&q=85",
  "manali": "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&q=85",
  "gokarna": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=85",
  "meghalaya": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=85",
  "rajasthan": "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=85",
  "kashmir": "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800&q=85",
};

const getDestinationPhoto = (name: string, customImg?: string): string => {
  if (customImg && customImg.startsWith("http") && !customImg.includes("youthcamping")) return customImg;
  const key = (name || "").toLowerCase().trim();
  for (const [k, url] of Object.entries(DESTINATION_PHOTOS)) {
    if (key.includes(k)) return url;
  }
  return "https://images.unsplash.com/photo-1506929113675-b92417bbbe8d?w=800&q=85";
};

const DEFAULT_DESTINATIONS: Destination[] = [
  { name: "Uttarakhand", subtext: "Trekking & Temple Trails", img: DESTINATION_PHOTOS["uttarakhand"], href: "/trips" },
  { name: "Spiti Valley", subtext: "High Altitude Desert", img: DESTINATION_PHOTOS["spiti valley"], href: "/trips" },
  { name: "Ladakh", subtext: "Passes & Pangong Lake", img: DESTINATION_PHOTOS["ladakh"], href: "/trips" },
  { name: "Kerala", subtext: "Backwaters & Tropical Hills", img: DESTINATION_PHOTOS["kerala"], href: "/trips" },
  { name: "Himachal Pradesh", subtext: "Snow Peaks & Valleys", img: DESTINATION_PHOTOS["himachal pradesh"], href: "/trips" },
  { name: "Gokarna", subtext: "Beach & Cliff Treks", img: DESTINATION_PHOTOS["gokarna"], href: "/trips" },
];

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
  title = "Perfect Getaways",
  titlePrimary,
  titleAccent,
  destinations,
}: DestinationsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const reduceMotion = useReducedMotion();
  useWheelPassThrough(scrollRef);

  const sourceList =
    Array.isArray(destinations) && destinations.length > 0 ? destinations : DEFAULT_DESTINATIONS;

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
          subtext: typeof d === "object" && d?.subtext ? d.subtext : "Adventure Circuit",
          img: getDestinationPhoto(rawName, customImg),
          href: destinationHref(d) || "/trips",
        };
      }).filter((d) => d.name),
    [sourceList],
  );

  if (displayItems.length === 0) return null;

  const primaryWord = (
    titlePrimary ||
    title.split(" ")[0] ||
    "Perfect"
  );
  const accentWord = (
    titleAccent ||
    title.split(" ").slice(1).join(" ") ||
    "Getaways"
  );

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
      className="popular-destinations popular-section destinations-grid w-full py-12 md:py-16 font-sans overflow-hidden bg-white"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 min-w-0 w-full">
        <div className="flex items-center justify-between mb-8 gap-3 flex-nowrap">
          <div>
            <span className="text-xs md:text-sm font-bold text-[#EC1D24] uppercase tracking-wider block mb-1">
              Top Domestic Circuits
            </span>
            <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
              <h2 className="text-[#1A1A1A] font-sans font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight">
                {primaryWord} {accentWord}
              </h2>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => nudge("l")}
              aria-label="Previous Destinations"
              className="dest-nav"
            >
              <ChevronLeft className="w-5 h-5 text-slate-800" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => nudge("r")}
              aria-label="Next Destinations"
              className="dest-nav dest-nav-next"
            >
              <ChevronRight className="w-5 h-5 text-slate-800" strokeWidth={2.25} />
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
              const cardClass =
                "dest-photo-card group relative block w-full aspect-[9/13] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
              const inner = (
                <>
                  <img
                    src={item.img}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = getDestinationPhoto(item.name);
                    }}
                    className="dest-photo-img absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div
                    className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 inset-x-0 z-[2] p-4 text-left">
                    <span className="block text-white font-extrabold text-base sm:text-lg tracking-tight leading-snug">
                      {item.name}
                    </span>
                    {item.subtext && (
                      <span className="block text-slate-300 text-xs font-medium mt-0.5">
                        {item.subtext}
                      </span>
                    )}
                  </div>
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
