import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import { travelDeskService } from "@/services/travelDesk.service";
import { ClipboardList, ChevronRight, FileText } from "lucide-react";
import {
  TravelDeskLoadingState,
  TravelDeskEmptyState,
} from "./TravelDeskStateComponents";
import { TravelDeskCreateSopModal } from "./TravelDeskCreateSopModal";

interface TravelDeskSopsProps {
  trip: Trip;
}

export const TravelDeskSops: React.FC<TravelDeskSopsProps> = ({ trip }) => {
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSops = async () => {
      try {
        const data = await travelDeskService.getSops(trip.id);
        setSops(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSops();
  }, [trip.id]);

  if (loading) return <TravelDeskLoadingState message="Loading SOPs..." />;

  const handleDeleteSop = async (e: React.MouseEvent, sopId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this SOP?")) return;
    try {
      await travelDeskService.deleteSop(sopId);
      setSops(sops.filter((s) => s.id !== sopId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete SOP");
    }
  };

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Standard Operating Procedures
          </h2>
          <p className="text-xs text-slate-550 mt-0.5 font-bold">
            Step-by-step guides for trip operations
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E66000] shadow-sm"
        >
          + Add New SOP
        </button>
      </div>

      {!sops || sops.length === 0 ? (
        <div className="mt-8">
          <TravelDeskEmptyState
            title="No Standard Operating Procedures"
            description="No SOPs have been defined for this trip yet."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sops.map((sop: any) => (
            <div
              key={sop.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-colors cursor-pointer group relative"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDeleteSop(e, sop.id)}
                  className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete SOP"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
              <div className="flex items-start gap-4 pr-8">
                <div className="w-10 h-10 bg-[#FF6B00]/10 text-[#FF6B00] rounded-lg flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-[#FF6B00] transition-colors">
                    {sop.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {sop.description}
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <FileText className="w-3.5 h-3.5" />v{sop.version || 1}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FF6B00] transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TravelDeskCreateSopModal
          tripId={trip.id}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newSop) => {
            setSops([...sops, newSop]);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

