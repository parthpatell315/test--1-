import React, { useEffect, useState } from "react";
import api from "@/services/api";
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
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  MapPin,
  Car,
  Layers,
  CheckCircle2,
  XCircle,
  Bus,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface VehicleMaster {
  id: string;
  vehicleName: string;
  vehicleCode?: string;
  plateNumber?: string;
  vehicleCategory: string;
  advertisedCapacity: number;
  sellableSeats: number;
  hasAC: boolean;
  fuelType?: string;
  isActive: boolean;
}

interface VehicleRate {
  id: string;
  routePricingGroupId: string;
  vehicleId: string;
  vehicleNameSnapshot: string;
  totalVehicleAmount: number;
  sellableSeats: number;
  suggestedPP?: number;
  negotiatedPP?: number;
  minimumPassengers?: number;
  maximumPassengers?: number;
  extraPickupDropAmount: number;
  extraDayAmount: number;
  notes?: string;
  isActive: boolean;
  vehicle?: VehicleMaster;
}

interface RoutePricingGroup {
  id: string;
  vendorId: string;
  routeName: string;
  tripName?: string;
  pickupLocation: string;
  dropLocation: string;
  destination?: string;
  season?: string;
  durationDays: number;
  durationNights: number;
  pickupDropIncluded: boolean;
  notes?: string;
  isActive: boolean;
  vehicleRates: VehicleRate[];
}

interface RoutePricingTabProps {
  vendorId: string;
  vendorName: string;
}

