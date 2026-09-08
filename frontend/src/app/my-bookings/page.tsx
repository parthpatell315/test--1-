"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  MapPin,
  CreditCard,
  ChevronRight,
  Hash,
  Clock,
  AlertCircle,
  ArrowLeft,
  Users,
  FileText,
  CheckSquare,
  Ticket,
  DollarSign,
  Activity,
  MessageSquare,
  Plus,
  Bell,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";

export default function MyBookingsPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/bookings/my-bookings/search?phone=${encodeURIComponent(phone)}`,
      );
      const data = await res.json();

      if (data.success) {
        setBookings(data.data);
        setSearched(true);
        if (data.data.length === 1) {
          setSelectedBooking(data.data[0]);
        }
      } else {
        setError(data.message || "Failed to fetch bookings");
      }
    } catch (err) {
      setError(
        "Our servers are temporarily unavailable. Please try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate days to departure
  const getDaysToGo = (departureDate: string) => {
    if (!departureDate) return 0;
    const diff = new Date(departureDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBD";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (selectedBooking) {
    const daysToGo = getDaysToGo(selectedBooking.departureDate);
    const amountPaid = selectedBooking.advancePaid || 0;
    const totalAmount = selectedBooking.totalAmount || 0;
    const balanceDue = totalAmount - amountPaid;
    const paymentProgress =
      totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
    const passengerCount = (selectedBooking.passengers?.length || 0) + 1; // Primary guest + co-travelers

    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans antialiased my-bookings-active-workspace">
        {/* Style configurations for design parity */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          /* Hide global layout components during active booking workspace view */
          body nav, 
          body footer, 
          body a[aria-label="Chat on WhatsApp"] {
            display: none !important;
          }
          body main {
            padding-top: 0 !important;
          }
        `,
          }}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_340px] min-h-screen">
          {/* ============ SIDEBAR ============ */}
          <div className="hidden xl:flex flex-col bg-[#0f172a] text-white p-4 border-r border-[#334155] h-screen sticky top-0">
            <div className="font-extrabold text-sm tracking-wider mb-6 flex items-center gap-2">
              <img
                src="/footer-logo.png"
                alt="TravelSphere"
                className="h-12 w-auto object-contain scale-125 origin-left"
              />
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full text-left py-2.5 px-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold"
              >
                ‹ Back to Tracker
              </button>
              <div className="w-full text-left py-2.5 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-semibold">
                My Booking Workspace
              </div>
              <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-3 mt-4 mb-2">
                Workspace Navigation
              </div>
              <button
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "w-full text-left py-2 px-3 rounded text-xs transition-all",
                  activeTab === "overview"
                    ? "text-white font-bold"
                    : "text-slate-400 hover:text-white",
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("passengers")}
                className={cn(
                  "w-full text-left py-2 px-3 rounded text-xs transition-all",
                  activeTab === "passengers"
                    ? "text-white font-bold"
                    : "text-slate-400 hover:text-white",
                )}
              >
                Passengers
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={cn(
                  "w-full text-left py-2 px-3 rounded text-xs transition-all",
                  activeTab === "payments"
                    ? "text-white font-bold"
                    : "text-slate-400 hover:text-white",
                )}
              >
                Payments
              </button>
              <button
                onClick={() => setActiveTab("operations")}
                className={cn(
                  "w-full text-left py-2 px-3 rounded text-xs transition-all",
                  activeTab === "operations"
                    ? "text-white font-bold"
                    : "text-slate-400 hover:text-white",
                )}
              >
                Operations
              </button>
              <button
                onClick={() => setActiveTab("ticketing")}
                className={cn(
                  "w-full text-left py-2 px-3 rounded text-xs transition-all",
                  activeTab === "ticketing"
                    ? "text-white font-bold"
                    : "text-slate-400 hover:text-white",
                )}
              >
                Ticketing
              </button>
            </div>
          </div>

          {/* ============ MAIN CONTENT AREA ============ */}
          <div className="flex flex-col min-w-0">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4 shadow-sm">
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Booking ID
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {selectedBooking.bookingId}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 px-4 border-l border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Trip
                </span>
                <span className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-[300px]">
                  {selectedBooking.tripName}
                </span>
              </div>

              <div className="hidden sm:flex flex-col gap-0.5 px-4 border-l border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Customer
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  {selectedBooking.name}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                    selectedBooking.status === "confirmed"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600",
                  )}
                >
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            {/* KPI STRIP */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shadow-sm">
              <div
                onClick={() => setActiveTab("payments")}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-1"
              >
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-[#2563EB]" /> Payment
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  ₹{amountPaid.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  Due: ₹{balanceDue.toLocaleString()}
                </span>
              </div>

              <div
                onClick={() => setActiveTab("passengers")}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-1"
              >
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#2563EB]" /> Passengers
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {passengerCount}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  Group Size
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#2563EB]" /> Departure
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {daysToGo} Days
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  Remaining
                </span>
              </div>

              <div
                onClick={() => setActiveTab("operations")}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-1"
              >
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-[#2563EB]" /> Operations
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  3/6
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  Verified items
                </span>
              </div>

              <div
                onClick={() => setActiveTab("ticketing")}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-1"
              >
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Ticket className="w-3 h-3 text-[#2563EB]" /> Ticketing
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {selectedBooking.pnrDetails ? "Uploaded" : "Pending"}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  PNR status
                </span>
              </div>

              <div
                onClick={() => setActiveTab("activity")}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-1"
              >
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#2563EB]" /> Activity
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  Live
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  Updates available
                </span>
              </div>
            </div>

            {/* MAIN TAB SWITCHER */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {/* TAB LIST */}
              <div className="flex gap-6 border-b border-slate-200 overflow-x-auto no-scrollbar mb-6">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "passengers", label: "Passengers" },
                  { id: "payments", label: "Payments" },
                  { id: "operations", label: "Operations" },
                  { id: "ticketing", label: "Ticketing" },
                  { id: "activity", label: "Timeline" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pb-3 text-xs md:text-sm font-bold whitespace-nowrap border-b-2 transition-colors",
                      activeTab === tab.id
                        ? "text-[#2563EB] border-[#2563EB]"
                        : "text-slate-500 border-transparent hover:text-slate-800",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Alert bar */}
                  <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg text-emerald-700 text-xs font-semibold flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span>
                      Booking workspace synced. Payment verification system
                      operational.
                    </span>
                  </div>

                  {/* Attention section */}
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Items Requiring Attention
                    </h3>
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white shadow-sm">
                      {balanceDue > 0 ? (
                        <div className="flex items-center gap-2 py-2 border-b border-slate-100 text-xs text-slate-700">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>
                            Outstanding Balance Due:{" "}
                            <strong className="text-red-600">
                              ₹{balanceDue.toLocaleString()}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2 border-b border-slate-100 text-xs text-slate-700">
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-700 font-bold">
                            Booking Fully Paid! Thank you.
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>
                          Departure scheduled for{" "}
                          {formatDate(selectedBooking.departureDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Trip Specifications
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Room Preference
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {selectedBooking.roomType || "Standard Sharing"}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Pickup Location
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {selectedBooking.pickupCity || "TBD"}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Departure Date
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {formatDate(selectedBooking.departureDate)}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Payment Mode
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {selectedBooking.paymentMode || "Direct Link"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSENGERS TAB */}
              {activeTab === "passengers" && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Passenger List ({passengerCount})
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">
                            No.
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Phone / Contact
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Primary guest */}
                        <tr className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-3 text-xs font-bold text-slate-500 text-center">
                            1
                          </td>
                          <td className="p-3 text-xs font-bold text-slate-900">
                            {selectedBooking.name} (Lead)
                          </td>
                          <td className="p-3 text-xs text-slate-700">
                            {selectedBooking.phone} <br />
                            <span className="text-[10px] text-slate-400">
                              {selectedBooking.email}
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            <span className="px-2 py-0.5 rounded bg-orange-50 text-[#2563EB] text-[10px] font-bold">
                              Primary Guest
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                              Confirmed
                            </span>
                          </td>
                        </tr>
                        {/* Co-travelers */}
                        {selectedBooking.passengers?.map(
                          (p: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-200 hover:bg-slate-50"
                            >
                              <td className="p-3 text-xs font-bold text-slate-500 text-center">
                                {idx + 2}
                              </td>
                              <td className="p-3 text-xs font-bold text-slate-900">
                                {p.name}
                              </td>
                              <td className="p-3 text-xs text-slate-700">
                                {p.phone || "N/A"}
                              </td>
                              <td className="p-3 text-xs">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">
                                  Co-Traveler
                                </span>
                              </td>
                              <td className="p-3 text-xs">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                                  Confirmed
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PAYMENTS TAB */}
              {activeTab === "payments" && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Detailed Bill Sheet
                  </h3>

                  <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Gross Amount
                        </span>
                        <div className="text-xl font-extrabold text-slate-900 mt-1">
                          ₹{totalAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Paid / Received
                        </span>
                        <div className="text-xl font-extrabold text-emerald-600 mt-1">
                          ₹{amountPaid.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Balance Due
                        </span>
                        <div className="text-xl font-extrabold text-red-600 mt-1">
                          ₹{balanceDue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Payment Completed</span>
                        <span>{paymentProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                          style={{ width: `${paymentProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OPERATIONS TAB */}
              {activeTab === "operations" && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Workspace Booking Checklist
                  </h3>
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        item: "Hotel Accommodations Verified",
                        status: "Booked",
                        date: "2 days ago",
                        checked: true,
                      },
                      {
                        item: "In-Destination Ground Transport Booking",
                        status: "Booked",
                        date: "Yesterday",
                        checked: true,
                      },
                      {
                        item: "Assigned Coordinator & Tour Guide",
                        status: "Assigned",
                        date: "Today",
                        checked: true,
                      },
                      {
                        item: "Room Allocation Completed",
                        status: "Pending",
                        date: "—",
                        checked: false,
                      },
                      {
                        item: "Travel Insurance Setup",
                        status: "Pending",
                        date: "—",
                        checked: false,
                      },
                      {
                        item: "Medical Clearance Verification",
                        status: "Pending",
                        date: "—",
                        checked: false,
                      },
                    ].map((todo, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-lg shadow-sm bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            readOnly
                            checked={todo.checked}
                            className="w-4 h-4 accent-[#2563EB]"
                          />
                          <span
                            className={cn(
                              "text-xs font-bold text-slate-900",
                              todo.checked && "line-through text-slate-400",
                            )}
                          >
                            {todo.item}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              todo.checked
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600",
                            )}
                          >
                            {todo.status}
                          </span>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            {todo.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TICKETING TAB */}
              {activeTab === "ticketing" && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Ticket Information
                  </h3>
                  {selectedBooking.pnrDetails ? (
                    <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            PNR / Ticket Code
                          </span>
                          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                            {selectedBooking.pnrDetails}
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wider">
                          Ready / Confirmed
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-4 flex gap-6 text-xs font-semibold text-slate-700">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold">
                            Preferred Coach
                          </span>
                          <div>
                            {selectedBooking.roomType ||
                              "General Accommodations"}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-bold">
                            Seats Allocations
                          </span>
                          <div>Assigned upon check-in</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50 text-slate-400">
                      <Ticket className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400" />
                      <div className="text-xs font-bold text-slate-600">
                        Ticket assignment in progress
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        PNR codes and boarding vouchers will be uploaded here
                        shortly.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TIMELINE TAB */}
              {activeTab === "activity" && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Live Booking Log
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        title: "Room Allocation Preference Recorded",
                        desc: `Option: ${selectedBooking.roomType || "Standard Sharing"}`,
                      },
                      {
                        title: "Booking Database Entry Created",
                        desc: `Booking initialized for ${selectedBooking.name}`,
                      },
                      {
                        title: "Payment Receipt Verification Request",
                        desc: `Advance payment verified for ₹${amountPaid.toLocaleString()}`,
                      },
                    ].map((log, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-3 bg-slate-50 border-l-4 border-[#2563EB] rounded-lg"
                      >
                        <div className="w-2.5 h-2.5 bg-[#2563EB] rounded-full mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-900">
                            {log.title}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {log.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============ RIGHT RAIL ============ */}
          <div className="border-t xl:border-t-0 xl:border-l border-slate-200 bg-white p-6 h-screen sticky top-0 overflow-y-auto flex flex-col gap-6">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Customer Information
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
                <div className="w-10 h-10 bg-[#2563EB] text-white rounded-full flex items-center justify-center font-bold text-xs">
                  {selectedBooking.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="font-bold text-xs text-slate-900">
                  {selectedBooking.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Phone:</span>{" "}
                  {selectedBooking.phone}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Email:</span>{" "}
                  {selectedBooking.email || "N/A"}
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Pickup Location:
                    </span>{" "}
                    {selectedBooking.pickupCity || "TBD"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Preference Mode:
                    </span>{" "}
                    {selectedBooking.paymentMode || "Default Link"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pinned Note
              </h4>
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs font-semibold text-amber-800 leading-relaxed italic">
                "{selectedBooking.notes || "No special requirements pinned."}"
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-200 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Actions
              </h4>
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                Download Receipt Receipt
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-2.5 px-3 bg-[#0f172a] hover:bg-slate-800 text-white rounded text-xs font-bold transition-all text-center"
              >
                Close Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-navy capitalize tracking-tighter"
          >
            My <span className="text-primary-orange">Bookings</span>
          </motion.h1>
          <p className="text-zinc-500 font-medium">
            Track your upcoming adventures and payment status.
          </p>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-[32px] shadow-xl shadow-zinc-200/50 border border-zinc-100 max-w-xl mx-auto"
        >
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="tel"
                placeholder="Enter your phone number..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-orange transition-all font-bold text-navy"
              />
            </div>
            <button
              disabled={loading}
              type="submit"
              className="bg-navy text-white px-8 rounded-2xl font-bold capitalize text-xs tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Track"}
            </button>
          </form>
          {error && (
            <p className="text-red-500 text-xs font-bold mt-3 px-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </motion.div>

        {/* Results */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {searched && bookings.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-zinc-200"
              >
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-xl font-bold text-navy capitalize">
                  No Bookings Found
                </h3>
                <p className="text-zinc-500 text-sm mt-1">
                  We couldn't find any bookings for this number.
                </p>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {bookings.map((booking, idx) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedBooking(booking)}
                    className="group bg-white p-6 rounded-[32px] border border-zinc-100 hover:border-primary-orange/30 hover:shadow-2xl hover:shadow-primary-orange/5 transition-all flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer"
                  >
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-110",
                        booking.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {booking.status === "confirmed" ? (
                        <Calendar className="w-8 h-8" />
                      ) : (
                        <Clock className="w-8 h-8" />
                      )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold capitalize tracking-widest bg-zinc-100 px-2 py-0.5 rounded text-zinc-500">
                          {booking.bookingId}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold capitalize tracking-widest px-2 py-0.5 rounded",
                            booking.paymentStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {booking.paymentStatus}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-navy capitalize tracking-tight">
                        {booking.tripName || "Adventure Trip"}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />{" "}
                          {booking.pickupCity || "Departure TBD"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />{" "}
                          {booking.departureDate
                            ? new Date(
                                booking.departureDate,
                              ).toLocaleDateString()
                            : "Date TBD"}
                        </span>
                      </div>
                    </div>

                    {/* Financial Info */}
                    <div className="w-full md:w-auto text-left md:text-right space-y-1 pr-4">
                      <p className="text-[10px] font-bold capitalize tracking-widest text-zinc-400">
                        Amount Paid
                      </p>
                      <p className="text-2xl font-bold text-navy tracking-tighter">
                        ₹{booking.advancePaid?.toLocaleString() || 0}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-400">
                        Total: ₹{booking.totalAmount?.toLocaleString() || 0}
                      </p>
                    </div>

                    <ChevronRight className="w-6 h-6 text-zinc-200 group-hover:text-primary-orange group-hover:translate-x-1 transition-all hidden md:block" />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
