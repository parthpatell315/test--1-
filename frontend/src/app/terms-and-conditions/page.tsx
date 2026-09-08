import { Metadata } from "next";
import { TermsAndConditionsDocument } from "@/components/legal/TermsAndConditionsDocument";
import { pageMetadata } from "@/lib/seo";

import { brandConfig } from "@/config/brand.config";

export const metadata: Metadata = pageMetadata({
  title: `Terms and Conditions | ${brandConfig.name}`,
  description: `Official terms and conditions for ${brandConfig.name} adventure and leisure tours, including booking, payments, cancellation, and liability.`,
  path: "/terms-and-conditions",
});

export default function TermsAndConditionsPage() {
  return <TermsAndConditionsDocument />;
}
