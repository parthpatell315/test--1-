import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RotateCw,
  DollarSign,
  ArrowDownRight,
  Banknote,
  FileText,
  Eye,
  User,
  ShieldCheck,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Layers,
  Building,
  ChevronDown,
  ChevronUp,
  CheckCheck,
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
import { cn, safeFormatDate } from "@/lib/utils";
import { financeControllerService } from "@/services/financeController.service";
import { financeApprovalsService } from "@/services/financeApprovals.service";
import { bookingsService } from "@/services/bookings.service";
import BookingDetailsModal from "@/components/admin/BookingDetailsModal";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IncomingPaymentItem, CashSubmissionItem } from "@/types";
import {
  canVerifyCollection,
  canonicalCollectionStatus,
  isCollectionPending,
  isCollectionRejected,
  isCollectionVerified,
  isEligibleCollectionAssignee,
  canApproveStationCash,
} from "@/utils/collectionVerification";

interface IncomingPaymentsApprovalPageProps {
  hideHeader?: boolean;
}

export default function IncomingPaymentsApprovalPage({
  hideHeader = false,
}: IncomingPaymentsApprovalPageProps) {
  const { admin: currentUser } = useAuthStore();
  const [verifiers, setVerifiers] = useState<{ id: string; name: string; role?: string }[]>([]);

  const canApproveStation = canApproveStationCash(currentUser);
  const canVerify = canVerifyCollection(currentUser);

  const [incomingPayments, setIncomingPayments] = useState<IncomingPaymentItem[]>([]);
  const [cashSubmissions, setCashSubmissions] = useState<CashSubmissionItem[]>([]);
  const [opsClientPayments, setOpsClientPayments] = useState<any[]>([]);
  const [stationCashData, setStationCashData] = useState<{
    summary: any;
    dateGroups: any[];
    allCollections: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => (searchParams.get("q") || "").trim());
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentType, setPaymentType] = useState<"all" | "booking_cash" | "booking_online" | "station_collection" | "station_datewise">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [selectedStationDate, setSelectedStationDate] = useState<string>("ALL");
  const [expandedStationKeys, setExpandedStationKeys] = useState<Record<string, boolean>>({});

  // Actions
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [previewProofItem, setPreviewProofItem] = useState<any>(null);
  const [actionModalType, setActionModalType] = useState<"verify" | "reject" | "station_batch" | null>(null);
  const [selectedStationBatch, setSelectedStationBatch] = useState<any>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [openingBookingKey, setOpeningBookingKey] = useState<string | null>(null);

  const openBookingDetails = async (item: {
    bookingId?: string | null;
    bookingDbId?: string | null;
    raw?: any;
  }) => {
    const displayId = String(item.bookingId || "").trim();
    if (!displayId || displayId === "—") {
      toast.error("No booking linked to this payment");
      return;
    }

    const candidates = [
      item.bookingDbId,
      item.raw?.booking?.id,
      item.raw?.bookingId,
      item.raw?.booking?.bookingId,
      displayId,
    ]
      .map((v) => String(v || "").trim())
      .filter((v, idx, arr) => v && v !== "—" && arr.indexOf(v) === idx);

    setOpeningBookingKey(displayId);
    try {
      let booking: any = null;
      let lastError: unknown = null;
      for (const id of candidates) {
        try {
          booking = await bookingsService.getById(id);
          if (booking) break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!booking) {
        console.warn("openBookingDetails failed", lastError);
        toast.error("Could not open this booking");
        return;
      }
      setSelectedBookingDetails(booking);
      setBookingModalOpen(true);
    } finally {
      setOpeningBookingKey(null);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, cashRes, stationRes, pendingRes, verifierRes] = await Promise.all([
        financeControllerService.getIncomingQueue({
          search: search.trim() || undefined,
          limit: 50,
        }).catch(() => ({ data: [], pagination: {} })),
        financeControllerService.getCashQueue({
          search: search.trim() || undefined,
          limit: 50,
        }).catch(() => ({ data: [], pagination: {} })),
        financeControllerService.getStationCashQueue({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          search: search.trim() || undefined,
        }).catch(() => ({ summary: {}, dateGroups: [], allCollections: [] })),
        financeApprovalsService.getPendingApprovals().catch(() => null),
        financeControllerService.listCollectionVerifiers().catch(() => []),
      ]);
      setVerifiers(
        (verifierRes || []).filter((user) => isEligibleCollectionAssignee(user)),
      );
      setIncomingPayments(incRes?.data || []);
      setCashSubmissions(cashRes?.data || []);
      setStationCashData(stationRes || { summary: {}, dateGroups: [], allCollections: [] });
      setOpsClientPayments(pendingRes?.pendingApprovals?.items?.customerPayments || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load incoming payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignApprover = async (paymentId: string, assigneeId: string) => {
    setAssigningId(paymentId);
    try {
      await financeControllerService.assignIncomingPayment(
        paymentId,
        assigneeId === "UNASSIGNED" ? null : assigneeId
      );
      toast.success("Approval assignee updated");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign approver");
    } finally {
      setAssigningId(null);
    }
  };

  const handleBatchVerifyStation = (batch: any) => {
    if (!canApproveStation) {
      toast.error("Station cash approvals are restricted to Founder / Superadmin accounts only.");
      return;
    }
    setSelectedStationBatch(batch);
    setActionNotes("");
    setActionModalType("station_batch");
  };

  const confirmBatchVerify = async () => {
    if (!selectedStationBatch) return;
    setActionLoading(true);
    try {
      const ids = selectedStationBatch.items.map((i: any) => i.id);
      await financeControllerService.batchVerifyStationCash({
        collectionIds: ids,
        tripId: selectedStationBatch.tripId,
        departureDate: selectedStationBatch.departureDate,
        station: selectedStationBatch.station,
        action: "APPROVE",
        notes: actionNotes.trim() || undefined,
      });
      toast.success(`Batch verified ${ids.length} passenger cash collections successfully`);
      setActionModalType(null);
      setSelectedStationBatch(null);
      setActionNotes("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Batch verification failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleStationAction = async (item: any, action: "APPROVE" | "REJECT") => {
    if (!canApproveStation) {
      toast.error("Station cash approvals are restricted to Founder / Superadmin accounts only.");
      return;
    }
    setActionLoading(true);
    try {
      await financeControllerService.batchVerifyStationCash({
        collectionIds: [item.id],
        action,
        notes: action === "APPROVE" ? "Single verified by Founder" : "Rejected by Founder",
      });
      toast.success(action === "APPROVE" ? "Station collection verified" : "Station collection rejected");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpandStation = (key: string) => {
    setExpandedStationKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Merge items for normal table
  const opsClientItems = opsClientPayments.map((cp) => ({
      id: cp.id,
      type: "OPS_CLIENT_PAYMENT",
      bookingId: cp.booking?.bookingId || cp.bookingId || "—",
      bookingDbId: cp.booking?.id || null,
      customerName: cp.booking?.fullName || cp.booking?.name || cp.clientName || "Customer",
      amount: cp.amount,
      paymentMode: cp.paymentMode || cp.method || "PAYMENT_LINK",
      reference: cp.reference || cp.transactionRef || cp.gatewayReference || "—",
      date: cp.receivedAt || cp.createdAt,
      approvalStatus: cp.approvalStatus || "PENDING",
      status: canonicalCollectionStatus(cp.approvalStatus, cp.status),
      collectedBy: cp.collectedBy || cp.receivedBy || "Client Collection",
      assigneeId: cp.actionedById || null,
      assigneeName: cp.actionedBy?.name || null,
      notes: cp.notes || cp.remarks,
      proofUrl: cp.proofFileUrl || cp.proofUrl || cp.paymentProof || (cp as any).receiptUrl || null,
      raw: cp,
    }));
  const opsDedupeKeys = new Set(
    opsClientItems.map((item) => `${item.bookingId}|${Number(item.amount) || 0}`),
  );
  const allRawItems = [
    ...opsClientItems,
    ...incomingPayments
      .filter((p) => !opsDedupeKeys.has(`${p.bookingId}|${Number(p.amount) || 0}`))
      .map((p) => ({
      id: p.id,
      type: "ONLINE_OR_BANK",
      bookingId: p.bookingId,
      bookingDbId: (p as any).booking?.id || (p as any).bookingDbId || null,
      customerName: p.customerName || "Customer",
      amount: p.amount,
      paymentMode: p.paymentMode || "PAYMENT_LINK",
      reference: p.transactionRef || p.gatewayReference || p.referenceNumber || "—",
      date: p.receivedAt || p.createdAt,
      approvalStatus: (p as any).approvalStatus || null,
      status: canonicalCollectionStatus((p as any).approvalStatus, p.status),
      collectedBy: p.submittedBy || "Online Gateway / Bank",
      assigneeId: (p as any).actionedById || (p.raw as any)?.actionedById || null,
      assigneeName: (p as any).actionedBy || (p.raw as any)?.actionedBy?.name || null,
      notes: p.notes,
      proofUrl: (p as any).proofFileUrl || (p as any).receiptUrl || (p as any).proofUrl || null,
      opsClientPaymentId: (p as any).opsClientPaymentId || null,
      raw: p,
    })),
    ...cashSubmissions.map((c) => ({
      id: c.id,
      type: "CASH_HANDOVER",
      bookingId: c.bookingId,
      bookingDbId: (c as any).booking?.id || (c as any).bookingDbId || null,
      customerName: c.customerName || "Traveler",
      amount: c.submittedAmount || c.expectedAmount,
      paymentMode: "CASH_HANDOVER",
      reference: c.id?.slice(-8),
      date: c.submittedAt || c.createdAt,
      approvalStatus: (c as any).approvalStatus || null,
      status: canonicalCollectionStatus((c as any).approvalStatus, c.status),
      collectedBy: c.salespersonName || "Sales Executive",
      assigneeId: (c as any).actionedById || (c.raw as any)?.actionedById || null,
      assigneeName: (c as any).actionedBy?.name || (c.raw as any)?.actionedBy?.name || null,
      notes: c.notes,
      proofUrl:
        (c as any).proofFileUrl ||
        (c as any).proofUrl ||
        (c as any).receiptUrl ||
        null,
      opsClientPaymentId: (c as any).opsClientPaymentId || null,
      raw: c,
    })),
    ...((stationCashData?.allCollections || []).map((sc: any) => ({
      id: sc.id,
      type: "STATION_COLLECTION",
      bookingId: sc.bookingId || "—",
      bookingDbId: sc.booking?.id || null,
      customerName: sc.collectedFrom || sc.booking?.fullName || sc.booking?.name || "Station Passenger",
      amount: sc.amount,
      paymentMode: "STATION_CASH",
      reference: sc.receiptNumber || sc.id?.slice(-8),
      date: sc.collectedAt || sc.departureDate,
      approvalStatus: sc.approvalStatus || null,
      status: sc.status,
      collectedBy: `${sc.collectorName || "Station Lead"} (${sc.station})`,
      assigneeId: sc.verifiedByAdminId || null,
      assigneeName: sc.verifiedBy?.name || null,
      notes: `Station: ${sc.station} · Trip: ${sc.tripName || sc.tripId}`,
      proofUrl: sc.proofImageUrl || sc.receiptUrl || null,
      raw: sc,
    }))),
  ];

  const bookingsCashCount = allRawItems.filter(
    (i) => (i.type === "CASH_HANDOVER" || i.paymentMode?.toUpperCase().includes("CASH")) && i.type !== "STATION_COLLECTION"
  ).length;

  const bookingsOnlineCount = allRawItems.filter(
    (i) => i.type !== "CASH_HANDOVER" && i.type !== "STATION_COLLECTION" && !i.paymentMode?.toUpperCase().includes("CASH")
  ).length;

  const stationCollectionsCount = (stationCashData?.allCollections?.length) || allRawItems.filter((i) => i.type === "STATION_COLLECTION").length;

  const allItems = allRawItems.filter((item) => {
    if (paymentType === "booking_cash") {
      if (item.type === "STATION_COLLECTION") return false;
      if (item.type !== "CASH_HANDOVER" && !item.paymentMode?.toUpperCase().includes("CASH")) return false;
    }
    if (paymentType === "booking_online") {
      if (item.type === "CASH_HANDOVER" || item.type === "STATION_COLLECTION" || item.paymentMode?.toUpperCase().includes("CASH")) return false;
    }
    if (paymentType === "station_collection") {
      if (item.type !== "STATION_COLLECTION") return false;
    }
    if (statusFilter !== "ALL") {
      if (item.type === "STATION_COLLECTION") {
        if (statusFilter === "PENDING_VERIFICATION") {
          if (item.status === "VERIFIED" || item.status === "REJECTED") return false;
        } else if (statusFilter === "VERIFIED") {
          if (item.status !== "VERIFIED") return false;
        } else if (statusFilter === "REJECTED" && item.status !== "REJECTED") {
          return false;
        }
      } else if (statusFilter === "PENDING_VERIFICATION") {
        if (!isCollectionPending(item.approvalStatus, item.status)) return false;
      } else if (statusFilter === "VERIFIED") {
        if (!isCollectionVerified(item.approvalStatus)) return false;
      } else if (statusFilter === "REJECTED") {
        if (!isCollectionRejected(item.approvalStatus, item.status)) return false;
      }
    }
    if (assigneeFilter === "ME" && item.assigneeId !== currentUser?.id) return false;
    if (assigneeFilter === "UNASSIGNED" && item.assigneeId) return false;
    return true;
  });

  const stationPendingCount = stationCashData?.summary?.pendingCount || 0;
  const stationVerifiedCount = stationCashData?.summary?.verifiedCount || 0;
  const stationTotalCash = stationCashData?.summary?.totalCashCollected || 0;
  const stationPendingCash = stationCashData?.summary?.totalCashPending || 0;
  const stationVerifiedCash = stationCashData?.summary?.totalCashVerified || 0;

  const isPendingStatus = (item: { approvalStatus?: string | null; status?: string; type?: string }) => {
    if (item.type === "STATION_COLLECTION") {
      return item.status === "PENDING_VERIFICATION" || item.status === "PENDING";
    }
    return isCollectionPending(item.approvalStatus, item.status);
  };

  const isVerifiedStatus = (item: { approvalStatus?: string | null; status?: string; type?: string }) => {
    if (item.type === "STATION_COLLECTION") {
      return item.status === "VERIFIED";
    }
    return isCollectionVerified(item.approvalStatus);
  };

  const pendingCount = paymentType === "station_datewise"
    ? stationPendingCount
    : allItems.filter((i) => isPendingStatus(i)).length;

  const verifiedCount = paymentType === "station_datewise"
    ? stationVerifiedCount
    : allItems.filter((i) => isVerifiedStatus(i)).length;

  const totalVerifiedSum = paymentType === "station_datewise"
    ? stationVerifiedCash
    : allItems.filter((i) => isVerifiedStatus(i)).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const totalPendingSum = paymentType === "station_datewise"
    ? stationPendingCash
    : allItems.filter((i) => isPendingStatus(i)).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const handleVerify = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      if (selectedPayment.type === "STATION_COLLECTION") {
        await financeControllerService.batchVerifyStationCash({
          collectionIds: [selectedPayment.id],
          action: "APPROVE",
          notes: actionNotes.trim() || "Single verified by Founder",
        });
        toast.success("Station collection verified and approved");
      } else if (selectedPayment.type === "OPS_CLIENT_PAYMENT") {
        await financeApprovalsService.verifyCollection(selectedPayment.id, {
          reason: actionNotes.trim() || undefined,
        });
        toast.success("Payment verified and approved");
      } else if (selectedPayment.type === "CASH_HANDOVER") {
        const opsId = selectedPayment.opsClientPaymentId || selectedPayment.raw?.opsClientPaymentId;
        if (opsId) {
          await financeApprovalsService.verifyCollection(opsId, {
            reason: actionNotes.trim() || undefined,
          });
        } else {
          await financeControllerService.performCashAction(selectedPayment.id, {
            action: "APPROVE",
            notes: actionNotes.trim() || undefined,
          });
        }
        toast.success("Cash approved and cleared");
      } else {
        const opsId = selectedPayment.opsClientPaymentId || selectedPayment.raw?.opsClientPaymentId;
        if (opsId) {
          await financeApprovalsService.verifyCollection(opsId, {
            reason: actionNotes.trim() || undefined,
          });
        } else {
          await financeControllerService.performIncomingAction(selectedPayment.id, {
            action: "VERIFY",
            notes: actionNotes.trim() || undefined,
          });
        }
        toast.success("Payment verified and approved successfully");
      }
      setActionModalType(null);
      setSelectedPayment(null);
      setActionNotes("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Verification failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    if (!actionNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      if (selectedPayment.type === "STATION_COLLECTION") {
        await financeControllerService.batchVerifyStationCash({
          collectionIds: [selectedPayment.id],
          action: "REJECT",
          notes: actionNotes.trim(),
        });
      } else if (selectedPayment.type === "OPS_CLIENT_PAYMENT") {
        await financeApprovalsService.rejectCollection(selectedPayment.id, actionNotes.trim());
      } else if (selectedPayment.type === "CASH_HANDOVER") {
        await financeControllerService.performCashAction(selectedPayment.id, {
          action: "REJECT",
          reason: actionNotes.trim(),
        });
      } else {
        await financeControllerService.performIncomingAction(selectedPayment.id, {
          action: "REJECT",
          reason: actionNotes.trim(),
        });
      }
      toast.success("Payment rejected");
      setActionModalType(null);
      setSelectedPayment(null);
      setActionNotes("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-3 font-sans antialiased text-[#162B45]">
      {/* 1. HEADER */}
      {!hideHeader && (
        <div className="flex items-center justify-between bg-white border border-[#E8EEF4] rounded-xl px-5 py-4 border-l-4 border-l-[#FF4D00]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[22px] font-bold text-[#0B1528] tracking-tight leading-none">
                  Approvals
                </h1>
                {!loading && pendingCount > 0 && (
                  <span className="bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/30 rounded-full px-3 py-1 text-[12px] font-semibold">
                    {pendingCount} open
                  </span>
                )}
              </div>
              <p className="text-[13px] text-slate-500 mt-1 leading-none">
                Review and approve customer collections, bank transfers, payment links, and cash submissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search Booking ID, UTR, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-60 pl-8 text-[11px] rounded-lg bg-white border-[#E8EEF4] placeholder-slate-400 focus:border-[#FF4D00] outline-none"
              />
            </div>
            <Button
              onClick={loadData}
              className="h-8 bg-white hover:bg-[#F4F7FB] border border-[#E8EEF4] rounded-lg px-3 text-[#0B1528] text-[11px] font-semibold flex items-center gap-1.5 shadow-none transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-400" /> Refresh
            </Button>
          </div>
        </div>
      )}

      {/* 2. KPI STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* KPI 1: Pending Verification */}
        <div className="relative bg-white border border-[#E8EEF4] rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                Incoming Needs Review
              </p>
              <h3 className="mt-2 text-[22px] font-bold leading-none text-[#0B1528] tabular-nums">
                {loading ? "—" : pendingCount}
              </h3>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Payment entries
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

        {/* KPI 2: Pending Volume */}
        <div className="relative bg-white border border-[#E8EEF4] rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                Pending Value
              </p>
              <h3 className="mt-2 text-[22px] font-bold leading-none text-[#0B1528] tabular-nums">
                {loading ? "—" : (
                  <span>
                    <span className="text-slate-400 text-[16px] mr-0.5">₹</span>
                    {totalPendingSum.toLocaleString("en-IN")}
                  </span>
                )}
              </h3>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Pending value
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 text-[#FF4D00]" />
            </div>
          </div>
        </div>

        {/* KPI 3: Verified */}
        <div className="relative bg-white border border-[#E8EEF4] rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                Verified
              </p>
              <h3 className="mt-2 text-[22px] font-bold leading-none text-[#0B1528] tabular-nums">
                {loading ? "—" : verifiedCount}
              </h3>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Verified entries
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        {/* KPI 4: Verified Total Value */}
        <div className="relative bg-white border border-[#E8EEF4] rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                Verified Value
              </p>
              <h3 className="mt-2 text-[22px] font-bold leading-none text-[#0B1528] tabular-nums">
                {loading ? "—" : (
                  <span>
                    <span className="text-slate-400 text-[16px] mr-0.5">₹</span>
                    {totalVerifiedSum.toLocaleString("en-IN")}
                  </span>
                )}
              </h3>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Verified inflow
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. REVIEW WORKSPACE */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-[#DCE5ED] bg-white">
        {/* Filters Header */}
        <div className="space-y-3 border-b border-[#E5ECF2] bg-[#FBFCFD] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-bold text-[#13283F]">
                Payment review queue
              </h3>
              <p className="mt-0.5 text-[10px] text-[#8293A3]">
                Match references, assign an approver, then clear the entry.
              </p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              className="h-8 shrink-0 rounded-lg border-[#DCE5ED] bg-white px-2.5 text-[10px] font-bold text-[#526A7F] shadow-none hover:bg-slate-50"
            >
              <RotateCw
                className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>

          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="inline-flex shrink-0 gap-1">
              {([
                { key: "all", label: "All", count: allRawItems.length },
                { key: "booking_cash", label: "Bookings cash", count: bookingsCashCount },
                { key: "booking_online", label: "Booking online", count: bookingsOnlineCount },
                { key: "station_collection", label: "Station collection", count: stationCollectionsCount },
                { key: "station_datewise", label: "Station Cash (Date-wise)", count: stationCollectionsCount, icon: true },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPaymentType(tab.key as any)}
                  className={cn(
                    "rounded-full px-3 h-7 text-[12px] font-medium transition-all flex items-center gap-1",
                    paymentType === tab.key
                      ? "bg-[#0B1528] text-white"
                      : "bg-white border border-[#E8EEF4] text-slate-600 hover:bg-[#F4F7FB]"
                  )}
                >
                  {tab.icon && <MapPin className="w-3 h-3" />}
                  {tab.label}
                  <span className={cn("ml-0.5 text-[10px]", paymentType === tab.key ? "opacity-70" : "opacity-50")}>{tab.count}</span>
                </button>
              ))}
            </div>

            {paymentType === "station_datewise" ? (
              <Select value={selectedStationDate} onValueChange={setSelectedStationDate}>
                <SelectTrigger className="h-8 w-44 shrink-0 rounded-lg border-[#DCE5ED] bg-white text-[10px] font-semibold">
                  <Calendar className="w-3 h-3 text-[#FF5A1F] mr-1.5" />
                  <SelectValue placeholder="Filter Departure Date" />
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="ALL">All Departure Dates</SelectItem>
                  {stationCashData?.dateGroups?.map((dg) => (
                    <SelectItem key={dg.departureDate} value={dg.departureDate}>
                      {safeFormatDate(dg.departureDate)} (₹{dg.totalAmount.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-8 w-36 shrink-0 rounded-lg border-[#DCE5ED] bg-white text-[10px] font-semibold">
                  <SelectValue placeholder="Assignee Filter" />
                </SelectTrigger>
                <SelectContent className="rounded">
                  <SelectItem value="ALL">All Assignees</SelectItem>
                  <SelectItem value="ME">Assigned to Me</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { key: "ALL", label: "ALL" },
                { key: "PENDING_VERIFICATION", label: "PENDING" },
                { key: "VERIFIED", label: "VERIFIED" },
                { key: "REJECTED", label: "REJECTED" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "rounded-full px-3 h-7 text-[12px] font-medium uppercase tracking-wide transition-all",
                    statusFilter === tab.key
                      ? "bg-[#0B1528] text-white"
                      : "bg-white border border-[#E8EEF4] text-slate-600 hover:bg-[#F4F7FB]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-0 flex-1 lg:w-52 lg:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8293A3]" />
              <Input
                placeholder={paymentType === "station_datewise" ? "Station, Trip, Passenger..." : "Booking, customer or UTR"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg border-[#DCE5ED] bg-white pl-8 text-[10px] outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>
          </div>
        </div>

        {/* ── CONDITIONAL VIEW: STATION CASH (DATE-WISE GROUPED) VS ONLINE/CASH TABLE ── */}
        {paymentType === "station_datewise" ? (
          <div className="p-3 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !stationCashData?.dateGroups || stationCashData.dateGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center h-[220px]">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <h4 className="text-[12px] font-bold text-[#162B45] uppercase tracking-wider font-montserrat">
                  No Station Cash Collections Found
                </h4>
                <p className="text-[10px] text-[#74839A] mt-1">
                  All station passenger cash collections are fully reconciled or none recorded for the selected filter.
                </p>
              </div>
            ) : (
              stationCashData.dateGroups
                .filter((dg) => selectedStationDate === "ALL" || selectedStationDate === dg.departureDate)
                .map((dg) => (
                  <div key={dg.departureDate} className="space-y-3 rounded-xl border border-[#DCE5ED] bg-[#F8FAFC]/50 p-3">
                    {/* Departure Date Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3EAF2] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0EA] text-[#E84712]">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-[#13283F] flex items-center gap-2">
                            Departure Date: {safeFormatDate(dg.departureDate)}
                            <Badge variant="outline" className="text-[9px] bg-white border-slate-200 text-slate-600">
                              {dg.passengersCount} Collections
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {dg.stationsCount} station desk(s) active on this departure
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-[13px] font-bold font-mono text-green-600">
                            ₹{Number(dg.totalAmount).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            Verified: ₹{Number(dg.verifiedAmount).toLocaleString("en-IN")} · Pending: ₹{Number(dg.pendingAmount).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Station Groups */}
                    <div className="space-y-2.5">
                      {dg.stationGroups.map((sg: any) => {
                        const isExpanded = expandedStationKeys[sg.stationKey] !== false; // expanded by default
                        return (
                          <div key={sg.stationKey} className="overflow-hidden rounded-lg border border-[#DCE5ED] bg-white shadow-2xs">
                            {/* Station Group Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#FBFCFE] px-3.5 py-2.5 border-b border-[#E8EEF4]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#FF4D00]/10 text-[#C2410C] font-bold text-[10px]">
                                  <MapPin className="w-3.5 h-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-[12px] font-bold text-[#13283F] truncate">
                                      {sg.tripName}
                                    </h4>
                                    <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700 font-mono">
                                      {sg.station}
                                    </Badge>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                    <span>👤 Collectors: {sg.collectors.join(", ") || "Station Staff"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right mr-1">
                                  <span className="text-[12px] font-bold font-mono text-green-600 block">
                                    ₹{Number(sg.totalAmount).toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    {sg.pendingItems > 0 ? (
                                      <span className="text-amber-600 font-semibold">{sg.pendingItems} Pending Review</span>
                                    ) : (
                                      <span className="text-green-600 font-semibold">All {sg.verifiedItems} Verified</span>
                                    )}
                                  </span>
                                </div>

                                {sg.pendingItems > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleBatchVerifyStation(sg)}
                                    disabled={!canApproveStation}
                                    title={!canApproveStation ? "Founder access required" : "Batch verify all collections at this station"}
                                    className="h-7 text-[10px] font-bold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Verify Station Batch (₹{sg.pendingAmount.toLocaleString("en-IN")})
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpandStation(sg.stationKey)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>

                            {/* Passenger Collections Table within Station */}
                            {isExpanded && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/70 border-b border-[#E8EEF4] text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      <th className="px-3.5 py-2">Booking ID</th>
                                      <th className="px-3.5 py-2">Passenger / Contact</th>
                                      <th className="px-3.5 py-2 text-right">Cash Collected</th>
                                      <th className="px-3.5 py-2">Proof / Slip</th>
                                      <th className="px-3.5 py-2">Receipt Number</th>
                                      <th className="px-3.5 py-2">Collected By</th>
                                      <th className="px-3.5 py-2">Time</th>
                                      <th className="px-3.5 py-2">Status</th>
                                      <th className="px-3.5 py-2 text-right pr-3.5">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#E8EEF4] text-[10.5px]">
                                    {sg.items.map((item: any) => (
                                      <tr key={item.id} className="hover:bg-[#F8FAFD] transition-colors">
                                        <td className="px-3.5 py-2 font-mono font-bold text-[#E84712]">
                                          <button
                                            type="button"
                                            onClick={() => openBookingDetails(item)}
                                            disabled={openingBookingKey === item.bookingId}
                                            className="hover:underline cursor-pointer text-left disabled:opacity-60"
                                            title="Open booking"
                                          >
                                            {item.bookingId}
                                          </button>
                                        </td>
                                        <td className="px-3.5 py-2">
                                          <div className="font-bold text-[#13283F]">{item.collectedFrom}</div>
                                          {item.collectedFromMobile && (
                                            <div className="text-[9.5px] text-slate-400 font-mono">{item.collectedFromMobile}</div>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2 text-right font-mono font-bold text-green-600 text-[11px]">
                                          ₹{Number(item.amount).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-3.5 py-2">
                                          {item.proofImageUrl || item.receiptUrl ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setPreviewProofItem({
                                                  ...item,
                                                  proofUrl: item.proofImageUrl || item.receiptUrl,
                                                  customerName: item.collectedFrom,
                                                  reference: item.receiptNumber,
                                                  collectedBy: item.collectorName,
                                                  paymentMode: "STATION_CASH",
                                                })
                                              }
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-bold"
                                            >
                                              <Eye className="w-2.5 h-2.5 text-blue-600" />
                                              <span>View Proof</span>
                                            </button>
                                          ) : (
                                            <span className="text-[9px] text-slate-400 italic">No proof</span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2 font-mono text-slate-600 text-[10px]">
                                          {item.receiptNumber}
                                        </td>
                                        <td className="px-3.5 py-2 text-slate-500 font-medium">
                                          {item.collectorName}
                                        </td>
                                        <td className="px-3.5 py-2 text-slate-400 font-mono text-[9.5px]">
                                          {item.collectedAt ? new Date(item.collectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                                        </td>
                                        <td className="px-3.5 py-2">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-[8.5px] font-bold uppercase",
                                              item.status === "VERIFIED"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : item.status === "REJECTED"
                                                ? "bg-red-50 text-red-700 border-red-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}
                                          >
                                            {item.status === "VERIFIED" ? "Verified" : item.status === "REJECTED" ? "Rejected" : "Pending Verification"}
                                          </Badge>
                                        </td>
                                        <td className="px-3.5 py-2 text-right pr-3.5">
                                          {item.status === "PENDING_VERIFICATION" ? (
                                            <div className="flex items-center justify-end gap-1">
                                              <Button
                                                size="sm"
                                                disabled={!canApproveStation}
                                                onClick={() => handleSingleStationAction(item, "APPROVE")}
                                                className="h-6 px-2 text-[9px] font-bold bg-green-600 hover:bg-green-700 text-white"
                                              >
                                                Verify
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={!canApproveStation}
                                                onClick={() => handleSingleStationAction(item, "REJECT")}
                                                className="h-6 px-2 text-[9px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                                              >
                                                Reject
                                              </Button>
                                            </div>
                                          ) : (
                                            <span className="text-[9.5px] text-slate-400 italic">
                                              {item.verifiedBy ? `Verified by ${item.verifiedBy}` : "Verified"}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        ) : (
          /* Normal Online & Sales Cash Payments Table */
          <>
            <div className="hidden overflow-x-auto lg:block">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-[200px]">
                  <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
                  <h4 className="text-[11.5px] font-bold text-[#162B45] uppercase tracking-wider font-montserrat">
                    No Incoming Payments Pending
                  </h4>
                  <p className="text-[10px] text-[#74839A] mt-1">
                    All customer collections and cash handovers are up to date.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E8EEF4] text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5">Booking</th>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Payment</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5">Collected By</th>
                      <th className="px-4 py-2.5">Approval</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAF2] text-[11px] font-semibold text-[#162B45]">
                    {allItems.map((item) => {
                      const isCash =
                        item.type === "CASH_HANDOVER" ||
                        item.paymentMode?.toUpperCase().includes("CASH");

                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors h-[44px]">
                          <td className="px-4 py-2 font-mono text-[12px] font-semibold text-[#FF4D00]">
                            <button
                              type="button"
                              onClick={() => openBookingDetails(item)}
                              disabled={
                                !item.bookingId ||
                                item.bookingId === "—" ||
                                openingBookingKey === item.bookingId
                              }
                              className="hover:underline cursor-pointer text-left disabled:cursor-default disabled:no-underline disabled:opacity-70"
                              title="Open booking"
                            >
                              {item.bookingId || "—"}
                            </button>
                          </td>
                          <td className="px-4 py-2 font-bold text-[#162B45]">
                            {item.customerName}
                          </td>
                          <td className="px-4 py-2">
                            {item.type === "STATION_COLLECTION" ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30 flex items-center gap-1 w-fit"
                              >
                                <MapPin className="w-2.5 h-2.5 text-[#FF4D00]" />
                                Station Collection
                              </Badge>
                            ) : isCash ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 w-fit"
                              >
                                <ShieldCheck className="w-2.5 h-2.5 text-amber-600" />
                                Booking Cash
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-medium bg-[#0B1528]/5 text-[#0B1528] border border-[#E8EEF4] rounded-md px-2 py-0.5 w-fit"
                              >
                                {item.paymentMode?.replace(/_/g, " ")} (Online)
                              </Badge>
                            )}
                            {item.proofUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProofItem(item)}
                                className="mt-1 block text-[10px] font-semibold text-blue-700 hover:underline"
                              >
                                View proof
                              </button>
                            ) : (
                              <span className="mt-1 block text-[10px] text-slate-400 italic">
                                No proof on file
                              </span>
                            )}
                          </td>
                          <td className={cn(
                            "px-4 py-2 text-right font-mono font-bold text-[12px]",
                            isVerifiedStatus(item) ? "text-green-600" : isPendingStatus(item) ? "text-amber-600" : "text-[#0B1528]"
                          )}>
                            ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2 text-slate-500 font-medium text-[10.5px]">
                            {item.collectedBy}
                          </td>
                          <td className="px-4 py-2">
                            {isPendingStatus(item) ? (
                              <Select
                                value={
                                  item.assigneeId && verifiers.some((v) => v.id === item.assigneeId)
                                    ? item.assigneeId
                                    : "UNASSIGNED"
                                }
                                onValueChange={(val) => handleAssignApprover(item.id, val)}
                                disabled={assigningId === item.id}
                              >
                                <SelectTrigger className="h-6.5 text-[10px] w-36 rounded border-slate-200 bg-white font-medium">
                                  <SelectValue placeholder="Assign Approver" />
                                </SelectTrigger>
                                <SelectContent className="rounded">
                                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                                  {verifiers.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                      {staff.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-medium">
                                {item.assigneeName || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-500 font-mono text-[10.5px]">
                            {safeFormatDate(item.date)}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-bold uppercase",
                                isVerifiedStatus(item)
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.status === "REJECTED" || isCollectionRejected(item.approvalStatus, item.status)
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              )}
                            >
                              {isVerifiedStatus(item)
                                ? "VERIFIED"
                                : item.status === "REJECTED" || isCollectionRejected(item.approvalStatus, item.status)
                                  ? "REJECTED"
                                  : "PENDING"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right pr-4">
                            {isPendingStatus(item) ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {isCash && !canVerify ? (
                                  <Button
                                    size="sm"
                                    disabled
                                    title="Cash approvals are restricted to Founder or Finance Controller"
                                    className="h-6.5 text-[9.5px] font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1"
                                  >
                                    Superuser Only
                                  </Button>
                                ) : !canVerify ? (
                                  <span className="text-[10px] text-slate-400 italic font-medium">
                                    Awaiting verification
                                  </span>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPayment(item);
                                        setActionModalType("verify");
                                      }}
                                      className="h-6.5 text-[9.5px] font-bold text-white shadow-none bg-emerald-600 hover:bg-emerald-700"
                                    >
                                      {isCash ? "Verify Cash" : "Verify"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedPayment(item);
                                        setActionModalType("reject");
                                      }}
                                      className="h-6.5 text-[9.5px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic font-medium">
                                {isVerifiedStatus(item) ? "Verified" : item.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="divide-y divide-[#E5ECF2] lg:hidden">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF5A1F] border-t-transparent" />
                </div>
              ) : allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <CreditCard className="mb-2 h-8 w-8 text-slate-300" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#13283F]">
                    Queue clear
                  </h4>
                  <p className="mt-1 text-[10px] text-[#8293A3]">
                    No incoming payments match this filter.
                  </p>
                </div>
              ) : (
                allItems.map((item) => {
                  const isCash =
                    item.type === "CASH_HANDOVER" ||
                    item.paymentMode?.toUpperCase().includes("CASH");
                  const isPending = isPendingStatus(item);

                  return (
                    <div key={item.id} className="space-y-3 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] font-bold text-[#E84712]">
                            <button
                              type="button"
                              onClick={() => openBookingDetails(item)}
                              disabled={
                                !item.bookingId ||
                                item.bookingId === "—" ||
                                openingBookingKey === item.bookingId
                              }
                              className="hover:underline cursor-pointer text-left disabled:cursor-default disabled:no-underline disabled:opacity-70"
                              title="Open booking"
                            >
                              {item.bookingId || "—"}
                            </button>
                          </div>
                          <div className="mt-0.5 truncate text-[13px] font-bold text-[#13283F]">
                            {item.customerName}
                          </div>
                          <div className="mt-1 text-[10px] text-[#8293A3]">
                            {safeFormatDate(item.date)} · {item.collectedBy}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[15px] font-bold tabular-nums text-[#138A68]">
                            ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-1 text-[8px] font-bold uppercase",
                              isVerifiedStatus(item)
                                ? "border-green-200 bg-green-50 text-green-700"
                                : item.status === "REJECTED"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700",
                            )}
                          >
                            {isVerifiedStatus(item) ? "VERIFIED" : item.status === "REJECTED" ? "REJECTED" : "PENDING"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="rounded-lg border border-[#E5ECF2] bg-[#FBFCFD] px-2.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[#8293A3]">
                            Mode
                          </div>
                          <div className="mt-0.5 font-semibold text-[#13283F]">
                            {isCash ? "Cash handover" : item.paymentMode?.replace(/_/g, " ")}
                          </div>
                        </div>
                        <div className="rounded-lg border border-[#E5ECF2] bg-[#FBFCFD] px-2.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[#8293A3]">
                            Reference
                          </div>
                          <div className="mt-0.5 truncate font-mono font-semibold text-[#13283F]">
                            {item.reference || "—"}
                          </div>
                        </div>
                      </div>

                      {isPending ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Select
                            value={
                              item.assigneeId && verifiers.some((v) => v.id === item.assigneeId)
                                ? item.assigneeId
                                : "UNASSIGNED"
                            }
                            onValueChange={(val) => handleAssignApprover(item.id, val)}
                            disabled={assigningId === item.id}
                          >
                            <SelectTrigger className="h-9 w-full text-[10px] rounded border-slate-200 bg-white font-medium">
                              <SelectValue placeholder="Approval assignee" />
                            </SelectTrigger>
                            <SelectContent className="rounded">
                              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                              {verifiers.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isCash && !canVerify ? (
                            <Button
                              size="sm"
                              disabled
                              className="h-9 w-full text-[10px] font-bold"
                            >
                              Founder or Finance Controller required
                            </Button>
                          ) : !canVerify ? (
                            <span className="text-[10px] text-slate-400 italic font-medium">
                              Awaiting verification
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(item);
                                  setActionModalType("verify");
                                }}
                                className="h-9 flex-1 bg-green-600 text-[10px] font-bold hover:bg-green-700"
                              >
                                {isCash ? "Verify cash" : "Verify"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPayment(item);
                                  setActionModalType("reject");
                                }}
                                className="h-9 flex-1 border-red-200 text-[10px] font-bold text-red-600 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STATION BATCH VERIFICATION MODAL
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={actionModalType === "station_batch"} onOpenChange={() => setActionModalType(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-green-700 flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-green-600" />
              Verify Station Cash Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sign off on all cash collections at this departure station in one click.
            </DialogDescription>
          </DialogHeader>

          {selectedStationBatch && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trip & Station:</span>
                  <span className="font-semibold text-slate-800">{selectedStationBatch.tripName} · {selectedStationBatch.station}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Departure Date:</span>
                  <span className="font-semibold text-slate-800">{safeFormatDate(selectedStationBatch.departureDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Collections Count:</span>
                  <span className="font-semibold text-slate-800">{selectedStationBatch.items?.length || 0} passengers</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="text-slate-700 font-bold">Total Batch Amount:</span>
                  <span className="font-mono font-bold text-green-600 text-sm">
                    ₹{Number(selectedStationBatch.pendingAmount || selectedStationBatch.totalAmount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Founder Verification Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Physical cash received & verified with station lead"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModalType(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={confirmBatchVerify}
              className="h-8 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Station Batch Verified
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          VERIFY CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={actionModalType === "verify"} onOpenChange={() => setActionModalType(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Verify payment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              One verification by Founder or Finance Controller marks this collection as approved and verified.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPayment.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{selectedPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-green-600 text-sm">
                    ₹{Number(selectedPayment.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode / Reference:</span>
                  <span className="font-mono text-slate-700">{selectedPayment.paymentMode} · {selectedPayment.reference}</span>
                </div>
              </div>

              {selectedPayment.proofUrl && (
                <div className="border border-blue-200 bg-blue-50/60 p-2.5 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10.5px] font-bold text-blue-900">Payment Proof / Slip Attached</p>
                      <p className="text-[9.5px] text-blue-700">Bank receipt / UPI screenshot available</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewProofItem(selectedPayment)}
                    className="h-6.5 text-[10px] font-bold bg-white text-blue-700 border-blue-300 shadow-2xs hover:bg-blue-50"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View Full Slip
                  </Button>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Verification notes (optional)
                </label>
                <Input
                  placeholder="e.g. Bank credit confirmed on statement"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModalType(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleVerify}
              className="h-8 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm verified
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          PAYMENT PROOF PREVIEW MODAL
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(previewProofItem)} onOpenChange={() => setPreviewProofItem(null)}>
        <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border border-[#DCE5ED] rounded-xl shadow-xl">
          <DialogHeader className="p-4 bg-slate-900 text-white flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white font-montserrat">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Payment Proof / Transaction Slip
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Booking: <span className="font-mono text-amber-300 font-bold">{previewProofItem?.bookingId}</span> · {previewProofItem?.customerName} · <span className="text-emerald-400 font-bold">₹{Number(previewProofItem?.amount || 0).toLocaleString("en-IN")}</span>
              </DialogDescription>
            </div>
            {previewProofItem?.proofUrl && (
              <a
                href={previewProofItem.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-300 hover:text-white underline mr-6 flex items-center gap-1"
              >
                Open Original ↗
              </a>
            )}
          </DialogHeader>

          <div className="p-4 space-y-3 bg-slate-50 max-h-[72vh] overflow-y-auto">
            {previewProofItem?.proofUrl ? (
              <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-inner flex items-center justify-center min-h-[220px]">
                <img
                  src={previewProofItem.proofUrl}
                  alt="Payment Proof"
                  className="max-h-[460px] w-auto max-w-full object-contain rounded"
                  onError={(e) => {
                    (e.target as any).src = "https://placehold.co/600x400/f8fafc/64748b?text=Payment+Proof+Attachment";
                  }}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-lg border">
                No preview image available for this transaction.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">UTR / Ref:</span>
                <span className="font-mono font-bold text-slate-900">{previewProofItem?.reference || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Payment Mode:</span>
                <span className="font-bold text-slate-900">{previewProofItem?.paymentMode || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Amount:</span>
                <span className="font-mono font-bold text-emerald-600">₹{Number(previewProofItem?.amount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Collected By:</span>
                <span className="font-medium text-slate-800">{previewProofItem?.collectedBy || "—"}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-white border-t border-slate-200 flex justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewProofItem(null)}
              className="h-8 text-xs"
            >
              Close
            </Button>
            {previewProofItem && isPendingStatus(previewProofItem) && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedPayment(previewProofItem);
                  setPreviewProofItem(null);
                  setActionModalType("verify");
                }}
                className={cn(
                  "h-8 text-xs font-bold text-white shadow-none",
                  canVerify ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                Verify
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          REJECT PAYMENT MODAL
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={actionModalType === "reject"} onOpenChange={() => setActionModalType(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-700 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Payment Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a mandatory reason for rejecting this payment entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <label className="text-[10px] font-bold uppercase text-red-600">
              Rejection Reason (Required)
            </label>
            <Textarea
              placeholder="State reason (e.g. UTR mismatch, payment declined by bank)..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="text-xs resize-none h-20 border-red-300"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModalType(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleReject}
              className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingDetailsModal
        open={bookingModalOpen}
        onOpenChange={(open) => {
          setBookingModalOpen(open);
          if (!open) setSelectedBookingDetails(null);
        }}
        booking={selectedBookingDetails}
        onRefresh={loadData}
        defaultTab="payments"
      />
    </div>
  );
}


