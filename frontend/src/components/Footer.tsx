"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLogo, brandConfig } from "@/config/brand.config";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";

interface FooterProps {
  footerConfig?: any;
}

export default function Footer({ footerConfig }: FooterProps = {}) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const brandName = brandConfig.name || "Trrabb";
  const email = brandConfig.supportEmail || "contact@trrabb.com";

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full bg-[#18181B] text-white pt-16 pb-10 border-t border-zinc-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12 border-b border-zinc-800/80">
          
          {/* COLUMN 1: BRAND LOGO & INFO (md:col-span-5) */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-block">
              <BrandLogo textColor="text-white" />
            </Link>

            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              Curating authentic group journeys, high-altitude expeditions, and bespoke vacations with certified trip leaders across India and abroad.
            </p>

            <div className="pt-2">
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-[#EC1D24] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#EC1D24]" />
                <span>{email}</span>
              </a>
            </div>

            {/* Social Icons (Avian Style) */}
            <div className="flex items-center gap-3 pt-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-[#EC1D24] text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-300"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-[#EC1D24] text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-300"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.592 9 4.876V8z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-[#EC1D24] text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-300"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-[#EC1D24] text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-300"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* COLUMN 2: EXPLORE LINKS (md:col-span-3) */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-base font-bold text-white tracking-tight uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EC1D24]" />
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/trips" className="hover:text-white transition-colors">
                  Tour Packages
                </Link>
              </li>
              <li>
                <Link href="/trips?type=group" className="hover:text-white transition-colors">
                  Group Trips
                </Link>
              </li>
              <li>
                <Link href="/trips?sale=true" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Sale of the Season</span>
                  <span className="text-xs">🎁</span>
                </Link>
              </li>
              <li>
                <Link href="/about-us" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Concierge
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: GET UPDATES & MORE (md:col-span-4) */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight uppercase mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EC1D24]" />
              Get Updates & More!
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Subscribe to our free newsletter and stay up to date with seasonal discounts, hidden itineraries, and community meetups.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2.5 pt-1">
              <input
                type="email"
                name="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#EC1D24] transition-all text-center"
              />
              <button
                type="submit"
                className="w-full py-3 bg-white hover:bg-zinc-100 text-[#18181B] font-bold text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-98 cursor-pointer shadow-md"
              >
                {subscribed ? "Subscribed Successfully ✓" : "Subscribe"}
              </button>
            </form>

            <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Zero spam. Unsubscribe anytime with 1-click.</span>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT ROW (Avian Style) */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} {brandName} Experiences Private Limited. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/terms-and-conditions" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/cancellation-policy" className="hover:text-zinc-300 transition-colors">
              Cancellation Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
