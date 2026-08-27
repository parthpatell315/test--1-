import React from "react";
import { useNavigate } from "react-router-dom";
import { Trip } from "@/types";
import { DepartureSummary } from "@/services/travelDesk.service";
import {
  Calendar,
  Users,
  ChevronRight,
  FileText,
  Settings,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelDeskDeparturesProps {
  trip: Trip;
  departures: DepartureSummary[];
}

export const TravelDeskDepartures: React.FC<TravelDeskDeparturesProps> = ({
  trip,
  departures,
}) => {
  const navigate = useNavigate();
  const maxPax = trip.maxGroupSize || 45;

  if (!departures || departures.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          No Departures Found
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md text-center">
          There are no bookings or scheduled departures for {trip.title}.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Departures & Operations
          </h2>
          <p className="text-xs text-slate-550 mt-0.5 font-bold">
            Manage passengers, vendors, and checklists for each departure
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {departures.map((dep, idx) => {
          const dateObj = new Date(dep.departureDate);
          const month = dateObj.toLocaleString("en-US", { month: "short" });
          const day = dateObj.getDate();
          const year = dateObj.getFullYear();
          const dayOfWeek = dateObj.toLocaleString("en-US", {
            weekday: "long",
          });

          const totalPax = dep.confirmedPassengers + dep.pendingPassengers;
          const fillPercentage = Math.min(
            100,
            Math.round((totalPax / maxPax) * 100),
          );

          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-350 transition-colors flex flex-col justify-between"
            >
              <div className="p-4 flex-1">
                <div className="flex items-start gap-4">
                  {/* CALENDAR BLOCK */}
                  <div className="shrink-0 flex flex-col items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden w-16 shadow-2xs">
                    <div className="bg-[#FF6B00] text-white text-[9px] font-black tracking-wider uppercase w-full py-1 text-center">
                      {month}
                    </div>
                    <div className="py-1.5 flex flex-col items-center">
                      <span className="text-xl font-black text-slate-800 leading-none">
                        {day}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                        {year}
                      </span>
                    </div>
                  </div>

                  {/* INFO BLOCK */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span>{dayOfWeek}</span>
                          {totalPax >= maxPax && (
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[8.5px] uppercase tracking-wider font-black border border-green-200">
                              Sold Out
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <Users className="w-3.5 h-3.5 text-slate-450" />
                            <span>{totalPax} Pax</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <FileText className="w-3.5 h-3.5 text-slate-450" />
                            <span>{dep.bookingsCount} Bookings</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider mb-1">
                        <span className="text-slate-450">Occupancy</span>
                        <span className="text-slate-700">
                          {fillPercentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${Math.min(100, Math.round((dep.confirmedPassengers / maxPax) * 100))}%`,
                          }}
                        />
                        <div
                          className="h-full bg-yellow-400"
                          style={{
                            width: `${Math.min(100, Math.round((dep.pendingPassengers / maxPax) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-450">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span>{dep.confirmedPassengers} Confirmed</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-450">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          <span>{dep.pendingPassengers} Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="bg-slate-50 border-t border-slate-100 p-2.5 px-4 flex items-center justify-end gap-2 shrink-0">
                <button
                  onClick={() => {
                    const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
                    navigate(
                      `/admin/departure-workspace?tripId=${trip.id}&departureDate=${formattedDate}&tab=passengers`,
                    );
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-650 hover:text-[#FF6B00] hover:border-[#FF6B00] transition-colors shadow-2xs whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Passengers</span>
                </button>
                <button
                  onClick={() => {
                    const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
                    navigate(
                      `/admin/departure-workspace?tripId=${trip.id}&departureDate=${formattedDate}&tab=overview`,
                    );
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 text-white border border-slate-800 rounded-lg text-[11px] font-bold hover:bg-slate-700 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Operations</span>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
