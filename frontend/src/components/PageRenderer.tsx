import { Trip, Review, Blog } from "@/types";

import Hero from "./Hero";
import SocialProofBar from "./SocialProofBar";
import CommunityTrips from "./CommunityTrips";
import RealitySection from "./RealitySection";
import Destinations from "./Destinations";
import BlogSection from "./BlogSection";
import ReviewsSection from "./ReviewsSection";
import CTABanner from "./CTABanner";
import RecentPhotosSection from "./RecentPhotosSection";
import PhotoGrid from "./PhotoGrid";
import ImageGallery from "./ImageGallery";
import CinematicBanner from "./CinematicBanner";
import PhotoSlider from "./PhotoSlider";
import VideoSection from "./VideoSection";
import CTASlider from "./CTASlider";
import VibeSection from "./VibeSection";
import TrendingTrips from "./TrendingTrips";
import InternationalDestinations from "./InternationalDestinations";
import WhyChooseSection from "./WhyChooseSection";
import SaleBanner from "./SaleBanner";

interface PageRendererProps {
  sections: any[];
  trips?: Trip[];
  reviews?: Review[];
  blogs?: Blog[];
  settings?: any;
}

export default function PageRenderer({
  sections = [],
  trips = [],
  reviews = [],
  blogs = [],
  settings,
}: PageRendererProps) {
  if (!sections || !Array.isArray(sections)) return null;

  let visibleSections = sections.filter((s) => s.visible !== false);

  return (
    <div className="flex flex-col w-full min-w-0">
      {visibleSections.map((section, index) => {
        const { type, data } = section;

        const getBgColor = (idx: number) => {
          const s = visibleSections[idx];
          if (!s) return "#ffffff";

          // Map exact backgrounds for components with custom/hardcoded styling
          if (
            [
              "destinations",
              "recent_photos",
              "photo_grid",
              "image_gallery",
            ].includes(s.type)
          )
            return "#E2E7ED";
          if (
            [
              "trips",
              "upcoming_trips",
              "featured_trips",
              "trending_trips",
              "reviews",
            ].includes(s.type)
          )
            return "#ffffff";

          if (
            [
              "hero",
              "cta_banner",
              "cta_slider",
              "cinematic_banner",
              "video_section",
              "reality",
              "blogs",
              "journal",
            ].includes(s.type)
          )
            return "transparent";

          const patterns = ["#ffffff", "#E2E7ED"];
          return patterns[idx % patterns.length];
        };

        const renderSection = () => {
          const prevBg = index > 0 ? getBgColor(index - 1) : "#ffffff";
          const nextBg =
            index < visibleSections.length - 1
              ? getBgColor(index + 1)
              : "#ffffff";
          const sectionData =
            section.draft || section.data || section.content || {};
          const commonProps = {
            topColor: prevBg,
            bottomColor: nextBg,
            ...sectionData,
          };

          switch (type) {
            case "hero":
              return null;
            case "social_proof":
              return <SocialProofBar key={index} {...commonProps} />;
            case "trips":
            case "upcoming_trips":
            case "featured_trips":
            case "trending_trips": {
              const heroSection = sections.find((s) => s.type === "hero");
              const heroDraft =
                heroSection?.draft ||
                heroSection?.data ||
                heroSection?.content ||
                {};
              return (
                <CommunityTrips
                  key={index}
                  trips={trips}
                  {...heroDraft}
                  {...commonProps}
                />
              );
            }
            case "destinations":
              return <Destinations key={index} {...commonProps} />;
            case "international_destinations":
              return <InternationalDestinations key={index} />;
            case "why_choose":
              return <WhyChooseSection key={index} />;
            case "sale_banner":
              return <SaleBanner key={index} />;
            case "reality":
              return <RealitySection key={index} {...commonProps} />;
            case "blogs":
            case "journal":
              return <BlogSection key={index} blogs={blogs} {...commonProps} />;
            case "reviews":
              return (
                <ReviewsSection
                  key={index}
                  reviews={reviews}
                  {...commonProps}
                />
              );
            case "vibe":
            case "cta_slider":
            case "cta_banner":
            case "cinematic_banner": {
              const sliderDraft =
                section.draft || section.data || section.content || {};
              return (
                <CTASlider key={index} {...sliderDraft} {...commonProps} />
              );
            }
            case "recent_photos":
            case "photo_grid": {
              const photoData =
                section.draft || section.data || section.content || {};
              const rawList =
                photoData.photos || photoData.items || photoData.images;
              const formattedPhotos =
                Array.isArray(rawList) && rawList.length > 0
                  ? rawList
                      .map((p: any, i: number) => ({
                        id: p.id || `photo-${i}`,
                        url: p.src || p.url || p.image || p.imageUrl,
                        caption: p.caption || "Trip Memory",
                        location: p.location || "Himalayan Expedition",
                      }))
                      .filter((p: any) => Boolean(p.url))
                  : undefined;

              return (
                <RecentPhotosSection
                  key={index}
                  photos={formattedPhotos}
                  title={photoData.titlePrimary || photoData.title}
                  subtitle={photoData.titleAccent || photoData.subtitle}
                  {...commonProps}
                />
              );
            }
            case "photo_slider":
              return <PhotoSlider key={index} {...commonProps} />;
            case "video_section":
              return <VideoSection key={index} {...commonProps} />;
            case "rich_text":
              return (
                <div key={index} className="max-w-4xl mx-auto px-6 py-20">
                  {data.title && (
                    <h2 className="text-3xl md:text-4xl font-bold mb-12 capitalize tracking-tighter text-[#ff4e00]">
                      {data.title}
                    </h2>
                  )}
                  <div
                    className="rich-content prose prose-stone prose-lg max-w-none 
                               prose-headings:text-[#ff4e00] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
                               prose-p:text-gray-700 prose-p:leading-relaxed 
                               prose-strong:text-gray-900 prose-strong:font-black
                               prose-li:text-gray-700
                               prose-h1:text-4xl prose-h1:mb-8
                               prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                               prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4"
                    dangerouslySetInnerHTML={{ __html: data.body || "" }}
                  />
                </div>
              );
            default:
              return null;
          }
        };

        const getBackgroundClass = (idx: number) => {
          const s = visibleSections[idx];
          if (!s) return "bg-transparent";
          if (
            [
              "destinations",
              "recent_photos",
              "photo_grid",
              "image_gallery",
            ].includes(s.type)
          )
            return "bg-[#E2E7ED]";
          if (
            [
              "trips",
              "upcoming_trips",
              "featured_trips",
              "trending_trips",
              "reviews",
            ].includes(s.type)
          )
            return "bg-white";
          if (
            [
              "hero",
              "cta_banner",
              "cta_slider",
              "cinematic_banner",
              "video_section",
              "reality",
              "blogs",
              "journal",
            ].includes(s.type)
          )
            return "bg-transparent";

          const patterns = ["bg-[#ffffff]", "bg-[#E2E7ED]"];
          return patterns[idx % patterns.length];
        };

        return (
          <div
            key={index}
            className={`page-section-wrapper ${getBackgroundClass(index)} transition-colors duration-500 ${
              type === "destinations"
                ? "w-full border-0 outline-none shadow-none"
                : ""
            }`}
          >
            {renderSection()}
          </div>
        );
      })}
    </div>
  );
}
