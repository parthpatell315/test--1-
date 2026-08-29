"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  Users,
  Bed,
  Train,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Info,
  Navigation,
  ShieldCheck,
  Star,
  Headset,
  Lock,
  Check,
  Sparkles,
  AlertTriangle,
  CreditCard,
  Building,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { API_BASE_URL, normalizeImageUrl } from "@/lib/api";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";

/** Shared selectable-card language (Route / Payment / traveler options). */
const choiceCardClass = (active: boolean, compact = false) =>
  cn(
    "relative w-full text-left border-2 transition-all rounded-xl",
    compact
      ? "px-2.5 py-2.5 min-h-[44px] flex items-center justify-center"
      : "p-3 min-h-[72px] flex flex-col justify-between gap-1.5",
    active
      ? "border-[#D4541A] bg-[#D4541A]/5 shadow-sm text-slate-900"
      : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300",
  );

// No fallback joining points. Strictly use API variants/pickupCities.

const parseTripDate = (dateStr?: string) => {
  if (!dateStr) {
    return {
      day: "Flexible",
      month: "DATE",
      weekday: "Flexible",
      fullDate: "Flexible Departure Date",
    };
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return {
        day: "?",
        month: "DATE",
        weekday: "Flexible",
        fullDate: dateStr,
      };
    }
    const shortMonths = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const fullMonths = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return {
      day: d.getDate().toString(),
      month: shortMonths[d.getMonth()],
      weekday: weekdays[d.getDay()],
      fullDate: `${weekdays[d.getDay()]}, ${d.getDate()} ${fullMonths[d.getMonth()]}`,
    };
  } catch (e) {
    return {
      day: "?",
      month: "DATE",
      weekday: "Flexible",
      fullDate: dateStr,
    };
  }
};

const travelerHasIdProof = (traveler: any) =>
  Boolean(traveler?.aadhaarUrl || traveler?.idProofUrl);

