import React from "react";

export interface BrandConfig {
  /** Company or Application Name (e.g. "TravelOS", "Company A") */
  name: string;
  /** Short abbreviation or acronym for compact rail view */
  shortName: string;
  /** Tagline or subtitle displayed in auth / headers */
  tagline: string;
  /** Edition badge label (e.g. "ERP", "Enterprise", "Pro") */
  badgeText: string;
  /** Default support email */
  supportEmail: string;
  /** Default company account placeholder in accounting */
  defaultOperatingAccount: string;
  /** Default currency symbol */
  currencySymbol: string;
  /** Primary brand accent hex color */
  primaryColor: string;
}

export const brandConfig: BrandConfig = {
  name: (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_BRAND_NAME) || "TravelOS",
  shortName: (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_BRAND_SHORT) || "T-OS",
  tagline: "Cloud Travel Management & Operations Platform",
  badgeText: "ERP",
  supportEmail: "support@travelos.io",
  defaultOperatingAccount: "Main Operating Account",
  currencySymbol: "₹",
  primaryColor: "#2563EB",
};

/**
 * Modern geometric vector logo mark for enterprise SaaS ERP
 */
export function BrandLogo({
  className = "h-8 w-8",
  iconClassName = "h-4 w-4",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`text-white fill-none stroke-current stroke-2 ${iconClassName}`}
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
  );
}

export function useBrand() {
  return brandConfig;
}
