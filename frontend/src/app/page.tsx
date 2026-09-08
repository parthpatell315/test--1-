import React from "react";
import { Metadata } from "next";
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

  // API failure must not swap in a hardcoded default homepage.
  const page = pageResult.ok ? pageResult.data : null;
  const rawDbSections =
    page?.sections && Array.isArray(page.sections) ? page.sections : [];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <PageRenderer
        sections={rawDbSections}
        trips={trips}
        reviews={reviews}
        blogs={blogs}
      />
      <FloatingSocialBar />
    </div>
  );
}
