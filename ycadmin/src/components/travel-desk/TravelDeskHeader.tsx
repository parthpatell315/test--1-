import React, { useState } from "react";
import {
  Clock,
  MapPin,
  Activity,
  Users,
  ExternalLink,
  Share2,
  Settings,
  Sun,
} from "lucide-react";
import { Trip } from "@/types";
import { DepartureSummary } from "@/services/travelDesk.service";
import { TripSettingsModal } from "./TripSettingsModal";
import { toast } from "sonner";

interface TravelDeskHeaderProps {
  trip: Trip;
  readinessScore: number;
  departures: DepartureSummary[];
  onTripUpdated?: (updatedTrip: Trip) => void;
}

export const TravelDeskHeader: React.FC<TravelDeskHeaderProps> = ({
  trip,
  readinessScore,
  onTripUpdated,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleTripBrief = () => {
    // Open trip public page in new tab
    const slug = (trip as any).slug || trip.id;
    window.open(`https://youthcamping.online/trips/${slug}`, "_blank");
  };

  const handleShare = () => {
    const slug = (trip as any).slug || trip.id;
    const url = `https://youthcamping.online/trips/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Trip link copied to clipboard!");
      });
    } else {
      toast.info(`Share URL: ${url}`);
    }
  };

  const readiness = Math.min(100, Math.max(0, readinessScore || 0));

  const metaItems = [
    trip.duration
      ? {
          icon: Clock,
          label: `${trip.duration}${trip.duration.includes("Days") ? "" : " Days"}`,
        }
      : null,
    trip.location ? { icon: MapPin, label: trip.location } : null,
    trip.difficulty ? { icon: Activity, label: trip.difficulty } : null,
    {
      icon: Users,
      label: trip.maxGroupSize
        ? `Up to ${trip.maxGroupSize} pax`
        : "15 - 45 pax",
    },
    (trip as any).startEnd
      ? { icon: Sun, label: (trip as any).startEnd }
      : null,
  ].filter(Boolean) as { icon: any; label: string }[];

  return (
    <>
      <div className="shrink-0 p-3 font-sans">
        <div className="relative overflow-hidden rounded-xl border border-[#132339] bg-[#0B1528] text-white">
          {trip.heroImage && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
              style={{ backgroundImage: `url('${trip.heroImage}')` }}
            />
          )}

          <div className="relative flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
                  {trip.title}
                </h1>
                <span className="text-[12px] font-medium text-slate-400">
                  {(trip as any).code || trip.id.substring(0, 6).toUpperCase()}
                </span>
                <span className="rounded bg-[#FF4D00] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {(trip as any).category || "Domestic"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-slate-300">
                {metaItems.map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-[#FF4D00]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="mr-1 hidden items-center gap-2 sm:flex">
                <span className="text-[11px] font-medium text-slate-400">
                  Readiness
                </span>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                  <span
                    className="block h-full rounded-full bg-[#FF4D00]"
                    style={{ width: `${readiness}%` }}
                  />
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-white">
                  {readiness}%
                </span>
              </div>

              <button
                onClick={handleTripBrief}
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/15 px-2.5 text-[12px] font-medium text-white transition-colors hover:border-white/40 hover:bg-white/10"
                title="View public trip page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Trip brief
              </button>

              <button
                onClick={handleShare}
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/15 px-2.5 text-[12px] font-medium text-white transition-colors hover:border-white/40 hover:bg-white/10"
                title="Copy trip share link"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-md bg-[#FF4D00] px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#E04400]"
                title="Edit trip settings"
              >
                <Settings className="h-3.5 w-3.5" />
                Trip settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <TripSettingsModal
        trip={trip}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={(updatedTrip) => {
          onTripUpdated?.(updatedTrip);
        }}
      />
    </>
  );
};
