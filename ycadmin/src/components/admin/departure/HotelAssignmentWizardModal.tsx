/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HotelAssignmentWizardModal — YouthCamping Admin
 *
 * Fast 10-15 Second Operational Room & Per Person Hotel Assignment Screen:
 * - Room & Capacity allocation (Double, Triple, Quad, Extra Bed)
 * - 100% Synced with Database, Room & Tempo Allocation Engine, & Ops Vendor Ledger
 * - Pure Per-Person rate calculation
 * - Instant 1-Click Save
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Hotel,
  Minus,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { opsService } from "@/services/ops.service";
import { resolveCityForItineraryDay } from "@/utils/accommodationCalculator";
import api from "@/services/api";
import { toast } from "sonner";
import {
  getHotelEligibleDestinations,
  normalizeDestinationName,
  HotelEligibleDestination,
  deriveRoomCountsFromAllocations,
  normaliseDate,
} from "@/utils/accommodationCalculator";

interface InitialDayInfo {
  dayNum?: number;
  dayLabel?: string;
  destination?: string;
  dateStr?: string;
  existingBooking?: any;
}

interface HotelAssignmentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  computedItinerary: any[];
  dbVendors: any[];
  tripId: string;
  departureDateStr: string;
  totalPax: number;
  passengerAllocations?: Record<string, { room: string; vehicle: string; seat: string }>;
  allPassengers?: any[];
  initialDayInfo?: InitialDayInfo | null;
  onSaveSuccess: () => void;
}

