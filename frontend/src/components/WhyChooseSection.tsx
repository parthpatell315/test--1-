"use client";

import React from "react";
import { Award, Users, Compass, Headphones, ShieldCheck, HeartHandshake } from "lucide-react";

export default function WhyChooseSection() {
  const pillars = [
    {
      title: "Best Experiences",
      description: "We work with certified local experts and trip leaders to curate high-quality, authentic adventures just for you.",
      icon: <Award className="w-8 h-8 text-[#EC1D24]" />,
      bg: "bg-red-50",
    },
    {
      title: "Happy Travellers",
      description: "Over 15,000+ wanderers trust us for exceptional group journeys. Check out our 4.9★ community ratings.",
      icon: <Users className="w-8 h-8 text-[#EC1D24]" />,
      bg: "bg-red-50",
    },
    {
      title: "Personalised Trips",
      description: "Flexible departure dates, customized itineraries, and no-cost EMI plans designed to match your travel style.",
      icon: <Compass className="w-8 h-8 text-[#EC1D24]" />,
      bg: "bg-red-50",
    },
    {
      title: "24/7 On-Ground Support",
      description: "Our dedicated on-ground team is always with you, ensuring a seamless, safe journey every step of the way.",
      icon: <Headphones className="w-8 h-8 text-[#EC1D24]" />,
      bg: "bg-red-50",
    },
  ];

  return (
    <section className="w-full py-14 md:py-20 bg-white border-t border-gray-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Title */}
        <div className="text-center md:text-left mb-10 md:mb-12">
          <span className="text-xs md:text-sm font-bold text-[#EC1D24] uppercase tracking-wider block mb-1">
            Our Commitment
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A1A1A] tracking-tight">
            Why Choose Trrabb?
          </h2>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="flex flex-col items-start p-6 rounded-3xl bg-[#F8F9FA] border border-gray-100/90 hover:shadow-lg transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                {pillar.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 group-hover:text-[#EC1D24] transition-colors">
                {pillar.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#7E7E7E] leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
