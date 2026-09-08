"use client";

import { useState, useEffect, useRef } from "react";
import { normalizeImageUrl } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface CTASliderProps {
  title?: string;
  showTitle?: boolean;
  videoUrl?: string;
  mediaList?: string[];
  videoPosterUrl?: string;
  borderRadius?: string;
  topColor?: string;
  bottomColor?: string;
  [key: string]: any;
}

export default function CTASlider({
  title = "",
  showTitle = false,
  videoUrl,
  mediaList = [],
  borderRadius = "rounded-[24px]",
  topColor = "#ffffff",
  bottomColor = "#ffffff",
}: CTASliderProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackImg = "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1600&q=85";
  const [mediaError, setMediaError] = useState(false);

  // Parse media list items (videos or photos)
  const items: string[] = (() => {
    const list: string[] = [];
    if (Array.isArray(mediaList) && mediaList.length > 0) {
      mediaList.forEach((m) => {
        const norm = normalizeImageUrl(m);
        if (norm && !norm.includes("youthcamping") && !list.includes(norm)) list.push(norm);
      });
    }
    if (videoUrl) {
      const norm = normalizeImageUrl(videoUrl);
      if (norm && !norm.includes("youthcamping") && !list.includes(norm)) list.unshift(norm);
    }
    return list;
  })();

  const currentMedia = items.length > 0 ? items[activeIdx % items.length] : "";
  const isVideo = (url: string) =>
    url && (/\.(mp4|webm|mov|ogg)$/i.test(url) || url.includes("/video/"));
  const isYouTube = (url: string) => url && /youtube\.com|youtu\.be/.test(url);
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % items.length);
      setMediaError(false);
    }, 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  // If no valid media items exist, hide the section completely to avoid rendering empty dark box
  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden font-sans bg-white pt-6 pb-6 sm:pt-10 sm:pb-10">
      {/* Two-tone background transition: top half white, bottom half grey (#E2E7ED) */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#E2E7ED] z-0" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {showTitle && title && (
          <div className="mb-4 text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1528] tracking-tight">
              {title}
            </h2>
          </div>
        )}

        <div
          ref={containerRef}
          className={`relative w-full max-w-[1280px] h-[200px] sm:h-[280px] md:h-[360px] lg:h-[400px] overflow-hidden bg-zinc-900 mx-auto shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${borderRadius === "rounded-[24px]" ? "rounded-[28px] md:rounded-[36px]" : borderRadius}`}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentMedia + (mediaError ? "-fallback" : "")}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="w-full h-full relative"
            >
              {mediaError ? (
                <img
                  src={fallbackImg}
                  alt={title || "Trrabb Adventure"}
                  className="w-full h-full object-cover object-center"
                />
              ) : isYouTube(currentMedia) ? (
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none rounded-inherit">
                  <iframe
                    className="absolute top-1/2 left-1/2 w-[250%] h-[250%] max-w-none -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    src={`https://www.youtube.com/embed/${getYouTubeId(currentMedia)}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeId(currentMedia)}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1`}
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : isVideo(currentMedia) ? (
                <video
                  src={currentMedia}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  disablePictureInPicture
                  onError={() => setMediaError(true)}
                  className="hide-native-video-play w-full h-full object-cover object-center"
                />
              ) : (
                <img
                  src={currentMedia}
                  alt={title || "CTA Banner"}
                  onError={() => setMediaError(true)}
                  className="w-full h-full object-cover object-center"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