function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initial parameters parsed from URL
  const initialParams = useMemo(() => {
    try {
      const trip = searchParams.get("trip");
      const date = searchParams.get("date");
      const tid = searchParams.get("tid");
      const price = searchParams.get("price");
      const salesperson = searchParams.get("salesperson");
      const pickupCity = searchParams.get("pickupCity");
      const payMode = searchParams.get("payMode");
      const bookAmt = searchParams.get("bookAmt");
      const sourceBookingLinkId = searchParams.get("sourceBookingLinkId");
      const sourceBookingLinkPayload = searchParams.get(
        "sourceBookingLinkPayload",
      );
      const sourceBookingLinkSignature = searchParams.get(
        "sourceBookingLinkSignature",
      );
      const customerName = searchParams.get("customerName");
      const customerPhone = searchParams.get("customerPhone");
      const customerEmail = searchParams.get("customerEmail");
      const travelerCount = searchParams.get("travelerCount");
      const customTime = searchParams.get("customTime");
      const headerTitle = searchParams.get("headerTitle");
      const headerSubtitle = searchParams.get("headerSubtitle");

      const sanitize = (val: string | null) =>
        val ? decodeURIComponent(val.replace(/\+/g, " ")).trim() : "";

      return {
        tripName: sanitize(trip),
        date: sanitize(date),
        tripId: sanitize(tid),
        salesPersonName: sanitize(salesperson) || "Direct",
        pickupCity: sanitize(pickupCity),
        payMode: sanitize(payMode),
        bookAmt: bookAmt
          ? Number.isFinite(parseFloat(bookAmt))
            ? parseFloat(bookAmt)
            : null
          : null,
        sourceBookingLinkId: sanitize(sourceBookingLinkId),
        sourceBookingLinkPayload: sanitize(sourceBookingLinkPayload),
        sourceBookingLinkSignature: sanitize(sourceBookingLinkSignature),
        customerName: sanitize(customerName),
        customerPhone: sanitize(customerPhone),
        customerEmail: sanitize(customerEmail),
        travelerCount: travelerCount ? parseInt(travelerCount, 10) : null,
        customTime: sanitize(customTime),
        headerTitle: sanitize(headerTitle),
        headerSubtitle: sanitize(headerSubtitle),
        basePrice: price ? parseInt(price) : 0,
      };
    } catch (e) {
      console.error("Failed to parse URL parameters:", e);
      return {
        tripName: "",
        date: "",
        tripId: "",
        salesPersonName: "Direct",
        pickupCity: "",
        payMode: "",
        bookAmt: null,
        sourceBookingLinkId: "",
        sourceBookingLinkPayload: "",
        sourceBookingLinkSignature: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        travelerCount: null,
        customTime: "",
        headerTitle: "",
        headerSubtitle: "",
        basePrice: 0,
      };
    }
  }, [searchParams]);

  // States
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dataFetching, setDataFetching] = useState(true);
  const [error, setError] = useState("");
  const [tripData, setTripData] = useState<any>(null);
  const [basePrice, setBasePrice] = useState(initialParams.basePrice || 13999);
  const [travelerAutoFilled, setTravelerAutoFilled] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  // Dynamic joining points loaded from tripData or fallback
  const joiningPoints = useMemo(() => {
    const baselinePrice = tripData?.price || basePrice || 13999;
    const pointsList: any[] = [];
    const seenCities = new Set<string>();

    const addPoint = (
      cityName: string,
      price: number,
      deduction: number,
      skipDays: number,
      pickupPoint: string,
    ) => {
      const trimmedCity = (cityName || "").trim();
      if (!trimmedCity || seenCities.has(trimmedCity.toLowerCase())) return;
      seenCities.add(trimmedCity.toLowerCase());
      pointsList.push({
        cityName: trimmedCity,
        deductionAmount: deduction,
        skipDays,
        pickupPoint,
        price,
      });
    };

    // 1. Location Variants
    if (tripData?.variants && Array.isArray(tripData.variants)) {
      tripData.variants.forEach((v: any) => {
        const cName =
          v.cityName || v.location || v.name || v.variantName || v.city;
        if (cName) {
          const variantPrice =
            Number(v.discountedPrice) || Number(v.originalPrice) || 0;
          const deduction = Math.max(0, baselinePrice - variantPrice);
          const pPoint =
            v.pickupPoint ||
            v.landmark ||
            v.station ||
            v.address ||
            (v.duration && !v.duration.includes("Day")
              ? v.duration
              : "Assigned Landmark");
          addPoint(
            cName,
            variantPrice > 0 ? variantPrice : baselinePrice,
            deduction,
            Number(v.skipDays) || 0,
            pPoint,
          );
        }
      });
    }

    // 2. Pickup Cities
    if (tripData?.pickupCities && Array.isArray(tripData.pickupCities)) {
      tripData.pickupCities.forEach((c: any) => {
        const cName = c.cityName || c.location || c.name;
        if (cName) {
          const deduction = Number(c.deductionAmount) || 0;
          const price = Math.max(0, baselinePrice - deduction);
          const pPoint =
            c.pickupPoint || c.landmark || c.station || "Assigned Landmark";
          addPoint(cName, price, deduction, Number(c.skipDays) || 0, pPoint);
        }
      });
    }

    return pointsList;
  }, [tripData, basePrice]);
  const [selectedCity, setSelectedCity] = useState<any>(null);

  // Keep selectedCity synced once joiningPoints are resolved, matching the url price param or localStorage if applicable
  useEffect(() => {
    if (joiningPoints.length > 0) {
      const normalize = (s: string) =>
        (s || "").toLowerCase().replace(/\s+/g, " ").trim();

      // 1. Primary Source of Truth: If token/link prefilled a pickup city in URL, use it as top priority
      if (initialParams.pickupCity) {
        const target = normalize(initialParams.pickupCity);
        const matched = joiningPoints.find((j: any) => {
          const cName = normalize(j.cityName);
          return (
            cName === target || cName.includes(target) || target.includes(cName)
          );
        });
        if (matched) {
          setSelectedCity(matched);
          return;
        }
      }

      // 2. Secondary Source: Check localStorage for previous user session preference
      const tripId = tripData?.id || initialParams.tripId || "default";
      const storageKey = `selected_joining_point_${tripId}`;
      const persistedCityName = localStorage.getItem(storageKey);

      if (persistedCityName) {
        const target = normalize(persistedCityName);
        const matched = joiningPoints.find((j: any) => {
          const cName = normalize(j.cityName);
          return (
            cName === target || cName.includes(target) || target.includes(cName)
          );
        });
        if (matched) {
          setSelectedCity(matched);
          return;
        }
      }

      // 3. Tertiary Source: Match by base price variant index
      if (
        initialParams.basePrice &&
        tripData?.variants &&
        Array.isArray(tripData.variants)
      ) {
        const matchingVariantIdx = tripData.variants.findIndex(
          (v: any) => v.discountedPrice === initialParams.basePrice,
        );
        if (
          matchingVariantIdx !== -1 &&
          matchingVariantIdx < joiningPoints.length &&
          joiningPoints[matchingVariantIdx]
        ) {
          setSelectedCity(joiningPoints[matchingVariantIdx]);
          return;
        }
      }
      setSelectedCity(joiningPoints[0]);
    }
  }, [
    joiningPoints,
    initialParams.basePrice,
    initialParams.pickupCity,
    tripData,
  ]);

  const [paymentMode, setPaymentMode] = useState<
    "Full Payment" | "Partial Payment"
  >("Full Payment");
  const [customDepositPerPax, setCustomDepositPerPax] = useState<number | null>(
    initialParams.bookAmt,
  );

  // Prefill payment mode + custom deposit from tokenized booking link
  useEffect(() => {
    if (initialParams.payMode === "Partial Payment")
      setPaymentMode("Partial Payment");
    else if (initialParams.payMode === "Full Payment")
      setPaymentMode("Full Payment");
  }, [initialParams.payMode]);

  useEffect(() => {
    if (
      initialParams.bookAmt !== null &&
      initialParams.bookAmt !== undefined &&
      initialParams.bookAmt > 0
    ) {
      setCustomDepositPerPax(initialParams.bookAmt);
    } else {
      setCustomDepositPerPax(null);
    }
  }, [initialParams.bookAmt]);

  // Checkboxes
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);

  // Unified booking state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    cityState: "",
    specialRequests: "",
    participants: 1,
    participantsList: [
      {
        name: "",
        phone: "",
        email: "",
        age: "",
        gender: "Male",
        roomSharing: "Quad Sharing",
        trainOption: "Sleeper",
        foodPreference: "Normal Food",
      },
    ],
  });

  // Fetch Trip information
  useEffect(() => {
    const fetchTrip = async () => {
      setDataFetching(true);
      setError("");
      try {
        let foundTrip = null;
        const targetIdentifier = initialParams.tripId || initialParams.tripName;

        if (targetIdentifier) {
          try {
            const res = await fetch(
              `${API_BASE_URL}/trips/public/lookup/${encodeURIComponent(targetIdentifier)}`,
            );
            const json = await res.json();
            if (json.success && json.data) {
              foundTrip = json.data;
            }
          } catch (_err) {}
        }

        if (!foundTrip && initialParams.tripName) {
          const res = await fetch(`${API_BASE_URL}/trips/public/cards`);
          const json = await res.json();
          if (json.success && json.data.length > 0) {
            const normalize = (str: string) =>
              (str || "")
                .toLowerCase()
                .replace(/[\u2013\u2014-]/g, "-")
                .replace(/[^a-z0-9]/g, "")
                .trim();

            const targetNormalized = normalize(initialParams.tripName);
            const matched =
              json.data.find(
                (t: any) =>
                  normalize(t.title) === targetNormalized ||
                  normalize(t.slug) === targetNormalized,
              ) ||
              json.data.find(
                (t: any) =>
                  normalize(t.title).includes(targetNormalized) ||
                  targetNormalized.includes(normalize(t.title)),
              );
            if (matched && matched.id) {
              // Re-fetch full detail via public lookup
              try {
                const detailRes = await fetch(
                  `${API_BASE_URL}/trips/public/lookup/${matched.id}`,
                );
                const detailJson = await detailRes.json();
                if (detailJson.success && detailJson.data) {
                  foundTrip = detailJson.data;
                }
              } catch (_e) {
                foundTrip = matched;
              }
            }
          }
        }

        if (foundTrip) {
          setTripData(foundTrip);
          // Always use the master trip price as the baseline basePrice so that the variant deductions are calculated correctly from the baseline
          const baseline =
            foundTrip.price ||
            (foundTrip.variants && foundTrip.variants.length > 0
              ? Math.max(
                  ...foundTrip.variants.map((v: any) => v.discountedPrice || 0),
                )
              : 13999);
          setBasePrice(baseline);
        }
      } catch (err) {
        console.warn("Could not fetch live trip info, using fallback data.");
      } finally {
        setDataFetching(false);
      }
    };
    fetchTrip();
  }, [initialParams.tripId, initialParams.tripName, initialParams.basePrice]);

  // Adjust passengers list size dynamically
  const syncParticipantsCount = (count: number) => {
    const defaultRoomSharing =
      count === 2
        ? "Double Sharing"
        : count >= 3
          ? "Triple Sharing"
          : "Quad Sharing";
    let list = [...formData.participantsList];

    // Auto-update room sharing for all members in the booking
    list = list.map((item) => ({
      ...item,
      roomSharing: defaultRoomSharing,
    }));

    if (list.length < count) {
      for (let i = list.length; i < count; i++) {
        list.push({
          name: "",
          phone: "",
          email: "",
          age: "",
          gender: "Male",
          roomSharing: defaultRoomSharing,
          trainOption: "Sleeper",
          foodPreference: "Normal Food",
        });
      }
    } else if (list.length > count) {
      list.splice(count);
    }
    setFormData((prev) => ({
      ...prev,
      participants: count,
      participantsList: list,
    }));
  };

  const handleParticipantChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    setFormData((prev) => {
      const list = [...(prev.participantsList || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, participantsList: list };
    });

    // Disable future auto-fill if Traveler 1 is edited manually
    if (index === 0 && (field === "name" || field === "phone")) {
      setTravelerAutoFilled(true);
    }
  };

  const [uploadingAadhaarIndex, setUploadingAadhaarIndex] = useState<number | null>(null);

  const handleAadhaarUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAadhaarIndex(index);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);

      const res = await fetch(`${API_BASE_URL}/upload/public-doc`, {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setFormData((prev) => {
          const list = [...(prev.participantsList || [])] as any[];
          list[index] = {
            ...list[index],
            aadhaarUrl: data.url,
            idProofUrl: data.url,
            aadhaarFileName: file.name,
          };
          return { ...prev, participantsList: list };
        });
      } else {
        alert("Failed to upload document: " + (data.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Aadhaar upload error:", err);
      alert("Document upload failed. Please try again.");
    } finally {
      setUploadingAadhaarIndex(null);
    }
  };

  const handleRemoveAadhaar = (index: number) => {
    const list = [...formData.participantsList] as any[];
    delete list[index].aadhaarUrl;
    delete list[index].idProofUrl;
    delete list[index].aadhaarFileName;
    setFormData((prev) => ({ ...prev, participantsList: list }));
  };

  // Check if selected variant is Direct Join / Excludes travel options
  const isDirectJoin = useMemo(() => {
    if (!tripData?.variants || !Array.isArray(tripData.variants)) return false;
    const selectedVariant = tripData.variants.find(
      (v: any) => v.location === selectedCity?.cityName,
    );
    return selectedVariant?.excludeTravel === true;
  }, [tripData, selectedCity]);

  // Pricing calculations
  const pricing = useMemo(() => {
    let originalTotalBase = 0;

    formData.participantsList.forEach((p) => {
      let travelerPrice = selectedCity?.price ?? basePrice;

      // Train options adjustment
      if (!isDirectJoin) {
        const trainOptions =
          tripData?.travelOptions?.length > 0 ? tripData.travelOptions : [];
        const selectedTrainOpt = trainOptions.find(
          (opt: any) => opt.label === p.trainOption,
        );
        if (selectedTrainOpt) {
          travelerPrice += Number(selectedTrainOpt.priceDelta) || 0;
        }
      }

      // Room sharing options adjustment
      const roomOptions =
        tripData?.roomOptions?.length > 0 ? tripData.roomOptions : [];
      const selectedRoomOpt = roomOptions.find(
        (opt: any) => opt.label === p.roomSharing,
      );
      if (selectedRoomOpt) {
        travelerPrice += Number(selectedRoomOpt.priceDelta) || 0;
      }

      originalTotalBase += travelerPrice;
    });

    const netBase = originalTotalBase;

    // Partial payment details: configurable deposit per traveler (defaults to 2000)
    const depositPerPax =
      customDepositPerPax && customDepositPerPax > 0
        ? customDepositPerPax
        : 2000;
    const partialBaseAmount = depositPerPax * formData.participants;

    // GST Calculation — use trip-configured GST rate, fallback to 5%
    const gstRate = (tripData?.gstPercentage ?? 5) / 100;

    let gstAmount = 0;
    let depositGst = 0;
    let finalTotal = 0;
    let advancePaid = 0;
    let remainingBalance = 0;

    // Full-package GST (used for total trip cost and remaining balance)
    const fullPackageGst = Math.round(netBase * gstRate);
    const fullPackageTotal = Math.round(netBase + fullPackageGst);

    if (paymentMode === "Full Payment") {
      gstAmount = fullPackageGst;
      depositGst = fullPackageGst;
      finalTotal = fullPackageTotal;
      advancePaid = finalTotal;
      remainingBalance = 0;
    } else {
      // Partial Payment
      // depositGst = GST on the deposit amount only (e.g. deposit ₹5,000 → GST ₹250 → pay ₹5,250)
      // gstAmount = full package GST (total tax liability for the trip)
      depositGst = Math.round(partialBaseAmount * gstRate);
      gstAmount = fullPackageGst;
      finalTotal = Math.round(partialBaseAmount + depositGst);
      advancePaid = finalTotal;
      remainingBalance = Math.round(fullPackageTotal - finalTotal);
    }

    return {
      originalTotalBase,
      netBase: Math.round(netBase),
      partialBaseAmount: Math.round(partialBaseAmount),
      gstAmount,
      depositGst,
      gstDiscount: 0,
      finalTotal,
      advancePaid,
      remainingBalance,
      fullPackageGst,
      fullPackageTotal,
      totalAmount: fullPackageTotal,
    };
  }, [
    basePrice,
    selectedCity,
    formData.participants,
    formData.participantsList,
    paymentMode,
    customDepositPerPax,
    tripData,
    isDirectJoin,
  ]);

  // Step-by-Step validation
  const validateStep = () => {
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (currentStep === 1) {
      if (!formData.name.trim()) return "Lead Traveler Name is required";
      if (!formData.phone.trim()) return "Mobile number is required";
      if (formData.phone.replace(/\D/g, "").length !== 10)
        return "WhatsApp number must be a valid 10-digit number";
      if (!formData.cityState.trim()) return "City/State is required";
      if (
        formData.email &&
        formData.email.trim() !== "" &&
        !emailRegex.test(formData.email.trim())
      ) {
        return "Please enter a valid email address";
      }
    } else if (currentStep === 2) {
      if (!selectedCity) return "Please select a joining point";
      for (let i = 0; i < formData.participantsList.length; i++) {
        const traveler = formData.participantsList[i];
        if (!traveler.name.trim())
          return `Name is required for Traveler ${i + 1}`;
        if (!traveler.phone.trim())
          return `Mobile is required for Traveler ${i + 1}`;
        if (traveler.phone.replace(/\D/g, "").length !== 10)
          return `Traveler ${i + 1} mobile number must be 10 digits`;
        if (!traveler.age.trim())
          return `Age is required for Traveler ${i + 1}`;
        const ageNum = parseInt(traveler.age.trim(), 10);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          return `Please enter a valid age between 1 and 120 for Traveler ${i + 1}`;
        }
        if (!travelerHasIdProof(traveler)) {
          return `Aadhaar / Govt ID proof is required for Traveler ${i + 1}`;
        }
        if (
          traveler.email &&
          traveler.email.trim() !== "" &&
          !emailRegex.test(traveler.email.trim())
        ) {
          return `Please enter a valid email address for Traveler ${i + 1}`;
        }
      }
    } else if (currentStep === 4) {
      if (!acceptTerms)
        return "You must accept the Terms and Conditions to continue";
    }
    return "";
  };

  const handleNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    // Auto-fill Traveler 1 with Lead Contact details on first step transition
    if (currentStep === 1 && !travelerAutoFilled) {
      const list = [...formData.participantsList];
      if (list[0]) {
        if (!list[0].name.trim()) list[0].name = formData.name;
        if (!list[0].phone.trim()) list[0].phone = formData.phone;
        setFormData((prev) => ({ ...prev, participantsList: list }));
      }
      setTravelerAutoFilled(true);
    }

    setCurrentStep((prev) => prev + 1);
    setTimeout(() => {
      const container = document.getElementById("booking-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const handlePrev = () => {
    setError("");
    setCurrentStep((prev) => prev - 1);
    setTimeout(() => {
      const container = document.getElementById("booking-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    }, 50);
  };

  // Submit Final Booking Data to /api/bookings/create
  const handleFinalSubmit = async () => {
    const valError = validateStep();
    if (valError) {
      setError(valError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmail =
        formData.email &&
        formData.email.trim() &&
        emailRegex.test(formData.email.trim())
          ? formData.email.trim()
          : null;
      const validDate =
        initialParams.date && !isNaN(Date.parse(initialParams.date))
          ? new Date(initialParams.date).toISOString()
          : null;

      const payload = {
        fullName: formData.name,
        name: formData.name,
        mobile: formData.phone,
        phone: formData.phone,
        email: validEmail,
        age: parseInt(formData.participantsList[0]?.age) || null,
        gender: formData.participantsList[0]?.gender || null,
        numberOfTravelers: formData.participants,
        tripId: tripData?.id || initialParams.tripId || "manual",
        tripName: initialParams.tripName || tripData?.title || "Expedition",
        departureDate: validDate,
        sourceBookingLinkId: initialParams.sourceBookingLinkId || null,
        sourceBookingLinkPayload:
          initialParams.sourceBookingLinkPayload || null,
        sourceBookingLinkSignature:
          initialParams.sourceBookingLinkSignature || null,
        pickupCity: selectedCity?.cityName
          ? `${selectedCity.cityName}${selectedCity.pickupPoint ? ` (${selectedCity.pickupPoint})` : ""}`
          : initialParams.pickupCity || "Delhi",
        skipDays: selectedCity?.skipDays || 0,
        adjustedPrice:
          selectedCity?.price ??
          pricing.originalTotalBase / formData.participants,
        baseAmount: pricing.netBase,
        amount: pricing.totalAmount,
        totalAmount: pricing.totalAmount,
        advancePaid: pricing.advancePaid,
        remainingAmount: pricing.remainingBalance,
        status: "pending",
        paymentStatus: paymentMode === "Full Payment" ? "Paid" : "Partial",
        paymentMode: "UPI",
        specialRequests: formData.specialRequests || "",
        notes: formData.specialRequests
          ? `${formData.specialRequests} (City/State: ${formData.cityState})`
          : `City/State: ${formData.cityState}`,
        passengers: formData.participantsList.map((p: any) => ({
          name: p.name,
          phone: p.phone,
          email:
            p.email && p.email.trim() && emailRegex.test(p.email.trim())
              ? p.email.trim()
              : null,
          age: parseInt(p.age) || null,
          gender: p.gender,
          roomSharing: p.roomSharing,
          trainOption: p.trainOption,
          foodPreference: p.foodPreference || "Normal Food",
          idProof: p.aadhaarUrl || p.idProofUrl || null,
          idProofUrl: p.aadhaarUrl || p.idProofUrl || null,
          aadhaarUrl: p.aadhaarUrl || p.idProofUrl || null,
          aadhaar: p.aadhaarUrl || p.idProofUrl || null,
        })),
        trainClass: formData.participantsList[0]?.trainOption || "Sleeper",
        roomType: formData.participantsList[0]?.roomSharing || "Triple Sharing",
        ticketStatus: "Not Booked",
        basePrice: basePrice,
        gstAmount: pricing.gstAmount,
        depositGst: pricing.depositGst,
      };

      const res = await fetch(`${API_BASE_URL}/bookings/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const bId =
        data?.data?.bookingId ||
        data?.data?.id ||
        data?.data?._id ||
        "YC-SUCCESS";
      if (res.ok || data.success) {
        router.push(
          `/book/confirmation?bookingId=${bId}&tripName=${encodeURIComponent(initialParams.tripName || "")}&date=${encodeURIComponent(initialParams.date || "")}&city=${encodeURIComponent(selectedCity?.cityName || "Delhi")}&name=${encodeURIComponent(formData.name || "")}`,
        );
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const detailMsgs = data.errors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join(", ");
          setError(`Validation failed: ${detailMsgs}`);
        } else {
          setError(
            data.message ||
              "Submission failed. Please check your data and try again.",
          );
        }
      }
    } catch (err) {
      setError(
        "Our servers are temporarily unavailable. Please try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  };

  const parsedDate = useMemo(
    () => parseTripDate(initialParams.date),
    [initialParams.date],
  );

  const renderSummaryCard = (isCard = true) => {
    const displayCityName = selectedCity?.cityName
      ? `${selectedCity.cityName}${selectedCity.pickupPoint ? ` (${selectedCity.pickupPoint})` : ""}`
      : initialParams.pickupCity || "Delhi";

    const content = (
      <div className="p-3.5 sm:p-4 space-y-3 bg-white font-montserrat">
        {/* Sleek Header Banner */}
        <div className="bg-[#0B1528] rounded-xl p-3 text-white space-y-0.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#D4541A] bg-white/10 px-2 py-0.5 rounded-full">
              Your trip
            </span>
            <span className="text-[9px] font-extrabold text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
              {formData.participants} Pax
            </span>
          </div>
          <h3 className="font-caveat font-bold text-[22px] sm:text-[24px] leading-none text-white pt-0.5">
            {initialParams.tripName || "Trip Checkout"}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl space-y-0.5">
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Departure
            </span>
            <p className="text-xs font-black text-slate-900 leading-tight truncate">
              {parsedDate.fullDate !== "Flexible Departure Date"
                ? parsedDate.fullDate
                : initialParams.date || "Flexible"}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl space-y-0.5">
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Base package
            </span>
            <p className="text-xs font-black text-slate-900 font-mono leading-tight">
              ₹{pricing.originalTotalBase.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-2.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700 gap-2 min-w-0">
            <span className="font-extrabold shrink-0 text-[8px] uppercase tracking-widest text-slate-400">
              Joining
            </span>
            <span className="font-extrabold text-slate-900 capitalize text-right break-words max-w-[65%] leading-tight">
              {displayCityName}
            </span>
          </div>

          {/* Traveler Option Adjustments */}
          {formData.participantsList.some(
            (t) =>
              t.roomSharing !== "Triple Sharing" ||
              (!isDirectJoin && t.trainOption !== "Sleeper"),
          ) && (
            <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#D4541A] block mb-1">
                Upgrades
              </span>
              {formData.participantsList.map((t, i) => {
                const trainOpts =
                  tripData?.travelOptions?.length > 0
                    ? tripData.travelOptions
                    : [];
                const roomOpts =
                  tripData?.roomOptions?.length > 0 ? tripData.roomOptions : [];

                const trainDelta = isDirectJoin
                  ? 0
                  : trainOpts.find((o: any) => o.label === t.trainOption)
                      ?.priceDelta || 0;
                const roomDelta =
                  roomOpts.find((o: any) => o.label === t.roomSharing)
                    ?.priceDelta || 0;
                if (trainDelta === 0 && roomDelta === 0) return null;
                return (
                  <div
                    key={i}
                    className="text-[9px] bg-white border border-slate-200/70 rounded-lg p-2 space-y-0.5"
                  >
                    <span className="font-extrabold text-slate-800 block">
                      Traveler {i + 1} ({t.name || "Pax"})
                    </span>
                    {roomDelta !== 0 && (
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>{t.roomSharing}</span>
                        <span
                          className={
                            roomDelta > 0
                              ? "text-slate-900 font-bold"
                              : "text-emerald-600 font-bold"
                          }
                        >
                          {roomDelta > 0 ? "+" : ""}₹
                          {roomDelta.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {!isDirectJoin && trainDelta !== 0 && (
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>{t.trainOption}</span>
                        <span
                          className={
                            trainDelta > 0
                              ? "text-slate-900 font-bold"
                              : "text-emerald-600 font-bold"
                          }
                        >
                          {trainDelta > 0 ? "+" : ""}₹
                          {trainDelta.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-slate-700 gap-2 min-w-0 pt-1 border-t border-slate-200/60">
            <span className="font-extrabold shrink-0 text-[8px] uppercase tracking-widest text-slate-400">
              GST @ {tripData?.gstPercentage ?? 5}%
            </span>
            <span className="font-extrabold text-slate-900 shrink-0">
              + ₹{pricing.fullPackageGst.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="bg-gradient-to-br from-[#D4541A] to-[#FF8A00] p-3.5 rounded-2xl flex flex-col justify-between text-white shadow-md shadow-[#D4541A]/15">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-90 block">
                Total (pay now)
              </span>
              <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">
                Inc. GST
              </span>
            </div>
            <div className="mt-0.5">
              <span className="text-2xl font-black tracking-tight">
                ₹{pricing.finalTotal.toLocaleString()}
              </span>
            </div>
            <p className="text-[9px] font-bold opacity-90 mt-1 pt-1 border-t border-white/20">
              ₹
              {(pricing.finalTotal - pricing.depositGst).toLocaleString()} + GST
              ₹{pricing.depositGst.toLocaleString()}
            </p>
          </div>

          {paymentMode === "Partial Payment" && (
            <div className="flex justify-between items-center bg-rose-50/80 border border-rose-200/70 rounded-xl px-3 py-2 text-xs">
              <span className="flex items-center font-extrabold text-[8px] uppercase tracking-widest text-rose-700">
                Remaining
              </span>
              <span className="font-black text-rose-800 text-xs font-mono">
                ₹{pricing.remainingBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );

    if (isCard) {
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          {content}
        </div>
      );
    }
    return content;
  };

  const allTravelersHaveIdProof = formData.participantsList.every(
    travelerHasIdProof,
  );
  const isAadhaarBlockingContinue =
    currentStep === 2 &&
    (!allTravelersHaveIdProof || uploadingAadhaarIndex !== null);

  const joiningLabel = selectedCity?.cityName
    ? `${selectedCity.cityName}${selectedCity.pickupPoint ? ` (${selectedCity.pickupPoint})` : ""}`
    : initialParams.pickupCity || tripData?.location || "Delhi";

  const mapsQuery = selectedCity?.cityName
    ? `${selectedCity.cityName} ${selectedCity.pickupPoint || ""}`
    : initialParams.pickupCity || tripData?.location || "Delhi";

  return (
    <div className="bg-[#F3F1EE] min-h-screen text-slate-900 pb-32 lg:pb-10 pt-[72px] md:pt-[80px] font-montserrat">
      <div
        className="max-w-[1180px] mx-auto px-3 sm:px-4 md:px-5 py-3 sm:py-4"
        id="booking-form-container"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
          {/* Left Area: Compact trip strip + form */}
          <div className="lg:col-span-8 space-y-3">
            {/* Single trip context strip (replaces banner + summary bar) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-stretch gap-0 min-h-[72px] sm:min-h-[88px]">
                <div className="relative w-[72px] sm:w-[96px] shrink-0 bg-slate-200 self-stretch">
                  {tripData?.images?.[0] ? (
                    <OptimizedImage
                      src={normalizeImageUrl(tripData.images[0])}
                      alt={initialParams.tripName}
                      className="absolute inset-0 w-full h-full object-cover"
                      cloudinaryWidth={200}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0B1528] to-slate-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0 p-3 sm:p-3.5 flex flex-col justify-center gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#D4541A]">
                        YouthCamping
                      </p>
                      <h1 className="font-caveat font-bold text-[22px] sm:text-[26px] leading-none text-[#0B1528] truncate">
                        {initialParams.tripName || "Adventure Expedition"}
                      </h1>
                    </div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="shrink-0 flex items-center gap-0.5 text-slate-500 hover:text-slate-800 font-bold text-[10px] uppercase tracking-wider"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span className="inline-flex flex-col items-center justify-center w-7 h-7 rounded-md bg-[#D4541A] text-white leading-none shrink-0">
                        <span className="text-[6px] font-bold uppercase tracking-wide">
                          {parsedDate.month}
                        </span>
                        <span className="text-[10px] font-black">
                          {parsedDate.day}
                        </span>
                      </span>
                      <span className="font-bold text-slate-800 truncate">
                        {parsedDate.fullDate}
                      </span>
                    </span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-[#D4541A] shrink-0" />
                      <span className="capitalize truncate font-bold text-slate-800">
                        {joiningLabel}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact 4-step progress (matches real flow) */}
            <div className="bg-white/80 border border-slate-200/80 rounded-xl px-2.5 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              {[
                {
                  key: 1,
                  label: "Contact",
                  active: currentStep >= 1,
                  completed: currentStep > 1,
                },
                {
                  key: 2,
                  label: "Travelers",
                  active: currentStep >= 2,
                  completed: currentStep > 2,
                },
                {
                  key: 3,
                  label: "Payment",
                  active: currentStep >= 3,
                  completed: currentStep > 3,
                },
                {
                  key: 4,
                  label: "Review",
                  active: currentStep >= 4,
                  completed: currentStep > 4,
                },
              ].map((item, idx, arr) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1 shrink-0"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all",
                      item.active
                        ? "bg-[#D4541A] text-white"
                        : "bg-slate-100 text-slate-400 border border-slate-200",
                    )}
                  >
                    {item.completed ? (
                      <Check size={10} strokeWidth={3} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] uppercase font-bold tracking-wider",
                      item.active ? "text-slate-900" : "text-slate-400",
                    )}
                  >
                    {item.label}
                  </span>
                  {idx < arr.length - 1 && (
                    <span className="text-slate-300 text-[10px] select-none px-0.5">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Collapsible Booking Summary */}
            <div className="lg:hidden bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between font-extrabold text-[10px] text-slate-800 uppercase tracking-widest bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  Price summary
                  <span className="bg-orange-100 text-[#D4541A] px-2 py-0.5 rounded-full text-[9px] lowercase font-extrabold">
                    {formData.participants} pax
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    <span className="text-[#D4541A] font-mono text-xs font-black block">
                      ₹{pricing.finalTotal.toLocaleString()}
                    </span>
                    {paymentMode === "Partial Payment" && (
                      <span className="text-[9px] text-slate-400 font-semibold block -mt-0.5">
                        Total ₹{pricing.fullPackageTotal.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200 text-slate-400",
                      isMobileSummaryOpen && "rotate-180",
                    )}
                  />
                </div>
              </button>
              {isMobileSummaryOpen && (
                <div className="border-t border-slate-100 bg-white">
                  {renderSummaryCard(false)}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="space-y-3"
                >
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                    <div className="border-b border-slate-100 pb-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A]">
                        Step 1 of 4
                      </p>
                      <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                        Lead contact{" "}
                        <span className="font-caveat font-bold text-[#D4541A] text-xl sm:text-2xl">
                          details
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Primary booking supervisor
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="relative group">
                        <User
                          size={15}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4541A] transition-colors"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Full Name *"
                          className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5 outline-none transition-all"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div className="relative group">
                          <Phone
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4541A] transition-colors"
                          />
                          <input
                            type="tel"
                            required
                            placeholder="WhatsApp Number *"
                            className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5 outline-none transition-all"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="relative group">
                          <Mail
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4541A] transition-colors"
                          />
                          <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5 outline-none transition-all"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <Building
                          size={15}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4541A] transition-colors"
                        />
                        <input
                          type="text"
                          required
                          placeholder="City/State *"
                          className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5 outline-none transition-all"
                          value={formData.cityState}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cityState: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="space-y-3"
                >
                  {/* Joining Point Selection */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                    <div className="border-b border-slate-100 pb-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A]">
                        Step 2 of 4 · Route
                      </p>
                      <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                        {tripData?.bookingFormLabels?.joiningPoint ||
                          "Joining Point"}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Select where you want to meet us
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {joiningPoints.map((city: any) => {
                        const active = selectedCity?.cityName === city.cityName;
                        return (
                          <button
                            key={city.cityName}
                            type="button"
                            onClick={() => {
                              setSelectedCity(city);
                              const tripId =
                                tripData?.id ||
                                initialParams.tripId ||
                                "default";
                              localStorage.setItem(
                                `selected_joining_point_${tripId}`,
                                city.cityName,
                              );
                            }}
                            className={choiceCardClass(active)}
                          >
                            <div className="flex justify-between w-full items-start gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold capitalize text-slate-800 whitespace-normal break-words">
                                  {city.cityName}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium capitalize tracking-wide mt-0.5 whitespace-normal break-words leading-snug">
                                  {city.pickupPoint}
                                </p>
                              </div>
                              {active && (
                                <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4541A] flex items-center justify-center mt-0.5">
                                  <Check
                                    size={11}
                                    strokeWidth={3}
                                    className="text-white"
                                  />
                                </span>
                              )}
                            </div>
                            {city.price !== undefined && (
                              <div className="mt-auto pt-2 border-t border-slate-100/80 w-full flex justify-between items-center text-[10px]">
                                <span className="uppercase tracking-wider text-slate-400 font-bold">
                                  Package Price
                                </span>
                                <span className="font-extrabold text-slate-800 font-mono">
                                  ₹{city.price.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Travelers Manifest Inputs */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                    <div className="border-b border-slate-100 pb-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A]">
                        Manifest
                      </p>
                      <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                        Traveler{" "}
                        <span className="font-caveat font-bold text-[#D4541A] text-xl">
                          details
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {tripData?.bookingFormLabels?.travelersDescription ||
                          "Fill info for all tour members — ID proof required"}
                      </p>
                    </div>

                    {/* Quick Traveler Count Select */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                        Number of Travelers
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const active = formData.participants === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => syncParticipantsCount(n)}
                              className={choiceCardClass(active, true)}
                            >
                              {active && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4541A] flex items-center justify-center">
                                  <Check
                                    size={9}
                                    strokeWidth={3}
                                    className="text-white"
                                  />
                                </span>
                              )}
                              <span className="flex flex-col items-center justify-center gap-0.5 pr-1">
                                <span className="text-base font-black tabular-nums leading-none text-slate-900">
                                  {n}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                  {n === 1 ? "Traveler" : "Travelers"}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.participants <= 5) {
                              syncParticipantsCount(6);
                            }
                          }}
                          className={choiceCardClass(
                            formData.participants > 5,
                            true,
                          )}
                        >
                          {formData.participants > 5 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4541A] flex items-center justify-center">
                              <Check
                                size={9}
                                strokeWidth={3}
                                className="text-white"
                              />
                            </span>
                          )}
                          <span className="flex flex-col items-center justify-center gap-0.5 pr-1">
                            <span className="text-base font-black leading-none text-slate-900">
                              6+
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              More
                            </span>
                          </span>
                        </button>
                      </div>

                      {/* Dropdown for More than 5 selection */}
                      {formData.participants > 5 && (
                        <div className="pt-1 max-w-xs">
                          <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#D4541A] block mb-1.5">
                            Select count (6 to 12)
                          </label>
                          <select
                            value={formData.participants}
                            onChange={(e) =>
                              syncParticipantsCount(Number(e.target.value))
                            }
                            className="w-full h-11 bg-white border-2 border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#D4541A]"
                          >
                            {[6, 7, 8, 9, 10, 11, 12].map((cnt) => (
                              <option key={cnt} value={cnt}>
                                {cnt} Travelers
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Participant detail loops */}
                    <div className="space-y-3.5 pt-1">
                      {formData.participantsList.map((traveler, index) => (
                        <div
                          key={index}
                          className="p-3.5 sm:p-4 bg-slate-50/40 border border-slate-200/90 rounded-2xl space-y-3"
                        >
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A]">
                            Traveler {index + 1}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <input
                              required
                              placeholder="Full Name *"
                              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5"
                              value={traveler.name}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                            />
                            <input
                              required
                              placeholder="Mobile Number *"
                              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5"
                              value={traveler.phone}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "phone",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <input
                              required
                              type="number"
                              min={1}
                              max={120}
                              placeholder="Age *"
                              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#D4541A] focus:ring-2 focus:ring-[#D4541A]/5"
                              value={traveler.age}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  handleParticipantChange(index, "age", "");
                                  return;
                                }
                                const num = parseInt(val, 10);
                                if (!isNaN(num) && num > 120) {
                                  handleParticipantChange(index, "age", "120");
                                } else {
                                  handleParticipantChange(index, "age", val);
                                }
                              }}
                            />
                            <select
                              aria-label={`Gender for traveler ${index + 1}`}
                              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:border-[#D4541A]"
                              value={traveler.gender}
                              onChange={(e) =>
                                handleParticipantChange(
                                  index,
                                  "gender",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Room Sharing Option for this traveler */}
                          <div className="space-y-1.5 pt-0.5">
                            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">
                              {tripData?.bookingFormLabels?.roomSharing ||
                                "Room Sharing Option"}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {(tripData?.roomOptions?.length > 0
                                ? tripData.roomOptions
                                : [
                                    { label: "Double Sharing" },
                                    { label: "Triple Sharing" },
                                    { label: "Quad Sharing" },
                                  ]
                              ).map((room: any) => {
                                const active =
                                  traveler.roomSharing === room.label;
                                return (
                                  <button
                                    key={room.label}
                                    type="button"
                                    onClick={() =>
                                      handleParticipantChange(
                                        index,
                                        "roomSharing",
                                        room.label,
                                      )
                                    }
                                    className={choiceCardClass(active, true)}
                                  >
                                    {active && (
                                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4541A] flex items-center justify-center">
                                        <Check
                                          size={9}
                                          strokeWidth={3}
                                          className="text-white"
                                        />
                                      </span>
                                    )}
                                    <span className="text-[11px] font-bold text-center leading-snug whitespace-normal break-words px-1 pr-3">
                                      {room.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Train Class Option for this traveler */}
                          {!isDirectJoin && (
                            <div className="space-y-1.5 pt-0.5">
                              <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">
                                {tripData?.bookingFormLabels?.travelOption ||
                                  "Train Ticket Option"}
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {(tripData?.travelOptions?.length > 0
                                  ? tripData.travelOptions
                                  : [
                                      { label: "Sleeper" },
                                      { label: "3AC" },
                                      { label: "No Train" },
                                    ]
                                ).map((train: any) => {
                                  const active =
                                    traveler.trainOption === train.label;
                                  return (
                                    <button
                                      key={train.label}
                                      type="button"
                                      onClick={() =>
                                        handleParticipantChange(
                                          index,
                                          "trainOption",
                                          train.label,
                                        )
                                      }
                                      className={choiceCardClass(active, true)}
                                    >
                                      {active && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4541A] flex items-center justify-center">
                                          <Check
                                            size={9}
                                            strokeWidth={3}
                                            className="text-white"
                                          />
                                        </span>
                                      )}
                                      <span className="text-[11px] font-bold text-center leading-snug whitespace-normal break-words px-1 pr-3 uppercase tracking-wide">
                                        {train.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Food Option for this traveler */}
                          <div className="space-y-1.5 pt-0.5">
                            <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">
                              Food Option
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {["Normal Food", "Jain Food"].map((food) => {
                                const active =
                                  (traveler.foodPreference || "Normal Food") ===
                                  food;
                                return (
                                  <button
                                    key={food}
                                    type="button"
                                    onClick={() =>
                                      handleParticipantChange(
                                        index,
                                        "foodPreference",
                                        food,
                                      )
                                    }
                                    className={choiceCardClass(active, true)}
                                  >
                                    {active && (
                                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#D4541A] flex items-center justify-center">
                                        <Check
                                          size={9}
                                          strokeWidth={3}
                                          className="text-white"
                                        />
                                      </span>
                                    )}
                                    <span className="text-[11px] font-bold text-center leading-snug px-1 pr-3">
                                      {food}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Aadhaar Card / ID Proof Upload (Required) */}
                          <div className="space-y-2 pt-2 border-t border-slate-200/70">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-700">
                                ID proof{" "}
                                <span className="text-rose-600 normal-case tracking-normal font-black">
                                  *
                                </span>
                                <span className="ml-1 text-rose-600 normal-case tracking-normal font-bold">
                                  Required
                                </span>
                              </label>
                              {travelerHasIdProof(traveler) && (
                                <span className="text-emerald-600 font-bold flex items-center gap-1 normal-case text-[10px] shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                  Uploaded
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                              <label
                                className={cn(
                                  "flex-1 min-w-0 rounded-xl border-2 border-dashed px-3 py-3 flex items-center gap-2.5 cursor-pointer transition-all hover:bg-white",
                                  travelerHasIdProof(traveler)
                                    ? "border-emerald-500/50 bg-emerald-50/40"
                                    : error && !travelerHasIdProof(traveler)
                                      ? "border-rose-400 bg-rose-50/40"
                                      : "border-slate-300 bg-white",
                                )}
                              >
                                <CreditCard className="w-4 h-4 text-[#D4541A] shrink-0" />
                                <span className="flex-1 min-w-0 text-[11px] font-semibold text-slate-600 leading-snug">
                                  {(traveler as any).aadhaarFileName ||
                                    (travelerHasIdProof(traveler)
                                      ? "ID proof uploaded"
                                      : "Upload Aadhaar / ID (JPG, PNG, PDF)")}
                                </span>
                                <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg">
                                  Browse
                                </span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  required={!travelerHasIdProof(traveler)}
                                  onChange={(e) =>
                                    handleAadhaarUpload(index, e)
                                  }
                                />
                              </label>

                              {travelerHasIdProof(traveler) && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAadhaar(index)}
                                  className="h-11 sm:h-auto px-3 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shrink-0"
                                  title="Remove file"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            {!travelerHasIdProof(traveler) &&
                              error?.toLowerCase().includes("aadhaar") && (
                                <p className="text-[11px] font-bold text-rose-600">
                                  Upload Aadhaar / Govt ID proof to continue
                                </p>
                              )}
                            {uploadingAadhaarIndex === index && (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-bold animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                                Uploading document...
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Requests textarea (optional) */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">
                        Special Requests
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Optional — allergies, room notes, or other details
                      </p>
                    </div>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#D4541A] min-h-[88px] resize-y transition-all"
                      placeholder="Food allergies, room requests, or other details..."
                      value={formData.specialRequests}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialRequests: e.target.value,
                        })
                      }
                    />
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="space-y-2.5"
                >
                  {/* Payment Plan */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                    <div className="border-b border-slate-100 pb-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A]">
                        Step 3 of 4
                      </p>
                      <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                        Payment{" "}
                        <span className="font-caveat font-bold text-[#D4541A] text-xl sm:text-2xl">
                          plan
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Choose how you want to pay
                      </p>
                    </div>

                    {/* Payment Mode Selection */}
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">
                        Payment Plan
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPaymentMode("Full Payment")}
                          className={choiceCardClass(
                            paymentMode === "Full Payment",
                          )}
                        >
                          <div className="flex justify-between w-full items-center gap-2">
                            <span className="text-xs font-bold capitalize text-slate-800">
                              Pay In Full
                            </span>
                            {paymentMode === "Full Payment" && (
                              <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4541A] flex items-center justify-center">
                                <Check
                                  size={11}
                                  strokeWidth={3}
                                  className="text-white"
                                />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium mt-1">
                            Get immediate confirmation of booking
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMode("Partial Payment")}
                          className={choiceCardClass(
                            paymentMode === "Partial Payment",
                          )}
                        >
                          <div className="flex justify-between w-full items-center gap-2">
                            <span className="text-xs font-bold capitalize text-slate-800">
                              Partial Payment (Deposit)
                            </span>
                            {paymentMode === "Partial Payment" && (
                              <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4541A] flex items-center justify-center">
                                <Check
                                  size={11}
                                  strokeWidth={3}
                                  className="text-white"
                                />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium mt-1">
                            Pay only ₹
                            {(customDepositPerPax && customDepositPerPax > 0
                              ? customDepositPerPax
                              : 2000
                            ).toLocaleString()}
                            /pax to reserve. Pay rest later.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="space-y-2.5"
                >
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                    <div className="border-b border-slate-100 pb-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A]">
                        Step 4 of 4
                      </p>
                      <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                        Terms &{" "}
                        <span className="font-caveat font-bold text-[#D4541A] text-xl sm:text-2xl">
                          verification
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Confirm travelers, then accept terms — pricing stays in the sidebar
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3 text-[11px] font-medium text-slate-500 leading-relaxed space-y-1.5">
                      <p>
                        By placing this booking, you verify that all traveler
                        names, mobile numbers, and personal details match
                        Government-issued photo IDs.
                      </p>
                      <p>
                        Cancellations, transfers, and refunds follow the
                        YouthCamping standard trip reservation agreement.
                      </p>
                    </div>

                    {/* Lead + travelers only (price lives in sidebar) */}
                    <div className="space-y-2.5">
                      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                            Lead Contact
                          </h5>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="text-[9px] text-[#D4541A] hover:text-[#E65200] font-bold transition-all"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          <div className="min-w-0">
                            <p className="text-[8px] text-slate-400 uppercase font-medium">
                              Name
                            </p>
                            <p className="font-bold text-slate-800 capitalize break-words">
                              {formData.name}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] text-slate-400 uppercase font-medium">
                              Phone
                            </p>
                            <p className="font-bold text-slate-800 break-words">
                              {formData.phone}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] text-slate-400 uppercase font-medium">
                              Email
                            </p>
                            <p className="font-bold text-slate-800 break-all">
                              {formData.email || "N/A"}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] text-slate-400 uppercase font-medium">
                              City/State
                            </p>
                            <p className="font-bold text-slate-800 capitalize break-words">
                              {formData.cityState}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                            Travelers ({formData.participants})
                          </h5>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="text-[9px] text-[#D4541A] hover:text-[#E65200] font-bold transition-all"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {formData.participantsList.map((t, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 bg-white rounded-lg px-3 py-2 gap-1.5"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 capitalize">
                                  {t.name || `Traveler ${i + 1}`}
                                </p>
                                <p className="text-[9px] text-slate-400 font-medium">
                                  Mobile: {t.phone} • {t.gender} • Age{" "}
                                  {t.age || "N/A"}
                                  {travelerHasIdProof(t) ? " • ID uploaded" : ""}
                                </p>
                              </div>
                              <div className="text-left sm:text-right shrink-0">
                                <span className="inline-block text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded mr-1 capitalize">
                                  {t.roomSharing}
                                </span>
                                <span className="inline-block text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded capitalize">
                                  {t.trainOption}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-0.5">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[#D4541A] rounded"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                        />
                        <span className="font-bold text-slate-700 text-[11px]">
                          I agree to the{" "}
                          <a
                            href="/terms-and-conditions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#D4541A] underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Terms and Conditions
                          </a>{" "}
                          and trip reservation guidelines *
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[#D4541A] rounded"
                          checked={whatsappOptIn}
                          onChange={(e) => setWhatsappOptIn(e.target.checked)}
                        />
                        <span className="font-bold text-slate-700 text-[11px]">
                          Opt-in to receive booking updates on WhatsApp
                        </span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              {isAadhaarBlockingContinue && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] font-semibold text-rose-700 leading-snug">
                  <AlertCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-rose-600"
                  />
                  <span>
                    Upload ID proof for every traveler before continuing.
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                {currentStep > 1 ? (
                  <button
                    onClick={handlePrev}
                    type="button"
                    className="bg-white border border-slate-200 text-slate-700 rounded-xl py-3 px-5 font-bold tracking-wide text-xs flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-xs min-h-[48px]"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                ) : (
                  <div />
                )}

                {/* On desktop (lg+), show in-card buttons. On mobile (<lg), the sticky bottom bar handles Continue/Submit */}
                {currentStep < 4 ? (
                  <button
                    onClick={handleNext}
                    type="button"
                    disabled={isAadhaarBlockingContinue}
                    title={
                      isAadhaarBlockingContinue
                        ? "Upload Aadhaar / Govt ID for every traveler"
                        : undefined
                    }
                    className="hidden lg:flex bg-[#D4541A] hover:bg-[#E65200] text-white rounded-xl py-3 px-6 font-extrabold uppercase tracking-widest text-xs items-center gap-1.5 shadow-md shadow-[#D4541A]/15 transition-all active:scale-95 min-h-[48px] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    Continue <ChevronRight size={14} strokeWidth={3} />
                  </button>
                ) : (
                  <button
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    type="button"
                    className="hidden lg:flex bg-[#D4541A] hover:bg-[#E65200] text-white rounded-xl py-3 px-6 font-extrabold uppercase tracking-widest text-xs items-center gap-1.5 shadow-md shadow-[#D4541A]/25 transition-all active:scale-95 disabled:opacity-50 min-h-[48px]"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <ShieldCheck size={16} strokeWidth={3} />
                    )}
                    {loading ? "Processing..." : "Confirm"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Area: Sticky Desktop Summary Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-3">
              {renderSummaryCard()}

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center gap-0.5 shadow-xs">
                  <ShieldCheck className="text-[#D4541A]" size={13} />
                  <span className="text-[9px] font-bold capitalize tracking-wider text-slate-700">
                    100% Secured
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center gap-0.5 shadow-xs">
                  <Lock className="text-[#D4541A]" size={13} />
                  <span className="text-[9px] font-bold capitalize tracking-wider text-slate-700">
                    SSL Checkout
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Live Price Bar (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {isAadhaarBlockingContinue && (
          <div className="px-4 pt-2 pb-0">
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700">
              <AlertCircle size={13} className="shrink-0" />
              <span>Upload ID proof for every traveler</span>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 py-2.5 px-4">
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4541A] block">
              Pay now
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg font-black text-slate-900 tracking-tight">
                ₹{pricing.finalTotal.toLocaleString()}
              </span>
              {paymentMode === "Partial Payment" && (
                <span className="text-[10px] text-slate-500 font-bold">
                  (Total: ₹{pricing.fullPackageTotal.toLocaleString()})
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-bold truncate">
                · {formData.participants} pax
              </span>
            </div>
          </div>
          <div className="shrink-0">
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                type="button"
                disabled={isAadhaarBlockingContinue}
                title={
                  isAadhaarBlockingContinue
                    ? "Upload Aadhaar / Govt ID for every traveler"
                    : undefined
                }
                className="bg-[#D4541A] hover:bg-[#E65200] text-white rounded-xl py-3 px-5 font-extrabold uppercase tracking-widest text-[11px] flex items-center gap-1 shadow-lg shadow-[#D4541A]/25 transition-all active:scale-95 min-h-[48px] disabled:opacity-45 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={14} strokeWidth={3} />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                type="button"
                className="bg-[#D4541A] hover:bg-[#E65200] text-white rounded-xl py-3 px-5 font-extrabold uppercase tracking-widest text-[11px] flex items-center gap-1 shadow-lg shadow-[#D4541A]/35 transition-all active:scale-95 disabled:opacity-50 min-h-[48px]"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck size={14} strokeWidth={3} />
                )}
                {loading ? "Processing..." : "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <div className="bg-[#F3F1EE]">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#F3F1EE]">
            <Loader2 className="animate-spin text-[#D4541A] w-10 h-10" />
          </div>
        }
      >
        <BookingForm />
      </Suspense>
    </div>
  );
}
