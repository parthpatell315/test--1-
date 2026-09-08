"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { normalizeImageUrl } from "@/lib/api";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import PhotoGalleryModal from "./PhotoGalleryModal";

interface HighlightItem {
  name?: string;
  title?: string;
  description?: string;
  image?: string;
  img?: string;
  url?: string;
  src?: string;
  path?: string;
}

interface TripHighlightsListProps {
  title?: string;
  items?: (HighlightItem | string)[];
  defaultItems?: (HighlightItem | string)[];
}

const defaultSliderPhotos = [
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=1200", // Bonfire / Party
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200", // Mountain Sunset
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200", // Snow Trek
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200", // Solo Hiker View
  "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?q=80&w=1200", // Friends Trekking
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200", // Bike Expedition
  "https://images.unsplash.com/photo-1596230529625-7ee10f7b09b6?q=80&w=1200", // Chhitkul
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200", // Parvati Valley
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200", // Golden Temple
];

export default function TripHighlightsList({
  title = "Trip Highlights",
  items,
  defaultItems,
}: TripHighlightsListProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const rawList =
    items && items.length > 0
      ? items
      : defaultItems && defaultItems.length > 0
        ? defaultItems
        : defaultSliderPhotos;

  const baseUrls = rawList
    .map((item) => {
      if (typeof item === "string") return normalizeImageUrl(item);
      const rawUrl =
        item.url || item.image || item.img || item.src || item.path || "";
      return rawUrl ? normalizeImageUrl(rawUrl) : undefined;
    })
    .filter((u): u is string => Boolean(u));

  const finalUrls = baseUrls.length > 0 ? baseUrls : defaultSliderPhotos;

  // Duplicate list to create a 100% continuous infinite loop
  const photoUrls = [...finalUrls, ...finalUrls];

  const handlePhotoClick = (index: number) => {
    setSelectedIndex(index % baseUrls.length);
    setIsGalleryOpen(true);
  };

  return (
    <section className="space-y-4 scroll-mt-28 overflow-hidden" id="highlights">
      {/* Inline Hardware Accelerated GPU Marquee Keyframe Styles */}
      <style jsx>{`
        @keyframes continuousMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: continuousMarquee 32s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Header Row */}
      <div className="border-b border-zinc-100 pb-2.5">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#0B1528] font-montserrat">
          Trip{" "}
          <span className="text-[#D4541A] font-caveat italic">Glimpses</span>
        </h2>
        <p className="text-xs text-[#D4541A] font-semibold font-caveat italic mt-0.5">
          Moments that stay with you, memories that last forever.
        </p>
      </div>

      {/* Hardware Accelerated GPU Marquee (100% Smooth 120fps No Lag) */}
      <div className="w-full overflow-hidden py-1">
        <div className="marquee-track flex gap-3">
          {photoUrls.map((url, i) => (
            <div
              key={i}
              onClick={() => handlePhotoClick(i)}
              className="shrink-0 w-[110px] sm:w-[138px] md:w-[158px] aspect-[4/3] rounded-[16px] md:rounded-[20px] overflow-hidden bg-zinc-100 shadow-xs border border-zinc-100/90 hover:scale-[1.03] transition-transform duration-300 cursor-pointer group relative"
            >
              <OptimizedImage
                src={
                  normalizeImageUrl(url) ||
                  defaultSliderPhotos[i % defaultSliderPhotos.length]
                }
                alt={`Trip Glimpse ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Subtext */}
      <div className="pt-1 flex items-center gap-2 text-xs text-zinc-500 font-montserrat">
        <Camera className="w-3.5 h-3.5 text-[#D4541A] shrink-0" />
        <span>
          Tag us <strong className="text-zinc-800">@trrabb</strong> and
          use <strong className="text-[#D4541A]">#Trrabb</strong> to get
          featured!
        </span>
      </div>

      {/* Lightbox Modal */}
      {isGalleryOpen && (
        <PhotoGalleryModal
          images={baseUrls}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}
    </section>
  );
}
