"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function SaleBanner() {
  return (
    <section className="w-full py-8 md:py-12 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-950 via-zinc-900 to-black text-white min-h-[260px] sm:min-h-[300px] flex items-center">
          {/* Background image with overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80"
              alt="Season Special"
              loading="lazy"
              className="w-full h-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-10 md:p-14 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#EC1D24] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIMITED SEASON SALE</span>
            </div>

            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">
              Up to 25% Off on Winter & Spring Expeditions
            </h3>

            <p className="text-gray-300 text-sm sm:text-base mb-6 leading-relaxed">
              Book your slot early for Spiti, Ladakh, Meghalaya, and Vietnam. Guaranteed departures, verified trip leaders, and flexible reschedule policy.
            </p>

            <Link
              href="/trips"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-sm sm:text-base rounded-full shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>Explore Offers</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
