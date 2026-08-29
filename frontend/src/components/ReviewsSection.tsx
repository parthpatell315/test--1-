"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Camera,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeImageUrl } from "@/lib/api";
import { useWheelPassThrough } from "@/lib/useWheelPassThrough";

interface GoogleReviewItem {
  id: string;
  name: string;
  avatar: string;
  badge?: string;
  tripName: string;
  date: string;
  rating: number;
  comment: string;
  photos?: string[];
}

interface ReviewsSectionProps {
  reviews?: any[];
  title?: string;
}

export default function ReviewsSection({
  reviews,
  title,
}: ReviewsSectionProps) {
  const displayTitle =
    !title ||
    title === "New reviews" ||
    title === "Reviews" ||
    title.toLowerCase().includes("review")
      ? "What Travelers Say"
      : title;
  const scrollRef = useRef<HTMLDivElement>(null);
  useWheelPassThrough(scrollRef);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<GoogleReviewItem | null>(
    null,
  );

  const apiMappedReviews: GoogleReviewItem[] =
    reviews && reviews.length > 0
      ? reviews
          .map((r: any, idx: number) => ({
            id: r._id || r.id || `gr-${idx}`,
            name: r.userName || r.author || r.name || "",
            badge: r.tripType || r.badge || "",
            tripName: r.tripName || r.trip || r.city || "",
            date: r.createdAt
              ? new Date(r.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })
              : r.date || "",
            avatar: normalizeImageUrl(r.userImage || r.avatar) || "",
            comment: r.comment || r.text || "",
            rating: Number(r.rating) || 0,
            photos:
              r.photos && r.photos.length > 0
                ? r.photos
                : r.images && r.images.length > 0
                  ? r.images
                  : r.photo
                    ? [r.photo]
                    : [],
          }))
          .filter((r) => r.comment.trim().length > 0 && r.name.trim().length > 0)
      : [];

  const displayReviews: GoogleReviewItem[] = apiMappedReviews;

  const nudge = (dir: "l" | "r") => {
    if (scrollRef.current) {
      const cardEl = scrollRef.current.firstElementChild as HTMLElement | null;
      const cardWidth = cardEl ? cardEl.offsetWidth : 320;
      const scrollAmount = cardWidth + 24;
      scrollRef.current.scrollBy({
        left: dir === "l" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="testimonials testimonials-slider module-center bg-white pt-3 pb-8 md:pt-4 md:pb-10 font-montserrat">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12">
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 flex-nowrap">
          <h2 className="text-[#1B2A4A] font-montserrat font-black text-2xl sm:text-3xl md:text-4xl lg:text-[40px] tracking-tight capitalize leading-tight">
            {displayTitle}
          </h2>

          <Link
            href="/reviews"
            prefetch={false}
            className="group inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-[15px] font-bold text-[#0B1528] hover:text-[#D4541A] transition-colors whitespace-nowrap shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4541A] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {displayReviews.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6">No reviews yet</p>
        ) : (
        <div
          ref={scrollRef}
          className="carousel-track w-full max-w-full flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2 scroll-smooth snap-x snap-mandatory"
        >
          {displayReviews.map((rev, idx) => {
            const rawPhotos = rev.photos || [];
            const photoList = rawPhotos
              .map((p: string) =>
                typeof p === "string" ? normalizeImageUrl(p) || p : "",
              )
              .filter(
                (p: string) =>
                  Boolean(p) && (p.startsWith("http") || p.startsWith("/")),
              );
            const extraCount = photoList.length > 3 ? photoList.length - 3 : 0;

            return (
              <motion.div
                key={rev.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="flex-none snap-start w-[62vw] min-w-[220px] max-w-[270px] sm:w-[320px] md:w-[340px] bg-white border border-[#0B1528]/12 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(11,21,40,0.06)] hover:border-[#0B1528]/22 hover:shadow-[0_8px_22px_rgba(11,21,40,0.10)] transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex flex-col gap-3 p-3.5 sm:p-5 pb-3.5 sm:pb-4">
                  {/* USER HEADER ROW */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 border border-zinc-100 shadow-2xs">
                      <img
                        src={rev.avatar}
                        alt={rev.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <h3 className="min-w-0 font-bold text-[#0B1528] text-sm sm:text-base leading-snug font-montserrat capitalize break-words">
                        {rev.name}
                      </h3>
                      {rev.badge && (
                        <span className="text-[#888888] font-medium text-[11px] sm:text-xs leading-snug">
                          {rev.badge}
                        </span>
                      )}

                      <div className="flex min-w-0 items-start gap-1 text-xs leading-snug text-[#777777]">
                        <span className="shrink-0">Booked:</span>
                        <span className="min-w-0 break-words font-bold text-[#0B1528] leading-snug line-clamp-2 hover:text-[#D4541A] transition-colors cursor-pointer">
                          {rev.tripName}
                          <ExternalLink className="ml-0.5 inline h-3 w-3 shrink-0 align-[-0.125em] text-[#0B1528]" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RATING STARS */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-3.5 items-center gap-0.5">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 shrink-0 fill-[#FFB800] text-[#FFB800]"
                        />
                      ))}
                    </div>
                    <span className="text-[#777777] font-medium text-xs leading-none">
                      {rev.date}
                    </span>
                  </div>

                  {/* COMMENT & TOGGLE */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[#1B2A4A] font-normal text-xs sm:text-sm leading-relaxed font-montserrat line-clamp-3">
                      {rev.comment}
                    </p>
                    {rev.comment && rev.comment.length > 80 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReview(rev);
                        }}
                        className="inline-flex items-center self-start font-semibold text-xs leading-none text-[#FF4D00] hover:underline cursor-pointer"
                      >
                        Read More
                      </button>
                    )}
                  </div>
                </div>

                {/* DYNAMIC PHOTO GALLERY GRID */}
                {photoList.length > 0 && (
                  <div className="mx-px mb-px overflow-hidden rounded-b-[15px] bg-zinc-100 border-t border-[#0B1528]/8">
                    {photoList.length === 1 ? (
                      /* SINGLE PHOTO */
                      <div
                        onClick={() => setSelectedPhoto(photoList[0])}
                        className="relative aspect-[16/10] overflow-hidden bg-zinc-100 cursor-pointer group/img"
                      >
                        <img
                          src={photoList[0]}
                          alt={`Review photo by ${rev.name}`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                    ) : photoList.length === 2 ? (
                      /* 2 PHOTOS SIDE BY SIDE */
                      <div className="grid grid-cols-2 gap-1.5">
                        {photoList.map((imgUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setSelectedPhoto(imgUrl)}
                            className="relative aspect-[4/3] overflow-hidden bg-zinc-100 cursor-pointer group/img"
                          >
                            <img
                              src={imgUrl}
                              alt={`Review photo by ${rev.name}`}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* 3+ PHOTOS MOSAIC GRID WITH +N OVERLAY */
                      <div className="grid grid-cols-2 gap-1.5">
                        <div
                          onClick={() => setSelectedPhoto(photoList[0])}
                          className="relative aspect-[3/4] sm:aspect-[3/3.8] overflow-hidden bg-zinc-100 cursor-pointer group/img"
                        >
                          <img
                            src={photoList[0]}
                            alt={`Review photo by ${rev.name}`}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <div
                            onClick={() => setSelectedPhoto(photoList[1])}
                            className="relative aspect-[16/9.5] overflow-hidden bg-zinc-100 cursor-pointer group/img flex-1"
                          >
                            <img
                              src={photoList[1]}
                              alt={`Review photo 2 by ${rev.name}`}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          </div>

                          <div
                            onClick={() => setSelectedPhoto(photoList[2])}
                            className="relative aspect-[16/9.5] overflow-hidden bg-zinc-100 cursor-pointer group/img flex-1"
                          >
                            <img
                              src={photoList[2]}
                              alt={`Review photo 3 by ${rev.name}`}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            {extraCount > 0 && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-xs sm:text-sm font-montserrat">
                                +{extraCount} More
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        )}
      </div>

      {/* PHOTO LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Enlarged review photo"
                className="max-w-full max-h-[85vh] object-contain"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL REVIEW MODAL */}
      <AnimatePresence>
        {selectedReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReview(null)}
            className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
            >
              <button
                onClick={() => setSelectedReview(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 mb-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 border border-zinc-200">
                  <img
                    src={selectedReview.avatar}
                    alt={selectedReview.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[#111827] text-lg capitalize">
                      {selectedReview.name}
                    </h4>
                    {selectedReview.badge && (
                      <span className="text-[#888888] font-medium text-sm">
                        {selectedReview.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm font-medium mt-0.5">
                    Booked:{" "}
                    <span className="font-bold text-[#111827]">
                      {selectedReview.tripName}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(selectedReview.rating || 5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-[#FFB800] text-[#FFB800]"
                    />
                  ))}
                </div>
                <span className="text-[#777777] text-xs font-medium">
                  {selectedReview.date}
                </span>
              </div>

              <p className="text-[#111827] font-normal text-base leading-relaxed mb-6">
                {selectedReview.comment}
              </p>

              {selectedReview.photos && selectedReview.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {selectedReview.photos.map((img, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] rounded-[18px] overflow-hidden bg-zinc-100"
                    >
                      <img
                        src={img}
                        alt="Photo"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
