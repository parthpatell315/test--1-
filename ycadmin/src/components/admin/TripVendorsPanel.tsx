import { useState, useEffect, useCallback } from "react";
import { vendorsService } from "@/services/vendors.service";
import type { Vendor, TripVendor, TripVendorSummary } from "@/types";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Truck,
  UserCheck,
  UtensilsCrossed,
  Wrench,
  HelpCircle,
  Plus,
  Trash2,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { canViewProfit } from "@/config/permissions.config";

const TYPE_ICONS: Record<string, any> = {
  hotel: Building2,
  transport: Truck,
  guide: UserCheck,
  meals: UtensilsCrossed,
  equipment: Wrench,
  other: HelpCircle,
};

const TYPE_COLORS: Record<string, string> = {
  hotel: "bg-blue-100 text-blue-700",
  transport: "bg-amber-100 text-amber-700",
  guide: "bg-green-100 text-green-700",
  meals: "bg-[#FF4D00]/10 text-[#C2410C]",
  equipment: "bg-[#FF4D00]/10 text-[#C2410C]",
  other: "bg-gray-100 text-gray-700",
};

interface TripVendorsPanelProps {
  tripId: string;
  tripTitle: string;
  tripPrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TripVendorsPanel({
  tripId,
  tripTitle,
  tripPrice,
  open,
  onOpenChange,
}: TripVendorsPanelProps) {
  const { admin } = useAuthStore();
  const canSeeProfit = canViewProfit(admin);
  const [assignments, setAssignments] = useState<TripVendor[]>([]);
  const [summary, setSummary] = useState<TripVendorSummary | null>(null);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    vendorId: "",
    agreedCost: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [vendorData, allV] = await Promise.all([
        vendorsService.getForTrip(tripId),
        vendorsService.getAll(),
      ]);
      setAssignments(vendorData.assignments);
      setSummary(vendorData.summary);
      setAllVendors(allV);
    } catch {
      toast.error("Failed to load vendor data");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const handleAssign = async () => {
    if (!form.vendorId || !form.agreedCost) {
      toast.error("Select a vendor and enter cost");
      return;
    }
    setSubmitting(true);
    try {
      await vendorsService.assignToTrip({
        tripId,
        vendorId: form.vendorId,
        agreedCost: Number(form.agreedCost),
        notes: form.notes,
      });
      toast.success("Vendor assigned");
      setShowAdd(false);
      setForm({ vendorId: "", agreedCost: "", notes: "" });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async (
    assignmentId: string,
    paymentStatus: string,
    paidAmount: number,
  ) => {
    setSubmitting(true);
    try {
      await vendorsService.updateAssignment(assignmentId, {
        paymentStatus: paymentStatus as any,
        paidAmount,
      });
      toast.success("Vendor payment updated");
      loadData();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm("Remove this vendor from the trip?")) return;
    setSubmitting(true);
    try {
      await vendorsService.removeAssignment(assignmentId);
      toast.success("Vendor removed from trip");
      loadData();
    } catch {
      toast.error("Failed to remove");
    } finally {
      setSubmitting(false);
    }
  };

  // Available vendors = all vendors minus already assigned
  const assignedIds = (assignments || [])
    .map((a) => {
      if (!a.vendorId) return null;
      return typeof a.vendorId === "object"
        ? (a.vendorId as Vendor).id
        : a.vendorId;
    })
    .filter(Boolean);

  const availableVendors = (allVendors || []).filter(
    (v) => v?.id && !assignedIds.includes(v.id),
  );

  const totalCost = summary?.totalVendorCost ?? 0;
  const estimatedProfit = tripPrice - totalCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
        <div className="px-8 py-6 border-b bg-muted/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              Vendor Management
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-medium">
              {tripTitle}
            </p>
          </DialogHeader>
        </div>

        <div className="px-8 pb-8 space-y-6">
          {/* ─── Cost Summary (profit card Founder/Superadmin only) ─── */}
          <div
            className={cn(
              "grid gap-4",
              canSeeProfit ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-green-600">
                Per Person Price
              </p>
              <p className="text-lg font-black text-green-700">
                ₹{tripPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-red-600">
                Total Vendor Cost
              </p>
              <p className="text-lg font-black text-red-700">
                ₹{totalCost.toLocaleString()}
              </p>
            </div>
            {canSeeProfit && (
            <div
              className={cn(
                "text-center p-4 rounded-2xl border",
                estimatedProfit >= 0
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200",
              )}
            >
              <p
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider",
                  estimatedProfit >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                Est. Profit/Person
              </p>
              <p
                className={cn(
                  "text-lg font-black",
                  estimatedProfit >= 0 ? "text-green-700" : "text-red-700",
                )}
              >
                ₹{estimatedProfit.toLocaleString()}
              </p>
            </div>
            )}
          </div>

          {/* ─── Assign Vendor ─── */}
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Assigned Vendors ({assignments.length})
            </h4>
            <Button
              size="sm"
              onClick={() => setShowAdd(!showAdd)}
              className="h-8 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl"
            >
              {showAdd ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {showAdd ? "Cancel" : "Assign Vendor"}
            </Button>
          </div>

          {showAdd && (
            <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Vendor *
                  </label>
                  <Select
                    value={form.vendorId}
                    onValueChange={(v) => setForm({ ...form, vendorId: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-sm">
                      <SelectValue placeholder="Select vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVendors.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No vendors available
                        </SelectItem>
                      ) : (
                        availableVendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.type})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Agreed Cost (₹) *
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.agreedCost}
                    onChange={(e) =>
                      setForm({ ...form, agreedCost: e.target.value })
                    }
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <Button
                onClick={handleAssign}
                disabled={submitting}
                className="w-full h-10 rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                {submitting ? "Assigning..." : "Assign to Trip"}
              </Button>
            </div>
          )}

          {/* ─── Vendor List ─── */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-muted animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-2xl">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground font-medium">
                No vendors assigned to this trip
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => {
                const vendor =
                  typeof a.vendorId === "object"
                    ? (a.vendorId as Vendor)
                    : null;
                if (!vendor) return null;
                const TypeIcon = TYPE_ICONS[vendor.type] || HelpCircle;

                return (
                  <div
                    key={a.id || a._id}
                    className="bg-white border-2 border-border rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center",
                            TYPE_COLORS[vendor.type],
                          )}
                        >
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-sm uppercase tracking-tight">
                            {vendor.name}
                          </h5>
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                              TYPE_COLORS[vendor.type],
                            )}
                          >
                            {vendor.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">
                          ₹{a.agreedCost.toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={submitting}
                          onClick={() => handleRemove(a.id || a._id!)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Select
                        value={a.paymentStatus}
                        disabled={submitting}
                        onValueChange={(v) =>
                          handleUpdatePayment(a.id || a._id!, v, a.paidAmount)
                        }
                      >
                        <SelectTrigger className="h-8 w-36 rounded-lg text-[10px] font-bold uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>

                      {a.paymentStatus !== "paid" && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Paid amount"
                            defaultValue={a.paidAmount || ""}
                            disabled={submitting}
                            className="h-8 w-28 rounded-lg text-xs"
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== a.paidAmount) {
                                const status =
                                  val >= a.agreedCost
                                    ? "paid"
                                    : val > 0
                                      ? "partial"
                                      : "pending";
                                handleUpdatePayment(
                                  a.id || a._id!,
                                  status,
                                  val,
                                );
                              }
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground font-bold">
                            / ₹{a.agreedCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

