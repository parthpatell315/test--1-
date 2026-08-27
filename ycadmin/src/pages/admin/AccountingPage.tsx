import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Banknote,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  Building2,
  CreditCard,
  Download,
  Eye,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  X,
  FileText,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  ShieldCheck,
  AlertTriangle,
  Ticket,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Smartphone,
  Receipt,
  FileCheck,
  HelpCircle,
  QrCode,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { canViewProfit } from "@/config/permissions.config";
import {
  collectionAccountsService,
  type CollectionAccount,
} from "@/services/collectionAccounts.service";
import { tripsService } from "@/services/trips.service";
import { bookingsService } from "@/services/bookings.service";
import { paymentsService } from "@/services/payments.service";
import {
  financeApprovalsService,
  type FinanceAuditLogEntry,
} from "@/services/financeApprovals.service";
import { financeControllerService } from "@/services/financeController.service";
import { ImageUpload } from "@/components/admin/ImageUpload";
import api from "@/services/api";
import { cn, formatINR, safeFormatDate, safeFormatDateTime } from "@/lib/utils";

type TabId =
  | "overview"
  | "payments"
  | "expenses"
  | "riya"
  | "accounts"
  | "profitability";

export default function AccountingPage() {
  const { admin: user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = (user?.role || "").toLowerCase();
  const isFounder =
    ["founder", "superadmin"].includes(userRole) ||
    Boolean((user as any)?.isSuperuser);
  const canSeeProfit = canViewProfit(user);

  const navigate = useNavigate();
  const APPROVAL_TAB_ALIASES = new Set([
    "verification",
    "queue",
    "approvals",
    "pending",
  ]);

  // Tab Normalization
  const normalizeTab = (raw: string | null): TabId => {
    const t = (raw || "").toLowerCase().trim();
    if (["payments", "incoming", "collections", "sales_payments", "sales"].includes(t))
      return "payments";
    if (
      [
        "expenses",
        "vendor_payments",
        "vendor-payments",
        "office_expenses",
        "vendors",
        "disbursements",
        "outflows",
      ].includes(t)
    )
      return "expenses";
    if (["riya", "train", "tickets", "train_portal", "riya_wallet"].includes(t))
      return "overview";
    if (["accounts", "bank_accounts", "cash_book", "bank", "banks", "cash"].includes(t))
      return "accounts";
    if (["profitability", "trip_profitability", "profit_loss", "pnl", "reports"].includes(t))
      return "profitability";
    return "overview";
  };

  const rawTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const initial = normalizeTab(rawTabParam);
    if (initial === "profitability" && !canViewProfit(user)) return "overview";
    return initial;
  });

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"));
    if (nextTab === "profitability" && !canSeeProfit) {
      setActiveTab("overview");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "overview");
      setSearchParams(nextParams, { replace: true });
      return;
    }
    setActiveTab((prev) => (prev !== nextTab ? nextTab : prev));
  }, [searchParams, canSeeProfit, setSearchParams]);


  useEffect(() => {
    const raw = (searchParams.get("tab") || "").toLowerCase().trim();
    if (!APPROVAL_TAB_ALIASES.has(raw)) return;
    navigate("/admin/approvals-hub?tab=payment-approvals", { replace: true });
  }, [searchParams, navigate]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams, { replace: true });
  };

  // Main Data States
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);
  const [collectionAccounts, setCollectionAccounts] = useState<CollectionAccount[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState({
    total: 0,
    incoming: 0,
    vendor: 0,
    refunds: 0,
  });
  const [riyaData, setRiyaData] = useState<{
    account: any;
    totalRechargeAmount: number;
    totalTicketsIssuedCount: number;
    totalTicketCostConsumed: number;
    totalRefunds: number;
    availableRiyaBalance: number;
    recharges: any[];
    tickets: any[];
  }>({
    account: null,
    totalRechargeAmount: 0,
    totalTicketsIssuedCount: 0,
    totalTicketCostConsumed: 0,
    totalRefunds: 0,
    availableRiyaBalance: 0,
    recharges: [],
    tickets: [],
  });

  // Search & Filter States
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("ALL");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("ALL");
  const [riyaSearch, setRiyaSearch] = useState("");

  // Selected Account for Ledger Drawer Modal
  const [selectedAccountForLedger, setSelectedAccountForLedger] =
    useState<CollectionAccount | null>(null);
  const [accountLedgerData, setAccountLedgerData] = useState<any | null>(null);
  const [loadingAccountLedger, setLoadingAccountLedger] = useState(false);

  // Modals
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showSubmitFundsModal, setShowSubmitFundsModal] = useState(false);
  const [showRecordExpenseModal, setShowRecordExpenseModal] = useState(false);
  const [showRecordIncomeModal, setShowRecordIncomeModal] = useState(false);
  const [showRechargeRiyaModal, setShowRechargeRiyaModal] = useState(false);

  // In-App Proof Preview Modal
  const [proofPreviewModal, setProofPreviewModal] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    imageUrl: string;
    amount?: number;
    method?: string;
    date?: string;
    txnId?: string;
    accountName?: string;
    status?: string;
  } | null>(null);

  // Forms
  const [newAccForm, setNewAccForm] = useState({
    accountName: "",
    accountHolderName: "",
    accountType: "COMPANY",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    paymentMethods: ["UPI", "BANK_TRANSFER"],
  });
  const [editingAccount, setEditingAccount] = useState<CollectionAccount | null>(null);
  const [editAccForm, setEditAccForm] = useState({
    accountName: "",
    accountHolderName: "",
    accountType: "COMPANY",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    paymentMethods: ["UPI", "BANK_TRANSFER"],
    isActive: true,
  });
  const [submitFundsForm, setSubmitFundsForm] = useState({
    accountId: "",
    amount: "",
    submissionMode: "BANK_TRANSFER",
    referenceNumber: "",
    notes: "",
  });
  const [rechargeRiyaForm, setRechargeRiyaForm] = useState({
    sourceAccountId: "",
    amount: "",
    referenceNumber: "",
    notes: "",
  });
  const [newExpenseForm, setNewExpenseForm] = useState({
    category: "Transport",
    vendorName: "",
    tripId: "",
    amount: "",
    paymentMode: "BANK_TRANSFER",
    collectionAccountId: "",
    transactionId: "",
    proofUrl: "",
    remarks: "",
  });
  const [newIncomeForm, setNewIncomeForm] = useState({
    bookingId: "",
    amount: "",
    paymentMode: "UPI",
    collectionAccountId: "",
    transactionId: "",
    proofUrl: "",
    notes: "",
  });
  const [submittingAction, setSubmittingAction] = useState(false);
  const [proofModalState, setProofModalState] = useState<{
    open: boolean;
    paymentId: string;
    title: string;
    currentProof?: string;
    type: "client" | "vendor";
  } | null>(null);
  const [proofUrlInput, setProofUrlInput] = useState("");
  const [auditModalState, setAuditModalState] = useState<{
    open: boolean;
    paymentId: string;
    title: string;
    loading: boolean;
    auditTrail: FinanceAuditLogEntry[];
    chain?: any;
  } | null>(null);

  // Load All Finance Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const emptyVendor = { data: { data: [] } };
      const emptyRiya = { data: { data: {} } };
      // Founder-oriented payout/Riya endpoints require ops.view. Do not call them
      // for Finance Controller — Incoming Approvals must not surface those 403s.
      const canLoadVendorPayoutApis = ["founder", "superadmin", "super_admin", "admin"].includes(
        String(user?.role || "").toLowerCase(),
      );
      const [bRes, tRes, aRes, vRes, pendingRes, refundPendingRes, rRes] = await Promise.all([
        bookingsService.getAll({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        tripsService.getAll().catch(() => []),
        collectionAccountsService.getAccounts({ activeOnly: true }).catch(() => ({ data: [] })),
        canLoadVendorPayoutApis
          ? api.get("/payments/vendor-payments").catch(() => emptyVendor)
          : Promise.resolve(emptyVendor),
        financeApprovalsService.getPendingApprovals().catch(() => null),
        financeControllerService.refunds.list({ status: "PENDING_APPROVAL", limit: 1 }).catch(() => ({ data: [] })),
        canLoadVendorPayoutApis
          ? api.get("/payments/riya-summary").catch(() => emptyRiya)
          : Promise.resolve(emptyRiya),
      ]);

      const bList = Array.isArray((bRes as any)?.data)
        ? (bRes as any).data
        : Array.isArray(bRes)
          ? bRes
          : [];
      setBookings(bList);
      setTrips(Array.isArray(tRes) ? tRes : []);
      setCollectionAccounts(
        Array.isArray((aRes as any)?.data) ? (aRes as any).data : [],
      );

      const vList = Array.isArray((vRes as any)?.data?.data)
        ? (vRes as any).data.data
        : Array.isArray(vRes?.data)
          ? vRes.data
          : [];
      setVendorPayments(vList);

      if (pendingRes?.pendingApprovals) {
        const breakdown = pendingRes.pendingApprovals.breakdown || {};
        const incoming =
          (breakdown.collectionsPendingFC || 0) +
          (breakdown.collectionsAwaitingFounder || 0);
        const vendor =
          (breakdown.vendorPendingFC || 0) + (breakdown.vendorAwaitingFounder || 0);
        const refunds = Array.isArray(refundPendingRes?.data)
          ? refundPendingRes.data.length
          : 0;
        setPendingApprovals({
          total: pendingRes.pendingApprovals.total || incoming + vendor + refunds,
          incoming,
          vendor,
          refunds,
        });
      }

      if (rRes?.data?.data) {
        setRiyaData(rRes.data.data);
      }
    } catch (err) {
      console.error("Finance data load error:", err);
      toast.error("Failed to refresh finance controller data");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Single Account Ledger
  const handleOpenAccountLedger = async (acc: CollectionAccount) => {
    setSelectedAccountForLedger(acc);
    setLoadingAccountLedger(true);
    try {
      const data = await collectionAccountsService.getAccountLedger(acc.id);
      setAccountLedgerData(data);
    } catch {
      toast.error("Failed to load account ledger details");
    } finally {
      setLoadingAccountLedger(false);
    }
  };

  // Handlers for Modals
  const handleRecordIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncomeForm.bookingId) {
      toast.error("Please select a booking");
      return;
    }
    if (!newIncomeForm.amount || Number(newIncomeForm.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (newIncomeForm.paymentMode !== "CASH" && !newIncomeForm.collectionAccountId) {
      toast.error("Please select the receiving bank / online account for this online payment");
      return;
    }
    setSubmittingAction(true);
    try {
      await api.post(`/payments/client/add/${newIncomeForm.bookingId}`, {
        amount: Number(newIncomeForm.amount),
        paymentMode: newIncomeForm.paymentMode,
        collectionAccountId: newIncomeForm.collectionAccountId || undefined,
        transactionId: newIncomeForm.transactionId || undefined,
        proofUrl: newIncomeForm.proofUrl || undefined,
        status: "Pending Verification",
        notes: newIncomeForm.notes || undefined,
      });
      toast.success("Client payment recorded & submitted for Finance verification!");
      setShowRecordIncomeModal(false);
      setNewIncomeForm({
        bookingId: "",
        amount: "",
        paymentMode: "UPI",
        collectionAccountId: "",
        transactionId: "",
        proofUrl: "",
        notes: "",
      });
      loadData();
    } catch {
      toast.error("Failed to record client payment");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseForm.tripId) {
      toast.error("Please select a trip");
      return;
    }
    if (!newExpenseForm.vendorName.trim()) {
      toast.error("Please enter a vendor / payee name");
      return;
    }
    if (!newExpenseForm.amount || Number(newExpenseForm.amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }
    if (newExpenseForm.paymentMode !== "CASH" && !newExpenseForm.proofUrl) {
      toast.error("Payment proof / screenshot URL is mandatory for online vendor disbursements");
      return;
    }
    setSubmittingAction(true);
    try {
      await api.post(`/payments/vendor/${newExpenseForm.tripId}`, {
        vendorName: newExpenseForm.vendorName.trim(),
        category: newExpenseForm.category,
        agreedAmount: Number(newExpenseForm.amount),
        advancePaid: Number(newExpenseForm.amount),
        paymentMode: newExpenseForm.paymentMode,
        collectionAccountId: newExpenseForm.collectionAccountId || undefined,
        transactionId: newExpenseForm.transactionId || undefined,
        invoiceProof: newExpenseForm.proofUrl || undefined,
        remarks: newExpenseForm.remarks || undefined,
        status: "Pending Approval",
      });
      toast.success("Expense recorded & submitted for Finance verification!");
      setShowRecordExpenseModal(false);
      setNewExpenseForm({
        category: "Transport",
        vendorName: "",
        tripId: "",
        amount: "",
        paymentMode: "BANK_TRANSFER",
        collectionAccountId: "",
        transactionId: "",
        proofUrl: "",
        remarks: "",
      });
      loadData();
    } catch {
      toast.error("Failed to record expense");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRechargeRiyaWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeRiyaForm.sourceAccountId) {
      toast.error("Please select the source bank / fund account");
      return;
    }
    if (!rechargeRiyaForm.amount || Number(rechargeRiyaForm.amount) <= 0) {
      toast.error("Please enter a valid recharge amount");
      return;
    }
    const riyaAcc = collectionAccounts.find((a) =>
      a.accountName.toLowerCase().includes("riya"),
    );
    if (!riyaAcc) {
      toast.error("Riya Train Portal Account not found in treasury");
      return;
    }
    setSubmittingAction(true);
    try {
      await collectionAccountsService.recordTransfer({
        fromAccountId: rechargeRiyaForm.sourceAccountId,
        toAccountId: riyaAcc.id,
        amount: Number(rechargeRiyaForm.amount),
        paymentMode: "BANK_TRANSFER",
        referenceNumber: rechargeRiyaForm.referenceNumber,
        notes: rechargeRiyaForm.notes || "Riya Portal Wallet Recharge for Train Bookings",
      });
      toast.success(
        `Successfully recharged Riya Wallet with ${formatINR(Number(rechargeRiyaForm.amount))}!`,
      );
      setShowRechargeRiyaModal(false);
      setRechargeRiyaForm({
        sourceAccountId: "",
        amount: "",
        referenceNumber: "",
        notes: "",
      });
      loadData();
    } catch {
      toast.error("Failed to recharge Riya Wallet");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFounder) {
      return toast.error("Forbidden: Treasury account configuration is strictly restricted to Founder / Superadmin only.");
    }
    if (!newAccForm.accountName.trim()) {
      return toast.error("Please enter account display name");
    }
    setSubmittingAction(true);
    try {
      await collectionAccountsService.createAccount({
        accountName: newAccForm.accountName.trim(),
        accountHolderName:
          newAccForm.accountHolderName.trim() || newAccForm.accountName.trim(),
        accountType: newAccForm.accountType as any,
        bankName: newAccForm.bankName.trim() || undefined,
        accountNumber: newAccForm.accountNumber.trim() || undefined,
        ifsc: newAccForm.ifsc.trim() || undefined,
        upiId: newAccForm.upiId.trim() || undefined,
        paymentMethods: newAccForm.paymentMethods.length > 0 ? newAccForm.paymentMethods : ["BANK_TRANSFER"],
        isActive: true,
      });
      toast.success(`Account "${newAccForm.accountName}" created successfully!`);
      setShowAddAccountModal(false);
      setNewAccForm({
        accountName: "",
        accountHolderName: "",
        accountType: "COMPANY",
        bankName: "",
        accountNumber: "",
        ifsc: "",
        upiId: "",
        paymentMethods: ["UPI", "BANK_TRANSFER"],
      });
      loadData();
    } catch {
      toast.error("Failed to add account");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenEditAccount = (acc: CollectionAccount) => {
    if (!isFounder) {
      return toast.error("Forbidden: Treasury account editing is strictly restricted to Founder / Superadmin only.");
    }
    setEditingAccount(acc);
    setEditAccForm({
      accountName: acc.accountName || "",
      accountHolderName: acc.accountHolderName || "",
      accountType: acc.accountType || "COMPANY",
      bankName: acc.bankName || "",
      accountNumber: acc.accountNumber || "",
      ifsc: acc.ifsc || "",
      upiId: acc.upiId || "",
      paymentMethods: acc.paymentMethods?.length ? acc.paymentMethods : (acc.accountType === "CASH" ? ["CASH"] : ["UPI", "BANK_TRANSFER"]),
      isActive: acc.isActive !== false,
    });
  };

  const handleSaveEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFounder) {
      return toast.error("Forbidden: Treasury account editing is strictly restricted to Founder / Superadmin only.");
    }
    if (!editingAccount) return;
    if (!editAccForm.accountName.trim()) {
      return toast.error("Please enter account display name");
    }
    setSubmittingAction(true);
    try {
      await collectionAccountsService.updateAccount(editingAccount.id, {
        accountName: editAccForm.accountName.trim(),
        accountHolderName: editAccForm.accountHolderName.trim() || editAccForm.accountName.trim(),
        accountType: editAccForm.accountType as any,
        bankName: editAccForm.bankName.trim() || null,
        accountNumber: editAccForm.accountNumber.trim() || null,
        ifsc: editAccForm.ifsc.trim() || null,
        upiId: editAccForm.upiId.trim() || null,
        paymentMethods: editAccForm.paymentMethods.length > 0 ? editAccForm.paymentMethods : ["BANK_TRANSFER"],
        isActive: editAccForm.isActive,
      });
      toast.success(`Account "${editAccForm.accountName}" updated successfully!`);
      setEditingAccount(null);
      loadData();
    } catch {
      toast.error("Failed to update account");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteAccount = async (acc: CollectionAccount) => {
    if (!isFounder) {
      return toast.error("Forbidden: Treasury account removal is strictly restricted to Founder / Superadmin only.");
    }
    if (!window.confirm(`Are you sure you want to delete "${acc.accountName}"?`)) return;
    try {
      await collectionAccountsService.deleteAccount(acc.id);
      toast.success(`Account "${acc.accountName}" removed.`);
      setCollectionAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      loadData();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const handleSubmitFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitFundsForm.accountId) {
      toast.error("Please select an account");
      return;
    }
    if (!submitFundsForm.amount || Number(submitFundsForm.amount) <= 0) {
      toast.error("Please enter submission amount");
      return;
    }
    setSubmittingAction(true);
    try {
      await collectionAccountsService.recordAccountSubmission(
        submitFundsForm.accountId,
        {
          amount: Number(submitFundsForm.amount),
          submissionMode: submitFundsForm.submissionMode,
          referenceNumber: submitFundsForm.referenceNumber || undefined,
          notes: submitFundsForm.notes || undefined,
        },
      );
      toast.success("Funds submission recorded successfully!");
      setShowSubmitFundsModal(false);
      setSubmitFundsForm({
        accountId: "",
        amount: "",
        submissionMode: "BANK_TRANSFER",
        referenceNumber: "",
        notes: "",
      });
      loadData();
    } catch {
      toast.error("Failed to record fund submission");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Approval badges use finance approvalStatus only — receipt status (Verified/Paid)
  // is operational and must not be shown as "Approved & Verified".
  const getApprovalBadge = (approvalStatus?: string, status?: string, _requiresFounder?: boolean) => {
    if (approvalStatus === "APPROVED_FOUNDER") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle2 className="w-3 h-3 text-green-600" /> Approved & Verified
        </span>
      );
    }
    if (approvalStatus === "REJECTED" || status === "Rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" /> Pending verification
      </span>
    );
  };

  const handleOpenAuditLog = async (paymentId: string, title: string, isVendor = false) => {
    setAuditModalState({
      open: true,
      paymentId,
      title,
      loading: true,
      auditTrail: [],
    });
    try {
      const data = isVendor
        ? await financeApprovalsService.getVendorAuditTrail(paymentId)
        : await financeApprovalsService.getCollectionAuditTrail(paymentId);
      setAuditModalState((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              auditTrail: data.auditTrail || [],
              chain: data.approvalChain,
            }
          : null,
      );
    } catch {
      toast.error("Failed to load audit history");
      setAuditModalState((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handleSaveProofUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModalState || !proofUrlInput.trim()) {
      return toast.error("Please enter a valid screenshot URL or link");
    }
    setSubmittingAction(true);
    try {
      if (proofModalState.type === "vendor") {
        await financeApprovalsService.uploadVendorPaymentProof(proofModalState.paymentId, {
          proofFileUrl: proofUrlInput.trim(),
          proofFileName: "vendor_payout_proof",
        });
      } else {
        await financeApprovalsService.uploadCollectionProof(proofModalState.paymentId, {
          proofFileUrl: proofUrlInput.trim(),
          proofFileName: "payment_receipt.jpg",
        });
      }
      toast.success("Receipt proof uploaded successfully!");
      setProofModalState(null);
      setProofUrlInput("");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload proof");
    } finally {
      setSubmittingAction(false);
    }
  };

  const [syncingTreasury, setSyncingTreasury] = useState(false);

  const handleSyncTreasury = async () => {
    setSyncingTreasury(true);
    try {
      const res = await paymentsService.syncTreasuryMappings();
      toast.success(res.message || "Treasury synchronization complete!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to sync treasury mappings");
    } finally {
      setSyncingTreasury(false);
    }
  };

  const handleReassignPaymentAccount = async (paymentId: string, accountId: string) => {
    if (!paymentId || paymentId.startsWith("adv-")) {
      toast.info("This is an advance balance record. Click 'Sync Treasury' to generate its pending receipt first.");
      return;
    }
    try {
      await paymentsService.updatePaymentAccount(paymentId, accountId);
      toast.success("Receiving account updated successfully");
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update account");
    }
  };

  // Compute all client receipts across bookings
  const allClientReceipts = useMemo(() => {
    const list: any[] = [];
    const resolveAccount = (collectionAccountId?: string, collectionAccount?: any, paymentMode?: string) => {
      if (collectionAccount?.accountName) return { id: collectionAccount.id, name: collectionAccount.accountName };
      if (collectionAccountId && collectionAccounts.length > 0) {
        const found = collectionAccounts.find((a) => a.id === collectionAccountId);
        if (found) return { id: found.id, name: found.accountName };
      }
      if (!collectionAccounts || collectionAccounts.length === 0) {
        return {
          id: "",
          name: paymentMode === "CASH" ? "Cash Collection Account" : "YouthCamping Company Account",
        };
      }
      const normMode = (paymentMode || "UPI").toUpperCase();
      if (normMode.includes("CASH")) {
        const cashAcc = collectionAccounts.find(
          (a) => a.accountType === "CASH" || a.accountName.toLowerCase().includes("cash"),
        );
        if (cashAcc) return { id: cashAcc.id, name: cashAcc.accountName };
      } else if (normMode.includes("BANK")) {
        const bankAcc = collectionAccounts.find(
          (a) => a.accountType === "COMPANY" || a.accountType === "BANK" || Boolean(a.accountNumber),
        );
        if (bankAcc) return { id: bankAcc.id, name: bankAcc.accountName };
      } else {
        const upiAcc =
          collectionAccounts.find(
            (a) =>
              a.accountName.toLowerCase().includes("nikul") ||
              (a.upiId && a.upiId.toLowerCase().includes("nikul")) ||
              a.accountType === "INDIVIDUAL" ||
              a.accountType === "UPI",
          ) || collectionAccounts.find((a) => a.accountType === "COMPANY");
        if (upiAcc) return { id: upiAcc.id, name: upiAcc.accountName };
      }
      return { id: collectionAccounts[0]?.id || "", name: collectionAccounts[0]?.accountName || "YouthCamping Company Account" };
    };

    bookings.forEach((b) => {
      let payments = b.opsClientPayments || b.clientPayments || b.paymentHistory || [];
      if (Array.isArray(payments) && payments.length > 0) {
        payments.forEach((p: any) => {
          const acc = resolveAccount(p.collectionAccountId, p.collectionAccount, p.paymentMode);
          list.push({
            id: p.id || `${b.id}-${p.amount}-${p.createdAt}`,
            bookingId: b.bookingId || b.id,
            customerName: b.fullName || b.customerName || "Customer",
            phone: b.phone || b.mobile || "—",
            tripName: b.tripName || "—",
            departureDate: b.departureDate,
            amount: Number(p.amount) || 0,
            paymentMode: p.paymentMode || "UPI",
            collectionAccountId: p.collectionAccountId || acc.id,
            accountName: acc.name,
            transactionId: p.transactionId || p.utrNumber || "—",
            status: p.status || "Pending Verification",
            approvalStatus: p.approvalStatus || "PENDING",
            proofUrl: p.proofUrl || p.proofImageUrl,
            date: p.paymentDate || p.createdAt || b.createdAt,
            remarks: p.remarks || p.notes || "—",
          });
        });
      } else if (Number(b.advancePaid) > 0) {
        const acc = resolveAccount(b.collectionAccountId, undefined, b.paymentMode);
        list.push({
          id: `adv-${b.id}`,
          bookingId: b.bookingId || b.id,
          customerName: b.fullName || b.customerName || "Customer",
          phone: b.phone || b.mobile || "—",
          tripName: b.tripName || "—",
          departureDate: b.departureDate,
          amount: Number(b.advancePaid) || 0,
          paymentMode: b.paymentMode || "UPI",
          collectionAccountId: acc.id,
          accountName: acc.name,
          transactionId: b.transactionId || "—",
          status: "Pending Verification",
          approvalStatus: "PENDING",
          proofUrl: b.paymentScreenshotUrl,
          date: b.createdAt,
          remarks: "Advance Paid on Booking",
        });
      }
    });

    return list.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    );
  }, [bookings, collectionAccounts]);

  // Aggregate Treasury Metrics
  const treasurySummary = useMemo(() => {
    const totalInflow = allClientReceipts
      .filter((r) => r.approvalStatus === "APPROVED_FOUNDER")
      .reduce((sum, r) => sum + r.amount, 0);

    const totalOutflow =
      vendorPayments
        .filter((v) => v.status === "Paid" || v.status === "Verified")
        .reduce((sum, v) => sum + (Number(v.advancePaid) || 0), 0) +
      riyaData.totalTicketCostConsumed;

    const totalReceivables = bookings.reduce(
      (sum, b) => sum + (Number(b.remainingAmount) || 0),
      0,
    );

    const totalPayables = vendorPayments
      .filter((v) => v.status !== "Paid" && v.status !== "Rejected")
      .reduce((sum, v) => sum + (Number(v.remainingPayable || v.agreedAmount) || 0), 0);

    const netLiquidity = totalInflow - totalOutflow;

    return {
      totalInflow,
      totalOutflow,
      netLiquidity,
      totalReceivables,
      totalPayables,
    };
  }, [allClientReceipts, vendorPayments, riyaData, bookings]);

  // Filtered Client Receipts
  const filteredReceipts = useMemo(() => {
    return allClientReceipts.filter((r) => {
      const matchesSearch =
        paymentSearch === "" ||
        r.customerName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        r.bookingId.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        r.phone.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        r.tripName.toLowerCase().includes(paymentSearch.toLowerCase());

      const matchesMode =
        paymentModeFilter === "ALL" ||
        r.paymentMode?.toUpperCase() === paymentModeFilter;

      const matchesStatus =
        paymentStatusFilter === "ALL" ||
        (paymentStatusFilter === "verified" && r.approvalStatus === "APPROVED_FOUNDER") ||
        (paymentStatusFilter === "pending verification" &&
          r.approvalStatus !== "APPROVED_FOUNDER" &&
          r.approvalStatus !== "REJECTED" &&
          r.status !== "Rejected") ||
        (paymentStatusFilter === "rejected" &&
          (r.approvalStatus === "REJECTED" || r.status === "Rejected"));

      return matchesSearch && matchesMode && matchesStatus;
    });
  }, [allClientReceipts, paymentSearch, paymentModeFilter, paymentStatusFilter]);

  // Filtered Vendor Expenses
  const filteredExpenses = useMemo(() => {
    return vendorPayments.filter((v) => {
      const matchesSearch =
        expenseSearch === "" ||
        v.vendorName?.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        v.trip?.title?.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        v.category?.toLowerCase().includes(expenseSearch.toLowerCase());

      const matchesCategory =
        expenseCategoryFilter === "ALL" ||
        v.category?.toLowerCase() === expenseCategoryFilter.toLowerCase();

      const matchesStatus =
        expenseStatusFilter === "ALL" ||
        (expenseStatusFilter === "PENDING" &&
          (v.approvalStatus === "PENDING" ||
            v.status === "Pending Approval" ||
            v.status === "Not Paid" ||
            ((v.agreedAmount || 0) - (v.advancePaid || 0) > 0))) ||
        (expenseStatusFilter === "REVIEWED" &&
          v.approvalStatus === "REVIEWED_FINANCE_CONTROLLER") ||
        (expenseStatusFilter === "PAID" &&
          (v.approvalStatus === "APPROVED_FOUNDER" || v.status === "Paid"));

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [vendorPayments, expenseSearch, expenseCategoryFilter, expenseStatusFilter]);

  // Section 1: Payments Due & Pending Approval
  const pendingDueExpenses = useMemo(() => {
    return filteredExpenses.filter((v) => {
      const balanceDue = (v.agreedAmount || 0) - (v.advancePaid || 0);
      const isSettled =
        (v.approvalStatus === "APPROVED_FOUNDER" || v.status === "Paid") &&
        balanceDue <= 0;
      return !isSettled;
    });
  }, [filteredExpenses]);

  // Section 2: Completed / Settled Disbursements (Payment Done)
  const completedExpenses = useMemo(() => {
    return filteredExpenses.filter((v) => {
      const balanceDue = (v.agreedAmount || 0) - (v.advancePaid || 0);
      const isSettled =
        (v.approvalStatus === "APPROVED_FOUNDER" || v.status === "Paid") ||
        balanceDue <= 0;
      return isSettled;
    });
  }, [filteredExpenses]);

  // Filtered Riya Tickets
  const filteredRiyaTickets = useMemo(() => {
    return (riyaData.tickets || []).filter((t: any) => {
      if (!riyaSearch.trim()) return true;
      const q = riyaSearch.toLowerCase();
      return (
        t.travelerName?.toLowerCase().includes(q) ||
        t.pnr?.toLowerCase().includes(q) ||
        t.trainNumber?.toLowerCase().includes(q) ||
        t.booking?.fullName?.toLowerCase().includes(q) ||
        t.booking?.tripName?.toLowerCase().includes(q)
      );
    });
  }, [riyaData.tickets, riyaSearch]);

  // Trip Profitability Breakdown
  const tripProfitabilityList = useMemo(() => {
    const tripMap: Record<string, any> = {};

    trips.forEach((t) => {
      let tpl: any = (t as any).trainTicketTemplate;
      if (typeof tpl === "string") {
        try {
          tpl = JSON.parse(tpl);
        } catch (_) {}
      }
      const expPerPax = Number(tpl?.totalExpectedCostPerPassenger) || 0;

      tripMap[t.id] = {
        tripId: t.id,
        tripTitle: t.title,
        tripCode: t.tripCode || t.slug || "—",
        destination: t.destination || "—",
        trainTemplateExpPerPax: expPerPax,
        totalPax: 0,
        grossRevenue: 0,
        collectedRevenue: 0,
        expectedTrainCost: 0,
        ticketCost: 0,
        trainCostVariance: 0,
        vendorCost: 0,
        totalCost: 0,
        grossProfit: 0,
        marginPercent: 0,
      };
    });

    // Add Bookings revenue
    bookings.forEach((b) => {
      const tId = b.tripId;
      if (tripMap[tId]) {
        const pax = Number(b.numberOfTravelers) || 1;
        tripMap[tId].totalPax += pax;
        tripMap[tId].grossRevenue += Number(b.totalAmount || b.amount) || 0;
        tripMap[tId].collectedRevenue += Number(b.advancePaid) || 0;
      }
    });

    // Add Vendor costs
    vendorPayments.forEach((v) => {
      const tId = v.tripId;
      if (tripMap[tId]) {
        tripMap[tId].vendorCost += Number(v.advancePaid || v.agreedAmount) || 0;
      }
    });

    // Add Ticket costs from Riya
    (riyaData.tickets || []).forEach((t: any) => {
      const tId = t.booking?.tripId;
      if (tId && tripMap[tId] && t.ticketStatus !== "CANCELLED") {
        const actual = Number(t.ticketAmount) || 0;
        const expected = Number(t.expectedTicketAmount) || 0;
        tripMap[tId].ticketCost += actual;
        if (expected > 0) {
          tripMap[tId].expectedTrainCost += expected;
        }
      }
    });

    return Object.values(tripMap)
      .map((item: any) => {
        const expectedTrainCost =
          item.expectedTrainCost > 0
            ? item.expectedTrainCost
            : item.trainTemplateExpPerPax * item.totalPax;
        const trainCostVariance = item.ticketCost - expectedTrainCost;
        const totalCost = item.vendorCost + item.ticketCost;
        const grossProfit = item.collectedRevenue - totalCost;
        const marginPercent =
          item.collectedRevenue > 0
            ? Math.round((grossProfit / item.collectedRevenue) * 100 * 10) / 10
            : 0;
        return {
          ...item,
          expectedTrainCost,
          actualTrainCost: item.ticketCost,
          trainCostVariance,
          totalCost,
          grossProfit,
          marginPercent,
        };
      })
      .filter((item) => item.grossRevenue > 0 || item.totalCost > 0)
      .sort((a, b) => b.grossProfit - a.grossProfit);
  }, [trips, bookings, vendorPayments, riyaData.tickets]);

  const filterSelectClass =
    "h-8 min-w-0 cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-2.5 text-[12px] font-medium text-slate-700 shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40";

  const financeTabs: {
    id: TabId;
    label: string;
    meta?: string;
    alert?: boolean;
  }[] = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Collections in", meta: String(allClientReceipts.length) },
    { id: "expenses", label: "Payouts out", meta: String(vendorPayments.length) },
    { id: "accounts", label: "Treasury", meta: String(collectionAccounts.length) },
    ...(canSeeProfit
      ? [{ id: "profitability" as TabId, label: "Trip P&L" }]
      : []),
  ];

  return (
    <div className="min-h-0 min-w-0 space-y-3 text-[#0B1528] antialiased">
      {/* ─── Header + tab bar ─── */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
        <div className="flex min-w-0 flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-[17px] font-semibold tracking-tight text-[#0B1528] md:text-[18px]">
                Finance controller
              </h1>
              <span className="shrink-0 rounded-md border border-[#E8EEF4] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                Live ledger
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {canSeeProfit
                ? "Money ledger, treasury accounts, and trip margins. Pending approvals live under Finance → Incoming / Vendor / Refunds."
                : "Money ledger and treasury accounts. Pending approvals live under Finance → Incoming / Vendor / Refunds."}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-8 gap-1.5 rounded-md border-[#E8EEF4] bg-white px-2.5 text-[12px] font-medium text-slate-600 shadow-none hover:bg-[#F4F7FB] hover:text-[#0B1528]"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#FF4D00]")}
                strokeWidth={1.75}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecordExpenseModal(true)}
              className="h-8 gap-1.5 rounded-md border-[#E8EEF4] bg-white px-2.5 text-[12px] font-medium text-slate-700 shadow-none hover:bg-[#F4F7FB]"
            >
              <TrendingDown className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
              Record expense
            </Button>
            <Button
              size="sm"
              onClick={() => setShowRecordIncomeModal(true)}
              className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none transition-colors hover:bg-[#E04400]"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              Record income
            </Button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="min-w-0 overflow-x-auto no-scrollbar border-t border-[#E8EEF4]">
          <div className="flex flex-nowrap px-1.5 text-[12px] font-medium md:px-2.5">
            {financeTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2.5 transition-colors cursor-pointer sm:px-3",
                    isActive
                      ? "border-[#FF4D00] font-semibold text-[#FF4D00]"
                      : "border-transparent text-slate-500 hover:border-[#E8EEF4] hover:text-[#0B1528]",
                  )}
                >
                  {tab.label}
                  {tab.meta && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                        tab.alert
                          ? "bg-[#FF4D00] text-white"
                          : isActive
                            ? "bg-[#FFF2ED] text-[#FF4D00]"
                            : "bg-[#F4F7FB] text-slate-500",
                      )}
                    >
                      {tab.meta}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="min-w-0 space-y-3">
        {/* ──────────────────────── TAB 1: OVERVIEW ──────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {/* Money position strip */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="grid grid-cols-2 divide-x divide-y divide-[#E8EEF4] lg:grid-cols-4 lg:divide-y-0">
                {[
                  {
                    label: "Verified inflow",
                    value: formatINR(treasurySummary.totalInflow),
                    hint: "Booking advances and station collections",
                    tone: "text-[#0B1528]",
                  },
                  {
                    label: "Verified outflow",
                    value: formatINR(treasurySummary.totalOutflow),
                    hint: "Vendors, train tickets and ops expenses",
                    tone: "text-[#0B1528]",
                  },
                  {
                    label: "Net treasury balance",
                    value: formatINR(treasurySummary.netLiquidity),
                    hint: "Across bank accounts, cash desk and wallets",
                    tone:
                      treasurySummary.netLiquidity >= 0
                        ? "text-[#0B1528]"
                        : "text-red-600",
                  },
                  {
                    label: "Riya wallet balance",
                    value: formatINR(riyaData.availableRiyaBalance),
                    hint: `${riyaData.totalTicketsIssuedCount} tickets issued from portal`,
                    tone: "text-[#0B1528]",
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className="min-w-0 px-3 py-2.5 md:px-4 md:py-3">
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      {kpi.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-lg font-semibold leading-tight tracking-tight tabular-nums md:text-xl",
                        kpi.tone,
                      )}
                    >
                      {kpi.value}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {kpi.hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {pendingApprovals.total > 0 && (
              <div className="rounded-xl border border-[#FFD9C7] bg-[#FFF7F3] px-3 py-3 md:px-4 space-y-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4D00]" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[#0B1528]">
                      {pendingApprovals.total} items waiting in Approval Center
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Approve incoming payments, vendor payouts, and refunds in one place — not on this ledger.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingApprovals.incoming > 0 && (
                    <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => navigate("/admin/approvals-hub?tab=payment-approvals")}>
                      Incoming ({pendingApprovals.incoming})
                    </Button>
                  )}
                  {pendingApprovals.vendor > 0 && (
                    <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => navigate("/admin/approvals-hub?tab=vendor-bills")}>
                      Vendors ({pendingApprovals.vendor})
                    </Button>
                  )}
                  {pendingApprovals.refunds > 0 && (
                    <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => navigate("/admin/approvals-hub?tab=refund-requests")}>
                      Refunds ({pendingApprovals.refunds})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Account Quick Cards */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#E8EEF4] px-3 py-2.5 md:px-4">
                <h3 className="truncate text-[12px] font-semibold text-[#0B1528]">
                  Accounts and money positions
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange("accounts")}
                  className="shrink-0 text-[11px] font-medium text-[#FF4D00] transition-colors hover:text-[#E04400]"
                >
                  View all ledgers
                </button>
              </div>

              <div className="grid grid-cols-1 divide-y divide-[#E8EEF4] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 sm:divide-x">
                {collectionAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleOpenAccountLedger(acc)}
                    className="min-w-0 px-3 py-2.5 text-left transition-colors hover:bg-[#F8FAFC] md:px-4 md:py-3 sm:border-b sm:border-[#E8EEF4] lg:border-b-0"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-medium text-[#0B1528]">
                        {acc.accountName}
                      </span>
                      <span className="shrink-0 rounded border border-[#E8EEF4] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {acc.accountType}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {acc.bankName || acc.accountHolderName}
                    </p>
                    <p className="mt-1.5 text-base font-semibold tracking-tight tabular-nums text-[#0B1528]">
                      {formatINR(acc.pending || 0)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Top Trips P&L Snippet — Founder/Superadmin only */}
            {canSeeProfit && (
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#E8EEF4] px-3 py-2.5 md:px-4">
                <h3 className="truncate text-[12px] font-semibold text-[#0B1528]">
                  Top trips by margin
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange("profitability")}
                  className="shrink-0 text-[11px] font-medium text-[#FF4D00] transition-colors hover:text-[#E04400]"
                >
                  Full P&L report
                </button>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="py-2 px-3 md:px-4">Trip</th>
                      <th className="py-2 px-3 text-center md:px-4">Pax</th>
                      <th className="py-2 px-3 text-right md:px-4">Revenue</th>
                      <th className="py-2 px-3 text-right md:px-4">Ticket cost</th>
                      <th className="py-2 px-3 text-right md:px-4">Vendor cost</th>
                      <th className="py-2 px-3 text-right md:px-4">Gross profit</th>
                      <th className="py-2 px-3 text-right md:px-4">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {tripProfitabilityList.slice(0, 5).map((t) => (
                      <tr key={t.tripId} className="transition-colors hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-medium text-[#0B1528] md:px-4">
                          {t.tripTitle}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-slate-600 md:px-4">
                          {t.totalPax}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums text-[#0B1528] md:px-4">
                          {formatINR(t.collectedRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 md:px-4">
                          {formatINR(t.ticketCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 md:px-4">
                          {formatINR(t.vendorCost)}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 px-3 text-right font-medium tabular-nums md:px-4",
                            t.grossProfit >= 0 ? "text-[#0B1528]" : "text-red-600",
                          )}
                        >
                          {formatINR(t.grossProfit)}
                        </td>
                        <td className="py-2.5 px-3 text-right md:px-4">
                          <span
                            className={cn(
                              "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                              t.marginPercent >= 0
                                ? "border-[#E8EEF4] bg-[#F8FAFC] text-slate-600"
                                : "border-red-100 bg-red-50 text-red-600",
                            )}
                          >
                            {t.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ──────────────────────── TAB 3: INCOMING COLLECTIONS ──────────────────────── */}
        {activeTab === "payments" && (
          <div className="space-y-3">
            {/* Receipts panel */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="flex min-w-0 flex-col gap-2 border-b border-[#E8EEF4] px-3 py-2.5 lg:flex-row lg:items-center">
                <div className="relative w-full min-w-0 lg:w-72">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    placeholder="Search customer, booking ref or phone"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="h-8 rounded-md border-[#E8EEF4] bg-white pl-8 text-[12px] font-medium text-[#0B1528] shadow-none placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                  />
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className={filterSelectClass}
                    aria-label="Filter by payment mode"
                  >
                    <option value="ALL">All modes</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="CASH">Cash desk</option>
                  </select>

                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className={filterSelectClass}
                    aria-label="Filter by status"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="verified">Verified</option>
                    <option value="pending verification">Pending verification</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncTreasury}
                    disabled={syncingTreasury}
                    className="h-8 gap-1.5 rounded-md border-[#E8EEF4] bg-white px-2.5 text-[11px] font-semibold text-[#0B1528] hover:bg-[#F4F7FB] cursor-pointer"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", syncingTreasury && "animate-spin")} />
                    {syncingTreasury ? "Syncing..." : "Sync Treasury"}
                  </Button>
                </div>

                <span className="text-[11px] font-medium text-slate-400 lg:ml-auto">
                  Showing {filteredReceipts.length} receipts
                </span>
              </div>

              <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-[12px]">
                <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Customer / booking</th>
                    <th className="py-2.5 px-4">Trip</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4">Receiving account</th>
                    <th className="py-2.5 px-4">Mode / UTR</th>
                    <th className="py-2.5 px-4">Approval status</th>
                    <th className="py-2.5 px-4">Proof</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF4]">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No client receipts match current search & filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => {
                      const proof = r.proofUrl;
                      return (
                        <tr key={r.id} className="transition-colors hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            {safeFormatDate(r.date)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[#0B1528]">
                            {r.customerName}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Ref: {r.bookingId} · {r.phone}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 truncate max-w-[160px]">
                            {r.tripName}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-green-600">
                            {formatINR(r.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[11px] font-normal bg-slate-50 border-slate-200">
                                🏛️ {r.accountName}
                              </Badge>
                              {collectionAccounts.length > 0 && !r.id.startsWith("adv-") && (
                                <select
                                  value={r.collectionAccountId || ""}
                                  onChange={(e) => handleReassignPaymentAccount(r.id, e.target.value)}
                                  className="h-6 text-[10px] bg-white border border-slate-200 rounded px-1 text-slate-500 hover:text-slate-800 cursor-pointer focus:outline-none"
                                  title="Reassign Treasury Account"
                                >
                                  <option value="" disabled>Change</option>
                                  {collectionAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.accountName}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-medium text-slate-600">{r.paymentMode}</span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {r.transactionId || "—"}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            {getApprovalBadge(r.approvalStatus, r.status)}
                          </td>
                          <td className="py-2.5 px-4">
                            {proof ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setProofPreviewModal({
                                    open: true,
                                    title: `Payment Screenshot - ${r.customerName}`,
                                    subtitle: `Booking Ref: ${r.bookingId}`,
                                    imageUrl: proof,
                                    amount: r.amount,
                                    date: safeFormatDate(r.date),
                                  })
                                }
                                className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:bg-[#F4F7FB] hover:text-[#0B1528] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setProofModalState({
                                    open: true,
                                    paymentId: r.id,
                                    title: `Upload Proof - ${r.customerName} (${formatINR(r.amount)})`,
                                    type: "client",
                                  })
                                }
                                className="h-6 gap-1 rounded px-2 text-[10px] font-medium border-amber-300 bg-amber-50/50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Upload
                              </Button>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleOpenAuditLog(
                                  r.id,
                                  `Audit Trail: ${r.customerName} (${formatINR(r.amount)})`
                                )
                              }
                              title="View approval chain & audit trail"
                              className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium text-slate-500 hover:text-[#0B1528] hover:bg-[#F4F7FB] cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Audit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────── TAB 4: OUTGOING DISBURSEMENTS ──────────────────────── */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
              <span>Pending vendor approvals are actioned in Approval Center, not here.</span>
              <Button size="sm" variant="outline" className="h-7 text-[11px] bg-white" onClick={() => navigate("/admin/approvals-hub?tab=vendor-bills")}>
                Open vendor approvals
              </Button>
            </div>
            {/* Search & Filter Toolbar */}
            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E8EEF4] bg-white p-3 lg:flex-row lg:items-center">
              <div className="relative w-full min-w-0 lg:w-72">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <Input
                  placeholder="Search vendor, trip or category"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="h-8 rounded-md border-[#E8EEF4] bg-white pl-8 text-[12px] font-medium text-[#0B1528] shadow-none placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                />
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className={filterSelectClass}
                  aria-label="Filter by category"
                >
                  <option value="ALL">All categories</option>
                  <option value="Hotels">Hotels and camps</option>
                  <option value="Transport">Transport and fleets</option>
                  <option value="Guides">Guides and leaders</option>
                  <option value="Activities">Activities and permits</option>
                  <option value="Office">Office ops</option>
                </select>

                <select
                  value={expenseStatusFilter}
                  onChange={(e) => setExpenseStatusFilter(e.target.value)}
                  className={filterSelectClass}
                  aria-label="Filter by status"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending approval / Balance due</option>
                  <option value="REVIEWED">Reviewed (FC)</option>
                  <option value="PAID">Approved & Paid</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 lg:ml-auto">
                <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200">
                  Due: {pendingDueExpenses.length}
                </span>
                <span className="rounded bg-green-50 px-2 py-0.5 text-green-700 border border-green-200">
                  Done: {completedExpenses.length}
                </span>
              </div>
            </div>

            {/* SECTION 1: PAYMENTS DUE & PENDING APPROVAL */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-amber-200/80 bg-white shadow-sm">
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-amber-100 bg-amber-50/40 px-3 py-2.5 md:px-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="truncate text-[12px] font-semibold text-[#0B1528]">
                    Payments Due / Pending Approval
                  </span>
                </div>
                <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800">
                  {pendingDueExpenses.length} Pending
                </span>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[1150px] text-left text-[12px]">
                  <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Vendor / payee</th>
                      <th className="py-2.5 px-4">Trip</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Agreed cost</th>
                      <th className="py-2.5 px-4 text-right">Paid out</th>
                      <th className="py-2.5 px-4 text-right">Pending / Due</th>
                      <th className="py-2.5 px-4">Paid from</th>
                      <th className="py-2.5 px-4">Approval status</th>
                      <th className="py-2.5 px-4 text-right">Invoice</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {pendingDueExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400">
                          No pending vendor dues or unapproved payouts.
                        </td>
                      </tr>
                    ) : (
                      pendingDueExpenses.map((v) => {
                        const balanceDue = (v.agreedAmount || 0) - (v.advancePaid || 0);
                        const requiresFounder = v.requiresFounderApproval || balanceDue > 50000;

                        return (
                          <tr key={v.id} className="transition-colors hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                              {safeFormatDate(v.paymentDate || v.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-[#0B1528]">
                              {v.vendorName}
                              <div className="text-[10px] text-slate-400 font-normal">
                                {v.serviceDescription || "Vendor Service"}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 truncate max-w-[160px]">
                              {v.trip?.title || "—"}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {v.category}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-600 font-medium">
                              {formatINR(v.agreedAmount)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-red-600">
                              {formatINR(v.advancePaid)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold">
                              <span className="text-amber-600 font-semibold">{formatINR(balanceDue)}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {v.collectionAccount?.accountName || "Primary bank"}
                            </td>
                            <td className="py-2.5 px-4">
                              {getApprovalBadge(v.approvalStatus, v.status, requiresFounder)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {v.invoiceProof || v.invoiceFileUrl || v.proofUrl ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setProofPreviewModal({
                                      open: true,
                                      title: `Vendor Invoice - ${v.vendorName}`,
                                      subtitle: `Trip: ${v.trip?.title}`,
                                      imageUrl: v.invoiceProof || v.invoiceFileUrl || v.proofUrl,
                                      amount: v.advancePaid,
                                      date: safeFormatDate(v.paymentDate || v.createdAt),
                                    })
                                  }
                                  className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:bg-[#F4F7FB] hover:text-[#0B1528] cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setProofModalState({
                                      open: true,
                                      paymentId: v.id,
                                      title: `Upload payout proof - ${v.vendorName}`,
                                      type: "vendor",
                                    })
                                  }
                                  className="h-6 gap-1 rounded px-2 text-[10px] font-medium border-amber-300 bg-amber-50/50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Upload
                                </Button>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleOpenAuditLog(
                                    v.id,
                                    `Audit Trail: ${v.vendorName} (${formatINR(v.agreedAmount)})`,
                                    true
                                  )
                                }
                                title="View approval chain & audit trail"
                                className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium text-slate-500 hover:text-[#0B1528] hover:bg-[#F4F7FB] cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                Audit
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: PAYMENT DONE / FULLY SETTLED DISBURSEMENTS */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-green-200/80 bg-white shadow-sm">
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-green-100 bg-green-50/40 px-3 py-2.5 md:px-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="truncate text-[12px] font-semibold text-[#0B1528]">
                    Payment Done / Fully Settled Disbursements
                  </span>
                </div>
                <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-green-700">
                  {completedExpenses.length} Completed
                </span>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[1150px] text-left text-[12px]">
                  <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Vendor / payee</th>
                      <th className="py-2.5 px-4">Trip</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Agreed cost</th>
                      <th className="py-2.5 px-4 text-right">Paid out</th>
                      <th className="py-2.5 px-4 text-right">Pending / Due</th>
                      <th className="py-2.5 px-4">Paid from</th>
                      <th className="py-2.5 px-4">Approval status</th>
                      <th className="py-2.5 px-4 text-right">Invoice</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {completedExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400">
                          No completed vendor payments found.
                        </td>
                      </tr>
                    ) : (
                      completedExpenses.map((v) => {
                        return (
                          <tr key={v.id} className="transition-colors hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                              {safeFormatDate(v.paymentDate || v.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-[#0B1528]">
                              {v.vendorName}
                              <div className="text-[10px] text-slate-400 font-normal">
                                {v.serviceDescription || "Vendor Service"}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 truncate max-w-[160px]">
                              {v.trip?.title || "—"}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {v.category}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-600 font-medium">
                              {formatINR(v.agreedAmount)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-green-600">
                              {formatINR(v.advancePaid)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold">
                              <span className="text-green-600 text-[11px] font-medium">Settled (₹0)</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {v.collectionAccount?.accountName || "Primary bank"}
                            </td>
                            <td className="py-2.5 px-4">
                              {getApprovalBadge(v.approvalStatus, v.status, false)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {v.invoiceProof ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setProofPreviewModal({
                                      open: true,
                                      title: `Vendor Invoice - ${v.vendorName}`,
                                      subtitle: `Trip: ${v.trip?.title}`,
                                      imageUrl: v.invoiceProof,
                                      amount: v.advancePaid,
                                      date: safeFormatDate(v.paymentDate || v.createdAt),
                                    })
                                  }
                                  className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:bg-[#F4F7FB] hover:text-[#0B1528] cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleOpenAuditLog(
                                    v.id,
                                    `Audit Trail: ${v.vendorName} (${formatINR(v.agreedAmount)})`,
                                    true
                                  )
                                }
                                title="View approval chain & audit trail"
                                className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium text-slate-500 hover:text-[#0B1528] hover:bg-[#F4F7FB] cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                Audit
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────── TAB 5: RIYA TRAIN PORTAL & WALLET ──────────────────────── */}
        {activeTab === "riya" && (
          <div className="space-y-3">
            {/* Top Riya Wallet KPI Card */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card className="col-span-1 rounded-xl border border-[#152238] bg-[#0B1528] p-4 text-white md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-300">
                    Riya portal available balance
                  </span>
                  <Ticket className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-white">
                    {formatINR(riyaData.availableRiyaBalance)}
                  </span>
                  <span className="rounded border border-[#24314A] bg-[#152238] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    Live IRCTC wallet
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowRechargeRiyaModal(true)}
                    className="h-8 gap-1.5 rounded-md bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB]"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Recharge wallet
                  </Button>
                </div>
              </Card>

              <Card className="rounded-xl border border-[#E8EEF4] bg-white p-4">
                <span className="text-[11px] font-medium text-slate-500">
                  Total recharges
                </span>
                <div className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-[#0B1528]">
                  {formatINR(riyaData.totalRechargeAmount)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {riyaData.recharges?.length || 0} recharge transfers logged
                </p>
              </Card>

              <Card className="rounded-xl border border-[#E8EEF4] bg-white p-4">
                <span className="text-[11px] font-medium text-slate-500">
                  Tickets consumed
                </span>
                <div className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-[#0B1528]">
                  {formatINR(riyaData.totalTicketCostConsumed)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {riyaData.totalTicketsIssuedCount} tickets issued from portal
                </p>
              </Card>
            </div>

            {/* Ticket Consumption Ledger */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="flex min-w-0 flex-col gap-2 border-b border-[#E8EEF4] px-3 py-2.5 lg:flex-row lg:items-center md:px-4">
                <h3 className="min-w-0 text-[12px] font-semibold text-[#0B1528]">
                  Train ticket cost ledger
                </h3>
                <div className="relative w-full min-w-0 lg:ml-auto lg:w-72">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    placeholder="Search traveller, PNR or train"
                    value={riyaSearch}
                    onChange={(e) => setRiyaSearch(e.target.value)}
                    className="h-8 rounded-md border-[#E8EEF4] bg-white pl-8 text-[12px] font-medium text-[#0B1528] shadow-none placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                  />
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-[12px]">
                  <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Journey date</th>
                      <th className="py-2.5 px-4">Traveller</th>
                      <th className="py-2.5 px-4">Trip / departure</th>
                      <th className="py-2.5 px-4">PNR / train</th>
                      <th className="py-2.5 px-4 text-right">Ticket cost</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Wallet deduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {filteredRiyaTickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No train tickets match current search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRiyaTickets.map((t: any) => (
                        <tr key={t.id} className="transition-colors hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            {safeFormatDate(t.journeyDate || t.createdAt)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[#0B1528]">
                            {t.travelerName}
                            <div className="text-[10px] text-slate-400 font-normal">
                              Booking: {t.booking?.fullName} (Ref: {t.bookingId})
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700">
                            {t.booking?.tripName || "—"}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-mono font-medium text-[#0B1528]">
                              {t.pnr || "PENDING"}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {t.trainNumber} {t.trainName}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-[#0B1528]">
                            {formatINR(Number(t.ticketAmount) || 0)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-medium",
                                t.ticketStatus === "CONFIRMED"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : t.ticketStatus === "CANCELLED"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200",
                              )}
                            >
                              {t.ticketStatus}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium tabular-nums text-slate-600">
                            - {formatINR(Number(t.ticketAmount) || 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────── TAB 6: TREASURY & BANK LEDGERS ──────────────────────── */}
        {activeTab === "accounts" && (
          <div className="space-y-3">
            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold tracking-tight text-[#0B1528]">
                    Treasury accounts and cash desks
                  </h2>
                  {isFounder ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                      <ShieldCheck className="w-3 h-3 text-slate-600" /> Founder Treasury Control
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <Lock className="w-3 h-3 text-slate-500" /> Staff Read-Only
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Every account with its reconciled balance, channel mappings and full money ledger.
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {isFounder ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSubmitFundsModal(true)}
                      className="h-8 gap-1.5 rounded-md border-[#E8EEF4] bg-white px-2.5 text-[12px] font-medium text-slate-700 shadow-none hover:bg-[#F4F7FB]"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                      Transfer funds
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddAccountModal(true)}
                      className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400]"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Add account
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-[11px] font-semibold">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Founder-Managed Treasury</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Cards Grid */}
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {collectionAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex min-w-0 flex-col justify-between rounded-xl border border-[#E8EEF4] bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="shrink-0 rounded border border-[#E8EEF4] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {acc.accountType}
                      </span>
                      {isFounder && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAccount(acc)}
                            title="Edit account & channel mappings (Founder Only)"
                            className="p-1 text-slate-400 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 rounded cursor-pointer transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc)}
                            title="Delete / Archive account (Founder Only)"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="mt-2 truncate text-[13px] font-semibold text-[#0B1528]">
                      {acc.accountName}
                    </h4>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                      {acc.accountHolderName}
                    </p>

                    {acc.bankName && (
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {acc.bankName} {acc.accountNumber && `· ${acc.accountNumber}`}
                      </p>
                    )}
                    {acc.upiId && (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                        UPI: {acc.upiId}
                      </p>
                    )}

                    {/* Connected Channel Mappings */}
                    <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                      {(acc.paymentMethods?.includes("CASH") || acc.accountType === "CASH") && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          <Banknote className="w-2.5 h-2.5" /> Cash Desk
                        </span>
                      )}
                      {(acc.paymentMethods?.includes("UPI") || acc.upiId) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                          <Smartphone className="w-2.5 h-2.5" /> UPI Linked
                        </span>
                      )}
                      {(acc.paymentMethods?.includes("BANK_TRANSFER") || acc.accountNumber) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building2 className="w-2.5 h-2.5" /> Bank Transfer
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[#E8EEF4] pt-3">
                    <div className="mb-2.5 flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500">
                        Reconciled balance
                      </span>
                      <span className="text-base font-semibold tracking-tight tabular-nums text-[#0B1528]">
                        {formatINR(acc.pending || 0)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAccountLedger(acc)}
                      className="h-8 w-full gap-1.5 rounded-md border-[#E8EEF4] bg-white text-[12px] font-medium text-slate-600 shadow-none hover:bg-[#F4F7FB] hover:text-[#0B1528] cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                      View ledger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────────────── TAB 7: TRIP & DEPARTURE P&L ──────────────────────── */}
        {activeTab === "profitability" && canSeeProfit && (
          <div className="space-y-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-[#0B1528]">
                Trip profitability
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Verified revenue minus train tickets, vendor payouts and guide costs,
                per trip.
              </p>
            </div>

            {/* Roll-up strip */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="grid grid-cols-2 divide-x divide-y divide-[#E8EEF4] lg:grid-cols-4 lg:divide-y-0">
                {(() => {
                  const totals = tripProfitabilityList.reduce(
                    (acc, t) => ({
                      revenue: acc.revenue + (Number(t.collectedRevenue) || 0),
                      cost: acc.cost + (Number(t.totalCost) || 0),
                      profit: acc.profit + (Number(t.grossProfit) || 0),
                      pax: acc.pax + (Number(t.totalPax) || 0),
                    }),
                    { revenue: 0, cost: 0, profit: 0, pax: 0 },
                  );
                  const blendedMargin =
                    totals.revenue > 0
                      ? Math.round((totals.profit / totals.revenue) * 1000) / 10
                      : 0;

                  return [
                    { label: "Verified revenue", value: formatINR(totals.revenue) },
                    { label: "Operational cost", value: formatINR(totals.cost) },
                    {
                      label: "Gross profit",
                      value: formatINR(totals.profit),
                      tone: totals.profit >= 0 ? "text-[#0B1528]" : "text-red-600",
                    },
                    { label: "Blended margin", value: `${blendedMargin}%` },
                  ].map((kpi) => (
                    <div key={kpi.label} className="min-w-0 px-3 py-2.5 md:px-4 md:py-3">
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {kpi.label}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-lg font-semibold leading-tight tracking-tight tabular-nums md:text-xl",
                          kpi.tone || "text-[#0B1528]",
                        )}
                      >
                        {kpi.value}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#E8EEF4] px-3 py-2.5 md:px-4">
                <h3 className="truncate text-[12px] font-semibold text-[#0B1528]">
                  Per-trip breakdown
                </h3>
                <span className="shrink-0 text-[11px] font-medium text-slate-400">
                  {tripProfitabilityList.length} trips
                </span>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[1240px] text-left text-[12px]">
                  <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="px-3 py-2 md:px-4">Trip</th>
                      <th className="px-3 py-2 text-center md:px-4">Pax</th>
                      <th className="px-3 py-2 text-right md:px-4">Gross price</th>
                      <th className="px-3 py-2 text-right md:px-4">Verified revenue</th>
                      <th className="px-3 py-2 text-right md:px-4">Exp. Train (Tpl)</th>
                      <th className="px-3 py-2 text-right md:px-4">Act. Train (Riya)</th>
                      <th className="px-3 py-2 text-center md:px-4">Train Var.</th>
                      <th className="px-3 py-2 text-right md:px-4">Vendor cost</th>
                      <th className="px-3 py-2 text-right md:px-4">Total cost</th>
                      <th className="px-3 py-2 text-right md:px-4">Gross profit</th>
                      <th className="px-3 py-2 text-right md:px-4">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {tripProfitabilityList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-10 text-center text-[12px] text-slate-400"
                        >
                          No trips have financial activity yet.
                        </td>
                      </tr>
                    ) : (
                      tripProfitabilityList.map((t) => (
                        <tr
                          key={t.tripId}
                          className="transition-colors hover:bg-[#F8FAFC]"
                        >
                          <td className="min-w-0 px-3 py-2.5 md:px-4">
                            <p className="truncate font-medium text-[#0B1528]">
                              {t.tripTitle}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {t.tripCode} · {t.destination}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 md:px-4">
                            {t.totalPax}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-400 md:px-4">
                            {formatINR(t.grossRevenue)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-[#0B1528] md:px-4">
                            {formatINR(t.collectedRevenue)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 md:px-4">
                            {formatINR(t.expectedTrainCost)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[#C2410C] md:px-4">
                            {formatINR(t.actualTrainCost)}
                          </td>
                          <td className="px-3 py-2.5 text-center md:px-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                                t.trainCostVariance > 0
                                  ? "border-amber-100 bg-amber-50 text-amber-700"
                                  : t.trainCostVariance < 0
                                    ? "border-green-100 bg-green-50 text-green-700"
                                    : "border-[#E8EEF4] bg-[#F8FAFC] text-slate-500",
                              )}
                            >
                              {t.trainCostVariance > 0
                                ? `+${formatINR(t.trainCostVariance)}`
                                : t.trainCostVariance < 0
                                  ? `-${formatINR(Math.abs(t.trainCostVariance))}`
                                  : "₹0"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 md:px-4">
                            {formatINR(t.vendorCost)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 md:px-4">
                            {formatINR(t.totalCost)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right font-medium tabular-nums md:px-4",
                              t.grossProfit >= 0 ? "text-[#0B1528]" : "text-red-600",
                            )}
                          >
                            {formatINR(t.grossProfit)}
                          </td>
                          <td className="px-3 py-2.5 text-right md:px-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                                t.marginPercent >= 20
                                  ? "border-green-100 bg-green-50 text-green-700"
                                  : t.marginPercent >= 0
                                    ? "border-[#E8EEF4] bg-[#F8FAFC] text-slate-600"
                                    : "border-red-100 bg-red-50 text-red-600",
                              )}
                            >
                              {t.marginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────── DIALOG: RECORD CLIENT INCOME ──────────────────────── */}
      <Dialog open={showRecordIncomeModal} onOpenChange={setShowRecordIncomeModal}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              Record Client Booking Payment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordIncome} className="space-y-3.5 mt-2 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Select Booking / Customer *
              </label>
              <select
                required
                value={newIncomeForm.bookingId}
                onChange={(e) =>
                  setNewIncomeForm((prev) => ({ ...prev, bookingId: e.target.value }))
                }
                className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
              >
                <option value="">-- Choose a Booking --</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName || b.customerName || "Customer"} · Ref: {b.bookingId || b.id} (
                    {b.tripName || "Trip"}) · Due: {formatINR(b.remainingAmount || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Amount (₹) *</label>
                <Input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={newIncomeForm.amount}
                  onChange={(e) =>
                    setNewIncomeForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="h-8 rounded-md border-[#E8EEF4] text-[12px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">Payment Mode *</label>
                <select
                  value={newIncomeForm.paymentMode}
                  onChange={(e) =>
                    setNewIncomeForm((prev) => ({ ...prev, paymentMode: e.target.value }))
                  }
                  className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
                >
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CASH">Cash Desk</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Receiving Account (Where money was credited) *
              </label>
              <select
                required={newIncomeForm.paymentMode !== "CASH"}
                value={newIncomeForm.collectionAccountId}
                onChange={(e) =>
                  setNewIncomeForm((prev) => ({
                    ...prev,
                    collectionAccountId: e.target.value,
                  }))
                }
                className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
              >
                <option value="">-- Choose Receiving Account --</option>
                {collectionAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.bankName || acc.accountType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">Transaction Ref / UTR</label>
              <Input
                placeholder="UPI Ref ID or Bank UTR"
                value={newIncomeForm.transactionId}
                onChange={(e) =>
                  setNewIncomeForm((prev) => ({ ...prev, transactionId: e.target.value }))
                }
                className="h-9 text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Proof / Screenshot URL
              </label>
              <Input
                placeholder="https://... (Payment screenshot link)"
                value={newIncomeForm.proofUrl}
                onChange={(e) =>
                  setNewIncomeForm((prev) => ({ ...prev, proofUrl: e.target.value }))
                }
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRecordIncomeModal(false)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Submit to Verification"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: RECORD VENDOR EXPENSE ──────────────────────── */}
      <Dialog open={showRecordExpenseModal} onOpenChange={setShowRecordExpenseModal}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              Record Vendor / Operational Outflow
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordExpense} className="space-y-3.5 mt-2 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">Select Trip *</label>
              <select
                required
                value={newExpenseForm.tripId}
                onChange={(e) =>
                  setNewExpenseForm((prev) => ({ ...prev, tripId: e.target.value }))
                }
                className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
              >
                <option value="">-- Choose a Trip --</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.destination || "Trip"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Category *</label>
                <select
                  value={newExpenseForm.category}
                  onChange={(e) =>
                    setNewExpenseForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
                >
                  <option value="Hotels">Hotels / Camps</option>
                  <option value="Transport">Transport / Fleet</option>
                  <option value="Guides">Guides / Leaders</option>
                  <option value="Activities">Activities / Permits</option>
                  <option value="Office">Office Ops / Rent</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">Vendor / Payee *</label>
                <Input
                  required
                  placeholder="e.g. Manali Volvo Travels"
                  value={newExpenseForm.vendorName}
                  onChange={(e) =>
                    setNewExpenseForm((prev) => ({ ...prev, vendorName: e.target.value }))
                  }
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Amount Paid (₹) *</label>
                <Input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={newExpenseForm.amount}
                  onChange={(e) =>
                    setNewExpenseForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="h-8 rounded-md border-[#E8EEF4] text-[12px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">Payment Mode *</label>
                <select
                  value={newExpenseForm.paymentMode}
                  onChange={(e) =>
                    setNewExpenseForm((prev) => ({ ...prev, paymentMode: e.target.value }))
                  }
                  className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Paid From Account (Source of Funds) *
              </label>
              <select
                required
                value={newExpenseForm.collectionAccountId}
                onChange={(e) =>
                  setNewExpenseForm((prev) => ({
                    ...prev,
                    collectionAccountId: e.target.value,
                  }))
                }
                className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
              >
                <option value="">-- Choose Account --</option>
                {collectionAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} (Balance: {formatINR(acc.pending || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Invoice / Proof Screenshot {newExpenseForm.paymentMode !== "CASH" && "*"}
              </label>
              <ImageUpload
                label="Upload payout proof"
                value={newExpenseForm.proofUrl}
                onUpload={(url) =>
                  setNewExpenseForm((prev) => ({ ...prev, proofUrl: url }))
                }
                compact
                accept="image/*,.pdf,application/pdf"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRecordExpenseModal(false)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Submit to verification"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: RECHARGE RIYA WALLET ──────────────────────── */}
      <Dialog open={showRechargeRiyaModal} onOpenChange={setShowRechargeRiyaModal}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#0B1528]" />
              Recharge Riya Train Portal Wallet
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRechargeRiyaWallet} className="space-y-3.5 mt-2 text-xs">
            <div className="p-3 bg-[#F8FAFC] border border-[#E8EEF4] rounded-xl">
              <p className="text-[11px] text-slate-600 font-medium">
                Money movements from your bank to the Riya portal are treated as inter-account
                transfers, not immediate trip expenses. Real costs are deducted automatically as
                individual passenger tickets are issued.
              </p>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Source Bank / Treasury Account *
              </label>
              <select
                required
                value={rechargeRiyaForm.sourceAccountId}
                onChange={(e) =>
                  setRechargeRiyaForm((prev) => ({
                    ...prev,
                    sourceAccountId: e.target.value,
                  }))
                }
                className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
              >
                <option value="">-- Select Source Bank Account --</option>
                {collectionAccounts
                  .filter((a) => !a.accountName.toLowerCase().includes("riya"))
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} (Available: {formatINR(acc.pending || 0)})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">Recharge Amount (₹) *</label>
              <Input
                type="number"
                required
                placeholder="e.g. 10000"
                value={rechargeRiyaForm.amount}
                onChange={(e) =>
                  setRechargeRiyaForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="h-8 rounded-md border-[#E8EEF4] text-[12px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
              />
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Bank Reference / Deposit UTR
              </label>
              <Input
                placeholder="UTR / Deposit transaction ID"
                value={rechargeRiyaForm.referenceNumber}
                onChange={(e) =>
                  setRechargeRiyaForm((prev) => ({
                    ...prev,
                    referenceNumber: e.target.value,
                  }))
                }
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRechargeRiyaModal(false)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Execute Recharge"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: UPLOAD PROOF MODAL ──────────────────────── */}
      <Dialog
        open={Boolean(proofModalState?.open)}
        onOpenChange={(open) => {
          if (!open) {
            setProofModalState(null);
            setProofUrlInput("");
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#FF4D00]" strokeWidth={1.75} />
              {proofModalState?.title || "Upload Receipt / Proof"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProofUpload} className="space-y-4 mt-2 text-xs">
            <p className="text-slate-600 font-medium">
              Attach the receipt screenshot or bank acknowledgment before submitting for Founder final approval.
            </p>

            <div className="space-y-2">
              <label className="font-medium text-slate-700 block">
                Upload Screenshot File / Receipt (Click or Drag & Drop)
              </label>
              <ImageUpload
                value={proofUrlInput}
                onUpload={(url) => setProofUrlInput(url)}
                compact={false}
                label="Click or Drag screenshot here"
              />
            </div>

            <div>
              <label className="font-medium text-slate-500 block mb-1">
                Or Paste Direct Image / Receipt URL
              </label>
              <Input
                placeholder="https://... (Payment screenshot / invoice link)"
                value={proofUrlInput}
                onChange={(e) => setProofUrlInput(e.target.value)}
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProofModalState(null);
                  setProofUrlInput("");
                }}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction || !proofUrlInput.trim()}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save & Attach Proof"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: AUDIT TRAIL TIMELINE ──────────────────────── */}
      <Dialog
        open={Boolean(auditModalState?.open)}
        onOpenChange={(open) => {
          if (!open) setAuditModalState(null);
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-2xl flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FF4D00]" strokeWidth={1.75} />
                <span>{auditModalState?.title || "Audit Trail & Approval History"}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Single verification status */}
            {auditModalState?.chain && (
              <div className="p-3 bg-slate-50 border border-[#E8EEF4] rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1528]">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
                    Verification
                  </div>
                  <div className="text-[11px] text-slate-500 pl-6.5">
                    {(auditModalState.chain.verification || auditModalState.chain.step1_financeController)?.status === "DONE" ? (
                      <span className="text-green-600 font-medium">✓ Verified</span>
                    ) : (auditModalState.chain.verification || auditModalState.chain.step1_financeController)?.status === "REJECTED" ? (
                      <span className="text-red-600 font-medium">✕ Rejected</span>
                    ) : (
                      <span className="text-amber-600 font-medium">⏳ Pending verification</span>
                    )}
                    {(auditModalState.chain.verification || auditModalState.chain.step1_financeController)?.approvedAt && (
                      <div className="text-[10px] text-slate-400">
                        {safeFormatDateTime((auditModalState.chain.verification || auditModalState.chain.step1_financeController)?.approvedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Entries */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Full Audit History Log
              </h4>

              {auditModalState?.loading ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF4D00]" /> Loading audit history...
                </div>
              ) : !auditModalState?.auditTrail?.length ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  No previous audit actions recorded for this transaction yet.
                </div>
              ) : (
                <div className="divide-y divide-[#E8EEF4] border border-[#E8EEF4] rounded-lg overflow-hidden bg-white">
                  {auditModalState.auditTrail.map((log) => (
                    <div key={log.id} className="p-3 text-xs space-y-1 hover:bg-[#F8FAFC]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold",
                              log.action === "APPROVED_FOUNDER"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : log.action === "REVIEWED_FC"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : log.action === "REJECTED"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                            )}
                          >
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-[#0B1528]">
                            {log.performedByName || "Admin User"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {safeFormatDateTime(log.performedAt)}
                        </span>
                      </div>

                      <p className="text-slate-700">{log.changeDescription}</p>

                      {log.reason && (
                        <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 mt-1 font-medium">
                          <strong>Note / Reason:</strong> {log.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAuditModalState(null)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: ADD ACCOUNT ──────────────────────── */}
      <Dialog open={showAddAccountModal} onOpenChange={setShowAddAccountModal}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#FF4D00]" />
              Add Bank / Treasury Account
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddAccount} className="space-y-3.5 mt-2 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">Account Display Name *</label>
              <Input
                required
                placeholder={newAccForm.accountType === "CASH" ? "e.g. YouthCamping Cash Desk / Venue Register" : "e.g. HDFC Main Operating"}
                value={newAccForm.accountName}
                onChange={(e) =>
                  setNewAccForm((prev) => ({ ...prev, accountName: e.target.value }))
                }
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Account Type *</label>
                <select
                  value={newAccForm.accountType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAccForm((prev) => ({
                      ...prev,
                      accountType: val,
                      paymentMethods: val === "CASH" ? ["CASH"] : ["UPI", "BANK_TRANSFER"],
                      bankName: val === "CASH" ? "" : prev.bankName,
                      accountNumber: val === "CASH" ? "" : prev.accountNumber,
                      ifsc: val === "CASH" ? "" : prev.ifsc,
                      upiId: val === "CASH" ? "" : prev.upiId,
                    }));
                  }}
                  className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
                >
                  <option value="COMPANY">Company Bank Account</option>
                  <option value="CASH">Office Cash Desk</option>
                  <option value="INDIVIDUAL">Director / Personal Account</option>
                  <option value="OTHER">Custom / Partner Wallet</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">
                  {newAccForm.accountType === "CASH" ? "Custodian / Responsible Person" : "Account Holder Name"}
                </label>
                <Input
                  placeholder={newAccForm.accountType === "CASH" ? "e.g. Cash Desk Custodian / Manager" : "e.g. Youth Camping Pvt Ltd"}
                  value={newAccForm.accountHolderName}
                  onChange={(e) =>
                    setNewAccForm((prev) => ({ ...prev, accountHolderName: e.target.value }))
                  }
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            {newAccForm.accountType === "CASH" ? (
              <div className="p-3 bg-green-50/80 border border-green-200 rounded-lg text-green-700 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-green-600" /> Physical Cash Desk Configuration
                </p>
                <p className="text-green-700">
                  This register is exclusively dedicated to tracking on-ground physical cash collections and handovers. Bank, IFSC, and UPI configurations are disabled.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Bank Name</label>
                    <Input
                      placeholder="e.g. HDFC Bank, SBI"
                      value={newAccForm.bankName}
                      onChange={(e) =>
                        setNewAccForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                      className="h-9 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Account Number</label>
                    <Input
                      placeholder="Account Number"
                      value={newAccForm.accountNumber}
                      onChange={(e) =>
                        setNewAccForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                      className="h-9 text-xs font-medium font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">IFSC Code</label>
                    <Input
                      placeholder="e.g. HDFC0001234"
                      value={newAccForm.ifsc}
                      onChange={(e) =>
                        setNewAccForm((prev) => ({ ...prev, ifsc: e.target.value }))
                      }
                      className="h-8 rounded-md border-[#E8EEF4] text-[12px] font-medium uppercase font-mono shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">UPI ID</label>
                    <Input
                      placeholder="e.g. youthcamping@hdfcbank"
                      value={newAccForm.upiId}
                      onChange={(e) =>
                        setNewAccForm((prev) => ({ ...prev, upiId: e.target.value }))
                      }
                      className="h-9 text-xs font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Channel Mapping Selection */}
                <div>
                  <label className="font-medium text-slate-600 block mb-1.5">
                    Connect / Map Payment Channels *
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const exists = newAccForm.paymentMethods.includes("UPI");
                        const updated = exists
                          ? newAccForm.paymentMethods.filter((m) => m !== "UPI")
                          : [...newAccForm.paymentMethods, "UPI"];
                        setNewAccForm((prev) => ({ ...prev, paymentMethods: updated }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                        newAccForm.paymentMethods.includes("UPI")
                          ? "bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      UPI (PhonePe/GPay/QR)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const exists = newAccForm.paymentMethods.includes("BANK_TRANSFER");
                        const updated = exists
                          ? newAccForm.paymentMethods.filter((m) => m !== "BANK_TRANSFER")
                          : [...newAccForm.paymentMethods, "BANK_TRANSFER"];
                        setNewAccForm((prev) => ({ ...prev, paymentMethods: updated }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                        newAccForm.paymentMethods.includes("BANK_TRANSFER")
                          ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Bank Transfer (NEFT/IMPS)
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddAccountModal(false)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save Account"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: EDIT ACCOUNT & CHANNEL MAPPINGS ──────────────────────── */}
      <Dialog open={Boolean(editingAccount)} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#FF4D00]" />
              Edit Treasury Account & Mappings
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEditAccount} className="space-y-3.5 mt-2 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">Account Display Name *</label>
              <Input
                required
                placeholder={editAccForm.accountType === "CASH" ? "e.g. YouthCamping Cash Desk" : "e.g. HDFC Main Operating"}
                value={editAccForm.accountName}
                onChange={(e) =>
                  setEditAccForm((prev) => ({ ...prev, accountName: e.target.value }))
                }
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Account Type *</label>
                <select
                  value={editAccForm.accountType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditAccForm((prev) => ({
                      ...prev,
                      accountType: val,
                      paymentMethods: val === "CASH" ? ["CASH"] : (prev.paymentMethods.includes("CASH") ? ["UPI", "BANK_TRANSFER"] : prev.paymentMethods),
                      bankName: val === "CASH" ? "" : prev.bankName,
                      accountNumber: val === "CASH" ? "" : prev.accountNumber,
                      ifsc: val === "CASH" ? "" : prev.ifsc,
                      upiId: val === "CASH" ? "" : prev.upiId,
                    }));
                  }}
                  className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
                >
                  <option value="COMPANY">Company Bank Account</option>
                  <option value="CASH">Office Cash Desk</option>
                  <option value="INDIVIDUAL">Director / Personal Account</option>
                  <option value="OTHER">Custom / Partner Wallet</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">
                  {editAccForm.accountType === "CASH" ? "Custodian / Responsible Person" : "Account Holder Name"}
                </label>
                <Input
                  placeholder={editAccForm.accountType === "CASH" ? "e.g. YouthCamping Cash Desk" : "e.g. Youth Camping Pvt Ltd"}
                  value={editAccForm.accountHolderName}
                  onChange={(e) =>
                    setEditAccForm((prev) => ({ ...prev, accountHolderName: e.target.value }))
                  }
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            {editAccForm.accountType === "CASH" ? (
              <div className="p-3 bg-green-50/80 border border-green-200 rounded-lg text-green-700 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-green-600" /> Physical Cash Desk Register
                </p>
                <p className="text-green-700">
                  This register is mapped directly to on-venue physical cash collections. Bank, IFSC, and UPI fields are not applicable and hidden.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Bank Name</label>
                    <Input
                      placeholder="e.g. HDFC Bank, SBI"
                      value={editAccForm.bankName}
                      onChange={(e) =>
                        setEditAccForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                      className="h-9 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">Account Number</label>
                    <Input
                      placeholder="Account Number"
                      value={editAccForm.accountNumber}
                      onChange={(e) =>
                        setEditAccForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                      className="h-9 text-xs font-medium font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-600 block mb-1">IFSC Code</label>
                    <Input
                      placeholder="e.g. HDFC0001234"
                      value={editAccForm.ifsc}
                      onChange={(e) =>
                        setEditAccForm((prev) => ({ ...prev, ifsc: e.target.value }))
                      }
                      className="h-8 rounded-md border-[#E8EEF4] text-[12px] font-medium uppercase font-mono shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-600 block mb-1">UPI ID</label>
                    <Input
                      placeholder="e.g. youthcamping@hdfcbank"
                      value={editAccForm.upiId}
                      onChange={(e) =>
                        setEditAccForm((prev) => ({ ...prev, upiId: e.target.value }))
                      }
                      className="h-9 text-xs font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Channel Mapping Selection */}
                <div>
                  <label className="font-medium text-slate-600 block mb-1.5">
                    Connect / Map Payment Channels *
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const exists = editAccForm.paymentMethods.includes("UPI");
                        const updated = exists
                          ? editAccForm.paymentMethods.filter((m) => m !== "UPI")
                          : [...editAccForm.paymentMethods, "UPI"];
                        setEditAccForm((prev) => ({ ...prev, paymentMethods: updated }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                        editAccForm.paymentMethods.includes("UPI")
                          ? "bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      UPI (PhonePe/GPay/QR)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const exists = editAccForm.paymentMethods.includes("BANK_TRANSFER");
                        const updated = exists
                          ? editAccForm.paymentMethods.filter((m) => m !== "BANK_TRANSFER")
                          : [...editAccForm.paymentMethods, "BANK_TRANSFER"];
                        setEditAccForm((prev) => ({ ...prev, paymentMethods: updated }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                        editAccForm.paymentMethods.includes("BANK_TRANSFER")
                          ? "bg-blue-50 border-blue-300 text-blue-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Bank Transfer (NEFT/IMPS)
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAccount(null)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DIALOG: TRANSFER / SUBMIT FUNDS ──────────────────────── */}
      <Dialog open={showSubmitFundsModal} onOpenChange={setShowSubmitFundsModal}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-md flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[90vh] sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#0B1528] flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Transfer / Submit Treasury Funds
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitFunds} className="space-y-3.5 mt-2 text-xs">
            <div>
              <label className="font-medium text-slate-600 block mb-1">From Account *</label>
              <select
                required
                value={submitFundsForm.accountId}
                onChange={(e) =>
                  setSubmitFundsForm((prev) => ({ ...prev, accountId: e.target.value }))
                }
                className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
              >
                <option value="">-- Choose Account --</option>
                {collectionAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} (Balance: {formatINR(acc.pending || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Transfer Amount (₹) *</label>
                <Input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={submitFundsForm.amount}
                  onChange={(e) =>
                    setSubmitFundsForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="h-8 rounded-md border-[#E8EEF4] text-[12px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[#FF4D00]/40"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">Mode *</label>
                <select
                  value={submitFundsForm.submissionMode}
                  onChange={(e) =>
                    setSubmitFundsForm((prev) => ({
                      ...prev,
                      submissionMode: e.target.value,
                    }))
                  }
                  className="h-9 w-full cursor-pointer rounded-md border border-[#E8EEF4] bg-white px-3 text-[12px] font-medium text-[#0B1528] shadow-none focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/40"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / Deposit</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Handover Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Reference / Deposit Slip Number
              </label>
              <Input
                placeholder="Bank Slip Number or UTR"
                value={submitFundsForm.referenceNumber}
                onChange={(e) =>
                  setSubmitFundsForm((prev) => ({
                    ...prev,
                    referenceNumber: e.target.value,
                  }))
                }
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSubmitFundsModal(false)}
                className="h-8 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAction}
                className="h-8 gap-1.5 rounded-md bg-[#FF4D00] px-3.5 text-[12px] font-medium text-white shadow-none hover:bg-[#E04400] cursor-pointer"
              >
                {submittingAction ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Record Transfer"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── DRAWER/MODAL: ACCOUNT LEDGER ──────────────────────── */}
      <Dialog
        open={Boolean(selectedAccountForLedger)}
        onOpenChange={(open) => {
          if (!open) setSelectedAccountForLedger(null);
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-4xl flex-col overflow-y-auto rounded-xl border border-[#E8EEF4] bg-white p-4 text-[#0B1528] shadow-xl sm:max-h-[88vh] sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="min-w-0 truncate text-[15px] font-semibold text-[#0B1528]">
                Ledger · {selectedAccountForLedger?.accountName}
              </DialogTitle>
              <span className="shrink-0 rounded border border-[#E8EEF4] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {selectedAccountForLedger?.accountType}
              </span>
            </div>
          </DialogHeader>

          {loadingAccountLedger ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
            </div>
          ) : (
            <div className="space-y-4 mt-2 text-xs">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E8EEF4] bg-[#F8FAFC] p-3 sm:grid-cols-3">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Total inflows</span>
                  <div className="text-base font-semibold text-green-600">
                    {formatINR(accountLedgerData?.metrics?.totalCollected || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Total outflows</span>
                  <div className="text-base font-semibold text-red-600">
                    {formatINR(
                      (accountLedgerData?.metrics?.totalSubmitted || 0) +
                        (accountLedgerData?.metrics?.totalVendorPaid || 0),
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Live balance</span>
                  <div className="text-base font-semibold text-[#0B1528]">
                    {formatINR(accountLedgerData?.metrics?.totalPending || 0)}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="min-w-0 overflow-x-auto rounded-xl border border-[#E8EEF4]">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Inflow (+)</th>
                      <th className="py-2.5 px-3 text-right">Outflow (−)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF4]">
                    {/* Client Payments */}
                    {(accountLedgerData?.clientPayments || []).map((cp: any) => (
                      <tr key={cp.id} className="transition-colors hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 text-slate-500">
                          {safeFormatDate(cp.paymentDate || cp.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-medium text-green-700">Client payment</td>
                        <td className="py-2 px-3">
                          {cp.booking?.fullName} (Ref: {cp.bookingId}) · {cp.paymentMode}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-green-600">
                          + {formatINR(cp.amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">—</td>
                      </tr>
                    ))}

                    {/* Vendor Payments */}
                    {(accountLedgerData?.vendorPayments || []).map((vp: any) => (
                      <tr key={vp.id} className="transition-colors hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 text-slate-500">
                          {safeFormatDate(vp.paymentDate || vp.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-medium text-red-600">Vendor outflow</td>
                        <td className="py-2 px-3">
                          {vp.vendorName} ({vp.category}) · Trip: {vp.trip?.title}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">—</td>
                        <td className="py-2 px-3 text-right font-semibold text-red-600">
                          − {formatINR(vp.advancePaid)}
                        </td>
                      </tr>
                    ))}

                    {/* Submissions / Transfers */}
                    {(accountLedgerData?.submissions || []).map((sub: any) => (
                      <tr key={sub.id} className="transition-colors hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 text-slate-500">
                          {safeFormatDate(sub.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-600">Fund transfer</td>
                        <td className="py-2 px-3">
                          {sub.notes || "Inter-account transfer / Submission"}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-green-600">
                          + {formatINR(sub.amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">—</td>
                      </tr>
                    ))}

                    {/* Train Tickets (For Riya Wallet) */}
                    {(accountLedgerData?.trainTickets || []).map((tt: any) => (
                      <tr key={tt.id} className="transition-colors hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 text-slate-500">
                          {safeFormatDate(tt.journeyDate || tt.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#0B1528]">Train ticket issued</td>
                        <td className="py-2 px-3">
                          {tt.travelerName} (PNR: {tt.pnr || "—"}) · Booking Ref: {tt.bookingId}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">—</td>
                        <td className="py-2 px-3 text-right font-semibold text-[#0B1528]">
                          − {formatINR(Number(tt.ticketAmount) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──────────────────────── IN-APP PROOF PREVIEW MODAL ──────────────────────── */}
      <Dialog
        open={Boolean(proofPreviewModal?.open)}
        onOpenChange={(open) => {
          if (!open) setProofPreviewModal(null);
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] min-h-0 max-w-2xl flex-col overflow-hidden rounded-xl border border-[#E8EEF4] bg-white p-0 shadow-xl sm:max-h-[90vh]">
          <div className="flex shrink-0 items-center justify-between gap-2 bg-[#0B1528] px-4 py-3 text-white sm:px-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-[#152238] rounded-md shrink-0">
                <Eye className="w-4 h-4 text-slate-300" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">
                  {proofPreviewModal?.title || "Payment Proof / Screenshot"}
                </h3>
                {proofPreviewModal?.subtitle && (
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {proofPreviewModal.subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProofPreviewModal(null)}
              className="rounded-md bg-[#152238] p-1.5 text-slate-400 transition-colors hover:bg-[#1D2A44] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex min-h-[240px] min-w-0 flex-1 items-center justify-center overflow-auto bg-[#0B1528] p-3 sm:min-h-[380px] sm:p-4">
            {proofPreviewModal?.imageUrl ? (
              <img
                src={proofPreviewModal.imageUrl}
                alt="Payment proof screenshot"
                className="max-h-full w-auto max-w-full rounded-md border border-[#152238] object-contain"
              />
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="text-[12px] font-medium">No image preview available</p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 border-t border-[#E8EEF4] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="min-w-0 break-words text-[11px] text-slate-500">
              Amount: <strong>{formatINR(proofPreviewModal?.amount || 0)}</strong> · Date:{" "}
              {proofPreviewModal?.date}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProofPreviewModal(null)}
              className="h-8 gap-1.5 rounded-md border-[#E8EEF4] px-3 text-[12px] font-medium text-[#0B1528] shadow-none hover:bg-[#F4F7FB] cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

