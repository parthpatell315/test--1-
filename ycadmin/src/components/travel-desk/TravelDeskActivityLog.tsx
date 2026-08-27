import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import { travelDeskService } from "@/services/travelDesk.service";
import { Activity, Clock } from "lucide-react";
import {
  TravelDeskLoadingState,
  TravelDeskEmptyState,
} from "./TravelDeskStateComponents";

interface TravelDeskActivityLogProps {
  trip: Trip;
}

export const TravelDeskActivityLog: React.FC<TravelDeskActivityLogProps> = ({
  trip,
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await travelDeskService.getActivityLog(trip.id);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [trip.id]);

  if (loading)
    return <TravelDeskLoadingState message="Loading Activity Log..." />;

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Workspace Activity Log
          </h2>
          <p className="text-xs text-slate-550 mt-0.5 font-bold">
            Audit trail of all changes made to this trip's resources
          </p>
        </div>
      </div>

      {!logs || logs.length === 0 ? (
        <div className="mt-8">
          <TravelDeskEmptyState
            title="No Activity Recorded"
            description="There is no audit history available for this trip workspace."
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
            {logs.map((log: any, idx: number) => {
              const isLatest = idx === 0;
              return (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${isLatest ? "bg-[#FF6B00]" : "bg-slate-300"}`}
                  />

                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-800 font-medium">
                        <span className="font-bold text-slate-900">
                          {log.performedBy?.name || "System User"}
                        </span>{" "}
                        <span className="text-slate-500 lowercase">
                          {log.action}
                        </span>{" "}
                        <span className="font-bold text-slate-700">
                          {log.entityType.replace(/_/g, " ")}
                        </span>
                      </p>
                      {log.newValue && log.newValue.title && (
                        <p className="text-xs text-slate-500 mt-1">
                          "{log.newValue.title}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold shrink-0 ml-4">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
