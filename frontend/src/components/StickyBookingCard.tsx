"use client";

import { useEffect, useState, useMemo } from "react";
import { MessageCircle, ShieldCheck, Sparkles, Calendar, Users, HelpCircle, Check } from "lucide-react";
import { useTripSelection } from "@/store/trip-selection";
import { Trip } from "@/types";
import { cn, formatDuration } from "@/lib/utils";
import { useTheme } from "@/components/DynamicThemeProvider";

interface StickyBookingCardProps {
  trip: Trip;
}

export default function StickyBookingCard({ trip }: StickyBookingCardProps) {
  const { currentPrice, selectedDate, setSelectedDate, setCurrentPrice } = useTripSelection();
  const { settings } = useTheme();

  // Parse available dates or provide demo dates
  const availableDatesList = useMemo(() => {
    if (Array.isArray(trip.availableDates) && trip.availableDates.length > 0) {
      return trip.availableDates.map((d: any) => ({
        date: typeof d === "string" ? d : d.date,
        capacity: d.capacity || 16,
        bookedCount: d.bookedCount || 8,
      }));
    }
    // Demo fallbacks for realistic experience
    return [
      { date: "2024-10-18", capacity: 16, bookedCount: 12 },
      { date: "2024-10-25", capacity: 16, bookedCount: 14 },
      { date: "2024-11-08", capacity: 16, bookedCount: 6 },
      { date: "2024-11-22", capacity: 16, bookedCount: 4 },
      { date: "2024-12-06", capacity: 16, bookedCount: 10 },
    ];
  }, [trip.availableDates]);

  // Selected date state
  const [activeDate, setActiveDate] = useState<string>(
    selectedDate || availableDatesList[0]?.date || ""
  );

  // Room sharing state
  const [roomSharing, setRoomSharing] = useState<"triple" | "double" | "solo">("triple");

  const roomDelta = roomSharing === "double" ? 2500 : roomSharing === "solo" ? 6000 : 0;
  const basePrice = trip.price || 24999;
  const originalPrice = (trip as any).original_price || Math.round(basePrice * 1.25);
  const finalPrice = basePrice + roomDelta;
  const emiPrice = Math.round(finalPrice / 12);
  const durationStr = formatDuration(trip.duration);

  useEffect(() => {
    setCurrentPrice(finalPrice);
  }, [finalPrice, setCurrentPrice]);

  const handleDateSelect = (d: string) => {
    setActiveDate(d);
    setSelectedDate(d);
  };

  const handleBooking = () => {
    window.location.href = `/book/${trip.slug}?date=${activeDate}&sharing=${roomSharing}`;
  };

  const handleExpertChat = () => {
    const formatted = activeDate ? new Date(activeDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Upcoming";
    const msg = encodeURIComponent(`Hi, I need assistance with booking the "${trip.title}" tour for ${formatted}. Please help me with the itinerary and details.`);
    window.open(`https://wa.me/919924246267?text=${msg}`, "_blank");
  };

  return (
    <div className="sticky top-[92px] z-20 space-y-5 hidden lg:block">
      {/* MAIN AVIAN EXPERIENCES BOOKING CARD */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200/90 p-6 xl:p-7">
        
        {/* Top Starting Price & Discount */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-[#7E7E7E] uppercase tracking-wider">
            Starting From
          </span>
          {originalPrice > basePrice && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Save ₹{(originalPrice - basePrice).toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Price display */}
        <div className="flex items-baseline gap-2.5 mb-1">
          <div className="text-3xl xl:text-4xl font-black text-[#1A1A1A] tracking-tight">
            ₹{finalPrice.toLocaleString("en-IN")}
          </div>
          {originalPrice > basePrice && (
            <span className="text-sm font-semibold text-gray-400 line-through">
              ₹{originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <div className="text-xs font-medium text-gray-400 mb-4">
          per person + taxes
        </div>

        {/* No Cost EMI Pill (Avian Signature) */}
        <div className="bg-[#EBF5FE] border border-[#89C1FB]/50 rounded-xl p-3 flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>EMI starts at <strong>₹{emiPrice.toLocaleString("en-IN")}/mo</strong></span>
          </div>
          <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md shadow-xs">
            No Cost EMI
          </span>
        </div>

        {/* DEPARTURE DATES SELECTOR */}
        <div className="mb-5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Calendar className="w-3.5 h-3.5 text-[#EC1D24]" />
            Departure Dates
          </label>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {availableDatesList.map((batch, idx) => {
              const isSelected = activeDate === batch.date;
              const dateObj = new Date(batch.date);
              const formattedStr = isNaN(dateObj.getTime())
                ? batch.date
                : dateObj.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  });
              const remaining = batch.capacity - batch.bookedCount;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(batch.date)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                    isSelected
                      ? "border-[#EC1D24] bg-red-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  <span className={cn("text-xs font-bold", isSelected ? "text-[#EC1D24]" : "text-gray-900")}>
                    {formattedStr}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    {remaining <= 4 ? (
                      <span className="text-amber-600 font-semibold">{remaining} spots left</span>
                    ) : (
                      "Available"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ROOM SHARING SELECTOR */}
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Users className="w-3.5 h-3.5 text-[#EC1D24]" />
            Room Sharing / Occupancy
          </label>

          <div className="space-y-2">
            {[
              { id: "triple", label: "Triple Sharing", sub: "Standard package rate", delta: 0 },
              { id: "double", label: "Double Sharing", sub: "+ ₹2,500 / person", delta: 2500 },
              { id: "solo", label: "Solo Occupancy", sub: "+ ₹6,000 / person", delta: 6000 },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRoomSharing(option.id as any)}
                className={cn(
                  "w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                  roomSharing === option.id
                    ? "border-[#EC1D24] bg-red-50/30 text-gray-900"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                )}
              >
                <div>
                  <span className="text-xs font-bold block text-gray-900">{option.label}</span>
                  <span className="text-[11px] text-gray-500">{option.sub}</span>
                </div>
                {roomSharing === option.id && (
                  <Check className="w-4 h-4 text-[#EC1D24]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* PRIMARY ACTION BUTTON */}
        <button
          onClick={handleBooking}
          className="w-full py-4 bg-[#EC1D24] hover:bg-[#D0171E] text-white rounded-2xl font-bold text-base shadow-lg shadow-red-500/25 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 mb-3"
        >
          <span>Book Now</span>
        </button>

        {/* TRUST BADGES */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 pt-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified Leaders
          </span>
          <span>•</span>
          <span>Free Cancellation</span>
          <span>•</span>
          <span>100% Safe</span>
        </div>
      </div>

      {/* AVIAN "STILL GOT QUERIES ?" CARD */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-200/80 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EC1D24] flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h4 className="text-lg font-bold text-[#1A1A1A] mb-1">
          Still Got Queries?
        </h4>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Have your questions answered directly by Trrabb's Destination Specialists.
        </p>

        <button
          onClick={handleExpertChat}
          className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl border border-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-[#EC1D24]" />
          <span>Connect with Expert</span>
        </button>
      </div>
    </div>
  );
}
