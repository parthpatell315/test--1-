import { Metadata } from "next";
import Link from "next/link";
import { Backpack, CheckCircle2 } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `Packing List | ${brandConfig.name}`,
  description: `Essential packing checklist for ${brandConfig.name} adventure tours: documents, clothing, footwear, and travel kit.`,
  path: "/packing-list",
});

const groups = [
  {
    title: "Documents",
    items: [
      "Government photo ID (original + photocopy or digital scan)",
      "Booking confirmation / trip concierge group details",
      "Any personal medical prescriptions you regularly require",
    ],
  },
  {
    title: "Clothing & Layers",
    items: [
      "Quick-dry athletic tops and thermal layers for cold evenings",
      "Comfortable trekking pants or outdoor joggers",
      "Waterproof rain jacket or poncho (mountain weather changes quickly)",
      "Extra wool/moisture-wicking socks and a beanie or sun cap",
    ],
  },
  {
    title: "Footwear & Luggage",
    items: [
      "Broken-in walking or hiking shoes with deep rubber grip",
      "A 40–60L main backpack and a lightweight daypack",
      "Waterproof dry bag or ziplock pouches for electronics",
    ],
  },
  {
    title: "Personal Essentials",
    items: [
      "High SPF sunscreen, lip balm, and personal first-aid items",
      "Reusable insulated water bottle",
      "High-capacity power bank and charging cables",
      "Compact personal toiletries",
    ],
  },
];

export default function PackingListPage() {
  return (
    <div className="bg-white min-h-screen pt-24 font-montserrat pb-20">
      <section className="bg-[#0F172A] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-blue-900/50 text-blue-400 font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block">
            PRE-DEPARTURE CHECKLIST
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            PACKING <span className="text-blue-400">GUIDE</span>
          </h1>
          <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto my-3" />
          <p className="text-xs sm:text-sm text-slate-300 font-normal max-w-xl mx-auto leading-relaxed">
            A comprehensive checklist for {brandConfig.name} expeditions. Your trip leader will also provide route-specific updates in your batch coordination group.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 space-y-6">
        {groups.map((group) => (
          <section
            key={group.title}
            className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Backpack className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                {group.title}
              </h2>
            </div>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-600 font-normal leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-xs sm:text-sm text-slate-500 font-normal text-center">
          Need trip-specific assistance?{" "}
          <Link href="/contact" className="text-blue-600 font-bold hover:underline">
            Contact Concierge
          </Link>{" "}
          or view{" "}
          <Link href="/how-it-works" className="text-blue-600 font-bold hover:underline">
            How Booking Works
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
