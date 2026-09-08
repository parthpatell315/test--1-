"use client";

import { useState } from "react";
import {
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Compass
} from "lucide-react";
import { submitInquiry } from "@/lib/api";
import { brandConfig } from "@/config/brand.config";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    destination: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitInquiry({
        name: formData.name,
        phone: formData.mobile,
        mobile: formData.mobile,
        email: formData.email,
        tripTitle: formData.destination,
        destinationName: formData.destination,
        message: formData.message,
        source: "contact_page_form",
      });

      if (!result.success) {
        setError(
          result.message ||
            "Our servers are temporarily unavailable. Please try again shortly."
        );
        return;
      }

      setIsSuccess(true);
      setFormData({
        name: "",
        mobile: "",
        email: "",
        destination: "",
        message: "",
      });
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to submit message. Please try again or email us directly."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F6F8] min-h-screen pt-24 sm:pt-28 font-sans pb-24">
      {/* 1. HEADER (Avian Signature Style) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center pt-8 pb-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#EC1D24] tracking-tight mb-3">
          Contact Us
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-normal">
          We're here to assist you with your travel plans. Please fill out the form below and our destination concierge will get back to you as soon as possible.
        </p>
      </section>

      {/* 2. MAIN 2-COLUMN SECTION (Avian Exact Layout) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Trrabb Concierge Info */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/80 shadow-md space-y-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#EC1D24] bg-red-50 px-3 py-1 rounded-full inline-block mb-3">
                Concierge Deck
              </span>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {brandConfig.name} Experiences
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-normal">
                Curating extraordinary small-batch group adventures across India and beyond.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              {/* Email Contact */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#EC1D24] flex items-center justify-center font-bold shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Email Concierge
                  </p>
                  <a
                    href="mailto:contact@trrabb.com"
                    className="text-sm sm:text-base font-bold text-gray-900 hover:text-[#EC1D24] transition-colors"
                  >
                    contact@trrabb.com
                  </a>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Average response time under 2 hours
                  </p>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Operating Schedule
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    Mon – Sat: 9:00 AM – 8:00 PM IST
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                    Online Inquiries & Bookings: 24/7 Active
                  </p>
                </div>
              </div>

              {/* Custom Expeditions */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Custom & Private Groups
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Looking for a private college batch, corporate retreat, or bespoke family expedition? Let our route specialists customize an itinerary for you.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="border-t border-gray-100 pt-6 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                100% Verified
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-4 h-4 text-[#EC1D24]" />
                No Cost EMI
              </span>
              <span>•</span>
              <span className="font-medium">Secure Payments</span>
            </div>
          </div>

          {/* Right Column: Inquiry Form (Avian Style) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/80 shadow-md">
            <div className="mb-6">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Send Us a Message
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Enter your details and our trip specialist will connect with tailored details.
              </p>
            </div>

            {isSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3 animate-in fade-in">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-gray-900">
                  Message Sent Successfully!
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out to Trrabb. Our destination expert is reviewing your request and will email you shortly.
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-[#EC1D24] text-xs sm:text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Your Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EC1D24] focus:bg-white outline-none font-medium text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-all"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EC1D24] focus:bg-white outline-none font-medium text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-all"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EC1D24] focus:bg-white outline-none font-medium text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-all"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Interested Destination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spiti Valley, Ladakh, Meghalaya"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EC1D24] focus:bg-white outline-none font-medium text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-all"
                      value={formData.destination}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destination: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Your Message / Requirements *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us your tentative travel dates, group size, or specific preferences..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EC1D24] focus:bg-white outline-none font-medium text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-all resize-none"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold text-sm py-4 rounded-xl shadow-lg shadow-red-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Message...</span>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
