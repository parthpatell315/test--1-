/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import {
  X,
  Hotel,
  Bus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Building,
  Phone,
  Calendar,
  Users,
  MapPin,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MealsMenuBody } from "./TripControlMeals";

export interface TripControlRowData {
  dayNum: number;
  itineraryId?: string;
  dateStr: string;
  dayLabel: string;
  destination: string;
  planTitle?: string;
  isNightJourney?: boolean;
  paxCount: number;
  hotelName: string;
  hotelPhone: string;
  hotelStatus: "BOOKED" | "PENDING" | "CANCELLED" | "NOT REQUIRED";
  hotelBookingRef?: any;
  transportName: string;
  transportLines?: string[];
  transportShortLines?: Array<{ short: string; title: string }>;
  transportPhone?: string;
  transportStatus: "BOOKED" | "PENDING" | "NOT REQUIRED" | "NOT ASSIGNED";
  guideName: string;
  guidePhone: string;
  guideStatus?: "BOOKED" | "PENDING" | "NOT REQUIRED" | "NOT ASSIGNED";
  checkInStatus: "CHECKED-IN" | "PENDING" | "NOT REQUIRED";
  remark: string;
  remarkDisplay?: string;
  mealSummary?: string;
  mealGroups?: Array<{ type: string; dishes: string }>;
  mealSource?: "vendor" | "itinerary" | "none";
  mealMenu?: {
    vendorName: string;
    mealPlanLabel?: string;
    items: Array<{
      name: string;
      type: string;
      inclusions: string;
      ratePerPerson?: number;
      isVeg?: boolean;
    }>;
  } | null;
}

interface TripControlRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: TripControlRowData | null;
  leadTransportName?: string;
  leadGuideName?: string;
  leadGuidePhone?: string;
  onEditHotel: (row: TripControlRowData) => void;
  onChangeTransport: (row: TripControlRowData) => void;
  onAssignGuide: (row: TripControlRowData) => void;
  onToggleCheckIn: (row: TripControlRowData, newStatus: "CHECKED-IN" | "PENDING" | "NOT REQUIRED") => void;
  onSaveRemark: (row: TripControlRowData, remark: string) => void;
  onSaveDayDetail: (row: TripControlRowData, field: "vehicleType" | "guideDriverDetails", value: string) => void;
}

