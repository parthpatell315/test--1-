"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroProps {
  tagline?: string;
  headlinePrefix?: string;
  headline?: string;
  strikethroughWord?: string;
  rotatingWords?: string[] | string;
  subheadline?: string;
  subtitle?: string;
  backgroundImage?: string;
  backgroundImages?: string[];
  [key: string]: any;
}

const DEFAULT_ROTATING_WORDS = [
  "Curious",
  "Adventurous",
  "Wanderlust-Struck",
  "Colleagues",
  "Strangers",
  "Restless",
];

export default function Hero({
  tagline,
  headlinePrefix,
  headline,
  strikethroughWord,
  rotatingWords,
  subheadline,
  subtitle,
  backgroundImage,
  backgroundImages,
}: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);

  const imagesList: string[] = (() => {
    if (Array.isArray(backgroundImages) && backgroundImages.length > 0)
      return backgroundImages;
    if (backgroundImage) return [backgroundImage];
    return [];
  })();

  const rotWords: string[] = (() => {
    if (Array.isArray(rotatingWords)) return rotatingWords;
    if (typeof rotatingWords === "string" && rotatingWords.trim()) {
      return rotatingWords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (rotatingWords === null || rotatingWords === undefined) return [];
    return DEFAULT_ROTATING_WORDS;
  })();

  useEffect(() => {
    if (imagesList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % imagesList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [imagesList.length]);

  useEffect(() => {
    if (rotWords.length <= 1) return;
    const wordTimer = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % rotWords.length);
    }, 2200);
    return () => clearInterval(wordTimer);
  }, [rotWords.length]);

  const activeImg = imagesList.length
    ? imagesList[currentSlide % imagesList.length]
    : "";
  const displayTagline = tagline || "EXPLORE. CONNECT. BELONG.";
  const displayHeadline = headlinePrefix || headline || "Trips for the";
  const displaySubheadline =
    subheadline ||
    subtitle ||
    "Pick a month and explore group adventures that bring stories to life.";

  const nextSlide = () => {
    if (imagesList.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % imagesList.length);
  };
  const prevSlide = () => {
    if (imagesList.length <= 1) return;
    setCurrentSlide(
      (prev) => (prev - 1 + imagesList.length) % imagesList.length,
    );
  };

  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[78vh] min-h-[440px] md:min-h-[540px] max-h-[720px] overflow-hidden bg-zinc-900 font-montserrat flex items-center">
      {/* BACKGROUND IMAGE SLIDE */}
      <div className="absolute inset-0 z-0">
        {activeImg ? (
          <img
            src={activeImg}
            alt=""
            fetchPriority="high"
            loading="eager"
            className="w-full h-full object-cover transition-opacity duration-1000"
          />
        ) : (
          <div className="w-full h-full bg-[#0B1528]" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.65) 55%, rgba(0, 0, 0, 0.35) 100%)",
          }}
        />
      </div>

      {/* CHEVRONS */}
      {imagesList.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-blue-600 text-white flex items-center justify-center transition-all border border-white/20 shadow-lg cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextSlide}
            aria-label="Next Slide"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-blue-600 text-white flex items-center justify-center transition-all border border-white/20 shadow-lg cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* HERO CONTENT OVERLAY */}
      <div className="relative z-20 max-w-[1440px] w-full mx-auto px-6 sm:px-10 md:px-14">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-[760px] text-left"
        >
          {/* TOP TAGLINE */}
          {displayTagline && (
            <p className="text-blue-400 font-extrabold text-xs sm:text-sm tracking-[2.5px] uppercase mb-3 font-montserrat flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse" />
              {displayTagline}
            </p>
          )}

          {/* HEADLINE */}
          <h1 className="text-white font-extrabold text-[32px] sm:text-[44px] md:text-[54px] lg:text-[60px] leading-[1.15] tracking-tight font-montserrat mb-3 drop-shadow-xl">
            <span className="block">{displayHeadline}</span>
            {(Boolean(strikethroughWord) || rotWords.length > 0) && (
              <span className="flex items-center gap-2.5 sm:gap-3.5 flex-nowrap mt-0.5 whitespace-nowrap">
                {strikethroughWord ? (
                  <span className="relative inline-block text-white whitespace-nowrap">
                    {strikethroughWord}
                    <svg
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-[114%] h-[24px] sm:h-[34px] md:h-[42px] text-blue-400 pointer-events-none overflow-visible"
                      viewBox="0 0 120 30"
                      fill="none"
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
                ) : null}

                {rotWords.length > 0 && (
                  <span className="inline-flex relative overflow-hidden h-[42px] sm:h-[58px] md:h-[72px] items-center whitespace-nowrap pr-2 sm:pr-3">
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={rotWords[wordIdx % rotWords.length]}
                        initial={{ y: 35, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -35, opacity: 0 }}
                        transition={{
                          duration: 0.45,
                          ease: [0.25, 0.1, 0.25, 1.0],
                        }}
                        className="text-blue-400 font-black inline-block whitespace-nowrap"
                      >
                        {rotWords[wordIdx % rotWords.length]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                )}
              </span>
            )}
          </h1>

          {/* SUBTITLE */}
          {displaySubheadline && (
            <p className="text-slate-200 text-sm sm:text-base md:text-lg font-montserrat font-medium leading-relaxed max-w-[580px] drop-shadow-md mt-2">
              {displaySubheadline}
            </p>
          )}
        </motion.div>

        {/* BOTTOM PAGINATION DOTS */}
        {imagesList.length > 1 && (
          <div className="flex items-center gap-2.5 mt-8">
            {imagesList.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setCurrentSlide(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  dotIdx === currentSlide
                    ? "w-8 h-2.5 bg-blue-500"
                    : "w-2.5 h-2.5 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
