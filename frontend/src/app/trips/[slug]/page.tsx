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
    <div className="bg-white min-h-screen font-montserrat">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(tripJsonLd(trip, jsonLdImage)),
        }}
      />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 pt-[84px] pb-3 md:pb-4 space-y-4 md:space-y-6">
        {/* 1. Photo Gallery Grid (At top of page below header) */}
        <TripGallerySection trip={trip} />

        {/* 2. Title Section (Below photos) */}
        <div>
          {(() => {
            const fullTitle = trip.title || "";
            const keywords = [
              "Backpacking Trip",
              "Road Trip",
              "Group Trip",
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
            return (
              <div>
                <h1
                  style={{ fontWeight: 800, color: "#0F172A" }}
                  className="text-[26px] sm:text-[34px] md:text-[40px] font-extrabold tracking-tight leading-[1.15] font-montserrat"
                >
                  {main}
                </h1>
                {sub && (
                  <span className="font-bold text-blue-600 text-lg sm:text-xl md:text-2xl leading-tight block mt-1">
                    {sub}
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* 3–4. Meta chips + section index + detail (tight stack, no floating band) */}
        <div>
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-8 gap-y-3 gap-x-4 py-2.5 sm:py-3 border-t border-zinc-200/80 w-full relative z-10 bg-white">
            {[
              { label: "Duration", val: durationStr, icon: Clock3 },
              {
                label: "Difficulty",
                val: trip.difficulty
                  ? trip.difficulty.charAt(0).toUpperCase() +
                    trip.difficulty.slice(1)
                  : "Easy to Moderate",
                icon: Mountain,
              },
              {
                label: "Age Group",
                val: trip.ageLimit || "12-35 Years",
                icon: Backpack,
              },
              {
                label: "Max Altitude",
                val: trip.maxAltitude || "10,000 ft",
                icon: MountainSnow,
              },
            ].map((info, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <info.icon className="w-[18px] h-[18px] text-[#0B1528] stroke-[1.8] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[#0B1528] font-semibold text-[13px] sm:text-sm leading-tight font-montserrat truncate">
                    {info.val}
                  </p>
                  <p className="text-zinc-400 font-medium text-[11px] leading-tight font-montserrat mt-0.5">
                    {info.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-8 min-w-0">
              <TripSubNav sections={navSections} />
              <TripDetailView trip={trip} />
            </div>

            <div className="lg:col-span-4 relative min-w-0">
              <StickyBookingCard trip={trip} />
            </div>
          </div>
        </div>
      </div>
      <TripInquiryAutoTrigger trip={trip} />
    </div>
  );
}
