/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Bus,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Phone,
  MapPin,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { opsService, OpsDayItinerary } from "@/services/ops.service";
import api from "@/services/api";
import TripControlRowDrawer, { TripControlRowData } from "./TripControlRowDrawer";
import { TripControlMealsCell } from "./TripControlMeals";
import { findHotelForDay } from "@/utils/accommodationCalculator";
import { vendorPayoutExportStatus } from "@/utils/departure/opsVendorStatus";
import { listActiveAssignedGuides } from "@/utils/departure/guideAssignments";
import { pickOpsDayRow } from "@/utils/departure/opsDayItineraryMatch";
import {
  compactMealSummary,
  formatDayMeals,
  matchMenuToStay,
  opsOnlyRemark,
  parseVendorFoodMenu,
  titleCaseMealPlan,
  VendorMenuSource,
} from "@/utils/departure/vendorFoodMenu";

interface DepartureTripControlProps {
  tripId: string;
  departureDateStr: string;
  tripDetails: any;
  computedItinerary: any[];
  tripVendors: any[];
  opsHotels: any[];
  allocFleet: any[];
  dbGuides: any[];
  totalPax: number;
  onEditHotel: (row: any) => void;
  onOpenTransportModal: () => void;
  onOpenGuideModal: () => void;
}

