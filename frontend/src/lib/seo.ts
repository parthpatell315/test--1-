import type { Metadata } from "next";
import type { Trip } from "@/types";
import { PUBLIC_SITE_ORIGIN, PUBLIC_SITE_URL, absoluteSiteUrl } from "./site";

type SeoJson = {
  title?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  keywords?: unknown;
};

export function stripHtml(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateMeta(text: string, max = 160): string {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

import { brandConfig } from "@/config/brand.config";

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  index?: boolean;
  keywords?: string | string[];
}): Metadata {
  const url = opts.path === "/" ? PUBLIC_SITE_URL : absoluteSiteUrl(opts.path);
  const image = opts.image || `${PUBLIC_SITE_ORIGIN}/logo.png`;
  const indexable = opts.index !== false;
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    robots: {
      index: indexable,
      follow: indexable,
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: brandConfig.name,
      images: [{ url: image, width: 1200, height: 630 }],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

function asSeo(value: unknown): SeoJson {
  return value && typeof value === "object" ? (value as SeoJson) : {};
}

export function tripSeoFields(trip: Trip) {
  const seo = asSeo(trip.seo);
  const title =
    (typeof seo.metaTitle === "string" && seo.metaTitle.trim()) ||
    (typeof seo.title === "string" && seo.title.trim()) ||
    (typeof trip.title === "string" && trip.title.trim()) ||
    `${brandConfig.name} Tour`;

  const fromSeo =
    (typeof seo.metaDescription === "string" && seo.metaDescription.trim()) ||
    (typeof seo.description === "string" && seo.description.trim()) ||
    "";
  const fromTrip =
    (typeof trip.shortDescription === "string" &&
      trip.shortDescription.trim()) ||
    stripHtml(trip.description);

  let description = truncateMeta(fromSeo || fromTrip);
  if (!description) {
    const bits = [trip.title, trip.location, trip.duration].filter(Boolean);
    description = bits.length
      ? `${bits.join(" · ")}.`
      : `${brandConfig.name} curated group adventure trip.`;
  }

  const image =
    (typeof seo.ogImage === "string" && seo.ogImage.trim()) ||
    (typeof trip.heroImage === "string" && trip.heroImage.trim()) ||
    (Array.isArray(trip.images) ? trip.images.find(Boolean) : "") ||
    "";

  const keywords = Array.isArray(seo.keywords)
    ? seo.keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0)
    : undefined;

  return { title, description, image, keywords };
}

export function tripJsonLd(trip: Trip, imageUrl?: string) {
  const { title, description } = tripSeoFields(trip);
  const url = absoluteSiteUrl(`/trips/${trip.slug}`);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: PUBLIC_SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Trips",
          item: absoluteSiteUrl("/trips"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: title,
          item: url,
        },
      ],
    },
    {
      "@type": "TouristTrip",
      name: title,
      description,
      url,
      ...(imageUrl ? { image: imageUrl } : {}),
      ...(trip.location ? { touristType: trip.location } : {}),
      ...(trip.duration ? { itinerary: trip.duration } : {}),
    },
  ];

  const faqs = Array.isArray(trip.faqs)
    ? trip.faqs.filter((f) => f?.question && f?.answer)
    : [];
  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: stripHtml(f.answer),
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
