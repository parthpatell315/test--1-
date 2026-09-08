import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import {
  Compass,
  Heart,
  ShieldCheck,
  Zap,
  Users,
  Award,
  MapPin,
  Star,
  Phone,
  ArrowRight,
} from "lucide-react";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `About Us | ${brandConfig.name}`,
  description: `${brandConfig.name} curates premier small-batch group adventure tours and expeditions with verified stays and expert trip leadership.`,
  path: "/about-us",
});

const values = [
  {
    title: "Curated Boutique Groups",
    description:
      "We cap group sizes to ensure every traveler receives personal attention, safe handling, and authentic team camaraderie.",
    icon: Heart,
  },
  {
    title: "Deep Local Connection",
    description:
      "Our itineraries are built on long-standing relationships with Himalayan homestays, local drivers, and native guides.",
    icon: Compass,
  },
  {
    title: "Enterprise Safety & Care",
    description:
      "Remote travel demands precision. All our trip captains are certified in wilderness first aid and high-altitude emergency protocols.",
    icon: ShieldCheck,
  },
  {
    title: "Sustainable & Conscious Travel",
    description:
      "We adhere strictly to leave-no-trace principles, supporting local economies and preserving pristine natural ecosystems.",
    icon: Zap,
  },
];

const stats: { label: string; value: string }[] = [];

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen pt-24 font-montserrat pb-20">
      {/* Hero Header */}
      <section className="py-16 sm:py-20 px-5 sm:px-8 max-w-7xl mx-auto text-center border-b border-slate-100">
        <span className="bg-blue-50 text-blue-600 font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block mb-4 shadow-2xs font-montserrat">
          OUR STORY & MISSION
        </span>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight uppercase leading-none font-montserrat">
          CRAFTING EXTRAORDINARY <br />
          <span className="text-blue-600">TRAVEL MEMORIES</span>
        </h1>
        <div className="w-16 h-1 bg-blue-600 rounded-full mx-auto my-6" />
        <p className="text-base sm:text-xl text-slate-600 font-normal max-w-3xl mx-auto leading-relaxed">
          {brandConfig.name} was established to connect adventurous travelers with authentic, unforgettable group expeditions across India and beyond.
        </p>
      </section>

      {stats.length > 0 && (
      <section className="bg-[#0F172A] text-white py-12 px-5 sm:px-8 my-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((st, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl sm:text-5xl font-extrabold text-blue-400 font-montserrat">
                {st.value}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider font-montserrat">
                {st.label}
              </p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Story & Philosophy Section */}
      <section className="py-12 px-5 sm:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-slate-100">
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&q=80"
              alt="Mountain Expedition"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase font-montserrat">
              More Than A Travel Brand — <br />
              <span className="text-blue-600">A Community Of Explorers</span>
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              <p>
                {brandConfig.name} brings together passionate explorers to experience remote, breathtaking landscapes with complete peace of mind.
              </p>
              <p>
                We believe that the best stories are written off the beaten path — sipping hot chai at 14,000 feet, stargazing at remote high-altitude campsites, or discovering hidden cultural treasures.
              </p>
              <p>
                Every itinerary is designed with meticulous detail — from handpicked verified homestays to experienced local drivers and certified trip captains who ensure 100% safety and top-tier hospitality.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/trips"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <span>Explore Expeditions</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="py-16 px-5 sm:px-8 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-blue-600 font-extrabold text-xs uppercase tracking-widest font-montserrat">
            WHY CHOOSE US
          </span>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 uppercase tracking-tight font-montserrat">
            OUR CORE FOUNDATIONS
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <div
                key={i}
                className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 space-y-3 hover:bg-white hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 font-montserrat leading-tight">
                  {v.title}
                </h4>
                <p className="text-xs text-slate-500 font-normal leading-relaxed font-montserrat">
                  {v.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
