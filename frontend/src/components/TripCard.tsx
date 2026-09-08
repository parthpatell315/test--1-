"use client";

import { useState, useMemo } from "react";
import { Trip } from "@/types";
import Link from "next/link";
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Clock, 
  MapPin, 
  Sparkles, 
  Plane, 
  Users 
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

interface TripCardProps {
  trip: Trip;
  index?: number;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  activeMonth?: string;
}

const getDestinationFallbackPhoto = (title: string, location: string): string => {
  const query = `${title} ${location}`.toLowerCase();
  if (query.includes("spiti")) return "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=800&q=80";
  if (query.includes("manali") || query.includes("kasol")) return "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=800&q=80";
  if (query.includes("meghalaya") || query.includes("shillong")) return "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80";
  if (query.includes("ladakh") || query.includes("leh")) return "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800&q=80";
  if (query.includes("bali")) return "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80";
  if (query.includes("vietnam")) return "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80";
  if (query.includes("dubai")) return "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&q=80";
  if (query.includes("kashmir")) return "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800&q=80";
  if (query.includes("kerala")) return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80";
  if (query.includes("goa")) return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80";
  return "https://images.unsplash.com/photo-1506929113675-b92417bbbe8d?w=800&q=80";
};

export default function TripCard({
  trip,
  index = 0,
  className = "",
  onClick,
}: TripCardProps) {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  // Collect all valid images for the card slider
  const images = useMemo(() => {
    const list: string[] = [];
    const heroImg = trip.heroImage || (trip as any).featuredImage;
    if (heroImg) {
      const norm = normalizeImageUrl(heroImg);
      if (norm) list.push(norm);
    }
    if (Array.isArray(trip.images)) {
      trip.images.forEach((img: any) => {
        const url = typeof img === "string" ? img : img?.url || img?.src;
        if (url) {
          const norm = normalizeImageUrl(url);
          if (norm && !list.includes(norm)) list.push(norm);
        }
      });
    }
    if (Array.isArray(trip.gallery)) {
      trip.gallery.forEach((img: any) => {
        const url = typeof img === "string" ? img : img?.url || img?.src;
        if (url) {
          const norm = normalizeImageUrl(url);
          if (norm && !list.includes(norm)) list.push(norm);
        }
      });
    }
    if (list.length === 0) {
      list.push(getDestinationFallbackPhoto(trip.title, trip.location || ""));
    }
    return list;
  }, [trip]);

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  // Price calculation
  const basePrice = trip.price || 18999;
  const originalPrice = (trip as any).original_price || Math.round(basePrice * 1.22);
  const emiPrice = Math.round(basePrice / 12);

  // Duration formatted
  const durationText = useMemo(() => {
    if (trip.duration) {
      const match = trip.duration.match(/\d+/);
      const days = match ? parseInt(match[0], 10) : 6;
      return `${days} Days · ${Math.max(1, days - 1)} Nights`;
    }
    return "6 Days · 5 Nights";
  }, [trip.duration]);

  return (
    <div
      className={`group relative bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col ${className}`}
    >
      <Link
        href={`/trips/${trip.slug}`}
        onClick={onClick}
        className="flex flex-col h-full"
      >
        {/* TOP IMAGE CAROUSEL CONTAINER */}
        <div className="relative h-[220px] w-full overflow-hidden bg-gray-100 shrink-0">
          {/* Top-Left Pill Badge: Group Trip */}
          <div className="absolute top-0 left-0 z-20 bg-white text-gray-900 text-[11px] font-bold px-3 py-1.5 rounded-br-2xl shadow-sm flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#EC1D24]" />
            <span>Group Trip</span>
          </div>

          {/* Top-Right Pill Badge: Flight Included or Best Seller */}
          <div className="absolute top-0 right-0 z-20 bg-white text-gray-900 text-[11px] font-bold px-3 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-1.5">
            {(index % 2 === 0) ? (
              <>
                <Plane className="w-3.5 h-3.5 text-blue-600" />
                <span>Flight Included</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#EC1D24]" />
                <span>Best Seller</span>
              </>
            )}
          </div>

          {/* Current Slide Image */}
          <img
            src={images[currentImgIdx]}
            alt={trip.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Navigation Arrows on Hover */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Previous photo"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next photo"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Bullet Dots */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-xs px-2 py-1 rounded-full">
                {images.slice(0, 5).map((_, dotIdx) => (
                  <div
                    key={dotIdx}
                    className={`rounded-full transition-all duration-300 ${
                      dotIdx === currentImgIdx
                        ? "w-3 h-1 bg-white"
                        : "w-1 h-1 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* CARD CONTENT BODY */}
        <div className="p-5 flex flex-col flex-grow justify-between">
          <div>
            {/* Duration and Location */}
            <div className="flex items-center justify-between text-xs text-[#7E7E7E] font-semibold mb-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {durationText}
              </span>
              {trip.location && (
                <span className="flex items-center gap-1 line-clamp-1 max-w-[130px]">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {trip.location}
                </span>
              )}
            </div>

            {/* Trip Title */}
            <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] group-hover:text-[#EC1D24] transition-colors line-clamp-1">
              {trip.title}
            </h3>

            {/* Tagline / Subtitle */}
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
              {(trip as any).tagline || trip.shortDescription || `${trip.location || "Scenic"} Guided Expedition`}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className="flex items-center text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                <span className="text-xs font-bold text-gray-800 ml-1">4.9</span>
              </div>
              <span className="text-[11px] text-gray-400">(140+ reviews)</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mt-4 pt-3">
            {/* Price Row */}
            <div className="flex items-baseline justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7E7E7E] uppercase font-semibold">Starting from</span>
                  {originalPrice > basePrice && (
                    <span className="text-xs text-gray-400 line-through">
                      ₹{originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <div className="text-lg font-extrabold text-[#1A1A1A]">
                  ₹{basePrice.toLocaleString("en-IN")}
                </div>
              </div>

              {/* EMI Badge */}
              <div className="bg-[#EBF5FE] border border-[#89C1FB]/50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                EMI ₹{emiPrice.toLocaleString("en-IN")}/mo
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
