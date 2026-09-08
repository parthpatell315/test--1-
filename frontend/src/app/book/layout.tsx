import type { ReactNode } from "react";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `Book a Trip | ${brandConfig.name}`,
  description: `Reserve your spot on a ${brandConfig.name} group expedition.`,
  path: "/book",
  index: false,
});

export default function BookLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
