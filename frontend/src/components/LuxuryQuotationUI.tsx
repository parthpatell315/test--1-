"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Quotation, Hotel, ItineraryDay, Trip } from "@/types";
import {
  Calendar,
  Users,
  Clock3,
  MapPin,
  Plane,
  Train,
  Car,
  Ship,
  Bus,
  Hotel as HotelIcon,
  MessageCircle,
  Phone,
  Check,
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { useTheme } from "@/components/DynamicThemeProvider";
import TripGallerySection from "@/components/TripGallerySection";
import TripSubNav from "@/components/TripSubNav";
import AboutTrip from "@/components/AboutTrip";
import ItineraryAccordion from "@/components/ItineraryAccordion";
import InclusionsExclusions from "@/components/InclusionsExclusions";
import TripHighlightsList from "@/components/TripHighlightsList";
import StaySection from "@/components/StaySection";
import TripReviews from "@/components/TripReviews";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import "./LuxuryQuotationUI.css";

function getDayDate(baseDate: string | undefined, dayOffset: number): string {
  if (!baseDate) return "";
  try {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function splitTripTitle(fullTitle: string) {
  const keywords = [
    "Backpacking Trip",
    "Road Trip",
    "Group Trip",
    "Honeymoon",
    "Package",
    "Backpacking",
    "Roadtrip",
    "Trek",
    "Expedition",
    "Tour",
    "Trip",
  ];
  let main = fullTitle;
  let sub = "";
  for (const kw of keywords) {
    const idx = fullTitle.toLowerCase().lastIndexOf(kw.toLowerCase());
    if (idx > 0) {
      main = fullTitle.substring(0, idx).trim();
      sub = fullTitle.substring(idx).trim();
      break;
    }
  }
  if (!sub) {
    const words = fullTitle.split(" ");
    if (words.length > 1) {
      main = words.slice(0, -1).join(" ");
      sub = words[words.length - 1];
    }
  }
  return { main, sub };
}

function normalizeTravelIcon(icon?: string): string {
  const raw = (icon || "").trim().toLowerCase();
  const map: Record<string, string> = {
    plane: "plane",
    flight: "plane",
    train: "train",
    car: "car",
    taxi: "car",
    cab: "car",
    ship: "ship",
    ferry: "ship",
    bus: "bus",
    pickup: "pickup",
    hotel: "hotel",
    stay: "hotel",
  };
  if (map[raw]) return map[raw];
  const codes = Array.from(icon || "").map((ch) => ch.codePointAt(0) || 0);
  if (
    codes.includes(0x2708) ||
    codes.includes(0x1f6eb) ||
    codes.includes(0x1f6e9)
  )
    return "plane";
  if (codes.includes(0x1f686) || codes.includes(0x1f682)) return "train";
  if (codes.includes(0x1f697) || codes.includes(0x1f695)) return "car";
  if (codes.includes(0x1f6a2)) return "ship";
  if (codes.includes(0x1f68c)) return "bus";
  return "car";
}

function TravellingIcon({ icon }: { icon: string }) {
  const cls = "w-[18px] h-[18px] text-[#FF4D00] stroke-[1.8] shrink-0";
  switch (normalizeTravelIcon(icon)) {
    case "plane":
      return <Plane className={cls} />;
    case "train":
      return <Train className={cls} />;
    case "ship":
      return <Ship className={cls} />;
    case "bus":
      return <Bus className={cls} />;
    case "hotel":
      return <HotelIcon className={cls} />;
    case "pickup":
      return <MapPin className={cls} />;
    default:
      return <Car className={cls} />;
  }
}

function mapItinerary(q: Quotation): ItineraryDay[] {
  return (q.itinerary || []).map((day, idx) => ({
    day: day.day || idx + 1,
    title: day.title,
    description: day.description,
    location: day.location || "",
    activities: day.activities || [],
    stay: day.stay || "",
    meals: day.meals || "",
    photos: Array.isArray(day.photos)
      ? day.photos
      : day.image
        ? [day.image]
        : day.photo
          ? [day.photo]
          : [],
  }));
}

function mapHotels(
  hotels: Hotel[] | undefined,
  staySummary: Quotation["staySummary"],
  mealsInfo?: string,
) {
  if (!hotels || hotels.length === 0) return [];
  return hotels.map((hotel, i) => {
    const nights = staySummary?.[i]?.nights;
    const nightLabel =
      nights != null
        ? `${nights} Night${nights > 1 ? "s" : ""}`
        : "1 Night";
    const photoList =
      hotel.photos && hotel.photos.length > 0 ? hotel.photos : [hotel.image];
    return {
      name: hotel.name,
      location: hotel.location || staySummary?.[i]?.location || "",
      nights: nightLabel,
      type: hotel.roomType || "Hotel",
      starRating: hotel.stars
        ? `${hotel.stars}-Star`
        : hotel.rating
          ? `${hotel.rating}-Star`
          : "",
      roomType: hotel.roomType || "Superior Room",
      meals: hotel.meals || mealsInfo || "Breakfast",
      image: hotel.image,
      amenities: hotel.amenities || [],
      gallery: photoList.filter(Boolean).map((url) => ({
        url,
        category: "Property & Views",
        title: hotel.name,
      })),
    };
  });
}

function experienceUrls(q: Quotation): string[] {
  return (q.experiencePhotos || [])
    .map((photo) => {
      if (typeof photo === "string") return photo;
      const obj = photo as unknown as { url?: string; image?: string };
      return obj.url || obj.image || "";
    })
    .filter(Boolean);
}

export default function LuxuryQuotationUI({ q }: { q: Quotation }) {
  const { settings } = useTheme();
  const [selectedTier, setSelectedTier] = useState<"standard" | "premium">(
    "premium",
  );
  const [timeLeft, setTimeLeft] = useState("");

  const itineraryDays = useMemo(() => mapItinerary(q), [q]);
  const galleryImages = useMemo(() => {
    const itineraryPhotos = (q.itinerary || []).flatMap((d: any) =>
      Array.isArray(d.photos)
        ? d.photos
        : d.image
          ? [d.image]
          : d.photo
            ? [d.photo]
            : [],
    );
    const hotelPhotos = [
      ...(q.highLevelHotels || []),
      ...(q.lowLevelHotels || []),
    ].flatMap((h: any) =>
      Array.isArray(h.images)
        ? h.images
        : h.image
          ? [h.image]
          : h.photos
            ? h.photos
            : [],
    );

    const urls = [
      q.coverImage,
      q.heroImage,
      ...(q.heroImages || []),
      ...itineraryPhotos,
      ...hotelPhotos,
      ...experienceUrls(q),
    ]
      .map((u) => normalizeImageUrl(u))
      .filter(Boolean) as string[];
    return Array.from(new Set(urls));
  }, [q]);

  const galleryTrip = useMemo(() => {
    const hero = q.coverImage || q.heroImage || galleryImages[0] || "";
    const heroNorm = normalizeImageUrl(hero);
    const remainingImages = galleryImages.filter(
      (url) => normalizeImageUrl(url) !== heroNorm,
    );
    return {
      title: q.tripTitle,
      heroImage: hero || galleryImages[0] || "",
      images: remainingImages,
      location: q.destination,
      itinerary: itineraryDays,
    } as Trip;
  }, [q, galleryImages, itineraryDays]);

  const premiumHotels = useMemo(
    () => mapHotels(q.highLevelHotels, q.staySummary, q.mealsInfo),
    [q],
  );
  const standardHotels = useMemo(
    () => mapHotels(q.lowLevelHotels, q.staySummary, q.mealsInfo),
    [q],
  );
  const hasBothTiers =
    premiumHotels.length > 0 && standardHotels.length > 0;
  const selectedHotels =
    selectedTier === "premium"
      ? premiumHotels.length > 0
        ? premiumHotels
        : standardHotels
      : standardHotels.length > 0
        ? standardHotels
        : premiumHotels;

  useEffect(() => {
    if (!q.expiryTime) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(q.expiryTime!).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [q.expiryTime]);

  const phone = settings?.contactPhone || "";
  const whatsappNumber = phone.replace(/\D/g, "");
  const pax = q.paxCount || q.pax || 2;
  const travelDate = getDayDate(q.travelDates?.from, 0);
  const durationStr = formatDuration(q.duration, "6 Days / 5 Nights");
  const { main, sub } = splitTripTitle(q.tripTitle || q.destination || "Your Trip");

  const listPrice =
    (selectedTier === "premium"
      ? q.highLevelPrice || 47800
      : q.lowLevelPrice || 32800) || 0;
  const salePrice = listPrice - (q.discount || 0);
  const expertPhoto = normalizeImageUrl(q.expert?.photo);
  const expertInitial = (q.expert?.name || "S").charAt(0);
  const expired = timeLeft === "EXPIRED";
  const rawExpertNumber = (
    q.expert?.whatsapp ||
    q.expert?.phone ||
    whatsappNumber ||
    ""
  ).replace(/\D/g, "");

  const expertTargetNumber =
    rawExpertNumber.length === 10
      ? `91${rawExpertNumber}`
      : rawExpertNumber.startsWith("91")
        ? rawExpertNumber
        : rawExpertNumber || "918866699409";

  const handleWhatsAppBooking = () => {
    const expertNameGreeting = q.expert?.name ? ` ${q.expert.name}` : "";
    const tierName = hasBothTiers
      ? ` (${selectedTier === "premium" ? "Premium" : "Standard"} Tier)`
      : "";

    const message = encodeURIComponent(
      `Hi${expertNameGreeting}! I've reviewed the quotation for "${q.tripTitle}"${tierName}.\n\n` +
        `👤 Traveler: ${q.customerName || "Customer"}\n` +
        `👥 Group: ${pax} Travellers\n` +
        `📅 Travel Date: ${travelDate || "As proposed"}\n` +
        `💰 Total: ₹ ${salePrice.toLocaleString()}\n\n` +
        `I would like to confirm and book my spot. Please share next steps!`,
    );
    window.open(`https://wa.me/${expertTargetNumber}?text=${message}`, "_blank");
  };

  const expertWhatsAppHref = `https://wa.me/${expertTargetNumber}?text=${encodeURIComponent(
    `Hi ${q.expert?.name || "Expert"}, I've reviewed the quotation for "${q.tripTitle}". I'd like to discuss further.`,
  )}`;

  const travellingItems =
    q.travelling && q.travelling.length > 0
      ? q.travelling
      : [
          { icon: "plane", label: "Arrival transfer" },
          { icon: "car", label: "Airport pickup" },
          { icon: "car", label: "Private sightseeing vehicle" },
          { icon: "car", label: "Airport drop" },
        ];

  const overviewText =
    q.overview ||
    `A private itinerary prepared for ${q.customerName}, built around ${q.destination}. ${durationStr} for ${pax} travellers${travelDate ? `, starting ${travelDate}` : ""}. Every stay, transfer, and experience below is quoted specifically for this group.`;

  const highlightItems =
    experienceUrls(q).length > 0
      ? experienceUrls(q)
      : galleryImages;

  const navSections = [
    { id: "about", label: "About" },
    { id: "itinerary", label: "Itinerary" },
    { id: "inclusions", label: "Inclusions" },
    { id: "highlights", label: "Highlights" },
    ...(selectedHotels.length > 0 ? [{ id: "stay", label: "Stay" }] : []),
    { id: "expert", label: "Your Expert" },
    ...(q.reviews && q.reviews.length > 0
      ? [{ id: "reviews", label: "Reviews" }]
      : []),
  ];

  const inclusions =
    q.inclusions && q.inclusions.length > 0
      ? q.inclusions
      : [
          "Stay in Hotel/Resort as per Package",
          "Daily Breakfast at Property",
          "Airport Pickup and Drop-off",
          "AC Taxi Vehicle for Sightseeing",
        ];
  const exclusions =
    q.exclusions && q.exclusions.length > 0
      ? q.exclusions
      : [
          "5% GST",
          "Surcharge of Peak Season",
          "Any Paid Activities",
          "Entry Fees of Any",
        ];

  return (
    <div className="lq-page bg-white min-h-screen font-montserrat">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 pt-[84px] pb-24 lg:pb-8 space-y-4 md:space-y-6">
        <TripGallerySection trip={galleryTrip} />

        <div>
          <div className="mb-3">
            <span className="inline-flex bg-[#0B1528] text-white font-montserrat font-bold text-[11px] tracking-wider uppercase px-3.5 py-1.5 rounded-full shadow-md border border-[#FF4D00]">
              Prepared for {q.customerName}
            </span>
          </div>
          <h1
            style={{ fontWeight: 800, color: "#0B1528" }}
            className="text-[26px] sm:text-[34px] md:text-[40px] font-black tracking-tight leading-[1.15] font-montserrat"
          >
            {main}
          </h1>
          {sub && (
            <span className="font-caveat font-bold text-[#FF4D00] text-[28px] sm:text-[36px] md:text-[42px] leading-tight block mt-0.5">
              {sub}
            </span>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-8 gap-y-3 gap-x-4 py-2.5 sm:py-3 border-t border-[#E8EEF4] w-full relative z-10 bg-white">
            {[
              { label: "Duration", val: durationStr, icon: Clock3 },
              {
                label: "Travel Date",
                val: travelDate || "Dates on request",
                icon: Calendar,
              },
              {
                label: "Travellers",
                val: `${pax} Adults`,
                icon: Users,
              },
              {
                label: "Destination",
                val: q.destination || "India",
                icon: MapPin,
              },
            ].map((info, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <info.icon className="w-[18px] h-[18px] text-[#0B1528] stroke-[1.8] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[#0B1528] font-semibold text-[13px] sm:text-sm leading-tight font-montserrat truncate">
                    {info.val}
                  </p>
                  <p className="text-[#0B1528]/55 font-medium text-[11px] leading-tight font-montserrat mt-0.5">
                    {info.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-8 min-w-0">
              <TripSubNav sections={navSections} />

              <div className="space-y-7 md:space-y-8 pt-2.5 md:pt-3">
                <div
                  id="about"
                  className="scroll-mt-[124px] md:scroll-mt-[128px]"
                >
                  <AboutTrip
                    description={overviewText}
                    customAboutTrip={{
                      title: "About This Trip",
                      description: overviewText,
                      cards: [
                        {
                          title: "Best Experiences",
                          subtitle: "Local experts, custom days",
                          icon: "Compass",
                          iconColor: "#FF4D00",
                          bgColor: "#FFFFFF",
                          borderColor: "rgba(255, 77, 0, 0.35)",
                        },
                        {
                          title: "Happy Travellers",
                          subtitle: "Trusted across India",
                          icon: "Heart",
                          iconColor: "#FF4D00",
                          bgColor: "#FFFFFF",
                          borderColor: "rgba(255, 77, 0, 0.35)",
                        },
                        {
                          title: "Personalized Trip",
                          subtitle: `Prepared for ${q.customerName}`,
                          icon: "MapPin",
                          iconColor: "#FF4D00",
                          bgColor: "#FFFFFF",
                          borderColor: "rgba(255, 77, 0, 0.35)",
                        },
                        {
                          title: "24x7 Support",
                          subtitle: "Your expert on WhatsApp",
                          icon: "PhoneCall",
                          iconColor: "#FF4D00",
                          bgColor: "#FFFFFF",
                          borderColor: "rgba(255, 77, 0, 0.35)",
                        },
                      ],
                    }}
                  />
                </div>

                {q.staySummary && q.staySummary.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {q.staySummary.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 bg-white border border-[#0B1528]/10 px-3 py-1.5 rounded-full text-xs font-bold text-[#0B1528] shadow-2xs font-montserrat"
                      >
                        <HotelIcon className="w-3.5 h-3.5 text-[#0B1528] shrink-0" />
                        {item.nights} Night{item.nights > 1 ? "s" : ""} in{" "}
                        {item.location}
                      </span>
                    ))}
                    {q.roomsInfo ? (
                      <span className="inline-flex items-center gap-2 bg-white border border-[#FF4D00]/40 px-3 py-1.5 rounded-full text-xs font-bold text-[#FF4D00] shadow-2xs font-montserrat">
                        {q.roomsInfo}
                      </span>
                    ) : null}
                    {q.mealsInfo ? (
                      <span className="inline-flex items-center gap-2 bg-white border border-[#FF4D00]/40 px-3 py-1.5 rounded-full text-xs font-bold text-[#FF4D00] shadow-2xs font-montserrat">
                        {q.mealsInfo}
                      </span>
                    ) : null}
                  </div>
                )}

                <section className="space-y-4">
                  <h2 className="text-xl md:text-2xl font-extrabold text-[#0B1528] font-montserrat">
                    Getting{" "}
                    <span className="text-[#FF4D00] font-caveat italic">
                      There
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {travellingItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3.5 bg-white border border-[#0B1528]/10 rounded-2xl shadow-2xs"
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white border border-[#FF4D00]/35">
                          <TravellingIcon icon={item.icon} />
                        </div>
                        <p className="text-[#0B1528] font-bold text-xs sm:text-sm font-montserrat leading-tight">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <ItineraryAccordion
                  itinerary={itineraryDays}
                  startDate={q.travelDates?.from}
                />

                <InclusionsExclusions
                  inclusions={inclusions}
                  exclusions={exclusions}
                />

                <TripHighlightsList items={highlightItems} />

                {selectedHotels.length > 0 && (
                  <div className="space-y-3">
                    {hasBothTiers && (
                      <div className="flex justify-end">
                        <div className="flex p-1 bg-[#0B1528]/[0.06] rounded-xl border border-[#E8EEF4] shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedTier("standard")}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap ${
                              selectedTier === "standard"
                                ? "bg-white text-[#0B1528] shadow-2xs font-extrabold"
                                : "text-[#0B1528]/55 hover:text-[#0B1528]"
                            }`}
                          >
                            Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTier("premium")}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold font-montserrat transition-all cursor-pointer whitespace-nowrap ${
                              selectedTier === "premium"
                                ? "bg-white text-[#FF4D00] shadow-2xs font-extrabold"
                                : "text-[#0B1528]/55 hover:text-[#0B1528]"
                            }`}
                          >
                            Premium
                          </button>
                        </div>
                      </div>
                    )}
                    <StaySection
                      key={selectedTier}
                      accommodations={selectedHotels}
                    />
                  </div>
                )}

                <section
                  id="expert"
                  className="space-y-5 scroll-mt-[124px] md:scroll-mt-[128px]"
                >
                  <h2 className="text-xl md:text-2xl font-extrabold text-[#0B1528] font-montserrat">
                    Your{" "}
                    <span className="text-[#FF4D00] font-caveat italic">
                      Destination Expert
                    </span>
                  </h2>
                  <div className="bg-white border border-[#0B1528]/10 rounded-[20px] p-6 sm:p-7 flex flex-col sm:flex-row items-start gap-5">
                    {expertPhoto ? (
                      <OptimizedImage
                        src={expertPhoto}
                        alt={q.expert?.name || "Destination expert"}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-[18px] object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[18px] bg-[#0B1528] text-white flex items-center justify-center text-3xl font-extrabold font-montserrat shrink-0">
                        {expertInitial}
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-[#0B1528] font-montserrat tracking-tight">
                          {q.expert?.name || "Suresh Chaudhary"}
                        </h3>
                        <p className="text-[#FF4D00] font-caveat italic text-xl leading-tight">
                          {q.expert?.designation || "Destination Expert"}
                        </p>
                      </div>
                      <p className="text-[#0B1528]/60 text-sm font-montserrat leading-relaxed">
                        {q.expert?.description ||
                          "I'll walk you through this itinerary, adjust stays if you want, and stay on WhatsApp from the first transfer to the last drop."}
                      </p>
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <a
                          href={expertWhatsAppHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#FF4D00] text-white rounded-xl font-bold text-xs uppercase tracking-wider font-montserrat hover:brightness-[0.94] transition-all active:scale-95"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </a>
                        <a
                          href={`tel:${q.expert?.phone || q.expert?.whatsapp}`}
                          className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-[#0B1528]/15 rounded-xl text-xs font-bold text-[#0B1528] font-montserrat hover:bg-[#0B1528]/[0.04] transition-all"
                        >
                          <Phone className="w-4 h-4 text-[#FF4D00]" />
                          Call
                        </a>
                      </div>
                    </div>
                  </div>
                </section>

                {q.reviews && q.reviews.length > 0 ? (
                  <TripReviews reviews={q.reviews} />
                ) : null}

                <div className="bg-[#0B1528] rounded-[20px] p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF4D00] flex items-center justify-center shrink-0 text-white">
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base font-montserrat leading-tight">
                        Ready to confirm this itinerary?
                      </h4>
                      <p className="text-white/60 text-xs font-montserrat mt-0.5">
                        Message your expert on WhatsApp to lock dates and stays.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleWhatsAppBooking}
                    disabled={expired}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#FF4D00] hover:brightness-[0.94] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all font-montserrat shrink-0 shadow-lg shadow-[#FF4D00]/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {expired ? "Quote Expired" : "Book My Spot"}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 relative min-w-0">
              <div className="sticky top-[96px] xl:top-[100px] z-20 space-y-4 hidden lg:block">
                <div className="bg-[#0B1528] rounded-[24px] overflow-hidden shadow-xl p-6 md:p-7 text-white border border-white/10">
                  <span className="text-white/55 font-bold text-xs uppercase tracking-wider block mb-2 font-montserrat">
                    Your investment
                  </span>

                  <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1 font-montserrat flex items-baseline gap-2">
                    ₹ {salePrice.toLocaleString()}
                  </div>

                  <div className="text-white/55 text-xs font-normal mb-2 font-montserrat">
                    <span className="line-through mr-1.5">
                      ₹ {listPrice.toLocaleString()}
                    </span>
                    per person + taxes
                  </div>

                  {q.discount ? (
                    <p className="text-[#FF4D00] text-[11px] font-bold font-montserrat mb-4">
                      Save ₹ {q.discount.toLocaleString()} on this quote
                    </p>
                  ) : (
                    <div className="mb-4" />
                  )}

                  <div className="h-px bg-white/10 mb-5" />

                  <p className="text-white/55 text-[11px] font-bold uppercase tracking-wider mb-1 font-montserrat">
                    Current package configuration
                  </p>
                  <p className="text-white font-bold text-base mb-1 font-montserrat">
                    {hasBothTiers
                      ? `${selectedTier === "premium" ? "Premium" : "Standard"} · ${durationStr}`
                      : durationStr}
                  </p>
                  <p className="text-white/55 text-xs font-medium font-montserrat mb-4">
                    {travelDate || "Dates on request"} · {pax} Adults
                  </p>

                  {hasBothTiers && (
                    <div className="flex p-1 bg-white/10 rounded-xl border border-white/10 mb-4">
                      <button
                        type="button"
                        onClick={() => setSelectedTier("standard")}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-montserrat transition-all cursor-pointer ${
                          selectedTier === "standard"
                            ? "bg-white text-[#0B1528]"
                            : "text-white/55 hover:text-white"
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTier("premium")}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-montserrat transition-all cursor-pointer ${
                          selectedTier === "premium"
                            ? "bg-[#FF4D00] text-white"
                            : "text-white/55 hover:text-white"
                        }`}
                      >
                        Premium
                      </button>
                    </div>
                  )}

                  {q.expiryTime && timeLeft ? (
                    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <p className="text-white/55 text-[10px] font-bold uppercase tracking-wider font-montserrat">
                        {expired ? "Quotation status" : "Quote valid for"}
                      </p>
                      <p
                        className={`mt-0.5 font-extrabold font-montserrat tracking-tight ${
                          expired ? "text-[#FF4D00] text-sm" : "text-white text-lg"
                        }`}
                      >
                        {expired ? "This quotation has expired" : timeLeft}
                      </p>
                    </div>
                  ) : null}

                  {expired ? (
                    <div className="w-full py-4 bg-white/10 text-white rounded-[16px] font-bold text-sm uppercase tracking-wide text-center font-montserrat">
                      Request a new quote
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleWhatsAppBooking}
                      className="w-full py-4 bg-[#FF4D00] text-white rounded-[16px] font-bold text-sm uppercase tracking-wide hover:brightness-[0.94] transition-all shadow-lg text-center font-montserrat cursor-pointer active:scale-98 mb-3"
                    >
                      Book My Spot
                    </button>
                  )}

                  {!expired && (
                    <div className="flex items-center justify-center gap-1.5 text-white/55 text-xs font-medium font-montserrat">
                      <svg
                        className="w-3.5 h-3.5 text-[#FF4D00]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      Secure & Easy Booking
                    </div>
                  )}
                </div>

                <div className="bg-white border border-[#0B1528]/10 rounded-[20px] p-5 shadow-xs">
                  <h4 className="text-[#0B1528] font-bold text-sm font-montserrat mb-0.5">
                    Hello, {q.customerName}
                  </h4>
                  <p className="text-[#0B1528]/55 font-medium text-xs font-montserrat mb-4">
                    Questions on this package? Write or call your destination
                    expert.
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    {expertPhoto ? (
                      <OptimizedImage
                        src={expertPhoto}
                        alt={q.expert?.name || "Destination expert"}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#0B1528] text-white flex items-center justify-center text-sm font-bold font-montserrat shrink-0">
                        {expertInitial}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-[#0B1528] font-montserrat leading-tight">
                        {q.expert?.name || "Suresh Chaudhary"}
                      </p>
                      <p className="text-[11px] font-medium text-[#0B1528]/55 font-montserrat">
                        Destination Expert
                      </p>
                    </div>
                  </div>
                  <a
                    href={`tel:${q.expert?.phone || q.expert?.whatsapp}`}
                    className="w-full py-2.5 px-4 border border-[#0B1528]/15 rounded-xl text-xs font-bold text-[#0B1528] hover:bg-[#0B1528]/[0.04] transition-all font-montserrat flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-[#FF4D00]" />
                    Request a Callback
                  </a>
                </div>

                <a
                  href={expertWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white border border-[#0B1528]/10 rounded-[20px] p-4 shadow-xs flex items-center justify-center gap-3 text-sm font-bold text-[#0B1528] hover:bg-[#0B1528]/[0.04] transition-all font-montserrat cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <MessageCircle className="w-4 h-4 fill-current" />
                  </div>
                  Chat on WhatsApp
                </a>

                <div className="bg-[#0B1528] rounded-[24px] p-6 text-white shadow-xl space-y-4 border border-white/10">
                  <h4 className="text-lg font-extrabold font-montserrat tracking-tight">
                    Got Questions?
                  </h4>
                  <p className="text-white/60 text-xs font-montserrat leading-relaxed">
                    We are here to help. Chat with your expert for any queries
                    on this quotation.
                  </p>
                  <div className="space-y-2.5 pt-2">
                    {[
                      "Quote tailored for you",
                      "Trip customisation",
                      "Transparent & honest",
                    ].map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 text-xs font-bold text-white font-montserrat"
                      >
                        <div className="w-4 h-4 rounded-full bg-[#FF4D00] flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[9999] lg:hidden bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(11,21,40,0.08)] border-t border-[#E8EEF4] px-4 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col shrink-0">
            <span className="text-xl font-extrabold text-[#0B1528] leading-none font-montserrat">
              ₹ {salePrice.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[#0B1528]/55 line-through text-[11px] font-normal">
                ₹ {listPrice.toLocaleString()}
              </span>
              <span className="text-[#0B1528]/55 text-[10px] font-bold uppercase tracking-wider">
                per person
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleWhatsAppBooking}
            disabled={expired}
            className="flex-1 max-w-[200px] h-12 min-h-[48px] bg-[#FF4D00] text-white px-6 rounded-xl font-extrabold text-sm uppercase tracking-wider active:scale-95 hover:brightness-[0.94] transition-all shadow-md flex items-center justify-center font-montserrat disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {expired ? "Expired" : "Book Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