function formatDateForInput(
  dateVal: any,
  fallbackDepartureDate?: string,
  dayOffset = 0
): string {
  if (dateVal) {
    if (
      typeof dateVal === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())
    ) {
      return dateVal.trim();
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  if (fallbackDepartureDate) {
    const parsed = new Date(fallbackDepartureDate);
    if (!isNaN(parsed.getTime())) {
      if (dayOffset > 0) {
        parsed.setDate(parsed.getDate() + dayOffset);
      }
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  return "";
}

/** Add N nights to a YYYY-MM-DD string, return YYYY-MM-DD (timezone-safe) */
function addNightsToDate(dateStr: string, nights: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + nights));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function extractHotelRates(hotelOrVendor: any, destinationCity?: string) {
  const v = hotelOrVendor?.vendorObj || hotelOrVendor || {};
  const name = (v.name || v.hotelName || hotelOrVendor?.name || "").toLowerCase();
  const city = (destinationCity || v.city || v.location || hotelOrVendor?.city || "").toLowerCase();
  const category = (v.category || v.accommodationType || hotelOrVendor?.category || "").toLowerCase();

  // 0. Extract rates from roomRates, vendorRooms, or rooms list if present
  const roomRatesList = Array.isArray(v.roomRates)
    ? v.roomRates
    : Array.isArray(v.vendorRooms)
      ? v.vendorRooms
      : Array.isArray(v.rooms)
        ? v.rooms
        : [];

  if (roomRatesList.length > 0) {
    let d = 0,
      t = 0,
      q = 0,
      ex = 0;
    for (const r of roomRatesList) {
      let extra: any = {};
      try {
        if (r.notes && typeof r.notes === "string") extra = JSON.parse(r.notes);
        else if (r.notes && typeof r.notes === "object") extra = r.notes;
      } catch {}

      const type = String(r.sharingType || r.roomType || r.category || r.roomCategory || r.roomName || r.name || "").toUpperCase();
      const directDouble = Number(r.doubleRate || extra.doubleRate || 0);
      const directTriple = Number(r.tripleRate || extra.tripleRate || 0);
      const directQuad = Number(r.quadRate || extra.quadRate || 0);
      const amt = Number(r.amount || r.baseRate || r.base || directDouble || 0);
      const extraMattressAmt = Number(r.extraMattressRate || r.extraBedRate || extra.extraBedRate || 0);

      if (directDouble > 0 && (!d || directDouble < d)) d = directDouble;
      if (directTriple > 0 && (!t || directTriple < t)) t = directTriple;
      if (directQuad > 0 && (!q || directQuad < q)) q = directQuad;
      if (extraMattressAmt > 0 && (!ex || extraMattressAmt < ex)) ex = extraMattressAmt;

      if (type.includes("DOUBLE") || type.includes("TWIN") || type.includes("2")) {
        if (amt > 0 && (!d || amt < d)) d = amt;
      } else if (type.includes("TRIPLE") || type.includes("3")) {
        if (amt > 0 && (!t || amt < t)) t = amt;
      } else if (type.includes("QUAD") || type.includes("4")) {
        if (amt > 0 && (!q || amt < q)) q = amt;
      } else if (type.includes("EXTRA") || type.includes("BED") || type.includes("MATTRESS")) {
        if (amt > 0 && (!ex || amt < ex)) ex = amt;
      } else {
        // If it doesn't specify sharing type, assume base rate is double sharing
        if (amt > 0 && (!d || amt < d)) d = amt;
      }
    }

    if (d > 0 || t > 0 || q > 0) {
      return {
        doubleRate: d > 0 ? d : 1200,
        tripleRate: t > 0 ? t : Math.round((d > 0 ? d : 1200) * 0.75),
        quadRate: q > 0 ? q : Math.round((d > 0 ? d : 1200) * 0.65),
        extraBedRate: ex > 0 ? ex : Math.round((d > 0 ? d : 1200) * 0.4),
      };
    }
  }

  // 1. Exact rates defined on vendor object
  const dRate = Number(
    v.doubleSharingRate ||
      v.doubleRate ||
      v.rates?.double ||
      v.pricing?.doubleRate,
  );
  const tRate = Number(
    v.tripleSharingRate ||
      v.tripleRate ||
      v.rates?.triple ||
      v.pricing?.tripleRate,
  );
  const qRate = Number(
    v.quadSharingRate ||
      v.quadRate ||
      v.rates?.quad ||
      v.pricing?.quadRate,
  );
  const exRate = Number(
    v.extraBedRate ||
      v.extraBed ||
      v.rates?.extraBed ||
      v.pricing?.extraBedRate,
  );

  if (dRate && !isNaN(dRate) && dRate > 0) {
    return {
      doubleRate: dRate,
      tripleRate:
        tRate && !isNaN(tRate) && tRate > 0 ? tRate : Math.round(dRate * 0.75),
      quadRate:
        qRate && !isNaN(qRate) && qRate > 0 ? qRate : Math.round(dRate * 0.65),
      extraBedRate:
        exRate && !isNaN(exRate) && exRate > 0
          ? exRate
          : Math.round(dRate * 0.4),
    };
  }

  // 2. Hotel Category / Tier based dynamic rates
  if (
    category.includes("5") ||
    category.includes("luxury") ||
    category.includes("resort")
  ) {
    return {
      doubleRate: 2500,
      tripleRate: 1800,
      quadRate: 1400,
      extraBedRate: 900,
    };
  }
  if (
    category.includes("4") ||
    category.includes("premium") ||
    category.includes("boutique")
  ) {
    return {
      doubleRate: 1800,
      tripleRate: 1300,
      quadRate: 1050,
      extraBedRate: 700,
    };
  }
  if (
    category.includes("3") ||
    category.includes("standard") ||
    category.includes("hotel")
  ) {
    return {
      doubleRate: 1200,
      tripleRate: 900,
      quadRate: 750,
      extraBedRate: 500,
    };
  }
  if (
    category.includes("homestay") ||
    category.includes("camp") ||
    category.includes("tent") ||
    category.includes("budget")
  ) {
    return {
      doubleRate: 1000,
      tripleRate: 750,
      quadRate: 650,
      extraBedRate: 400,
    };
  }

  // 3. City/Destination specific realistic regional tariffs
  if (
    city.includes("spiti") ||
    city.includes("kaza") ||
    city.includes("tabo") ||
    city.includes("nako") ||
    city.includes("chitkul") ||
    city.includes("sangla") ||
    city.includes("kalpa") ||
    city.includes("mud") ||
    city.includes("pin valley")
  ) {
    return {
      doubleRate: 1200,
      tripleRate: 900,
      quadRate: 750,
      extraBedRate: 500,
    };
  }
  if (city.includes("chandratal") || city.includes("sissu") || city.includes("jispa")) {
    return {
      doubleRate: 1400,
      tripleRate: 1050,
      quadRate: 850,
      extraBedRate: 550,
    };
  }
  if (city.includes("manali") || city.includes("shimla")) {
    if (name.includes("hotel") || name.includes("resort") || name.includes("cottage"))
      return {
        doubleRate: 1400,
        tripleRate: 1000,
        quadRate: 850,
        extraBedRate: 550,
      };
    return {
      doubleRate: 1500,
      tripleRate: 1100,
      quadRate: 950,
      extraBedRate: 600,
    };
  }

  // 4. Default fallback
  return {
    doubleRate: 1100,
    tripleRate: 800,
    quadRate: 800,
    extraBedRate: 500,
  };
}

export default function HotelAssignmentWizardModal({
  isOpen,
  onClose,
  computedItinerary,
  dbVendors,
  tripId,
  departureDateStr,
  totalPax,
  passengerAllocations,
  allPassengers,
  initialDayInfo,
  onSaveSuccess,
}: HotelAssignmentWizardModalProps) {
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const hasInitializedRef = useRef(false);
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [adminHotels, setAdminHotels] = useState<any[]>([]);

  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [nightsCount, setNightsCount] = useState<number>(1);

  // Room counts for physical database & room allocation engine sync
  const [doubleRoomsCount, setDoubleRoomsCount] = useState<number>(0);
  const [tripleRoomsCount, setTripleRoomsCount] = useState<number>(0);
  const [quadRoomsCount, setQuadRoomsCount] = useState<number>(0);
  const [extraPersonsCount, setExtraPersonsCount] = useState<number>(0);

  // Per Person Rates
  const [doubleRate, setDoubleRate] = useState<number>(1100);
  const [tripleRate, setTripleRate] = useState<number>(800);
  const [quadRate, setQuadRate] = useState<number>(800);
  const [extraBedRate, setExtraBedRate] = useState<number>(500);

  const [remarks, setRemarks] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [isCustomHotel, setIsCustomHotel] = useState<boolean>(false);
  const [customHotelName, setCustomHotelName] = useState<string>("");
  const [isCustomCity, setIsCustomCity] = useState<boolean>(false);
  const [customCityName, setCustomCityName] = useState<string>("");

  const currentDayNum = useMemo(() => {
    if (initialDayInfo?.dayNum) return initialDayInfo.dayNum;
    if (initialDayInfo?.dayLabel) {
      const parsed = parseInt(initialDayInfo.dayLabel.replace(/\D/g, ""), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 1;
  }, [initialDayInfo]);

  useEffect(() => {
    if (isOpen) {
      api
        .get("/admin/hotels")
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setAdminHotels(res.data.data);
          }
        })
        .catch(() => null);
    }
  }, [isOpen]);

  const hotelEligibleDestinations = useMemo(() => {
    if (!isOpen) return [];
    return getHotelEligibleDestinations(computedItinerary, currentDayNum, dbVendors);
  }, [isOpen, computedItinerary, currentDayNum, dbVendors]);

  const currentDayDestination = useMemo<HotelEligibleDestination | null>(() => {
    const match = hotelEligibleDestinations.find((d) => d.isCurrentDay);
    if (match) return match;
    if (initialDayInfo?.destination) {
      const normInit = normalizeDestinationName(initialDayInfo.destination);
      return hotelEligibleDestinations.find((d) => d.normalizedName === normInit) || null;
    }
    return null;
  }, [hotelEligibleDestinations, initialDayInfo]);

  const currentDayItineraryDate = useMemo(() => {
    const match = computedItinerary.find((day: any) => {
      const d = typeof day?.day === "number" ? day.day : parseInt(String(day?.day ?? "").replace(/\D/g, ""), 10) || 0;
      return d === currentDayNum;
    }) || computedItinerary[0];
    return match?.dateStr || match?.date || undefined;
  }, [computedItinerary, currentDayNum]);

  const combinedHotelProperties = useMemo(() => {
    const list: any[] = [];
    const seenNames = new Set<string>();

    dbVendors.forEach((v: any) => {
      const name = v.name || v.hotelName || "";
      const city = v.city || v.location || "";
      if (name && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        list.push({
          id: v.id,
          name,
          city,
          category: v.accommodationType || "Standard Hotel",
          rating: v.rating || "4.5 ★",
          phone: v.contactNumber || v.phone || "",
          vendorObj: v,
        });
      }
    });

    adminHotels.forEach((h: any) => {
      if (h.name && !seenNames.has(h.name.toLowerCase())) {
        seenNames.add(h.name.toLowerCase());
        list.push({
          id: h.id || `HTL-${list.length + 1}`,
          name: h.name,
          city: h.city || "Manali",
          category: h.category || "Deluxe Hotel",
          rating: typeof h.rating === "number" ? "★".repeat(h.rating) : h.rating || "4.5 ★",
          phone: h.phone || "",
          vendorObj: h,
        });
      }
    });

    return list;
  }, [dbVendors, adminHotels]);

  const destinationCitiesList = useMemo(() => {
    const seenNorm = new Set<string>();
    const cities: string[] = [];

    const addCity = (rawName: string) => {
      if (!rawName) return;
      let clean = rawName.trim();
      if (clean.toLowerCase().endsWith(" camp")) {
        const base = clean.substring(0, clean.length - 5).trim();
        if (base) clean = base;
      }
      const norm = normalizeDestinationName(clean);
      if (norm && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        cities.push(clean);
      }
    };

    hotelEligibleDestinations.forEach((d) => addCity(d.name));

    dbVendors.forEach((v: any) => {
      addCity(v.city);
      addCity(v.location);
    });

    if (selectedDestination) addCity(selectedDestination);

    return cities.sort((a, b) => a.localeCompare(b));
  }, [hotelEligibleDestinations, dbVendors, selectedDestination]);

  const matchingHotels = useMemo(() => {
    if (!selectedDestination) return combinedHotelProperties;
    const normSelected = normalizeDestinationName(selectedDestination);
    const exactMatches = combinedHotelProperties.filter((h) => {
      const normCity = normalizeDestinationName(h.city || "");
      return normCity.includes(normSelected) || normSelected.includes(normCity);
    });
    if (exactMatches.length > 0) {
      return exactMatches;
    }
    return [
      {
        id: `custom-${normSelected}`,
        name: `Hotel / Stay in ${selectedDestination}`,
        city: selectedDestination,
        category: "Standard Property",
      },
    ];
  }, [selectedDestination, combinedHotelProperties]);

  // Initialize modal state ONLY ONCE when modal is opened
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const dayOffset = Math.max(0, currentDayNum - 1);
    const existingB = initialDayInfo?.existingBooking;

    let destName = "";
    if (initialDayInfo?.destination && initialDayInfo.destination !== "—") {
      destName = initialDayInfo.destination;
    } else if (currentDayDestination) {
      destName = currentDayDestination.name;
    } else if (hotelEligibleDestinations.length > 0) {
      destName = hotelEligibleDestinations[0].name;
    } else {
      destName = "Manali";
    }
    setSelectedDestination(destName);
    setCustomCityName(destName);
    setIsCustomCity(false);

    const targetDayDate = initialDayInfo?.dateStr || currentDayItineraryDate;
    const isDirectCheckInDay = Boolean(
      existingB?.checkIn &&
      targetDayDate &&
      normaliseDate(existingB.checkIn) === normaliseDate(targetDayDate)
    );

    const initCheckIn = formatDateForInput(
      targetDayDate || existingB?.checkInDate || existingB?.checkIn,
      departureDateStr,
      dayOffset
    );
    setCheckInDate(initCheckIn);

    // Default to 1 night unless this is the direct check-in day of an existing multi-night booking
    const n =
      isDirectCheckInDay && existingB?.nightsCount && existingB.nightsCount >= 1
        ? existingB.nightsCount
        : 1;
    setNightsCount(n);
    setCheckOutDate(addNightsToDate(initCheckIn, n));

    const normDest = normalizeDestinationName(destName);

    if (existingB && (existingB.hotelName || existingB.vendorName || existingB.hotel)) {
      const hName = existingB.hotelName || existingB.hotel || existingB.vendorName || "";
      setCustomHotelName(hName);
      const matchedInCity = matchingHotels.find((h) => h.name.toLowerCase() === hName.toLowerCase());
      const matchedAny = combinedHotelProperties.find((h) => h.name.toLowerCase() === hName.toLowerCase());
      const matched = matchedInCity || (matchedAny && normalizeDestinationName(matchedAny.city) === normDest ? matchedAny : null);

      if (matched) {
        setSelectedHotel(matched);
        setIsCustomHotel(false);
        const rates = extractHotelRates(matched, destName);
        const pickRate = (saved: any, fallback: number) => {
          const n = Number(saved);
          return Number.isFinite(n) && n > 0 ? n : fallback > 0 ? fallback : 0;
        };
        setDoubleRate(pickRate(existingB.doubleRate, rates.doubleRate));
        setTripleRate(pickRate(existingB.tripleRate, rates.tripleRate));
        setQuadRate(pickRate(existingB.quadRate, rates.quadRate));
        setExtraBedRate(pickRate(existingB.extraBedRate, rates.extraBedRate));
      } else {
        const customObj = {
          id: `custom-${Date.now()}`,
          name: hName,
          city: destName,
          category: "Custom Property",
        };
        setSelectedHotel(customObj);
        setIsCustomHotel(true);
        const pickSaved = (saved: any) => {
          const n = Number(saved);
          return Number.isFinite(n) && n > 0 ? n : 0;
        };
        setDoubleRate(pickSaved(existingB.doubleRate));
        setTripleRate(pickSaved(existingB.tripleRate));
        setQuadRate(pickSaved(existingB.quadRate));
        setExtraBedRate(pickSaved(existingB.extraBedRate));
      }
    } else {
      const matched = combinedHotelProperties.find((h) => {
        const normCity = normalizeDestinationName(h.city || "");
        return normCity.includes(normDest) || normDest.includes(normCity);
      });

      if (matched) {
        setSelectedHotel(matched);
        setIsCustomHotel(false);
        setCustomHotelName(matched.name);
        const rates = extractHotelRates(matched, destName);
        setDoubleRate(rates.doubleRate || 0);
        setTripleRate(rates.tripleRate || 0);
        setQuadRate(rates.quadRate || 0);
        setExtraBedRate(rates.extraBedRate || 0);
      } else {
        const placeholderHotel = {
          id: `custom-${normDest}`,
          name: `Hotel / Stay in ${destName}`,
          city: destName,
          category: "Standard Property",
        };
        setSelectedHotel(placeholderHotel);
        setIsCustomHotel(false);
        setCustomHotelName(placeholderHotel.name);
        setDoubleRate(0);
        setTripleRate(0);
        setQuadRate(0);
        setExtraBedRate(0);
      }
    }

    // Priority 1: Use existing booking's saved room counts if present
    const hasSavedRoomConfig =
      existingB &&
      (Number(existingB.doubleRoomsCount) > 0 ||
        Number(existingB.tripleRoomsCount) > 0 ||
        Number(existingB.quadRoomsCount) > 0 ||
        Number(existingB.extraPersonsCount) > 0 ||
        Number(existingB.doubleRooms) > 0 ||
        Number(existingB.tripleRooms) > 0 ||
        Number(existingB.quadRooms) > 0 ||
        Number(existingB.extraBeds) > 0);

    const derivedFromAllocations = passengerAllocations
      ? deriveRoomCountsFromAllocations(passengerAllocations, allPassengers)
      : null;

    if (hasSavedRoomConfig) {
      setDoubleRoomsCount(existingB.doubleRoomsCount ?? existingB.doubleRooms ?? 0);
      setTripleRoomsCount(existingB.tripleRoomsCount ?? existingB.tripleRooms ?? 0);
      setQuadRoomsCount(existingB.quadRoomsCount ?? existingB.quadRooms ?? 0);
      setExtraPersonsCount(existingB.extraPersonsCount ?? existingB.extraBeds ?? 0);
      setRemarks(existingB.remarks || existingB.notes || "");
    } else if (derivedFromAllocations && derivedFromAllocations.totalRooms > 0) {
      setDoubleRoomsCount(derivedFromAllocations.doubleRooms);
      setTripleRoomsCount(derivedFromAllocations.tripleRooms);
      setQuadRoomsCount(derivedFromAllocations.quadRooms);
      setExtraPersonsCount(derivedFromAllocations.extraPersons);
      setRemarks(existingB?.remarks || "");
    } else {
      if (totalPax > 0) {
        if (totalPax % 4 === 0) {
          setQuadRoomsCount(totalPax / 4);
          setDoubleRoomsCount(0);
          setTripleRoomsCount(0);
          setExtraPersonsCount(0);
        } else if (totalPax % 3 === 0) {
          setTripleRoomsCount(totalPax / 3);
          setDoubleRoomsCount(0);
          setQuadRoomsCount(0);
          setExtraPersonsCount(0);
        } else if (totalPax === 7) {
          setTripleRoomsCount(1);
          setQuadRoomsCount(1);
          setDoubleRoomsCount(0);
          setExtraPersonsCount(0);
        } else {
          setDoubleRoomsCount(Math.floor(totalPax / 2));
          setTripleRoomsCount(0);
          setQuadRoomsCount(0);
          setExtraPersonsCount(totalPax % 2 !== 0 ? 1 : 0);
        }
      } else {
        setDoubleRoomsCount(1);
        setTripleRoomsCount(0);
        setQuadRoomsCount(0);
        setExtraPersonsCount(0);
      }
      setRemarks("");
    }
  }, [isOpen, initialDayInfo]);

  const handleSelectHotel = (hotel: any, overrideDest?: string) => {
    setSelectedHotel(hotel);
    setIsCustomHotel(false);
    setCustomHotelName(hotel?.name || "");
    const destToUse = overrideDest || selectedDestination || hotel?.city;
    const rates = extractHotelRates(hotel, destToUse);
    if (rates.doubleRate > 0) setDoubleRate(rates.doubleRate);
    if (rates.tripleRate > 0) setTripleRate(rates.tripleRate);
    if (rates.quadRate > 0) setQuadRate(rates.quadRate);
    if (rates.extraBedRate > 0) setExtraBedRate(rates.extraBedRate);
  };

  const handleNightsChange = (nights: number) => {
    const validNights = Math.max(1, nights);
    setNightsCount(validNights);
    if (checkInDate) {
      setCheckOutDate(addNightsToDate(checkInDate, validNights));
    }
  };

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckInDate(newCheckIn);
    if (newCheckIn) {
      setCheckOutDate(addNightsToDate(newCheckIn, nightsCount));
    }
  };

  const totalPhysicalRooms = doubleRoomsCount + tripleRoomsCount + quadRoomsCount;
  const paxCapacityCovered =
    doubleRoomsCount * 2 + tripleRoomsCount * 3 + quadRoomsCount * 4 + extraPersonsCount;
  const targetPaxCount = totalPax > 0 ? totalPax : paxCapacityCovered || 1;
  const isPaxFullyAllocated = paxCapacityCovered >= targetPaxCount;

  // Pure Per Person Cost calculation based on room capacity x per person rate
  const calculatedCosts = useMemo(() => {
    const doubleTotal = doubleRoomsCount * 2 * doubleRate * nightsCount;
    const tripleTotal = tripleRoomsCount * 3 * tripleRate * nightsCount;
    const quadTotal = quadRoomsCount * 4 * quadRate * nightsCount;
    const extraTotal = extraPersonsCount * extraBedRate * nightsCount;

    const grandTotal = doubleTotal + tripleTotal + quadTotal + extraTotal;
    const effectivePax = paxCapacityCovered > 0 ? paxCapacityCovered : (totalPax > 0 ? totalPax : 1);
    const costPerPaxStay = effectivePax > 0 ? grandTotal / effectivePax : grandTotal;

    return {
      grandTotal,
      costPerPaxStay,
    };
  }, [
    doubleRoomsCount,
    tripleRoomsCount,
    quadRoomsCount,
    extraPersonsCount,
    doubleRate,
    tripleRate,
    quadRate,
    extraBedRate,
    nightsCount,
    totalPax,
    paxCapacityCovered,
  ]);

  const handleSaveStayAssignment = async () => {
    const finalHotelName = isCustomHotel && customHotelName.trim()
      ? customHotelName.trim()
      : selectedHotel?.name || customHotelName.trim() || "Hotel Stay";

    if (!finalHotelName) {
      toast.error("Please enter or select a hotel property");
      return;
    }
    if (!checkInDate) {
      toast.error("Please enter a valid Check-In Date");
      return;
    }
    if (!isPaxFullyAllocated) {
      toast.error(`Please allocate rooms for all ${targetPaxCount} persons (${paxCapacityCovered}/${targetPaxCount} allocated)`);
      return;
    }

    setIsSaving(true);
    try {
      const realVendorId =
        !isCustomHotel && selectedHotel?.vendorObj?.id && !String(selectedHotel.vendorObj.id).startsWith("HTL-")
          ? selectedHotel.vendorObj.id
          : null;

      const existingB = initialDayInfo?.existingBooking;
      const finalDest = isCustomCity && customCityName.trim() ? customCityName.trim() : (selectedDestination || selectedHotel?.city || "Manali");

      // DEFENSIVE: Always use the YYYY-MM-DD dateStr from the target day,
      // never the potentially-mutated checkInDate state.
      // This ensures the booking is ALWAYS saved on the correct day.
      const lockedCheckIn = initialDayInfo?.dateStr || checkInDate;
      const lockedCheckOut = addNightsToDate(lockedCheckIn, nightsCount);

      console.log("[HotelWizard] SAVE → lockedCheckIn:", lockedCheckIn, "| checkInDate state:", checkInDate, "| initialDayInfo.dateStr:", initialDayInfo?.dateStr);

      const isSameDateBooking =
        existingB?.id &&
        normaliseDate(existingB.checkIn || existingB.checkInDate) === normaliseDate(lockedCheckIn);

      const payload: any = {
        ...(isSameDateBooking && !String(existingB.id).startsWith("stay") ? { id: existingB.id } : {}),
        hotelName: finalHotelName,
        location: finalDest,
        roomType: selectedHotel?.category || "Standard Room",
        numberOfRooms: totalPhysicalRooms > 0 ? totalPhysicalRooms : 1,
        totalAmount: calculatedCosts.grandTotal,
        advancePaid: 0,
        confirmed: "CONFIRMED",
        pricingMethod: "per-person",
        doubleRoomsCount,
        tripleRoomsCount,
        quadRoomsCount,
        extraPersonsCount,
        nightsCount,
        doubleRate,
        tripleRate,
        quadRate,
        extraBedRate,
        checkIn: lockedCheckIn,
        checkOut: lockedCheckOut,
        vendorId: realVendorId,
        notes: remarks || "",
      };

      await opsService.saveHotelBookings(tripId, departureDateStr, [payload]);
      toast.success(`Assigned ${finalHotelName} for ${finalDest}!`);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save stay assignment:", err);
      toast.error(err.response?.data?.message || "Failed to save stay assignment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[640px] bg-white p-3 sm:p-5 rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[min(90vh,100dvh)] flex flex-col min-h-0 font-sans">
        <DialogHeader className="sr-only">
          <DialogTitle>Hotel Assignment</DialogTitle>
          <DialogDescription>
            Hotel and room assignment for Day {currentDayNum} ({selectedDestination})
          </DialogDescription>
        </DialogHeader>
        {/* STICKY HEADER */}
        <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 pr-8 shrink-0 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
            <h3 className="text-base font-black text-slate-900 shrink-0">Hotel Assignment</h3>
            <span className="text-xs font-bold text-slate-500 min-w-0 break-words">
              · Day {currentDayNum} · {selectedDestination}
            </span>
          </div>
          <span className="bg-slate-100 text-slate-800 text-xs font-black px-2.5 py-0.5 rounded-md border border-slate-200 shrink-0">
            {targetPaxCount} Pax
          </span>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <div className="py-3 pb-4 space-y-4 overflow-y-auto overscroll-contain pr-1 flex-1 min-h-0 text-xs">
          {/* SECTION 1: DESTINATION & HOTEL SELECTOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Destination City
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCity(!isCustomCity)}
                  className="text-[10px] font-bold text-[#FF4D00] hover:underline"
                >
                  {isCustomCity ? "Select List" : "+ Custom City"}
                </button>
              </div>
              {isCustomCity ? (
                <input
                  type="text"
                  placeholder="Type city/location..."
                  value={customCityName}
                  onChange={(e) => {
                    setCustomCityName(e.target.value);
                    setSelectedDestination(e.target.value);
                  }}
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded-lg px-2.5 bg-white text-slate-900 focus:border-[#FF4D00] focus:outline-none"
                />
              ) : (
                <select
                  value={selectedDestination}
                  onChange={(e) => {
                    const newDest = e.target.value;
                    setSelectedDestination(newDest);
                    setCustomCityName(newDest);

                    const norm = normalizeDestinationName(newDest);
                    const matched = combinedHotelProperties.find((h) => {
                      const normCity = normalizeDestinationName(h.city || "");
                      return normCity.includes(norm) || norm.includes(normCity);
                    });
                    if (matched) {
                      handleSelectHotel(matched, newDest);
                    } else {
                      const placeholderHotel = {
                        id: `custom-${norm}`,
                        name: `Hotel / Stay in ${newDest}`,
                        city: newDest,
                        category: "Standard Property",
                      };
                      handleSelectHotel(placeholderHotel, newDest);
                    }
                  }}
                  className="w-full min-w-0 h-9 text-xs font-bold border border-slate-200 rounded-lg px-2.5 bg-white text-slate-900 focus:border-[#FF4D00] focus:outline-none"
                >
                  {destinationCitiesList.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Hotel Property
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomHotel(!isCustomHotel)}
                  className="text-[10px] font-bold text-[#FF4D00] hover:underline"
                >
                  {isCustomHotel ? "Select List" : "+ Custom Hotel"}
                </button>
              </div>
              {isCustomHotel ? (
                <input
                  type="text"
                  placeholder="Enter hotel / resort / campsite name..."
                  value={customHotelName}
                  onChange={(e) => {
                    setCustomHotelName(e.target.value);
                    setSelectedHotel({
                      id: `custom-${Date.now()}`,
                      name: e.target.value,
                      city: selectedDestination,
                      category: "Custom Property",
                    });
                  }}
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded-lg px-2.5 bg-white text-slate-900 focus:border-[#FF4D00] focus:outline-none"
                />
              ) : (
                <select
                  value={selectedHotel?.name || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__CUSTOM__") {
                      setIsCustomHotel(true);
                      setCustomHotelName("");
                      return;
                    }
                    const matched = matchingHotels.find((h) => h.name === val);
                    if (matched) handleSelectHotel(matched);
                  }}
                  className="w-full min-w-0 h-9 text-xs font-bold border border-slate-200 rounded-lg px-2.5 bg-white text-slate-900 focus:border-[#FF4D00] focus:outline-none"
                >
                  {matchingHotels.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({h.city || selectedDestination}) — {h.category || "Hotel"}
                    </option>
                  ))}
                  <option value="__CUSTOM__">➕ Enter Custom Hotel Name...</option>
                </select>
              )}
            </div>
          </div>

          {/* SECTION 2: STAY DATES & NIGHTS — stacked on phones so years aren't truncated */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="min-w-0">
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Check-In
              </label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => handleCheckInChange(e.target.value)}
                className="w-full min-w-0 h-9 sm:h-8 text-sm sm:text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-900 focus:outline-none focus:border-[#FF4D00]"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Nights
              </label>
              <select
                value={nightsCount}
                onChange={(e) => handleNightsChange(Number(e.target.value))}
                className="w-full min-w-0 h-9 sm:h-8 text-sm sm:text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-900 focus:outline-none focus:border-[#FF4D00]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Night" : "Nights"}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Check-Out
              </label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full min-w-0 h-9 sm:h-8 text-sm sm:text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-900 focus:outline-none focus:border-[#FF4D00]"
              />
            </div>
          </div>

          {/* SECTION 3: ROOM & PER PERSON SHARING ALLOCATION TABLE */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
            <div className="bg-slate-50 p-2 border-b border-slate-200 flex flex-wrap justify-between items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
              <span>Per Person Sharing Allocation</span>
              <span className={cn("font-bold px-2 py-0.5 rounded text-[10px]", isPaxFullyAllocated ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800")}>
                {paxCapacityCovered} / {targetPaxCount} Persons Allocated
              </span>
            </div>

            <table className="w-full min-w-[520px] text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-500 font-bold bg-slate-50/50">
                  <th className="py-1.5 px-3">Sharing Type</th>
                  <th className="py-1.5 px-3 text-center">Rooms</th>
                  <th className="py-1.5 px-3 text-center">Persons (Pax)</th>
                  <th className="py-1.5 px-3 text-right">Rate / Person (₹)</th>
                  <th className="py-1.5 px-3 text-right">Subtotal (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* DOUBLE SHARING */}
                <tr>
                  <td className="py-2 px-3 font-bold text-slate-800">
                    Double Sharing
                    <span className="text-[10px] font-medium text-slate-400 block">
                      2 Pax/Room
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDoubleRoomsCount(Math.max(0, doubleRoomsCount - 1))}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={doubleRoomsCount}
                        onChange={(e) => setDoubleRoomsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-8 h-6 text-center font-black font-mono border border-slate-200 rounded text-xs focus:border-[#FF4D00] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setDoubleRoomsCount(doubleRoomsCount + 1)}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                    {doubleRoomsCount * 2}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={doubleRate || ""}
                      onChange={(e) => setDoubleRate(e.target.value === "" ? 0 : Number(e.target.value))}
                      className="w-20 h-6 text-right font-mono font-bold border border-slate-200 rounded px-1.5 text-xs focus:border-[#FF4D00] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                    ₹{(doubleRoomsCount * 2 * doubleRate * nightsCount).toLocaleString("en-IN")}
                  </td>
                </tr>

                {/* TRIPLE SHARING */}
                <tr>
                  <td className="py-2 px-3 font-bold text-slate-800">
                    Triple Sharing
                    <span className="text-[10px] font-medium text-slate-400 block">
                      3 Pax/Room
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTripleRoomsCount(Math.max(0, tripleRoomsCount - 1))}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={tripleRoomsCount}
                        onChange={(e) => setTripleRoomsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-8 h-6 text-center font-black font-mono border border-slate-200 rounded text-xs focus:border-[#FF4D00] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setTripleRoomsCount(tripleRoomsCount + 1)}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                    {tripleRoomsCount * 3}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={tripleRate || ""}
                      onChange={(e) => setTripleRate(e.target.value === "" ? 0 : Number(e.target.value))}
                      className="w-20 h-6 text-right font-mono font-bold border border-slate-200 rounded px-1.5 text-xs focus:border-[#FF4D00] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                    ₹{(tripleRoomsCount * 3 * tripleRate * nightsCount).toLocaleString("en-IN")}
                  </td>
                </tr>

                {/* QUAD SHARING */}
                <tr>
                  <td className="py-2 px-3 font-bold text-slate-800">
                    Quad Sharing
                    <span className="text-[10px] font-medium text-slate-400 block">
                      4 Pax/Room
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuadRoomsCount(Math.max(0, quadRoomsCount - 1))}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={quadRoomsCount}
                        onChange={(e) => setQuadRoomsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-8 h-6 text-center font-black font-mono border border-slate-200 rounded text-xs focus:border-[#FF4D00] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuadRoomsCount(quadRoomsCount + 1)}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                    {quadRoomsCount * 4}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={quadRate || ""}
                      onChange={(e) => setQuadRate(e.target.value === "" ? 0 : Number(e.target.value))}
                      className="w-20 h-6 text-right font-mono font-bold border border-slate-200 rounded px-1.5 text-xs focus:border-[#FF4D00] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                    ₹{(quadRoomsCount * 4 * quadRate * nightsCount).toLocaleString("en-IN")}
                  </td>
                </tr>

                {/* EXTRA MATTRESS */}
                <tr>
                  <td className="py-2 px-3 font-bold text-slate-600">
                    Extra Mattress
                    <span className="text-[10px] font-medium text-slate-400 block">
                      1 Bed/Pax
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-slate-400">—</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExtraPersonsCount(Math.max(0, extraPersonsCount - 1))}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={extraPersonsCount}
                        onChange={(e) => setExtraPersonsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-8 h-6 text-center font-black font-mono border border-slate-200 rounded text-xs focus:border-[#FF4D00] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setExtraPersonsCount(extraPersonsCount + 1)}
                        className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={extraBedRate || ""}
                      onChange={(e) => setExtraBedRate(e.target.value === "" ? 0 : Number(e.target.value))}
                      className="w-20 h-6 text-right font-mono font-bold border border-slate-200 rounded px-1.5 text-xs focus:border-[#FF4D00] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                    ₹{(extraPersonsCount * extraBedRate * nightsCount).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 4: COST SUMMARY */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#FF4D00]/5/70 border border-[#FF4D00]/30 p-3 rounded-lg mb-1">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Total Stay Cost</span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-lg font-black text-slate-900 font-mono">
                  ₹{calculatedCosts.grandTotal.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({paxCapacityCovered} Persons Allocated)
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Calculation Mode</span>
              <span className="text-xs font-black text-[#FF4D00] uppercase tracking-wider">Per Person</span>
            </div>
          </div>

          {/* SECTION 5: REMARKS */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
              Remarks / Special Instructions
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Early check-in requested, MAP meal plan..."
              className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-white text-slate-900 focus:outline-none focus:border-[#FF4D00]"
            />
          </div>
        </div>

        {/* STICKY FOOTER — always visible; safe-area so Save isn't flush against the home indicator */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-auto shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveStayAssignment}
            disabled={isSaving}
            className="px-4 sm:px-5 py-2 rounded-lg text-xs font-black bg-[#FF4D00] hover:bg-[#E04400] text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 min-w-0"
          >
            {isSaving ? "Saving Assignment..." : "Save Stay Assignment"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

