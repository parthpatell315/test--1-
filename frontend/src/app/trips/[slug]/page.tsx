import { fetchTripBySlugResult, normalizeImageUrl } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { notFound } from "next/navigation";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import { Metadata } from "next";
import { pageMetadata, tripJsonLd, tripSeoFields } from "@/lib/seo";
export const revalidate = 30;

import {
  Clock3,
  Mountain,
  Backpack,
  MountainSnow,
  ChevronLeft,
} from "lucide-react";
import TripGallerySection from "@/components/TripGallerySection";
import TripSubNav from "@/components/TripSubNav";
import StickyBookingCard from "@/components/StickyBookingCard";
import TripDetailView from "@/components/TripDetailView";
import Link from "next/link";
import TripInquiryAutoTrigger from "@/components/TripInquiryAutoTrigger";

import { brandConfig } from "@/config/brand.config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tripResult = await fetchTripBySlugResult(slug);
  const trip = tripResult.ok ? tripResult.data : null;
  if (!trip) {
    return pageMetadata({
      title: `Tour | ${brandConfig.name}`,
      description: brandConfig.subtitle,
      path: `/trips/${slug}`,
      index: false,
    });
  }
  const seo = tripSeoFields(trip);
  return pageMetadata({
    title: `${seo.title} | ${brandConfig.name}`,
    description: seo.description,
    path: `/trips/${slug}`,
    image: normalizeImageUrl(seo.image) || seo.image,
    keywords: seo.keywords,
  });
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tripResult = await fetchTripBySlugResult(slug);

  if (!tripResult.ok) {
    return <ServiceUnavailable title="This trip is temporarily unavailable" />;
  }

  const trip = tripResult.data;
  if (!trip) {
    notFound();
  }

  const navSections = [
    { id: "about", label: "About" },
    { id: "itinerary", label: "Itinerary" },
    { id: "inclusions", label: "Inclusions" },
    { id: "highlights", label: "Highlights" },
    { id: "stay", label: "Stay" },
    { id: "reviews", label: "Reviews" },
    { id: "faqs", label: "FAQs" },
  ];

  const durationStr = formatDuration(trip.duration);
  const seo = tripSeoFields(trip);
  const jsonLdImage = normalizeImageUrl(seo.image) || seo.image || undefined;

  return (
    <div className="bg-[#F5F6F8] min-h-screen font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(tripJsonLd(trip, jsonLdImage)),
        }}
      />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 pt-[84px] md:pt-[92px] pb-12 space-y-6">
        
        {/* 1. Header Title & Top Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-red-50 text-[#EC1D24] text-xs font-bold px-3 py-1 rounded-full border border-red-200/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EC1D24]" />
                Group Trip
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200/80">
                ⭐ 4.9 (140+ reviews)
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1A1A1A] tracking-tight leading-tight">
              {trip.title}
            </h1>

            <p className="text-sm md:text-base text-gray-500 font-medium mt-1.5">
              {(trip as any).tagline || `${trip.location || "Scenic"} Guided Tour · Ex ${trip.departureCity || "Delhi / Manali"}`}
            </p>
          </div>
        </div>

        {/* 2. Photo Gallery Grid (Avian signature multi-photo layout) */}
        <TripGallerySection trip={trip} />

        {/* 3. Quick Info Card Row */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Duration", val: durationStr, icon: Clock3 },
            {
              label: "Difficulty",
              val: trip.difficulty
                ? trip.difficulty.charAt(0).toUpperCase() + trip.difficulty.slice(1)
                : "Moderate",
              icon: Mountain,
            },
            {
              label: "Age Group",
              val: trip.ageLimit || "14-45 Years",
              icon: Backpack,
            },
            {
              label: "Max Altitude",
              val: trip.maxAltitude || "15,000 ft",
              icon: MountainSnow,
            },
          ].map((info, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#EC1D24] flex items-center justify-center shrink-0">
                <info.icon className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <p className="text-[#1A1A1A] font-bold text-sm leading-tight truncate">
                  {info.val}
                </p>
                <p className="text-gray-400 font-medium text-xs mt-0.5">
                  {info.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 4. Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column (Content & Tabs) */}
          <div className="lg:col-span-8 min-w-0 bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-gray-200/80 shadow-md">
            <TripSubNav sections={navSections} />
            <div className="mt-6">
              <TripDetailView trip={trip} />
            </div>
          </div>

          {/* Right Column (Sticky Booking Card & Support) */}
          <div className="lg:col-span-4 relative min-w-0">
            <StickyBookingCard trip={trip} />
          </div>
        </div>
      </div>
      <TripInquiryAutoTrigger trip={trip} />
    </div>
  );
}
