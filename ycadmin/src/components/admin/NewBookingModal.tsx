import { useState, useEffect, useMemo } from "react";
import { AdminModal } from "./AdminModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tripsService } from "@/services/trips.service";
import { bookingsService } from "@/services/bookings.service";
import type { Trip, BookingFormData } from "@/types";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Users,
  IndianRupee,
} from "lucide-react";
import { computeGst } from "@/lib/utils";

interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  booking?: any | null;
}

export default function NewBookingModal({
  open,
  onOpenChange,
  onSuccess,
  booking,
}: NewBookingModalProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTripDetails, setSelectedTripDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [form, setForm] = useState<any>({
    fullName: "",
    mobile: "",
    tripId: "",
    age: 20,
    gender: "Male",
    trainClass: "",
    ticketStatus: "Not Booked",
    roomType: "",
    totalAmount: 0,
    advancePaid: 0,
    status: "confirmed",
    paymentStatus: "Pending",
    paymentMode: "UPI",
    notes: "",
    email: "",
    departureDate: "",
    pickupCity: "",
    numberOfTravelers: 1,
  });

  useEffect(() => {
    if (open) {
      if (booking) {
        setForm({
          fullName: booking.fullName || booking.name || "",
          mobile: booking.mobile || booking.phone || "",
          tripId: booking.tripId || "",
          age: Number(booking.age) || 20,
          gender: booking.gender || "Male",
          trainClass: booking.trainClass || "",
          ticketStatus: booking.ticketStatus || "Not Booked",
          roomType: booking.roomType || "",
          totalAmount: Number(booking.totalAmount ?? booking.amount ?? 0),
          advancePaid: Number(booking.advancePaid ?? 0),
          status: booking.status || "confirmed",
          paymentStatus: booking.paymentStatus || "Pending",
          paymentMode: booking.paymentMode || "UPI",
          notes: booking.notes || "",
          email: booking.email || "",
          departureDate: booking.departureDate
            ? new Date(booking.departureDate).toISOString().split("T")[0]
            : "",
          pickupCity: booking.pickupCity || "",
          numberOfTravelers: Number(
            booking.numberOfTravelers ||
              (booking.passengers && booking.passengers.length) ||
              1,
          ),
        });
        if (booking.tripId) {
          tripsService
            .getById(booking.tripId)
            .then((details) => {
              if (details) setSelectedTripDetails(details);
            })
            .catch(console.error);
        }
      } else {
        setForm({
          fullName: "",
          mobile: "",
          tripId: "",
          age: 20,
          gender: "Male",
          trainClass: "",
          ticketStatus: "Not Booked",
          roomType: "",
          totalAmount: 0,
          advancePaid: 0,
          status: "confirmed",
          paymentStatus: "Pending",
          paymentMode: "UPI",
          notes: "",
          email: "",
          departureDate: "",
          pickupCity: "",
          numberOfTravelers: 1,
        });
        setSelectedTripDetails(null);
      }
    }
  }, [open, booking]);

  useEffect(() => {
    if (open) {
      const loadTrips = async () => {
        setLoadingTrips(true);
        try {
          const data = await bookingsService.getTrips();
          setTrips((data || []) as any);
        } catch (error) {
          toast.error("Failed to load trips");
        } finally {
          setLoadingTrips(false);
        }
      };
      loadTrips();
    }
  }, [open]);

  const handleTripChange = async (tripId: string) => {
    setSelectedTripDetails(null);
    setLoadingDetails(true);

    const selectedTrip = trips.find(
      (t: any) => t.id === tripId || t.tripCode === tripId,
    );

    setForm((prev) => ({
      ...prev,
      tripId,
      totalAmount: (selectedTrip as any)?.price ?? prev.totalAmount,
      pickupCity: "",
      roomType: "",
      trainClass: "",
      departureDate: "",
    }));

    try {
      const details = await tripsService.getById(tripId);
      if (details) {
        setSelectedTripDetails(details);

        const firstVariant =
          details.variants &&
          Array.isArray(details.variants) &&
          details.variants[0];
        const firstRoom =
          details.roomOptions &&
          Array.isArray(details.roomOptions) &&
          details.roomOptions[0];
        const firstTravel =
          details.travelOptions &&
          Array.isArray(details.travelOptions) &&
          details.travelOptions[0];
        const firstDate =
          details.availableDates &&
          Array.isArray(details.availableDates) &&
          details.availableDates[0];

        setForm((prev) => ({
          ...prev,
          pickupCity: firstVariant ? firstVariant.location : "",
          roomType: firstRoom ? firstRoom.label : "Double Sharing",
          trainClass: firstTravel ? firstTravel.label : "Sleeper",
          departureDate: firstDate ? String(firstDate) : "",
        }));
      }
    } catch (err) {
      console.error("Failed to load trip details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Unified location options combining variants and pickup cities
  const locationOptions = useMemo(() => {
    if (!selectedTripDetails) return [];
    const list: { name: string; price: number }[] = [];
    const seen = new Set<string>();
    const tripPrice = Number(selectedTripDetails.price || 0);

    if (Array.isArray(selectedTripDetails.variants)) {
      selectedTripDetails.variants.forEach((v: any) => {
        const name = (
          v.location ||
          v.cityName ||
          v.name ||
          v.variantName ||
          v.city ||
          ""
        ).trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const price =
            Number(v.discountedPrice) || Number(v.originalPrice) || tripPrice;
          list.push({ name, price });
        }
      });
    }

    if (Array.isArray(selectedTripDetails.pickupCities)) {
      selectedTripDetails.pickupCities.forEach((c: any) => {
        const name = (c.cityName || c.location || c.name || "").trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const deduction = Number(c.deductionAmount || 0);
          const price = Math.max(0, tripPrice - deduction);
          list.push({ name, price });
        }
      });
    }

    return list;
  }, [selectedTripDetails]);

  // Dynamic price calculation disabled so user can manually feed total fee
  /*
  useEffect(() => {
    if (!form.tripId) return;

    let basePrice = Number(selectedTripDetails?.price || 0);
    if (selectedTripDetails && form.pickupCity && locationOptions.length > 0) {
      const selectedLoc = locationOptions.find(loc => loc.name.toLowerCase() === form.pickupCity.trim().toLowerCase());
      if (selectedLoc) {
        basePrice = selectedLoc.price;
      }
    }

    let roomDelta = 0;
    if (form.roomType && selectedTripDetails?.roomOptions && Array.isArray(selectedTripDetails.roomOptions)) {
      const selectedRoom = selectedTripDetails.roomOptions.find((r: any) => r.label === form.roomType);
      roomDelta = selectedRoom ? Number(selectedRoom.priceDelta || 0) : 0;
    }

    let travelDelta = 0;
    if (form.trainClass && selectedTripDetails?.travelOptions && Array.isArray(selectedTripDetails.travelOptions)) {
      const selectedTravel = selectedTripDetails.travelOptions.find((t: any) => t.label === form.trainClass);
      travelDelta = selectedTravel ? Number(selectedTravel.priceDelta || 0) : 0;
    }

    const singlePersonPrice = basePrice + roomDelta + travelDelta;
    const qty = form.numberOfTravelers || 1;
    const baseAmount = singlePersonPrice * qty;
    const gstRate = (selectedTripDetails?.gstPercentage ?? 5) / 100;
    const gstAmount = computeGst(baseAmount, 0, gstRate);
    const totalAmount = baseAmount + gstAmount;

    setForm(prev => ({
      ...prev,
      baseAmount,
      gstAmount,
      totalAmount
    }));
  }, [form.tripId, form.pickupCity, form.roomType, form.trainClass, form.numberOfTravelers, selectedTripDetails, locationOptions]);
  */

  const handleSubmit = async () => {
    // Populate passengers list corresponding to the traveler count to inform the backend
    const passengers = Array.from(
      { length: Number(form.numberOfTravelers) || 1 },
      (_, i) => ({
        name:
          i === 0
            ? form.fullName
            : form.fullName
              ? `${form.fullName}'s Guest ${i}`
              : `Traveler ${i + 1}`,
        age: i === 0 ? Number(form.age) || 20 : 20,
        gender: i === 0 ? form.gender : "Male",
      }),
    );

    const advancePaid = Number(form.advancePaid || 0);
    const remainingAmount = Number(form.totalAmount || 0) - advancePaid;

    const payload = {
      ...form,
      name: form.fullName,
      phone: form.mobile,
      amount: Number(form.totalAmount),
      totalAmount: Number(form.totalAmount),
      remainingAmount,
      advancePaid,
      passengers,
    };

    console.log("📡 Sending booking:", payload);

    if (
      !payload.name ||
      !payload.phone ||
      !payload.tripId ||
      !payload.email ||
      !payload.departureDate
    ) {
      toast.error(
        "Required fields: Name, Phone, Trip, Email, and Departure Date",
      );
      return;
    }

    setSubmitting(true);
    try {
      if (booking?.id) {
        await bookingsService.update(booking.id, payload);
        toast.success("Booking updated successfully");
      } else {
        const response = await bookingsService.create(payload);
        console.log("✅ Booking Success:", response);
        toast.success("Booking created successfully");
      }
      onOpenChange(false);
      onSuccess?.();

      if (!booking) {
        setForm({
          fullName: "",
          mobile: "",
          tripId: "",
          age: 20,
          gender: "Male",
          trainClass: "",
          ticketStatus: "Not Booked",
          roomType: "",
          totalAmount: 0,
          advancePaid: 0,
          status: "confirmed",
          paymentStatus: "Pending",
          paymentMode: "UPI",
          notes: "",
          email: "",
          departureDate: "",
          pickupCity: "",
          numberOfTravelers: 1,
        });
        setSelectedTripDetails(null);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to save booking";
      console.error("❌ FULL ERROR:", error.response?.data || error);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          Balance Due
        </span>
        <span className="text-base font-bold text-[#FF4D00]">
          ₹{(form.totalAmount - (form.advancePaid || 0)).toLocaleString()}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="rounded-[4px] h-8.5 px-4 font-bold text-slate-600 border-slate-200 text-xs bg-white hover:bg-slate-50 shadow-xs"
        >
          Discard
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-primary-orange hover:bg-primary-orange/90 text-white font-bold text-xs h-8.5 px-6 rounded-[4px] shadow-sm transition-all active:scale-95"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {booking ? "Save Changes" : "Create Booking"}
        </Button>
      </div>
    </>
  );

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={booking ? "Edit Booking" : "Create Booking"}
      description={
        booking
          ? `Modify reservation: ${booking.bookingId}`
          : "Register a new booking reservation"
      }
      footer={footer}
    >
      <div className="space-y-6">
        {/* Customer Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="text-xs font-bold text-[#FF4D00] tracking-tight">
              Customer Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Full Name *
              </Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Primary guest name"
                className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Mobile Number *
              </Label>
              <div className="flex h-8.5 rounded-[4px] border border-slate-200 overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-[#FF4D00]/20 transition-all">
                <div className="w-10 h-full bg-slate-50 border-r border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500">
                  +91
                </div>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit number"
                  className="h-full border-none rounded-none flex-1 focus-visible:ring-0 shadow-none text-xs pl-3"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Email Address *
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
                className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                  Gender
                </Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                  Age
                </Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) =>
                    setForm({ ...form, age: parseInt(e.target.value) || 0 })
                  }
                  className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trip Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="text-xs font-bold text-[#FF4D00] tracking-tight">
              Expedition Logistics
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                  Select Trip *
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      isManualTrip: !form.isManualTrip,
                      tripId: "",
                    })
                  }
                  className="text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider hover:underline"
                >
                  {form.isManualTrip ? "Select from list" : "Manual Code"}
                </button>
              </div>
              {form.isManualTrip ? (
                <Input
                  value={form.tripId}
                  onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                  placeholder="e.g. MKA1"
                  className="font-bold uppercase tracking-wider h-8.5 rounded-[4px] border-slate-200 text-xs text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
                />
              ) : (
                <Select value={form.tripId} onValueChange={handleTripChange}>
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue
                      placeholder={loadingTrips ? "Loading..." : "Select trip"}
                    />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.title} (₹{trip.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Number of Travelers *
              </Label>
              <Input
                type="number"
                min="1"
                value={form.numberOfTravelers}
                onChange={(e) =>
                  setForm({
                    ...form,
                    numberOfTravelers: parseInt(e.target.value) || 1,
                  })
                }
                placeholder="Number of guests"
                className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Location Variant / Starting Point
              </Label>
              {locationOptions.length > 0 ? (
                <Select
                  value={form.pickupCity}
                  onValueChange={(val) => setForm({ ...form, pickupCity: val })}
                >
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue placeholder="Select location variant" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {locationOptions.map((loc: any, index: number) => (
                      <SelectItem key={index} value={loc.name}>
                        {loc.name} (₹{loc.price.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.pickupCity}
                  onChange={(e) =>
                    setForm({ ...form, pickupCity: e.target.value })
                  }
                  placeholder="e.g. Ahmedabad, Mumbai"
                  className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Departure Date *
              </Label>
              {selectedTripDetails?.availableDates &&
              Array.isArray(selectedTripDetails.availableDates) &&
              selectedTripDetails.availableDates.length > 0 ? (
                <Select
                  value={form.departureDate}
                  onValueChange={(val) =>
                    setForm({ ...form, departureDate: val })
                  }
                >
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue placeholder="Select departure date" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {selectedTripDetails.availableDates.map(
                      (d: any, index: number) => {
                        const dateVal = typeof d === "string" ? d : d.date;
                        return (
                          <SelectItem key={index} value={dateVal}>
                            {dateVal}
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="date"
                  value={form.departureDate}
                  onChange={(e) =>
                    setForm({ ...form, departureDate: e.target.value })
                  }
                  className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Room Type
              </Label>
              {selectedTripDetails?.roomOptions &&
              Array.isArray(selectedTripDetails.roomOptions) &&
              selectedTripDetails.roomOptions.length > 0 ? (
                <Select
                  value={form.roomType}
                  onValueChange={(val) => setForm({ ...form, roomType: val })}
                >
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue placeholder="Select room sharing type" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {selectedTripDetails.roomOptions.map(
                      (r: any, index: number) => (
                        <SelectItem key={index} value={r.label}>
                          {r.label} (
                          {r.priceDelta > 0
                            ? `+₹${r.priceDelta}`
                            : r.priceDelta < 0
                              ? `-₹${Math.abs(r.priceDelta)}`
                              : "No extra cost"}
                          )
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.roomType}
                  onChange={(e) =>
                    setForm({ ...form, roomType: e.target.value })
                  }
                  placeholder="e.g. Double Sharing"
                  className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Train Class / Travel Options
              </Label>
              {selectedTripDetails?.travelOptions &&
              Array.isArray(selectedTripDetails.travelOptions) &&
              selectedTripDetails.travelOptions.length > 0 ? (
                <Select
                  value={form.trainClass}
                  onValueChange={(val) => setForm({ ...form, trainClass: val })}
                >
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue placeholder="Select travel option" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {selectedTripDetails.travelOptions.map(
                      (t: any, index: number) => (
                        <SelectItem key={index} value={t.label}>
                          {t.label} (
                          {t.priceDelta > 0
                            ? `+₹${t.priceDelta}`
                            : t.priceDelta < 0
                              ? `-₹${Math.abs(t.priceDelta)}`
                              : "No extra cost"}
                          )
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={form.trainClass}
                  onValueChange={(v) => setForm({ ...form, trainClass: v })}
                >
                  <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Sleeper">Sleeper</SelectItem>
                    <SelectItem value="3AC">3AC</SelectItem>
                    <SelectItem value="Flight">Flight</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </section>

        {/* Financials */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-[#FF4D00]" />
            <h3 className="text-xs font-bold text-[#FF4D00] tracking-tight">
              Financial Details
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Total Fee (₹) *
              </Label>
              <Input
                type="number"
                value={form.totalAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    totalAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Advance Paid (₹)
              </Label>
              <Input
                type="number"
                value={form.advancePaid}
                onChange={(e) =>
                  setForm({
                    ...form,
                    advancePaid: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Payment Status
              </Label>
              <Select
                value={form.paymentStatus}
                onValueChange={(v: any) =>
                  setForm({ ...form, paymentStatus: v })
                }
              >
                <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial Payment</SelectItem>
                  <SelectItem value="Paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
                Payment Mode
              </Label>
              <Select
                value={form.paymentMode}
                onValueChange={(v: any) => setForm({ ...form, paymentMode: v })}
              >
                <SelectTrigger className="h-8.5 rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-650 tracking-tight">
            Internal Notes
          </Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Special requests or payment remarks..."
            className="min-h-[90px] rounded-[4px] border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus-visible:ring-[#FF4D00] p-3"
          />
        </section>
      </div>
    </AdminModal>
  );
}

