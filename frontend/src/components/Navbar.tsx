"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/components/DynamicThemeProvider";

import { BrandLogo, brandConfig } from "@/config/brand.config";

interface NavLink {
  id?: string;
  name?: string;
  label?: string;
  href: string;
}

const defaultNavLinks: NavLink[] = [
  { id: "nav-home", name: "Home", href: "/" },
  { id: "nav-trips", name: "Explore Trips", href: "/trips" },
  { id: "nav-about", name: "About Us", href: "/about-us" },
  { id: "nav-contact", name: "Contact", href: "/contact" },
];

interface NavbarProps {
  logoUrl?: string;
  navLinks?: NavLink[];
}

export default function Navbar({
  logoUrl,
  navLinks,
}: NavbarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { settings } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use props/defaults consistently across SSR and client pass to eliminate layout shift
  const rawLinks =
    navLinks && navLinks.length > 0
      ? navLinks
      : settings?.navbar?.links && settings.navbar.links.length > 0
        ? settings.navbar.links
        : defaultNavLinks;

  const resolvedNavLinks = rawLinks
    .map((link: any, idx: number) => ({
      id: link.id || `nav-${idx}-${link.href || "link"}`,
      name: link.name || link.label || "Link",
      href: link.href || "/",
    }))
    .filter(
      (link: any) =>
        !["Destinations", "Journal"].includes(link.name) &&
        !["/destinations", "/blogs"].includes(link.href),
    );

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
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 px-4 sm:px-6 md:px-10 flex items-center bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-[76px]",
        )}
      >
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
          {/* BRAND LOGO */}
          <Link
            href="/"
            className="relative z-[60] flex items-center justify-start shrink-0"
            onClick={() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; }}
          >
            <BrandLogo />
          </Link>

          {/* DESKTOP NAV LINKS */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-slate-700">
            {resolvedNavLinks.map((link: any) => {
              const isActive =
                pathname === link.href ||
                (link.href === "/trips" && pathname.startsWith("/trips"));
              return (
                <div
                  key={link.id}
                  className="relative flex flex-col items-center py-2"
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "transition-colors hover:text-blue-600",
                      isActive ? "text-blue-600 font-bold" : "text-slate-600",
                    )}
                  >
                    {link.name}
                  </Link>
                  {/* Active Blue Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 w-5 h-[2.5px] bg-blue-600 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT ACTION BUTTON: Plan Your Trip */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/trips"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            >
              Explore Trips
            </Link>
          </div>

          {/* MOBILE HAMBURGER BUTTON */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden relative z-[60] p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-slate-900" />
            ) : (
              <Menu className="w-6 h-6 text-slate-900" />
            )}
          </button>
        </div>
      </nav>

      {/* MOBILE FULL-SCREEN OVERLAY MENU */}
      <div
        className={cn(
          "fixed inset-0 bg-white z-[9998] transition-transform duration-300 md:hidden flex flex-col pt-24 px-6 sm:px-8 gap-4 overflow-y-auto",
          isMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col gap-1">
          {resolvedNavLinks.map((link: any) => (
            <Link
              key={link.id}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="text-base font-bold text-slate-800 hover:text-blue-600 min-h-[48px] flex items-center border-b border-slate-100 px-2 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <Link
          href="/trips"
          onClick={() => setIsMenuOpen(false)}
          className="mt-4 w-full min-h-[50px] bg-blue-600 text-white text-center font-bold text-base rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center active:scale-95 transition-transform"
        >
          Explore All Trips
        </Link>
      </div>
    </>
  );
}
