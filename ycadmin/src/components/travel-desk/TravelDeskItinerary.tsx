import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import { travelDeskService } from "@/services/travelDesk.service";
import { Map, CalendarDays, CheckCircle2, XCircle, Info } from "lucide-react";
import {
  TravelDeskLoadingState,
  TravelDeskEmptyState,
} from "./TravelDeskStateComponents";

interface TravelDeskItineraryProps {
  trip: Trip;
}

export const TravelDeskItinerary: React.FC<TravelDeskItineraryProps> = ({
  trip,
}) => {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const data = await travelDeskService.getOfficialItinerary(trip.id);
        console.log("🚀 [Itinerary Frontend] API returned:", data);
        const activeVersion =
          data?.itineraryVersions?.[0]?.itinerary || data?.itinerary || [];

        if (activeVersion.length > 0) {
          const mappedInclusions = (data?.inclusions || []).map(
            (text: string, i: number) => ({ id: i, text }),
          );
          const mappedExclusions = (data?.exclusions || []).map(
            (text: string, i: number) => ({ id: i, text }),
          );
          console.log(
            "🚀 [Itinerary Frontend] mappedInclusions:",
            mappedInclusions,
          );
          setItineraries([
            {
              isDefault: true,
              version: data?.itineraryVersions?.[0]?.version || 1,
              days: activeVersion.map((d: any) => ({
                id: d.day || Math.random().toString(),
                dayNumber: d.day || 1,
                title: d.title,
                description: d.description,
              })),
              inclusions: mappedInclusions,
              exclusions: mappedExclusions,
            },
          ]);
        } else {
          setItineraries([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItineraries();
  }, [trip.id]);

  if (loading)
    return <TravelDeskLoadingState message="Loading Itineraries..." />;

  const defaultItinerary =
    itineraries.find((i) => i.isDefault) || itineraries[0];

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Official Itinerary
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-semibold">
            View the day-by-day travel plan and inclusions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {defaultItinerary && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200">
              Version {defaultItinerary.version}
            </span>
          )}
          <button className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E66000] shadow-sm">
            Manage Itineraries
          </button>
        </div>
      </div>

      {!itineraries || itineraries.length === 0 ? (
        <div className="mt-8">
          <TravelDeskEmptyState
            title="No Itineraries"
            description="No itinerary has been created for this trip yet."
          />
        </div>
      ) : defaultItinerary ? (
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <div className="2xl:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Day by Day Plan
            </h3>
            {defaultItinerary.days?.map((day: any) => {
              const points = day.description
                ? day.description
                    .split("•")
                    .map((p: string) => p.trim())
                    .filter((p: string) => p.length > 0)
                : [];
              const displayPoints =
                points.length > 0 ? points : [day.description || ""];

              return (
                <div
                  key={day.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-[#FF6B00]/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Compact Day Box */}
                    <div className="w-10 h-10 bg-slate-50 border border-slate-200/60 rounded-lg flex flex-col items-center justify-center shrink-0">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">
                        Day
                      </span>
                      <span className="text-base font-black text-slate-800 leading-none mt-0.5">
                        {day.dayNumber}
                      </span>
                    </div>
                    {/* Aligned Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-800 leading-snug break-words">
                        {day.title}
                      </h4>
                      <ul className="mt-2 space-y-1.5">
                        {displayPoints.map((pt, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] font-semibold text-slate-600 leading-relaxed flex items-start gap-2"
                          >
                            <span className="text-[#FF6B00] shrink-0 mt-1.5 text-[6px]">
                              ●
                            </span>
                            <span className="flex-1 break-words">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Inclusions
              </h3>
              <ul className="space-y-2">
                {defaultItinerary.inclusions?.map((inc: any) => (
                  <li
                    key={inc.id}
                    className="text-[11px] font-semibold text-slate-600 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-green-500 mt-1 shrink-0">●</span>
                    <span className="flex-1 break-words">{inc.text}</span>
                  </li>
                ))}
                {(!defaultItinerary.inclusions ||
                  defaultItinerary.inclusions.length === 0) && (
                  <p className="text-xs text-slate-400 italic">
                    No inclusions specified.
                  </p>
                )}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                <XCircle className="w-4 h-4 text-red-600" /> Exclusions
              </h3>
              <ul className="space-y-2">
                {defaultItinerary.exclusions?.map((exc: any) => (
                  <li
                    key={exc.id}
                    className="text-[11px] font-semibold text-slate-600 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-red-600 mt-1 shrink-0">●</span>
                    <span className="flex-1 break-words">{exc.text}</span>
                  </li>
                ))}
                {(!defaultItinerary.exclusions ||
                  defaultItinerary.exclusions.length === 0) && (
                  <p className="text-xs text-slate-400 italic">
                    No exclusions specified.
                  </p>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

