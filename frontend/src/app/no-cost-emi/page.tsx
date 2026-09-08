import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { brandConfig } from "@/config/brand.config";
import { 
  Sparkles, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  ArrowRight,
  Zap,
  Percent
} from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: `No Cost EMI on Travel Packages | ${brandConfig.name}`,
  description: `Book your dream group tour or expedition with 0% interest No Cost EMI across leading banks. Zero down payment, 3 to 12 month flexible tenures.`,
  path: "/no-cost-emi",
});

const emiPlans = [
  {
    tenure: "3 Months",
    interest: "0% Interest",
    tag: "Quick Repay",
    fee: "Zero Processing Fee",
    desc: "Split your booking into 3 equal monthly payments with absolute zero interest markup.",
    highlight: false,
  },
  {
    tenure: "6 Months",
    interest: "0% Interest",
    tag: "Most Popular",
    fee: "Zero Processing Fee",
    desc: "Our most chosen option. Comfortably space out your adventure cost with zero burden.",
    highlight: true,
  },
  {
    tenure: "9 Months",
    interest: "0% Interest",
    tag: "Low Monthly",
    fee: "Minimal Bank Fee",
    desc: "Ultra-low monthly installment. Ideal for high-altitude expeditions and multi-week tours.",
    highlight: false,
  },
  {
    tenure: "12 Months",
    interest: "Low APR",
    tag: "Maximum Flexibility",
    fee: "Minimal Bank Fee",
    desc: "Enjoy complete peace of mind with 12 months of easy, predictable monthly payouts.",
    highlight: false,
  },
];

const supportedBanks = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Federal Bank",
  "OneCard",
  "RBL Bank",
  "Standard Chartered",
];

export default function NoCostEmiPage() {
  return (
    <div className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HERO (Avian Signature Style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-8 pb-12">
        <div className="inline-flex items-center gap-2 bg-red-50 text-[#EC1D24] text-xs font-bold px-4 py-1.5 rounded-full border border-red-200/80 mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Book Now, Pay Later</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4">
          Travel Your Dream Destinations with <br className="hidden sm:inline" />
          <span className="text-[#EC1D24]">No Cost EMI</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-normal mb-8">
          Your dream trip doesn’t have to wait for the perfect budget. With flexible No Cost EMI options, you can book your next adventure today and spread your payment across easy monthly installments with 0% interest.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg shadow-red-500/25 transition-all active:scale-95"
          >
            <span>Browse EMI Eligible Trips</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="mailto:contact@trrabb.com?subject=No%20Cost%20EMI%20Assistance"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm sm:text-base px-7 py-3.5 rounded-full border border-gray-200/90 shadow-sm transition-all"
          >
            <span>Talk to EMI Specialist</span>
          </a>
        </div>
      </section>

      {/* 2. EMI PLANS GRID */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Flexible Tenures Tailored to Your Budget
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5 font-medium">
            Pick the tenure that best fits your travel schedule and savings plan
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {emiPlans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 sm:p-7 transition-all flex flex-col justify-between border ${
                plan.highlight
                  ? "bg-white border-[#EC1D24] shadow-xl ring-2 ring-red-500/20 relative"
                  : "bg-white border-gray-200/80 shadow-md hover:shadow-lg"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EC1D24] text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  {plan.tag}
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">
                    {plan.tenure}
                  </h3>
                  <span className="text-xs font-bold text-[#EC1D24] bg-red-50 px-2.5 py-1 rounded-full">
                    {plan.interest}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {plan.fee}
                  </p>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  {plan.desc}
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/trips"
                  className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                    plan.highlight
                      ? "bg-[#EC1D24] hover:bg-[#D0171E] text-white shadow-sm"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                  }`}
                >
                  <span>Select Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS (3 Simple Steps) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/80 shadow-md">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#EC1D24] bg-red-50 px-3 py-1 rounded-full inline-block mb-2">
              Instant Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              How No Cost EMI Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 text-center md:text-left">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EC1D24] font-black text-lg flex items-center justify-center mx-auto md:mx-0">
                01
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Choose Your Departure
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Select your preferred dates and room sharing on any Trrabb trip page. Click Book Now to enter the checkout flow.
              </p>
            </div>

            <div className="space-y-3 text-center md:text-left">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EC1D24] font-black text-lg flex items-center justify-center mx-auto md:mx-0">
                02
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Select EMI at Payment
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                On the payment gateway, select the "EMI / Pay Later" option and pick your bank and preferred tenure (3, 6, 9 or 12 months).
              </p>
            </div>

            <div className="space-y-3 text-center md:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-lg flex items-center justify-center mx-auto md:mx-0">
                03
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Instant Confirmation
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Get approved instantly with zero documentation. Your booking confirmation and passenger voucher will be issued immediately!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SUPPORTED BANKS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-md text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Supported Banks & Cards
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {supportedBanks.map((bank, i) => (
              <span
                key={i}
                className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs"
              >
                {bank}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 pt-2">
            * 0% interest discount is applied instantly at checkout. Terms and conditions apply per individual issuing bank policies.
          </p>
        </div>
      </section>
    </div>
  );
}
