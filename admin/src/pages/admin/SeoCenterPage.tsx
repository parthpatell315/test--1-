import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Globe, Search, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { seoService } from "@/services/seo.service";
import { tripsService } from "@/services/trips.service";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";

export default function SeoCenterPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState("home");
  const [seoData, setSeoData] = useState<any>({
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (currentPage) loadSeo();
  }, [currentPage]);

  const loadPages = async () => {
    try {
      const tripsRes = await tripsService.getAll();
      const trips = Array.isArray(tripsRes) ? tripsRes : [];
      const list = [
        { label: "Home Page", value: "home" },
        { label: "About Us", value: "about" },
        ...trips.map((t: any) => ({
          label: `Trip: ${t.title}`,
          value: t.slug,
        })),
      ];
      setPages(list);
    } catch (err) {
      toast.error("Failed to load pages");
    }
  };

  const loadSeo = async () => {
    setLoading(true);
    try {
      const data = await seoService.get(currentPage);
      setSeoData({
        metaTitle: data?.metaTitle || "",
        metaDescription: data?.metaDescription || "",
        ogImage: data?.ogImage || "",
      });
    } catch (err) {
      setSeoData({ metaTitle: "", metaDescription: "", ogImage: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await seoService.update(currentPage, seoData);
      toast.success("SEO updated for " + currentPage);
      api
        .post("/revalidate", {
          path: `/${currentPage === "home" ? "" : currentPage}`,
        })
        .catch(() => {});
    } catch (err) {
      toast.error("Failed to update SEO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Search className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              SEO Center
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Manage search engine presence per page
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-8.5 px-4 rounded-[4px] font-semibold text-xs bg-primary-orange hover:bg-primary-orange/90 text-white flex items-center gap-1.5 shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Optimization
        </Button>
      </div>

      <Card className="rounded-md border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Target Page
            </Label>
            <Select value={currentPage} onValueChange={setCurrentPage}>
              <SelectTrigger className="h-8 rounded-md border border-slate-200 text-sm font-medium px-3">
                <SelectValue placeholder="Select Page" />
              </SelectTrigger>
              <SelectContent className="rounded-md border border-slate-200">
                {pages.map((p) => (
                  <SelectItem
                    key={p.value}
                    value={p.value}
                    className="font-medium py-2 text-sm"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6">
            <div className="space-y-4">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Meta Title
              </Label>
              <Input
                value={seoData?.metaTitle || ""}
                onChange={(e) =>
                  setSeoData({ ...seoData, metaTitle: e.target.value })
                }
                placeholder="Page title for search engines"
                className="h-8 rounded-md border border-slate-200 text-sm font-medium px-3"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Search className="w-3 h-3" /> Meta Description
              </Label>
              <Textarea
                value={seoData?.metaDescription || ""}
                onChange={(e) =>
                  setSeoData({ ...seoData, metaDescription: e.target.value })
                }
                placeholder="Summarize this page for search results..."
                className="rounded-md border border-slate-200 p-3 min-h-[100px] text-sm font-medium leading-relaxed"
                maxLength={160}
              />
              <div className="flex justify-between px-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${(seoData?.metaDescription || "").length > 150 ? "text-red-600" : "text-[#FF4D00]"}`}
                >
                  {(seoData?.metaDescription || "").length} / 150-160 Recommended
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Social Sharing Image (OG
                Image)
              </Label>
              <div className="flex gap-4">
                <Input
                  value={seoData?.ogImage || ""}
                  onChange={(e) =>
                    setSeoData({ ...seoData, ogImage: e.target.value })
                  }
                  placeholder="https://example.com/banner.jpg"
                  className="h-8 rounded-md border border-slate-200 text-sm font-medium px-3 flex-1"
                />
                {seoData?.ogImage && (
                  <div className="h-9 w-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                    <img
                      src={seoData.ogImage}
                      alt="Social Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

