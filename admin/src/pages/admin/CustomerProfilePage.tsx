import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { formatDistanceToNow } from "date-fns";

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/erp/customer-timeline/${id}`)
      .then((res) => setTimeline(res.data.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Customer Profile & Timeline</h1>
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-gray-500">
            No activity recorded for this customer.
          </p>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {timeline.map((event, i) => (
              <div
                key={i}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <span className="text-xs font-bold">
                    {event.module.charAt(0)}
                  </span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-slate-900">
                      {event.title}
                    </div>
                    <time className="font-caveat font-medium text-[#FF4D00]">
                      {event.date} {event.time}
                    </time>
                  </div>
                  <div className="text-slate-500 mb-2">{event.description}</div>
                  <div className="text-xs text-slate-400">By {event.user}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
