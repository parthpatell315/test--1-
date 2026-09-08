import { Suspense } from "react";
import { Montserrat, Playfair_Display, Caveat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import dynamic from "next/dynamic";
import { Metadata, Viewport } from "next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MetaPixel from "@/components/MetaPixel";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
import ScrollToTop from "@/components/ScrollToTop";

const Footer = dynamic(() => import("@/components/Footer"), {
  loading: () => null,
});
const FloatingWhatsApp = dynamic(
  () => import("@/components/FloatingWhatsApp"),
  {
    loading: () => null,
  },
);
import { DynamicThemeProvider } from "@/components/DynamicThemeProvider";
import {
  fetchPublicSettingsResult,
  fetchWebsiteSettingsResult,
  fetchThemeResult,
  fetchPublicFooterSettingsResult,
} from "@/lib/api";
import { PUBLIC_SITE_ORIGIN, PUBLIC_SITE_URL } from "@/lib/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const revalidate = 600;

import { brandConfig } from "@/config/brand.config";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${brandConfig.name} — ${brandConfig.tagline}`,
    description: brandConfig.subtitle,
    metadataBase: new URL(PUBLIC_SITE_URL),
    verification: {
      google: "Hy949F--o_wnmU-WH5arwK1zE038hpIyxYIauQQv-FA",
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon.png", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: `${brandConfig.name} — ${brandConfig.tagline}`,
      description: brandConfig.subtitle,
      siteName: brandConfig.name,
      images: [
        {
          url: `${PUBLIC_SITE_ORIGIN}/logo.png`,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${brandConfig.name} — ${brandConfig.tagline}`,
      description: brandConfig.subtitle,
      images: [`${PUBLIC_SITE_ORIGIN}/logo.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settingsResult, websiteSettingsResult, themeResult, footerResult] =
    await Promise.all([
      fetchPublicSettingsResult(),
      fetchWebsiteSettingsResult(),
      fetchThemeResult(),
      fetchPublicFooterSettingsResult(),
    ]);

  const settings = settingsResult.ok ? settingsResult.data : null;
  const websiteSettings = websiteSettingsResult.ok
    ? websiteSettingsResult.data
    : null;
  const theme = themeResult.ok ? themeResult.data : null;
  const footerConfig = footerResult.ok ? footerResult.data : null;

  const mergedSettings = {
    ...(settings || {}),
    ...(websiteSettings || {}),
    navbar: {
      ...settings?.navbar,
      links: websiteSettings?.navigation || settings?.navbar?.links,
    },
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${playfair.variable} ${caveat.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full w-full flex flex-col font-montserrat relative"
      >
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: brandConfig.name,
                  url: PUBLIC_SITE_URL,
                  logo: `${PUBLIC_SITE_ORIGIN}/logo.png`,
                },
                {
                  "@type": "WebSite",
                  name: brandConfig.name,
                  url: PUBLIC_SITE_URL,
                },
              ],
            }),
          }}
        />
        <DynamicThemeProvider
          initialTheme={theme}
          initialSettings={
            settingsResult.ok || websiteSettingsResult.ok
              ? mergedSettings
              : null
          }
        >
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <Navbar
            logoUrl={mergedSettings?.navbar?.logoUrl}
            navLinks={mergedSettings?.navbar?.links}
          />
          <main className="flex-grow w-full min-w-0">{children}</main>
          <Footer footerConfig={footerConfig} />
          <FloatingWhatsApp settings={mergedSettings} />
        </DynamicThemeProvider>
      </body>
    </html>
  );
}
