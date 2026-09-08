"use client";

import { useState, useEffect } from "react";
import AboutTrip from "./AboutTrip";
import TripBookingSection from "./TripBookingSection";
import InclusionsExclusions from "./InclusionsExclusions";
import TripHighlightsList from "./TripHighlightsList";
import StaySection from "./StaySection";
import TripFAQ from "./TripFAQ";
import ReviewReels from "./ReviewReels";
import TripReviews from "./TripReviews";
import PopupDetails from "./PopupDetails";
import { Trip } from "@/types";

interface TripDetailViewProps {
  trip: Trip;
}

export default function TripDetailView({ trip }: TripDetailViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [trip.id]);

  return (
    <div className="lg:col-span-8 space-y-7 md:space-y-8 pt-2.5 md:pt-3">
      <div id="about" className="scroll-mt-[124px] md:scroll-mt-[128px]">
        <AboutTrip
          description={trip.description || ""}
          customAboutTrip={(trip as any).customSections?.aboutTrip}
        />
      </div>

      <div id="itinerary" className="scroll-mt-[124px] md:scroll-mt-[128px]">
        <TripBookingSection
          trip={trip}
          onDateSelect={(date) => setSelectedDate(date)}
        />
      </div>

      {/* Avian Signature No Cost EMI Banner */}
      <div
        className="border-2 border-[#EC1D24] rounded-3xl shadow-sm my-6 overflow-hidden p-5 sm:p-6 md:px-8 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-all"
        style={{
          background: "linear-gradient(90deg, #FCE7E6 0%, #FFFFFF 55%, #FCE7E6 100%)",
        }}
      >
        <div className="space-y-1 text-center md:text-left">
          <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            Your Dream Trip
          </p>
          <p className="text-sm sm:text-base text-gray-700 font-medium">
            with <span className="font-black text-[#EC1D24]">No Cost EMI</span> available on major bank credit cards
          </p>
          <p className="text-xs text-gray-500 font-medium">
            Starting from just ₹{Math.round((trip.price || 15000) / 6).toLocaleString("en-IN")}/month · 0% interest · 1-minute approval
          </p>
        </div>

        <a
          href="#booking-card"
          className="bg-[#EC1D24] hover:bg-[#D0171E] text-white font-bold rounded-xl px-6 py-3 text-sm md:text-base transition-all shadow-md shadow-red-500/20 shrink-0 active:scale-95 text-center w-full md:w-auto"
        >
          Book with EMI
        </a>
      </div>

      <div id="inclusions" className="scroll-mt-[124px] md:scroll-mt-[128px]">
        <InclusionsExclusions
          inclusions={trip.inclusions || []}
          exclusions={trip.exclusions || []}
        />
      </div>

      <div id="highlights" className="scroll-mt-[124px] md:scroll-mt-[128px]">
        <TripHighlightsList
          items={
            trip.highlights &&
            Array.isArray(trip.highlights) &&
            trip.highlights.length > 0
              ? trip.highlights
              : trip.gallery &&
                  Array.isArray(trip.gallery) &&
                  trip.gallery.length > 0
                ? trip.gallery
                : trip.images || []
          }
        />
      </div>

      {trip.accommodations &&
        Array.isArray(trip.accommodations) &&
        trip.accommodations.length > 0 && (
          <div id="stay" className="scroll-mt-[124px] md:scroll-mt-[128px]">
            <StaySection accommodations={trip.accommodations} />
          </div>
        )}

      <div id="reviews" className="scroll-mt-[124px] md:scroll-mt-[128px]">
        <TripReviews reviews={trip.reviews || []} />
      </div>

      <ReviewReels reels={trip.reels || []} />

      <div id="faqs" className="scroll-mt-[124px] md:scroll-mt-[128px]">
        <TripFAQ faqs={trip.faqs || []} />
      </div>

      <PopupDetails details={trip.popupDetails} startDate={selectedDate} />
    </div>
  );
}
