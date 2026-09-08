import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Calendar,
  CheckCircle2,
  MapPin,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
} from "lucide-react";

import { pageMetadata } from "@/lib/seo";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `How It Works | ${brandConfig.name}`,
  description: `How to book a ${brandConfig.name} group expedition: choose a destination, reserve a seat, get confirmation, and travel seamlessly.`,
  path: "/how-it-works",
});

const steps = [
  {
    step: "01",
    title: "Explore & Select Destination",
    description:
      "Browse our curated expeditions across Spiti, Ladakh, Kasol, Kerala, and premier circuits. Filter by starting stations (Ex-Delhi, Ex-Ahmedabad, Ex-Chandigarh, Ex-Mumbai).",
    icon: Compass,
  },
  {
    step: "02",
    title: "Customize & Reserve Seat",
    description:
      "Select your preferred departure dates, room sharing preferences (Quad / Triple / Twin), and optional add-ons. Reserve your seat with an advance booking deposit.",
    icon: Calendar,
  },
  {
    step: "03",
    title: "Receive Confirmation & Vouchers",
    description:
      "Get instant confirmation receipts, transport logistics updates, pre-trip packing checklists, and join your batch's concierge coordination group.",
    icon: CheckCircle2,
  },
  {
    step: "04",
    title: "Embark On The Expedition",
    description:
      "Meet your certified trip captain at the designated starting station, check into cozy homestays, and create unforgettable memories with fellow travelers!",
    icon: MapPin,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-white min-h-screen pt-24 font-montserrat pb-20">
      {/* Top Banner */}
      <section className="bg-[#0F172A] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-blue-900/50 text-blue-400 font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block font-montserrat">
            SIMPLE & SEAMLESS BOOKING PROCESS
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase font-montserrat">
            HOW IT <span className="text-blue-400">WORKS</span>
          </h1>
          <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto my-3" />
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-xl mx-auto leading-relaxed">
            From selecting your departure to landing at the destination — here is your 4-step journey.
          </p>
        </div>
      </section>

      {/* 4-Step Cards Grid */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-lg flex items-center justify-center font-montserrat shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {s.step}
                  </span>
                  <s.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mb-2 font-montserrat">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-500 font-normal leading-relaxed font-montserrat">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="mt-16 bg-slate-50 border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-montserrat uppercase tracking-tight">
            Ready To Start Your{" "}
            <span className="text-blue-600">Adventure?</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-normal max-w-lg mx-auto">
            Explore our curated expeditions and seasonal group departures with verified leaders.
          </p>
          <div className="pt-2">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <span>Browse All Trips</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