export const RoutePricingTab: React.FC<RoutePricingTabProps> = ({
  vendorId,
  vendorName,
}) => {
  const [groups, setGroups] = useState<RoutePricingGroup[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [loading, setLoading] = useState(true);

  // Master Vehicle Modal
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleMaster | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleName: "",
    vehicleCategory: "TEMPO_TRAVELLER",
    advertisedCapacity: "17",
    sellableSeats: "16",
    hasAC: true,
    plateNumber: "",
    fuelType: "Diesel",
  });

  // Group Modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RoutePricingGroup | null>(null);
  const [groupForm, setGroupForm] = useState({
    routeName: "",
    tripName: "",
    pickupLocation: "",
    dropLocation: "",
    destination: "",
    season: "WINTER",
    durationDays: "8",
    durationNights: "7",
    pickupDropIncluded: true,
    notes: "",
  });

  // Rate Modal
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<VehicleRate | null>(null);
  const [rateForm, setRateForm] = useState({
    vehicleId: "",
    totalVehicleAmount: "",
    sellableSeats: "",
    negotiatedPP: "",
    extraPickupDropAmount: "0",
    extraDayAmount: "0",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, vehiclesRes] = await Promise.all([
        api.get(`/vendors/directory/${vendorId}/route-pricing`),
        api.get(`/vendors/directory/${vendorId}/vehicles`),
      ]);
      if (groupsRes.data?.success) setGroups(groupsRes.data.data);
      if (vehiclesRes.data?.success && Array.isArray(vehiclesRes.data.data)) {
        setVehicles(vehiclesRes.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) loadData();
  }, [vendorId]);

  // Handle Save Master Vehicle
  const handleSaveVehicleMaster = async () => {
    if (!vehicleForm.vehicleName) {
      toast.error("Vehicle name is required");
      return;
    }
    const cap = parseInt(vehicleForm.advertisedCapacity) || 1;
    const sell = parseInt(vehicleForm.sellableSeats) || cap;
    if (sell > cap) {
      toast.error("Sellable seats cannot exceed advertised capacity");
      return;
    }

    try {
      if (editingVehicle) {
        await api.patch(`/vendors/directory/vehicles/${editingVehicle.id}`, {
          vehicleName: vehicleForm.vehicleName,
          vehicleCategory: vehicleForm.vehicleCategory,
          advertisedCapacity: cap,
          sellableSeats: sell,
          hasAC: vehicleForm.hasAC,
          plateNumber: vehicleForm.plateNumber,
          fuelType: vehicleForm.fuelType,
        });
        toast.success("Vehicle updated in master fleet");
      } else {
        await api.post(`/vendors/directory/${vendorId}/vehicles`, {
          vehicleName: vehicleForm.vehicleName,
          vehicleCategory: vehicleForm.vehicleCategory,
          advertisedCapacity: cap,
          sellableSeats: sell,
          hasAC: vehicleForm.hasAC,
          plateNumber: vehicleForm.plateNumber,
          fuelType: vehicleForm.fuelType,
        });
        toast.success("Vehicle added to master fleet");
      }
      setVehicleModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save vehicle");
    }
  };

  // Handle Delete Master Vehicle
  const handleDeleteVehicleMaster = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from master fleet?`)) return;
    try {
      await api.delete(`/vendors/directory/vehicles/${id}`);
      toast.success("Vehicle removed from master fleet");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete vehicle");
    }
  };

  // Handle Save Group
  const handleSaveGroup = async () => {
    if (!groupForm.routeName || !groupForm.pickupLocation || !groupForm.dropLocation) {
      toast.error("Please fill in Route Name, Pickup, and Drop locations");
      return;
    }
    try {
      if (editingGroup) {
        await api.patch(`/vendors/directory/route-pricing/${editingGroup.id}`, {
          ...groupForm,
          durationDays: parseInt(groupForm.durationDays) || 1,
          durationNights: parseInt(groupForm.durationNights) || 0,
        });
        toast.success("Route contract updated");
      } else {
        await api.post(`/vendors/directory/${vendorId}/route-pricing`, {
          ...groupForm,
          durationDays: parseInt(groupForm.durationDays) || 1,
          durationNights: parseInt(groupForm.durationNights) || 0,
        });
        toast.success("Route contract created");
      }
      setGroupModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save group");
    }
  };

  // Duplicate Group
  const handleDuplicateGroup = async (groupId: string) => {
    try {
      await api.post(`/vendors/directory/route-pricing/${groupId}/duplicate`);
      toast.success("Route contract duplicated (draft)");
      loadData();
    } catch (err: any) {
      toast.error("Failed to duplicate group");
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId: string, routeName: string) => {
    if (!confirm(`Permanently delete route contract "${routeName}" and all its vehicle rates?`)) return;
    try {
      await api.delete(`/vendors/directory/route-pricing/${groupId}`);
      toast.success("Route contract deleted successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete route contract");
    }
  };

  // Toggle Group Status
  const handleToggleGroupStatus = async (group: RoutePricingGroup) => {
    try {
      await api.patch(`/vendors/directory/route-pricing/${group.id}`, {
        isActive: !group.isActive,
      });
      toast.success(`Contract ${!group.isActive ? "activated" : "deactivated"}`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  // Save Rate
  const handleSaveRate = async () => {
    if (!editingRate && !rateForm.vehicleId) {
      toast.error("Please select a vehicle from master");
      return;
    }
    if (!rateForm.totalVehicleAmount || parseFloat(rateForm.totalVehicleAmount) < 0) {
      toast.error("Please enter a valid Total Vehicle Amount");
      return;
    }
    try {
      if (editingRate) {
        await api.patch(`/vendors/directory/route-pricing/rates/${editingRate.id}`, {
          totalVehicleAmount: parseFloat(rateForm.totalVehicleAmount),
          sellableSeats: parseInt(rateForm.sellableSeats) || 1,
          negotiatedPP: rateForm.negotiatedPP ? parseFloat(rateForm.negotiatedPP) : null,
          extraPickupDropAmount: parseFloat(rateForm.extraPickupDropAmount) || 0,
          extraDayAmount: parseFloat(rateForm.extraDayAmount) || 0,
          notes: rateForm.notes,
        });
        toast.success("Vehicle rate updated");
      } else if (activeGroupId) {
        await api.post(`/vendors/directory/route-pricing/${activeGroupId}/rates`, {
          vehicleId: rateForm.vehicleId,
          totalVehicleAmount: parseFloat(rateForm.totalVehicleAmount),
          sellableSeats: parseInt(rateForm.sellableSeats) || undefined,
          negotiatedPP: rateForm.negotiatedPP ? parseFloat(rateForm.negotiatedPP) : undefined,
          extraPickupDropAmount: parseFloat(rateForm.extraPickupDropAmount) || 0,
          extraDayAmount: parseFloat(rateForm.extraDayAmount) || 0,
          notes: rateForm.notes,
        });
        toast.success("Vehicle rate added to contract");
      }
      setRateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save rate");
    }
  };

  // Delete Rate
  const handleDeleteRate = async (rateId: string, vehicleName: string) => {
    if (!confirm(`Deactivate rate for "${vehicleName}"?`)) return;
    try {
      await api.delete(`/vendors/directory/route-pricing/rates/${rateId}`);
      toast.success("Vehicle rate deactivated");
      loadData();
    } catch (err: any) {
      toast.error("Failed to deactivate rate");
    }
  };

  const selectedMasterVehicle = vehicles.find((v) => v.id === rateForm.vehicleId);
  const currentTotalAmount = parseFloat(rateForm.totalVehicleAmount) || 0;
  const currentSellableSeats = parseInt(rateForm.sellableSeats) || selectedMasterVehicle?.sellableSeats || 1;
  const calculatedSuggestedPP = currentTotalAmount > 0 && currentSellableSeats > 0
    ? Math.round(currentTotalAmount / currentSellableSeats)
    : 0;

  return (
    <div className="space-y-8">
      {/* ── SECTION 1: MASTER VEHICLE FLEET ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-[#FF4D00]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Vehicle Master Fleet ({vehicles.length} Active Vehicles)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Authoritative vehicle models and seating capacities for {vendorName}.
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingVehicle(null);
              setVehicleForm({
                vehicleName: "17 Seater Tempo Traveller",
                vehicleCategory: "TEMPO_TRAVELLER",
                advertisedCapacity: "17",
                sellableSeats: "16",
                hasAC: true,
                plateNumber: "",
                fuelType: "Diesel",
              });
              setVehicleModalOpen(true);
            }}
            className="bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold h-8 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vehicle to Master
          </Button>
        </div>

        {/* Master Vehicles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col justify-between gap-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center font-bold">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs block">
                      {v.vehicleName}
                    </span>
                    {v.plateNumber && (
                      <span className="text-[10px] font-mono text-slate-400 block font-normal">
                        {v.plateNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingVehicle(v);
                      setVehicleForm({
                        vehicleName: v.vehicleName,
                        vehicleCategory: v.vehicleCategory || "TEMPO_TRAVELLER",
                        advertisedCapacity: v.advertisedCapacity.toString(),
                        sellableSeats: v.sellableSeats.toString(),
                        hasAC: v.hasAC,
                        plateNumber: v.plateNumber || "",
                        fuelType: v.fuelType || "Diesel",
                      });
                      setVehicleModalOpen(true);
                    }}
                    className="h-6 w-6 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteVehicleMaster(v.id, v.vehicleName)}
                    className="h-6 w-6 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold bg-white p-2 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Capacity</span>
                  <span className="text-slate-800 font-bold">{v.advertisedCapacity} Seats</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Sellable</span>
                  <span className="text-[#FF4D00] font-black">{v.sellableSeats} Seats</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: ROUTE CONTRACTS & RATE SHEETS ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#FF4D00]" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Route Contracts & Vehicle Rate Sheets ({groups.length} Contracts)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Grouped pricing contracts by route/trip. Per-vehicle pricing is looked up directly from Vehicle Master.
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingGroup(null);
              setGroupForm({
                routeName: "",
                tripName: "",
                pickupLocation: "",
                dropLocation: "",
                destination: "",
                season: "WINTER",
                durationDays: "8",
                durationNights: "7",
                pickupDropIncluded: true,
                notes: "",
              });
              setGroupModalOpen(true);
            }}
            className="bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold h-8.5 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Add Route Pricing Group
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400 font-medium">
            Loading rate sheets...
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-extrabold text-slate-700">No Route Contracts Created</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3 font-medium">
              Create route contracts (e.g. Winter Spiti: Kotkapura → Kotkapura) to price your master vehicles.
            </p>
            <Button
              onClick={() => {
                setEditingGroup(null);
                setGroupModalOpen(true);
              }}
              className="bg-[#FF4D00] text-white text-xs font-bold h-7.5 px-3 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Contract
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`bg-white rounded-xl border transition-all ${
                  group.isActive
                    ? "border-slate-200 shadow-2xs"
                    : "border-slate-200 bg-slate-50/60 opacity-75"
                }`}
              >
                {/* Group Contract Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">
                        {group.routeName}
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {group.pickupLocation} → {group.dropLocation}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FF4D00]/5 text-[#C2410C] border border-[#FF4D00]/30">
                        {group.durationDays} Days / {group.durationNights} Nights
                      </span>
                      {group.season && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {group.season} SEASON
                        </span>
                      )}
                      {group.pickupDropIncluded && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          Pickup & Drop Included
                        </span>
                      )}
                      {!group.isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          Inactive
                        </span>
                      )}
                    </div>

                    {group.notes && (
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {group.notes}
                      </p>
                    )}
                  </div>

                  {/* Group Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveGroupId(group.id);
                        setEditingRate(null);
                        setRateForm({
                          vehicleId: vehicles[0]?.id || "",
                          totalVehicleAmount: "",
                          sellableSeats: vehicles[0]?.sellableSeats ? vehicles[0].sellableSeats.toString() : "",
                          negotiatedPP: "",
                          extraPickupDropAmount: "0",
                          extraDayAmount: "0",
                          notes: "",
                        });
                        setRateModalOpen(true);
                      }}
                      className="h-7.5 text-xs font-bold bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Vehicle Rate
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGroup(group);
                        setGroupForm({
                          routeName: group.routeName,
                          tripName: group.tripName || "",
                          pickupLocation: group.pickupLocation,
                          dropLocation: group.dropLocation,
                          destination: group.destination || "",
                          season: group.season || "WINTER",
                          durationDays: group.durationDays.toString(),
                          durationNights: group.durationNights.toString(),
                          pickupDropIncluded: group.pickupDropIncluded,
                          notes: group.notes || "",
                        });
                        setGroupModalOpen(true);
                      }}
                      className="h-7.5 text-xs font-bold text-slate-700 bg-white border-slate-200 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit Group
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateGroup(group.id)}
                      className="h-7.5 text-xs font-bold text-slate-700 bg-white border-slate-200 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicate
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleGroupStatus(group)}
                      className="h-7.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {group.isActive ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteGroup(group.id, group.routeName)}
                      className="h-7.5 text-xs font-bold text-red-600 bg-white border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      title="Delete Route Contract"
                    >
                      <Trash2 className="w-3 h-3 mr-1 text-red-600" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Rate Sheet Table */}
                <div className="overflow-x-auto">
                  {group.vehicleRates.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400 font-medium">
                      No vehicle prices added yet. Click "Add Vehicle Rate" to select a vehicle from master.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-4">Vehicle</th>
                          <th className="py-2.5 px-4">Total Amount</th>
                          <th className="py-2.5 px-4">Per Person Rate</th>
                          <th className="py-2.5 px-4">Sellable Seats</th>
                          <th className="py-2.5 px-4">Extra Charges</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {group.vehicleRates.map((rate) => {
                          const totAmount = Number(rate.totalVehicleAmount || 0);
                          const suggPP = rate.suggestedPP ? Number(rate.suggestedPP) : (rate.sellableSeats > 0 ? Math.round(totAmount / rate.sellableSeats) : 0);
                          const negPP = rate.negotiatedPP ? Number(rate.negotiatedPP) : null;
                          const vName = rate.vehicle?.vehicleName || rate.vehicleNameSnapshot;

                          return (
                            <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <Car className="w-4 h-4 text-[#FF4D00]" />
                                  <div>
                                    <div>{vName}</div>
                                    {rate.vehicle?.plateNumber && (
                                      <div className="text-[10px] font-mono text-slate-400 font-normal">
                                        {rate.vehicle.plateNumber}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-sm font-black text-slate-900">
                                ₹{totAmount.toLocaleString("en-IN")}
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-extrabold text-green-700 flex items-center gap-1">
                                    <span>₹{(negPP !== null ? negPP : suggPP).toLocaleString("en-IN")}</span>
                                    {negPP !== null && (
                                      <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1 py-0.2 rounded border border-amber-200">
                                        Negotiated
                                      </span>
                                    )}
                                  </div>
                                  {negPP !== null && suggPP > 0 && (
                                    <div className="text-[10px] text-slate-400 line-through">
                                      Suggested: ₹{suggPP.toLocaleString("en-IN")}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-800">{rate.sellableSeats} Seats</span>
                              </td>

                              <td className="py-3 px-4 text-slate-600 text-[11px]">
                                {Number(rate.extraPickupDropAmount) > 0 && (
                                  <div>Extra Pickup: ₹{Number(rate.extraPickupDropAmount).toLocaleString("en-IN")}</div>
                                )}
                                {Number(rate.extraDayAmount) > 0 && (
                                  <div>Extra Day: ₹{Number(rate.extraDayAmount).toLocaleString("en-IN")}</div>
                                )}
                                {!Number(rate.extraPickupDropAmount) && !Number(rate.extraDayAmount) && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    rate.isActive
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {rate.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingRate(rate);
                                      setRateForm({
                                        vehicleId: rate.vehicleId,
                                        totalVehicleAmount: rate.totalVehicleAmount.toString(),
                                        sellableSeats: rate.sellableSeats.toString(),
                                        negotiatedPP: rate.negotiatedPP ? rate.negotiatedPP.toString() : "",
                                        extraPickupDropAmount: rate.extraPickupDropAmount.toString(),
                                        extraDayAmount: rate.extraDayAmount.toString(),
                                        notes: rate.notes || "",
                                      });
                                      setRateModalOpen(true);
                                    }}
                                    className="h-7 w-7 text-slate-600 hover:text-slate-900 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteRate(rate.id, vName)}
                                    className="h-7 w-7 text-red-600 hover:text-red-700 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MASTER VEHICLE MODAL ── */}
      <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bus className="w-4 h-4 text-[#FF4D00]" />
              <span>{editingVehicle ? "Edit Master Vehicle" : "Add Vehicle to Master Fleet"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 text-xs font-semibold text-slate-700 mt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Vehicle Name / Model *
              </label>
              <Input
                value={vehicleForm.vehicleName}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleName: e.target.value })}
                placeholder="e.g. 17 Seater Tempo Traveller / Innova Crysta"
                className="h-8.5 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Advertised Capacity *
                </label>
                <Input
                  type="number"
                  value={vehicleForm.advertisedCapacity}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, advertisedCapacity: e.target.value })}
                  placeholder="17"
                  className="h-8.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Sellable Seats *
                </label>
                <Input
                  type="number"
                  value={vehicleForm.sellableSeats}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, sellableSeats: e.target.value })}
                  placeholder="16"
                  className="h-8.5 text-xs font-bold text-[#FF4D00]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Registration / Plate Number
              </label>
              <Input
                value={vehicleForm.plateNumber}
                onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                placeholder="e.g. PB-08-TR-1702"
                className="h-8.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <Button variant="outline" onClick={() => setVehicleModalOpen(false)} className="h-8 text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveVehicleMaster} className="bg-[#FF4D00] text-white h-8 text-xs font-bold px-4">
              Save Vehicle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── ROUTE PRICING GROUP MODAL ── */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF4D00]" />
              <span>{editingGroup ? "Edit Route Contract Header" : "Add Route Pricing Contract"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs font-semibold text-slate-700 mt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Route / Trip Title *
              </label>
              <Input
                value={groupForm.routeName}
                onChange={(e) => setGroupForm({ ...groupForm, routeName: e.target.value })}
                placeholder="e.g. WINTER SPITI / Shimla Manali Circuit"
                className="h-8.5 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Pickup Location *
                </label>
                <Input
                  value={groupForm.pickupLocation}
                  onChange={(e) => setGroupForm({ ...groupForm, pickupLocation: e.target.value })}
                  placeholder="e.g. Chandigarh / Kotkapura"
                  className="h-8.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Drop Location *
                </label>
                <Input
                  value={groupForm.dropLocation}
                  onChange={(e) => setGroupForm({ ...groupForm, dropLocation: e.target.value })}
                  placeholder="e.g. Chandigarh / Kotkapura"
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Season
                </label>
                <Select
                  value={groupForm.season}
                  onValueChange={(v) => setGroupForm({ ...groupForm, season: v })}
                >
                  <SelectTrigger className="h-8.5 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="WINTER">Winter Season</SelectItem>
                    <SelectItem value="SUMMER">Summer Season</SelectItem>
                    <SelectItem value="MONSOON">Monsoon Season</SelectItem>
                    <SelectItem value="ALL_YEAR">All Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Duration (Days)
                </label>
                <Input
                  type="number"
                  value={groupForm.durationDays}
                  onChange={(e) => setGroupForm({ ...groupForm, durationDays: e.target.value })}
                  className="h-8.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Duration (Nights)
                </label>
                <Input
                  type="number"
                  value={groupForm.durationNights}
                  onChange={(e) => setGroupForm({ ...groupForm, durationNights: e.target.value })}
                  className="h-8.5 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Contract Notes
              </label>
              <Input
                value={groupForm.notes}
                onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                placeholder="e.g. Includes driver allowance, state tax & toll charges"
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <Button variant="outline" onClick={() => setGroupModalOpen(false)} className="h-8.5 text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveGroup} className="bg-[#FF4D00] text-white h-8.5 text-xs font-bold px-4">
              Save Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── VEHICLE RATE MODAL ── */}
      <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Car className="w-4 h-4 text-[#FF4D00]" />
              <span>{editingRate ? "Edit Vehicle Pricing Rate" : "Add Vehicle Price to Contract"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs font-semibold text-slate-700 mt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Select Vehicle from Vehicle Master *
              </label>
              {editingRate ? (
                <div className="p-2.5 bg-slate-50 border rounded text-slate-900 font-bold text-xs">
                  {editingRate.vehicle?.vehicleName || editingRate.vehicleNameSnapshot}
                </div>
              ) : (
                <Select
                  value={rateForm.vehicleId}
                  onValueChange={(v) => {
                    const sel = vehicles.find((item) => item.id === v);
                    setRateForm({
                      ...rateForm,
                      vehicleId: v,
                      sellableSeats: sel ? sel.sellableSeats.toString() : rateForm.sellableSeats,
                    });
                  }}
                >
                  <SelectTrigger className="h-9 bg-white border-slate-200 font-bold">
                    <SelectValue placeholder="Select Vehicle from Master..." />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="font-bold">
                        {v.vehicleName} ({v.sellableSeats} Sellable Seats / {v.advertisedCapacity} Cap)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Total Vehicle Amount (₹) *
                </label>
                <Input
                  type="number"
                  value={rateForm.totalVehicleAmount}
                  onChange={(e) => setRateForm({ ...rateForm, totalVehicleAmount: e.target.value })}
                  placeholder="e.g. 80000"
                  className="h-9 text-xs font-black text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Sellable Seats *
                </label>
                <Input
                  type="number"
                  value={rateForm.sellableSeats}
                  onChange={(e) => setRateForm({ ...rateForm, sellableSeats: e.target.value })}
                  placeholder="18"
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-green-50/80 rounded-lg border border-green-200/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-green-700 uppercase">
                  Suggested Per Person (Computed)
                </div>
                <div className="text-xs text-green-600 font-medium">
                  ₹{currentTotalAmount.toLocaleString("en-IN")} / {currentSellableSeats} seats
                </div>
              </div>
              <div className="text-base font-black text-green-700">
                ₹{calculatedSuggestedPP.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 flex items-center justify-between">
                <span>Negotiated Per Person Rate (Override)</span>
                <span className="text-[9px] text-slate-400 font-normal">Optional</span>
              </label>
              <Input
                type="number"
                value={rateForm.negotiatedPP}
                onChange={(e) => setRateForm({ ...rateForm, negotiatedPP: e.target.value })}
                placeholder={`Default: ₹${calculatedSuggestedPP}`}
                className="h-8.5 text-xs font-extrabold text-amber-800 bg-amber-50/30 border-amber-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Extra Pickup/Drop (₹)
                </label>
                <Input
                  type="number"
                  value={rateForm.extraPickupDropAmount}
                  onChange={(e) => setRateForm({ ...rateForm, extraPickupDropAmount: e.target.value })}
                  placeholder="0"
                  className="h-8.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Extra Day Charge (₹)
                </label>
                <Input
                  type="number"
                  value={rateForm.extraDayAmount}
                  onChange={(e) => setRateForm({ ...rateForm, extraDayAmount: e.target.value })}
                  placeholder="0"
                  className="h-8.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <Button variant="outline" onClick={() => setRateModalOpen(false)} className="h-8.5 text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveRate} className="bg-[#FF4D00] text-white h-8.5 text-xs font-bold px-4">
              Save Vehicle Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

