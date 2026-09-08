import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  Calendar,
  FileText,
  Image,
  CreditCard,
  History,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Bed,
  Users,
  Plus,
  Tag,
  AlertTriangle,
  TrendingUp,
  Pencil,
  Trash2,
  Bus,
  Car,
  Truck,
  Compass,
  Utensils,
  Activity,
  Navigation,
  Check,
  Info,
  Hotel,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/services/api";
import { tripsService } from "@/services/trips.service";
import { getDisplayVendorCode } from "@/utils/vendorUtils";

const RoutePricingTab = React.lazy(() =>
  import("./RoutePricingTab").then((m) => ({ default: m.RoutePricingTab }))
);

interface AccommodationDetailPageProps {
  vendor: any;
  onBack: () => void;
  onUpdateVendor: (updated: any) => void;
}

const TABS = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: Phone },
  { id: "rooms", label: "Rooms", icon: Bed },
  { id: "seasonal_pricing", label: "Seasonal Pricing", icon: Calendar },
  { id: "ledger", label: "Payment Ledger", icon: CreditCard },
  { id: "price_history", label: "Price History", icon: TrendingUp },
  { id: "timeline", label: "Activity Timeline", icon: History },
];

const FOOD_MENU_FIELDS = [
  {
    includedKey: "breakfastIncluded" as const,
    menuKey: "breakfastMenu" as const,
    label: "Breakfast",
    optional: false,
    placeholder: "Tea, coffee\nPoha / paratha\nFruit, omelette",
  },
  {
    includedKey: "lunchIncluded" as const,
    menuKey: "lunchMenu" as const,
    label: "Lunch",
    optional: false,
    placeholder: "Dal, rice, seasonal sabzi\nRoti, salad, buttermilk",
  },
  {
    includedKey: "dinnerIncluded" as const,
    menuKey: "dinnerMenu" as const,
    label: "Dinner",
    optional: false,
    placeholder: "Dal fry, jeera rice, roti\nSabzi, sweet",
  },
  {
    includedKey: "snacksIncluded" as const,
    menuKey: "snacksMenu" as const,
    label: "Snacks",
    optional: true,
    placeholder: "Evening tea, pakora, biscuits…",
  },
];

