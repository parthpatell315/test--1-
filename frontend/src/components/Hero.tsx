"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Compass
} from "lucide-react";

interface HeroProps {
  tagline?: string;
  headlinePrefix?: string;
  headline?: string;
  rotatingWords?: string[] | string;
  subheadline?: string;
  subtitle?: string;
  backgroundImage?: string;
  backgroundImages?: string[];
  [key: string]: any;
}

const DEFAULT_ROTATING_WORDS = [
  "Travellers",
  "Explorers",
  "Adventurers",
  "Friends",
  "Families",
  "Colleagues",
];

const DEFAULT_HERO_SLIDES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=85", // Dramatic mountains
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85", // Peak adventure
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=85", // Starry night alpine
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920&q=85", // Bali tropical
  "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=1920&q=85", // Dubai skyline desert
];

const DESTINATIONS_LIST = [
  "All Destinations",
  "Spiti Valley",
  "Ladakh",
  "Meghalaya",
  "Vietnam",
  "Bali",
  "Thailand",
  "Kashmir",
  "Manali",
  "Goa",
  "Maldives",
  "Dubai",
  "Kerala",
  "Rajasthan",
  "Uttarakhand",
];

const MONTHS_LIST = [
  "Any Month",
  "October 2024",
  "November 2024",
  "December 2024",
  "January 2025",
  "February 2025",
  "March 2025",
  "April 2025",
  "May 2025",
  "June 2025",
];

const TRIP_TYPES_LIST = [
  "All Types",
  "Group Trip",
  "Custom Trip",
  "Flight Included",
  "Weekend Getaway",
];

export default function Hero({
  tagline,
  headlinePrefix,
  headline,
  rotatingWords,
  subheadline,
  subtitle,
  backgroundImage,
  backgroundImages,
}: HeroProps) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);

  // Search filter states
  const [selectedDestination, setSelectedDestination] = useState("All Destinations");
  const [selectedMonth, setSelectedMonth] = useState("Any Month");
  const [selectedType, setSelectedType] = useState("All Types");

  const imagesList: string[] = (() => {
    if (Array.isArray(backgroundImages) && backgroundImages.length > 0) {
      const valid = backgroundImages.filter(Boolean);
      if (valid.length > 0) return valid;
    }
    if (backgroundImage) return [backgroundImage];
    return DEFAULT_HERO_SLIDES;
  })();

  const rotWords: string[] = (() => {
    if (Array.isArray(rotatingWords)) return rotatingWords;
    if (typeof rotatingWords === "string" && rotatingWords.trim()) {
      return rotatingWords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
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
    }, 2400);
    return () => clearInterval(wordTimer);
  }, [rotWords.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedDestination !== "All Destinations") {
      params.set("destination", selectedDestination.toLowerCase().replace(/\s+/g, "-"));
    }
    if (selectedMonth !== "Any Month") {
      params.set("month", selectedMonth);
    }
    if (selectedType !== "All Types") {
      params.set("type", selectedType.toLowerCase().replace(/\s+/g, "-"));
    }
    const query = params.toString();
    router.push(query ? `/trips?${query}` : "/trips");
  };

  return (
    <div className="relative w-full mb-20 md:mb-16">
      {/* HERO BANNER CONTAINER */}
      <div className="relative w-full h-[460px] sm:h-[500px] md:h-[560px] lg:h-[600px] overflow-hidden bg-gray-900 font-sans flex items-center">
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0">
          <img
            src={imagesList[currentSlide % imagesList.length]}
            alt="Hero Expedition"
            fetchPriority="high"
            loading="eager"
            className="w-full h-full object-cover transition-all duration-1000 scale-105"
          />
          {/* Subtle Dark Gradient Overlay (Avian Look) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
        </div>

        {/* Carousel Control Arrows */}
        {imagesList.length > 1 && (
          <div className="hidden sm:block">
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + imagesList.length) % imagesList.length)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % imagesList.length)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-6 sm:px-10 md:px-14 pb-20 md:pb-24">
          <div className="max-w-2xl">
            {/* Avian Signature Heading: Experiences for [Rotating word] */}
            <h1 className="text-white font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight font-sans leading-tight">
              <span>Experiences for </span>
              <span className="inline-block relative overflow-hidden h-[1.25em] align-top text-[#EC1D24] font-black">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={rotWords[wordIdx % rotWords.length]}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="inline-block whitespace-nowrap"
                  >
                    {rotWords[wordIdx % rotWords.length]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <p className="text-gray-200 text-sm sm:text-base md:text-lg mt-3 md:mt-4 leading-relaxed font-normal max-w-xl">
              Curated itineraries, certified local trip leaders, and unforgettable group adventures across India and worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* FLOATING SIGNATURE SEARCH CARD (Avian Style) */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-30 -mt-16 sm:-mt-20 md:-mt-22">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-4 sm:p-5 md:p-6 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center"
        >
          {/* 1. Destination Field */}
          <div className="flex flex-col gap-1 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#EC1D24]" />
              Where to?
            </span>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="bg-transparent text-sm md:text-[15px] font-bold text-gray-900 outline-none cursor-pointer"
            >
              {DESTINATIONS_LIST.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Month Field */}
          <div className="flex flex-col gap-1 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border-t sm:border-t-0 sm:border-l border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#EC1D24]" />
              When?
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm md:text-[15px] font-bold text-gray-900 outline-none cursor-pointer"
            >
              {MONTHS_LIST.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Trip Type Field */}
          <div className="flex flex-col gap-1 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border-t lg:border-t-0 lg:border-l border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#EC1D24]" />
              Trip Type
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-sm md:text-[15px] font-bold text-gray-900 outline-none cursor-pointer"
            >
              {TRIP_TYPES_LIST.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Action Search Button */}
          <div className="pt-2 sm:pt-0">
            <button
              type="submit"
              className="w-full py-4 px-6 bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-sm md:text-base rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>Search Experiences</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
