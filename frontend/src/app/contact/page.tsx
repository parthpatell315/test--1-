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
      <section className="bg-[#0B1528] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-white/10 text-[#D4541A] font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block font-montserrat">
            24/7 EXPEDITION SUPPORT
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase font-montserrat">
            CONTACT <span className="text-[#D4541A]">US</span>
          </h1>
          <div className="w-16 h-1.5 bg-[#D4541A] rounded-full mx-auto my-3" />
          <p className="text-sm sm:text-lg text-zinc-300 font-semibold max-w-2xl mx-auto leading-relaxed font-montserrat">
            Have questions about an upcoming trek or need custom group planning?
            Talk to our destination experts.
          </p>
        </div>
      </section>

      {/* Form & Contact Info Section */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Inquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-[28px] border border-zinc-200/90 p-6 sm:p-10 shadow-xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B1528] font-montserrat tracking-tight">
                Send Us A Message
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-zinc-500 font-montserrat">
                Fill in your details below and our trip captain will call you
                back within 15 minutes.
              </p>
            </div>

            {isSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0B1528] font-montserrat">
                  Inquiry Submitted! 🎉
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 font-semibold leading-relaxed max-w-sm mx-auto font-montserrat">
                  Thank you for reaching out! Our destination team is reviewing
                  your message and will get in touch shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs sm:text-sm font-bold font-montserrat">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-[#0B1528] uppercase tracking-wider block mb-1 font-montserrat">
                      Your Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-[#D4541A] focus:bg-white outline-none font-semibold text-xs sm:text-sm text-[#0B1528] placeholder:text-zinc-400 font-montserrat transition-all"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#0B1528] uppercase tracking-wider block mb-1 font-montserrat">
                      Mobile Number *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+91 99999 99999"
                      className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-[#D4541A] focus:bg-white outline-none font-semibold text-xs sm:text-sm text-[#0B1528] placeholder:text-zinc-400 font-montserrat transition-all"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-[#0B1528] uppercase tracking-wider block mb-1 font-montserrat">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="rahul@gmail.com"
                      className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-[#D4541A] focus:bg-white outline-none font-semibold text-xs sm:text-sm text-[#0B1528] placeholder:text-zinc-400 font-montserrat transition-all"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#0B1528] uppercase tracking-wider block mb-1 font-montserrat">
                      Target Destination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Manali, Spiti, Ladakh"
                      className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-[#D4541A] focus:bg-white outline-none font-semibold text-xs sm:text-sm text-[#0B1528] placeholder:text-zinc-400 font-montserrat transition-all"
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
                  <label className="text-xs font-extrabold text-[#0B1528] uppercase tracking-wider block mb-1 font-montserrat">
                    Your Query / Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your travel dates, group size, or custom requirements..."
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-[#D4541A] focus:bg-white outline-none font-semibold text-xs sm:text-sm text-[#0B1528] placeholder:text-zinc-400 font-montserrat transition-all resize-none"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#D4541A] hover:bg-[#c24813] text-white font-black text-xs sm:text-sm uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer font-montserrat flex items-center justify-center gap-2"
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
            <div className="bg-[#0B1528] text-white rounded-[28px] p-8 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-white font-montserrat uppercase tracking-tight">
                Headquarters & Support
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D4541A] flex items-center justify-center font-bold shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-montserrat mb-0.5">
                      Office Address
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed font-montserrat">
                      Money Plant High Street, A 738, Jagatpur Rd, Gota,
                      Ahmedabad, Gujarat 382470
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-montserrat mb-0.5">
                      Call & WhatsApp Hotline
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-white font-montserrat">
                      +91 99242 46267
                    </p>
                    <p className="text-[11px] text-zinc-400 font-medium font-montserrat mt-0.5">
                      Available 10 AM - 8 PM IST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-montserrat mb-0.5">
                      Email Support
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-white font-montserrat">
                      youthcampingmedia@gmail.com
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
