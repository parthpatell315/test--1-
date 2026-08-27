import React from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";

interface Notice {
  id: string;
  title: string;
  message: string;
  publishedAt: string;
}

export const TravelDeskUpdatesRail = () => {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get("tripId");
  const [updates, setUpdates] = React.useState<Notice[]>([]);

  React.useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    api
      .get(`/travel-desk/${tripId}/notices`)
      .then((res) => {
        if (!cancelled && res.data.success) {
          setUpdates(res.data.data.slice(0, 6));
        }
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return (
    <aside className="hidden min-h-0 w-[248px] shrink-0 flex-col overflow-hidden border-l border-[#E8EEF4] bg-white font-sans xl:flex">
      <div className="shrink-0 border-b border-[#E8EEF4] px-3 py-3">
        <h3 className="text-[13px] font-semibold text-[#0B1528]">
          Recent updates
        </h3>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {updates.length === 0 ? (
          <p className="text-[12px] font-medium text-slate-500">
            No recent updates.
          </p>
        ) : (
          <ol className="space-y-3">
            {updates.map((update) => (
              <li
                key={update.id}
                className="relative border-l border-[#E8EEF4] pl-3"
              >
                <span
                  aria-hidden
                  className="absolute left-[-3px] top-1.5 h-1.5 w-1.5 rounded-full bg-[#FF4D00]"
                />
                <p className="text-[11px] font-medium text-slate-500">
                  {new Date(
                    update.publishedAt || new Date(),
                  ).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] font-medium text-[#0B1528]">
                  {update.title}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
};
