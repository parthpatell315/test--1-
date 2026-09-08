/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  stationPaymentService,
  BookingRow,
  DashboardStats,
  StationCashHandover,
  PaymentReceivingAccount,
  StationPaymentCollection as ICollection,
} from "@/services/stationPayment.service";
import {
  Banknote,
  Smartphone,
  X,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Search,
  Download,
  Check,
  ArrowRight,
  Loader2,
  Plus,
  ShieldCheck,
  Building2,
  User2,
  CreditCard,
} from "lucide-react";

const INR = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

const COL_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  NOT_COLLECTED: { label: "Not Collected", cls: "bg-slate-100 text-slate-500" },
  PARTIALLY_COLLECTED: {
    label: "Partial",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  FULLY_COLLECTED: {
    label: "Collected",
    cls: "bg-green-50 text-green-700 border border-green-200",
  },
  UPI_PENDING: {
    label: "UPI Pending",
    cls: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  UPI_VERIFIED: {
    label: "UPI Verified",
    cls: "bg-green-50 text-green-700 border border-green-200",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-red-50 text-red-600 border border-red-200",
  },
};

const PAY_STATUS_BADGE: Record<string, string> = {
  PAID: "bg-green-50 text-green-700 border border-green-200",
  PARTIAL: "bg-amber-50 text-amber-700 border border-amber-200",
  Pending: "bg-slate-100 text-slate-500",
};

interface Props {
  tripId: string;
  departureDateStr: string;
}

type DrawerStep = "form" | "confirm" | "success";

export default function StationPaymentCollection({
  tripId,
  departureDateStr,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [handovers, setHandovers] = useState<StationCashHandover[]>([]);
  const [accounts, setAccounts] = useState<PaymentReceivingAccount[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<DrawerStep>("form");
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [lastCollection, setLastCollection] = useState<ICollection | null>(
    null,
  );

  // Add Account modal state
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [allAccounts, setAllAccounts] = useState<PaymentReceivingAccount[]>([]);
  const [newAcct, setNewAcct] = useState({
    accountName: "",
    accountHolderName: "",
    accountType: "UPI" as "BANK" | "UPI",
    ownershipType: "COMPANY" as "COMPANY" | "STAFF" | "PARTNER",
    bankName: "",
    accountNumber: "",
    upiId: "",
    description: "",
  });

  const loadAllAccounts = useCallback(async () => {
    try {
      const r = await stationPaymentService.getAccounts();
      setAllAccounts(r);
    } catch {
      toast.error("Failed to load accounts");
    }
  }, []);

  const handleAddAccount = async () => {
    if (!newAcct.accountName.trim() || !newAcct.accountHolderName.trim()) {
      toast.error("Account name and holder name are required");
      return;
    }
    if (newAcct.accountType === "UPI" && !newAcct.upiId.trim()) {
      toast.error("UPI ID is required for UPI accounts");
      return;
    }
    if (
      newAcct.accountType === "BANK" &&
      (!newAcct.bankName.trim() || !newAcct.accountNumber.trim())
    ) {
      toast.error("Bank name and account number are required for bank accounts");
      return;
    }
    setAddingAccount(true);
    try {
      await stationPaymentService.createAccount({
        accountName: newAcct.accountName,
        accountHolderName: newAcct.accountHolderName,
        accountType: newAcct.accountType,
        ownershipType: newAcct.ownershipType,
        bankName: newAcct.bankName || undefined,
        maskedAccountNumber: newAcct.accountNumber
          ? `XXXX${newAcct.accountNumber.slice(-4)}`
          : undefined,
        upiId: newAcct.upiId || undefined,
        description: newAcct.description || undefined,
      });
      toast.success("Account added — awaiting Finance Controller approval");
      setAddAccountOpen(false);
      setNewAcct({
        accountName: "",
        accountHolderName: "",
        accountType: "UPI",
        ownershipType: "COMPANY",
        bankName: "",
        accountNumber: "",
        upiId: "",
        description: "",
      });
      await loadAllAccounts();
      await load();
    } catch {
      toast.error("Failed to add account");
    } finally {
      setAddingAccount(false);
    }
  };

  const handleApproveAccount = async (
    id: string,
    isApproved: boolean,
    isActive: boolean,
  ) => {
    try {
      await stationPaymentService.approveAccount(id, { isApproved, isActive });
      toast.success(
        isApproved ? "Account approved by Finance Controller" : "Account unapproved",
      );
      await loadAllAccounts();
      await load();
    } catch {
      toast.error("Failed to update account");
    }
  };

  const [expandedBookings, setExpandedBookings] = useState<string[]>([]);
  const toggleExpand = (id: string) => {
    setExpandedBookings((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Form state
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI">("CASH");
  const [amount, setAmount] = useState("");
  const [station, setStation] = useState("");
  const [platform, setPlatform] = useState("");
  const [collectedFrom, setCollectedFrom] = useState("");
  const [collectedFromMobile, setCollectedFromMobile] = useState("");
  const [collectedAt, setCollectedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [remarks, setRemarks] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [customAccountName, setCustomAccountName] = useState("");

  const load = useCallback(async () => {
    if (!tripId || !departureDateStr) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [dashRes, acctRes] = await Promise.all([
        stationPaymentService.getDashboard({
          tripId,
          departureDate: departureDateStr,
        }),
        stationPaymentService.getAccounts(),
      ]);
      setStats(dashRes.stats);
      setBookings(dashRes.bookings);
      setHandovers(dashRes.handovers);
      const active = acctRes.filter(
        (a: PaymentReceivingAccount) => a.isActive && a.isApproved,
      );
      setAccounts(active);
      setAllAccounts(acctRes);
    } catch {
      toast.error("Failed to load station payment data");
    } finally {
      setLoading(false);
    }
  }, [tripId, departureDateStr]);

  useEffect(() => {
    load();
  }, [load]);

  const openDrawer = (bk: BookingRow) => {
    setSelectedBooking(bk);
    setPaymentMode("CASH");
    setAmount("");
    setStation(bk.stationPayments[0]?.station || "Departure Station");
    setPlatform("");
    setCollectedFrom(bk.name);
    setCollectedFromMobile(bk.phone || "");
    setCollectedAt(new Date().toISOString().slice(0, 16));
    setRemarks("");
    setUtrNumber("");
    setReceivingAccountId("");
    setCustomAccountName("");
    setDrawerStep("form");
    setDrawerOpen(true);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const remaining = selectedBooking
    ? Math.max(
        0,
        selectedBooking.finalAmount -
          selectedBooking.previousPaid -
          selectedBooking.cashCollected -
          selectedBooking.verifiedUpi,
      )
    : 0;
  const newTotalPaid = selectedBooking
    ? selectedBooking.previousPaid +
      selectedBooking.cashCollected +
      selectedBooking.verifiedUpi +
      parsedAmount
    : 0;
  const newRemaining = selectedBooking
    ? Math.max(0, selectedBooking.finalAmount - newTotalPaid)
    : 0;

  const handleConfirm = () => {
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (parsedAmount > remaining + 0.01) {
      toast.error(`Amount exceeds remaining balance of ${INR(remaining)}`);
      return;
    }
    if (!station.trim()) {
      toast.error("Station is required");
      return;
    }
    if (!collectedFrom.trim()) {
      toast.error("Collected from name is required");
      return;
    }
    if (paymentMode === "UPI" && !utrNumber.trim()) {
      toast.error("UTR / Transaction ID is required for UPI");
      return;
    }
    if (paymentMode === "UPI" && !receivingAccountId) {
      toast.error("Select a receiving account");
      return;
    }
    if (
      receivingAccountId === "OTHER" &&
      !customAccountName.trim()
    ) {
      toast.error("Enter custom account name");
      return;
    }
    setDrawerStep("confirm");
  };

  const handleSubmit = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      const result = await stationPaymentService.collect({
        bookingId: selectedBooking.bookingId,
        tripId,
        departureDate: departureDateStr,
        station,
        platform,
        paymentMode,
        amount: parsedAmount,
        collectedFrom,
        collectedFromMobile,
        collectedAt,
        remarks,
        utrNumber: paymentMode === "UPI" ? utrNumber : undefined,
        receivingAccountId:
          receivingAccountId && receivingAccountId !== "OTHER"
            ? receivingAccountId
            : undefined,
        customAccountName:
          receivingAccountId === "OTHER" ? customAccountName : undefined,
      });
      setLastCollection(result.data);
      setDrawerStep("success");
      toast.success(result.message);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Collection failed";
      toast.error(msg);
      setDrawerStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyUpi = async (id: string, action: "VERIFY" | "REJECT") => {
    try {
      await stationPaymentService.verifyUpi(id, action);
      toast.success(
        action === "VERIFY" ? "UPI payment verified & collected!" : "UPI payment rejected",
      );
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed");
    }
  };

  const handleResendEmail = async (id: string) => {
    try {
      const r = await stationPaymentService.resendEmail(id);
      toast.success(r.message);
    } catch {
      toast.error("Failed to resend email");
    }
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      b.bookingId.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.phone || "").includes(q);
    const matchMode =
      !filterMode ||
      b.stationPayments.some((p) => p.paymentMode === filterMode);
    const matchStatus = !filterStatus || b.collectionStatus === filterStatus;
    return matchSearch && matchMode && matchStatus;
  });

  const activeAccount =
    receivingAccountId === "OTHER"
      ? { accountName: customAccountName }
      : accounts.find((a) => a.id === receivingAccountId);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Station
        Payment Data…
      </div>
    );

  const formattedDepDate = departureDateStr
    ? new Date(departureDateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Active Departure";

  return (
    <div className="space-y-4 relative">
      {/* ── Active Departure Scoping Banner ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-[6px] px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center font-bold text-[#FF4D00] text-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Station Collections (Cash & UPI)
              </span>
              <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold">
                Trip Scoped
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Trip: <span className="font-bold text-slate-700">{tripId}</span> • Departure Date: <span className="font-bold text-slate-700">{formattedDepDate} ({departureDateStr})</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Station Collections
        </button>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Package Value",
              value: INR(stats.totalPackageAmount),
              sub: `${stats.totalBookings} bookings`,
              icon: "₹",
              cls: "text-slate-700",
            },
            {
              label: "Pre-Station Paid",
              value: INR(stats.totalPreviouslyPaid),
              sub: "Before departure",
              icon: "✓",
              cls: "text-blue-600",
            },
            {
              label: "Cash Collected",
              value: INR(stats.totalCashCollected),
              sub: `Awaiting: ${INR(stats.cashAwaitingHandover)}`,
              icon: "💵",
              cls: "text-green-600",
            },
            {
              label: "UPI Collected",
              value: INR(stats.totalUpiCollected),
              sub: `Verified: ${INR(stats.totalVerifiedUpi)}`,
              icon: "📱",
              cls: "text-green-600",
            },
            {
              label: "UPI Unverified",
              value: INR(stats.totalUnverifiedUpi),
              sub: "Pending Finance",
              icon: "⚠️",
              cls: "text-amber-600",
            },
            {
              label: "Still Remaining",
              value: INR(stats.totalRemaining),
              sub: `${stats.unpaid} unpaid / ${stats.partiallyPaid} partial`,
              icon: "⏳",
              cls:
                stats.totalRemaining > 0 ? "text-red-600" : "text-green-600",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white border border-slate-200 rounded-[6px] p-3 shadow-xs"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {k.label}
              </div>
              <div className={cn("text-base font-black mt-1", k.cls)}>
                {k.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Collector Summary ────────────────────────────────────────────────── */}
      {stats &&
        (stats.collectorCashSummary.length > 0 ||
          stats.collectorUpiSummary.length > 0) && (
          <div className="bg-white border border-slate-200 rounded-[6px] p-3 shadow-xs">
            <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-[#FF4D00]" /> Cash & UPI by
              Collector
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.collectorCashSummary.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-1.5 bg-slate-50 text-xs"
                >
                  <Banknote className="w-3 h-3 text-green-600" />
                  <span className="font-semibold text-slate-700">{c.name}</span>
                  <span className="text-green-600 font-bold">
                    {INR(c.cash)} Cash
                  </span>
                  {stats.cashHandedOver > 0 && (
                    <span className="text-[10px] text-slate-400">
                      Handed Over: {INR(stats.cashHandedOver)}
                    </span>
                  )}
                </div>
              ))}
              {stats.collectorUpiSummary.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 border border-slate-200 rounded-[4px] px-3 py-1.5 bg-slate-50 text-xs"
                >
                  <Smartphone className="w-3 h-3 text-green-600" />
                  <span className="font-semibold text-slate-700">{c.name}</span>
                  <span className="text-green-600 font-bold">
                    {INR(c.upi)} UPI
                  </span>
                  {c.verified < c.upi && (
                    <span className="text-amber-500 text-[10px]">
                      ({INR(c.verified)} verified)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* ── Filters + Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking, name, mobile…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#FF4D00]"
          />
        </div>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="text-xs px-2 py-2 border border-slate-200 rounded-[4px] bg-white text-slate-600 focus:outline-none"
        >
          <option value="">All Modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI / Online</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-2 py-2 border border-slate-200 rounded-[4px] bg-white text-slate-600 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="NOT_COLLECTED">Not Collected</option>
          <option value="PARTIALLY_COLLECTED">Partially Collected</option>
          <option value="FULLY_COLLECTED">Fully Collected</option>
          <option value="UPI_PENDING">UPI Pending</option>
        </select>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-200 rounded-[4px] hover:bg-slate-50 text-slate-600"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* ── Booking Table ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[6px] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs hidden md:table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {[
                  "Booking",
                  "Passenger",
                  "Mobile",
                  "Final Amt",
                  "Prev Paid",
                  "Remaining",
                  "Cash Coll.",
                  "UPI Coll.",
                  "Pay Status",
                  "Collection",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-left whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-slate-400 text-xs"
                  >
                    No bookings found for this departure.
                  </td>
                </tr>
              ) : (
                filtered.map((bk) => {
                  const isPrePaid =
                    bk.grandRemaining <= 0 && bk.previousPaid >= bk.finalAmount;
                  const cs = isPrePaid
                    ? {
                        label: "Pre-Paid (100%)",
                        cls: "bg-green-50 text-green-700 border border-green-200",
                      }
                    : COL_STATUS_BADGE[bk.collectionStatus] ||
                      COL_STATUS_BADGE.NOT_COLLECTED;
                  const ps =
                    PAY_STATUS_BADGE[bk.paymentStatus] ||
                    "bg-slate-100 text-slate-500";
                  const canCollect = bk.grandRemaining > 0;
                  const upiPending = (bk.stationPayments || []).filter(
                    (p) =>
                      p.paymentMode === "UPI" &&
                      p.upiVerificationStatus === "PENDING_VERIFICATION" &&
                      p.collectionStatus !== "CANCELLED" &&
                      !p.isReversed,
                  );
                  const upiRejected = (bk.stationPayments || []).filter(
                    (p) =>
                      p.paymentMode === "UPI" &&
                      (p.upiVerificationStatus === "REJECTED" ||
                        p.collectionStatus === "CANCELLED"),
                  );
                  return (
                    <React.Fragment key={bk.id}>
                      <tr
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(bk.id)}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-[#FF4D00] text-xs">
                            {bk.bookingId}
                          </span>
                          <span className="ml-2 inline-flex items-center justify-center bg-slate-100 text-slate-500 rounded text-[9px] px-1.5 py-0.5 font-bold tracking-wider">
                            {bk.numberOfPersons || 1} PAX
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                          {bk.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span>{bk.phone || "—"}</span>
                            {bk.phone && (
                              <a
                                href={`tel:${bk.phone}`}
                                className="text-blue-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded-full transition-colors"
                                title="Call"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-700">
                          {INR(bk.finalAmount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">
                              {INR(bk.previousPaid)}
                            </span>
                            {bk.previousPaid > 0 && (
                              <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1 mt-0.5">
                                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="capitalize">
                                  {bk.paymentMode ||
                                    bk.paymentMethod ||
                                    "Online"}
                                </span>
                                {bk.upiReference ? (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    ({bk.upiReference.slice(-6)})
                                  </span>
                                ) : null}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "font-bold",
                              bk.grandRemaining > 0
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {INR(bk.grandRemaining)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {bk.cashCollected > 0 ? (
                            <span className="text-green-600 font-semibold">
                              {INR(bk.cashCollected)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {bk.upiCollected > 0 ? (
                            <div>
                              <span className="text-green-600 font-semibold">
                                {INR(bk.upiCollected)}
                              </span>
                              {upiPending.length > 0 && (
                                <div className="text-[9px] text-amber-500 font-bold mt-0.5 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />{" "}
                                  {upiPending.length} pending
                                </div>
                              )}
                              {upiRejected.length > 0 && (
                                <div className="text-[9px] text-red-600 font-bold mt-0.5">
                                  Rejected
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold",
                              ps,
                            )}
                          >
                            {bk.paymentStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold",
                              cs.cls,
                            )}
                          >
                            {cs.label}
                          </span>
                          {upiPending.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-1 mt-1"
                            >
                              <button
                                onClick={() => handleVerifyUpi(p.id, "VERIFY")}
                                className="text-[9px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerifyUpi(p.id, "REJECT")}
                                className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ))}
                          {upiRejected.map((p) => (
                            <div key={p.id} className="mt-1">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">
                                Rejected
                              </span>
                            </div>
                          ))}
                        </td>
                        <td className="px-3 py-2.5">
                          {canCollect ? (
                            <button
                              onClick={() => openDrawer(bk)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] text-[10px] font-black transition-colors whitespace-nowrap"
                            >
                              <Banknote className="w-3 h-3" /> Collect
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                            </span>
                          )}
                          {bk.stationPayments.length > 0 && (
                            <button
                              onClick={() =>
                                handleResendEmail(
                                  bk.stationPayments[
                                    bk.stationPayments.length - 1
                                  ].id,
                                )
                              }
                              className="mt-1 text-[9px] text-slate-400 hover:text-[#FF4D00] underline block"
                            >
                              Resend Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedBookings.includes(bk.id) && (
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <td colSpan={11} className="px-4 py-3">
                            <div className="space-y-3">
                              {/* Payment Receipts & Means Breakdown */}
                              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
                                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4D00]" /> Payment Means & Receipts Summary
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Pre-Departure Payment</span>
                                    <span className="font-bold text-slate-800">{INR(bk.previousPaid)}</span>
                                    <span className="text-[10px] text-slate-600 block mt-0.5 capitalize">
                                      Mode: {bk.paymentMode || bk.paymentMethod || "Online Gateway / UPI"}
                                    </span>
                                    {bk.upiReference && (
                                      <span className="text-[10px] text-slate-500 font-mono block">Ref: {bk.upiReference}</span>
                                    )}
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Station Cash Received</span>
                                    <span className="font-bold text-green-700">{INR(bk.cashCollected)}</span>
                                    <span className="text-[10px] text-slate-600 block mt-0.5">
                                      {bk.cashCollected > 0 ? "Collected at station" : "No cash collection"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Station UPI Received</span>
                                    <span className="font-bold text-green-700">{INR(bk.upiCollected)}</span>
                                    <span className="text-[10px] text-slate-600 block mt-0.5">
                                      {bk.verifiedUpi > 0 ? `Verified: ${INR(bk.verifiedUpi)}` : "None verified"}
                                    </span>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Total Balance Due</span>
                                    <span className={cn("font-bold", bk.grandRemaining > 0 ? "text-red-600" : "text-green-600")}>
                                      {INR(bk.grandRemaining)}
                                    </span>
                                    <span className="text-[10px] text-slate-600 block mt-0.5">
                                      {bk.grandRemaining <= 0 ? "100% Fully Settled ✓" : "Outstanding balance"}
                                    </span>
                                  </div>
                                </div>

                                {/* Detailed Accounting Entries / Receipts */}
                                {bk.accountingEntries && bk.accountingEntries.length > 0 && (
                                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                                      Finance Ledger Receipts
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {bk.accountingEntries.map((ae: any) => (
                                        <div key={ae.id} className="text-[11px] bg-slate-50 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-2">
                                          <span className="font-bold text-slate-800">{INR(ae.amount)}</span>
                                          <span className="text-slate-500 font-medium uppercase text-[10px]">{ae.paymentMode}</span>
                                          {ae.referenceNumber && (
                                            <span className="text-slate-400 font-mono text-[9px]">Ref: {ae.referenceNumber}</span>
                                          )}
                                          <span className="text-green-700 font-semibold text-[9px] bg-green-50 px-1 py-0.5 rounded">
                                            {ae.status || "APPROVED"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Passengers Manifest */}
                              {bk.members && bk.members.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {bk.members.map((m: any, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
                                    >
                                      <div>
                                        <div className="text-[11px] font-bold text-slate-700">{m.name || "Traveller"}</div>
                                        <div className="text-[10px] font-medium text-slate-500">{m.phone || "No phone"}</div>
                                      </div>
                                      {m.phone && (
                                        <a
                                          href={`tel:${m.phone}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="ml-auto text-blue-600 hover:text-blue-700 p-1 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                                          title="Call passenger"
                                        >
                                          <Smartphone className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No bookings found for this departure.
              </div>
            ) : (
              filtered.map((bk) => {
                const isPrePaid =
                  bk.grandRemaining <= 0 && bk.previousPaid >= bk.finalAmount;
                const cs = isPrePaid
                  ? {
                      label: "Pre-Paid (100%)",
                      cls: "bg-green-50 text-green-700 border border-green-200",
                    }
                  : COL_STATUS_BADGE[bk.collectionStatus] ||
                    COL_STATUS_BADGE.NOT_COLLECTED;
                const ps =
                  PAY_STATUS_BADGE[bk.paymentStatus] ||
                  "bg-slate-100 text-slate-500";
                const canCollect = bk.grandRemaining > 0;
                const upiPending = (bk.stationPayments || []).filter(
                  (p) =>
                    p.paymentMode === "UPI" &&
                    p.upiVerificationStatus === "PENDING_VERIFICATION" &&
                    p.collectionStatus !== "CANCELLED" &&
                    !p.isReversed,
                );
                const upiRejected = (bk.stationPayments || []).filter(
                  (p) =>
                    p.paymentMode === "UPI" &&
                    (p.upiVerificationStatus === "REJECTED" ||
                      p.collectionStatus === "CANCELLED"),
                );
                return (
                  <div key={bk.id} className="p-4 flex flex-col gap-3">
                    <div
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleExpand(bk.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-[#FF4D00] text-sm">
                            {bk.bookingId}
                          </div>
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-500 rounded text-[9px] px-1.5 py-0.5 font-bold tracking-wider">
                            {bk.numberOfPersons || 1} PAX
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {bk.name}
                        </div>
                        <div className="text-slate-500 text-xs mt-1 flex items-center gap-2">
                          <span>{bk.phone || "—"}</span>
                          {bk.phone && (
                            <a
                              href={`tel:${bk.phone}`}
                              className="text-blue-500 hover:text-blue-600 p-1.5 bg-blue-50 rounded-full transition-colors"
                              title="Call"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            ps,
                          )}
                        >
                          {bk.paymentStatus}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            cs.cls,
                          )}
                        >
                          {cs.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-[4px] border border-slate-100">
                      <div>
                        <div className="text-slate-400 font-bold text-[9px] uppercase">
                          Final Amt
                        </div>
                        <div className="font-bold text-slate-700 mt-0.5">
                          {INR(bk.finalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-bold text-[9px] uppercase">
                          Prev Paid
                        </div>
                        <div className="font-medium text-slate-600 mt-0.5 flex flex-col">
                          <span>{INR(bk.previousPaid)}</span>
                          {bk.previousPaid > 0 && (
                            <span className="text-[9px] text-slate-400 capitalize">
                              via {bk.paymentMode || bk.paymentMethod || "Online"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-bold text-[9px] uppercase">
                          Remaining
                        </div>
                        <div
                          className={cn(
                            "font-black text-sm mt-0.5",
                            bk.grandRemaining > 0
                              ? "text-red-600"
                              : "text-green-600",
                          )}
                        >
                          {INR(bk.grandRemaining)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-bold text-[9px] uppercase">
                          Collected Here
                        </div>
                        <div className="mt-0.5">
                          {bk.cashCollected > 0 || bk.upiCollected > 0 ? (
                            <div className="font-semibold text-slate-700 flex gap-1">
                              {bk.cashCollected > 0 && (
                                <span className="text-green-600">
                                  {INR(bk.cashCollected)} C
                                </span>
                              )}
                              {bk.upiCollected > 0 && (
                                <span className="text-green-600">
                                  {INR(bk.upiCollected)} U
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {upiRejected.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {upiRejected.map((p) => (
                          <div
                            key={p.id}
                            className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-[10px] font-bold"
                          >
                            Rejected UPI payment of {INR(p.amount)} {p.remarks ? `(${p.remarks})` : ""}
                          </div>
                        ))}
                      </div>
                    )}

                    {upiPending.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        {upiPending.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-amber-50 border border-amber-100 p-2 rounded-[4px]"
                          >
                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending UPI{" "}
                              {INR(p.amount)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleVerifyUpi(p.id, "VERIFY")}
                                className="text-[9px] font-bold px-2 py-1 bg-green-600 text-white rounded shadow-sm"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerifyUpi(p.id, "REJECT")}
                                className="text-[9px] font-bold px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      {bk.stationPayments.length > 0 ? (
                        <button
                          onClick={() =>
                            handleResendEmail(
                              bk.stationPayments[bk.stationPayments.length - 1]
                                .id,
                            )
                          }
                          className="text-[10px] text-slate-400 hover:text-[#FF4D00] underline font-medium"
                        >
                          Resend Receipt
                        </button>
                      ) : (
                        <div />
                      )}

                      {canCollect ? (
                        <button
                          onClick={() => openDrawer(bk)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] text-xs font-black transition-colors shadow-sm"
                        >
                          <Banknote className="w-4 h-4" /> Collect
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Settled
                        </span>
                      )}
                    </div>

                    {expandedBookings.includes(bk.id) &&
                      bk.members &&
                      bk.members.length > 0 && (
                        <div className="mt-1 pt-3 border-t border-slate-100 flex flex-col gap-2">
                          {bk.members.map((m, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200 shadow-sm"
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-700">
                                  {m.name || "Traveller"}
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                                  {m.phone || "No phone"}
                                </div>
                              </div>
                              {m.phone && (
                                <a
                                  href={`tel:${m.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 hover:text-blue-700 p-1.5 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                                  title="Call"
                                >
                                  <Smartphone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Departure Summary Card ───────────────────────────────────────────── */}
      {stats && (
        <div className="bg-white border border-slate-200 rounded-[6px] p-4 shadow-xs">
          <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-3">
            Departure Collection Summary
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              {
                label: "Final Package Value",
                v: INR(stats.totalPackageAmount),
              },
              {
                label: "Received Before Station",
                v: INR(stats.totalPreviouslyPaid),
              },
              { label: "Cash at Station", v: INR(stats.totalCashCollected) },
              { label: "UPI at Station", v: INR(stats.totalUpiCollected) },
              {
                label: "Verified UPI",
                v: INR(stats.totalVerifiedUpi),
                hi: "text-green-600",
              },
              {
                label: "UPI Pending Verification",
                v: INR(stats.totalUnverifiedUpi),
                hi: "text-amber-600",
              },
              {
                label: "Total Station Collection",
                v: INR(stats.totalStationCollection),
                hi: "text-[#FF4D00] font-black",
              },
              {
                label: "Grand Total Received",
                v: INR(stats.grandTotalReceived),
                hi: "text-green-700 font-black",
              },
              {
                label: "Total Remaining",
                v: INR(stats.totalRemaining),
                hi:
                  stats.totalRemaining > 0
                    ? "text-red-600 font-black"
                    : "text-green-600 font-black",
              },
              {
                label: "Cash Awaiting Handover",
                v: INR(stats.cashAwaitingHandover),
              },
              { label: "Cash Handed Over", v: INR(stats.cashHandedOver) },
              { label: "Cash Reconciled", v: INR(stats.cashReconciled) },
            ].map((r) => (
              <div key={r.label} className="border-b border-slate-100 pb-2">
                <div className="text-[10px] text-slate-400 font-semibold">
                  {r.label}
                </div>
                <div
                  className={cn("font-bold mt-0.5", r.hi || "text-slate-700")}
                >
                  {r.v}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3 pt-3 border-t border-slate-100 text-center text-xs">
            <div className="bg-green-50 rounded-[4px] p-2">
              <div className="text-[10px] text-green-600 font-bold">
                Fully Paid
              </div>
              <div className="text-lg font-black text-green-700">
                {stats.fullyPaid}
              </div>
            </div>
            <div className="bg-amber-50 rounded-[4px] p-2">
              <div className="text-[10px] text-amber-600 font-bold">
                Partially Paid
              </div>
              <div className="text-lg font-black text-amber-700">
                {stats.partiallyPaid}
              </div>
            </div>
            <div className="bg-red-50 rounded-[4px] p-2">
              <div className="text-[10px] text-red-600 font-bold">Unpaid</div>
              <div className="text-lg font-black text-red-600">
                {stats.unpaid}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDE DRAWER ─────────────────────────────────────────────────────── */}
      {drawerOpen && selectedBooking && (
        <div className="fixed inset-0 z-[9999] flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => {
              if (!submitting) setDrawerOpen(false);
            }}
          />

          {/* Drawer panel */}
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="font-black text-slate-800 text-sm">
                  Collect Payment
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedBooking.bookingId} · {selectedBooking.name}
                </div>
              </div>
              <button
                onClick={() => {
                  if (!submitting) setDrawerOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {drawerStep === "success" ? (
              /* ── Success State ────────────────────────────────────────────── */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-black text-slate-800 text-lg mb-1">
                  Payment Recorded!
                </h2>
                <p className="text-sm text-slate-500 mb-2">
                  Receipt:{" "}
                  <strong className="text-[#FF4D00]">
                    {lastCollection?.receiptNumber}
                  </strong>
                </p>
                {paymentMode === "UPI" && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
                    ⚠️ UPI payment is pending Finance verification. Booking
                    balance will update once verified.
                  </p>
                )}
                <p className="text-xs text-slate-400 mb-6">
                  Receipt email sent to customer.
                </p>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-6 py-2.5 bg-[#FF4D00] text-white rounded-[4px] text-sm font-black hover:bg-[#E05E00] transition-colors"
                >
                  Close
                </button>
              </div>
            ) : drawerStep === "confirm" ? (
              /* ── Confirmation Screen ──────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-[6px] p-3 text-xs text-amber-700 font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  Please review carefully before confirming. This will create an
                  immutable payment record.
                </div>

                <div className="bg-white border border-slate-200 rounded-[6px] p-4 space-y-2 text-xs">
                  <div className="font-black text-slate-700 text-sm mb-3">
                    Payment Summary
                  </div>
                  {[
                    { label: "Booking", v: selectedBooking.bookingId },
                    { label: "Customer", v: selectedBooking.name },
                    {
                      label: "Payment Mode",
                      v: paymentMode === "CASH" ? "Cash" : "UPI / Online",
                    },
                    ...(paymentMode === "UPI"
                      ? [{ label: "UTR / Transaction ID", v: utrNumber }]
                      : []),
                    ...(activeAccount
                      ? [
                          {
                            label:
                              paymentMode === "CASH"
                                ? "Cash Collection Account"
                                : "Received In",
                            v: activeAccount.accountName || "—",
                          },
                        ]
                      : []),
                    { label: "Station", v: station },
                    { label: "Collected From", v: collectedFrom },
                    {
                      label: "Collection Date",
                      v: new Date(collectedAt).toLocaleString("en-IN"),
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex justify-between py-1.5 border-b border-slate-100"
                    >
                      <span className="text-slate-500">{r.label}</span>
                      <span className="font-semibold text-slate-800">
                        {r.v}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Previously Paid</span>
                      <span className="font-semibold">
                        {INR(
                          selectedBooking.previousPaid +
                            selectedBooking.cashCollected +
                            selectedBooking.verifiedUpi,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600 font-bold">
                      <span>+ Collecting Now</span>
                      <span>{INR(parsedAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-[#FF4D00]">
                      <span>New Total Paid</span>
                      <span>
                        {paymentMode === "CASH"
                          ? INR(newTotalPaid)
                          : "After Finance Verification"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-600">Remaining After</span>
                      <span
                        className={
                          paymentMode === "CASH" && newRemaining <= 0
                            ? "text-green-600"
                            : "text-slate-600"
                        }
                      >
                        {paymentMode === "CASH"
                          ? INR(newRemaining)
                          : INR(remaining)}
                      </span>
                    </div>
                    {paymentMode === "UPI" && (
                      <div className="text-amber-600 text-[10px] font-semibold">
                        Balance updates after Finance verification.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDrawerStep("form")}
                    className="flex-1 py-2.5 border border-slate-200 rounded-[4px] text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    ← Edit
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#FF4D00] hover:bg-[#E05E00] disabled:opacity-60 text-white rounded-[4px] text-xs font-black transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                        Processing…
                      </>
                    ) : (
                      <>
                        Confirm & Send Receipt{" "}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Collection Form ──────────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto">
                {/* Booking Summary */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Final Amount
                      </div>
                      <div className="font-black text-slate-800">
                        {INR(selectedBooking.finalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Paid So Far
                      </div>
                      <div className="font-bold text-green-600">
                        {INR(
                          selectedBooking.previousPaid +
                            selectedBooking.cashCollected +
                            selectedBooking.verifiedUpi,
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        Balance Due
                      </div>
                      <div className="font-black text-red-600 text-sm">
                        {INR(remaining)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Payment Mode Toggle */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                      Payment Mode *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["CASH", "UPI"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMode(m)}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-[6px] border-2 text-sm font-black transition-all",
                            paymentMode === m
                              ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]"
                              : "border-slate-200 text-slate-500 hover:border-slate-300",
                          )}
                        >
                          {m === "CASH" ? (
                            <>
                              <Banknote className="w-4 h-4" /> Cash
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" /> UPI / Online
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Amount *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        max={remaining}
                        className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-[4px] text-sm font-bold focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    {parsedAmount > 0 && parsedAmount <= remaining && (
                      <div className="mt-1 text-xs text-slate-400">
                        Remaining after:{" "}
                        <strong
                          className={
                            newRemaining <= 0
                              ? "text-green-600"
                              : "text-amber-600"
                          }
                        >
                          {INR(
                            paymentMode === "CASH" ? newRemaining : remaining,
                          )}
                        </strong>
                      </div>
                    )}
                    {parsedAmount > remaining + 0.01 && (
                      <div className="mt-1 text-xs text-red-600 font-semibold">
                        ⚠️ Exceeds remaining balance of {INR(remaining)}
                      </div>
                    )}
                  </div>

                  {/* Cash collection account */}
                  {paymentMode === "CASH" && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                        Cash Collection Account
                      </label>
                      <select
                        value={receivingAccountId}
                        onChange={(e) => setReceivingAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none bg-white"
                      >
                        <option value="">-- Select Account (optional) --</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.accountName} (
                            {a.ownershipType === "COMPANY"
                              ? "Company"
                              : a.ownershipType === "STAFF"
                                ? `Staff – ${a.accountHolderName}`
                                : "Partner"}
                            )
                          </option>
                        ))}
                        <option value="OTHER">Other (Custom Name)</option>
                      </select>
                      {receivingAccountId === "OTHER" && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={customAccountName}
                            onChange={(e) =>
                              setCustomAccountName(e.target.value)
                            }
                            placeholder="Enter account name"
                            className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00]"
                          />
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Select the account where this cash will be deposited.
                      </p>
                    </div>
                  )}

                  {/* UPI-specific fields */}
                  {paymentMode === "UPI" && (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                          UTR / Transaction ID *
                        </label>
                        <input
                          type="text"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          placeholder="e.g. 426781234567"
                          className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                          Received In Account *
                        </label>
                        <select
                          value={receivingAccountId}
                          onChange={(e) =>
                            setReceivingAccountId(e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none bg-white"
                        >
                          <option value="">-- Select Account --</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.accountName} (
                              {a.ownershipType === "COMPANY"
                                ? "Company"
                                : a.ownershipType === "STAFF"
                                  ? `Staff – ${a.accountHolderName}`
                                  : "Partner"}
                              )
                            </option>
                          ))}
                          <option value="OTHER">Other (Custom Name)</option>
                        </select>
                        {receivingAccountId === "OTHER" && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={customAccountName}
                              onChange={(e) =>
                                setCustomAccountName(e.target.value)
                              }
                              placeholder="Enter account name"
                              className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00]"
                            />
                          </div>
                        )}
                        {accounts.length === 0 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            No approved accounts. Contact Finance to add
                            accounts.
                          </p>
                        )}
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-2.5 text-[10px] text-amber-700 font-semibold flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        UPI payments require Finance verification. Booking
                        balance will not update until verified.
                      </div>
                    </>
                  )}

                  {/* Station removed from UI per request, handled silently in state/payload */}

                  {/* Collected from */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                        Collected From *
                      </label>
                      <input
                        type="text"
                        value={collectedFrom}
                        onChange={(e) => setCollectedFrom(e.target.value)}
                        placeholder="Person's name"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                        Their Mobile
                      </label>
                      <input
                        type="tel"
                        value={collectedFromMobile}
                        onChange={(e) => setCollectedFromMobile(e.target.value)}
                        placeholder="Mobile number"
                        className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00]"
                      />
                    </div>
                  </div>

                  {/* Date/Time & Remarks */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Collection Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={collectedAt}
                      onChange={(e) => setCollectedAt(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Remarks
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={2}
                      placeholder="Optional notes…"
                      className="w-full px-3 py-2 border border-slate-200 rounded-[4px] text-xs focus:outline-none focus:border-[#FF4D00] resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer CTA (form step only) */}
            {drawerStep === "form" && (
              <div className="px-5 py-4 border-t border-slate-200 bg-white shrink-0">
                <button
                  onClick={handleConfirm}
                  disabled={
                    !parsedAmount ||
                    parsedAmount > remaining + 0.01 ||
                    !station.trim() ||
                    !collectedFrom.trim() ||
                    (paymentMode === "UPI" &&
                      (!utrNumber.trim() || !receivingAccountId)) ||
                    (receivingAccountId === "OTHER" && !customAccountName.trim())
                  }
                  className="w-full py-3 bg-[#FF4D00] hover:bg-[#E05E00] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[4px] text-sm font-black transition-colors flex items-center justify-center gap-2"
                >
                  Review Collection <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


