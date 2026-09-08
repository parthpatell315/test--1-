/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DepartureTransport — YouthCamping Admin
 * Transport tab: fleet, allocation rules, WhatsApp lists, room/seat assignments.
 * Logic (save, auto-allocate, copy lists) stays in DepartureHubPage.
 */
import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Copy,
  Plus,
  RefreshCw,
  Save,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { normalizeGenderCode } from "@/utils/passengerUtils";
import { isPassengerCancelled } from "@/utils/departure/passengerStatus";
import { isAllocOnFleet, withSequentialSeats } from "@/utils/departure/vehicleSeatAlloc";

const outlineBtn =
  "h-8 w-full sm:w-auto min-w-0 text-[12px] font-medium rounded-md border border-[#E8EEF4] bg-white text-[#0B1528] hover:bg-[#F4F7FB] px-3 inline-flex items-center justify-center gap-1.5 shadow-none transition-colors disabled:opacity-50";
const orangeBtn =
  "h-8 w-full sm:w-auto min-w-0 text-[12px] font-medium rounded-md bg-[#FF4D00] hover:bg-[#E04400] text-white px-3.5 inline-flex items-center justify-center gap-1.5 shadow-none transition-colors";
const fieldClass =
  "h-8 w-full min-w-0 text-[12px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none focus:ring-1 focus:ring-[#FF4D00]/30";
const fieldReadonly =
  "h-8 w-full min-w-0 text-[12px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-[#F8FAFC] text-slate-600 cursor-not-allowed";
const labelClass = "text-[11px] font-medium text-slate-500 block mb-1";
const nativeSelect =
  "h-8 w-full min-w-0 text-[12px] font-medium border border-[#E8EEF4] rounded-md px-2 bg-white text-[#0B1528] outline-none focus:ring-1 focus:ring-[#FF4D00]/30";
const inputText =
  "h-8 w-full min-w-0 text-[12px] font-medium border border-[#E8EEF4] rounded-md px-2.5 bg-white text-[#0B1528] outline-none focus:ring-1 focus:ring-[#FF4D00]/30 placeholder:text-slate-400";
const checkboxCls =
  "h-3.5 w-3.5 rounded border-[#E8EEF4] text-[#FF4D00] focus:ring-[#FF4D00] cursor-pointer shrink-0";

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="h-5 w-5 rounded-md border border-[#E8EEF4] bg-[#F8FAFC] text-[10px] font-semibold text-[#0B1528] inline-flex items-center justify-center tabular-nums shrink-0">
        {n}
      </span>
      <h3 className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
        {children}
      </h3>
    </div>
  );
}

export interface DepartureTransportProps {
  nameInputRef?: React.Ref<HTMLInputElement>;
  isSavingAllocations: boolean;
  isSavingRooms?: boolean;
  isSavingVehicles?: boolean;
  onSave: () => void;
  onSaveRooms?: () => void;
  onSaveVehicles?: () => void;
  onAutoAllocate?: () => void;
  onAutoAllocateRooms?: () => void;
  onAutoAllocateTempos?: () => void;
  onAddVehicle: (e: React.FormEvent) => void;
  onDeleteVehicle: (id: string) => void;
  onCopyTempoList: () => void;
  onCopyRoomList: () => void;
  onOpenShuffle: (traveler: { name: string; id?: string | null }) => void;
  allocFleet: any[];
  vendorDirectoryFleet: any[];
  fleetVehicles: any[];
  selectedVehicleId: string;
  setSelectedVehicleId: (v: string) => void;
  setNewVehicleType: (v: string) => void;
  newVehicleCapacity: string;
  setNewVehicleCapacity: (v: string) => void;
  newVehicleName: string;
  setNewVehicleName: (v: string) => void;
  newVehicleCost: string;
  setNewVehicleCost: (v: string) => void;
  newVehicleVendor: string;
  setNewVehicleVendor: (v: string) => void;
  setSelectedVendorId: (v: string) => void;
  sharingPref: string;
  setSharingPref: (v: string) => void;
  sameGenderEnforced: boolean;
  setSameGenderEnforced: (v: boolean) => void;
  prioritizeCouples: boolean;
  setPrioritizeCouples: (v: boolean) => void;
  fallbackToQuad: boolean;
  setFallbackToQuad: (v: boolean) => void;
  computedRoomAllocations: any[];
  computedVehicleAllocations: any[];
  allPassengers: any[];
  passengerAllocations?: Record<string, any>;
  setPassengerAllocations: React.Dispatch<
    React.SetStateAction<Record<string, { room: string; vehicle: string; seat: string }>>
  >;
  setManualRooms: React.Dispatch<React.SetStateAction<string[]>>;
  setAddRoomModalOpen: (open: boolean) => void;
  showClearAllocationsDialog: boolean;
  setShowClearAllocationsDialog: (open: boolean) => void;
  onClearAllocations: () => void;
}

