import {
  normalizePassenger,
  normalizeGenderFull,
  normalizeGenderCode,
} from "@/utils/passengerUtils";
import { computeOperationalReadinessScore } from "@/utils/readinessUtils";
import { canViewProfit } from "@/config/permissions.config";
import {
  isSameDepartureDate,
} from "@/utils/departureDate";
import { isPassengerCancelled, filterActivePassengers } from "@/utils/departure/passengerStatus";
import { getBookingGroupKey, groupPassengersByBooking } from "@/utils/departure/passengerAllocation";
import { isAllocOnFleet, renumberVehicleAllocations } from "@/utils/departure/vehicleSeatAlloc";
import { calculateBookingFinancialStatus, safeNumber } from "@/utils/departure/paymentCalculator";
import { calculateRoomOccupancy } from "@/utils/departure/accommodationCalculator";
import { resolveDepartureIdentity } from "@/utils/departure/parseDepartureId";
import { normalizeDepartureHubTab } from "@/utils/departure/departureHubTab";
import { fetchAllDepartureBookings } from "@/utils/departure/fetchDepartureBookings";
import { mergeOpsVendorPayments, opsRecordedPaymentStatus } from "@/utils/departure/vendorIdentity";
import { mapBookingsToDeparturePassengers, isTransportAllocatedForPassenger } from "@/utils/departure/departurePassengers";
import {
  allocatePassengerMoneyForBookingWithTotals,
  normalizeCompareName,
} from "@/utils/departure/passengerAmounts";
import { matchPassengerForOpsRow, isActualVehicleAllocated, resolvePassengerAlloc } from "@/utils/departure/passengerIdentity";
import {
  computeHotelStayCoverage,
  computeSeatsFilledPercent,
  countBookingTravelers,
  countOutstandingParticipants,
} from "@/utils/departure/overviewMetrics";
import { printTripTitle } from "@/utils/inquiryCounts";
import {
  isGuideExpenseType,
  listActiveAssignedGuides,
} from "@/utils/departure/guideAssignments";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Calendar,
  User,
  Compass,
  Upload,
  Download,
  FileText,
  ClipboardList,
  CheckCircle2,
  MoreHorizontal,
  MessageSquare,
  PhoneCall,
  ChevronDown,
  Info,
  Search,
  X,
  Plus,
  Printer,
  Bed,
  Bus,
  Sliders,
  Settings,
  FileSpreadsheet,
  ClipboardCheck,
  Check,
  AlertTriangle,
  Clock,
  MapPin,
  Star,
  Link2,
  Paperclip,
  Image,
  History,
  Trash,
  Copy,
  Smile,
  AtSign,
  Send,
  Shield,
  Folder,
  Filter,
  RefreshCw,
  MoreVertical,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Circle,
  PauseCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  BarChart2,
  Activity,
  CalendarCheck,
  Sparkles,
  MessageCircle,
  Save,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashLink } from "@/modules/dashboard.chrome";
import api from "@/services/api";
import { opsService } from "@/services/ops.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReportsConsole from "@/components/admin/ReportsConsole";
import BookingDetailsModal from "@/components/admin/BookingDetailsModal";
import DepartureActivities from "@/components/admin/DepartureActivities";
import DepartureCommunication from "@/components/admin/DepartureCommunication";
import DepartureDocuments from "@/components/admin/DepartureDocuments";
import DeparturePayments from "@/components/admin/DeparturePayments";
import DepartureReports from "@/components/admin/DepartureReports";
import DepartureTasks from "@/components/admin/DepartureTasks";
import StationPaymentCollection from "@/components/admin/StationPaymentCollection";
import VendorImportWizard from "@/components/admin/VendorImportWizard";
import HotelCalculator from "@/components/admin/hotels/HotelCalculator";
import AccommodationWorkspace from "@/components/admin/departure/AccommodationWorkspace";
import DepartureTransport from "@/components/admin/departure/DepartureTransport";
import { findHotelForDay, calculateAccommodationCost } from "@/utils/accommodationCalculator";
import HotelAssignmentWizardModal from "@/components/admin/departure/HotelAssignmentWizardModal";
import DepartureTripControl from "@/components/admin/departure/DepartureTripControl";

import { MobileDepartureWorkspace } from "@/components/mobile/MobileDepartureWorkspace";
import { useAuthStore } from "@/store/auth.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const GUIDE_EXPENSE_CATEGORIES = [
  { value: "EXPENSE", label: "Trip Expense / Allowance" },
  { value: "EXPENSE_FOOD", label: "Food & Meals" },
  { value: "EXPENSE_TRANSPORTATION", label: "Transportation" },
  { value: "EXPENSE_ACCOMMODATION", label: "Accommodation" },
  { value: "EXPENSE_FUEL", label: "Fuel" },
  { value: "EXPENSE_ENTRY_TICKETS", label: "Entry Tickets / Activities" },
  { value: "EXPENSE_MISCELLANEOUS", label: "Miscellaneous" },
] as const;

const getGuideExpenseCategoryLabel = (assignmentType?: string | null) =>
  GUIDE_EXPENSE_CATEGORIES.find((category) => category.value === assignmentType)
    ?.label || "Trip Expense / Allowance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    CONFIRMED: "bg-green-50 text-green-700 border-green-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
    OPTIONAL: "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30",
    PAID: "bg-green-50 text-green-700 border-green-200",
    "PARTIALLY PAID": "bg-amber-50 text-amber-700 border-amber-200",
    UNPAID: "bg-red-50 text-red-600 border-red-200",
    REFUNDED: "bg-blue-50 text-blue-700 border-blue-200",
    "IN PROGRESS": "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    OVERDUE: "bg-red-50 text-red-600 border-red-200",
    "NOT STARTED": "bg-slate-100 text-slate-500 border-slate-200",
    VERIFIED: "bg-green-50 text-green-700 border-green-200",
    "ACTION REQUIRED": "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-[3px] border text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
        map[status] || "bg-slate-50 text-slate-500 border-slate-200",
      )}
    >
      {status}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const map: Record<string, string> = {
    TRAVEL: "bg-blue-100 text-blue-700",
    SIGHTSEEING: "bg-[#FF4D00]/10 text-[#C2410C]",
    ADVENTURE: "bg-[#FF4D00]/10 text-[#C2410C]",
    COMMUNICATION: "bg-pink-100 text-pink-700",
    PAYMENTS: "bg-green-100 text-green-700",
    DOCUMENTS: "bg-[#FF4D00]/10 text-[#C2410C]",
    HOTELS: "bg-amber-100 text-amber-700",
    TRANSPORT: "bg-blue-100 text-blue-700",
    GUIDES: "bg-green-100 text-green-700",
    OPERATIONS: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-[3px] text-[9px] font-black uppercase tracking-wider",
        map[type] || "bg-slate-100 text-slate-600",
      )}
    >
      {type}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const map: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-[3px] text-[9px] font-black uppercase tracking-wider",
        map[priority] || "bg-slate-100 text-slate-600",
      )}
    >
      {priority}
    </span>
  );
};

