import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { brandConfig } from "@/config/brand.config";
import { 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  ShieldCheck,
  Tag
} from "lucide-react";
import { fetchPublicTrips } from "@/lib/api";
import TripCard from "@/components/TripCard";

export const metadata: Metadata = pageMetadata({
  title: `Sale of the Season 🎁 | Group Trip Vouchers | ${brandConfig.name}`,
  description: `Unlock huge season savings with ${brandConfig.name} travel vouchers. Pay less, travel more, and choose your departure dates flexibly.`,
  path: "/sale-of-season",
});

const vouchers = [
  {
    pay: 5000,
    get: 6500,
    bonus: 1500,
    popular: false,
    tag: "Weekend Getaway",
    desc: "Valid on all 3D/2N and 4D/3N short treks and road trips across Himachal and Uttarakhand.",
  },
  {
    pay: 10000,
    get: 13000,
    bonus: 3000,
    popular: true,
    tag: "Most Popular",
    desc: "Valid on all 6D/5N to 8D/7N Himalayan circuits including Spiti Valley and Manali-Kasol.",
  },
  {
    pay: 20000,
    get: 26000,
    bonus: 6000,
    popular: false,
    tag: "Mega Expedition",
    desc: "Valid on high-altitude expeditions like Leh Ladakh, Zanskar Valley, and Meghalaya Backpacking.",
  },
];

export default async function SaleOfSeasonPage() {
  let trips: any[] = [];
  try {
    const allTrips = await fetchPublicTrips();
    trips = allTrips.filter((t) => t.status === "published").slice(0, 4);
  } catch (e) {
    // fallback
  }

  return (
    <div className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HERO (Avian Signature Style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-8 pb-12">
        <div className="inline-flex items-center gap-2 bg-red-50 text-[#EC1D24] text-xs font-bold px-4 py-1.5 rounded-full border border-red-200/80 mb-4 shadow-xs">
          <Gift className="w-3.5 h-3.5" />
          <span>Limited Season Window</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4">
          Sale of the Season <span className="text-[#EC1D24]">🎁</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-normal mb-8">
          Lock in guaranteed travel credits at special seasonal rates. Purchase a voucher now, pay less than face value, and pick your travel dates whenever you're ready up to 15 days before departure!
        </p>

        <div className="flex items-center justify-center gap-3 text-xs font-bold text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            1-Year Validity
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-[#EC1D24]" />
            Flexible Dates
          </span>
          <span>•</span>
          <span>100% Transferable</span>
        </div>
      </section>

      {/* 2. VOUCHER CARDS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {vouchers.map((v, i) => (
            <div
              key={i}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all border ${
                v.popular
                  ? "bg-white border-[#EC1D24] shadow-xl ring-2 ring-red-500/20 relative"
                  : "bg-white border-gray-200/80 shadow-md hover:shadow-lg"
              }`}
            >
              {v.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EC1D24] text-white text-[11px] font-black px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  {v.tag}
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {v.tag}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    +₹{v.bonus.toLocaleString("en-IN")} Extra
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium">You Pay Only</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tight">
                    ₹{v.pay.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="bg-red-50/60 border border-red-100 rounded-2xl p-3.5">
                  <p className="text-xs text-gray-600 font-medium">Trip Voucher Credit</p>
                  <p className="text-xl font-black text-[#EC1D24]">
                    ₹{v.get.toLocaleString("en-IN")} Value
                  </p>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  {v.desc}
                </p>
              </div>

              <div className="pt-6">
                <a
                  href={`mailto:contact@trrabb.com?subject=Purchase%20Season%20Voucher%20₹${v.pay}&body=Hi%20Trrabb%2C%20I%20would%20like%20to%20purchase%20the%20Sale%20of%20the%20Season%20Voucher%20for%20₹${v.pay}%20(Credit%20Value%20₹${v.get}).`}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    v.popular
                      ? "bg-[#EC1D24] hover:bg-[#D0171E] text-white shadow-md shadow-red-500/20"
                      : "bg-gray-900 hover:bg-black text-white"
                  }`}
                >
                  <span>Claim Voucher</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. POPULAR TRIPS YOU CAN REDEEM ON */}
      {trips.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                Redeem on Top Expeditions
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Apply your voucher code toward any of these upcoming small-batch departures
              </p>
            </div>
            <Link
              href="/trips"
              className="text-xs sm:text-sm font-bold text-[#EC1D24] hover:text-[#D0171E] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trips.map((trip: any, idx: number) => (
              <TripCard key={trip.id || idx} trip={trip} index={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
