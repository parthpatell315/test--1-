import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Search,
  RotateCw,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import type { RefundTransactionItem } from "@/types";

interface RefundRequestsPageProps {
  hideHeader?: boolean;
}

const PILL =
  "inline-flex h-6 shrink-0 items-center rounded px-2 text-[10px] font-semibold whitespace-nowrap transition-colors";
const PILL_ACTIVE = "bg-[#0B1528] text-white";
const PILL_IDLE = "border border-[#E8EEF4] bg-white text-slate-600 hover:bg-[#F4F7FB]";

function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function RefundRequestsPage({ hideHeader = false }: RefundRequestsPageProps) {
  const [refunds, setRefunds] = useState<RefundTransactionItem[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSubTab, setActiveSubTab] = useState<"refunds" | "credits">("refunds");

  const [selectedRefund, setSelectedRefund] = useState<any | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<any | null>(null);
  const [applyBookingId, setApplyBookingId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [refundApprovalRef, setRefundApprovalRef] = useState("");
  const [refundRejectReason, setRefundRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [refundsRes, creditsRes] = await Promise.all([
        financeControllerService.refunds
          .list({
            status: statusFilter === "ALL" ? undefined : statusFilter,
            limit: 100,
          })
          .catch(() => ({ data: [], pagination: {} })),
        financeControllerService.credits.getActive().catch(() => []),
      ]);
      setRefunds(refundsRes?.data || []);
      setCredits(Array.isArray(creditsRes) ? creditsRes : creditsRes?.data || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const q = search.trim().toLowerCase();
  const visibleRefunds = refunds.filter((r: any) => {
    if (!q) return true;
    return [
      r.bookingId,
      r.customerName,
      r.tripName,
      r.refundReason,
      r.refundReference,
      r.workflow,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  const visibleCredits = credits.filter((c: any) => {
    if (!q) return true;
    return [c.code, c.bookingId, c.customerName, c.tripName].join(" ").toLowerCase().includes(q);
  });

  const pendingRefunds = refunds.filter((r) => r.status === "PENDING_APPROVAL");
  const totalPendingAmount = pendingRefunds.reduce(
    (sum, r) => sum + (Number(r.refundAmount) || 0) + (Number(r.creditNoteAmount) || 0),
    0,
  );
  const totalCreditsBalance = credits.reduce(
    (sum, c) => sum + (Number(c.remainingBalance) || 0),
    0,
  );

  const handleApprove = async () => {
    if (!selectedRefund) return;
    setActionLoading(true);
    try {
      await financeControllerService.refunds.approve(selectedRefund.id, {
        refundReference: refundApprovalRef.trim() || undefined,
      });
      toast.success("Refund posted to booking, Departure Hub, and credit ledger");
      setShowApproveDialog(false);
      setSelectedRefund(null);
      setRefundApprovalRef("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve refund");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    if (!refundRejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      await financeControllerService.refunds.reject(selectedRefund.id, refundRejectReason.trim());
      toast.success("Refund rejected");
      setShowRejectDialog(false);
      setSelectedRefund(null);
      setRefundRejectReason("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject refund");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyCredit = async () => {
    if (!selectedCredit) return;
    const amount = Number(applyAmount);
    if (!applyBookingId.trim()) {
      toast.error("Enter the target booking ID");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a credit amount");
      return;
    }
    setActionLoading(true);
    try {
      await financeControllerService.credits.apply(selectedCredit.refundId || selectedCredit.id, {
        targetBookingId: applyBookingId.trim(),
        amountToUse: amount,
      });
      toast.success(`₹${amount.toLocaleString("en-IN")} credited to ${applyBookingId.trim()}`);
      setShowApplyDialog(false);
      setSelectedCredit(null);
      setApplyBookingId("");
      setApplyAmount("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to apply credit");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col font-sans text-[#162B45] antialiased">
      {!hideHeader && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#E3EAF2] px-2 py-1.5">
          <h1 className="text-[13px] font-semibold">Refunds & credits</h1>
          <Button onClick={loadData} className="h-6 px-2 text-[10px] font-semibold" variant="outline">
            <RotateCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
        </div>
      )}

      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#E3EAF2] px-2 py-1">
        <span className="text-[10px] font-semibold tabular-nums text-amber-700">
          {loading ? "—" : pendingRefunds.length} pending
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-[#B91C1C]">
          {loading ? "—" : formatINR(totalPendingAmount)} due
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-[#15803D]">
          {loading ? "—" : formatINR(totalCreditsBalance)} credit
        </span>
        <span className="hidden h-3 w-px bg-[#E3EAF2] sm:block" />
        <button
          onClick={() => setActiveSubTab("refunds")}
          className={cn(PILL, activeSubTab === "refunds" ? PILL_ACTIVE : PILL_IDLE)}
        >
          Refunds
        </button>
        <button
          onClick={() => setActiveSubTab("credits")}
          className={cn(PILL, activeSubTab === "credits" ? PILL_ACTIVE : PILL_IDLE)}
        >
          Credits
        </button>
        {activeSubTab === "refunds" &&
          [
            { key: "ALL", label: "All" },
            { key: "PENDING_APPROVAL", label: "Pending" },
            { key: "COMPLETED", label: "Posted" },
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
            placeholder="Search booking, guest, trip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 w-full pl-7 text-[11px]"
          />
        </div>
        {hideHeader && (
          <Button onClick={loadData} variant="outline" className="h-6 shrink-0 px-2 text-[10px] font-semibold">
            <RotateCw className={cn("mr-1 h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C2410C] border-t-transparent" />
          </div>
        ) : activeSubTab === "refunds" ? (
          visibleRefunds.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12px] text-slate-500">No refund requests</p>
          ) : (
            <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#E3EAF2] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1">Booking / guest</th>
                  <th className="px-2 py-1">Trip</th>
                  <th className="px-2 py-1">Reason</th>
                  <th className="px-2 py-1 text-right">Cash</th>
                  <th className="px-2 py-1 text-right">Credit</th>
                  <th className="px-2 py-1">ERP</th>
                  <th className="px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {visibleRefunds.map((ref: any) => (
                  <tr key={ref.id} className="h-8 border-b border-[#EEF2F6] hover:bg-[#F8FAFC]">
                    <td className="px-2 py-0.5">
                      <span className="font-mono font-semibold text-[#C2410C]">{ref.bookingId}</span>
                      {ref.customerName ? (
                        <span className="text-slate-500"> · {ref.customerName}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-0.5">
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="truncate">
                          {ref.tripName || "—"}
                          {ref.departureDate ? (
                            <span className="text-slate-400"> · {safeFormatDate(ref.departureDate)}</span>
                          ) : null}
                        </span>
                        {ref.departureHref ? (
                          <Link to={ref.departureHref} title="Open departure" className="shrink-0 text-[#C2410C]">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="truncate px-2 py-0.5 capitalize text-slate-600">
                      {String(ref.refundReason || "—").replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-2 py-0.5 text-right font-mono tabular-nums">
                      {Number(ref.refundAmount) > 0 ? formatINR(ref.refundAmount) : "—"}
                    </td>
                    <td className="px-2 py-0.5 text-right font-mono tabular-nums text-[#C2410C]">
                      {Number(ref.creditNoteAmount) > 0 ? formatINR(ref.creditNoteAmount) : "—"}
                    </td>
                    <td className="px-2 py-0.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 px-1.5 text-[9px] font-bold uppercase",
                          ref.status === "COMPLETED" || ref.status === "APPROVED"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : ref.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {ref.workflow || ref.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-0.5">
                      {ref.status === "PENDING_APPROVAL" ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 px-1.5 text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700"
                            onClick={() => {
                              setSelectedRefund(ref);
                              setShowApproveDialog(true);
                            }}
                          >
                            Post
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px] font-semibold text-red-600"
                            onClick={() => {
                              setSelectedRefund(ref);
                              setShowRejectDialog(true);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Synced</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : visibleCredits.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-slate-500">No active store credits</p>
        ) : (
          <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#E3EAF2] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-2 py-1">Credit</th>
                <th className="px-2 py-1">Origin booking</th>
                <th className="px-2 py-1 text-right">Issued</th>
                <th className="px-2 py-1 text-right">Used</th>
                <th className="px-2 py-1 text-right">Left</th>
                <th className="px-2 py-1">Expiry</th>
                <th className="px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {visibleCredits.map((cred: any) => (
                <tr key={cred.refundId || cred.id} className="h-8 border-b border-[#EEF2F6] hover:bg-[#F8FAFC]">
                  <td className="px-2 py-0.5 font-mono font-semibold">
                    {cred.code || cred.refundId}
                    {cred.customerName ? <span className="font-sans font-normal text-slate-500"> · {cred.customerName}</span> : null}
                  </td>
                  <td className="px-2 py-0.5 font-mono text-[#C2410C]">{cred.bookingId || "—"}</td>
                  <td className="px-2 py-0.5 text-right font-mono">
                    {formatINR(cred.originalCreditAmount || cred.originalAmount)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-mono text-slate-500">
                    {formatINR(cred.totalUsed)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-mono font-semibold text-green-700">
                    {formatINR(cred.remainingBalance)}
                  </td>
                  <td className="px-2 py-0.5 text-slate-500">
                    {cred.expiresAt || cred.validityEnd ? safeFormatDate(cred.expiresAt || cred.validityEnd) : "—"}
                    {cred.isExpiringSoon ? <span className="ml-1 text-amber-700">soon</span> : null}
                  </td>
                  <td className="px-2 py-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-1.5 text-[10px] font-semibold"
                      onClick={() => {
                        setSelectedCredit(cred);
                        setApplyAmount(String(cred.remainingBalance || ""));
                        setShowApplyDialog(true);
                      }}
                    >
                      Apply to booking
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Post refund to ERP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This reduces paid on the origin booking, writes a Departure Hub refund receipt, and activates any store credit.
            </DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1 rounded-lg border bg-slate-50 p-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking</span>
                  <span className="font-mono font-bold">{selectedRefund.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cash out</span>
                  <span className="font-mono">{formatINR(selectedRefund.refundAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Store credit</span>
                  <span className="font-mono text-[#C2410C]">{formatINR(selectedRefund.creditNoteAmount)}</span>
                </div>
              </div>
              <Input
                placeholder="Bank UTR / cash reference (optional)"
                value={refundApprovalRef}
                onChange={(e) => setRefundApprovalRef(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={actionLoading} onClick={handleApprove} className="bg-green-600 text-white">
              Confirm post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-700">
              <XCircle className="h-5 w-5" />
              Reject refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Reason is required.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why this refund is rejected..."
            value={refundRejectReason}
            onChange={(e) => setRefundRejectReason(e.target.value)}
            className="h-20 resize-none text-xs"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={actionLoading} onClick={handleReject} className="bg-red-600 text-white">
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CreditCard className="h-5 w-5 text-[#C2410C]" />
              Apply store credit
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Credits the target booking paid amount and posts a Departure Hub receipt.
            </DialogDescription>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-2 text-xs">
              <p className="text-slate-500">
                Left {formatINR(selectedCredit.remainingBalance)} on {selectedCredit.code || selectedCredit.refundId}
              </p>
              <Input
                placeholder="Target booking ID"
                value={applyBookingId}
                onChange={(e) => setApplyBookingId(e.target.value)}
                className="h-8 font-mono text-xs"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={actionLoading} onClick={handleApplyCredit} className="bg-[#0B1528] text-white">
              Apply credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
