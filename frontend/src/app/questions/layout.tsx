import type { ReactNode } from "react";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `Help & FAQs | ${brandConfig.name}`,
  description: `Answers to common ${brandConfig.name} questions on departures, bookings, itineraries, and inclusions.`,
  path: "/questions",
});

export default function QuestionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
