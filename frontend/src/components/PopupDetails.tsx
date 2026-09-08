"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  ArrowRight,
  ShieldCheck,
  FileText,
  Backpack,
  ShoppingBag,
  Info,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { parseTripDate } from "@/lib/parseTripDate";

interface Section {
  id: string;
  label: string;
  type: "list" | "simple" | "table" | "categorical";
  content: any[];
  note?: string;
}

const SECTIONS: Section[] = [
  {
    id: "cancellation",
    label: "Cancellation Policy",
    type: "list",
    content: [
      { label: "Advance booking amount", val: "Non-refundable" },
      { label: "Before 45 days of departure", val: "80% refund" },
      { label: "Before 30 days of departure", val: "50% refund" },
      { label: "Before 15 days of departure", val: "25% refund" },
      {
        label: "Rescheduling dates (20–30 days prior)",
        val: "Extra 25% of package cost",
      },
      { label: "Within 15 days of departure", val: "No refund" },
      { label: "No show", val: "No refund" },
    ],
    note: "Cancellation would be granted by the Higher Authorities on receiving a cancellation request through registered mail ID only. Refunds are paid in 7 to 12 working days by bank transfer. Full payment has to be done before 15 days of trip departure. Trip-page policy, if stated, overrides this schedule.",
  },
  {
    id: "inclusions",
    label: "Inclusion & Exclusion",
    type: "simple",
    content: [
      "Check the detailed section on the main page for a full breakdown of what's covered and what's not.",
    ],
  },
  {
    id: "terms",
    label: "Terms & Conditions",
    type: "simple",
    content: [
      "You participate in this adventure & leisure trip with proper medical advice, on your own will and risk. You are solely responsible for any injury or accident (minor or fatal) during the trip.",
      "Trrabb is not responsible for such incidents, including risk from wild animals and water bodies near the campsite.",
      "Neither Trrabb nor its agents shall be liable for accident, injury, illness, death, or loss/damage to baggage arising from persons who are not its direct employees.",
      "Bookings are accepted on the website. Payments are accepted only in the current account (details/barcode on the site) or cash at the office — not through 3rd-party portals, agents, or apps.",
      "Full trip payment must be made before 15 days of trip departure. If not paid, participation will be cancelled. Groups under 10 persons are guided by the driver (no separate guide).",
      "Photos and videos from the trip are Trrabb property and may not be used without permission. Disputes are under Ahmedabad jurisdiction only.",
    ],
    note: "By booking you agree to the full Terms & Conditions.",
  },
  {
    id: "carry",
    label: "Things to Carry",
    type: "categorical",
    content: [
      {
        category: "Mandatory Requirements",
        items: [
          {
            text: "Medical Certificate",
            link: "#",
            linkText: "(Click here for Download)",
          },
          { text: "Original ID Proof with 2 Xerox Copy" },
          { text: "Screenshot of Fees Receipt" },
        ],
      },
      {
        category: "Trekking Gears (Available on Rent/Sale)",
        items: [
          { text: "Trekking Shoes" },
          { text: "Micro Spikes & Gaiters" },
          { text: "Feather/Down Jacket (-10 Degree)" },
          { text: "Backpack with Raincover (60-70 litres)" },
          { text: "Rainwear (Poncho)" },
          { text: "Head Torch" },
          { text: "Thermal Inner Wear" },
          { text: "Snow Proof Hand Gloves" },
          { text: "Thick Woolen Socks" },
          { text: "Woolen Cap" },
        ],
      },
      {
        category: "Clothes",
        items: [
          { text: "Full Sleeve T-Shirts" },
          { text: "Normal Jacket/Fleece" },
          { text: "Trek Pants (Quick Dry would be Better)" },
          { text: "Face Mask/Buff" },
        ],
      },
      {
        category: "Personal Items",
        items: [
          { text: "Woolen Hand Gloves" },
          { text: "Sun Cap" },
          { text: "Sun Glass" },
          { text: "Sanitiser & Face Mask" },
          { text: "Slipper & Socks" },
          { text: "Plastic Bags (for wet clothes)" },
          { text: "Personal Sanitary Items" },
          { text: "2 Water Bottles & Snacks" },
          { text: "Lunch Box, Mug & Spoon" },
          { text: "Sunscreen (SPF 40+)" },
          { text: "Camera & Power Banks" },
          { text: "Personal Medication if any" },
        ],
      },
    ],
  },
];

