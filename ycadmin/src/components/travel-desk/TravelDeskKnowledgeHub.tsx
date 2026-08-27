import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import {
  TravelDeskWorkspace,
  travelDeskService,
} from "@/services/travelDesk.service";
import {
  BookOpen,
  Briefcase,
  HelpCircle,
  ClipboardCheck,
  Ticket,
  Globe,
  MapPin,
  Luggage,
  ChevronRight,
} from "lucide-react";
import { CategoryArticlesView } from "./CategoryArticlesView";

interface TravelDeskKnowledgeHubProps {
  trip: Trip;
  workspace: TravelDeskWorkspace;
}

export const TravelDeskKnowledgeHub: React.FC<TravelDeskKnowledgeHubProps> = ({
  trip,
  workspace,
}) => {
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<TravelDeskWorkspace>(workspace);
  const [salesPdfCount, setSalesPdfCount] = useState(0);

  // Sync workspace if it changes on parent selection
  useEffect(() => {
    setCurrentWorkspace(workspace);
    setActiveCategory(null); // Reset detail view on trip change
  }, [workspace, trip.id]);

  const refreshWorkspace = async () => {
    try {
      const [ws, docRes] = await Promise.all([
        travelDeskService.getWorkspace(trip.id),
        travelDeskService.getDocuments(trip.id),
      ]);
      if (ws) {
        setCurrentWorkspace(ws);
      }
      if (docRes && docRes.data) {
        const salesDocs = docRes.data.filter(
          (d: any) => d.category === "Sales Guide" && d.status !== "ARCHIVED",
        );
        setSalesPdfCount(salesDocs.length);
      }
    } catch (err) {
      console.error("Failed to refresh workspace category counts", err);
    }
  };

  useEffect(() => {
    const fetchSalesPdfs = async () => {
      try {
        const docRes = await travelDeskService.getDocuments(trip.id);
        if (docRes && docRes.data) {
          const salesDocs = docRes.data.filter(
            (d: any) => d.category === "Sales Guide" && d.status !== "ARCHIVED",
          );
          setSalesPdfCount(salesDocs.length);
        }
      } catch (err) {
        console.error("Failed to load PDF count", err);
      }
    };
    fetchSalesPdfs();
  }, [trip.id]);

  const categoryConfig: Record<
    string,
    { icon: any; colorClass: string; bgClass: string; desc: string }
  > = {
    "trip-overview": {
      icon: BookOpen,
      colorClass: "text-[#FF4D00]",
      bgClass: "bg-[#FFF3EC] border border-[#FFE1D1]",
      desc: "Highlights, route, best time, difficulty, key details",
    },
    "sales-guide": {
      icon: Briefcase,
      colorClass: "text-[#FF4D00]",
      bgClass: "bg-[#FFF3EC] border border-[#FFE1D1]",
      desc: "How to sell, USPs, objections & answers",
    },
    "customer-faqs": {
      icon: HelpCircle,
      colorClass: "text-green-600",
      bgClass: "bg-green-50 border border-green-100",
      desc: "All customer questions & answers",
    },
    "inclusions-&-exclusions": {
      icon: ClipboardCheck,
      colorClass: "text-[#0B1528]",
      bgClass: "bg-[#F8FAFC] border border-[#E8EEF4]",
      desc: "What's included / not included",
    },
    "ticketing-info": {
      icon: Ticket,
      colorClass: "text-[#FF4D00]",
      bgClass: "bg-[#FFF3EC] border border-[#FFE1D1]",
      desc: "Train, flight, bus, cab details & rules",
    },
    "visa-&-entry": {
      icon: Globe,
      colorClass: "text-[#0B1528]",
      bgClass: "bg-[#F8FAFC] border border-[#E8EEF4]",
      desc: "Permit, documents, requirements",
    },
    "destination-guide": {
      icon: MapPin,
      colorClass: "text-[#0B1528]",
      bgClass: "bg-[#F8FAFC] border border-[#E8EEF4]",
      desc: "Weather, food, culture, places, local tips",
    },
    "packing-guide": {
      icon: Luggage,
      colorClass: "text-[#FF4D00]",
      bgClass: "bg-[#FFF3EC] border border-[#FFE1D1]",
      desc: "What to carry, checklist & tips",
    },
  };

  const getCategoryConfig = (slug: string) => {
    return (
      categoryConfig[slug] || {
        icon: BookOpen,
        colorClass: "text-[#0B1528]",
        bgClass: "bg-[#F8FAFC] border border-[#E8EEF4]",
        desc: "Trip documentation",
      }
    );
  };

  const displayCategories = currentWorkspace.categories || [];

  if (activeCategory) {
    return (
      <CategoryArticlesView
        tripId={trip.id}
        category={activeCategory}
        onBack={() => setActiveCategory(null)}
        onRefreshCount={refreshWorkspace}
      />
    );
  }

  const getCount = (cat: any) =>
    (cat._count?.articles || 0) +
    (cat.slug === "sales-guide" ? salesPdfCount : 0);

  const totalItems = displayCategories.reduce(
    (sum: number, cat: any) => sum + getCount(cat),
    0,
  );

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3 font-sans">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[#0B1528]">
            Knowledge hub
          </h2>
          <p className="mt-0.5 text-[12px] font-medium text-slate-500">
            The single source of truth for this trip — keep it updated for the
            whole team.
          </p>
        </div>
        <span className="text-[12px] font-medium text-slate-500">
          {displayCategories.length} categories · {totalItems}{" "}
          {totalItems === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {displayCategories.map((cat: any) => {
          const config = getCategoryConfig(cat.slug);
          const Icon = config.icon;
          const count = getCount(cat);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="group flex min-w-0 flex-col rounded-xl border border-[#E8EEF4] bg-white p-3.5 text-left transition-colors hover:border-[#0B1528]/20"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgClass}`}
                >
                  <Icon className={`h-4 w-4 ${config.colorClass}`} />
                </span>
                <h3
                  className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#0B1528]"
                  title={cat.name}
                >
                  {cat.name}
                </h3>
              </div>
              <p className="mt-2.5 flex-1 text-[12px] font-medium leading-relaxed text-slate-500">
                {config.desc}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-[#E8EEF4] pt-2.5">
                <span className="text-[12px] font-medium text-slate-500">
                  {count} {count === 1 ? "item" : "items"}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#FF4D00]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

