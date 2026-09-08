"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { BrandLogo, brandConfig } from "@/config/brand.config";

// ─── Types matching the backend FooterConfig shape ───────────────────────────

interface LinkItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

interface ColumnItem {
  id: string;
  title: string;
  visible: boolean;
  links: LinkItem[];
}

interface SocialLink {
  platform: string;
  url: string;
}

interface FooterConfig {
  brandName?: string;
  address?: string;
  phone?: string;
  email?: string;
  copyright?: string;
  logoUrl?: string;
  showSocial?: boolean;
  showAddress?: boolean;
  showContact?: boolean;
  showCopyright?: boolean;
  socialLinks?: SocialLink[];
  columns?: ColumnItem[];
  newsletterHeading?: string;
}

interface FooterProps {
  footerConfig?: FooterConfig | null;
}

// ─── Static fallbacks (shown when backend returns nothing) ───────────────────

const DEFAULT_COLUMNS: ColumnItem[] = [
  {
    id: "explore",
    title: "Explore",
    visible: true,
    links: [
      { id: "e1", label: "All Trips & Tours", href: "/trips", visible: true },
      { id: "e2", label: "Destinations", href: "/trips", visible: true },
      { id: "e3", label: "Travel Blogs", href: "/blogs", visible: true },
      { id: "e4", label: "Help & FAQs", href: "/questions", visible: true },
    ],
  },
  {
    id: "company",
    title: "Company",
    visible: true,
    links: [
      { id: "c1", label: "About Us", href: "/about-us", visible: true },
      { id: "c2", label: "Contact Support", href: "/contact", visible: true },
      {
        id: "c3",
        label: "Terms & Conditions",
        href: "/terms-and-conditions",
        visible: true,
      },
      {
        id: "c4",
        label: "Privacy Policy",
        href: "/privacy-policy",
        visible: true,
      },
    ],
  },
];

const DEFAULT_SOCIAL: SocialLink[] = [
  { platform: "instagram", url: "https://instagram.com/trrabb" },
  { platform: "facebook", url: "https://facebook.com/trrabb" },
  { platform: "youtube", url: "https://youtube.com/trrabb" },
];

const LEGAL_LINKS = [
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/cancellation-policy", label: "Cancellation" },
  { href: "/sitemap", label: "Sitemap" },
];

// ─── Style helpers ───────────────────────────────────────────────────────────

const linkClass = cn(
  "block py-1 text-[13px] font-medium leading-snug text-slate-400",
  "transition-[color,transform,opacity] duration-200 ease-out",
  "hover:text-white hover:translate-x-0.5",
  "focus-visible:outline-none focus-visible:text-white",
  "motion-reduce:transition-none motion-reduce:hover:translate-x-0",
);

const socialClass = cn(
  "inline-flex h-9 w-9 items-center justify-center",
  "rounded-xl border border-white/10 bg-white/5 text-slate-300",
  "transition-[color,border-color,background-color] duration-200 ease-out",
  "hover:border-[#EC1D24] hover:bg-red-500/15 hover:text-[#EC1D24]",
  "focus-visible:outline-none focus-visible:border-[#EC1D24] focus-visible:text-[#EC1D24]",
  "motion-reduce:transition-none",
);

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200">
      <span className="h-px w-3.5 shrink-0 bg-[#EC1D24]" aria-hidden />
      {children}
    </h3>
  );
}

// ─── Social icon SVGs ────────────────────────────────────────────────────────

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram":
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.592 9 4.876V8z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "twitter":
    case "x":
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
  }
}

// ─── Main Footer Component ───────────────────────────────────────────────────

