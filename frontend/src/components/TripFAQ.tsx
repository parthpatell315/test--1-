"use client";

import { useState } from "react";
import { Plus, Minus, MessageCircle, HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQ {
  question: string;
  answer: string;
  category?: string;
}

interface TripFAQProps {
  faqs?: FAQ[];
}

const defaultFaqs: FAQ[] = [
  {
    question: "Is this trip suitable for solo travelers?",
    answer:
      "Absolutely! Over 60% of our community members travel solo. You'll be joining a warm, verified group of like-minded adventurers with dedicated trip captains who ensure everyone feels included and safe.",
  },
  {
    question:
      "What is the policy for altitude acclimatization & health emergencies?",
    answer:
      "Safety is our highest priority. We carry first-aid kits and portable oxygen cylinders on high-altitude expeditions. Our trip captains are trained in wilderness first aid and ensure gradual acclimatization.",
  },
  {
    question: "What kind of accommodations and food are included?",
    answer:
      "We provide clean, comfortable 3-star/4-star boutique hotels, cozy homestays, or luxury camps depending on the terrain. Nutritious vegetarian meals (Breakfast & Dinner) are included as detailed in your trip itinerary.",
  },
  {
    question: "How much luggage can I carry on the trip?",
    answer:
      "We recommend bringing one main Rucksack / Duffel bag (50-60L) along with a small 20L daypack for essentials. Please avoid hard-shell trolley bags as mountain vehicle boots have limited flexible space.",
  },
  {
    question: "What is the cancellation and refund policy?",
    answer:
      "We offer flexible booking transfers. Cancellations made 15+ days prior to departure qualify for a credit voucher valid for 1 year. You can also transfer your seat to a friend hassle-free.",
  },
];

export default function TripFAQ({ faqs }: TripFAQProps) {
  const [openIndices, setOpenIndices] = useState<number[]>([0]);
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const displayFaqs = faqs || [];

  const toggleFaq = (index: number) => {
    setOpenIndices((prev) => {
      const next = prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index];
      setIsAllExpanded(next.length === displayFaqs.length && next.length > 0);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setOpenIndices([]);
      setIsAllExpanded(false);
    } else {
      setOpenIndices(displayFaqs.map((_, i) => i));
      setIsAllExpanded(true);
    }
  };

  const handleWhatsAppClick = () => {
    window.location.href = "/contact";
  };

  return (
    <section className="space-y-6 scroll-mt-[140px]" id="faq">
      {/* Header System with Expand All Toggle */}
      <div className="flex items-center justify-between border-b border-zinc-100/90 pb-3">
        <h2 className="text-2xl sm:text-3xl font-black text-[#0B1528] tracking-tight font-sans leading-none">
          Frequently Asked{" "}
          <span className="text-[#D4541A] font-caveat italic">Questions</span>
        </h2>
        <button
          onClick={toggleExpandAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#0B1528] transition-all font-sans cursor-pointer shrink-0"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 text-zinc-500 transition-transform duration-200",
              isAllExpanded ? "rotate-180" : "",
            )}
          />
          {isAllExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {displayFaqs.map((faq, index) => {
          const isOpen = openIndices.includes(index);
          return (
            <div
              key={index}
              className={cn(
                "rounded-[18px] border transition-all duration-200 overflow-hidden",
                isOpen
                  ? "bg-white border-zinc-200 shadow-sm"
                  : "bg-zinc-50/50 hover:bg-zinc-50 border-zinc-100",
              )}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4.5 sm:p-5 text-left transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                      isOpen
                        ? "bg-[#D4541A] text-white"
                        : "bg-zinc-200/70 text-zinc-600",
                    )}
                  >
                    Q{index + 1}
                  </span>
                  <span className="font-extrabold text-[#0B1528] text-sm sm:text-base font-sans tracking-tight leading-snug">
                    {faq.question}
                  </span>
                </div>
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200",
                    isOpen
                      ? "rotate-180 bg-[#D4541A]/10 text-[#D4541A]"
                      : "bg-white border border-zinc-200 text-zinc-400",
                  )}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="mt-3.5 pt-3.5 border-t border-zinc-100 text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed animate-fade-in px-4.5 sm:px-5 pb-4.5 sm:pb-5">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Contact Helper Banner */}
      <div className="bg-[#0B1528] rounded-[20px] p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D4541A] flex items-center justify-center shrink-0 text-white shadow-2xs">
            <MessageCircle className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base font-sans leading-tight">
              Have more questions?
            </h4>
            <p className="text-zinc-400 text-xs font-sans mt-0.5">
              Contact our trip concierge directly for personalized assistance.
            </p>
          </div>
        </div>
        <button
          onClick={handleWhatsAppClick}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#D4541A] hover:bg-[#c24813] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all font-sans shrink-0 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
        >
          Ask an Expert
        </button>
      </div>
    </section>
  );
}
