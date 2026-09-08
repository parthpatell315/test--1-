import { Metadata } from "next";
import { fetchBlogBySlugResult, normalizeImageUrl } from "@/lib/api";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { notFound } from "next/navigation";
import ServiceUnavailable from "@/components/ServiceUnavailable";
import {
  Clock,
  User,
  Calendar,
  Share2,
  Link as LinkIcon,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { pageMetadata, stripHtml, truncateMeta } from "@/lib/seo";
import { PUBLIC_SITE_ORIGIN, absoluteSiteUrl } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const blogResult = await fetchBlogBySlugResult(slug);
  if (!blogResult.ok || !blogResult.data)
    return pageMetadata({
      title: blogResult.ok ? "Not Found" : "Temporarily unavailable",
      description: "Trrabb travel story.",
      path: `/read/${slug}`,
      index: false,
    });

  const blog = blogResult.data;
  const excerpt =
    truncateMeta(stripHtml(blog.content || "")) ||
    `Read ${blog.title} on Trrabb.`;
  const imageUrl = normalizeImageUrl(blog.image);

  return pageMetadata({
    title: `${blog.title} | Trrabb`,
    description: excerpt,
    path: `/read/${slug}`,
    image: imageUrl,
  });
}

export default async function BlogReadPage({ params }: PageProps) {
  const { slug } = await params;
  const blogResult = await fetchBlogBySlugResult(slug);
  if (!blogResult.ok) {
    return <ServiceUnavailable title="This story is temporarily unavailable" />;
  }
  const blog = blogResult.data;
  if (!blog) {
    notFound();
  }

  const date = blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Recent Story";

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Bar (Client-side would be better but simple layout for now) */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-[100]">
        <div className="h-full bg-primary w-0" id="reading-progress"></div>
      </div>

      {/* Navigation Header */}
      <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2 text-zinc-400 hover:text-navy transition-colors font-bold capitalize text-[10px] tracking-widest"
        >
          <div className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center group-hover:border-navy transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          Back to Home
        </Link>
        <div className="flex items-center gap-4 invisible"></div>
      </div>

      <article className="max-w-4xl mx-auto px-6 pb-24">
        {/* Hero Header */}
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold capitalize tracking-[0.2em] rounded-full">
              Verified Journal
            </span>
            <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold capitalize tracking-widest">
              <Clock className="w-3 h-3" />
              {blog.readTime || "5 Min Read"}
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-navy capitalize tracking-tighter leading-[0.9] mb-10">
            {blog.title}
          </h1>

          <div className="flex items-center gap-4 p-6 bg-zinc-50 rounded-[32px] border border-zinc-100">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/20 shrink-0 border-2 border-white shadow-lg">
              {blog.authorImage ? (
                <OptimizedImage
                  src={normalizeImageUrl(blog.authorImage)}
                  alt={blog.author}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                  {blog.author?.[0]}
                </div>
              )}
            </div>
            <div>
              <span className="text-[9px] font-bold capitalize tracking-[0.2em] text-zinc-400 block mb-0.5">
                Written By
              </span>
              <h4 className="text-sm font-bold text-navy capitalize">
                {blog.author}
              </h4>
            </div>
            <div className="ml-auto flex flex-col items-end hidden sm:flex">
              <span className="text-[9px] font-bold capitalize tracking-[0.2em] text-zinc-400 block mb-0.5">
                Published
              </span>
              <h4 className="text-sm font-bold text-navy capitalize flex items-center gap-2">
                <Calendar className="w-3 h-3 text-primary" /> {date}
              </h4>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="aspect-[21/9] rounded-[48px] overflow-hidden mb-16 shadow-2xl relative">
          <OptimizedImage
            src={normalizeImageUrl(blog.image)}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Content */}
        <div
          className="prose prose-xl prose-zinc max-w-none 
          prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-navy
          prose-p:text-zinc-600 prose-p:leading-[1.8] prose-p:font-medium
          prose-img:rounded-[32px] prose-img:shadow-xl
          prose-strong:text-navy prose-strong:font-black
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-zinc-50 prose-blockquote:p-8 prose-blockquote:rounded-r-[32px] prose-blockquote:italic prose-blockquote:text-navy prose-blockquote:font-bold prose-blockquote:not-italic"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.title,
            image: normalizeImageUrl(blog.image),
            url: absoluteSiteUrl(`/read/${slug}`),
            mainEntityOfPage: absoluteSiteUrl(`/read/${slug}`),
            author: {
              "@type": "Person",
              name: blog.author,
            },
            publisher: {
              "@type": "Organization",
              name: "Trrabb",
              logo: {
                "@type": "ImageObject",
                url: `${PUBLIC_SITE_ORIGIN}/logo.png`,
              },
            },
            datePublished: blog.createdAt,
            description: blog.content.replace(/<[^>]*>/g, "").slice(0, 160),
          }),
        }}
      />
    </div>
  );
}
