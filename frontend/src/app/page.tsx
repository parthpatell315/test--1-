import React from "react";
import { Metadata } from "next";
import DestinationCategoryBar from "@/components/DestinationCategoryBar";
import Hero from "@/components/Hero";
import TrendingTrips from "@/components/TrendingTrips";
import SaleBanner from "@/components/SaleBanner";
import InternationalDestinations from "@/components/InternationalDestinations";
import Destinations from "@/components/Destinations";
import ReviewsSection from "@/components/ReviewsSection";
import WhyChooseSection from "@/components/WhyChooseSection";
import PageRenderer from "@/components/PageRenderer";
import FloatingSocialBar from "@/components/FloatingSocialBar";
import {
  fetchHomepageTripsResult,
  fetchHomepageReviewsResult,
  fetchHomepageBlogsResult,
  fetchPageBySlugResult,
} from "@/lib/api";
import { unwrapData } from "@/lib/publicData";
import { Trip, Review, Blog } from "@/types";
import { pageMetadata } from "@/lib/seo";
import { brandConfig } from "@/config/brand.config";

export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: `${brandConfig.name} — ${brandConfig.tagline}`,
  description: brandConfig.subtitle,
  path: "/",
});

export default async function Home() {
  const [tripsResult, reviewsResult, blogsResult, pageResult] =
    await Promise.all([
      fetchHomepageTripsResult(50),
      fetchHomepageReviewsResult(8),
      fetchHomepageBlogsResult(8),
      fetchPageBySlugResult("home"),
    ]);

  const trips: Trip[] = unwrapData(tripsResult, []).filter(
    (t: any) => t.status === "published",
  );
  const reviews: Review[] = unwrapData(reviewsResult, []);
  const blogs: Blog[] = unwrapData(blogsResult, []).filter(
    (b: any) => b.status === "published",
  );

  const page = pageResult.ok ? pageResult.data : null;
  const rawDbSections =
    page?.sections && Array.isArray(page.sections) && page.sections.length > 0
      ? page.sections
      : null;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Destination Category Pills Bar (sticky under Navbar) */}
      <DestinationCategoryBar />

      {rawDbSections ? (
        <PageRenderer
          sections={rawDbSections}
          trips={trips}
          reviews={reviews}
          blogs={blogs}
        />
      ) : (
        <>
          {/* 1. Hero FrontBanner with Floating Signature Search Box */}
          <Hero />

          {/* 2. Trending Experiences (Avian CardComponent3 cards) */}
          <TrendingTrips trips={trips} />

          {/* 3. Limited Season Sale Promo Banner */}
          <SaleBanner />

          {/* 4. International Destinations Carousel */}
          <InternationalDestinations />

          {/* 5. Perfect Getaways (Domestic Circuits) */}
          <Destinations title="Perfect Getaways" />

          {/* 6. Traveller Experiences (Reviews & Real Stories) */}
          <ReviewsSection reviews={reviews} title="Traveller Experiences" />

          {/* 7. Why Choose Trrabb (4 Pillars) */}
          <WhyChooseSection />
        </>
      )}

      <FloatingSocialBar />
    </div>
  );
}
