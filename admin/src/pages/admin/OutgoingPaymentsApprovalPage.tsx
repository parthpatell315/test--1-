import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Truck,
  Compass,
  User,
  Search,
  RotateCw,
  Eye,
  Upload,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn, safeFormatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import { financeControllerService } from "@/services/financeController.service";
import { financeApprovalsService } from "@/services/financeApprovals.service";
import { useAuthStore } from "@/store/auth.store";
import { canReviewVendorPayout } from "@/utils/collectionVerification";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  extractBillReference,
  formatVendorName,
  formatVendorService,
  sanitizePlainLabel,
} from "@/utils/vendorDisplayText";
import { vendorPayoutQueueLabel } from "@/utils/vendorPayoutStatus";
import type { VendorPaymentRequestItem } from "@/types";

interface OutgoingPaymentsApprovalPageProps {
  hideHeader?: boolean;
}

type OutgoingCategory = "all" | "Hotels" | "Transport" | "Activities" | "Guides";

function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function vendorStatusLabel(item: {
  approvalStatus?: string;
  status?: string;
  isOverpaid?: boolean;
}) {
  return vendorPayoutQueueLabel(item);
}

const PILL =
  "inline-flex h-6 shrink-0 items-center rounded px-2 text-[10px] font-semibold whitespace-nowrap transition-colors";
const PILL_ACTIVE = "bg-[#0B1528] text-white";
const PILL_IDLE = "border border-[#E8EEF4] bg-white text-slate-600 hover:bg-[#F4F7FB]";

function tripDateLabel(dateVal: string | null | undefined) {
  return dateVal ? safeFormatDate(dateVal, { day: "2-digit", month: "short", year: "numeric" }) : "";
}

function collectProofUrls(item: any): string[] {
  return [
    ...new Set(
      [
        item?.paymentProofUrl,
        item?.advanceProofUrl,
        item?.settlementProofUrl,
        item?.proofUrl,
        item?.invoiceProofUrl,
        item?.invoiceFileUrl,
        item?.invoiceProof,
      ].filter((url): url is string => typeof url === "string" && Boolean(url.trim())),
    ),
  ];
}

function vendorProofUrl(item: any) {
  return collectProofUrls(item)[0] || "";
}

function ProofPreview({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex min-h-[10rem] flex-col rounded-lg border border-[#E3EAF2] bg-white p-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {!url ? (
        <div className="flex flex-1 items-center justify-center rounded bg-slate-50 text-[11px] text-slate-400">
          Not uploaded
        </div>
      ) : /\.pdf($|\?)/i.test(url) ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-[#C2410C] underline">
          Open PDF
        </a>
      ) : (
        <img src={url} alt={label} className="max-h-40 w-full flex-1 rounded object-contain" />
      )}
    </div>
  );
}