interface PopupDetailsProps {
  startDate?: string | null;
  details?: {
    cancellation: { label: string; val: string }[];
    gears: { item: string; price: string }[];
    terms: string[];
    carry: any[];
    etiquette: { title: string; desc: string }[];
    customPolicies?: { label: string; type: string; content: any[] }[];
    showRentedGears?: boolean;
  };
}

export default function PopupDetails({
  details,
  startDate,
}: PopupDetailsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const formatDate = (days: number) => {
    if (!startDate) return null;
    const d = parseTripDate(startDate);
    if (!d) return null;
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  // Merge dynamic data if available
  let activeSections = [...SECTIONS];

  if (details) {
    activeSections = activeSections.map((sec) => {
      let content = sec.content;
      if (sec.id === "cancellation" && details.cancellation?.length > 0)
        content = details.cancellation;
      if (sec.id === "terms" && details.terms?.length > 0)
        content = details.terms;
      if (sec.id === "carry" && details.carry?.length > 0)
        content = details.carry;

      // Dynamic date formatting for cancellation policy
      if (sec.id === "cancellation" && startDate) {
        content = content.map((item: any) => {
          let label = item.label;
          if (label.toLowerCase().includes("before 45 days")) {
            label = `Before ${formatDate(45)}`;
          } else if (label.toLowerCase().includes("before 30 days")) {
            label = `Before ${formatDate(30)}`;
          } else if (label.toLowerCase().includes("before 15 days")) {
            label = `Before ${formatDate(15)}`;
          } else if (label.toLowerCase().includes("within 15 days")) {
            label = `After ${formatDate(15)}`;
          }
          return { ...item, label };
        });
      }

      return { ...sec, content };
    });

    // Add Rented Gears if available
    if (details.gears?.length > 0 && details.showRentedGears !== false) {
      activeSections.push({
        id: "gears",
        label: "Rented Gears",
        type: "categorical",
        content: details.gears.map((cat: any) => ({
          category: cat.category,
          items: (cat.items || []).map((i: any) => {
            const rawPrice = (i.price || "").toString().trim().toLowerCase();
            const isFree =
              !rawPrice ||
              rawPrice === "free" ||
              rawPrice === "0" ||
              rawPrice === "₹0" ||
              rawPrice === "₹free" ||
              rawPrice === "free / complimentary";
            return {
              text: i.item,
              price: isFree
                ? null
                : i.price.startsWith("₹")
                  ? i.price
                  : `₹${i.price}`,
            };
          }),
        })),
      });
    }

    // Add Local Etiquette if available
    if (details.etiquette?.length > 0) {
      activeSections.push({
        id: "etiquette",
        label: "Local Etiquette",
        type: "categorical",
        content: details.etiquette.map((e) => ({
          category: e.title,
          items: [{ text: e.desc }],
        })),
      });
    }

    // Append custom policies
    if (details.customPolicies?.length) {
      const customs = details.customPolicies.map((cp, idx) => ({
        id: `custom-${idx}`,
        label: cp.label,
        type: (cp.type || "simple") as any,
        content: cp.content,
      }));
      activeSections = [...activeSections, ...customs];
    }
  }

  const activeSection = activeSections.find((s) => s.id === activeId);

  return (
    <section className="mb-0 scroll-mt-[140px]" id="policies">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {activeSections.map((sec) => {
          const Icon =
            sec.id === "cancellation"
              ? ShieldCheck
              : sec.id === "terms"
                ? FileText
                : sec.id === "carry"
                  ? Backpack
                  : sec.id === "gears"
                    ? ShoppingBag
                    : sec.id === "etiquette"
                      ? Info
                      : sec.id === "inclusions"
                        ? CheckCircle
                        : MessageSquare;

          return (
            <button
              key={sec.id}
              onClick={() => setActiveId(sec.id)}
              className="group relative bg-[#F8F9FB] border border-zinc-200/80 rounded-[14px] px-3 py-2.5 flex items-center gap-2.5 hover:bg-[#0B1528] hover:border-[#0B1528] transition-all duration-300 cursor-pointer text-left overflow-hidden shadow-2xs"
            >
              {/* Accent dot top-right */}
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#D4541A] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Icon badge */}
              <div className="w-8 h-8 rounded-[8px] bg-white group-hover:bg-[#D4541A] border border-zinc-200/80 group-hover:border-[#D4541A] flex items-center justify-center shadow-xs transition-all duration-300 shrink-0">
                <Icon className="w-4 h-4 text-[#0B1528] group-hover:text-white transition-colors duration-300" />
              </div>

              {/* Label */}
              <span className="font-bold text-xs text-[#0B1528] group-hover:text-white font-montserrat leading-tight transition-colors duration-300 truncate">
                {sec.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeId && (
        <div
          onClick={() => setActiveId(null)}
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3.5 sm:p-6 pt-[84px] sm:pt-6 pb-4 sm:pb-6 bg-[#0B1528]/85 backdrop-blur-md transition-all duration-300 overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-[28px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] relative flex flex-col max-h-[calc(100vh-104px)] sm:max-h-[86vh]"
          >
            {/* Clean White Header matching reference screenshots */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-[#1E293B] font-montserrat">
                {activeSection?.label}
              </h2>
              <button
                onClick={() => setActiveId(null)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded-full hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-zinc-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 bg-white">
              {/* CATEGORICAL type (Things to Carry / Gears) */}
              {activeSection?.type === "categorical" && (
                <div className="space-y-5">
                  {activeSection.content.map((cat: any, idx: number) => {
                    if (!cat || !cat.items) return null;
                    return (
                      <div key={idx} className="space-y-2.5">
                        {cat.category && (
                          <h3 className="text-sm font-bold text-[#334155] font-montserrat">
                            {cat.category}
                          </h3>
                        )}
                        <ol className="space-y-2.5 pl-1">
                          {cat.items.map((item: any, i: number) => {
                            const text = item.text || item.label || item;
                            return (
                              <li
                                key={i}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-600 font-montserrat leading-relaxed"
                              >
                                <span className="font-semibold text-zinc-400 min-w-[20px]">
                                  {i + 1}.
                                </span>
                                <span className="text-zinc-700 font-medium">
                                  {text}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TABLE type (Rented Gears with price) */}
              {activeSection?.type === "table" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200/80 overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                          <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-600 font-montserrat">
                            Item
                          </th>
                          <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-600 font-montserrat">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {activeSection.content.map((row: any, i: number) => (
                          <tr
                            key={i}
                            className="hover:bg-zinc-50/50 transition-colors"
                          >
                            <td className="px-5 py-3 font-medium text-[#1E293B] text-xs font-montserrat">
                              {row.item}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="font-bold text-xs text-[#F97316] bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full font-montserrat">
                                {row.price}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeSection.note && (
                    <div className="flex items-start gap-3 p-3.5 bg-orange-50/60 rounded-xl border border-orange-100">
                      <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-600 font-medium font-montserrat leading-relaxed">
                        {activeSection.note}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* LIST type (Cancellation Policy) */}
              {activeSection?.type === "list" && (
                <div className="space-y-2.5">
                  {activeSection.content.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-4 bg-zinc-50/60 border border-zinc-200/70 rounded-xl px-4 py-3 hover:border-orange-200 transition-all"
                    >
                      <span className="text-xs sm:text-sm font-medium text-zinc-700 font-montserrat leading-snug flex-1">
                        {item.label}
                      </span>
                      <span className="font-bold text-xs text-[#F97316] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full font-montserrat shrink-0 whitespace-nowrap">
                        {item.val}
                      </span>
                    </div>
                  ))}
                  {activeSection.note && (
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 mt-3">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-600 font-medium font-montserrat leading-relaxed">
                        {activeSection.note}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SIMPLE type (Terms & Conditions, Inclusions) */}
              {activeSection?.type === "simple" && (
                <div className="space-y-3">
                  {activeSection.content.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-xs sm:text-sm text-zinc-700 font-montserrat leading-relaxed"
                    >
                      <CheckCircle className="w-4.5 h-4.5 text-zinc-500 shrink-0 mt-0.5 stroke-[1.5]" />
                      <p className="font-medium text-zinc-700">{item}</p>
                    </div>
                  ))}
                  {activeSection.note && (
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 mt-3">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-600 font-medium font-montserrat leading-relaxed">
                        {activeSection.note}{" "}
                        {activeSection.id === "terms" && (
                          <Link
                            href="/terms-and-conditions"
                            className="text-[#D4541A] font-bold underline underline-offset-2"
                          >
                            Read the full Terms &amp; Conditions
                          </Link>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
