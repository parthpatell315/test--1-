import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { fetchPublicReviews, normalizeImageUrl } from "@/lib/api";
import Link from "next/link";
import {
  Star,
  MessageCircle,
  Filter,
  Sparkles,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

import { brandConfig } from "@/config/brand.config";

export const revalidate = 30;

export const metadata: Metadata = pageMetadata({
  title: `Traveler Reviews | ${brandConfig.name}`,
  description: `Read authentic ${brandConfig.name} trip reviews and experiences from travelers across India.`,
  path: "/reviews",
});

export default async function ReviewsPage() {
  let reviews = [];
  try {
    reviews = await fetchPublicReviews();
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }

  // Helper to extract handle from URL
  const getHandle = (url?: string) => {
    if (!url) return "";
    return "@" + url.replace("https://instagram.com/", "").replace("/", "");
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Search/Header Hero */}
      <section className="pt-40 pb-20 px-6 bg-zinc-50 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="max-w-3xl">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-8 font-bold text-xs capitalize tracking-widest transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Home
              </Link>
              <div className="flex items-center gap-3 text-blue-600 mb-6">
                <MessageCircle className="w-6 h-6" />
                <span className="font-bold tracking-[0.3em] capitalize text-xs">
                  Community Voices
                </span>
              </div>
              <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[0.9]">
                Trusted By <br />
                <span className="text-blue-600">Travelers</span>
              </h1>
              <p className="text-slate-500 text-lg font-normal max-w-xl leading-relaxed">
                Read authentic stories and verified experiences from our community. Real people, unforgettable journeys.
              </p>
            </div>

            {/* Quick Filters Placeholder */}
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                <Filter className="w-4 h-4" />
                Filter by Trip
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all">
                <Sparkles className="w-4 h-4" />
                Latest Reviews
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {reviews.map((rev: any, i: number) => (
                <div
                  key={rev._id || i}
                  className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-zinc-100 group hover:shadow-xl transition-all h-full flex flex-col"
                >
                  <div className="relative aspect-video overflow-hidden shrink-0">
                    <OptimizedImage
                      src={
                        normalizeImageUrl(rev.userImage) ||
                        "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?q=80&w=2070"
                      }
                      alt={rev.userName}
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-navy mb-1">
                          {rev.userName}
                        </h3>
                        {rev.city && (
                          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold tracking-widest">
                            <MapPin className="w-3 h-3 text-primary-orange" />
                            {rev.city}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-4 h-4 ${idx < rev.rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-200"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-zinc-600 text-sm font-medium leading-relaxed mb-8 italic flex-grow">
                      &quot;{rev.comment}&quot;
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-zinc-50 mt-auto">
                      <span className="text-[10px] text-zinc-400 font-bold tracking-widest">
                        {rev.tripName}
                      </span>

                      {rev.instagram && (
                        <a
                          href={rev.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-navy hover:text-primary-orange transition-all group/insta"
                        >
                          <div className="w-8 h-8 bg-zinc-50 rounded-full flex items-center justify-center group-hover/insta:bg-primary-orange group-hover/insta:text-white transition-all">
                            <svg
                              className="w-4 h-4 -current"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                          </div>
                          <span className="text-xs font-bold">
                            {getHandle(rev.instagram)}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-40 text-center bg-zinc-50 rounded-[60px] border-2 border-dashed border-zinc-200">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <MessageCircle className="w-10 h-10 text-zinc-300" />
              </div>
              <h2 className="text-3xl font-bold capitalize text-navy mb-4">
                No reviews yet
              </h2>
              <p className="text-zinc-400 font-bold max-w-sm mx-auto capitalize tracking-widest text-xs">
                Check back soon to see what our community has to say!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