export default function DepartureTransport({
  nameInputRef,
  isSavingAllocations,
  isSavingRooms = false,
  isSavingVehicles = false,
  onSave,
  onSaveRooms,
  onSaveVehicles,
  onAutoAllocate,
  onAutoAllocateRooms,
  onAutoAllocateTempos,
  onAddVehicle,
  onDeleteVehicle,
  onCopyTempoList,
  onCopyRoomList,
  onOpenShuffle,
  allocFleet,
  vendorDirectoryFleet,
  fleetVehicles,
  selectedVehicleId,
  setSelectedVehicleId,
  setNewVehicleType,
  newVehicleCapacity,
  setNewVehicleCapacity,
  newVehicleName,
  setNewVehicleName,
  newVehicleCost,
  setNewVehicleCost,
  newVehicleVendor,
  setNewVehicleVendor,
  setSelectedVendorId,
  sharingPref,
  setSharingPref,
  sameGenderEnforced,
  setSameGenderEnforced,
  prioritizeCouples,
  setPrioritizeCouples,
  fallbackToQuad,
  setFallbackToQuad,
  computedRoomAllocations,
  computedVehicleAllocations,
  allPassengers,
  passengerAllocations = {},
  setPassengerAllocations,
  setManualRooms,
  setAddRoomModalOpen,
  showClearAllocationsDialog,
  setShowClearAllocationsDialog,
  onClearAllocations,
}: DepartureTransportProps) {
  const [activeSubTab, setActiveSubTab] = useState<"fleet" | "passengers" | "matrix">("fleet");

  // Merge all vendor fleet items from Vendor Directory & Departure Fleet
  const allVendorOptions = React.useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    (vendorDirectoryFleet || []).forEach((vf: any) => {
      const key = `${vf.vendorId || vf.id}-${vf.vehicleType}-${vf.capacity}`;
      if (!seen.has(key)) {
        seen.add(key);
        const vName = vf.vendorName || "Vendor";
        const vType = vf.vehicleType || "Tempo";
        const cap = vf.capacity || 17;
        const cost = vf.cost || 0;
        list.push({
          id: vf.id,
          vendorId: vf.vendorId,
          vendorName: vName,
          vehicleType: vType,
          capacity: cap,
          cost: cost,
          label: vf.label || `${vName} — ${vType} (${cap} seats)${cost > 0 ? ` — ₹${Number(cost).toLocaleString("en-IN")}` : ""}`,
        });
      }
    });

    (fleetVehicles || []).forEach((fv: any) => {
      const key = `${fv.vendor?.id || fv.id}-${fv.vehicleType}-${fv.capacity}`;
      if (!seen.has(key)) {
        seen.add(key);
        const vName = fv.vendor?.name || fv.notes || "Vendor";
        const vType = fv.vehicleType || "Tempo";
        const cap = fv.capacity || 17;
        const cost = fv.tariff?.amount ?? fv.totalAmount;
        list.push({
          id: fv.id,
          vendorId: fv.vendor?.id || fv.vendorId,
          vendorName: vName,
          vehicleType: vType,
          capacity: cap,
          cost: cost,
          label: `${vName} — ${vType} (${cap} seats)${cost > 0 ? ` — ₹${Number(cost).toLocaleString("en-IN")}` : ""}`,
        });
      }
    });

    return list;
  }, [vendorDirectoryFleet, fleetVehicles]);

  const effectiveFleet = useMemo(() => {
    const rawFleet =
      allocFleet && allocFleet.length > 0
        ? allocFleet
        : fleetVehicles && fleetVehicles.length > 0
          ? fleetVehicles
          : [];

    return rawFleet.map((t: any, idx: number, arr: any[]) => {
      const baseName =
        t.name ||
        t.driverName ||
        (t.vendor?.name
          ? `${t.vendor.name} (${t.vehicleType || "Tempo"})`
          : `Tempo ${idx + 1}`);
      const sameCount = arr.filter(
        (x: any) =>
          (x.name || x.driverName || x.vendor?.name) ===
          (t.name || t.driverName || t.vendor?.name),
      ).length;
      const occurIdx = arr
        .slice(0, idx + 1)
        .filter(
          (x: any) =>
            (x.name || x.driverName || x.vendor?.name) ===
            (t.name || t.driverName || t.vendor?.name),
        ).length;
      const displayName =
        sameCount > 1 && !baseName.includes("#")
          ? `${baseName} #${occurIdx}`
          : baseName;
      return {
        id: t.id || `tempo-${idx + 1}`,
        name: displayName,
        vehicleType: t.vehicleType || "14 Seater Tempo Traveller",
        capacity: Number(t.capacity) || 14,
        cost: Number(t.totalAmount ?? t.cost ?? 0),
        vendor: t.vendor?.name || t.notes || "Self-driven",
      };
    });
  }, [allocFleet, fleetVehicles]);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
        <p className="text-[11px] text-slate-500 min-w-0">
          <span className="font-medium text-[#0B1528] tabular-nums">
            {effectiveFleet.length}
          </span>{" "}
          {effectiveFleet.length === 1 ? "vehicle" : "vehicles"} · room groups and
          seat allotments
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto min-w-0">
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingAllocations}
            className={outlineBtn}
          >
            {isSavingAllocations ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={1.75} />
            ) : (
              <Save className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
            )}
            {isSavingAllocations ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      <div
        id="transport-vehicle-fleet"
        className="bg-white border border-[#E8EEF4] rounded-xl p-3 sm:p-4 shadow-none space-y-3 min-w-0"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-[#E8EEF4] pb-2.5 min-w-0">
          <StepHeading n={1}>Vehicle fleet</StepHeading>
          <span className="text-[11px] text-slate-500">
            Tempos and cars for this departure
          </span>
        </div>

        <form
          onSubmit={onAddVehicle}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 items-end min-w-0"
        >
          <div className="md:col-span-1 min-w-0">
            <label htmlFor="transport-vehicle-type-select" className="block text-[11px] font-medium text-slate-700 mb-1">
              Vehicle type
            </label>
            <select
              id="transport-vehicle-type-select"
              name="vehicleType"
              aria-label="Vehicle type"
              value={selectedVehicleId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedVehicleId(val);
                if (val && val !== "custom") {
                  const item = allVendorOptions.find((v) => v.id === val);
                  if (item) {
                    setNewVehicleType(item.vehicleType || "Tempo");
                    setNewVehicleCapacity(String(item.capacity || 17));
                    setNewVehicleName(
                      `${item.vendorName || "Vendor"} ${item.vehicleType || "Tempo"}`,
                    );
                    setNewVehicleCost(
                      item.cost !== undefined && item.cost !== null && Number(item.cost) > 0
                        ? String(item.cost)
                        : "",
                    );
                    setNewVehicleVendor(
                      item.vendorName || "Vendor",
                    );
                    setSelectedVendorId(
                      item.vendorId || "",
                    );
                  }
                }
              }}
              className={nativeSelect}
            >
              <option value="">Select vendor vehicle...</option>
              {allVendorOptions.length > 0 ? (
                <optgroup label="Available Vendor Fleet (from Vendor Directory)">
                  {allVendorOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value="custom">+ Custom Entry</option>
            </select>
          </div>

          <div className="md:col-span-1 min-w-0">
            <label htmlFor="transport-vehicle-capacity-select" className="block text-[11px] font-medium text-slate-700 mb-1">
              Capacity
            </label>
            <select
              id="transport-vehicle-capacity-select"
              name="vehicleCapacity"
              aria-label="Vehicle capacity"
              value={newVehicleCapacity}
              onChange={(e) => setNewVehicleCapacity(e.target.value)}
              className={nativeSelect}
            >
              <option value="4">4 seats</option>
              <option value="6">6 seats</option>
              <option value="7">7 seats</option>
              <option value="10">10 seats</option>
              <option value="12">12 seats</option>
              <option value="14">14 seats</option>
              <option value="17">17 seats</option>
              <option value="20">20 seats</option>
              <option value="26">26 seats</option>
            </select>
          </div>

          <div className="md:col-span-1 min-w-0">
            <label htmlFor="transport-vehicle-name-input" className="block text-[11px] font-medium text-slate-700 mb-1">
              Name
            </label>
            <input
              ref={nameInputRef}
              id="transport-vehicle-name-input"
              name="vehicleName"
              aria-label="Vehicle name"
              type="text"
              placeholder="Tempo 1"
              value={newVehicleName}
              onChange={(e) => setNewVehicleName(e.target.value)}
              className={inputText}
            />
          </div>

          <div className="md:col-span-1 min-w-0">
            <label htmlFor="transport-vehicle-cost-input" className="block text-[11px] font-medium text-slate-700 mb-1">
              Cost (₹)
            </label>
            <input
              id="transport-vehicle-cost-input"
              name="vehicleCost"
              aria-label="Vehicle cost in rupees"
              type="number"
              placeholder="45000"
              value={newVehicleCost}
              onChange={(e) => setNewVehicleCost(e.target.value)}
              className={inputText}
            />
          </div>

          <div className="md:col-span-1 min-w-0">
            <label htmlFor="transport-vehicle-vendor-input" className="block text-[11px] font-medium text-slate-700 mb-1">
              Vendor
            </label>
            <input
              id="transport-vehicle-vendor-input"
              name="vehicleVendor"
              aria-label="Vehicle vendor name"
              type="text"
              placeholder="ABC Travels"
              value={newVehicleVendor}
              onChange={(e) => setNewVehicleVendor(e.target.value)}
              className={inputText}
            />
          </div>

          <div className="md:col-span-1 min-w-0">
            <button
              type="submit"
              className={cn(outlineBtn, "w-full justify-center")}
            >
              <Plus className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
              Add
            </button>
          </div>
        </form>

        {effectiveFleet.length === 0 ? (
          <p className="text-[12px] text-slate-400 py-3 text-center">
            No vehicles assigned. Select a vendor vehicle above or create a custom one.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {effectiveFleet.map((v) => (
              <div
                key={v.id}
                className="border border-[#E8EEF4] rounded-lg p-3 bg-white flex items-start justify-between gap-2 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#0B1528] truncate">
                    {v.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {v.vehicleType} · {v.capacity} seats
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {v.cost ? `₹${Number(v.cost).toLocaleString("en-IN")}` : "—"} ·{" "}
                    {v.vendor || "Self-driven"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteVehicle(v.id)}
                  className="text-slate-400 hover:text-[#FF4D00] transition-colors p-1 rounded-md hover:bg-[#F4F7FB] shrink-0"
                  aria-label={`Remove vehicle ${v.name}`}
                >
                  <Trash className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 sm:p-4 shadow-none space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-[#E8EEF4] pb-2.5 min-w-0">
          <StepHeading n={2}>Allocation rules</StepHeading>
          <span className="text-[11px] text-slate-500">
            Room sharing preferences
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="transport-room-sharing-select" className="block text-[11px] font-medium text-slate-700 mb-1">
              Room sharing size
            </label>
            <select
              id="transport-room-sharing-select"
              name="roomSharingSize"
              aria-label="Room sharing size"
              value={sharingPref}
              onChange={(e) => setSharingPref(e.target.value)}
              className={nativeSelect}
            >
              <option value="2">Double (2 per room)</option>
              <option value="3">Triple (3 per room)</option>
              <option value="4">Quad (4 per room)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="same-gender"
              checked={sameGenderEnforced}
              onChange={(e) => setSameGenderEnforced(e.target.checked)}
              className={checkboxCls}
            />
            <label
              htmlFor="same-gender"
              className="text-[11px] font-medium text-slate-700 cursor-pointer"
            >
              Separate by gender
            </label>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="prioritize-couples"
              checked={prioritizeCouples}
              onChange={(e) => setPrioritizeCouples(e.target.checked)}
              className={checkboxCls}
            />
            <label
              htmlFor="prioritize-couples"
              className="text-[11px] font-medium text-slate-700 cursor-pointer"
            >
              Prioritize couples
            </label>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="fallback-quad"
              checked={fallbackToQuad}
              onChange={(e) => setFallbackToQuad(e.target.checked)}
              className={checkboxCls}
            />
            <label
              htmlFor="fallback-quad"
              className="text-[11px] font-medium text-slate-700 cursor-pointer"
            >
              Fallback to Quad
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0 shadow-none">
        <div className="min-w-0">
          <StepHeading n={3}>WhatsApp lists</StepHeading>
          <p className="text-[11px] text-slate-500 mt-1 md:pl-7">
            Copy into the departure group
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto min-w-0">
          <button type="button" onClick={onCopyTempoList} className={outlineBtn}>
            <Copy className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
            Copy tempo list
          </button>
          <button type="button" onClick={onCopyRoomList} className={outlineBtn}>
            <Copy className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
            Copy room list
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
        <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 sm:p-4 shadow-none space-y-3 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8EEF4] pb-2.5 min-w-0">
            <h3 className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
              Hotel group assignments
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setAddRoomModalOpen(true)}
                className={cn(outlineBtn, "h-7 px-2 text-[11px]")}
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
                Add room
              </button>
              <button
                type="button"
                onClick={onAutoAllocateRooms || onAutoAllocate}
                className={cn(outlineBtn, "h-7 px-2 text-[11px] text-[#0B1528] hover:bg-[#F4F7FB]")}
              >
                <RefreshCw className="w-3 h-3 shrink-0 text-slate-400" strokeWidth={1.75} />
                Auto-allocate Rooms
              </button>
              <button
                type="button"
                onClick={onSaveRooms || onSave}
                disabled={isSavingRooms || isSavingAllocations}
                className={cn(outlineBtn, "h-7 px-2.5 text-[11px] bg-[#0B1528] text-white hover:bg-[#16253d] border-[#0B1528]")}
              >
                {isSavingRooms ? (
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" strokeWidth={1.75} />
                ) : (
                  <Save className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                )}
                {isSavingRooms ? "Saving…" : "Save Room List"}
              </button>
            </div>
          </div>
          {computedRoomAllocations.length === 0 ? (
            <p className="text-[12px] text-slate-400 py-6 text-center">
              No room groups yet. Auto-allocate or add a room.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(
                computedRoomAllocations.reduce((acc: Record<string, any>, r) => {
                  if (!acc[r.roomNumber])
                    acc[r.roomNumber] = {
                      type: r.roomType,
                      members: [],
                      passengerIds: [],
                      genders: [],
                      rawGenders: [],
                    };
                  acc[r.roomNumber].members.push(r.travelerName);
                  acc[r.roomNumber].passengerIds.push(r.passengerId);
                  acc[r.roomNumber].genders.push(r.genderGroup);
                  acc[r.roomNumber].rawGenders.push(r.rawGender);
                  return acc;
                }, {}),
              ).map(([roomNum, rData]: any) => (
                <div
                  key={roomNum}
                  className="border border-[#E8EEF4] rounded-lg p-3 bg-white min-w-0"
                >
                  <p className="text-[11px] font-medium text-[#0B1528] flex items-center justify-between border-b border-[#E8EEF4] pb-1.5 gap-2 min-w-0">
                    <span>{roomNum}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManualRooms((prev) => prev.filter((r) => r !== roomNum));
                        setPassengerAllocations((prev) => {
                          const updated = { ...prev };
                          rData.members.forEach((mName: string, mIdx: number) => {
                            const passId = rData.passengerIds
                              ? rData.passengerIds[mIdx]
                              : null;
                            if (updated[mName]) {
                              updated[mName] = { ...updated[mName], room: "—" };
                            }
                            if (passId && updated[passId]) {
                              updated[passId] = { ...updated[passId], room: "—" };
                            }
                            const pObj = allPassengers.find(
                              (p: any) =>
                                p.name === mName || (passId && p.id === passId),
                            );
                            if (pObj) {
                              if (pObj.id && updated[pObj.id])
                                updated[pObj.id] = { ...updated[pObj.id], room: "—" };
                              if (pObj.name && updated[pObj.name])
                                updated[pObj.name] = {
                                  ...updated[pObj.name],
                                  room: "—",
                                };
                            }
                          });
                          return updated;
                        });
                        toast.success(`Deleted room: ${roomNum}`);
                      }}
                      className="text-slate-400 hover:text-[#FF4D00] transition-colors p-0.5 rounded-md hover:bg-[#F4F7FB]"
                      aria-label={`Remove ${roomNum}`}
                    >
                      <Trash className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </p>
                  <ul
                    className="mt-2 space-y-1.5 min-h-[40px] rounded p-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const travelerName = e.dataTransfer.getData("travelerName");
                      const passengerId = e.dataTransfer.getData("passengerId");
                      if (!travelerName && !passengerId) return;
                      setPassengerAllocations((prev) => {
                        const pObj = allPassengers.find(
                          (p: any) =>
                            (passengerId && p.id === passengerId) ||
                            (travelerName && p.name === travelerName) ||
                            (travelerName &&
                              p.name?.toLowerCase() === travelerName.toLowerCase()),
                        );
                        const current =
                          (pObj?.id && prev[pObj.id]) ||
                          (pObj?.name && prev[pObj.name]) ||
                          prev[travelerName] || {
                            room: "—",
                            vehicle: "—",
                            seat: "—",
                          };
                        const entry = { ...current, room: roomNum };
                        const updated = { ...prev, [travelerName]: entry };
                        if (pObj) {
                          if (pObj.id) updated[pObj.id] = { ...entry };
                          if (pObj.name) updated[pObj.name] = { ...entry };
                        }
                        return updated;
                      });
                      toast.success(`Moved ${travelerName} to ${roomNum}`);
                    }}
                  >
                    {rData.members.filter(Boolean).map((m: string, i: number) => {
                      const passId = rData.passengerIds
                        ? rData.passengerIds[i]
                        : null;
                      const isFemale =
                        normalizeGenderCode(rData.rawGenders[i], m) === "F";
                      const dotColor = isFemale ? "bg-pink-500" : "bg-blue-500";
                      return (
                        <li
                          key={i}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("travelerName", m);
                            if (passId) {
                              e.dataTransfer.setData("passengerId", passId);
                            } else {
                              const pObj = allPassengers.find(
                                (p: any) => p.name === m,
                              );
                              if (pObj?.id)
                                e.dataTransfer.setData("passengerId", pObj.id);
                            }
                          }}
                          className="text-[12px] font-medium text-[#0B1528] flex items-center gap-1.5 cursor-pointer hover:text-[#FF4D00] transition-colors bg-white px-2 py-1 rounded-md border border-[#E8EEF4] select-none min-w-0"
                          onClick={() => onOpenShuffle({ name: m, id: passId })}
                        >
                          <span
                            className={`h-1.5 w-1.5 ${dotColor} rounded-full shrink-0`}
                          />
                          {m}
                        </li>
                      );
                    })}
                    {rData.members.filter(Boolean).length === 0 && (
                      <li className="text-[11px] text-slate-400 py-1 text-center">
                        Empty room
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E8EEF4] rounded-xl p-3 sm:p-4 shadow-none space-y-3 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8EEF4] pb-2.5 min-w-0">
            <h3 className="text-[11px] font-semibold text-[#0B1528] tracking-wide">
              Transport assignments
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={onAutoAllocateTempos || onAutoAllocate}
                className={cn(outlineBtn, "h-7 px-2 text-[11px] text-[#0B1528] hover:bg-[#F4F7FB]")}
              >
                <RefreshCw className="w-3 h-3 shrink-0 text-slate-400" strokeWidth={1.75} />
                Auto-allocate Tempos
              </button>
              <button
                type="button"
                onClick={onSaveVehicles || onSave}
                disabled={isSavingVehicles || isSavingAllocations}
                className={cn(orangeBtn, "h-7 px-2.5 text-[11px] bg-[#FF4D00] hover:bg-[#E04500]")}
              >
                {isSavingVehicles ? (
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" strokeWidth={1.75} />
                ) : (
                  <Save className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                )}
                {isSavingVehicles ? "Saving…" : "Save Tempo List"}
              </button>
            </div>
          </div>

          {effectiveFleet.length === 0 ? (
            <p className="text-[12px] text-slate-400 py-6 text-center">
              No vehicles in fleet. Add a vehicle above, then auto-allocate.
            </p>
          ) : (
            <div className="space-y-3">
              {effectiveFleet.map((fleetItem: any, fleetIdx: number) => {
                const fleetId = fleetItem.id || `tempo-${fleetIdx + 1}`;
                const fleetName = fleetItem.name || `Tempo ${fleetIdx + 1}`;

                const travelers = allPassengers
                  .filter((p: any) => {
                    if (isPassengerCancelled(p)) return false;
                    const alloc =
                      passengerAllocations[p.id] ||
                      passengerAllocations[p.name] ||
                      passengerAllocations[(p.name || "").trim().toLowerCase()];
                    return isAllocOnFleet(alloc, fleetItem, fleetIdx, effectiveFleet);
                  })
                  .map((p: any) => {
                    const alloc =
                      passengerAllocations[p.id] ||
                      passengerAllocations[p.name] ||
                      passengerAllocations[(p.name || "").trim().toLowerCase()];
                    const isFemale = normalizeGenderCode(p.gender, p.name) === "F";
                    return {
                      fleetId,
                      vehicleName: fleetName,
                      vehicle: fleetName,
                      seatNumber: alloc?.seat && alloc.seat !== "—" ? String(alloc.seat) : "—",
                      travelerName: p.name,
                      passengerId: p.id,
                      rawGender: isFemale ? "Female" : "Male",
                    };
                  });
                const seatedTravelers = withSequentialSeats(travelers);
                const capacity = Number(fleetItem.capacity) || 14;
                const isOverCapacity = seatedTravelers.length > capacity;

                return (
                  <div
                    key={fleetId}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const travelerName = e.dataTransfer.getData("travelerName");
                      const passengerId = e.dataTransfer.getData("passengerId");
                      if (!travelerName && !passengerId) return;
                      setPassengerAllocations((prev) => {
                        const pObj = allPassengers.find(
                          (p: any) =>
                            (passengerId && p.id === passengerId) ||
                            (travelerName && p.name === travelerName) ||
                            (travelerName &&
                              p.name?.toLowerCase() === travelerName.toLowerCase()),
                        );
                        const current =
                          (pObj?.id && prev[pObj.id]) ||
                          (pObj?.name && prev[pObj.name]) ||
                          prev[travelerName] || {
                            room: "—",
                            vehicle: "—",
                            seat: "—",
                          };
                        const nextSeat = String(seatedTravelers.length + 1);
                        const entry = {
                          ...current,
                          vehicle: fleetName,
                          fleetId: fleetId,
                          seat: nextSeat,
                        };
                        const updated = { ...prev, [travelerName]: entry };
                        if (pObj) {
                          if (pObj.id) updated[pObj.id] = { ...entry };
                          if (pObj.name) updated[pObj.name] = { ...entry };
                        }
                        return updated;
                      });
                      toast.success(`Moved ${travelerName} to ${fleetName}`);
                    }}
                    className={cn(
                      "border rounded-lg p-3 bg-white min-w-0 transition-colors",
                      isOverCapacity ? "border-amber-300 bg-amber-50/20" : "border-[#E8EEF4]",
                    )}
                  >
                    <p className="text-[11px] font-medium text-[#0B1528] flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0 font-semibold">
                        {fleetName}{" "}
                        <span className="font-normal text-slate-500">
                          ({fleetItem.vehicleType || "Tempo"})
                        </span>
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-medium tabular-nums shrink-0 px-2 py-0.5 rounded-full border",
                          isOverCapacity
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : "bg-[#F8FAFC] border-[#E8EEF4] text-slate-600",
                        )}
                      >
                        {seatedTravelers.length} / {capacity} seats
                      </span>
                    </p>

                    {seatedTravelers.length === 0 ? (
                      <div className="mt-2.5 py-6 border border-dashed border-slate-200 rounded-md text-center text-[11px] text-slate-400">
                        0 passengers assigned · Drag and drop passengers here to move to this tempo
                      </div>
                    ) : (
                      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 min-h-[40px]">
                        {seatedTravelers.map((t: any) => {
                            const isFemale =
                              normalizeGenderCode(t.rawGender, t.travelerName) === "F";
                            const theme = isFemale
                              ? "text-pink-600 bg-pink-50 border-pink-100"
                              : "text-blue-600 bg-blue-50 border-blue-100";
                            const seatDisplay = t.displaySeat;
                            return (
                              <div
                                key={t.passengerId || `${t.travelerName}-${t.displaySeat}`}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    "travelerName",
                                    t.travelerName,
                                  );
                                  if (t.passengerId) {
                                    e.dataTransfer.setData(
                                      "passengerId",
                                      t.passengerId,
                                    );
                                  } else {
                                    const pObj = allPassengers.find(
                                      (p: any) => p.name === t.travelerName,
                                    );
                                    if (pObj?.id)
                                      e.dataTransfer.setData(
                                        "passengerId",
                                        pObj.id,
                                      );
                                  }
                                }}
                                className="text-[12px] font-medium text-[#0B1528] flex items-center gap-2 cursor-grab active:cursor-grabbing hover:text-[#FF4D00] hover:border-[#FF4D00]/40 transition-colors bg-white px-2.5 py-1.5 rounded-md border border-[#E8EEF4] select-none min-w-0 shadow-xs"
                                onClick={() =>
                                  onOpenShuffle({
                                    name: t.travelerName,
                                    id: t.passengerId,
                                  })
                                }
                              >
                                <span
                                  className={`text-[10px] font-semibold font-mono ${theme} border min-w-[28px] h-5 px-1 inline-flex items-center justify-center rounded-md shrink-0 tabular-nums text-center`}
                                >
                                  #{seatDisplay}
                                </span>
                                <span className="truncate min-w-0 flex-1">
                                  {t.travelerName}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end min-w-0">
        <button
          type="button"
          onClick={() => setShowClearAllocationsDialog(true)}
          className={cn(outlineBtn, "text-slate-500")}
        >
          Clear allocations
        </button>
      </div>

      {showClearAllocationsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-[#E8EEF4] rounded-xl p-5 shadow-lg w-full max-w-sm space-y-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-[#F4F7FB] border border-[#E8EEF4] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#FF4D00]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#0B1528]">
                  Clear all allocations?
                </p>
                <p className="text-[12px] text-slate-500 mt-1">
                  This cancels active room and vehicle allocations for this
                  departure. It cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1 justify-end">
              <button
                type="button"
                onClick={() => setShowClearAllocationsDialog(false)}
                className={outlineBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingAllocations}
                onClick={onClearAllocations}
                className={orangeBtn}
              >
                {isSavingAllocations ? "Clearing…" : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
