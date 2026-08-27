import React, { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import {
  fetchTripVendorDirectory,
  fetchTripsList,
  clearTripVendorCache,
} from "@/services/tripVendorDirectory.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Truck,
  UserCheck,
  UtensilsCrossed,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Search,
  Copy,
  RotateCw,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Filter,
  FileText,
  IndianRupee,
  ShieldCheck,
  Calculator,
  Receipt,
  ArrowRight,
  Settings,
  LayoutGrid,
  Hotel,
  Bus,
  Compass,
  Eye,
  ChevronLeft,
} from "lucide-react";
import { VendorDashboardView } from "@/components/admin/vendors/VendorDashboardView";
const AccommodationDetailPage = lazy(() =>
  import("@/components/admin/vendors/AccommodationDetailPage").then((m) => ({
    default: m.AccommodationDetailPage,
  }))
);
import { DuplicateVendorDialog } from "@/components/admin/vendors/DuplicateVendorDialog";
import { AccommodationModuleView } from "@/components/admin/vendors/modules/AccommodationModuleView";
import { TransportModuleView } from "@/components/admin/vendors/modules/TransportModuleView";
import { ActivitiesModuleView } from "@/components/admin/vendors/modules/ActivitiesModuleView";
import { RestaurantsModuleView } from "@/components/admin/vendors/modules/RestaurantsModuleView";
import { GuidesModuleView } from "@/components/admin/vendors/modules/GuidesModuleView";
import { CampingModuleView } from "@/components/admin/vendors/modules/CampingModuleView";
import { OtherVendorsModuleView } from "@/components/admin/vendors/modules/OtherVendorsModuleView";
import { VendorContractManager } from "@/components/admin/vendors/VendorContractManager";

// Category Tab List - Pure Vendor Directory
const TABS = [
  { id: "accommodation", label: "Accommodation", icon: Hotel, countKey: "accommodation" },
  { id: "transport", label: "Transport", icon: Bus, countKey: "transport" },
  { id: "activities", label: "Activities", icon: Compass, countKey: "activities" },
  { id: "restaurants", label: "Restaurants", icon: UtensilsCrossed, countKey: "restaurants" },
  { id: "guides", label: "Guides", icon: UserCheck, countKey: "guides" },
  { id: "other", label: "Other vendors", icon: Building2, countKey: "other" },
];

