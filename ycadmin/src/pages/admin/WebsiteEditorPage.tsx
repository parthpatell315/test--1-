import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  websiteService,
  WebsitePage,
  UpdatePagePayload,
} from "@/services/website.service";
import { WebsiteEditor } from "@/components/admin/website/WebsiteEditor";
import { toast } from "sonner";

export default function WebsiteEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState<WebsitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No page slug specified");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    websiteService
      .getPageBySlug(slug)
      .then((data) => {
        if (!data) {
          setError(`Page "/${slug}" not found`);
        } else {
          setPage(data);
        }
      })
      .catch((err) => {
        const message =
          err?.response?.data?.message || err?.message || "Failed to load page";
        setError(message);
        console.error("[WebsiteEditorPage] load error:", err);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSave = async (
    id: string,
    data: UpdatePagePayload,
  ): Promise<WebsitePage | null> => {
    try {
      const updated = await websiteService.updatePage(id, data);
      setPage(updated);
      toast.success(`Page "${updated.title}" saved successfully`);
      return updated;
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to save page";
      toast.error(message);
      return null;
    }
  };

  const handleBack = () => {
    navigate("/admin/website");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4541A]" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#0B1528]">
          Loading Page Editor...
        </p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-[#0B1528]">Page Not Found</h2>
          <p className="text-sm text-slate-500 font-medium max-w-sm">
            {error || "The requested page could not be loaded."}
          </p>
        </div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1528] hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
        >
          Back to Website Manager
        </button>
      </div>
    );
  }

  return <WebsiteEditor page={page} onSave={handleSave} onBack={handleBack} />;
}

