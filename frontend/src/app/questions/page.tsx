"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, HelpCircle, MessageSquare, Phone } from "lucide-react";

import { brandConfig } from "@/config/brand.config";

const faqs = [
  {
    category: "Booking & Reservations",
    questions: [
      {
        q: `How do I book a tour with ${brandConfig.name}?`,
        a: "Simply browse our trips catalog, select your preferred departure date and joining city (Ex-Delhi, Ex-Ahmedabad, Ex-Chandigarh, Ex-Mumbai), submit your traveler details, and our concierge team will confirm your seat.",
      },
      {
        q: "What payment modes are accepted?",
        a: "We accept net banking (NEFT/IMPS), UPI payments, credit/debit cards, and direct bank transfers. All transactions are securely processed with instantaneous receipt issuance.",
      },
      {
        q: "When is full payment due?",
        a: "Full payment is required 15 days prior to trip departure. An advance booking deposit is required to reserve your seat at the time of booking.",
      },
    ],
  },
  {
    category: "Travel Logistics & Transport",
    questions: [
      {
        q: "Who coordinates train and flight logistics?",
        a: `${brandConfig.name} manages all verified transport logistics according to your package. Seat and berth status are communicated proactively before departure.`,
      },
      {
        q: "What happens if there are schedule disruptions?",
        a: "We monitor route conditions continuously. In case of unexpected weather or transport disruptions, our on-ground ops team arranges verified alternative options.",
      },
    ],
  },
  {
    category: "Accommodations & Hospitality",
    questions: [
      {
        q: "What types of stays are included in the package?",
        a: "Stays include verified boutique hotels, heritage homestays, and premium Swiss tent glamping sites — all inspected for hygiene, hot water availability, and panoramic views.",
      },
      {
        q: "Are meals included in the package?",
        a: "Most packages include breakfast and dinner. Local organic cuisine is served at partner homestays. Special dietary needs can be communicated prior to departure.",
      },
    ],
  },
  {
    category: "Safety & Group Support",
    questions: [
      {
        q: "What is the typical group size?",
        a: "Our standard group size ranges from 12 to 30 travelers per departure to maintain a personalized boutique experience. Custom private departures are also available for private groups.",
      },
      {
        q: "Is group travel safe for solo travelers?",
        a: "Absolutely! A large portion of our community consists of solo travelers. Our certified trip leaders maintain strict group safety guidelines, icebreakers, and 24/7 on-ground assistance.",
      },
      {
        q: "What emergency protocols are in place for remote routes?",
        a: "Our trip leaders carry certified medical first-aid kits and emergency oxygen cylinders. We maintain 24/7 liaison with local mountain rescue networks and medical facilities.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-white min-h-screen font-montserrat pt-24 pb-20">
      {/* Top Banner */}
      <section className="bg-[#0F172A] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-blue-900/50 text-blue-400 font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block font-montserrat">
            HELP & CONCIERGE CENTER
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase font-montserrat">
            FREQUENTLY ASKED <span className="text-blue-400">QUESTIONS</span>
          </h1>
          <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto my-3" />
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-xl mx-auto leading-relaxed">
            Everything you need to know about our expeditions, booking policies, and on-ground safety.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 space-y-10">
        {faqs.map((group, gi) => (
          <div key={gi} className="space-y-3">
            {/* Category Label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl font-montserrat">
                {group.category}
              </span>
            </div>

            {group.questions.map((item, qi) => {
              const key = `${gi}-${qi}`;
              const isOpen = !!openMap[key];
              return (
                <div
                  key={qi}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-2xs ${isOpen ? "border-blue-600" : "border-slate-200"}`}
                >
                  <button
                    onClick={() => toggle(key)}
                    className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle
                        className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? "text-blue-600" : "text-slate-400"}`}
                      />
                      <span className="text-sm font-extrabold text-slate-900 font-montserrat leading-snug">
                        {item.q}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-blue-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-4 pt-0 border-t border-slate-100 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed pl-[calc(1.25rem+28px)] font-montserrat">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Still Have Questions Banner */}
        <div className="bg-[#0F172A] rounded-2xl p-7 sm:p-10 mt-10 text-center space-y-3 border border-slate-800">
          <h3 className="text-lg sm:text-2xl font-extrabold text-white font-montserrat uppercase tracking-tight">
            Still Have Questions?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-normal font-montserrat max-w-md mx-auto leading-relaxed">
            Our 24/7 travel concierge is available to answer any specific itinerary or booking questions.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <a
              href={`https://wa.me/${brandConfig.whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all hover:bg-blue-700 active:scale-95 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Concierge</span>
            </a>
            <a
              href={`tel:${brandConfig.supportPhone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 bg-white/10 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>{brandConfig.supportPhone}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
