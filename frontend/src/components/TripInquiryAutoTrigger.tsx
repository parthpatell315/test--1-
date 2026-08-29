"use client";

import { useState, useEffect } from "react";
import DestinationInquiryModal from "./DestinationInquiryModal";
import { Trip } from "@/types";
import { useTheme } from "@/components/DynamicThemeProvider";

interface TripInquiryAutoTriggerProps {
  trip: Trip;
}

export default function TripInquiryAutoTrigger({
  trip,
}: TripInquiryAutoTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useTheme();

  useEffect(() => {
    if (!settings) return;

    // Check if popup is enabled (defaults to true)
    const isEnabled = settings.inquiryPopup?.enabled !== false;
    if (!isEnabled) return;

    // Check if the user has already seen the popup in this session
    const hasSeenPopup = sessionStorage.getItem(`inquiry_popup_${trip.id}`);

    if (!hasSeenPopup) {
      // Delay in seconds (defaults to 12 seconds)
      const delaySeconds = settings.inquiryPopup?.delay ?? 12;
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem(`inquiry_popup_${trip.id}`, "true");
      }, delaySeconds * 1000);

      return () => clearTimeout(timer);
    }
  }, [trip.id, settings]);

  const popupTitle = settings?.inquiryPopup?.title || "Plan Your Next Trip";
  const popupDesc =
    settings?.inquiryPopup?.description ||
    "Connect with our destination experts";
  const availableDateStrings = trip.availableDates?.map((d) => d.date) || [];

  return (
    <DestinationInquiryModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={popupTitle}
      description={popupDesc}
      source={`Trip Detail Popup: ${trip.title}`}
      destination={{
        id: trip.id || (trip as any)._id,
        name: trip.title,
        img: trip.heroImage,
        duration: trip.duration,
        subtext: `Join our curated ${trip.location} expedition`,
        availableDates: availableDateStrings,
      }}
    />
  );
}
