import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { pagesService } from "@/services/pages.service";
import { toast } from "sonner";

export default function PagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const pagesRes = await pagesService.getAll();
        setPages(pagesRes.data || []);
      } catch (err) {
        toast.error("Failed to load pages");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleCreatePage = async () => {
    try {
      const title = prompt("Enter Page Title");
      if (!title) return;
      const slug = title.toLowerCase().replace(/ /g, "-");
      const res = await pagesService.create({ title, slug });
      toast.success("Page created");
      navigate(`/admin/pages/${res.data._id}`);
    } catch (err) {
      toast.error("Failed to create page");
    }
  };

  return (
    <div className="admin-page animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Pages & Templates
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Manage website structure, layout pages, and visual blocks.
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreatePage}
          className="h-8.5 px-4 rounded-[4px] font-semibold text-xs bg-primary-orange hover:bg-primary-orange/90 text-white flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Page
        </Button>
      </div>

      <div className="bg-white rounded-md border border-slate-200 shadow-sm p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-md border border-blue-100">
            <span className="bg-[#FF5400] text-white text-[9px] font-semibold px-2 py-0.5 rounded-md">
              TIP
            </span>
            <p className="text-xs font-medium text-slate-700">
              Use the Page Builder to design pages visually. Visit the blogs
              system to manage stories.
            </p>
          </div>

          {loading ? (
            <div className="py-20 text-center animate-pulse text-slate-400 text-sm">
              Syncing Pages...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map((page) => (
                <div
                  key={page._id}
                  className="bg-white rounded-md border border-slate-200 p-5 flex flex-col items-center justify-center text-center gap-3 hover:shadow-md transition-all"
                >
                  <FileText className="w-5 h-5 text-[#FF4D00]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 truncate max-w-full">
                      {page.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-1 italic">
                      {page.slug}
                    </p>
                  </div>
                  <Link to={`/admin/pages/${page._id}`} className="w-full">
                    <Button className="w-full h-8.5 rounded-[4px] font-semibold text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm">
                      Edit Layout Content
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

