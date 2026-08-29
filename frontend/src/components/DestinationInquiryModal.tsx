"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Users,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  User,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import { normalizeImageUrl, submitInquiry } from "@/lib/api";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface DestinationInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    id?: string;
    name: string;
    img: string;
    duration?: string;
    subtext?: string;
    availableDates?: string[];
  } | null;
  title?: string;
  description?: string;
  source?: string;
}

export default function DestinationInquiryModal({
  isOpen,
  onClose,
  destination,
  title,
  description,
  source = "website_inquiry_modal",
}: DestinationInquiryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    date: "",
    count: "",
    message: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollLockCounter = useRef(0);

  useEffect(() => {
    if (isOpen) {
      scrollLockCounter.current += 1;
      document.body.style.overflow = "hidden";
      if (
        destination?.availableDates &&
        destination.availableDates.length > 0
      ) {
        const firstDate = destination.availableDates[0];
        try {
          const d = new Date(firstDate);
          if (!isNaN(d.getTime())) {
            const formattedDate = d.toISOString().split("T")[0];
            setFormData((prev) => ({ ...prev, date: formattedDate }));
          }
        } catch (e) {
          // ignore date format error
        }
      }
    } else {
      setIsSuccess(false);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      scrollLockCounter.current -= 1;
      if (scrollLockCounter.current <= 0) {
        document.body.style.overflow = "";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, destination, onClose]);

  const modalTitle = title || "Plan Your Next Trip";
  const modalDescription =
    description || "CONNECT WITH OUR DESTINATION EXPERTS";

  if (!mounted || !destination) return null;

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
        city: formData.city,
        date: formData.date,
        preferredDate: formData.date,
        count: formData.count ? parseInt(formData.count) : undefined,
        numberOfTravelers: formData.count
          ? parseInt(formData.count)
          : undefined,
        message: formData.message,
        tripId: destination.id,
        destinationId: destination.id,
        tripTitle: destination.name,
        destinationName: destination.name,
        source: source,
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
        city: "",
        date: "",
        count: "",
        message: "",
      });
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to submit inquiry. Please try again or call us directly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalMarkup = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3.5 sm:p-5 md:p-8 pt-[84px] sm:pt-6 pb-4 sm:pb-6 overflow-hidden font-sans">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B1528]/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Main Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-white rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl z-10 max-h-[calc(100vh-104px)] sm:max-h-[88vh] flex flex-col md:flex-row border border-zinc-100/80 my-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 text-[#0B1528] flex items-center justify-center transition-all z-[120] cursor-pointer shadow-xs active:scale-90"
              aria-label="Close modal"
            >
              <X className="w-4.5 h-4.5 text-[#0B1528]" />
            </button>

            {/* Left Column: Premium Destination Visual Card */}
            <div className="relative w-full md:w-[45%] h-56 md:h-auto flex flex-col justify-between p-6 md:p-8 text-white shrink-0 overflow-hidden bg-[#0B1528] rounded-t-[24px] md:rounded-t-none md:rounded-l-[32px]">
              {destination.img && (
                <OptimizedImage
                  src={normalizeImageUrl(destination.img) || destination.img}
                  alt={destination.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-[#0B1528]/50 to-black/30" />

              {/* Top Tag Badges */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="bg-[#D4541A] text-white font-extrabold text-[10.5px] uppercase tracking-widest px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>{destination.duration || "Popular Destination"}</span>
                </span>
              </div>

              {/* Bottom Info Content */}
              <div className="relative z-10 space-y-3 mt-auto">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                    {destination.name}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-200 line-clamp-2 leading-relaxed">
                    {destination.subtext ||
                      "Join our curated group expeditions with certified trip captains."}
                  </p>
                </div>

                {/* Trust Badges Bar */}
                <div className="pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-100">
                  <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4541A]" />
                    <span className="truncate">Verified Captains</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="truncate">100% Safe Stays</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: High-Converting Form */}
            <div className="w-full md:w-[55%] p-6 sm:p-7 md:p-8 overflow-y-auto bg-white flex flex-col justify-start no-scrollbar">
              <div className="mb-5 pr-6 space-y-0.5">
                <h3 className="text-xl sm:text-2xl font-black text-[#0B1528] tracking-tight">
                  {modalTitle}
                </h3>
                <p className="text-[11px] font-extrabold text-[#D4541A] uppercase tracking-wider">
                  {modalDescription}
                </p>
              </div>

              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center my-auto space-y-3">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-extrabold text-[#0B1528]">
                      Inquiry Received! 🎉
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                      Thank you{" "}
                      <span className="font-bold text-[#0B1528]">
                        {formData.name}
                      </span>
                      . Our trip expert will call you back within{" "}
                      <span className="font-bold text-[#D4541A]">
                        15 minutes
                      </span>{" "}
                      with complete itinerary details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-6 py-2.5 bg-[#0B1528] text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      required
                      type="text"
                      placeholder="Your Full Name"
                      className="w-full pl-10 pr-4 h-10 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#D4541A] focus:bg-white outline-none transition-all font-semibold text-base text-[#0B1528] placeholder:text-slate-400 placeholder:text-xs"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  {/* Phone Input with +91 Prefix */}
                  <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#D4541A] focus-within:bg-white transition-all px-3.5 h-10 min-h-[40px]">
                    <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span className="text-slate-500 font-bold text-xs select-none border-r border-slate-200 pr-2.5 mr-2">
                      +91
                    </span>
                    <input
                      required
                      type="tel"
                      placeholder="Mobile No. (WhatsApp Enabled)"
                      className="flex-1 bg-transparent border-0 outline-none font-semibold text-base text-[#0B1528] placeholder:text-slate-400 placeholder:text-xs py-2 w-full"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                    />
                  </div>

                  {/* Email Input */}
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="Email Address (optional)"
                      className="w-full pl-10 pr-4 h-10 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#D4541A] focus:bg-white outline-none transition-all font-semibold text-base text-[#0B1528] placeholder:text-slate-400 placeholder:text-xs"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  {/* City of Residence */}
                  <div className="relative flex items-center">
                    <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="City of Residence (e.g. Ahmedabad, Mumbai)"
                      className="w-full pl-10 pr-4 h-10 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#D4541A] focus:bg-white outline-none transition-all font-semibold text-base text-[#0B1528] placeholder:text-slate-400 placeholder:text-xs"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>

                  {/* Date & Travellers Split Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative flex items-center">
                      <Calendar className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        className="w-full pl-9 pr-3 h-10 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#D4541A] focus:bg-white outline-none transition-all font-semibold text-base text-[#0B1528]"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                    </div>

                    <div className="relative flex items-center">
                      <Users className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min="1"
                        placeholder="No. Travellers"
                        className="w-full pl-9 pr-3 h-10 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#D4541A] focus:bg-white outline-none transition-all font-semibold text-base text-[#0B1528] placeholder:text-slate-400 placeholder:text-xs"
                        value={formData.count}
                        onChange={(e) =>
                          setFormData({ ...formData, count: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="relative flex items-center">
                    <MessageSquare className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Special Requests / Custom Requirements (optional)"
                      className="w-full pl-10 pr-4 h-10 min-h-[40px] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#D4541A] focus:bg-white outline-none transition-all font-semibold text-base text-[#0B1528] placeholder:text-slate-400 placeholder:text-xs"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#D4541A] hover:bg-[#b84312] text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <span>Connect With Expert</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[10.5px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    <span>Average response time: 15 minutes</span>
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalMarkup, document.body);
}
