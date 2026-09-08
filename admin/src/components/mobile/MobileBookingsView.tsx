import React, { useState } from "react";
import { Phone, MessageSquare, CreditCard, Edit2, Search } from "lucide-react";
import { cn, formatINR, formatBookingCreatedAt } from "@/lib/utils";
import {
  bookingListDueAmount,
  bookingListPaidAmount,
} from "@/utils/bookingListFinance";

interface BookingItem {
  id: string;
  bookingId: string;
  customerName: string;
  phone: string;
  tripName: string;
  departureDate: string;
  createdAtLabel: string;
  totalPrice: number;
  paidAmount: number;
  balance: number;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  rawBooking?: any;
}

interface MobileBookingsViewProps {
  bookings?: any[];
  onSelectBooking?: (booking: any) => void;
  onCollectPayment?: (booking: any) => void;
}

export const MobileBookingsView: React.FC<MobileBookingsViewProps> = ({
  bookings = [],
  onSelectBooking,
  onCollectPayment,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("all");

  const list: BookingItem[] = (bookings || []).map((b: any) => {
    const total = Number(b.totalAmount ?? b.amount ?? 0);
    const paid = bookingListPaidAmount(b);
    const balance = bookingListDueAmount(b);
    return {
      id: b.id,
      bookingId: b.bookingId || b.id,
      customerName: b.name || b.fullName || b.customerName || "Customer",
      phone: b.phone || b.mobile || "",
      tripName: b.tripName || b.tripTitle || b.tripId || "Trip",
      departureDate: b.departureDate
        ? new Date(b.departureDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Flexible",
      createdAtLabel: formatBookingCreatedAt(b.createdAt),
      totalPrice: total,
      paidAmount: paid,
      balance,
      status: (b.status === "confirmed" || b.status === "Confirmed"
        ? "CONFIRMED"
        : "PENDING") as BookingItem["status"],
      rawBooking: b,
    };
  });

  const filtered = list.filter((b) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.customerName.toLowerCase().includes(q) ||
      b.bookingId.toLowerCase().includes(q) ||
      b.phone.includes(search);

    if (filter === "pending") return matchesSearch && b.balance > 0;
    if (filter === "confirmed") return matchesSearch && b.balance <= 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-2.5 pb-28">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, name, phone…"
            className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#FF5400] font-semibold text-slate-800"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-10 text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-2.5 text-slate-700 outline-none shrink-0 max-w-[110px]"
        >
          <option value="all">All</option>
          <option value="pending">Due</option>
          <option value="confirmed">Paid</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          No bookings match this filter
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelectBooking?.(b.rawBooking || b)}
              className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm space-y-2.5 active:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate block">
                    {b.bookingId}
                    {b.createdAtLabel ? ` · ${b.createdAtLabel}` : ""}
                  </span>
                  <h3 className="text-[13px] font-bold text-slate-900 leading-tight mt-0.5 truncate">
                    {b.customerName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    {b.tripName} · {b.departureDate}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1",
                      b.balance <= 0
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {b.balance <= 0 ? "PAID" : `DUE ${formatINR(b.balance)}`}
                  </span>
                  <span className="text-[12px] font-extrabold text-slate-900 block tabular-nums">
                    {formatINR(b.totalPrice)}
                  </span>
                </div>
              </div>

              <div
                className="flex items-center gap-1.5 pt-2 border-t border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                {b.phone ? (
                  <>
                    <a
                      href={`tel:${b.phone}`}
                      className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center active:scale-95"
                      aria-label="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/${b.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center active:scale-95"
                      aria-label="WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </>
                ) : null}

                {b.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => onCollectPayment?.(b.rawBooking || b)}
                    className="h-9 flex-1 min-w-0 px-2 rounded-lg bg-[#FF5400] text-white text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 truncate"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Collect {formatINR(b.balance)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectBooking?.(b.rawBooking || b)}
                  className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center active:scale-95 shrink-0"
                  aria-label="Open booking"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileBookingsView;

