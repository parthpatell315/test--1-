import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { 
  Heart, 
  Sparkles, 
  Compass, 
  Hotel, 
  Award, 
  Sliders, 
  Leaf, 
  Flag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `About Us | ${brandConfig.name}`,
  description: `We take immense pride in having a well-seasoned team at the deck. With years of experience and dedication, we craft extraordinary travel experiences.`,
  path: "/about-us",
});

const corePillars = [
  {
    title: "Valuing Relationships",
    desc: "Every traveler joins as a guest and leaves as family. We nurture authentic friendships, travel bonds, and shared stories that last a lifetime.",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
    icon: Heart
  },
  {
    title: "Premium Experiences",
    desc: "From hand-selected boutique stays to premier transport and verified local captains, every single touchpoint is curated to the highest standards.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    icon: Sparkles
  },
  {
    title: "Crafted Experiences",
    desc: "No cookie-cutter tours. Our itineraries are painstakingly mapped out by ground experts with immersive local cultural stops and scenic viewpoints.",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
    icon: Compass
  },
  {
    title: "Experiential Stays",
    desc: "Riverside swiss tents, apple orchard cottages, cozy wooden lofts, and heritage mountain retreats that tell their own distinctive story.",
    image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&q=80",
    icon: Hotel
  },
  {
    title: "Excellent Service",
    desc: "Certified wilderness captains, 24x7 trip support, seamless logistical execution, and rigorous safety standards in high-altitude environments.",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80",
    icon: Award
  },
  {
    title: "Customized Trips",
    desc: "Tailored routes and personalized dates for corporate retreats, family getaways, and private expedition groups seeking bespoke attention.",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
    icon: Sliders
  },
  {
    title: "Sustainability",
    desc: "Committed to eco-conscious travel, zero-single-use plastics, supporting indigenous Himalayan economies, and leaving no trace behind.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
    icon: Leaf
  },
  {
    title: "The Journey Ahead",
    desc: "Born out of pure passion for genuine exploration. We continue to pioneer new backcountry trails and meaningful community adventures.",
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
    icon: Flag
  }
];

export default function AboutPage() {
  return (
    <div className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HERO SECTION (Avian Signature Style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-8 pb-12">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#EC1D24] tracking-tight mb-4">
          We are {brandConfig.name}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed font-normal mb-8">
          We take immense pride in having a well-seasoned team at the deck. With years of experience, in-depth travel knowledge, dedication and a genuine love for exploration, we craft extraordinary experiences that will perfectly align with your wanderlust and dreams!
        </p>
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg shadow-red-500/25 transition-all active:scale-95"
        >
          <span>Explore Trips</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* 2. VISION & MISSION CARDS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Vision */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/80 shadow-md space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#EC1D24] bg-red-50 px-3 py-1 rounded-full inline-block">
              Our Vision
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              Transforming Travel into Soulful Healing
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              To elevate traveling and adventure from mere leisure pursuits and hobbies into genuine therapeutic experiences. Our aim is to offer individuals mesmerizing experiences that make them feel alive, promote mental healing, and leave them with everlasting memories of soulful journeys.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/80 shadow-md space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
              Our Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              Curating Unparalleled Journeys & Encounters
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              We believe that travel extends beyond visiting destinations; it is a transformative experience. Our mission is to curate unparalleled journeys that offer authentic encounters with diverse cultures, awe-inspiring landscapes, and thrilling adventures, immersing oneself in the essence of each place while fostering connections and enriching lives.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES GRID (Avian 8 Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            What Sets <span className="text-[#EC1D24]">{brandConfig.name}</span> Apart
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            The values and uncompromising standards that guide every departure
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {corePillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-3xl overflow-hidden border border-gray-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  <img 
                    src={pillar.image} 
                    alt={pillar.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#EC1D24] shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-normal">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BOTTOM BANNER CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/80 shadow-lg text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#EC1D24] bg-red-50 px-3 py-1 rounded-full inline-block">
            Ready For The Road?
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Discover Your Next Group Expedition
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
            Join a community of curious wanderers. Handcrafted routes, verified boutique stays, certified captains, and transparent pricing with No Cost EMI.
          </p>
          <div className="pt-2">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-md transition-all active:scale-95"
            >
              <span>Browse All Trips</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
