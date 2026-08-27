import React, { useState } from "react";
import {
  Phone,
  MessageSquare,
  UserCheck,
  Search,
  Filter,
  Calendar,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  tripName: string;
  status: "NEW" | "CONTACTED" | "INTERESTED" | "FOLLOWUP" | "WON" | "LOST";
  priority: "HIGH" | "MEDIUM" | "LOW";
  lastContact: string;
}

interface MobileCRMLeadsViewProps {
  inquiries?: any[];
  onSelectInquiry?: (inquiry: any) => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

export const MobileCRMLeadsView: React.FC<MobileCRMLeadsViewProps> = ({
  inquiries = [],
  onSelectInquiry,
  onUpdateStatus,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const fallbackLeads: LeadItem[] = [
    {
      id: "L1",
      name: "Ankit Sharma",
      phone: "+91 9876543210",
      tripName: "Manali Kasol Trip",
      status: "INTERESTED",
      priority: "HIGH",
      lastContact: "2 hours ago",
    },
    {
      id: "L2",
      name: "Neha Gupta",
      phone: "+91 9812345678",
      tripName: "Kedarnath Trek",
      status: "FOLLOWUP",
      priority: "HIGH",
      lastContact: "Yesterday",
    },
    {
      id: "L3",
      name: "Rohan Mehta",
      phone: "+91 9765432109",
      tripName: "Spiti Road Trip",
      status: "NEW",
      priority: "MEDIUM",
      lastContact: "Just now",
    },
    {
      id: "L4",
      name: "Karan Johar",
      phone: "+91 9654321098",
      tripName: "Kerala Backpacking",
      status: "CONTACTED",
      priority: "LOW",
      lastContact: "3 days ago",
    },
  ];

  const leadsList: (LeadItem & { rawInquiry?: any })[] =
    inquiries.length > 0
      ? inquiries.map((inq: any) => ({
          id: inq.id,
          name: inq.name || inq.customerName || "Lead",
          phone: inq.phone || inq.customerPhone || "",
          tripName: inq.tripTitle || inq.tripName || inq.destination || "Trip Inquiry",
          status: (inq.status || "NEW").toUpperCase() as any,
          priority: (inq.priority || "MEDIUM").toUpperCase() as any,
          lastContact: inq.createdAt
            ? new Date(inq.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })
            : "Recent",
          rawInquiry: inq,
        }))
      : fallbackLeads;

  const filtered = leadsList.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.tripName.toLowerCase().includes(search.toLowerCase());

    if (filter === "high") return matchesSearch && l.priority === "HIGH";
    if (filter === "followup") return matchesSearch && l.status === "FOLLOWUP";
    return matchesSearch;
  });

  return (
    <div className="space-y-3 pb-20">
      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lead name, trip, phone..."
            className="w-full h-11 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FF5400] font-semibold text-slate-800 shadow-2xs"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-11 text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 text-slate-700 outline-none shadow-2xs cursor-pointer"
        >
          <option value="all">All Leads</option>
          <option value="high">High Priority</option>
          <option value="followup">Follow up</option>
        </select>
      </div>

      {/* Leads List Cards */}
      <div className="space-y-2.5">
        {filtered.map((l) => (
          <div
            key={l.id}
            onClick={() => onSelectInquiry && onSelectInquiry(l.rawInquiry || l)}
            className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs space-y-3 cursor-pointer hover:border-[#FF4D00]/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{l.name}</h3>
                  {l.priority === "HIGH" && (
                    <span className="text-[9px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 uppercase">
                      HOT
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {l.tripName} • {l.phone}
                </p>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Last contact: {l.lastContact}
                </span>
              </div>

              <span
                className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                  l.status === "INTERESTED"
                    ? "bg-[#FF4D00]/10 text-[#FF5400]"
                    : l.status === "FOLLOWUP"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600",
                )}
              >
                {l.status}
              </span>
            </div>

            {/* Quick 1-Thumb Actions */}
            <div
              className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${l.phone}`}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Call Lead"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${l.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="WhatsApp Lead"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateStatus && onUpdateStatus(l.id, "converted")}
                  className="h-8 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Convert
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileCRMLeadsView;


