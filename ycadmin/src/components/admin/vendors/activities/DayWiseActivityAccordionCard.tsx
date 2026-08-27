import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Bus,
  Users,
  DollarSign,
  Star,
  CheckCircle2,
  ShieldAlert,
  Utensils,
  FileText,
  Save,
  Check,
  RefreshCw,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface DepartureActivityItem {
  id: string;
  name: string;
  category?: string;
  dayNumber: number;
  scheduledTime: string;
  endTime?: string;
  status:
    | "DRAFT"
    | "CONFIRMED"
    | "READY"
    | "STARTED"
    | "COMPLETED"
    | "RECONCILED";
  vendorId?: string;
  vendorName: string;
  vendorRating?: number;
  guideName?: string;
  vehicleName?: string;
  maxCapacity: number;
  bookedCount: number;
  adultPrice: number;
  childPrice: number;
  vendorCost: number;
  sellingPrice?: number;
  customerPrice?: number;
  isIncluded?: boolean;
  gstPercent?: number;
  mealIncluded?: string;
  notes?: string;
  passengers?: { id: string; name: string; isOpted: boolean }[];
}

interface DayWiseCardProps {
  activity: DepartureActivityItem;
  onUpdateActivity: (
    id: string,
    updated: Partial<DepartureActivityItem>,
  ) => Promise<void> | void;
  onDeleteActivity?: (id: string) => Promise<void> | void;
  availableVendors?: {
    vendorId: string;
    vendorName: string;
    rating: number;
    netCost: number;
    seasonType: string;
  }[];
}

const SIX_OPERATIONAL_STATUSES = [
  {
    value: "DRAFT",
    label: "Draft",
    bg: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "READY",
    label: "Ready",
    bg: "bg-amber-50 text-amber-800 border-amber-100",
  },
  {
    value: "STARTED",
    label: "Started",
    bg: "bg-slate-100 text-[#0B1528] border-slate-200",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    bg: "bg-green-50 text-green-700 border-green-100",
  },
  {
    value: "RECONCILED",
    label: "Reconciled",
    bg: "bg-slate-100 text-slate-600 border-slate-200",
  },
] as const;