export default function VendorDirectoryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory =
    searchParams.get("category") || searchParams.get("tab") || "accommodation";

  const [selectedTripId, setSelectedTripId] = useState<string>(() => {
    return (
      searchParams.get("tripId") ||
      localStorage.getItem("yc_vendor_selected_trip") ||
      "MKA-1"
    );
  });

  const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);
  const [isSavingVendor, setIsSavingVendor] = useState(false);
  const [viewingDetailVendor, setViewingDetailVendor] = useState<any>(null);

  // Duplicate detection dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateVendorMatch, setDuplicateVendorMatch] = useState<any>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDestination, setFilterDestination] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Selected entities for Rates view
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const handleTripSelectChange = (newTripId: string) => {
    setSelectedTripId(newTripId);
    try {
      localStorage.setItem("yc_vendor_selected_trip", newTripId);
    } catch {}
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tripId", newTripId);
    setSearchParams(newParams, { replace: true });
    setViewingDetailVendor(null);
    setFilterDestination("ALL");
  };

  // 1. Primary Query: Single batch query loading all vendors for selectedTripId
  const {
    data: directoryResponse,
    isLoading: isDirectoryLoading,
    isFetching: isDirectoryFetching,
    refetch: refetchDirectory,
  } = useQuery({
    queryKey: ["trip-vendor-directory", selectedTripId],
    queryFn: () => fetchTripVendorDirectory(selectedTripId, "ALL"),
    enabled: !!selectedTripId,
    staleTime: 5 * 60_000, // 5 minutes cache across tab switches
  });

  // 2. Dropdown Query: Full trips list loaded on-demand only when selector is opened
  const { data: fetchedTripsList = [] } = useQuery({
    queryKey: ["vendors-trips-list"],
    queryFn: fetchTripsList,
    enabled: isTripDropdownOpen,
    staleTime: 10 * 60_000,
  });

  const allTripVendors = directoryResponse?.data || [];
  const tripDestinations = directoryResponse?.destinations || [];
  const categoryCounts = directoryResponse?.categoryCounts || {
    total: 0,
    accommodation: 0,
    transport: 0,
    activities: 0,
    restaurants: 0,
    guides: 0,
    other: 0,
  };
  const tripInfo = directoryResponse?.trip;

  const ACCOMMODATION_TYPES = [
    "HOTEL", "HOMESTAY", "CAMP", "RESORT", "HOSTEL", "GUEST_HOUSE",
    "VILLA", "COTTAGE", "APARTMENT", "DORMITORY", "LUXURY_TENT",
  ];

  // Pure 0ms instant client-side filtering across tabs, search, destination, and status
  const filteredVendors = useMemo(() => {
    return allTripVendors.filter((v: any) => {
      // 1. Category tab filtering
      if (currentCategory === "accommodation") {
        if (!ACCOMMODATION_TYPES.includes(v.type)) return false;
      } else if (currentCategory === "transport") {
        if (v.type !== "TRANSPORT") return false;
      } else if (currentCategory === "activities") {
        if (v.type !== "ACTIVITIES") return false;
      } else if (currentCategory === "restaurants") {
        if (v.type !== "RESTAURANT" && v.type !== "FOOD") return false;
      } else if (currentCategory === "guides") {
        if (v.type !== "GUIDE") return false;
      } else if (currentCategory === "other") {
        const known = [...ACCOMMODATION_TYPES, "TRANSPORT", "ACTIVITIES", "RESTAURANT", "FOOD", "GUIDE"];
        if (known.includes(v.type) && v.type !== "OTHER") return false;
      }

      // 2. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = v.name?.toLowerCase().includes(q);
        const matchContact =
          v.contactPerson?.toLowerCase().includes(q) ||
          v.contactNumber?.includes(q) ||
          v.phone?.includes(q);
        const matchCity =
          v.city?.toLowerCase().includes(q) ||
          v.location?.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchCity) return false;
      }

      // 3. Destination filter
      if (filterDestination && filterDestination !== "ALL") {
        const dLow = filterDestination.toLowerCase();
        const destMatch =
          (v.city && v.city.toLowerCase() === dLow) ||
          (v.location && v.location.toLowerCase() === dLow) ||
          (v.destinations &&
            v.destinations.some((d: any) => d.destinationName?.toLowerCase() === dLow));
        if (!destMatch) return false;
      }

      // 4. Status filter
      if (filterStatus === "ACTIVE" && v.isActive === false) return false;
      if (filterStatus === "INACTIVE" && v.isActive !== false) return false;

      return true;
    });
  }, [allTripVendors, currentCategory, searchTerm, filterDestination, filterStatus]);

  const pagination = useMemo(
    () => ({
      total: filteredVendors.length,
      page: 1,
      limit: 100,
      pages: 1,
      startIndex: filteredVendors.length > 0 ? 1 : 0,
      endIndex: filteredVendors.length,
    }),
    [filteredVendors.length]
  );

  const vendors = filteredVendors;

  const tripsList = useMemo(() => {
    if (fetchedTripsList.length > 0) return fetchedTripsList;
    if (tripInfo) {
      return [
        {
          id: tripInfo.id,
          title: tripInfo.title,
          location: tripInfo.location,
          _count: { tripVendors: tripInfo.vendorCount },
        },
      ];
    }
    return [{ id: selectedTripId, title: selectedTripId, _count: { tripVendors: 0 } }];
  }, [fetchedTripsList, tripInfo, selectedTripId]);

  const invalidateTripVendorData = () => {
    clearTripVendorCache(selectedTripId);
    queryClient.invalidateQueries({
      queryKey: ["trip-vendor-directory", selectedTripId],
    });
  };

  // Costing inputs
  const [costingPax, setCostingPax] = useState("10");
  const [costingContingency, setCostingContingency] = useState("5");
  const [costingResult, setCostingResult] = useState<any>(null);

  // Form State
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [vendorForm, setVendorForm] = useState<any>({
    vendorCode: "",
    name: "",
    legalName: "",
    type: "HOTEL",
    contactPerson: "",
    contactNumber: "",
    alternateNumber: "",
    whatsappNumber: "",
    email: "",
    
    // Tax & Entity
    companyName: "",
    gstin: "",
    panNumber: "",
    
    // Address
    state: "Himachal Pradesh",
    city: "",
    area: "",
    address: "",
    
    // Terms & Services
    paymentTerms: "",
    creditDays: "30",
    priority: "3",
    rating: "0",
    blacklisted: false,
    preferred: false,
    citiesCovered: [],
    services: [],
    
    notes: "",
    contacts: [],
  });

  // Rates Form
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateType, setRateType] = useState<
    "ROOM" | "TRANSPORT" | "FOOD" | "GUIDE" | "MISC"
  >("ROOM");
  const [roomRateForm, setRoomRateForm] = useState<any>({
    propertyName: "",
    roomCategory: "Standard",
    sharingType: "DOUBLE",
    standardOccupancy: "2",
    maximumOccupancy: "3",
    mixedOccupancyAllowed: true,
    rateBasis: "PER_ROOM_PER_NIGHT",
    amount: "",
    extraAdultRate: "",
    extraChildRate: "",
    guideRoomRate: "",
    availableRooms: "",
    mealPlan: "EP",
    season: "ALL",
    validFrom: "",
    validTo: "",
    taxIncluded: false,
    taxPercent: "12",
  });

  const [transportRateForm, setTransportRateForm] = useState<any>({
    routeName: "",
    pickupLocation: "",
    dropLocation: "",
    vehicleType: "17 Seater Tempo",
    seatCapacity: "17",
    rateBasis: "PER_VEHICLE",
    amount: "",
    extraCharge: "0",
    season: "ALL",
  });

  // Payments log form
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<any>({
    vendorId: "",
    invoiceAmount: "",
    advanceAmount: "0",
    paidAmount: "0",
    dueDate: "",
    paymentMode: "BANK_TRANSFER",
    transactionRef: "",
    remarks: "",
  });

  const handleRemoveVendorFromTrip = async (vendorId: string, vendorName: string) => {
    if (!selectedTripId) return;
    const tripTitle = tripsList.find((t) => t.id === selectedTripId)?.title || "this trip";
    if (!confirm(`Remove "${vendorName}" from ${tripTitle}? The vendor record itself is NOT deleted.`)) return;
    try {
      await api.delete(`/vendors/trips/${selectedTripId}/remove/${vendorId}`);
      toast.success(`Removed "${vendorName}" from trip (vendor record preserved)`);
      invalidateTripVendorData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove vendor from trip");
    }
  };

  const getCategoryVendorType = (cat: string) => {
    switch (cat) {
      case "transport":
        return "TRANSPORT";
      case "activities":
        return "ACTIVITIES";
      case "restaurants":
        return "RESTAURANT";
      case "guides":
        return "GUIDE";
      case "camping":
        return "CAMPING";
      case "other":
        return "OTHER";
      case "accommodation":
      default:
        return "HOTEL";
    }
  };

  const handleOpenAddVendor = (forcedCategory?: string) => {
    if (!selectedTripId) {
      toast.error("Please select a trip first");
      return;
    }
    const categoryToUse = forcedCategory || currentCategory;
    const defaultType = getCategoryVendorType(categoryToUse);

    setEditingVendor(null);
    setVendorForm({
      vendorCode: "",
      name: "",
      legalName: "",
      type: defaultType,
      contactPerson: "",
      contactNumber: "",
      alternateNumber: "",
      whatsappNumber: "",
      email: "",
      companyName: "",
      gstin: "",
      panNumber: "",
      state: "Himachal Pradesh",
      city: "",
      area: "",
      address: "",
      paymentTerms: "",
      creditDays: "30",
      priority: "3",
      rating: "0",
      blacklisted: false,
      preferred: false,
      citiesCovered: [],
      services: [],
      notes: "",
      contacts: [],
      accommodationType: "",
      starRating: "3",
      checkInTime: "",
      checkOutTime: "",
      fleetTypes: [],
      fleetType: "",
      fleetSize: "",
      seatCapacity: "",
      permitType: "",
      driverName: "",
      dailyTariff: "",
      activityType: "",
      batchCapacity: "",
      safetyRating: "",
      commissionPercent: "",
      outletType: "",
      cuisineTypes: "",
      buffetCapacity: "",
      avgMealRate: "",
      guideRole: "",
      certifications: "",
      languages: "",
      dailyGuideFee: "",
      campsiteType: "",
      washroomType: "",
      tentCapacity: "",
      customCategory: "",
    });
    setVendorModalOpen(true);
  };

  const handleSaveVendor = async (force: boolean = false) => {
    if (isSavingVendor) return;
    if (!vendorForm.name || !vendorForm.type) {
      toast.error("Please fill in Vendor Name and Category");
      return;
    }

    // Pre-save duplicate check
    if (!editingVendor && !force) {
      const match = allTripVendors.find(
        (v) =>
          (v.name && v.name.toLowerCase() === vendorForm.name.toLowerCase()) ||
          (vendorForm.contactNumber &&
            (v.contactNumber === vendorForm.contactNumber ||
              v.phone === vendorForm.contactNumber)) ||
          (vendorForm.gstin &&
            v.gstin &&
            v.gstin.toLowerCase() === vendorForm.gstin.toLowerCase()),
      );
      if (match) {
        setDuplicateVendorMatch(match);
        setDuplicateDialogOpen(true);
        return;
      }
    }

    setIsSavingVendor(true);
    try {
      if (editingVendor) {
        await api.patch(`/vendors/directory/${editingVendor.id}`, vendorForm);
        toast.success("Vendor updated successfully");
      } else {
        const createRes = await api.post("/vendors/directory", vendorForm);
        const newVendorId = createRes.data?.data?.id;
        // Auto-assign the new vendor to the currently selected trip
        if (newVendorId && selectedTripId) {
          await api.post(`/vendors/trips/${selectedTripId}/assign`, {
            vendorId: newVendorId,
            category: vendorForm.type || "OTHER",
          }).catch(() => null); // silent — vendor is created even if mapping fails
        }
        toast.success("Vendor created and mapped to trip");
      }
      setVendorModalOpen(false);
      setDuplicateDialogOpen(false);
      invalidateTripVendorData();
    } catch (err: any) {
      toast.error(
        "Failed to save vendor: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setIsSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this vendor?")) return;
    try {
      await api.delete(`/vendors/directory/${id}`);
      toast.success("Vendor deactivated successfully");
      invalidateTripVendorData();
    } catch (err: any) {
      toast.error("Deactivation failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveRate = async () => {
    if (!selectedVendor) return;
    try {
      let endpoint = `/vendors/directory/${selectedVendor.id}/room-rates`;
      let payload = roomRateForm;
      if (rateType === "TRANSPORT") {
        endpoint = `/vendors/directory/${selectedVendor.id}/transport-rates`;
        payload = transportRateForm;
      }
      await api.post(endpoint, payload);
      toast.success("Rate successfully registered!");
      setRateModalOpen(false);
      invalidateTripVendorData();
    } catch (err: any) {
      toast.error("Failed to create rate: " + err.message);
    }
  };

  const runCosting = async () => {
    // Run mock pricing calculation or direct pricing engine logic
    if (allTripVendors.length === 0) return;
    try {
      // Find hotel rate
      const hotel = allTripVendors.find(
        (v) => v.type === "HOTEL" && v.roomRates.length > 0,
      );
      const transport = vendors.find(
        (v) => v.type === "TRANSPORT" && v.transportRates.length > 0,
      );

      const payload = {
        paxCount: parseInt(costingPax),
        contingencyPercent: parseInt(costingContingency),
        accommodations: hotel
          ? [
              {
                sharingType: hotel.roomRates[0].sharingType,
                rateBasis: hotel.roomRates[0].rateBasis,
                amount: hotel.roomRates[0].amount,
                paxCount: parseInt(costingPax),
                numberOfNights: 3,
                maxRoomCapacity: hotel.roomRates[0].maximumOccupancy,
              },
            ]
          : [],
        transports: transport
          ? [
              {
                vehicleType: transport.transportRates[0].vehicleType,
                seatCapacity: transport.transportRates[0].seatCapacity,
                amount: transport.transportRates[0].amount,
                paxCount: parseInt(costingPax),
                rateBasis: transport.transportRates[0].rateBasis,
              },
            ]
          : [],
      };

      const res = await api.post(
        "/vendors/directory/costing/calculate",
        payload,
      );
      setCostingResult(res.data?.data);
      toast.success("Pricing calculation compiled!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleSavePayment = async () => {
    if (!paymentForm.vendorId || !paymentForm.invoiceAmount) {
      toast.error("Please fill in vendor and invoice fields");
      return;
    }
    try {
      await api.post("/vendors/directory/payments", paymentForm);
      toast.success("Payment logged successfully!");
      setPaymentModalOpen(false);
      invalidateTripVendorData();
    } catch (err: any) {
      toast.error("Payment failed: " + err.message);
    }
  };

  const selectedTrip = tripsList.find((t) => t.id === selectedTripId);

  return (
    <div className="space-y-4 p-0 min-h-0 bg-transparent text-[#0B1528]">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#0B1528]">
            {selectedTrip ? selectedTrip.title : "Select a trip"}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {selectedTrip
              ? `${selectedTrip.location || "Trip"} · ${selectedTrip._count?.tripVendors || 0} vendors`
              : "Choose a trip to manage its vendors"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Select
            value={selectedTripId}
            onValueChange={handleTripSelectChange}
            onOpenChange={(open) => {
              if (open) setIsTripDropdownOpen(true);
            }}
          >
            <SelectTrigger className="h-9 w-[min(100%,260px)] rounded-md border-[#E8EEF4] bg-white text-[12px] font-medium text-[#0B1528] shadow-none focus:ring-1 focus:ring-[#FF4D00]/30 focus:ring-offset-0">
              <SelectValue placeholder="Select trip" />
            </SelectTrigger>
            <SelectContent className="bg-white text-[12px] font-medium">
              {tripsList.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                  <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                    ({t._count?.tripVendors || 0})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            disabled={!selectedTripId}
            onClick={() => handleOpenAddVendor()}
            className="h-9 cursor-pointer rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-semibold text-white shadow-none hover:bg-[#E04400] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add vendor
          </Button>
        </div>
      </div>

      {!viewingDetailVendor && (
        <div className="flex items-end gap-0 overflow-x-auto no-scrollbar border-b border-[#E8EEF4]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentCategory === tab.id;
            const count = (categoryCounts as any)[tab.countKey] ?? 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set("category", tab.id);
                  if (selectedTripId) newParams.set("tripId", selectedTripId);
                  setSearchParams(newParams, { replace: true });
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] whitespace-nowrap transition-colors",
                  isActive
                    ? "border-[#FF4D00] font-semibold text-[#0B1528]"
                    : "border-transparent font-medium text-slate-500 hover:text-[#0B1528]",
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", isActive ? "text-[#FF4D00]" : "text-slate-400")}
                  strokeWidth={1.75}
                />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "min-w-[1.25rem] text-center text-[10px] tabular-nums",
                    isActive ? "font-semibold text-[#FF4D00]" : "text-slate-400",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail View Overlay */}
      {viewingDetailVendor ? (
        <React.Suspense fallback={<div className="p-12 text-center text-xs font-bold text-slate-400">Loading vendor details...</div>}>
          <AccommodationDetailPage
            vendor={viewingDetailVendor}
            onBack={() => setViewingDetailVendor(null)}
            onUpdateVendor={(updated) => {
              if (updated && updated.id) {
                setViewingDetailVendor((prev: any) => ({ ...prev, ...updated }));
              }
              invalidateTripVendorData();
            }}
          />
        </React.Suspense>
      ) : (
        <>
          {/* Main Module Switcher based on current URL category */}
          {currentCategory === "dashboard" && (
            <VendorDashboardView
              vendors={vendors}
              onSelectCategory={(cat) => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set("category", cat);
                if (selectedTripId) newParams.set("tripId", selectedTripId);
                setSearchParams(newParams, { replace: true });
              }}
            />
          )}

          {/* Active destinations list for current scope */}
          {!selectedTripId ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Building2 className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-sm font-semibold text-slate-500">No trip selected</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Select a trip from the dropdown above to manage its vendors</p>
            </div>
          ) : (
          <>{ (() => {
            const activeDestinations = tripDestinations;
            const handleDeleteOrRemove = (id: string) => {
              const target = allTripVendors.find((v) => v.id === id);
              handleRemoveVendorFromTrip(id, target?.name || "Vendor");
            };

            return (
              <>
                {currentCategory === "accommodation" && (
                  <AccommodationModuleView
                    vendors={filteredVendors}
                    destinations={activeDestinations}
                    pagination={pagination}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDestination={filterDestination}
                    onDestinationChange={setFilterDestination}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    onRefresh={refetchDirectory}
                    onPageChange={() => {}}
                    onSelectVendor={(v) => setViewingDetailVendor(v)}
                    onAddVendor={() => handleOpenAddVendor("accommodation")}
                    onEditVendor={(v) => {
                      setEditingVendor(v);
                      setVendorForm({ ...v, type: v.type || "HOTEL" });
                      setVendorModalOpen(true);
                    }}
                    onDeleteVendor={handleDeleteOrRemove}
                  />
                )}

                {currentCategory === "transport" && (
                  <TransportModuleView
                    vendors={filteredVendors}
                    destinations={activeDestinations}
                    pagination={pagination}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDestination={filterDestination}
                    onDestinationChange={setFilterDestination}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    onRefresh={refetchDirectory}
                    onPageChange={() => {}}
                    onSelectVendor={(v) => setViewingDetailVendor(v)}
                    onAddVendor={() => handleOpenAddVendor("transport")}
                    onEditVendor={(v) => {
                      setEditingVendor(v);
                      setVendorForm({ ...v, type: v.type || "TRANSPORT" });
                      setVendorModalOpen(true);
                    }}
                    onDeleteVendor={handleDeleteOrRemove}
                  />
                )}

                {currentCategory === "activities" && (
                  <ActivitiesModuleView
                    vendors={filteredVendors}
                    destinations={activeDestinations}
                    pagination={pagination}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDestination={filterDestination}
                    onDestinationChange={setFilterDestination}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    onRefresh={refetchDirectory}
                    onPageChange={() => {}}
                    onSelectVendor={(v) => setViewingDetailVendor(v)}
                    onAddVendor={() => handleOpenAddVendor("activities")}
                    onEditVendor={(v) => {
                      setEditingVendor(v);
                      setVendorForm({ ...v, type: v.type || "ACTIVITIES" });
                      setVendorModalOpen(true);
                    }}
                    onDeleteVendor={handleDeleteOrRemove}
                  />
                )}

                {currentCategory === "restaurants" && (
                  <RestaurantsModuleView
                    vendors={filteredVendors}
                    destinations={activeDestinations}
                    pagination={pagination}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDestination={filterDestination}
                    onDestinationChange={setFilterDestination}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    onRefresh={refetchDirectory}
                    onPageChange={() => {}}
                    onSelectVendor={(v) => setViewingDetailVendor(v)}
                    onAddVendor={() => handleOpenAddVendor("restaurants")}
                    onEditVendor={(v) => {
                      setEditingVendor(v);
                      setVendorForm({ ...v, type: v.type || "RESTAURANT" });
                      setVendorModalOpen(true);
                    }}
                    onDeleteVendor={handleDeleteOrRemove}
                  />
                )}

                {currentCategory === "guides" && (
                  <GuidesModuleView
                    vendors={filteredVendors}
                    destinations={activeDestinations}
                    pagination={pagination}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDestination={filterDestination}
                    onDestinationChange={setFilterDestination}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    onRefresh={refetchDirectory}
                    onPageChange={() => {}}
                    onSelectVendor={(v) => setViewingDetailVendor(v)}
                    onAddVendor={() => handleOpenAddVendor("guides")}
                    onEditVendor={(v) => {
                      setEditingVendor(v);
                      setVendorForm({ ...v, type: v.type || "GUIDE" });
                      setVendorModalOpen(true);
                    }}
                    onDeleteVendor={handleDeleteOrRemove}
                  />
                )}

                {currentCategory === "other" && (
                  <OtherVendorsModuleView
                    vendors={filteredVendors}
                    destinations={activeDestinations}
                    pagination={pagination}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterDestination={filterDestination}
                    onDestinationChange={setFilterDestination}
                    filterStatus={filterStatus}
                    onStatusChange={setFilterStatus}
                    onRefresh={refetchDirectory}
                    onPageChange={() => {}}
                    onSelectVendor={(v) => setViewingDetailVendor(v)}
                    onAddVendor={() => handleOpenAddVendor("other")}
                    onEditVendor={(v) => {
                      setEditingVendor(v);
                      setVendorForm({ ...v, type: v.type || "OTHER" });
                      setVendorModalOpen(true);
                    }}
                    onDeleteVendor={handleDeleteOrRemove}
                  />
                )}
              </>
            );
          })()}</>
          )}
        </>
      )}

      <DuplicateVendorDialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        existingVendor={duplicateVendorMatch}
        onUseExisting={(v) => {
          setViewingDetailVendor(v);
          setDuplicateDialogOpen(false);
          setVendorModalOpen(false);
        }}
        onForceCreate={() => handleSaveVendor(true)}
      />

      {/* Vendor Form Modal — Dynamic Category Specific Fields */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-xl p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center justify-between border-b pb-2 border-slate-100">
              <span>
                {editingVendor
                  ? "Edit Vendor Details"
                  : "Register New Directory Vendor"}
              </span>
              <span className="text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                Category: {vendorForm.type}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Basic Universal Fields */}
          <div className="space-y-4 mt-3">
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Universal Vendor Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-semibold text-slate-650">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Vendor Name *
                </label>
                <Input
                  value={vendorForm.name}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, name: e.target.value })
                  }
                  placeholder="e.g. Hotel Mountain View / Shashi Transport"
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Vendor Category / Type *
                </label>
                <Select
                  value={vendorForm.type}
                  onValueChange={(v) =>
                    setVendorForm({ ...vendorForm, type: v })
                  }
                >
                  <SelectTrigger className="h-8.5 border-slate-200 bg-white font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="HOTEL">ACCOMMODATION & STAYS</SelectItem>
                    <SelectItem value="TRANSPORT">TRANSPORT & FLEET</SelectItem>
                    <SelectItem value="ACTIVITIES">
                      ACTIVITIES & ADVENTURE
                    </SelectItem>
                    <SelectItem value="RESTAURANT">
                      RESTAURANTS & MEALS
                    </SelectItem>
                    <SelectItem value="GUIDE">GUIDES & EXPEDITIONS</SelectItem>
                    <SelectItem value="OTHER">OTHER VENDORS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Vendor Code
                </label>
                <Input
                  value={vendorForm.vendorCode}
                  placeholder="Auto-generated if empty"
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, vendorCode: e.target.value })
                  }
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Contact Person *
                </label>
                <Input
                  value={vendorForm.contactPerson}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      contactPerson: e.target.value,
                    })
                  }
                  placeholder="e.g. Suresh Kumar"
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Primary Phone *
                </label>
                <Input
                  value={vendorForm.contactNumber}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      contactNumber: e.target.value,
                    })
                  }
                  placeholder="+91 98166 00000"
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Email Address *
                </label>
                <Input
                  value={vendorForm.email}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, email: e.target.value })
                  }
                  placeholder="vendor@company.com"
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  City *
                </label>
                <Input
                  value={vendorForm.city}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, city: e.target.value })
                  }
                  placeholder="Manali / Shimla / Kasol"
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  State *
                </label>
                <Input
                  value={vendorForm.state}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, state: e.target.value })
                  }
                  placeholder="Himachal Pradesh"
                  className="h-8.5 rounded bg-white text-slate-800 border-slate-200"
                />
              </div>
            </div>
            {/* TRAVEL ERP SPECIFIC FIELDS */}
            <div className="pt-3 border-t border-slate-100 space-y-3 mt-4">
              <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                ERP Legal & Financials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-semibold text-slate-650">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Company Name</label>
                  <Input value={vendorForm.companyName} onChange={(e) => setVendorForm({...vendorForm, companyName: e.target.value})} placeholder="Legal Entity Name" className="h-8.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">GST Number</label>
                  <Input value={vendorForm.gstin} onChange={(e) => setVendorForm({...vendorForm, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" className="h-8.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">PAN Number</label>
                  <Input value={vendorForm.panNumber} onChange={(e) => setVendorForm({...vendorForm, panNumber: e.target.value})} placeholder="ABCDE1234F" className="h-8.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">ERP Priority (1-5)</label>
                  <Input type="number" min="1" max="5" value={vendorForm.priority} onChange={(e) => setVendorForm({...vendorForm, priority: e.target.value})} placeholder="3" className="h-8.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Rating (0-5)</label>
                  <Input type="number" step="0.5" min="0" max="5" value={vendorForm.rating} onChange={(e) => setVendorForm({...vendorForm, rating: e.target.value})} placeholder="4.5" className="h-8.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Credit Days</label>
                  <Input type="number" value={vendorForm.creditDays} onChange={(e) => setVendorForm({...vendorForm, creditDays: e.target.value})} placeholder="30" className="h-8.5" />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-550 uppercase">Payment Terms</label>
                  <Input value={vendorForm.paymentTerms} onChange={(e) => setVendorForm({...vendorForm, paymentTerms: e.target.value})} placeholder="e.g. 50% advance, 50% on arrival" className="h-8.5" />
                </div>
              </div>
            </div>

            {/* DYNAMIC CATEGORY-SPECIFIC OPERATIONAL PARAMETERS */}
            <div className="pt-2 border-t border-slate-100 space-y-3 mt-4">
              <h4 className="text-[11px] font-black text-[#FF4D00] uppercase tracking-wider flex items-center gap-1.5">
                Category-Specific Parameters ({vendorForm.type})
              </h4>

              {/* HOTEL / ACCOMMODATION PARAMETERS */}
              {vendorForm.type === "HOTEL" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-amber-50/40 p-3.5 rounded-lg border border-amber-200/60 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Accommodation Category
                    </label>
                    <Select
                      value={vendorForm.accommodationType || "HOTEL"}
                      onValueChange={(v) =>
                        setVendorForm({ ...vendorForm, accommodationType: v })
                      }
                    >
                      <SelectTrigger className="h-8.5 bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs bg-white">
                        <SelectItem value="HOTEL">Hotel</SelectItem>
                        <SelectItem value="RESORT">Resort</SelectItem>
                        <SelectItem value="HOMESTAY">Homestay</SelectItem>
                        <SelectItem value="HOSTEL">Hostel</SelectItem>
                        <SelectItem value="CAMP">Camp / Luxury Tent</SelectItem>
                        <SelectItem value="GUEST_HOUSE">Guest House</SelectItem>
                        <SelectItem value="VILLA">Villa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Star Rating
                    </label>
                    <Select
                      value={(vendorForm.starRating || 3).toString()}
                      onValueChange={(v) =>
                        setVendorForm({ ...vendorForm, starRating: v })
                      }
                    >
                      <SelectTrigger className="h-8.5 bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs bg-white">
                        <SelectItem value="1">1 Star ★</SelectItem>
                        <SelectItem value="2">2 Star ★★</SelectItem>
                        <SelectItem value="3">3 Star ★★★</SelectItem>
                        <SelectItem value="4">4 Star ★★★★</SelectItem>
                        <SelectItem value="5">5 Star ★★★★★</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Check-In Time
                    </label>
                    <Input
                      value={vendorForm.checkInTime || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          checkInTime: e.target.value,
                        })
                      }
                      placeholder="e.g. 12:00 PM"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Check-Out Time
                    </label>
                    <Input
                      value={vendorForm.checkOutTime || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          checkOutTime: e.target.value,
                        })
                      }
                      placeholder="e.g. 11:00 AM"
                      className="h-8.5 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* TRANSPORT PARAMETERS */}
              {vendorForm.type === "TRANSPORT" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-green-50/40 p-3.5 rounded-lg border border-green-200/60 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Fleet Vehicle Category
                    </label>
                    <Select
                      value={vendorForm.fleetType || ""}
                      onValueChange={(v) =>
                        setVendorForm({ ...vendorForm, fleetType: v })
                      }
                    >
                      <SelectTrigger className="h-8.5 bg-white border-slate-200">
                        <SelectValue placeholder="Select Fleet Category" />
                      </SelectTrigger>
                      <SelectContent className="text-xs bg-white">
                        <SelectItem value="Tempo Traveller">
                          Tempo Traveller Fleet
                        </SelectItem>
                        <SelectItem value="SUV / Innova">
                          SUV Fleet (Innova / Ertiga)
                        </SelectItem>
                        <SelectItem value="Volvo Luxury Bus">
                          Volvo Luxury Bus Fleet
                        </SelectItem>
                        <SelectItem value="Cab / Sedan">
                          Local Cab / Sedan
                        </SelectItem>
                        <SelectItem value="Force Urbania">
                          Force Urbania Luxury Van
                        </SelectItem>
                        <SelectItem value="Multiple Vehicles">
                          Multiple Fleet Vehicles
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Vehicle Seating Capacity
                    </label>
                    <Input
                      value={vendorForm.seatCapacity || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          seatCapacity: e.target.value,
                        })
                      }
                      placeholder="e.g. 17 or 12, 17, 26"
                      className="h-8.5 bg-white font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Permit Type
                    </label>
                    <Select
                      value={vendorForm.permitType || ""}
                      onValueChange={(v) =>
                        setVendorForm({ ...vendorForm, permitType: v })
                      }
                    >
                      <SelectTrigger className="h-8.5 bg-white border-slate-200">
                        <SelectValue placeholder="Select Permit Type" />
                      </SelectTrigger>
                      <SelectContent className="text-xs bg-white">
                        <SelectItem value="All India Tourist Permit (AITP)">
                          All India Tourist Permit (AITP)
                        </SelectItem>
                        <SelectItem value="State Permit">
                          State Commercial Permit
                        </SelectItem>
                        <SelectItem value="Local Permit">
                          Local Commercial Permit
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Driver Name & License
                    </label>
                    <Input
                      value={vendorForm.driverName || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          driverName: e.target.value,
                        })
                      }
                      placeholder="e.g. Ramesh Singh (DL-142019)"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Base Daily Tariff (₹)
                    </label>
                    <Input
                      value={vendorForm.dailyTariff || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          dailyTariff: e.target.value,
                        })
                      }
                      placeholder="e.g. 4500"
                      className="h-8.5 bg-white font-bold text-green-700"
                    />
                  </div>
                </div>
              )}

              {/* ACTIVITIES PARAMETERS */}
              {vendorForm.type === "ACTIVITIES" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#FF4D00]/5/40 p-3.5 rounded-lg border border-[#FF4D00]/30/60 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Activities Offered
                    </label>
                    <Input
                      value={vendorForm.activityType || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          activityType: e.target.value,
                        })
                      }
                      placeholder="e.g. River Rafting, Paragliding, Zipline"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Batch Capacity (Travelers / Batch)
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.batchCapacity || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          batchCapacity: e.target.value,
                        })
                      }
                      placeholder="e.g. 30"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Safety Rating
                    </label>
                    <Input
                      value={vendorForm.safetyRating || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          safetyRating: e.target.value,
                        })
                      }
                      placeholder="e.g. Certified Standard A+"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Commission %
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.commissionPercent || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          commissionPercent: e.target.value,
                        })
                      }
                      placeholder="e.g. 15"
                      className="h-8.5 bg-white font-bold text-[#C2410C]"
                    />
                  </div>
                </div>
              )}

              {/* RESTAURANT PARAMETERS */}
              {vendorForm.type === "RESTAURANT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-blue-50/40 p-3.5 rounded-lg border border-blue-200/60 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Outlet Type
                    </label>
                    <Select
                      value={vendorForm.outletType || ""}
                      onValueChange={(v) =>
                        setVendorForm({ ...vendorForm, outletType: v })
                      }
                    >
                      <SelectTrigger className="h-8.5 bg-white border-slate-200">
                        <SelectValue placeholder="Select Outlet Type" />
                      </SelectTrigger>
                      <SelectContent className="text-xs bg-white">
                        <SelectItem value="Group Buffet Hall">
                          Group Buffet Hall
                        </SelectItem>
                        <SelectItem value="Highway Dhaba">
                          Highway Dhaba
                        </SelectItem>
                        <SelectItem value="Café">Café & Restaurant</SelectItem>
                        <SelectItem value="Fine Dine">
                          Fine Dine Restaurant
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Cuisines Offered
                    </label>
                    <Input
                      value={vendorForm.cuisineTypes || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          cuisineTypes: e.target.value,
                        })
                      }
                      placeholder="e.g. North Indian, Pahadi, Veg / Jain"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Buffet Capacity (Persons)
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.buffetCapacity || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          buffetCapacity: e.target.value,
                        })
                      }
                      placeholder="e.g. 60"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Avg Meal Rate / Person (₹)
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.avgMealRate || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          avgMealRate: e.target.value,
                        })
                      }
                      placeholder="e.g. 250"
                      className="h-8.5 bg-white font-bold text-blue-700"
                    />
                  </div>
                </div>
              )}

              {/* GUIDE PARAMETERS */}
              {vendorForm.type === "GUIDE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#FF4D00]/5/40 p-3.5 rounded-lg border border-[#FF4D00]/30/60 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Guide Expedition Role
                    </label>
                    <Input
                      value={vendorForm.guideRole || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          guideRole: e.target.value,
                        })
                      }
                      placeholder="e.g. Mountain Trekking Guide"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Certifications (NIM / IMF)
                    </label>
                    <Input
                      value={vendorForm.certifications || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          certifications: e.target.value,
                        })
                      }
                      placeholder="e.g. NIM Basic & Advance, IMF Certified"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Languages Spoken
                    </label>
                    <Input
                      value={vendorForm.languages || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          languages: e.target.value,
                        })
                      }
                      placeholder="e.g. English, Hindi, Pahadi"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Daily Guide Fee (₹ / Day)
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.dailyGuideFee || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          dailyGuideFee: e.target.value,
                        })
                      }
                      placeholder="e.g. 2000"
                      className="h-8.5 bg-white font-bold text-[#C2410C]"
                    />
                  </div>
                </div>
              )}

              {/* CAMPING PARAMETERS */}
              {vendorForm.type === "CAMPING" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-pink-50/40 p-3.5 rounded-lg border border-pink-200/60 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Campsite Type
                    </label>
                    <Input
                      value={vendorForm.campsiteType || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          campsiteType: e.target.value,
                        })
                      }
                      placeholder="e.g. Riverside Luxury Tents"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Washroom Facility
                    </label>
                    <Select
                      value={vendorForm.washroomType || ""}
                      onValueChange={(v) =>
                        setVendorForm({ ...vendorForm, washroomType: v })
                      }
                    >
                      <SelectTrigger className="h-8.5 bg-white border-slate-200">
                        <SelectValue placeholder="Select Washroom Type" />
                      </SelectTrigger>
                      <SelectContent className="text-xs bg-white">
                        <SelectItem value="Attached Western Toilet">
                          Attached Western Toilet
                        </SelectItem>
                        <SelectItem value="Common Sanitary Block">
                          Common Sanitary Block
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Tent Occupancy
                    </label>
                    <Input
                      value={vendorForm.tentCapacity || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          tentCapacity: e.target.value,
                        })
                      }
                      placeholder="e.g. Twin / Triple Sharing"
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Base Tariff / Tent (₹)
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.dailyTariff || ""}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          dailyTariff: e.target.value,
                        })
                      }
                      placeholder="e.g. 1800"
                      className="h-8.5 bg-white font-bold text-pink-700"
                    />
                  </div>
                </div>
              )}

              {/* OTHER VENDORS PARAMETERS */}
              {vendorForm.type === "OTHER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-100/60 p-3.5 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Service Category Description
                    </label>
                    <Input
                      value={
                        vendorForm.customCategory ||
                        "Equipment Rental / Porter Service"
                      }
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          customCategory: e.target.value,
                        })
                      }
                      className="h-8.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                      Custom Tariff Rate (₹)
                    </label>
                    <Input
                      type="number"
                      value={vendorForm.dailyTariff || "1000"}
                      onChange={(e) =>
                        setVendorForm({
                          ...vendorForm,
                          dailyTariff: e.target.value,
                        })
                      }
                      className="h-8.5 bg-white font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-3 border-slate-100">
            <Button
              variant="outline"
              onClick={() => setVendorModalOpen(false)}
              className="rounded h-8.5 cursor-pointer text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSaveVendor()}
              className="bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded h-8.5 px-4 cursor-pointer text-xs font-bold"
            >
              Save {vendorForm.type} Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Form Modal */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-md p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800">
              Add Rate Agreement for {selectedVendor?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Conditional form fields based on selected vendor type */}
          {selectedVendor?.type === "HOTEL" && (
            <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold text-slate-650">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Room Category *
                </label>
                <Input
                  value={roomRateForm.roomCategory}
                  onChange={(e) =>
                    setRoomRateForm({
                      ...roomRateForm,
                      roomCategory: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Sharing Option *
                </label>
                <Select
                  value={roomRateForm.sharingType}
                  onValueChange={(v) =>
                    setRoomRateForm({ ...roomRateForm, sharingType: v })
                  }
                >
                  <SelectTrigger className="h-8.5 border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="DOUBLE">DOUBLE</SelectItem>
                    <SelectItem value="TRIPLE">TRIPLE</SelectItem>
                    <SelectItem value="QUAD">QUAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Standard Occupancy *
                </label>
                <Input
                  type="number"
                  value={roomRateForm.standardOccupancy}
                  onChange={(e) =>
                    setRoomRateForm({
                      ...roomRateForm,
                      standardOccupancy: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Maximum Occupancy *
                </label>
                <Input
                  type="number"
                  value={roomRateForm.maximumOccupancy}
                  onChange={(e) =>
                    setRoomRateForm({
                      ...roomRateForm,
                      maximumOccupancy: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Rate (INR) *
                </label>
                <Input
                  type="number"
                  value={roomRateForm.amount}
                  onChange={(e) =>
                    setRoomRateForm({ ...roomRateForm, amount: e.target.value })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Meal Plan *
                </label>
                <Select
                  value={roomRateForm.mealPlan}
                  onValueChange={(v) =>
                    setRoomRateForm({ ...roomRateForm, mealPlan: v })
                  }
                >
                  <SelectTrigger className="h-8.5 border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="EP">EP</SelectItem>
                    <SelectItem value="CP">CP</SelectItem>
                    <SelectItem value="MAP">MAP</SelectItem>
                    <SelectItem value="AP">AP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {selectedVendor?.type === "TRANSPORT" && (
            <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold text-slate-650">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Route Name *
                </label>
                <Input
                  value={transportRateForm.routeName}
                  placeholder="e.g. Chandigarh-Shimla-Kaza"
                  onChange={(e) =>
                    setTransportRateForm({
                      ...transportRateForm,
                      routeName: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Vehicle Type *
                </label>
                <Input
                  value={transportRateForm.vehicleType}
                  onChange={(e) =>
                    setTransportRateForm({
                      ...transportRateForm,
                      vehicleType: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Seat Capacity *
                </label>
                <Input
                  type="number"
                  value={transportRateForm.seatCapacity}
                  onChange={(e) =>
                    setTransportRateForm({
                      ...transportRateForm,
                      seatCapacity: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Package Amount *
                </label>
                <Input
                  type="number"
                  value={transportRateForm.amount}
                  onChange={(e) =>
                    setTransportRateForm({
                      ...transportRateForm,
                      amount: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setRateModalOpen(false)}
              className="rounded h-8.5 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRate}
              className="bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded h-8.5 px-4 cursor-pointer"
            >
              Register Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-md p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800">
              Log Vendor Payment Payout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 text-xs font-semibold text-slate-650">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-555 uppercase">
                Vendor *
              </label>
              <Select
                value={paymentForm.vendorId}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, vendorId: v })
                }
              >
                <SelectTrigger className="h-8.5 border-slate-200 bg-white">
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent className="text-xs bg-white font-semibold">
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-555 uppercase">
                Invoice Amount (INR) *
              </label>
              <Input
                type="number"
                value={paymentForm.invoiceAmount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    invoiceAmount: e.target.value,
                  })
                }
                className="h-8.5 bg-white border-slate-200 text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-555 uppercase">
                Advance Paid (INR)
              </label>
              <Input
                type="number"
                value={paymentForm.advanceAmount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    advanceAmount: e.target.value,
                  })
                }
                className="h-8.5 bg-white border-slate-200 text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-555 uppercase">
                Balance Paid Amount (INR)
              </label>
              <Input
                type="number"
                value={paymentForm.paidAmount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, paidAmount: e.target.value })
                }
                className="h-8.5 bg-white border-slate-200 text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-555 uppercase">
                Due Date
              </label>
              <Input
                type="date"
                value={paymentForm.dueDate}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, dueDate: e.target.value })
                }
                className="h-8.5 bg-white border-slate-200 text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-555 uppercase">
                Payment Mode
              </label>
              <Select
                value={paymentForm.paymentMode}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, paymentMode: v })
                }
              >
                <SelectTrigger className="h-8.5 border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs bg-white font-semibold">
                  <SelectItem value="BANK_TRANSFER">BANK TRANSFER</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setPaymentModalOpen(false)}
              className="rounded h-8.5 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePayment}
              className="bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded h-8.5 px-4 cursor-pointer"
            >
              Log Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

