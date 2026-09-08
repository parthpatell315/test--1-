import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { RefundSchedule } from "@/components/legal/RefundSchedule";
import { pageMetadata } from "@/lib/seo";
import { brandConfig } from "@/config/brand.config";
import { ShieldCheck, Mail, ArrowRight } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: `Cancellation Policy | ${brandConfig.name}`,
  description: `Official cancellation and refund terms for ${brandConfig.name} adventure trips and expeditions.`,
  path: "/cancellation-policy",
});

export default function CancellationPolicyPage() {
  return (
    <div className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HEADER (Avian Style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-6 pb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-[#EC1D24] bg-red-50 px-3.5 py-1.5 rounded-full inline-block mb-3">
          Transparent Refund Timelines
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight mb-2">
          Cancellation & <span className="text-[#EC1D24]">Refund Policy</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed font-normal">
          Clear, transparent cancellation terms for every trip. If not mentioned specifically on a custom package, this policy applies.
        </p>
      </section>

      {/* 2. MAIN DOCUMENT CONTAINER */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-10 shadow-md space-y-8">
          
          {/* Section 1: How cancellation is granted */}
          <section className="space-y-3 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-red-50 text-[#EC1D24] font-black text-xs flex items-center justify-center shrink-0 border border-red-200/60">
                01
              </span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                How Cancellation is Granted
              </h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-gray-600 font-normal leading-relaxed pl-9">
              <p>
                Cancellation requests must be submitted via registered email to{" "}
                <a
                  href="mailto:contact@trrabb.com"
                  className="text-[#EC1D24] font-bold underline underline-offset-2"
                >
                  contact@trrabb.com
                </a>
                . The cancellation charge is calculated based on the total tour booking fee.
              </p>
              <p>
                Approved refund amounts are processed within 7 to 12 working days directly to the original payment source or via bank transfer.
              </p>
            </div>
          </section>

          {/* Section 2: Refund Schedule Table */}
          <section className="space-y-4 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-red-50 text-[#EC1D24] font-black text-xs flex items-center justify-center shrink-0 border border-red-200/60">
                02
              </span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Standard Refund Schedule
              </h2>
            </div>
            <div className="pl-9">
              <RefundSchedule />
              <ul className="list-disc space-y-2 pl-5 text-xs sm:text-sm text-gray-600 font-normal leading-relaxed mt-4">
                <li>Cancellation percentages apply to the total contracted trip cost.</li>
                <li>Train, flight, and third-party transit ticket cancellation charges follow IRCTC and airline cancellation rules.</li>
                <li>In case of government-mandated travel restrictions or severe force majeure events, credit vouchers may be issued for future departures.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Contact for cancellations */}
          <section className="space-y-3 pl-9">
            <div className="bg-red-50/60 border border-red-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Need Help with an Existing Booking?
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Reach out to Trrabb operations concierge with your booking reference.
                </p>
              </div>
              <a
                href="mailto:contact@trrabb.com?subject=Cancellation%20Request"
                className="px-5 py-2.5 bg-[#EC1D24] hover:bg-[#D0171E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
              >
                Email Concierge
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
