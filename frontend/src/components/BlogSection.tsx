"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Blog } from "@/types";
import { normalizeImageUrl } from "@/lib/api";
import { useWheelPassThrough } from "@/lib/useWheelPassThrough";

import { brandConfig } from "@/config/brand.config";

interface BlogCardItem {
  id: string;
  title: string;
  slug: string;
  image: string;
  authorName: string;
  authorAvatar: string;
  readTime: string;
}

interface BlogSectionProps {
  blogs?: Blog[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_BLOG_STORIES: BlogCardItem[] = [
  {
    id: "blog-1",
    title: "The Winter Beauty of Kashmir: Snow Valleys & Frozen Lakes",
    slug: "winter-beauty-of-kashmir",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200",
    authorName: "Aditi Raval",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300",
    readTime: "7 min read",
  },
  {
    id: "blog-2",
    title: "8-Day Dubai Adventure: A Journey of Thrills & Luxury",
    slug: "dubai-adventure",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200",
    authorName: "Harsh Patel",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300",
    readTime: "6 min read",
  },
  {
    id: "blog-3",
    title: "Winter Spiti Valley Experience: Surviving -20°C in the Middle Land",
    slug: "winter-spiti-experience",
    image: "https://images.unsplash.com/photo-1596230529625-7ee10f7b09b6?q=80&w=1200",
    authorName: "Avdhesh Patel",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300",
    readTime: "5 min read",
  },
  {
    id: "blog-4",
    title: "Bhrigu Lake Trek: High Altitude Serenity & Alpine Meadows",
    slug: "bhrigu-lake-trek",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200",
    authorName: "Priya Shah",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300",
    readTime: "8 min read",
  },
];

export default function BlogSection({
  blogs = [],
  title,
  subtitle,
}: BlogSectionProps) {
  const displayTitle =
    !title ||
    title === "New journal" ||
    title === "Journal" ||
    title === "Blogs"
      ? "Travel"
      : title;
  const displaySubtitle = subtitle || "Journal & Guides";

  const apiMappedStories: BlogCardItem[] =
    blogs && blogs.length > 0
      ? blogs
          .map((b: any, idx: number) => {
            const rawAuthor = String(b.author || `Trrabb Editorial`);
            const cleanAuthor = rawAuthor.replace(/^by\s+/i, "");
            const rawImg = normalizeImageUrl(b.image) || "";
            const storyImg =
              rawImg && rawImg.startsWith("http") && !rawImg.includes("youthcamping")
                ? rawImg
                : DEFAULT_BLOG_STORIES[idx % DEFAULT_BLOG_STORIES.length].image;
            const storyAvatar =
              normalizeImageUrl(b.authorImage) ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300";

            return {
              id: b.id || b._id || `blog-${idx}`,
              title: b.title || "Travel Story",
              slug: b.slug || "",
              image: storyImg,
              authorName: cleanAuthor,
              authorAvatar: storyAvatar,
              readTime: b.readTime || "5 min read",
            };
          })
          .filter((s) => Boolean(s.title && s.slug))
      : [];

  const displayStories: BlogCardItem[] =
    apiMappedStories.length > 0 ? apiMappedStories : DEFAULT_BLOG_STORIES;
  const scrollRef = useRef<HTMLDivElement>(null);
  useWheelPassThrough(scrollRef);

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

  if (displayStories.length === 0) return null;

  return (
    <section className="relative overflow-hidden font-sans bg-white py-10 sm:py-12">
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12">
        {/* HEADER ROW WITH SLIDER CONTROLS */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 flex-nowrap">
          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden whitespace-nowrap">
            <h2 className="text-slate-900 font-sans font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight capitalize leading-tight">
              {displayTitle}
            </h2>
            <span className="font-extrabold text-blue-600 text-2xl sm:text-3xl md:text-4xl leading-tight shrink-0 capitalize pr-2 sm:pr-3">
              {displaySubtitle}
            </span>
          </div>

          <Link
            href="/blogs"
            prefetch={false}
            className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* HORIZONTAL CAROUSEL SLIDER (1.5 CARDS PER VIEW ON MOBILE) */}
        <div
          ref={scrollRef}
          className="carousel-track w-full max-w-full flex gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden no-scrollbar py-2 scroll-smooth snap-x snap-mandatory"
          style={{ touchAction: "pan-x" }}
        >
          {displayStories.map((story, idx) => (
            <motion.div
              key={story.id || idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex-none snap-start w-[62vw] min-w-[220px] max-w-[270px] sm:w-[320px] md:w-[340px] flex flex-col bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 isolate"
            >
              {/* TOP PHOTO CONTAINER */}
              <div className="relative w-full aspect-[16/10.5] bg-zinc-100 overflow-hidden">
                <Link
                  href={`/blogs/${story.slug}`}
                  prefetch={false}
                  className="absolute inset-0 z-10"
                  aria-label={story.title}
                />
                <img
                  src={story.image}
                  alt={story.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_BLOG_STORIES[idx % DEFAULT_BLOG_STORIES.length].image;
                  }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* BOOK ICON BADGE AT TOP-RIGHT */}
                <div className="absolute top-2.5 right-2.5 z-20 text-white/90 drop-shadow-md">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* CARD BODY WITH AVATAR, TITLE & AUTHOR/READ TIME */}
              <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2">
                <div className="flex gap-2.5 items-start w-full">
                  {/* AUTHOR AVATAR PHOTO */}
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shrink-0 border border-zinc-200 shadow-2xs">
                    <img
                      src={story.authorAvatar}
                      alt={story.authorName}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  {/* TITLE & FOOTER META */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <h3 className="text-[#1B2A4A] font-montserrat font-bold text-xs sm:text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-[#D4541A] transition-colors">
                      <Link href={`/blogs/${story.slug}`} prefetch={false}>
                        {story.title}
                      </Link>
                    </h3>

                    {/* AUTHOR NAME & READING TIME ROW */}
                    <div className="flex items-center justify-between font-montserrat text-[11px] text-[#999999] gap-1.5 pt-1 border-t border-zinc-100">
                      <span className="truncate">
                        by{" "}
                        <span className="text-[#666666] font-medium">
                          {story.authorName}
                        </span>
                      </span>
                      <span className="shrink-0 text-zinc-400 font-normal text-[10px]">
                        {story.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
