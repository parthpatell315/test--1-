"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  X, 
  Search, 
  Compass, 
  Sparkles, 
  Package, 
  Globe2,
  Calendar,
  Send
} from "lucide-react";
import { BrandLogo, brandConfig } from "@/config/brand.config";

interface NavbarProps {
  logoUrl?: string;
  navLinks?: any[];
}

export default function Navbar({
  logoUrl,
  navLinks,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active Mode: 'packages' | 'group' | 'custom'
  const activeMode = pathname.includes("/group") 
    ? "group" 
    : pathname.includes("/custom") 
      ? "custom" 
      : "packages";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/trips?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-md border-b border-gray-200/90 transition-all">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 md:px-8 h-[72px] md:h-[76px] flex items-center justify-between gap-4">
          
          {/* LEFT: BRAND LOGO */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
            onClick={() => {
              window.scrollTo(0, 0);
              document.documentElement.scrollTop = 0;
            }}
          >
            <BrandLogo />
          </Link>

          {/* CENTER: MODE SWITCHER PILLS (Avian Signature Feature) */}
          <div className="hidden lg:flex items-center bg-[#F1F3F5] p-1 rounded-full border border-gray-200/80 shadow-xs">
            <Link
              href="/trips"
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                activeMode === "packages"
                  ? "bg-white text-[#EC1D24] shadow-sm font-bold scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <Package className="w-4 h-4 text-[#EC1D24]" />
              <span>Tour Packages</span>
            </Link>

            <Link
              href="/trips?type=group"
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                activeMode === "group"
                  ? "bg-white text-[#EC1D24] shadow-sm font-bold scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <Sparkles className="w-4 h-4 text-[#EC1D24]" />
              <span>Group Trips</span>
            </Link>

            <Link
              href="/trips?type=custom"
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                activeMode === "custom"
                  ? "bg-white text-[#EC1D24] shadow-sm font-bold scale-[1.02]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <Compass className="w-4 h-4 text-[#EC1D24]" />
              <span>Custom Trips</span>
            </Link>
          </div>

          {/* CENTER-RIGHT: SEARCH BAR (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <input
                type="text"
                placeholder="Search destinations, tours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-gray-900 placeholder:text-gray-400 text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-full border border-gray-200 focus:border-[#EC1D24] focus:ring-1 focus:ring-[#EC1D24] outline-none transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>
          </div>

          {/* RIGHT: CURRENCY BADGE & CTA */}
          <div className="flex items-center gap-3">
            {/* Currency Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-200">
              <span className="text-sm">🇮🇳</span>
              <span>INR</span>
            </div>

            {/* Red Action Button */}
            <Link
              href="/trips"
              className="px-5 py-2.5 bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-md shadow-red-500/20 hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            >
              <span>Explore Trips</span>
            </Link>

            {/* MOBILE SEARCH TOGGLE */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-[#EC1D24] transition-colors"
              aria-label="Toggle search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* MOBILE HAMBURGER BUTTON */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-900 active:scale-95 transition-transform"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* MOBILE EXPANDED SEARCH ROW */}
        {isSearchOpen && (
          <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-100 bg-white animate-in slide-in-from-top-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Search destinations, tours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 text-gray-900 text-sm pl-9 pr-4 py-2.5 rounded-full border border-gray-200 focus:border-[#EC1D24] outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>
          </div>
        )}
      </header>

      {/* MOBILE FULL-SCREEN OVERLAY MENU */}
      <div
        className={cn(
          "fixed inset-0 bg-white z-40 transition-transform duration-300 md:hidden flex flex-col pt-24 px-6 gap-6 overflow-y-auto",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Mobile Mode Switcher */}
        <div className="flex flex-col gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
          <Link
            href="/trips"
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              activeMode === "packages" ? "bg-white text-[#EC1D24] shadow-xs font-bold" : "text-gray-700"
            )}
          >
            <Package className="w-5 h-5 text-[#EC1D24]" />
            <span>Tour Packages</span>
          </Link>
          <Link
            href="/trips?type=group"
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              activeMode === "group" ? "bg-white text-[#EC1D24] shadow-xs font-bold" : "text-gray-700"
            )}
          >
            <Sparkles className="w-5 h-5 text-[#EC1D24]" />
            <span>Group Trips</span>
          </Link>
          <Link
            href="/trips?type=custom"
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              activeMode === "custom" ? "bg-white text-[#EC1D24] shadow-xs font-bold" : "text-gray-700"
            )}
          >
            <Compass className="w-5 h-5 text-[#EC1D24]" />
            <span>Custom Trips</span>
          </Link>
        </div>

        <div className="flex flex-col gap-1 border-t border-gray-100 pt-4">
          <Link
            href="/trips"
            onClick={() => setIsMenuOpen(false)}
            className="text-base font-bold text-gray-800 hover:text-[#EC1D24] py-3 border-b border-gray-100"
          >
            All Experiences
          </Link>
          <Link
            href="/about-us"
            onClick={() => setIsMenuOpen(false)}
            className="text-base font-bold text-gray-800 hover:text-[#EC1D24] py-3 border-b border-gray-100"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            onClick={() => setIsMenuOpen(false)}
            className="text-base font-bold text-gray-800 hover:text-[#EC1D24] py-3 border-b border-gray-100"
          >
            Contact Concierge
          </Link>
        </div>

        <div className="mt-auto pb-8">
          <Link
            href="/trips"
            onClick={() => setIsMenuOpen(false)}
            className="w-full py-3.5 bg-[#EC1D24] text-white text-center font-bold text-base rounded-full shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
          >
            <span>Explore All Trips</span>
          </Link>
        </div>
      </div>
    </>
  );
}
