import { Metadata } from "next";
import Link from "next/link";
import {
  fetchPublicTrips,
  fetchPublicBlogs,
  fetchAttractions,
} from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sitemap | TravelSphere",
  description:
    "Browse every public TravelSphere page, trip, story, and destination from one sitemap.",
  path: "/sitemap",
});

const PAGES: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/trips", label: "Upcoming Trips" },
  { href: "/about-us", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/stories", label: "Stories" },
  { href: "/reviews", label: "Reviews" },
  { href: "/questions", label: "FAQs" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/book", label: "Plan Your Trip" },
  { href: "/join-our-team", label: "Join Our Team" },
  { href: "/packing-list", label: "Packing List" },
  { href: "/manali-trekking-camp-with-youthcamping", label: "Manali Trekking Camp" },
  { href: "/terms-and-conditions", label: "Terms and Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
];

const COLLECTIONS: { href: string; label: string }[] = [
  { href: "/trips", label: "Himalayan Escapes" },
  { href: "/trips", label: "Monthly Trip Calendar" },
  { href: "/trips", label: "Trips From Gujarat" },
];

function sortByLabel<T extends { label: string }>(items: T[]) {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

export default async function HtmlSitemapPage() {
  const [trips, blogs, attractions] = await Promise.all([
    fetchPublicTrips().catch(() => []),
    fetchPublicBlogs().catch(() => []),
    fetchAttractions().catch(() => []),
  ]);

  const tours = sortByLabel(
    (Array.isArray(trips) ? trips : [])
      .filter((trip) => trip?.slug)
      .map((trip) => ({
        href: `/trips/${trip.slug}`,
        label: trip.title || trip.slug,
      })),
  );

  const stories = sortByLabel(
    (Array.isArray(blogs) ? blogs : [])
      .filter((blog) => blog?.slug && blog.status !== "draft")
      .map((blog) => ({
        href: `/blogs/${blog.slug}`,
        label: blog.title || blog.slug,
      })),
  );

  const places = sortByLabel(
    (Array.isArray(attractions) ? attractions : [])
      .filter((place) => place?.slug)
      .map((place) => ({
        href: `/attractions/${place.slug}`,
        label: place.name || place.title || place.slug,
      })),
  );

  return (
    <div className="bg-white min-h-screen pt-24 font-montserrat pb-20">
      <section className="bg-[#0F172A] text-white py-16 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3 relative z-10">
          <span className="bg-white/10 text-[#2563EB] font-extrabold tracking-widest uppercase text-xs px-3.5 py-1.5 rounded-full inline-block">
            Site index
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            SITE<span className="text-[#2563EB]">MAP</span>
          </h1>
          <div className="w-16 h-1.5 bg-[#2563EB] rounded-full mx-auto my-3" />
          <p className="text-xs sm:text-sm text-zinc-300 font-semibold max-w-xl mx-auto leading-relaxed">
            Every public TravelSphere page, collection, and trip — in one place.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 space-y-8">
        <div className="bg-white border border-zinc-200/90 rounded-[28px] p-6 sm:p-10 space-y-10">
          <SitemapGroup title="Pages" items={PAGES} />
          <SitemapGroup title="Collections" items={COLLECTIONS} />
          <SitemapGroup
            title="Tours"
            items={tours}
            empty="Trip listings will appear here once they are published."
          />
          {stories.length > 0 && (
            <SitemapGroup title="Stories" items={stories} />
          )}
          {places.length > 0 && (
            <SitemapGroup title="Places" items={places} />
          )}
        </div>
      </div>
    </div>
  );
}

function SitemapGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: { href: string; label: string }[];
  empty?: string;
}) {
  return (
    <section className="space-y-4 border-b border-zinc-100 last:border-b-0 last:pb-0 pb-8">
      <h2 className="text-lg sm:text-xl font-black text-[#0F172A] uppercase tracking-tight">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs sm:text-sm text-zinc-500 font-medium">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                className="text-xs sm:text-sm font-semibold text-zinc-600 hover:text-[#2563EB] transition-colors"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