export default function TripControlRowDrawer({
  isOpen,
  onClose,
  rowData,
  leadTransportName,
  leadGuideName,
  leadGuidePhone,
  onEditHotel,
  onChangeTransport,
  onAssignGuide,
  onToggleCheckIn,
  onSaveRemark,
  onSaveDayDetail,
}: TripControlRowDrawerProps) {
  const [remarkInput, setRemarkInput] = useState(rowData?.remark || "");
  const [transportInput, setTransportInput] = useState(rowData?.transportName || "");
  const [guideInput, setGuideInput] = useState(rowData?.guideName || "");

  React.useEffect(() => {
    if (rowData) {
      setRemarkInput(rowData.remark || "");
      setTransportInput(rowData.transportName !== "—" && !rowData.transportName.toLowerCase().includes("not required") ? rowData.transportName : "");
      setGuideInput(rowData.guideName !== "—" && !rowData.guideName.toLowerCase().includes("not required") ? rowData.guideName : "");
    }
  }, [rowData]);

  if (!rowData) return null;

  const isTransportIncluded = rowData.transportStatus === "BOOKED" && rowData.transportName !== "—" && !rowData.transportName.toLowerCase().includes("not required");
  const isGuideIncluded = rowData.guideName !== "—" && !rowData.guideName.toLowerCase().includes("not required") && rowData.guideStatus !== "NOT REQUIRED";

  const defaultTransport = leadTransportName && leadTransportName !== "—" ? leadTransportName : "17 Seater Tempo";
  const defaultGuide = leadGuideName && leadGuideName !== "—" ? leadGuideName : "Lead Guide";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md bg-white p-0 border-l border-slate-200 flex flex-col h-full shadow-2xl">
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-[#FF4D00] text-white hover:bg-[#FF4D00] font-bold text-[10px] uppercase tracking-wider">
              {rowData.dayLabel}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{rowData.dateStr}</span>
            </div>
          </div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#FF4D00]" />
            {rowData.destination}
          </h2>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-medium">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              {rowData.paxCount} Pax
            </span>
          </div>
        </div>

        {/* Drawer Scroll Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* SECTION 1: HOTEL SUMMARY */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#FF4D00]" /> Hotel Booking
              </span>
              <Badge
                className={cn(
                  "text-[10px] font-extrabold uppercase px-2 py-0.5 border",
                  rowData.hotelStatus === "BOOKED"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : rowData.hotelStatus === "CANCELLED"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : rowData.hotelStatus === "NOT REQUIRED"
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {rowData.hotelStatus}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{rowData.hotelName || "No Hotel Assigned"}</p>
              {rowData.hotelPhone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {rowData.hotelPhone}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onEditHotel(rowData);
              }}
              className="w-full h-8 text-xs font-bold border-slate-300 text-slate-700 hover:bg-white hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors"
            >
              <Hotel className="w-3.5 h-3.5 mr-1.5" /> Edit Hotel Assignment
            </Button>
          </div>

          {(rowData.mealGroups || []).length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Food menu
              </span>
              <MealsMenuBody
                groups={rowData.mealGroups || []}
                vendorName={rowData.mealMenu?.vendorName}
                source={rowData.mealSource}
              />
            </div>
          )}

          {/* SECTION 2: TRANSPORT FLEET */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-[#FF4D00]" /> Transport Fleet
              </span>
              <Badge
                className={cn(
                  "text-[10px] font-extrabold uppercase px-2 py-0.5 border",
                  isTransportIncluded
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                )}
              >
                {isTransportIncluded ? "BOOKED / INCLUDED" : "NOT REQUIRED"}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {isTransportIncluded ? rowData.transportName : "— (No Transport Required on this day)"}
              </p>
            </div>

            {/* Quick action buttons: Included vs Not Required */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSaveDayDetail(rowData, "vehicleType", defaultTransport)}
                className={cn(
                  "h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 px-2",
                  isTransportIncluded
                    ? "bg-green-600 text-white border-transparent shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-green-50 hover:border-green-200"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Included</span>
              </button>

              <button
                type="button"
                onClick={() => onSaveDayDetail(rowData, "vehicleType", "—")}
                className={cn(
                  "h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 px-2",
                  !isTransportIncluded
                    ? "bg-slate-600 text-white border-transparent shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Not Required</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Custom Vehicle / Driver Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={transportInput}
                  onChange={(e) => setTransportInput(e.target.value)}
                  placeholder={`e.g. ${defaultTransport}`}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-white focus:outline-none focus:border-[#FF4D00]"
                />
                <Button
                  size="sm"
                  onClick={() => onSaveDayDetail(rowData, "vehicleType", transportInput.trim() || defaultTransport)}
                  className="h-[34px] px-3 bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 3: GUIDE / DRIVER */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#FF4D00]" /> Guide / Driver
              </span>
              <Badge
                className={cn(
                  "text-[10px] font-extrabold uppercase px-2 py-0.5 border",
                  isGuideIncluded
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                )}
              >
                {isGuideIncluded ? "BOOKED / INCLUDED" : "NOT REQUIRED"}
              </Badge>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {isGuideIncluded ? rowData.guideName : "— (No Guide Required on this day)"}
              </p>
              {isGuideIncluded && (rowData.guidePhone || leadGuidePhone) && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" /> {rowData.guidePhone || leadGuidePhone}
                </p>
              )}
            </div>

            {/* Quick action buttons: Included vs Not Required */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSaveDayDetail(rowData, "guideDriverDetails", defaultGuide)}
                className={cn(
                  "h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 px-2",
                  isGuideIncluded
                    ? "bg-green-600 text-white border-transparent shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-green-50 hover:border-green-200"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Included</span>
              </button>

              <button
                type="button"
                onClick={() => onSaveDayDetail(rowData, "guideDriverDetails", "—")}
                className={cn(
                  "h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 px-2",
                  !isGuideIncluded
                    ? "bg-slate-600 text-white border-transparent shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Not Required</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Custom Guide Name / Details</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guideInput}
                  onChange={(e) => setGuideInput(e.target.value)}
                  placeholder={`e.g. ${defaultGuide}`}
                  className="w-full text-xs p-2 border border-slate-200 rounded bg-white focus:outline-none focus:border-[#FF4D00]"
                />
                <Button
                  size="sm"
                  onClick={() => onSaveDayDetail(rowData, "guideDriverDetails", guideInput.trim() || defaultGuide)}
                  className="h-[34px] px-3 bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 4: HOTEL CHECK-IN UPDATE */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Hotel Check-in Update
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CHECKED-IN", label: "Checked In", color: "bg-green-600 text-white" },
                { id: "PENDING", label: "Pending", color: "bg-amber-500 text-white" },
                { id: "NOT REQUIRED", label: "N/A", color: "bg-slate-500 text-white" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onToggleCheckIn(rowData, st.id as any)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-bold transition-all border",
                    rowData.checkInStatus === st.id
                      ? `${st.color} border-transparent shadow-xs`
                      : "bg-[#F4F7FB] text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 5: OPERATIONAL REMARK */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#FF4D00]" /> Operational Remark
            </label>
            <textarea
              rows={3}
              value={remarkInput}
              onChange={(e) => setRemarkInput(e.target.value)}
              placeholder="Ops note for this day only — e.g. late train, room upgrade, guest arriving separately"
              className="w-full text-xs p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#FF4D00] text-slate-800"
            />
            <Button
              size="sm"
              onClick={() => onSaveRemark(rowData, remarkInput)}
              className="w-full h-8 text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-lg shadow-sm"
            >
              Save Operational Remark
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

