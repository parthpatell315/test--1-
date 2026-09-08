"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
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
            "Our servers are temporarily unavailable. Please try again shortly.",
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
          "Failed to submit message. Please try again or WhatsApp us directly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pt-24 font-montserrat pb-20">
      {/* Top Banner */}
      <section className="bg-[#0F172A] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-blue-900/50 text-blue-400 font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block font-montserrat">
            24/7 TRIP CONCIERGE & SUPPORT
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight uppercase font-montserrat">
            CONTACT <span className="text-blue-400">US</span>
          </h1>
          <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto my-3" />
          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed font-montserrat">
            Have questions about an upcoming departure or need custom group itinerary planning?
            Talk directly to our travel experts.
          </p>
        </div>
      </section>

      {/* Form & Contact Info Section */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Inquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-montserrat tracking-tight">
                Send Us A Message
              </h2>
              <p className="text-xs sm:text-sm font-normal text-slate-500 font-montserrat">
                Fill in your details below and our travel concierge will reach out promptly.
              </p>
            </div>

            {isSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 font-montserrat">
                  Inquiry Submitted! 🎉
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-sm mx-auto font-montserrat">
                  Thank you for reaching out! Our team is reviewing your message and will get in touch shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 text-xs sm:text-sm font-semibold font-montserrat">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 font-montserrat">
                      Your Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white outline-none font-medium text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-montserrat transition-all"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 font-montserrat">
                      Mobile Number *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+91 99999 99999"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white outline-none font-medium text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-montserrat transition-all"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 font-montserrat">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="rahul@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white outline-none font-medium text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-montserrat transition-all"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 font-montserrat">
                      Target Destination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Manali, Spiti, Ladakh"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white outline-none font-medium text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-montserrat transition-all"
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
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 font-montserrat">
                    Your Query / Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your preferred travel dates, group size, or custom requirements..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white outline-none font-medium text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-montserrat transition-all resize-none"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer font-montserrat flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Message...</span>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Office Address & Direct Support Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0F172A] text-white rounded-2xl p-8 shadow-xl space-y-6 border border-slate-800">
              <h3 className="text-lg font-extrabold text-white font-montserrat uppercase tracking-tight">
                Headquarters & Concierge
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat mb-0.5">
                      Office Address
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed font-montserrat">
                      {brandConfig.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat mb-0.5">
                      Hotline & WhatsApp
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-white font-montserrat">
                      {brandConfig.supportPhone}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium font-montserrat mt-0.5">
                      Available 10 AM - 8 PM IST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat mb-0.5">
                      Email Concierge
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-white font-montserrat">
                      {brandConfig.supportEmail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
