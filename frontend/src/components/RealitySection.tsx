"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";
import { normalizeImageUrl } from "@/lib/api";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";
import { WavyEdges } from "./ui/WavyEdges";
import { useIsMobile } from "@/hooks/useIsMobile";

interface RealityVideo {
  title: string;
  sub: string;
  img: string;
  url?: string;
  videoEnabled?: boolean;
  videoUrl?: string;
  videoPosterUrl?: string;
}

interface RealitySectionProps {
  title?: string;
  subtitle?: string;
  videos?: RealityVideo[];
  titleSize?: string | number;
  titleWeight?: string | number;
  topLabel?: string;
  titleStyle?: "standard" | "boxed";
  wavyEdges?: boolean;
  topColor?: string;
  bottomColor?: string;
}

const defaultVideos: RealityVideo[] = [
  {
    title: "Solo Traveler Experience",
    sub: "(Verified Review)",
    img: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=2070",
    url: "https://www.youtube.com/embed/j6hb-iOZalE",
  },
  {
    title: "Leh Ladakh",
    sub: "(Explore with us)",
    img: "https://images.unsplash.com/photo-1581793745862-99f579601e1b?q=80&w=2070",
    url: "https://www.youtube.com/embed/j6hb-iOZalE",
  },
  {
    title: "Travellers Experiences",
    sub: "(Real stories)",
    img: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?q=80&w=2070",
    url: "https://www.youtube.com/embed/j6hb-iOZalE",
  },
  {
    title: "Chopta - Chandrashila",
    sub: "(High peaks)",
    img: "https://images.unsplash.com/photo-1589133041042-45e03a958b45?q=80&w=2070",
    url: "https://www.youtube.com/embed/j6hb-iOZalE",
  },
];

export default function RealitySection({
  title = "The Reality Of A Trip",
  subtitle = "Watch the reality behind our trips, and real reviews by our users.",
  videos,
  titleSize,
  titleWeight,
  topLabel,
  titleStyle = "standard",
  wavyEdges = false,
  topColor = "#ffffff",
  bottomColor = "#ffffff",
}: RealitySectionProps) {
  const [activeVideo, setActiveVideo] = useState<{
    url: string;
    poster?: string;
  } | null>(null);
  const displayVideos = videos || [];
  if (displayVideos.length === 0) return null;
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const reduceMotion = prefersReducedMotion || isMobile;

  return (
    <section className="section-wrapper bg-transparent overflow-hidden relative !pb-2 md:!pb-3">
      {wavyEdges && <WavyEdges color={topColor} position="top" />}
      <div className="max-w-[1440px] mx-auto">
        {topLabel && <span className="section-label block">{topLabel}</span>}
        {title && (
          <div
            className={cn(
              "mb-4",
              titleStyle === "boxed" &&
                "p-6 md:px-10 md:py-8 rounded-[20px] md:rounded-[32px] border border-slate-200 bg-white shadow-sm max-w-fit",
            )}
          >
            <h2
              className="section-heading text-navy"
              style={{
                fontSize: titleSize
                  ? isNaN(Number(titleSize))
                    ? titleSize
                    : `${titleSize}px`
                  : undefined,
                fontWeight: titleWeight ? titleWeight : undefined,
              }}
            >
              {title}
            </h2>
          </div>
        )}
        {subtitle && (
          <p className="text-zinc-500 font-bold mb-12 tracking-widest text-[11px] md:text-sm capitalize">
            {subtitle}
          </p>
        )}

        <div className="flex gap-6 overflow-x-auto pb-4 snap-x no-scrollbar">
          {displayVideos.map((vid, i) => {
            const hasSelfHostedVideo = vid.videoEnabled && vid.videoUrl;
            return (
              <motion.div
                key={i}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { delay: i * 0.1 }}
                viewport={{ once: true }}
                onClick={() => {
                  if (hasSelfHostedVideo && vid.videoUrl) {
                    setActiveVideo({
                      url: vid.videoUrl,
                      poster: vid.videoPosterUrl || vid.img,
                    });
                  }
                }}
                role="button"
                aria-label={`Play review video for ${vid.title}`}
                className={cn(
                  "relative aspect-[16/8.5] md:aspect-[21/9] rounded-[20px] md:rounded-[32px] overflow-hidden group snap-start cursor-pointer shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.18)] hover:-translate-y-1.5 transition-all duration-500 shrink-0 border-0",
                  displayVideos.length > 1
                    ? "w-[85vw] max-w-[340px] md:min-w-[500px]"
                    : "w-full",
                  !hasSelfHostedVideo && "cursor-default pointer-events-none",
                )}
              >
                <OptimizedImage
                  src={
                    normalizeImageUrl(vid.img) ||
                    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=2070"
                  }
                  alt={vid.title}
                  cloudinaryWidth={800}
                  bunnyVariant="x540gt"
                  sizes="(max-width: 768px) 85vw, 500px"
                  className="w-full h-full object-cover transition-transform duration-700 scale-[1.02] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all flex flex-col items-center justify-center text-center p-6">
                  {hasSelfHostedVideo && (
                    <motion.div
                      whileHover={reduceMotion ? {} : { scale: 1.1 }}
                      whileTap={reduceMotion ? {} : { scale: 0.9 }}
                      className="hidden md:flex w-20 h-20 bg-red-600 rounded-full items-center justify-center text-white mb-6 shadow-2xl shadow-red-600/40"
                    >
                      <Play className="w-10 h-10 fill-white" />
                    </motion.div>
                  )}
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-1 drop-shadow-2xl tracking-tight">
                    {vid.title}
                  </h3>
                  <p className="text-white/80 text-[10px] font-bold tracking-[0.3em] drop-shadow-lg">
                    {vid.sub}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Video Modal Overlay */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-20"
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-10 h-10" />
            </button>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl aspect-video bg-black rounded-2xl md:rounded-[40px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            >
              <video
                src={normalizeImageUrl(activeVideo.url)}
                controls
                autoPlay
                playsInline
                loop
                muted
                preload="metadata"
                poster={
                  activeVideo.poster
                    ? normalizeImageUrl(activeVideo.poster)
                    : undefined
                }
                className="w-full h-full border-0 outline-none focus:outline-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {wavyEdges && <WavyEdges color={bottomColor} position="bottom" />}
    </section>
  );
}
