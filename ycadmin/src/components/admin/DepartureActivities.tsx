import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Sliders,
  Calendar,
  Filter,
  RefreshCw,
  Copy,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ActivityKPIHeader from "./vendors/activities/ActivityKPIHeader";
import DayWiseActivityAccordionCard, {
  DepartureActivityItem,
} from "./vendors/activities/DayWiseActivityAccordionCard";
import Activity5StepWizardModal, {
  VendorOption,
} from "./vendors/activities/Activity5StepWizardModal";
import { saveActivityToBackend } from "@/utils/departure/activityMapper";
import { vendorsService } from "@/services/vendors.service";

interface DepartureActivitiesProps {
  tripId: string;
  departureDateStr: string;
  tripDetails: any;
  computedItinerary?: any[];
  allPassengers?: any[];
  tripVendors: any[];
  activitiesList: any[];
  fetchPageData: () => void;
  setActivitiesList: (val: any[]) => void;
  api: any;
}

export default function DepartureActivities({
  tripId,
  departureDateStr,
  tripDetails,
  computedItinerary = [],
  allPassengers = [],
  tripVendors,
  activitiesList,
  fetchPageData,
  setActivitiesList,
  api,
}: DepartureActivitiesProps) {
  // Filter States
  const [actDayFilter, setActDayFilter] = useState("All Days");
  const [actStatusFilter, setActStatusFilter] = useState("All Status");
  const [actSearch, setActSearch] = useState("");

  // Modals & Selection
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialDay, setWizardInitialDay] = useState(1);

  // Derived counts & manifest (declared early to prevent TDZ errors)
  const totalPaxCount = allPassengers.length > 0 ? allPassengers.length : 5;

  const formattedManifest = useMemo(() => {
    return (allPassengers || []).map((p: any, idx: number) => ({
      id: p.id || `pax-${idx + 1}`,
      name: p.name || p.fullName || `Passenger ${idx + 1}`,
    }));
  }, [allPassengers]);

  // Live Trip Vendors Directory (Restaurants, Activities, Others)
  const [tripVendorsList, setTripVendorsList] = useState<any[]>([]);
  const [masterActivities, setMasterActivities] = useState<any[]>([]);

  useEffect(() => {
    if (tripId) {
      vendorsService
        .getVendorsByTrip(tripId)
        .then((res) => {
          if (Array.isArray(res)) {
            setTripVendorsList(res);
          }
        })
        .catch(() => {});
    }
  }, [tripId]);

  useEffect(() => {
    if (api) {
      api
        .get("/admin/activities")
        .then((res: any) => {
          const data = res.data?.data || res.data || [];
          if (Array.isArray(data)) {
            setMasterActivities(
              data.map((m: any) => ({
                id: m.id,
                name: m.name,
                category: m.category || "ADVENTURE",
                defaultCapacity: m.defaultCapacity || 40,
                defaultCost: m.defaultCost || 0,
              })),
            );
          }
        })
        .catch(() => {});
    }
  }, [api]);

  const mappedVendorsForWizard = useMemo<VendorOption[]>(() => {
    const list: VendorOption[] = [];
    const seen = new Set<string>();

    const checkAndAdd = (tv: any) => {
      const v = tv.vendor || tv;
      const vId = v.id || tv.id || tv.vendorId;
      const vName = v.name || tv.name || "";
      if (!vName || seen.has(vName.toLowerCase())) return;

      const rawCat = (tv.category || tv.vendorType || v.type || "other").toLowerCase();
      const nameLower = vName.toLowerCase();

      // STRICT EXCLUSION: Skip Hotels, Resorts, Homestays, Camps, Lodges (Accommodation)
      const isAccommodation =
        rawCat.includes("hotel") ||
        rawCat.includes("resort") ||
        rawCat.includes("homestay") ||
        rawCat.includes("stay") ||
        rawCat.includes("lodge") ||
        rawCat.includes("camp") ||
        rawCat.includes("inn") ||
        rawCat.includes("accommodation") ||
        nameLower.includes("hotel") ||
        nameLower.includes("resort") ||
        nameLower.includes("homestay") ||
        nameLower.includes("camp") ||
        (nameLower.includes("cottage") && !nameLower.includes("restaurant"));

      // STRICT EXCLUSION: Skip Transport, Cabs, Vehicles, Drivers
      const isTransport =
        rawCat.includes("transport") ||
        rawCat.includes("cab") ||
        rawCat.includes("taxi") ||
        rawCat.includes("vehicle") ||
        rawCat.includes("bus") ||
        rawCat.includes("driver") ||
        nameLower.includes("cab") ||
        nameLower.includes("taxi") ||
        nameLower.includes("travels") ||
        nameLower.includes("transport");

      // STRICT EXCLUSION: Skip Guides / Trek Leaders (managed in Guides workspace)
      const isGuide =
        rawCat.includes("guide") ||
        rawCat.includes("leader") ||
        nameLower.includes("guide") ||
        nameLower.includes(" sir");

      if (isAccommodation || isTransport || isGuide) {
        return; // Skip hotels, transport, and guides from activities
      }

      // Check if it's a Restaurant / Food Partner
      const isRest =
        rawCat.includes("restaurant") ||
        rawCat.includes("food") ||
        rawCat === "meal" ||
        nameLower.includes("dhaba") ||
        nameLower.includes("restaurant") ||
        nameLower.includes("bhojnalaya") ||
        nameLower.includes("cafe") ||
        nameLower.includes("canteen");

      // Check if it's an Activity / Adventure Partner
      const isAct =
        rawCat.includes("activity") ||
        rawCat.includes("activities") ||
        rawCat.includes("adventure") ||
        rawCat.includes("sightseeing") ||
        rawCat.includes("trek") ||
        rawCat.includes("rafting") ||
        rawCat.includes("paragliding") ||
        rawCat.includes("scooter") ||
        rawCat.includes("zipline") ||
        rawCat.includes("atv") ||
        rawCat.includes("safari");

      if (!isRest && !isAct) {
        return;
      }

      seen.add(nameLower);

      // Parse meal tariffs if available
      let mealTariffsList: any[] = [];
      const rawTariffs = v.mealTariffs || tv.mealTariffs || v.mealPlans || tv.mealPlans;
      if (Array.isArray(rawTariffs)) {
        mealTariffsList = rawTariffs;
      } else if (typeof rawTariffs === "string" && rawTariffs.trim().startsWith("[")) {
        try {
          mealTariffsList = JSON.parse(rawTariffs);
        } catch {
          mealTariffsList = [];
        }
      }

      const mealTariffRate = mealTariffsList.length > 0
        ? Number(
            mealTariffsList[0]?.perPax ||
            mealTariffsList[0]?.perPaxRate ||
            mealTariffsList[0]?.rate ||
            mealTariffsList[0]?.amount ||
            mealTariffsList[0]?.cost ||
            0
          )
        : 0;

      const rate =
        (mealTariffRate > 0 ? mealTariffRate : null) ||
        tv.rates?.[0]?.amount ||
        tv.rates?.[0]?.negotiatedRate ||
        tv.rates?.[0]?.costPerPerson ||
        tv.rates?.[0]?.mealPrice ||
        tv.rates?.[0]?.baseRate ||
        tv.rates?.[0]?.rate ||
        v.rates?.[0]?.amount ||
        v.rates?.[0]?.rate ||
        v.rate ||
        v.price ||
        v.costPerPerson ||
        v.perPaxRate ||
        tv.agreedCost ||
        tv.vendorCost ||
        null;

      list.push({
        vendorId: vId,
        vendorName: vName,
        category: isRest ? "restaurants" : "activities",
        location: v.location || v.city || tv.location || tv.city || "",
        contactPerson: v.contactPerson || tv.contactPerson || "",
        contactPhone: v.contactNumber || v.phone || tv.phone || "",
        rating: v.rating || tv.rating || (isRest ? 4.8 : 4.6),
        netCost: rate != null ? Number(rate) : (isRest ? 130 : 500),
        seasonType: tv.rates?.[0]?.seasonType || "REGULAR",
        mealTariffs: mealTariffsList,
      });
    };

    (tripVendorsList || []).forEach((tv) => checkAndAdd(tv));
    (tripVendors || []).forEach((tv) => checkAndAdd(tv));

    return list;
  }, [tripVendorsList, tripVendors]);

  // Combined authentic activities for Step 2 — 100% feeded from Trip Vendor Directory & Master Database ONLY
  const authenticActivitiesMasterList = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    // 1. Primary: Only authentic contracted Restaurant & Activity vendors for this Trip
    (mappedVendorsForWizard || []).forEach((vnd) => {
      const isRest = vnd.category === "restaurants";

      // If restaurant has configured meal tariffs / thalis, list each specific meal plan
      if (isRest && Array.isArray((vnd as any).mealTariffs) && (vnd as any).mealTariffs.length > 0) {
        (vnd as any).mealTariffs.forEach((mt: any) => {
          const tariffRate = Number(
            mt.perPax ||
            mt.perPaxRate ||
            mt.rate ||
            mt.amount ||
            mt.cost ||
            vnd.netCost ||
            130
          );
          const actName = `${vnd.vendorName} · ${mt.name || "Meal Buffet"}${vnd.location ? ` (${vnd.location})` : ""}`;
          if (!seen.has(actName.toLowerCase())) {
            seen.add(actName.toLowerCase());
            list.push({
              id: `VND-MEAL-${vnd.vendorId}-${mt.id || Math.random().toString(36).substring(7)}`,
              name: actName,
              category: "MEAL",
              defaultCapacity: totalPaxCount || 40,
              defaultCost: tariffRate,
              vendorId: vnd.vendorId,
              vendor: vnd,
              mealTariff: mt,
            });
          }
        });
      } else {
        const actName = `${vnd.vendorName}${vnd.location ? ` (${vnd.location})` : ""}`;
        if (!seen.has(actName.toLowerCase())) {
          seen.add(actName.toLowerCase());
          list.push({
            id: `VND-ACT-${vnd.vendorId}`,
            name: actName,
            category: isRest ? "MEAL" : "ADVENTURE",
            defaultCapacity: totalPaxCount || 40,
            defaultCost: vnd.netCost || (isRest ? 130 : 500),
            vendorId: vnd.vendorId,
            vendor: vnd,
          });
        }
      }
    });

    // 2. Master Database Activities
    (masterActivities || []).forEach((m) => {
      if (!seen.has(m.name.toLowerCase())) {
        seen.add(m.name.toLowerCase());
        list.push({
          id: m.id,
          name: m.name,
          category: m.category || "ADVENTURE",
          defaultCapacity: m.defaultCapacity || totalPaxCount || 40,
          defaultCost: m.defaultCost || 0,
        });
      }
    });

    return list;
  }, [mappedVendorsForWizard, masterActivities, totalPaxCount]);

  const currentActivities: DepartureActivityItem[] = useMemo(() => {
    if (Array.isArray(activitiesList)) {
      return activitiesList.map((a, idx) => ({
        id: a.id || `act-${idx}`,
        name: a.name || a.act || "Activity",
        category: a.type || a.category || "ADVENTURE",
        dayNumber:
          Number(a.dayNumber) ||
          Number(String(a.day || "").replace(/\D/g, "")) ||
          1,
        scheduledTime: a.startTime || a.scheduledTime || a.time || "10:00 AM",
        endTime: a.endTime || "01:00 PM",
        status: (a.status?.toUpperCase() as any) || "CONFIRMED",
        vendorName: a.vendorName || "Contracted Supplier",
        maxCapacity: Number(a.maxParticipants) || totalPaxCount,
        bookedCount: a.bookedCount !== undefined ? Number(a.bookedCount) : totalPaxCount,
        isIncluded:
          a.isIncluded !== undefined
            ? a.isIncluded
            : a.inc !== undefined
              ? a.inc
              : true,
        adultPrice:
          a.adultPrice !== undefined
            ? Number(a.adultPrice)
            : a.sellingPrice !== undefined
              ? Number(a.sellingPrice)
              : 0,
        childPrice: a.childPrice !== undefined ? Number(a.childPrice) : 0,
        vendorCost:
          a.vendorCost !== undefined
            ? Number(a.vendorCost)
            : a.estimatedCost !== undefined
              ? Number(a.estimatedCost)
              : 0,
        guideName: a.responsibleGuide || "Lead Guide",
        vehicleName: a.vehicleName || "Tempo 1",
        mealIncluded: "Included",
        notes: a.remarks || a.sub || "",
      }));
    }

    return [];
  }, [activitiesList, totalPaxCount]);

  const computedActivities = useMemo(() => {
    return currentActivities
      .filter((a) => {
        const matchDay =
          actDayFilter === "All Days" || String(a.dayNumber) === actDayFilter;
        const matchStatus =
          actStatusFilter === "All Status" ||
          a.status.toLowerCase() === actStatusFilter.toLowerCase();
        const matchSearch =
          actSearch === "" ||
          a.name.toLowerCase().includes(actSearch.toLowerCase()) ||
          a.vendorName.toLowerCase().includes(actSearch.toLowerCase());
        return matchDay && matchStatus && matchSearch;
      })
      .sort((a, b) => a.dayNumber - b.dayNumber);
  }, [currentActivities, actDayFilter, actStatusFilter, actSearch]);

  const groupedByDay = useMemo(() => {
    const groups: Record<number, DepartureActivityItem[]> = {};
    const totalDays = computedItinerary.length > 0 ? computedItinerary.length : 9;
    if (actDayFilter === "All Days") {
      for (let d = 1; d <= totalDays; d++) {
        groups[d] = [];
      }
    }
    computedActivities.forEach((a) => {
      const day = a.dayNumber || 1;
      if (!groups[day]) groups[day] = [];
      groups[day].push(a);
    });
    return groups;
  }, [computedActivities, actDayFilter, computedItinerary]);

  const daysAvailable = useMemo(() => {
    const totalDays = computedItinerary.length > 0 ? computedItinerary.length : 9;
    const s = new Set<number>();
    for (let d = 1; d <= totalDays; d++) s.add(d);
    currentActivities.forEach((a) => s.add(a.dayNumber));
    return Array.from(s).sort((a, b) => a - b);
  }, [currentActivities, computedItinerary]);

  const handleUpdateActivityItem = async (
    id: string,
    updated: Partial<DepartureActivityItem>,
  ) => {
    const nextList = currentActivities.map((item) =>
      item.id === id ? { ...item, ...updated } : item,
    );
    setActivitiesList(nextList);
    const depKey = `yc_activities_${tripId}_${departureDateStr}`;
    try {
      localStorage.setItem(depKey, JSON.stringify(nextList));
    } catch (e) {}
    try {
      await api.put(`/ops/activities/${tripId}/${id}?departureDate=${departureDateStr}`, {
        ...updated,
        name: updated.name,
        type: updated.category || updated.type,
        startTime: updated.scheduledTime || updated.startTime,
        endTime: updated.endTime,
        estimatedCost: updated.vendorCost !== undefined ? Number(updated.vendorCost) : updated.estimatedCost,
        vendorName: updated.vendorName,
        vendorId: updated.vendorId,
        remarks: updated.notes !== undefined ? updated.notes : updated.remarks,
        status: updated.status,
      });
      if (typeof fetchPageData === "function") {
        fetchPageData();
      }
    } catch (e) {
      console.warn("Backend update fallback:", e);
    }
  };

  const handleDeleteActivityItem = async (id: string) => {
    const nextList = currentActivities.filter((item) => item.id !== id);
    setActivitiesList(nextList);
    const depKey = `yc_activities_${tripId}_${departureDateStr}`;
    try {
      localStorage.setItem(depKey, JSON.stringify(nextList));
    } catch (e) {}
    toast.success("Activity removed from departure");
    try {
      await api.delete(`/ops/activities/${tripId}/${id}`);
    } catch (e) {
      // Offline fallback still updates UI
    }
  };

  const handleAddActivityFromWizard = async (newActivity: any) => {
    try {
      const persisted = await saveActivityToBackend(api, tripId, departureDateStr, newActivity);
      const nextList = [...(activitiesList || []), persisted];
      setActivitiesList(nextList);
      const depKey = `yc_activities_${tripId}_${departureDateStr}`;
      try {
        localStorage.setItem(depKey, JSON.stringify(nextList));
      } catch (e) {}
      if (typeof fetchPageData === "function") {
        await fetchPageData();
      }
    } catch (e) {
      // API error toast is shown by saveActivityToBackend; UI state is not mutated on failure
    }
  };

  const dynamicDayTitles = useMemo(() => {
    const map: Record<number, string> = {};
    computedItinerary.forEach((item, idx) => {
      const dNum =
        typeof item.day === "number"
          ? item.day
          : parseInt(String(item.day || "").replace(/\D/g, ""), 10) || idx + 1;
      map[dNum] = item.plan || item.title || item.description || `Day ${dNum} Plan`;
    });
    return map;
  }, [computedItinerary]);

  const kpiStats = useMemo(() => {
    const totalActivities = currentActivities.length;
    const pendingVendorConfirmations = currentActivities.filter(
      (a) =>
        a.status === "DRAFT" ||
        a.status === "READY" ||
        !a.status,
    ).length;
    const passengersBooked = Math.max(
      40,
      ...currentActivities.map((a) => a.maxCapacity || a.bookedCount || 0),
    );
    const totalRevenue = currentActivities.reduce(
      (acc, a) =>
        acc +
        (a.isIncluded
          ? 0
          : (a.adultPrice || a.sellingPrice || 0) * (a.bookedCount || 0)),
      0,
    );
    const totalVendorCost = currentActivities.reduce(
      (acc, a) =>
        acc + (a.vendorCost || 0) * (a.bookedCount || (a.isIncluded ? 40 : 0)),
      0,
    );
    const grossProfit = currentActivities.reduce(
      (acc, a) =>
        acc +
        (a.isIncluded
          ? 0
          : Math.max(
              0,
              (a.adultPrice || a.sellingPrice || 0) - (a.vendorCost || 0),
            ) * (a.bookedCount || 0)),
      0,
    );

    return {
      todayActivities: totalActivities,
      pendingVendorConfirmations,
      passengersBooked,
      totalRevenue,
      totalVendorCost,
      grossProfit,
    };
  }, [currentActivities]);

  return (
    <div className="space-y-6 min-w-0">
      {/* TOOLBAR: FILTER BAR & ADD ACTIVITY ACTION */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#E8EEF4] shadow-xs flex flex-col gap-3 min-w-0">
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-stretch md:items-center gap-2 min-w-0">
          {/* Day Filter */}
          <select
            value={actDayFilter}
            onChange={(e) => setActDayFilter(e.target.value)}
            className="min-w-0 w-full md:w-auto text-xs font-semibold px-3 py-2 rounded-lg border border-[#E8EEF4] bg-white text-slate-700 focus:outline-none focus:border-[#FF4D00]"
          >
            <option value="All Days">All Days</option>
            {daysAvailable.map((d) => (
              <option key={d} value={String(d)}>
                Day {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={actStatusFilter}
            onChange={(e) => setActStatusFilter(e.target.value)}
            className="min-w-0 w-full md:w-auto text-xs font-semibold px-3 py-2 rounded-lg border border-[#E8EEF4] bg-white text-slate-700 focus:outline-none focus:border-[#FF4D00]"
          >
            <option value="All Status">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="READY">Ready</option>
            <option value="STARTED">Started</option>
            <option value="COMPLETED">Completed</option>
            <option value="RECONCILED">Reconciled</option>
          </select>

          {/* Search Bar */}
          <div className="relative col-span-2 md:flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity or vendor..."
              value={actSearch}
              onChange={(e) => setActSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-lg border border-[#E8EEF4] w-full text-slate-700 focus:outline-none focus:border-[#FF4D00]"
            />
          </div>
        </div>

        <Button
          onClick={() => setWizardOpen(true)}
          className="hidden md:inline-flex self-start bg-[#FF4D00] hover:bg-[#E04500] text-white font-bold h-9 px-4 text-xs shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Activity
        </Button>
      </div>

      {/* DAY-WISE ITINERARY CARDS GROUPED CHRONOLOGICALLY */}
      <div className="space-y-8">
        {Object.keys(groupedByDay)
          .map(Number)
          .sort((a, b) => a - b)
          .map((day) => {
            const dayItems = groupedByDay[day];
            return (
              <div key={day} className="space-y-4">
                {/* DAY TITLE HEADER BANNER */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-[#E8EEF4] min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="px-2.5 py-1 bg-[#0B1528] text-white rounded-md font-bold text-xs tracking-wider shrink-0">
                      DAY {day}
                    </div>
                    <span className="text-sm font-semibold text-[#0B1528] break-words min-w-0">
                      {dynamicDayTitles[day] || `Day ${day} Scheduled Activities`}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 sm:ml-auto shrink-0">
                    {dayItems.length}{" "}
                    {dayItems.length === 1 ? "Activity" : "Activities"}
                  </span>
                </div>

                {/* ACCORDION CARDS FOR THIS DAY */}
                <div className="space-y-3">
                  {dayItems.length > 0 ? (
                    dayItems.map((activity) => (
                      <DayWiseActivityAccordionCard
                        key={activity.id}
                        activity={activity}
                        availableVendors={mappedVendorsForWizard}
                        onUpdateActivity={handleUpdateActivityItem}
                        onDeleteActivity={handleDeleteActivityItem}
                      />
                    ))
                  ) : (
                    <div className="p-4 bg-white border border-dashed border-[#E8EEF4] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 min-w-0">
                      <span className="leading-relaxed">No activities or restaurant meals scheduled for Day {day} yet.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setWizardInitialDay(day);
                          setWizardOpen(true);
                        }}
                        className="h-8 w-full sm:w-auto px-3 text-xs bg-white hover:bg-[#FFF0E6] hover:text-[#FF4D00] border-[#E8EEF4] font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Activity / Meal to Day {day}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {Object.keys(groupedByDay).length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Sparkles className="w-10 h-10 text-[#FF4D00] mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-base">
              No activities or meals match your filters
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your day or status filters, or click "+ Add
              Activity" to schedule a new experience or restaurant meal for this departure.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActDayFilter("All Days");
                setActStatusFilter("All Status");
                setActSearch("");
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* 5-STEP ADD ACTIVITY WIZARD MODAL */}
      <Activity5StepWizardModal
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onAddActivity={handleAddActivityFromWizard}
        daysList={daysAvailable.length > 0 ? daysAvailable : [1, 2, 3, 4, 5]}
        initialDay={wizardInitialDay}
        activitiesMasterList={authenticActivitiesMasterList}
        vendorsList={mappedVendorsForWizard}
        manifestPassengers={formattedManifest}
      />
    </div>
  );
}