const Avatar = ({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) => (
  <div
    className={cn(
      "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0",
      className || "bg-[#FF4D00]",
    )}
  >
    {initials}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DepartureHubPage() {
  const { admin } = useAuthStore();
  const canSeeProfit = canViewProfit(admin);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // ─── TAB NORMALIZER ───
  const normalizeTab = (raw: string | null | undefined): string =>
    normalizeDepartureHubTab(raw);

  // ─── READ TAB FROM WINDOW URL (bypasses React Router caching) ───
  const readTabFromUrl = (): string => {
    const params = new URLSearchParams(window.location.search);
    return normalizeTab(params.get("tab"));
  };

  const [activeTab, setActiveTabState] = useState<string>(readTabFromUrl);

  // Sync activeTab when location.search changes (React Router navigation)
  useEffect(() => {
    const newTab = readTabFromUrl();
    setActiveTabState((prev) => (prev !== newTab ? newTab : prev));
  }, [location.search]);

  // Also listen to browser popstate (back/forward buttons)
  useEffect(() => {
    const onPopState = () => {
      setActiveTabState(readTabFromUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ─── SET TAB: update URL + state simultaneously ───
  const setActiveTab = (tab: string) => {
    const normalized = normalizeTab(tab);
    // Immediately update React state (no waiting for URL roundtrip)
    setActiveTabState(normalized);
    // Then update URL
    const params = new URLSearchParams(window.location.search);
    params.set("tab", normalized);
    navigate(
      { pathname: location.pathname, search: `?${params.toString()}` },
      { replace: false },
    );
  };

  // Extract from departureId if present (format: tripId_YYYY-MM-DD)
  const departureIdParam =
    searchParams.get("departureId") ||
    new URLSearchParams(location.search).get("departureId");
  const departureIdentity = resolveDepartureIdentity({
    departureId: departureIdParam,
    tripId:
      searchParams.get("tripId") ||
      new URLSearchParams(location.search).get("tripId"),
    departureDate:
      searchParams.get("departureDate") ||
      searchParams.get("date") ||
      new URLSearchParams(location.search).get("departureDate"),
    date: searchParams.get("date"),
  });
  const hasValidDeparture = departureIdentity.ok;
  const tripId = departureIdentity.ok ? departureIdentity.tripId : "";
  const departureDateStr = departureIdentity.ok ? departureIdentity.departureDate : "";

  const initializationKeyRef = useRef<string | null>(null);
  const vehicleFleetNameRef = useRef<HTMLInputElement | null>(null);

  // Data states
  const [bookings, setBookings] = useState<any[]>([]);
  const [passengerAllocations, setPassengerAllocations] = useState<
    Record<string, { room: string; vehicle: string; seat: string }>
  >({});
  const allPassengers = useMemo(() => {
    return mapBookingsToDeparturePassengers(
      bookings,
      departureDateStr,
      passengerAllocations,
    );
  }, [bookings, departureDateStr, passengerAllocations]);

  const activeDeparturePassengers = useMemo(
    () => allPassengers.filter((p: any) => !p.isCancelled),
    [allPassengers],
  );
  const [itineraryList, setItineraryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [depLoadErrors, setDepLoadErrors] = useState<Record<string, string>>({});
  const [bookingsIncomplete, setBookingsIncomplete] = useState(false);
  const [activitiesStale, setActivitiesStale] = useState(false);
  const [engineStats, setEngineStats] = useState<any>(null);
  const [tripDetails, setTripDetails] = useState<any | null>(null);
  const [tripVendors, setTripVendors] = useState<any[]>([]);
  const [vendorSummary, setVendorSummary] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [checklistTasks, setChecklistTasks] = useState<any[]>([]);
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [dbGuideVendors, setDbGuideVendors] = useState<any[]>([]);

  // Passengers filter states
  const [paxSearch, setPaxSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [pickupFilter, setPickupFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [page, setPage] = useState(1);

  // New Departure API & Readiness state
  const [departureRecord, setDepartureRecord] = useState<any | null>(null);
  const [readinessData, setReadinessData] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (targetStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await api.put("/departures/status", {
        tripId,
        date: departureDateStr,
        status: targetStatus,
      });
      if (res.data?.success) {
        setDepartureRecord(res.data.data.departure);
        setReadinessData(res.data.data.readiness);
        toast.success(`Departure status updated to '${targetStatus}'`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to transition to '${targetStatus}'`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // New Passengers Grouping & Room Allocation states
  const [bookingGroupFilter, setBookingGroupFilter] = useState("All");
  const [roomAllocFilter, setRoomAllocFilter] = useState("All");
  const [trainTicketFilter, setTrainTicketFilter] = useState("All");
  const [joiningCityFilter, setJoiningCityFilter] = useState("All");
  const [docStatusFilter, setDocStatusFilter] = useState("All");
  const [selectedPaxIds, setSelectedPaxIds] = useState<Record<string, boolean>>(
    {},
  );
  // New state for individual passenger selection
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<Record<string, boolean>>({});
  const [expandedBookings, setExpandedBookings] = useState<
    Record<string, boolean>
  >({});
  const [selectedBookingForRoomAlloc, setSelectedBookingForRoomAlloc] =
    useState<any | null>(null);
  const [modalAllocations, setModalAllocations] = useState<
    Record<
      string,
      {
        roomType: string;
        coupleWith: string;
        roomNo?: string;
        groupId?: string;
      }
    >
  >({});

  // Tasks filter
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("All");

  // Documents filter
  const [docCategory, setDocCategory] = useState("all");
  const [docSearch, setDocSearch] = useState("");

  // Communication
  const [activeConv, setActiveConv] = useState("g1");
  const [chatInput, setChatInput] = useState("");
  const [chatTab, setChatTab] = useState("message");
  const [convFilter, setConvFilter] = useState("All");

  // Payments filter
  const [payStatusFilter, setPayStatusFilter] = useState("All");

  const [allocFleet, setAllocFleet] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);
  const [vendorDirectoryFleet, setVendorDirectoryFleet] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [newVehicleType, setNewVehicleType] = useState("17 Seater Tempo");
  const [newVehicleCapacity, setNewVehicleCapacity] = useState("17");
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehicleCost, setNewVehicleCost] = useState("");
  const [newVehicleVendor, setNewVehicleVendor] = useState("");
  const [manualRooms, setManualRooms] = useState<string[]>([]);
  const [isSavingAllocations, setIsSavingAllocations] = useState(false);
  const [isSavingRooms, setIsSavingRooms] = useState(false);
  const [isSavingVehicles, setIsSavingVehicles] = useState(false);
  const [showClearAllocationsDialog, setShowClearAllocationsDialog] =
    useState(false);

  const handleSaveAllocationsToDb = async (
    clearExisting = false,
    target: "all" | "rooms" | "vehicles" = "all",
  ) => {
    if (target === "rooms") setIsSavingRooms(true);
    else if (target === "vehicles") setIsSavingVehicles(true);
    else setIsSavingAllocations(true);

    try {
      const roomAllocations: Array<{
        roomNumber: string;
        roomType: string;
        genderGroup: string;
        bookingId: string;
        travelerName: string;
        sharingType?: string;
      }> = [];
      const vehicleAllocations: Array<{
        fleetId: string;
        bookingId: string;
        travelerName: string;
        seatNumber?: number;
      }> = [];

      // Map passengerAllocations to proper DB format
      allPassengers.forEach((p: any) => {
        const alloc =
          resolvePassengerAlloc(passengerAllocations, p) ||
          (p.id && passengerAllocations[p.id]) ||
          null;
        if (!alloc) return;
        const bookingId =
          p.bookingId ||
          p.rawBooking?.id ||
          p.rawBooking?.bookingId ||
          p.bookingRef ||
          `BK-${(p.name || "PAX").replace(/\s+/g, "").toUpperCase()}`;

        if (
          (target === "all" || target === "rooms") &&
          alloc.room &&
          alloc.room !== "—" &&
          alloc.room !== "Unassigned"
        ) {
          roomAllocations.push({
            roomNumber: alloc.room,
            roomType: p.roomType || "STANDARD",
            genderGroup: p.gender === "Female" ? "GIRLS" : "BOYS",
            bookingId: bookingId,
            travelerName: p.name,
            sharingType: p.roomType || "STANDARD",
          });
        }
        if (
          (target === "all" || target === "vehicles") &&
          alloc.vehicle &&
          alloc.vehicle !== "—" &&
          alloc.vehicle !== "Unassigned"
        ) {
          const fleetIdx = allocFleet.findIndex((f, idx) =>
            isAllocOnFleet(alloc, f, idx, allocFleet),
          );
          const fleet = fleetIdx >= 0 ? allocFleet[fleetIdx] : allocFleet[0];
          vehicleAllocations.push({
            fleetId: fleet?.id || alloc.fleetId || "tempo-1",
            bookingId: bookingId,
            travelerName: p.name,
            seatNumber:
              alloc.seat && alloc.seat !== "—"
                ? parseInt(String(alloc.seat).replace(/\D/g, ""), 10) || undefined
                : undefined,
          });
        }
      });

      if (
        !clearExisting &&
        target === "rooms" &&
        roomAllocations.length === 0
      ) {
        toast.error(
          "No room assignments to save. Auto-allocate or drag passengers into rooms first.",
        );
        return;
      }

      // If saving vehicles and none were explicitly set, fallback-assign to fleet
      if ((target === "all" || target === "vehicles") && vehicleAllocations.length === 0 && !clearExisting && allocFleet.length > 0) {
        let seatCounter = 1;
        let fleetIdx = 0;
        allPassengers.forEach((p: any) => {
          if (isPassengerCancelled(p)) return;
          const currentFleet = allocFleet[fleetIdx] || allocFleet[0];
          const bookingId =
            p.bookingId ||
            p.rawBooking?.bookingId ||
            p.bookingRef ||
            p.rawBooking?.id ||
            `BK-${(p.name || "PAX").replace(/\s+/g, "").toUpperCase()}`;
          vehicleAllocations.push({
            fleetId: currentFleet.id || `tempo-${fleetIdx + 1}`,
            bookingId,
            travelerName: p.name,
            seatNumber: seatCounter,
          });
          seatCounter++;
          if (seatCounter > (Number(currentFleet.capacity) || 14) && fleetIdx < allocFleet.length - 1) {
            fleetIdx++;
            seatCounter = 1;
          }
        });
      }

      if ((target === "all" || target === "vehicles") && vehicleAllocations.length > 0) {
        const sequential = renumberVehicleAllocations(vehicleAllocations);
        vehicleAllocations.length = 0;
        sequential.forEach((row) => vehicleAllocations.push(row));
      }

      // Update local state immediately with vehicle allocations
      if (vehicleAllocations.length > 0) {
        setPassengerAllocations((prev: any) => {
          const next = { ...prev };
          vehicleAllocations.forEach((v) => {
            const fleet = allocFleet.find((f: any) => f.id === v.fleetId) || allocFleet[0];
            const vName = fleet?.name || "Tempo 1";
            const pObj = allPassengers.find((p: any) => p.name === v.travelerName || p.id === v.travelerName);
            const nameKey = v.travelerName;
            const existing = (nameKey && next[nameKey]) || (pObj?.id && next[pObj.id]) || { room: "—" };
            const entry = {
              ...existing,
              vehicle: vName,
              fleetId: v.fleetId,
              seat: v.seatNumber ? String(v.seatNumber) : "—",
            };
            if (nameKey) next[nameKey] = entry;
            if (pObj?.name) next[pObj.name] = entry;
            if (pObj?.id) next[pObj.id] = { ...entry };
          });
          return next;
        });
      }

      if (
        clearExisting &&
        roomAllocations.length === 0 &&
        vehicleAllocations.length === 0
      ) {
        await opsService.saveManualAllocations(tripId, departureDateStr, {
          roomAllocations,
          vehicleAllocations,
          clearExisting: true,
        });
        toast.success("Allocations cleared from database");
        setShowClearAllocationsDialog(false);
        return;
      }

      const result = await opsService.saveManualAllocations(
        tripId,
        departureDateStr,
        { roomAllocations, vehicleAllocations, clearExisting, target },
      );
      if (result?.success) {
        if (target === "rooms") {
          toast.success(
            `Room list saved successfully (${roomAllocations.length} allocations)`,
          );
        } else if (target === "vehicles") {
          toast.success(
            `Tempo list saved successfully (${vehicleAllocations.length} allocations)`,
          );
        } else {
          toast.success(
            `Saved: ${result.data?.rooms?.length || 0} room + ${result.data?.vehicles?.length || 0} vehicle allocations`,
          );
        }
        await fetchPageData(false, true);
      } else {
        toast.error(result?.message || "Failed to save allocations");
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        err?.response?.statusText ||
        "";
      toast.error(errMsg || "Failed to save allocations to database");
      console.error("saveManualAllocations error:", err);
    } finally {
      setIsSavingAllocations(false);
      setIsSavingRooms(false);
      setIsSavingVehicles(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = parseInt(newVehicleCapacity) || 17;
    const vName = newVehicleName || `${newVehicleType || 'Tempo'} ${allocFleet.length + 1}`;
    const enteredCost = Number(newVehicleCost) || 0;

    try {
      const savedVehicle = await opsService.createTransportFleet(
        tripId,
        {
          vehicleType: newVehicleType || "17 Seater Tempo",
          capacity: cap,
          totalAmount: enteredCost,
          driverName: vName,
          notes: newVehicleVendor || "General Vendor",
          vendorId: selectedVendorId || undefined,
        },
        departureDateStr,
      );

      const newV = {
        id: savedVehicle?.id || `tempo-${Date.now()}`,
        name: savedVehicle?.driverName || vName,
        vehicleType: savedVehicle?.vehicleType || newVehicleType || "Tempo",
        capacity: savedVehicle?.capacity || cap,
        cost: savedVehicle?.totalAmount ?? enteredCost,
        vendor: savedVehicle?.notes || newVehicleVendor || "General Vendor",
        vendorId: savedVehicle?.vendorId || selectedVendorId,
      };

      setAllocFleet((prev) => [...prev, newV]);
      setNewVehicleName("");
      setNewVehicleCost("");
      setNewVehicleVendor("");
      setSelectedVehicleId("");
      setSelectedVendorId("");
      toast.success(
        `Added ${newV.name} (${newV.vehicleType}) and saved to departure!`,
      );
      await fetchPageData();
    } catch (err: any) {
      console.error("handleAddVehicle error:", err);
      toast.error("Failed to save vehicle details to database");
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await opsService.deleteTransportFleet(id);
      setAllocFleet((prev) => prev.filter((v) => v.id !== id));
      toast.info("Removed vehicle from database and fleet");
      fetchPageData();
    } catch {
      toast.error("Failed to delete vehicle from database");
    }
  };

  // Guide state
  const [dbGuides, setDbGuides] = useState<any[]>([]);
  const [addGuideOpen, setAddGuideOpen] = useState(false);
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [guideForm, setGuideForm] = useState({
    guideName: "",
    agreedAmount: "",
    advancePaid: "0",
    daysWorked: "5",
    notes: "",
    assignmentType: "PRIMARY_GUIDE",
    reportingLocation: "",
    reportingTime: "",
    emergencyContact: "",
    expenseDate: "",
  });
  const [isSavingGuide, setIsSavingGuide] = useState(false);

  const emptyGuideForm = (assignmentType = "PRIMARY_GUIDE") => ({
    guideName: "",
    agreedAmount: "",
    advancePaid: "0",
    daysWorked: isGuideExpenseType(assignmentType) ? "1" : "5",
    notes: "",
    assignmentType,
    reportingLocation: "",
    reportingTime: "",
    emergencyContact: "",
    expenseDate: isGuideExpenseType(assignmentType) ? departureDateStr || "" : "",
  });

  const guideExpenseTripDays = useMemo(() => {
    const fromDuration = tripDetails?.duration?.match(/(\d+)\s*Day/i);
    if (fromDuration) return Math.max(1, parseInt(fromDuration[1], 10));
    if (tripDetails?.durationDays) return Math.max(1, Number(tripDetails.durationDays));
    if (itineraryList?.length) return itineraryList.length;
    return 11;
  }, [tripDetails, itineraryList]);

  const dateForTripDay = (day: number) => {
    if (!departureDateStr) return "";
    const d = new Date(`${departureDateStr.slice(0, 10)}T12:00:00`);
    d.setDate(d.getDate() + Math.max(0, day - 1));
    return d.toISOString().slice(0, 10);
  };

  const tripDayFromDate = (iso?: string | null) => {
    if (!iso || !departureDateStr) return "";
    const start = new Date(`${departureDateStr.slice(0, 10)}T12:00:00`);
    const exp = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(exp.getTime())) return "";
    const day = Math.round((exp.getTime() - start.getTime()) / 86400000) + 1;
    return day >= 1 && day <= guideExpenseTripDays ? String(day) : "";
  };

  const formatExpenseDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "en-IN",
        { day: "2-digit", month: "short", year: "numeric" },
      );
    } catch {
      return String(iso).slice(0, 10);
    }
  };

  // Anchors so the inline editors can be scrolled into view where they render:
  // guide assignments under Guides & Crew, expenses under Trip Expenses.
  const guideFormRef = useRef<HTMLFormElement | null>(null);
  const expenseSectionRef = useRef<HTMLDivElement | null>(null);

  const revealGuideEditor = (isExpense: boolean) => {
    setTimeout(() => {
      const target: HTMLElement | null = isExpense
        ? expenseSectionRef.current
        : guideFormRef.current;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 60);
  };

  const closeGuideForm = () => {
    setAddGuideOpen(false);
    setEditingGuideId(null);
    setGuideForm(emptyGuideForm());
  };

  const handleEditGuide = (g: any) => {
    setEditingGuideId(g.id);
    const startIso = g.startDate
      ? String(g.startDate).slice(0, 10)
      : "";
    setGuideForm({
      guideName: g.guideName || "",
      agreedAmount: String(g.agreedAmount || ""),
      advancePaid: String(g.advancePaid || "0"),
      daysWorked: String(g.daysWorked || "1"),
      notes: g.notes || "",
      assignmentType: g.assignmentType || "PRIMARY_GUIDE",
      reportingLocation: g.reportingLocation || "",
      reportingTime: g.reportingTime || "",
      emergencyContact: g.emergencyContact || "",
      expenseDate: startIso,
    });
    setAddGuideOpen(true);
    revealGuideEditor(isGuideExpenseType(g.assignmentType));
  };

  const handleAddGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideForm.guideName.trim() || guideForm.guideName === "__manual__") {
      toast.error(
        isGuideExpenseType(guideForm.assignmentType)
          ? "Expense title is required"
          : "Guide name is required",
      );
      return;
    }
    if (isGuideExpenseType(guideForm.assignmentType) && !guideForm.expenseDate) {
      toast.error("Expense date is required");
      return;
    }
    setIsSavingGuide(true);
    try {
      const dataPayload = {
        guideName: guideForm.guideName,
        agreedAmount: parseFloat(guideForm.agreedAmount) || 0,
        advancePaid: parseFloat(guideForm.advancePaid) || 0,
        daysWorked: parseInt(guideForm.daysWorked) || 1,
        notes: guideForm.notes,
        assignmentType: guideForm.assignmentType || "PRIMARY_GUIDE",
        reportingLocation: guideForm.reportingLocation || undefined,
        reportingTime: guideForm.reportingTime || undefined,
        emergencyContact: guideForm.emergencyContact || undefined,
        startDate:
          isGuideExpenseType(guideForm.assignmentType) && guideForm.expenseDate
            ? guideForm.expenseDate
            : undefined,
        endDate:
          isGuideExpenseType(guideForm.assignmentType) && guideForm.expenseDate
            ? guideForm.expenseDate
            : undefined,
      };

      let saved;
      if (editingGuideId) {
        saved = await opsService.updateGuidePayment(editingGuideId, {
          ...dataPayload,
          startDate:
            isGuideExpenseType(guideForm.assignmentType)
              ? guideForm.expenseDate || null
              : dataPayload.startDate,
          endDate:
            isGuideExpenseType(guideForm.assignmentType)
              ? guideForm.expenseDate || null
              : dataPayload.endDate,
        });
        setDbGuides((prev) => prev.map((g) => (g.id === editingGuideId ? saved : g)));
        toast.success(`Updated "${saved.guideName}" successfully!`);
      } else {
        saved = await opsService.createGuidePayment(tripId, dataPayload, departureDateStr);
        setDbGuides((prev) => [...prev, saved]);
        toast.success(`"${saved.guideName}" added successfully!`);
      }

      setGuideForm(emptyGuideForm());
      setEditingGuideId(null);
      setAddGuideOpen(false);
      fetchPageData();
    } catch (err: any) {
      console.error("Error saving guide/expense:", err);
      toast.error(err.response?.data?.message || "Failed to save record");
    } finally {
      setIsSavingGuide(false);
    }
  };

  const handleDeleteGuide = async (id: string, guideName: string) => {
    if (!window.confirm(`Remove guide "${guideName}" from this departure?`))
      return;
    try {
      await opsService.deleteGuidePayment(id);
      setDbGuides((prev) => prev.filter((g) => g.id !== id));
      toast.info(`Guide "${guideName}" removed from departure`);
      fetchPageData();
    } catch {
      toast.error("Failed to remove guide");
    }
  };

  const handleCopyTempoList = () => {
    let txt = "*Tempo List (for WhatsApp Group)*\n\n";
    const groups: Record<string, Array<{ name: string; seat: string }>> = {};
    computedVehicleAllocations.forEach((v: any) => {
      const vName = v.vehicleName || v.vehicle || v.vehicleType || "Tempo 1";
      if (!groups[vName]) groups[vName] = [];
      groups[vName].push({ name: v.travelerName, seat: String(v.seatNumber || "") });
    });
    Object.entries(groups).forEach(([vName, people]) => {
      txt += `🚌 *${vName}* [${people.length}]\n`;
      people.forEach((p, i) => {
        txt += `${i + 1}. ${p.name}\n`;
      });
      txt += "\n";
    });
    navigator.clipboard.writeText(txt);
    toast.success("WhatsApp Tempo List copied to clipboard!");
  };

  const handleCopyRoomList = () => {
    let txt = "*Room List (for WhatsApp Group)*\n\n";
    const groups: Record<string, { gender: string; names: string[] }> = {};
    computedRoomAllocations.forEach((r) => {
      if (!groups[r.roomNumber])
        groups[r.roomNumber] = { gender: r.genderGroup, names: [] };
      groups[r.roomNumber].names.push(r.travelerName);
    });
    Object.entries(groups).forEach(([roomNo, data]) => {
      txt += `🏢 *${roomNo}* — ${data.names.join(", ")} (${data.gender === "BOYS" ? "Boys" : data.gender === "GIRLS" ? "Girls" : "Couples"})\n`;
    });
    navigator.clipboard.writeText(txt);
    toast.success("WhatsApp Room List copied to clipboard!");
  };

  // Activities filter
  const [actDayFilter, setActDayFilter] = useState("All Days");
  const [actTypeFilter, setActTypeFilter] = useState("All Activity Type");
  const [actStatusFilter, setActStatusFilter] = useState("All Status");
  const [actSearch, setActSearch] = useState("");

  // ─── 6-Screen Sub-Tab State ───
  const [planSubTab, setPlanSubTab] = useState<"accommodation" | "allocation" | "guides" | "activities">("accommodation");
  const [opsSubTab, setOpsSubTab] = useState<"control" | "ticketing" | "allocation" | "tasks">("control");
  const [moneySubTab, setMoneySubTab] = useState<"summary" | "receivables" | "payables" | "profit" | "station">("summary");

  // Deep Link Sub-Tab Synchronization
  const origTabParam = (searchParams.get("tab") || "").toLowerCase().trim();
  useEffect(() => {
    if (["hotels", "hotel", "accommodations", "accommodation", "itinerary"].includes(origTabParam)) {
      setPlanSubTab("accommodation");
    } else if (origTabParam === "allocation") {
      setPlanSubTab("allocation");
    } else if (origTabParam === "guides") {
      setPlanSubTab("guides");
    } else if (origTabParam === "activities") {
      setPlanSubTab("activities");
    } else if (origTabParam === "ticketing") {
      setOpsSubTab("ticketing");
    } else if (origTabParam === "tasks") {
      setOpsSubTab("tasks");
    } else if (origTabParam === "payments") {
      setMoneySubTab("receivables");
    } else if (origTabParam === "stationpayments") {
      setMoneySubTab("station");
    } else if (origTabParam === "reports") {
      setMoneySubTab("profit");
    }
  }, [origTabParam]);

  // Ensure departure workspace opens cleanly at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const scroller = document.querySelector(".admin-main-scroll");
    if (scroller) {
      scroller.scrollTop = 0;
    }
  }, [tripId, departureDateStr, origTabParam]);

  // Multi-Vendor Hotel & Stay Assignment Architecture State
  const [hotelViewMode, setHotelViewMode] = useState<"card" | "table">("card");
  const [isAddHotelWizardOpen, setIsAddHotelWizardOpen] = useState(false);
  const [selectedWizardDayInfo, setSelectedWizardDayInfo] = useState<any | null>(null);
  const [hotelWizardStep, setHotelWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [hotelWizardData, setHotelWizardData] = useState({
    destination: "Shimla",
    hotelId: "HTL-2",
    hotelName: "Hotel Snow View",
    hotelRating: "★★★★★",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    checkIn: "05 Aug 2026",
    checkOut: "06 Aug 2026",
    nights: 1,
    rooms: { Twin: 3, Triple: 2, Quad: 0 } as Record<string, number>,
    totalGuests: 16,
    vendorRate: 4200,
    sellingRate: 5500,
    totalAmount: 21000,
    advancePaid: 10500,
    mealPlan: "MAP",
    remarks: "",
    status: "Draft",
  });
  const [selectedStayForDrawer, setSelectedStayForDrawer] = useState<
    any | null
  >(null);
  const [opsHotels, setOpsHotels] = useState<any[]>([]);
  const loadGenerationRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPageData = async (resetFleet = false, skipAllocReset = false) => {
    if (!tripId || !departureDateStr) {
      setLoading(false);
      return;
    }

    // 1. Abort previous pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Increment request generation token
    loadGenerationRef.current++;
    const currentGen = loadGenerationRef.current;

    setLoading(true);
    setDepLoadErrors({});
    setActivitiesStale(false);
    if (resetFleet) {
      setBookings([]);
      setDepartureRecord(null);
      setReadinessData(null);
      setEngineStats(null);
      setOpsHotels([]);
      if (!skipAllocReset) setPassengerAllocations({});
      setActivitiesList([]);
      setDbGuides([]);
      setAllocFleet([]);
      setChecklistTasks([]);
      setItineraryList([]);
    }
    try {
      const signal = controller.signal;
      const nextErrors: Record<string, string> = {};

      let bookingsIncompleteFlag = false;
      let loadedBookings: any[] = [];
      try {
        const loaded = await fetchAllDepartureBookings({
          pageSize: 100,
          getPage: async (pageNum, limit) => {
            const res = await api.get(
              `/bookings?status=all&tripId=${encodeURIComponent(tripId)}&departureDate=${encodeURIComponent(departureDateStr)}&page=${pageNum}&limit=${limit}`,
              { signal },
            );
            return res.data || { data: [] };
          },
        });
        if (currentGen !== loadGenerationRef.current) return;
        const filtered = (loaded.bookings || []).filter(
          (b: any) =>
            b.tripId === tripId &&
            isSameDepartureDate(b.departureDate, departureDateStr),
        );
        loadedBookings = filtered;
        setBookings(filtered);
        bookingsIncompleteFlag = loaded.incomplete;
        setBookingsIncomplete(loaded.incomplete);
      } catch {
        if (currentGen !== loadGenerationRef.current) return;
        nextErrors.bookings = "Failed to load bookings";
        setBookingsIncomplete(true);
      }

      const [
        depRes,
        engineRes,
        itinRes,
        vendorsRes,
        tripRes,
        hotelsRes,
        transportRes,
        guidesRes,
        activitiesRes,
        opsPaymentsRes,
      ] = await Promise.allSettled([
        api.get(`/departures/resolve?tripId=${tripId}&date=${departureDateStr}`, { signal }),
        api.get(`/departure-engine/${tripId}/${departureDateStr}/passenger-stats`, { signal }),
        api.get(`/ops/itinerary/${tripId}?departureDate=${departureDateStr}`, { signal }),
        api.get(`/vendors/directory?tripId=${encodeURIComponent(tripId)}&limit=100`, { signal }),
        api.get(`/trips/${tripId}`, { signal }),
        api.get(`/ops/hotels/${tripId}?departureDate=${departureDateStr}`, { signal }),
        api.get(`/ops/transport/${tripId}?departureDate=${departureDateStr}`, { signal }),
        api.get(`/ops/guides/${tripId}?departureDate=${departureDateStr}`, { signal }),
        api.get(`/ops/activities/${tripId}?departureDate=${departureDateStr}`, { signal }),
        api.get(`/ops/payments/vendor/${encodeURIComponent(tripId)}?departureDate=${encodeURIComponent(departureDateStr)}`, { signal }),
      ]);

      // Stale response check — ignore if user switched departure while fetching
      if (currentGen !== loadGenerationRef.current) return;

      const markErr = (key: string, res: PromiseSettledResult<any>, label: string) => {
        if (res.status === "rejected") nextErrors[key] = `${label} failed to load`;
      };
      markErr("departure", depRes, "Departure");
      markErr("engine", engineRes, "Passenger stats");
      markErr("itinerary", itinRes, "Itinerary");
      markErr("vendors", vendorsRes, "Vendor directory");
      markErr("trip", tripRes, "Trip");
      markErr("hotels", hotelsRes, "Hotels");
      markErr("transport", transportRes, "Fleet");
      markErr("guides", guidesRes, "Guides");
      markErr("activities", activitiesRes, "Activities");
      markErr("vendorPayments", opsPaymentsRes, "Vendor payments");

      // 2. Departure resolve
      if (depRes.status === "fulfilled" && depRes.value?.data?.success) {
        setDepartureRecord(depRes.value.data.data.departure);
        setReadinessData(depRes.value.data.data.readiness);
      }

      // 3. Engine stats
      if (engineRes.status === "fulfilled" && engineRes.value?.data?.success) {
        setEngineStats(engineRes.value.data.data);
      }

      // 4. Itinerary
      if (itinRes.status === "fulfilled" && itinRes.value?.data?.data) {
        setItineraryList(itinRes.value.data.data);
      }

      // 5. Vendors directory
      if (vendorsRes.status === "fulfilled" && vendorsRes.value?.data?.data) {
        const allVendors = vendorsRes.value.data.data || [];
        const tripHotelVendors = allVendors.filter((v: any) =>
          ["hotel", "homestay", "camp"].includes(v.type?.toLowerCase()),
        );
        setDbVendors(tripHotelVendors);
        const tripGuideVendors = allVendors.filter((v: any) =>
          ["guide", "trek_leader", "trek leader"].includes(v.type?.toLowerCase()),
        );
        setDbGuideVendors(tripGuideVendors);
      }

      // 6. Trip details
      if (tripRes.status === "fulfilled" && tripRes.value?.data?.data) {
        setTripDetails(tripRes.value.data.data);
      }

      // 7. Ops Hotels
      if (hotelsRes.status === "fulfilled") {
        setOpsHotels(hotelsRes.value?.data?.data || []);
      }

      // 8. Ops Transports & Guides
      const transportFetched = transportRes.status === "fulfilled";
      const transports = transportFetched ? transportRes.value?.data?.data || [] : [];
      if (guidesRes.status === "fulfilled") {
        setDbGuides(guidesRes.value?.data?.data || []);
      }

      // 9. Ops Activities — empty array is a real empty result; failure must not look empty
      if (activitiesRes.status === "fulfilled" && Array.isArray(activitiesRes.value?.data?.data)) {
        const rawActivities = activitiesRes.value.data.data;
        setActivitiesList(rawActivities);
        setActivitiesStale(false);
        const depKey = `yc_activities_${tripId}_${departureDateStr}`;
        try {
          localStorage.setItem(depKey, JSON.stringify({ server: true, at: Date.now(), rows: rawActivities }));
        } catch {
          /* ignore quota */
        }
      } else if (activitiesRes.status === "rejected") {
        setActivitiesStale(true);
      }

      const rawActivities =
        activitiesRes.status === "fulfilled" &&
        Array.isArray(activitiesRes.value?.data?.data)
          ? activitiesRes.value.data.data
          : [];

      const mappedActivities = rawActivities.map((a: any) => {
        const pax = Number(
          a.bookedCount || a.maxParticipants || totalPaxCount || 1,
        );
        const costPerPerson = Number(a.adultPrice || a.sellingPrice || 0);
        const calcCost = Number(
          a.vendorCost || a.actualCost || costPerPerson * pax || 0,
        );
        const paid = Number(
          a.advancePaid !== undefined
            ? a.advancePaid
            : a.status === "PAID" || a.status === "CONFIRMED"
              ? a.actualCost || calcCost
              : 0,
        );
        return {
          id: a.id || `act-${a.name}`,
          name: a.vendorName || a.name || a.responsibleGuide || "Activity Vendor",
          vendorType: "activity",
          category: "Activities",
          vendorId: {
            name:
              a.vendorName || a.name || a.responsibleGuide || "Activity Vendor",
            location: a.startTime ? `Time: ${a.startTime}` : "Activity",
            notes: a.remarks || a.name,
          },
          paymentStatus:
            paid >= calcCost && calcCost > 0
              ? "paid"
              : paid > 0
                ? "advance_paid"
                : "pending",
          notes: a.remarks || a.name,
          agreedCost: calcCost,
          paidAmount: paid,
          balanceDue: Math.max(0, calcCost - paid),
          rawAssignment: a,
        };
      });

      // Fleet — only update state when transport API actually responded (don't wipe on error)
      const initialFleet = transports.map((t: any, idx: number, arr: any[]) => {
        const rawName =
          t.name ||
          t.vehicleName ||
          (t.vendor?.name
            ? `${t.vendor.name} (${t.vehicleType || "Tempo Traveller"})`
            : t.driverName || `Tempo ${idx + 1}`);
        const sameNameCount = arr.filter(
          (x: any) =>
            (x.name || x.vehicleName || x.driverName || x.vendor?.name) ===
            (t.name || t.vehicleName || t.driverName || t.vendor?.name),
        ).length;
        const occurIdx = arr
          .slice(0, idx + 1)
          .filter(
            (x: any) =>
              (x.name || x.vehicleName || x.driverName || x.vendor?.name) ===
              (t.name || t.vehicleName || t.driverName || t.vendor?.name),
          ).length;
        const displayName =
          sameNameCount > 1 && !rawName.includes("#")
            ? `${rawName} #${occurIdx}`
            : rawName;
        return {
          id: t.id || `tempo-${idx + 1}`,
          name: displayName,
          vehicleType: t.vehicleType || "14 Seater Tempo Traveller",
          vehicleNumber: t.vehicleNumber || t.registrationNumber || "",
          driverName: t.driverName || "",
          driverPhone: t.driverPhone || t.phone || "",
          capacity: Number(t.capacity) || 14,
          cost: Number(t.totalAmount) || 0,
          vendor: t.vendor?.name || t.notes || "Self-driven",
        };
      });
      // Only overwrite fleet when the API actually returned vehicles OR when switching
      // departures (resetFleet=true already cleared it above).  This prevents a
      // successful-but-empty transport response from wiping a fleet the user just built.
      if (transportFetched) {
        setAllocFleet(initialFleet);
      }

      const hotels =
        hotelsRes.status === "fulfilled" ? hotelsRes.value?.data?.data || [] : [];
      const guides =
        guidesRes.status === "fulfilled" ? guidesRes.value?.data?.data || [] : [];

      // Mapped tripVendors
      const mappedVendors = [
        ...hotels.map((h: any) => ({
          id: h.id,
          sourceId: h.id,
          sourceType: "hotel",
          name: h.hotelName || h.vendor?.name || "Hotel Vendor",
          vendorType: "hotel",
          category: "Hotels",
          vendorId: {
            id: h.vendorId || h.vendor?.id,
            name: h.hotelName || h.vendor?.name || "Hotel Vendor",
            location: h.location,
            notes: h.notes,
          },
          paymentStatus: opsRecordedPaymentStatus(
            Number(h.advancePaid || 0),
            Number(h.totalAmount || 0),
          ),
          financeVerified: false,
          notes: h.notes,
          agreedCost: h.totalAmount,
          paidAmount: h.advancePaid,
          balanceDue: h.balanceAmount,
          numberOfRooms: h.numberOfRooms,
          confirmed: h.confirmed || "CONFIRMED",
          rawAssignment: h,
        })),
        ...transports.map((t: any, idx: number) => {
          const vTitle =
            t.vendor?.name || t.notes || t.driverName || "Transport Partner";
          const sameVendorCount = transports.filter(
            (o: any) =>
              (o.vendor?.name || o.notes || o.driverName) === vTitle,
          ).length;
          const displayName =
            sameVendorCount > 1
              ? `${vTitle} (${t.vehicleType || "Vehicle"} #${idx + 1})`
              : vTitle;
          return {
            id: t.id || `transport-${idx + 1}`,
            sourceId: t.id,
            sourceType: "transport",
            name: displayName,
            vendorType: "transport",
            category: "Transport",
            vendorId: {
              id: t.vendorId || t.vendor?.id,
              name: displayName,
              location: t.notes || "Local",
            },
            paymentStatus: opsRecordedPaymentStatus(
              Number(t.advancePaid || 0),
              Number(t.totalAmount || 0),
            ),
            financeVerified: false,
            agreedCost: Number(t.totalAmount || 0),
            paidAmount: Number(t.advancePaid || 0),
            balanceDue: Math.max(
              0,
              Number(t.totalAmount || 0) - Number(t.advancePaid || 0),
            ),
            rawAssignment: t,
          };
        }),
        ...listActiveAssignedGuides(guides).map((g: any) => ({
            id: g.id,
            sourceId: g.id,
            sourceType: "guide",
            name: g.guideName || g.guide?.name || "Lead Guide",
            vendorType: "guide",
            category: "Guides",
            vendorId: {
              id: g.vendorId || g.guide?.id,
              name: g.guideName || g.guide?.name || "Lead Guide",
              location: "Guide Partner",
            },
            paymentStatus: opsRecordedPaymentStatus(
              Number(g.advancePaid || 0),
              Number(g.agreedAmount || 0),
            ),
            financeVerified: false,
            agreedCost: g.agreedAmount,
            paidAmount: g.advancePaid,
            balanceDue: g.balanceAmount,
            rawAssignment: g,
          })),
        ...mappedActivities,
      ];

      // Merge explicit OpsVendorPayment records
      const recordedPayments =
        opsPaymentsRes.status === "fulfilled" &&
        Array.isArray(opsPaymentsRes.value?.data?.data)
          ? opsPaymentsRes.value.data.data
          : [];

      const mergedVendors = mergeOpsVendorPayments(mappedVendors, recordedPayments);
      setTripVendors(mergedVendors);
      setDepLoadErrors(nextErrors);
      if (bookingsIncompleteFlag) {
        nextErrors.bookingsIncomplete =
          "Not all bookings could be loaded. Passenger list may be incomplete.";
        setDepLoadErrors({ ...nextErrors });
      }

      const checkRes = await api
        .get(`/ops/checklists/${tripId}?departureDate=${departureDateStr}`)
        .catch(() => null);
      if (checkRes?.data?.success && checkRes.data.data.length > 0) {
        setChecklistTasks(checkRes.data.data);
      } else {
        const key = `${tripId}-${departureDateStr}`;
        if (initializationKeyRef.current !== key) {
          initializationKeyRef.current = key;
          const initRes = await api
            .post(
              `/ops/checklists/${tripId}/initialize?departureDate=${departureDateStr}`,
            )
            .catch(() => {
              initializationKeyRef.current = null;
              return null;
            });
          if (initRes?.data?.success) {
            setChecklistTasks(initRes.data.data);
          }
        }
      }

      // Load confirmed room + vehicle allocations and hydrate manual shuffler
      const allocRes = await api
        .get(
          `/ops/auto-allocate/${tripId}/confirmed?departureDate=${departureDateStr}`,
        )
        .catch((err: any) => { console.warn("[HYDRATE] allocRes fetch failed:", err?.message); return null; });
      console.log("[HYDRATE] allocRes success?", allocRes?.data?.success, "vehicles:", allocRes?.data?.data?.vehicles?.length, "rooms:", allocRes?.data?.data?.rooms?.length);
      console.log("[HYDRATE] initialFleet:", initialFleet.map((f: any) => ({ id: f.id, name: f.name })));
      if (allocRes?.data?.success) {
        const { rooms = [], vehicles = [] } = allocRes.data.data;
        console.log("[HYDRATE] Will hydrate", vehicles.length, "vehicles,", rooms.length, "rooms");
        if (rooms.length > 0 || vehicles.length > 0) {
          // Use the same passenger identity scheme as the rest of the hub
          // (UUID bookingId + bookingRef + co-pax ids) so room/tempo rows rematch.
          const currentPassengersList = mapBookingsToDeparturePassengers(
            loadedBookings,
            departureDateStr,
            {},
          );

          // Build fleetId-to-name map from initialFleet
          const fleetNameMap: Record<string, string> = {};
          initialFleet.forEach((f: any) => {
            fleetNameMap[f.id] = f.name;
          });

          // Also include fleet names directly from returned vehicles
          (vehicles as any[]).forEach((v: any) => {
            if (v.fleetId && (v.fleet?.driverName || v.fleet?.vehicleType)) {
              fleetNameMap[v.fleetId] = v.fleet.driverName || v.fleet.vehicleType;
            }
          });

          // If no initial fleet is saved in transport records, auto-restore fleet from saved vehicles.
          // This handles the case where getTransportFleet failed or returned empty unexpectedly.
          const distinctFleetIds = [...new Set((vehicles as any[]).map((v: any) => v.fleetId).filter(Boolean))] as string[];
          if (distinctFleetIds.length > 0 && initialFleet.length === 0) {
            const restoredFleet = distinctFleetIds.map((fId, idx) => {
              const vMatch = (vehicles as any[]).find((v: any) => v.fleetId === fId);
              const displayName = vMatch?.fleet?.driverName || fleetNameMap[fId] || (fId === "tempo-1" ? "Tempo 1" : (fId.startsWith("tempo") ? `Tempo ${idx + 1}` : `Tempo ${idx + 1}`));
              return {
                id: fId,
                name: displayName,
                vehicleType: vMatch?.fleet?.vehicleType || "Tempo Traveller",
                capacity: vMatch?.fleet?.capacity || 17,
                cost: 0,
                vendor: "Lead Transport",
              };
            });
            setAllocFleet(restoredFleet);
            restoredFleet.forEach((f) => {
              fleetNameMap[f.id] = f.name;
            });

            // Re-fetch actual fleet details in background to get proper names/capacity
            opsService.getTransportFleet(tripId, { departureDate: departureDateStr })
              .then((freshFleet: any[]) => {
                if (freshFleet && freshFleet.length > 0) {
                  const correctedFleet = freshFleet.map((t: any, idx: number) => ({
                    id: t.id,
                    name: t.driverName || (t.vendor?.name ? `${t.vendor.name} (${t.vehicleType})` : `Tempo ${idx + 1}`),
                    vehicleType: t.vehicleType || "Tempo Traveller",
                    vehicleNumber: t.vehicleNumber || t.registrationNumber || "",
                    driverName: t.driverName || "",
                    driverPhone: t.driverPhone || t.phone || "",
                    capacity: Number(t.capacity) || 17,
                    cost: Number(t.totalAmount) || 0,
                    vendor: t.vendor?.name || t.notes || "Lead Transport",
                  }));
                  setAllocFleet(correctedFleet);
                }
              })
              .catch(() => { /* keep synthetic fleet on error */ });
          }

          setPassengerAllocations((prev: any) => {
            const next: Record<string, any> = { ...prev };

            const claimedRoom = new Set<string>();
            rooms.forEach((r: any) => {
              const pObj = matchPassengerForOpsRow(
                currentPassengersList,
                {
                  passengerId: r.passengerId,
                  bookingId: r.bookingId,
                  travelerName: r.travelerName,
                },
                claimedRoom,
              );
              if (!pObj?.id) return;
              claimedRoom.add(String(pObj.id));
              const existing = next[pObj.id] || { vehicle: "—", seat: "—" };
              next[pObj.id] = {
                ...existing,
                id: pObj.id,
                room: r.roomNumber,
              };
            });

            const claimedVehicle = new Set<string>();
            vehicles.forEach((v: any) => {
              const pObj = matchPassengerForOpsRow(
                currentPassengersList,
                {
                  passengerId: v.passengerId,
                  bookingId: v.bookingId,
                  travelerName: v.travelerName,
                },
                claimedVehicle,
              );
              if (!pObj?.id) return;
              claimedVehicle.add(String(pObj.id));
              const vName =
                v.fleet?.driverName ||
                fleetNameMap[v.fleetId] ||
                initialFleet.find((f: any) => f.id === v.fleetId)?.name ||
                (initialFleet.length === 1 ? initialFleet[0].name : v.fleetId);
              if (!vName) return;
              const existing = next[pObj.id] || { room: "—" };
              next[pObj.id] = {
                ...existing,
                id: pObj.id,
                vehicle: vName,
                fleetId: v.fleetId,
                seat: v.seatNumber ? String(v.seatNumber) : "—",
              };
            });

            return next;
          });

          // Debug: log what was hydrated
          console.log("[HYDRATE] passengerAllocations set with", vehicles.length, "vehicles. Sample keys will be logged next render.");

          // Also restore manualRooms from saved allocation room numbers
          const savedRoomNumbers = [...new Set((rooms as any[]).map((r: any) => r.roomNumber as string))].filter(Boolean) as string[];
          if (savedRoomNumbers.length > 0) {
            setManualRooms(savedRoomNumbers);
          }
        }
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasValidDeparture) return;
    fetchPageData(true); // reset fleet when switching departures
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, departureDateStr, hasValidDeparture]);
useEffect(() => {
  if (activeTab !== 'transport' || !tripId) return;
  const controller = new AbortController();

  // 1. Fetch departure fleet
  opsService
    .getTransportFleet(tripId, { departureDate: departureDateStr, includeRates: true })
    .then((fresh) => {
      setFleetVehicles(fresh || []);
      if (Array.isArray(fresh) && fresh.length > 0) {
        const mapped = fresh.map((t: any, idx: number) => ({
          id: t.id || `tempo-${idx + 1}`,
          name:
            t.driverName ||
            (t.vendor?.name
              ? `${t.vendor.name} (${t.vehicleType || "Tempo"})`
              : `Tempo ${idx + 1}`),
          vehicleType: t.vehicleType || "14 Seater Tempo Traveller",
          vehicleNumber: t.vehicleNumber || t.registrationNumber || "",
          driverName: t.driverName || "",
          driverPhone: t.driverPhone || t.phone || "",
          capacity: Number(t.capacity) || 14,
          cost: Number(t.totalAmount) || 0,
          vendor: t.vendor?.name || t.notes || "Self-driven",
        }));
        setAllocFleet(mapped);
      }
    })
    .catch(() => setFleetVehicles([]));

  // 2. Fetch TRIP-SPECIFIC transport vendors & rates from Vendor Directory
  api
    .get(`/vendors/directory?type=TRANSPORT&tripId=${encodeURIComponent(tripId)}&limit=100`)
    .then(async (res) => {
      let vendors = res.data?.data || [];

      const masterItems: any[] = [];
      const seenKeys = new Set<string>();

      vendors.forEach((v: any) => {
        const vName = (v.name || 'Vendor').trim();
        if (
          !vName ||
          vName.length < 3 ||
          ["mm", "oo", "qqq", "test", "demo"].includes(vName.toLowerCase())
        ) {
          return;
        }

        let extractedVehicles: any[] = [];

        // 1. Primary: Route Contracts from Vendor Management (routePricingGroups.vehicleRates)
        if (Array.isArray(v.routePricingGroups) && v.routePricingGroups.length > 0) {
          v.routePricingGroups.forEach((g: any) => {
            const vRates = g.vehicleRates || g.routeRates || [];
            if (Array.isArray(vRates)) {
              vRates.forEach((vr: any) => {
                const vType = vr.vehicle?.vehicleName || vr.vehicleNameSnapshot || vr.vehicleType;
                if (!vType) return;
                const cap = vr.vehicle?.advertisedCapacity || vr.advertisedCapacity || vr.capacity || (vType.match(/\d+/) ? parseInt(vType.match(/\d+/)[0]) : 17);
                const sellable = vr.sellableSeats || cap;
                const cost = Number(vr.totalVehicleAmount || vr.amount || 0);
                extractedVehicles.push({
                  id: vr.id,
                  vehicleType: vType,
                  capacity: cap,
                  sellableSeats: sellable,
                  cost: cost,
                });
              });
            }
          });
        }

        // 2. Secondary: Direct Transport Rates
        if (extractedVehicles.length === 0 && Array.isArray(v.transportRates) && v.transportRates.length > 0) {
          v.transportRates.forEach((r: any) => {
            const vType = r.vehicleType || r.model || "17 Seater Tempo Traveller";
            const cap = r.advertisedCapacity || r.seatCapacity || r.capacity || 17;
            const sellable = r.sellableSeats || cap;
            const cost = Number(r.totalVehicleCost || r.totalVehicleAmount || r.amount || r.rate || 0);
            extractedVehicles.push({
              id: r.id,
              vehicleType: vType,
              capacity: cap,
              sellableSeats: sellable,
              cost: cost,
            });
          });
        }

        extractedVehicles.forEach((r: any) => {
          const vType = r.vehicleType;
          const cap = r.capacity;
          const sellable = r.sellableSeats || cap;
          const cost = r.cost;

          const itemKey = `${v.id}-${vType.toLowerCase().trim()}-${cap}`;
          if (seenKeys.has(itemKey)) return;
          seenKeys.add(itemKey);

          masterItems.push({
            id: r.id || `dir-${v.id}-${vType.toString().replace(/\s+/g, "-").toLowerCase()}`,
            vendorId: v.id,
            vendorName: vName,
            vehicleType: vType,
            capacity: cap,
            sellableSeats: sellable,
            cost: cost,
            driverName: `${vName} ${vType}`,
            label: `${vType} – ${vName} (${cap} Seats / ${sellable} Sellable)${cost > 0 ? ` – ₹${cost.toLocaleString("en-IN")}` : ""}`,
          });
        });
      });

      setVendorDirectoryFleet(masterItems);
    })
    .catch(() => setVendorDirectoryFleet([]));

  return () => controller.abort();
}, [activeTab, tripId, departureDateStr]);
  const handleModalFieldChange = (
    name: string,
    field: string,
    value: string,
  ) => {
    setModalAllocations((prev) => {
      const updated = {
        ...prev,
        [name]: {
          ...(prev[name] || {
            roomType: "Single",
            coupleWith: "",
            groupId: "",
          }),
          [field]: value,
        },
      };

      // Auto-linking couples/double sharing: if passenger A is coupled with B, automatically set B's coupleWith to A and type to A's type
      if (field === "coupleWith" && value) {
        updated[value] = {
          ...(updated[value] || {
            roomType: "Double",
            coupleWith: "",
            groupId: "",
          }),
          roomType: updated[name].roomType || "Double",
          coupleWith: name,
        };
        // Auto-match group id if available
        if (updated[name].groupId) {
          updated[value].groupId = updated[name].groupId;
        }
      } else if (
        field === "groupId" &&
        (updated[name]?.roomType !== "Single" &&
          updated[name]?.roomType !== "Individual") &&
        updated[name]?.coupleWith
      ) {
        const partner = updated[name].coupleWith;
        if (updated[partner]) {
          updated[partner].groupId = value;
        }
      }

      return updated;
    });
  };

  const handleSaveRoomAllocations = async () => {
    if (!selectedBookingForRoomAlloc) return;
    const bg = selectedBookingForRoomAlloc;

    try {
      const currentPassengers = bg.rawBooking.passengers || {
        details: {},
        persons: [],
      };
      const currentDetails = currentPassengers.details || {};

      const newPersonsRoomDetails = {
        ...(currentDetails.personsRoomDetails || {}),
        ...modalAllocations,
      };

      const updatedPassengers = {
        ...currentPassengers,
        details: {
          ...currentDetails,
          personsRoomDetails: newPersonsRoomDetails,
        },
      };

      await api.put(`/bookings/${bg.bookingId}`, {
        passengers: updatedPassengers,
      });

      toast.success("Room allocations saved successfully!");
      setSelectedBookingForRoomAlloc(null);
      await fetchPageData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save room allocations");
    }
  };

  const getRelationshipBadge = (type: string) => {
    return (
      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-white text-[#0B1528] border-[#E8EEF4]">
        {type || "Single"}
      </span>
    );
  };

  const handleToggleTask = async (task: any) => {
    try {
      const isCompleted = task.isCompleted;
      const endpoint = isCompleted
        ? "/ops/checklists/reopen"
        : "/ops/checklists/complete";
      const notes = isCompleted
        ? "Reopened via departure hub checklist"
        : "Completed via departure hub checklist";
      const res = await api.post(endpoint, { id: task.id, notes });
      if (res.data?.success) {
        toast.success(
          `Task ${isCompleted ? "reopened" : "completed"} successfully!`,
        );
        const checkRes = await api
          .get(`/ops/checklists/${tripId}?departureDate=${departureDateStr}`)
          .catch(() => null);
        if (checkRes?.data?.success) {
          setChecklistTasks(checkRes.data.data);
        }
      }
    } catch (err) {
      toast.error("Failed to update checklist item");
    }
  };

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const handleOpenBookingDetails = (bookingId: string) => {
    const b = bookings.find(
      (bk: any) => bk.id === bookingId || bk.bookingId === bookingId,
    );
    if (b) {
      setSelectedBooking(b);
      setBookingModalOpen(true);
    } else {
      toast.error("Booking details not found");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      id: `msg-sent-${Date.now()}`,
      convId: activeConv,
      sender: admin?.name || admin?.email || "Admin",
      avatar: "SK",
      role: "Operations Manager",
      text: chatInput,
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMine: true,
      reactions: [],
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    toast.success("Message sent!");
  };

  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskStage, setNewTaskStage] = useState("PRE_TRIP_7D");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      toast.error("Task name is required");
      return;
    }
    try {
      const res = await api.post(
        `/ops/checklists/create?tripId=${tripId}&departureDate=${departureDateStr}`,
        {
          taskName: newTaskName,
          stage: newTaskStage,
          notes: newTaskNotes,
        },
      );
      if (res.data?.success) {
        toast.success("Task created successfully!");
        const checkRes = await api
          .get(`/ops/checklists/${tripId}?departureDate=${departureDateStr}`)
          .catch(() => null);
        if (checkRes?.data?.success) {
          setChecklistTasks(checkRes.data.data);
        }
        setAddTaskModalOpen(false);
        setNewTaskName("");
        setNewTaskNotes("");
      }
    } catch (err) {
      toast.error("Failed to create checklist task");
    }
  };

  const [timelineView, setTimelineView] = useState(false);
  const [editDepartureOpen, setEditDepartureOpen] = useState(false);
  const [addPassengerOpen, setAddPassengerOpen] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  // New Passenger Form State
  const [newPaxName, setNewPaxName] = useState("");
  const [newPaxPhone, setNewPaxPhone] = useState("");
  const [newPaxAge, setNewPaxAge] = useState("24");
  const [newPaxGender, setNewPaxGender] = useState("Male");
  const [newPaxAmount, setNewPaxAmount] = useState("14000");

  // Edit Departure Details Form State
  const [editGuideName, setEditGuideName] = useState("");
  const [editVehicleDetails, setEditVehicleDetails] = useState(
    "Tempo Traveller 17 Str",
  );
  const [editStatus, setEditStatus] = useState("CONFIRMED");

  // Hotel Edit States
  const [editHotelOpen, setEditHotelOpen] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [hotelNameForm, setHotelNameForm] = useState("");
  const [hotelLocationForm, setHotelLocationForm] = useState("");
  const [hotelRoomTypeForm, setHotelRoomTypeForm] = useState("");
  const [hotelRoomsForm, setHotelRoomsForm] = useState(1);
  const [hotelCostForm, setHotelCostForm] = useState(0);
  const [hotelPaidForm, setHotelPaidForm] = useState(0);
  const [hotelConfirmedForm, setHotelConfirmedForm] = useState("UNCONFIRMED");
  const [hotelNotesForm, setHotelNotesForm] = useState("");

  // Transport Edit States
  const [editTransportOpen, setEditTransportOpen] = useState(false);
  const [selectedTransportId, setSelectedTransportId] = useState("");
  const [vehicleTypeForm, setVehicleTypeForm] = useState("");
  const [capacityForm, setCapacityForm] = useState(13);
  const [routeForm, setRouteForm] = useState("");
  const [driverNameForm, setDriverNameForm] = useState("");
  const [driverPhoneForm, setDriverPhoneForm] = useState("");
  const [transportCostForm, setTransportCostForm] = useState(0);
  const [transportPaidForm, setTransportPaidForm] = useState(0);
  const [transportNotesForm, setTransportNotesForm] = useState("");

  // Hotel Pricing Automation states
  const [pricingMethod, setPricingMethod] = useState<string>("per-person");

  // Per Room Rates
  const [doubleRate, setDoubleRate] = useState(2200);
  const [tripleRate, setTripleRate] = useState(3000);
  const [quadRate, setQuadRate] = useState(3800);
  const [extraPersonRate, setExtraPersonRate] = useState(700);
  const [extraChildRate, setExtraChildRate] = useState(0);

  // Per Person Rates
  const [adultRate, setAdultRate] = useState(950);
  const [childRate, setChildRate] = useState(700);

  // Pax counts (For PER_PERSON)
  const [totalAdults, setTotalAdults] = useState(36);
  const [totalChild, setTotalChild] = useState(6);

  // Room Requirements (For PER_ROOM)
  const [doubleRoomsCount, setDoubleRoomsCount] = useState(12);
  const [tripleRoomsCount, setTripleRoomsCount] = useState(6);
  const [quadRoomsCount, setQuadRoomsCount] = useState(0);
  const [extraPersonsCount, setExtraPersonsCount] = useState(0);

  const [checkInDateForm, setCheckInDateForm] = useState("");
  const [checkOutDateForm, setCheckOutDateForm] = useState("");
  const [hotelNightsCount, setHotelNightsCount] = useState(2);
  const [hotelVendorId, setHotelVendorId] = useState("");
  const [voucherStatusForm, setVoucherStatusForm] = useState("PENDING");

  const [overrideApplied, setOverrideApplied] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(0);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideAuthor, setOverrideAuthor] = useState("Super Admin");

  const [overrideTripleRate, setOverrideTripleRate] = useState(false);
  const [overrideQuadRate, setOverrideQuadRate] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [activeCalculationDrawer, setActiveCalculationDrawer] = useState<
    string | null
  >(null);
  const [editingHotel, setEditingHotel] = useState<any | null>(null);
  const [isSavingHotel, setIsSavingHotel] = useState(false);

  // Calculated Hotel Cost logic
  let doubleCost = 0;
  let tripleCost = 0;
  let quadCost = 0;
  let extraPersonCost = 0;
  let adultCost = 0;
  let childCost = 0;
  let calculatedTotalCost = 0;

  if ((pricingMethod || "per-person").toLowerCase() === "per-person") {
    adultCost = totalAdults * adultRate * hotelNightsCount;
    childCost = totalChild * childRate * hotelNightsCount;
    calculatedTotalCost = adultCost + childCost;
  } else {
    doubleCost = doubleRoomsCount * doubleRate * hotelNightsCount;
    tripleCost = tripleRoomsCount * tripleRate * hotelNightsCount;
    quadCost = quadRoomsCount * quadRate * hotelNightsCount;
    extraPersonCost = extraPersonsCount * extraPersonRate * hotelNightsCount;
    calculatedTotalCost = doubleCost + tripleCost + quadCost + extraPersonCost;
  }

  const hotelGst = 0;
  const grandTotalCost = calculatedTotalCost;

  const totalPaxCapacity = (pricingMethod || "per-person").toLowerCase() === "per-person" ? totalAdults + totalChild : (doubleRoomsCount * 2) + (tripleRoomsCount * 3) + (quadRoomsCount * 4) + extraPersonsCount;

  const formatDateToYYYYMMDD = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleCheckInChange = (newVal: string) => {
    setCheckInDateForm(newVal);
    if (newVal) {
      const d = new Date(newVal);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + hotelNightsCount);
        setCheckOutDateForm(formatDateToYYYYMMDD(d));
      }
    }
  };

  const handleNightsChange = (nights: number) => {
    setHotelNightsCount(nights);
    if (checkInDateForm) {
      const d = new Date(checkInDateForm);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + nights);
        setCheckOutDateForm(formatDateToYYYYMMDD(d));
      }
    }
  };
  const handleOpenEditHotel = (row: any) => {
    const raw = row.rawAssignment || {};
    setSelectedHotelId(row.id);
    setHotelNameForm(raw.hotelName || row.hotel || "");
    setHotelLocationForm(raw.location || row.sub || "");
    setHotelRoomTypeForm(raw.roomType || row.type || "Deluxe Stay");
    setHotelRoomsForm(raw.numberOfRooms || 1);
    setHotelCostForm(raw.totalAmount || 0);
    setHotelPaidForm(raw.advancePaid || 0);
    setHotelConfirmedForm(
      raw.confirmed ||
        (row.status === "CONFIRMED" ? "CONFIRMED" : "UNCONFIRMED"),
    );
    setVoucherStatusForm(raw.voucherStatus || "PENDING");

    // Pricing Automation fallback unpacking
    let pricingData: any = null;
    if (raw.notes && raw.notes.trim().startsWith("{")) {
      try {
        pricingData = JSON.parse(raw.notes);
      } catch (_e) {
        /* ignore invalid JSON */
      }
    }

    const dayNumStr = row.day
      ? String(row.day).replace("Day ", "").trim()
      : "1";
    const dayIndex = parseInt(dayNumStr) - 1 || 0;

    const dCheckIn = new Date(departureDateStr);
    if (!isNaN(dCheckIn.getTime())) {
      dCheckIn.setDate(dCheckIn.getDate() + dayIndex);
    }
    const calculatedCheckIn = formatDateToYYYYMMDD(dCheckIn);

    const dCheckOut = new Date(dCheckIn);
    if (!isNaN(dCheckOut.getTime())) {
      dCheckOut.setDate(dCheckOut.getDate() + (row.nights || 1));
    }
    const calculatedCheckOut = formatDateToYYYYMMDD(dCheckOut);

    if (pricingData && pricingData.__isHotelPricing) {
      setPricingMethod(pricingData.pricingMethod || "room-wise");
      setDoubleRate(pricingData.rates?.doubleRate ?? 2600);
      setTripleRate(pricingData.rates?.tripleRate ?? 3400);
      setQuadRate(pricingData.rates?.quadRate ?? 4200);
      setExtraPersonRate(pricingData.rates?.extraPersonRate ?? 800);
      setExtraChildRate(pricingData.rates?.extraChildRate ?? 0);

      setDoubleRoomsCount(pricingData.allocations?.doubleRoomsCount ?? 5);
      setTripleRoomsCount(pricingData.allocations?.tripleRoomsCount ?? 0);
      setQuadRoomsCount(pricingData.allocations?.quadRoomsCount ?? 0);
      setExtraPersonsCount(pricingData.allocations?.extraPersonsCount ?? 0);

      setCheckInDateForm(pricingData.checkInDate || calculatedCheckIn);
      setCheckOutDateForm(pricingData.checkOutDate || calculatedCheckOut);
      setHotelNightsCount(pricingData.nightsCount || row.nights || 1);
      setHotelVendorId(pricingData.vendorId || raw.vendorId || "");
      setVoucherStatusForm(pricingData.voucherStatus || "PENDING");

      setOverrideApplied(pricingData.override?.applied ?? false);
      setOverrideAmount(pricingData.override?.amount ?? 0);
      setOverrideReason(pricingData.override?.reason ?? "");
      setOverrideAuthor(pricingData.override?.author ?? "Super Admin");

      setOverrideTripleRate(pricingData.overrideTripleRate ?? false);
      setOverrideQuadRate(pricingData.overrideQuadRate ?? false);
      setShowInternalNotes(!!pricingData.userNotes);

      setHotelNotesForm(pricingData.userNotes || "");
    } else {
      setPricingMethod("room-wise");
      setDoubleRate(2600);
      setTripleRate(3400);
      setQuadRate(4200);
      setExtraPersonRate(800);
      setExtraChildRate(0);

      // Filter manifest to travelers for this departure/trip
      const activePassengers: any[] = [];
      const normalizeCompareName = (nameStr: string) => {
        if (!nameStr) return "";
        let clean = nameStr.toLowerCase().trim();
        if (clean.startsWith("mr. ")) clean = clean.substring(4).trim();
        else if (clean.startsWith("mrs. ")) clean = clean.substring(5).trim();
        else if (clean.startsWith("ms. ")) clean = clean.substring(4).trim();
        return clean;
      };

      bookings.forEach((b: any) => {
        let passengersObj = b.passengers;
        if (typeof passengersObj === "string") {
          try {
            passengersObj = JSON.parse(passengersObj);
          } catch (e) {
            passengersObj = {};
          }
        }

        const roomDetailsObj = b.roomDetails || passengersObj?.details || {};
        const personsRoomDetails = roomDetailsObj.personsRoomDetails || {};

        const leadName = b.fullName || b.name || "Traveler";
        const leadRoomInfo = personsRoomDetails[leadName] || {};
        const leadRoomType =
          leadRoomInfo.roomType ||
          b.roomSharing ||
          b.roomType ||
          passengersObj?.details?.roomType ||
          (b.numberOfTravelers === 1 ? "Individual" : "Double Sharing");
        const normLeadName = normalizeCompareName(leadName);

        // Add lead passenger
        activePassengers.push({
          name: leadName,
          roomSharing: leadRoomType,
        });

        // Map co-passengers from parsed passengers JSON list
        const coPax = Array.isArray(passengersObj?.persons)
          ? passengersObj.persons
          : [];
        coPax.forEach((co: any) => {
          if (normalizeCompareName(co.name) === normLeadName) return;
          const coRoomInfo = personsRoomDetails[co.name] || {};
          const coRoomType =
            coRoomInfo.roomType ||
            co.roomSharing ||
            b.roomSharing ||
            b.roomType ||
            passengersObj?.details?.roomType ||
            "Double Sharing";
          activePassengers.push({
            name: co.name || "Co-Traveler",
            roomSharing: coRoomType,
          });
        });
      });

      let twinPax = 0;
      let triplePax = 0;
      let quadPax = 0;
      let extraPax = 0;

      // Check if we have active room allocations saved in our shuffler
      const roomGroups: Record<string, number> = {};
      Object.entries(passengerAllocations).forEach(([name, alloc]) => {
        if (alloc.room && alloc.room !== "—" && alloc.room !== "Unassigned") {
          roomGroups[alloc.room] = (roomGroups[alloc.room] || 0) + 1;
        }
      });

      const hasSavedRoomAllocations = Object.keys(roomGroups).length > 0;

      if (hasSavedRoomAllocations) {
        // Calculate rooms directly from saved shuffler groups
        Object.entries(roomGroups).forEach(([room, count]) => {
          if (count === 2) {
            twinPax += 2; // 1 Double Room = 2 passengers
          } else if (count === 3) {
            triplePax += 3; // 1 Triple Room = 3 passengers
          } else if (count === 4) {
            quadPax += 4; // 1 Quad Room = 4 passengers
          } else {
            extraPax += count; // Single or extra bed passengers
          }
        });
      } else {
        // Fallback: use raw passenger preferences from the bookings sheet
        activePassengers.forEach((p: any) => {
          const sharing = (p.roomSharing || "").toLowerCase();
          if (sharing.includes("twin") || sharing.includes("double")) {
            twinPax++;
          } else if (sharing.includes("triple")) {
            triplePax++;
          } else if (sharing.includes("quad")) {
            quadPax++;
          } else {
            extraPax++;
          }
        });
      }

      setDoubleRoomsCount(twinPax);
      setTripleRoomsCount(triplePax);
      setQuadRoomsCount(quadPax);
      setExtraPersonsCount(extraPax);

      setCheckInDateForm(
        raw.checkIn ? raw.checkIn.substring(0, 10) : calculatedCheckIn,
      );
      setCheckOutDateForm(
        raw.checkOut ? raw.checkOut.substring(0, 10) : calculatedCheckOut,
      );
      setHotelNightsCount(row.nights || 1);
      setHotelVendorId(raw.vendorId || "");
      setVoucherStatusForm("PENDING");

      setOverrideApplied(false);
      setOverrideAmount(0);
      setOverrideReason("");
      setOverrideAuthor("Super Admin");

      setOverrideTripleRate(false);
      setOverrideQuadRate(false);
      setShowInternalNotes(false);

      setHotelNotesForm(raw.notes || "");
    }

    setEditingHotel(row);
  };

  const handleEditHotelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingHotel) return;
    setIsSavingHotel(true);
    try {
      // Helper to convert inputs safely to numbers
      const toFiniteNum = (val: any) => {
        const parsed = parseFloat(String(val));
        return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed);
      };
      const toFiniteInt = (val: any) => {
        const parsed = parseInt(String(val), 10);
        return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed);
      };

      const cleanDoubleRate = toFiniteNum(doubleRate);
      const cleanTripleRate = toFiniteNum(tripleRate);
      const cleanQuadRate = toFiniteNum(quadRate);
      const cleanExtraPersonRate = toFiniteNum(extraPersonRate);
      const cleanExtraChildRate = toFiniteNum(extraChildRate);

      const cleanDoubleRooms = toFiniteInt(doubleRoomsCount);
      const cleanTripleRooms = toFiniteInt(tripleRoomsCount);
      const cleanQuadRooms = toFiniteInt(quadRoomsCount);
      const cleanExtraPersons = toFiniteInt(extraPersonsCount);

      const cleanNightsCount = Math.max(1, toFiniteInt(hotelNightsCount));
      const cleanOverrideAmount = toFiniteNum(overrideAmount);
      const cleanPaid = toFiniteNum(hotelPaidForm);

      // Normalize check-in / check-out dates (format to YYYY-MM-DD or empty)
      const cleanCheckIn = checkInDateForm
        ? new Date(checkInDateForm).toISOString().substring(0, 10)
        : "";
      const cleanCheckOut = checkOutDateForm
        ? new Date(checkOutDateForm).toISOString().substring(0, 10)
        : "";

      const pricingPayload = {
        __isHotelPricing: true,
        pricingMethod,
        rates: {
          doubleRate: cleanDoubleRate,
          tripleRate: cleanTripleRate,
          quadRate: cleanQuadRate,
          extraPersonRate: cleanExtraPersonRate,
          extraChildRate: cleanExtraChildRate,
        },
        allocations: {
          doubleRoomsCount: cleanDoubleRooms,
          tripleRoomsCount: cleanTripleRooms,
          quadRoomsCount: cleanQuadRooms,
          extraPersonsCount: cleanExtraPersons,
        },
        checkInDate: cleanCheckIn,
        checkOutDate: cleanCheckOut,
        nightsCount: cleanNightsCount,
        vendorId: hotelVendorId || "",
        voucherStatus: voucherStatusForm || "PENDING",
        override: {
          applied: overrideApplied,
          amount: cleanOverrideAmount,
          reason: overrideReason || "",
          author: overrideAuthor || "Super Admin",
        },
        overrideTripleRate,
        overrideQuadRate,
        userNotes: hotelNotesForm || "",
      };

      const finalCost = overrideApplied
        ? cleanOverrideAmount
        : calculatedTotalCost;

      await opsService.saveHotelBookings(tripId, departureDateStr, [
        {
          id: selectedHotelId,
          hotelName: hotelNameForm || "",
          location: hotelLocationForm || "",
          roomType: hotelRoomTypeForm || "",
          numberOfRooms:
            (cleanDoubleRooms || 0) +
              (cleanTripleRooms || 0) +
              (cleanQuadRooms || 0) || 1,
          totalAmount: finalCost,
          advancePaid: cleanPaid,
          confirmed: hotelConfirmedForm || "UNCONFIRMED",
          notes: JSON.stringify(pricingPayload),
          pricingMethod,
          doubleRoomsCount: cleanDoubleRooms,
          tripleRoomsCount: cleanTripleRooms,
          quadRoomsCount: cleanQuadRooms,
          extraPersonsCount: cleanExtraPersons,
          nightsCount: cleanNightsCount,
          doubleRate: cleanDoubleRate,
          tripleRate: cleanTripleRate,
          quadRate: cleanQuadRate,
          extraBedRate: cleanExtraPersonRate,
          checkIn: cleanCheckIn,
          checkOut: cleanCheckOut,
          vendorId: hotelVendorId || null,
        },
      ]);

      // If override is modified, sync it with the override endpoint if needed
      if (overrideApplied) {
        await opsService
          .saveHotelOverride(tripId, {
            departureHotelId: selectedHotelId,
            fieldName: "totalAmount",
            originalValue: calculatedTotalCost,
            overriddenValue: cleanOverrideAmount,
            reason: overrideReason || "",
            advancePaid: cleanPaid,
          })
          .catch(() => null);
      } else {
        await opsService
          .resetHotelOverride(tripId, {
            departureHotelId: selectedHotelId,
          })
          .catch(() => null);
      }

      toast.success("Hotel details updated successfully!");
      setEditingHotel(null);
      fetchPageData();
    } catch (err: any) {
      console.error("Failed to save hotel bookings", err.response?.data || err);
      const errMsg =
        err.response?.data?.message || "Failed to update hotel details.";
      toast.error(errMsg);
    } finally {
      setIsSavingHotel(false);
    }
  };

  const handleOpenEditTransport = (row: any) => {
    const raw = row.rawAssignment || {};
    setSelectedTransportId(row.id);
    setVehicleTypeForm(raw.vehicleType || row.type || "");
    setCapacityForm(raw.capacity || 13);
    setRouteForm(raw.route || "");
    setDriverNameForm(raw.driverName || "");
    setDriverPhoneForm(raw.driverPhone || "");
    setTransportCostForm(raw.totalAmount || 0);
    setTransportPaidForm(raw.advancePaid || 0);
    setTransportNotesForm(raw.notes || "");
    setEditTransportOpen(true);
  };

  const handleEditTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(
        `/ops/transport/${tripId}?departureDate=${departureDateStr}`,
        {
          id: selectedTransportId,
          vehicleType: vehicleTypeForm,
          capacity: capacityForm,
          route: routeForm,
          driverName: driverNameForm,
          driverPhone: driverPhoneForm,
          totalAmount: transportCostForm,
          advancePaid: transportPaidForm,
          notes: transportNotesForm,
        },
      );
      toast.success("Transport details updated successfully!");
      setEditTransportOpen(false);
      // Refresh
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update transport details.");
    }
  };

  // Train Booking States
  const [trainBookings, setTrainBookings] = useState(() => {
    const key = `train_bookings_${tripId}_${departureDateStr}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_e) {
        /* ignore invalid JSON */
      }
    }
    return [];
  });

  const [editTrainOpen, setEditTrainOpen] = useState(false);
  const [selectedTrainId, setSelectedTrainId] = useState("");
  const [trainNameForm, setTrainNameForm] = useState("");
  const [trainPnrForm, setTrainPnrForm] = useState("");
  const [trainFromForm, setTrainFromForm] = useState("");
  const [trainToForm, setTrainToForm] = useState("");
  const [trainDepTimeForm, setTrainDepTimeForm] = useState("");
  const [trainArrTimeForm, setTrainArrTimeForm] = useState("");
  const [trainDateForm, setTrainDateForm] = useState("");
  const [trainSeatsForm, setTrainSeatsForm] = useState("");
  const [trainStatusForm, setTrainStatusForm] = useState("CONFIRMED");

  const handleOpenEditTrain = (train: any) => {
    setSelectedTrainId(train.id);
    setTrainNameForm(train.trainName);
    setTrainPnrForm(train.pnr);
    setTrainFromForm(train.from);
    setTrainToForm(train.to);
    setTrainDepTimeForm(train.depTime);
    setTrainArrTimeForm(train.arrTime);
    setTrainDateForm(train.date);
    setTrainSeatsForm(train.seats);
    setTrainStatusForm(train.status);
    setEditTrainOpen(true);
  };

  const handleEditTrainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = trainBookings.map((t: any) => {
      if (t.id === selectedTrainId) {
        return {
          ...t,
          trainName: trainNameForm,
          pnr: trainPnrForm,
          from: trainFromForm,
          to: trainToForm,
          depTime: trainDepTimeForm,
          arrTime: trainArrTimeForm,
          date: trainDateForm,
          seats: trainSeatsForm,
          status: trainStatusForm,
        };
      }
      return t;
    });
    setTrainBookings(updated);
    localStorage.setItem(
      `train_bookings_${tripId}_${departureDateStr}`,
      JSON.stringify(updated),
    );
    toast.success("Train booking details updated successfully!");
    setEditTrainOpen(false);
  };

  const handlePrintManifest = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please allow popups.");
      return;
    }

    const rowsHtml = allPassengers
      .map(
        (p, i) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px; text-align: center; font-size: 11px;">${i + 1}</td>
        <td style="padding: 10px; font-weight: bold; font-size: 11px;">${p.name}</td>
        <td style="padding: 10px; font-size: 11px;">${p.bookingId}</td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold; color: #1E293B;">${p.phone || "—"}</td>
        <td style="padding: 10px; font-size: 11px;">${p.gender || "—"} (${p.age ?? "—"})</td>
        <td style="padding: 10px; font-size: 11px;">${p.pickupPoint || "—"}</td>
        <td style="padding: 10px; font-family: monospace; font-size: 11px; font-weight: bold;">${p.roomNo || "—"}</td>
      </tr>
    `,
      )
      .join("");

    const manifestHtml = `
      <html>
        <head>
          <title>Passenger Manifest - ${tripId} (${departureDateStr})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1E293B; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; border: 1px solid #E2E8F0; }
            th { background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; padding: 12px 10px; font-size: 10px; text-transform: uppercase; font-weight: bold; color: #475569; text-align: left; }
            h1 { font-size: 22px; margin: 0; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
            .header-meta { display: flex; gap: 30px; margin-top: 12px; font-size: 11px; color: #475569; border-bottom: 2px dashed #E2E8F0; padding-bottom: 18px; }
            .meta-item { display: flex; flex-direction: column; gap: 3px; }
            .meta-label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #94A3B8; }
            .meta-val { font-size: 12px; font-weight: bold; color: #0F172A; }
          </style>
        </head>
        <body>
          <h1>DEPARTURE MANIFEST</h1>
          <div class="header-meta">
            <div class="meta-item"><span class="meta-label">Trip Code</span><span class="meta-val">${tripId}</span></div>
            <div class="meta-item"><span class="meta-label">Itinerary</span><span class="meta-val">${printTripTitle(tripDetails?.title)}</span></div>
            <div class="meta-item"><span class="meta-label">Date</span><span class="meta-val">${departureDateStr}</span></div>
            <div class="meta-item"><span class="meta-label">Tour Lead</span><span class="meta-val">${leadGuideName}</span></div>
            <div class="meta-item"><span class="meta-label">Pax Count</span><span class="meta-val">${allPassengers.length} Verified</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">S.No</th>
                <th>Passenger Name</th>
                <th>Booking ID</th>
                <th>Phone Number</th>
                <th>Gender (Age)</th>
                <th>Pickup Point</th>
                <th>Room Allocation</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(manifestHtml);
    printWindow.document.close();
  };

  const handleDownloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }
    const cleanData = data.map((item) => {
      const cleanObj = { ...item };
      delete cleanObj.rawTask;
      delete cleanObj.id;
      return cleanObj;
    });
    const headers = Object.keys(cleanData[0]).join(",");
    const rows = cleanData.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} exported successfully!`);
  };

  const handleAddPassengerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaxName.trim() || !newPaxPhone.trim()) {
      toast.error("Name and Phone are required");
      return;
    }
    toast.error("Passengers must be added from Bookings. The hub does not create booking records.");
    return;
  };

  const handleEditDepartureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadGuideName(editGuideName);
    toast.success("Departure details updated successfully!");
    setEditDepartureOpen(false);
  };

  // Dynamic Overview Calculations
  const stats = useMemo(
    () => {
      const confirmedBookings = bookings.filter(
        (b: any) => b.status !== "cancelled",
      );

      // Revenue & Customer Payments — use same CLEARED rules as passenger rows
      const bookingFins = confirmedBookings.map((b: any) =>
        calculateBookingFinancialStatus(b),
      );
      const totalRevenue = bookingFins.reduce(
        (sum, fin) => sum + fin.totalAmount,
        0,
      );
      const customerPaid = bookingFins.reduce(
        (sum, fin) => sum + fin.netPaidAmount,
        0,
      );
      const customerOutstanding = bookingFins.reduce(
        (sum, fin) => sum + fin.remainingAmount,
        0,
      );
      const totalParticipants =
        confirmedBookings.reduce(
          (sum: number, b: any) => sum + countBookingTravelers(b),
          0,
        ) || (confirmedBookings.length > 0 ? confirmedBookings.length : 0);
      const outstandingParticipantsCount = countOutstandingParticipants({
        bookings: confirmedBookings,
        activePassengers: allPassengers.filter((p: any) => !p.isCancelled),
      });

      // Vendor Payments (filtered from opsHotels, allocFleet, dbGuides, and tripVendors)
      const calculateHotelCost = (h: any) => {
        const dRooms = Number(h?.doubleRoomsCount || 0);
        const tRooms = Number(h?.tripleRoomsCount || 0);
        const qRooms = Number(h?.quadRoomsCount || 0);
        const exPax = Number(h?.extraPersonsCount || 0);
        const nights = Math.max(1, Number(h?.nightsCount || 1));
        const dRate = Number(h?.doubleRate || 0);
        const tRate = Number(h?.tripleRate || 0);
        const qRate = Number(h?.quadRate || 0);
        const exRate = Number(h?.extraBedRate || 0);
        const method = String(h?.pricingMethod || "").toLowerCase();
        const isPerPerson =
          method.includes("person") || method.includes("pax");

        let fromRates = 0;
        if (isPerPerson) {
          fromRates =
            (dRooms * 2 * dRate +
              tRooms * 3 * tRate +
              qRooms * 4 * qRate +
              exPax * exRate) *
            nights;
        } else if (dRooms + tRooms + qRooms + exPax > 0 && (dRate || tRate || qRate || exRate)) {
          fromRates =
            (dRooms * dRate + tRooms * tRate + qRooms * qRate + exPax * exRate) *
            nights;
        }

        if (fromRates > 0) return fromRates;
        if (Number(h?.totalAmount) > 0) return Number(h.totalAmount);
        const rooms = Number(h?.numberOfRooms || h?.roomsCount || 0);
        const rate = Number(h?.doubleRate || h?.roomRate || h?.baseRate || h?.quadRate || 0);
        if (rooms > 0 && rate > 0) return rooms * rate * nights;
        return 0;
      };

      const hotelsCost = Math.max(
        (opsHotels || []).reduce((sum: number, h: any) => sum + calculateHotelCost(h), 0),
        tripVendors
          .filter((v) => v.vendorType === "hotel" || v.category === "Hotels")
          .reduce((sum, v) => sum + (Number(v.agreedCost ?? v.totalAmount) || 0), 0)
      );
      const hotelsPaid = Math.max(
        (opsHotels || []).reduce((sum: number, h: any) => sum + (Number(h.advancePaid) || 0), 0),
        tripVendors
          .filter((v) => v.vendorType === "hotel" || v.category === "Hotels")
          .reduce((sum, v) => sum + (Number(v.paidAmount ?? v.advancePaid) || 0), 0)
      );
      const transportsCost = Math.max(
        (allocFleet || []).reduce((sum: number, f: any) => sum + (Number(f.cost) || 0), 0),
        tripVendors
          .filter((v) => v.vendorType === "transport" || v.category === "Transport")
          .reduce((sum, v) => sum + (Number(v.agreedCost ?? v.totalAmount) || 0), 0)
      );
      const transportsPaid = tripVendors
        .filter((v) => v.vendorType === "transport" || v.category === "Transport")
        .reduce((sum, v) => sum + (Number(v.paidAmount ?? v.advancePaid) || 0), 0);
      const activeGuides = listActiveAssignedGuides(dbGuides);
      const guidesCost = Math.max(
        activeGuides.reduce((sum: number, g: any) => sum + (Number(g.agreedAmount) || 0), 0),
        tripVendors
          .filter((v) => v.vendorType === "guide" || v.category === "Guides")
          .reduce((sum, v) => sum + (Number(v.agreedCost ?? v.totalAmount) || 0), 0)
      );
      const guidesPaid = Math.max(
        activeGuides.reduce((sum: number, g: any) => sum + (Number(g.advancePaid) || 0), 0),
        tripVendors
          .filter((v) => v.vendorType === "guide" || v.category === "Guides")
          .reduce((sum, v) => sum + (Number(v.paidAmount ?? v.advancePaid) || 0), 0)
      );
      const activitiesCost = tripVendors
        .filter((v) => v.vendorType === "activity" || v.category === "Activities")
        .reduce((sum, v) => sum + (Number(v.agreedCost ?? v.totalAmount) || 0), 0);
      const activitiesPaid = tripVendors
        .filter((v) => v.vendorType === "activity" || v.category === "Activities")
        .reduce((sum, v) => sum + (Number(v.paidAmount ?? v.advancePaid) || 0), 0);
      const otherCost = tripVendors
        .filter(
          (v) =>
            v.vendorType !== "hotel" &&
            v.vendorType !== "transport" &&
            v.vendorType !== "guide" &&
            v.vendorType !== "activity" &&
            v.category !== "Hotels" &&
            v.category !== "Transport" &&
            v.category !== "Guides" &&
            v.category !== "Activities",
        )
        .reduce((sum, v) => sum + (Number(v.agreedCost ?? v.totalAmount) || 0), 0);
      const otherPaid = tripVendors
        .filter(
          (v) =>
            v.vendorType !== "hotel" &&
            v.vendorType !== "transport" &&
            v.vendorType !== "guide" &&
            v.vendorType !== "activity" &&
            v.category !== "Hotels" &&
            v.category !== "Transport" &&
            v.category !== "Guides" &&
            v.category !== "Activities",
        )
        .reduce((sum, v) => sum + (Number(v.paidAmount ?? v.advancePaid) || 0), 0);

      const totalVendorCost =
        hotelsCost + transportsCost + guidesCost + activitiesCost + otherCost;
      const totalVendorPaid =
        hotelsPaid + transportsPaid + guidesPaid + activitiesPaid + otherPaid;
      const totalVendorPayables = Math.max(0, totalVendorCost - totalVendorPaid);

      const estProfit = totalRevenue - totalVendorCost;
      const profitPercent =
        totalRevenue > 0 ? ((estProfit / totalRevenue) * 100).toFixed(1) : "0";

      const customerPaidPercent =
        totalRevenue > 0
          ? Math.min(100, Number(((customerPaid / totalRevenue) * 100).toFixed(1)))
          : 0;
      const customerOutstandingPercent =
        totalRevenue > 0
          ? ((customerOutstanding / totalRevenue) * 100).toFixed(1)
          : "0";
      const vendorPaidPercent =
        totalVendorCost > 0
          ? ((totalVendorPaid / totalVendorCost) * 100).toFixed(1)
          : "0";
      const vendorPayablePercent =
        totalVendorCost > 0
          ? ((totalVendorPayables / totalVendorCost) * 100).toFixed(1)
          : "0";

      return {
        totalRevenue,
        customerPaid,
        customerOutstanding,
        totalParticipants,
        outstandingParticipantsCount,
        totalVendorCost,
        totalVendorPaid,
        totalVendorPayables,
        estProfit,
        profitPercent,
        customerPaidPercent,
        customerOutstandingPercent,
        vendorPaidPercent,
        vendorPayablePercent,
        totalCollected: customerPaid,
        totalAdvance: customerPaid,
        totalExpenses: totalVendorPaid,
      };
    },
    [bookings, tripVendors, opsHotels, allocFleet, dbGuides, allPassengers],
  ) as {
    totalRevenue: number;
    customerPaid: number;
    customerOutstanding: number;
    totalParticipants: number;
    outstandingParticipantsCount: number;
    totalVendorCost: number;
    totalVendorPaid: number;
    totalVendorPayables: number;
    estProfit: number;
    profitPercent: string;
    customerPaidPercent: string;
    customerOutstandingPercent: string;
    vendorPaidPercent: string;
    vendorPayablePercent: string;
    totalCollected: number;
    totalAdvance: number;
    totalExpenses: number;
  };

  // Find lead guide and vehicles from tripVendors
  const [leadGuideName, setLeadGuideName] = useState("Assign Guide");
  const [itineraryViewMode, setItineraryViewMode] = useState<
    "customer" | "internal"
  >("internal");
  const [expandedDescs, setExpandedDescs] = useState<Record<number, boolean>>(
    {},
  );
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [quickEditModalOpen, setQuickEditModalOpen] = useState(false);
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [editingDayData, setEditingDayData] = useState<any>({
    title: "",
    stay: "",
    meals: "",
    activities: "",
    departureTime: "",
    arrivalTime: "",
    distance: "",
    drivingHours: "",
    assignedVehicle: "",
    description: "",
  });
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  useEffect(() => {
    const lead = tripVendors.find((v) => v.vendorType === "guide" || v.assignmentType?.includes("GUIDE"));
    if (lead) {
      setLeadGuideName(
        lead?.vendor?.name ||
          lead?.vendorName ||
          lead?.guideName ||
          lead?.name ||
          "",
      );
    }
  }, [tripVendors]);

  const handleQuickAdd = (idx: number, field: string) => {
    setEditingDayIdx(idx);
    const rawItin = tripDetails?.itinerary || [];
    const day = rawItin[idx] || {};
    setEditingDayData({
      title: day.title || day.location || "",
      stay: day.stay || "",
      meals: day.meals || "",
      activities: Array.isArray(day.activities)
        ? day.activities.join(", ")
        : day.activities || "",
      departureTime: day.departureTime || "",
      arrivalTime: day.arrivalTime || "",
      distance: day.distance || "",
      drivingHours: day.drivingHours || "",
      assignedVehicle: day.assignedVehicle || "",
      description: day.description || "",
    });
    setQuickEditModalOpen(true);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDayIdx === null || !tripDetails) return;

    try {
      const updatedItinerary = [...(tripDetails.itinerary || [])];

      while (updatedItinerary.length <= editingDayIdx) {
        updatedItinerary.push({
          day: updatedItinerary.length + 1,
          title: "",
          description: "",
          stay: "",
          meals: "",
          activities: "",
        });
      }

      updatedItinerary[editingDayIdx] = {
        ...updatedItinerary[editingDayIdx],
        day: editingDayIdx + 1,
        title: editingDayData.title,
        stay: editingDayData.stay,
        meals: editingDayData.meals,
        activities: editingDayData.activities,
        departureTime: editingDayData.departureTime,
        arrivalTime: editingDayData.arrivalTime,
        distance: editingDayData.distance,
        drivingHours: editingDayData.drivingHours,
        assignedVehicle: editingDayData.assignedVehicle,
        description: editingDayData.description,
      };

      const res = await api.put(`/trips/${tripDetails.id}`, {
        itinerary: updatedItinerary,
      });

      if (res.data?.success || res.data?.data) {
        setTripDetails(res.data.data);
        toast.success("Itinerary day updated successfully!");
        setQuickEditModalOpen(false);
      } else {
        toast.error("Failed to update itinerary day.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An error occurred while saving the itinerary.");
    }
  };

  const transportVehiclesLabel = useMemo(() => {
    const count = tripVendors.filter(
      (v) => v.vendorType === "transport",
    ).length;
    return count > 0 ? `${count} Vehicles Assigned` : "Assign Transport";
  }, [tripVendors]);

  const dateAndDurationLabel = useMemo(() => {
    try {
      const startDate = new Date(departureDateStr);
      const daysMatch = tripDetails?.duration?.match(/(\d+)\s*Day/i);
      const numDays = daysMatch ? parseInt(daysMatch[1], 10) : null;
      if (!numDays || Number.isNaN(startDate.getTime())) {
        return departureDateStr || "—";
      }
      const endDate = new Date(
        startDate.getTime() + (numDays - 1) * 24 * 60 * 60 * 1000,
      );

      const formatOptions = {
        day: "2-digit",
        month: "short",
        year: "numeric",
      } as const;
      const startStr = startDate.toLocaleDateString("en-US", formatOptions);
      const endStr = endDate.toLocaleDateString("en-US", formatOptions);
      return `${startStr} – ${endStr} (${tripDetails?.duration})`;
    } catch {
      return departureDateStr || "—";
    }
  }, [departureDateStr, tripDetails]);

  const timelineSteps = useMemo(() => {
    const confirmedBookings = bookings.filter(
      (b: any) => b.status !== "cancelled",
    );
    const sortedBookings = [...confirmedBookings].sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const firstBookingDate = sortedBookings[0]
      ? new Date(sortedBookings[0].createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "TBD";
    const bookingStartedStr = sortedBookings[0]
      ? new Date(
          new Date(sortedBookings[0].createdAt).getTime() - 2 * 60 * 60 * 1000,
        ).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "TBD";

    const capacity = tripDetails?.maxGroupSize;
    const participantCount =
      activeDeparturePassengers.length || stats.totalParticipants || 0;
    const filledPercentage = computeSeatsFilledPercent(
      participantCount,
      capacity,
    );
    const seats50PercentStr = sortedBookings[
      Math.floor(sortedBookings.length / 2)
    ]
      ? new Date(
          sortedBookings[Math.floor(sortedBookings.length / 2)].createdAt,
        ).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "TBD";

    const hotels = tripVendors.filter((v) => v.vendorType === "hotel");
    const allHotelsConfirmed =
      hotels.length > 0 && hotels.every((h) => h.paymentStatus === "paid");
    const hotelsConfirmStr = allHotelsConfirmed
      ? "Confirmed"
      : "Pending Confirmation";

    const depDate = new Date(departureDateStr);
    const departureDayStr = !isNaN(depDate.getTime())
      ? depDate.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : departureDateStr || "TBD";

    const now = new Date();
    const isDeparted = depDate <= now && !isNaN(depDate.getTime());
    const balanceComplete = stats.totalVendorPayables === 0;

    // Determine which step is "current" (first incomplete one)
    const step1Done = sortedBookings.length > 0;
    const step2Done = sortedBookings.length > 0;
    const step3Done = filledPercentage >= 50;
    const step4Done = allHotelsConfirmed;
    const step5Done = balanceComplete;
    const step6Done = isDeparted;

    const currentStep = !step1Done ? 0 : !step2Done ? 1 : !step3Done ? 2 : !step4Done ? 3 : !step5Done ? 4 : !step6Done ? 5 : 6;

    return [
      {
        title: "Booking Started",
        date: bookingStartedStr,
        user: "System",
        active: step1Done,
        current: currentStep === 0,
        pending: !step1Done,
      },
      {
        title: "First Booking Received",
        date: firstBookingDate,
        user: sortedBookings[0]?.name || "System",
        active: step2Done,
        current: currentStep === 1,
        pending: !step2Done,
      },
      {
        title: "50% Seats Filled",
        date: step3Done ? seats50PercentStr : `${Math.round(filledPercentage)}% filled`,
        user: "Sales Desk",
        active: step3Done,
        current: currentStep === 2,
        pending: !step3Done,
      },
      {
        title: "All Hotels Confirmed",
        date: hotelsConfirmStr,
        user: "Ops Desk",
        active: step4Done,
        current: currentStep === 3,
        pending: !step4Done,
      },
      {
        title: "Balance Collection",
        date: step5Done ? "Completed" : "In Progress",
        user: "Accounts Desk",
        active: step5Done,
        current: currentStep === 4,
        pending: !step4Done,
      },
      {
        title: "Departure Day",
        date: departureDayStr,
        user: isDeparted ? "Departed" : undefined,
        active: step6Done,
        current: currentStep === 5,
        pending: !isDeparted,
      },
    ];
  }, [bookings, tripVendors, tripDetails, departureDateStr, stats, activeDeparturePassengers]);

  const getDayDateAndWd = (startStr: string, offsetDays: number) => {
    try {
      const parts = startStr.substring(0, 10).split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const d = new Date(year, month, day);
      d.setDate(d.getDate() + offsetDays);
      const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const wd = dayNames[d.getDay()];
      const dateFormatted = `${String(d.getDate()).padStart(2, "0")} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { wd, date: dateFormatted, dateStr };
    } catch (err) {
      return { wd: "—", date: "—" };
    }
  };

  const computedItinerary = useMemo(() => {
    const activeItinerarySource =
      tripDetails?.itinerary && tripDetails.itinerary.length > 0
        ? tripDetails.itinerary
        : itineraryList && itineraryList.length > 0
        ? itineraryList
        : [];

    const rawList = activeItinerarySource.map((it: any, idx: number) => {
      const stayName =
        it.stay && it.stay !== "—" ? it.stay : it.location || "";
      const mealsName =
        it.meals && it.meals !== "—" ? it.meals : "—";
      const actName = Array.isArray(it.activities)
        ? it.activities.length > 0
          ? it.activities.join(" • ")
          : it.title || it.location || ""
        : it.activities && it.activities !== "—"
          ? it.activities
          : it.title || it.location || "";
      const travelName =
        it.travel ||
        it.distance ||
        (it.location ? `Transfer / ${it.location}` : "Local Transfer");
      const travelSubName =
        it.travelSub || it.drivingHours || "Planned Transfer";

      return {
        rawIdx: idx,
        day: `Day ${it.day || idx + 1}`,
        plan: it.title || it.plan || it.location || `Day ${it.day || idx + 1}`,
        sub: it.description || it.sub || "",
        stay: stayName || "—",
        stayType:
          stayName && stayName !== "—"
            ? it.stayType || "Standard Stay"
            : "",
        stayBadge:
          stayName && stayName !== "—" ? it.stayBadge || "STANDARD" : "",
        travel: travelName,
        travelSub: travelSubName,
        distance: travelName,
        meals: mealsName || "—",
        activities: actName || "—",
        status: "ON TIME",
      };
    });

    const baseItin = rawList.map((item: any, idx: number) => ({
      ...item,
      rawIdx: idx,
      distance: item.distance || item.travel || "Local",
    }));

    return baseItin.map((item: any, idx: number) => {
      const { wd, date, dateStr } = getDayDateAndWd(departureDateStr, idx);
      return {
        ...item,
        wd,
        date,
        dateStr,
      };
    });
  }, [tripDetails, itineraryList, departureDateStr, tripId]);

  const computedHotels = useMemo(() => {
    const hotelAssignments = tripVendors.filter((v: any) => {
      const vendorObj = typeof v.vendorId === "object" ? v.vendorId : null;
      const type = vendorObj?.type || v.vendorType || "";
      return type === "hotel";
    });

    if (hotelAssignments.length === 0) return [];

    return hotelAssignments.map((v: any, idx: number) => {
      const vendorObj =
        typeof v.vendorId === "object" ? v.vendorId : {};
      const { wd, date } = getDayDateAndWd(departureDateStr, idx);
      const dest = tripDetails?.location || vendorObj.location || v.rawAssignment?.location || "—";
      const raw = v.rawAssignment || v;

      const allocatedRooms = new Set(
        Object.values(passengerAllocations)
          .filter(
            (alloc) =>
              alloc.room && alloc.room !== "—" && alloc.room !== "Unassigned",
          )
          .map((alloc) => alloc.room),
      );
      const roomsCount =
        allocatedRooms.size > 0 ? allocatedRooms.size : raw?.numberOfRooms || 0;
      const opsRecorded =
        v.paymentStatus === "ops_recorded" || v.financeVerified === true;

      return {
        id: v.id,
        day: `Day ${idx + 1}`,
        wd,
        date,
        destRegion: dest,
        destCity: dest,
        hotel: vendorObj.name || raw?.hotelName || "—",
        vendor: vendorObj.location || raw?.location || "—",
        allocations: [{ text: `${roomsCount} Rooms`, color: "blue" }],
        totalPaxText: `${raw?.totalPax ?? allPassengers.length} Pax`,
        capacityPercent: 100,
        capacityColor: "bg-green-600",
        nights: raw?.nightsCount || raw?.nights,
        status:
          raw?.confirmed === "CONFIRMED" || opsRecorded ? "CONFIRMED" : "PENDING",
        statusSub:
          raw?.confirmed === "CONFIRMED" ? "Voucher Sent" : "Payment Due",
        amt: Number(raw?.totalAmount || v.agreedCost || 0).toLocaleString("en-IN"),
        amtSub: `Ops recorded: ₹${Number(raw?.advancePaid || v.paidAmount || 0).toLocaleString("en-IN")}`,
        rawAssignment: raw,
      };
    });
  }, [tripVendors, tripDetails, departureDateStr, passengerAllocations, allPassengers]);


  const computedTransport = useMemo(() => {
    const transAssignments = tripVendors.filter((v: any) => {
      const vendorObj = typeof v.vendorId === "object" ? v.vendorId : null;
      const type = vendorObj?.type || v.vendorType || "";
      return type === "transport";
    });

    if (transAssignments.length > 0) {
      return transAssignments.map((v: any, idx: number) => {
        const vendorObj =
          typeof v.vendorId === "object"
            ? v.vendorId
            : { name: "Assigned Transport" };
        const dayNum = idx + 1;
        const { wd, date } = getDayDateAndWd(departureDateStr, idx);
        const dest = tripDetails?.location || vendorObj.location || "—";

        return {
          id: v.id,
          type: v.vehicleType || vendorObj.vehicleType || "—",
          cap: v.capacity != null ? `${v.capacity} Seater` : "—",
          plate: v.notes || v.vehicleNumber || "—",
          model: v.vehicleType || "—",
          vendor: vendorObj.name || "—",
          phone: vendorObj.phone || "—",
          from: v.pickupCity || "—",
          fromTime: "—",
          to: dest,
          toTime: "—",
          days: date || "—",
          daysCount: "—",
          seats: "—",
          total: v.agreedCost?.toLocaleString("en-IN") || "0",
          paid: v.paidAmount?.toLocaleString("en-IN") || "0",
          due: ((v.agreedCost || 0) - (v.paidAmount || 0)).toLocaleString(
            "en-IN",
          ),
          status: v.paymentStatus?.toUpperCase() || "CONFIRMED",
          rawAssignment: v,
        };
      });
    }

    return [];
  }, [tripVendors, tripDetails, departureDateStr]);

  const computedGuides = useMemo(() => {
    const guideAssignments = tripVendors.filter((v: any) => {
      const vendorObj = v.vendor || {};
      const type = vendorObj.type || v.vendorType || "";
      return type.toLowerCase() === "guide" || type.toLowerCase() === "leader";
    });

    if (guideAssignments.length > 0) {
      return guideAssignments.map((v: any, idx: number) => {
        const vendorObj = v.vendor || { name: "Assigned Guide" };
        const dayNum = idx + 1;
        const { wd, date } = getDayDateAndWd(departureDateStr, idx);

        return {
          name: vendorObj.name,
          lead: idx === 0,
          role: vendorObj.type === "leader" ? "Trip Captain" : "Support Guide",
          assign: "Full Trip",
          date: `${date.split(" ")[0]} ${date.split(" ")[1]}, ${wd.charAt(0).toUpperCase()}${wd.slice(1).toLowerCase()}`,
          phone: vendorObj.phone || "—",
          exp: vendorObj.notes || "Guide",
          trips: "Active Assignment",
          status: v.paymentStatus?.toUpperCase() || "CONFIRMED",
          sub: `Assigned on ${new Date(v.createdAt).toLocaleDateString("en-IN")}`,
          docs: { id: true, dl: true, police: true, medical: true },
        };
      });
    }
    return [];
  }, [tripVendors, departureDateStr]);

  const computedTeamContacts = useMemo(() => {
    const list: Array<{ name: string; role: string; phone: string }> = [];
    computedGuides.forEach((g: any) => {
      list.push({
        name: g.name || "Assigned Guide",
        role: g.role || "Guide",
        phone: g.phone || "—",
      });
    });
    computedTransport.forEach((t: any) => {
      list.push({
        name: t.vendor || t.name || "Transport Driver",
        role: `${t.type || "Vehicle"} (${t.plate || ""})`.trim(),
        phone: t.phone || "—",
      });
    });
    return list;
  }, [computedGuides, computedTransport]);

  const computedTopTasks = useMemo(() => {
    if (checklistTasks.length > 0) {
      return checklistTasks.slice(0, 4).map((t: any) => ({
        title: t.task || t.title || "Pending Task",
        priority: t.priority
          ? t.priority.charAt(0).toUpperCase() +
            t.priority.slice(1).toLowerCase()
          : "Medium",
        date: t.dueDate || "On Departure",
      }));
    }
    return [
      {
        title: "Verify passenger ID proofs & documentation",
        priority: "High",
        date: "Before Departure",
      },
      {
        title: "Confirm vehicle & driver assignments",
        priority: "Medium",
        date: "1 Day Before",
      },
      {
        title: "Finalize hotel vouchers & room allocation",
        priority: "High",
        date: "2 Days Before",
      },
      {
        title: "Send pre-trip briefing & WhatsApp update",
        priority: "Low",
        date: "Departure Day",
      },
    ];
  }, [checklistTasks]);

  const handlePrintVendorReceipt = (row: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const vendorName = row.vendor || row.hotel || "Assigned Vendor";
    const serviceType = row.type || "Vendor Service";
    const totalCost = row.total || row.amt || "0";
    const paidAmount =
      row.paid || row.amtSub?.replace("Paid: ₹", "") || row.amtSub || "0";
    const balanceDue =
      row.due ||
      (
        (parseFloat(totalCost.replace(/,/g, "")) || 0) -
        (parseFloat(paidAmount.replace(/,/g, "")) || 0)
      ).toLocaleString("en-IN");
    const status = row.status || "PENDING";
    const phone = row.phone || row.sub || "";

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Vendor Settlement Record - ${vendorName}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.6;
            }
            .receipt-header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .receipt-title {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              color: #1e293b;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 15px;
              border-radius: 6px;
            }
            .card-title {
              font-size: 10px;
              font-weight: 900;
              color: #94a3b8;
              text-transform: uppercase;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background: #f1f5f9;
              text-align: left;
              padding: 10px;
              font-size: 11px;
              color: #64748b;
              border-bottom: 2px solid #e2e8f0;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .totals-box {
              width: 300px;
              margin-left: auto;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              font-size: 12px;
            }
            .totals-row.grand {
              background: #1e293b;
              color: #fff;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 50px;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div>
              <span style="font-size:20px; font-weight:900; color:#1e293b;">YOUTHCAMPING OS</span>
              <p style="font-size:10px; color:#64748b; margin-top:2px;">INTERNAL VENDOR SETTLEMENT RECORD</p>
            </div>
            <div style="text-align: right">
              <div class="receipt-title">Payment Settlement Receipt</div>
              <p style="font-size: 11px; color: #64748b;">Date: ${new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-card">
              <div class="card-title">Vendor details</div>
              <p style="font-size:14px; font-weight:bold;">${vendorName}</p>
              ${phone ? `<p style="font-size:12px; color:#64748b;">Contact: ${phone}</p>` : ""}
            </div>
            <div class="info-card">
              <div class="card-title">Trip context</div>
              <p style="font-size:13px; font-weight:bold;">Departure: ${tripId}</p>
              <p style="font-size:12px; color:#64748b;">Departure Date: ${departureDateStr}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th style="text-align: right">Agreed Cost</th>
                <th style="text-align: right">Paid Amount</th>
                <th style="text-align: right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${serviceType} Allocation</td>
                <td style="text-align: right">&#8377;${totalCost}</td>
                <td style="text-align: right; color:#059669">&#8377;${paidAmount}</td>
                <td style="text-align: right; color:#e11d48">&#8377;${balanceDue}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals-box">
            <div class="totals-row"><span>Agreed Settlement</span><span>&#8377;${totalCost}</span></div>
            <div class="totals-row" style="color:#059669"><span>Total Cleared</span><span>&minus;&#8377;${paidAmount}</span></div>
            <div class="totals-row grand"><span>Balance Due</span><span>&#8377;${balanceDue}</span></div>
          </div>
          <div class="footer">
            <p>Authorized and issued by YouthCamping OS Accounts Desk.</p>
            <p>This is a system-generated settlement receipt and does not require a physical signature.</p>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 800); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleDownloadGuideSheet = (hotelName: string, hotelBookingInput?: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Find real OpsHotelBooking if not explicitly passed
    const booking =
      hotelBookingInput ||
      opsHotels.find(
        (b: any) =>
          b.hotelName === hotelName ||
          b.vendor?.name === hotelName ||
          b.vendorName === hotelName,
      );

    const activePax = filterActivePassengers(allPassengers);

    const category = booking?.category || booking?.vendor?.category || "Not configured";
    const address = booking?.address || booking?.vendor?.address || booking?.location || "Not configured";
    const checkIn = booking?.checkInDate || booking?.checkIn || "Not configured";
    const checkOut = booking?.checkOutDate || booking?.checkOut || "Not configured";
    const phone = booking?.phone || booking?.vendor?.phone || booking?.vendor?.contactNumber || "Not configured";
    const manager = booking?.contactPerson || booking?.vendor?.contactPerson || "Not configured";
    const mealPlan = booking?.mealPlan || booking?.mealPlanType || "Not configured";

    const dRooms = safeNumber(booking?.doubleRoomsCount || booking?.doubleRooms);
    const tRooms = safeNumber(booking?.tripleRoomsCount || booking?.tripleRooms);
    const qRooms = safeNumber(booking?.quadRoomsCount || booking?.quadRooms);

    const roomDetailsText = [
      dRooms > 0 ? `${dRooms} Double` : "",
      tRooms > 0 ? `${tRooms} Triple` : "",
      qRooms > 0 ? `${qRooms} Quad` : "",
    ]
      .filter(Boolean)
      .join(", ") || "Not configured";

    // Group active passengers into rooms by room allocation
    const roomGroups: Record<string, string[]> = {};
    activePax.forEach((p) => {
      const alloc = passengerAllocations[p.id] || passengerAllocations[p.name];
      const rNum = alloc?.room || "Unassigned";
      if (!roomGroups[rNum]) roomGroups[rNum] = [];
      roomGroups[rNum].push(p.name);
    });

    const tableRowsHtml = Object.keys(roomGroups).length > 0
      ? Object.entries(roomGroups)
          .map(
            ([roomNo, paxNames]) => `
              <tr>
                <td>${roomNo}</td>
                <td>${paxNames.join(", ")}</td>
                <td>Not configured</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colSpan="3" style="text-align:center; color:#94a3b8;">No room assignments configured</td></tr>`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Guide Hotel Sheet - ${hotelName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #1e293b; }
            .section-title { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }
            .label { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
            .value { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            @media print {
              body { margin: 0; padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <span class="title">YOUTHCAMPING OS</span>
              <p style="font-size:10px; color:#64748b; margin-top:2px; font-weight:bold;">GUIDE OPERATIONAL HOTEL SHEET</p>
            </div>
            <div style="text-align: right">
              <div class="title" style="font-size: 16px;">${hotelName}</div>
              <p style="font-size: 11px; color: #64748b; font-weight:bold;">Generated: ${new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          
          <div class="section-title">Hotel Information</div>
          <div class="grid">
            <div class="card">
              <div class="label">Hotel Name & Category</div>
              <div class="value">${hotelName} (${category})</div>
              <div class="label">Full Address</div>
              <div class="value">${address}</div>
            </div>
            <div class="card">
              <div class="label">Check-in</div>
              <div class="value">${checkIn}</div>
              <div class="label">Check-out</div>
              <div class="value">${checkOut}</div>
            </div>
          </div>

          <div class="section-title">Operational Contacts</div>
          <div class="grid">
            <div class="card">
              <div class="label">Reception Number</div>
              <div class="value">${phone}</div>
              <div class="label">Hotel Manager</div>
              <div class="value">${manager}</div>
            </div>
            <div class="card">
              <div class="label">Emergency Contact</div>
              <div class="value">${phone}</div>
              <div class="label">Google Maps Link</div>
              <div class="value">${booking?.mapUrl || booking?.vendor?.mapUrl || "Not configured"}</div>
            </div>
          </div>

          <div class="section-title">Stay & Rooming Information</div>
          <div class="grid" style="grid-template-columns: 1fr;">
            <div class="card">
              <div class="label">Total Active Passengers</div>
              <div class="value">${activePax.length} Passengers (${roomDetailsText})</div>
              <div class="label">Meal Plan</div>
              <div class="value">${mealPlan}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Room Number / Group</th>
                <th>Passengers</th>
                <th>Special Requests</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 800); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const computedPayments = useMemo(() => {
    const activeBookings = bookings.filter(
      (b: any) => !isPassengerCancelled(null, b),
    );
    return activeBookings.map((b: any) => {
      const fin = calculateBookingFinancialStatus(b);

      return {
        id: b.bookingId || `BK-${b.id.substring(0, 6).toUpperCase()}`,
        passenger: b.name || b.fullName || "Passenger",
        pax: b.numberOfTravelers || 1,
        phone: b.mobile || b.phone || "—",
        plan: b.tripName || "Standard Plan",
        amount: fin.totalAmount,
        paid: fin.netPaidAmount,
        pending: fin.remainingAmount,
        overpayment: fin.overpaymentAmount,
        refund: fin.refundAmount,
        mode: b.paymentMode || b.payment_method || "UPI",
        modeDetail: b.upi_reference ? `UPI Ref: ${b.upi_reference}` : "—",
        status: fin.paymentStatus,
        lastPayment: b.createdAt
          ? new Date(b.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
        bookingStatus: b.status?.toUpperCase() || "CONFIRMED",
      };
    });
  }, [bookings]);

  const computedDocuments = useMemo(() => {
    const list: any[] = [];

    // 1. Dynamic Hotel Vouchers
    const hotels = tripVendors.filter((v: any) => v.vendorType === "hotel");
    hotels.forEach((h: any, idx: number) => {
      const name = h.vendorId?.name || "Hotel";
      list.push({
        id: `doc-h-${idx}`,
        name: `hotel_voucher_${name.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        sub: name,
        category: "Hotels",
        subcat: "Voucher",
        type: "PDF",
        size: "245 KB",
        uploadedBy: "Ops Desk",
        date: h.createdAt?.substring(0, 10) || "Recent",
        status: h.paymentStatus === "paid" ? "VERIFIED" : "PENDING",
      });
    });

    // 2. Dynamic Transport Permits/RC
    const transports = tripVendors.filter(
      (v: any) => v.vendorType === "transport",
    );
    transports.forEach((t: any, idx: number) => {
      const name = t.vendorId?.name || "Tempo Traveller";
      list.push({
        id: `doc-t-rc-${idx}`,
        name: `rc_book_${name.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        sub: `${name}`,
        category: "Transport",
        subcat: "RC Book",
        type: "PDF",
        size: "380 KB",
        uploadedBy: "Ops Desk",
        date: "Recent",
        status: "VERIFIED",
      });
    });

    // 3. Dynamic Customer ID Proofs from Bookings
    bookings.forEach((b: any) => {
      let passengersObj = b.passengers;
      if (typeof passengersObj === "string") {
        try {
          passengersObj = JSON.parse(passengersObj);
        } catch (e) {
          passengersObj = {};
        }
      }

      if (passengersObj?.details?.idProof || b.idProof) {
        const name = b.fullName || b.name || "Passenger";
        list.push({
          id: `doc-b-${b.id}`,
          name: `id_proof_${name.toLowerCase().replace(/\s+/g, "_")}.jpg`,
          sub: `Booking: ${b.bookingId || b.id}`,
          category: "Customer Documents",
          subcat: "Aadhar / ID Card",
          type: "Image",
          size: "1.2 MB",
          uploadedBy: name,
          date: b.createdAt?.substring(0, 10) || "Recent",
          status: "VERIFIED",
        });
      }

      if (Array.isArray(passengersObj?.persons)) {
        passengersObj.persons.forEach((p: any, idx: number) => {
          if (p.idProof) {
            list.push({
              id: `doc-p-${b.id}-${idx}`,
              name: `id_proof_${p.name.toLowerCase().replace(/\s+/g, "_")}.jpg`,
              sub: `Booking: ${b.bookingId || b.id} (Co-traveler)`,
              category: "Customer Documents",
              subcat: "Aadhar / ID Card",
              type: "Image",
              size: "1.1 MB",
              uploadedBy: p.name,
              uploadedOn: "Recent",
              status: "VERIFIED",
            });
          }
        });
      }
    });

    return list;
  }, [bookings, tripVendors]);

  const computedTasks = useMemo(() => {
    if (checklistTasks.length === 0) {
      return [];
    }
    return checklistTasks.map((t: any) => {
      let category = "OPERATIONS";
      if (t.stage.includes("30D")) category = "PRE-TRIP (30D)";
      else if (t.stage.includes("7D")) category = "PRE-TRIP (7D)";
      else if (t.stage.includes("1D")) category = "PRE-TRIP (1D)";
      else if (t.stage.includes("DEPARTURE")) category = "DEPARTURE DAY";
      else if (t.stage.includes("DURING")) category = "DURING TRIP";
      else if (t.stage.includes("POST")) category = "POST-TRIP";

      const priority = t.stage.includes("30D")
        ? "HIGH"
        : t.stage.includes("7D")
          ? "MEDIUM"
          : "LOW";
      const status = t.isCompleted ? "COMPLETED" : "PENDING";

      return {
        id: t.id,
        task: t.taskName,
        sub: t.notes || "Checklist item assignment",
        category,
        assignee: t.completedBy?.name || "Ops Desk",
        role: "System Action",
        priority,
        dueDate: t.completedAt
          ? new Date(t.completedAt).toLocaleDateString("en-IN")
          : "TBD",
        dueNote: t.isCompleted ? "Completed" : "Action Required",
        status,
        rawTask: t,
      };
    });
  }, [checklistTasks]);

  const computedConversations = useMemo(() => {
    if (Array.isArray(tripDetails?.conversations) && tripDetails.conversations.length > 0) {
      return tripDetails.conversations.map((c: any, idx: number) => ({
        id: c.id || `conv-${idx}`,
        name: c.name || c.title || `Group ${idx + 1}`,
        sub: c.lastMessage || c.sub || "",
        time: c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unread: c.unreadCount || 0,
        type: c.type || "group",
        icon: c.type === "direct" ? "👤" : "🏕️",
      }));
    }
    return [];
  }, [tripDetails]);

  const computedMessages = useMemo(() => {
    if (
      Array.isArray(tripDetails?.messages) &&
      tripDetails.messages.length > 0
    ) {
      return tripDetails.messages.map((m: any, idx: number) => ({
        id: m.id || `msg-${idx}`,
        convId: m.conversationId || m.convId || "g1",
        sender: m.senderName || m.sender || "Operations",
        role: m.senderRole || m.role || "Admin",
        avatar: (m.senderName || "OP").substring(0, 2).toUpperCase(),
        time: m.createdAt
          ? new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        text: m.text || m.content || "",
        reactions: m.reactions || [],
        isMine: m.isMine || false,
      }));
    }
    return [];
  }, [tripDetails?.messages]);

  useEffect(() => {
    if (computedMessages.length > 0) {
      setChatMessages(computedMessages);
    }
  }, [computedMessages]);

  const hotelStats = useMemo(() => {
    const activePax = filterActivePassengers(allPassengers);
    const summary = calculateRoomOccupancy(
      opsHotels,
      activePax,
      passengerAllocations,
    );

    return {
      totalNights: summary.configuredNights,
      confirmedNights: summary.configuredNights,
      pendingNights: 0,
      totalRooms: summary.totalRooms,
      roomCapacity: summary.roomCapacity,
      totalPax: summary.totalActivePax,
      allocatedPax: summary.allocatedPax,
      unallocatedPax: summary.unallocatedPax,
      isCapacityShortfall: summary.isCapacityShortfall,
      shortfallPax: summary.shortfallPax,
      hasAccommodationConfigured: summary.hasAccommodationConfigured,
      occupancy:
        summary.roomCapacity > 0
          ? ((summary.totalActivePax / summary.roomCapacity) * 100).toFixed(1)
          : "0",
    };
  }, [opsHotels, allPassengers, passengerAllocations]);

  useEffect(() => {
    if (!bookings || bookings.length === 0) return;
    setPassengerAllocations((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      allPassengers.forEach((p) => {
        if (isPassengerCancelled(p)) return;
        const key = p.id;
        const nameKey = p.name;
        const existingByName = nameKey ? next[nameKey] : null;
        if (key && !next[key]) {
          next[key] = existingByName || {
            room: p.roomNo && p.roomNo !== "—" ? p.roomNo : "—",
            vehicle: "—",
            seat: "—",
          };
          hasChanges = true;
        } else if (key && next[key] && existingByName) {
          if (next[key].vehicle === "—" && existingByName.vehicle && existingByName.vehicle !== "—") {
            next[key].vehicle = existingByName.vehicle;
            next[key].seat = existingByName.seat || next[key].seat;
            hasChanges = true;
          }
          if (next[key].room === "—" && existingByName.room && existingByName.room !== "—") {
            next[key].room = existingByName.room;
            hasChanges = true;
          }
        }
      });
      return hasChanges ? next : prev;
    });
  }, [bookings.length, allPassengers]);

  const computedRoomAllocations = useMemo(() => {
    const list: any[] = [];

    // Iterate allPassengers as the canonical source (one entry per person)
    allPassengers.forEach((pObj: any) => {
      const alloc = pObj.id ? passengerAllocations[pObj.id] : null;

      if (!alloc || !alloc.room || alloc.room === "Unassigned" || alloc.room === "—") return;
      if (isPassengerCancelled(pObj)) return;

      const travelerName = pObj.name;
      const isFemale = normalizeGenderCode(pObj.gender, pObj.name) === "F";
      const gender = isFemale ? "GIRLS" : "BOYS";
      list.push({
        roomNumber: alloc.room,
        travelerName,
        passengerId: pObj.id,
        genderGroup: gender,
        rawGender: isFemale ? "Female" : "Male",
        roomType: pObj.roomType || "Double",
      });
    });

    // Add empty placeholder rooms for manually added room values
    manualRooms.forEach((rNum) => {
      const hasMembers = list.some((x) => x.roomNumber === rNum);
      if (!hasMembers) {
        list.push({
          roomNumber: rNum,
          travelerName: "",
          genderGroup: "BOYS",
          roomType: "Double",
          isEmptyPlaceholder: true,
        });
      }
    });

    return list;
  }, [passengerAllocations, allPassengers, manualRooms]);

  const computedVehicleAllocations = useMemo(() => {
    const list: any[] = [];
    allPassengers.forEach((pObj: any) => {
      const allocById = pObj.id ? passengerAllocations[pObj.id] : null;
      const alloc = allocById;

      if (
        alloc?.vehicle &&
        alloc.vehicle !== "Unassigned" &&
        alloc.vehicle !== "—"
      ) {
        const fleetIdx = allocFleet.findIndex((f, idx) =>
          isAllocOnFleet(alloc, f, idx, allocFleet),
        );
        const fleetItem = fleetIdx >= 0 ? allocFleet[fleetIdx] : allocFleet[0];
        const isFemale = normalizeGenderCode(pObj.gender, pObj.name) === "F";
        list.push({
          fleetId: fleetItem?.id || alloc.vehicle || "tempo-1",
          vehicleName: fleetItem?.name || alloc.vehicle,
          vehicle: fleetItem?.name || alloc.vehicle,
          vehicleType: fleetItem?.vehicleType || alloc.vehicle || "Tempo Traveller",
          seatNumber: alloc.seat,
          travelerName: pObj.name,
          passengerId: pObj.id,
          rawGender: isFemale ? "Female" : "Male",
        });
      }
    });
    return list;
  }, [passengerAllocations, allocFleet, allPassengers]);


  const allocWarnings = useMemo(() => {
    const warnings: string[] = [];
    allPassengers.forEach((p) => {
      const alloc = p.id ? passengerAllocations[p.id] : null;
      if (!isActualVehicleAllocated(alloc) || !alloc?.room || alloc.room === "—") {
        warnings.push(`Unallocated traveler: ${p.name}`);
      }
    });
    return warnings;
  }, [allPassengers, passengerAllocations]);

  const [shufflingTraveler, setShufflingTraveler] = useState<any | null>(null);
  const [shuffleRoom, setShuffleRoom] = useState("");
  const [shuffleVehicle, setShuffleVehicle] = useState("");
  const [shuffleSeat, setShuffleSeat] = useState("");
  const [shuffleModalOpen, setShuffleModalOpen] = useState(false);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const handleOpenShuffle = (traveler: any) => {
    setShufflingTraveler(traveler);
    const current = (traveler.id && passengerAllocations[traveler.id]) || {
      room: "—",
      vehicle: "—",
      seat: "—",
    };
    setShuffleRoom(current.room);

    // Resolve matching fleet item ID for correct select dropdown selection state
    const matchedFleet = allocFleet.find(
      (f) => f.name === current.vehicle || f.id === current.vehicle,
    );
    setShuffleVehicle(matchedFleet ? matchedFleet.id : "—");

    setShuffleSeat(current.seat);
    setShuffleModalOpen(true);
  };

  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [newActivityData, setNewActivityData] = useState({
    day: "Day 1",
    act: "",
    sub: "",
    type: "SIGHTSEEING",
    time: "",
    loc: "",
    status: "CONFIRMED",
  });

  const handleAddActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newActivityData,
        name: newActivityData.act,
        dayNumber: Number(String(newActivityData.day).replace(/\D/g, "")) || 1,
      };
      const persisted = await saveActivityToBackend(api, tripId, departureDateStr, payload);
      setActivitiesList((prev) => [...prev, persisted]);
      setActivityModalOpen(false);
    } catch (err) {
      // API error toast is shown by saveActivityToBackend; UI state is not mutated on failure
    }
  };

  useEffect(() => {
    let isMounted = true;
    const depKey = `yc_activities_${tripId}_${departureDateStr}`;

    const loadBackendActivities = async () => {
      try {
        const res = await api.get(`/ops/activities/${tripId}`, {
          params: { departureDate: departureDateStr },
        });
        if (res.data?.success && Array.isArray(res.data.data)) {
          if (isMounted) {
            setActivitiesList(res.data.data);
            localStorage.setItem(depKey, JSON.stringify(res.data.data));
          }
          return;
        }
      } catch (e) {
        if (isMounted) setActivitiesStale(true);
      }
    };

    loadBackendActivities();
    return () => {
      isMounted = false;
    };
  }, [tripId, departureDateStr]);

  const computedActivities = useMemo(() => {
    return activitiesList;
  }, [activitiesList]);

  const [sharingPref, setSharingPref] = useState<string>("3");
  const [sameGenderEnforced, setSameGenderEnforced] = useState(true);
  const [prioritizeCouples, setPrioritizeCouples] = useState(true);
  const [fallbackToQuad, setFallbackToQuad] = useState(true);

  const handleAutoAllocateRooms = () => {
    const activeTravelers = allPassengers.filter(
      (p) => !isPassengerCancelled(p),
    );

    if (activeTravelers.length === 0) {
      toast.error("No confirmed travelers available to allocate.");
      return;
    }

    const newAllocs: Record<string, any> = { ...passengerAllocations };
    const allocated = new Set<string>();

    const roomsTracked: Array<{
      roomName: string;
      members: any[];
      maxCap: number;
      gender: string;
      isCouple: boolean;
      roomType: string;
    }> = [];

    const assignToRoom = (p: any, rName: string, maxCap = 2, isCouple = false) => {
      const existing = newAllocs[p.id] || newAllocs[p.name] || {};
      const entry = { ...existing, room: rName };
      newAllocs[p.id] = entry;
      if (p.name) newAllocs[p.name] = entry;
      allocated.add(p.id);
      if (p.name) allocated.add(p.name);
      let r = roomsTracked.find((x) => x.roomName === rName);
      if (!r) {
        r = {
          roomName: rName,
          members: [],
          maxCap,
          gender: p.gender || "Male",
          isCouple,
          roomType: p.roomType || (maxCap === 4 ? "Quad" : maxCap === 3 ? "Triple" : "Double"),
        };
        roomsTracked.push(r);
      }
      if (!r.members.some((m: any) => m.id === p.id)) {
        r.members.push(p);
      }
      if (p.gender === "Female" && r.members.some((m: any) => m.gender === "Male")) {
        r.isCouple = true;
      }
    };

    // ── PRESERVE ALREADY SAVED ROOMS ──
    activeTravelers.forEach((p) => {
      const existing = passengerAllocations[p.id] || passengerAllocations[p.name];
      if (existing?.room && existing.room !== "—" && existing.room !== "Unassigned") {
        assignToRoom(p, existing.room, 2, false);
      }
    });

    const existingRoomNums = roomsTracked
      .map((r) => parseInt(r.roomName.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    let roomNum = existingRoomNums.length > 0 ? Math.max(...existingRoomNums) + 1 : 1;

    // Step 1: Allocate Same-Booking Groups (Same booking co-travelers stay together!)
    const bookingGroups = groupPassengersByBooking(activeTravelers);

    if (prioritizeCouples) {
      Object.values(bookingGroups).forEach((group) => {
        const unallocated = group.filter((p) => !allocated.has(p.id) && !allocated.has(p.name));
        if (unallocated.length >= 2) {
          let list = [...unallocated];
          while (list.length >= 2) {
            let chunkSize = 2;
            const pref = list[0]?.roomType || "";
            let cap = 2;
            if (pref.includes("Quad") || pref.includes("Family") || list.length === 4) {
              chunkSize = Math.min(4, list.length);
              cap = 4;
            } else if (pref.includes("Triple") || list.length === 3) {
              chunkSize = Math.min(3, list.length);
              cap = 3;
            } else {
              chunkSize = Math.min(2, list.length);
              cap = 2;
            }

            const currentRoomName = `Room ${roomNum}`;
            const chunk = list.slice(0, chunkSize);
            chunk.forEach((p) => {
              assignToRoom(p, currentRoomName, cap);
            });
            roomNum++;
            list = list.slice(chunkSize);
          }
        }
      });
    }

    const capacitySize = parseInt(sharingPref) || 3;

    // Helper: Allocate unassigned travelers into available open beds of matching gender rooms before creating new rooms!
    const fillOrAllocatePool = (travelersList: any[]) => {
      travelersList.forEach((p) => {
        if (allocated.has(p.id) || (p.name && allocated.has(p.name))) return;
        const pGender = (p.gender || "").toLowerCase();
        
        // 1. Try finding an existing non-couple room of the same gender with available beds
        const availableRoom = roomsTracked.find(
          (r) =>
            !r.isCouple &&
            (r.gender || "").toLowerCase() === pGender &&
            r.members.length < r.maxCap
        );

        if (availableRoom) {
          assignToRoom(p, availableRoom.roomName, availableRoom.maxCap, false);
        }
      });

      // 2. Any remaining unassigned travelers get grouped into new rooms by gender
      const remaining = travelersList.filter((p) => !allocated.has(p.id) && (!p.name || !allocated.has(p.name)));
      let pool = [...remaining];
      while (pool.length > 0) {
        let chunkSize = Math.min(capacitySize, pool.length);
        if (chunkSize === 0) break;
        const chunk = pool.splice(0, chunkSize);
        const currentRoomName = `Room ${roomNum}`;
        chunk.forEach((p) => {
          if (p) {
            assignToRoom(p, currentRoomName, capacitySize, false);
          }
        });
        roomNum++;
      }
    };

    if (sameGenderEnforced) {
      const leftoverFemales = activeTravelers.filter(
        (p) => (p.gender || "").toLowerCase() === "female" && !allocated.has(p.id) && (!p.name || !allocated.has(p.name)),
      );
      fillOrAllocatePool(leftoverFemales);

      const leftoverMales = activeTravelers.filter(
        (p) => (p.gender || "").toLowerCase() === "male" && !allocated.has(p.id) && (!p.name || !allocated.has(p.name)),
      );
      fillOrAllocatePool(leftoverMales);

      const leftoverOthers = activeTravelers.filter(
        (p) => !allocated.has(p.id) && (!p.name || !allocated.has(p.name)),
      );
      fillOrAllocatePool(leftoverOthers);
    } else {
      const remainingAll = activeTravelers.filter((p) => !allocated.has(p.id) && (!p.name || !allocated.has(p.name)));
      fillOrAllocatePool(remainingAll);
    }

    setPassengerAllocations(newAllocs);
    toast.success("Hotel room auto-allocation completed");
  };

  const handleAutoAllocateTempos = () => {
    const activeTravelers = allPassengers.filter(
      (p) => !isPassengerCancelled(p),
    );

    if (activeTravelers.length === 0) {
      toast.error("No confirmed travelers available to allocate.");
      return;
    }

    const fallbackCapacity = parseInt(newVehicleCapacity) || 14;
    const fallbackName = newVehicleName || newVehicleType || "Tempo 1";

    interface FleetEntry {
      id: string;
      name: string;
      capacity: number;
      vehicleType: string;
      assignedPassengers: Array<{ p: any; seat: string }>;
    }

    const fleetStatus: FleetEntry[] =
      allocFleet.length > 0
        ? allocFleet.map((f, idx, arr) => {
            const sameCount = arr.filter((x: any) => x.name === f.name).length;
            const occurIdx = arr
              .slice(0, idx + 1)
              .filter((x: any) => x.name === f.name).length;
            const vName =
              sameCount > 1 && !f.name.includes("#")
                ? `${f.name} #${occurIdx}`
                : f.name || `Tempo ${idx + 1}`;
            return {
              id: f.id || `tempo-${idx + 1}`,
              name: vName,
              capacity: Number(f.capacity) || 14,
              vehicleType: f.vehicleType || "14 Seater Tempo Traveller",
              assignedPassengers: [],
            };
          })
        : [
            {
              id: "tempo-1",
              name: fallbackName,
              capacity: fallbackCapacity,
              vehicleType: newVehicleType || "14 Seater Tempo Traveller",
              assignedPassengers: [],
            },
          ];

    if (allocFleet.length === 0) {
      setAllocFleet([
        {
          id: "tempo-1",
          name: fallbackName,
          capacity: fallbackCapacity,
          vehicleType: newVehicleType || "14 Seater Tempo Traveller",
          cost: Number(newVehicleCost) || 0,
          vendor: "Lead Transport",
        },
      ]);
    }

    const newAllocs: Record<string, any> = { ...passengerAllocations };

    // Group active travelers strictly by booking so groups/families/couples travel together
    const bookingGroups = groupPassengersByBooking(activeTravelers);

    // Sort booking groups: larger groups first
    const sortedGroupEntries = Object.entries(bookingGroups).sort(
      ([, aList], [, bList]) => bList.length - aList.length,
    );

    sortedGroupEntries.forEach(([groupKey, groupMembers]) => {
      const gSize = groupMembers.length;

      // 1. Try finding a vehicle with enough remaining seats for the ENTIRE group
      let targetVehicle = fleetStatus.find(
        (f) => f.capacity - f.assignedPassengers.length >= gSize,
      );

      // 2. If no single vehicle fits the full group, choose the vehicle with the most remaining seats
      if (!targetVehicle) {
        targetVehicle = fleetStatus.reduce((best, f) => {
          const availBest = best.capacity - best.assignedPassengers.length;
          const availCur = f.capacity - f.assignedPassengers.length;
          return availCur > availBest ? f : best;
        }, fleetStatus[0]);
      }

      // Assign all members of this group together into targetVehicle!
      if (targetVehicle) {
        groupMembers.forEach((p) => {
          const seatNum = String(targetVehicle!.assignedPassengers.length + 1);
          targetVehicle!.assignedPassengers.push({ p, seat: seatNum });

          const existing = newAllocs[p.id] || newAllocs[p.name] || {};
          const entry = {
            ...existing,
            vehicle: targetVehicle!.name,
            fleetId: targetVehicle!.id,
            seat: seatNum,
          };
          newAllocs[p.id] = entry;
          if (p.name) newAllocs[p.name] = entry;
        });
      }
    });

    setPassengerAllocations(newAllocs);
    const canonicalFleet = fleetStatus.map((f, idx) => {
      const orig = allocFleet[idx] || {};
      return {
        ...orig,
        id: f.id,
        name: f.name,
        capacity: f.capacity,
        vehicleType: f.vehicleType,
      };
    });
    setAllocFleet(canonicalFleet);
    toast.success("Tempo seat auto-allocation completed (groups kept together)");
  };

  const handleTriggerAutoAllocate = () => {
    handleAutoAllocateRooms();
    handleAutoAllocateTempos();
  };

  const computedParticipants = useMemo(() => {
    return allPassengers.map((p: any) => ({
      name: p.name || "Guest",
      role: p.notes === "Co-traveler" ? "Co-traveler" : "Lead Traveler",
      badge:
        p.paymentStatus === "Paid in Full"
          ? "PAID"
          : p.paymentStatus === "Partial Payment"
            ? "PARTIALLY PAID"
            : "PENDING",
    }));
  }, [allPassengers]);

  const passengerStats = useMemo(() => {
    const activePassengers = allPassengers.filter((p: any) => !p.isCancelled);
    const total = activePassengers.length;
    const paidInFull = activePassengers.filter(
      (p) => p.isLead && p.paymentStatus === "Paid in Full",
    ).length;
    const partial = activePassengers.filter(
      (p) => p.isLead && p.paymentStatus === "Partial Payment",
    ).length;
    const pending = activePassengers.filter(
      (p) => p.isLead && p.paymentStatus === "Payment Pending",
    ).length;
    const withDue = activePassengers.filter((p) => p.isLead && p.balance > 0).length;
    const totalDue = activePassengers
      .filter((p) => p.isLead && p.balance > 0)
      .reduce((s, p) => s + Number(p.balance || 0), 0);
    const outstandingPartial = activePassengers
      .filter((p) => p.isLead && p.paymentStatus === "Partial Payment")
      .reduce((s, p) => s + Number(p.balance || 0), 0);
    const outstandingPending = activePassengers
      .filter((p) => p.isLead && p.paymentStatus === "Payment Pending")
      .reduce((s, p) => s + Number(p.balance || 0), 0);
    // Reconciliation checklist stats
    const ticketed = activePassengers.filter(
      (p) => p.ticketStatus && p.ticketStatus !== "PENDING" && p.ticketStatus !== "CANCELLED",
    ).length;
    const ticketVerified = activePassengers.filter(
      (p) => p.ticketVerified === true,
    ).length;
    const roomAllocated = activePassengers.filter(
      (p) => p.roomNo && p.roomNo !== "—" && p.roomNo !== "Unassigned",
    ).length;
    const transportAllocated = activePassengers.filter((p) =>
      isTransportAllocatedForPassenger(p, passengerAllocations),
    ).length;
    const missingDocument = activePassengers.filter(
      (p) => p.documentStatus === "Missing",
    ).length;
    const cancelled = allPassengers.filter((p) => p.isCancelled).length;
    const allTotal = total + cancelled;
    return {
      total,
      paidInFull,
      paidPercent: total > 0 ? ((paidInFull / total) * 100).toFixed(1) : "0",
      partial,
      outstandingPartial,
      pending,
      outstandingPending,
      withDue,
      totalDue,
      cancelled,
      cancelledPercent:
        allTotal > 0 ? ((cancelled / allTotal) * 100).toFixed(1) : "0",
      ticketed,
      ticketVerified,
      roomAllocated,
      transportAllocated,
      missingDocument,
    };
  }, [allPassengers, passengerAllocations]);

  const paxDemographics = useMemo(() => {
    const activePax = allPassengers.filter((p: any) => !p.isCancelled);
    const total = activePax.length || engineStats?.summary?.total || 0;

    let men = 0;
    let women = 0;
    activePax.forEach((p: any) => {
      const g = String(p.gender || "").toLowerCase().trim();
      if (
        g.startsWith("f") ||
        g.includes("female") ||
        g.includes("woman") ||
        g.includes("girl")
      ) {
        women++;
      } else {
        men++;
      }
    });

    if (total > 0 && men === 0 && women === 0) {
      men = engineStats?.summary?.men || engineStats?.groups?.male?.length || 0;
      women = engineStats?.summary?.women || engineStats?.groups?.female?.length || 0;
    }

    const twinTravelers = activePax.filter((p: any) => {
      const rs = String(p.roomSharing || p.roomType || "").toLowerCase();
      return (
        rs.includes("double") ||
        rs.includes("twin") ||
        (p.coupleWith && p.coupleWith !== "—" && p.coupleWith !== "")
      );
    }).length;

    const twinPairs = Math.max(
      Math.floor(twinTravelers / 2),
      engineStats?.summary?.twinPairs ||
        engineStats?.groups?.couples?.length ||
        engineStats?.groups?.pairs?.length ||
        0,
    );

    return {
      total,
      men,
      women,
      twinPairs,
    };
  }, [allPassengers, engineStats]);

  const pickupOptions = useMemo(() => {
    const s = new Set<string>();
    allPassengers.forEach((p) => {
      if (p.pickupPoint) s.add(p.pickupPoint);
    });
    return Array.from(s);
  }, [allPassengers]);

  const filteredPassengers = useMemo(
    () =>
      allPassengers.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(paxSearch.toLowerCase()) ||
          p.phone.includes(paxSearch);
        const matchPayment =
          paymentFilter === "All"
            ? true
            : paymentFilter === "Payment Pending" ||
                paymentFilter === "Has Due Balance"
              ? p.balance > 0
              : p.paymentStatus === paymentFilter;
        const matchPickup =
          pickupFilter === "All" || p.pickupPoint === pickupFilter;
        const matchGender =
          genderFilter === "All" ||
          p.gender.toLowerCase() === genderFilter.toLowerCase();
        return matchSearch && matchPayment && matchPickup && matchGender;
      }),
    [allPassengers, paxSearch, paymentFilter, pickupFilter, genderFilter],
  );

  const paginatedPassengers = useMemo(
    () => filteredPassengers.slice((page - 1) * 10, page * 10),
    [filteredPassengers, page],
  );

  const bookingGroups = useMemo(() => {
    return bookings.map((b: any) => {
      let passengersObj = b.passengers;
      if (typeof passengersObj === "string") {
        try {
          passengersObj = JSON.parse(passengersObj);
        } catch (e) {
          passengersObj = {};
        }
      }

      const fin = calculateBookingFinancialStatus(b);
      const due = fin.remainingAmount;
      const paymentLabel =
        fin.paymentStatus === "PAID"
          ? "Paid in Full"
          : fin.paymentStatus === "OVERPAID"
            ? "Overpaid"
            : fin.paymentStatus === "PARTIAL"
              ? "Partial Payment"
              : "Payment Pending";
      const paymentStatusShort =
        fin.paymentStatus === "PAID" || fin.paymentStatus === "OVERPAID"
          ? "PAID"
          : fin.paymentStatus === "UNPAID"
            ? "UNPAID"
            : "PARTIALLY PAID";

      const personsRoomDetails =
        b.roomDetails?.personsRoomDetails ||
        passengersObj?.details?.personsRoomDetails ||
        {};

      const leadName = b.fullName || b.name;
      const leadRoomInfo = personsRoomDetails[leadName] || {};
      const normLeadName = normalizeCompareName(leadName);
      const leadPassenger = {
        name: leadName,
        age: b.age ?? normalizePassenger(b, null, 0).age ?? null,
        gender: normalizePassenger(b, null, 0).genderFull,
        phone: b.phone || b.mobile || "—",
        email: b.email || "—",
        pickupPoint: b.pickupCity || "—",
        isLead: true,
        roomType:
          leadRoomInfo.roomType ||
          b.roomSharing ||
          b.roomType ||
          passengersObj?.details?.roomType ||
          "—",
        coupleWith: leadRoomInfo.coupleWith || "",
        roomNo:
          leadRoomInfo.roomNo || passengersObj?.details?.roomAllocation || "—",
        paymentStatus: paymentLabel,
        amount: null as number | null,
        paidAmount: null as number | null,
        balance: null as number | null,
        paidIsBookingShare: true,
        amountFromLineItems: false,
        status: b.status || "—",
        isCancelled: b.status === "cancelled" || b.status === "CANCELLED",
        notes: b.notes || b.adminNotes || "",
      };

      const personsList = [leadPassenger];

      if (Array.isArray(passengersObj?.persons)) {
        passengersObj.persons.forEach((p: any, idx: number) => {
          if (normalizeCompareName(p.name) === normLeadName) return;
          const coRoomInfo = personsRoomDetails[p.name] || {};
          personsList.push({
            name: p.name,
            age: p.age ?? normalizePassenger(b, p, idx).age ?? null,
            gender: normalizePassenger(b, p, idx).genderFull,
            phone: p.phone || b.phone || "—",
            email: p.email || "—",
            pickupPoint: p.pickupPoint || b.pickupCity || "—",
            isLead: false,
            status: p.status || (p.isCancelled ? "CANCELLED" : "CONFIRMED"),
            isCancelled:
              p.isCancelled === true ||
              p.status === "CANCELLED" ||
              p.status === "cancelled" ||
              b.status === "cancelled" ||
              b.status === "CANCELLED",
            notes:
              p.notes ||
              p.remarks ||
              (p.isCancelled ? "Cancelled by customer (Redline in manifest)" : ""),
            roomType:
              coRoomInfo.roomType ||
              p.roomSharing ||
              b.roomSharing ||
              b.roomType ||
              passengersObj?.details?.roomType ||
              "Double Sharing",
            coupleWith: coRoomInfo.coupleWith || "",
            roomNo:
              coRoomInfo.roomNo || b.passengers?.details?.roomAllocation || "—",
            paymentStatus: paymentLabel,
            amount: null,
            paidAmount: null,
            balance: null,
            paidIsBookingShare: true,
            amountFromLineItems: false,
          });
        });
      }

      const money = allocatePassengerMoneyForBookingWithTotals(b, personsList, {
        totalAmount: fin.totalAmount,
        netPaidAmount: fin.netPaidAmount,
        remainingAmount: due,
      });
      personsList.forEach((p, i) => {
        const share = money.shares[i];
        p.amount = share?.amount ?? null;
        p.paidAmount = share?.paidAmount ?? null;
        p.balance = share?.balance ?? null;
        p.paidIsBookingShare = share?.paidIsBookingShare ?? true;
        p.amountFromLineItems = share?.amountFromLineItems ?? false;
      });

      let coupleCount = 0;
      const coupleNames = new Set<string>();
      personsList.forEach((p) => {
        if (
          (p.roomType === "Couple" || p.roomType === "Double") &&
          p.coupleWith
        ) {
          const partner = personsList.find(
            (other) => other.name === p.coupleWith,
          );
          if (
            partner &&
            (partner.roomType === "Couple" || partner.roomType === "Double") &&
            partner.coupleWith === p.name
          ) {
            coupleNames.add([p.name, partner.name].sort().join("-"));
          }
        }
      });
      coupleCount = coupleNames.size;

      const roomsMap: Record<string, typeof personsList> = {};
      personsList.forEach((p) => {
        const rNo = p.roomNo || "Unassigned";
        if (!roomsMap[rNo]) roomsMap[rNo] = [];
        roomsMap[rNo].push(p);
      });

      const roomSummaries = Object.entries(roomsMap).map(([rNo, pList]) => {
        const couplesInRoom = pList.filter(
          (p) =>
            (p.roomType === "Couple" || p.roomType === "Double") &&
            p.coupleWith,
        );
        let roomDesc = "";
        if (couplesInRoom.length >= 2) {
          const pairNames: string[] = [];
          const matched = new Set<string>();
          couplesInRoom.forEach((p) => {
            if (matched.has(p.name)) return;
            const partner = couplesInRoom.find(
              (other) => other.name === p.coupleWith,
            );
            if (partner) {
              pairNames.push(`${p.name} + ${partner.name}`);
              matched.add(p.name);
              matched.add(partner.name);
            }
          });
          const nonCouple = pList.filter((p) => !matched.has(p.name));
          roomDesc = `${pairNames.join(", ")} (Double Sharing)`;
          if (nonCouple.length > 0) {
            roomDesc += ` + ${nonCouple.map((n) => n.name).join(", ")}`;
          }
        } else {
          roomDesc = pList.map((p) => p.name).join(", ");
        }
        return `${rNo}: ${roomDesc}`;
      });

      const roomRequirement =
        roomSummaries.join(" | ") || "No rooms allocated";

      const activePersons = personsList.filter((p: any) => !p.isCancelled);
      const cancelledPersons = personsList.filter((p: any) => p.isCancelled);

      return {
        bookingId: b.id,
        bookingRef: b.bookingId || b.id,
        leadName,
        totalPassengers: activePersons.length,
        cancelledPassengers: cancelledPersons.length,
        rawPassengerCount: personsList.length,
        coupleCount,
        roomRequirement,
        // Use cancellation-adjusted totals (stale booking.totalAmount may still
        // include a cancelled co-traveler's seat).
        totalAmount: money.totalAmount,
        paidAmount: money.netPaidAmount,
        balance: money.remainingAmount,
        paymentStatus: paymentLabel,
        paymentStatusShort,
        trainTicketStatus: b.trainTicketStatus || "—",
        pickupPoint: b.pickupCity || "—",
        passengers: personsList,
        rawBooking: b,
      };
    });
  }, [bookings]);

  const joiningCities = useMemo(() => {
    const cities = new Set<string>();
    bookingGroups.forEach((bg: any) => {
      if (bg.pickupPoint) cities.add(bg.pickupPoint);
      bg.passengers.forEach((p: any) => {
        if (p.pickupPoint) cities.add(p.pickupPoint);
      });
    });
    return Array.from(cities);
  }, [bookingGroups]);

  const filteredBookingGroups = useMemo(() => {
    return bookingGroups.filter((bg: any) => {
      const matchSearch =
        paxSearch === "" ||
        bg.bookingRef.toLowerCase().includes(paxSearch.toLowerCase()) ||
        bg.leadName.toLowerCase().includes(paxSearch.toLowerCase()) ||
        bg.passengers.some(
          (p: any) =>
            p.name.toLowerCase().includes(paxSearch.toLowerCase()) ||
            p.phone.includes(paxSearch),
        );

      const matchBookingGroup =
        bookingGroupFilter === "All" || bg.bookingId === bookingGroupFilter;

      const hasUnallocated = bg.passengers.some(
        (p: any) =>
          p.roomNo === "—" ||
          p.roomNo.toLowerCase() === "unassigned" ||
          !p.roomNo,
      );
      const matchRoomAlloc =
        roomAllocFilter === "All" ||
        (roomAllocFilter === "Allocated" && !hasUnallocated) ||
        (roomAllocFilter === "Not Allocated" && hasUnallocated);

      const matchPayment =
        paymentFilter === "All"
          ? true
          : paymentFilter === "Payment Pending" ||
              paymentFilter === "Has Due Balance"
            ? bg.balance > 0
            : bg.paymentStatus === paymentFilter;

      const matchPickup =
        pickupFilter === "All" ||
        bg.pickupPoint === pickupFilter ||
        bg.passengers.some((p: any) => p.pickupPoint === pickupFilter);

      const matchTrainTicket =
        trainTicketFilter === "All" ||
        bg.trainTicketStatus === trainTicketFilter;

      const matchJoiningCity =
        joiningCityFilter === "All" ||
        bg.pickupPoint === joiningCityFilter ||
        bg.passengers.some((p: any) => p.pickupPoint === joiningCityFilter);

      const matchDocStatus =
        docStatusFilter === "All" ||
        bg.passengers.some(
          (p: any) => (p.documentStatus || "Verified") === docStatusFilter,
        );

      return (
        matchSearch &&
        matchBookingGroup &&
        matchRoomAlloc &&
        matchPayment &&
        matchPickup &&
        matchTrainTicket &&
        matchJoiningCity &&
        matchDocStatus
      );
    });
  }, [
    bookingGroups,
    paxSearch,
    bookingGroupFilter,
    roomAllocFilter,
    paymentFilter,
    pickupFilter,
    trainTicketFilter,
    joiningCityFilter,
    docStatusFilter,
  ]);

  const paginatedBookingGroups = useMemo(() => {
    return filteredBookingGroups.slice((page - 1) * 10, page * 10);
  }, [filteredBookingGroups, page]);

  // Payment stats
  const paymentKpis = useMemo(() => {
    const total = computedPayments.reduce((s, p) => s + p.amount, 0);
    const received = computedPayments.reduce((s, p) => s + p.paid, 0);
    const pending = computedPayments.reduce((s, p) => s + p.pending, 0);
    const overdue = computedPayments
      .filter((p) => p.status === "UNPAID")
      .reduce((s, p) => s + p.pending, 0);
    const refunds = computedPayments
      .filter((p) => p.status === "REFUNDED")
      .reduce((s, p) => s + p.paid, 0);
    const paidCount = computedPayments.filter(
      (p) => p.status === "PAID",
    ).length;
    return {
      total,
      received,
      pending,
      overdue,
      refunds,
      paidCount,
      totalCount: computedPayments.length,
    };
  }, [computedPayments]);

  const filteredPayments = useMemo(
    () =>
      computedPayments.filter(
        (p) => payStatusFilter === "All" || p.status === payStatusFilter,
      ),
    [computedPayments, payStatusFilter],
  );

  // Task stats
  const taskKpis = useMemo(
    () => ({
      total: computedTasks.length,
      completed: computedTasks.filter((t) => t.status === "COMPLETED").length,
      inProgress: computedTasks.filter((t) => t.status === "IN PROGRESS")
        .length,
      pending: computedTasks.filter((t) => t.status === "PENDING").length,
      overdue: computedTasks.filter((t) => t.status === "OVERDUE").length,
    }),
    [computedTasks],
  );

  const filteredTasks = useMemo(
    () =>
      computedTasks.filter(
        (t) =>
          (taskStatusFilter === "All" || t.status === taskStatusFilter) &&
          (taskCategoryFilter === "All" || t.category === taskCategoryFilter),
      ),
    [computedTasks, taskStatusFilter, taskCategoryFilter],
  );

  // Docs — no API endpoint yet; returns empty until real fetch is wired
  const filteredDocs = useMemo(
    () => ([] as any[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docCategory, docSearch],
  );

  // Activities — no API endpoint yet; returns empty until real fetch is wired
  const filteredActivities = useMemo(
    () => ([] as any[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actDayFilter, actTypeFilter, actStatusFilter, actSearch],
  );

  const actKpis = {
    total: 18,
    confirmed: 16,
    pending: 1,
    cancelled: 1,
    optional: 3,
  };

  const tabs = [
    { id: "overview",    label: "Overview" },
    { id: "passengers",  label: "Passengers" },
    { id: "hotels",      label: "Hotels" },
    { id: "transport",   label: "Transport" },
    { id: "guides",      label: "Guides" },
    { id: "activities",  label: "Activities" },
    { id: "documents",   label: "Documents" },
    { id: "operations",  label: "Operations", badge: computedTasks.filter((t) => t.status !== "COMPLETED").length || 0 },
    { id: "finance",     label: "Finance",    badge: computedPayments.filter((p) => p.pending > 0).length || 0 },
    { id: "stationpayments", label: "Station Payments" },
  ];

  // CTA label by tab
  const ctaLabel: Record<string, string> = {
    overview:    "Edit departure",
    passengers:  "Add Passenger",
    hotels:      "Add Hotel",
    transport:   "Add vehicle",
    guides:      "Assign Guide",
    activities:  "Add Activity",
    operations:  opsSubTab === "tasks" ? "Add Task" : "Add Template",
    finance:     "Add Payment",
  };

  const rawTripCode = (
    tripDetails?.tripCode ||
    tripDetails?.code ||
    tripId ||
    "DEP"
  )
    .toString()
    .trim();
  const shortDepartureCode =
    rawTripCode.length > 14
      ? rawTripCode.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() ||
        "DEP"
      : rawTripCode;
  const fullDepartureId =
    departureRecord?.departureCode ||
    `DEP-${String(tripId).toUpperCase()}-${departureDateStr}`;
  const isOverviewTab = activeTab === "overview";
  const currentDepartureStatus = departureRecord?.status || "Planning";

  const formatDepartureStatusLabel = (status: string) =>
    status
      ? status.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      : "Planning";

  const statusChipClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("cancel")) return "border-[#E8EEF4] bg-white text-slate-500";
    if (s.includes("planning")) return "border-[#FF4D00] text-[#FF4D00] bg-white";
    return "border-[#0B1528] text-[#0B1528] bg-white";
  };

  const headerOutlineBtn =
    "h-8 w-full md:w-auto min-w-0 text-[12px] font-medium rounded-md border border-[#E8EEF4] bg-white text-[#0B1528] hover:bg-[#F4F7FB] px-3 inline-flex items-center justify-center gap-1.5 shadow-none transition-colors disabled:opacity-50";
  const headerPrimaryBtn =
    "h-8 w-full md:w-auto min-w-0 text-[12px] font-medium rounded-md bg-[#FF4D00] hover:bg-[#E04400] text-white px-3.5 inline-flex items-center justify-center gap-1.5 shadow-none transition-colors";

  const openEditDeparture = () => {
    setEditGuideName(leadGuideName);
    setEditDepartureOpen(true);
  };

  if (!hasValidDeparture) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[#F4F7FB] p-8 text-center">
        <p className="text-base font-semibold text-[#0B1528]">Departure not specified</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Open a departure from Operations using a URL that identifies the exact trip and date
          ({`tripId_YYYY-MM-DD`}). This screen will not load another departure.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/operations")}>
          Back to Departures
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-hidden bg-[#F4F7FB] text-[#0B1528] font-sans antialiased">
      {/* ─── RESPONSIVE DEPARTURE HUB ─── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
        {(Object.keys(depLoadErrors).length > 0 || bookingsIncomplete || activitiesStale) && (
          <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            {Object.values(depLoadErrors).join(" · ")}
            {activitiesStale ? " Activities may be stale; server refresh failed." : ""}
            <button
              type="button"
              className="ml-2 font-semibold underline"
              onClick={() => fetchPageData(false, true)}
            >
              Retry
            </button>
          </div>
        )}
        {/* ═══════════════════════════════════════════ HEADER ═══════════════════════════════════════════ */}
        <div className="bg-white border-b border-[#E8EEF4]">
          {/* Breadcrumb (desktop) — mobile uses a single Back control in the title row */}
          <div className="hidden md:flex px-4 sm:px-6 pt-3 items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 min-w-0">
              <span
                onClick={() => navigate("/admin/operations")}
                className="hover:text-[#0B1528] cursor-pointer shrink-0"
              >
                Departures Hub
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="hover:text-[#0B1528] cursor-pointer truncate">
                {shortDepartureCode}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="text-[#0B1528] font-medium capitalize shrink-0">
                {activeTab}
              </span>
            </div>

            <button
              onClick={() => navigate("/admin/operations")}
              className="inline-flex items-center gap-1.5 h-8 text-[12px] font-medium text-slate-600 hover:text-[#0B1528] bg-white hover:bg-[#F4F7FB] border border-[#E8EEF4] px-3 rounded-md transition-colors cursor-pointer shrink-0 shadow-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              Back to Departures Hub
            </button>
          </div>

          {/* Title row */}
          <div className="px-3 sm:px-6 pt-3 md:pt-2 pb-0 flex flex-col md:flex-row md:items-start justify-between gap-3 min-w-0">
            <div className="flex items-start gap-2.5 min-w-0">
              <button
                onClick={() => navigate("/admin/operations")}
                className="md:hidden inline-flex items-center gap-1 h-8 text-[12px] font-medium text-slate-600 hover:text-[#0B1528] bg-white hover:bg-[#F4F7FB] border border-[#E8EEF4] px-2.5 rounded-md transition-colors cursor-pointer shrink-0 shadow-none"
                title="Back to Departures Hub"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Back</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Compass className="w-4 h-4 text-[#FF4D00] shrink-0 hidden sm:block" strokeWidth={1.75} />
                  <h1 className="text-[17px] md:text-[18px] font-semibold text-[#0B1528] tracking-tight leading-none">
                    {shortDepartureCode}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border shrink-0",
                      statusChipClass(currentDepartureStatus),
                    )}
                  >
                    {formatDepartureStatusLabel(currentDepartureStatus)}
                  </span>
                </div>
                <p className="text-[13px] text-[#0B1528] font-medium mt-1 break-words">
                  {tripDetails?.title || "Trip departure"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 break-all leading-snug">
                  {fullDepartureId}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap md:items-center gap-2 min-w-0 relative w-full md:w-auto">
              {currentDepartureStatus === "Planning" && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("Ready")}
                  className={headerOutlineBtn}
                >
                  Mark Ready
                </button>
              )}
              {currentDepartureStatus === "Ready" && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("Confirmed")}
                  className={headerOutlineBtn}
                >
                  <span className="md:hidden">Confirm</span>
                  <span className="hidden md:inline">Confirm departure</span>
                </button>
              )}
              {currentDepartureStatus === "Confirmed" && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("In Progress")}
                  className={headerOutlineBtn}
                >
                  <span className="md:hidden">Start trip</span>
                  <span className="hidden md:inline">Start trip</span>
                </button>
              )}
              {currentDepartureStatus === "In Progress" && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("Completed")}
                  className={headerOutlineBtn}
                >
                  <span className="md:hidden">Complete</span>
                  <span className="hidden md:inline">Complete departure</span>
                </button>
              )}

              <div className="relative min-w-0 w-full md:w-auto">
                <button
                  onClick={() => setMoreActionsOpen(!moreActionsOpen)}
                  className={cn(headerOutlineBtn, "w-full md:w-auto")}
                >
                  More
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
                </button>
                {moreActionsOpen && (
                  <div className="absolute right-0 mt-1 w-44 max-w-[calc(100vw-2rem)] bg-white border border-[#E8EEF4] rounded-md shadow-lg py-1 z-50 text-left">
                    {!isOverviewTab && (
                      <button
                        onClick={() => {
                          openEditDeparture();
                          setMoreActionsOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[#0B1528] hover:bg-[#F4F7FB] font-medium"
                      >
                        Edit departure
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handlePrintManifest();
                        setMoreActionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-slate-600 hover:bg-[#F4F7FB]"
                    >
                      Print manifest
                    </button>
                    {currentDepartureStatus !== "Cancelled" && (
                      <button
                        onClick={() => {
                          handleStatusChange("Cancelled");
                          setMoreActionsOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-slate-600 hover:bg-[#F4F7FB]"
                      >
                        Cancel departure
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isOverviewTab ? (
                <button
                  onClick={openEditDeparture}
                  className={headerPrimaryBtn}
                >
                  Edit departure
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (activeTab === "passengers") {
                      setAddPassengerOpen(true);
                    } else if (activeTab === "operations" && opsSubTab === "tasks") {
                      setAddTaskModalOpen(true);
                    } else if (activeTab === "activities") {
                      setActivityModalOpen(true);
                    } else if (activeTab === "hotels") {
                      toast.info("Please use the '+ Assign' button on a specific day row below to assign a hotel.");
                    } else if (activeTab === "guides") {
                      setEditingGuideId(null);
                      setGuideForm(emptyGuideForm("PRIMARY_GUIDE"));
                      setAddGuideOpen(true);
                      revealGuideEditor(false);
                    } else if (activeTab === "transport") {
                      vehicleFleetNameRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      vehicleFleetNameRef.current?.focus();
                    } else {
                      toast.success(
                        `${ctaLabel[activeTab] || "Action"} triggered!`,
                      );
                    }
                  }}
                  className={headerPrimaryBtn}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{ctaLabel[activeTab] || "Action"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-500 border-t border-[#E8EEF4] mt-2 min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />{" "}
              <span className="break-words">{dateAndDurationLabel}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />{" "}
              {passengerStats.total} participants
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />{" "}
              <span className="truncate">Lead guide: {leadGuideName}</span>
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />{" "}
              <span className="truncate">{transportVehiclesLabel}</span>
            </span>
          </div>

          {/* Tab bar — horizontal scroll, no wrap, extra end pad so last tab isn’t clipped */}
          <div className="min-w-0 border-t border-[#E8EEF4] overflow-x-auto no-scrollbar">
            <div className="flex flex-nowrap gap-0 text-[11.5px] font-medium px-3 sm:px-6 pr-12 sm:pr-6">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pb-3 pt-3 px-2.5 sm:px-3 transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 shrink-0",
                      isActive
                        ? "text-[#FF4D00] border-[#FF4D00] font-semibold"
                        : "border-transparent text-slate-500 hover:text-[#0B1528] hover:border-slate-200",
                    )}
                  >
                    {tab.label}
                    {tab.badge ? (
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 rounded-md h-4 min-w-[16px] flex items-center justify-center tabular-nums",
                          isActive
                            ? "bg-[#FF4D00]/10 text-[#FF4D00]"
                            : "bg-[#F4F7FB] text-[#0B1528] border border-[#E8EEF4]",
                        )}
                      >
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <span className="shrink-0 w-8 md:w-0" aria-hidden />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ CONTENT ═══════════════════════════════════════════ */}
        <div className="flex-1 md:overflow-y-auto p-3 sm:p-6 space-y-4 min-w-0 pb-32 md:pb-6">
          {/* ──────────────────────── OVERVIEW ──────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-3 min-w-0">
              {(() => {
                const hotelCoverage = computeHotelStayCoverage({
                  itinerary: computedItinerary,
                  hotelBookings: opsHotels,
                });
                const hotelsTarget = hotelCoverage.target;
                const confirmedHotelCount = hotelCoverage.covered;
                const isHotelsConfirmed = hotelCoverage.isComplete;

                const transportAssignedCount = allocFleet.length;
                const transportRequiredCount = Math.max(1, Math.ceil((activeDeparturePassengers.length || 1) / 17));
                const isTransportConfirmed = transportAssignedCount >= transportRequiredCount;

                const actualDepartureGuides = listActiveAssignedGuides(dbGuides);
                const guideCount = actualDepartureGuides.length;
                const isGuideAssigned = guideCount > 0;

                const tasksDone = computedTasks.filter((t) => t.status === "COMPLETED").length;
                const tasksTotal = computedTasks.length;

                // Shared operational readiness (same weights as Operations list)
                const { score: rScore, isReady } = computeOperationalReadinessScore({
                  hotelsAssigned: confirmedHotelCount,
                  hotelsTarget,
                  transportAssigned: transportAssignedCount,
                  transportRequired: transportRequiredCount,
                  guideCount,
                  tasksDone,
                  tasksTotal,
                  paymentsCollectedPercent: Number(stats.customerPaidPercent) || 0,
                });

                const missingList: string[] = [];
                if (!isHotelsConfirmed && hotelsTarget > 0) missingList.push(`${Math.max(0, hotelsTarget - confirmedHotelCount)} hotel stay(s) pending assignment.`);
                if (!isTransportConfirmed) missingList.push(`${transportRequiredCount - transportAssignedCount} vehicle(s) pending assignment.`);
                if (!isGuideAssigned) missingList.push("Lead guide not yet assigned to departure.");
                if (stats.customerOutstanding > 0) missingList.push(`₹${stats.customerOutstanding.toLocaleString("en-IN")} customer balance payment outstanding.`);
                if (tasksTotal > tasksDone) missingList.push(`${tasksTotal - tasksDone} operational task(s) incomplete.`);

                const readinessKpis = [
                  {
                    label: "Readiness",
                    value: `${rScore}%`,
                    hint: isReady ? "Ready" : "Needs attention",
                    tone: isReady ? "text-[#0B1528]" : "text-[#FF4D00]",
                  },
                  {
                    label: "Hotels",
                    value: hotelCoverage.displayValue.replace("/", " / "),
                    hint: isHotelsConfirmed ? "Assigned" : "Pending",
                    tone: isHotelsConfirmed ? "text-[#0B1528]" : "text-[#FF4D00]",
                  },
                  {
                    label: "Transport",
                    value: `${transportAssignedCount} / ${transportRequiredCount}`,
                    hint: isTransportConfirmed ? "Assigned" : "Pending",
                    tone: isTransportConfirmed ? "text-[#0B1528]" : "text-[#FF4D00]",
                  },
                  {
                    label: "Guides",
                    value: String(guideCount),
                    hint: isGuideAssigned ? "Assigned" : "Pending",
                    tone: isGuideAssigned ? "text-[#0B1528]" : "text-[#FF4D00]",
                  },
                  {
                    label: "Payments",
                    value: `${stats.customerPaidPercent}%`,
                    hint: "Collected",
                    tone: "text-[#0B1528]",
                  },
                  {
                    label: "Tasks",
                    value: `${tasksDone} / ${tasksTotal}`,
                    hint: "Done",
                    tone: "text-[#0B1528]",
                  },
                ];

                return (
                  <div className="space-y-3 min-w-0">
                    {missingList.length > 0 && (
                      <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
                        <div className="min-h-10 px-4 py-2 flex items-center justify-between gap-3 border-b border-[#E8EEF4] bg-[#F8FAFC]">
                          <span className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
                            Action required
                          </span>
                          <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                            {missingList.length} {missingList.length === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <ul className="px-4 py-3 space-y-2">
                          {missingList.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-[12px] text-[#0B1528]">
                              <Check className="w-3.5 h-3.5 text-[#FF4D00] mt-0.5 shrink-0" strokeWidth={1.75} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-[#E8EEF4]">
                        {readinessKpis.map((stat) => (
                          <div key={stat.label} className="px-3 py-2.5 md:px-4 md:py-3 min-w-0">
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {stat.label}
                            </p>
                            <p
                              className={cn(
                                "text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight",
                                stat.tone,
                              )}
                            >
                              {stat.value}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {stat.hint}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
                <div className="min-h-10 px-4 py-2 flex items-center justify-between gap-3 border-b border-[#E8EEF4] bg-[#F8FAFC]">
                  <span className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
                    Finance
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("finance")}
                    className={dashLink}
                  >
                    View finance
                  </button>
                </div>
                <div
                  className={cn(
                    "grid grid-cols-1 divide-y sm:divide-y-0 sm:divide-x divide-[#E8EEF4]",
                    canSeeProfit ? "sm:grid-cols-3" : "sm:grid-cols-2",
                  )}
                >
                  <div className="px-4 py-3 min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      Outstanding
                    </p>
                    <p className="text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight text-[#FF4D00]">
                      ₹ {Number(stats?.customerOutstanding || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      From {stats?.outstandingParticipantsCount || 0} participants
                    </p>
                  </div>
                  <div className="px-4 py-3 min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      Payables
                    </p>
                    <p className="text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight text-[#0B1528]">
                      ₹ {Number(stats?.totalVendorPayables || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Total pending
                    </p>
                  </div>
                  {canSeeProfit && (
                    <div className="px-4 py-3 min-w-0">
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        Profit
                      </p>
                      <p
                        className={cn(
                          "text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight",
                          (stats?.estProfit || 0) >= 0 ? "text-[#0B1528]" : "text-[#FF4D00]",
                        )}
                      >
                        ₹ {Number(stats?.estProfit || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {stats?.profitPercent || 0}% of revenue
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                <div className="bg-white border border-[#E8EEF4] rounded-xl p-4 shadow-none min-w-0 flex flex-col">
                  <div className="flex items-center justify-between border-b border-[#E8EEF4] pb-2.5 mb-3">
                    <h3 className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
                      Departure timeline
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("reports")}
                      className={dashLink}
                    >
                      Full timeline
                    </button>
                  </div>
                  <div className="relative pl-5 border-l-2 border-[#E8EEF4] ml-1.5 space-y-3.5 py-1 flex-1">
                    {timelineSteps.map((step, idx) => (
                      <div key={idx} className="relative min-w-0">
                        <div
                          className={cn(
                            "absolute -left-[27px] top-0.5 w-2.5 h-2.5 rounded-full border-2 bg-white",
                            step.active
                              ? "border-[#0B1528] bg-[#0B1528]"
                              : step.current
                                ? "border-[#FF4D00] bg-white"
                                : "border-[#E8EEF4]",
                          )}
                        />
                        <div className="flex justify-between items-start gap-2 min-w-0">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-[12px] font-medium",
                                step.pending ? "text-slate-400" : "text-[#0B1528]",
                              )}
                            >
                              {step.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {step.date}
                            </p>
                          </div>
                          {step.user && (
                            <span className="text-[10px] font-medium text-slate-500 bg-[#F4F7FB] border border-[#E8EEF4] px-1.5 py-0.5 rounded-md shrink-0">
                              {step.user}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#E8EEF4] rounded-xl p-4 shadow-none min-w-0 flex flex-col">
                  <div className="flex items-center justify-between border-b border-[#E8EEF4] pb-2.5 mb-3 gap-2 min-w-0">
                    <h3 className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
                      Itinerary
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("itinerary")}
                      className={dashLink}
                    >
                      View itinerary
                    </button>
                  </div>
                  <div className="divide-y divide-[#E8EEF4] flex-1 min-w-0">
                    {computedItinerary.map((row: any, idx: number) => (
                      <div
                        key={idx}
                        className="py-2 flex items-center justify-between gap-3 text-[12px] min-w-0"
                      >
                        <div className="flex items-center gap-2 shrink-0 min-w-0">
                          <span className="bg-[#F4F7FB] border border-[#E8EEF4] text-[10px] font-medium text-slate-500 px-1.5 py-0.5 rounded-md">
                            {row.day}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                            {row.date
                              ? row.date.split(" ").slice(0, 2).join(" ")
                              : "TBD"}
                          </span>
                        </div>
                        <p className="truncate flex-1 font-medium text-[#0B1528] text-left min-w-0">
                          {row.plan || row.sub || "Day plan"}
                        </p>
                        <span className="text-[10px] font-medium bg-white text-[#0B1528] border border-[#E8EEF4] px-1.5 py-0.5 rounded-md shrink-0">
                          {formatDepartureStatusLabel(row.status || "On time")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* ──────────────────────── PASSENGERS ──────────────────────── */}
          {activeTab === "passengers" && (
            <div className="space-y-3 min-w-0">
              {/* PASSENGER ENGINE OUTPUT + PAYMENT STRIP */}
              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 border-b border-[#E8EEF4]">
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-semibold text-[#0B1528] tracking-wide flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-[#FF4D00]" strokeWidth={1.75} />
                      Passenger engine output
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pax mix for hotel and transport assignment
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-white",
                        paxDemographics.total > 0
                          ? "border-[#0B1528] text-[#0B1528]"
                          : "border-[#FF4D00] text-[#FF4D00]",
                      )}
                    >
                      {paxDemographics.total > 0 ? (
                        <Check className="w-3 h-3" strokeWidth={1.75} />
                      ) : (
                        <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                      )}
                      {paxDemographics.total > 0
                        ? "Ready"
                        : "Action required"}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border border-[#E8EEF4] text-slate-500 bg-white">
                      Live
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E8EEF4]">
                  {[
                    { label: "Total pax", value: paxDemographics.total },
                    { label: "Men", value: paxDemographics.men },
                    { label: "Female", value: paxDemographics.women },
                    { label: "Twin pairs", value: paxDemographics.twinPairs },
                  ].map((stat) => (
                    <div key={stat.label} className="px-3 py-2.5 md:px-4 md:py-3 min-w-0">
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {stat.label}
                      </p>
                      <p className="text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight text-[#0B1528]">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E8EEF4] border-t border-[#E8EEF4]">
                  {[
                    {
                      id: "Paid in Full",
                      label: "Paid",
                      value: passengerStats.paidInFull,
                      hint: `${passengerStats.paidPercent}% of total`,
                      tone: "text-[#0B1528]",
                      clickable: true,
                    },
                    {
                      id: "Partial Payment",
                      label: "Partial",
                      value: passengerStats.partial,
                      hint: `₹${Number(passengerStats?.outstandingPartial || 0).toLocaleString("en-IN")} due`,
                      tone: "text-[#0B1528]",
                      clickable: true,
                    },
                    {
                      id: "Payment Pending",
                      label: "Due",
                      value: passengerStats.withDue || 0,
                      hint: `₹${Number(passengerStats?.totalDue || 0).toLocaleString("en-IN")}`,
                      tone:
                        (passengerStats.withDue || 0) > 0
                          ? "text-[#FF4D00]"
                          : "text-[#0B1528]",
                      clickable: true,
                    },
                    {
                      id: "Cancelled",
                      label: "Cancelled",
                      value: passengerStats.cancelled || 0,
                      hint: `${passengerStats.cancelledPercent || 0}% of total`,
                      tone: "text-slate-500",
                      clickable: false,
                    },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      type="button"
                      disabled={!stat.clickable}
                      onClick={() => {
                        if (!stat.clickable) return;
                        setPaymentFilter(stat.id);
                        setPage(1);
                      }}
                      className={cn(
                        "px-3 py-2.5 md:px-4 md:py-3 min-w-0 text-left bg-white disabled:cursor-default",
                        stat.clickable && "hover:bg-[#F8FAFC] cursor-pointer",
                        paymentFilter === stat.id && "bg-[#F8FAFC]",
                      )}
                    >
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {stat.label}
                      </p>
                      <p
                        className={cn(
                          "text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight",
                          stat.tone,
                        )}
                      >
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {stat.hint}
                      </p>
                    </button>
                  ))}
                </div>

                {engineStats?.warnings && engineStats.warnings.length > 0 && (
                  <div className="border-t border-[#E8EEF4]">
                    <div className="min-h-10 px-4 py-2 flex items-center justify-between gap-3 border-b border-[#FF4D00] bg-[#F8FAFC]">
                      <span className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
                        Validation warnings
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                        {engineStats.warnings.length}
                      </span>
                    </div>
                    <ul className="px-4 py-3 space-y-1.5">
                      {engineStats.warnings
                        .slice(0, 5)
                        .map((w: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[12px] text-slate-600"
                          >
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-[#FF4D00] shrink-0" />
                            <span>{w}</span>
                          </li>
                        ))}
                      {engineStats.warnings.length > 5 && (
                        <li className="flex items-start gap-2 text-[12px] text-slate-500">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 shrink-0" />
                          <span>+{engineStats.warnings.length - 5} more</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Reconciliation — compact chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-medium text-slate-500 mr-0.5">
                  Reconciliation
                </span>
                {[
                  { label: "Confirmed", value: passengerStats.total },
                  { label: "Ticketed", value: passengerStats.ticketed || 0 },
                  { label: "Verified", value: passengerStats.ticketVerified || 0 },
                  { label: "Room allocated", value: passengerStats.roomAllocated || 0 },
                  { label: "Transport allocated", value: passengerStats.transportAllocated || 0 },
                  { label: "Missing docs", value: passengerStats.missingDocument || 0, warn: true },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-white tabular-nums",
                      item.warn && item.value > 0
                        ? "border-[#FF4D00] text-[#FF4D00]"
                        : "border-[#E8EEF4] text-[#0B1528]",
                    )}
                  >
                    <span className="font-semibold">{item.value}</span>
                    <span className={item.warn && item.value > 0 ? "text-[#FF4D00]" : "text-slate-500"}>
                      {item.label}
                    </span>
                  </span>
                ))}
              </div>

              {/* List card: toolbar + table */}
              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
              <div className="px-3 sm:px-4 py-3 flex flex-col gap-3 border-b border-[#E8EEF4] min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
                  <p className="text-[11px] text-slate-500 min-w-0">
                    <span className="font-medium text-[#0B1528] tabular-nums">
                      {passengerStats.total}
                    </span>{" "}
                    active passengers
                    {passengerStats.cancelled > 0 && (
                      <span className="text-slate-400">
                        {" "}
                        ({passengerStats.cancelled} cancelled)
                      </span>
                    )}{" "}
                    ·{" "}
                    <span className="tabular-nums">
                      {filteredBookingGroups.length}
                    </span>{" "}
                    bookings
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePrintManifest()}
                    className={cn(headerOutlineBtn, "w-full sm:w-auto")}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                    Download
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 items-center min-w-0">
                <div className="relative flex-grow min-w-0 sm:min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                  <input
                    type="text"
                    placeholder="Search by name, phone..."
                    value={paxSearch}
                    onChange={(e) => {
                      setPaxSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 w-full pl-8 text-[11px] rounded-md border border-[#E8EEF4] bg-white text-[#0B1528] placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-[#FF4D00]/30"
                  />
                </div>

                <select
                  value={bookingGroupFilter}
                  onChange={(e) => {
                    setBookingGroupFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB] max-w-[180px]"
                >
                  <option value="All">All booking groups</option>
                  {bookingGroups.map((bg: any) => (
                    <option key={bg.bookingId} value={bg.bookingId}>
                      {bg.bookingRef} ({bg.leadName})
                    </option>
                  ))}
                </select>

                <select
                  value={roomAllocFilter}
                  onChange={(e) => {
                    setRoomAllocFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB]"
                >
                  <option value="All">All room allocation</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Not Allocated">Not allocated</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB]"
                >
                  <option value="All">All payments</option>
                  <option value="Paid in Full">Paid in full</option>
                  <option value="Partial Payment">Partial payment</option>
                  <option value="Payment Pending">Payment pending</option>
                  <option value="Has Due Balance">Has due balance</option>
                </select>

                <select
                  value={pickupFilter}
                  onChange={(e) => {
                    setPickupFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB]"
                >
                  <option value="All">All pickup points</option>
                  {pickupOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <select
                  value={joiningCityFilter}
                  onChange={(e) => {
                    setJoiningCityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB]"
                >
                  <option value="All">All joining cities</option>
                  {joiningCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                <select
                  value={docStatusFilter}
                  onChange={(e) => {
                    setDocStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB]"
                >
                  <option value="All">All doc status</option>
                  <option value="Verified">Verified</option>
                  <option value="Missing">Missing</option>
                  <option value="Under Review">Under review</option>
                </select>

                <select
                  value={trainTicketFilter}
                  onChange={(e) => {
                    setTrainTicketFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-0 text-[11px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none hover:bg-[#F4F7FB]"
                >
                  <option value="All">All train tickets</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING">Pending</option>
                  <option value="RAC">RAC</option>
                </select>
              </div>
              </div>

              {/* Bulk Actions Bar */}
              {Object.values(selectedPassengerIds).some(v => v) && (
                <div className="px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] border-b border-[#E8EEF4] bg-[#F8FAFC] min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border border-[#E8EEF4] bg-white text-[#0B1528] tabular-nums">
                      {Object.values(selectedPassengerIds).filter(v => v).length} selected
                    </span>
                    <span className="text-slate-500">Bulk actions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      type="button"
                      onClick={() => toast.info("Select a booking group to use the Allocate Rooms button.")}
                      className="h-7 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-[#0B1528] font-medium hover:bg-[#F4F7FB]"
                    >
                      Update room
                    </button>
                    <button 
                      type="button"
                      onClick={async () => {
                        const newPickup = prompt("Enter new pickup point for selected passengers:");
                        if (newPickup !== null) {
                           // Collect bookings and their passengers to update
                           const bookingUpdates: Record<string, any> = {};
                           
                           allPassengers.forEach(pax => {
                             if (selectedPassengerIds[pax.id]) {
                               const bgId = pax.rawBooking?.id;
                               if (!bgId) return;
                               if (!bookingUpdates[bgId]) {
                                 bookingUpdates[bgId] = {
                                   passengers: pax.rawBooking.passengers || { details: {}, persons: [] },
                                   updates: {}
                                 };
                               }
                               bookingUpdates[bgId].updates[pax.name] = { pickupPoint: newPickup };
                             }
                           });
                           
                           try {
                             for (const bgId of Object.keys(bookingUpdates)) {
                               const b = bookingUpdates[bgId];
                               const currentDetails = b.passengers.details || {};
                               const newPersonsRoomDetails = {
                                 ...(currentDetails.personsRoomDetails || {})
                               };
                               
                               for (const paxName of Object.keys(b.updates)) {
                                 newPersonsRoomDetails[paxName] = {
                                   ...(newPersonsRoomDetails[paxName] || {}),
                                   ...b.updates[paxName]
                                 };
                               }
                               
                               await api.put(`/bookings/${bgId}`, {
                                 passengers: {
                                   ...b.passengers,
                                   details: {
                                     ...currentDetails,
                                     personsRoomDetails: newPersonsRoomDetails
                                   }
                                 }
                               });
                             }
                             toast.success("Bulk pickup point updated");
                             setSelectedPassengerIds({});
                             fetchPageData();
                           } catch (err) {
                             toast.error("Failed to apply bulk update");
                           }
                        }
                      }}
                      className="h-7 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-[#0B1528] font-medium hover:bg-[#F4F7FB]"
                    >
                      Set pickup
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedPassengerIds({})}
                      className="h-7 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-slate-500 font-medium hover:bg-[#F4F7FB]"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto min-w-0">
                <table className="w-full min-w-[920px] text-left text-[12px] border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#E8EEF4]">
                    <tr>
                      <th className="p-3 w-14 text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={
                              allPassengers.length > 0 &&
                              paginatedBookingGroups.every(bg => 
                                bg.passengers.every((p: any) => selectedPassengerIds[p.id])
                              )
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const nextSelect = { ...selectedPassengerIds };
                              paginatedBookingGroups.forEach((bg) => {
                                bg.passengers.forEach((p: any) => {
                                  nextSelect[p.id] = checked;
                                });
                              });
                              setSelectedPassengerIds(nextSelect);
                            }}
                            className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00] w-3.5 h-3.5 cursor-pointer"
                          />
                        </div>
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px]">
                        Passenger
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px]">
                        Phone
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px]">
                        Pickup
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px] text-center">
                        Train
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px]">
                        Payment
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px] text-right">
                        Balance
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px]">
                        Room
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px]">
                        Remarks
                      </th>
                      <th className="p-3 text-slate-500 font-medium text-[11px] text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {paginatedBookingGroups.map((bg: any) => {
                      const isGroupExpanded =
                        expandedBookings[bg.bookingId] !== false;
                      return (
                        <React.Fragment key={bg.bookingId}>
                          {/* Expandable Group Header */}
                          <tr className="bg-[#F8FAFC] text-[#0B1528] border-y border-[#E8EEF4]">
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                checked={bg.passengers.every((p: any) => selectedPassengerIds[p.id])}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedPassengerIds((prev) => {
                                    const next = { ...prev };
                                    bg.passengers.forEach((p: any) => {
                                      next[p.id] = checked;
                                    });
                                    return next;
                                  });
                                }}
                                className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00] w-3.5 h-3.5 cursor-pointer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedBookings((prev) => ({
                                    ...prev,
                                    [bg.bookingId]:
                                      prev[bg.bookingId] === false
                                        ? true
                                        : false,
                                  }));
                                }}
                                className="p-1 hover:bg-white rounded-md text-slate-400"
                              >
                                {isGroupExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                                )}
                              </button>
                              </div>
                            </td>
                            <td colSpan={9} className="p-3">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] min-w-0">
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                  <span className="font-medium text-[#0B1528] bg-white border border-[#E8EEF4] rounded-md px-1.5 py-0.5">
                                    {bg.bookingRef}
                                  </span>
                                  <span className="font-medium text-[#0B1528]">
                                    {bg.leadName}'s group
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-500">
                                    {bg.totalPassengers} active passengers
                                    {bg.cancelledPassengers > 0 && (
                                      <span className="text-slate-400">
                                        {" "}
                                        ({bg.cancelledPassengers} cancelled)
                                      </span>
                                    )}
                                  </span>
                                  {bg.coupleCount > 0 && (
                                    <span className="text-[11px] font-medium text-slate-500 border border-[#E8EEF4] bg-white rounded-md px-1.5 py-0.5">
                                      {bg.coupleCount} couple
                                      {bg.coupleCount > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  <span
                                    className="text-slate-400 text-[11px] max-w-md truncate"
                                    title={bg.roomRequirement}
                                  >
                                    Rooms: {bg.roomRequirement}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                                    <div>
                                      Total{" "}
                                      <span className="font-medium text-[#0B1528] tabular-nums">
                                        ₹
                                        {Number(bg?.totalAmount || 0).toLocaleString("en-IN")}
                                      </span>
                                      {" · "}Paid{" "}
                                      <span className="font-medium text-[#0B1528] tabular-nums">
                                        ₹{Number(bg?.paidAmount || 0).toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                    <div>
                                      Balance{" "}
                                      <span
                                        className={cn(
                                          "font-medium tabular-nums",
                                          (bg?.balance || 0) > 0
                                            ? "text-[#FF4D00]"
                                            : "text-[#0B1528]",
                                        )}
                                      >
                                        ₹{Number(bg?.balance || 0).toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBookingForRoomAlloc(bg);
                                        const initialModal: any = {};
                                        bg.passengers.forEach((p: any) => {
                                          initialModal[p.name] = {
                                            roomType:
                                              p.roomType || "Single",
                                            coupleWith: p.coupleWith || "",
                                            groupId: p.groupId || "",
                                          };
                                        });
                                        setModalAllocations(initialModal);
                                      }}
                                      className="h-7 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-[11px] font-medium text-[#0B1528] hover:bg-[#F4F7FB]"
                                    >
                                      Allocate rooms
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenBookingDetails(bg.bookingId)
                                      }
                                      className="h-7 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-[11px] font-medium text-slate-600 hover:bg-[#F4F7FB]"
                                    >
                                      Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {isGroupExpanded &&
                            bg.passengers.map((p: any) => (
                              <tr
                                key={p.id || p.name}
                                className={cn(
                                  "transition-colors",
                                  p.isCancelled
                                    ? "bg-[#F8FAFC] text-slate-400"
                                    : "hover:bg-[#F8FAFC]",
                                )}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={p.isCancelled}
                                    checked={!!selectedPassengerIds[p.id]}
                                    onChange={(e) => {
                                      setSelectedPassengerIds((prev) => ({
                                        ...prev,
                                        [p.id]: e.target.checked,
                                      }));
                                    }}
                                    className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00] cursor-pointer disabled:opacity-40"
                                  />
                                </td>
                                <td className="p-3 pl-6 min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className={cn(
                                        "font-medium cursor-pointer truncate",
                                        p.isCancelled
                                          ? "text-slate-400 line-through"
                                          : "text-[#0B1528] hover:text-[#FF4D00]",
                                        !p.isLead &&
                                          "pl-2 border-l border-[#E8EEF4]",
                                      )}
                                      onClick={() =>
                                        handleOpenBookingDetails(bg.bookingId)
                                      }
                                    >
                                      {(p.roomType === "Couple" ||
                                        p.roomType === "Double") &&
                                      p.coupleWith ? (
                                        <span className="flex items-center gap-1 min-w-0">
                                          <span className="truncate">{p.name}</span>
                                          <span className="text-slate-400 font-normal shrink-0">
                                            with
                                          </span>
                                          <span className="text-slate-600 truncate">
                                            {p.coupleWith}
                                          </span>
                                        </span>
                                      ) : (
                                        p.name
                                      )}
                                    </div>
                                    {p.isCancelled ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-[#E8EEF4] bg-white text-slate-500 shrink-0">
                                        Cancelled
                                      </span>
                                    ) : (
                                      !p.isLead &&
                                      !p.coupleWith && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#F4F7FB] text-slate-500 border border-[#E8EEF4] shrink-0">
                                          Co-traveler
                                        </span>
                                      )
                                    )}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-[11px] text-slate-400",
                                      !p.isLead && "pl-4",
                                    )}
                                  >
                                    {p.gender}, {p.age} yrs
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-slate-600 text-[11px]">
                                  {p.phone}
                                </td>
                                <td className="p-3 font-medium text-[#0B1528]">
                                  {p.pickupPoint}
                                </td>

                                <td className="p-3 text-center">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-white",
                                      bg.trainTicketStatus === "CONFIRMED"
                                        ? "text-[#0B1528] border-[#E8EEF4]"
                                        : "text-[#FF4D00] border-[#E8EEF4]",
                                    )}
                                  >
                                    {bg.trainTicketStatus === "CONFIRMED"
                                      ? "Confirmed"
                                      : bg.trainTicketStatus === "PENDING"
                                        ? "Pending"
                                        : bg.trainTicketStatus}
                                  </span>
                                </td>

                                <td className="p-3">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-white",
                                      p.paymentStatus === "Paid in Full"
                                        ? "text-[#0B1528] border-[#E8EEF4]"
                                        : p.paymentStatus === "Partial Payment"
                                          ? "text-[#0B1528] border-[#E8EEF4]"
                                          : "text-[#FF4D00] border-[#E8EEF4]",
                                    )}
                                  >
                                    {p.paymentStatus === "Paid in Full"
                                      ? "Paid"
                                      : p.paymentStatus === "Partial Payment"
                                        ? "Partial"
                                        : "Unpaid"}
                                  </span>
                                  <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                    {p?.paidIsBookingShare
                                      ? "Share ₹"
                                      : "Paid ₹"}
                                    {Number(p?.paidAmount || 0).toLocaleString("en-IN")}
                                    {p?.isCancelled ? "" : " / pax"}
                                  </div>
                                </td>
                                <td
                                  className={cn(
                                    "p-3 text-right font-medium tabular-nums",
                                    (p?.balance || 0) > 0
                                      ? "text-[#FF4D00]"
                                      : "text-[#0B1528]",
                                  )}
                                >
                                  <div>
                                    ₹{Number(p?.balance || 0).toLocaleString("en-IN")}{" "}
                                    {!p?.isCancelled && (
                                      <span className="text-[10px] font-normal text-slate-400">
                                        / pax
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                                    Group due ₹
                                    {Number(bg?.balance || 0).toLocaleString("en-IN")}
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    {getRelationshipBadge(p.roomType)}
                                    {p.groupId && (
                                      <span className="bg-[#F4F7FB] text-slate-600 border border-[#E8EEF4] px-1.5 py-0.5 rounded-md text-[10px] font-mono">
                                        {p.groupId}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td
                                  className="p-3 text-slate-500 text-[11px] max-w-[150px] truncate"
                                  title={
                                    p.notes || bg.rawBooking.adminNotes || "—"
                                  }
                                >
                                  {p.notes || bg.rawBooking.adminNotes || "—"}
                                </td>

                                <td className="p-3 text-center">
                                  <div className="flex gap-1.5 justify-center">
                                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-[#0B1528]" strokeWidth={1.75} />
                                    <PhoneCall className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-[#0B1528]" strokeWidth={1.75} />
                                    <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-[#0B1528]" strokeWidth={1.75} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                    {paginatedBookingGroups.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center p-10 text-slate-400 text-[12px]"
                        >
                          No passengers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
                <div className="px-4 py-3 border-t border-[#E8EEF4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
                  <span>
                    Showing {(page - 1) * 10 + 1} to{" "}
                    {Math.min(page * 10, filteredBookingGroups.length)} of{" "}
                    {filteredBookingGroups.length} booking groups
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="border border-[#E8EEF4] rounded-md p-1 bg-white hover:bg-[#F4F7FB] disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    {[
                      ...Array(
                        Math.min(
                          5,
                          Math.ceil(filteredBookingGroups.length / 10),
                        ),
                      ),
                    ].map((_, i) => (
                      <button
                        type="button"
                        key={i + 1}
                        onClick={() => setPage(i + 1)}
                        className={cn(
                          "w-7 h-7 rounded-md text-[11px] font-medium border",
                          page === i + 1
                            ? "bg-[#FF4D00] text-white border-[#FF4D00]"
                            : "bg-white border-[#E8EEF4] hover:bg-[#F4F7FB] text-[#0B1528]",
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={
                        page >= Math.ceil(filteredBookingGroups.length / 10)
                      }
                      onClick={() =>
                        setPage((p) =>
                          Math.min(
                            p + 1,
                            Math.ceil(filteredBookingGroups.length / 10),
                          ),
                        )
                      }
                      className="border border-[#E8EEF4] rounded-md p-1 bg-white hover:bg-[#F4F7FB] disabled:opacity-40"
                    >
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════ PLAN TAB ══════════════════════════ */}
          {/* Plan tab flattened — Hotels/Transport/Guides/Activities are now top-level tabs */}

          {/* ─── PLAN: ITINERARY ─── */}

          {/* Quick Edit Itinerary Day Modal */}
          <Dialog
            open={quickEditModalOpen}
            onOpenChange={setQuickEditModalOpen}
          >
            <DialogContent className="max-w-md bg-white p-5 rounded-[6px] border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-sm font-black text-slate-800">
                  Edit Itinerary - Day{" "}
                  {editingDayIdx !== null ? editingDayIdx + 1 : ""}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400">
                  Update the plan, stay, meals, activities, and operational
                  fields.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSaveQuickEdit}
                className="space-y-3 mt-2 text-xs"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Plan & Destination
                  </label>
                  <Input
                    value={editingDayData.title}
                    onChange={(e) =>
                      setEditingDayData((prev: any) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="e.g. Delhi → Shimla"
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Overnight Stay
                    </label>
                    <Input
                      value={editingDayData.stay}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          stay: e.target.value,
                        }))
                      }
                      placeholder="e.g. Hotel Ridge View"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Meals
                    </label>
                    <Input
                      value={editingDayData.meals}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          meals: e.target.value,
                        }))
                      }
                      placeholder="e.g. Breakfast, Dinner"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Activities (comma-separated)
                  </label>
                  <Input
                    value={editingDayData.activities}
                    onChange={(e) =>
                      setEditingDayData((prev: any) => ({
                        ...prev,
                        activities: e.target.value,
                      }))
                    }
                    placeholder="e.g. Mall Road Stroll, Sightseeing"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Departure Time
                    </label>
                    <Input
                      value={editingDayData.departureTime}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          departureTime: e.target.value,
                        }))
                      }
                      placeholder="e.g. 09:00 AM"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Arrival Time
                    </label>
                    <Input
                      value={editingDayData.arrivalTime}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          arrivalTime: e.target.value,
                        }))
                      }
                      placeholder="e.g. 06:00 PM"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Distance
                    </label>
                    <Input
                      value={editingDayData.distance}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          distance: e.target.value,
                        }))
                      }
                      placeholder="e.g. 340 KM"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Driving Hours
                    </label>
                    <Input
                      value={editingDayData.drivingHours}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          drivingHours: e.target.value,
                        }))
                      }
                      placeholder="e.g. 8 Hrs"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Assigned Vehicle
                    </label>
                    <Input
                      value={editingDayData.assignedVehicle}
                      onChange={(e) =>
                        setEditingDayData((prev: any) => ({
                          ...prev,
                          assignedVehicle: e.target.value,
                        }))
                      }
                      placeholder="e.g. Volvo / TT"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingDayData.description}
                    onChange={(e) =>
                      setEditingDayData((prev: any) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter day wise plan details..."
                    rows={3}
                    className="w-full text-xs border border-slate-200 rounded-[4px] p-2 bg-white text-slate-800 outline-none hover:border-slate-300 focus:border-slate-400"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setQuickEditModalOpen(false)}
                    className="h-8 text-xs font-bold text-slate-500 rounded"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Activity Dialog */}
          <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
            <DialogContent className="max-w-md bg-white p-5 rounded-lg shadow-lg border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  Add Departure Activity
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure an activity or sightseeing item for this departure.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleAddActivitySubmit}
                className="space-y-4 mt-3"
              >
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Day
                  </label>
                  <select
                    value={newActivityData.day}
                    onChange={(e) =>
                      setNewActivityData((prev) => ({
                        ...prev,
                        day: e.target.value,
                      }))
                    }
                    className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                  >
                    <option value="Day 1">Day 1</option>
                    <option value="Day 2">Day 2</option>
                    <option value="Day 3">Day 3</option>
                    <option value="Day 4">Day 4</option>
                    <option value="Day 5">Day 5</option>
                    <option value="Day 6">Day 6</option>
                    <option value="Day 7">Day 7</option>
                    <option value="Day 8">Day 8</option>
                    <option value="Day 9">Day 9</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newActivityData.act}
                    onChange={(e) =>
                      setNewActivityData((prev) => ({
                        ...prev,
                        act: e.target.value,
                      }))
                    }
                    placeholder="e.g. River Rafting or Solang Sightseeing"
                    className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    Subdescription
                  </label>
                  <input
                    type="text"
                    value={newActivityData.sub}
                    onChange={(e) =>
                      setNewActivityData((prev) => ({
                        ...prev,
                        sub: e.target.value,
                      }))
                    }
                    placeholder="e.g. Beas River or Hidimba Temple"
                    className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Type
                    </label>
                    <select
                      value={newActivityData.type}
                      onChange={(e) =>
                        setNewActivityData((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                    >
                      <option value="SIGHTSEEING">SIGHTSEEING</option>
                      <option value="TRAVEL">TRAVEL</option>
                      <option value="ADVENTURE">ADVENTURE</option>
                      <option value="STAY">STAY</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Timing
                    </label>
                    <input
                      type="text"
                      value={newActivityData.time}
                      onChange={(e) =>
                        setNewActivityData((prev) => ({
                          ...prev,
                          time: e.target.value,
                        }))
                      }
                      placeholder="e.g. 10:00 AM - 05:00 PM"
                      className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newActivityData.loc}
                      onChange={(e) =>
                        setNewActivityData((prev) => ({
                          ...prev,
                          loc: e.target.value,
                        }))
                      }
                      placeholder="e.g. Manali"
                      className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <select
                      value={newActivityData.status}
                      onChange={(e) =>
                        setNewActivityData((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                    >
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="OPTIONAL">OPTIONAL</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActivityModalOpen(false)}
                    className="h-8 text-xs font-bold text-slate-500 rounded"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase rounded"
                  >
                    Add Activity
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Itinerary Version History Dialog */}
          <Dialog
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
          >
            <DialogContent className="max-w-md bg-white p-5 rounded-[6px] border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-sm font-black text-slate-800">
                  Itinerary Version History
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400">
                  Review and restore previous versions of this itinerary.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-3 max-h-80 overflow-y-auto pr-1">
                {!tripDetails?.itineraryVersions ||
                tripDetails.itineraryVersions.length === 0 ? (
                  <div className="text-center p-6 text-slate-400 font-semibold text-xs">
                    No version history found. Changes will generate versions
                    after confirmation.
                  </div>
                ) : (
                  [...tripDetails.itineraryVersions]
                    .reverse()
                    .map((ver: any, index: number) => {
                      const dateFormatted = ver.updatedAt
                        ? new Date(ver.updatedAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unknown Time";

                      return (
                        <div
                          key={index}
                          className="border border-slate-150 rounded-[4px] p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Version {ver.version}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {dateFormatted} • by {ver.updatedBy || "System"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {ver.itinerary?.length || 0} days defined
                            </p>
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                const restoredTrip = await api.put(
                                  `/trips/${tripDetails.id}`,
                                  {
                                    itinerary: ver.itinerary,
                                  },
                                );
                                setTripDetails(restoredTrip.data);
                                toast.success(
                                  `Restored to Version {ver.version} successfully!`,
                                );
                                setVersionHistoryOpen(false);
                              } catch (err: any) {
                                toast.error(
                                  `Failed to restore: ${err.message}`,
                                );
                              }
                            }}
                            className="h-7 text-[10px] font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded px-3"
                          >
                            Restore
                          </Button>
                        </div>
                      );
                    })
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setVersionHistoryOpen(false)}
                  className="h-8 text-xs font-bold text-slate-500 rounded"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 4-Step Add Hotel / Stay Assignment Wizard Modal */}
          <HotelAssignmentWizardModal
            isOpen={isAddHotelWizardOpen}
            onClose={() => setIsAddHotelWizardOpen(false)}
            computedItinerary={computedItinerary}
            dbVendors={dbVendors}
            tripId={tripId}
            departureDateStr={departureDateStr}
            totalPax={activeDeparturePassengers.length}
            passengerAllocations={passengerAllocations}
            allPassengers={activeDeparturePassengers}
            initialDayInfo={selectedWizardDayInfo}
            onSaveSuccess={fetchPageData}
          />

          {/* Hotel Details Right Drawer Modal */}
          <Dialog
            open={!!selectedStayForDrawer}
            onOpenChange={() => setSelectedStayForDrawer(null)}
          >
            <DialogContent className="flex min-h-0 max-h-[calc(100dvh-1rem)] max-w-lg flex-col justify-between overflow-hidden rounded-[12px] border border-slate-200 bg-white p-3 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
              <DialogHeader className="sr-only">
                <DialogTitle>Hotel Stay Details</DialogTitle>
                <DialogDescription>
                  Detailed view and room allocations for {selectedStayForDrawer?.hotel || "stay"}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto pr-1 flex-1 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#FF4D00] tracking-wider block">
                      {selectedStayForDrawer?.day} •{" "}
                      {selectedStayForDrawer?.destCity}
                    </span>
                    <h3 className="text-lg font-black text-slate-800 mt-0.5">
                      {selectedStayForDrawer?.hotel}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Supplied by {selectedStayForDrawer?.vendor}
                    </p>
                  </div>
                  <span className="text-xs font-black bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-full uppercase">
                    {selectedStayForDrawer?.status || "Hotel Confirmed"}
                  </span>
                </div>

                {/* Section 1: Hotel Information */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                  <p className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    Hotel Information
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p>
                      <b>Vendor:</b> {selectedStayForDrawer?.vendor}
                    </p>
                    <p>
                      <b>Contact Person:</b>{" "}
                      {selectedStayForDrawer?.rawAssignment?.contactName ||
                        selectedStayForDrawer?.vendorId?.contactName ||
                        "—"}
                    </p>
                    <p>
                      <b>Phone:</b>{" "}
                      {selectedStayForDrawer?.rawAssignment?.contactPhone ||
                        selectedStayForDrawer?.vendorId?.phone ||
                        "—"}
                    </p>
                    <p>
                      <b>GSTIN:</b>{" "}
                      {selectedStayForDrawer?.rawAssignment?.gstin ||
                        selectedStayForDrawer?.vendorId?.gstin ||
                        "—"}
                    </p>
                  </div>
                </div>

                {/* Section 2: Room Allocation */}
                <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">
                    Room Allocation
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectedStayForDrawer?.allocations || []).map(
                      (alloc: any, i: number) => (
                        <span
                          key={i}
                          className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {alloc.text}
                        </span>
                      ),
                    )}
                    <span className="text-xs font-bold text-slate-500 ml-auto">
                      {selectedStayForDrawer?.totalPaxText}
                    </span>
                  </div>
                </div>

                {/* Section 3: Voucher Controls */}
                <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">
                    Voucher & Documents
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toast.success("Downloading signed hotel voucher...")
                      }
                      className="flex-1 h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-xxs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />{" "}
                      Download Voucher
                    </button>
                    <button
                      onClick={() =>
                        toast.success("Voucher file uploaded successfully!")
                      }
                      className="flex-1 h-8 bg-[#FFF7ED] border border-[#FF4D00] text-[#FF4D00] hover:bg-[#FFEEDE] font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-xxs"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Signed Voucher
                    </button>
                  </div>
                </div>

                {/* Section 4: Payment Breakdown */}
                <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">
                    Payment Breakdown
                  </p>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Vendor Agreed Rate:</span>
                    <span>₹{selectedStayForDrawer?.amt || "18,400"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Advance Paid:</span>
                    <span>₹9,200</span>
                  </div>
                  <div className="flex justify-between font-black text-red-600 border-t border-slate-100 pt-1.5">
                    <span>Remaining Balance:</span>
                    <span>₹9,200</span>
                  </div>
                </div>

                {/* Section 5: Status Timeline (9-stage workflow) */}
                <div className="border border-slate-200 rounded-lg p-3.5 space-y-3">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400">
                    Workflow Timeline
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        step: "Draft",
                        completed: true,
                        time: "01 Aug, 10:00 AM",
                      },
                      {
                        step: "Rate Finalized",
                        completed: true,
                        time: "01 Aug, 11:45 AM",
                      },
                      {
                        step: "Voucher Sent",
                        completed: true,
                        time: "02 Aug, 02:30 PM",
                      },
                      {
                        step: "Hotel Confirmed",
                        completed: true,
                        time: "02 Aug, 04:30 PM",
                      },
                      { step: "Checked In", completed: false },
                      { step: "Checked Out", completed: false },
                      { step: "Invoice Received", completed: false },
                      { step: "Paid", completed: false },
                      { step: "Closed", completed: false },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black",
                              item.completed
                                ? "bg-green-600 text-white"
                                : "bg-slate-200 text-slate-500",
                            )}
                          >
                            {item.completed ? "✓" : idx + 1}
                          </div>
                          <span
                            className={cn(
                              "font-bold",
                              item.completed
                                ? "text-slate-800"
                                : "text-slate-400",
                            )}
                          >
                            {item.step}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {item.time || "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-3">
                <span className="text-[11px] font-bold text-slate-400">
                  Stay ID: {selectedStayForDrawer?.id || "STAY-01"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStayForDrawer(null)}
                  className="h-8 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded shadow-xs"
                >
                  Close Drawer
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ──────────────────────── HOTELS & ACCOMMODATIONS WORKSPACE ──────────────────────── */}
          {/* ─── PLAN: ACCOMMODATION ─── */}
          {activeTab === "hotels" && (
            <AccommodationWorkspace
              computedItinerary={computedItinerary}
              opsHotelBookings={
                opsHotels && opsHotels.length > 0
                  ? opsHotels
                  : tripVendors
                      .filter((v: any) => v.vendorType === "hotel")
                      .map((v: any) => v.rawAssignment)
                      .filter(Boolean)
              }
              allPassengers={activeDeparturePassengers}
              passengerAllocations={passengerAllocations}
              departureDateStr={departureDateStr}
              tripId={tripId}
              onEditHotel={(row: any, dayInfo?: any) => {
                setSelectedWizardDayInfo(
                  dayInfo || {
                    dayNum: row?.dayNum,
                    dayLabel: row?.dayLabel || row?.day,
                    destination: row?.destination || row?.location || row?.sub,
                    dateStr: row?.dateStr || row?.date,
                    existingBooking: row?.existingBooking || row?.booking || row,
                  },
                );
                setIsAddHotelWizardOpen(true);
              }}
              onRefresh={fetchPageData}
            />
          )}


          {/* ─── PLAN: ALLOCATION ─── */}
          {activeTab === "transport" && (
            <DepartureTransport
              nameInputRef={vehicleFleetNameRef}
              isSavingAllocations={isSavingAllocations}
              isSavingRooms={isSavingRooms}
              isSavingVehicles={isSavingVehicles}
              onSave={() => handleSaveAllocationsToDb(false, "all")}
              onSaveRooms={() => handleSaveAllocationsToDb(false, "rooms")}
              onSaveVehicles={() => handleSaveAllocationsToDb(false, "vehicles")}
              onAutoAllocateRooms={handleAutoAllocateRooms}
              onAutoAllocateTempos={handleAutoAllocateTempos}
              onAutoAllocate={handleTriggerAutoAllocate}
              onAddVehicle={handleAddVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onCopyTempoList={handleCopyTempoList}
              onCopyRoomList={handleCopyRoomList}
              onOpenShuffle={handleOpenShuffle}
              allocFleet={allocFleet}
              vendorDirectoryFleet={vendorDirectoryFleet}
              fleetVehicles={fleetVehicles}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
              setNewVehicleType={setNewVehicleType}
              newVehicleCapacity={newVehicleCapacity}
              setNewVehicleCapacity={setNewVehicleCapacity}
              newVehicleName={newVehicleName}
              setNewVehicleName={setNewVehicleName}
              newVehicleCost={newVehicleCost}
              setNewVehicleCost={setNewVehicleCost}
              newVehicleVendor={newVehicleVendor}
              setNewVehicleVendor={setNewVehicleVendor}
              setSelectedVendorId={setSelectedVendorId}
              sharingPref={sharingPref}
              setSharingPref={setSharingPref}
              sameGenderEnforced={sameGenderEnforced}
              setSameGenderEnforced={setSameGenderEnforced}
              prioritizeCouples={prioritizeCouples}
              setPrioritizeCouples={setPrioritizeCouples}
              fallbackToQuad={fallbackToQuad}
              setFallbackToQuad={setFallbackToQuad}
              computedRoomAllocations={computedRoomAllocations}
              computedVehicleAllocations={computedVehicleAllocations}
              allPassengers={allPassengers}
              passengerAllocations={passengerAllocations}
              setPassengerAllocations={setPassengerAllocations}
              setManualRooms={setManualRooms}
              setAddRoomModalOpen={setAddRoomModalOpen}
              showClearAllocationsDialog={showClearAllocationsDialog}
              setShowClearAllocationsDialog={setShowClearAllocationsDialog}
              onClearAllocations={() => handleSaveAllocationsToDb(true)}
            />
          )}

          {/* ──────────────────────── GUIDES ──────────────────────── */}
          {/* ─── PLAN: GUIDES ─── */}
          {activeTab === "guides" && (() => {
            const actualGuides = listActiveAssignedGuides(dbGuides);
            const tripExpenses = dbGuides.filter((g: any) =>
              isGuideExpenseType(g.assignmentType),
            );
            const isExpenseForm = isGuideExpenseType(guideForm.assignmentType);
            const fieldClass =
              "h-8 w-full min-w-0 px-2.5 text-[11px] rounded-[4px] border border-[#E8EEF4] bg-white text-[#0B1528] focus:outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20";
            const labelClass =
              "block mb-1 text-[10px] font-semibold text-slate-500";

            return (
            <div className="space-y-4 min-w-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-[#0B1528]">
                    Guides & Crew
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Manage guides assigned to this departure — payment tracking
                    and day-wise allocation
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingGuideId(null);
                    setGuideForm(emptyGuideForm("PRIMARY_GUIDE"));
                    setAddGuideOpen(true);
                    revealGuideEditor(false);
                  }}
                  className="inline-flex h-8.5 w-full items-center justify-center gap-1.5 rounded-[4px] bg-[#FF4D00] text-xs font-bold text-white shadow-sm hover:bg-[#E04500] md:w-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign guide
                </Button>
              </div>

              {/* KPI Cards — live from actualGuides */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3.5">
                {[
                  {
                    v: String(actualGuides.length),
                    l: "Total Guides",
                    sub: "Assigned to departure",
                  },
                  {
                    v: `₹${actualGuides.reduce((s, g) => s + (g.agreedAmount || 0), 0).toLocaleString("en-IN")}`,
                    l: "Total Agreed",
                    sub: "All guides combined",
                  },
                  {
                    v: `₹${actualGuides.reduce((s, g) => s + (g.advancePaid || 0), 0).toLocaleString("en-IN")}`,
                    l: "Total Advance",
                    sub: "Paid so far",
                  },
                  {
                    v: `₹${actualGuides.reduce((s, g) => s + (g.balanceAmount || 0), 0).toLocaleString("en-IN")}`,
                    l: "Balance Due",
                    sub: "Remaining payment",
                  },
                ].map((k) => (
                  <div
                    key={k.l}
                    className="bg-white border border-[#E8EEF4] rounded-[6px] p-2.5 sm:p-3.5 shadow-xs min-w-0"
                  >
                    <p className="text-lg sm:text-2xl font-black text-[#0B1528] truncate">{k.v}</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                      {k.l}
                    </p>
                    <p className="text-[9.5px] text-slate-500 font-medium mt-0.5">
                      {k.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Assign guide inline form — guides only; expenses render under Trip expenses */}
              {addGuideOpen && !isExpenseForm && (
                <form
                  ref={guideFormRef}
                  onSubmit={handleAddGuide}
                  className="bg-white border border-[#E8EEF4] rounded-[6px] shadow-xs min-w-0 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[#E8EEF4]">
                    <p className="text-[12px] font-bold text-[#0B1528]">
                      {editingGuideId ? "Edit guide assignment" : "Assign guide to departure"}
                    </p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      Payment terms and reporting details for this departure
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="min-w-0">
                      <label className={labelClass}>
                        Guide name *
                      </label>
                      {dbGuideVendors.length > 0 ? (
                        <>
                          <select
                            required
                            value={guideForm.guideName}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              setGuideForm((f) => ({ ...f, guideName: selectedName }));
                              // Auto-fill from vendor directory
                              const matched = dbGuideVendors.find(
                                (v: any) =>
                                  (v.contactPerson || v.name || "").toLowerCase() === selectedName.toLowerCase() ||
                                  (v.name || "").toLowerCase() === selectedName.toLowerCase()
                              );
                              if (matched) {
                                const rateConfig = matched.rateConfigs?.[0] || matched.rates?.[0];
                                const dailyRate = rateConfig?.perDayFee || rateConfig?.rate || 0;
                                setGuideForm((f) => ({
                                  ...f,
                                  guideName: matched.contactPerson || matched.name || selectedName,
                                  emergencyContact: matched.phone || matched.contactPhone || f.emergencyContact,
                                  agreedAmount: dailyRate > 0 ? String(dailyRate * Number(f.daysWorked || 5)) : f.agreedAmount,
                                }));
                              }
                            }}
                            className={fieldClass}
                          >
                            <option value="">Select guide from vendor directory…</option>
                            {dbGuideVendors.map((v: any) => (
                              <option key={v.id} value={v.contactPerson || v.name}>
                                {v.name || v.contactPerson}{v.destination ? ` · ${v.destination}` : ""}
                              </option>
                            ))}
                            <option value="__manual__">Enter manually…</option>
                          </select>
                          {guideForm.guideName === "__manual__" && (
                            <input
                              required
                              value=""
                              onChange={(e) =>
                                setGuideForm((f) => ({
                                  ...f,
                                  guideName: e.target.value,
                                }))
                              }
                              placeholder="Type guide name…"
                              className={cn(fieldClass, "mt-1")}
                            />
                          )}
                        </>
                      ) : (
                        <input
                          required
                          value={guideForm.guideName}
                          onChange={(e) =>
                            setGuideForm((f) => ({
                              ...f,
                              guideName: e.target.value,
                            }))
                          }
                          placeholder="e.g. Dikshu Sharma"
                          className={fieldClass}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>
                        Role
                      </label>
                      <select
                        value={guideForm.assignmentType}
                        onChange={(e) =>
                          setGuideForm((f) => ({
                            ...f,
                            assignmentType: e.target.value,
                            expenseDate: "",
                            daysWorked: f.daysWorked || "5",
                          }))
                        }
                        className={fieldClass}
                      >
                        <option value="PRIMARY_GUIDE">Primary guide</option>
                        <option value="ASSISTANT_GUIDE">Assistant guide</option>
                        <option value="TRIP_LEADER">Trip leader</option>
                        <option value="DRIVER_GUIDE">Driver guide</option>
                        <option value="FREELANCER">Freelancer</option>
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass}>Days working</label>
                      <input
                        type="number"
                        value={guideForm.daysWorked}
                        min="1"
                        max="30"
                        onChange={(e) =>
                          setGuideForm((f) => ({
                            ...f,
                            daysWorked: e.target.value,
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>Agreed amount (₹)</label>
                      <input
                        type="number"
                        value={guideForm.agreedAmount}
                        min="0"
                        onChange={(e) =>
                          setGuideForm((f) => ({
                            ...f,
                            agreedAmount: e.target.value,
                          }))
                        }
                        placeholder="e.g. 8000"
                        className={fieldClass}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>Advance paid (₹)</label>
                      <input
                        type="number"
                        value={guideForm.advancePaid}
                        min="0"
                        onChange={(e) =>
                          setGuideForm((f) => ({
                            ...f,
                            advancePaid: e.target.value,
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>Reporting time</label>
                      <input
                        type="time"
                        value={guideForm.reportingTime}
                        onChange={(e) =>
                          setGuideForm((f) => ({
                            ...f,
                            reportingTime: e.target.value,
                          }))
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <label className={labelClass}>Notes</label>
                      <input
                        value={guideForm.notes}
                        onChange={(e) =>
                          setGuideForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        placeholder="e.g. Lead guide, experienced in Spiti"
                        className={fieldClass}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>Emergency contact</label>
                      <input
                        value={guideForm.emergencyContact}
                        onChange={(e) =>
                          setGuideForm((f) => ({
                            ...f,
                            emergencyContact: e.target.value,
                          }))
                        }
                        placeholder="+91 XXXXXXXXXX"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#E8EEF4] bg-[#F4F7FB]">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSavingGuide}
                      className="h-8 text-[11px] font-bold bg-[#FF4D00] hover:bg-[#E04500] text-white rounded-[4px]"
                    >
                      {isSavingGuide ? "Saving…" : editingGuideId ? "Update guide" : "Save guide"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={closeGuideForm}
                      className="h-8 text-[11px] font-semibold text-slate-600 hover:bg-white rounded-[4px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Guides Table — live from dbGuides */}
              <div className="bg-white border border-[#E8EEF4] rounded-[6px] overflow-hidden shadow-xs min-w-0">
                {actualGuides.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center text-[12px] text-slate-600 font-medium leading-relaxed">
                    No guides assigned yet. Use Assign guide to add the first
                    guide.
                  </div>
                ) : (
                <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-[#E8EEF4]">
                    <tr className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="p-3 border-r border-slate-100">
                        GUIDE NAME
                      </th>
                      <th className="p-3 border-r border-slate-100">ROLE</th>
                      <th className="p-3 border-r border-slate-100 text-center">
                        STATUS
                      </th>
                      <th className="p-3 border-r border-slate-100 text-center">
                        DAYS
                      </th>
                      <th className="p-3 border-r border-slate-100 text-right">
                        AGREED
                      </th>
                      <th className="p-3 border-r border-slate-100 text-right">
                        ADVANCE PAID
                      </th>
                      <th className="p-3 border-r border-slate-100 text-right">
                        BALANCE DUE
                      </th>
                      <th className="p-3 border-r border-slate-100">NOTES</th>
                      <th className="p-3 border-r border-slate-100">
                        ADDED ON
                      </th>
                      <th className="p-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {actualGuides.map((g: any) => {
                          const guideDisplayName =
                            g.guideName ||
                            g.name ||
                            g.vendor?.name ||
                            "Assigned Guide";
                          const initials = guideDisplayName
                            .split(" ")
                            .map((n: string) => n[0])
                            .filter(Boolean)
                            .join("")
                            .substring(0, 2)
                            .toUpperCase();

                          return (
                            <tr
                              key={g.id || guideDisplayName}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="p-3 border-r border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#FF4D00]/10 text-[#C2410C] flex items-center justify-center font-bold text-[10px] uppercase">
                                    {initials}
                                  </div>
                                  <span className="font-bold text-slate-800">
                                    {guideDisplayName}
                                  </span>
                                </div>
                              </td>
                            <td className="p-3 border-r border-slate-100">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">
                                {(g.assignmentType || "PRIMARY_GUIDE").replace(
                                  /_/g,
                                  " ",
                                )}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 text-center">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-[3px] text-[9px] font-black uppercase tracking-wider border",
                                  g.assignmentStatus === "CONFIRMED" ||
                                    g.assignmentStatus === "ACCEPTED"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : g.assignmentStatus === "ASSIGNED"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : g.assignmentStatus === "CANCELLED"
                                        ? "bg-slate-100 text-slate-500 border-slate-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200",
                                )}
                              >
                                {g.assignmentStatus || "ASSIGNED"}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 text-center font-semibold text-slate-600">
                              {g.daysWorked}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-800">
                              ₹
                              {Number(g.agreedAmount || 0).toLocaleString(
                                "en-IN",
                              )}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right font-semibold text-green-700">
                              ₹
                              {Number(g.advancePaid || 0).toLocaleString(
                                "en-IN",
                              )}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right">
                              <span
                                className={cn(
                                  "font-bold",
                                  Number(g.balanceAmount || 0) > 0
                                    ? "text-red-600"
                                    : "text-green-600",
                                )}
                              >
                                ₹
                                {Number(g.balanceAmount || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 text-slate-500 font-medium text-[11px]">
                              {g.notes || "—"}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-slate-400 text-[10px] font-semibold">
                              {new Date(g.createdAt).toLocaleDateString(
                                "en-IN",
                                { day: "2-digit", month: "short" },
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditGuide(g)}
                                  className="h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleDeleteGuide(g.id, g.guideName)
                                  }
                                  className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>
                )}
              </div>

              {/* Bottom summary bar */}
              <div className="bg-slate-50 border border-[#E8EEF4] rounded-[6px] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs font-semibold min-w-0">
                <span className="text-slate-600">
                  {actualGuides.length === 0
                    ? "No guides assigned"
                    : `${actualGuides.length} guide${actualGuides.length !== 1 ? "s" : ""} assigned to this departure`}
                </span>
                <span className="text-slate-500 text-[10px]">
                  All changes saved to database automatically
                </span>
              </div>

              {/* ──────────────────────── TRIP EXPENSES & ALLOWANCES ──────────────────────── */}
              <div ref={expenseSectionRef} className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-black text-[#0B1528]">
                      Trip Expenses & Allowances
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Track operational expenses provided to guides (e.g. Meals, Buses, Medical Kits, Fuel)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingGuideId(null);
                      setGuideForm(emptyGuideForm("EXPENSE"));
                      setAddGuideOpen(true);
                      revealGuideEditor(true);
                    }}
                    className="inline-flex h-8 w-full md:w-auto text-xs font-bold bg-white hover:bg-[#F4F7FB] border border-[#E8EEF4] text-[#0B1528] rounded-[4px] shadow-xs items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add expense
                  </Button>
                </div>

                {/* Expense editor — lives inside Trip expenses, above the ledger */}
                {addGuideOpen && isExpenseForm && (
                  <form
                    onSubmit={handleAddGuide}
                    className="mb-3 bg-white border border-[#E8EEF4] rounded-[6px] shadow-xs min-w-0 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[#E8EEF4]">
                      <p className="text-[12px] font-bold text-[#0B1528]">
                        {editingGuideId ? "Edit expense" : "Add expense or allowance"}
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        Saved to the departure expense ledger below
                      </p>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="min-w-0">
                        <label className={labelClass}>Expense title *</label>
                        <input
                          required
                          value={guideForm.guideName}
                          onChange={(e) =>
                            setGuideForm((f) => ({ ...f, guideName: e.target.value }))
                          }
                          placeholder="e.g. Meals — Day 3"
                          className={fieldClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Category</label>
                        <select
                          value={guideForm.assignmentType}
                          onChange={(e) =>
                            setGuideForm((f) => ({
                              ...f,
                              assignmentType: e.target.value,
                              expenseDate: f.expenseDate || departureDateStr || "",
                              daysWorked: "1",
                            }))
                          }
                          className={fieldClass}
                        >
                          {GUIDE_EXPENSE_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Trip day</label>
                        <select
                          value={tripDayFromDate(guideForm.expenseDate)}
                          onChange={(e) => {
                            const day = Number(e.target.value);
                            setGuideForm((f) => ({
                              ...f,
                              expenseDate: day ? dateForTripDay(day) : f.expenseDate,
                            }));
                          }}
                          className={fieldClass}
                        >
                          <option value="">Pick a day…</option>
                          {Array.from(
                            { length: guideExpenseTripDays },
                            (_, i) => i + 1,
                          ).map((day) => (
                            <option key={day} value={String(day)}>
                              Day {day} · {formatExpenseDate(dateForTripDay(day))}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Expense date *</label>
                        <input
                          required
                          type="date"
                          value={guideForm.expenseDate}
                          onChange={(e) =>
                            setGuideForm((f) => ({ ...f, expenseDate: e.target.value }))
                          }
                          className={fieldClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Total amount (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={guideForm.agreedAmount}
                          onChange={(e) =>
                            setGuideForm((f) => ({ ...f, agreedAmount: e.target.value }))
                          }
                          placeholder="e.g. 8000"
                          className={fieldClass}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Advance paid (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={guideForm.advancePaid}
                          onChange={(e) =>
                            setGuideForm((f) => ({ ...f, advancePaid: e.target.value }))
                          }
                          className={fieldClass}
                        />
                      </div>
                      <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                        <label className={labelClass}>Notes</label>
                        <input
                          value={guideForm.notes}
                          onChange={(e) =>
                            setGuideForm((f) => ({ ...f, notes: e.target.value }))
                          }
                          placeholder="e.g. For fuel and tolls"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#E8EEF4] bg-[#F4F7FB]">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSavingGuide}
                        className="h-8 text-[11px] font-bold bg-[#FF4D00] hover:bg-[#E04500] text-white rounded-[4px]"
                      >
                        {isSavingGuide ? "Saving…" : editingGuideId ? "Update expense" : "Save expense"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={closeGuideForm}
                        className="h-8 text-[11px] font-semibold text-slate-600 hover:bg-white rounded-[4px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-[#E8EEF4] rounded-[6px] overflow-hidden shadow-xs min-w-0">
                  {tripExpenses.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-slate-500 font-medium leading-relaxed bg-slate-50/30">
                      No trip expenses tracked yet. Add expenses to monitor guide allowances.
                    </div>
                  ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-[#E8EEF4]">
                        <tr className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="p-3 border-r border-slate-100">Expense title</th>
                          <th className="p-3 border-r border-slate-100">Date</th>
                          <th className="p-3 border-r border-slate-100 text-right">Total amount</th>
                          <th className="p-3 border-r border-slate-100 text-right">Advance paid</th>
                          <th className="p-3 border-r border-slate-100 text-right">Balance</th>
                          <th className="p-3 border-r border-slate-100">Notes</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EEF4]">
                        {tripExpenses.map((exp: any) => {
                          const dayLabel = tripDayFromDate(exp.startDate);
                          return (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 border-r border-slate-100 font-bold text-slate-800">
                              <div>{exp.guideName}</div>
                              <span className="mt-1 inline-flex rounded-[3px] border border-[#E8EEF4] bg-[#F4F7FB] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                {getGuideExpenseCategoryLabel(exp.assignmentType)}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 text-slate-700 font-medium whitespace-nowrap">
                              <div>{formatExpenseDate(exp.startDate)}</div>
                              {dayLabel ? (
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  Day {dayLabel}
                                </div>
                              ) : null}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-800">
                              ₹{Number(exp.agreedAmount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right font-semibold text-green-700">
                              ₹{Number(exp.advancePaid || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3 border-r border-slate-100 text-right">
                              <span className={cn("font-bold", Number(exp.balanceAmount || 0) > 0 ? "text-[#FF4D00]" : "text-slate-800")}>
                                ₹{Number(exp.balanceAmount || 0).toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 text-slate-500 font-medium text-[11px]">
                              {exp.notes || "—"}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditGuide(exp)}
                                  className="h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteGuide(exp.id, exp.guideName)}
                                  className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600 rounded"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </div>
            </div>
          ); })()}

          {/* ──────────────────────── ACTIVITIES ──────────────────────── */}
          {/* ─── PLAN: ACTIVITIES ─── */}
          {activeTab === "activities" && (
            <DepartureActivities
              tripId={tripId}
              departureDateStr={departureDateStr}
              tripDetails={tripDetails}
              computedItinerary={computedItinerary}
              allPassengers={allPassengers}
              tripVendors={tripVendors}
              activitiesList={activitiesList}
              fetchPageData={fetchPageData}
              setActivitiesList={setActivitiesList}
              api={api}
            />
          )}

          {/* ══════════════════════════ OPERATIONS TAB ══════════════════════════ */}
          {activeTab === "operations" && (
            <div className="flex items-center gap-0 border-b border-[#E8EEF4] mb-3 min-w-0 overflow-x-auto no-scrollbar">
              {([
                { id: "control", label: "Trip control sheet" },
                { id: "tasks",   label: "Checklist & tasks" },
              ] as { id: "control" | "tasks"; label: string }[]).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setOpsSubTab(s.id as any)}
                  className={cn(
                    "pb-2.5 pt-0.5 px-3 text-[12px] font-semibold transition-all whitespace-nowrap border-b-2 shrink-0",
                    opsSubTab === s.id
                      ? "text-[#FF4D00] border-[#FF4D00]"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* ─── OPERATIONS: TRIP CONTROL (EXCEL REPLACEMENT) ─── */}
          {activeTab === "operations" && opsSubTab === "control" && (
            <DepartureTripControl
              tripId={tripId}
              departureDateStr={departureDateStr}
              tripDetails={tripDetails}
              computedItinerary={computedItinerary}
              tripVendors={tripVendors}
              opsHotels={opsHotels}
              allocFleet={allocFleet}
              dbGuides={dbGuides}
              totalPax={passengerStats.total}
              onEditHotel={(row: any) => {
                setSelectedWizardDayInfo(row);
                setIsAddHotelWizardOpen(true);
              }}
              onOpenTransportModal={() => {
                setActiveTab("transport");
              }}
              onOpenGuideModal={() => {
                setEditingGuideId(null);
                setGuideForm(emptyGuideForm("PRIMARY_GUIDE"));
                setActiveTab("guides");
                setAddGuideOpen(true);
                revealGuideEditor(false);
              }}
            />
          )}

          {/* Ticketing and Allocation sub-tabs removed — use top-level tabs instead */}

          {/* ─── OPERATIONS: TASKS / CHECKLIST ─── */}
          {activeTab === "operations" && opsSubTab === "tasks" && (
            <DepartureTasks
              tripId={tripId}
              departureDateStr={departureDateStr}
            />
          )}
          {/* ══════════════════════════ MONEY TAB ══════════════════════════ */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              <DeparturePayments
                tripId={tripId}
                departureDateStr={departureDateStr}
                tripDetails={tripDetails}
                tripVendors={tripVendors}
              />
            </div>
          )}
          {activeTab === "documents" && (
            <DepartureDocuments tripId={tripId} departureDateStr={departureDateStr} />
          )}

          {/* ──────────────────────── REPORTS ──────────────────────── */}
          {activeTab === "reports" && (
            <DepartureReports
              tripId={tripId}
              departureDateStr={departureDateStr}
            />
          )}
          {/* ── STATION PAYMENT COLLECTION ── */}
          {activeTab === "stationpayments" && (
            <>
              <div className="hidden md:block">
                <StationPaymentCollection
                  tripId={tripId}
                  departureDateStr={departureDateStr}
                />
              </div>
              <div className="block md:hidden">
                <MobileDepartureWorkspace
                  departureName={tripDetails?.title || tripId}
                  departureDate={departureDateStr}
                  passengers={allPassengers}
                />
              </div>
            </>
          )}
          {bookingModalOpen && selectedBooking && (
            <BookingDetailsModal
              open={bookingModalOpen}
              onOpenChange={setBookingModalOpen}
              booking={selectedBooking}
              onRefresh={fetchPageData}
              defaultTab={activeTab === "passengers" ? "passengers" : "overview"}
            />
          )}

          {addTaskModalOpen && (
            <Dialog open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Create Custom Task
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Add a new operational task checklist item for this
                    departure.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Task Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Confirm guide SIM cards"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Checklist Stage
                    </label>
                    <select
                      value={newTaskStage}
                      onChange={(e) => setNewTaskStage(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none bg-white"
                    >
                      <option value="PRE_TRIP_30D">Pre-Trip (30 Days)</option>
                      <option value="PRE_TRIP_7D">Pre-Trip (7 Days)</option>
                      <option value="PRE_TRIP_1D">Pre-Trip (1 Day)</option>
                      <option value="DEPARTURE_DAY">Departure Day</option>
                      <option value="DURING_TRIP">During Trip</option>
                      <option value="POST_TRIP">Post-Trip</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Description / Notes
                    </label>
                    <textarea
                      placeholder="Additional task briefing..."
                      value={newTaskNotes}
                      onChange={(e) => setNewTaskNotes(e.target.value)}
                      rows={3}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddTaskModalOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {editDepartureOpen && (
            <Dialog
              open={editDepartureOpen}
              onOpenChange={setEditDepartureOpen}
            >
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Edit Departure Settings
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Update general information, guide assignments, or status for
                    this batch.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleEditDepartureSubmit}
                  className="space-y-4 mt-2"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Lead Guide Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dikshu Sharma"
                      value={editGuideName}
                      onChange={(e) => setEditGuideName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Departure Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none bg-white"
                    >
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditDepartureOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {addPassengerOpen && (
            <Dialog open={addPassengerOpen} onOpenChange={setAddPassengerOpen}>
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Add Passenger Manifest
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Record a new manual passenger booking for this departure
                    date.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleAddPassengerSubmit}
                  className="space-y-4 mt-2"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={newPaxName}
                      onChange={(e) => setNewPaxName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={newPaxPhone}
                      onChange={(e) => setNewPaxPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Age
                      </label>
                      <input
                        type="number"
                        value={newPaxAge}
                        onChange={(e) => setNewPaxAge(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Gender
                      </label>
                      <select
                        value={newPaxGender}
                        onChange={(e) => setNewPaxGender(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Total Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={newPaxAmount}
                      onChange={(e) => setNewPaxAmount(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddPassengerOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Add Passenger
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {editTransportOpen && (
            <Dialog
              open={editTransportOpen}
              onOpenChange={setEditTransportOpen}
            >
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Edit Transport Asset
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Update vehicle details, route, driver profile, or vendor
                    pricing.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleEditTransportSubmit}
                  className="space-y-3.5 mt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Vehicle Type
                      </label>
                      <input
                        type="text"
                        required
                        value={vehicleTypeForm}
                        onChange={(e) => setVehicleTypeForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Seating Capacity
                      </label>
                      <input
                        type="number"
                        value={capacityForm}
                        onChange={(e) =>
                          setCapacityForm(Number(e.target.value))
                        }
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Route
                    </label>
                    <input
                      type="text"
                      required
                      value={routeForm}
                      onChange={(e) => setRouteForm(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Driver Name
                      </label>
                      <input
                        type="text"
                        value={driverNameForm}
                        onChange={(e) => setDriverNameForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Driver Phone
                      </label>
                      <input
                        type="text"
                        value={driverPhoneForm}
                        onChange={(e) => setDriverPhoneForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Total Cost (₹)
                      </label>
                      <input
                        type="number"
                        value={transportCostForm}
                        onChange={(e) =>
                          setTransportCostForm(Number(e.target.value))
                        }
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Advance Paid (₹)
                      </label>
                      <input
                        type="number"
                        value={transportPaidForm}
                        onChange={(e) =>
                          setTransportPaidForm(Number(e.target.value))
                        }
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Notes / Special Instructions
                    </label>
                    <textarea
                      value={transportNotesForm}
                      onChange={(e) => setTransportNotesForm(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00] h-16 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditTransportOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Save Fleet Details
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {editTrainOpen && (
            <Dialog open={editTrainOpen} onOpenChange={setEditTrainOpen}>
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Edit Train Booking details
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Update train name, PNR number, routing stations, schedules,
                    or booked seats.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleEditTrainSubmit}
                  className="space-y-3.5 mt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Train Name / No.
                      </label>
                      <input
                        type="text"
                        required
                        value={trainNameForm}
                        onChange={(e) => setTrainNameForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        PNR Number
                      </label>
                      <input
                        type="text"
                        required
                        value={trainPnrForm}
                        onChange={(e) => setTrainPnrForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        From (Station)
                      </label>
                      <input
                        type="text"
                        required
                        value={trainFromForm}
                        onChange={(e) => setTrainFromForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        To (Station)
                      </label>
                      <input
                        type="text"
                        required
                        value={trainToForm}
                        onChange={(e) => setTrainToForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Departure Time
                      </label>
                      <input
                        type="text"
                        required
                        value={trainDepTimeForm}
                        onChange={(e) => setTrainDepTimeForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Arrival Time
                      </label>
                      <input
                        type="text"
                        required
                        value={trainArrTimeForm}
                        onChange={(e) => setTrainArrTimeForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Date
                      </label>
                      <input
                        type="text"
                        required
                        value={trainDateForm}
                        onChange={(e) => setTrainDateForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Booked Seats
                      </label>
                      <input
                        type="text"
                        required
                        value={trainSeatsForm}
                        onChange={(e) => setTrainSeatsForm(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={trainStatusForm}
                      onChange={(e) => setTrainStatusForm(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none bg-white"
                    >
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditTrainOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Save Train Details
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {shuffleModalOpen && shufflingTraveler && (
            <Dialog open={shuffleModalOpen} onOpenChange={setShuffleModalOpen}>
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Reshuffle Traveler
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Change room assignment and transport allocation for{" "}
                    <strong>{shufflingTraveler.name}</strong>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Room Assignment
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 101, Group No. 1"
                      value={shuffleRoom === "—" ? "" : shuffleRoom}
                      onChange={(e) => setShuffleRoom(e.target.value || "—")}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Vehicle Assignment
                    </label>
                    <select
                      value={shuffleVehicle}
                      onChange={(e) => setShuffleVehicle(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none bg-white"
                    >
                      <option value="—">Unassigned</option>
                      {allocFleet.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.vehicleType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Seat Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 12, Window"
                      value={shuffleSeat === "—" ? "" : shuffleSeat}
                      onChange={(e) => setShuffleSeat(e.target.value || "—")}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShuffleModalOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const matchedFleet = allocFleet.find(
                          (f) => f.id === shuffleVehicle,
                        );
                        const vehicleVal = matchedFleet
                          ? matchedFleet.name
                          : shuffleVehicle;
                        setPassengerAllocations((prev) => {
                          const entry = {
                            room: shuffleRoom,
                            vehicle: vehicleVal,
                            seat: shuffleSeat,
                          };
                          const updated = { ...prev, [shufflingTraveler.name]: entry };
                          // Also write by id so computedVehicleAllocations finds it
                          if (shufflingTraveler.id) {
                            updated[shufflingTraveler.id] = { ...entry };
                          }
                          return updated;
                        });
                        toast.success(
                          `Updated allocations for ${shufflingTraveler.name}`,
                        );
                        setShuffleModalOpen(false);
                      }}
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Save Reshuffle
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {addRoomModalOpen && (
            <Dialog open={addRoomModalOpen} onOpenChange={setAddRoomModalOpen}>
              <DialogContent className="max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-800">
                    Add Custom Room
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Create an empty room placeholder to shuffle travelers into.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Room Name / Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 105, Cottage 3"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-[4px] focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddRoomModalOpen(false)}
                      className="text-xs font-bold border border-slate-200 rounded-[4px] px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanName = newRoomName.trim();
                        if (!cleanName) {
                          toast.error("Please enter a room name");
                          return;
                        }
                        if (manualRooms.includes(cleanName)) {
                          toast.error("Room already exists");
                          return;
                        }
                        setManualRooms((prev) => [...prev, cleanName]);
                        toast.success(`Created room: ${cleanName}`);
                        setNewRoomName("");
                        setAddRoomModalOpen(false);
                      }}
                      className="text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-5 py-2 transition-colors"
                    >
                      Create Room
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {selectedBookingForRoomAlloc &&
            (() => {
              const bg = selectedBookingForRoomAlloc;
              return (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[999] p-4">
                  <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-slate-800 text-sm">
                          Allocate Rooms & Relationships
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Booking: {bg.bookingRef} — {bg.leadName}'s Group (
                          {bg.totalPassengers} Passengers)
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedBookingForRoomAlloc(null)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto space-y-4 flex-1">
                      <div className="space-y-3.5">
                        {bg.passengers.map((p: any) => {
                          const current = modalAllocations[p.name] || {
                            roomType: "Single",
                            coupleWith: "",
                            groupId: "",
                          };
                          return (
                            <div
                              key={p.id || p.name}
                              className="p-3 bg-slate-50 rounded border border-slate-100 flex flex-wrap items-center gap-3 justify-between"
                            >
                              <div className="min-w-[150px]">
                                <div className="font-bold text-slate-800 text-xs">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {p.gender}, {p.age} yrs{" "}
                                  {p.isLead ? "• Lead" : ""}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Sharing Type Dropdown */}
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Sharing Type
                                  </label>
                                  <select
                                    value={current.roomType}
                                    onChange={(e) =>
                                      handleModalFieldChange(
                                        p.name,
                                        "roomType",
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none w-28 h-7"
                                  >
                                    <option value="Single">Single</option>
                                    <option value="Double">Double</option>
                                    <option value="Triple">Triple</option>
                                    <option value="Quad">Quad</option>
                                    <option value="Family">Family</option>
                                    <option value="Dorm">Dorm</option>
                                  </select>
                                </div>

                                {/* Sharing With Dropdown */}
                                {(current.roomType !== "Single" && current.roomType !== "Individual") && (
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Sharing With
                                    </label>
                                    <select
                                      value={current.coupleWith}
                                      onChange={(e) =>
                                        handleModalFieldChange(
                                          p.name,
                                          "coupleWith",
                                          e.target.value,
                                        )
                                      }
                                      className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none w-32 h-7"
                                    >
                                      <option value="">Select Partner</option>
                                      {bg.passengers
                                        .filter(
                                          (other: any) => other.name !== p.name,
                                        )
                                        .map((other: any) => (
                                          <option
                                            key={other.name}
                                            value={other.name}
                                          >
                                            {other.name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                )}

                                {/* Group ID */}
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Group ID
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      current.groupId || ""
                                    }
                                    onChange={(e) =>
                                      handleModalFieldChange(
                                        p.name,
                                        "groupId",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Internal ID"
                                    className="px-2 py-1 h-7 text-xs border border-slate-200 rounded focus:outline-none w-24"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 rounded-b-lg">
                      <button
                        onClick={() => setSelectedBookingForRoomAlloc(null)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRoomAllocations}
                        className="px-3 py-1.5 bg-[#FF4D00] text-white rounded text-xs hover:bg-[#FF4D00] font-bold transition-colors"
                      >
                        Save Allocations
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}


