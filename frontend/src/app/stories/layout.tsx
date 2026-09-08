import type { ReactNode } from "react";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `Travel Stories & Field Notes | ${brandConfig.name}`,
  description: `Travel diaries, packing guides, and route stories from ${brandConfig.name} expeditions.`,
  path: "/stories",
});

export default function StoriesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
