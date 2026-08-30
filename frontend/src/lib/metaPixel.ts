/**
 * Meta Pixel Standard Event Tracking Helpers
 */

export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    if (params) {
      (window as any).fbq("track", eventName, params);
    } else {
      (window as any).fbq("track", eventName);
    }
  }
}

export function trackMetaLead(leadData?: { tripTitle?: string; value?: number; currency?: string }) {
  trackMetaEvent("Lead", {
    content_name: leadData?.tripTitle || "Tour Inquiry",
    value: leadData?.value || 0,
    currency: leadData?.currency || "INR",
  });
}

export function trackMetaViewContent(tripData?: { title?: string; slug?: string; price?: number }) {
  trackMetaEvent("ViewContent", {
    content_name: tripData?.title || "Trip Details",
    content_ids: [tripData?.slug || ""],
    content_type: "product",
    value: tripData?.price || 0,
    currency: "INR",
  });
}

export function trackMetaInitiateCheckout(bookingData?: { tripTitle?: string; totalAmount?: number }) {
  trackMetaEvent("InitiateCheckout", {
    content_name: bookingData?.tripTitle || "Trip Booking",
    value: bookingData?.totalAmount || 0,
    currency: "INR",
  });
}

export function trackMetaPurchase(purchaseData?: { bookingId?: string; tripTitle?: string; value: number }) {
  trackMetaEvent("Purchase", {
    content_name: purchaseData?.tripTitle || "Trip Booking",
    content_ids: [purchaseData?.bookingId || ""],
    content_type: "product",
    value: purchaseData?.value || 0,
    currency: "INR",
  });
}
