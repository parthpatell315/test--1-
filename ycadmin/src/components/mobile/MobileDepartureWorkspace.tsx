import React, { useState } from "react";
import {
  CheckCircle2,
  Phone,
  MessageSquare,
  CreditCard,
  DollarSign,
  Search,
  Users,
  Train,
  Filter,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";

interface Passenger {
  id: string;
  name: string;
  phone: string;
  bookingId: string;
  tripName: string;
  balance: number;
  paymentMethod: "CASH" | "UPI" | "ONLINE" | "PENDING";
  collected: boolean;
  seatNo?: string;
  isLead: boolean;
  bookingLeadName: string;
  bookingBalance: number;
}

interface MobileDepartureWorkspaceProps {
  departureName?: string;
  departureDate?: string;
  passengers?: any[];
  onSelectPassenger?: (passenger: any) => void;
  onToggleCollection?: (passengerId: string) => void;
}

export const MobileDepartureWorkspace: React.FC<MobileDepartureWorkspaceProps> = ({
  departureName,
  departureDate,
  passengers: rawPassengers = [],
  onSelectPassenger,
  onToggleCollection,
}) => {
  const [activeTab, setActiveTab] = useState<
    "cash" | "passengers" | "rooms" | "transport"
  >("cash");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "collected">("all");

  const [collectedMap, setCollectedMap] = useState<Record<string, boolean>>({});

  const passengersList: (Passenger & { rawPassenger?: any })[] = rawPassengers.length > 0
    ? rawPassengers.map((p: any, idx: number) => {
        const id = p.id || `P-${idx}`;
        const isLead = p.isLead !== false;
        const rawBookingBalance = Number(
          p.bookingBalance ?? p.balance ?? p.remainingAmount ?? 0,
        );
        const bookingBalance = Number.isFinite(rawBookingBalance)
          ? Math.max(0, Math.round(rawBookingBalance))
          : 0;
        const isCollected = collectedMap[id] !== undefined
          ? collectedMap[id]
          : (bookingBalance <= 0 || p.paymentStatus === "Paid in Full");
        const balanceVal = isCollected || !isLead ? 0 : bookingBalance;

        return {
          id,
          name: p.name || p.fullName || "Traveler",
          phone: p.phone || p.mobile || "—",
          bookingId: p.bookingRef || p.bookingId || p.id,
          tripName: p.tripTitle || departureName || "Trip",
          balance: balanceVal,
          bookingBalance: isCollected ? 0 : bookingBalance,
          paymentMethod: isCollected ? "CASH" : "PENDING",
          collected: isCollected,
          seatNo: p.seatNo || p.seatNumber || undefined,
          isLead,
          bookingLeadName: p.leadPassengerName || p.name || p.fullName || "Traveler",
          rawPassenger: p,
        };
      })
    : [];

  const toggleCollection = (id: string) => {
    setCollectedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    onToggleCollection?.(id);
  };

  const collectionBookings = passengersList.filter((p) => p.isLead);
  const collectedCount = collectionBookings.filter((p) => p.collected).length;
  const totalCount = collectionBookings.length;
  const totalPendingBalance = passengersList.reduce(
    (sum, p) => sum + (p.isLead && !p.collected ? p.balance : 0),
    0,
  );

  const filteredPassengers = passengersList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.bookingId.toLowerCase().includes(search.toLowerCase());
    if (filter === "pending")
      return matchesSearch && p.bookingBalance > 0;
    if (filter === "collected") return matchesSearch && p.collected;
    return matchesSearch;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Station Ops Live Counter Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Station Operations Live
              </span>
            </div>
            <h2 className="text-base font-black text-white mt-0.5">
              {departureName || "Departure Group"}{departureDate ? ` (${departureDate})` : ""}
            </h2>
          </div>
          <div className="bg-[#FF4D00]/20 text-[#FF5400] border border-[#FF4D00]/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            Railway Station
          </div>
        </div>

        {/* Live Cash Progress Counter */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Collection Progress
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-green-500">
                {collectedCount}
              </span>
              <span className="text-xs font-bold text-slate-400">
                / {totalCount} bookings
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Pending Cash
            </span>
            <span className="text-2xl font-black text-amber-400 mt-0.5 block">
              {formatINR(totalPendingBalance)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-green-600 h-full transition-all duration-300"
            style={{
              width: `${totalCount > 0 ? (collectedCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Module Selector Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: "cash", label: "Cash Collection", icon: DollarSign },
          { id: "passengers", label: "Passenger Manifest", icon: Users },
          { id: "rooms", label: "Rooms & Beds", icon: Train },
          { id: "transport", label: "Transport Fleet", icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 touch-manipulation",
                activeTab === tab.id
                  ? "bg-[#FF5400] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Status Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or seat..."
            className="w-full h-11 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FF5400] font-semibold text-slate-800 shadow-2xs"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="h-11 text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 text-slate-700 outline-none shadow-2xs cursor-pointer"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="collected">Collected</option>
        </select>
      </div>

      {/* Passengers List Cards */}
      <div className="space-y-2.5">
        {filteredPassengers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">
            No passengers found for this departure.
          </div>
        )}
        {filteredPassengers.map((p) => (
          <div
            key={p.id}
            className={cn(
              "p-4 rounded-2xl border transition-all shadow-2xs flex flex-col gap-3",
              p.collected
                ? "bg-green-50/60 border-green-200/80"
                : "bg-white border-slate-200/80",
            )}
          >
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                  {p.seatNo && (
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {p.seatNo}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {p.bookingId}
                  {!p.isLead && ` • Lead: ${p.bookingLeadName}`}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {p.phone}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider block",
                    p.collected
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {p.collected
                    ? "COLLECTED"
                    : p.isLead
                      ? `DUE ${formatINR(p.balance)}`
                      : `SHARED DUE ${formatINR(p.bookingBalance)}`}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${p.phone}`}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Call Traveller"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${p.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="WhatsApp Traveller"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>

              {p.isLead ? (
                <button
                  type="button"
                  onClick={() => toggleCollection(p.id)}
                  className={cn(
                    "h-8 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs touch-manipulation",
                    p.collected
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-[#FF5400] text-white hover:bg-[#e04a00]",
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {p.collected
                    ? "Paid (Tap to Undo)"
                    : `Collect ${formatINR(p.balance)}`}
                </button>
              ) : (
                <span className="text-[10px] font-bold text-slate-500">
                  Collect once under {p.bookingLeadName}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileDepartureWorkspace;



