import React from "react";

export interface BrandConfig {
  /** Commercial Travel Platform / Company Name (e.g. "TravelSphere", "Wanderlust Expeditions") */
  name: string;
  /** Short abbreviation or acronym */
  shortName: string;
  /** Primary brand tagline */
  tagline: string;
  /** Secondary subtitle / mission statement */
  subtitle: string;
  /** Logo image URL (optional, falls back to vector SVG BrandLogo) */
  logoUrl?: string;
  /** Support contact email */
  supportEmail: string;
  /** Support contact phone */
  supportPhone: string;
  /** WhatsApp contact number */
  whatsappPhone: string;
  /** Physical / registered business address */
  address: string;
  /** Default currency symbol */
  currencySymbol: string;
  /** Primary brand color hex */
  primaryColor: string;
  /** Secondary brand color hex */
  secondaryColor: string;
  /** Social media links */
  socialLinks: {
    platform: "instagram" | "facebook" | "youtube" | "twitter" | "linkedin" | "whatsapp";
    url: string;
  }[];
}

export const brandConfig: BrandConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Trrabb",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT || "Trrabb",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Curated Adventure Trips & Group Tours",
  subtitle: "Explore extraordinary destinations with verified expert trip leaders and seamless group travel.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@trrabb.com",
  supportPhone: "",
  whatsappPhone: "",
  address: "",
  currencySymbol: "₹",
  primaryColor: "#EC1D24",
  secondaryColor: "#1A1A1A",
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "facebook", url: "https://facebook.com" },
    { platform: "youtube", url: "https://youtube.com" },
    { platform: "linkedin", url: "https://linkedin.com" },
  ],
};

/**
 * Modern vector brand logo component for the client website
 */
export function BrandLogo({
  className = "h-8 w-auto",
  showText = true,
  textColor = "text-slate-900",
}: {
  className?: string;
  showText?: boolean;
  textColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC1D24] to-[#B91C1C] shadow-md shadow-red-500/20">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-none stroke-white stroke-2"
          aria-hidden="true"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          />
        </svg>
      </div>
      {showText && (
        <span className={`text-xl font-extrabold tracking-tight ${textColor}`}>
          {brandConfig.name}
        </span>
      )}
    </div>
  );
}
