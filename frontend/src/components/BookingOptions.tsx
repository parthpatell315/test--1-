"use client";

import { useState, useEffect, useMemo } from "react";

import {
  Check,
  MapPin,
  ArrowRight,
  Plane,
  Train,
  BedDouble,
  Calendar,
  X,
  ChevronRight,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { Trip } from "@/types";
import { normalizeImageUrl } from "@/lib/api";
import { useTripSelection } from "@/store/trip-selection";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useTheme } from "@/components/DynamicThemeProvider";
import {
  groupDeparturesByMonth,
  listUpcomingDepartures,
} from "@/lib/upcomingDepartures";

interface BookingOptionsProps {
  trip: Trip;
  onDateSelect?: (date: string | null) => void;
  onVariantSelect?: (index: number) => void;
  onTravelSelect?: (index: number) => void;
  onRoomSelect?: (index: number) => void;
  onPriceChange?: (price: number) => void;
}

export default function BookingOptions({
  trip,
  onDateSelect,
  onVariantSelect,
  onTravelSelect,
  onRoomSelect,
  onPriceChange,
}: BookingOptionsProps) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedTravel, setSelectedTravel] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(0);

  const variants = useMemo(() => {
    if (trip.variants && Array.isArray(trip.variants) && trip.variants.length > 0) {
      return trip.variants;
    }
    return [];
  }, [trip.variants]);

  const travelOptions = useMemo(
    () => (Array.isArray(trip.travelOptions) ? trip.travelOptions : []),
    [trip.travelOptions],
  );

  const roomOptions = useMemo(
    () => (Array.isArray(trip.roomOptions) ? trip.roomOptions : []),
    [trip.roomOptions],
  );

  const { currentPrice, setCurrentPrice, selectedDate, setSelectedDate } =
    useTripSelection();

  const [activeMonth, setActiveMonth] = useState("");
  const [showAllDatesModal, setShowAllDatesModal] = useState(false);

  useEffect(() => {
    const variant = variants[selectedVariant];
    let basePrice = variant?.discountedPrice ?? trip.price;
    const isDirectJoin = (variant as any)?.excludeTravel === true;
    const travelDelta = isDirectJoin
      ? 0
      : travelOptions[selectedTravel]?.priceDelta || 0;
    const roomDelta = roomOptions[selectedRoom]?.priceDelta || 0;

    // Apply Departure Date Override
    if (selectedDate && Array.isArray(trip.departurePriceOverrides)) {
      const activeOverride = trip.departurePriceOverrides.find(
        (o: any) => o.departureDate === selectedDate && o.isActive,
      );
      if (activeOverride) {
        if (activeOverride.overrideType === "FIXED_PRICE") {
          basePrice = activeOverride.amount;
        } else if (activeOverride.overrideType === "EXTRA_CHARGE") {
          basePrice += activeOverride.amount;
        }
      }
    }

    const total = basePrice + travelDelta + roomDelta;

    if (total !== currentPrice) {
      onPriceChange?.(total);
      setCurrentPrice(total);
    }
  }, [
    selectedVariant,
    selectedTravel,
    selectedRoom,
    selectedDate,
    trip.price,
    trip.departurePriceOverrides,
    onPriceChange,
    setCurrentPrice,
    currentPrice,
    variants,
    travelOptions,
    roomOptions,
  ]);
  const { settings } = useTheme();

  const { groupedDates, months } = useMemo(() => {
    const validDates = listUpcomingDepartures(trip.availableDates);
    return groupDeparturesByMonth(validDates);
  }, [trip.availableDates]);

  // Group dates by Year -> Month Abbr -> Day list for PDF brochure departure calendar layout
  const yearGroupedCalendar = useMemo(() => {
    const years: Record<
      string,
      Record<
        string,
        Array<{ dayNumStr: string; date: string; isSpecial?: boolean }>
      >
    > = {};

    Object.values(groupedDates)
      .flat()
      .forEach((vd) => {
        const yStr = vd.parsed.getFullYear().toString();
        const monthAbbr = vd.parsed
          .toLocaleString("en-US", { month: "short" })
          .toUpperCase();
        const dayNum = String(vd.parsed.getDate()).padStart(2, "0");

        if (!years[yStr]) years[yStr] = {};
        if (!years[yStr][monthAbbr]) years[yStr][monthAbbr] = [];

        const isSpecial = dayNum === "18" || dayNum === "25";

        years[yStr][monthAbbr].push({
          dayNumStr: dayNum,
          date: vd.date,
          isSpecial,
        });
      });

    return years;
  }, [groupedDates]);

  // Auto-advance activeMonth if selected month has ended or is empty
  useEffect(() => {
    if (months.length > 0) {
      if (!activeMonth || !months.includes(activeMonth)) {
        setActiveMonth(months[0]);
      }
    }
  }, [months, activeMonth]);

  const phone = settings?.contactPhone || "";
  const whatsappNumber = phone.replace(/\D/g, "");

  const handleWhatsAppBooking = () => {
    if (!whatsappNumber) {
      window.location.href = "/contact";
      return;
    }
    const selectedLocation = variants[selectedVariant]?.location || "";
    const message = encodeURIComponent(
      `Hi! I want to book the "${trip.title}" expedition from ${selectedLocation} starting at ₹${currentPrice.toLocaleString()}. Please help me with the booking.`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const isDirectJoin =
    (variants[selectedVariant] as any)?.excludeTravel === true;

  return (
    <div className="space-y-6">
      {/* Unified Booking Box */}
      <section className="bg-white rounded-[20px] p-4 md:p-5 border border-zinc-100 shadow-sm space-y-6">
        {" "}
        {/* Starting Location Section - Horizontal Slide */}
        <div>
          <div className="flex flex-row overflow-x-auto no-scrollbar gap-[16px] pb-3 -mx-1 px-1 snap-x select-none">
            {variants.length === 0 && (
              <p className="text-sm text-zinc-500 font-montserrat px-1">
                Departure options are not available for this trip.
              </p>
            )}
            {variants.map((v, i) => {
              const displayDuration = formatDuration(
                (v as any).duration || trip.duration,
                "",
              );
              const imageSrc = normalizeImageUrl(v.image);
              const isSelected = selectedVariant === i;

              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedVariant(i);
                    onVariantSelect?.(i);
                  }}
                  className={cn(
                    "itinerary-card w-[210px] sm:w-[240px] min-h-[235px] shrink-0 bg-white rounded-[12px] border-2 transition-all cursor-pointer shadow-xs snap-start flex flex-col justify-between select-none overflow-hidden",
                    isSelected
                      ? "itinerary-card-active border-[#D97934] ring-2 ring-[#D97934]/20 shadow-md"
                      : "border-[#E5E7EB] hover:border-zinc-300",
                  )}
                >
                  {/* Card Thumbnail Image — extends down to title */}
                  <div className="relative flex-1 w-full overflow-hidden bg-zinc-100 min-h-[130px]">
                    {imageSrc ? (
                      <OptimizedImage
                        src={imageSrc}
                        alt={v.location}
                        className="card-image absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : null}
                  </div>

                  {/* Card Content — compact, no white space */}
                  <div className="px-3 pb-2 pt-1.5 flex flex-col gap-0.5 mt-auto">
                    {/* City Name */}
                    <div className="card-location overflow-hidden font-montserrat">
                      <h3 className="text-[12px] sm:text-[13px] font-bold text-zinc-900 leading-tight line-clamp-1 truncate">
                        {v.location}
                      </h3>
                    </div>

                    {/* Price + Duration */}
                    <div className="card-footer flex items-center justify-between shrink-0 pt-1 border-t border-zinc-100">
                      <span className="card-price text-[15px] sm:text-[16px] font-extrabold text-[#D97934] font-montserrat whitespace-nowrap">
                        ₹{v.discountedPrice?.toLocaleString()}/-
                      </span>
                      {displayDuration && (
                        <span className="card-duration text-[11px] sm:text-[12px] font-semibold text-zinc-500 font-montserrat text-right whitespace-nowrap truncate max-w-[90px]">
                          {displayDuration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Travel Options Section */}
        {!isDirectJoin && travelOptions.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#0B1528] font-montserrat flex items-center gap-1.5">
                <Train className="w-4 h-4 text-[#F97316]" />
                <span>Travel Mode Option</span>
              </h3>
              <span className="text-[11px] text-zinc-500 font-semibold font-montserrat">
                {travelOptions[selectedTravel]?.label}
              </span>
            </div>

            <div className="option-group option-group-2col">
              {travelOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedTravel(idx);
                    onTravelSelect?.(idx);
                  }}
                  className={cn(
                    "option-button w-full flex items-center justify-between min-h-[48px] p-[12px_16px] rounded-xl border text-sm font-semibold font-montserrat transition-all cursor-pointer text-left",
                    selectedTravel === idx
                      ? "border-[#F97316] bg-orange-50/30 text-[#0B1528] ring-1 ring-[#F97316]"
                      : "border-zinc-200 text-zinc-600 bg-white hover:border-zinc-300",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        selectedTravel === idx
                          ? "border-[#F97316] bg-[#F97316]"
                          : "border-zinc-300",
                      )}
                    >
                      {selectedTravel === idx && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      )}
                    </div>
                    <span className="option-label text-[14px] truncate max-w-[180px]">
                      {opt.label}
                    </span>
                  </div>
                  {opt.priceDelta > 0 ? (
                    <span className="option-badge w-[60px] shrink-0 text-right text-[#F97316] font-bold text-[12px]">
                      +₹{opt.priceDelta.toLocaleString()}
                    </span>
                  ) : (
                    <span className="option-badge w-[60px] shrink-0 text-right text-emerald-600 font-extrabold text-[11px] uppercase">
                      INCLUDED
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Room Sharing Options Section */}
        {roomOptions.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#0B1528] font-montserrat flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-[#F97316]" />
                <span>Room Sharing Option</span>
              </h3>
              <span className="text-[11px] text-zinc-500 font-semibold font-montserrat">
                {roomOptions[selectedRoom]?.label}
              </span>
            </div>

            <div className="option-group option-group-3col">
              {roomOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedRoom(idx);
                    onRoomSelect?.(idx);
                  }}
                  className={cn(
                    "option-button w-full flex items-center justify-between min-h-[48px] p-[12px_16px] rounded-xl border text-sm font-semibold font-montserrat transition-all cursor-pointer text-left",
                    selectedRoom === idx
                      ? "border-[#F97316] bg-orange-50/30 text-[#0B1528] ring-1 ring-[#F97316]"
                      : "border-zinc-200 text-zinc-600 bg-white hover:border-zinc-300",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        selectedRoom === idx
                          ? "border-[#F97316] bg-[#F97316]"
                          : "border-zinc-300",
                      )}
                    >
                      {selectedRoom === idx && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      )}
                    </div>
                    <span className="option-label text-[14px] truncate max-w-[180px]">
                      {opt.label}
                    </span>
                  </div>
                  {opt.priceDelta > 0 ? (
                    <span className="option-badge w-[60px] shrink-0 text-right text-[#F97316] font-bold text-[12px]">
                      +₹{opt.priceDelta.toLocaleString()}
                    </span>
                  ) : (
                    <span className="option-badge w-[60px] shrink-0 text-right text-emerald-600 font-extrabold text-[11px] uppercase">
                      BASE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Departure Dates Section (Month-Wise & Auto-Removing Ended Months) */}
        <div className="space-y-2 pt-3 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-[#0B1528] font-montserrat flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#F97316]" />
              <span>Select Departure Date</span>
            </h2>
            {selectedDate && (
              <span className="text-[11px] font-bold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded font-montserrat">
                Selected:{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </span>
            )}
          </div>

          {months.length === 0 ? (
            <p className="text-sm text-zinc-500 font-montserrat py-3">
              No upcoming departures
            </p>
          ) : (
            <>
          {/* Month Tabs (Auto-purges ended months) */}
          <div className="month-tabs flex items-center gap-2 overflow-x-auto no-scrollbar">
            {months.map((month) => {
              const isActive = activeMonth === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => setActiveMonth(month)}
                  aria-pressed={isActive}
                  className={cn(
                    "month-tab inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold font-montserrat transition-all shrink-0 cursor-pointer whitespace-nowrap appearance-none",
                    isActive
                      ? "border-[#F97316] text-[#F97316] bg-orange-50 ring-1 ring-[#F97316]"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 bg-white",
                  )}
                >
                  <span className="relative z-[1]">{month}</span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 bg-[#F97316] rounded-full shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Date Chips for Selected Month */}
          <div className="date-grid grid grid-cols-5 sm:grid-cols-7 gap-2">
            {(groupedDates[activeMonth] || []).map((ad, i) => {
              const hasOverride = trip.departurePriceOverrides?.some(
                (o: any) => o.departureDate === ad.date && o.isActive,
              );
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedDate(ad.date);
                    onDateSelect?.(ad.date);
                  }}
                  className={cn(
                    "date-button w-[58px] h-[54px] flex flex-col items-center justify-center rounded-lg font-montserrat transition-all cursor-pointer shadow-2xs relative border",
                    selectedDate === ad.date
                      ? "border-[#F97316] bg-[#F97316] text-white scale-105 shadow-md"
                      : hasOverride
                        ? "border-red-200 text-[#0B1528] bg-red-50 hover:border-red-300"
                        : "border-zinc-200 text-[#0B1528] bg-white hover:border-[#F97316]/50 hover:bg-orange-50/20",
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase opacity-80 leading-none">
                    {ad.weekdayStr}
                  </span>
                  <span className="text-sm font-extrabold leading-tight mt-0.5">
                    {ad.dayStr}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View All Dates Button (Removed per user request) */}
            </>
          )}
        </div>
      </section>

      {/* View All Dates Calendar Modal (PDF Brochure Style) */}
      {showAllDatesModal && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-6 pt-[84px] sm:pt-6 pb-4 sm:pb-6 overflow-hidden">
          <div className="bg-white w-full max-w-2xl rounded-[28px] p-5 sm:p-7 shadow-2xl border border-zinc-100 max-h-[calc(100vh-104px)] sm:max-h-[90vh] flex flex-col space-y-5 font-montserrat animate-in fade-in zoom-in-95 duration-150">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4541A]" />
                <h3 className="text-base sm:text-lg font-extrabold text-[#0B1528]">
                  Group Departure Dates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllDatesModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Brochure Calendar Content */}
            <div className="overflow-y-auto space-y-6 pr-1 flex-1">
              {/* Section Header with Side Decorative Lines */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <div className="h-[2px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#D4541A]" />
                <h4 className="text-xs sm:text-sm font-extrabold text-[#0B1528] tracking-widest uppercase text-center font-montserrat">
                  GROUP DEPARTURE DATES
                </h4>
                <div className="h-[2px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#D4541A]" />
              </div>

              {/* 2-Column Grid by Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(yearGroupedCalendar).map((year) => (
                  <div key={year} className="space-y-3">
                    {/* Year Label */}
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#0B1528]">
                      <span className="w-2 h-2 rounded-full bg-[#D4541A]" />
                      <span>{year}</span>
                    </div>

                    {/* Month Cards Stack */}
                    <div className="space-y-2.5">
                      {Object.keys(yearGroupedCalendar[year]).map(
                        (monthAbbr) => {
                          const daysList = yearGroupedCalendar[year][monthAbbr];
                          return (
                            <div
                              key={monthAbbr}
                              className="bg-white border border-zinc-200/90 rounded-2xl sm:rounded-full px-4 py-2.5 flex items-center justify-between shadow-2xs hover:border-[#D4541A]/50 transition-all min-h-[44px]"
                            >
                              {/* Left: Calendar Icon + Orange Month Name */}
                              <div className="flex items-center gap-2 shrink-0 pr-2">
                                <Calendar className="w-4 h-4 text-[#0B1528]" />
                                <span className="text-xs font-extrabold text-[#D4541A] tracking-wider uppercase font-montserrat">
                                  {monthAbbr}
                                </span>
                              </div>

                              {/* Right: Days List */}
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {daysList.map((item, dIdx) => {
                                  const hasOverride =
                                    trip.departurePriceOverrides?.some(
                                      (o: any) =>
                                        o.departureDate === item.date &&
                                        o.isActive,
                                    );
                                  return (
                                    <button
                                      key={dIdx}
                                      type="button"
                                      onClick={() => {
                                        setSelectedDate(item.date);
                                        onDateSelect?.(item.date);
                                        setShowAllDatesModal(false);
                                      }}
                                      className={cn(
                                        "text-xs font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer relative",
                                        selectedDate === item.date
                                          ? "bg-[#D4541A] text-white shadow-2xs scale-105"
                                          : hasOverride
                                            ? "text-red-500 font-black hover:bg-red-50"
                                            : item.isSpecial
                                              ? "text-[#D4541A] font-black hover:bg-orange-50"
                                              : "text-zinc-700 hover:text-[#D4541A] hover:bg-zinc-100",
                                      )}
                                    >
                                      {item.dayNumStr}
                                      {dIdx < daysList.length - 1 ? "," : ""}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Peak Surcharge Alert Banner */}
              {trip.departurePriceOverrides?.some((o: any) => o.isActive) && (
                <div className="bg-orange-50/80 border border-orange-200/70 rounded-2xl p-3.5 flex items-center justify-center gap-2.5 text-center text-xs font-bold text-[#D4541A] font-montserrat">
                  <span>
                    Peak pricing is active for specific dates highlighted in
                    red.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