export default function Footer({ footerConfig }: FooterProps = {}) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const cfg = footerConfig || {};

  const brandName = "Trrabb";
  const email = cfg.email || brandConfig.supportEmail || "contact@trrabb.com";
  const copyright = "All Rights Reserved.";
  const showSocial = cfg.showSocial !== false;
  const showCopyright = cfg.showCopyright !== false;
  const newsletterHeading = cfg.newsletterHeading || "Join our community";

  const socialLinks =
    Array.isArray(cfg.socialLinks) && cfg.socialLinks.length > 0
      ? cfg.socialLinks
      : brandConfig.socialLinks;

  const rawColumns =
    Array.isArray(cfg.columns) && cfg.columns.length > 0
      ? cfg.columns.filter((c) => c.visible && c.links && c.links.some((l) => l.visible))
      : DEFAULT_COLUMNS;

  // Cap visible links per column to max 5 to maintain a clean, minimal footer
  const columns = rawColumns.map((col) => ({
    ...col,
    links: (col.links || []).filter((l) => l.visible).slice(0, 5),
  }));

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="relative z-20 border-t border-slate-800 bg-[#0F172A] font-sans text-white">
      <div className="mx-auto max-w-[1280px] min-w-0 px-6 pt-12 pb-8 sm:px-10">
        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-0">
          {/* Brand Column */}
          <div className="min-w-0 space-y-4 lg:col-span-5">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo showText={true} textColor="text-white" />
            </Link>

            <p className="max-w-[340px] text-xs font-normal leading-relaxed text-slate-400">
              {brandConfig.subtitle}
            </p>

            {email && (
              <p className="text-[13px] font-medium text-slate-400">
                <a
                  href={`mailto:${email}`}
                  className="hover:text-blue-400 transition-colors duration-200"
                >
                  {email}
                </a>
              </p>
            )}

            {showSocial && socialLinks.length > 0 && (
              <div className="flex items-center gap-2.5 pt-1">
                {socialLinks.map((s) => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={socialClass}
                    aria-label={
                      s.platform.charAt(0).toUpperCase() + s.platform.slice(1)
                    }
                  >
                    <SocialIcon platform={s.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link Columns */}
          <div
            className={cn(
              "grid min-w-0 gap-x-8 gap-y-8 sm:gap-x-10 lg:col-span-7",
              columns.length <= 2
                ? "grid-cols-2"
                : columns.length === 3
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-4",
            )}
          >
            {columns.map((col) => (
              <div key={col.id} className="min-w-0 space-y-3">
                <FooterHeading>{col.title}</FooterHeading>
                <ul className="space-y-2">
                  {col.links.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <Link href={item.href} className={linkClass}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-8 min-w-0 border-t border-white/10 py-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            <div className="min-w-0 max-w-md space-y-1.5">
              <h3 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-wide text-white">
                <span className="h-px w-3.5 shrink-0 bg-[#EC1D24]" aria-hidden />
                {newsletterHeading}
              </h3>
              <p className="text-[13px] font-medium leading-snug text-slate-400">
                Curated travel inspirations, seasonal itineraries, and exclusive group departures.
              </p>
            </div>

            <form
              onSubmit={handleSubscribe}
              className="w-full min-w-0 lg:max-w-[560px] lg:flex-1"
            >
              <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-2.5">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className={cn(
                    "min-h-[44px] min-w-0 flex-1 rounded-xl",
                    "border border-slate-700 bg-slate-800/80 px-4 py-2.5",
                    "text-[13px] font-medium text-white outline-none",
                    "placeholder:text-slate-400",
                    "transition-colors duration-200",
                    "focus-visible:border-[#EC1D24] focus-visible:bg-slate-800",
                    "motion-reduce:transition-none",
                  )}
                />
                <button
                  type="submit"
                  className={cn(
                    "inline-flex min-h-[44px] shrink-0 items-center justify-center cursor-pointer",
                    "rounded-xl bg-[#EC1D24] px-6 text-[13px] font-bold text-white shadow-md shadow-red-600/20",
                    "transition-all duration-200 hover:bg-[#D0171E]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
                    "active:scale-95 motion-reduce:transition-none",
                  )}
                >
                  {subscribed ? "Subscribed ✓" : "Subscribe"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex min-w-0 flex-col gap-3 border-t border-slate-800 pt-6 text-[12px] font-medium text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <p className="min-w-0 text-[13px] leading-snug text-slate-400">
            Certified Travel Platform · Operated with enterprise reliability
          </p>

          {showCopyright && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
              <p className="min-w-0 text-slate-400">
                © {new Date().getFullYear()} {brandName}. {copyright}
              </p>
              {LEGAL_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center py-0.5 text-slate-400 transition-colors duration-200 hover:text-white motion-reduce:transition-none"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
