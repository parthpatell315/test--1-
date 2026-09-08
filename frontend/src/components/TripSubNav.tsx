"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TripSubNavProps {
  sections: { id: string; label: string }[];
}

export default function TripSubNav({ sections }: TripSubNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const [isSticky, setIsSticky] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const stickyObserver = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    stickyObserver.observe(sentinel);
    return () => stickyObserver.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    );
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollState();
    const handleScroll = () => checkScrollState();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", checkScrollState);

    const ro = new ResizeObserver(() => checkScrollState());
    ro.observe(el);

    const fontsReady = document.fonts?.ready?.then(() => checkScrollState());

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollState);
      ro.disconnect();
      void fontsReady;
    };
  }, [sections, checkScrollState]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // Shift+wheel is a desktop horizontal-scroll convention.
      if (e.shiftKey && absY > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        return;
      }

      // Vertical-dominant: do not preventDefault — let the page scroll.
      if (absY >= absX) return;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (!activeSection || !scrollContainerRef.current) return;
    const activeBtn = scrollContainerRef.current.querySelector(
      `[data-section="${activeSection}"]`,
    );
    if (!activeBtn) return;

    const container = scrollContainerRef.current;
    const btnLeft = (activeBtn as HTMLElement).offsetLeft;
    const btnWidth = (activeBtn as HTMLElement).offsetWidth;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    container.scrollTo({
      left: btnLeft - container.offsetWidth / 2 + btnWidth / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeSection]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (!element) return;

    const isMob = window.innerWidth < 768;
    const offset = isMob ? 124 : 128;
    const elementPosition =
      element.getBoundingClientRect().top + window.pageYOffset;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: elementPosition - offset,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction === "left" ? -(el.clientWidth * 0.6) : el.clientWidth * 0.6,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <>
      <div ref={sentinelRef} className="h-0" aria-hidden="true" />

      <nav
        ref={navRef}
        aria-label="On this trip"
        className={cn(
          "sticky top-[80px] z-[9990] bg-white",
          isSticky && "shadow-[0_6px_16px_-12px_rgba(11,21,40,0.45)]",
        )}
      >
        <div className="relative">
          {canScrollLeft && (
            <div className="absolute left-0 inset-y-0 z-20 w-12 bg-gradient-to-r from-white via-white/85 to-transparent pointer-events-none flex items-center">
              <button
                type="button"
                onClick={() => scrollByAmount("left")}
                aria-label="Show previous sections"
                className="pointer-events-auto ml-0 flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            </div>
          )}

          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="relative z-[1] flex items-end gap-5 overflow-x-auto no-scrollbar w-full select-none overscroll-x-contain scroll-smooth"
          >
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  data-section={section.id}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(e) => {
                    if (hasDraggedRef.current) {
                      e.preventDefault();
                      return;
                    }
                    scrollToSection(section.id);
                  }}
                  className={cn(
                    "group relative shrink-0 whitespace-nowrap pb-2 pt-1.5 font-montserrat text-[11px] sm:text-xs font-semibold tracking-[0.1em] transition-colors cursor-pointer",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                    isActive
                      ? "text-blue-600"
                      : "text-slate-400 hover:text-slate-900",
                  )}
                >
                  {section.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 bottom-0 z-[1] h-[2.5px] w-[14px] rounded-full bg-blue-600 transition-transform duration-200 origin-center",
                      isActive
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-100 group-hover:scale-x-75 group-hover:opacity-40",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {canScrollRight && (
            <div className="absolute right-0 inset-y-0 z-20 w-12 bg-gradient-to-l from-white via-white/85 to-transparent pointer-events-none flex items-center justify-end">
              <button
                type="button"
                onClick={() => scrollByAmount("right")}
                aria-label="Show more sections"
                className="pointer-events-auto mr-0 flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            </div>
          )}

          {/* Trail path — the index sits on this line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-zinc-200/90"
          />
        </div>
      </nav>
    </>
  );
}