function MealInclusionEditor({
  form,
  onChange,
  tall,
}: {
  form: any;
  onChange: (next: any) => void;
  tall?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
          Included meals
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FOOD_MENU_FIELDS.map((field) => {
            const on = !!form[field.includedKey];
            return (
              <button
                key={field.includedKey}
                type="button"
                onClick={() => onChange({ ...form, [field.includedKey]: !on })}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[11px] font-bold border transition-colors",
                  on
                    ? "bg-[#FF4D00] text-white border-[#FF4D00]"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
                )}
              >
                {field.label}
                {field.optional ? " (optional)" : ""}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          Turn on only meals this property actually serves. Meal plan codes like AP stay separate; ops can still mark breakfast included or not.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FOOD_MENU_FIELDS.map((field) => {
          const on = !!form[field.includedKey];
          return (
            <div key={field.menuKey} className={cn(!on && "opacity-70")}>
              <label className="font-extrabold text-slate-700 block mb-1">{field.label}</label>
              {on ? (
                <Textarea
                  value={form[field.menuKey] ?? ""}
                  onChange={(e) => onChange({ ...form, [field.menuKey]: e.target.value })}
                  placeholder={field.placeholder}
                  className={cn(
                    "bg-white text-xs border-slate-200 font-medium",
                    tall ? "min-h-[120px]" : "min-h-[88px]",
                  )}
                />
              ) : (
                <p className="text-[11px] text-slate-500 bg-white border border-dashed border-slate-200 rounded-md px-3 py-2.5">
                  Not included. Turn on {field.label.toLowerCase()} above to add dishes.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AccommodationDetailPage({
  vendor: initialVendor,
  onBack,
  onUpdateVendor,
}: AccommodationDetailPageProps) {
  const [vendor, setVendor] = useState<any>(initialVendor);
  const typeUpper = (vendor.type || vendor.accommodationType || vendor.category || "").toUpperCase();
  const isTransport =
    typeUpper.includes("TRANSPORT") ||
    typeUpper.includes("FLEET") ||
    typeUpper.includes("VEHICLE");
  const isGuide =
    typeUpper.includes("GUIDE") ||
    typeUpper.includes("LEADER") ||
    typeUpper.includes("TREK");
  const isActivity =
    typeUpper.includes("ACTIVITIES") ||
    typeUpper.includes("ACTIVITY") ||
    typeUpper.includes("ADVENTURE");
  const isRestaurant =
    typeUpper.includes("RESTAURANT") ||
    typeUpper.includes("FOOD") ||
    typeUpper.includes("MEAL") ||
    typeUpper.includes("DINING");
  const isOther =
    typeUpper.includes("OTHER") ||
    typeUpper.includes("MISC") ||
    typeUpper.includes("EQUIPMENT") ||
    typeUpper.includes("GEAR") ||
    typeUpper.includes("PERMIT") ||
    typeUpper === "GENERAL";

  const dynamicTabs = useMemo(() => {
    if (isTransport) {
      return [
        { id: "overview", label: "Overview", icon: Bus },
        { id: "contacts", label: "Contacts", icon: Phone },
        { id: "vehicles", label: "Vehicles & Route Pricing", icon: Car },
        { id: "ledger", label: "Payment Ledger", icon: CreditCard },
        { id: "timeline", label: "Activity Timeline", icon: History },
      ];
    }
    if (isGuide) {
      return [
        { id: "overview", label: "Overview", icon: Compass },
        { id: "contacts", label: "Contacts", icon: Phone },
        { id: "rates_allowance", label: "Rates & Allowance", icon: DollarSign },
        { id: "ledger", label: "Payment Ledger", icon: CreditCard },
        { id: "timeline", label: "Activity Timeline", icon: History },
      ];
    }
    if (isActivity) {
      return [
        { id: "overview", label: "Overview", icon: Activity },
        { id: "contacts", label: "Contacts", icon: Phone },
        { id: "rates_allowance", label: "Rates & Allowance", icon: DollarSign },
        { id: "ledger", label: "Payment Ledger", icon: CreditCard },
        { id: "timeline", label: "Activity Timeline", icon: History },
      ];
    }
    if (isRestaurant) {
      return [
        { id: "overview", label: "Overview", icon: Utensils },
        { id: "contacts", label: "Contacts", icon: Phone },
        { id: "food_menu", label: "Food Menu", icon: Utensils },
        {
          id: "meal_tariffs",
          label: "Meal Tariffs & Thali Rates",
          icon: DollarSign,
        },
        { id: "ledger", label: "Payment Ledger", icon: CreditCard },
        { id: "timeline", label: "Activity Timeline", icon: History },
      ];
    }
    if (isOther) {
      return [
        { id: "overview", label: "Overview", icon: Building2 },
        { id: "contacts", label: "Contacts", icon: Phone },
        {
          id: "services_tariffs",
          label: "Services & Tariffs",
          icon: DollarSign,
        },
        { id: "ledger", label: "Payment Ledger", icon: CreditCard },
        { id: "timeline", label: "Activity Timeline", icon: History },
      ];
    }
    return [
      { id: "overview", label: "Overview", icon: Hotel },
      { id: "contacts", label: "Contacts", icon: Phone },
      { id: "rooms", label: "Rooms", icon: Bed },
      { id: "food_menu", label: "Food Menu", icon: Utensils },
      { id: "seasonal_pricing", label: "Seasonal Pricing", icon: Calendar },
      { id: "ledger", label: "Payment Ledger", icon: CreditCard },
      { id: "price_history", label: "Price History", icon: TrendingUp },
      { id: "timeline", label: "Activity Timeline", icon: History },
    ];
  }, [isTransport, isGuide, isActivity, isRestaurant, isOther]);

  const [activeTab, setActiveTab] = useState("overview");

  // Overview State Extractor
  const extractOverviewState = useCallback((v: any) => {
    let meta: any = {};
    if (v?.notes && typeof v.notes === "string" && v.notes.startsWith("{")) {
      try {
        meta = JSON.parse(v.notes);
      } catch {}
    }

    const type = (v?.type || v?.accommodationType || v?.category || "").toUpperCase();
    const isTrans = type.includes("TRANSPORT") || type.includes("FLEET") || type.includes("VEHICLE");
    const isG = type.includes("GUIDE") || type.includes("LEADER") || type.includes("TREK");
    const isRest = type.includes("RESTAURANT") || type.includes("FOOD") || type.includes("MEAL") || type.includes("DINING");
    const isAct = type.includes("ACTIVITIES") || type.includes("ACTIVITY") || type.includes("ADVENTURE") || type.includes("EXPERIENCE");
    const isOth = type.includes("OTHER") || type.includes("MISC") || type.includes("EQUIPMENT") || type.includes("GEAR") || type.includes("PERMIT") || type === "GENERAL";

    const rawMenu = Array.isArray(v?.foodMenu)
      ? v.foodMenu
      : Array.isArray(meta.foodMenu)
        ? meta.foodMenu
        : meta.foodMenu && typeof meta.foodMenu === "object"
          ? meta.foodMenu
          : v?.foodMenu && typeof v.foodMenu === "object"
            ? v.foodMenu
            : [];
    const menuItems = Array.isArray(rawMenu)
      ? rawMenu
      : ["breakfast", "lunch", "dinner", "snacks"]
          .filter((k) => String((rawMenu as any)?.[k] || "").trim())
          .map((k) => ({
            type: k.toUpperCase(),
            name: k,
            inclusions: String((rawMenu as any)[k]).trim(),
          }));
    const looksLikeDishes = (text: string) => {
      const s = String(text || "").trim();
      if (s.length < 3) return "";
      if (/\b(bash|sudo|npm|npx|git|deploy_vps)\b|\.sh\b/i.test(s)) return "";
      if (/^(breakfast|lunch|dinner|snacks?|breakfastmenu|lunchmenu|dinnermenu)$/i.test(s.replace(/[\s_-]+/g, ""))) {
        return "";
      }
      return s;
    };
    const mealFromMenu = (needle: string) => {
      const row = menuItems.find((item: any) =>
        String(item?.type || item?.mealType || item?.name || "")
          .toUpperCase()
          .includes(needle),
      );
      return looksLikeDishes(String(row?.inclusions || row?.menuDescription || row?.dishes || ""));
    };

    return {
      name: v?.name || "",
      accommodationType: v?.accommodationType || v?.type || (isOth ? "OTHER" : "HOTEL"),
      starRating: v?.starRating || 3,
      checkInTime: v?.checkInTime || "12:00 PM",
      checkOutTime: v?.checkOutTime || "11:00 AM",
      mealPlans: v?.mealPlans || "EP, CP, MAP, AP",
      amenities: v?.amenities !== undefined && v?.amenities !== null ? v.amenities : meta.amenities || "",
      fleetTypes: v?.fleetTypes || meta.fleetTypes || (isTrans ? v?.roomTypes : "") || "",
      operatingCity: v?.operatingCity || meta.operatingCity || v?.city || v?.location || "",
      tollParkingPolicy: v?.tollParkingPolicy || meta.tollParkingPolicy || (isTrans ? v?.lateCheckOutPolicy : "") || "Included in base tariff",
      routesCovered: v?.routesCovered || meta.routesCovered || (v?.notes && !v.notes.startsWith("{") ? v.notes : "") || "",
      gstin: v?.gstin || "",
      panNumber: v?.panNumber || "",
      bankName: v?.bankName || "",
      accountNumber: v?.accountNumber || "",
      ifscCode: v?.ifscCode || "",
      upiId: v?.upiId || "",
      paymentTerms: v?.paymentTerms || "30 Days Credit",
      creditDays: v?.creditDays !== undefined ? v.creditDays : 30,
      guideRole: v?.guideRole || meta.guideRole || (isG ? v?.website : "") || "",
      languages: v?.languages || meta.languages || (isG ? v?.sharingTypes : "") || "",
      certifications: v?.certifications || meta.certifications || (isG ? v?.earlyCheckInPolicy : "") || "",
      experience: v?.experience || meta.experience || (isG ? v?.lateCheckOutPolicy : "") || "",
      cuisines: v?.cuisines || meta.cuisines || (isRest ? v?.sharingTypes : "") || "",
      seatingCapacity: v?.seatingCapacity || meta.seatingCapacity || (isRest ? v?.roomTypes : "") || "",
      operatingHours: v?.operatingHours || meta.operatingHours || (isRest || isAct ? v?.earlyCheckInPolicy : "") || "",
      activityTypes: v?.activityTypes || meta.activityTypes || (isAct ? v?.roomTypes : "") || "",
      servicesOffered:
        v?.servicesOffered ||
        meta.servicesOffered ||
        (isOth ? v?.roomTypes || v?.customCategory || "Equipment Rental & Logistics" : "") ||
        "",
      description:
        v?.description ||
        meta.description ||
        (v?.notes && !v.notes.startsWith("{") ? v.notes : "") ||
        "",
      breakfastMenu: mealFromMenu("BREAK"),
      lunchMenu: mealFromMenu("LUNCH"),
      dinnerMenu: mealFromMenu("DINNER"),
      snacksMenu: mealFromMenu("SNACK") || mealFromMenu("TEA"),
      breakfastIncluded:
        typeof (v?.foodMenuIncluded || meta.foodMenuIncluded)?.breakfast === "boolean"
          ? !!(v?.foodMenuIncluded || meta.foodMenuIncluded).breakfast
          : true,
      lunchIncluded:
        typeof (v?.foodMenuIncluded || meta.foodMenuIncluded)?.lunch === "boolean"
          ? !!(v?.foodMenuIncluded || meta.foodMenuIncluded).lunch
          : true,
      dinnerIncluded:
        typeof (v?.foodMenuIncluded || meta.foodMenuIncluded)?.dinner === "boolean"
          ? !!(v?.foodMenuIncluded || meta.foodMenuIncluded).dinner
          : true,
      snacksIncluded:
        typeof (v?.foodMenuIncluded || meta.foodMenuIncluded)?.snacks === "boolean"
          ? !!(v?.foodMenuIncluded || meta.foodMenuIncluded).snacks
          : Boolean(mealFromMenu("SNACK") || mealFromMenu("TEA")),
      financialDetails:
        v?.financialDetails ||
        v?.bankDetails ||
        (v?.gstin || v?.bankName
          ? `GSTIN: ${v?.gstin || ""}\nPAN: ${v?.panNumber || ""}\nBank: ${v?.bankName || ""}\nA/C: ${v?.accountNumber || ""}\nIFSC: ${v?.ifscCode || ""}\nPayment Terms: ${v?.paymentTerms || ""}`.trim()
          : ""),
    };
  }, []);

  // Overview Editing State
  const [editOverviewOpen, setEditOverviewOpen] = useState(false);
  const [overviewForm, setOverviewForm] = useState(() => extractOverviewState(vendor));

  // State for Transport Vehicles & Routes
  const [transportVehicles, setTransportVehicles] = useState<any[]>([]);
  const vendorId = initialVendor?.id;
  const hasLoadedRef = useRef<string | null>(null);

  const loadVendorVehicles = useCallback(async () => {
    if (!vendorId || !isTransport) return;
    try {
      const res = await api.get(`/vendors/directory/${vendorId}/vehicles`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTransportVehicles(
          res.data.data.map((v: any) => ({
            id: v.id,
            model: v.vehicleName,
            capacity: v.advertisedCapacity,
            sellableSeats: v.sellableSeats,
            acType: v.hasAC ? "AC" : "Non-AC",
            plateNumber: v.plateNumber || "PB-08",
            status: v.isActive ? "Active" : "Inactive",
          }))
        );
      }
    } catch (e) {}
  }, [vendorId, isTransport]);

  useEffect(() => {
    if (!vendorId) return;
    if (hasLoadedRef.current === vendorId) return;
    hasLoadedRef.current = vendorId;

    let isMounted = true;
    setVendor(initialVendor);

    if (isTransport) {
      loadVendorVehicles();
    }

    // 1. Sync guide & activity rates from prop
    if (initialVendor.guideRates || initialVendor.activityRates) {
      try {
        const raw = initialVendor.activityRates || initialVendor.guideRates;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGuideRates(parsed);
          setActivityRates(parsed);
        }
      } catch (e) {}
    }

    // 2. Sync meal tariffs from prop
    if (initialVendor.mealPlans || initialVendor.mealTariffs) {
      try {
        const raw = initialVendor.mealTariffs || initialVendor.mealPlans;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) setMealTariffs(parsed);
      } catch (e) {}
    }

    // 3. Sync contacts from prop
    setContacts(deriveContactsFromVendor(initialVendor));

    // 4. Sync overviewForm from prop
    setOverviewForm(extractOverviewState(initialVendor));

    // 5. Fetch latest live vendor record from server ONCE per vendorId
    api
      .get(`/vendors/directory/${vendorId}`)
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.data) {
          const fresh = res.data.data;
          setVendor(fresh);
          if (fresh.guideRates || fresh.activityRates) {
            try {
              const raw = fresh.activityRates || fresh.guideRates;
              const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed) && parsed.length > 0) {
                setGuideRates(parsed);
                setActivityRates(parsed);
              }
            } catch (e) {}
          }
          if (fresh.mealPlans || fresh.mealTariffs) {
            try {
              const raw = fresh.mealTariffs || fresh.mealPlans;
              const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed) && parsed.length > 0)
                setMealTariffs(parsed);
            } catch (e) {}
          }
          setContacts(deriveContactsFromVendor(fresh));
          setOverviewForm(extractOverviewState(fresh));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch live vendor details:", err);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const [transportRoutes, setTransportRoutes] = useState<any[]>(() => {
    if (vendor.transportRates && vendor.transportRates.length > 0) {
      return vendor.transportRates.map((tr: any, idx: number) => ({
        id: tr.id || `r-${idx}`,
        routeName:
          tr.routeName ||
          `${tr.pickupLocation || "Kotkapura"} → ${tr.dropLocation || "Kotkapura"}`,
        vehicleType: tr.vehicleType || "17 Seater",
        totalAmount: Number(tr.totalVehicleCost || 44000),
        notes: tr.notes || "",
      }));
    }
    return [
      { id: "r1", routeName: "Kotkapura → Kotkapura", vehicleType: "20 Seater Tempo", totalAmount: 48000, notes: "Kotkapura pickup & drop extra: ₹2,000" },
      { id: "r2", routeName: "Kotkapura → Kotkapura", vehicleType: "17 Seater Tempo", totalAmount: 44000, notes: "Kotkapura pickup & drop extra: ₹2,000" },
      { id: "r3", routeName: "Kotkapura → Kotkapura", vehicleType: "14 Seater Tempo", totalAmount: 38000, notes: "Kotkapura pickup & drop extra: ₹2,000" },
      { id: "r4", routeName: "Kotkapura → Kotkapura", vehicleType: "Innova", totalAmount: 28000, notes: "" },
      { id: "r5", routeName: "Kotkapura → Kotkapura", vehicleType: "Ertiga", totalAmount: 28000, notes: "" },
      { id: "r6", routeName: "Kotkapura → Kotkapura", vehicleType: "Swift Dzire", totalAmount: 17500, notes: "" },
      { id: "r7", routeName: "Jalandhar → Jalandhar", vehicleType: "20 Seater Tempo", totalAmount: 45000, notes: "" },
      { id: "r8", routeName: "Jalandhar → Jalandhar", vehicleType: "17 Seater Tempo", totalAmount: 42000, notes: "" },
      { id: "r9", routeName: "Jalandhar → Jalandhar", vehicleType: "14 Seater Tempo", totalAmount: 38000, notes: "" },
      { id: "r10", routeName: "Jalandhar → Jalandhar", vehicleType: "Innova", totalAmount: 28000, notes: "" },
      { id: "r11", routeName: "Jalandhar → Jalandhar", vehicleType: "Ertiga", totalAmount: 28000, notes: "" },
    ];
  });

  // State for Transport Vehicles & Routes
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState({
    model: "Tempo Traveller (17 Seater)",
    capacity: "17",
    sellableSeats: "16",
    acType: "AC",
    plateNumber: "PB-08-TR-1702",
    status: "Active",
  });

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [routeForm, setRouteForm] = useState({
    routeName: "Kotkapura → Kotkapura",
    vehicleType: "17 Seater Tempo",
    totalAmount: "44000",
    notes: "",
  });

  // State for Tour Guide Daily Rates
  const [guideRates, setGuideRates] = useState<any[]>(() => {
    let initial = vendor.guideRates;
    if (typeof initial === "string") {
      try {
        initial = JSON.parse(initial);
      } catch {
        initial = null;
      }
    }
    if (Array.isArray(initial) && initial.length > 0) {
      return initial;
    }
    return [
      {
        id: "gr1",
        roleName: "Lead Trek Leader",
        badgeText: "Primary Role",
        perDayFee: 2500,
      },
      {
        id: "gr2",
        roleName: "Local Cultural Guide",
        badgeText: "City / Sightseeing",
        perDayFee: 1500,
      },
    ];
  });
  const [guideRateModalOpen, setGuideRateModalOpen] = useState(false);
  const [editingGuideRate, setEditingGuideRate] = useState<any>(null);
  const [guideRateForm, setGuideRateForm] = useState({
    roleName: "Lead Trek Leader",
    badgeText: "Primary Role",
    perDayFee: "2500",
  });

  const handleSaveGuideRate = async () => {
    if (!guideRateForm.roleName || !guideRateForm.perDayFee) {
      toast.error("Role Name and Per Day Fee are required");
      return;
    }
    const perDay = parseInt(guideRateForm.perDayFee) || 0;

    let updatedList: any[] = [];
    if (editingGuideRate) {
      updatedList = guideRates.map((gr) =>
        gr.id === editingGuideRate.id
          ? {
              ...gr,
              roleName: guideRateForm.roleName,
              badgeText: guideRateForm.badgeText,
              perDayFee: perDay,
            }
          : gr,
      );
    } else {
      const newGr = {
        id: `gr-${Date.now()}`,
        roleName: guideRateForm.roleName,
        badgeText: guideRateForm.badgeText || "Role",
        perDayFee: perDay,
      };
      updatedList = [...guideRates, newGr];
    }

    setGuideRates(updatedList);
    const updatedVendor = { ...vendor, guideRates: updatedList };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        guideRates: updatedList,
      });
      toast.success("Guide rate configuration saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Saved locally, but failed to update server");
    }

    setGuideRateModalOpen(false);
    setEditingGuideRate(null);
  };

  const handleDeleteGuideRate = async (id: string) => {
    const updatedList = guideRates.filter((gr) => gr.id !== id);
    setGuideRates(updatedList);
    const updatedVendor = { ...vendor, guideRates: updatedList };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        guideRates: updatedList,
      });
      toast.success("Guide rate deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete from server");
    }
  };

  // State for Meal Tariffs & Thali Rates (Restaurants / Cafes)
  const defaultMealTariffs = [
    {
      id: "mt-1",
      name: "Group Breakfast Buffet / Thali",
      type: "BREAKFAST",
      perPaxRate: 150,
      inclusions: "Tea, Paratha, Puri Bhaji, Omelette",
      isVeg: true,
    },
    {
      id: "mt-2",
      name: "Group Lunch Buffet (Veg)",
      type: "LUNCH",
      perPaxRate: 250,
      inclusions: "Paneer, Dal, Rice, Roti, Salad, Sweet",
      isVeg: true,
    },
    {
      id: "mt-3",
      name: "Group Dinner Buffet (Veg + Non-Veg)",
      type: "DINNER",
      perPaxRate: 350,
      inclusions: "Chicken Curry / Paneer, Dal Fry, Jeera Rice, Gulab Jamun",
      isVeg: false,
    },
  ];

  const [mealTariffs, setMealTariffs] = useState<any[]>(() => {
    let initial = vendor?.mealTariffs;
    if (!initial && vendor?.mealPlans) {
      try {
        const parsed = JSON.parse(vendor.mealPlans);
        if (Array.isArray(parsed) && parsed.length > 0) initial = parsed;
      } catch {}
    }
    if (Array.isArray(initial) && initial.length > 0) {
      return initial;
    }
    return defaultMealTariffs;
  });

  const [mealTariffModalOpen, setMealTariffModalOpen] = useState(false);
  const [editingMealTariff, setEditingMealTariff] = useState<any>(null);
  const [mealTariffForm, setMealTariffForm] = useState({
    name: "Group Breakfast Buffet / Thali",
    type: "BREAKFAST",
    perPaxRate: "150",
    inclusions: "Tea, Paratha, Puri Bhaji, Omelette",
    isVeg: true,
  });

  const handleOpenAddMealTariff = () => {
    setEditingMealTariff(null);
    setMealTariffForm({
      name: "",
      type: "BREAKFAST",
      perPaxRate: "200",
      inclusions: "",
      isVeg: true,
    });
    setMealTariffModalOpen(true);
  };

  const handleOpenEditMealTariff = (tariff: any) => {
    setEditingMealTariff(tariff);
    setMealTariffForm({
      name: tariff.name || "",
      type: tariff.type || "BREAKFAST",
      perPaxRate: String(tariff.perPaxRate || 150),
      inclusions: tariff.inclusions || "",
      isVeg: tariff.isVeg !== false,
    });
    setMealTariffModalOpen(true);
  };

  const handleSaveMealTariff = async () => {
    if (!mealTariffForm.name || !mealTariffForm.perPaxRate) {
      toast.error("Package Name and Per Pax Rate are required");
      return;
    }
    const perPax = parseInt(mealTariffForm.perPaxRate) || 0;

    let updatedList: any[] = [];
    if (editingMealTariff) {
      updatedList = mealTariffs.map((t) =>
        t.id === editingMealTariff.id
          ? {
              ...t,
              name: mealTariffForm.name,
              type: mealTariffForm.type,
              perPaxRate: perPax,
              inclusions: mealTariffForm.inclusions,
              isVeg: mealTariffForm.isVeg,
            }
          : t,
      );
    } else {
      const newTariff = {
        id: `mt-${Date.now()}`,
        name: mealTariffForm.name,
        type: mealTariffForm.type,
        perPaxRate: perPax,
        inclusions: mealTariffForm.inclusions,
        isVeg: mealTariffForm.isVeg,
      };
      updatedList = [...mealTariffs, newTariff];
    }

    setMealTariffs(updatedList);
    const updatedVendor = {
      ...vendor,
      mealTariffs: updatedList,
      mealPlans: JSON.stringify(updatedList),
    };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        mealTariffs: updatedList,
        mealPlans: JSON.stringify(updatedList),
      });
      toast.success("Meal tariff saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Saved locally, but failed to update server");
    }

    setMealTariffModalOpen(false);
    setEditingMealTariff(null);
  };

  const handleDeleteMealTariff = async (tariffId: string) => {
    const updatedList = mealTariffs.filter((t) => t.id !== tariffId);
    setMealTariffs(updatedList);
    const updatedVendor = {
      ...vendor,
      mealTariffs: updatedList,
      mealPlans: JSON.stringify(updatedList),
    };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        mealTariffs: updatedList,
        mealPlans: JSON.stringify(updatedList),
      });
      toast.success("Meal tariff deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete from server");
    }
  };

  // State for Activity Rates & Tariffs (Adventure / Activities)
  const defaultActivityRates = [
    {
      id: "act-1",
      name: "Tandem Paragliding High Fly",
      category: "PARAGLIDING",
      perPaxRate: 2500,
      inclusions: "Includes GoPro 4K Video Recording & Pilot Fee",
    },
    {
      id: "act-2",
      name: "12 KM White Water River Rafting",
      category: "RAFTING",
      perPaxRate: 1200,
      inclusions: "Includes Safety Gear, Lifejacket & Helmet",
    },
  ];

  const [activityRates, setActivityRates] = useState<any[]>(() => {
    let initial = vendor?.activityRates || vendor?.guideRates;
    if (typeof initial === "string") {
      try {
        const parsed = JSON.parse(initial);
        if (Array.isArray(parsed) && parsed.length > 0) initial = parsed;
      } catch {}
    }
    if (Array.isArray(initial) && initial.length > 0) {
      return initial;
    }
    return defaultActivityRates;
  });

  const [activityRateModalOpen, setActivityRateModalOpen] = useState(false);
  const [editingActivityRate, setEditingActivityRate] = useState<any>(null);
  const [activityRateForm, setActivityRateForm] = useState({
    name: "Tandem Paragliding High Fly",
    category: "PARAGLIDING",
    perPaxRate: "2500",
    inclusions: "Includes GoPro 4K Video Recording & Pilot Fee",
  });

  const handleOpenAddActivityRate = () => {
    setEditingActivityRate(null);
    setActivityRateForm({
      name: "",
      category: "PARAGLIDING",
      perPaxRate: "1500",
      inclusions: "",
    });
    setActivityRateModalOpen(true);
  };

  const handleOpenEditActivityRate = (rate: any) => {
    setEditingActivityRate(rate);
    setActivityRateForm({
      name: rate.name || "",
      category: rate.category || "PARAGLIDING",
      perPaxRate: String(rate.perPaxRate || 1500),
      inclusions: rate.inclusions || "",
    });
    setActivityRateModalOpen(true);
  };

  const handleSaveActivityRate = async () => {
    if (!activityRateForm.name || !activityRateForm.perPaxRate) {
      toast.error("Activity Name and Per Pax Rate are required");
      return;
    }
    const perPax = parseInt(activityRateForm.perPaxRate) || 0;

    let updatedList: any[] = [];
    if (editingActivityRate) {
      updatedList = activityRates.map((t) =>
        t.id === editingActivityRate.id
          ? {
              ...t,
              name: activityRateForm.name,
              category: activityRateForm.category,
              perPaxRate: perPax,
              inclusions: activityRateForm.inclusions,
            }
          : t,
      );
    } else {
      const newRate = {
        id: `act-${Date.now()}`,
        name: activityRateForm.name,
        category: activityRateForm.category,
        perPaxRate: perPax,
        inclusions: activityRateForm.inclusions,
      };
      updatedList = [...activityRates, newRate];
    }

    setActivityRates(updatedList);
    const updatedVendor = {
      ...vendor,
      activityRates: updatedList,
      guideRates: JSON.stringify(updatedList),
    };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        activityRates: updatedList,
        guideRates: JSON.stringify(updatedList),
      });
      toast.success("Activity rate saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Saved locally, but failed to update server");
    }

    setActivityRateModalOpen(false);
    setEditingActivityRate(null);
  };

  const handleDeleteActivityRate = async (rateId: string) => {
    const updatedList = activityRates.filter((t) => t.id !== rateId);
    setActivityRates(updatedList);
    const updatedVendor = {
      ...vendor,
      activityRates: updatedList,
      guideRates: JSON.stringify(updatedList),
    };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        activityRates: updatedList,
        guideRates: JSON.stringify(updatedList),
      });
      toast.success("Activity rate deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete from server");
    }
  };

  // State for Other Vendor Services & Equipment Tariffs
  const defaultOtherRates = [
    {
      id: "oth-1",
      name: "Tents & Sleeping Bag Rental",
      category: "EQUIPMENT",
      rate: 350,
      unit: "Per Set / Day",
      notes: "Includes 2-person waterproof dome tent and sub-zero sleeping bag",
    },
    {
      id: "oth-2",
      name: "Local Forest & Wildlife Permit Clearance",
      category: "PERMITS",
      rate: 200,
      unit: "Per Person",
      notes: "Forest checkpoint entry fee and local authority liaison",
    },
  ];

  const [otherRates, setOtherRates] = useState<any[]>(() => {
    let initial =
      vendor?.otherRates || vendor?.activityRates || vendor?.guideRates;
    if (typeof initial === "string") {
      try {
        const parsed = JSON.parse(initial);
        if (Array.isArray(parsed) && parsed.length > 0) initial = parsed;
      } catch {}
    }
    if (Array.isArray(initial) && initial.length > 0) {
      return initial;
    }
    return defaultOtherRates;
  });

  const [otherRateModalOpen, setOtherRateModalOpen] = useState(false);
  const [editingOtherRate, setEditingOtherRate] = useState<any>(null);
  const [otherRateForm, setOtherRateForm] = useState({
    name: "Tents & Sleeping Bag Rental",
    category: "EQUIPMENT",
    rate: "350",
    unit: "Per Set / Day",
    notes: "",
  });

  const handleOpenAddOtherRate = () => {
    setEditingOtherRate(null);
    setOtherRateForm({
      name: "",
      category: "EQUIPMENT",
      rate: "500",
      unit: "Per Unit / Day",
      notes: "",
    });
    setOtherRateModalOpen(true);
  };

  const handleOpenEditOtherRate = (rate: any) => {
    setEditingOtherRate(rate);
    setOtherRateForm({
      name: rate.name || "",
      category: rate.category || "EQUIPMENT",
      rate: String(rate.rate || rate.perPaxRate || 500),
      unit: rate.unit || "Per Unit / Day",
      notes: rate.notes || rate.inclusions || "",
    });
    setOtherRateModalOpen(true);
  };

  const handleSaveOtherRate = async () => {
    if (!otherRateForm.name || !otherRateForm.rate) {
      toast.error("Service Name and Rate are required");
      return;
    }
    const rateNum = parseInt(otherRateForm.rate) || 0;

    let updatedList: any[] = [];
    if (editingOtherRate) {
      updatedList = otherRates.map((t) =>
        t.id === editingOtherRate.id
          ? {
              ...t,
              name: otherRateForm.name,
              category: otherRateForm.category,
              rate: rateNum,
              unit: otherRateForm.unit,
              notes: otherRateForm.notes,
            }
          : t,
      );
    } else {
      const newRate = {
        id: `oth-${Date.now()}`,
        name: otherRateForm.name,
        category: otherRateForm.category,
        rate: rateNum,
        unit: otherRateForm.unit,
        notes: otherRateForm.notes,
      };
      updatedList = [...otherRates, newRate];
    }

    setOtherRates(updatedList);
    const updatedVendor = {
      ...vendor,
      otherRates: updatedList,
      activityRates: updatedList,
      guideRates: JSON.stringify(updatedList),
    };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        otherRates: updatedList,
        activityRates: updatedList,
        guideRates: JSON.stringify(updatedList),
      });
      toast.success("Service tariff saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Saved locally, but failed to update server");
    }

    setOtherRateModalOpen(false);
    setEditingOtherRate(null);
  };

  const handleDeleteOtherRate = async (rateId: string) => {
    const updatedList = otherRates.filter((t) => t.id !== rateId);
    setOtherRates(updatedList);
    const updatedVendor = {
      ...vendor,
      otherRates: updatedList,
      activityRates: updatedList,
      guideRates: JSON.stringify(updatedList),
    };
    setVendor(updatedVendor);
    onUpdateVendor(updatedVendor);

    try {
      await api.patch(`/vendors/directory/${vendor.id}`, {
        otherRates: updatedList,
        activityRates: updatedList,
        guideRates: JSON.stringify(updatedList),
      });
      toast.success("Service tariff deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete from server");
    }
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.model) {
      toast.error("Vehicle model is required");
      return;
    }
    const cap = parseInt(vehicleForm.capacity) || 17;
    const sellable = parseInt(vehicleForm.sellableSeats) || cap;

    try {
      if (editingVehicle && !editingVehicle.id.startsWith("v-")) {
        await api.patch(`/vendors/directory/vehicles/${editingVehicle.id}`, {
          vehicleName: vehicleForm.model,
          advertisedCapacity: cap,
          sellableSeats: sellable,
          hasAC: vehicleForm.acType === "AC",
          plateNumber: vehicleForm.plateNumber,
        });
        toast.success("Vehicle updated in master!");
      } else {
        await api.post(`/vendors/directory/${vendor.id}/vehicles`, {
          vehicleName: vehicleForm.model,
          advertisedCapacity: cap,
          sellableSeats: sellable,
          hasAC: vehicleForm.acType === "AC",
          plateNumber: vehicleForm.plateNumber,
        });
        toast.success("Vehicle added to master fleet!");
      }
      setVehicleModalOpen(false);
      loadVendorVehicles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save vehicle");
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      if (!id.startsWith("v-")) {
        await api.delete(`/vendors/directory/vehicles/${id}`);
      }
      toast.success("Vehicle removed from master fleet");
      loadVendorVehicles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove vehicle");
    }
  };

  const handleSaveRoute = async () => {
    if (!routeForm.routeName) {
      toast.error("Route name is required");
      return;
    }
    const tot = parseFloat(routeForm.totalAmount) || 0;

    try {
      await api
        .post("/vendors/transport-rates", {
          vendorId: vendor.id,
          tripCode: vendor.tripCode || "MKA-1",
          routeName: routeForm.routeName,
          pickupLocation:
            routeForm.routeName.split("→")[0]?.trim() || "Kotkapura",
          dropLocation:
            routeForm.routeName.split("→")[1]?.trim() || "Kotkapura",
          vehicleType: routeForm.vehicleType || "17 Seater Tempo",
          totalVehicleCost: tot,
          notes: routeForm.notes || "",
        })
        .catch(() => {});
    } catch (e) {}

    if (editingRoute) {
      setTransportRoutes(
        transportRoutes.map((r) =>
          r.id === editingRoute.id
            ? {
                ...r,
                routeName: routeForm.routeName,
                vehicleType: routeForm.vehicleType,
                totalAmount: tot,
                notes: routeForm.notes,
              }
            : r,
        ),
      );
      logActivity(
        "RATE_REVISION",
        `Updated route tariff: ${routeForm.routeName} (${routeForm.vehicleType}) to ₹${tot.toLocaleString("en-IN")}`,
      );
      toast.success("Route tariff updated successfully!");
    } else {
      const newR = {
        id: `r-${Date.now()}`,
        routeName: routeForm.routeName,
        vehicleType: routeForm.vehicleType,
        totalAmount: tot,
        notes: routeForm.notes,
      };
      setTransportRoutes([...transportRoutes, newR]);
      logActivity(
        "RATE_REVISION",
        `Added new route tariff: ${routeForm.routeName} (${routeForm.vehicleType}) for ₹${tot.toLocaleString("en-IN")}`,
      );
      toast.success("Route tariff added!");
    }
    setRouteModalOpen(false);
  };

  const handleDeleteRoute = (id: string) => {
    const rt = transportRoutes.find((r) => r.id === id);
    setTransportRoutes(transportRoutes.filter((r) => r.id !== id));
    logActivity(
      "RATE_REMOVED",
      `Removed route tariff: ${rt?.routeName || "Route"} (${rt?.vehicleType || "Vehicle"})`,
    );
    toast.success("Route tariff removed");
  };

  const deriveContactsFromVendor = (v: any) => {
    if (
      v?.vendorContacts &&
      Array.isArray(v.vendorContacts) &&
      v.vendorContacts.length > 0
    ) {
      return v.vendorContacts.map((c: any, idx: number) => ({
        id: c.id || `c-${idx}`,
        name: c.name || "Contact",
        role: c.role || (idx === 0 ? "General Manager" : "Contact"),
        phone: c.phone || "",
        whatsapp: c.whatsapp || c.phone || "",
        email: c.email || "",
        isPrimary: c.isPrimary !== undefined ? c.isPrimary : idx === 0,
      }));
    }
    const list: any[] = [];
    if (v?.contactPerson || v?.phone || v?.whatsappNumber || v?.email) {
      list.push({
        id: "c-primary",
        name: v.contactPerson || v.name || "Primary Contact",
        role: "General Manager",
        phone: v.phone || v.contactNumber || "",
        whatsapp: v.whatsappNumber || v.phone || "",
        email: v.email || "",
        isPrimary: true,
      });
    }
    if (v?.alternatePhone) {
      list.push({
        id: "c-alt",
        name: "Alternate Contact",
        role: "Operations / Desk",
        phone: v.alternatePhone,
        whatsapp: v.alternatePhone,
        email: "",
        isPrimary: false,
      });
    }
    return list;
  };

  // State for dynamic sub-items
  const [contacts, setContacts] = useState<any[]>(() =>
    deriveContactsFromVendor(vendor),
  );

  const [rooms, setRooms] = useState<any[]>(() => {
    if (Array.isArray(vendor.vendorRooms) && vendor.vendorRooms.length > 0) {
      return vendor.vendorRooms.map((r: any) => {
        let extra: any = {};
        try {
          if (r.notes && typeof r.notes === "string") extra = JSON.parse(r.notes);
          else if (r.notes && typeof r.notes === "object") extra = r.notes;
        } catch {}
        return {
          id: r.id,
          name: r.roomName || r.name || "Standard Room",
          totalRooms: extra.totalRooms || r.totalRooms || 1,
          cap: r.capacity || extra.cap || 4,
          doubleRate: extra.doubleRate ?? r.baseRate ?? r.doubleRate ?? 0,
          tripleRate: extra.tripleRate ?? r.tripleRate ?? 0,
          quadRate: extra.quadRate ?? r.quadRate ?? 0,
          extraBedRate: extra.extraBedRate ?? r.extraMattressRate ?? 0,
          base: extra.doubleRate ?? r.baseRate ?? 0,
        };
      });
    }
    return vendor.rooms || [];
  });

  const [seasons, setSeasons] = useState<any[]>(() => {
    if (Array.isArray(vendor.seasonalRates) && vendor.seasonalRates.length > 0) {
      return vendor.seasonalRates.map((s: any) => ({
        id: s.id,
        name: s.seasonName || s.name,
        twin: s.twinRate ?? s.twin ?? 0,
        triple: s.tripleRate ?? s.triple ?? 0,
        quad: s.quadRate ?? s.quad ?? 0,
      }));
    }
    return vendor.seasons || [];
  });
  const [contracts, setContracts] = useState<any[]>(vendor.contracts || []);
  const [gallery, setGallery] = useState<any[]>(vendor.photos || []);
  const [destinations, setDestinations] = useState<string[]>(
    vendor.destinationsList || [],
  );
  const [ledger, setLedger] = useState<any[]>(vendor.ledgerEntries || []);

  const [priceHistory, setPriceHistory] = useState<any[]>(
    vendor.priceHistory || [],
  );

  // Real Fed Trips State & Dynamic Vendor Mapping
  const [allTrips, setAllTrips] = useState<any[]>([]);
  const [linkedTripIds, setLinkedTripIds] = useState<string[]>(() => vendor.linkedTripIds || []);
  const [linkTripModalOpen, setLinkTripModalOpen] = useState<boolean>(false);
  const [selectedTripToLink, setSelectedTripToLink] = useState<string>("");

  React.useEffect(() => {
    tripsService
      .getAll()
      .then((data) => {
        if (Array.isArray(data)) {
          setAllTrips(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch real trips for vendor mapping:", err);
      });
  }, []);

  const mappedTrips = useMemo(() => {
    if (!allTrips || allTrips.length === 0) return [];

    return allTrips.filter((t) => {
      // 1. Explicitly linked trip ID
      if (linkedTripIds.includes(t.id)) return true;

      // 2. Explicit trip code matching
      if (vendor.tripCode && (t.id === vendor.tripCode || t.slug === vendor.tripCode || t.code === vendor.tripCode)) return true;

      const tripFullText = `${t.title || ""} ${t.location || ""} ${t.slug || ""} ${t.code || ""}`.toLowerCase();

      // 3. Linked Master Destinations matching (e.g. Manali, Shimla, Spiti)
      if (destinations.some((d) => d.trim() && tripFullText.includes(d.trim().toLowerCase()))) return true;

      // 4. Tokenized vendor location matching (e.g., "Manali, Himachal" -> ["manali", "himachal"])
      const vendorLocRaw = (vendor.location || vendor.city || "").toLowerCase();
      if (vendorLocRaw) {
        const tokens = vendorLocRaw
          .split(/[\s,]+/)
          .map((tok) => tok.trim())
          .filter((tok) => tok.length > 2 && tok !== "and" && tok !== "the");

        if (tokens.some((tok) => tripFullText.includes(tok))) return true;
      }

      return false;
    });
  }, [allTrips, linkedTripIds, destinations, vendor.location, vendor.city, vendor.tripCode]);

  // Helper for Automatic Activity Logging
  const logActivity = (
    eventType: string,
    description: string,
    performedBy = "Hemal Patel (Superadmin)",
  ) => {
    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventType,
      description,
      performedBy,
      createdAt: new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
    setTimeline((prev) => [newEntry, ...prev]);
  };

  const [timeline, setTimeline] = useState<any[]>(() => {
    if (vendor.timelineEntries && vendor.timelineEntries.length > 0) {
      return vendor.timelineEntries;
    }
    return [
      {
        id: "act-init-1",
        eventType: "RATE_APPROVED",
        description: isTransport
          ? "Master transport route rate card approved for MKA and Punjab/Himachal sectors."
          : "Seasonal accommodation tariffs and meal plans verified for active operations.",
        performedBy: "Hemal Patel (Superadmin)",
        createdAt: "Today, 11:30 AM",
      },
      {
        id: "act-init-2",
        eventType: isTransport ? "FLEET_VERIFIED" : "PROPERTY_INSPECTED",
        description: isTransport
          ? "Commercial permits, vehicle capacities, and driver details verified."
          : "Property room inventory, cleanliness, and power backup inspection completed.",
        performedBy: "Operations Team",
        createdAt: "Yesterday, 04:15 PM",
      },
      {
        id: "act-init-3",
        eventType: "VENDOR_ONBOARDED",
        description: `Vendor profile created and assigned to master operations database.`,
        performedBy: "Hemal Patel (Superadmin)",
        createdAt: "01 Aug 2026, 10:00 AM",
      },
    ];
  });

  // Modal Form States & Editing Handlers
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "General Manager",
    phone: "",
    whatsapp: "",
    email: "",
    isPrimary: false,
  });

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({
    name: "",
    totalRooms: "8",
    cap: "4",
    doubleRate: "1200",
    tripleRate: "900",
    quadRate: "750",
  });

  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    twin: "",
    triple: "",
    quad: "",
  });

  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [contractForm, setContractForm] = useState({
    title: "",
    agreementType: "Annual Contract",
    startDate: "",
    expiryDate: "",
    commissionPercent: "10",
    cancellationPolicy: "",
  });

  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<any>(null);
  const [galleryForm, setGalleryForm] = useState({ title: "", url: "" });

  const [destModalOpen, setDestModalOpen] = useState(false);
  const [destName, setDestName] = useState("");

  const MASTER_DESTINATIONS = [
    "Manali",
    "Kasol",
    "Jibhi",
    "Shimla",
    "Spiti",
    "Dharamshala",
    "Leh",
    "Goa",
    "Rishikesh",
    "Bir Billing",
    "Auli",
    "McLeodganj",
    "Lahaul",
  ];

  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({
    entryType: "INVOICE",
    amount: "",
    referenceNo: "",
    remarks: "",
  });

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    serviceName: "",
    oldRate: "",
    newRate: "",
    changedBy: "Admin",
    reason: "",
  });

  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineForm, setTimelineForm] = useState({
    eventType: "NOTE",
    description: "",
    performedBy: "Admin",
  });

  // Header Edit State
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    name: "",
    city: "",
    state: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
  });

  const handleSaveHeaderInfo = async () => {
    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, headerForm);
      const updated = res.data?.data || { ...vendor, ...headerForm };
      setVendor(updated);
      onUpdateVendor(updated);
      logActivity(
        "PROFILE_UPDATED",
        `Updated vendor info: ${headerForm.name} (${headerForm.city || vendor.city})`,
      );
      setHeaderModalOpen(false);
      toast.success("Vendor Name & Location updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update vendor header: " + err.message);
    }
  };

  // Save Overview Updates
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const handleSaveOverview = async () => {
    setIsSavingOverview(true);
    try {
      const payload: any = { ...overviewForm };
      delete payload.breakfastMenu;
      delete payload.lunchMenu;
      delete payload.dinnerMenu;
      delete payload.snacksMenu;
      delete payload.breakfastIncluded;
      delete payload.lunchIncluded;
      delete payload.dinnerIncluded;
      delete payload.snacksIncluded;
      delete payload.financialDetails;
      if (!isTransport) delete payload.routesCovered;
      if (isRestaurant) {
        delete payload.mealPlans;
      }
      if (!isTransport && !isGuide && !isActivity) {
        payload.foodMenu = [
          { type: "BREAKFAST", name: "Breakfast", inclusions: String(overviewForm.breakfastMenu || "").trim() },
          { type: "LUNCH", name: "Lunch", inclusions: String(overviewForm.lunchMenu || "").trim() },
          { type: "DINNER", name: "Dinner", inclusions: String(overviewForm.dinnerMenu || "").trim() },
          { type: "SNACKS", name: "Snacks", inclusions: String(overviewForm.snacksMenu || "").trim() },
        ].filter((item) => {
          const s = item.inclusions;
          if (!s) return false;
          if (/\b(bash|sudo|npm|npx|git|deploy_vps)\b|\.sh\b/i.test(s)) return false;
          return true;
        });
        payload.foodMenuIncluded = {
          breakfast: !!overviewForm.breakfastIncluded,
          lunch: !!overviewForm.lunchIncluded,
          dinner: !!overviewForm.dinnerIncluded,
          snacks: !!overviewForm.snacksIncluded,
        };
      }
      const res = await api.patch(`/vendors/directory/${vendor.id}`, payload);
      const updated = res.data?.data || { ...vendor, ...payload };
      setVendor(updated);
      setOverviewForm(extractOverviewState(updated));
      if (onUpdateVendor) {
        onUpdateVendor(updated);
      }
      logActivity(
        "PROFILE_UPDATED",
        "Updated vendor operational specs & financial compliance",
      );
      toast.success("Overview updated successfully!");
    } catch (err: any) {
      console.error("Save overview error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to save overview");
    } finally {
      setIsSavingOverview(false);
    }
  };

  // Contact Handlers
  const handleSaveContact = async () => {
    if (!contactForm.name) {
      toast.error("Please enter contact name");
      return;
    }
    let updatedContacts: any[] = [];
    if (editingContact) {
      updatedContacts = contacts.map((c) =>
        c.id === editingContact.id ? { ...c, ...contactForm } : c,
      );
      toast.success("Contact updated!");
    } else {
      updatedContacts = [{ id: `c-${Date.now()}`, ...contactForm }, ...contacts];
      toast.success("Contact added!");
    }

    setContacts(updatedContacts);
    setContactModalOpen(false);
    setEditingContact(null);

    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, {
        contacts: updatedContacts,
      });
      if (res.data?.data) {
        setVendor(res.data.data);
        onUpdateVendor(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    const updatedContacts = contacts.filter((c) => c.id !== id);
    setContacts(updatedContacts);
    toast.success("Contact removed");
    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, {
        contacts: updatedContacts,
      });
      if (res.data?.data) {
        setVendor(res.data.data);
        onUpdateVendor(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Room Handlers
  const handleSaveRoom = async () => {
    if (!roomForm.name.trim()) {
      toast.error("Please enter Room Category Name");
      return;
    }
    const dRate = parseFloat(roomForm.doubleRate) || 0;
    const tRate = parseFloat(roomForm.tripleRate) || 0;
    const qRate = parseFloat(roomForm.quadRate) || 0;
    const userCap =
      parseInt(roomForm.cap, 10) || (qRate > 0 ? 4 : tRate > 0 ? 3 : 2);
    const totalRoomsCount = parseInt(roomForm.totalRooms, 10) || 1;

    const roomData = {
      name: roomForm.name.trim(),
      totalRooms: totalRoomsCount,
      cap: userCap,
      doubleRate: dRate,
      tripleRate: tRate,
      quadRate: qRate,
      base: dRate || tRate || qRate || 0,
    };

    let updatedRooms: any[] = [];
    if (editingRoom) {
      updatedRooms = rooms.map((r) =>
        r.id === editingRoom.id ? { ...r, ...roomData } : r,
      );
    } else {
      const newRoom = {
        id: `r-${Date.now()}`,
        ...roomData,
      };
      updatedRooms = [...rooms, newRoom];
    }

    setRooms(updatedRooms);
    setRoomModalOpen(false);
    setEditingRoom(null);

    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, {
        rooms: updatedRooms,
      });
      if (res.data?.data) {
        setVendor(res.data.data);
        onUpdateVendor(res.data.data);
      }
      toast.success("Room category saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Saved locally, failed to update server");
    }
  };

  const handleDeleteRoom = async (id: string) => {
    const updatedRooms = rooms.filter((r) => r.id !== id);
    setRooms(updatedRooms);
    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, {
        rooms: updatedRooms,
      });
      if (res.data?.data) {
        setVendor(res.data.data);
        onUpdateVendor(res.data.data);
      }
      toast.success("Room removed");
    } catch (err) {
      console.error(err);
    }
  };

  // Season Handlers
  const handleSaveSeason = async () => {
    if (!seasonForm.name || !seasonForm.twin) {
      toast.error("Please enter Season Name and Twin Sharing Rate");
      return;
    }

    let updatedSeasons: any[] = [];
    if (editingSeason) {
      updatedSeasons = seasons.map((s) =>
        s.id === editingSeason.id
          ? {
              ...s,
              name: seasonForm.name,
              twin: parseFloat(seasonForm.twin) || 0,
              triple: parseFloat(seasonForm.triple) || 0,
              quad: parseFloat(seasonForm.quad) || 0,
            }
          : s,
      );
    } else {
      const newSeason = {
        id: `s-${Date.now()}`,
        name: seasonForm.name,
        twin: parseFloat(seasonForm.twin) || 0,
        triple: parseFloat(seasonForm.triple) || 0,
        quad: parseFloat(seasonForm.quad) || 0,
      };
      updatedSeasons = [...seasons, newSeason];
    }

    setSeasons(updatedSeasons);
    setSeasonModalOpen(false);
    setEditingSeason(null);

    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, {
        seasons: updatedSeasons,
      });
      if (res.data?.data) {
        setVendor(res.data.data);
        onUpdateVendor(res.data.data);
      }
      toast.success("Seasonal tariff saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Saved locally, failed to update server");
    }
  };

  const handleDeleteSeason = async (id: string) => {
    const updatedSeasons = seasons.filter((s) => s.id !== id);
    setSeasons(updatedSeasons);
    try {
      const res = await api.patch(`/vendors/directory/${vendor.id}`, {
        seasons: updatedSeasons,
      });
      if (res.data?.data) {
        setVendor(res.data.data);
        onUpdateVendor(res.data.data);
      }
      toast.success("Seasonal tariff removed");
    } catch (err) {
      console.error(err);
    }
  };

  // Contract Handlers
  const handleSaveContract = () => {
    if (!contractForm.title || !contractForm.expiryDate) {
      toast.error("Please enter Title and Expiry Date");
      return;
    }
    if (editingContract) {
      setContracts(
        contracts.map((c) =>
          c.id === editingContract.id
            ? {
                ...c,
                ...contractForm,
                commissionPercent:
                  parseFloat(contractForm.commissionPercent) || 0,
              }
            : c,
        ),
      );
      toast.success("Contract updated!");
    } else {
      const newContract = {
        id: `ctr-${Date.now()}`,
        ...contractForm,
        commissionPercent: parseFloat(contractForm.commissionPercent) || 0,
        status: "ACTIVE",
        fileUrl: "#",
      };
      setContracts([newContract, ...contracts]);
      toast.success("Contract saved!");
    }
    setContractModalOpen(false);
    setEditingContract(null);
  };

  const handleDeleteContract = (id: string) => {
    setContracts(contracts.filter((c) => c.id !== id));
    toast.success("Contract removed");
  };

  // Gallery Handlers
  const handleSaveGallery = () => {
    if (!galleryForm.url) {
      toast.error("Please enter image URL");
      return;
    }
    if (editingGallery) {
      setGallery(
        gallery.map((g) =>
          g.id === editingGallery.id
            ? { ...g, title: galleryForm.title, url: galleryForm.url }
            : g,
        ),
      );
      toast.success("Photo updated!");
    } else {
      setGallery([
        ...gallery,
        {
          id: `g-${Date.now()}`,
          title: galleryForm.title || "Property Photo",
          url: galleryForm.url,
        },
      ]);
      toast.success("Photo added to gallery!");
    }
    setGalleryModalOpen(false);
    setEditingGallery(null);
  };

  const handleDeleteGallery = (id: string) => {
    setGallery(gallery.filter((g) => g.id !== id));
    toast.success("Photo removed");
  };

  // Destination Handlers
  const handleAddDestination = () => {
    if (!destName.trim()) return;
    if (!destinations.includes(destName.trim())) {
      setDestinations([...destinations, destName.trim()]);
      toast.success("Destination linked!");
    }
    setDestName("");
    setDestModalOpen(false);
  };

  const handleDeleteDestination = (name: string) => {
    setDestinations(destinations.filter((d) => d !== name));
    toast.success("Destination link removed");
  };

  // Ledger Handlers
  const handleSaveLedger = () => {
    if (!ledgerForm.amount) {
      toast.error("Please enter amount");
      return;
    }
    const amt = parseFloat(ledgerForm.amount) || 0;
    const lastBalance = ledger.length > 0 ? ledger[0].balance : 0;
    const newBal =
      ledgerForm.entryType === "INVOICE"
        ? lastBalance + amt
        : lastBalance - amt;

    const newLedger = {
      id: `l-${Date.now()}`,
      ...ledgerForm,
      amount: amt,
      balance: Math.max(0, newBal),
      entryDate: new Date().toISOString().split("T")[0],
    };
    setLedger([newLedger, ...ledger]);
    setLedgerModalOpen(false);
    toast.success("Ledger entry recorded!");
  };

  // History Handlers
  const handleSaveHistory = () => {
    if (!historyForm.serviceName || !historyForm.newRate) {
      toast.error("Please enter Service Name and New Rate");
      return;
    }
    const newHist = {
      id: `ph-${Date.now()}`,
      serviceName: historyForm.serviceName,
      oldRate: parseFloat(historyForm.oldRate) || 0,
      newRate: parseFloat(historyForm.newRate) || 0,
      changedBy: historyForm.changedBy || "Admin",
      reason: historyForm.reason || "Manual Adjustment",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPriceHistory([newHist, ...priceHistory]);
    setHistoryModalOpen(false);
    toast.success("Price change logged!");
  };

  // Timeline Handlers
  const handleSaveTimeline = () => {
    if (!timelineForm.description) {
      toast.error("Please enter activity description");
      return;
    }
    const newTime = {
      id: `t-${Date.now()}`,
      eventType: timelineForm.eventType,
      description: timelineForm.description,
      performedBy: timelineForm.performedBy || "Admin",
      createdAt: new Date().toLocaleString(),
    };
    setTimeline([newTime, ...timeline]);
    setTimelineModalOpen(false);
    toast.success("Timeline activity logged!");
  };

  if (!vendor) return null;

  const defaultTags = vendor.tags
    ? JSON.parse(vendor.tags)
    : ["Preferred", "Group Friendly", "Fast Response", "Pet Friendly"];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-2xs gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="h-8.5 px-3 text-slate-600 border-slate-200 hover:bg-slate-50 font-bold text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 uppercase">
                {getDisplayVendorCode(vendor)}
              </span>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                {vendor.name}
              </h2>
              <button
                onClick={() => {
                  setHeaderForm({
                    name: vendor.name || "",
                    city: vendor.city || vendor.location || "",
                    state: vendor.state || "Himachal Pradesh",
                    contactPerson: vendor.contactPerson || "",
                    contactNumber: vendor.contactNumber || vendor.phone || "",
                    email: vendor.email || "",
                  });
                  setHeaderModalOpen(true);
                }}
                title="Edit Vendor Name & Location"
                className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-600" />
              </button>
              {vendor.isPreferred && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border border-amber-200">
                  Preferred Partner
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
              <span className="font-bold text-slate-700">
                {isOther
                  ? "Other Vendor Partner"
                  : isGuide
                    ? "Guide & Trek Leader"
                    : isTransport
                      ? "Transport & Fleet Vendor"
                      : isActivity
                        ? "Adventure & Activities Vendor"
                        : isRestaurant
                          ? "Restaurant & Food Partner"
                          : vendor.accommodationType || vendor.type || "Stay Partner"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />{" "}
                {vendor.city || vendor.location || "N/A"}
                {vendor.state ? `, ${vendor.state}` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setHeaderForm({
                name: vendor.name || "",
                city: vendor.city || vendor.location || "",
                state: vendor.state || "",
                contactPerson: vendor.contactPerson || "",
                contactNumber: vendor.contactNumber || vendor.phone || "",
                email: vendor.email || "",
              });
              setHeaderModalOpen(true);
            }}
            className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 rounded-lg flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Vendor Info
          </Button>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-right">
            <span className="text-[10px] font-extrabold text-green-600 uppercase tracking-wider block">
              Performance Score
            </span>
            <span className="text-sm font-black text-green-700">
              {vendor.performanceScore || 95}/100
            </span>
          </div>
        </div>
      </div>

      {/* HEADER EDIT MODAL */}
      <Dialog open={headerModalOpen} onOpenChange={setHeaderModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 border-b pb-2">
              Edit Vendor Name & Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-3 text-xs font-semibold text-slate-650">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-550 uppercase">
                Vendor Name *
              </label>
              <Input
                value={headerForm.name}
                onChange={(e) =>
                  setHeaderForm({ ...headerForm, name: e.target.value })
                }
                className="h-8.5 bg-white border-slate-200 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  City / Location *
                </label>
                <Input
                  value={headerForm.city}
                  onChange={(e) =>
                    setHeaderForm({ ...headerForm, city: e.target.value })
                  }
                  placeholder="e.g. Kasol / Manali"
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  State *
                </label>
                <Input
                  value={headerForm.state}
                  onChange={(e) =>
                    setHeaderForm({ ...headerForm, state: e.target.value })
                  }
                  placeholder="Himachal Pradesh"
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-550 uppercase">
                Contact Person
              </label>
              <Input
                value={headerForm.contactPerson}
                onChange={(e) =>
                  setHeaderForm({
                    ...headerForm,
                    contactPerson: e.target.value,
                  })
                }
                className="h-8.5 bg-white border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Primary Phone
                </label>
                <Input
                  value={headerForm.contactNumber}
                  onChange={(e) =>
                    setHeaderForm({
                      ...headerForm,
                      contactNumber: e.target.value,
                    })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase">
                  Email Address
                </label>
                <Input
                  value={headerForm.email}
                  onChange={(e) =>
                    setHeaderForm({ ...headerForm, email: e.target.value })
                  }
                  className="h-8.5 bg-white border-slate-200"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5 border-t pt-3 border-slate-100">
            <Button
              variant="outline"
              onClick={() => setHeaderModalOpen(false)}
              className="rounded h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveHeaderInfo}
              className="bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded h-8 text-xs font-bold px-4"
            >
              Save Header Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tags Banner */}
      <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-2 overflow-x-auto">
        <Tag className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-bold text-slate-500 shrink-0">Tags:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {defaultTags.map((tag: string, i: number) => (
            <span
              key={i}
              className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 10 Workspace Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex border-b border-slate-100 min-w-max">
          {dynamicTabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                  activeTab === t.id
                    ? "border-[#FF4D00] text-[#FF4D00] bg-amber-50/20"
                    : "border-transparent text-slate-500 hover:text-slate-750 hover:bg-slate-50",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Workspace Panels */}
        <div className="p-6">
          {/* TAB 1: OVERVIEW — DIRECT INLINE EDITABLE & CONTROLLABLE */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    {isTransport
                      ? "Fleet & Transport Compliance Profile"
                      : isGuide
                        ? "Guide Profile & Certifications"
                        : isRestaurant
                          ? "Restaurant & Meal Plans Profile"
                          : isActivity
                            ? "Adventure & Activity Profile"
                            : isOther
                              ? "Vendor & Service Compliance Profile"
                              : "Property & Compliance Profile"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isTransport
                      ? "Edit vehicle categories, operating routes, safety features, and banking details directly below."
                      : isGuide
                        ? "Edit guide language skills, daily rates, certifications, and compliance details directly below."
                        : isRestaurant
                          ? "Edit cuisines, seating capacity, operating hours, and banking details directly below."
                          : isActivity
                            ? "Edit activity offerings, operating site, safety features, and banking details directly below."
                            : isOther
                              ? "Edit services provided, operating location, terms, and banking details directly below."
                              : "Edit category, rating, check-in/out times, meal plans, amenities, and GSTIN/banking details directly below."}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSaveOverview}
                  disabled={isSavingOverview}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-4 shadow-2xs cursor-pointer"
                >
                  {isSavingOverview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save Overview Changes
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category-Specific Operational Info Card */}
                {isTransport ? (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-[#FF4D00]" /> Fleet & Transport Operational Info
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Primary Fleet Categories
                        </label>
                        <Input
                          value={overviewForm.fleetTypes ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              fleetTypes: e.target.value,
                            })
                          }
                          placeholder="20 Seater, 17 Seater, Innova, Ertiga"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Operating Base / Hub
                        </label>
                        <Input
                          value={overviewForm.operatingCity ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              operatingCity: e.target.value,
                            })
                          }
                          placeholder="Jalandhar / Kotkapura / Amritsar"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Toll & Parking Policy
                        </label>
                        <Input
                          value={overviewForm.tollParkingPolicy ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              tollParkingPolicy: e.target.value,
                            })
                          }
                          placeholder="Included in base tariff"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Service Coverage Routes / Sectors
                        </label>
                        <Input
                          value={overviewForm.routesCovered ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              routesCovered: e.target.value,
                            })
                          }
                          placeholder="Kotkapura ↔ Manali, Jalandhar ↔ Kasol, Amritsar ↔ Kullu"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Fleet Safety & Vehicle Features / Amenities
                        </label>
                        <Textarea
                          value={overviewForm.amenities ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              amenities: e.target.value,
                            })
                          }
                          placeholder="GPS Tracking, Speed Governor, Pushback Seats, First Aid Kit, AC / Heater, Luggage Carrier"
                          className="bg-white text-xs border-slate-200 font-medium min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : isGuide ? (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-blue-600" /> Tour Guide Profile & Certifications
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Guide Role / Specialization
                        </label>
                        <Input
                          value={overviewForm.guideRole ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              guideRole: e.target.value,
                            })
                          }
                          placeholder="e.g. Lead Trek Leader, Cultural Local Guide"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Operating Base / Hub
                        </label>
                        <Input
                          value={overviewForm.operatingCity ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              operatingCity: e.target.value,
                            })
                          }
                          placeholder="e.g. Shimla / Manali / Kasol"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Languages Spoken
                        </label>
                        <Input
                          value={overviewForm.languages ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              languages: e.target.value,
                            })
                          }
                          placeholder="e.g. English, Hindi, Pahari, Lahauli"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Mountaineering Certifications
                        </label>
                        <Input
                          value={overviewForm.certifications ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              certifications: e.target.value,
                            })
                          }
                          placeholder="e.g. BMC, AMC, Wilderness First Responder (WFR)"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Trekking & Expedition Experience
                        </label>
                        <Input
                          value={overviewForm.experience ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              experience: e.target.value,
                            })
                          }
                          placeholder="e.g. 7+ Years Experience across Parvati Valley & Spiti"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Safety Equipment & Gear Carried / Amenities
                        </label>
                        <Textarea
                          value={overviewForm.amenities ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              amenities: e.target.value,
                            })
                          }
                          placeholder="e.g. First Aid Kit, O2 Cylinder, Satellite Radio, Rope & Harness"
                          className="bg-white text-xs border-slate-200 font-medium min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : isRestaurant ? (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-[#FF4D00]" /> Restaurant & Dining Profile
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Cuisine & Meal Offerings
                        </label>
                        <Input
                          value={overviewForm.cuisines ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              cuisines: e.target.value,
                            })
                          }
                          placeholder="e.g. North Indian, Himachali Dham, Continental, Chinese"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Seating Capacity (Group Handling)
                        </label>
                        <Input
                          value={overviewForm.seatingCapacity ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              seatingCapacity: e.target.value,
                            })
                          }
                          placeholder="e.g. 80 Pax Group Indoor + Outdoor Seating"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Operating Hours & Service Timing
                        </label>
                        <Input
                          value={overviewForm.operatingHours ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              operatingHours: e.target.value,
                            })
                          }
                          placeholder="e.g. 7:00 AM - 11:00 PM (Breakfast, Lunch & Dinner)"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Amenities & Dining Facilities
                        </label>
                        <Textarea
                          value={overviewForm.amenities ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              amenities: e.target.value,
                            })
                          }
                          placeholder="e.g. Jungle safari camp attach wash room, proper bedding, soap 🧼, hot water 🚿, Lawn Seating, Buffet Counters"
                          className="bg-white text-xs border-slate-200 font-medium min-h-[70px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : isActivity ? (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#FF4D00]" /> Adventure & Activity Profile
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Primary Activity Offerings
                        </label>
                        <Input
                          value={overviewForm.activityTypes ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              activityTypes: e.target.value,
                            })
                          }
                          placeholder="e.g. Paragliding, River Rafting, Zipline, Camping"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Operating Hub / Site
                        </label>
                        <Input
                          value={overviewForm.operatingCity ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              operatingCity: e.target.value,
                            })
                          }
                          placeholder="e.g. Dobhi Fly Site, Kullu River Point"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Operating Hours & Slot Timings
                        </label>
                        <Input
                          value={overviewForm.operatingHours ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              operatingHours: e.target.value,
                            })
                          }
                          placeholder="e.g. 8:00 AM - 6:00 PM (Weather Permitting)"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Safety Equipment & Activity Amenities
                        </label>
                        <Textarea
                          value={overviewForm.amenities ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              amenities: e.target.value,
                            })
                          }
                          placeholder="e.g. GoPro 4K Video, Certified Pilot, Lifejackets & Helmets, First Aid Box, Waiting Lounge"
                          className="bg-white text-xs border-slate-200 font-medium min-h-[70px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : isOther ? (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-700" /> Vendor &
                      Operational Info
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Primary Services / Category
                        </label>
                        <Input
                          value={overviewForm.servicesOffered || ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              servicesOffered: e.target.value,
                            })
                          }
                          placeholder="e.g. Equipment Rental, Permits, Logistics"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Operating Location / Hub
                        </label>
                        <Input
                          value={overviewForm.operatingCity || ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              operatingCity: e.target.value,
                            })
                          }
                          placeholder="e.g. Manali, Shimla, Kaza"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Service Scope & Operating Terms
                        </label>
                        <Textarea
                          value={overviewForm.description || ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="e.g. Specialized camping equipment rental, tents, sleeping bags, and mountain permits."
                          className="bg-white text-xs border-slate-200 font-medium min-h-[70px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" /> Property &
                      Operational Info
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Accommodation Category
                        </label>
                        <Select
                          value={overviewForm.accommodationType}
                          onValueChange={(v) =>
                            setOverviewForm({
                              ...overviewForm,
                              accommodationType: v,
                            })
                          }
                        >
                          <SelectTrigger className="h-8.5 bg-white text-xs border-slate-200 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-xs">
                            <SelectItem value="HOTEL">Hotel</SelectItem>
                            <SelectItem value="RESORT">Resort</SelectItem>
                            <SelectItem value="HOMESTAY">Homestay</SelectItem>
                            <SelectItem value="HOSTEL">Hostel</SelectItem>
                            <SelectItem value="CAMP">
                              Camp / Luxury Tent
                            </SelectItem>
                            <SelectItem value="GUEST_HOUSE">
                              Guest House
                            </SelectItem>
                            <SelectItem value="VILLA">Villa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Star Rating
                        </label>
                        <Select
                          value={overviewForm.starRating.toString()}
                          onValueChange={(v) =>
                            setOverviewForm({
                              ...overviewForm,
                              starRating: parseInt(v),
                            })
                          }
                        >
                          <SelectTrigger className="h-8.5 bg-white text-xs border-slate-200 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-xs">
                            <SelectItem value="1">1 Star ★</SelectItem>
                            <SelectItem value="2">2 Star ★★</SelectItem>
                            <SelectItem value="3">3 Star ★★★</SelectItem>
                            <SelectItem value="4">4 Star ★★★★</SelectItem>
                            <SelectItem value="5">5 Star ★★★★★</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Check-In Time
                        </label>
                        <Input
                          value={overviewForm.checkInTime ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              checkInTime: e.target.value,
                            })
                          }
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Check-Out Time
                        </label>
                        <Input
                          value={overviewForm.checkOutTime ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              checkOutTime: e.target.value,
                            })
                          }
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Meal Plans Supported
                        </label>
                        <Input
                          value={overviewForm.mealPlans ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              mealPlans: e.target.value,
                            })
                          }
                          placeholder="EP, CP, MAP, AP"
                          className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-extrabold text-slate-700 block mb-1">
                          Amenities
                        </label>
                        <Textarea
                          value={overviewForm.amenities ?? ""}
                          onChange={(e) =>
                            setOverviewForm({
                              ...overviewForm,
                              amenities: e.target.value,
                            })
                          }
                          placeholder="WiFi, Parking, Power Backup, Bonfire..."
                          className="bg-white text-xs border-slate-200 font-medium min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(!isTransport && !isGuide && !isActivity) && (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-[#FF4D00]" /> Food Menu
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Shown on trip control as Breakfast / Lunch / Dinner dishes
                      </span>
                    </div>
                    <MealInclusionEditor form={overviewForm} onChange={setOverviewForm} />
                  </div>
                )}

                {/* Financial & Compliance Info Card */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" /> Financial & Compliance Details
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">GST, PAN, Bank & Terms</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">GSTIN Number</label>
                      <Input
                        value={overviewForm.gstin ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, gstin: e.target.value })}
                        placeholder="e.g. 02AAACH7409R1ZZ"
                        className="h-8.5 bg-white text-xs border-slate-200 font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">PAN Number</label>
                      <Input
                        value={overviewForm.panNumber ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, panNumber: e.target.value })}
                        placeholder="e.g. ABCDE1234F"
                        className="h-8.5 bg-white text-xs border-slate-200 font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Bank Name</label>
                      <Input
                        value={overviewForm.bankName ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, bankName: e.target.value })}
                        placeholder="e.g. HDFC Bank / SBI"
                        className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Account Number</label>
                      <Input
                        value={overviewForm.accountNumber ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, accountNumber: e.target.value })}
                        placeholder="e.g. 50200012345678"
                        className="h-8.5 bg-white text-xs border-slate-200 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">IFSC Code</label>
                      <Input
                        value={overviewForm.ifscCode ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, ifscCode: e.target.value })}
                        placeholder="e.g. HDFC0001234"
                        className="h-8.5 bg-white text-xs border-slate-200 font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">UPI ID</label>
                      <Input
                        value={overviewForm.upiId ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, upiId: e.target.value })}
                        placeholder="e.g. vendor@okhdfcbank"
                        className="h-8.5 bg-white text-xs border-slate-200 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Payment Terms</label>
                      <Input
                        value={overviewForm.paymentTerms ?? ""}
                        onChange={(e) => setOverviewForm({ ...overviewForm, paymentTerms: e.target.value })}
                        placeholder="e.g. 30 Days Credit / 50% Advance"
                        className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Credit Period (Days)</label>
                      <Input
                        type="number"
                        value={overviewForm.creditDays ?? 30}
                        onChange={(e) => setOverviewForm({ ...overviewForm, creditDays: parseInt(e.target.value) || 0 })}
                        placeholder="30"
                        className="h-8.5 bg-white text-xs border-slate-200 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TRANSPORT VEHICLES & ROUTE PRICING (UNIFIED) */}
          {(activeTab === "vehicles" || activeTab === "route_pricing" || (isTransport && activeTab === "seasonal_pricing")) && (
            <React.Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Loading Route Pricing...</div>}>
              <RoutePricingTab vendorId={vendor.id} vendorName={vendor.name} />
            </React.Suspense>
          )}

          {/* TAB 2: CONTACT PERSONS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Normalized Contact Persons
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Manage key personnel, managers, front desk, and emergency
                    contacts.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingContact(null);
                    setContactForm({
                      name: "",
                      role: "General Manager",
                      phone: "",
                      whatsapp: "",
                      email: "",
                      isPrimary: false,
                    });
                    setContactModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Contact Person
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">
                          {c.name}
                        </span>
                        <span className="ml-2 text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          {c.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {c.isPrimary && (
                          <span className="bg-green-100 text-green-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-green-200">
                            Primary
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setEditingContact(c);
                            setContactForm({
                              name: c.name,
                              role: c.role,
                              phone: c.phone,
                              whatsapp: c.whatsapp,
                              email: c.email,
                              isPrimary: c.isPrimary,
                            });
                            setContactModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 bg-white rounded border"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="p-1 text-slate-400 hover:text-red-600 bg-white rounded border"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-600 space-y-1 font-medium pt-1">
                      <p>
                        Phone:{" "}
                        <span className="font-bold text-slate-800">
                          {c.phone || "—"}
                        </span>
                      </p>
                      <p>
                        WhatsApp:{" "}
                        <span className="font-bold text-slate-800">
                          {c.whatsapp || c.phone || "—"}
                        </span>
                      </p>
                      <p>
                        Email:{" "}
                        <span className="font-bold text-slate-800">
                          {c.email || "—"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "food_menu" && !isTransport && !isGuide && !isActivity && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Food Menu
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mark which meals are included, then enter dishes. Used on Operations trip control.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSaveOverview}
                  disabled={isSavingOverview}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-4 shadow-2xs cursor-pointer"
                >
                  {isSavingOverview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save food menu
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs">
                <MealInclusionEditor form={overviewForm} onChange={setOverviewForm} tall />
              </div>
            </div>
          )}

          {/* TAB 3: ROOM INVENTORY */}
          {activeTab === "rooms" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Room Inventory & Occupancy Tariffs
                </h3>
                <Button
                  onClick={() => {
                    setEditingRoom(null);
                    setRoomForm({
                      name: "",
                      totalRooms: "8",
                      cap: "4",
                      doubleRate: "1200",
                      tripleRate: "900",
                      quadRate: "750",
                    });
                    setRoomModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Room Category
                </Button>
              </div>

              {rooms.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                  <Bed className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">
                    No Room Categories Added Yet
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click "Add Room Category" above to configure room inventory, capacity, and per-person tariffs.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rooms.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 text-xs relative"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {r.name}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500 mt-1">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              📦 {r.totalRooms || 1} Rooms Total
                            </span>
                            <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-blue-700">
                              👥 {r.cap || 4} Persons Cap
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRoom(r);
                              setRoomForm({
                                name: r.name,
                                totalRooms: (r.totalRooms || 1).toString(),
                                cap: (r.cap || 4).toString(),
                                doubleRate: (r.doubleRate || r.base || 1200).toString(),
                                tripleRate: (r.tripleRate || 900).toString(),
                                quadRate: (r.quadRate || 750).toString(),
                              });
                              setRoomModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(r.id)}
                            className="p-1 text-slate-400 hover:text-red-600 bg-slate-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                          Per Person Tariffs
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-500 block text-[8.5px] font-bold">DOUBLE</span>
                            <span className="font-black text-green-600">₹{r.doubleRate || r.base || 0}</span>
                            <span className="text-[8px] text-slate-400 font-medium"> / person</span>
                          </div>
                          <div className="bg-[#FFF7ED] p-1.5 rounded border border-[#FF4D00]/20">
                            <span className="text-[#FF4D00] block text-[8.5px] font-bold">TRIPLE</span>
                            <span className="font-black text-green-600">₹{r.tripleRate || 0}</span>
                            <span className="text-[8px] text-slate-400 font-medium"> / person</span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-500 block text-[8.5px] font-bold">QUAD</span>
                            <span className="font-black text-green-600">₹{r.quadRate || 0}</span>
                            <span className="text-[8px] text-slate-400 font-medium"> / person</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SEASONAL PRICING */}
          {activeTab === "seasonal_pricing" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Seasonal Pricing Tariffs
                </h3>
                <Button
                  onClick={() => {
                    setEditingSeason(null);
                    setSeasonForm({ name: "", twin: "", triple: "", quad: "" });
                    setSeasonModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Seasonal Rate
                </Button>
              </div>

              {seasons.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">
                    No Seasonal Pricing Configured
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click "Add Seasonal Rate" above to create peak season
                    tariffs.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                  {seasons.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div>
                        <span className="font-extrabold text-slate-800">
                          {s.name}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Priority: Season Rate 1 • Includes GST
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2 text-xs font-bold">
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200">
                            Twin: ₹{s.twin}
                          </span>
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200">
                            Triple: ₹{s.triple}
                          </span>
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200">
                            Quad: ₹{s.quad}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingSeason(s);
                            setSeasonForm({
                              name: s.name,
                              twin: s.twin.toString(),
                              triple: s.triple.toString(),
                              quad: s.quad.toString(),
                            });
                            setSeasonModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSeason(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB FOR GUIDES: RATES & ALLOWANCE */}
          {activeTab === "rates_allowance" && isGuide && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tour Guide Daily Rates
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Per day fee for trek leaders and guides.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingGuideRate(null);
                    setGuideRateForm({
                      roleName: "",
                      badgeText: "Primary Role",
                      perDayFee: "2500",
                    });
                    setGuideRateModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-3.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Rate Config
                </Button>
              </div>

              {guideRates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                  <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">
                    No Guide Rate Configurations Added
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click "Add Rate Config" above to set per-day guide tariffs.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {guideRates.map((gr) => (
                    <div
                      key={gr.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs relative"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm block">
                            {gr.roleName}
                          </span>
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase">
                            {gr.badgeText || "Role"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingGuideRate(gr);
                              setGuideRateForm({
                                roleName: gr.roleName,
                                badgeText: gr.badgeText || "Primary Role",
                                perDayFee: (gr.perDayFee || 2500).toString(),
                              });
                              setGuideRateModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded border border-slate-200"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGuideRate(gr.id)}
                            className="p-1 text-slate-400 hover:text-red-600 bg-slate-50 rounded border border-slate-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 pt-1">
                        Per Day Fee:{" "}
                        <span className="font-black text-green-600 text-sm">
                          ₹{gr.perDayFee || 2500} / Day
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB FOR ACTIVITIES: RATES & ALLOWANCE */}
          {activeTab === "rates_allowance" && isActivity && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Adventure Activity Rates & Tariffs
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Per-person rates for Paragliding, Rafting, Zipline, and Equipment.
                  </p>
                </div>
                <Button
                  onClick={handleOpenAddActivityRate}
                  size="sm"
                  className="h-8 bg-[#FF4D00] hover:bg-[#ea580c] text-white text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Activity Tariff
                </Button>
              </div>

              {activityRates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No activity rates configured yet</p>
                  <p className="text-[11px] text-slate-400">Add negotiated per-person tariffs for adventure activities.</p>
                  <Button
                    onClick={handleOpenAddActivityRate}
                    className="h-7.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-3 mt-2 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add First Activity Tariff
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activityRates.map((rate) => (
                    <div
                      key={rate.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 text-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-extrabold text-slate-900 text-sm leading-snug">
                            {rate.name}
                          </span>
                          <span className="shrink-0 bg-[#FF4D00]/5 text-[#C2410C] font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide border border-[#FF4D00]/30">
                            {rate.category || "ACTIVITY"}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Per Pax Tariff:{" "}
                          <span className="font-black text-green-600 text-sm">
                            ₹{Number(rate.perPaxRate || 0).toLocaleString("en-IN")} / Person
                          </span>
                        </p>
                        {rate.inclusions && (
                          <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-100 mt-2">
                            {rate.inclusions}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                        <Button
                          onClick={() => handleOpenEditActivityRate(rate)}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit Rate
                        </Button>
                        <Button
                          onClick={() => handleDeleteActivityRate(rate.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB FOR RESTAURANTS: MEAL TARIFFS */}
          {activeTab === "meal_tariffs" && isRestaurant && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Meal Tariffs & Thali Rates
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure per-head breakfast, lunch, and dinner tariffs for group bookings.
                  </p>
                </div>
                <Button
                  onClick={handleOpenAddMealTariff}
                  size="sm"
                  className="bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold h-8 px-3 text-xs shadow-2xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Meal Tariff / Thali
                </Button>
              </div>

              {mealTariffs.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-3">
                  <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No meal tariffs configured yet.</p>
                  <Button
                    onClick={handleOpenAddMealTariff}
                    size="sm"
                    className="bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold text-xs"
                  >
                    + Add First Meal Tariff
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mealTariffs.map((t: any) => {
                    const isVeg = t.isVeg !== false;
                    return (
                      <div
                        key={t.id}
                        className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 text-xs relative group hover:border-[#FF4D00]/40 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-slate-800 text-sm leading-snug">
                              {t.name}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                                isVeg
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {isVeg ? "Veg" : "Non-Veg"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              Per Pax Rate:
                            </span>
                            <span className="font-black text-green-600 text-base">
                              ₹{t.perPaxRate?.toLocaleString("en-IN") || t.ratePerPerson || 0} / Pax
                            </span>
                          </div>

                          {t.inclusions && (
                            <p className="text-slate-500 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <strong className="text-slate-700">Includes:</strong> {t.inclusions}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditMealTariff(t)}
                            className="h-7 px-2 text-[11px] font-bold text-slate-700 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit Rate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMealTariff(t.id)}
                            className="h-7 px-2 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB FOR OTHER VENDORS: SERVICES & TARIFFS */}
          {activeTab === "services_tariffs" && isOther && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Vendor Services, Equipment & Tariffs
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Negotiated tariffs for equipment rental, permits, logistics, and specialty services.
                  </p>
                </div>
                <Button
                  onClick={handleOpenAddOtherRate}
                  size="sm"
                  className="h-8 bg-[#FF4D00] hover:bg-[#ea580c] text-white text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Service Tariff
                </Button>
              </div>

              {otherRates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    No service tariffs configured yet
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Add equipment rental rates, permit fees, or service tariffs for this vendor.
                  </p>
                  <Button
                    onClick={handleOpenAddOtherRate}
                    className="h-7.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-3 mt-2 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add First Service Tariff
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {otherRates.map((rate) => (
                    <div
                      key={rate.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 text-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-extrabold text-slate-900 text-sm leading-snug">
                            {rate.name}
                          </span>
                          <span className="shrink-0 bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide border border-slate-200">
                            {rate.category || "SERVICE"}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Tariff Rate:{" "}
                          <span className="font-black text-green-600 text-sm">
                            ₹{Number(rate.rate || rate.perPaxRate || 0).toLocaleString("en-IN")}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-1 font-medium">
                            / {rate.unit || "Unit"}
                          </span>
                        </p>
                        {rate.notes && (
                          <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-100 mt-2">
                            {rate.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                        <Button
                          onClick={() => handleOpenEditOtherRate(rate)}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit Tariff
                        </Button>
                        <Button
                          onClick={() => handleDeleteOtherRate(rate.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CONTRACT MANAGEMENT */}
          {activeTab === "contracts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Contract & SLA Agreements
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track contract start/expiry dates, renewal reminders,
                    commission rates, and cancellation policies.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingContract(null);
                    setContractForm({
                      title: "",
                      agreementType: "Annual Contract",
                      startDate: "",
                      expiryDate: "",
                      commissionPercent: "10",
                      cancellationPolicy: "",
                    });
                    setContractModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Contract Agreement
                </Button>
              </div>

              {contracts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">
                    No Active Contracts
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click "Add Contract Agreement" above to record SLA
                    agreements.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((ctr) => (
                    <div
                      key={ctr.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm block">
                            {ctr.title}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {ctr.agreementType}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Supplier
                              Contract:{" "}
                              {ctr.vendorName ||
                                "Direct Hotel Property Manager"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-green-100 text-green-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border border-green-200">
                            {ctr.status}
                          </span>
                          <button
                            onClick={() => {
                              setEditingContract(ctr);
                              setContractForm({
                                title: ctr.title,
                                agreementType:
                                  ctr.agreementType || "Annual Contract",
                                startDate: ctr.startDate || "",
                                expiryDate: ctr.expiryDate || "",
                                commissionPercent: (
                                  ctr.commissionPercent || 10
                                ).toString(),
                                cancellationPolicy:
                                  ctr.cancellationPolicy || "",
                              });
                              setContractModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(ctr.id)}
                            className="p-1 text-slate-400 hover:text-red-600 bg-slate-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold">
                            START DATE
                          </span>{" "}
                          <span className="font-bold">{ctr.startDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold">
                            EXPIRY DATE
                          </span>{" "}
                          <span className="font-bold text-red-600">
                            {ctr.expiryDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold">
                            RENEWAL REMINDER
                          </span>{" "}
                          <span className="font-bold text-amber-600">
                            {ctr.renewalReminderDate || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold">
                            COMMISSION %
                          </span>{" "}
                          <span className="font-bold text-green-600">
                            {ctr.commissionPercent}%
                          </span>
                        </div>
                      </div>

                      {ctr.cancellationPolicy && (
                        <p className="text-slate-600 font-medium bg-amber-50/50 p-2.5 rounded border border-amber-200/60">
                          <span className="font-bold text-amber-900">
                            Cancellation Policy:
                          </span>{" "}
                          {ctr.cancellationPolicy}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: GALLERY */}
          {activeTab === "gallery" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Property Photos & Media Gallery
                </h3>
                <Button
                  onClick={() => {
                    setEditingGallery(null);
                    setGalleryForm({ title: "", url: "" });
                    setGalleryModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Photo
                </Button>
              </div>

              {gallery.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                  <Image className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">
                    No Photos Added
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click "Add Photo" above to upload property images.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((g) => (
                    <div
                      key={g.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs group relative"
                    >
                      <img
                        src={g.url}
                        alt={g.title}
                        className="w-full h-36 object-cover"
                      />
                      <div className="p-3 flex justify-between items-center bg-white">
                        <span className="text-xs font-extrabold text-slate-800">
                          {g.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingGallery(g);
                              setGalleryForm({ title: g.title, url: g.url });
                              setGalleryModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGallery(g.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PAYMENT LEDGER */}
          {activeTab === "ledger" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Vendor Payment Ledger
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track Invoices, Debits, Credits, Advances, and Running
                    Balance.
                  </p>
                </div>
                <Button
                  onClick={() => setLedgerModalOpen(true)}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Log Ledger Entry
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Ref No</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-700">
                          {l.entryDate}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                              l.entryType === "INVOICE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-700",
                            )}
                          >
                            {l.entryType}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {l.referenceNo || "—"}
                        </td>
                        <td className="p-3 text-slate-600">{l.remarks}</td>
                        <td className="p-3 text-right font-black text-slate-800">
                          ₹{l.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-green-600">
                          ₹{l.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: PRICE AUDIT HISTORY */}
          {activeTab === "price_history" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Price Change Audit History
                </h3>
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Log Price Change
                </Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Service</th>
                      <th className="p-3 text-right">Old Rate</th>
                      <th className="p-3 text-right">New Rate</th>
                      <th className="p-3">Changed By</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {priceHistory.map((ph) => (
                      <tr key={ph.id} className="hover:bg-slate-50/80">
                        <td className="p-3 text-slate-500">{ph.createdAt}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {ph.serviceName}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-450 line-through">
                          ₹{ph.oldRate}
                        </td>
                        <td className="p-3 text-right font-black text-green-600">
                          ₹{ph.newRate}
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {ph.changedBy}
                        </td>
                        <td className="p-3 text-slate-600">{ph.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: UNIFIED CHRONOLOGICAL TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-[#FF4D00]" /> Unified Partner Activity Audit Trail
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automated traceability log of all profile updates, rate revisions, fleet changes, and operational activities.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setTimelineForm({
                      eventType: "NOTE",
                      description: "",
                      performedBy: "Hemal Patel (Superadmin)",
                    });
                    setTimelineModalOpen(true);
                  }}
                  className="h-8.5 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Manual Log
                </Button>
              </div>

              {timeline.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 font-semibold">
                  No activity entries logged yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-2">
                  {timeline.map((item) => {
                    const isRate = item.eventType?.includes("RATE");
                    const isFleet = item.eventType?.includes("FLEET");
                    const isContact = item.eventType?.includes("CONTACT");
                    const isPayment = item.eventType?.includes("PAYMENT");
                    const isProfile =
                      item.eventType?.includes("PROFILE") ||
                      item.eventType?.includes("VENDOR");

                    const badgeBg = isRate
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : isFleet
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : isContact
                          ? "bg-[#FF4D00]/10 text-[#C2410C] border-[#FF4D00]/30"
                          : isPayment
                            ? "bg-green-100 text-green-700 border-green-200"
                            : isProfile
                              ? "bg-sky-100 text-sky-800 border-sky-200"
                              : "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <div key={item.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-[#FF4D00] border-2 border-white ring-4 ring-orange-50" />
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-2">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                badgeBg,
                              )}
                            >
                              {item.eventType?.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-slate-450 font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {item.createdAt}
                            </span>
                          </div>
                          <p className="text-slate-800 font-semibold leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="font-semibold text-slate-400">
                              Audited By:
                            </span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {item.performedBy || "Hemal Patel (Superadmin)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Overview Modal */}
      <Dialog open={editOverviewOpen} onOpenChange={setEditOverviewOpen}>
        <DialogContent className="max-w-xl bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Edit Property Overview & Compliance
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Accommodation Category
              </label>
              <Select
                value={overviewForm.accommodationType}
                onValueChange={(v) =>
                  setOverviewForm({ ...overviewForm, accommodationType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOTEL">Hotel</SelectItem>
                  <SelectItem value="RESORT">Resort</SelectItem>
                  <SelectItem value="HOMESTAY">Homestay</SelectItem>
                  <SelectItem value="HOSTEL">Hostel</SelectItem>
                  <SelectItem value="CAMP">Camp / Luxury Tent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Star Rating
              </label>
              <Select
                value={overviewForm.starRating.toString()}
                onValueChange={(v) =>
                  setOverviewForm({ ...overviewForm, starRating: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Star</SelectItem>
                  <SelectItem value="2">2 Star</SelectItem>
                  <SelectItem value="3">3 Star</SelectItem>
                  <SelectItem value="4">4 Star</SelectItem>
                  <SelectItem value="5">5 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Check-In Time
              </label>
              <Input
                value={overviewForm.checkInTime}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    checkInTime: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Check-Out Time
              </label>
              <Input
                value={overviewForm.checkOutTime}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    checkOutTime: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Financial, Banking & Compliance Details
              </label>
              <Textarea
                value={overviewForm.financialDetails}
                onChange={(e) =>
                  setOverviewForm({
                    ...overviewForm,
                    financialDetails: e.target.value,
                  })
                }
                rows={5}
                placeholder={`GSTIN: 02AAACH1827C1Z5\nPAN: AAACH1827C\nBank: HDFC Bank Ltd\nA/C: 50200049281726\nIFSC: HDFC0000240\nPayment Terms: 30 Days Credit`}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveOverview}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              {editingContact ? "Edit Contact Person" : "Add Contact Person"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Full Name
              </label>
              <Input
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm({ ...contactForm, name: e.target.value })
                }
                placeholder="e.g. Ramesh Sharma"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Role / Designation
              </label>
              <Input
                value={contactForm.role}
                onChange={(e) =>
                  setContactForm({ ...contactForm, role: e.target.value })
                }
                placeholder="e.g. Owner, General Manager, Driver, Accounts..."
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Phone Number
              </label>
              <Input
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm({ ...contactForm, phone: e.target.value })
                }
                placeholder="+91 98166 00000"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                WhatsApp Number
              </label>
              <Input
                value={contactForm.whatsapp}
                onChange={(e) =>
                  setContactForm({ ...contactForm, whatsapp: e.target.value })
                }
                placeholder="+91 98166 00000"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Email Address
              </label>
              <Input
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm({ ...contactForm, email: e.target.value })
                }
                placeholder="contact@hotel.com"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveContact}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Save Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Category Modal */}
      <Dialog open={roomModalOpen} onOpenChange={setRoomModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              {editingRoom ? "Edit Room Category" : "Add Room Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Room Category Name <span className="text-red-600">*</span>
              </label>
              <Input
                value={roomForm.name}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, name: e.target.value })
                }
                placeholder="e.g. Deluxe Mountain View Room / Family Room (6-Bedded)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Total Rooms Inventory
                </label>
                <Input
                  type="number"
                  value={roomForm.totalRooms}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, totalRooms: e.target.value })
                  }
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Max Room Capacity (Persons)
                </label>
                <Input
                  type="number"
                  value={roomForm.cap}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, cap: e.target.value })
                  }
                  placeholder="e.g. 4 (or 6 for Family)"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Per Person Tariffs (₹ / Night)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Double Sharing (₹/person)
                  </label>
                  <Input
                    type="number"
                    value={roomForm.doubleRate}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, doubleRate: e.target.value })
                    }
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Triple Sharing (₹/person)
                  </label>
                  <Input
                    type="number"
                    value={roomForm.tripleRate}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, tripleRate: e.target.value })
                    }
                    placeholder="900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    Quad Sharing (₹/person)
                  </label>
                  <Input
                    type="number"
                    value={roomForm.quadRate}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, quadRate: e.target.value })
                    }
                    placeholder="750"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveRoom}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Save Room Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Season Tariff Modal */}
      <Dialog open={seasonModalOpen} onOpenChange={setSeasonModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Add Seasonal Tariff
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Season Name & Period
              </label>
              <Input
                value={seasonForm.name}
                onChange={(e) =>
                  setSeasonForm({ ...seasonForm, name: e.target.value })
                }
                placeholder="e.g. Monsoon Special (Jul 16 - Sep 15)"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Twin Sharing Rate (₹)
              </label>
              <Input
                type="number"
                value={seasonForm.twin}
                onChange={(e) =>
                  setSeasonForm({ ...seasonForm, twin: e.target.value })
                }
                placeholder="2800"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Triple Sharing Rate (₹)
              </label>
              <Input
                type="number"
                value={seasonForm.triple}
                onChange={(e) =>
                  setSeasonForm({ ...seasonForm, triple: e.target.value })
                }
                placeholder="3500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Quad Sharing Rate (₹)
              </label>
              <Input
                type="number"
                value={seasonForm.quad}
                onChange={(e) =>
                  setSeasonForm({ ...seasonForm, quad: e.target.value })
                }
                placeholder="4200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveSeason}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Save Seasonal Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Modal */}
      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Add Contract Agreement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Agreement Title
              </label>
              <Input
                value={contractForm.title}
                onChange={(e) =>
                  setContractForm({ ...contractForm, title: e.target.value })
                }
                placeholder="e.g. Master Operations SLA 2026"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Expiry Date
              </label>
              <Input
                type="date"
                value={contractForm.expiryDate}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    expiryDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Commission %
              </label>
              <Input
                type="number"
                value={contractForm.commissionPercent}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    commissionPercent: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Cancellation Policy
              </label>
              <Textarea
                value={contractForm.cancellationPolicy}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    cancellationPolicy: e.target.value,
                  })
                }
                placeholder="Terms and conditions..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveContract}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Save Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Modal */}
      <Dialog open={galleryModalOpen} onOpenChange={setGalleryModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Add Property Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Photo Title / Caption
              </label>
              <Input
                value={galleryForm.title}
                onChange={(e) =>
                  setGalleryForm({ ...galleryForm, title: e.target.value })
                }
                placeholder="e.g. Mountain View Balcony"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Image URL
              </label>
              <Input
                value={galleryForm.url}
                onChange={(e) =>
                  setGalleryForm({ ...galleryForm, url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveGallery}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Add Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Modal */}
      <Dialog open={ledgerModalOpen} onOpenChange={setLedgerModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Log Ledger Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Entry Type
              </label>
              <Select
                value={ledgerForm.entryType}
                onValueChange={(v) =>
                  setLedgerForm({ ...ledgerForm, entryType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVOICE">INVOICE (Debit)</SelectItem>
                  <SelectItem value="ADVANCE">ADVANCE (Credit)</SelectItem>
                  <SelectItem value="PAYMENT">PAYMENT (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Amount (₹)
              </label>
              <Input
                type="number"
                value={ledgerForm.amount}
                onChange={(e) =>
                  setLedgerForm({ ...ledgerForm, amount: e.target.value })
                }
                placeholder="15000"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Reference No / Txn ID
              </label>
              <Input
                value={ledgerForm.referenceNo}
                onChange={(e) =>
                  setLedgerForm({ ...ledgerForm, referenceNo: e.target.value })
                }
                placeholder="INV-9901 / TXN-10928"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Remarks
              </label>
              <Input
                value={ledgerForm.remarks}
                onChange={(e) =>
                  setLedgerForm({ ...ledgerForm, remarks: e.target.value })
                }
                placeholder="Allocations for departure..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveLedger}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Log Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Log Price Change
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Service Name
              </label>
              <Input
                value={historyForm.serviceName}
                onChange={(e) =>
                  setHistoryForm({
                    ...historyForm,
                    serviceName: e.target.value,
                  })
                }
                placeholder="e.g. Deluxe Room Peak Rate"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Old Rate (₹)
              </label>
              <Input
                type="number"
                value={historyForm.oldRate}
                onChange={(e) =>
                  setHistoryForm({ ...historyForm, oldRate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                New Rate (₹)
              </label>
              <Input
                type="number"
                value={historyForm.newRate}
                onChange={(e) =>
                  setHistoryForm({ ...historyForm, newRate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Reason
              </label>
              <Input
                value={historyForm.reason}
                onChange={(e) =>
                  setHistoryForm({ ...historyForm, reason: e.target.value })
                }
                placeholder="Reason for price revision..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveHistory}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Save Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeline Modal */}
      <Dialog open={timelineModalOpen} onOpenChange={setTimelineModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              Add Timeline Activity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Activity Type
              </label>
              <Select
                value={timelineForm.eventType}
                onValueChange={(v) =>
                  setTimelineForm({ ...timelineForm, eventType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">Note / Observation</SelectItem>
                  <SelectItem value="CALL_LOG">Call / WhatsApp Log</SelectItem>
                  <SelectItem value="RATE_REVISION">Rate Revision</SelectItem>
                  <SelectItem value="INSPECTION">
                    Property Inspection
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Description
              </label>
              <Textarea
                value={timelineForm.description}
                onChange={(e) =>
                  setTimelineForm({
                    ...timelineForm,
                    description: e.target.value,
                  })
                }
                placeholder="Enter activity log details..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveTimeline}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              Save Activity Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Transport Vehicle Modal */}
      <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              {editingVehicle ? "Edit Fleet Vehicle" : "Add Vehicle to Fleet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Vehicle Model / Type
              </label>
              <Input
                value={vehicleForm.model}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, model: e.target.value })
                }
                placeholder="e.g. 20 Seater Tempo Traveller, Innova Crysta"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Advertised Capacity
                </label>
                <Input
                  type="number"
                  value={vehicleForm.capacity}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, capacity: e.target.value })
                  }
                  placeholder="20"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Sellable Seats
                </label>
                <Input
                  type="number"
                  value={vehicleForm.sellableSeats}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      sellableSeats: e.target.value,
                    })
                  }
                  placeholder="19"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Air Conditioning
                </label>
                <Select
                  value={vehicleForm.acType}
                  onValueChange={(v) =>
                    setVehicleForm({ ...vehicleForm, acType: v })
                  }
                >
                  <SelectTrigger className="h-9 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-xs">
                    <SelectItem value="AC">AC (Air Conditioned)</SelectItem>
                    <SelectItem value="Non-AC">Non-AC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Registration Plate No.
                </label>
                <Input
                  value={vehicleForm.plateNumber}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })
                  }
                  placeholder="PB-08-TR-2001"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveVehicle}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              {editingVehicle ? "Update Vehicle" : "Save Vehicle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transport Route Tariff Modal */}
      <Dialog open={routeModalOpen} onOpenChange={setRouteModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">
              {editingRoute ? "Edit Route Tariff" : "Add Route Tariff"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Route Name (Pickup ➔ Drop)
              </label>
              <Input
                value={routeForm.routeName}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, routeName: e.target.value })
                }
                placeholder="e.g. Kotkapura ➔ Kotkapura, Jalandhar ➔ Jalandhar"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Vehicle Type
              </label>
              <Input
                value={routeForm.vehicleType}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, vehicleType: e.target.value })
                }
                placeholder="e.g. 20 Seater Tempo, 17 Seater Tempo, Innova"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Total Vehicle Amount (₹)
              </label>
              <Input
                type="number"
                value={routeForm.totalAmount}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, totalAmount: e.target.value })
                }
                placeholder="44000"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Notes / Special Conditions
              </label>
              <Input
                value={routeForm.notes}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, notes: e.target.value })
                }
                placeholder="e.g. Kotkapura pickup & drop extra: ₹2,000"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleSaveRoute}
              className="bg-[#FF4D00] text-white text-xs font-bold px-4 py-2"
            >
              {editingRoute ? "Update Route Tariff" : "Save Route Tariff"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guide Rate Configuration Modal */}
      <Dialog open={guideRateModalOpen} onOpenChange={setGuideRateModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-slate-800 border-b pb-2">
              {editingGuideRate ? "Edit Guide Daily Rate" : "Add Guide Daily Rate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs my-2 font-medium text-slate-700">
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Guide Role / Designation *
              </label>
              <Input
                value={guideRateForm.roleName}
                onChange={(e) => setGuideRateForm({ ...guideRateForm, roleName: e.target.value })}
                placeholder="e.g. Lead Trek Leader, Assistant Guide, Cultural Guide"
                className="h-8.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Category Badge / Tag
              </label>
              <Input
                value={guideRateForm.badgeText}
                onChange={(e) => setGuideRateForm({ ...guideRateForm, badgeText: e.target.value })}
                placeholder="e.g. Primary Role, City / Sightseeing"
                className="h-8.5 text-xs"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Per Day Fee (₹/Day) *
              </label>
              <Input
                type="number"
                value={guideRateForm.perDayFee}
                onChange={(e) => setGuideRateForm({ ...guideRateForm, perDayFee: e.target.value })}
                placeholder="2500"
                className="h-8.5 text-xs font-bold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setGuideRateModalOpen(false)}
              className="h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGuideRate}
              className="h-8 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-4 shadow-2xs"
            >
              {editingGuideRate ? "Update Guide Rate" : "Add Guide Rate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MEAL TARIFF & THALI RATE MODAL */}
      <Dialog open={mealTariffModalOpen} onOpenChange={setMealTariffModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogTitle className="text-base font-black text-slate-900">
            {editingMealTariff ? "Edit Meal Tariff / Thali Rate" : "Add Meal Tariff / Thali Rate"}
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Configure negotiated per-head meal tariff for group departures at <strong>{vendor.name}</strong>.
          </p>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Meal Package / Thali Name *
              </label>
              <Input
                value={mealTariffForm.name}
                onChange={(e) => setMealTariffForm({ ...mealTariffForm, name: e.target.value })}
                placeholder="e.g. Group Breakfast Buffet, Special Kathiyawadi Thali"
                className="h-8.5 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Meal Category
                </label>
                <select
                  value={mealTariffForm.type}
                  onChange={(e) => setMealTariffForm({ ...mealTariffForm, type: e.target.value })}
                  className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="DINNER">Dinner</option>
                  <option value="SNACKS">High Tea / Snacks</option>
                  <option value="BUFFET">All-Day Buffet</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Dietary Type
                </label>
                <select
                  value={mealTariffForm.isVeg ? "veg" : "non-veg"}
                  onChange={(e) => setMealTariffForm({ ...mealTariffForm, isVeg: e.target.value === "veg" })}
                  className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="veg">Pure Veg 🥬</option>
                  <option value="non-veg">Veg + Non-Veg 🍗</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Per Pax Rate (₹/Person) *
              </label>
              <Input
                type="number"
                value={mealTariffForm.perPaxRate}
                onChange={(e) => setMealTariffForm({ ...mealTariffForm, perPaxRate: e.target.value })}
                placeholder="250"
                className="h-8.5 text-xs font-bold text-green-600"
              />
            </div>

            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Inclusions / Menu Items
              </label>
              <Input
                value={mealTariffForm.inclusions}
                onChange={(e) => setMealTariffForm({ ...mealTariffForm, inclusions: e.target.value })}
                placeholder="e.g. Paneer Butter Masala, Dal Makhani, Rice, 3 Roti, Gulab Jamun"
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setMealTariffModalOpen(false)}
              className="h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMealTariff}
              className="h-8 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-4 shadow-2xs"
            >
              {editingMealTariff ? "Update Meal Rate" : "Add Meal Rate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADVENTURE ACTIVITY RATE & TARIFF MODAL */}
      <Dialog open={activityRateModalOpen} onOpenChange={setActivityRateModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogTitle className="text-base font-black text-slate-900">
            {editingActivityRate ? "Edit Activity Rate / Tariff" : "Add Activity Rate / Tariff"}
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Configure negotiated per-person tariff for activities and equipment at <strong>{vendor.name}</strong>.
          </p>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Activity Name / Package *
              </label>
              <Input
                value={activityRateForm.name}
                onChange={(e) => setActivityRateForm({ ...activityRateForm, name: e.target.value })}
                placeholder="e.g. Tandem Paragliding High Fly, 12 KM River Rafting"
                className="h-8.5 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Activity Category
                </label>
                <select
                  value={activityRateForm.category}
                  onChange={(e) => setActivityRateForm({ ...activityRateForm, category: e.target.value })}
                  className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="PARAGLIDING">Paragliding 🪂</option>
                  <option value="RAFTING">River Rafting 🚣</option>
                  <option value="TREKKING">Trekking / Hike 🥾</option>
                  <option value="ZIPLINE">Zipline / Ropeway 🧗</option>
                  <option value="CAMPING">Camping / Tents ⛺</option>
                  <option value="EQUIPMENT">Equipment Rental 🎒</option>
                  <option value="OTHER">Other Activity</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Per Pax Rate (₹/Person) *
                </label>
                <Input
                  type="number"
                  value={activityRateForm.perPaxRate}
                  onChange={(e) => setActivityRateForm({ ...activityRateForm, perPaxRate: e.target.value })}
                  placeholder="2500"
                  className="h-8.5 text-xs font-bold text-green-600"
                />
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Inclusions & Safety Gear Provided
              </label>
              <Input
                value={activityRateForm.inclusions}
                onChange={(e) => setActivityRateForm({ ...activityRateForm, inclusions: e.target.value })}
                placeholder="e.g. Includes GoPro 4K Video Recording, Pilot Fee, Lifejacket & Helmet"
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setActivityRateModalOpen(false)}
              className="h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveActivityRate}
              className="h-8 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-4 shadow-2xs"
            >
              {editingActivityRate ? "Update Activity Rate" : "Add Activity Rate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTHER VENDOR SERVICE TARIFF MODAL */}
      <Dialog
        open={otherRateModalOpen}
        onOpenChange={setOtherRateModalOpen}
      >
        <DialogContent className="max-w-md bg-white p-5 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-800 flex items-center justify-between border-b pb-2 border-slate-100">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FF4D00]" />
                {editingOtherRate
                  ? "Edit Service Tariff"
                  : "Add New Service Tariff"}
              </span>
              <span className="text-[10px] font-extrabold uppercase bg-[#FF4D00]/5 text-[#C2410C] px-2 py-0.5 rounded border border-[#FF4D00]/30">
                Other Vendor
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-3 text-xs">
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Service / Item Name *
              </label>
              <Input
                value={otherRateForm.name}
                onChange={(e) =>
                  setOtherRateForm({ ...otherRateForm, name: e.target.value })
                }
                placeholder="e.g. Tents & Sleeping Bag Rental, Wildlife Permit Clearance"
                className="h-8.5 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Service Category
                </label>
                <select
                  value={otherRateForm.category}
                  onChange={(e) =>
                    setOtherRateForm({
                      ...otherRateForm,
                      category: e.target.value,
                    })
                  }
                  className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="EQUIPMENT">Equipment Rental 🎒</option>
                  <option value="PERMITS">Permits & Clearances 📜</option>
                  <option value="LOGISTICS">Logistics & Porters 📦</option>
                  <option value="CAMPING">Camping Gear ⛺</option>
                  <option value="CATERING">Catering / Food 🍲</option>
                  <option value="OTHER">General Services ⚙️</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">
                  Tariff Rate (₹) *
                </label>
                <Input
                  type="number"
                  value={otherRateForm.rate}
                  onChange={(e) =>
                    setOtherRateForm({
                      ...otherRateForm,
                      rate: e.target.value,
                    })
                  }
                  placeholder="500"
                  className="h-8.5 text-xs font-bold text-green-600"
                />
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Pricing Unit / Basis
              </label>
              <Input
                value={otherRateForm.unit}
                onChange={(e) =>
                  setOtherRateForm({
                    ...otherRateForm,
                    unit: e.target.value,
                  })
                }
                placeholder="e.g. Per Set / Day, Per Person, Fixed Per Group"
                className="h-8.5 text-xs font-bold"
              />
            </div>

            <div>
              <label className="font-extrabold text-slate-800 block mb-1">
                Notes & Terms
              </label>
              <Input
                value={otherRateForm.notes}
                onChange={(e) =>
                  setOtherRateForm({
                    ...otherRateForm,
                    notes: e.target.value,
                  })
                }
                placeholder="e.g. Includes delivery to base camp, 24-hr advance booking required"
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setOtherRateModalOpen(false)}
              className="h-8 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOtherRate}
              className="h-8 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-4 shadow-2xs"
            >
              {editingOtherRate
                ? "Update Service Tariff"
                : "Add Service Tariff"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AccommodationDetailPage;

