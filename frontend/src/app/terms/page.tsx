import { Metadata } from "next";
import { TermsAndConditionsDocument } from "@/components/legal/TermsAndConditionsDocument";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms and Conditions | Trrabb",
  description:
    "Official terms and conditions for Trrabb adventure and leisure trips, including booking, payments, cancellation, and liability.",
  path: "/terms-and-conditions",
});

export default function TermsAliasPage() {
  return <TermsAndConditionsDocument />;
}
