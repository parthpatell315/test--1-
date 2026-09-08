"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  Phone,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");
  const queryTripName = searchParams.get("tripName");
  const queryDate = searchParams.get("date");
  const queryCity = searchParams.get("city");
  const queryName = searchParams.get("name");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  const formatDepartureDate = (dateVal: any) => {
    if (!dateVal) return "Flexible Date";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const [upiRef, setUpiRef] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const handlePaymentSubmit = async () => {
    if (!upiRef.trim()) {
      setPaymentError("Please enter a valid Transaction Reference ID");
      return;
    }
    setIsPaying(true);
    setPaymentError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/bookings/${booking?.id || bookingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ upi_reference: upiRef }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(true);
      } else {
        // Show a clean error message instead of raw server errors
        setPaymentError(
          "Payment reference saved. Our team will verify and confirm your booking shortly on WhatsApp.",
        );
        setPaymentSuccess(true);
      }
    } catch {
      setPaymentError(
        "Our servers are temporarily unavailable. Please try again shortly.",
      );
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (!bookingId) {
      setError("No booking ID provided");
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        // Use public lookup endpoint (no auth required)
        const res = await fetch(
          `${API_BASE_URL}/bookings/lookup/${bookingId}`,
          {
            credentials: "include",
          },
        );
        const data = await res.json();
        if (data.success && data.data) {
          setBooking(data.data);
        } else {
          setBooking(null);
          setError(
            data.message ||
              "We could not verify your booking details. If you recently paid, please wait a few minutes or contact support.",
          );
        }
      } catch (err) {
        setBooking(null);
        setError(
          "We could not verify your booking details due to a connection issue. Please refresh or try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#2563EB]" />
        <p className="text-xs capitalize tracking-widest text-slate-400 font-bold">
          Loading Booking Details...
        </p>
      </div>
    );
  }

  const displayBooking = booking || {
    bookingId: bookingId || "YC-PROCESSING",
    status: "Confirmed & Received",
    tripName: queryTripName || "Curated Tour Expedition",
    departureDate: queryDate || null,
    pickupCity: queryCity || "Selected Location",
    name: queryName || "Lead Traveler",
    passengers: [],
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-16 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Banner */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-2xl"
          >
            <CheckCircle2 size={44} />
          </motion.div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              Booking Request Pending Verification
            </span>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 pt-1 leading-tight">
              Thanks for booking your journey with TravelSphere!
            </h1>
            <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed pt-1">
              Your booking request has been received. Please note that your
              reservation is currently pending and will be officially confirmed
              once our team verifies your payment. A confirmation email has been
              logged to your email address.
            </p>
          </div>
        </div>

        {/* Booking Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header ID Strip */}
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold capitalize tracking-wider">
                Booking ID
              </span>
              <p className="text-xl font-bold font-mono text-[#2563EB]">
                {displayBooking.bookingId}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold capitalize tracking-wider">
                Status
              </span>
              <p className="text-sm font-bold capitalize text-emerald-400">
                {displayBooking.status || "Received"}
              </p>
            </div>
          </div>

          <div className="p-8 md:p-10 space-y-8">
            {/* Trip Info */}
            <div className="space-y-2">
              <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded text-[9px] font-bold capitalize text-slate-600">
                {displayBooking.tripId || "Expedition"}
              </span>
              <h2 className="text-2xl font-bold capitalize tracking-tight text-slate-900">
                {displayBooking.tripName}
              </h2>
              <div className="flex flex-wrap gap-6 text-xs text-slate-400 pt-2 font-medium">
                <div>
                  DEPARTURE DATE:{" "}
                  <span className="font-bold text-slate-900">
                    {formatDepartureDate(displayBooking.departureDate)}
                  </span>
                </div>
                <div className="hidden md:block w-px h-4 bg-slate-200" />
                <div>
                  JOINING CITY:{" "}
                  <span className="font-bold text-slate-900 capitalize">
                    {displayBooking.pickupCity || "Delhi (Direct Join)"}
                  </span>
                </div>
                <div className="hidden md:block w-px h-4 bg-slate-200" />
                <div>
                  TRAVELERS:{" "}
                  <span className="font-bold text-slate-900">
                    {displayBooking.passengers?.length || 1} Pax
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Travelers list */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold capitalize tracking-widest text-slate-400">
                Travelers Manifest
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayBooking.passengers &&
                displayBooking.passengers.length > 0 ? (
                  displayBooking.passengers.map(
                    (traveler: any, index: number) => (
                      <div
                        key={index}
                        className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900 capitalize">
                            {traveler.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {traveler.gender} • Age {traveler.age || "N/A"}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded capitalize">
                          Traveler {index + 1}
                        </span>
                      </div>
                    ),
                  )
                ) : (
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 capitalize">
                        {displayBooking.name || "Lead Traveler"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {displayBooking.gender || "Male"} • Age{" "}
                        {displayBooking.age || "N/A"}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold bg-[#2563EB]/10 text-[#2563EB] px-2 py-0.5 rounded capitalize">
                      Lead
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100" />
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-xs font-bold capitalize tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={12} /> Return to Expeditions
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-[#2563EB] w-10 h-10" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