export default function DayWiseActivityAccordionCard({
  activity,
  onUpdateActivity,
  onDeleteActivity,
  availableVendors,
}: DayWiseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable local state
  const [activityName, setActivityName] = useState(activity.name);
  const [category, setCategory] = useState(activity.category || "Adventure");
  const [duration, setDuration] = useState("2 Hours");
  const [status, setStatus] = useState<DepartureActivityItem["status"]>(
    activity.status || "CONFIRMED",
  );
  const [guideName, setGuideName] = useState(
    activity.guideName || "",
  );
  const [vehicleName, setVehicleName] = useState(
    activity.vehicleName || "",
  );
  const [scheduledTime, setScheduledTime] = useState(
    activity.scheduledTime || "09:30 AM",
  );
  const [endTime, setEndTime] = useState(activity.endTime || "12:30 PM");
  const [mealIncluded, setMealIncluded] = useState(
    activity.mealIncluded || "Included",
  );
  const [notes, setNotes] = useState(activity.notes || "");

  // Inclusion & Pricing
  const [isIncluded, setIsIncluded] = useState<boolean>(
    activity.isIncluded !== undefined
      ? activity.isIncluded
      : activity.adultPrice === 0 ||
          activity.name.toLowerCase().includes("breakfast") ||
          activity.name.toLowerCase().includes("rafting") ||
          activity.name.toLowerCase().includes("temple") ||
          activity.name.toLowerCase().includes("bonfire") ||
          activity.name.toLowerCase().includes("trek") ||
          activity.name.toLowerCase().includes("check-in") ||
          activity.name.toLowerCase().includes("briefing") ||
          activity.name.toLowerCase().includes("departure") ||
          activity.name.toLowerCase().includes("arrival") ||
          activity.name.toLowerCase().includes("shawl") ||
          activity.name.toLowerCase().includes("ice breaking") ||
          activity.name.toLowerCase().includes("music") ||
          activity.name.toLowerCase().includes("station"),
  );
  const [sellingPrice, setSellingPrice] = useState(
    activity.customerPrice !== undefined
      ? activity.customerPrice
      : activity.adultPrice !== undefined
        ? activity.adultPrice
        : 0,
  );
  const [adultPrice, setAdultPrice] = useState(activity.adultPrice ?? 0);
  const [childPrice, setChildPrice] = useState(activity.childPrice ?? 0);
  const [vendorCost, setVendorCost] = useState(activity.vendorCost ?? 0);
  const [gstPercent, setGstPercent] = useState(activity.gstPercent ?? 5);

  const profitPerPax = sellingPrice - vendorCost;
  const remainingSeats = Math.max(
    0,
    activity.maxCapacity - activity.bookedCount,
  );
  const capacityPercent = Math.min(
    100,
    Math.round((activity.bookedCount / activity.maxCapacity) * 100),
  );

  // Passengers Checkbox List
  const [passengers, setPassengers] = useState(
    activity.passengers || [],
  );
  const [manualPaxCount, setManualPaxCount] = useState<number | null>(null);

  // Real vendor list passed from trip vendor directory
  const comparisonVendors = availableVendors || [];

  const currentStatusObj =
    SIX_OPERATIONAL_STATUSES.find((s) => s.value === status) ||
    SIX_OPERATIONAL_STATUSES[1];

  const handleTogglePassenger = (pId: string) => {
    setPassengers((prev) => {
      const updated = prev.map((p) =>
        p.id === pId ? { ...p, isOpted: !p.isOpted } : p,
      );
      setManualPaxCount(updated.filter((p) => p.isOpted).length);
      return updated;
    });
  };

  const handleAssignVendor = (vnd: {
    vendorId: string;
    vendorName: string;
    netCost: number;
  }) => {
    setVendorCost(vnd.netCost);
    onUpdateActivity(activity.id, {
      vendorId: vnd.vendorId,
      vendorName: vnd.vendorName,
      vendorCost: vnd.netCost,
    });
    toast.success(`Assigned ${vnd.vendorName} (@ ₹${vnd.netCost}/pax)`);
  };

  const handleSaveInline = async () => {
    setSaving(true);
    try {
      await onUpdateActivity(activity.id, {
        name: activityName,
        category,
        isIncluded,
        customerPrice: sellingPrice,
        status,
        guideName,
        vehicleName,
        scheduledTime,
        endTime,
        mealIncluded,
        notes,
        adultPrice: sellingPrice,
        childPrice,
        vendorCost,
        gstPercent,
        bookedCount: optedCount,
      });
      toast.success("Activity details updated successfully");
    } catch (err: any) {
      toast.error("Failed to update activity");
    } finally {
      setSaving(false);
    }
  };

  const optedCount =
    manualPaxCount !== null
      ? manualPaxCount
      : isIncluded
        ? activity.bookedCount || activity.maxCapacity || 40
        : passengers.filter((p) => p.isOpted).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all overflow-hidden mb-3">
      {/* HEADER BAR — COMPACT INFORMATION-DENSE SUMMARY (COLLAPSED VIEW) */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-3 sm:p-4 cursor-pointer flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 select-none hover:bg-slate-50/70 transition-colors min-w-0"
      >
        {/* Left: Time stacked above title on mobile so 360px doesn’t crush the row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3.5 min-w-0 w-full">
          <div className="px-2.5 py-1 bg-[#F4F7FB] rounded-md text-[#0B1528] font-bold text-xs font-mono whitespace-nowrap w-fit shrink-0 border border-[#E8EEF4]">
            {scheduledTime}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[#0B1528] text-sm sm:text-base break-words leading-snug">
              {activityName}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
                  isIncluded
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-[#FF4D00]/10 text-[#FF4D00] border-[#FF4D00]/20",
                )}
              >
                {isIncluded ? "Included" : "Optional"}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                  currentStatusObj.bg,
                )}
              >
                {currentStatusObj.label}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Vendor:{" "}
              <strong className="text-[#0B1528] font-semibold">{activity.vendorName}</strong>
            </p>
          </div>
        </div>

        {/* Center: Key Metrics Summary based on Included vs Optional */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs bg-[#F4F7FB] px-3 py-2 rounded-xl border border-[#E8EEF4] w-full min-w-0">
          {isIncluded ? (
            vendorCost > 0 ? (
              <>
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    Vendor Cost
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    ₹{vendorCost} / Pax
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Passengers
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {optedCount} Pax
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Total Vendor Cost
                  </span>
                  <strong className="text-green-700 font-bold text-sm">
                    ₹{(optedCount * vendorCost).toLocaleString()}
                  </strong>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-semibold">
                  Included in Package • No Vendor Cost
                </span>
                <div className="pl-2 border-l border-slate-200">
                  <span className="text-slate-400 block text-[11px]">
                    Passengers
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {optedCount} Pax
                  </strong>
                </div>
              </div>
            )
          ) : sellingPrice > 0 || vendorCost > 0 ? (
            <>
              <div>
                <span className="text-slate-400 block text-[11px]">
                  Selling Price
                </span>
                <strong className="text-slate-900 font-bold text-sm">
                  ₹{sellingPrice}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">
                  Vendor Cost
                </span>
                <strong className="text-slate-700 font-bold text-sm">
                  ₹{vendorCost}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Profit</span>
                <strong className="text-green-600 font-bold text-sm">
                  ₹{(sellingPrice - vendorCost).toLocaleString()} / Pax
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Booked</span>
                <strong className="text-[#0B1528] font-bold text-sm">
                  {optedCount} Pax
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">
                  Revenue
                </span>
                <strong className="text-[#0B1528] font-bold text-sm">
                  ₹{(optedCount * sellingPrice).toLocaleString()}
                </strong>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="px-2.5 py-1 bg-[#FF4D00]/5 text-[#C2410C] border border-[#FF4D00]/30 rounded-md text-xs font-semibold">
                Optional Activity • Price Not Set
              </span>
              <div className="pl-2 border-l border-slate-200">
                <span className="text-slate-400 block text-[11px]">Booked</span>
                <strong className="text-slate-900 font-bold text-sm">
                  {optedCount} Pax
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Right: Details & Delete Buttons */}
        <div className="flex items-center gap-1.5 self-end xl:self-center shrink-0">
          {onDeleteActivity && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    `Are you sure you want to delete "${activityName}" from this departure?`,
                  )
                ) {
                  onDeleteActivity(activity.id);
                }
              }}
              className="text-xs font-semibold px-2.5 h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition shadow-2xs cursor-pointer"
              title="Delete Activity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-xs font-semibold px-3.5 h-8 border-slate-300 hover:bg-slate-100 text-slate-700"
          >
            <span>Details</span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1.5 text-slate-700" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-slate-700" />
            )}
          </Button>
        </div>
      </div>

      {/* ACCORDION EXPANDED CONTENT — OPERATIONAL WORKSPACE INLINE */}
      {expanded && (
        <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-6">
          {/* SECTION 1: 6-STATUS WORKFLOW SELECTOR */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Operational Status (6-Stage Workflow)
            </label>
            <div className="flex flex-wrap gap-2">
              {SIX_OPERATIONAL_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    status === s.value
                      ? cn(
                          s.bg,
                          "ring-2 ring-[#FF4D00]/30 border-[#FF4D00]/60 shadow-sm font-bold",
                        )
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: BASIC INFORMATION & OPERATIONAL ASSIGNMENTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Activity Name
              </label>
              <input
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                className="w-full text-sm font-bold text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              >
                <option value="Adventure">Adventure</option>
                <option value="Sightseeing">Sightseeing</option>
                <option value="Transit">Transit</option>
                <option value="Meal">Meal</option>
                <option value="Entertainment">Entertainment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2 Hours"
                className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Timing Window
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-1/2 text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-300 text-center"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-1/2 text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-300 text-center"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Assigned Guide
              </label>
              <input
                type="text"
                value={guideName}
                onChange={(e) => setGuideName(e.target.value)}
                placeholder="e.g. Lead Guide / Trek Leader"
                className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Assigned Vehicle / Bus
              </label>
              <input
                type="text"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="e.g. Tempo Traveller / Bus / Taxi"
                className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Meal Plan Inclusion
              </label>
              <select
                value={mealIncluded}
                onChange={(e) => setMealIncluded(e.target.value)}
                className="w-full text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              >
                <option value="Included">Included</option>
                <option value="Not Included">Not Included</option>
                <option value="Lunch Only">Lunch Only</option>
                <option value="Snacks Included">Snacks Included</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: ACTIVITY TYPE TOGGLE & DYNAMIC INCLUSION / OPTIONAL PRICING */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-5">
            {/* TOGGLE BAR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h5 className="text-sm font-bold text-slate-900">
                  Activity Type & Package Inclusion
                </h5>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose whether this activity is included in the company tour
                  package or sold as an optional add-on.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsIncluded(true)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5",
                    isIncluded
                      ? "bg-green-600 text-white border-green-700 shadow-sm"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
                  )}
                >
                  <span>● Included in Package</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsIncluded(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5",
                    !isIncluded
                      ? "bg-[#FF4D00] text-white border-[#E04400] shadow-sm"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
                  )}
                >
                  <span>○ Optional Paid Activity</span>
                </button>
              </div>
            </div>

            {/* DYNAMIC CALCULATION VIEW BASED ON TOGGLE */}
            {isIncluded ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-green-50/60 p-4 rounded-xl border border-green-200">
                <div>
                  <label className="block text-xs font-bold text-green-900 uppercase tracking-wider mb-1">
                    Vendor Cost / Pax
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-green-700 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={vendorCost}
                      onChange={(e) =>
                        setVendorCost(Number(e.target.value) || 0)
                      }
                      className="w-full pl-7 pr-3 py-1.5 text-sm font-black text-green-900 rounded-lg border border-green-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-900 uppercase tracking-wider mb-1">
                    Booked Count (Pax)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={optedCount}
                      onChange={(e) =>
                        setManualPaxCount(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      className="w-full pl-3 pr-10 py-1.5 text-sm font-black text-green-900 rounded-lg border border-green-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500"
                    />
                    <span className="absolute right-3 top-2 text-green-700 font-bold text-xs">
                      Pax
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-900 uppercase tracking-wider mb-1">
                    Total Payable to Vendor (Auto)
                  </label>
                  <div className="text-xl font-black text-green-700 mt-1">
                    ₹{(optedCount * vendorCost).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#FF4D00]/5/60 p-4 rounded-xl border border-[#FF4D00]/30">
                <div>
                  <label className="block text-xs font-bold text-[#0B1528] uppercase tracking-wider mb-1">
                    Selling Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[#C2410C] font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) =>
                        setSellingPrice(Number(e.target.value) || 0)
                      }
                      className="w-full pl-6 pr-2 py-1.5 text-sm font-black text-[#0B1528] rounded-lg border border-[#FF4D00]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1528] uppercase tracking-wider mb-1">
                    Vendor Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[#C2410C] font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={vendorCost}
                      onChange={(e) =>
                        setVendorCost(Number(e.target.value) || 0)
                      }
                      className="w-full pl-6 pr-2 py-1.5 text-sm font-bold text-slate-700 rounded-lg border border-[#FF4D00]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                    />
                  </div>
                </div>

                <div className="bg-white/80 p-2 rounded-lg border border-[#FF4D00]/30">
                  <span className="text-[11px] font-bold text-[#C2410C] uppercase block">
                    Profit / Pax
                  </span>
                  <span className="text-base font-black text-green-600 mt-0.5 block">
                    ₹{(sellingPrice - vendorCost).toLocaleString()}
                  </span>
                </div>

                <div className="bg-white/80 p-2 rounded-lg border border-[#FF4D00]/30">
                  <label className="text-[11px] font-bold text-[#C2410C] uppercase block mb-1">
                    Booked Count (Pax)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={optedCount}
                      onChange={(e) =>
                        setManualPaxCount(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      className="w-full pl-2.5 pr-8 py-1 text-sm font-black text-[#0B1528] rounded border border-[#FF4D00]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                    />
                    <span className="absolute right-2 top-1.5 text-[#C2410C] font-bold text-xs">
                      Pax
                    </span>
                  </div>
                </div>

                <div className="bg-[#0B1528] text-white p-2 rounded-lg flex flex-col justify-center">
                  <span className="text-[11px] font-semibold text-[#FF4D00]/70 uppercase">
                    Total Revenue
                  </span>
                  <span className="text-base font-black text-white">
                    ₹{(optedCount * sellingPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: INLINE VENDOR COMPARISON (ONE-CLICK SELECTION, NO POPUPS) */}
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Inline Vendor Comparison (One-Click Selection)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {comparisonVendors.map((vnd) => {
                const isCurrent =
                  activity.vendorName === vnd.vendorName ||
                  vnd.netCost === vendorCost;
                return (
                  <div
                    key={vnd.vendorId}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex items-center justify-between",
                      isCurrent
                        ? "bg-[#FF4D00]/5/70 border-[#FF4D00]/40 ring-1 ring-[#FF4D00]/20"
                        : "bg-white border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900">
                          {vnd.vendorName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-[#FF4D00] text-white font-bold px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span className="font-medium">{vnd.rating}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900">
                          ₹{vnd.netCost}
                        </span>
                        <span className="text-slate-500">/pax</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isCurrent ? "default" : "outline"}
                      onClick={() => handleAssignVendor(vnd)}
                      className={cn(
                        "h-8 px-3 text-xs font-semibold",
                        isCurrent &&
                          "bg-[#FF4D00] hover:bg-[#E04400] text-white",
                      )}
                    >
                      {isCurrent ? "Assigned" : "Assign"}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* INLINE CUSTOM / MISCELLANEOUS VENDOR BUTTON */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-slate-500">
                Need an unlisted vendor or miscellaneous cost?
              </span>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt(
                    "Enter Vendor Name or Miscellaneous Cost Label:",
                    "Miscellaneous Expense",
                  );
                  if (!name) return;
                  const costStr = window.prompt(
                    "Enter Net Cost per passenger (₹):",
                    "0",
                  );
                  const cost = Number(costStr) || 0;
                  setVendorCost(cost);
                  toast.success(
                    `Assigned custom vendor "${name}" at ₹${cost}/pax`,
                  );
                }}
                className="text-xs font-bold text-[#FF4D00] hover:text-[#C2410C] bg-[#FF4D00]/5 hover:bg-[#FF4D00]/10 px-3 py-1.5 rounded-lg border border-[#FF4D00]/30 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />+ Add Custom Vendor / Misc Cost
              </button>
            </div>
          </div>

          {/* SECTION 5: PASSENGER SELECTION (SHOWS ENTIRELY FOR OPTIONAL ACTIVITIES OR SUMMARY FOR INCLUDED) */}
          {!isIncluded ? (
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Booked Passengers — Check Opt-In ({optedCount}/
                  {activity.maxCapacity})
                </h5>
                <div className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                  Remaining Seats: {remainingSeats}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {passengers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleTogglePassenger(p.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5",
                      p.isOpted
                        ? "bg-[#FF4D00] text-white border-[#FF4D00] shadow-sm font-bold"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
                    )}
                  >
                    <span>{p.name}</span>
                    {p.isOpted && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50/40 rounded-xl border border-green-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-900 font-medium text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>
                  <strong>Included in Tour Package:</strong> All {optedCount}{" "}
                  manifested passengers are automatically covered.
                </span>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-100/80 px-2.5 py-1 rounded-lg">
                ₹0 Extra Charge
              </span>
            </div>
          )}

          {/* SECTION 6: NOTES & INLINE SAVE */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Operational Notes & Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Life jackets required; VIP guest seating in front raft"
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {onDeleteActivity && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDeleteActivity(activity.id)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold px-4 h-10"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              )}
              <Button
                onClick={handleSaveInline}
                disabled={saving}
                className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold px-6 h-10"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