export default function OutgoingPaymentsApprovalPage({
  hideHeader = false,
}: OutgoingPaymentsApprovalPageProps) {
  const { admin: currentUser } = useAuthStore();
  const canReview = canReviewVendorPayout(currentUser);

  const [vendorItems, setVendorItems] = useState<VendorPaymentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeCategory, setActiveCategory] = useState<OutgoingCategory>("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionType, setActionType] = useState<"review" | "approve" | "upload" | "view-proof" | null>(null);
  const [payoutNotes, setPayoutNotes] = useState("");
  const [proofUrlInput, setProofUrlInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const vRes = await financeControllerService.getVendorQueue({ limit: 100 }).catch(() => ({ data: [] }));
      setVendorItems(vRes?.data || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load vendor payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const aggregatedItems = vendorItems
    .map((v) => {
      const totalCost = Number((v as any).totalCost ?? v.agreedTariff ?? 0);
      const paidAmount = Number(v.paidAmount || 0);
      const outstandingAmount = Number(
        (v as any).outstandingAmount ?? totalCost - paidAmount,
      );
      const isOverpaid = Boolean((v as any).isOverpaid) || outstandingAmount < 0;
      return {
        id: v.id,
        category: sanitizePlainLabel(v.category || v.vendorType, "Hotels"),
        vendorName: formatVendorName(v.vendorName, "Vendor"),
        tripName: sanitizePlainLabel(v.tripName || v.tripTitle, "Trip"),
        tripId: v.tripId,
        departureDate: v.departureDate || null,
        serviceDescription: v.serviceDescription || (v as any).notes || v.vendorType || v.category || "Service",
        notes: (v as any).notes || (v as any).remarks || "",
        operationalLinked: Boolean(v.operationalLinked),
        departureHref: v.departureHref || null,
        billReference: extractBillReference(
          v.billReference || (v as any).transactionRef,
          v.id,
        ),
        totalCost,
        paidAmount,
        outstandingAmount,
        overpaidAmount: Number((v as any).overpaidAmount || Math.max(0, paidAmount - totalCost)),
        isOverpaid,
        approvalStatus: (v as any).approvalStatus || "PENDING",
        status: v.paymentStatus || (v as any).status || "PENDING",
        requiresFounderApproval: Boolean((v as any).requiresFounderApproval),
        proofUrl: vendorProofUrl(v) || null,
        paymentProofUrl: (v as any).paymentProofUrl || null,
        approvedByName: (v as any).approvedByName || null,
        approvedAt: (v as any).approvedAt || null,
        raw: v,
      };
    })
    .filter((item) => {
      if (activeCategory !== "all" && String(item.category) !== activeCategory) return false;
      const label = vendorStatusLabel(item);
      if (statusFilter === "PENDING" && label !== "Pending" && label !== "Reviewed") return false;
      if (statusFilter === "PAID" && label !== "Settled" && label !== "Overpaid") return false;
      if (statusFilter === "REJECTED" && label !== "Rejected") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const service = formatVendorService(item);
        return (
          item.vendorName.toLowerCase().includes(q) ||
          item.tripName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          service.primary.toLowerCase().includes(q) ||
          service.secondary.toLowerCase().includes(q) ||
          item.billReference.toLowerCase().includes(q) ||
          String(item.approvedByName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

  const pendingBills = aggregatedItems.filter((i) => {
    const label = vendorStatusLabel(i);
    return label === "Pending" || label === "Reviewed";
  });
  const totalOutstanding = aggregatedItems.reduce(
    (sum, i) => sum + Math.max(0, Number(i.outstandingAmount || 0)),
    0,
  );
  const totalPaid = aggregatedItems.reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);

  const closeAction = () => {
    setActionType(null);
    setSelectedItem(null);
    setPayoutNotes("");
    setProofUrlInput("");
  };

  const persistProofIfNeeded = async (item: any) => {
    const next = (proofUrlInput || vendorProofUrl(item) || "").trim();
    if (!next) return null;
    if (next !== vendorProofUrl(item)) {
      await financeApprovalsService.uploadVendorPaymentProof(item.id, {
        proofFileUrl: next,
        proofFileName: "vendor_payout_proof",
      });
    }
    return next;
  };

  const handleVendorAction = async () => {
    if (!selectedItem || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "upload") {
        if (!proofUrlInput.trim()) {
          toast.error("Upload a payment screenshot or PDF first");
          return;
        }
        await financeApprovalsService.uploadVendorPaymentProof(selectedItem.id, {
          proofFileUrl: proofUrlInput.trim(),
          proofFileName: "vendor_payout_proof",
        });
        toast.success("Payment proof attached to this payout");
        closeAction();
        loadData();
        return;
      }

      const proof = await persistProofIfNeeded(selectedItem);
      if (!proof) {
        toast.error("Payment proof is required before review or verify. Upload it first.");
        setActionType("upload");
        return;
      }

      if (actionType === "review" || actionType === "approve") {
        await financeApprovalsService.reviewVendorPaymentFC(selectedItem.id, {
          reason: payoutNotes.trim() || undefined,
          invoiceFileUrl: proof,
        });
        toast.success("Vendor payout verified");
      }
      closeAction();
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Vendor approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (String(cat)) {
      case "Transport":
        return <Truck className="w-3.5 h-3.5 text-amber-600" />;
      case "Activities":
        return <Compass className="w-3.5 h-3.5 text-[#C2410C]" />;
      case "Guides":
        return <User className="w-3.5 h-3.5 text-green-700" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col font-sans text-[#162B45] antialiased">
      {!hideHeader && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#E3EAF2] px-2 py-1.5">
          <h1 className="text-[13px] font-semibold tracking-tight text-[#162B45]">
            Vendor payments
          </h1>
          <Button
            onClick={loadData}
            className="h-6 bg-white hover:bg-slate-50 border border-[#E3EAF2] rounded px-2 text-[#162B45] text-[10px] font-semibold"
          >
            <RotateCw className="w-3 h-3 text-[#74839A] mr-1" /> Refresh
          </Button>
        </div>
      )}

      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#E3EAF2] px-2 py-1">
        <span className="text-[10px] font-semibold tabular-nums text-[#162B45]">
          {loading ? "—" : pendingBills.length} pending
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-[#B91C1C]">
          {loading ? "—" : formatINR(totalOutstanding)} due
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-[#15803D]">
          {loading ? "—" : formatINR(totalPaid)} paid
        </span>
        <span className="hidden h-3 w-px bg-[#E3EAF2] sm:block" />
        {([
          { key: "all", label: "All" },
          { key: "Hotels", label: "Hotels" },
          { key: "Transport", label: "Transport" },
          { key: "Activities", label: "Activities" },
          { key: "Guides", label: "Guides" },
        ] as const).map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={cn(PILL, activeCategory === cat.key ? PILL_ACTIVE : PILL_IDLE)}
          >
            {cat.label}
          </button>
        ))}
        <span className="hidden h-3 w-px bg-[#E3EAF2] sm:block" />
        {[
          { key: "ALL", label: "All" },
          { key: "PENDING", label: "Pending" },
          { key: "PAID", label: "Settled" },
          { key: "REJECTED", label: "Rejected" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(PILL, statusFilter === tab.key ? PILL_ACTIVE : PILL_IDLE)}
          >
            {tab.label}
          </button>
        ))}
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#74839A]" />
          <Input
            placeholder="Search vendor, trip, TXN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 w-full pl-7 text-[11px]"
          />
        </div>
        {hideHeader && (
          <Button
            onClick={loadData}
            variant="outline"
            className="h-6 shrink-0 px-2 text-[10px] font-semibold"
          >
            <RotateCw className={cn("mr-1 h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : aggregatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Building2 className="w-6 h-6 text-slate-300 mb-1" />
              <p className="text-[12px] font-semibold text-[#162B45]">No vendor bills</p>
            </div>
          ) : (
            <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[72px]" />
                <col className="w-[140px]" />
                <col className="w-[200px]" />
                <col className="w-[170px]" />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[88px]" />
                <col className="w-[76px]" />
                <col className="w-[110px]" />
                <col className="w-[168px]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#E3EAF2] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1">Category</th>
                  <th className="px-2 py-1">Vendor</th>
                  <th className="px-2 py-1">Departure / Trip</th>
                  <th className="px-2 py-1">Service</th>
                  <th className="px-2 py-1 text-right">Total</th>
                  <th className="px-2 py-1 text-right">Paid</th>
                  <th className="px-2 py-1 text-right">Due</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Approved by</th>
                  <th className="px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {aggregatedItems.map((item) => {
                  const label = vendorStatusLabel(item);
                  const service = formatVendorService(item);
                  const showVerify = canReview && (label === "Pending" || label === "Reviewed");
                  const settled = label === "Settled";
                  const proofUrl = vendorProofUrl(item);
                  const tripDate = tripDateLabel(item.departureDate);
                  const tripInner = (
                    <>
                      <span className="block truncate font-medium text-[#162B45]">{item.tripName}</span>
                      {tripDate ? (
                        <span className="block whitespace-nowrap text-[10px] text-slate-500">{tripDate}</span>
                      ) : null}
                    </>
                  );
                  return (
                    <tr key={item.id} className="h-8 border-b border-[#EEF2F6] last:border-b-0 hover:bg-[#F8FAFC]">
                      <td className="px-2 py-0.5 align-middle">
                        <div className="flex min-w-0 items-center gap-1" title={item.category}>
                          {getCategoryIcon(item.category)}
                          <span className="truncate text-[10px] font-semibold">{item.category}</span>
                        </div>
                      </td>
                      <td className="px-2 py-0.5 align-middle font-semibold">
                        <span className="block truncate" title={item.vendorName}>
                          {item.vendorName}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 align-middle text-slate-600">
                        {item.departureHref ? (
                          <Link
                            to={item.departureHref}
                            title="Open departure"
                            className="block min-w-0 hover:underline"
                          >
                            {tripInner}
                          </Link>
                        ) : (
                          <div className="min-w-0">{tripInner}</div>
                        )}
                      </td>
                      <td className="px-2 py-0.5 align-middle text-slate-600">
                        <span className="block truncate" title={service.tooltip}>
                          {service.primary}
                          {service.secondary ? (
                            <span className="text-slate-400"> · {service.secondary}</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 align-middle text-right font-mono text-[11px] tabular-nums whitespace-nowrap">
                        {formatINR(item.totalCost)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-0.5 align-middle text-right font-mono text-[11px] tabular-nums whitespace-nowrap",
                          settled ? "font-semibold text-[#15803D]" : "text-slate-600",
                        )}
                      >
                        {formatINR(item.paidAmount)}
                      </td>
                      <td className="px-2 py-0.5 align-middle text-right font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap">
                        {item.isOverpaid ? (
                          <span className="text-amber-700">+{formatINR(item.overpaidAmount)}</span>
                        ) : (
                          <span className={item.outstandingAmount > 0 ? "text-[#B91C1C]" : "text-slate-400"}>
                            {formatINR(Math.max(0, item.outstandingAmount))}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-0.5 align-middle">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-[9px] font-bold uppercase",
                            settled
                              ? "bg-green-50 text-green-700 border-green-200"
                              : label === "Rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : label === "Overpaid"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : label === "Reviewed"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200",
                          )}
                        >
                          {label}
                        </Badge>
                      </td>
                      <td className="px-2 py-0.5 align-middle text-slate-600">
                        <span className="block truncate" title={item.approvedByName || undefined}>
                          {item.approvedByName || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 align-middle">
                        <div className="flex flex-nowrap items-center gap-1">
                          {proofUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItem(item);
                                setActionType("view-proof");
                                setProofUrlInput(proofUrl);
                              }}
                              className="h-6 px-1.5 text-[10px] font-semibold"
                            >
                              <Eye className="mr-0.5 h-3 w-3" />
                              Proof
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItem(item);
                                setActionType("upload");
                                setProofUrlInput("");
                              }}
                              className="h-6 px-1.5 text-[10px] font-semibold border-amber-300 bg-amber-50 text-amber-800"
                            >
                              <Upload className="mr-0.5 h-3 w-3" />
                              Proof
                            </Button>
                          )}
                          {showVerify && (
                            <Button
                              size="sm"
                              title="Verify payout"
                              onClick={() => {
                                setSelectedItem(item);
                                setActionType("approve");
                                setProofUrlInput(proofUrl);
                              }}
                              className="h-6 px-1.5 text-[10px] font-semibold bg-[#0B1528] text-white"
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      <Dialog open={Boolean(actionType)} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold tracking-tight text-[#162B45]">
              {actionType === "review" || actionType === "approve"
                ? "Verify vendor payout"
                : actionType === "view-proof"
                    ? "Payment proof"
                    : "Upload payment proof"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Founder or Finance Controller verifies. One UPI or bank screenshot is enough as payment proof.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (() => {
            const service = formatVendorService(selectedItem);
            const tripDate = tripDateLabel(selectedItem.departureDate);
            const vendorLabel = formatVendorName(selectedItem.vendorName);
            const proofUrl = proofUrlInput || vendorProofUrl(selectedItem);
            return (
            <div className="space-y-3 text-[12px]">
              <dl className="grid grid-cols-[6.75rem_1fr] gap-x-3 gap-y-2 rounded-lg border border-[#E3EAF2] bg-[#F8FAFC] px-3 py-2.5">
                <dt className="text-slate-500">Vendor</dt>
                <dd className="min-w-0 font-semibold text-[#162B45]" title={vendorLabel}>{vendorLabel}</dd>
                <dt className="text-slate-500">Trip</dt>
                <dd className="min-w-0">
                  {selectedItem.departureHref ? (
                    <Link
                      to={selectedItem.departureHref}
                      className="inline-flex max-w-full items-center gap-1 text-[#C2410C] hover:underline"
                      onClick={closeAction}
                    >
                      <span className="truncate font-medium">{selectedItem.tripName}</span>
                      {tripDate ? <span className="shrink-0 text-slate-500">{tripDate}</span> : null}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : (
                    <span>
                      {selectedItem.tripName}
                      {tripDate ? ` · ${tripDate}` : ""}
                    </span>
                  )}
                </dd>
                <dt className="text-slate-500">Approved by</dt>
                <dd className="font-medium text-[#162B45]">{selectedItem.approvedByName || "Not verified yet"}</dd>
                <dt className="text-slate-500">Service</dt>
                <dd className="min-w-0 text-[#162B45]" title={service.tooltip}>
                  {service.primary}
                  {service.secondary ? ` · ${service.secondary}` : ""}
                </dd>
                <dt className="text-slate-500">Total / Paid</dt>
                <dd className="font-mono tabular-nums">
                  {formatINR(selectedItem.totalCost)} / {formatINR(selectedItem.paidAmount)}
                </dd>
              </dl>
              {!selectedItem.operationalLinked && (
                <p className="text-[10px] text-slate-400">Operational record unavailable — proof is stored on this payout.</p>
              )}
              {actionType === "view-proof" ? (
                <ProofPreview url={proofUrl} label="Payment screenshot" />
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Payment proof</label>
                  <ImageUpload
                    label="UPI / bank screenshot"
                    value={proofUrlInput || proofUrl}
                    onUpload={(url) => setProofUrlInput(url)}
                    compact
                    accept="image/*,.pdf,application/pdf"
                  />
                </div>
              )}
              {(actionType === "review" || actionType === "approve") && (
                <Input
                  placeholder="Notes (optional)"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              )}
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeAction}>
              Close
            </Button>
            {actionType !== "view-proof" && (
              <Button size="sm" disabled={actionLoading} onClick={handleVendorAction} className="bg-[#0B1528] text-white">
                {actionType === "upload"
                  ? "Save proof"
                  : "Confirm verify"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
