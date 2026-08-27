import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { pageBuilderService } from "@/services/page-builder.service";
import {
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Eye,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PreviewPage() {
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page") || "home";
  const token = searchParams.get("token");
  const [layout, setLayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  const formatUrl = (url: string | undefined) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    let apiBase =
      import.meta.env.VITE_API_URL || "https://api.youthcamping.online/api";
    if (!apiBase || apiBase.includes("onrender.com")) {
      apiBase = "https://api.youthcamping.online/api";
    }
    apiBase = apiBase.replace(/\/api$/, "");
    return `${apiBase}${url}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        // If token is provided, we can ensure it's used for the fetch
        if (token) localStorage.setItem("admin_token", token);
        const data = await pageBuilderService.getDraft(page);
        setLayout(data);
      } catch (err) {
        console.error("Failed to load preview", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, token]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">
              Rendering Cinematic Engine
            </p>
            <p className="text-2xl font-black uppercase tracking-tighter opacity-50 italic">
              Constructing {page}...
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* ── DEVICE TOOLBAR ── */}
      <div className="h-14 bg-black border-b border-white/5 px-6 flex items-center justify-between sticky top-0 z-[100] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Preview Mode
          </span>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            / {page}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <Button
            variant={device === "desktop" ? "default" : "ghost"}
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => setDevice("desktop")}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={device === "tablet" ? "default" : "ghost"}
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => setDevice("tablet")}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={device === "mobile" ? "default" : "ghost"}
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => setDevice("mobile")}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="text-[10px] font-black uppercase tracking-widest gap-2 text-white/60 hover:text-white"
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* ── PREVIEW STAGE ── */}
      <div className="flex-1 overflow-auto p-12 flex justify-center bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]">
        <div
          className={`bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 ease-out overflow-hidden rounded-[32px] border-[12px] border-black ring-1 ring-white/10 ${
            device === "desktop"
              ? "w-full max-w-[1440px]"
              : device === "tablet"
                ? "w-[768px]"
                : "w-[375px]"
          }`}
        >
          {/* Mock Website Content */}
          <div className="w-full">
            {layout?.sections
              ?.filter((s: any) => s.visible)
              .map((section: any) => (
                <div
                  key={section.id}
                  className="relative group border-b border-gray-50 last:border-0"
                  style={{
                    backgroundColor:
                      section.draft?.backgroundColor || "#ffffff",
                    paddingTop: section.draft?.padding || "80px",
                    paddingBottom: section.draft?.padding || "80px",
                  }}
                >
                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <Badge className="bg-primary text-black font-black text-[8px] uppercase tracking-widest px-3 py-1 rounded-full">
                      {section.type}
                    </Badge>
                    {section.locked && (
                      <LockIcon className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  <div
                    className={`mx-auto ${section.draft?.maxWidth === "narrow" ? "max-w-2xl" : section.draft?.maxWidth === "normal" ? "max-w-5xl" : "max-w-7xl"} px-10`}
                  >
                    {section.type === "hero" && (
                      <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                        <h2
                          className={`font-black uppercase tracking-tighter mb-6 ${
                            section.draft?.fontSize === "small"
                              ? "text-2xl"
                              : section.draft?.fontSize === "medium"
                                ? "text-4xl"
                                : section.draft?.fontSize === "xlarge"
                                  ? "text-8xl"
                                  : section.draft?.fontSize === "cinematic"
                                    ? "text-[10rem]"
                                    : "text-6xl"
                          }`}
                        >
                          {section.draft?.headline || "EVERY GREAT STORY..."}
                        </h2>
                        <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
                          {section.draft?.subheadline ||
                            "Subheadline goes here"}
                        </p>
                        <div className="mt-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary italic">
                          <Eye className="w-3 h-3" /> Visual sizing matched for
                          preview
                        </div>
                      </div>
                    )}
                    {section.type === "bestie" && (
                      <div className="text-center py-10">
                        <h2 className="text-2xl font-bold mb-12 tracking-tight">
                          {section.draft?.title}
                        </h2>
                        <div className="flex flex-wrap justify-center gap-6">
                          {(section.draft?.reasons || []).map(
                            (reason: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-6 max-w-[380px] w-full text-left"
                              >
                                <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                                  {reason.image ? (
                                    <img
                                      src={formatUrl(reason.image)}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-50 rounded-full" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-md font-black mb-1">
                                    {reason.title || "New Reason"}
                                  </h3>
                                  <p className="text-gray-500 text-[10px] leading-relaxed line-clamp-2">
                                    {reason.desc || "Description..."}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {section.type === "rich_text" && (
                      <div
                        className="prose prose-lg max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter"
                        dangerouslySetInnerHTML={{
                          __html: section.draft?.body || "",
                        }}
                      />
                    )}
                    {section.type === "reality" && (
                      <div className="py-10 text-center">
                        <h2 className="text-2xl font-bold mb-8 tracking-tight uppercase">
                          {section.draft?.title || "The Reality"}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {(section.draft?.videos || []).map(
                            (vid: any, idx: number) => (
                              <div
                                key={idx}
                                className="relative aspect-video rounded-[24px] overflow-hidden group shadow-md border-2 border-gray-100 cursor-pointer"
                              >
                                <img
                                  src={formatUrl(vid.img)}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
                                    <Play className="w-6 h-6 fill-white" />
                                  </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 text-white text-left">
                                  <p className="text-lg font-bold">
                                    {vid.title}
                                  </p>
                                  <p className="text-[10px] uppercase font-bold opacity-80">
                                    {vid.sub}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-10 p-10 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-gray-300">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                        Full visual component rendering
                      </p>
                      <p className="text-[10px] font-bold mt-1 italic">
                        Available on production site
                      </p>
                    </div>
                  </div>
                </div>
              ))}

            {(!layout?.sections || layout.sections.length === 0) && (
              <div className="h-[600px] flex flex-col items-center justify-center text-center p-20">
                <div className="bg-gray-50 p-10 rounded-[60px] mb-8">
                  <Loader2 className="w-20 h-20 text-gray-200" />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-gray-300">
                  Empty Layout
                </h2>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <div className={`bg-amber-500/10 p-1 rounded-md ${className}`}>
      <svg
        className="w-3 h-3 text-amber-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
      </svg>
    </div>
  );
}