function formatOpsLabel(status: string) {
  switch (status) {
    case "CHECKED-IN":
      return "Checked in";
    case "NOT REQUIRED":
      return "Not required";
    case "NOT ASSIGNED":
      return "Not assigned";
    case "BOOKED":
      return "Booked";
    case "PENDING":
      return "Pending";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function statusTone(status: string) {
  if (status === "BOOKED" || status === "CHECKED-IN") {
    return "bg-[#F4F7FB] text-[#0B1528]";
  }
  if (status === "CANCELLED") {
    return "bg-red-50 text-red-700";
  }
  return "bg-white text-slate-500";
}

function OpsStatusMenu({
  heading,
  value,
  onPick,
}: {
  heading: string;
  value: string;
  onPick: (status: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer hover:shadow-xs",
            statusTone(value),
            value === "BOOKED" || value === "CONFIRMED"
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              : value === "CANCELLED"
                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                : value === "NOT REQUIRED"
                  ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
          )}
        >
          <span>{formatOpsLabel(value)}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36 text-xs bg-white shadow-lg border border-slate-200 rounded-lg p-1 z-50">
        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
          {heading}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onPick("BOOKED")} className="text-green-700 font-semibold cursor-pointer px-2 py-1.5 rounded hover:bg-green-50 text-xs">
          Booked
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("CONFIRMED")} className="text-blue-700 font-semibold cursor-pointer px-2 py-1.5 rounded hover:bg-blue-50 text-xs">
          Confirmed
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("CHECKED-IN")} className="text-purple-700 font-semibold cursor-pointer px-2 py-1.5 rounded hover:bg-purple-50 text-xs">
          Checked in
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("PENDING")} className="text-amber-700 font-semibold cursor-pointer px-2 py-1.5 rounded hover:bg-amber-50 text-xs">
          Pending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("NOT REQUIRED")} className="text-slate-600 font-semibold cursor-pointer px-2 py-1.5 rounded hover:bg-slate-100 text-xs">
          Not required
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick("CANCELLED")} className="text-red-700 font-semibold cursor-pointer px-2 py-1.5 rounded hover:bg-red-50 text-xs">
          Cancelled
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DepartureTripControl({
  tripId,
  departureDateStr,
  tripDetails,
  computedItinerary,
  tripVendors,
  opsHotels,
  allocFleet,
  dbGuides,
  totalPax,
  onEditHotel,
  onOpenTransportModal,
  onOpenGuideModal,
}: DepartureTripControlProps) {
  const [selectedRow, setSelectedRow] = useState<TripControlRowData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loadingDbItinerary, setLoadingDbItinerary] = useState(false);

  // Live database day itinerary items (persisted check-ins, remarks, pax)
  const [dbDayItineraries, setDbDayItineraries] = useState<OpsDayItinerary[]>([]);
  const [directoryVendors, setDirectoryVendors] = useState<any[]>([]);
  const [hotelVendors, setHotelVendors] = useState<any[]>([]);

  // User-selected status overrides for each day (persisted in DB and LocalStorage)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, { hotelStatus?: string; transportStatus?: string; checkInStatus?: string }>
  >({});
  const [itineraryLoadError, setItineraryLoadError] = useState(false);

  // Fetch DB day itinerary records on mount/change
  const loadDbItinerary = async () => {
    try {
      setLoadingDbItinerary(true);
      setItineraryLoadError(false);
      const res = await opsService.getDayItinerary(tripId, departureDateStr);
      if (Array.isArray(res)) {
        setDbDayItineraries(res);
      }
    } catch (_err) {
      setItineraryLoadError(true);
    } finally {
      setLoadingDbItinerary(false);
    }
  };

  const mergeSavedDay = (saved: OpsDayItinerary | undefined) => {
    if (!saved) return;
    setDbDayItineraries((prev) => {
      const rest = prev.filter((d) => d.id && saved.id ? d.id !== saved.id : true);
      return [...rest, saved];
    });
  };

  const persistDayRow = async (row: TripControlRowData, patch: Partial<OpsDayItinerary>) => {
    const saved = await opsService.upsertDayItinerary(
      tripId,
      {
        id: row.itineraryId,
        date: row.dateStr,
        dayTitle: row.dayLabel,
        paxCount: row.paxCount,
        hotelName: row.hotelName,
        remarks: row.remark,
        ...patch,
      },
      departureDateStr,
    );
    mergeSavedDay(saved);
    return saved;
  };

  useEffect(() => {
    if (tripId) {
      loadDbItinerary();
    }
  }, [tripId, departureDateStr]);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    api
      .get(`/vendors/directory?tripId=${encodeURIComponent(tripId)}&limit=200`)
      .then((res) => {
        if (cancelled) return;
        setDirectoryVendors(res.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setDirectoryVendors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    const ids = [
      ...new Set(
        (opsHotels || [])
          .map((h: any) => h.vendorId || h.vendor?.id || h.vendorCode || h.vendor?.vendorCode)
          .filter(Boolean)
          .map(String),
      ),
    ];
    if (ids.length === 0) {
      setHotelVendors([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      ids.map((id) =>
        api
          .get(`/vendors/directory/${id}`)
          .then((res) => res.data?.data)
          .catch(() => null),
      ),
    ).then((rows) => {
      if (!cancelled) setHotelVendors(rows.filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [opsHotels]);

  const vendorMenus = useMemo<VendorMenuSource[]>(() => {
    const list: VendorMenuSource[] = [];
    const seen = new Set<string>();
    const pushMenu = (src: any) => {
      const menu = parseVendorFoodMenu(src);
      if (!menu) return;
      const key = `${menu.vendorId || menu.vendorName}|${menu.items.map((i) => i.name).join(",")}|${menu.mealPlanLabel || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(menu);
    };
    (opsHotels || []).forEach((h: any) => {
      pushMenu(h);
      pushMenu(h.vendor);
    });
    (hotelVendors || []).forEach((v: any) => pushMenu(v));
    (tripVendors || []).forEach((v: any) => pushMenu(v));
    (directoryVendors || []).forEach((v: any) => {
      const t = String(v.type || "").toUpperCase();
      if (
        t.includes("HOTEL") ||
        t.includes("HOMESTAY") ||
        t.includes("CAMP") ||
        t.includes("RESTAURANT") ||
        t.includes("FOOD") ||
        t.includes("MEAL") ||
        t.includes("RESORT") ||
        t.includes("GUEST")
      ) {
        pushMenu(v);
      }
    });
    return list;
  }, [opsHotels, tripVendors, directoryVendors, hotelVendors]);

  // Lead guide info
  const leadGuide = useMemo(() => {
    // Departure-specific assignments take precedence
    const validGuides = listActiveAssignedGuides(dbGuides);
    if (validGuides.length > 0) {
      return { name: validGuides[0].guideName || "Lead Guide", phone: validGuides[0].emergencyContact || "" };
    }
    // Fallback to trip-level vendors
    const lead = tripVendors?.find((v) => v.vendorType === "guide" || v.assignmentType?.includes("GUIDE"));
    if (lead) return { name: lead.name || lead.vendorName || "Lead Guide", phone: lead.phone || lead.emergencyContact || "" };
    return { name: "Assign Guide", phone: "" };
  }, [tripVendors, dbGuides]);

  // Lead transport info
  const leadTransport = useMemo(() => {
    if (allocFleet && allocFleet.length > 0) {
      const lines = allocFleet.map((f: any, idx: number) => {
        const name =
          f.name ||
          f.driverName ||
          `${f.capacity || 14} Seater ${f.vehicleType || "Tempo"} #${idx + 1}`;
        const num = f.vehicleNumber || f.registrationNumber || "";
        const title = num ? `${name} · ${num}` : name;
        return {
          short: `Tempo ${idx + 1}`,
          title,
        };
      });
      return {
        name: lines.map((l) => l.short).join(" + "),
        lines: lines.map((l) => l.short),
        shortLines: lines,
        phone: allocFleet[0].driverPhone || allocFleet[0].phone || "",
      };
    }
    const tr = tripVendors?.find((v) => v.vendorType === "transport");
    if (tr) {
      const name = tr.name || tr.vendorName || "14 Seater Tempo";
      return { name: "Tempo 1", lines: ["Tempo 1"], shortLines: [{ short: "Tempo 1", title: name }], phone: tr.phone || "" };
    }
    return { name: "Tempo 1", lines: ["Tempo 1"], shortLines: [{ short: "Tempo 1", title: "14 Seater Tempo" }], phone: "" };
  }, [tripVendors, allocFleet]);

  // Build unified live table rows per itinerary day
  const controlRows = useMemo<TripControlRowData[]>(() => {
    return computedItinerary.map((day: any, idx: number) => {
      const dayNum = idx + 1;
      const dateStr = day.date || day.dayDate || departureDateStr;
      const dayLabel = day.day || `Day ${dayNum}`;
      
      // Extract stay location and title from trip itinerary
      const rawStay = (day.stay && day.stay !== "—" && day.stay.trim() !== "") ? day.stay.trim() : "";
      const planTitle = day.plan || day.title || day.location || `Day ${dayNum}`;

      const isNightJourney =
        (rawStay && (
          rawStay.toLowerCase().includes("journey") ||
          rawStay.toLowerCase().includes("train") ||
          rawStay.toLowerCase().includes("night journey") ||
          rawStay.toLowerCase().includes("overnight") ||
          rawStay.toLowerCase().includes("no stay")
        )) ||
        (!rawStay && (
          planTitle.toLowerCase().includes("train journey") ||
          planTitle.toLowerCase().includes("night journey") ||
          planTitle.toLowerCase().includes("overnight train")
        ));

      const isNoStay = !rawStay || rawStay === "—" || isNightJourney;

      // Primary Stay Location: Use rawStay if defined (e.g. "Cochin", "Munnar", "Night Journey"), else fall back to planTitle
      const stayLocation = rawStay
        ? rawStay
        : isNightJourney
        ? "Night Journey"
        : planTitle;

      const destination = stayLocation;
      const paxCount = Number.isFinite(Number(totalPax)) ? Number(totalPax) : 0;

      // Find DB saved row if present
      const dbRow = pickOpsDayRow(dbDayItineraries, dayLabel, dateStr);

      // Match Hotel Assignment for this day using findHotelForDay, opsHotels, and tripVendors
      const stayNorm = stayLocation.toLowerCase().trim();
      const planNorm = planTitle.toLowerCase().trim();

      const realOpsHotels = (opsHotels || []).filter((h: any) => {
        const name = String(h?.hotelName || h?.name || "").trim().toUpperCase();
        return name && name !== "NO_STAY" && name !== "NO STAY" && name !== "—";
      });

      const hotelMatch = isNoStay
        ? null
        : findHotelForDay(dateStr, stayLocation, opsHotels) ||
          realOpsHotels.find((h: any) => {
            const loc = (h.location || h.city || "").toLowerCase().trim();
            const hName = (h.hotelName || h.name || "").toLowerCase().trim();
            return (
              (loc && (stayNorm.includes(loc) || loc.includes(stayNorm) || planNorm.includes(loc))) ||
              (hName && (stayNorm.includes(hName) || hName.includes(stayNorm)))
            );
          }) ||
          tripVendors.find((v: any) => {
            if (v.vendorType !== "hotel") return false;
            const vName = String(v.name || v.vendorName || "").trim().toUpperCase();
            if (vName === "NO_STAY" || vName === "NO STAY" || vName === "—") return false;
            const vLoc = (v.location || "").toLowerCase().trim();
            const vNameLower = (v.name || v.vendorName || "").toLowerCase();
            return (
              (vLoc && (stayNorm.includes(vLoc) || vLoc.includes(stayNorm) || planNorm.includes(vLoc))) ||
              (vNameLower && (stayNorm.includes(vNameLower) || vNameLower.includes(stayNorm)))
            );
          });

      let rawHotelName = hotelMatch ? (hotelMatch.hotelName || hotelMatch.name || "") : "";
      if (rawHotelName.toUpperCase() === "NO_STAY" || rawHotelName.toUpperCase() === "NO STAY") {
        rawHotelName = "";
      }

      let hotelName = isNoStay
        ? "— (Night Journey)"
        : rawHotelName
          ? rawHotelName
          : "—";

      let hotelPhone = hotelMatch?.phone || hotelMatch?.hotelPhone || "";

      // Check status overrides (local + DB sync)
      const overrideKey = `${tripId}_${departureDateStr}_day_${dayNum}`;
      const rowOverride = statusOverrides[overrideKey] || statusOverrides[`day_${dayNum}`];

      // Derive hotel status
      let hotelStatus: "BOOKED" | "CONFIRMED" | "CHECKED-IN" | "PENDING" | "CANCELLED" | "NOT REQUIRED" =
        (rowOverride?.hotelStatus as any) ||
        (isNoStay
          ? "NOT REQUIRED"
          : dbRow?.hotelVerified
            ? "CONFIRMED"
            : rawHotelName
              ? "BOOKED"
              : "PENDING");

      // Check if this day is a train transit day where transport & guide are not required by default
      const isTrainTransitDay =
        (dayNum === 1 && (planTitle.toLowerCase().includes("train") || planTitle.toLowerCase().includes("journey"))) ||
        (dayNum === computedItinerary.length && (planTitle.toLowerCase().includes("arrive") || planTitle.toLowerCase().includes("train")));

      // Match Transport
      let transportName = "—";
      let transportStatus: "BOOKED" | "CONFIRMED" | "CHECKED-IN" | "PENDING" | "NOT REQUIRED" | "NOT ASSIGNED" | "CANCELLED" =
        (rowOverride?.transportStatus as any) || "NOT REQUIRED";

      if (dbRow?.vehicleType) {
        if (dbRow.vehicleType === "—" || dbRow.vehicleType.toLowerCase().includes("not required") || dbRow.vehicleType.toLowerCase().includes("none")) {
          transportName = "—";
          if (!rowOverride?.transportStatus) transportStatus = "NOT REQUIRED";
        } else {
          transportName = dbRow.vehicleType;
          if (!rowOverride?.transportStatus) transportStatus = dbRow.vehicleVerified ? "CONFIRMED" : "BOOKED";
        }
      } else {
        if (isTrainTransitDay) {
          transportName = "—";
          if (!rowOverride?.transportStatus) transportStatus = "NOT REQUIRED";
        } else {
          transportName = leadTransport.name !== "—" ? leadTransport.name : "—";
          if (!rowOverride?.transportStatus) transportStatus = "BOOKED";
        }
      }

      const transportShortLines =
        transportName === "—" || transportStatus === "NOT REQUIRED"
          ? []
          : leadTransport.shortLines && leadTransport.shortLines.length > 0
            ? leadTransport.shortLines
            : [{ short: "Tempo 1", title: transportName }];

      const transportLines = transportShortLines.map((l: any) => l.short);

      // Match Guide
      let guideName = "—";
      let guidePhone = "";
      let guideStatus: "BOOKED" | "CONFIRMED" | "CHECKED-IN" | "PENDING" | "NOT REQUIRED" | "NOT ASSIGNED" = "NOT REQUIRED";

      if (dbRow?.guideDriverDetails) {
        if (dbRow.guideDriverDetails === "—" || dbRow.guideDriverDetails.toLowerCase().includes("not required") || dbRow.guideDriverDetails.toLowerCase().includes("none")) {
          guideName = "—";
          guidePhone = "";
          guideStatus = "NOT REQUIRED";
        } else {
          guideName = dbRow.guideDriverDetails;
          guidePhone = leadGuide.name && leadGuide.name.toLowerCase().includes(dbRow.guideDriverDetails.toLowerCase()) ? leadGuide.phone : "";
          guideStatus = dbRow.guideVerified ? "CONFIRMED" : "BOOKED";
        }
      } else {
        if (isTrainTransitDay) {
          guideName = "—";
          guidePhone = "";
          guideStatus = "NOT REQUIRED";
        } else {
          guideName = leadGuide.name !== "—" ? leadGuide.name : "Lead Guide";
          guidePhone = leadGuide.phone || "";
          guideStatus = "BOOKED";
        }
      }

      // Check-in status (from DB row if updated, or default)
      let defaultCheckIn: "CHECKED-IN" | "PENDING" | "NOT REQUIRED" = isNoStay
        ? "NOT REQUIRED"
        : hotelMatch
        ? "CHECKED-IN"
        : "PENDING";

      const currentCheckIn: "CHECKED-IN" | "PENDING" | "NOT REQUIRED" =
        (rowOverride?.checkInStatus as any) ||
        (dbRow?.checkInDone !== undefined
          ? (dbRow.checkInDone ? "CHECKED-IN" : "PENDING")
          : defaultCheckIn);

      const currentRemark = opsOnlyRemark(dbRow?.remarks, day.sub);
      const displayRemark = currentRemark;
      const itineraryMeals =
        day.meals && day.meals !== "—"
          ? String(day.meals)
          : String(hotelMatch?.mealPlan || hotelMatch?.mealPlanType || "").trim();
      const mealMenu = isNoStay
        ? null
        : matchMenuToStay(
            vendorMenus,
            rawHotelName || hotelName,
            stayLocation,
            hotelMatch?.vendorId ||
              hotelMatch?.vendor?.id ||
              hotelMatch?.vendorCode ||
              hotelMatch?.vendor?.vendorCode,
          );
      const dayMeals = formatDayMeals(mealMenu, itineraryMeals);
      const mealSummary = compactMealSummary(mealMenu, itineraryMeals);
      const mealPlanLabel = titleCaseMealPlan(itineraryMeals);

      return {
        dayNum,
        itineraryId: dbRow?.id,
        dateStr,
        dayLabel,
        destination,
        planTitle,
        isNightJourney,
        paxCount,
        hotelName,
        hotelPhone,
        hotelStatus,
        hotelBookingRef: hotelMatch,
        transportName: transportShortLines.map((l: any) => l.short).join(" + ") || transportName,
        transportLines,
        transportShortLines,
        transportPhone: leadTransport.phone || "",
        transportStatus,
        guideName,
        guidePhone,
        guideStatus,
        checkInStatus: currentCheckIn,
        remark: currentRemark,
        remarkDisplay: displayRemark,
        mealSummary,
        mealMenu,
        mealPlanLabel,
        mealGroups: dayMeals.groups,
        mealSource: dayMeals.source,
      };
    });
  }, [computedItinerary, opsHotels, tripVendors, totalPax, leadTransport, leadGuide, dbDayItineraries, statusOverrides, departureDateStr, vendorMenus]);

  // Unified Payment Rows Extractor for all Export Formats (Excel, PDF, CSV, Google Sheets)
  const getPaymentRowsForExport = () => {
    const rows: { date: string; service: string; paymentDate: string; total: number; paid: number; due: number; status: string; remark: string }[] = [];

    // 1. Hotel accommodations (filter out NO_STAY and 0 total)
    const hotelCosts = (opsHotels && opsHotels.length > 0 ? opsHotels : (tripVendors || []).filter((v: any) => v.vendorType === "hotel")).filter((h: any) => {
      const name = String(h?.hotelName || h?.name || h?.vendorName || "").trim().toUpperCase();
      return name && name !== "NO_STAY" && name !== "NO STAY" && name !== "—";
    });

    if (hotelCosts.length > 0) {
      hotelCosts.forEach((h: any) => {
        const total = Number(h.totalAmount ?? h.agreedCost ?? 0);
        if (total <= 0) return;
        const paid = Number(h.advancePaid ?? h.paidAmount ?? 0);
        const due = Math.max(0, total - paid);
        const status = vendorPayoutExportStatus({
          total,
          paid,
          due,
          approvalStatus: h.approvalStatus,
          financeVerified: h.financeVerified,
        });
        const hName = h.hotelName || h.name || h.location || "Hotel";
        rows.push({
          date: departureDateStr,
          service: `Stay (${hName})`,
          paymentDate: paid > 0 ? departureDateStr : "—",
          total,
          paid,
          due,
          status,
          remark: h.notes || `Hotel stay accommodation costing for ${h.location || hName}`,
        });
      });
    }

    // 2. Transport Fleet
    const effectiveFleetItems = allocFleet && allocFleet.length > 0 ? allocFleet : (tripVendors || []).filter((v: any) => v.vendorType === "transport");
    if (effectiveFleetItems.length > 0) {
      effectiveFleetItems.forEach((t: any, idx: number) => {
        const total = Number(t.cost ?? t.agreedCost ?? t.totalAmount ?? 0);
        if (total <= 0) return;
        const paid = Number(t.paidAmount ?? t.advancePaid ?? 0);
        const due = Math.max(0, total - paid);
        const status = vendorPayoutExportStatus({
          total,
          paid,
          due,
          approvalStatus: t.approvalStatus,
          financeVerified: t.financeVerified,
        });
        const cap = t.capacity || 14;
        const vType = t.vehicleType || "Tempo Traveller";
        const vTitle = t.name || t.driverName || `Tempo #${idx + 1}`;
        rows.push({
          date: departureDateStr,
          service: `Tempo (${vTitle})`,
          paymentDate: paid > 0 ? departureDateStr : "—",
          total,
          paid,
          due,
          status,
          remark: t.notes || `${cap} Seater ${vType} fleet rental`,
        });
      });
    }

    // 3. Guides & Trek Leaders
    const activeDbGuides = (dbGuides || []).filter((g: any) => g.assignmentStatus !== "CANCELLED" && g.status !== "CANCELLED");

    if (activeDbGuides.length > 0) {
      activeDbGuides.forEach((g: any) => {
        const total = Number(g.agreedAmount ?? g.agreedCost ?? 0);
        if (total <= 0) return;
        const paid = Number(g.advancePaid ?? g.paidAmount ?? 0);
        const due = Math.max(0, total - paid);
        const status = vendorPayoutExportStatus({
          total,
          paid,
          due,
          approvalStatus: g.approvalStatus,
          financeVerified: g.financeVerified,
        });

        let label = `Guide (${g.guideName || g.name || "Lead Guide"})`;
        if (g.assignmentType === "EXPENSE_FOOD") {
          label = `Guide (Meal Allowance)`;
        } else if (g.assignmentType === "EXPENSE_TRANSPORTATION") {
          label = `Guide (Transit / Travel Expense)`;
        }

        const days = Number(g.daysWorked) || 0;
        let remark = g.notes || "";
        if (!remark) {
          if (days > 0 && total > 0) {
            remark = `(${days} days × ₹${Math.round(total / days)}/day = ₹${total})`;
          } else if (g.assignmentType === "TRIP_LEADER") {
            remark = `Trip Leader departure stipend`;
          } else if (g.assignmentType === "ASSISTANT_GUIDE") {
            remark = `Assistant Guide departure stipend`;
          } else {
            remark = `Guide services for departure`;
          }
        }

        rows.push({
          date: departureDateStr,
          service: label,
          paymentDate: paid > 0 ? departureDateStr : "—",
          total,
          paid,
          due,
          status,
          remark,
        });
      });
    } else {
      const guideCosts = (tripVendors || []).filter((v: any) => v.vendorType === "guide");
      if (guideCosts.length > 0) {
        guideCosts.forEach((g: any) => {
          const total = Number(g.agreedCost ?? g.agreedAmount ?? 0);
          if (total <= 0) return;
          const paid = Number(g.paidAmount ?? g.advancePaid ?? 0);
          const due = Math.max(0, total - paid);
          const status = vendorPayoutExportStatus({
            total,
            paid,
            due,
            approvalStatus: g.approvalStatus,
            financeVerified: g.financeVerified,
          });
          rows.push({
            date: departureDateStr,
            service: `Guide (${g.name || "Lead Guide"})`,
            paymentDate: paid > 0 ? departureDateStr : "—",
            total,
            paid,
            due,
            status,
            remark: g.notes || `Guide charges for departure`,
          });
        });
      }
    }

    return rows;
  };

  // 1. EXCEL EXPORT (.xlsx)
  const handleExportExcel = () => {
    try {
      const tripTitle = tripDetails?.title || tripId || `Departure (${departureDateStr})`;
      const totalPersons = Number.isFinite(Number(totalPax)) ? Number(totalPax) : 0;

      const excelData: any[][] = [];
      excelData.push([`${departureDateStr} ${tripTitle.toUpperCase()}`]);
      excelData.push([]);
      excelData.push([
        "DATE",
        "STAY",
        "NO. OF PAX",
        "HOTEL NAME",
        "VERIFY",
        "TEMPO",
        "VERIFY",
        "REMARK",
        "Guide/ Driver Details",
        "Hotel Check in Update",
      ]);

      controlRows.forEach((r) => {
        excelData.push([
          r.dateStr,
          r.destination,
          r.paxCount,
          r.hotelName + (r.hotelPhone ? ` ${r.hotelPhone}` : ""),
          r.hotelStatus,
          r.transportName,
          r.transportStatus,
          r.remark || "",
          r.guideName + (r.guidePhone ? ` ${r.guidePhone}` : ""),
          r.checkInStatus === "CHECKED-IN" ? "✓" : r.checkInStatus === "PENDING" ? "Pending" : "N/A",
        ]);
      });

      excelData.push([]);
      excelData.push([]);
      excelData.push([`TRIP PAYMENT DETAILS FOR ${tripTitle.toUpperCase()} (${totalPersons} Persons)`]);
      excelData.push([]);
      excelData.push([
        "Date",
        "Activity / Service Provided",
        "Payment Date",
        "Total Amount (₹)",
        "Amount Paid (₹)",
        "Due Amount (₹)",
        "Amount Paid/Due",
        "Remark",
      ]);

      const paymentRows = getPaymentRowsForExport();
      paymentRows.forEach((p) => {
        excelData.push([p.date, p.service, p.paymentDate, p.total, p.paid, p.due, p.status, p.remark]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      ws["!cols"] = [
        { wch: 16 },
        { wch: 28 },
        { wch: 14 },
        { wch: 28 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 35 },
        { wch: 24 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Trip Control");

      const fileName = `Trip_Control_Sheet_${tripId}_${departureDateStr.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Exported Trip Control Sheet (.xlsx) successfully!");
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel sheet: " + err.message);
    }
  };

  // 2. PRINTABLE PDF EXPORT (.pdf)
  const handleExportPDF = () => {
    try {
      const tripTitle = tripDetails?.title || tripId || `Departure (${departureDateStr})`;
      const totalPersons = Number.isFinite(Number(totalPax)) ? Number(totalPax) : 0;
      const paymentRows = getPaymentRowsForExport();

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups to open the PDF Print document.");
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Trip_Control_Sheet_${tripId}_${departureDateStr}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #FF4D00; padding-bottom: 8px; margin-bottom: 12px; }
            .logo { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
            .logo span { color: #FF4D00; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 10px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .meta-val { font-weight: 700; color: #0f172a; margin-top: 2px; }
            h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 12px 0 6px 0; border-left: 3px solid #FF4D00; padding-left: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; }
            th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 8px; font-weight: 800; padding: 6px 4px; text-align: left; border: 1px solid #0f172a; }
            td { border: 1px solid #cbd5e1; padding: 5px 4px; vertical-align: middle; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; text-align: center; }
            .badge-booked { background: #dcfce7; color: #15803d; }
            .badge-pending { background: #fef3c7; color: #b45309; }
            .badge-na { background: #f1f5f9; color: #64748b; }
            .footer { margin-top: 16px; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">YOUTH<span>CAMPING</span> OS</div>
              <div style="font-size: 9px; color: #64748b; font-weight: 600;">Operational Trip Control Sheet & Payment Manifest</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${tripTitle}</div>
              <div style="font-size: 9px; color: #FF4D00; font-weight: 700;">Departure Date: ${departureDateStr}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-item"><span class="meta-label">Departure Code</span><span class="meta-val">${tripId}</span></div>
            <div class="meta-item"><span class="meta-label">Departure Date</span><span class="meta-val">${departureDateStr}</span></div>
            <div class="meta-item"><span class="meta-label">Total Pax</span><span class="meta-val">${totalPersons} Confirmed Pax</span></div>
            <div class="meta-item"><span class="meta-label">Lead Guide</span><span class="meta-val">${leadGuide.name} ${leadGuide.phone ? `(${leadGuide.phone})` : ""}</span></div>
          </div>

          <h2>1. Operations Control Manifest</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 10%;">Date</th>
                <th style="width: 20%;">Stay / Destination</th>
                <th style="width: 5%; text-align: center;">Pax</th>
                <th style="width: 18%;">Hotel Name</th>
                <th style="width: 10%; text-align: center;">Hotel Status</th>
                <th style="width: 14%;">Fleet / Tempo</th>
                <th style="width: 13%;">Guide / Driver</th>
                <th style="width: 10%; text-align: center;">Check-In</th>
              </tr>
            </thead>
            <tbody>
              ${controlRows.map(r => `
                <tr>
                  <td style="font-weight: 700;">${r.dateStr}</td>
                  <td>${r.destination}</td>
                  <td style="text-align: center; font-weight: 700;">${r.paxCount}</td>
                  <td>${r.hotelName} ${r.hotelPhone ? `<br><small style="color: #64748b;">📞 ${r.hotelPhone}</small>` : ''}</td>
                  <td style="text-align: center;"><span class="badge ${r.hotelStatus === 'BOOKED' ? 'badge-booked' : r.hotelStatus === 'PENDING' ? 'badge-pending' : 'badge-na'}">${r.hotelStatus}</span></td>
                  <td>${r.transportName}</td>
                  <td>${r.guideName} ${r.guidePhone ? `<br><small style="color: #64748b;">📞 ${r.guidePhone}</small>` : ''}</td>
                  <td style="text-align: center;"><span class="badge ${r.checkInStatus === 'CHECKED-IN' ? 'badge-booked' : 'badge-pending'}">${r.checkInStatus}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>2. Trip Payment & Vendor Financial Details</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity / Service</th>
                <th>Payment Date</th>
                <th style="text-align: right;">Total Amount</th>
                <th style="text-align: right;">Amount Paid</th>
                <th style="text-align: right;">Due Amount</th>
                <th style="text-align: center;">Status</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows.map(p => `
                <tr>
                  <td>${p.date}</td>
                  <td style="font-weight: 700;">${p.service}</td>
                  <td>${p.paymentDate}</td>
                  <td style="text-align: right; font-weight: 700;">₹${Number(p.total).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; color: #16a34a;">₹${Number(p.paid).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; color: ${p.due > 0 ? '#dc2626' : '#64748b'}; font-weight: 700;">₹${Number(p.due).toLocaleString('en-IN')}</td>
                  <td style="text-align: center;"><span class="badge ${p.status === 'Paid' ? 'badge-booked' : 'badge-pending'}">${p.status}</span></td>
                  <td style="font-size: 8px; color: #475569;">${p.remark}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generated automatically by YouthCamping OS • Internal Operational Control Document • Confidential
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success("Opened Printable PDF Document! Choose 'Save as PDF' in print dialog.");
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + err.message);
    }
  };

  // 3. COPY GOOGLE SHEETS READY FORMAT (TSV)
  const handleCopyGoogleSheetsTSV = () => {
    try {
      const lines: string[] = [];
      const tripTitle = tripDetails?.title || tripId || `Departure (${departureDateStr})`;
      const paymentRows = getPaymentRowsForExport();

      lines.push(`${departureDateStr} ${tripTitle.toUpperCase()}`);
      lines.push("");
      lines.push(["DATE", "STAY", "NO. OF PAX", "HOTEL NAME", "VERIFY", "TEMPO", "VERIFY", "REMARK", "Guide / Driver Details", "Hotel Check in Update"].join("\t"));

      controlRows.forEach((r) => {
        lines.push([
          r.dateStr,
          r.destination,
          r.paxCount,
          `${r.hotelName} ${r.hotelPhone || ""}`.trim(),
          r.hotelStatus,
          r.transportName,
          r.transportStatus,
          r.remark || "",
          `${r.guideName} ${r.guidePhone || ""}`.trim(),
          r.checkInStatus === "CHECKED-IN" ? "Checked-In" : "Pending",
        ].join("\t"));
      });

      lines.push("");
      lines.push("");
      lines.push(`TRIP PAYMENT DETAILS FOR ${tripTitle.toUpperCase()}`);
      lines.push("");
      lines.push(["Date", "Activity / Service Provided", "Payment Date", "Total Amount (₹)", "Amount Paid (₹)", "Due Amount (₹)", "Status", "Remark"].join("\t"));

      paymentRows.forEach((p) => {
        lines.push([p.date, p.service, p.paymentDate, p.total, p.paid, p.due, p.status, p.remark].join("\t"));
      });

      const tsvData = lines.join("\n");
      navigator.clipboard.writeText(tsvData);
      toast.success("Copied Google Sheets format! Open Google Sheets and press Ctrl+V to paste.");
    } catch (err: any) {
      toast.error("Failed to copy data: " + err.message);
    }
  };

  // 4. OPEN GOOGLE SHEETS & COPY FORMAT
  const handleOpenGoogleSheets = () => {
    handleCopyGoogleSheetsTSV();
    window.open("https://sheet.new", "_blank");
  };

  // 5. CSV EXPORT (.csv)
  const handleExportCSV = () => {
    try {
      const lines: string[] = [];
      const tripTitle = tripDetails?.title || tripId || `Departure (${departureDateStr})`;
      const paymentRows = getPaymentRowsForExport();

      const formatCell = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

      lines.push(formatCell(`${departureDateStr} ${tripTitle.toUpperCase()}`));
      lines.push("");
      lines.push(["DATE", "STAY", "NO. OF PAX", "HOTEL NAME", "VERIFY", "TEMPO", "VERIFY", "REMARK", "Guide / Driver Details", "Hotel Check in Update"].map(formatCell).join(","));

      controlRows.forEach((r) => {
        lines.push([
          r.dateStr,
          r.destination,
          r.paxCount,
          `${r.hotelName} ${r.hotelPhone || ""}`.trim(),
          r.hotelStatus,
          r.transportName,
          r.transportStatus,
          r.remark || "",
          `${r.guideName} ${r.guidePhone || ""}`.trim(),
          r.checkInStatus === "CHECKED-IN" ? "Checked-In" : "Pending",
        ].map(formatCell).join(","));
      });

      lines.push("");
      lines.push("");
      lines.push(formatCell(`TRIP PAYMENT DETAILS FOR ${tripTitle.toUpperCase()}`));
      lines.push("");
      lines.push(["Date", "Activity / Service Provided", "Payment Date", "Total Amount (₹)", "Amount Paid (₹)", "Due Amount (₹)", "Status", "Remark"].map(formatCell).join(","));

      paymentRows.forEach((p) => {
        lines.push([p.date, p.service, p.paymentDate, p.total, p.paid, p.due, p.status, p.remark].map(formatCell).join(","));
      });

      const csvContent = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Trip_Control_Sheet_${tripId}_${departureDateStr.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exported CSV file successfully!");
    } catch (err: any) {
      toast.error("Failed to export CSV: " + err.message);
    }
  };

  const handleRowClick = (row: TripControlRowData) => {
    setSelectedRow(row);
    setIsDrawerOpen(true);
  };

  // Toggle check-in state & persist to Database via opsService
  const handleToggleCheckIn = async (row: TripControlRowData, newStatus: "CHECKED-IN" | "PENDING" | "NOT REQUIRED") => {
    const isCheckedIn = newStatus === "CHECKED-IN";
    try {
      await persistDayRow(row, {
        checkInDone: isCheckedIn,
        remarks: row.remark,
      });
      toast.success(`Check-in for ${row.dayLabel} set to ${newStatus} (Saved to DB)`);
    } catch (err: any) {
      toast.error("Failed to persist check-in to database");
    }

    if (selectedRow && selectedRow.dayNum === row.dayNum) {
      setSelectedRow({ ...selectedRow, checkInStatus: newStatus });
    }
  };

  // Save operational remark & persist to Database via opsService
  const handleSaveRemark = async (row: TripControlRowData, remark: string) => {
    try {
      const saved = await persistDayRow(row, {
        remarks: remark,
        checkInDone: row.checkInStatus === "CHECKED-IN",
      });
      toast.success(`Saved operational remark for ${row.dayLabel}`);
      setSelectedRow((prev) =>
        prev && prev.dayNum === row.dayNum
          ? { ...prev, remark, remarkDisplay: remark, itineraryId: saved?.id || prev.itineraryId }
          : prev,
      );
    } catch (err: any) {
      toast.error("Failed to save remark to database");
    }
  };

  const handleSaveDayDetail = async (row: TripControlRowData, field: "vehicleType" | "guideDriverDetails", value: string) => {
    try {
      await persistDayRow(row, {
        [field]: value,
      } as Partial<OpsDayItinerary>);
      toast.success(`Saved ${field === "vehicleType" ? "transport" : "guide"} details for ${row.dayLabel}`);
    } catch (err: any) {
      toast.error("Failed to save details to database");
    }

    if (selectedRow && selectedRow.dayNum === row.dayNum) {
      const isNotReq = value === "—" || value.toLowerCase().includes("not required");
      if (field === "vehicleType") {
        setSelectedRow({ 
          ...selectedRow, 
          transportName: isNotReq ? "—" : value,
          transportStatus: isNotReq ? "NOT REQUIRED" : "BOOKED"
        });
      } else {
        setSelectedRow({ 
          ...selectedRow, 
          guideName: isNotReq ? "—" : value,
          guideStatus: isNotReq ? "NOT REQUIRED" : "BOOKED"
        });
      }
    }
  };

  // Direct Hotel Status Switcher Handler
  const handleUpdateHotelStatus = async (row: TripControlRowData, newStatus: string) => {
    const overrideKey = `${tripId}_${departureDateStr}_day_${row.dayNum}`;
    setStatusOverrides((prev) => {
      const updated = {
        ...prev,
        [overrideKey]: { ...(prev[overrideKey] || {}), hotelStatus: newStatus },
        [`day_${row.dayNum}`]: { ...(prev[`day_${row.dayNum}`] || {}), hotelStatus: newStatus },
      };
      try {
        localStorage.setItem(`trip_control_status_${tripId}_${departureDateStr}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedRow && selectedRow.dayNum === row.dayNum) {
      setSelectedRow((prev) => prev ? { ...prev, hotelStatus: newStatus as any } : null);
    }

    try {
      const isNotRequired = newStatus === "NOT REQUIRED";
      const isCheckedIn = newStatus === "CHECKED-IN";
      const isCancelled = newStatus === "CANCELLED";
      const isConfirmed = newStatus === "CONFIRMED" || newStatus === "BOOKED";
      const hotelVal = isNotRequired ? "— (Not Required)" : isCancelled ? "— (Cancelled)" : row.hotelName !== "—" ? row.hotelName : "—";

      await persistDayRow(row, {
        hotelName: hotelVal,
        hotelVerified: isConfirmed || isCheckedIn,
        checkInDone: isCheckedIn ? true : isNotRequired || isCancelled ? false : row.checkInStatus === "CHECKED-IN",
        remarks: row.remark,
      });
      toast.success(`Hotel status for ${row.dayLabel} set to "${formatOpsLabel(newStatus)}"`);
    } catch (err: any) {
      toast.error("Failed to update hotel status in database");
    }
  };

  // Direct Transport Status Switcher Handler
  const handleUpdateTransportStatus = async (row: TripControlRowData, newStatus: string) => {
    const overrideKey = `${tripId}_${departureDateStr}_day_${row.dayNum}`;
    setStatusOverrides((prev) => {
      const updated = {
        ...prev,
        [overrideKey]: { ...(prev[overrideKey] || {}), transportStatus: newStatus },
        [`day_${row.dayNum}`]: { ...(prev[`day_${row.dayNum}`] || {}), transportStatus: newStatus },
      };
      try {
        localStorage.setItem(`trip_control_status_${tripId}_${departureDateStr}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedRow && selectedRow.dayNum === row.dayNum) {
      setSelectedRow((prev) => prev ? { ...prev, transportStatus: newStatus as any } : null);
    }

    try {
      const isNotRequired = newStatus === "NOT REQUIRED";
      const isCancelled = newStatus === "CANCELLED";
      const defaultTrans = leadTransport.name !== "—" ? leadTransport.name : "—";
      const vehicleVal = isNotRequired ? "— (Not Required)" : isCancelled ? "— (Cancelled)" : (row.transportName !== "—" ? row.transportName : defaultTrans);

      await persistDayRow(row, {
        vehicleType: vehicleVal,
        vehicleVerified: newStatus === "BOOKED" || newStatus === "CONFIRMED" || newStatus === "CHECKED-IN",
      });
      toast.success(`Transport status for ${row.dayLabel} set to "${formatOpsLabel(newStatus)}"`);
    } catch (err: any) {
      toast.error("Failed to update transport status in database");
    }
  };

  // Direct Guide Status Switcher Handler
  const handleUpdateGuideStatus = async (row: TripControlRowData, newStatus: string) => {
    const overrideKey = `${tripId}_${departureDateStr}_day_${row.dayNum}`;
    setStatusOverrides((prev) => {
      const updated = {
        ...prev,
        [overrideKey]: { ...(prev[overrideKey] || {}), checkInStatus: newStatus },
        [`day_${row.dayNum}`]: { ...(prev[`day_${row.dayNum}`] || {}), checkInStatus: newStatus },
      };
      try {
        localStorage.setItem(`trip_control_status_${tripId}_${departureDateStr}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedRow && selectedRow.dayNum === row.dayNum) {
      setSelectedRow((prev) => prev ? { ...prev, checkInStatus: newStatus as any } : null);
    }

    try {
      const isNotRequired = newStatus === "NOT REQUIRED";
      const defaultG = leadGuide.name !== "—" ? leadGuide.name : "Lead Guide";
      const guideVal = isNotRequired ? "— (Not Required)" : (row.guideName !== "—" ? row.guideName : defaultG);

      await persistDayRow(row, {
        guideDriverDetails: guideVal,
        guideVerified: newStatus === "CHECKED-IN" || newStatus === "BOOKED" || newStatus === "CONFIRMED",
      });
      toast.success(`Guide status for ${row.dayLabel} set to "${formatOpsLabel(newStatus)}"`);
    } catch (err: any) {
      toast.error("Failed to update guide status in database");
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HOTEL_PENDING" | "CHECKIN_PENDING" | "CHECKED_IN" | "TEMPO_PENDING">("ALL");

  // Summary Counters
  const summaryStats = useMemo(() => {
    let checkedIn = 0;
    let pendingHotel = 0;
    let pendingCheckIn = 0;

    controlRows.forEach((r) => {
      if (r.checkInStatus === "CHECKED-IN") checkedIn++;
      if (r.checkInStatus === "PENDING") pendingCheckIn++;
      if (r.hotelStatus === "PENDING") pendingHotel++;
    });

    const pendingTempo = controlRows.filter(
      (r) => r.transportStatus === "PENDING" || r.transportStatus === "NOT ASSIGNED",
    ).length;

    return {
      total: controlRows.length,
      checkedIn,
      pendingHotel,
      pendingCheckIn,
      pendingTempo,
    };
  }, [controlRows]);

  // Filtered rows for live search & filter bar
  const filteredControlRows = useMemo(() => {
    return controlRows.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.dateStr.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.hotelName.toLowerCase().includes(q) ||
        r.transportName.toLowerCase().includes(q) ||
        r.guideName.toLowerCase().includes(q) ||
        (r.mealSummary && r.mealSummary.toLowerCase().includes(q)) ||
        (r.remark && r.remark.toLowerCase().includes(q)) ||
        (r.remarkDisplay && r.remarkDisplay.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === "HOTEL_PENDING") return r.hotelStatus === "PENDING";
      if (statusFilter === "TEMPO_PENDING")
        return r.transportStatus === "PENDING" || r.transportStatus === "NOT ASSIGNED";
      if (statusFilter === "CHECKIN_PENDING") return r.checkInStatus === "PENDING";
      if (statusFilter === "CHECKED_IN") return r.checkInStatus === "CHECKED-IN";

      return true;
    });
  }, [controlRows, searchQuery, statusFilter]);

  const filterChipClass = (active: boolean) =>
    cn(
      "px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap",
      active
        ? "border-[#0B1528] bg-[#0B1528] text-white"
        : "border-[#E8EEF4] bg-white text-slate-600 hover:border-slate-300 hover:text-[#0B1528]",
    );

  return (
    <div className="space-y-3 min-w-0 font-sans text-[#0B1528]">
      <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 sm:p-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-[#0B1528] tracking-tight">
                Trip control sheet
              </h2>
              {loadingDbItinerary && (
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click a row to update hotel, fleet, guide, or check-in.
            </p>
            {itineraryLoadError && (
              <p className="text-[11px] text-red-600 mt-1">
                Trip Control could not load server itinerary. Statuses may be incomplete.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
            <span className="text-[11px] text-slate-500 tabular-nums">
              {summaryStats.checkedIn}/{summaryStats.total} checked in
            </span>
            <span className="hidden sm:inline text-slate-300" aria-hidden>
              ·
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">
              {Number.isFinite(Number(totalPax)) ? `${totalPax} pax` : "pax unknown"}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] font-semibold border-[#E8EEF4] text-[#0B1528] bg-white hover:bg-[#F4F7FB] rounded-md px-2.5 gap-1.5 shadow-none"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Export
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white border border-[#E8EEF4] shadow-lg rounded-lg p-1.5 z-50">
                <DropdownMenuLabel className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                  Export formats
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleExportExcel}
                  className="cursor-pointer flex items-start gap-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FB] rounded-md px-2 py-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>Excel spreadsheet (.xlsx)</span>
                    <span className="text-[10px] font-normal text-slate-400 leading-tight">Operations and payment workbook</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleExportPDF}
                  className="cursor-pointer flex items-start gap-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FB] rounded-md px-2 py-2"
                >
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>Printable PDF (.pdf)</span>
                    <span className="text-[10px] font-normal text-slate-400 leading-tight">Manifest and financial breakdown</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-[#E8EEF4]" />

                <DropdownMenuLabel className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                  Google Sheets
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={handleOpenGoogleSheets}
                  className="cursor-pointer flex items-start gap-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FB] rounded-md px-2 py-2"
                >
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>Open in Google Sheets</span>
                    <span className="text-[10px] font-normal text-slate-400 leading-tight">Copies data and opens a new sheet</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleCopyGoogleSheetsTSV}
                  className="cursor-pointer flex items-start gap-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FB] rounded-md px-2 py-2"
                >
                  <Copy className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>Copy for Google Sheets</span>
                    <span className="text-[10px] font-normal text-slate-400 leading-tight">Paste directly into any sheet</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-[#E8EEF4]" />

                <DropdownMenuItem
                  onClick={handleExportCSV}
                  className="cursor-pointer flex items-start gap-2.5 text-xs font-medium text-slate-700 hover:bg-[#F4F7FB] rounded-md px-2 py-2"
                >
                  <FileCode className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>CSV file (.csv)</span>
                    <span className="text-[10px] font-normal text-slate-400 leading-tight">Standard comma-separated format</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2.5 min-w-0">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <input
              type="text"
              placeholder="Search city, hotel, driver, guide, date…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 pl-8 pr-8 py-1.5 text-xs bg-white border border-[#E8EEF4] rounded-md text-[#0B1528] placeholder:text-slate-400 focus:outline-none focus:border-[#FF4D00] font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={filterChipClass(statusFilter === "ALL")}
            >
              All days ({summaryStats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("HOTEL_PENDING")}
              className={filterChipClass(statusFilter === "HOTEL_PENDING")}
            >
              Pending hotel ({summaryStats.pendingHotel})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("TEMPO_PENDING")}
              className={filterChipClass(statusFilter === "TEMPO_PENDING")}
            >
              Pending tempo ({summaryStats.pendingTempo})
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                <th className="py-2.5 px-3.5 w-28">Date</th>
                <th className="py-2.5 px-3.5 w-36">Stay</th>
                <th className="py-2.5 px-3.5 w-12 text-center">Pax</th>
                <th className="py-2.5 px-3.5 w-44">Hotel</th>
                <th className="py-2.5 px-3.5 w-28">Transport</th>
                <th className="py-2.5 px-3.5 w-44">Meals</th>
                <th className="py-2.5 px-3.5 w-40">Guide</th>
                <th className="py-2.5 px-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF4] text-slate-700">
              {filteredControlRows.length > 0 ? (
                filteredControlRows.map((row) => (
                  <tr
                    key={row.dayNum}
                    onClick={() => handleRowClick(row)}
                    className="hover:bg-[#F8FAFC] cursor-pointer group"
                  >
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#0B1528] tabular-nums w-5 shrink-0">
                          {String(row.dayNum).padStart(2, "0")}
                        </span>
                        <span className="font-medium text-[#0B1528] text-[12px] tabular-nums">
                          {row.dateStr}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="flex items-start gap-1.5 min-w-0">
                        {row.isNightJourney ? (
                          <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-[#0B1528]">
                            {row.destination}
                          </span>
                          {row.planTitle && row.planTitle.toLowerCase() !== row.destination.toLowerCase() && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                              {row.planTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <span className="text-[12px] font-medium text-[#0B1528] tabular-nums">
                        {row.paxCount}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 align-top">
                      <div className="font-medium text-[#0B1528] leading-snug whitespace-normal break-words">
                        {row.hotelName}
                      </div>
                      {row.hotelPhone && (
                        <div className="text-[10px] text-slate-400 tabular-nums flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" /> {row.hotelPhone}
                        </div>
                      )}
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <OpsStatusMenu heading="Hotel" value={row.hotelStatus} onPick={(s) => handleUpdateHotelStatus(row, s)} />
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 align-top">
                      {row.transportStatus === "NOT REQUIRED" || !row.transportShortLines?.length ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {row.transportShortLines.map((line) => (
                            <span
                              key={`${row.dayNum}-${line.short}`}
                              title={line.title}
                              className="font-medium text-[#0B1528] leading-snug"
                            >
                              {line.short}
                            </span>
                          ))}
                        </div>
                      )}
                      {row.transportPhone && row.transportStatus !== "NOT REQUIRED" && (
                        <div className="text-[10px] text-slate-400 tabular-nums flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" /> {row.transportPhone}
                        </div>
                      )}
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <OpsStatusMenu heading="Tempo" value={row.transportStatus} onPick={(s) => handleUpdateTransportStatus(row, s)} />
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 align-top w-44 max-w-[200px]">
                      <TripControlMealsCell row={row} />
                    </td>

                    <td className="py-2.5 px-3.5 align-top">
                      <div className="font-medium text-[#0B1528]">{row.guideName}</div>
                      {row.guidePhone && (
                        <div className="text-[10px] text-slate-400 tabular-nums flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" /> {row.guidePhone}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 align-top">
                      <span className="text-slate-500 text-[12px] line-clamp-2 break-words block">
                        {row.remarkDisplay || row.remark || <span className="text-slate-300">No remarks</span>}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center bg-[#F8FAFC]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-slate-300" />
                      <p className="font-medium text-[#0B1528] text-sm">No days match this filter</p>
                      <p className="text-xs text-slate-500">Clear search or choose All days.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("ALL");
                        }}
                        className="mt-2 text-xs font-medium border-[#E8EEF4]"
                      >
                        Reset filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="block md:hidden space-y-2 min-w-0">
        {filteredControlRows.length === 0 && (
          <div className="bg-white border border-[#E8EEF4] rounded-xl p-6 text-center">
            <p className="font-medium text-[#0B1528] text-sm">No days match this filter</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-2 text-[11px] font-medium text-[#FF4D00]"
            >
              Reset filters
            </button>
          </div>
        )}
        {filteredControlRows.map((row) => (
          <div
            key={row.dayNum}
            onClick={() => handleRowClick(row)}
            className="bg-white border border-[#E8EEF4] rounded-xl p-3.5 space-y-2.5 cursor-pointer min-w-0"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#E8EEF4] pb-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold text-[#0B1528] tabular-nums shrink-0">
                  {String(row.dayNum).padStart(2, "0")}
                </span>
                <span className="text-[12px] font-medium text-[#0B1528] tabular-nums truncate">
                  {row.dateStr}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                {row.paxCount} pax
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] font-medium text-slate-400 block">Stay</span>
                <span className="font-medium text-[#0B1528] whitespace-normal break-words block">{row.destination}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-medium text-slate-400 block">Hotel</span>
                <span className="font-medium text-[#0B1528] whitespace-normal break-words block">{row.hotelName}</span>
                <span className={cn("inline-flex mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-[#E8EEF4]", statusTone(row.hotelStatus))}>
                  {formatOpsLabel(row.hotelStatus)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-medium text-slate-400 block">Transport</span>
                {(row.transportShortLines || []).map((line) => (
                  <span key={line.short} title={line.title} className="font-medium text-[#0B1528] block">
                    {line.short}
                  </span>
                ))}
                {(!row.transportShortLines || row.transportShortLines.length === 0) && (
                  <span className="text-slate-300">—</span>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-medium text-slate-400 block">Guide</span>
                <span className="font-medium text-[#0B1528] whitespace-normal break-words block">{row.guideName}</span>
              </div>
            </div>
            {row.mealGroups && row.mealGroups.length > 0 && (
              <div className="pt-1.5 border-t border-[#E8EEF4] min-w-0" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Meals</span>
                <TripControlMealsCell row={row} />
              </div>
            )}
            {(row.remarkDisplay || row.remark) && (
              <div className="pt-1.5 border-t border-[#E8EEF4] text-xs">
                <span className="text-[10px] font-medium text-slate-400 block">Remark</span>
                <span className="text-[#0B1528] whitespace-normal break-words block">{row.remarkDisplay || row.remark}</span>
              </div>
            )}
            <div className="flex items-center justify-end pt-2 border-t border-[#E8EEF4] text-xs">
              <span className="inline-flex items-center text-[11px] font-medium text-[#FF4D00] shrink-0">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Side Action Drawer */}
      <TripControlRowDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        rowData={selectedRow}
        leadTransportName={leadTransport.name}
        leadGuideName={leadGuide.name}
        leadGuidePhone={leadGuide.phone}
        onEditHotel={(row) => {
          onEditHotel(row.hotelBookingRef || { dayNum: row.dayNum, dayLabel: row.dayLabel, destination: row.destination, dateStr: row.dateStr });
        }}
        onChangeTransport={() => onOpenTransportModal()}
        onAssignGuide={() => onOpenGuideModal()}
        onToggleCheckIn={handleToggleCheckIn}
        onSaveRemark={handleSaveRemark}
        onSaveDayDetail={handleSaveDayDetail}
      />
    </div>
  );
}

