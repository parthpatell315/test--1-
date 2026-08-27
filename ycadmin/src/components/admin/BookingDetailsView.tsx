import DocumentManager from "@/components/admin/DocumentManager";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PassengerDrawer } from "./PassengerDrawer";
import { PassengerTimeline } from "./PassengerTimeline";
import api from "@/services/api";
import ENV from "@/config/environment";
import {
  getPaymentReceivedColorClass,
  getPaymentReceivedColorHex,
  classifyReceiptStatus,
  displayPaymentRef,
  formatDueTabBadge,
  isClearedReceipt,
  sumReceipts,
} from "@/utils/paymentUtils";
import { isCollectionRejected } from "@/utils/collectionVerification";
import {
  normalizePassenger,
  normalizeBookingPassengers,
} from "@/utils/passengerUtils";
import { resolveBookingExecutiveName } from "@/utils/bookingExecutive";
import { generatePerPersonBookingItems } from "@/utils/bookingCalculations";
import {
  applyGroupNameToItems,
  applyGroupQtyToItems,
} from "@/utils/bookingItemGrouping";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Users,
  Pencil,
  Trash2,
  Plus,
  ArrowLeft,
  Check,
  X,
  ChevronRight,
  CreditCard,
  Globe,
  Languages,
  Tag,
  MessageSquare,
  Clock,
  Send,
  HelpCircle,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  History,
  Train,
  RefreshCw,
  Layers,
  Loader2,
  UserX,
  RotateCcw,
  UserCheck,
  Ban,
  ExternalLink,
  Eye,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Booking, BookingTrip } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { bookingsService } from "@/services/bookings.service";
import { paymentsService } from "@/services/payments.service";
import {
  formatProofDisplayUrl,
  isProofUploadPersisted,
  resolvePaymentProofUrls,
} from "@/utils/paymentProof";
import { tripsService } from "@/services/trips.service";
import { settingsService } from "@/services/settings.service";
import { bookingVerificationService } from "@/services/bookingVerification.service";
import {
  cn,
  safeFormatDate,
  safeFormatDateTime,
  computeGst,
} from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import VerificationDetailsPanel from "./VerificationDetailsPanel";
import TrainTicketsPanel from "./TrainTicketsPanel";
import { trainTicketService } from "@/services/trainTicket.service";
import EmailComposerDrawer from "./EmailComposerDrawer";
import EmailLogsTimeline from "./EmailLogsTimeline";
import { erpService } from "@/services/erp.service";
import BookingAttachmentsTab from "./BookingAttachmentsTab";
import {
  collectionAccountsService,
  type CollectionAccount,
} from "@/services/collectionAccounts.service";
import { financeControllerService } from "@/services/financeController.service";
import type {
  RefundTransactionItem,
  ServiceRegistryItem,
  AuditLogItem,
} from "@/types";

/** Badge tints for the workspace tab strip — each tab keeps a stable hue so
 *  scanning the row reads as a colour map rather than a wall of grey pills. */
const TAB_BADGE_TONES: Record<string, { active: string; idle: string }> = {
  slate: {
    active: "bg-[#0B1528]/[0.07] text-[#0B1528] border border-[#0B1528]/10",
    idle: "bg-[#F4F7FB] text-slate-500 border border-[#E8EEF4]",
  },
  emerald: {
    active: "bg-green-100 text-green-700 border border-green-200",
    idle: "bg-green-50 text-green-700 border border-green-100",
  },
  amber: {
    active: "bg-amber-100 text-amber-800 border border-amber-200",
    idle: "bg-amber-50 text-amber-700 border border-amber-100",
  },
  orange: {
    active: "bg-[#FF4D00]/15 text-[#C2410C] border border-[#FF4D00]/25",
    idle: "bg-[#FF4D00]/[0.07] text-[#C2410C] border border-[#FF4D00]/15",
  },
  indigo: {
    active: "bg-slate-100 text-[#0B1528] border border-slate-200",
    idle: "bg-slate-50 text-slate-700 border border-slate-100",
  },
  violet: {
    active: "bg-violet-100 text-violet-800 border border-violet-200",
    idle: "bg-violet-50 text-violet-700 border border-violet-100",
  },
  sky: {
    active: "bg-sky-100 text-sky-800 border border-sky-200",
    idle: "bg-sky-50 text-sky-700 border border-sky-100",
  },
  teal: {
    active: "bg-green-100 text-green-800 border border-green-200",
    idle: "bg-green-50 text-green-700 border border-green-100",
  },
};

const getGenderTone = (gender: string) => {
  const normalized = String(gender || "").trim().toLowerCase();
  if (normalized.startsWith("f"))
    return "bg-red-50 text-red-700 border-red-200";
  if (normalized.startsWith("m"))
    return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-violet-50 text-violet-700 border-violet-200";
};

type RoomSummaryPassenger = {
  id?: string;
  isCancelled?: boolean;
  status?: string;
  roomSharing?: string;
  roomType?: string;
};

const getRoomSharingSummary = (
  passengers: RoomSummaryPassenger[],
  booking: Booking,
) => {
  const roomCounts = new Map<string, number>();
  passengers
    .filter(
      (passenger) =>
        !passenger.isCancelled &&
        passenger.status !== "CANCELLED" &&
        !String(passenger.id || "").startsWith("gen-co-"),
    )
    .forEach((passenger) => {
      const rawRoom = String(
        passenger.roomSharing || passenger.roomType || "",
      ).trim();
      if (!rawRoom) return;
      const room = rawRoom
        .replace(/\s+sharing$/i, "")
        .replace(/^couple$/i, "Double");
      roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
    });

  if (roomCounts.size === 0) {
    return booking.roomSharing || booking.roomType || "Triple Sharing";
  }

  return Array.from(roomCounts.entries())
    .map(([room, count]) => `${count}× ${room}`)
    .join(", ");
};

interface BookingDetailsViewProps {
  booking: Booking;
  onBack: () => void;
  onRefresh: () => void;
  trips: BookingTrip[];
  defaultTab?: string;
}

export default function BookingDetailsView({
  booking,
  onBack,
  onRefresh,
  trips,
  defaultTab,
}: BookingDetailsViewProps) {
  const { admin: currentAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [customerTimeline, setCustomerTimeline] = useState<any[]>([]);
  const [customerTimelineOpen, setCustomerTimelineOpen] = useState(false);

  const handleViewCustomerTimeline = async () => {
    try {
      const data = await erpService.getCustomerTimeline(booking.email);
      setCustomerTimeline(data);
      setCustomerTimelineOpen(true);
    } catch (err) {
      toast.error("Failed to load customer profile timeline");
    }
  };

  // Local states
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Passenger Module States
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [isPassengerDrawerOpen, setIsPassengerDrawerOpen] = useState(false);
  const [activePassenger, setActivePassenger] = useState<any>(null);
  const [docPreviewModal, setDocPreviewModal] = useState<{
    url: string;
    title: string;
    passengerName?: string;
  } | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editedCustomerName, setEditedCustomerName] = useState(
    booking.fullName || booking.name || "",
  );
  const [editedCustomerPhone, setEditedCustomerPhone] = useState(
    booking.mobile || booking.phone || "",
  );
  const [editedCustomerEmail, setEditedCustomerEmail] = useState(
    booking.email || "",
  );
  const [newPassenger, setNewPassenger] = useState({
    salutation: "Mr.",
    firstName: "",
    lastName: "",
    gender: "Male",
    age: "",
    phone: "",
    email: "",
    foodPreference: "Normal Food",
    roomSharing: "Triple",
    trainOption: "",
  });

  // Individual Passenger Cancellation State
  const [cancelPassengerModalOpen, setCancelPassengerModalOpen] = useState(false);
  const [cancellingPassenger, setCancellingPassenger] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Customer Requested Cancellation");
  const [cancellationNotes, setCancellationNotes] = useState("");
  const [isProcessingCancelPax, setIsProcessingCancelPax] = useState(false);

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // For Task Creation
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const [paymentTab, setPaymentTab] = useState<
    "successful" | "outstanding" | "failed"
  >("successful");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Inline confirmation fields
  const [confirmTotal, setConfirmTotal] = useState("");
  const [confirmAdvance, setConfirmAdvance] = useState("");
  const [confirmMode, setConfirmMode] = useState("UPI");
  const [confirmCollectionAccountId, setConfirmCollectionAccountId] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmTrainStatus, setConfirmTrainStatus] = useState("PENDING");
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  const [confirmSendTicket, setConfirmSendTicket] = useState(false);
  const [confirmTicketFile, setConfirmTicketFile] = useState<string | null>(
    null,
  );
  const [confirmTicketFileName, setConfirmTicketFileName] = useState<
    string | null
  >(null);
  const [confirmTicketFilesList, setConfirmTicketFilesList] = useState<
    Array<{ name: string; content: string }>
  >([]);
  const [confirmUtr, setConfirmUtr] = useState("");
  const [confirmProofUrls, setConfirmProofUrls] = useState<string[]>([]);
  const [revertingLoading, setRevertingLoading] = useState(false);

  // Manual payment recording inline form
  const [showAddPaymentInline, setShowAddPaymentInline] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentMode, setNewPaymentMode] = useState("UPI");
  const [newPaymentUtr, setNewPaymentUtr] = useState("");
  const [newPaymentProofFile, setNewPaymentProofFile] = useState<File | null>(null);
  const [newPaymentProofFileName, setNewPaymentProofFileName] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Quick edit note/comment states
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [editingSource, setEditingSource] = useState(false);
  const [sourceValue, setSourceValue] = useState("");

  const [editingLang, setEditingLang] = useState(false);
  const [langValue, setLangValue] = useState("English");

  const [editingTags, setEditingTags] = useState(false);
  const [tagsValue, setTagsValue] = useState("");

  // Change dates state
  const [showChangeDates, setShowChangeDates] = useState(false);
  const [newDepartureDate, setNewDepartureDate] = useState("");
  const [changeReason, setChangeReason] = useState("");

  // Edit Booking Items state
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editRate, setEditRate] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editDiscountLabel, setEditDiscountLabel] = useState("Discount");

  // Create payment modal state
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [paymentSource, setPaymentSource] = useState<
    "collected" | "venue"
  >("collected");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("UPI");
  const [payComments, setPayComments] = useState("");
  const [payTransactionId, setPayTransactionId] = useState("");
  const [payPaymentDate, setPayPaymentDate] = useState(
    () => new Date().toISOString().substring(0, 10),
  );
  const [payProofUrls, setPayProofUrls] = useState<string[]>([]);
  const [payCollectedByAdminId, setPayCollectedByAdminId] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);

  // Collection Accounts State
  const [collectionAccounts, setCollectionAccounts] = useState<CollectionAccount[]>([]);
  const [payCollectionAccountId, setPayCollectionAccountId] = useState("");
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccHolder, setNewAccHolder] = useState("");
  const [newAccType, setNewAccType] = useState("INDIVIDUAL");
  const [newAccMethods, setNewAccMethods] = useState<string[]>(["UPI", "BANK_TRANSFER"]);
  const [newAccUpi, setNewAccUpi] = useState("");
  const [newAccBank, setNewAccBank] = useState("");
  const [newAccNumber, setNewAccNumber] = useState("");
  const [newAccIfsc, setNewAccIfsc] = useState("");
  const [savingNewAccount, setSavingNewAccount] = useState(false);

  const filteredCollectionAccounts = useMemo(() => {
    if (!collectionAccounts || collectionAccounts.length === 0) return [];

    const normMode = (payMode || "UPI").toUpperCase();

    if (normMode.includes("CASH")) {
      // 1st: in cash only show & collect in YouthCamping Cash Desk
      const cashAccs = collectionAccounts.filter(
        (acc) =>
          acc.accountType === "CASH" ||
          acc.paymentMethods?.includes("CASH") ||
          acc.accountName.toLowerCase().includes("cash") ||
          acc.accountHolderName?.toLowerCase().includes("cash"),
      );
      return cashAccs.length > 0 ? cashAccs : collectionAccounts;
    }

    if (normMode.includes("UPI")) {
      // 2nd: in upi show only the upi accounts added in treasury (exclude CASH)
      const upiAccs = collectionAccounts.filter((acc) => {
        if (acc.accountType === "CASH") return false;
        const methods = acc.paymentMethods || [];
        return (
          Boolean(acc.upiId) ||
          methods.includes("UPI") ||
          acc.accountType === "UPI" ||
          acc.accountType === "COMPANY" ||
          acc.accountType === "INDIVIDUAL"
        );
      });
      return upiAccs.length > 0 ? upiAccs : collectionAccounts.filter((a) => a.accountType !== "CASH");
    }

    if (normMode.includes("BANK")) {
      // Bank Transfer (exclude CASH)
      const bankAccs = collectionAccounts.filter(
        (acc) =>
          acc.accountType !== "CASH" &&
          (Boolean(acc.accountNumber) ||
            Boolean(acc.bankName) ||
            acc.paymentMethods?.includes("BANK_TRANSFER") ||
            acc.accountType === "COMPANY" ||
            acc.accountType === "BANK" ||
            acc.accountType === "INDIVIDUAL" ||
            acc.accountType === "OTHER"),
      );
      return bankAccs.length > 0 ? bankAccs : collectionAccounts.filter((a) => a.accountType !== "CASH");
    }

    return collectionAccounts.filter((a) => a.accountType !== "CASH");
  }, [collectionAccounts, payMode]);

  const getFilteredAccountsForMode = useCallback((mode: string) => {
    if (!collectionAccounts || collectionAccounts.length === 0) return [];
    const normMode = (mode || "UPI").toUpperCase();

    if (normMode.includes("CASH")) {
      const cashAccs = collectionAccounts.filter(
        (acc) =>
          acc.accountType === "CASH" ||
          acc.paymentMethods?.includes("CASH") ||
          acc.accountName.toLowerCase().includes("cash") ||
          acc.accountHolderName?.toLowerCase().includes("cash"),
      );
      return cashAccs.length > 0 ? cashAccs : collectionAccounts;
    }

    if (normMode.includes("UPI")) {
      const upiAccs = collectionAccounts.filter((acc) => {
        if (acc.accountType === "CASH") return false;
        const methods = acc.paymentMethods || [];
        return (
          Boolean(acc.upiId) ||
          methods.includes("UPI") ||
          acc.accountType === "UPI" ||
          acc.accountType === "COMPANY" ||
          acc.accountType === "INDIVIDUAL"
        );
      });
      return upiAccs.length > 0 ? upiAccs : collectionAccounts.filter((a) => a.accountType !== "CASH");
    }

    if (normMode.includes("BANK")) {
      const bankAccs = collectionAccounts.filter(
        (acc) =>
          acc.accountType !== "CASH" &&
          (Boolean(acc.accountNumber) ||
            Boolean(acc.bankName) ||
            acc.paymentMethods?.includes("BANK_TRANSFER") ||
            acc.accountType === "COMPANY" ||
            acc.accountType === "BANK" ||
            acc.accountType === "INDIVIDUAL" ||
            acc.accountType === "OTHER"),
      );
      return bankAccs.length > 0 ? bankAccs : collectionAccounts.filter((a) => a.accountType !== "CASH");
    }

    return collectionAccounts.filter((a) => a.accountType !== "CASH");
  }, [collectionAccounts]);

  const handleConfirmModeChange = (newMode: string) => {
    setConfirmMode(newMode);
    const matched = getFilteredAccountsForMode(newMode);
    if (matched.length > 0) {
      setConfirmCollectionAccountId(matched[0].id);
    }
  };

  const handlePayModeChange = (newMode: string) => {
    setPayMode(newMode);
    const normMode = (newMode || "UPI").toUpperCase();
    if (normMode.includes("CASH")) {
      const cashAcc = collectionAccounts.find(
        (acc) =>
          acc.accountType === "CASH" ||
          acc.paymentMethods?.includes("CASH") ||
          acc.accountName.toLowerCase().includes("cash") ||
          acc.accountHolderName?.toLowerCase().includes("cash"),
      );
      if (cashAcc) {
        setPayCollectionAccountId(cashAcc.id);
      }
    } else if (normMode.includes("UPI")) {
      const upiAcc = collectionAccounts.find(
        (acc) =>
          acc.accountType !== "CASH" &&
          (Boolean(acc.upiId) ||
            acc.paymentMethods?.includes("UPI") ||
            acc.accountType === "COMPANY" ||
            acc.accountType === "INDIVIDUAL"),
      );
      if (upiAcc) {
        setPayCollectionAccountId(upiAcc.id);
      }
    } else if (normMode.includes("BANK")) {
      const bankAcc = collectionAccounts.find(
        (acc) =>
          acc.accountType !== "CASH" &&
          (Boolean(acc.accountNumber) ||
            acc.paymentMethods?.includes("BANK_TRANSFER") ||
            acc.accountType === "COMPANY" ||
            acc.accountType === "INDIVIDUAL"),
      );
      if (bankAcc) {
        setPayCollectionAccountId(bankAcc.id);
      }
    }
  };

  const loadCollectionAccounts = useCallback(async () => {
    try {
      const res = await collectionAccountsService.getAccounts({ activeOnly: true });
      if (res.data && res.data.length > 0) {
        setCollectionAccounts(res.data);
        if (!payCollectionAccountId) {
          const defaultUpi = res.data.find(
            (a: any) => a.accountType !== "CASH" && (Boolean(a.upiId) || a.paymentMethods?.includes("UPI"))
          );
          setPayCollectionAccountId(defaultUpi ? defaultUpi.id : res.data[0].id);
        }
        if (!confirmCollectionAccountId) {
          const defaultUpi = res.data.find(
            (a: any) => a.accountType !== "CASH" && (Boolean(a.upiId) || a.paymentMethods?.includes("UPI"))
          );
          setConfirmCollectionAccountId(defaultUpi ? defaultUpi.id : res.data[0].id);
        }
      }
    } catch {}
  }, [payCollectionAccountId, confirmCollectionAccountId]);

  useEffect(() => {
    loadCollectionAccounts();
  }, [loadCollectionAccounts]);

  const handleQuickCreateAccount = async () => {
    if (!newAccName.trim()) {
      return toast.error("Please enter account name");
    }
    setSavingNewAccount(true);
    try {
      const created = await collectionAccountsService.createAccount({
        accountName: newAccName.trim(),
        accountHolderName: newAccHolder.trim() || newAccName.trim(),
        accountType: newAccType,
        paymentMethods: newAccMethods,
        upiId: newAccUpi.trim() || undefined,
        bankName: newAccBank.trim() || undefined,
        accountNumber: newAccNumber.trim() || undefined,
        ifsc: newAccIfsc.trim() || undefined,
        isActive: true,
      });

      toast.success(`Account "${created.accountName}" created and selected!`);
      setCollectionAccounts((prev) => [created, ...prev]);
      setPayCollectionAccountId(created.id);
      setShowAddAccountModal(false);
      setNewAccName("");
      setNewAccHolder("");
      setNewAccUpi("");
      setNewAccBank("");
      setNewAccNumber("");
      setNewAccIfsc("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create collection account");
    } finally {
      setSavingNewAccount(false);
    }
  };

  // Finance Submodules State (Services, Refunds & Credits, Finance Audit)
  const [bookingServices, setBookingServices] = useState<ServiceRegistryItem[]>([]);
  const [bookingRefunds, setBookingRefunds] = useState<RefundTransactionItem[]>([]);
  const [bookingAuditLogs, setBookingAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingFinanceData, setLoadingFinanceData] = useState(false);

  // Auxiliary Service Modal State
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceType: "HOTEL" as any,
    vendorName: "",
    costPrice: "",
    sellingPrice: "",
    remarks: "",
  });

  // Booking Refund Modal State
  const [showBookingRefundModal, setShowBookingRefundModal] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundForm, setRefundForm] = useState({
    refundMode: "CASH" as "CASH" | "CREDIT" | "HYBRID",
    cashAmount: "",
    creditAmount: "",
    bankReference: "",
    reason: "",
  });

  const loadFinanceSubmoduleData = useCallback(async () => {
    if (!booking?.bookingId) return;
    setLoadingFinanceData(true);
    try {
      const [servicesRes, refundsRes, auditRes] = await Promise.allSettled([
        financeControllerService.services.listByBooking(booking.bookingId),
        financeControllerService.refunds.list({ bookingId: booking.bookingId }),
        financeControllerService.audit.list({ bookingId: booking.bookingId }),
      ]);

      if (servicesRes.status === "fulfilled" && servicesRes.value.data) {
        setBookingServices(servicesRes.value.data);
      }
      if (refundsRes.status === "fulfilled" && refundsRes.value.data) {
        setBookingRefunds(refundsRes.value.data);
      }
      if (auditRes.status === "fulfilled" && auditRes.value.data) {
        setBookingAuditLogs(auditRes.value.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFinanceData(false);
    }
  }, [booking?.bookingId]);

  useEffect(() => {
    loadFinanceSubmoduleData();
  }, [loadFinanceSubmoduleData]);

  const handleCreateService = async () => {
    if (!serviceForm.vendorName || !serviceForm.sellingPrice) {
      toast.error("Please enter vendor name and selling price");
      return;
    }
    setSavingService(true);
    try {
      await financeControllerService.services.create({
        bookingId: booking.bookingId,
        serviceType: serviceForm.serviceType,
        vendorName: serviceForm.vendorName,
        costPrice: parseFloat(serviceForm.costPrice) || 0,
        sellingPrice: parseFloat(serviceForm.sellingPrice) || 0,
        remarks: serviceForm.remarks,
      });
      toast.success("Auxiliary service recorded successfully");
      setShowAddServiceModal(false);
      setServiceForm({
        serviceType: "HOTEL",
        vendorName: "",
        costPrice: "",
        sellingPrice: "",
        remarks: "",
      });
      loadFinanceSubmoduleData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add service");
    } finally {
      setSavingService(false);
    }
  };

  const handleVerifyService = async (serviceId: string) => {
    try {
      await financeControllerService.services.verify(serviceId);
      toast.success("Service marked as verified");
      loadFinanceSubmoduleData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to verify service");
    }
  };

  const handleCreateBookingRefund = async () => {
    const cash = parseFloat(refundForm.cashAmount) || 0;
    const credit = parseFloat(refundForm.creditAmount) || 0;
    const total = cash + credit;
    if (total <= 0) {
      toast.error("Please specify a refund amount greater than 0");
      return;
    }
    if (!refundForm.reason.trim()) {
      toast.error("Please enter a refund reason");
      return;
    }
    setSubmittingRefund(true);
    try {
      await financeControllerService.refunds.request({
        bookingId: booking.bookingId,
        refundMode: refundForm.refundMode,
        cashAmount: refundForm.refundMode === "CREDIT" ? 0 : cash,
        creditAmount: refundForm.refundMode === "CASH" ? 0 : credit,
        reason: refundForm.reason,
        bankReference: refundForm.bankReference,
      });
      toast.success("Refund request submitted for Finance Controller verification");
      setShowBookingRefundModal(false);
      setRefundForm({
        refundMode: "CASH",
        cashAmount: "",
        creditAmount: "",
        bankReference: "",
        reason: "",
      });
      loadFinanceSubmoduleData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit refund request");
    } finally {
      setSubmittingRefund(false);
    }
  };

  useEffect(() => {
    api
      .get("/admin/users/sales-executives")
      .then((res) => {
        if (res.data?.data) {
          setStaffList(res.data.data);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (booking?.salesAdminId) {
      setPayCollectedByAdminId(booking.salesAdminId);
    } else if (currentAdmin?.id) {
      setPayCollectedByAdminId(currentAdmin.id);
    }
  }, [booking?.salesAdminId, currentAdmin?.id]);

  // Cancellation and Refund Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelCharges, setCancelCharges] = useState("0");
  const [cancelRefund, setCancelRefund] = useState("0");
  const [cancelRefundMode, setCancelRefundMode] = useState("UPI");
  const [cancelProcessing, setCancelProcessing] = useState(false);

  // Founder Delete Booking state & handlers
  const [showDeleteFounderModal, setShowDeleteFounderModal] = useState(false);
  const [deletingFounderProcessing, setDeletingFounderProcessing] = useState(false);

  const isFounder =
    currentAdmin?.role === "superadmin" ||
    (currentAdmin?.role as any) === "founder" ||
    (currentAdmin?.role as any) === "owner" ||
    (currentAdmin?.designation || "").toLowerCase().includes("founder") ||
    (currentAdmin?.name || "").toLowerCase().includes("founder") ||
    (currentAdmin?.email || "").toLowerCase().includes("founder");

  const handleDeleteBookingFounder = async () => {
    setDeletingFounderProcessing(true);
    try {
      const targetId = booking.id || (booking as any)._id || booking.bookingId;
      if (!targetId) {
        toast.error("Invalid booking ID");
        return;
      }
      await api.delete(`/bookings/${targetId}?permanent=true`);
      toast.success("Booking permanently deleted successfully");
      setShowDeleteFounderModal(false);
      if (onBack) {
        onBack();
      } else {
        window.history.back();
      }
    } catch (error: any) {
      console.error("Delete booking error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to delete booking");
    } finally {
      setDeletingFounderProcessing(false);
    }
  };

  // Workspace tab state
  const [adminActiveTab, setAdminActiveTab] = useState(
    defaultTab || "overview",
  );
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskCategory, setTaskCategory] = useState("General");

  useEffect(() => {
    if (defaultTab) {
      setAdminActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    if (booking) {
      if (booking.totalAmount) setConfirmTotal(booking.totalAmount.toString());
      if (booking.advancePaid !== undefined)
        setConfirmAdvance(booking.advancePaid.toString());
      if (booking.paymentMode) setConfirmMode(booking.paymentMode);
      if (booking.email) setConfirmEmail(booking.email);
      if (booking.trainTicketStatus) {
        const raw = booking.trainTicketStatus.toUpperCase();
        setConfirmTrainStatus(raw === "SELF BOOKED" ? "SELF_BOOKED" : raw);
      }
    }
  }, [booking]);

  const [savingPayment, setSavingPayment] = useState(false);

  // Trips service & full details
  const [fullTrip, setFullTrip] = useState<any>(null);

  const locationOptions = useMemo(() => {
    if (!fullTrip) return [];
    const list: { name: string; price: number }[] = [];
    const seen = new Set<string>();
    const tripPrice = Number(fullTrip.price || 0);

    const safeParse = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch (e) { return []; }
      }
      return [];
    };

    const variants = safeParse(fullTrip.variants);
    const pickupCities = safeParse(fullTrip.pickupCities);

    if (variants.length > 0) {
      variants.forEach((v: any) => {
        const name = (
          v.location ||
          v.cityName ||
          v.name ||
          v.variantName ||
          v.city ||
          ""
        ).trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const price =
            Number(v.discountedPrice) || Number(v.originalPrice) || tripPrice;
          list.push({ name, price });
        }
      });
    }

    if (pickupCities.length > 0) {
      pickupCities.forEach((c: any) => {
        const name = (c.cityName || c.location || c.name || "").trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const deduction = Number(c.deductionAmount || 0);
          const price = Math.max(0, tripPrice - deduction);
          list.push({ name, price });
        }
      });
    }

    return list;
  }, [fullTrip]);

  const combinedTravelOptions = useMemo(() => {
    if (!fullTrip) return [];
    const list: { name: string; priceDelta: number }[] = [];
    const seen = new Set<string>();

    const safeParse = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch (e) { return []; }
      }
      return [];
    };
    const travelOptions = safeParse(fullTrip.travelOptions);

    if (travelOptions.length > 0) {
      travelOptions.forEach((opt: any) => {
        const name = (opt.label || "").trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ name, priceDelta: Number(opt.priceDelta || 0) });
        }
      });
    }

    locationOptions.forEach((loc) => {
      if (!seen.has(loc.name.toLowerCase())) {
        seen.add(loc.name.toLowerCase());
        list.push({ name: loc.name, priceDelta: 0 }); // Price delta calculated against booking base later
      }
    });

    return list;
  }, [fullTrip, locationOptions]);

  // Custom states matching screenshots
  const [bookingItems, setBookingItems] = useState<any[]>([]);
  const [accountingViewMode, setAccountingViewMode] = useState<
    "per_person" | "group"
  >("per_person");
  const [selectedTravelOptionToAdd, setSelectedTravelOptionToAdd] =
    useState("");
  const [selectedRoomOptionToAdd, setSelectedRoomOptionToAdd] = useState("");

  const [customDescription, setCustomDescription] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Sidebar elements editing states
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [editingTravel, setEditingTravel] = useState(false);
  const [pickupCityValue, setPickupCityValue] = useState(
    booking.pickupCity || "",
  );
  const [trainClassValue, setTrainClassValue] = useState(
    booking.trainClass || "",
  );
  const [internalNotesValue, setInternalNotesValue] = useState("");

  const [editingGuestDetails, setEditingGuestDetails] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(
    null,
  );

  const getInitialDateString = (dateVal: any) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (e) {
      return "";
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await paymentsService.getByBooking(booking.id);
      setPaymentsList(res.payments || []);
    } catch (e) {
      console.error("Failed to load payments", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const successfulPayments = useMemo(
    () => (paymentsList || []).filter((p) => isClearedReceipt(p)),
    [paymentsList],
  );
  const pendingPayments = useMemo(
    () =>
      (paymentsList || []).filter(
        (p) => !isClearedReceipt(p) && !isCollectionRejected(p.approvalStatus, p.status),
      ),
    [paymentsList],
  );
  const failedPayments = useMemo(
    () =>
      (paymentsList || []).filter((p) =>
        isCollectionRejected(p.approvalStatus, p.status) ||
        classifyReceiptStatus(p.status) === "failed",
      ),
    [paymentsList],
  );
  const clearedPaid = useMemo(
    () => sumReceipts(paymentsList, "success"),
    [paymentsList],
  );
  const pendingPaid = useMemo(
    () => sumReceipts(paymentsList, "pending"),
    [paymentsList],
  );
  const financeDue = Math.max(0, Number(booking.totalAmount || 0) - clearedPaid);

  const handleAttachPaymentProof = async (
    paymentId: string,
    files: FileList | File[] | null | undefined,
  ) => {
    const list = files
      ? Array.from(files instanceof FileList ? Array.from(files) : files)
      : [];
    if (list.length === 0) return;
    try {
      toast.loading(
        list.length > 1
          ? `Uploading ${list.length} payment proofs...`
          : "Uploading payment proof...",
        { id: "upload-proof" },
      );
      const result =
        list.length === 1
          ? await paymentsService.uploadProof(paymentId, list[0])
          : await paymentsService.uploadProofs(paymentId, list);
      if (!isProofUploadPersisted(result)) {
        throw new Error("Proof was not persisted on the payment record");
      }
      await fetchPayments();
      if (onRefresh) onRefresh();
      toast.success(
        list.length > 1
          ? `${list.length} payment proofs uploaded successfully!`
          : "Payment proof uploaded successfully!",
        { id: "upload-proof" },
      );
    } catch (uErr: any) {
      console.error("Payment proof upload failed:", uErr);
      toast.error(
        uErr?.response?.data?.message ||
          uErr?.message ||
          "Failed to upload payment proof",
        { id: "upload-proof" },
      );
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const logs = await bookingsService.getEmailLogs(booking.id);
      setEmailLogs(logs);
    } catch (e) {
      console.error("Failed to fetch email logs", e);
    }
  };

  const fetchActivityLogs = async () => {
    setLoadingActivityLogs(true);
    try {
      const logs = await bookingsService.getActivityLogs(booking.id);
      setActivityLogs(logs || []);
    } catch (e) {
      console.error("Failed to fetch activity logs", e);
    } finally {
      setLoadingActivityLogs(false);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const t = await bookingsService.getTasks(booking.id);
      setTasks(t || []);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchColleagues = async () => {
    try {
      const c = await bookingsService.getColleagues();
      setColleagues(c || []);
    } catch (e) {
      console.error("Failed to fetch colleagues", e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssignedTo) {
      toast.error("Task title and assignee are required");
      return;
    }
    setCreatingTask(true);
    try {
      await bookingsService.createTask(booking.id, {
        title: taskTitle,
        description: taskDescription,
        assignedToId: taskAssignedTo,
        dueDate: taskDueDate || undefined,
      });
      toast.success("Task assigned successfully");
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignedTo("");
      setTaskDueDate("");
      setShowCreateTask(false);
      fetchTasks();
      fetchActivityLogs();
    } catch (e) {
      toast.error("Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await bookingsService.updateTask(taskId, status);
      toast.success(`Task status updated to ${status}`);
      fetchTasks();
      fetchActivityLogs();
    } catch (e) {
      toast.error("Failed to update task status");
    }
  };

  // Math helpers matching correct GST + Discount Calculation Order
  const qty = booking.numberOfTravelers || 1;
  const gstRate = (fullTrip?.gstPercentage ?? 5) / 100;
  const packageAmt =
    booking.baseAmount ||
    (booking.gstAmount
      ? booking.totalAmount - booking.gstAmount
      : booking.totalAmount / (1 + gstRate));
  const itemRate = packageAmt / qty;

  const getSafeMeta = (b: any): any => {
    if (!b || !b.sourceMeta) return {};
    let raw = b.sourceMeta;
    while (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse sourceMeta:", e);
        return {};
      }
    }
    return raw || {};
  };

  const meta = getSafeMeta(booking);
  const storedItems = meta.bookingItems || [];

  let basePrice = 0;
  let otherDiscount = 0;
  let gstDiscount = 0;
  if (bookingItems.length > 0) {
    const activeItems = bookingItems.filter(
      (item: any) => item.qty > 0 || item.rate < 0,
    );
    const gstDiscounts = activeItems.filter(
      (item: any) => item.name.toLowerCase().includes("gst") && item.rate < 0,
    );
    const otherDiscounts = activeItems.filter(
      (item: any) =>
        (item.name.toLowerCase().includes("discount") || item.rate < 0) &&
        !gstDiscounts.includes(item),
    );
    const baseItems = activeItems.filter(
      (item: any) =>
        !(item.name.toLowerCase().includes("discount") || item.rate < 0),
    );

    basePrice = baseItems.reduce(
      (acc: number, item: any) => acc + item.rate * item.qty,
      0,
    );
    otherDiscount = otherDiscounts.reduce(
      (acc: number, item: any) => acc + Math.abs(item.rate * item.qty),
      0,
    );
    gstDiscount = gstDiscounts.reduce(
      (acc: number, item: any) => acc + Math.abs(item.rate * item.qty),
      0,
    );
  } else {
    basePrice = booking.baseAmount ?? packageAmt ?? 0;
    otherDiscount = 0;
    gstDiscount = 0;
  }

  const gstAmount =
    booking.gstAmount !== undefined && booking.gstAmount !== null
      ? booking.gstAmount
      : computeGst(basePrice, otherDiscount, gstRate);
  const totalWithGST = basePrice + gstAmount;
  const calculatedTotal = totalWithGST - otherDiscount - gstDiscount;
  const daysToGo = booking.departureDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(booking.departureDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // Live preview values during editing
  const {
    previewItems,
    previewSubtotal,
    previewOtherDiscount,
    previewBasePrice,
    previewGstDiscount,
    previewGstAmount,
    previewTotalWithGST,
    previewFinalTotal,
  } = useMemo(() => {
    const items = [...bookingItems];
    if (customDescription && customRate) {
      const parsedRate = parseFloat(customRate) || 0;
      const isDescDiscount =
        customDescription.toLowerCase().includes("discount") ||
        customDescription.toLowerCase().includes("coupon") ||
        customDescription.toLowerCase().includes("off");
      const finalRate =
        isDescDiscount && parsedRate > 0 ? -parsedRate : parsedRate;
      items.push({
        name: customDescription,
        rate: finalRate,
        qty: parseInt(customQty) || 1,
        category: isDescDiscount ? "discounts" : undefined,
      });
    }

    const active = items.filter((item) => item.qty > 0 || item.rate < 0);

    // Separate GST discounts from regular discounts
    const gstDiscounts = active.filter(
      (item) => item.name.toLowerCase().includes("gst") && item.rate < 0,
    );
    const otherDiscounts = active.filter(
      (item) =>
        (item.rate < 0 ||
          item.category === "discounts" ||
          item.name.toLowerCase().includes("discount") ||
          item.name.toLowerCase().includes("coupon")) &&
        !gstDiscounts.includes(item),
    );
    const base = active.filter(
      (item) => item.rate >= 0 && !otherDiscounts.includes(item),
    );

    const packageSubtotal = base.reduce(
      (acc, item) => acc + item.rate * item.qty,
      0,
    );
    const baseDiscount =
      otherDiscounts.reduce(
        (acc, item) => acc + Math.abs(item.rate * item.qty),
        0,
      ) +
      (booking.discountAmount && otherDiscounts.length === 0
        ? booking.discountAmount
        : 0) +
      gstDiscounts.reduce(
        (acc, item) => acc + Math.abs(item.rate * item.qty),
        0,
      );

    // Gross Base Price (full package amount)
    const grossBasePrice = packageSubtotal;
    // GST (5%) calculated on Gross Base Price
    const gstA = Math.round(grossBasePrice * gstRate);
    // Final Total = Gross Base Price + GST - Discount
    const finalT = Math.max(0, grossBasePrice + gstA - baseDiscount);
    const totalW = grossBasePrice + gstA;

    return {
      previewItems: items,
      previewSubtotal: packageSubtotal,
      previewOtherDiscount: baseDiscount,
      previewBasePrice: grossBasePrice,
      previewGstDiscount: 0,
      previewGstAmount: gstA,
      previewTotalWithGST: totalW,
      previewFinalTotal: finalT,
    };
  }, [
    bookingItems,
    customDescription,
    customRate,
    customQty,
    gstRate,
    booking.discountAmount,
  ]);

  useEffect(() => {
    setLoadingPayments(true);
    fetchActivityLogs();
    fetchTasks();
    fetchColleagues();
    Promise.allSettled([
      settingsService.get(),
      bookingsService.getEmailLogs(booking.id),
      paymentsService.getByBooking(booking.id),
      trainTicketService.getTicketsByBooking(booking.id),
    ])
      .then(([settingsRes, logsRes, paymentsRes, ticketsRes]) => {
        if (settingsRes.status === "fulfilled" && settingsRes.value) {
          setSettings(settingsRes.value);
        }
        if (logsRes.status === "fulfilled" && logsRes.value) {
          setEmailLogs(logsRes.value);
        }
        if (paymentsRes.status === "fulfilled" && paymentsRes.value) {
          setPaymentsList(paymentsRes.value.payments || []);
        }
        if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
          setTickets(ticketsRes.value || []);
        }
      })
      .finally(() => {
        setLoadingPayments(false);
      });

    setNotesValue(booking.notes || "");
    setInternalNotesValue(booking.adminNotes || "");
    setConfirmEmail(booking.email || "");
    setGuestName(booking.fullName || "");
    setGuestEmail(booking.email || "");
    setGuestPhone(booking.mobile || "");
    setEditedCustomerName(booking.fullName || booking.name || "");
    setEditedCustomerPhone(booking.mobile || booking.phone || "");
    setEditedCustomerEmail(booking.email || "");
    setPickupCityValue(booking.pickupCity || "");
    setTrainClassValue(booking.trainClass || "");

    // Set language and source value
    const meta = getSafeMeta(booking);
    setLangValue(meta.language || "English");

    const linkPrefix = (booking as any)?.sourceBookingLink?.tokenPrefix;
    const salesAdminId = (booking as any)?.salesAdminId;
    let src = meta.bookingSource || "Website Form";
    if (!meta.bookingSource) {
      if (linkPrefix) {
        src = `Booking Link #${linkPrefix}`;
      } else if (salesAdminId) {
        src = `Sales ${salesAdminId}`;
      } else {
        const lowerNotes = (booking.notes || "").toLowerCase();
        if (lowerNotes.includes("source:")) {
          const match = booking.notes?.match(/source:\s*([^\n]+)/i);
          if (match && match[1]) src = match[1].trim();
        } else {
          src = booking.status === "confirmed" ? "Admin Panel" : "Website Form";
        }
      }
    }
    setSourceValue(src);

    // Initialize passengers
    const passengersList: any[] = [];
    let parsedPersons: any[] = [];
    if (booking.passengers) {
      let parsed: any = null;
      if (typeof booking.passengers === "string") {
        try {
          parsed = JSON.parse(booking.passengers);
        } catch (e) {}
      } else {
        parsed = booking.passengers;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedPersons = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.persons) && parsed.persons.length > 0) {
          parsedPersons = parsed.persons;
        } else if (
          Array.isArray(parsed.passengers) &&
          parsed.passengers.length > 0
        ) {
          parsedPersons = parsed.passengers;
        }
      }
    }

    if (parsedPersons.length > 0) {
      parsedPersons.forEach((p: any, idx: number) => {
        const pTrain =
          p.trainOption || p.trainClass || booking.trainClass || "Sleeper";
        const pRoom =
          p.roomSharing || p.roomType || booking.roomSharing || booking.roomType || "Double Sharing";
        const isCancelled =
          p.isCancelled === true ||
          p.status === "CANCELLED" ||
          (typeof p.status === "string" && p.status.toLowerCase().includes("cancel")) ||
          (typeof p.notes === "string" && p.notes.toLowerCase().includes("cancel"));
        passengersList.push({
          id: p.id || (idx === 0 ? "main" : `p-${idx}`),
          name:
            p.name ||
            (idx === 0
              ? booking.fullName || booking.name || "Guest"
              : `Traveler ${idx + 1}`),
          phone:
            p.phone ||
            (idx === 0 ? booking.mobile || booking.phone : "") ||
            "Not specified",
          email: p.email || (idx === 0 ? booking.email : "") || "Not specified",
          gender: p.gender || (idx === 0 ? booking.gender : null),
          age: p.age ?? (idx === 0 ? booking.age : null),
          dob: p.dob || p.dateOfBirth || p.birthDate || null,
          type: p.type || `${pTrain} Train`,
          trainOption: pTrain,
          status: isCancelled ? "CANCELLED" : (p.status || "Form complete"),
          isCancelled: isCancelled,
          cancellationReason: p.cancellationReason || p.cancelReason || (isCancelled ? "Cancelled by customer" : undefined),
          cancellationDate: p.cancellationDate,
          foodPreference:
            p.foodPreference ||
            (idx === 0 ? booking.foodPreference : "Normal Food") ||
            "Normal Food",
          roomSharing: pRoom,
          idProof: p.idProof,
          linkedBooking: p.linkedBooking,
        });
      });
    } else {
      // Add main guest fallback when no individual persons payload exists
      const defaultTrain = booking.trainClass || "Sleeper";
      const defaultRoom =
        booking.roomSharing || booking.roomType || "Double Sharing";
      passengersList.push({
        id: "main",
        name: booking.fullName || booking.name || "Guest",
        phone: booking.mobile || booking.phone || "Not specified",
        email: booking.email || "Not specified",
        gender: booking.gender || null,
        age: booking.age ?? null,
        dob:
          (booking as any).dob || (booking as any).dateOfBirth || null,
        type: `${defaultTrain} Train`,
        trainOption: defaultTrain,
        status: "Form complete",
        foodPreference: booking.foodPreference || "Normal Food",
        roomSharing: defaultRoom,
      });
    }

    // Pad passengers to match expected passenger count in header (booking.numberOfTravelers)
    const expectedCount = booking.numberOfTravelers || 1;
    if (passengersList.length < expectedCount) {
      for (let i = passengersList.length; i < expectedCount; i++) {
        passengersList.push({
          id: `gen-co-${i}`,
          name: "",
          phone: "",
          email: "",
          gender: "Female",
          age: "",
          type: `${booking.trainClass || "Sleeper"} Train`,
          status: "Pending",
          foodPreference: "Normal Food",
          roomSharing: "Double",
        });
      }
    }

    setPassengers(passengersList);

    // Set confirmation amount based on trip price
    const trip = trips.find((t) => t.tripCode === booking.tripId);
    if (trip && trip.price) {
      setConfirmTotal(trip.price.toString());
    } else {
      setConfirmTotal(booking.totalAmount?.toString() || "");
    }
    setConfirmAdvance(booking.advancePaid?.toString() || "");

    // Fetch full trip details and populate bookingItems
    const loadTripData = async () => {
      let tripRes = null;
      try {
        tripRes = await tripsService.getById(booking.tripId);
        setFullTrip(tripRes);
      } catch (err) {
        console.error(
          "Failed to fetch full trip details for tripId:",
          booking.tripId,
          err,
        );
      }

      if (
        meta.bookingItems &&
        Array.isArray(meta.bookingItems) &&
        meta.bookingItems.length > 0
      ) {
        setBookingItems(meta.bookingItems);
      } else {
        let persons: any[] = [];
        if (
          meta?.persons &&
          Array.isArray(meta.persons) &&
          meta.persons.length > 0
        ) {
          persons = meta.persons;
        } else if (booking.passengers) {
          let parsed: any = booking.passengers;
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch (e) {}
          }
          if (Array.isArray(parsed) && parsed.length > 0) {
            persons = parsed;
          } else if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed.persons) && parsed.persons.length > 0) {
              persons = parsed.persons;
            } else if (
              Array.isArray(parsed.passengers) &&
              parsed.passengers.length > 0
            ) {
              persons = parsed.passengers;
            }
          }
        }

        const defaultItems = generatePerPersonBookingItems(
          booking,
          persons,
          tripRes,
        );
        setBookingItems(defaultItems);
      }
    };
    if (booking.tripId) {
      loadTripData();
    } else if (
      !meta.bookingItems ||
      !Array.isArray(meta.bookingItems) ||
      meta.bookingItems.length === 0
    ) {
      let persons: any[] = [];
      if (
        meta?.persons &&
        Array.isArray(meta.persons) &&
        meta.persons.length > 0
      ) {
        persons = meta.persons;
      }
      const defaultItems = generatePerPersonBookingItems(
        booking,
        persons,
        null,
      );
      setBookingItems(defaultItems);
    }
  }, [booking, trips]);

  const syncBookingDataWithPassengers = async (
    updatedPassengers: any[],
    extraFields: any = {},
  ) => {
    try {
      const newQty =
        updatedPassengers && Array.isArray(updatedPassengers)
          ? updatedPassengers.filter(
              (p: any) =>
                !p?.isCancelled &&
                String(p?.status || "").toUpperCase() !== "CANCELLED",
            ).length || 1
          : 1;

      const currentItems = generatePerPersonBookingItems(
        booking,
        updatedPassengers || [],
        fullTrip,
      );

      const activeItems = (currentItems || []).filter(
        (item: any) => item && (item.qty > 0 || item.rate < 0),
      );
      const gstDiscounts = activeItems.filter(
        (item: any) =>
          item.name && item.name.toLowerCase().includes("gst") && item.rate < 0,
      );
      const otherDiscounts = activeItems.filter(
        (item: any) => item.rate < 0 && !gstDiscounts.includes(item),
      );
      const baseItems = activeItems.filter((item: any) => item.rate >= 0);

      const calculatedBase = baseItems.reduce(
        (acc: number, item: any) =>
          acc + (Number(item.rate) || 0) * (Number(item.qty) || 1),
        0,
      );
      const calculatedDiscount =
        otherDiscounts.reduce(
          (acc: number, item: any) =>
            acc + Math.abs((Number(item.rate) || 0) * (Number(item.qty) || 1)),
          0,
        ) +
        gstDiscounts.reduce(
          (acc: number, item: any) =>
            acc + Math.abs((Number(item.rate) || 0) * (Number(item.qty) || 1)),
          0,
        );

      const gstRate = (fullTrip?.gstPercentage ?? 5) / 100;
      const calculatedGst = Math.round(calculatedBase * gstRate);
      const totalAmount = Math.max(
        0,
        calculatedBase + calculatedGst - calculatedDiscount,
      );
      const totalPaymentsPaid = (
        Array.isArray(paymentsList) ? paymentsList : []
      )
        .filter((p: any) => isClearedReceipt(p))
        .reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0);
      const remainingAmount = totalAmount - totalPaymentsPaid;

      const meta = getSafeMeta(booking);
      const newMeta = {
        ...meta,
        bookingItems: currentItems,
      };

      await bookingsService.update(booking.id, {
        passengers: updatedPassengers,
        numberOfTravelers: newQty,
        sourceMeta: newMeta,
        baseAmount: calculatedBase,
        gstAmount: calculatedGst,
        totalAmount: totalAmount,
        remainingAmount: remainingAmount,
        ...extraFields,
      });
    } catch (err: any) {
      console.error("Failed to sync booking data with passengers:", err);
      throw err;
    }
  };

  const handleCancelPassengerSubmit = async () => {
    if (!cancellingPassenger) return;
    setIsProcessingCancelPax(true);
    try {
      const updatedPassengers = passengers.map((p) => {
        if (p.id === cancellingPassenger.id || p.name === cancellingPassenger.name) {
          return {
            ...p,
            isCancelled: true,
            status: "CANCELLED",
            cancellationReason: cancellationReason || "Customer Requested Cancellation",
            cancellationDate: new Date().toISOString(),
          };
        }
        return p;
      });

      setPassengers(updatedPassengers);
      await syncBookingDataWithPassengers(updatedPassengers);

      // Cancel matching train ticket if any
      try {
        const matchingTicket = tickets.find(
          (t) => t.travelerName === cancellingPassenger.name,
        );
        if (matchingTicket) {
          await api.patch(`/train-tickets/${matchingTicket.id}`, {
            ticketStatus: "CANCELLED",
            status: "CANCELLED",
          });
        }
      } catch (tErr) {
        console.warn("Could not auto-cancel train ticket:", tErr);
      }

      toast.success(`Passenger ${cancellingPassenger.name} marked as CANCELLED`);
      setCancelPassengerModalOpen(false);
      setCancellingPassenger(null);
      setCancellationReason("Customer Requested Cancellation");
      setCancellationNotes("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(
        "Failed to cancel passenger: " + (err.message || "Unknown error"),
      );
    } finally {
      setIsProcessingCancelPax(false);
    }
  };

  const handleRestorePassenger = async (passengerToRestore: any) => {
    if (!passengerToRestore) return;
    try {
      const updatedPassengers = passengers.map((p) => {
        if (
          p.id === passengerToRestore.id ||
          p.name === passengerToRestore.name
        ) {
          const { cancellationReason, cancellationDate, ...rest } = p;
          return {
            ...rest,
            isCancelled: false,
            status: "CONFIRMED",
          };
        }
        return p;
      });

      setPassengers(updatedPassengers);
      await syncBookingDataWithPassengers(updatedPassengers);
      toast.success(
        `Passenger ${passengerToRestore.name} restored to CONFIRMED`,
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(
        "Failed to restore passenger: " + (err.message || "Unknown error"),
      );
    }
  };

  const handleBulkCancelPassengers = async () => {
    if (selectedPassengerIds.length === 0) return;
    if (
      !confirm(
        `Mark ${selectedPassengerIds.length} selected passenger(s) as CANCELLED?`,
      )
    )
      return;
    try {
      const updatedPassengers = passengers.map((p) => {
        const normP = normalizePassenger(booking, p);
        if (
          selectedPassengerIds.includes(p.id) ||
          selectedPassengerIds.includes(normP.id)
        ) {
          return {
            ...p,
            isCancelled: true,
            status: "CANCELLED",
            cancellationReason: "Bulk Group Cancellation",
            cancellationDate: new Date().toISOString(),
          };
        }
        return p;
      });

      setPassengers(updatedPassengers);
      await syncBookingDataWithPassengers(updatedPassengers);
      setSelectedPassengerIds([]);
      toast.success(
        `${selectedPassengerIds.length} passenger(s) marked as CANCELLED`,
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error("Failed to cancel selected passengers");
    }
  };

  const handleBulkRestorePassengers = async () => {
    if (selectedPassengerIds.length === 0) return;
    try {
      const updatedPassengers = passengers.map((p) => {
        const normP = normalizePassenger(booking, p);
        if (
          selectedPassengerIds.includes(p.id) ||
          selectedPassengerIds.includes(normP.id)
        ) {
          const { cancellationReason, cancellationDate, ...rest } = p;
          return {
            ...rest,
            isCancelled: false,
            status: "CONFIRMED",
          };
        }
        return p;
      });

      setPassengers(updatedPassengers);
      await syncBookingDataWithPassengers(updatedPassengers);
      setSelectedPassengerIds([]);
      toast.success(
        `${selectedPassengerIds.length} passenger(s) restored to CONFIRMED`,
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error("Failed to restore selected passengers");
    }
  };

  const canManageBooking = Boolean(currentAdmin);

  const isExpired = (() => {
    const expiresAt =
      (booking as any)?.sourceMeta?.expiresAt ||
      (booking as any)?.sourceBookingLink?.expiresAt ||
      null;
    if (!expiresAt) return false;
    const ts = new Date(expiresAt).getTime();
    if (isNaN(ts)) return false;
    return booking.status === "pending" && ts < Date.now();
  })();

  const flowStatus = (() => {
    if (booking.status === "confirmed") return "Confirmed";
    if (booking.status === "cancelled") return "Cancelled";
    if (isExpired) return "Expired";

    const paymentStatus = (booking.paymentStatus || "")
      .toString()
      .toLowerCase();
    const advance = Number(booking.advancePaid || 0);
    if (paymentStatus === "partial") return "Partially Paid";
    if (paymentStatus === "paid") return "Paid";
    if (paymentStatus === "pending") {
      if (advance <= 0) return "Inquiry";
      return "Pending Payment";
    }
    if (advance <= 0) return "Inquiry";
    return "Pending Payment";
  })();

  const handleSendEmail = async (
    type: "confirmation" | "reminder" | "invoice",
  ) => {
    const targetEmail = booking.email;
    if (
      !targetEmail ||
      targetEmail.includes("no-email") ||
      targetEmail.includes("example.com")
    ) {
      toast.error(
        "Real customer email is missing! Please edit the reservation with a valid email first.",
      );
      return;
    }
    const toastId = toast.loading(`Sending ${type} email...`);
    try {
      const singleFile =
        confirmTicketFilesList[0]?.content || confirmTicketFile;
      const singleFileName =
        confirmTicketFilesList[0]?.name || confirmTicketFileName;
      await bookingsService.sendEmail(
        booking.id,
        type,
        booking.totalAmount,
        true,
        singleFile,
        singleFileName,
        confirmTrainStatus,
        confirmTicketFilesList,
      );
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} email sent successfully!`,
        { id: toastId },
      );
      fetchEmailLogs();
    } catch (e: any) {
      toast.error(
        `Failed to send email: ${e.response?.data?.message || "Server error"}`,
        { id: toastId },
      );
    }
  };

  const handleConfirmSubmit = async () => {
    if (!canManageBooking)
      return toast.error("Not authorized to confirm this booking");
    if (!confirmTotal || parseFloat(confirmTotal) <= 0) {
      toast.error("Enter a valid total amount");
      return;
    }
    const tot = parseFloat(confirmTotal);
    const adv = parseFloat(confirmAdvance) || 0;

    if (
      (confirmMode === "UPI" || confirmMode === "Bank Transfer") &&
      adv > 0 &&
      !confirmUtr.trim() &&
      confirmProofUrls.length === 0
    ) {
      return toast.error(
        `Please provide a UTR reference number or upload a Payment Proof screenshot for ${confirmMode} payment.`
      );
    }

    const activePassengers = (
      Array.isArray(booking.passengers) ? booking.passengers : []
    ).filter(
      (p: any) =>
        !p?.isCancelled && String(p?.status || "").toUpperCase() !== "CANCELLED",
    );
    if (activePassengers.length > 0) {
      const bookingDocs = Array.isArray((booking as any).documents)
        ? (booking as any).documents
        : [];
      const missingAadhaar = activePassengers.filter((p: any, index: number) => {
        const url =
          p.aadhaarUrl || p.idProofUrl || p.idProof || p.aadhaar || "";
        const hasUrl =
          typeof url === "string" &&
          url.trim() &&
          (url.startsWith("http") ||
            url.startsWith("/") ||
            url.includes("uploads/") ||
            url.includes("bookings/"));
        const hasDocs = Array.isArray(p.documents) && p.documents.length > 0;
        const pKeys = [p.id, p.passengerId, String(index), `pax-${index}`]
          .filter(Boolean)
          .map(String);
        const hasBookingDoc = bookingDocs.some((d: any) =>
          pKeys.includes(String(d?.passengerId || "")),
        );
        return !hasUrl && !hasDocs && !hasBookingDoc;
      });
      if (missingAadhaar.length > 0) {
        const names = missingAadhaar
          .map((p: any, i: number) => p.name || `Traveler ${i + 1}`)
          .join(", ");
        return toast.error(
          `Aadhaar / Govt ID proof is required before confirming. Missing for: ${names}`,
        );
      }
    }

    setConfirmingLoading(true);
    try {
      await bookingsService.confirm(booking.id, {
        totalAmount: tot,
        advancePaid: adv,
        paymentMode: confirmMode,
        paymentStatus: adv >= tot ? "Paid" : adv > 0 ? "Partial" : "Pending",
        email: confirmEmail,
        trainTicketStatus: confirmTrainStatus,
        trainTicketRequired: !["SELF_BOOKED", "NOT_REQUIRED", "NOT_BOOKED"].includes(
          String(confirmTrainStatus || "").toUpperCase().replace(/\s+/g, "_"),
        ),
        collectionAccountId: confirmCollectionAccountId || undefined,
        transactionId: confirmUtr.trim() || undefined,
        ...(confirmProofUrls.length > 0
          ? {
              proofUrl: confirmProofUrls[0],
              proofUrls: confirmProofUrls,
            }
          : {}),
      });

      // Auto create or update train tickets for passengers in this booking with the selected status
      const passengersList =
        booking.passengers && Array.isArray(booking.passengers)
          ? booking.passengers
          : [];
      if (passengersList.length > 0) {
        await Promise.all(
          passengersList.map(async (p: any) => {
            const existing = tickets.find((t) => t.travelerName === p.name);
            if (existing) {
              return trainTicketService.updateTicket(existing.id, {
                ticketStatus: confirmTrainStatus,
              });
            }
            return trainTicketService.createTicket(booking.bookingId, {
              travelerName: p.name,
              ticketStatus: confirmTrainStatus,
              sourceStation: booking.pickupCity || "Delhi",
              destinationStation: fullTrip?.title || "Destination",
            });
          }),
        );
      } else {
        const existing = tickets.find(
          (t) => t.travelerName === booking.fullName,
        );
        if (existing) {
          await trainTicketService.updateTicket(existing.id, {
            ticketStatus: confirmTrainStatus,
          });
        } else {
          await trainTicketService.createTicket(booking.bookingId, {
            travelerName: booking.fullName,
            ticketStatus: confirmTrainStatus,
            sourceStation: booking.pickupCity || "Delhi",
            destinationStation: fullTrip?.title || "Destination",
          });
        }
      }

      toast.success("Booking confirmed successfully!");
      setIsConfirming(false);
      setConfirmProofUrls([]);
      try {
        const singleFile =
          confirmTicketFilesList[0]?.content || confirmTicketFile;
        const singleFileName =
          confirmTicketFilesList[0]?.name || confirmTicketFileName;
        await bookingsService.sendEmail(
          booking.id,
          "confirmation",
          undefined,
          confirmSendTicket,
          singleFile,
          singleFileName,
          confirmTrainStatus,
          confirmTicketFilesList,
        );
        toast.success("Confirmation email sent to guest!");
      } catch (err) {
        toast.error("Booking confirmed, but email notification failed");
      }
      onRefresh();
    } catch (err) {
      toast.error("Failed to confirm booking");
    } finally {
      setConfirmingLoading(false);
    }
  };

  const handleRevertConfirmation = async () => {
    if (!canManageBooking)
      return toast.error("Not authorized to modify this booking");
    if (
      !window.confirm(
        "Are you sure you want to revert this confirmed booking back to Pending Payment status?",
      )
    ) {
      return;
    }
    setRevertingLoading(true);
    try {
      await bookingsService.update(booking.id, {
        status: "pending_payment",
        paymentStatus: "Pending",
        trainTicketStatus: "PENDING",
      });
      toast.success("Booking confirmation reverted back to Pending Payment!");
      onRefresh();
    } catch (err: any) {
      toast.error(`Failed to revert booking: ${err.message || "Server error"}`);
    } finally {
      setRevertingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    const targetId = booking.id || (booking as any)._id || booking.bookingId;
    if (!targetId) {
      toast.error("Invalid booking ID");
      return;
    }
    setCancelProcessing(true);
    try {
      await bookingsService.cancelWithRefund(targetId, {
        reason: cancelReason,
        cancellationCharges: parseFloat(cancelCharges) || 0,
        refundAmount: parseFloat(cancelRefund) || 0,
        refundPaymentMode: cancelRefundMode,
      });
      toast.success(
        "Booking cancelled, associated train tickets updated, and refund logged!",
      );
      setShowCancelModal(false);
      onRefresh();
    } catch (err: any) {
      console.error("Cancel booking error:", err);
      toast.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!canManageBooking)
      return toast.error("Not authorized to reject this booking");
    if (
      !confirm(
        "Are you sure you want to reject and delete this booking request?",
      )
    )
      return;
    try {
      await bookingsService.delete(booking.id);
      toast.success("Booking request rejected (cancelled).");
      onBack();
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete booking request");
    }
  };

  const handleAddPaymentSubmit = async () => {
    const amt = parseFloat(newPaymentAmount);
    if (!newPaymentAmount || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setRecordingPayment(true);
    try {
      await paymentsService.add({
        bookingId: booking.id,
        amount: amt,
        paymentMode: newPaymentMode,
        collectionAccountId: payCollectionAccountId || confirmCollectionAccountId || undefined,
        notes: "Recorded inline",
      });

      toast.success(`Payment of ₹${amt.toLocaleString("en-IN")} recorded!`);
      setNewPaymentAmount("");
      setShowAddPaymentInline(false);
      onRefresh();
    } catch (err) {
      toast.error("Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await bookingsService.update(booking.id, { notes: notesValue });
      toast.success("Notes updated successfully");
      setEditingNotes(false);
      onRefresh();
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveDates = async () => {
    if (!newDepartureDate) return toast.error("Please select a valid date");
    if (!changeReason.trim()) {
      return toast.error("Please enter a reason for the date change");
    }
    try {
      await bookingsService.transferDepartureDate(booking.id, {
        departureDate: newDepartureDate,
        reason: changeReason.trim(),
      });
      toast.success("Departure date updated successfully!");
      setShowChangeDates(false);
      setChangeReason("");
      onRefresh();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || "Failed to update departure date";
      toast.error(msg);
    }
  };

  const handleUpdateTotal = () => {
    if (customDescription && customRate) {
      const rateVal = parseFloat(customRate);
      const qtyVal = parseInt(customQty) || 1;
      const newItem = {
        id:
          customDescription.replace(/\s+/g, "_").toLowerCase() +
          "_" +
          Date.now(),
        name: customDescription,
        rate: rateVal,
        qty: qtyVal,
        isCustom: true,
      };
      setBookingItems([...bookingItems, newItem]);
      setCustomDescription("");
      setCustomRate("");
      setCustomQty("1");
      toast.success("Custom item added!");
    } else {
      toast.info("Total updated dynamically");
    }
  };

  const handleSaveBookingItems = async () => {
    try {
      // Auto-add any custom item in progress
      const currentItems = [...bookingItems];
      if (customDescription && customRate) {
        const rateVal = parseFloat(customRate);
        const qtyVal = parseInt(customQty) || 1;
        const newItem = {
          id:
            customDescription.replace(/\s+/g, "_").toLowerCase() +
            "_" +
            Date.now(),
          name: customDescription,
          rate: rateVal,
          qty: qtyVal,
          isCustom: true,
        };
        currentItems.push(newItem);
        setBookingItems(currentItems);
        setCustomDescription("");
        setCustomRate("");
        setCustomQty("1");
      }

      const activeItems = currentItems.filter(
        (item) => item.qty > 0 || item.rate < 0,
      );
      const gstDiscounts = activeItems.filter(
        (item) => item.name.toLowerCase().includes("gst") && item.rate < 0,
      );
      const otherDiscounts = activeItems.filter(
        (item) => item.rate < 0 && !gstDiscounts.includes(item),
      );
      const baseItems = activeItems.filter((item) => item.rate >= 0);

      const calculatedBase = baseItems.reduce(
        (acc, item) => acc + item.rate * item.qty,
        0,
      );
      const calculatedDiscount =
        otherDiscounts.reduce(
          (acc, item) => acc + Math.abs(item.rate * item.qty),
          0,
        ) +
        gstDiscounts.reduce(
          (acc, item) => acc + Math.abs(item.rate * item.qty),
          0,
        );

      const gstRate = (fullTrip?.gstPercentage ?? 5) / 100;
      const calculatedGst = Math.round(calculatedBase * gstRate);
      const totalAmount = Math.max(
        0,
        calculatedBase + calculatedGst - calculatedDiscount,
      );
      const totalPaymentsPaid = paymentsList
        .filter((p) => isClearedReceipt(p))
        .reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );
      const remainingAmount = totalAmount - totalPaymentsPaid;

      const totalQty = baseItems.reduce((acc, item) => acc + item.qty, 0);

      const newMeta = {
        ...getSafeMeta(booking),
        bookingItems: activeItems,
      };

      await bookingsService.update(booking.id, {
        totalAmount,
        remainingAmount,
        baseAmount: calculatedBase,
        gstAmount: calculatedGst,
        advancePaid: totalPaymentsPaid,
        sourceMeta: {
          ...newMeta,
          // Persist calculated discount in meta (Booking has no discountAmount column)
          discountAmount: calculatedDiscount,
        },
      });

      toast.success("Booking items updated successfully!");
      setIsEditingItems(false);
      onRefresh();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || "Failed to update booking items";
      toast.error(msg);
    }
  };

  const resetCreatePaymentForm = (amountSeed?: string | number) => {
    setPaymentSource("collected");
    setPayAmount(
      amountSeed !== undefined && amountSeed !== null
        ? String(amountSeed)
        : "",
    );
    setPayMode("UPI");
    setPayComments("");
    setPayTransactionId("");
    setPayPaymentDate(new Date().toISOString().substring(0, 10));
    setPayProofUrls([]);
  };

  const openCreatePaymentModal = (amountSeed?: string | number) => {
    resetCreatePaymentForm(amountSeed);
    handlePayModeChange("UPI");
    setShowCreatePayment(true);
  };

  const handleCreatePaymentSave = async () => {
    if (paymentSource === "collected") {
      const amt = parseFloat(payAmount);
      if (isNaN(amt) || amt <= 0)
        return toast.error("Please enter a valid amount");
      if (!payMode) return toast.error("Please select a payment mode");
      if (!payCollectionAccountId) {
        return toast.error("Please select a collection account");
      }
      const modeUpper = payMode.toUpperCase();
      const needsProofOrUtr =
        modeUpper.includes("UPI") || modeUpper.includes("BANK");
      if (
        needsProofOrUtr &&
        !payTransactionId.trim() &&
        payProofUrls.length === 0
      ) {
        return toast.error(
          `Please provide a UTR / transaction ID or upload payment proof for ${payMode}.`,
        );
      }
      setSavingPayment(true);
      try {
        await paymentsService.add({
          bookingId: booking.id,
          amount: amt,
          paymentMode: payMode,
          collectionAccountId: payCollectionAccountId || undefined,
          reference: payTransactionId.trim() || undefined,
          paymentDate: payPaymentDate
            ? new Date(payPaymentDate).toISOString()
            : undefined,
          notes: payComments,
          proofUrl: payProofUrls[0] || undefined,
          proofUrls: payProofUrls.length > 0 ? payProofUrls : undefined,
          collectedByAdminId: currentAdmin?.id || booking.salesAdminId,
        });

        if (booking.status !== "confirmed" && booking.status !== "cancelled") {
          await bookingsService.update(booking.id, {
            status: "confirmed",
          }).catch(() => null);
          await handleSendEmail("confirmation").catch(() => null);
          toast.success("Payment recorded, booking confirmed & confirmation voucher email sent!");
        } else {
          toast.success("Payment recorded & mapped to Collection Account!");
        }
        setShowCreatePayment(false);
        resetCreatePaymentForm();
        setAdminActiveTab("payments");
        await fetchPayments();
        if (onRefresh) onRefresh();
      } catch (err) {
        toast.error("Failed to record payment");
      } finally {
        setSavingPayment(false);
      }
    } else if (paymentSource === "venue") {
      const remaining = Number(booking.remainingAmount || 0);
      try {
        await bookingsService.update(booking.id, {
          notes: booking.notes
            ? `${booking.notes}\n[Collect at Venue: ₹${(remaining || 0).toLocaleString("en-IN")}]`
            : `[Collect at Venue: ₹${(remaining || 0).toLocaleString("en-IN")}]`,
          // Preserve the actual remaining amount so outstanding reports remain correct.
          // A dedicated venueCollectionAmount flag is stored for staff to know what to collect.
          venueCollectionAmount: remaining,
          venueCollectionStatus: "pending",
        });
        toast.success("Payment configured to be collected at venue!");
        setShowCreatePayment(false);
        resetCreatePaymentForm();
        if (onRefresh) onRefresh();
      } catch (e) {
        toast.error("Failed to update payment directives");
      }
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    passengerId: string,
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Allowed mime types & extensions
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB).`);
        continue;
      }
      const isAllowed =
        allowed.includes(file.type) ||
        file.name.toLowerCase().endsWith(".pdf") ||
        file.name.toLowerCase().endsWith(".png") ||
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg");

      if (!isAllowed) {
        toast.error(
          `File ${file.name} is not a supported format (JPG, PNG, PDF only).`,
        );
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) {
      e.target.value = "";
      return;
    }

    try {
      toast.loading(
        `Uploading ${validFiles.length} ID document${validFiles.length > 1 ? "s" : ""}...`,
        { id: `upload-${passengerId}` },
      );
      for (const file of validFiles) {
        await bookingsService.uploadDocument(booking.id, passengerId, file);
      }
      toast.success(
        `${validFiles.length} document${validFiles.length > 1 ? "s" : ""} uploaded successfully!`,
        {
          id: `upload-${passengerId}`,
        },
      );
      onRefresh(); // Refresh details to load new documents metadata
    } catch (err: any) {
      console.error(err);
      toast.error("Document upload failed. Please retry later.", {
        id: `upload-${passengerId}`,
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleViewDoc = async (
    passengerId: string,
    fileName: string,
    docId?: string,
  ) => {
    try {
      toast.loading("Loading document...", {
        id: `view-${docId || passengerId}`,
      });
      const blob = await bookingsService.downloadDocument(
        booking.id,
        passengerId,
        docId,
      );
      const url = window.URL.createObjectURL(blob);

      // Open in new tab
      const newWindow = window.open(url, "_blank");
      if (!newWindow) {
        // Fallback to download link if popup is blocked
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      }
      toast.success("Document loaded", { id: `view-${docId || passengerId}` });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load document", {
        id: `view-${docId || passengerId}`,
      });
    }
  };

  const handleRemoveDoc = async (passengerId: string, docId?: string) => {
    if (!confirm("Are you sure you want to remove this document?")) return;
    try {
      toast.loading("Removing document...", {
        id: `remove-doc-${docId || passengerId}`,
      });
      await bookingsService.deleteDocument(booking.id, passengerId, docId);
      toast.success("Document removed successfully", {
        id: `remove-doc-${docId || passengerId}`,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove document", {
        id: `remove-doc-${docId || passengerId}`,
      });
    }
  };

  const handleEditPassenger = (p: any) => {
    let rawName = p.name || "";
    let salutation = "Mr.";
    if (rawName.toLowerCase().startsWith("mr. ")) {
      salutation = "Mr.";
      rawName = rawName.substring(4);
    } else if (rawName.toLowerCase().startsWith("mrs. ")) {
      salutation = "Mrs.";
      rawName = rawName.substring(5);
    } else if (rawName.toLowerCase().startsWith("ms. ")) {
      salutation = "Ms.";
      rawName = rawName.substring(4);
    }
    const names = rawName.split(" ");
    setEditingPassenger(p);
    setNewPassenger({
      salutation,
      firstName: names[0] || "",
      lastName: names.slice(1).join(" ") || "",
      gender: p.gender || "Male",
      age: p.age?.toString() || "",
      phone: p.phone || "",
      email: p.email !== "Not specified" ? p.email : "",
      foodPreference: p.foodPreference || "Normal Food",
      roomSharing:
        p.roomSharing || booking.roomType || booking.roomSharing || "Triple",
      trainOption: p.type || p.trainOption || booking.trainClass || "",
    });
    setShowAddPassenger(true);
  };

  const handleSavePassenger = async (keepOpen = false) => {
    if (!newPassenger.firstName) {
      toast.error("Please enter at least a first name");
      return;
    }

    let updatedPassengers = [];
    let isMainGuestUpdate = false;
    const salutationPrefix = newPassenger.salutation
      ? `${newPassenger.salutation} `
      : "";
    const name =
      `${salutationPrefix}${newPassenger.firstName} ${newPassenger.lastName}`.trim();

    if (editingPassenger) {
      if (
        editingPassenger.id === "main" ||
        editingPassenger.name === booking.fullName ||
        editingPassenger.name === booking.name
      ) {
        isMainGuestUpdate = true;
      }
      updatedPassengers = passengers.map((p) =>
        p.id === editingPassenger.id
          ? {
              ...p,
              name: name,
              firstName: newPassenger.firstName,
              lastName: newPassenger.lastName,
              phone: newPassenger.phone || "N/A",
              email: newPassenger.email || "N/A",
              gender: newPassenger.gender,
              age: newPassenger.age || "N/A",
              foodPreference: newPassenger.foodPreference || "Normal Food",
              roomSharing: newPassenger.roomSharing || "Triple",
              type: newPassenger.trainOption || p.type || `${booking.trainClass} Train`,
              trainOption: newPassenger.trainOption || p.trainOption || booking.trainClass,
            }
          : p,
      );
      toast.success("Passenger updated");
    } else {
      const passenger = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        firstName: newPassenger.firstName,
        lastName: newPassenger.lastName,
        phone: newPassenger.phone || "N/A",
        email: newPassenger.email || "N/A",
        gender: newPassenger.gender,
        age: newPassenger.age || "N/A",
        type: newPassenger.trainOption || `${booking.trainClass} Train`,
        trainOption: newPassenger.trainOption || booking.trainClass || "",
        status: "Form complete",
        foodPreference: newPassenger.foodPreference || "Normal Food",
        roomSharing: newPassenger.roomSharing || "Triple",
      };
      updatedPassengers = [...passengers, passenger];
      toast.success(`${newPassenger.firstName} added to booking`);
    }

    setPassengers(updatedPassengers);

    let extraFields: any = {};
    if (isMainGuestUpdate) {
      extraFields = {
        fullName: name,
        mobile: newPassenger.phone || "N/A",
        phone: newPassenger.phone || "N/A",
        email: newPassenger.email || "N/A",
      };
    }

    try {
      await syncBookingDataWithPassengers(updatedPassengers, extraFields);
      onRefresh();
    } catch (e) {
      toast.error("Failed to sync passengers and booking items with backend");
    }

    setNewPassenger({
      salutation: "Mr.",
      firstName: "",
      lastName: "",
      gender: "Male",
      age: "",
      phone: "",
      email: "",
      foodPreference: "Normal Food",
      roomSharing: "Triple",
      trainOption: "",
    });
    setEditingPassenger(null);
    if (!keepOpen) setShowAddPassenger(false);
  };

  const handleDownloadInvoice = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const logoUrl = `${window.location.origin}/logo.png`;
    const invoiceHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invoice - ${booking.bookingId}</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              background: #fff;
              font-size: 13px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page { size: A4 portrait; margin: 18mm 16mm 18mm 16mm; }
            @media print {
              html, body { width: 210mm; min-height: 297mm; }
              .no-print { display: none !important; }
            }
            .invoice-wrapper { max-width: 780px; margin: 0 auto; padding: 48px; background: #fff; }
            .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; }
            .logo-wrap img { height: 52px; width: auto; max-width: 200px; object-fit: contain; }
            .invoice-meta { text-align: right; }
            .invoice-meta .invoice-title { font-size: 22px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 6px; }
            .invoice-meta p { font-size: 11px; color: #64748b; font-weight: 600; margin: 2px 0; text-transform: uppercase; }
            .invoice-meta .status-badge { display: inline-block; margin-top: 8px; padding: 3px 12px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
            .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; }
            .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .info-value { font-size: 14px; font-weight: 700; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
            thead tr { background: #f1f5f9; }
            th { text-align: left; font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; padding: 10px 14px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
            .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-box { width: 320px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
            .total-row.grand { background: #1e293b; color: #fff; }
            .total-row.grand .val { font-size: 18px; font-weight: 900; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="header">
              <div class="logo-wrap">
                <span style="font-size:22px; font-weight:900; color:#1e293b; letter-spacing:-1px;">YOUTHCAMPING.</span>
              </div>
              <div class="invoice-meta">
                <div class="invoice-title">Invoice</div>
                <p>Invoice No: ${booking.bookingId}</p>
                <p>Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                <span class="status-badge">${booking.paymentStatus}</span>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-card">
                <div class="section-title">Guest Details</div>
                <div class="info-item">
                  <div class="info-label">Full Name</div>
                  <div class="info-value">${booking.fullName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Mobile Number</div>
                  <div class="info-value">+91 ${booking.mobile}</div>
                </div>
                ${booking.email ? `<div class="info-item"><div class="info-label">Email</div><div class="info-value">${booking.email}</div></div>` : ""}
              </div>
              <div class="info-card">
                <div class="section-title">Travel Details</div>
                <div class="info-item">
                  <div class="info-label">Trip</div>
                  <div class="info-value">${booking.tripName || booking.tripId}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Train Class / Transport</div>
                  <div class="info-value">${booking.trainClass} &mdash; ${booking.ticketStatus}</div>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const activeItems = bookingItems.filter(
                    (item: any) => item.qty > 0 || item.rate < 0,
                  );
                  if (activeItems.length > 0) {
                    return activeItems
                      .map(
                        (item: any) => `
                      <tr>
                        <td>${item.name}</td>
                        <td>${item.qty} Traveller(s)</td>
                        <td style="text-align:right; font-weight:700">&#8377;${(item.rate * item.qty).toLocaleString("en-IN")}</td>
                      </tr>
                    `,
                      )
                      .join("");
                  } else {
                    return `
                      <tr>
                        <td>Trip Package &mdash; ${booking.tripName || booking.tripId} (${booking.trainClass || "Standard"})</td>
                        <td>${booking.numberOfTravelers || 1} Traveller(s)</td>
                        <td style="text-align:right; font-weight:700">&#8377;${basePrice.toLocaleString("en-IN")}</td>
                      </tr>
                    `;
                  }
                })()}
              </tbody>
            </table>
            <div class="totals-wrap">
              <div class="totals-box">
                <div class="total-row"><span class="lbl">Subtotal</span><span class="val">&#8377;${basePrice.toLocaleString("en-IN")}</span></div>
                <div class="total-row"><span class="lbl">GST @ ${Math.round(gstRate * 100)}%</span><span class="val">&#8377;${gstAmount.toLocaleString("en-IN")}</span></div>
                ${gstDiscount > 0 ? `<div class="total-row"><span class="lbl" style="color:#e11d48">Discount</span><span class="val" style="color:#e11d48">&minus;&#8377;${gstDiscount.toLocaleString("en-IN")}</span></div>` : ""}
                <div class="total-row"><span class="lbl">Total Amount</span><span class="val">&#8377;${(booking.totalAmount || 0).toLocaleString("en-IN")}</span></div>
                <div class="total-row"><span class="lbl">Advance Paid</span><span class="val" style="color:#059669">&minus;&#8377;${clearedPaid.toLocaleString("en-IN")}</span></div>
                <div class="total-row grand"><span class="lbl">Balance Due</span><span class="val">&#8377;${financeDue.toLocaleString("en-IN")}</span></div>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for booking with us. We look forward to serving you.</p>
              <p>This is a computer-generated invoice and does not require a physical signature.</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 800); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  return (
    <div className="min-h-full flex flex-col min-w-0 bg-[#F4F7FB] text-[#0B1528] font-sans antialiased relative">
      <PassengerDrawer
        isOpen={isPassengerDrawerOpen}
        onClose={() => setIsPassengerDrawerOpen(false)}
        passenger={activePassenger}
        booking={booking}
        onSave={async (passengerId, updatedData) => {
          const updatedPassengers = passengers.map(p => 
            (p.id === passengerId || (p.id === undefined && passengerId === "primary")) ? { ...p, ...updatedData } : p
          );
          setPassengers(updatedPassengers);
          try {
            // Strip out placeholder padding entries (gen-co-* with empty names) before saving to DB
            const passengersToSave = updatedPassengers.filter(
              p => !(String(p.id || "").startsWith("gen-co-") && !p.name)
            );
            await syncBookingDataWithPassengers(passengersToSave);
            toast.success("Passenger details updated");
            setIsPassengerDrawerOpen(false);
            onRefresh();
          } catch (e) {
            toast.error("Failed to update passenger details");
          }
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Single hairline-divided KPI panel (quiet admin chrome, no sticky/overlap) */
        .workspace-kpi-strip {
            background: #fff;
            border: 1px solid #E8EEF4;
            border-radius: 12px;
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            overflow: hidden;
        }
        @media (max-width: 1279px) {
            .workspace-kpi-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 639px) {
            .workspace-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .workspace-kpi-card {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            min-width: 0;
            padding: 12px 14px;
            text-align: left;
            background: #fff;
            border-right: 1px solid #E8EEF4;
            border-bottom: 1px solid #E8EEF4;
            transition: background 0.15s ease;
        }
        button.workspace-kpi-card { cursor: pointer; }
        button.workspace-kpi-card:hover { background: #F8FAFC; }
        /* Icon well carries the metric's hue so the strip reads in colour without shouting */
        .workspace-kpi-well {
            width: 30px;
            height: 30px;
            border-radius: 9px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 1px;
            border: 1px solid transparent;
        }
        .workspace-kpi-body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .workspace-kpi-card[data-tone="emerald"] { background: linear-gradient(180deg, #F1FBF6 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="emerald"] .workspace-kpi-well { background: #D7F3E5; border-color: #B6E7D0; color: #047857; }
        button.workspace-kpi-card[data-tone="emerald"]:hover { background: linear-gradient(180deg, #E3F7EE 0%, #FAFEFC 78%); }
        .workspace-kpi-card[data-tone="amber"] { background: linear-gradient(180deg, #FEF8EC 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="amber"] .workspace-kpi-well { background: #FBEBC8; border-color: #F5DCA8; color: #B45309; }
        button.workspace-kpi-card[data-tone="amber"]:hover { background: linear-gradient(180deg, #FDF1DC 0%, #FFFDF8 78%); }
        .workspace-kpi-card[data-tone="rose"] { background: linear-gradient(180deg, #FEF2F4 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="rose"] .workspace-kpi-well { background: #FBDDE3; border-color: #F6C7D0; color: #BE123C; }
        button.workspace-kpi-card[data-tone="rose"]:hover { background: linear-gradient(180deg, #FDE7EB 0%, #FFFBFC 78%); }
        .workspace-kpi-card[data-tone="sky"] { background: linear-gradient(180deg, #EFF7FE 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="sky"] .workspace-kpi-well { background: #D5EAFB; border-color: #B9DBF6; color: #0369A1; }
        button.workspace-kpi-card[data-tone="sky"]:hover { background: linear-gradient(180deg, #E3F1FE 0%, #FBFDFF 78%); }
        .workspace-kpi-card[data-tone="indigo"] { background: linear-gradient(180deg, #F2F3FE 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="indigo"] .workspace-kpi-well { background: #DDDFFA; border-color: #C7CBF4; color: #4338CA; }
        button.workspace-kpi-card[data-tone="indigo"]:hover { background: linear-gradient(180deg, #E7E9FD 0%, #FCFCFF 78%); }
        .workspace-kpi-card[data-tone="violet"] { background: linear-gradient(180deg, #F7F2FE 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="violet"] .workspace-kpi-well { background: #EBDDFB; border-color: #DFC9F7; color: #6D28D9; }
        button.workspace-kpi-card[data-tone="violet"]:hover { background: linear-gradient(180deg, #F1E7FE 0%, #FDFBFF 78%); }
        .workspace-kpi-card[data-tone="orange"] { background: linear-gradient(180deg, #FFF4EF 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="orange"] .workspace-kpi-well { background: #FFDECF; border-color: #FFC9B1; color: #C2410C; }
        button.workspace-kpi-card[data-tone="orange"]:hover { background: linear-gradient(180deg, #FFEAE1 0%, #FFFCFA 78%); }
        .workspace-kpi-card[data-tone="teal"] { background: linear-gradient(180deg, #EFFAFA 0%, #FFFFFF 70%); }
        .workspace-kpi-card[data-tone="teal"] .workspace-kpi-well { background: #CFEFEE; border-color: #B2E4E2; color: #0F766E; }
        button.workspace-kpi-card[data-tone="teal"]:hover { background: linear-gradient(180deg, #E1F5F4 0%, #FAFEFE 78%); }
        /* Remove trailing dividers per breakpoint so the panel reads as one block */
        .workspace-kpi-strip > .workspace-kpi-card:nth-child(2n) { border-right: 0; }
        .workspace-kpi-strip > .workspace-kpi-card:nth-last-child(-n + 2) { border-bottom: 0; }
        @media (min-width: 640px) {
            .workspace-kpi-strip > .workspace-kpi-card:nth-child(2n) { border-right: 1px solid #E8EEF4; }
            .workspace-kpi-strip > .workspace-kpi-card:nth-child(3n) { border-right: 0; }
            .workspace-kpi-strip > .workspace-kpi-card:nth-last-child(-n + 2) { border-bottom: 1px solid #E8EEF4; }
            .workspace-kpi-strip > .workspace-kpi-card:nth-last-child(-n + 3) { border-bottom: 0; }
        }
        @media (min-width: 1280px) {
            .workspace-kpi-strip > .workspace-kpi-card { border-bottom: 0; }
            .workspace-kpi-strip > .workspace-kpi-card:nth-child(3n) { border-right: 1px solid #E8EEF4; }
            .workspace-kpi-strip > .workspace-kpi-card:last-child { border-right: 0; }
        }
      `,
        }}
      />

      {/* ─── Workspace Header ─── */}
      <div className="relative sticky top-0 z-30 border-b border-[#E8EEF4] bg-gradient-to-r from-white via-white to-[#F6F9FD] px-3 pt-3 pb-3 shadow-[0_8px_24px_-20px_rgba(11,21,40,0.28)] md:px-6 md:pt-4 md:pb-4 font-sans">
        {/* Brand accent rail keeps the chrome from reading as plain white */}
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FF4D00] via-[#FF8A3D] to-[#0B1528]" />

        <div className="flex min-w-0 flex-col gap-3">
          {/* One identity row: back → id → trip → customer → status */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                if (onBack) onBack();
                else navigate("/admin/bookings");
              }}
              className="flex h-8 shrink-0 items-center gap-1 pr-2.5 text-xs font-semibold text-slate-500 transition-colors hover:text-[#FF4D00] sm:border-r sm:border-[#E8EEF4] sm:pr-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="flex h-8 shrink-0 flex-col justify-center rounded-md border border-[#0B1528]/[0.07] bg-[#0B1528]/[0.05] px-2.5 leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[#0B1528]/50">
                Booking ID
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#0B1528]">
                {booking.bookingId}
              </span>
            </div>

            <div className="flex h-8 min-w-0 flex-1 flex-col justify-center border-l border-[#E8EEF4] pl-2.5 sm:pl-3">
              <div className="truncate text-[13px] font-semibold leading-4 text-[#0B1528]">
                {booking.tripName || fullTrip?.tripName || "Trip"}
              </div>
              <div className="truncate text-[11px] leading-4 text-slate-500">
                {booking.departureDate
                  ? `${safeFormatDate(booking.departureDate, { day: "2-digit", month: "short" })} to ${(() => {
                      const durationStr =
                        fullTrip?.duration || booking.duration || "";
                      const daysMatch = durationStr.match(/(\d+)\s*[Dd]ay/);
                      const durationDays = daysMatch
                        ? parseInt(daysMatch[1], 10)
                        : 11;
                      const returnDaysOffset = Math.max(0, durationDays - 1);
                      return safeFormatDate(
                        new Date(booking.departureDate).getTime() +
                          returnDaysOffset * 24 * 60 * 60 * 1000,
                        { day: "2-digit", month: "short", year: "numeric" },
                      );
                    })()}`
                  : "—"}
              </div>
            </div>

            <div className="hidden h-8 min-w-0 shrink-0 flex-col justify-center text-right sm:flex">
              <div className="max-w-[160px] truncate text-xs font-semibold text-[#0B1528] xl:max-w-[220px]">
                {booking.fullName || booking.name}
              </div>
              <div className="font-mono text-[11px] leading-4 text-slate-400">
                {booking.mobile || booking.phone || "—"}
              </div>
            </div>

            <span
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold",
                booking.status === "confirmed"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  booking.status === "confirmed"
                    ? "bg-green-600"
                    : "bg-amber-500",
                )}
              />
              {booking.status === "confirmed" ? "Confirmed" : flowStatus}
            </span>
          </div>

          <div className="min-w-0 sm:hidden">
            <div className="truncate text-xs font-semibold text-[#0B1528]">
              {booking.fullName || booking.name}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {booking.mobile || booking.phone || "—"}
            </div>
          </div>

          {/* Actions start on the same left edge as Back */}
          <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              openCreatePaymentModal(
                financeDue || booking.remainingAmount || "",
              );
            }}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#FF4D00] px-3 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(255,77,0,0.35)] transition-colors hover:bg-[#E04400] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add payment
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#E8EEF4] bg-white px-3 text-xs font-semibold text-[#0B1528] transition-colors hover:border-slate-200 hover:bg-slate-50/70 cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5 text-slate-500" />
            Assign task
          </button>
          <button
            onClick={() => setIsComposerOpen(true)}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#E8EEF4] bg-white px-3 text-xs font-semibold text-[#0B1528] transition-colors hover:border-sky-200 hover:bg-sky-50/70 cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-sky-500" />
            Send email
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="More booking actions"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E8EEF4] bg-white text-slate-500 transition-colors hover:bg-[#F4F7FB] hover:text-[#0B1528] cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-[#E8EEF4] rounded-lg p-1"
            >
              {(booking.status === "confirmed" || flowStatus === "Confirmed") && (
                <DropdownMenuItem
                  disabled={revertingLoading}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleRevertConfirmation();
                  }}
                  className="text-xs font-semibold text-[#0B1528] rounded cursor-pointer gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  {revertingLoading
                    ? "Reverting..."
                    : "Revert confirmation"}
                </DropdownMenuItem>
              )}
              {booking.status !== "cancelled" && (
                <DropdownMenuItem
                  onSelect={() => {
                    setCancelReason("");
                    setCancelCharges("0");
                    setCancelRefund((booking.advancePaid || 0).toString());
                    setCancelRefundMode("UPI");
                    setShowCancelModal(true);
                  }}
                  className="text-xs font-semibold text-red-600 rounded cursor-pointer gap-2 focus:bg-red-50 focus:text-red-700"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel booking
                </DropdownMenuItem>
              )}
              {isFounder && (
                <>
                  <DropdownMenuSeparator className="bg-[#E8EEF4]" />
                  <DropdownMenuItem
                    onSelect={() => setShowDeleteFounderModal(true)}
                    className="text-xs font-semibold text-red-600 rounded cursor-pointer gap-2 focus:bg-red-50 focus:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete booking
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      {/* Gutters match the header's px-4/md:px-6 so cards align with the header text */}
      <div className="flex-1 min-w-0 space-y-3 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      {/* Status strip — quiet, single row. Full status detail lives in the header chip. */}
      {flowStatus === "Confirmed" || booking.status === "confirmed" ? (
        <div className="bg-gradient-to-r from-green-50 via-green-50/40 to-white border border-green-200/80 border-l-[3px] border-l-green-500 rounded-xl px-3 sm:px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="font-semibold text-green-900 truncate">
              Booking confirmed
            </span>
            <span className="text-green-700/70 truncate hidden sm:inline">
              Ticket and confirmation email can be re-issued below.
            </span>
          </div>
          <button
            onClick={() => {
              setConfirmTotal((booking.totalAmount || 0).toString());
              setConfirmAdvance((booking.advancePaid || 0).toString());
              setConfirmEmail(booking.email || "");
              setIsConfirming(!isConfirming);
            }}
            className="h-8 shrink-0 inline-flex items-center justify-center gap-1.5 bg-white border border-green-200 text-green-700 font-semibold text-xs px-3 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-green-600" />
            {isConfirming ? "Hide panel" : "Update ticket & email"}
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl px-3 sm:px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border border-l-[3px]",
            flowStatus === "Cancelled"
              ? "bg-gradient-to-r from-red-50 via-red-50/40 to-white border-red-200/80 border-l-red-500"
              : "bg-gradient-to-r from-amber-50 via-amber-50/40 to-white border-amber-200/80 border-l-amber-500",
          )}
        >
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <AlertCircle
              className={cn(
                "h-4 w-4 shrink-0 mt-0.5 sm:mt-0",
                flowStatus === "Cancelled" ? "text-red-600" : "text-amber-600",
              )}
            />
            <span
              className={cn(
                "font-semibold shrink-0",
                flowStatus === "Cancelled" ? "text-red-900" : "text-amber-900",
              )}
            >
              {flowStatus}
            </span>
            <span
              className={cn(
                "leading-snug",
                flowStatus === "Cancelled"
                  ? "text-red-700/80"
                  : "text-amber-800/80",
              )}
            >
              {flowStatus === "Cancelled"
                ? "This booking was cancelled."
                : flowStatus === "Expired"
                  ? "This booking link has expired. You can still confirm it manually below."
                  : flowStatus === "Partially Paid"
                    ? "Partially paid. Remaining balance is pending."
                    : flowStatus === "Pending Payment"
                      ? "Payment pending. Confirmation will be possible once paid."
                      : "Pending inquiry."}
            </span>
          </div>
          {flowStatus !== "Cancelled" && (
            <button
              onClick={() => {
                setConfirmTotal((booking.totalAmount || 0).toString());
                setConfirmAdvance((booking.advancePaid || 0).toString());
                setConfirmEmail(booking.email || "");
                setConfirmUtr("");
                setConfirmProofUrls([]);
                setIsConfirming(true);
              }}
              className="h-8 shrink-0 inline-flex items-center justify-center bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs px-3.5 rounded-lg transition-colors cursor-pointer"
            >
              Confirm booking
            </button>
          )}
        </div>
      )}

      {isRejecting && (
        <div className="p-4 bg-white border-l-2 border-l-red-400 border-y border-r border-[#E8EEF4] rounded-xl text-xs space-y-2">
          <p className="font-semibold text-[#0B1528]">
            Are you sure you want to reject this booking?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRejectSubmit}
              className="h-8 inline-flex items-center bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-3 rounded-lg transition-colors cursor-pointer"
            >
              Yes, reject
            </button>
            <button
              onClick={() => setIsRejecting(false)}
              className="h-8 inline-flex items-center bg-white border border-[#E8EEF4] text-[#0B1528] hover:bg-[#F4F7FB] font-semibold px-3 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isConfirming && (
        <div className="p-4 bg-white border border-[#E8EEF4] rounded-xl text-xs space-y-3">
          <h3 className="font-semibold text-[#0B1528]">Confirm booking</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Total Amount
              </label>
              <Input
                type="number"
                value={confirmTotal}
                onChange={(e) => setConfirmTotal(e.target.value)}
                className="h-8 text-xs font-mono bg-white"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Advance Paid
              </label>
              <Input
                type="number"
                value={confirmAdvance}
                onChange={(e) => setConfirmAdvance(e.target.value)}
                className="h-8 text-xs font-mono bg-white"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Mode
              </label>
              <Select value={confirmMode} onValueChange={handleConfirmModeChange}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Treasury Account
              </label>
              <Select
                value={confirmCollectionAccountId}
                onValueChange={setConfirmCollectionAccountId}
              >
                <SelectTrigger className="h-8 text-xs bg-white border-[#E8EEF4]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredAccountsForMode(confirmMode).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      {acc.accountType === "CASH"
                        ? `${acc.accountName} (Cash Desk)`
                        : `${acc.accountName} ${acc.upiId ? `(${acc.upiId})` : `(${acc.accountType})`}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Train Ticket Status
              </label>
              <Select
                value={confirmTrainStatus}
                onValueChange={setConfirmTrainStatus}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="BOOKED">Booked</SelectItem>
                  <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="RAC">RAC</SelectItem>
                  <SelectItem value="SELF_BOOKED">Self booked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Email
              </label>
              <Input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            {(confirmMode === "UPI" || confirmMode === "Bank Transfer") && (
              <>
                <div>
                  <label className="text-[9px] font-semibold uppercase text-slate-400">
                    {confirmMode === "UPI" ? "UPI Ref / UTR *" : "Bank Ref / UTR *"}
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 423589123456"
                    value={confirmUtr}
                    onChange={(e) => setConfirmUtr(e.target.value)}
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-semibold uppercase text-slate-400 block mb-0.5">
                    Payment Proof (Screenshot / Receipt) *
                  </label>
                  <ImageUpload
                    label="Upload Payment Screenshots"
                    value={confirmProofUrls}
                    onChange={setConfirmProofUrls}
                    multiple
                    maxFiles={8}
                    accept="image/*,.pdf,application/pdf"
                    compact
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    You can attach multiple screenshots or PDFs (JPG/PNG/PDF).
                  </p>
                </div>
              </>
            )}
          </div>
          {confirmTrainStatus !== "SELF_BOOKED" && (
            <div className="flex flex-col gap-2 p-3 bg-[#F4F7FB] rounded-lg border border-[#E8EEF4] max-w-md">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendTrainWithEmail"
                  checked={confirmSendTicket}
                  onChange={(e) => setConfirmSendTicket(e.target.checked)}
                  className="rounded text-[#FF4D00] focus:ring-[#FF4D00] w-3.5 h-3.5 cursor-pointer"
                />
                <label
                  htmlFor="sendTrainWithEmail"
                  className="text-[11px] font-semibold text-[#0B1528] cursor-pointer select-none"
                >
                  Include train ticket confirmation details inside email
                </label>
              </div>
              {confirmSendTicket && (
                <div className="space-y-1.5 pl-5">
                  <label className="block text-[9px] font-semibold uppercase text-slate-600">
                    Attach Train Tickets / Voucher Files (Multiple Supported)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        files.forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const base64Str = reader.result as string;
                            const base64Data =
                              base64Str.split(",")[1] || base64Str;
                            setConfirmTicketFilesList((prev) => {
                              if (prev.some((f) => f.name === file.name))
                                return prev;
                              return [
                                ...prev,
                                { name: file.name, content: base64Data },
                              ];
                            });
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
                  />
                  {confirmTicketFilesList.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Attached files ({confirmTicketFilesList.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {confirmTicketFilesList.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-[#E8EEF4] text-[10px] font-mono font-semibold text-[#0B1528]"
                          >
                            <span className="truncate max-w-[200px]">
                              {f.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmTicketFilesList((prev) =>
                                  prev.filter((_, i) => i !== fIdx),
                                )
                              }
                              className="text-slate-400 hover:text-red-600 font-semibold cursor-pointer"
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-end pt-3 border-t border-[#E8EEF4]">
            <button
              onClick={() => setIsConfirming(false)}
              className="h-8 inline-flex items-center bg-white border border-[#E8EEF4] text-[#0B1528] font-semibold px-4 rounded-lg hover:bg-[#F4F7FB] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSubmit}
              disabled={confirmingLoading}
              className="h-8 inline-flex items-center bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold px-5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {confirmingLoading ? "Confirming..." : "Confirm booking"}
            </button>
          </div>
        </div>
      )}

      {/* ─── KPI Strip — one divided panel, not sticky (avoids overlapping panels below) ─── */}
      <div className="workspace-kpi-strip">
        {(() => {
          const dueAmount = financeDue;
          const isOverdue = dueAmount > 0 && daysToGo <= 7;
          return (
            <button
              type="button"
              className="workspace-kpi-card"
              data-tone={
                dueAmount > 0 ? (isOverdue ? "rose" : "amber") : "emerald"
              }
              onClick={() => setAdminActiveTab("payments")}
            >
              <span className="workspace-kpi-well">
                <CreditCard className="h-4 w-4" />
              </span>
              <span className="workspace-kpi-body">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  Payment
                </span>
                <span className="text-[15px] font-semibold text-[#0B1528] truncate">
                  ₹{(booking.totalAmount || 0).toLocaleString("en-IN")}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold truncate",
                    dueAmount > 0
                      ? isOverdue
                        ? "text-red-600"
                        : "text-amber-700"
                      : "text-green-700",
                  )}
                >
                  {dueAmount > 0
                    ? `Due ₹${dueAmount.toLocaleString("en-IN")}`
                    : "Fully collected"}
                  {pendingPaid > 0 && dueAmount > 0 ? (
                    <span className="block font-medium text-slate-500">
                      ₹{pendingPaid.toLocaleString("en-IN")} in finance queue
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })()}
        <button
          type="button"
          className="workspace-kpi-card"
          data-tone="indigo"
          onClick={() => setAdminActiveTab("passengers")}
        >
          <span className="workspace-kpi-well">
            <Users className="h-4 w-4" />
          </span>
          <span className="workspace-kpi-body">
            <span className="text-[11px] font-semibold text-slate-500 truncate">
              Passengers
            </span>
            <span className="text-[15px] font-semibold text-[#0B1528]">
              {qty}
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold truncate",
                passengers.length >= qty ? "text-green-700" : "text-amber-700",
              )}
            >
              {passengers.length >= qty
                ? "All added"
                : `${passengers.length}/${qty} added`}
            </span>
          </span>
        </button>
        <div className="workspace-kpi-card" data-tone="sky">
          <span className="workspace-kpi-well">
            <Calendar className="h-4 w-4" />
          </span>
          <span className="workspace-kpi-body">
            <span className="text-[11px] font-semibold text-slate-500 truncate">
              Departure
            </span>
            <span className="text-[15px] font-semibold text-[#0B1528]">
              {daysToGo}
            </span>
            <span className="text-[11px] font-semibold text-sky-700 truncate">
              Days to go
            </span>
          </span>
        </div>
        <button
          type="button"
          className="workspace-kpi-card"
          data-tone="teal"
          onClick={() => setAdminActiveTab("operations")}
        >
          <span className="workspace-kpi-well">
            <Layers className="h-4 w-4" />
          </span>
          <span className="workspace-kpi-body">
            <span className="text-[11px] font-semibold text-slate-500 truncate">
              Operations
            </span>
            <span className="text-[15px] font-semibold text-[#0B1528]">
              {passengers.length || qty}/{qty}
            </span>
            <span className="text-[11px] font-semibold text-green-700 truncate">
              Booked
            </span>
          </span>
        </button>
        {(() => {
          const pendingTickets = tickets.filter(
            (t: any) => t.ticketStatus === "PENDING" || t.status === "PENDING",
          ).length;
          const depT = tickets.filter((t: any) => t.journeyType !== "RETURN");
          const retT = tickets.filter((t: any) => t.journeyType === "RETURN");
          const depConf = depT.filter(
            (t: any) => (t.ticketStatus || "").toUpperCase() === "CONFIRMED",
          ).length;
          const depWl = depT.filter(
            (t: any) => (t.ticketStatus || "").toUpperCase() === "WAITLISTED",
          ).length;
          const retConf = retT.filter(
            (t: any) => (t.ticketStatus || "").toUpperCase() === "CONFIRMED",
          ).length;

          return (
            <button
              type="button"
              className="workspace-kpi-card"
              data-tone={pendingTickets > 0 ? "amber" : "violet"}
              onClick={() => setAdminActiveTab("ticketing")}
            >
              <span className="workspace-kpi-well">
                <Train className="h-4 w-4" />
              </span>
              <span className="workspace-kpi-body">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  Ticketing
                </span>
                <span className="text-[15px] font-semibold text-[#0B1528]">
                  {pendingTickets}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold truncate",
                    depWl > 0 ? "text-amber-700" : "text-slate-500",
                  )}
                >
                  Dep {depConf} conf
                  {depWl > 0 ? ` · ${depWl} WL` : ""} · Ret {retConf} conf
                </span>
              </span>
            </button>
          );
        })()}
        {(() => {
          const openTasks = tasks.filter(
            (t: any) => t.status !== "completed",
          ).length;
          return (
            <button
              type="button"
              className="workspace-kpi-card"
              data-tone={openTasks > 0 ? "orange" : "emerald"}
              onClick={() => setAdminActiveTab("operations")}
            >
              <span className="workspace-kpi-well">
                <UserCheck className="h-4 w-4" />
              </span>
              <span className="workspace-kpi-body">
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  Tasks
                </span>
                <span className="text-[15px] font-semibold text-[#0B1528]">
                  {openTasks}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold truncate",
                    openTasks > 0 ? "text-[#C2410C]" : "text-green-700",
                  )}
                >
                  {openTasks > 0 ? "Open" : "All clear"}
                </span>
              </span>
            </button>
          );
        })()}
      </div>

      {/* ─── Main Content Split Layout ─── */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:gap-5">
        {/* Left Column */}
        <div className="order-1 flex-1 min-w-0 space-y-3 lg:order-none">
          {/* Tab Strip */}
          <div className="flex min-w-0 gap-4 overflow-x-auto rounded-xl border border-[#E8EEF4] bg-gradient-to-b from-white to-[#F9FBFE] px-3 sm:px-4 md:gap-5 no-scrollbar">
            {[
              { id: "overview", label: "Overview", badge: null, tone: "slate" },
              {
                id: "passengers",
                label: "Passengers",
                badge: passengers.length ? `${passengers.length}` : `${qty}`,
                tone: "indigo",
              },
              {
                id: "payments",
                label: "Payments",
                badge: formatDueTabBadge(financeDue),
                tone: financeDue > 0 ? "amber" : "emerald",
              },
              {
                id: "services",
                label: "Services",
                badge: bookingServices.length ? `${bookingServices.length}` : null,
                tone: "teal",
              },
              {
                id: "refunds",
                label: "Refunds & Credits",
                badge: bookingRefunds.length ? `${bookingRefunds.length}` : null,
                tone: "violet",
              },
              {
                id: "operations",
                label: "Tasks",
                badge: tasks.length ? `${tasks.length} tasks` : null,
                tone: tasks.some((t: any) => t.status !== "completed")
                  ? "orange"
                  : "slate",
              },
              {
                id: "ticketing",
                label: "Ticketing",
                badge: tickets.filter(
                  (t: any) =>
                    t.ticketStatus === "PENDING" || t.status === "PENDING",
                ).length
                  ? `${tickets.filter((t: any) => t.ticketStatus === "PENDING" || t.status === "PENDING").length} pending`
                  : null,
                tone: "amber",
              },
              { id: "accounting", label: "Accounting", badge: null, tone: "slate" },
              { id: "files", label: "Notes", badge: null, tone: "slate" },
              { id: "attachments", label: "Attachments", badge: null, tone: "slate" },
              {
                id: "emails",
                label: "Email Logs",
                badge: emailLogs.length ? `${emailLogs.length}` : null,
                tone: "sky",
              },
              {
                id: "activity",
                label: "Activity",
                badge: activityLogs.length ? `${activityLogs.length}` : null,
                tone: "slate",
              },
              {
                id: "finance_audit",
                label: "Audit Trail",
                badge: bookingAuditLogs.length ? `${bookingAuditLogs.length}` : null,
                tone: "slate",
              },
            ].map((tab) => {
              const isActive = adminActiveTab === tab.id;
              const badgeTone =
                TAB_BADGE_TONES[tab.tone] || TAB_BADGE_TONES.slate;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAdminActiveTab(tab.id)}
                  className={cn(
                    "py-3 px-0.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                    isActive
                      ? "border-[#FF4D00] text-[#0B1528]"
                      : "border-transparent text-slate-500 hover:text-[#FF4D00]",
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none",
                        isActive ? badgeTone.active : badgeTone.idle,
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* === OVERVIEW TAB === */}
          {adminActiveTab === "overview" && (
            <div className="space-y-3">
              {/* Needs attention — one quiet panel with divided rows */}
              {(() => {
                const allClear =
                  financeDue <= 0 &&
                  pendingPaid <= 0 &&
                  booking.trainTicketStatus !== "PENDING" &&
                  !tickets.some((t: any) => t.ticketStatus === "PENDING") &&
                  passengers.length >= (booking.numberOfTravelers || 1);

                return (
                  <div
                    className={cn(
                      "bg-white rounded-xl overflow-hidden border",
                      allClear ? "border-green-200/70" : "border-amber-200/70",
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-3 border-b flex items-center gap-2",
                        allClear
                          ? "bg-gradient-to-r from-green-50 to-white border-green-100"
                          : "bg-gradient-to-r from-amber-50 to-white border-amber-100",
                      )}
                    >
                      <span
                        className={cn(
                          "h-6 w-6 rounded-lg inline-flex items-center justify-center border shrink-0",
                          allClear
                            ? "bg-green-100 border-green-200 text-green-700"
                            : "bg-amber-100 border-amber-200 text-amber-700",
                        )}
                      >
                        {allClear ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <h3
                        className={cn(
                          "text-xs font-semibold",
                          allClear ? "text-green-900" : "text-amber-900",
                        )}
                      >
                        {allClear ? "All clear" : "Needs attention"}
                      </h3>
                    </div>
                    <div className="divide-y divide-[#E8EEF4]">
                      {financeDue > 0 && (
                        <div className="px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5 bg-[#FF4D00]/[0.025]">
                          <span className="h-5 w-5 rounded-md bg-[#FF4D00]/10 text-[#C2410C] inline-flex items-center justify-center shrink-0">
                            <CreditCard className="w-3 h-3" />
                          </span>
                          <span>
                            Outstanding balance of{" "}
                            <span className="font-semibold text-[#C2410C]">
                              ₹
                              {financeDue.toLocaleString("en-IN")}
                            </span>{" "}
                            is due
                            {pendingPaid > 0
                              ? ` (₹${pendingPaid.toLocaleString("en-IN")} waiting in Finance)`
                              : ""}
                          </span>
                        </div>
                      )}
                      {(booking.trainTicketStatus === "PENDING" ||
                        tickets.some(
                          (t: any) =>
                            t.ticketStatus === "PENDING" ||
                            t.status === "PENDING",
                        )) && (
                        <div className="px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5 bg-amber-50/40">
                          <span className="h-5 w-5 rounded-md bg-amber-100 text-amber-700 inline-flex items-center justify-center shrink-0">
                            <Train className="w-3 h-3" />
                          </span>
                          <span>Train ticket verification pending approval</span>
                        </div>
                      )}
                      {passengers.length < (booking.numberOfTravelers || 1) && (
                        <div className="px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5 bg-slate-50/40">
                          <span className="h-5 w-5 rounded-md bg-slate-100 text-slate-700 inline-flex items-center justify-center shrink-0">
                            <Users className="w-3 h-3" />
                          </span>
                          <span>
                            Passenger details incomplete —{" "}
                            <span className="font-semibold text-[#0B1528]">
                              {passengers.length} of{" "}
                              {booking.numberOfTravelers || 1}
                            </span>{" "}
                            travellers added
                          </span>
                        </div>
                      )}
                      {allClear && (
                        <div className="px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span>
                            All operational requirements and payments are up to
                            date
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Trip Summary */}
              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8EEF4] bg-gradient-to-r from-[#0B1528]/[0.04] to-transparent flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-[#0B1528]/[0.07] text-[#0B1528] inline-flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-xs font-semibold text-[#0B1528]">
                    Trip summary
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Package
                    </div>
                    <div className="text-xs font-semibold text-[#0B1528] mt-1">
                      {(booking.pickupCity || "").toLowerCase().includes("chandigarh to chandigarh") || (booking.pickupCity || "").toLowerCase().trim() === "chandigarh"
                        ? "Base Package"
                        : booking.trainClass || "Sleeper Train"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Room sharing
                    </div>
                    <div className="text-xs font-semibold text-[#0B1528] mt-1">
                      {getRoomSharingSummary(passengers, booking)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between gap-2">
                      <span>Departure</span>
                      {canManageBooking && !isExpired && (
                        <button
                          onClick={() => {
                            setNewDepartureDate(
                              getInitialDateString(booking.departureDate),
                            );
                            setChangeReason("");
                            setShowChangeDates(true);
                          }}
                          className="text-slate-400 hover:text-[#FF4D00] text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Pencil className="w-2.5 h-2.5" /> Edit
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-[#0B1528] mt-1">
                      {safeFormatDate(
                        booking.departureDate,
                        { day: "2-digit", month: "short", year: "numeric" },
                        "—",
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Duration
                    </div>
                    <div className="text-xs font-semibold text-[#0B1528] mt-1">
                      {(() => {
                        if (!fullTrip?.duration) return "10 Days";
                        const raw = String(fullTrip.duration).trim();
                        if (
                          raw.toLowerCase().includes("day") ||
                          raw.toLowerCase().includes("night")
                        )
                          return raw;
                        return `${raw} Days`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Departure History */}
              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8EEF4]">
                  <h3 className="text-xs font-semibold text-[#0B1528]">
                    Departure history
                  </h3>
                </div>
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-semibold text-slate-400">
                        <th className="px-4 py-2.5 whitespace-nowrap">
                          Departure date
                        </th>
                        <th className="px-4 py-2.5 whitespace-nowrap">
                          Return date
                        </th>
                        <th className="px-4 py-2.5 whitespace-nowrap">
                          Changed by
                        </th>
                        <th className="px-4 py-2.5 whitespace-nowrap">
                          Updated at
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF4]">
                      <tr className="hover:bg-[#F8FAFC] transition-colors text-slate-600">
                        <td className="px-4 py-3 font-semibold text-[#0B1528] whitespace-nowrap">
                          {safeFormatDate(
                            booking.departureDate,
                            { day: "2-digit", month: "short", year: "numeric" },
                            "—",
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {booking.departureDate
                            ? (() => {
                                const durationStr =
                                  fullTrip?.duration || booking.duration || "";
                                const daysMatch =
                                  durationStr.match(/(\d+)\s*[Dd]ay/);
                                const durationDays = daysMatch
                                  ? parseInt(daysMatch[1], 10)
                                  : 11;
                                const returnDaysOffset = Math.max(
                                  0,
                                  durationDays - 1,
                                );
                                return safeFormatDate(
                                  new Date(booking.departureDate).getTime() +
                                    returnDaysOffset * 24 * 60 * 60 * 1000,
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                );
                              })()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0B1528]">
                          {resolveBookingExecutiveName(booking)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {safeFormatDate(
                            booking.updatedAt || booking.createdAt,
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* === PASSENGERS TAB === */}
          {adminActiveTab === "passengers" &&
            (() => {
              const canEditPassengers = canManageBooking && !isExpired;
              const activePaxCount = passengers.filter(
                (p: any) => !p.isCancelled && p.status !== "CANCELLED",
              ).length;
              const cancelledPaxCount = passengers.length - activePaxCount;
              const expectedPaxCount =
                booking.numberOfTravelers || passengers.length;

              const openAddPassenger = () => {
                setEditingPassenger(null);
                setNewPassenger({
                  firstName: "",
                  lastName: "",
                  gender: "Male",
                  age: "",
                  phone: "",
                  email: "",
                  foodPreference: "Normal Food",
                  salutation: "Mr.",
                  roomSharing: booking.roomType || "Triple",
                  trainOption: "",
                });
                setShowAddPassenger(true);
              };

              const hasValue = (value?: string | null) =>
                !!value &&
                value !== "N/A" &&
                value !== "Not specified" &&
                String(value).trim() !== "";

              const getRoomSharingLabel = (roomType: string) => {
                if (!roomType) return "Double";
                const lower = roomType.toLowerCase();
                if (lower.includes("quad")) return "Quad";
                if (lower.includes("triple")) return "Triple";
                if (lower.includes("couple") || lower.includes("double"))
                  return "Double";
                return roomType;
              };

              const getInitials = (name: string) => {
                const parts = String(name || "")
                  .replace(/^(mr|mrs|ms|dr)\.?\s+/i, "")
                  .split(/\s+/)
                  .filter(Boolean);
                const initials = parts
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() || "")
                  .join("");
                return initials || "?";
              };

              /** Train-ticket derived readiness label shown as the row status. */
              const getPassengerStatus = (
                passengerName: string,
                isCancelled: boolean,
              ) => {
                if (isCancelled) {
                  return {
                    label: "Cancelled",
                    colorClass: "bg-red-100 text-red-700 border-red-300",
                  };
                }
                const ticket = tickets.find(
                  (t) => t.travelerName === passengerName,
                );
                if (ticket) {
                  if (ticket.ticketStatus === "RAC") {
                    return {
                      label: `${ticket.sourceStation || booking.pickupCity || "Train"} (RAC)`,
                      colorClass: "bg-amber-50 text-amber-700 border-amber-200",
                    };
                  }
                  if (ticket.ticketStatus === "WAITLISTED") {
                    return {
                      label: `${ticket.sourceStation || booking.pickupCity || "Train"} (WL)`,
                      colorClass: "bg-amber-50 text-amber-700 border-amber-200",
                    };
                  }
                  if (ticket.ticketStatus === "SELF_BOOKED") {
                    return {
                      label: "Self booked",
                      colorClass:
                        "bg-slate-50 text-slate-700 border-slate-200",
                    };
                  }
                  if (ticket.ticketStatus === "PENDING") {
                    return {
                      label: "Pending",
                      colorClass: "bg-slate-50 text-slate-600 border-[#E8EEF4]",
                    };
                  }
                  if (ticket.ticketStatus === "BOOKED") {
                    return {
                      label: "Booked",
                      colorClass: "bg-blue-50 text-blue-700 border-blue-200",
                    };
                  }
                }
                return {
                  label: "Confirmed",
                  colorClass:
                    "bg-green-50 text-green-700 border-green-200",
                };
              };

              /** Documents can arrive on the booking, the normalised passenger,
               *  the raw passenger, or as a bare Aadhaar URL — merge + dedupe. */
              const collectDocuments = (p: any, normP: any, index: number) => {
                const rawDocs: any[] = [];

                if (Array.isArray((booking as any)?.documents)) {
                  (booking as any).documents.forEach((d: any) => {
                    if (
                      String(d.passengerId) === String(p.id) ||
                      (index === 0 &&
                        (!d.passengerId || d.passengerId === "primary"))
                    ) {
                      rawDocs.push({
                        id: d.id,
                        title: d.originalFileName || d.title || "Document",
                        originalFileName:
                          d.originalFileName || d.title || "Document",
                        url: d.url || d.fileUrl,
                      });
                    }
                  });
                }

                if (Array.isArray(normP.documents)) {
                  normP.documents.forEach((d: any) => {
                    rawDocs.push({
                      id: d.id || `norm-${d.url}`,
                      title:
                        d.title || d.originalFileName || "Aadhaar / ID Proof",
                      originalFileName:
                        d.title || d.originalFileName || "Aadhaar / ID Proof",
                      url: d.url || d.fileUrl,
                    });
                  });
                }

                if (Array.isArray(p.documents)) {
                  p.documents.forEach((d: any) => {
                    rawDocs.push({
                      id: d.id || `pdoc-${d.url}`,
                      title: d.title || d.originalFileName || "Document",
                      originalFileName:
                        d.title || d.originalFileName || "Document",
                      url: d.url || d.fileUrl,
                    });
                  });
                }

                const directIdProof =
                  p.aadhaarUrl || p.idProofUrl || p.aadhaar || p.idProof;
                if (
                  directIdProof &&
                  typeof directIdProof === "string" &&
                  (directIdProof.startsWith("http") ||
                    directIdProof.startsWith("/"))
                ) {
                  rawDocs.push({
                    id: `direct-idproof-${p.id || index}`,
                    title: "Aadhaar / ID Proof",
                    originalFileName: "Aadhaar / ID Proof",
                    url: directIdProof,
                  });
                }

                return rawDocs.filter(
                  (doc, idx, self) =>
                    doc &&
                    doc.url &&
                    self.findIndex(
                      (d) => d.url === doc.url || (d.id && d.id === doc.id),
                    ) === idx,
                );
              };

              const openDocPreview = (
                doc: any,
                passengerName: string,
                passengerId: string,
              ) => {
                const docUrl = doc.url || doc.fileUrl;
                const title =
                  doc.originalFileName || doc.title || "Aadhaar / ID Proof";
                if (docUrl) {
                  const fullUrl = /^(https?:|data:|blob:)/.test(docUrl)
                    ? docUrl
                    : `${ENV.API_BASE_URL}${docUrl.startsWith("/") ? "" : "/"}${docUrl}`;
                  setDocPreviewModal({
                    url: fullUrl,
                    title,
                    passengerName,
                  });
                } else {
                  handleViewDoc(passengerId, title, doc.id);
                }
              };

              const deletePassenger = async (p: any, name: string) => {
                if (!confirm(`Permanently delete passenger ${name}?`)) return;
                const updated = passengers.filter((x: any) => x.id !== p.id);
                setPassengers(updated);
                try {
                  await syncBookingDataWithPassengers(updated);
                  toast.success("Passenger removed and booking items updated");
                  if (onRefresh) onRefresh();
                } catch (e) {
                  toast.error("Failed to delete passenger");
                }
              };

              const cancelPassenger = (normP: any) => {
                setCancellingPassenger(normP);
                setCancellationReason("Customer Requested Cancellation");
                setCancellationNotes("");
                setCancelPassengerModalOpen(true);
              };

              const openPassengerDrawer = (normP: any) => {
                setActivePassenger(normP);
                setIsPassengerDrawerOpen(true);
              };

              const toggleSelected = (id: string, checked: boolean) => {
                setSelectedPassengerIds((prev) =>
                  checked ? [...prev, id] : prev.filter((x) => x !== id),
                );
              };

              const rows = passengers.map((p: any, index: number) => {
                const normP = normalizePassenger(booking, p, index);
                const isCancelled =
                  normP.isCancelled ||
                  p.isCancelled === true ||
                  p.status === "CANCELLED" ||
                  (typeof p.status === "string" &&
                    p.status.toLowerCase().includes("cancel"));
                const food = p.foodPreference || "Normal Food";
                return {
                  key: p.id || `pax-${index}`,
                  raw: p,
                  index,
                  normP,
                  isCancelled,
                  initials: getInitials(normP.name),
                  documents: collectDocuments(p, normP, index),
                  status: getPassengerStatus(normP.name, isCancelled),
                  docInputId: `doc-file-${normP.id}`,
                  cancellationReason:
                    normP.cancellationReason || p.cancellationReason || "",
                  roomLabel: getRoomSharingLabel(normP.roomSharing),
                  food,
                  isJainFood: ["jain food", "jain"].includes(
                    String(food).toLowerCase(),
                  ),
                };
              });

              const allSelected =
                rows.length > 0 &&
                rows.every((row) =>
                  selectedPassengerIds.includes(row.normP.id),
                );

              const iconBtn =
                "h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 transition-colors cursor-pointer";

              return (
                <div className="space-y-3 min-w-0">
                  <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden">
                    {/* Section header */}
                    <div className="px-4 md:px-5 py-3.5 border-b border-[#E8EEF4] bg-gradient-to-r from-[#0B1528]/[0.045] to-transparent">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="h-6 w-6 rounded-lg bg-[#0B1528]/[0.07] text-[#0B1528] inline-flex items-center justify-center shrink-0">
                              <Users className="w-3.5 h-3.5" />
                            </span>
                            <h3 className="text-xs font-semibold text-[#0B1528]">
                              Passengers manifest
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#E8EEF4] text-[#0B1528]">
                              {activePaxCount} active
                            </span>
                            {cancelledPaxCount > 0 && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">
                                {cancelledPaxCount} cancelled
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1.5 md:ml-8">
                            {passengers.length} of {expectedPaxCount} travellers
                            captured
                            {passengers.length < expectedPaxCount && (
                              <span className="text-[#C2410C] font-semibold">
                                {" "}
                                — details pending
                              </span>
                            )}
                          </p>
                        </div>
                        {canEditPassengers ? (
                          <button
                            onClick={openAddPassenger}
                            className="h-8 shrink-0 inline-flex items-center gap-1.5 bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs px-3.5 rounded-lg shadow-[0_1px_2px_rgba(255,77,0,0.35)] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add passenger
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 inline-flex items-center gap-1.5 shrink-0">
                            <Ban className="w-3.5 h-3.5" /> Passengers locked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bulk selection bar */}
                    {selectedPassengerIds.length > 0 && (
                      <div className="px-4 md:px-5 py-2.5 bg-[#FF4D00]/[0.05] border-b border-[#FF4D00]/20 flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#C2410C]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {selectedPassengerIds.length} selected
                          </span>
                          <button
                            onClick={() => setSelectedPassengerIds([])}
                            className="text-slate-500 hover:text-[#0B1528] font-semibold underline underline-offset-2 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={handleBulkCancelPassengers}
                            className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <UserX className="w-3 h-3" /> Cancel
                          </button>
                          <button
                            onClick={handleBulkRestorePassengers}
                            className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md bg-white border border-green-200 text-green-700 hover:bg-green-50 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          <button
                            onClick={() =>
                              toast.success("WhatsApp sharing initiated")
                            }
                            className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md bg-white border border-[#E8EEF4] text-slate-600 hover:text-[#0B1528] hover:border-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </button>
                          <button
                            onClick={() =>
                              toast.success("Bulk Excel download coming soon!")
                            }
                            className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md bg-white border border-[#E8EEF4] text-slate-600 hover:text-[#0B1528] hover:border-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> Excel
                          </button>
                        </div>
                      </div>
                    )}

                    {rows.length === 0 ? (
                      /* Empty state */
                      <div className="px-6 py-12 text-center">
                        <span className="h-11 w-11 rounded-2xl bg-[#F4F7FB] border border-[#E8EEF4] text-slate-400 inline-flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </span>
                        <p className="text-xs font-semibold text-[#0B1528] mt-3">
                          No passengers on this manifest yet
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-[300px] mx-auto leading-relaxed">
                          Add travellers with names, ages and ID proofs —
                          ticketing, rooming and meal planning all read from
                          here.
                        </p>
                        {canEditPassengers && (
                          <button
                            onClick={openAddPassenger}
                            className="h-8 mt-4 inline-flex items-center gap-1.5 bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs px-3.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add passenger
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* One hidden upload input per passenger, shared by the
                            desktop table and the mobile card list. */}
                        {rows.map((row) => (
                          <input
                            key={`upload-${row.key}`}
                            type="file"
                            id={row.docInputId}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.pdf"
                            multiple
                            onChange={(e) => handleFileChange(e, row.raw.id)}
                          />
                        ))}

                        {/* Desktop / tablet table */}
                        <div className="hidden md:block overflow-x-auto no-scrollbar">
                          <table className="w-full text-left text-xs min-w-[820px]">
                            <thead>
                              <tr className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                <th className="px-4 py-2.5 w-10">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00] w-3.5 h-3.5 cursor-pointer"
                                    checked={allSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPassengerIds(
                                          rows.map((row) => row.normP.id),
                                        );
                                      } else {
                                        setSelectedPassengerIds([]);
                                      }
                                    }}
                                    aria-label="Select all passengers"
                                  />
                                </th>
                                <th className="px-3 py-2.5">Passenger</th>
                                <th className="px-3 py-2.5 w-16">Age</th>
                                <th className="px-3 py-2.5 w-24">Gender</th>
                                <th className="px-3 py-2.5 w-32">
                                  Room &amp; meal
                                </th>
                                <th className="px-3 py-2.5 w-44">ID proof</th>
                                <th className="px-3 py-2.5 w-28">Status</th>
                                <th className="px-3 py-2.5 w-24 text-right">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8EEF4] text-slate-700">
                              {rows.map((row) => {
                                const { normP, raw, isCancelled } = row;
                                return (
                                  <tr
                                    key={row.key}
                                    onClick={() => openPassengerDrawer(normP)}
                                    className={cn(
                                      "group cursor-pointer transition-colors",
                                      isCancelled
                                        ? "bg-red-50/50 hover:bg-red-50"
                                        : "hover:bg-[#FFF6F1]",
                                    )}
                                  >
                                    <td
                                      className="px-4 py-3 align-top"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00] w-3.5 h-3.5 cursor-pointer mt-1"
                                        checked={selectedPassengerIds.includes(
                                          normP.id,
                                        )}
                                        onChange={(e) =>
                                          toggleSelected(
                                            normP.id,
                                            e.target.checked,
                                          )
                                        }
                                        aria-label={`Select ${normP.name}`}
                                      />
                                    </td>

                                    {/* Passenger — name primary, contact secondary */}
                                    <td className="px-3 py-3 align-top">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <span
                                          className={cn(
                                            "h-8 w-8 rounded-full border inline-flex items-center justify-center text-[11px] font-semibold shrink-0",
                                            isCancelled
                                              ? "bg-red-100 border-red-200 text-red-700"
                                              : row.index === 0
                                                ? "bg-[#FF4D00]/10 border-[#FF4D00]/25 text-[#C2410C]"
                                                : "bg-[#0B1528]/[0.06] border-[#0B1528]/10 text-[#0B1528]",
                                          )}
                                        >
                                          {row.initials}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                              className={cn(
                                                "text-xs font-semibold truncate",
                                                isCancelled
                                                  ? "line-through text-red-700"
                                                  : "text-[#0B1528]",
                                              )}
                                            >
                                              {normP.name || "N/A"}
                                            </span>
                                            {row.index === 0 && (
                                              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FF4D00]/[0.08] text-[#C2410C] border border-[#FF4D00]/20 shrink-0">
                                                Lead
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2.5 flex-wrap mt-1">
                                            {hasValue(normP.phone) ? (
                                              <a
                                                href={`tel:${normP.phone}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="text-[11px] font-mono text-slate-500 hover:text-[#FF4D00] inline-flex items-center gap-1"
                                              >
                                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                {normP.phone}
                                              </a>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                                                <Phone className="w-3 h-3 shrink-0" />
                                                No phone
                                              </span>
                                            )}
                                            {hasValue(normP.email) && (
                                              <span
                                                className="text-[11px] text-slate-500 inline-flex items-center gap-1 truncate max-w-[190px]"
                                                title={normP.email}
                                              >
                                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                                {normP.email}
                                              </span>
                                            )}
                                          </div>
                                          {isCancelled &&
                                            row.cancellationReason && (
                                              <div className="text-[10px] text-red-600 mt-1">
                                                {row.cancellationReason}
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-3 py-3 align-top">
                                      <span className="font-mono font-semibold text-[#0B1528] text-xs">
                                        {normP.age !== null
                                          ? `${normP.age}y`
                                          : "—"}
                                      </span>
                                      {normP.dob && (
                                        <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                                          {normP.dob}
                                        </span>
                                      )}
                                    </td>

                                    <td className="px-3 py-3 align-top">
                                      {normP.genderFull ? (
                                        <span
                                          className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                                            getGenderTone(normP.genderFull),
                                          )}
                                        >
                                          {normP.genderFull}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    <td className="px-3 py-3 align-top">
                                      <div className="text-[11px] font-semibold text-[#0B1528]">
                                        {row.roomLabel}
                                      </div>
                                      <span
                                        className={cn(
                                          "inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border",
                                          row.isJainFood
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-green-50 text-green-700 border-green-200",
                                        )}
                                      >
                                        {row.food}
                                      </span>
                                    </td>

                                    {/* ID proof */}
                                    <td
                                      className="px-3 py-3 align-top"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex flex-col gap-1.5 items-start">
                                        {row.documents.map((doc: any) => (
                                          <div
                                            key={doc.id || doc.url}
                                            className="w-full bg-[#F8FAFC] border border-[#E8EEF4] rounded-md px-2 py-1.5"
                                          >
                                            <div
                                              className="flex items-center gap-1.5 min-w-0"
                                              title={
                                                doc.originalFileName ||
                                                doc.title
                                              }
                                            >
                                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                              <span className="text-[10px] font-semibold text-slate-700 truncate">
                                                {doc.originalFileName ||
                                                  doc.title}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 pl-4">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  openDocPreview(
                                                    doc,
                                                    normP.name,
                                                    normP.id,
                                                  )
                                                }
                                                className="text-[10px] font-semibold text-[#FF4D00] hover:text-[#E04400] cursor-pointer"
                                              >
                                                View
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveDoc(
                                                    raw.id,
                                                    doc.id,
                                                  )
                                                }
                                                className="text-[10px] font-semibold text-slate-400 hover:text-red-600 cursor-pointer"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            document
                                              .getElementById(row.docInputId)
                                              ?.click()
                                          }
                                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-[#0B1528] border border-dashed border-[#E8EEF4] hover:border-slate-300 rounded-md px-2 py-1 transition-colors cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          {row.documents.length > 0
                                            ? "Add"
                                            : "Upload ID proof"}
                                        </button>
                                      </div>
                                    </td>

                                    <td className="px-3 py-3 align-top">
                                      <span
                                        className={cn(
                                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                          row.status.colorClass,
                                        )}
                                      >
                                        {row.status.label}
                                      </span>
                                    </td>

                                    {/* Actions — quiet until row hover */}
                                    <td
                                      className="px-3 py-3 align-top"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {canEditPassengers ? (
                                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() =>
                                              openPassengerDrawer(normP)
                                            }
                                            className={cn(
                                              iconBtn,
                                              "hover:text-[#0B1528] hover:bg-[#0B1528]/[0.06]",
                                            )}
                                            title="Open passenger module"
                                          >
                                            <User className="w-3.5 h-3.5" />
                                          </button>
                                          {isCancelled ? (
                                            <button
                                              onClick={() =>
                                                handleRestorePassenger(normP)
                                              }
                                              className={cn(
                                                iconBtn,
                                                "text-green-600 hover:bg-green-50",
                                              )}
                                              title="Restore passenger"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() =>
                                                cancelPassenger(normP)
                                              }
                                              className={cn(
                                                iconBtn,
                                                "hover:text-red-600 hover:bg-red-50",
                                              )}
                                              title="Cancel this passenger"
                                            >
                                              <UserX className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() =>
                                              deletePassenger(raw, normP.name)
                                            }
                                            className={cn(
                                              iconBtn,
                                              "hover:text-red-600 hover:bg-red-50",
                                            )}
                                            title="Permanently delete"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex justify-end">
                                          <button
                                            onClick={() =>
                                              openPassengerDrawer(normP)
                                            }
                                            className={cn(
                                              iconBtn,
                                              "hover:text-[#0B1528] hover:bg-[#0B1528]/[0.06]",
                                            )}
                                            title="Open passenger module"
                                          >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile card list */}
                        <ul className="md:hidden divide-y divide-[#E8EEF4]">
                          {rows.map((row) => {
                            const { normP, raw, isCancelled } = row;
                            return (
                              <li
                                key={`m-${row.key}`}
                                className={cn(
                                  "px-4 py-3.5",
                                  isCancelled && "bg-red-50/50",
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00] w-4 h-4 cursor-pointer mt-2 shrink-0"
                                    checked={selectedPassengerIds.includes(
                                      normP.id,
                                    )}
                                    onChange={(e) =>
                                      toggleSelected(
                                        normP.id,
                                        e.target.checked,
                                      )
                                    }
                                    aria-label={`Select ${normP.name}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openPassengerDrawer(normP)}
                                    className="flex-1 min-w-0 text-left cursor-pointer"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <span
                                        className={cn(
                                          "h-9 w-9 rounded-full border inline-flex items-center justify-center text-xs font-semibold shrink-0",
                                          isCancelled
                                            ? "bg-red-100 border-red-200 text-red-700"
                                            : row.index === 0
                                              ? "bg-[#FF4D00]/10 border-[#FF4D00]/25 text-[#C2410C]"
                                              : "bg-[#0B1528]/[0.06] border-[#0B1528]/10 text-[#0B1528]",
                                        )}
                                      >
                                        {row.initials}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={cn(
                                              "text-xs font-semibold truncate",
                                              isCancelled
                                                ? "line-through text-red-700"
                                                : "text-[#0B1528]",
                                            )}
                                          >
                                            {normP.name || "N/A"}
                                          </span>
                                          {row.index === 0 && (
                                            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FF4D00]/[0.08] text-[#C2410C] border border-[#FF4D00]/20 shrink-0">
                                              Lead
                                            </span>
                                          )}
                                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                          <span
                                            className={cn(
                                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                              row.status.colorClass,
                                            )}
                                          >
                                            {row.status.label}
                                          </span>
                                          {normP.genderFull && (
                                            <span
                                              className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                                                getGenderTone(
                                                  normP.genderFull,
                                                ),
                                              )}
                                            >
                                              {normP.genderFull}
                                            </span>
                                          )}
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#E8EEF4] bg-[#F8FAFC] text-[10px] font-semibold text-slate-600 font-mono">
                                            {normP.age !== null
                                              ? `${normP.age}y`
                                              : "Age —"}
                                          </span>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#E8EEF4] bg-[#F8FAFC] text-[10px] font-semibold text-slate-600">
                                            {row.roomLabel}
                                          </span>
                                          <span
                                            className={cn(
                                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                              row.isJainFood
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : "bg-green-50 text-green-700 border-green-200",
                                            )}
                                          >
                                            {row.food}
                                          </span>
                                        </div>
                                        {isCancelled &&
                                          row.cancellationReason && (
                                            <div className="text-[10px] text-red-600 mt-1.5">
                                              {row.cancellationReason}
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  </button>
                                </div>

                                {/* Contact + documents */}
                                <div className="mt-2.5 pl-7 space-y-1.5">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {hasValue(normP.phone) ? (
                                      <a
                                        href={`tel:${normP.phone}`}
                                        className="text-[11px] font-mono font-semibold text-slate-600 hover:text-[#FF4D00] inline-flex items-center gap-1"
                                      >
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {normP.phone}
                                      </a>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> No phone
                                      </span>
                                    )}
                                    {hasValue(normP.email) && (
                                      <a
                                        href={`mailto:${normP.email}`}
                                        className="text-[11px] text-slate-500 hover:text-[#FF4D00] inline-flex items-center gap-1 truncate max-w-full"
                                      >
                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                          {normP.email}
                                        </span>
                                      </a>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {row.documents.length > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        {row.documents.length} ID{" "}
                                        {row.documents.length === 1
                                          ? "proof"
                                          : "proofs"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                        <AlertCircle className="w-3 h-3" /> No
                                        ID proof
                                      </span>
                                    )}
                                    {row.documents.slice(0, 1).map((doc: any) => (
                                      <button
                                        key={`m-doc-${doc.id || doc.url}`}
                                        type="button"
                                        onClick={() =>
                                          openDocPreview(
                                            doc,
                                            normP.name,
                                            normP.id,
                                          )
                                        }
                                        className="text-[11px] font-semibold text-[#FF4D00] hover:text-[#E04400] cursor-pointer"
                                      >
                                        View
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        document
                                          .getElementById(row.docInputId)
                                          ?.click()
                                      }
                                      className="text-[11px] font-semibold text-slate-500 hover:text-[#0B1528] cursor-pointer"
                                    >
                                      Upload
                                    </button>
                                  </div>

                                  {canEditPassengers && (
                                    <div className="flex items-center gap-1.5 pt-1">
                                      {isCancelled ? (
                                        <button
                                          onClick={() =>
                                            handleRestorePassenger(normP)
                                          }
                                          className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md border border-green-200 bg-white text-green-700 text-[11px] font-semibold cursor-pointer"
                                        >
                                          <RotateCcw className="w-3 h-3" />{" "}
                                          Restore
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() =>
                                            cancelPassenger(normP)
                                          }
                                          className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-slate-600 text-[11px] font-semibold cursor-pointer"
                                        >
                                          <UserX className="w-3 h-3" /> Cancel
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          deletePassenger(raw, normP.name)
                                        }
                                        className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md border border-[#E8EEF4] bg-white text-slate-500 text-[11px] font-semibold cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* === PAYMENTS TAB === */}
          {adminActiveTab === "payments" && (
            <div className="space-y-3 min-w-0">
              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 bg-white border-b border-[#E8EEF4] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-[#0B1528] text-xs">
                      Payment History & Transactions
                    </h3>
                    {financeDue > 0 ? (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 uppercase font-mono">
                        Balance Due ₹
                        {financeDue.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 uppercase font-mono">
                        Fully Paid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/approvals-hub?tab=payment-approvals&q=${encodeURIComponent(booking.bookingId || booking.id)}`,
                        )
                      }
                      className="text-[10px] font-semibold uppercase text-slate-500 hover:text-[#FF4D00] px-2 py-1.5"
                    >
                      Finance hub
                    </button>
                  <button
                    onClick={() => {
                      openCreatePaymentModal(
                        financeDue || booking.remainingAmount || "",
                      );
                    }}
                    className="bg-[#0B1528] hover:bg-[#182741] text-white font-semibold text-[10px] uppercase px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                  >
                    + Record Payment
                  </button>
                  </div>
                </div>

                {/* Inline Payment Submission block */}
                {showAddPaymentInline && (
                  <div className="p-4 bg-slate-50 border-b border-[#E8EEF4] text-xs space-y-3">
                    <p className="font-semibold text-slate-850">
                      Record Manual Payment
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold uppercase text-slate-400">
                          Amount Paid
                        </label>
                        <Input
                          type="number"
                          value={newPaymentAmount}
                          onChange={(e) => setNewPaymentAmount(e.target.value)}
                          placeholder="₹"
                          className="h-8 text-xs w-28"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold uppercase text-slate-400">
                          Payment Mode
                        </label>
                        <Select
                          value={newPaymentMode}
                          onValueChange={setNewPaymentMode}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank Transfer">
                              Bank Transfer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-1.5">
                        <Button
                          onClick={handleAddPaymentSubmit}
                          disabled={recordingPayment}
                          size="sm"
                          className="bg-slate-900 text-white text-[10px] font-semibold uppercase h-8 px-3.5 rounded"
                        >
                          {recordingPayment ? "Recording..." : "Record"}
                        </Button>
                        <Button
                          onClick={() => setShowAddPaymentInline(false)}
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-[#0B1528] h-8 text-[10px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabs section */}
                <div className="border-b border-slate-100 flex">
                  {(["successful", "outstanding", "failed"] as const).map(
                    (tabName) => (
                      <button
                        key={tabName}
                        onClick={() => setPaymentTab(tabName)}
                        className={cn(
                          "px-4 py-2 text-[10px] uppercase tracking-wide font-semibold border-b-2 transition-all",
                          paymentTab === tabName
                            ? "border-primary text-primary bg-slate-50/40"
                            : "border-transparent text-slate-400 hover:text-slate-700",
                        )}
                      >
                        {tabName === "successful"
                          ? `Cleared (${successfulPayments.length})`
                          : tabName === "outstanding"
                            ? `Outstanding (${pendingPayments.length + (financeDue > 0 ? 1 : 0)})`
                            : `Expired/Failed (${failedPayments.length})`}
                      </button>
                    ),
                  )}
                </div>

                {/* Active Tab Panel */}
                <div className="p-5">
                  {paymentTab === "successful" &&
                    (successfulPayments.length > 0 ? (
                      <div className="border border-[#E8EEF4]/60 rounded overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-semibold text-slate-450">
                              <th className="px-4 py-2">Payment comments</th>
                              <th className="px-4 py-2">UTR / Ref</th>
                              <th className="px-4 py-2 text-right">Amt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8EEF4]">
                            {successfulPayments.map((p: any) => {
                              const isExpanded = expandedPaymentId === p.id;
                              const displayDate = safeFormatDateTime(
                                p.createdAt,
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                },
                              );

                              return (
                                <React.Fragment key={p.id}>
                                  <tr
                                    className="text-slate-700 hover:bg-[#F8FAFC] cursor-pointer"
                                    onClick={() =>
                                      setExpandedPaymentId(
                                        isExpanded ? null : p.id,
                                      )
                                    }
                                  >
                                    <td className="px-4 py-3 font-semibold flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded uppercase bg-slate-200 text-slate-700 font-mono">
                                        {p.paymentMode || "Unknown"}
                                      </span>
                                      {p.collectionAccount && (
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                          🏛️ {p.collectionAccount.accountName}
                                        </span>
                                      )}
                                      <span>
                                        {p.notes ||
                                          `${booking.bookingId} payment`}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-mono">
                                      {displayPaymentRef(p)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold font-mono">
                                      ₹{" "}
                                      {p.amount.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr
                                      key={`${p.id}-details`}
                                      className="bg-slate-50/50"
                                    >
                                      <td
                                        colSpan={3}
                                        className="px-6 py-4 border-t border-b border-[#E8EEF4]"
                                      >
                                        <div className="max-w-xl space-y-2.5 text-xs text-slate-750">
                                          {/* Collection Account */}
                                          <div className="grid grid-cols-3 gap-y-1.5 py-1.5 border-b border-[#E8EEF4]/60">
                                            <span className="text-slate-500 font-semibold">
                                              Collection Account
                                            </span>
                                            <span className="col-span-2 font-semibold text-blue-900 flex items-center gap-1.5">
                                              {p.collectionAccount?.accountName || "Default Treasury"}
                                              {p.collectionAccount?.accountType && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                                                  {p.collectionAccount.accountType}
                                                </span>
                                              )}
                                              {p.collectionAccount?.upiId && (
                                                <span className="text-[10px] font-mono text-slate-500 font-normal">
                                                  ({p.collectionAccount.upiId})
                                                </span>
                                              )}
                                            </span>
                                          </div>

                                          {/* UTR / Transaction Reference */}
                                          <div className="grid grid-cols-3 gap-y-1.5 py-1.5 border-b border-[#E8EEF4]/60">
                                            <span className="text-slate-500 font-semibold">
                                              UTR / Transaction Ref
                                            </span>
                                            <span className="col-span-2">
                                              <span className="font-mono font-semibold text-[#0B1528] bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block border border-slate-200">
                                                {p.transactionId || booking.upi_reference || `${booking.bookingId}-${p.id.slice(-6)}`}
                                              </span>
                                            </span>
                                          </div>

                                          {/* Payment Proof Documents */}
                                          <div className="grid grid-cols-3 gap-y-1.5 py-1.5 border-b border-[#E8EEF4]/60">
                                            <span className="text-slate-500 font-semibold">
                                              Payment Proof
                                            </span>
                                            <div className="col-span-2">
                                              {(() => {
                                                const proofUrls =
                                                  resolvePaymentProofUrls(p);
                                                const proofName =
                                                  p.proofFileName || "Receipt";
                                                if (proofUrls.length > 0) {
                                                  return (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      {proofUrls.map(
                                                        (proofUrl, idx) => (
                                                          <button
                                                            key={`${proofUrl}-${idx}`}
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              window.open(
                                                                formatProofDisplayUrl(
                                                                  proofUrl,
                                                                  ENV.API_BASE_URL,
                                                                ),
                                                                "_blank",
                                                                "noopener,noreferrer",
                                                              );
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-md font-semibold text-[11px] transition-colors cursor-pointer"
                                                          >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>
                                                              {proofUrls.length >
                                                              1
                                                                ? `View #${idx + 1}`
                                                                : `View Proof (${proofName})`}
                                                            </span>
                                                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                                                          </button>
                                                        ),
                                                      )}
                                                      <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF4D00]/10 text-[#FF4D00] hover:bg-[#FF4D00]/20 rounded text-[10px] font-semibold transition-colors">
                                                        <Upload className="w-3 h-3" />
                                                        Add more
                                                        <input
                                                          type="file"
                                                          multiple
                                                          accept="image/jpeg,image/png,image/jpg,application/pdf"
                                                          className="hidden"
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                          onChange={async (
                                                            e,
                                                          ) => {
                                                            const files =
                                                              e.target.files;
                                                            e.target.value = "";
                                                            await handleAttachPaymentProof(
                                                              p.id,
                                                              files,
                                                            );
                                                          }}
                                                        />
                                                      </label>
                                                    </div>
                                                  );
                                                }
                                                return (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 italic text-[11px]">
                                                      No proof file attached
                                                    </span>
                                                    <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF4D00]/10 text-[#FF4D00] hover:bg-[#FF4D00]/20 rounded text-[10px] font-semibold transition-colors">
                                                      <Upload className="w-3 h-3" />
                                                      + Attach Proof
                                                      <input
                                                        type="file"
                                                        multiple
                                                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                                                        className="hidden"
                                                        onClick={(e) =>
                                                          e.stopPropagation()
                                                        }
                                                        onChange={async (e) => {
                                                          const files =
                                                            e.target.files;
                                                          e.target.value = "";
                                                          await handleAttachPaymentProof(
                                                            p.id,
                                                            files,
                                                          );
                                                        }}
                                                      />
                                                    </label>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          </div>

                                          {/* Payment Mode */}
                                          <div className="grid grid-cols-3 gap-y-1.5 py-1.5 border-b border-[#E8EEF4]/60">
                                            <span className="text-slate-500 font-semibold">
                                              Payment mode
                                            </span>
                                            <span className="col-span-2 font-semibold text-[#0B1528] flex items-center gap-2">
                                              <span>{p.paymentMode || "UPI"}</span>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                                                p.status === "Verified"
                                                  ? "bg-green-50 text-green-700 border-green-200"
                                                  : p.status === "Rejected"
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                              }`}>
                                                {p.status || "Pending Verification"}
                                              </span>
                                            </span>
                                          </div>

                                          {/* Recorded At */}
                                          <div className="grid grid-cols-3 gap-y-1.5 py-1.5 border-b border-[#E8EEF4]/60">
                                            <span className="text-slate-500 font-semibold">
                                              Successful at
                                            </span>
                                            <span className="col-span-2 text-slate-600">
                                              {displayDate}{" "}
                                              <span className="text-[10px] text-slate-400 ml-1">
                                                initiated via backoffice
                                              </span>
                                            </span>
                                          </div>

                                          {/* Comments */}
                                          <div className="grid grid-cols-3 gap-y-1.5 py-1.5 border-b border-[#E8EEF4]/60">
                                            <span className="text-slate-500 font-semibold">
                                              Comments
                                            </span>
                                            <span className="col-span-2 text-slate-600">
                                              {p.notes ||
                                                `Payment for booking ${booking.bookingId}`}
                                            </span>
                                          </div>
                                          <div className="flex gap-2 pt-2.5">
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                const reason = prompt(
                                                  "Refund reason / reference (required):",
                                                );
                                                if (!reason) return;
                                                try {
                                                  await paymentsService.refund(
                                                    p.id,
                                                    {
                                                      reason,
                                                      amount: p.amount,
                                                    },
                                                  );
                                                  toast.success(
                                                    "Refund recorded and payment reversed!",
                                                  );
                                                  onRefresh();
                                                } catch (err: any) {
                                                  toast.error(
                                                    err?.response?.data
                                                      ?.message ||
                                                      "Refund failed",
                                                  );
                                                }
                                              }}
                                              className="bg-[#31b0d5] hover:bg-[#269abc] text-white font-semibold uppercase text-[9px] px-3.5 py-1.5 rounded transition-all"
                                            >
                                              Refund
                                            </button>
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                const reason = prompt(
                                                  "Reversal reason / reference (required):",
                                                );
                                                if (!reason) return;
                                                try {
                                                  await paymentsService.reverse(
                                                    p.id,
                                                    { reason },
                                                  );
                                                  toast.success(
                                                    "Payment reversed!",
                                                  );
                                                  onRefresh();
                                                } catch (err: any) {
                                                  toast.error(
                                                    err?.response?.data
                                                      ?.message ||
                                                      "Reversal failed",
                                                  );
                                                }
                                              }}
                                              className="bg-[#f0ad4e] hover:bg-[#ec971f] text-white font-semibold uppercase text-[9px] px-3.5 py-1.5 rounded transition-all"
                                            >
                                              Reverse
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6 text-center text-slate-400">
                        <CreditCard className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-[11px] italic mb-3">
                          No successful payments yet
                        </p>
                        <button
                          onClick={() => {
                            openCreatePaymentModal(financeDue || "");
                          }}
                          className="bg-primary hover:bg-primary/95 text-white font-semibold text-[9px] uppercase px-4 py-1.5 rounded transition-all"
                        >
                          + Create Payment Request
                        </button>
                      </div>
                    ))}

                  {paymentTab === "outstanding" &&
                    (pendingPayments.length > 0 || financeDue > 0 ? (
                      <div className="border border-[#E8EEF4]/60 rounded overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-semibold text-slate-400">
                              <th className="px-4 py-2">Request Type</th>
                              <th className="px-4 py-2">UTR / Ref</th>
                              <th className="px-4 py-2">Updated At</th>
                              <th className="px-4 py-2 text-right">
                                Outstanding
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingPayments.map((p: any) => (
                              <tr key={p.id} className="text-slate-700">
                                <td className="px-4 py-3 font-semibold">
                                  {p.notes || "Recorded payment"}
                                  <span className="ml-2 text-[8px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1 py-0.2 rounded uppercase">
                                    Awaiting finance
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-mono">
                                  {displayPaymentRef(p)}
                                </td>
                                <td className="px-4 py-3 text-slate-400 font-mono">
                                  {safeFormatDate(p.createdAt, {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold font-mono text-amber-700">
                                  ₹{" "}
                                  {Number(p.amount || 0).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                            {financeDue > 0 && (
                            <tr className="text-slate-700">
                              <td className="px-4 py-3 font-semibold">
                                Balance still due
                                <span className="ml-2 text-[8px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1 py-0.2 rounded uppercase">
                                  OPEN
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 font-mono">—</td>
                              <td className="px-4 py-3 text-slate-400 font-mono">
                                {safeFormatDate(booking.updatedAt, {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold font-mono text-red-650">
                                ₹{" "}
                                {financeDue.toLocaleString("en-IN")}
                              </td>
                            </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-2">
                        No outstanding balance requests.
                      </p>
                    ))}

                  {paymentTab === "failed" &&
                    (failedPayments.length > 0 ? (
                      <div className="border border-[#E8EEF4]/60 rounded overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-semibold text-slate-400">
                              <th className="px-4 py-2">Payment</th>
                              <th className="px-4 py-2">UTR / Ref</th>
                              <th className="px-4 py-2 text-right">Amt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {failedPayments.map((p: any) => (
                              <tr key={p.id} className="text-slate-700">
                                <td className="px-4 py-3 font-semibold">
                                  {p.notes || "Failed payment"}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {displayPaymentRef(p)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono">
                                  ₹ {Number(p.amount || 0).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                    <p className="text-[11px] text-slate-400 italic py-2">
                      No expired or failed payment histories recorded.
                    </p>
                    ))}
                </div>
              </div>

              {booking.notes &&
                String(booking.notes).trim() &&
                !/^city\/state:/i.test(String(booking.notes).trim()) && (
                <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden px-5 py-3.5">
                  <h3 className="font-semibold text-[#0B1528] text-xs mb-1">
                    Special requests
                  </h3>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* === OPERATIONS TAB === */}
          {adminActiveTab === "operations" && (
            <div className="space-y-3 min-w-0">
              {/* Team Interaction & Booking Tasks */}
              <div className="bg-white border border-[#E8EEF4] rounded p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="font-semibold text-[#0B1528] text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" /> Team Interaction
                    & Tasks
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateTask(true)}
                    className="h-7 text-[9px] font-semibold uppercase rounded"
                  >
                    Assign Task
                  </Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {loadingTasks ? (
                    <p className="text-[10px] text-slate-450 italic">
                      Loading tasks...
                    </p>
                  ) : tasks.length === 0 ? (
                    <p className="text-[10px] text-slate-450 italic">
                      No tasks assigned for this booking.
                    </p>
                  ) : (
                    tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-3 bg-white border border-slate-150 rounded-lg space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-semibold text-[#0B1528] text-xs">
                              {task.title}
                            </h5>
                            {task.description && (
                              <p className="text-[10px] text-slate-500">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[8px] font-semibold",
                              task.status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : task.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="text-[9.5px] text-slate-500 space-y-0.5 border-t border-slate-100/80 pt-1.5 font-sans">
                          <div className="flex justify-between items-center text-slate-600 font-medium">
                            <span>
                              Created:{" "}
                              <b className="text-[#0B1528]">
                                {task.createdAt
                                  ? safeFormatDateTime(task.createdAt)
                                  : "N/A"}
                              </b>{" "}
                              by{" "}
                              <b className="text-[#0B1528]">
                                {task.assignedBy?.name ||
                                  task.assignedByAdmin?.name ||
                                  "System"}
                              </b>
                            </span>
                            <span>
                              Assigned to:{" "}
                              <b className="text-[#0B1528]">
                                {task.assignedTo?.name ||
                                  task.assignedToAdmin?.name ||
                                  "Unassigned"}
                              </b>
                            </span>
                          </div>
                          {task.updatedAt &&
                            task.updatedAt !== task.createdAt && (
                              <div className="text-[9px] text-slate-400">
                                Last edited:{" "}
                                {safeFormatDateTime(task.updatedAt)}{" "}
                                {task.lastEditedBy
                                  ? `by ${task.lastEditedBy}`
                                  : ""}
                              </div>
                            )}
                          {task.completedAt && (
                            <div className="text-[9px] text-green-600 font-semibold">
                              Completed: {safeFormatDateTime(task.completedAt)}{" "}
                              {task.completedBy ? `by ${task.completedBy}` : ""}
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="text-[9px] text-amber-600 font-medium">
                              Due: {safeFormatDate(task.dueDate)}
                            </div>
                          )}
                        </div>

                        {task.status !== "COMPLETED" && (
                          <div className="flex gap-2 justify-end pt-1 border-t border-slate-100">
                            {task.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleUpdateTaskStatus(task.id, "IN_PROGRESS")
                                }
                                className="h-6 px-2 text-[8px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 uppercase"
                              >
                                Mark In Progress
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleUpdateTaskStatus(task.id, "COMPLETED")
                              }
                              className="h-6 px-2 text-[8px] font-semibold text-green-600 hover:text-green-700 hover:bg-green-50 uppercase"
                            >
                              Mark Completed
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === TICKETING TAB === */}
          {adminActiveTab === "ticketing" && (
            <div className="space-y-3 min-w-0">
              <TrainTicketsPanel
                bookingId={booking.id}
                booking={booking}
                passengers={passengers}
                onCountChange={() => {}}
              />
            </div>
          )}

          {/* === ACCOUNTING TAB === */}
          {adminActiveTab === "accounting" && (
            <div className="space-y-3 min-w-0">
              {/* Card 1: Booking Items */}
              <div className="bg-white border border-[#E8EEF4] rounded overflow-hidden">
                <div className="px-4 py-3 bg-white border-b border-[#E8EEF4] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#0B1528] text-xs">
                      Booking Items
                    </h3>
                    <div className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/80">
                      <button
                        type="button"
                        onClick={() => setAccountingViewMode("per_person")}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1",
                          accountingViewMode === "per_person"
                            ? "bg-white text-green-700 border border-[#E8EEF4] font-semibold"
                            : "text-slate-600 hover:text-slate-900 font-semibold",
                        )}
                      >
                        <User className="w-3 h-3 text-green-600" />
                        Per-Person Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountingViewMode("group")}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1",
                          accountingViewMode === "group"
                            ? "bg-white text-blue-700 border border-[#E8EEF4] font-semibold"
                            : "text-slate-600 hover:text-slate-900 font-semibold",
                        )}
                      >
                        <Layers className="w-3 h-3 text-blue-600" />
                        Group Summary
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setNewDepartureDate(
                          getInitialDateString(booking.departureDate),
                        );
                        setShowChangeDates(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Change dates
                    </button>
                    <button
                      onClick={() => {
                        setEditRate(
                          (booking.baseAmount || itemRate).toFixed(0),
                        );
                        setEditQty(qty.toString());
                        setEditDiscount("");
                        setIsEditingItems(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded transition-all"
                    >
                      <Pencil className="w-3 h-3 text-slate-500" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const regenerated =
                          meta.bookingItems && meta.bookingItems.length > 0
                            ? meta.bookingItems
                            : generatePerPersonBookingItems(
                                booking,
                                passengers,
                                fullTrip,
                              );
                        setBookingItems(regenerated);
                        toast.success("Restored per-person line items");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-300 hover:bg-green-100 px-2.5 py-1 rounded transition-all"
                      title="Reset to 1 Transport & 1 Accommodation line item per passenger"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-green-600" />
                      Reset to Per-Person
                    </button>
                  </div>
                </div>

                {isEditingItems ? (
                  /* ─── EDIT BOOKING ITEMS MODE (VACATIONLABS STYLE) ─── */
                  <div className="p-5 space-y-5 text-xs bg-[#fafbfc]">
                    {/* Header notes */}
                    <div className="bg-[#f8fafc] border border-[#E8EEF4]/80 rounded-lg p-4 text-slate-600 leading-relaxed">
                      <div className="flex items-start gap-2.5">
                        <span className="text-amber-500 text-base mt-0.5">
                          ⚠️
                        </span>
                        <div>
                          <p className="font-semibold text-[#0B1528] mb-1">
                            Impact Warning
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Editing booking items directly modifies rates &
                            final billing amounts. You can manually adjust line
                            items or use the presets below. Remember to click{" "}
                            <strong>Update</strong> to preview totals before
                            saving.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subactions bar */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Select Passengers
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const val = prompt(
                              "Enter Special Discount Amount (₹):",
                              "1000",
                            );
                            if (!val) return;
                            const num = parseFloat(val);
                            if (isNaN(num) || num <= 0)
                              return toast.error(
                                "Please enter a valid discount amount",
                              );
                            const newItem = {
                              id: `discount_${Date.now()}`,
                              name: "Special Discount",
                              rate: -Math.abs(num),
                              qty: 1,
                              category: "discounts",
                            };
                            setBookingItems((prev) => [...prev, newItem]);
                            toast.success(`Applied ₹${num} Special Discount!`);
                          }}
                          className="px-3 py-1.5 bg-white border border-[#E8EEF4] hover:bg-slate-50 hover:border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-all cursor-pointer"
                        >
                          Special Charge/Discount
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const code = prompt(
                              "Enter Coupon Code:",
                              "SUMMER500",
                            );
                            if (!code) return;
                            const val = prompt(
                              `Enter Discount Amount for Coupon (${code.toUpperCase()}) (₹):`,
                              "500",
                            );
                            if (!val) return;
                            const num = parseFloat(val);
                            if (isNaN(num) || num <= 0)
                              return toast.error(
                                "Please enter a valid coupon amount",
                              );
                            const newItem = {
                              id: `coupon_${Date.now()}`,
                              name: `Coupon (${code.toUpperCase()})`,
                              rate: -Math.abs(num),
                              qty: 1,
                              category: "discounts",
                            };
                            setBookingItems((prev) => [...prev, newItem]);
                            toast.success(
                              `Applied Coupon ${code.toUpperCase()} (-₹${num})!`,
                            );
                          }}
                          className="px-3 py-1.5 bg-white border border-[#E8EEF4] hover:bg-slate-50 hover:border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-all cursor-pointer"
                        >
                          Coupon
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toast.info("No addons configured for this trip.")
                          }
                          className="px-3 py-1.5 bg-white border border-[#E8EEF4] hover:bg-slate-50 hover:border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-all"
                        >
                          Addon (0 Available)
                        </button>
                      </div>
                    </div>

                    {/* Table for inputs */}
                    <div className="border border-[#E8EEF4]/90 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#E8EEF4] bg-slate-50 text-[10px] font-semibold text-slate-400">
                            <th className="px-5 py-3">Name & Description</th>
                            <th className="px-5 py-3 w-32">Rate</th>
                            <th className="px-5 py-3 w-24">Quantity</th>
                            <th className="px-5 py-3 w-36 text-right">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF4] text-slate-700">
                          {(() => {
                            // Aggregate items into clean group rows for edit view
                            const groupMap = new Map<
                              string,
                              {
                                key: string;
                                name: string;
                                category?: string;
                                rate: number;
                                qty: number;
                                originalIds: string[];
                              }
                            >();

                            bookingItems
                              .filter((item) => item.qty > 0 || item.rate < 0)
                              .forEach((item) => {
                                const cleanName =
                                  (item.name || "")
                                    .replace(/\s*\[.*?\]$/, "")
                                    .replace(/→Himachal/g, "")
                                    .trim() || "Package Item";
                                const key = `${cleanName}__${item.rate}`;

                                if (groupMap.has(key)) {
                                  const existing = groupMap.get(key)!;
                                  existing.qty += item.qty || 1;
                                  existing.originalIds.push(item.id);
                                } else {
                                  groupMap.set(key, {
                                    key,
                                    name: cleanName,
                                    category: item.category,
                                    rate: item.rate || 0,
                                    qty: item.qty || 1,
                                    originalIds: [item.id],
                                  });
                                }
                              });

                            return Array.from(groupMap.values()).map((row) => {
                              const isDiscount =
                                row.rate < 0 || row.category === "discounts";
                              const absAmt = Math.abs(row.rate * row.qty);

                              return (
                                <tr
                                  key={row.originalIds[0] || row.key}
                                  className="hover:bg-slate-50/60 transition-colors"
                                >
                                  <td className="px-5 py-3">
                                    <Input
                                      type="text"
                                      value={row.name}
                                      onChange={(e) => {
                                        const newName = e.target.value;
                                        setBookingItems(
                                          applyGroupNameToItems(
                                            bookingItems,
                                            row.originalIds,
                                            newName,
                                          ),
                                        );
                                      }}
                                      className="h-8 text-xs font-semibold text-[#0B1528] border-[#E8EEF4] focus-visible:ring-1 focus-visible:ring-slate-400 w-full bg-white rounded-lg"
                                    />
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400 font-mono text-xs">
                                        ₹
                                      </span>
                                      <Input
                                        type="number"
                                        value={row.rate}
                                        onChange={(e) => {
                                          const val = parseFloat(
                                            e.target.value,
                                          );
                                          const newRate = isNaN(val) ? 0 : val;
                                          const updated = bookingItems.map(
                                            (x) =>
                                              row.originalIds.includes(x.id)
                                                ? { ...x, rate: newRate }
                                                : x,
                                          );
                                          setBookingItems(updated);
                                        }}
                                        className="h-8 text-xs w-28 font-mono font-semibold border-[#E8EEF4] text-[#0B1528] focus-visible:ring-1 focus-visible:ring-slate-400 bg-white rounded-lg"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <Input
                                      type="number"
                                      value={row.qty}
                                      onChange={(e) => {
                                        const newQty =
                                          parseInt(e.target.value) || 0;
                                        setBookingItems(
                                          applyGroupQtyToItems(
                                            bookingItems,
                                            row.originalIds,
                                            newQty,
                                          ),
                                        );
                                      }}
                                      className="h-8 text-xs w-16 font-mono font-semibold border-[#E8EEF4] text-center focus-visible:ring-1 focus-visible:ring-slate-400 bg-white rounded-lg"
                                    />
                                  </td>
                                  <td className="px-5 py-3 text-right font-semibold font-mono text-[12px] text-slate-900">
                                    {(isDiscount ? "- " : "") +
                                      "₹ " +
                                      absAmt.toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBookingItems(
                                          bookingItems.filter(
                                            (x) =>
                                              !row.originalIds.includes(x.id),
                                          ),
                                        );
                                        toast.success("Item removed");
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Remove Item"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}

                          {/* Custom item input line */}
                          <tr className="bg-slate-50/20">
                            <td className="px-5 py-4">
                              <Input
                                placeholder="Add custom item description (e.g. GST Discount)"
                                value={customDescription}
                                onChange={(e) =>
                                  setCustomDescription(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (
                                      !customDescription.trim() ||
                                      !customRate
                                    )
                                      return toast.error(
                                        "Enter item description and rate",
                                      );
                                    const parsedRate =
                                      parseFloat(customRate) || 0;
                                    const isDescDiscount =
                                      customDescription
                                        .toLowerCase()
                                        .includes("discount") ||
                                      customDescription
                                        .toLowerCase()
                                        .includes("coupon") ||
                                      customDescription
                                        .toLowerCase()
                                        .includes("off");
                                    const finalRate =
                                      isDescDiscount && parsedRate > 0
                                        ? -parsedRate
                                        : parsedRate;
                                    const newItem = {
                                      id: `custom_${Date.now()}`,
                                      name: customDescription.trim(),
                                      rate: finalRate,
                                      qty: parseInt(customQty) || 1,
                                      category: isDescDiscount
                                        ? "discounts"
                                        : undefined,
                                      isCustom: true,
                                    };
                                    setBookingItems((prev) => [
                                      ...prev,
                                      newItem,
                                    ]);
                                    setCustomDescription("");
                                    setCustomRate("");
                                    setCustomQty("1");
                                    toast.success(
                                      `Added ${newItem.name} (${finalRate < 0 ? `-₹${Math.abs(finalRate)}` : `₹${finalRate}`})!`,
                                    );
                                  }
                                }}
                                className="h-8.5 text-xs w-full border-[#E8EEF4] placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-450"
                              />
                              {customDescription && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomDescription("");
                                    setCustomRate("");
                                    setCustomQty("1");
                                  }}
                                  className="text-[10px] text-red-600 font-semibold hover:underline mt-1 block"
                                >
                                  Clear custom input
                                </button>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono text-xs">
                                  ₹
                                </span>
                                <Input
                                  placeholder="Rate"
                                  type="number"
                                  value={customRate}
                                  onChange={(e) =>
                                    setCustomRate(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (
                                        !customDescription.trim() ||
                                        !customRate
                                      )
                                        return toast.error(
                                          "Enter item description and rate",
                                        );
                                      const parsedRate =
                                        parseFloat(customRate) || 0;
                                      const isDescDiscount =
                                        customDescription
                                          .toLowerCase()
                                          .includes("discount") ||
                                        customDescription
                                          .toLowerCase()
                                          .includes("coupon") ||
                                        customDescription
                                          .toLowerCase()
                                          .includes("off");
                                      const finalRate =
                                        isDescDiscount && parsedRate > 0
                                          ? -parsedRate
                                          : parsedRate;
                                      const newItem = {
                                        id: `custom_${Date.now()}`,
                                        name: customDescription.trim(),
                                        rate: finalRate,
                                        qty: parseInt(customQty) || 1,
                                        category: isDescDiscount
                                          ? "discounts"
                                          : undefined,
                                        isCustom: true,
                                      };
                                      setBookingItems((prev) => [
                                        ...prev,
                                        newItem,
                                      ]);
                                      setCustomDescription("");
                                      setCustomRate("");
                                      setCustomQty("1");
                                      toast.success(
                                        `Added ${newItem.name} (${finalRate < 0 ? `-₹${Math.abs(finalRate)}` : `₹${finalRate}`})!`,
                                      );
                                    }
                                  }}
                                  className="h-8.5 text-xs w-24 font-mono border-[#E8EEF4] text-[#0B1528] focus-visible:ring-1 focus-visible:ring-slate-450"
                                />
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <Input
                                type="number"
                                value={customQty}
                                onChange={(e) => setCustomQty(e.target.value)}
                                className="h-8.5 text-xs w-16 font-mono border-[#E8EEF4] text-center focus-visible:ring-1 focus-visible:ring-slate-450"
                              />
                            </td>
                            <td className="px-5 py-4 text-right font-semibold font-mono text-[12px] text-[#0B1528]">
                              {(() => {
                                const parsedRate = parseFloat(customRate) || 0;
                                const isDescDiscount =
                                  customDescription
                                    .toLowerCase()
                                    .includes("discount") ||
                                  customDescription
                                    .toLowerCase()
                                    .includes("coupon") ||
                                  customDescription
                                    .toLowerCase()
                                    .includes("off");
                                const finalRate =
                                  isDescDiscount && parsedRate > 0
                                    ? -parsedRate
                                    : parsedRate;
                                const totalAmt =
                                  finalRate * (parseInt(customQty) || 1);
                                return (
                                  (totalAmt < 0 ? "- " : "") +
                                  "₹ " +
                                  Math.abs(totalAmt).toLocaleString("en-IN")
                                );
                              })()}
                            </td>
                            <td className="px-3 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!customDescription.trim() || !customRate)
                                    return toast.error(
                                      "Enter item description and rate",
                                    );
                                  const parsedRate =
                                    parseFloat(customRate) || 0;
                                  const isDescDiscount =
                                    customDescription
                                      .toLowerCase()
                                      .includes("discount") ||
                                    customDescription
                                      .toLowerCase()
                                      .includes("coupon") ||
                                    customDescription
                                      .toLowerCase()
                                      .includes("off");
                                  const finalRate =
                                    isDescDiscount && parsedRate > 0
                                      ? -parsedRate
                                      : parsedRate;
                                  const newItem = {
                                    id: `custom_${Date.now()}`,
                                    name: customDescription.trim(),
                                    rate: finalRate,
                                    qty: parseInt(customQty) || 1,
                                    category: isDescDiscount
                                      ? "discounts"
                                      : undefined,
                                    isCustom: true,
                                  };
                                  setBookingItems((prev) => [...prev, newItem]);
                                  setCustomDescription("");
                                  setCustomRate("");
                                  setCustomQty("1");
                                  toast.success(
                                    `Added ${newItem.name} (${finalRate < 0 ? `-₹${Math.abs(finalRate)}` : `₹${finalRate}`})!`,
                                  );
                                }}
                                className="px-2 py-1 bg-[#0B1528] hover:bg-[#182741] text-white rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                title="Add Item"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </td>
                          </tr>

                          {/* Live Breakdown in Edit Mode */}
                          <tr className="bg-slate-50/80 border-t border-[#E8EEF4]">
                            <td
                              colSpan={3}
                              className="px-5 py-2.5 text-right font-semibold text-slate-500 text-[10px]"
                            >
                              Gross Base Price
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-700">
                              ₹{" "}
                              {previewBasePrice.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td></td>
                          </tr>
                          <tr className="bg-slate-50/80">
                            <td
                              colSpan={3}
                              className="px-5 py-2.5 text-right font-semibold text-slate-500 text-[10px]"
                            >
                              GST ({Math.round(gstRate * 100)}%) Amount
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-700">
                              ₹{" "}
                              {previewGstAmount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td></td>
                          </tr>
                          {previewOtherDiscount > 0 && (
                            <tr className="bg-red-50/80 border-t border-red-200">
                              <td
                                colSpan={3}
                                className="px-5 py-2.5 text-right font-semibold text-red-700 text-[10px]"
                              >
                                Applied Special Discount / Coupon
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-semibold text-red-700">
                                -₹{" "}
                                {previewOtherDiscount.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td></td>
                            </tr>
                          )}
                          {previewGstDiscount > 0 && (
                            <tr className="bg-red-50/80">
                              <td
                                colSpan={3}
                                className="px-5 py-2.5 text-right font-semibold text-red-600 text-[10px]"
                              >
                                GST Discount
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-semibold text-red-600">
                                -₹{" "}
                                {previewGstDiscount.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td></td>
                            </tr>
                          )}
                          <tr className="bg-slate-900 text-white">
                            <td
                              colSpan={3}
                              className="px-5 py-3.5 text-right text-[11px] text-slate-300 font-semibold align-middle"
                            >
                              <div className="flex items-center justify-end gap-3.5">
                                <span>Final Total Preview</span>
                                <button
                                  type="button"
                                  onClick={handleUpdateTotal}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] rounded font-semibold transition-all"
                                >
                                  Update
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold font-mono text-base text-green-500 align-middle">
                              ₹{" "}
                              {previewFinalTotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Dropdowns to add Room Sharing Options */}
                    <div className="bg-[#f8fafc] border border-[#E8EEF4]/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 block">
                          Add Travel Options
                        </label>
                        <div className="flex gap-2">
                          <Select
                            value={selectedTravelOptionToAdd}
                            onValueChange={setSelectedTravelOptionToAdd}
                          >
                            <SelectTrigger className="h-9 text-xs flex-1 bg-white border-[#E8EEF4]">
                              <SelectValue placeholder="Select Travel Option" />
                            </SelectTrigger>
                            <SelectContent>
                              {fullTrip?.travelOptions?.map(
                                (opt: any, idx: number) => (
                                  <SelectItem
                                    key={idx}
                                    value={JSON.stringify(opt)}
                                    className="text-xs"
                                  >
                                    {opt.label} (+₹{opt.priceDelta || 0})
                                  </SelectItem>
                                ),
                              )}
                              {(!fullTrip?.travelOptions ||
                                fullTrip.travelOptions.length === 0) && (
                                <>
                                  <SelectItem
                                    value={JSON.stringify({
                                      label: "Non-AC Sleeper Train Option",
                                      priceDelta: 0,
                                    })}
                                    className="text-xs"
                                  >
                                    Non-AC Sleeper Train Option
                                  </SelectItem>
                                  <SelectItem
                                    value={JSON.stringify({
                                      label: "3-Tier AC Train Option",
                                      priceDelta: 3000,
                                    })}
                                    className="text-xs"
                                  >
                                    3-Tier AC Train Option
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedTravelOptionToAdd)
                                return toast.error(
                                  "Select a travel option first",
                                );
                              const opt = JSON.parse(selectedTravelOptionToAdd);
                              const existingIdx = bookingItems.findIndex(
                                (item) => item.name === opt.label,
                              );
                              if (existingIdx > -1) {
                                const updated = [...bookingItems];
                                updated[existingIdx].qty += 1;
                                setBookingItems(updated);
                              } else {
                                setBookingItems([
                                  ...bookingItems,
                                  {
                                    id: opt.label
                                      .replace(/\s+/g, "_")
                                      .toLowerCase(),
                                    name: opt.label,
                                    rate: fullTrip?.price
                                      ? fullTrip.price + (opt.priceDelta || 0)
                                      : 14999,
                                    qty: 1,
                                  },
                                ]);
                              }
                              toast.success(`${opt.label} added to items`);
                            }}
                            className="h-9 w-9 flex items-center justify-center bg-[#0B1528] hover:bg-[#182741] text-white rounded-lg text-sm font-semibold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 block">
                          Add Room Sharing Options
                        </label>
                        <div className="flex gap-2">
                          <Select
                            value={selectedRoomOptionToAdd}
                            onValueChange={setSelectedRoomOptionToAdd}
                          >
                            <SelectTrigger className="h-9 text-xs flex-1 bg-white border-[#E8EEF4]">
                              <SelectValue placeholder="Select Room Option" />
                            </SelectTrigger>
                            <SelectContent>
                              {fullTrip?.roomOptions?.map(
                                (opt: any, idx: number) => (
                                  <SelectItem
                                    key={idx}
                                    value={JSON.stringify(opt)}
                                    className="text-xs"
                                  >
                                    {opt.label} (+₹{opt.priceDelta || 0})
                                  </SelectItem>
                                ),
                              )}
                              {(!fullTrip?.roomOptions ||
                                fullTrip.roomOptions.length === 0) && (
                                <>
                                  <SelectItem
                                    value={JSON.stringify({
                                      label: "Triple Sharing Room",
                                      priceDelta: 0,
                                    })}
                                    className="text-xs"
                                  >
                                    Triple Sharing Room
                                  </SelectItem>
                                  <SelectItem
                                    value={JSON.stringify({
                                      label: "Couple Sharing Room",
                                      priceDelta: 2000,
                                    })}
                                    className="text-xs"
                                  >
                                    Couple Sharing Room
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedRoomOptionToAdd)
                                return toast.error(
                                  "Select a room option first",
                                );
                              const opt = JSON.parse(selectedRoomOptionToAdd);
                              const existingIdx = bookingItems.findIndex(
                                (item) => item.name === opt.label,
                              );
                              if (existingIdx > -1) {
                                const updated = [...bookingItems];
                                updated[existingIdx].qty += 1;
                                setBookingItems(updated);
                              } else {
                                setBookingItems([
                                  ...bookingItems,
                                  {
                                    id: opt.label
                                      .replace(/\s+/g, "_")
                                      .toLowerCase(),
                                    name: opt.label,
                                    rate: opt.priceDelta || 0,
                                    qty: 1,
                                  },
                                ]);
                              }
                              toast.success(`${opt.label} added to items`);
                            }}
                            className="h-9 w-9 flex items-center justify-center bg-[#0B1528] hover:bg-[#182741] text-white rounded-lg text-sm font-semibold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Save actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                      <Button
                        onClick={() => {
                          setIsEditingItems(false);
                          const meta = getSafeMeta(booking);
                          if (meta.bookingItems)
                            setBookingItems(meta.bookingItems);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:bg-slate-100 h-9 font-semibold px-4 text-xs rounded-lg transition-colors"
                      >
                        Discard Changes
                      </Button>
                      <Button
                        onClick={handleSaveBookingItems}
                        size="sm"
                        className="bg-[#C9A84C] hover:bg-[#b0913b] text-white h-9 font-semibold px-5 text-xs rounded-lg shadow-md transition-all duration-150"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ─── STATIC VIEW (DEFAULT: GROUP-WISE ACCOUNTING) ─── */
                  <div className="p-0 bg-white">
                    {(() => {
                      let activeItems = bookingItems.filter(
                        (item) => item.qty > 0 || item.rate < 0,
                      );
                      if (activeItems.length === 0) {
                        activeItems = generatePerPersonBookingItems(
                          booking,
                          passengers,
                          fullTrip,
                        ).filter((item) => item.qty > 0 || item.rate < 0);
                      }
                      if (activeItems.length === 0) {
                        return (
                          <div className="p-8 text-center space-y-3 bg-white">
                            <p className="text-slate-500 font-semibold text-xs">
                              No booking items recorded for this booking yet.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const generated = generatePerPersonBookingItems(
                                  booking,
                                  passengers,
                                  fullTrip,
                                );
                                setBookingItems(generated);
                                toast.success(
                                  "Generated per-person booking items!",
                                );
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Generate
                              Per-Person Line Items
                            </button>
                          </div>
                        );
                      }

                      // Aggregate per-person items into Group-wise rows
                      const groupMap = new Map<
                        string,
                        {
                          key: string;
                          name: string;
                          category?: string;
                          rate: number;
                          qty: number;
                        }
                      >();

                      activeItems.forEach((item: any) => {
                        const cleanName =
                          (item.name || "")
                            .replace(/\s*\[.*?\]$/, "")
                            .replace(/^Transport\s*-\s*/i, "")
                            .replace(/^Accommodation\s*-\s*Room\s*\d+:\s*/i, "")
                            .replace(/^Accommodation\s*-\s*/i, "")
                            .replace(/\([^)]*→.*?\)/g, (match: string) => {
                              const city =
                                booking.pickupCity ||
                                match
                                  .replace(/[()]/g, "")
                                  .split("→")[0]
                                  .trim() ||
                                "Ahmedabad";
                              return `(${city} to ${city})`;
                            })
                            .replace(/→Himachal/g, " to Ahmedabad")
                            .trim() || "Booking Option";

                        const key = `${cleanName}__${item.rate}`;

                        if (groupMap.has(key)) {
                          const existing = groupMap.get(key)!;
                          existing.qty += item.qty || 1;
                        } else {
                          groupMap.set(key, {
                            key,
                            name: cleanName,
                            category: item.category,
                            rate: item.rate || 0,
                            qty: item.qty || 1,
                          });
                        }
                      });

                      const groupRows = Array.from(groupMap.values());

                      const displayRows =
                        accountingViewMode === "per_person"
                          ? activeItems.map((item: any, idx: number) => ({
                              key: item.id || `item_${idx}`,
                              name: item.name,
                              category: item.category,
                              rate: item.rate || 0,
                              qty: item.qty || 1,
                            }))
                          : groupRows;

                      const baseItems = activeItems.filter(
                        (r) => r.rate >= 0 && r.category !== "discounts",
                      );
                      const discountItems = activeItems.filter(
                        (r) => r.rate < 0 || r.category === "discounts",
                      );

                      const gstDiscounts = discountItems.filter((r) =>
                        r.name.toLowerCase().includes("gst"),
                      );
                      const regularDiscounts = discountItems.filter(
                        (r) => !r.name.toLowerCase().includes("gst"),
                      );

                      const subtotal = baseItems.reduce(
                        (acc, r) => acc + r.rate * r.qty,
                        0,
                      );
                      const discountTotal = discountItems.reduce(
                        (acc, r) => acc + Math.abs(r.rate * r.qty),
                        0,
                      );

                      const gstAmount = Math.round(
                        subtotal * (gstRate || 0.05),
                      );
                      const grandTotal = Math.max(
                        0,
                        subtotal + gstAmount - discountTotal,
                      );

                      return (
                        <div className="border border-[#E8EEF4] rounded-xl overflow-hidden bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#E8EEF4] bg-slate-100/80 text-[10px] font-semibold text-slate-500">
                                <th className="px-5 py-3">
                                  {accountingViewMode === "per_person"
                                    ? "PASSENGER & DESCRIPTION"
                                    : "DESCRIPTION"}
                                </th>
                                <th className="px-5 py-3 text-right w-36">
                                  RATE
                                </th>
                                <th className="px-5 py-3 text-center w-24">
                                  QTY
                                </th>
                                <th className="px-5 py-3 text-right w-40">
                                  AMOUNT
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8EEF4] text-slate-700 font-medium">
                              {displayRows.map((row) => {
                                const isDiscount =
                                  row.rate < 0 || row.category === "discounts";
                                const absRate = Math.abs(row.rate);
                                const absAmt = Math.abs(row.rate * row.qty);

                                return (
                                  <tr
                                    key={row.key}
                                    className="hover:bg-[#F8FAFC] transition-colors"
                                  >
                                    <td className="px-5 py-3.5 font-semibold text-[#0B1528] text-xs">
                                      {row.name}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-mono text-slate-700">
                                      {(isDiscount ? "- " : "") +
                                        "₹ " +
                                        absRate.toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-700">
                                      {row.qty}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">
                                      {(isDiscount ? "- " : "") +
                                        "₹ " +
                                        absAmt.toLocaleString("en-IN")}
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Subtotal & GST Summary Rows */}
                              <tr className="bg-slate-50/60 border-t border-slate-100">
                                <td
                                  colSpan={3}
                                  className="px-5 py-2.5 text-right font-semibold text-slate-500 text-[10px]"
                                >
                                  Gross Base Price
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-700">
                                  ₹{" "}
                                  {Math.round(subtotal).toLocaleString("en-IN")}
                                </td>
                              </tr>
                              <tr className="bg-slate-50/60">
                                <td
                                  colSpan={3}
                                  className="px-5 py-2.5 text-right font-semibold text-slate-500 text-[10px]"
                                >
                                  GST ({Math.round((gstRate || 0.05) * 100)}%)
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-700">
                                  ₹ {gstAmount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                              {discountTotal > 0 && (
                                <tr className="bg-red-50/70 border-t border-red-100">
                                  <td
                                    colSpan={3}
                                    className="px-5 py-2.5 text-right font-semibold text-red-700 text-[10px]"
                                  >
                                    Applied Special Discount / Coupon
                                  </td>
                                  <td className="px-5 py-2.5 text-right font-mono font-semibold text-red-700">
                                    - ₹{" "}
                                    {Math.round(discountTotal).toLocaleString(
                                      "en-IN",
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-900 text-white">
                                <td
                                  colSpan={3}
                                  className="px-5 py-4 text-left font-semibold uppercase tracking-[0.1em] text-xs text-slate-300"
                                >
                                  GRAND TOTAL
                                </td>
                                <td className="px-5 py-4 text-right font-mono font-semibold text-xl text-green-500">
                                  ₹{" "}
                                  {(
                                    Number(booking.totalAmount) > 0
                                      ? Number(booking.totalAmount)
                                      : grandTotal
                                  ).toLocaleString("en-IN")}
                                </td>
                              </tr>
                              <tr className="bg-slate-800 text-white">
                                <td
                                  colSpan={3}
                                  className="px-5 py-3 text-left font-semibold uppercase tracking-[0.1em] text-[10px] text-slate-400"
                                >
                                  Cleared paid / Due
                                </td>
                                <td className="px-5 py-3 text-right font-mono font-semibold text-sm">
                                  <span className="text-emerald-400">
                                    ₹{clearedPaid.toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-slate-500 mx-2">/</span>
                                  <span
                                    className={
                                      financeDue > 0
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                    }
                                  >
                                    ₹{financeDue.toLocaleString("en-IN")}
                                  </span>
                                </td>
                              </tr>
                              {Number(booking.totalAmount) > 0 &&
                                Math.abs(grandTotal - Number(booking.totalAmount)) >
                                  1 && (
                                  <tr className="bg-amber-950/80 text-amber-100">
                                    <td
                                      colSpan={4}
                                      className="px-5 py-2 text-[10px] font-medium"
                                    >
                                      Line items compute ₹
                                      {grandTotal.toLocaleString("en-IN")} — booking
                                      total ₹
                                      {Number(booking.totalAmount).toLocaleString(
                                        "en-IN",
                                      )}{" "}
                                      is used for dues (save items to sync).
                                    </td>
                                  </tr>
                                )}
                            </tfoot>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === FILES TAB === */}
          {adminActiveTab === "files" && (
            <div className="bg-white border border-[#E8EEF4] rounded p-5 space-y-4">
              <h4 className="font-semibold text-[#0B1528] text-xs pb-2 border-b">
                Customer & Office Notes
              </h4>

              {/* Customer Booking Notes / Special Requests */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold text-slate-500 block">
                    Customer Booking Notes / Special Requests
                  </label>
                  {!editingNotes && (
                    <button
                      type="button"
                      onClick={() => setEditingNotes(true)}
                      className="text-[10px] font-semibold text-[#FF4D00] hover:underline"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      className="w-full min-h-[100px] text-xs p-3 bg-slate-50 border border-[#E8EEF4] rounded-lg focus:outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20"
                      placeholder="Add customer requests or booking notes..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingNotes(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-3 py-1.5 bg-[#FF4D00] hover:bg-[#E04400] text-white rounded text-xs font-semibold disabled:opacity-50"
                      >
                        {savingNotes ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-150 whitespace-pre-wrap">
                    {booking.notes ||
                      "No special requests or customer notes recorded."}
                  </p>
                )}
              </div>

              <div className="h-px bg-slate-100" />

              {/* Office Admin Notes */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Office Admin Notes
                </label>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-150 whitespace-pre-wrap">
                  {booking.adminNotes || "No office notes recorded."}
                </p>
              </div>
            </div>
          )}

          {/* === ATTACHMENTS TAB === */}
          {adminActiveTab === "attachments" && (
            <BookingAttachmentsTab
              bookingId={booking.id}
              booking={booking}
              userRole={(currentAdmin as any)?.role || "admin"}
            />
          )}

          {/* === EMAILS TAB === */}
          {adminActiveTab === "emails" && (
            <div className="bg-white border border-[#E8EEF4] rounded p-5 space-y-4">
              <EmailLogsTimeline contextType="booking" contextId={booking.id} />
            </div>
          )}

          {/* === ACTIVITY TAB === */}
          {adminActiveTab === "activity" && (
            <div className="space-y-3 min-w-0">
              {/* Booking Activity Log / Audit Trail */}
              <div className="bg-white border border-[#E8EEF4] rounded p-5 space-y-4">
                <h4 className="font-semibold text-[#0B1528] text-xs flex items-center gap-1.5 pb-2 border-b">
                  <History className="w-4 h-4 text-slate-450" /> Booking
                  Activity Logs
                </h4>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {loadingActivityLogs ? (
                    <p className="text-[10px] text-slate-450 italic">
                      Loading activity logs...
                    </p>
                  ) : activityLogs.length === 0 ? (
                    <p className="text-[10px] text-slate-450 italic">
                      No activity logs recorded.
                    </p>
                  ) : (
                    <div className="relative border-l border-[#E8EEF4] ml-2.5 pl-4 space-y-4">
                      {activityLogs.map((log: any) => {
                        const actionColors: Record<string, string> = {
                          CREATE: "bg-green-600",
                          STATUS_CHANGE: "bg-blue-500",
                          TRAIN_TICKET: "bg-slate-500",
                          PAYMENT_SUBMITTED: "bg-amber-500",
                          PAYMENT_APPROVED: "bg-green-600",
                          PAYMENT_REJECTED: "bg-red-500",
                          TASK_ASSIGNED: "bg-[#FF4D00]",
                          TASK_UPDATED: "bg-sky-500",
                          DETAILS_UPDATE: "bg-slate-500",
                        };
                        const color =
                          actionColors[log.action] || "bg-slate-400";
                        return (
                          <div
                            key={log.id}
                            className="relative text-[11px] space-y-1"
                          >
                            {/* Timeline dot */}
                            <span
                              className={cn(
                                "absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white",
                                color,
                              )}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-1 text-[9px]">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-semibold text-white uppercase",
                                  color,
                                )}
                              >
                                {log.action}
                              </span>
                              <span className="text-slate-400 font-medium">
                                {safeFormatDateTime(log.createdAt, {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>

                            <p className="text-slate-700 font-medium leading-relaxed">
                              {log.details}
                            </p>

                            {log.performedBy && (
                              <p className="text-[9px] text-slate-450 font-semibold uppercase">
                                By {log.performedBy.name} (
                                {log.performedBy.role})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === SERVICES TAB === */}
          {adminActiveTab === "services" && (
            <div className="space-y-3 min-w-0">
              <div className="bg-white border border-[#E8EEF4] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#FF4D00]" /> Auxiliary Services Registry
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contracted auxiliary services (Train, Flight, Visa, Hotel, Insurance, Transport, Other) for this booking
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddServiceModal(true)}
                    className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Auxiliary Service
                  </Button>
                </div>

                {loadingFinanceData ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
                    <span className="text-xs font-semibold">Loading auxiliary services...</span>
                  </div>
                ) : bookingServices.length === 0 ? (
                  <div className="py-10 text-center space-y-3 bg-slate-50/60 rounded-lg border border-dashed border-[#E8EEF4]">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No auxiliary services recorded for this booking.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddServiceModal(true)}
                      className="text-xs font-semibold border-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add First Service
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookingServices.map((srv) => {
                      const margin = (srv.sellingPrice || 0) - (srv.costPrice || 0);
                      const isVerified = srv.status === "VERIFIED" || srv.verifiedAt;
                      return (
                        <div
                          key={srv.id}
                          className="border border-[#E8EEF4] rounded-lg p-4 bg-white hover:border-slate-300 transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-[#E8EEF4]">
                              {srv.serviceType}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1",
                                isVerified
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200",
                              )}
                            >
                              {isVerified ? (
                                <>
                                  <ShieldCheck className="w-3 h-3 text-green-600" /> Verified
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
                                </>
                              )}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-[#0B1528]">{srv.vendorName}</h4>
                            {srv.remarks && (
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{srv.remarks}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded border border-slate-150 text-[11px]">
                            <div>
                              <span className="text-[9px] font-semibold uppercase text-slate-400 block">Cost</span>
                              <span className="font-mono font-semibold text-slate-700">₹{(srv.costPrice || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-semibold uppercase text-slate-400 block">Selling</span>
                              <span className="font-mono font-semibold text-[#0B1528]">₹{(srv.sellingPrice || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-semibold uppercase text-slate-400 block">Margin</span>
                              <span className={cn("font-mono font-semibold", margin >= 0 ? "text-green-600" : "text-red-600")}>
                                ₹{margin.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                            <span>
                              Added on {safeFormatDateTime(srv.createdAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!isVerified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerifyService(srv.id)}
                                className="h-6 text-[10px] font-semibold text-green-700 hover:bg-green-50 border-green-300"
                              >
                                <Check className="w-3 h-3 mr-1" /> Mark Verified
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === REFUNDS & CREDITS TAB === */}
          {adminActiveTab === "refunds" && (
            <div className="space-y-3 min-w-0">
              <div className="bg-white border border-[#E8EEF4] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#FF4D00]" /> Refunds & Store Credits
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customer refund requests, manual bank UTR confirmations, and reusable credit notes
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowBookingRefundModal(true)}
                    className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Request Refund
                  </Button>
                </div>

                {/* Refund & Credits KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-[#E8EEF4] rounded-lg p-3">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Total Refunded</span>
                    <div className="text-base font-semibold text-[#0B1528] font-mono mt-0.5">
                      ₹{bookingRefunds
                        .filter((r) => r.status === "APPROVED")
                        .reduce((acc, r) => acc + (r.totalAmount || 0), 0)
                        .toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="bg-green-50/50 border border-green-200 rounded-lg p-3">
                    <span className="text-[10px] font-semibold uppercase text-green-700">Active Credit Note</span>
                    <div className="text-base font-semibold text-green-700 font-mono mt-0.5">
                      ₹{bookingRefunds
                        .filter((r) => r.creditNoteStatus === "ACTIVE")
                        .reduce((acc, r) => acc + (r.creditAmount || 0), 0)
                        .toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                    <span className="text-[10px] font-semibold uppercase text-amber-700">Pending Approvals</span>
                    <div className="text-base font-semibold text-amber-700 font-mono mt-0.5">
                      {bookingRefunds.filter((r) => r.status === "PENDING_APPROVAL").length}
                    </div>
                  </div>
                </div>

                {loadingFinanceData ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
                    <span className="text-xs font-semibold">Loading refunds history...</span>
                  </div>
                ) : bookingRefunds.length === 0 ? (
                  <div className="py-10 text-center space-y-3 bg-slate-50/60 rounded-lg border border-dashed border-[#E8EEF4]">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No refunds or credit notes requested for this booking.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookingRefunds.map((ref) => (
                      <div
                        key={ref.id}
                        className="border border-[#E8EEF4] rounded-lg p-4 bg-white hover:border-slate-300 transition-all space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono bg-slate-100 text-slate-700 border border-[#E8EEF4]">
                              {ref.refundNumber}
                            </span>
                            <span className="text-xs font-semibold text-[#0B1528]">
                              Mode: <span className="text-[#FF4D00]">{ref.refundMode}</span>
                            </span>
                          </div>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                              ref.status === "APPROVED"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : ref.status === "REJECTED"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200",
                            )}
                          >
                            {ref.status === "PENDING_APPROVAL" ? "Pending Controller Review" : ref.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/60 p-2.5 rounded border border-slate-150 text-[11px]">
                          <div>
                            <span className="text-[9px] font-semibold uppercase text-slate-400 block">Total Refund</span>
                            <span className="font-mono font-semibold text-slate-900">₹{(ref.totalAmount || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold uppercase text-slate-400 block">Cash/Bank</span>
                            <span className="font-mono font-semibold text-slate-700">₹{(ref.cashAmount || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold uppercase text-slate-400 block">Credit Note</span>
                            <span className="font-mono font-semibold text-green-700">₹{(ref.creditAmount || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold uppercase text-slate-400 block">Bank Reference</span>
                            <span className="font-mono font-semibold text-slate-700 truncate block">{ref.bankReference || "N/A"}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          <span className="font-semibold text-slate-700">Reason:</span> {ref.reason}
                        </p>

                        {ref.rejectionReason && (
                          <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                            <span className="font-semibold">Rejection Note:</span> {ref.rejectionReason}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>
                            Created {safeFormatDateTime(ref.createdAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {ref.approvedAt && (
                            <span className="text-green-700 font-semibold">
                              Approved {safeFormatDateTime(ref.approvedAt, { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === FINANCE AUDIT TRAIL TAB === */}
          {adminActiveTab === "finance_audit" && (
            <div className="space-y-3 min-w-0">
              <div className="bg-white border border-[#E8EEF4] rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#FF4D00]" /> Immutable Financial Audit Trail
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Read-only audit history of every financial modification, verification, and approval on this booking
                  </p>
                </div>

                {loadingFinanceData ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
                    <span className="text-xs font-semibold">Loading audit trail...</span>
                  </div>
                ) : bookingAuditLogs.length === 0 ? (
                  <div className="py-10 text-center space-y-3 bg-slate-50/60 rounded-lg border border-dashed border-[#E8EEF4]">
                    <History className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No financial audit records logged for this booking yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {bookingAuditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="border border-[#E8EEF4] rounded-lg p-3.5 bg-white text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded font-semibold uppercase",
                                log.action === "APPROVE"
                                  ? "bg-green-100 text-green-700"
                                  : log.action === "REJECT"
                                    ? "bg-red-100 text-red-700"
                                    : log.action === "CREATE"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-[#0B1528]",
                              )}
                            >
                              {log.action}
                            </span>
                            <span className="font-semibold text-slate-700">{log.entityType}</span>
                          </div>
                          <span className="text-slate-400">
                            {safeFormatDateTime(log.createdAt, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>

                        {log.details && (
                          <p className="text-slate-700 font-medium leading-relaxed">{log.details}</p>
                        )}

                        <div className="text-[10px] text-slate-400 font-semibold">
                          Actor: <span className="text-slate-700 font-semibold">{log.performedBy?.name || "System"}</span> (
                          {log.performedBy?.role || "SYSTEM"})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column Sidebar — full width above main on mobile/tablet, rail on lg+ */}
        <aside className="order-2 min-w-0 w-full max-w-full shrink-0 space-y-3 font-sans lg:order-none lg:w-[min(100%,320px)] xl:w-[min(100%,340px)]">
          {/* Customer Main Info Card */}
          <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden p-4 sm:p-5 space-y-4 text-xs sm:text-[13px] min-w-0">
            {isEditingCustomer ? (
              <div className="space-y-3 min-w-0">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Guest name
                  </label>
                  <Input
                    value={editedCustomerName}
                    onChange={(e) => setEditedCustomerName(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Phone
                  </label>
                  <Input
                    value={editedCustomerPhone}
                    onChange={(e) => setEditedCustomerPhone(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Email
                  </label>
                  <Input
                    value={editedCustomerEmail}
                    onChange={(e) => setEditedCustomerEmail(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold border-[#E8EEF4]"
                    onClick={() => setIsEditingCustomer(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold bg-[#FF4D00] hover:bg-[#E04400] text-white"
                    onClick={async () => {
                      try {
                        const updatedPassengers = passengers.map((p) => {
                          if (
                            p.id === "main" ||
                            p.name === booking.fullName ||
                            p.name === booking.name
                          ) {
                            return {
                              ...p,
                              name: editedCustomerName,
                              phone: editedCustomerPhone,
                              email: editedCustomerEmail,
                            };
                          }
                          return p;
                        });
                        await bookingsService.update(booking.id, {
                          fullName: editedCustomerName,
                          mobile: editedCustomerPhone,
                          email: editedCustomerEmail,
                          passengers: updatedPassengers,
                        });
                        toast.success("Guest details updated successfully!");
                        setIsEditingCustomer(false);
                        onRefresh();
                      } catch {
                        toast.error("Failed to update guest details");
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-2.5 relative group min-w-0">
                {/* Navy identity band — anchors the rail and breaks the white card wall */}
                <div className="-mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-3 px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-r from-[#0B1528] via-[#132038] to-[#1E3055] flex items-start gap-3 min-w-0">
                  <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[#FF4D00] text-white text-[11px] font-semibold inline-flex items-center justify-center shrink-0 ring-2 ring-white/15">
                    {(booking.fullName || booking.name || "?")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm sm:text-[15px] font-semibold text-white leading-snug line-clamp-2 break-words">
                      {booking.fullName || booking.name}
                    </h2>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-white/50 mt-0.5">
                      Guest profile
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditedCustomerName(
                        booking.fullName || booking.name || "",
                      );
                      setEditedCustomerPhone(
                        booking.mobile || booking.phone || "",
                      );
                      setEditedCustomerEmail(booking.email || "");
                      setIsEditingCustomer(true);
                    }}
                    className="shrink-0 text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors border border-white/15 cursor-pointer min-h-9 min-w-9 inline-flex items-center justify-center touch-manipulation"
                    title="Edit customer info"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5 min-w-0 text-slate-600 font-mono text-[11px] sm:text-xs">
                  <span className="h-6 w-6 rounded-md bg-green-50 border border-green-100 text-green-600 inline-flex items-center justify-center shrink-0">
                    <Phone className="w-3 h-3" />
                  </span>
                  <span className="min-w-0 truncate" title={booking.mobile || booking.phone || undefined}>
                    {booking.mobile || booking.phone || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0 text-slate-600 text-[11px] sm:text-xs">
                  <span className="h-6 w-6 rounded-md bg-sky-50 border border-sky-100 text-sky-600 inline-flex items-center justify-center shrink-0">
                    <Mail className="w-3 h-3" />
                  </span>
                  <span
                    className="min-w-0 truncate"
                    title={booking.email || undefined}
                  >
                    {booking.email || "—"}
                  </span>
                </div>
                <button
                  onClick={handleViewCustomerTimeline}
                  className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-1 text-[11px] sm:text-xs font-semibold text-[#FF4D00] hover:text-[#E04400] bg-[#FF4D00]/[0.07] hover:bg-[#FF4D00]/[0.12] border border-[#FF4D00]/20 rounded-lg px-3 py-2 min-h-10 transition-colors cursor-pointer touch-manipulation"
                >
                  View lifetime journey →
                </button>
              </div>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-2 border-t border-[#E8EEF4] pt-4 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-1">
              <div className="rounded-lg bg-[#F6F9FD] border border-[#E8EEF4] px-3 py-2.5 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Lead source
                </div>
                <div className="font-semibold text-[#0B1528] mt-0.5 break-words min-w-0">
                  {booking.leadSource || booking.source || "Website Booking"}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50/50 border border-slate-100 px-3 py-2.5 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500/80">
                  Booking executive
                </div>
                <div className="font-semibold text-[#0B1528] mt-0.5 break-words min-w-0">
                  {resolveBookingExecutiveName(booking)}
                </div>
              </div>
              <div className="rounded-lg bg-green-50/50 border border-green-100 px-3 py-2.5 min-w-0 md:col-span-2 lg:col-span-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-green-600/80">
                  Pickup city
                </div>
                <div className="font-semibold text-[#0B1528] mt-0.5 break-words min-w-0">
                  {booking.pickupCity || "Direct Join / N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Internal Note — only rendered when a note actually exists */}
          {(booking.adminNotes ||
            booking.notes ||
            (booking as any).sourceBookingLink?.internalNote) && (
            <div className="bg-gradient-to-br from-amber-50/70 to-white border border-amber-200/70 rounded-xl p-4 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Internal note
              </div>
              <div className="text-slate-600 leading-relaxed">
                {booking.adminNotes ||
                  booking.notes ||
                  (booking as any).sourceBookingLink?.internalNote}
              </div>
            </div>
          )}

          {/* Quick actions — contextual only, so the rail stays quiet */}
          {(() => {
            const quickActions = [
              (booking.status === "confirmed" || flowStatus === "Confirmed") && {
                key: "confirmation",
                label: "Resend confirmation",
                icon: Send,
                chip: "bg-green-50 border-green-100 text-green-600",
                hover: "hover:bg-green-50/50",
                onClick: () => handleSendEmail("confirmation"),
              },
              (booking.remainingAmount || 0) > 0 && {
                key: "reminder",
                label: "Send payment reminder",
                icon: Clock,
                chip: "bg-amber-50 border-amber-100 text-amber-600",
                hover: "hover:bg-amber-50/50",
                onClick: () => handleSendEmail("reminder"),
              },
              (booking.remainingAmount || 0) > 0 && {
                key: "paylink",
                label: "Copy payment link",
                icon: CreditCard,
                chip: "bg-sky-50 border-sky-100 text-sky-600",
                hover: "hover:bg-sky-50/50",
                onClick: () => {
                  navigator.clipboard.writeText(
                    `https://onlineyouthcamping.net/pay/${booking.bookingId}`,
                  );
                  toast.success("Payment link copied to clipboard");
                },
              },
              (booking.totalAmount || 0) > 0 && {
                key: "invoice",
                label: "Email invoice",
                icon: FileText,
                chip: "bg-violet-50 border-violet-100 text-violet-600",
                hover: "hover:bg-violet-50/50",
                onClick: () => handleSendEmail("invoice"),
              },
            ].filter(Boolean) as {
              key: string;
              label: string;
              icon: typeof Send;
              chip: string;
              hover: string;
              onClick: () => void;
            }[];

            if (quickActions.length === 0) return null;

            return (
              <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden text-xs">
                <div className="px-4 py-3 border-b border-[#E8EEF4] bg-gradient-to-r from-[#0B1528]/[0.04] to-transparent text-[11px] font-semibold uppercase tracking-wide text-[#0B1528]/60">
                  Quick actions
                </div>
                <div className="divide-y divide-[#E8EEF4]">
                  {quickActions.map(
                    ({ key, label, icon: Icon, chip, hover, onClick }) => (
                      <button
                        key={key}
                        onClick={onClick}
                        className={cn(
                          "w-full px-4 py-2.5 flex items-center gap-2.5 text-left font-semibold text-[#0B1528] transition-colors cursor-pointer",
                          hover,
                        )}
                      >
                        <span
                          className={cn(
                            "h-6 w-6 rounded-lg border inline-flex items-center justify-center shrink-0",
                            chip,
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                      </button>
                    ),
                  )}
                </div>
              </div>
            );
          })()}
        </aside>
      </div>
      </div>

      {/* Dialogs & Overlays */}
      {/* ─── Add/Edit Passenger Dialog Overlay ─── */}
      <Dialog
        open={showAddPassenger}
        onOpenChange={(o) => {
          setShowAddPassenger(o);
          if (!o) setEditingPassenger(null);
        }}
      >
        <DialogContent
          hideClose
          className="sm:max-w-[480px] p-0 border border-[#E8EEF4] rounded-lg overflow-hidden shadow-premium bg-white"
        >
          <div className="bg-slate-900 px-4 py-3 text-white flex justify-between items-center">
            <DialogTitle className="text-xs font-semibold text-white">
              {editingPassenger
                ? "Edit Passenger Details"
                : "Please enter details for new passenger"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Passenger registration form
            </DialogDescription>
            <button
              onClick={() => {
                setShowAddPassenger(false);
                setEditingPassenger(null);
              }}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5 text-xs text-slate-700">
            {combinedTravelOptions && combinedTravelOptions.length > 0 ? (
              <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-[#E8EEF4]">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Passenger Option (Package)
                </label>
                <Select
                  value={newPassenger.trainOption || booking.trainClass || booking.pickupCity || ""}
                  onValueChange={(v) =>
                    setNewPassenger({ ...newPassenger, trainOption: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded bg-white">
                    <SelectValue placeholder="Select Option" />
                  </SelectTrigger>
                  <SelectContent>
                    {combinedTravelOptions.map((opt: any, idx: number) => (
                      <SelectItem key={idx} value={opt.name} className="text-xs">
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-[#E8EEF4]">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Passenger Option (Package)
                </label>
                <Input
                  value={newPassenger.trainOption !== undefined && newPassenger.trainOption !== "" ? newPassenger.trainOption : (booking.pickupCity || booking.trainClass || "")}
                  onChange={(e) =>
                    setNewPassenger({ ...newPassenger, trainOption: e.target.value })
                  }
                  placeholder="e.g. Base Package / Ahmedabad (3AC)"
                  className="h-8 text-xs rounded bg-white shadow-xs focus-visible:ring-slate-300"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Salutation
                </label>
                <Select
                  value={newPassenger.salutation}
                  onValueChange={(v) =>
                    setNewPassenger({ ...newPassenger, salutation: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr." className="text-xs">
                      Mr.
                    </SelectItem>
                    <SelectItem value="Mrs." className="text-xs">
                      Mrs.
                    </SelectItem>
                    <SelectItem value="Ms." className="text-xs">
                      Ms.
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  First Name *
                </label>
                <Input
                  value={newPassenger.firstName}
                  onChange={(e) =>
                    setNewPassenger({
                      ...newPassenger,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="First Name"
                  className="h-8 text-xs rounded"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Last Name
                </label>
                <Input
                  value={newPassenger.lastName}
                  onChange={(e) =>
                    setNewPassenger({
                      ...newPassenger,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Last Name"
                  className="h-8 text-xs rounded"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Gender
                </label>
                <Select
                  value={newPassenger.gender}
                  onValueChange={(v) =>
                    setNewPassenger({ ...newPassenger, gender: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male" className="text-xs">
                      Male
                    </SelectItem>
                    <SelectItem value="Female" className="text-xs">
                      Female
                    </SelectItem>
                    <SelectItem value="Other" className="text-xs">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Age
                </label>
                <Input
                  type="number"
                  value={newPassenger.age}
                  onChange={(e) =>
                    setNewPassenger({ ...newPassenger, age: e.target.value })
                  }
                  placeholder="Years"
                  className="h-8 text-xs rounded"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Phone number
                </label>
                <Input
                  value={newPassenger.phone}
                  onChange={(e) =>
                    setNewPassenger({ ...newPassenger, phone: e.target.value })
                  }
                  placeholder="Phone number"
                  className="h-8 text-xs rounded font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  E-mail
                </label>
                <Input
                  value={newPassenger.email}
                  onChange={(e) =>
                    setNewPassenger({ ...newPassenger, email: e.target.value })
                  }
                  placeholder="Email address"
                  className="h-8 text-xs rounded font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Food Preference
                </label>
                <Select
                  value={newPassenger.foodPreference}
                  onValueChange={(v) =>
                    setNewPassenger({ ...newPassenger, foodPreference: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal Food" className="text-xs">
                      Normal Food
                    </SelectItem>
                    <SelectItem value="Jain Food" className="text-xs">
                      Jain Food
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-400">
                  Room Sharing
                </label>
                <Select
                  value={newPassenger.roomSharing}
                  onValueChange={(v) =>
                    setNewPassenger({ ...newPassenger, roomSharing: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Double" className="text-xs">
                      Double Sharing
                    </SelectItem>
                    <SelectItem value="Triple" className="text-xs">
                      Triple Sharing
                    </SelectItem>
                    <SelectItem value="Quad" className="text-xs">
                      Quad Sharing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 leading-tight">
              Enter name according to Government ID. Train/Expedition
              registration tickets will be processed on this identity.
            </p>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowAddPassenger(false);
                  setEditingPassenger(null);
                }}
                className="bg-white border border-[#E8EEF4] text-slate-650 hover:bg-slate-50 font-semibold uppercase text-[9px] px-3.5 h-8 rounded"
              >
                Close
              </button>
              {!editingPassenger && (
                <button
                  onClick={() => handleSavePassenger(true)}
                  className="bg-[#31b0d5] hover:bg-[#269abc] text-white font-semibold uppercase text-[9px] px-4 h-8 rounded"
                >
                  Save & add another
                </button>
              )}
              <button
                onClick={() => handleSavePassenger(false)}
                className="bg-[#5cb85c] hover:bg-[#449d44] text-white font-semibold uppercase text-[9px] px-4 h-8 rounded"
              >
                {editingPassenger ? "Update details" : "Save"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Departure Dates Modal Dialog */}
      <Dialog open={showChangeDates} onOpenChange={setShowChangeDates}>
        <DialogContent
          hideClose
          className="sm:max-w-[400px] p-0 border border-[#E8EEF4] rounded-lg overflow-hidden shadow-premium bg-white"
        >
          <div className="bg-slate-900 px-4 py-3 text-white flex justify-between items-center">
            <DialogTitle className="text-xs font-semibold text-white">
              Change departure date
            </DialogTitle>
            <DialogDescription className="sr-only">
              Departure date scheduler
            </DialogDescription>
            <button
              onClick={() => setShowChangeDates(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4 text-xs text-slate-700">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase text-slate-450">
                Departure Date
              </label>
              <Input
                type="date"
                value={newDepartureDate}
                onChange={(e) => setNewDepartureDate(e.target.value)}
                className="h-8 text-xs rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase text-slate-450">
                Reason for Change
              </label>
              <Input
                type="text"
                placeholder="e.g., Customer requested rescheduling"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="h-8 text-xs rounded"
              />
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowChangeDates(false)}
                className="bg-white border border-[#E8EEF4] text-slate-650 hover:bg-slate-50 font-semibold uppercase text-[9px] px-3.5 h-8 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDates}
                className="bg-[#5cb85c] hover:bg-[#449d44] text-white font-semibold uppercase text-[9px] px-4 h-8 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create a Payment Dialog (VacationLabs Style) */}
      <Dialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
        <DialogContent
          hideClose
          className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 border border-[#E8EEF4] rounded-lg shadow-premium bg-white"
        >
          <div className="bg-slate-900 px-4 py-3 text-white flex justify-between items-center sticky top-0 z-10">
            <DialogTitle className="text-xs font-semibold text-white">
              Create a payment
            </DialogTitle>
            <DialogDescription className="sr-only">
              Payment transaction logging form
            </DialogDescription>
            <button
              onClick={() => setShowCreatePayment(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs text-slate-700">
            {/* Payment Source Radios */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase text-slate-400">
                Payment Source
              </label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="paySource"
                    checked={paymentSource === "collected"}
                    onChange={() => setPaymentSource("collected")}
                    className="text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Collected by Us</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="paySource"
                    checked={paymentSource === "venue"}
                    onChange={() => setPaymentSource("venue")}
                    className="text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>To be Collected at Venue</span>
                </label>
              </div>
            </div>

            {/* Form parameters depending on Payment Source selection */}
            {paymentSource === "collected" && (
              <div className="space-y-3 pt-2 border-t border-slate-100 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-550">
                      Amount
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-[10px]">
                          INR
                        </span>
                        <Input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="pl-9 h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="w-28">
                        <Select value={payMode} onValueChange={handlePayModeChange}>
                          <SelectTrigger className="h-8 text-xs font-semibold">
                            <SelectValue placeholder="Mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank Transfer">
                              Bank Transfer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-semibold uppercase text-slate-550">
                        Collection Account
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddAccountModal(true)}
                        className="text-[9px] font-semibold text-[#FF4D00] hover:text-[#C2410C] flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Account
                      </button>
                    </div>
                    <Select
                      value={payCollectionAccountId}
                      onValueChange={setPayCollectionAccountId}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold border-[#E8EEF4]">
                        <SelectValue placeholder="Select Collection Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCollectionAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.accountType === "CASH"
                              ? `${acc.accountName} (YouthCamping Cash Desk)`
                              : `${acc.accountName} ${acc.upiId ? `(${acc.upiId})` : `(${acc.accountType})`}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-550">
                      Payment Date
                    </label>
                    <Input
                      type="date"
                      value={payPaymentDate}
                      onChange={(e) => setPayPaymentDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-550">
                      Transaction ID / UTR
                      {(payMode === "UPI" || payMode === "Bank Transfer") && (
                        <span className="text-red-500 normal-case font-medium">
                          {" "}
                          (or proof)
                        </span>
                      )}
                    </label>
                    <Input
                      value={payTransactionId}
                      onChange={(e) => setPayTransactionId(e.target.value)}
                      placeholder="e.g. UTR928102910"
                      className="h-8 text-xs rounded"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-550">
                    Payment Screenshot / Receipt Proof
                    {(payMode === "UPI" || payMode === "Bank Transfer") &&
                      !payTransactionId.trim() && (
                        <span className="text-red-500 normal-case font-medium">
                          {" "}
                          *
                        </span>
                      )}
                  </label>
                  <ImageUpload
                    label="Upload Payment Screenshots"
                    value={payProofUrls}
                    onChange={setPayProofUrls}
                    multiple
                    maxFiles={8}
                    accept="image/*,.pdf,application/pdf"
                    compact
                  />
                  <p className="text-[10px] text-slate-400">
                    Multiple images/PDFs supported. UPI / Bank Transfer need a
                    UTR or proof. Cash can skip.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-550">
                    Comments / Remarks
                  </label>
                  <Input
                    value={payComments}
                    onChange={(e) => setPayComments(e.target.value)}
                    placeholder="e.g. payer name if different, YAC note…"
                    className="h-8 text-xs rounded"
                  />
                </div>
              </div>
            )}

            {paymentSource === "venue" && (
              <div className="p-3 bg-amber-50 border border-amber-150 rounded text-[#b38515] animate-fade-in">
                <p className="font-semibold mb-0.5">
                  Venue Collection Directive:
                </p>
                <p>
                  Saving this will mark the remaining balance amount{" "}
                  <strong>
                    ₹ {(booking.remainingAmount || 0).toLocaleString("en-IN")}
                  </strong>{" "}
                  to be collected directly from the customer at the trip venue.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCreatePayment(false)}
                disabled={savingPayment}
                className="bg-white border border-[#E8EEF4] text-slate-650 hover:bg-slate-50 font-semibold uppercase text-[9px] px-3.5 h-8 rounded disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePaymentSave}
                disabled={savingPayment}
                className="bg-[#5cb85c] hover:bg-[#449d44] text-white font-semibold uppercase text-[9px] px-4 h-8 rounded"
              >
                {savingPayment ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Collection Account Modal */}
      <Dialog open={showAddAccountModal} onOpenChange={setShowAddAccountModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#FF4D00]" /> Add Collection Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new financial receiving account (Company, Individual, Bank, UPI, or Cash).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-500">
                Account Name <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. Nikulbhai Patel Account or YouthCamping HDFC"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Account Type
                </label>
                <Select value={newAccType} onValueChange={setNewAccType}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">Company Account</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual Account</SelectItem>
                    <SelectItem value="BANK">Bank Account</SelectItem>
                    <SelectItem value="UPI">UPI Account</SelectItem>
                    <SelectItem value="CASH">YouthCamping Cash Desk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Account Holder Name
                </label>
                <Input
                  placeholder="e.g. Nikulbhai Patel"
                  value={newAccHolder}
                  onChange={(e) => setNewAccHolder(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  UPI ID (Optional)
                </label>
                <Input
                  placeholder="e.g. nikulbhai@upi"
                  value={newAccUpi}
                  onChange={(e) => setNewAccUpi(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Bank Name (Optional)
                </label>
                <Input
                  placeholder="e.g. State Bank of India"
                  value={newAccBank}
                  onChange={(e) => setNewAccBank(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Account Number (Optional)
                </label>
                <Input
                  placeholder="e.g. 50200084920192"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  IFSC Code (Optional)
                </label>
                <Input
                  placeholder="e.g. SBIN0004821"
                  value={newAccIfsc}
                  onChange={(e) => setNewAccIfsc(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-medium font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAccountModal(false)}
                disabled={savingNewAccount}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleQuickCreateAccount}
                disabled={savingNewAccount || !newAccName.trim()}
                className="h-8 text-xs bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold"
              >
                {savingNewAccount ? "Creating..." : "Create & Select"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification & Tickets Side Panel */}
      <VerificationDetailsPanel
        bookingId={booking.bookingId}
        booking={booking}
        open={showVerificationPanel}
        onClose={() => setShowVerificationPanel(false)}
        onRefresh={() => {
          onRefresh();
          fetchActivityLogs();
        }}
      />
      <EmailComposerDrawer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        contextType="booking"
        contextId={booking.id}
        recipientEmail={booking.email || ""}
        recipientName={booking.fullName || booking.name || ""}
        onSent={onRefresh}
      />
      {/* DIALOG: CUSTOMER LIFETIME JOURNEY */}
      <Dialog
        open={customerTimelineOpen}
        onOpenChange={setCustomerTimelineOpen}
      >
        <DialogContent className="sm:max-w-[450px] rounded-[4px] border border-[#E2E8F0] p-5 bg-white max-h-[80vh] overflow-y-auto shadow-xl">
          <DialogHeader className="border-b border-[#E2E8F0] pb-3">
            <DialogTitle className="font-semibold uppercase tracking-tight text-xs flex items-center gap-2 text-slate-850">
              👤 Customer Lifetime Journey
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative border-l border-[#E8EEF4] ml-2.5 pl-4 space-y-4 text-xs font-semibold text-slate-705">
              {customerTimeline.length > 0 ? (
                customerTimeline.map((item, idx) => {
                  const colors: Record<string, string> = {
                    Sales: "bg-[#FF4D00]",
                    Finance: "bg-green-500",
                    Operations: "bg-blue-500",
                    Marketing: "bg-slate-500",
                  };
                  const color = colors[item.type] || "bg-slate-400";
                  return (
                    <div key={idx} className="relative space-y-1">
                      <span
                        className={cn(
                          "absolute -left-[21.5px] top-1 w-2 h-2 rounded-full ring-4 ring-white",
                          color,
                        )}
                      />
                      <div className="flex items-center justify-between gap-2 text-[9px] text-slate-400 font-semibold">
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded text-[7px] text-white",
                            color,
                          )}
                        >
                          {item.type}
                        </span>
                        <span>{item.date}</span>
                      </div>
                      <p className="text-[#0B1528] text-xs font-semibold leading-normal">
                        {item.action}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 italic">
                  No timeline entries found.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="pt-2 border-t">
            <Button
              onClick={() => setCustomerTimelineOpen(false)}
              className="rounded-[4px] font-semibold text-xs h-8.5 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-none shadow-none"
            >
              Close Profile Journey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ASSIGN TASK TO COLLEAGUE */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-xl shadow-lg border border-[#E8EEF4]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF4D00]" /> Assign Task to
              Colleague
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-400">
              Assign an operational or administrative task for this booking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase text-slate-500">
                Task Title *
              </label>
              <Input
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Call client for remaining payment"
                className="h-9 text-xs bg-white border border-[#E8EEF4] rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase text-slate-500">
                Task Description
              </label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="e.g. Ask for GPay screenshot"
                className="text-xs bg-white border border-[#E8EEF4] rounded-lg min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Assign To *
                </label>
                <select
                  required
                  value={taskAssignedTo}
                  onChange={(e) => setTaskAssignedTo(e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-[#E8EEF4] rounded-lg px-2"
                >
                  <option value="">Select colleague...</option>
                  {colleagues.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="h-9 text-xs bg-white border border-[#E8EEF4] rounded-lg"
                />
              </div>
            </div>
            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateTask(false)}
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingTask}
                className="h-9 text-xs font-semibold bg-[#FF4D00] hover:opacity-90 text-white rounded-lg px-4"
              >
                {creatingTask ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CANCEL BOOKING & REFUND MODULE */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[450px] bg-white p-6 rounded-xl shadow-lg border border-[#E8EEF4]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
              ⚠️ Cancel Booking & Process Refund
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-400">
              This will cancel the booking workspace, auto-cancel any associated
              train tickets, and record the refund in the accounting ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3 text-xs">
            <div className="bg-slate-55 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase">
                  Advance Paid
                </p>
                <p className="text-sm font-semibold font-mono text-[#0B1528]">
                  ₹{(booking.advancePaid || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-slate-400 uppercase">
                  Booking ID
                </p>
                <p className="text-sm font-semibold font-mono text-[#0B1528]">
                  #{booking.bookingId}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase text-slate-500">
                Reason for Cancellation *
              </label>
              <Input
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Traveler cancelled at last moment due to emergency"
                className="h-9 text-xs bg-white border border-[#E8EEF4] rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Cancellation Charges (₹)
                </label>
                <Input
                  type="number"
                  value={cancelCharges}
                  onChange={(e) => {
                    setCancelCharges(e.target.value);
                    const charges = parseFloat(e.target.value) || 0;
                    const advance = booking.advancePaid || 0;
                    setCancelRefund(Math.max(0, advance - charges).toString());
                  }}
                  className="h-9 text-xs bg-white border border-[#E8EEF4] rounded-lg font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Refund Amount (₹)
                </label>
                <Input
                  type="number"
                  value={cancelRefund}
                  onChange={(e) => setCancelRefund(e.target.value)}
                  className="h-9 text-xs bg-white border border-[#E8EEF4] rounded-lg font-mono text-green-600 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold uppercase text-slate-500">
                Refund Payment Method
              </label>
              <Select
                value={cancelRefundMode}
                onValueChange={setCancelRefundMode}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI (GPay/PhonePe)</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCancelModal(false)}
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Go Back
              </Button>
              <Button
                onClick={handleCancelBooking}
                disabled={cancelProcessing}
                className="h-9 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg px-4"
              >
                {cancelProcessing ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: PERMANENT DELETE BOOKING FOR FOUNDER */}
      {isFounder && (
        <Dialog open={showDeleteFounderModal} onOpenChange={setShowDeleteFounderModal}>
          <DialogContent className="sm:max-w-[420px] bg-white p-6 rounded-xl shadow-lg border border-[#E8EEF4]">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" /> Permanently Delete Booking
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Permanently purge this booking record from the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs text-slate-600">
              <p className="font-semibold text-[#0B1528]">
                Are you sure you want to permanently delete booking{" "}
                <span className="font-mono font-semibold text-red-900 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  {booking.bookingId || booking.id}
                </span>{" "}
                ({booking.fullName || booking.name})?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] font-medium leading-relaxed">
                ⚠️ <strong>Founder Privilege Action:</strong> This will permanently purge this booking, all passenger records, train tickets, tasks, and payment logs from the system database. This action cannot be undone.
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteFounderModal(false)}
                className="text-xs font-semibold h-9 rounded-lg border-[#E8EEF4] cursor-pointer"
                disabled={deletingFounderProcessing}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteBookingFounder}
                disabled={deletingFounderProcessing}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 rounded-lg px-4 flex items-center gap-1.5 cursor-pointer"
              >
                {deletingFounderProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* DIALOG: CANCEL INDIVIDUAL PASSENGER IN GROUP */}
      <Dialog open={cancelPassengerModalOpen} onOpenChange={setCancelPassengerModalOpen}>
        <DialogContent className="sm:max-w-[460px] bg-white p-6 rounded-xl shadow-lg border border-[#E8EEF4]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" /> Cancel Passenger from Group
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mark an individual traveler as cancelled while keeping the rest of the booking active.
            </DialogDescription>
          </DialogHeader>

          {cancellingPassenger && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-900 text-sm">{cancellingPassenger.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-200/80 text-red-900 font-semibold">
                    {cancellingPassenger.age ? `${cancellingPassenger.age}y` : ""} {cancellingPassenger.genderFull || cancellingPassenger.gender}
                  </span>
                </div>
                <p className="text-[11px] text-red-700 font-medium">
                  Booking ID: <strong>{booking.bookingId || booking.id}</strong> ({booking.fullName || booking.name})
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-700 block mb-1">
                  Cancellation Reason *
                </label>
                <Select value={cancellationReason} onValueChange={setCancellationReason}>
                  <SelectTrigger className="h-9 text-xs bg-white border-[#E8EEF4] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white">
                    <SelectItem value="Customer Requested Cancellation">Customer Requested Cancellation</SelectItem>
                    <SelectItem value="Medical Emergency / Health Issue">Medical Emergency / Health Issue</SelectItem>
                    <SelectItem value="Schedule / Work Conflict">Schedule / Work Conflict</SelectItem>
                    <SelectItem value="Train / Visa / ID Issue">Train / Visa / ID Issue</SelectItem>
                    <SelectItem value="Personal / Family Emergency">Personal / Family Emergency</SelectItem>
                    <SelectItem value="No-Show / Unreachable">No-Show / Unreachable</SelectItem>
                    <SelectItem value="Other Reason">Other / Custom Reason</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-700 block mb-1">
                  Internal Cancellation Notes (Optional)
                </label>
                <Textarea
                  value={cancellationNotes}
                  onChange={(e) => setCancellationNotes(e.target.value)}
                  placeholder="e.g. Discussed with team / replacement pending..."
                  className="text-xs min-h-[60px] bg-white border-[#E8EEF4]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelPassengerModalOpen(false)}
              className="text-xs font-semibold h-9 rounded-lg border-[#E8EEF4] cursor-pointer"
              disabled={isProcessingCancelPax}
            >
              Keep Active
            </Button>
            <Button
              size="sm"
              onClick={handleCancelPassengerSubmit}
              disabled={isProcessingCancelPax}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 rounded-lg px-4 flex items-center gap-1.5 cursor-pointer"
            >
              {isProcessingCancelPax ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  <span>Confirm Passenger Cancellation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      {docPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E8EEF4]">
            <div className="p-4 border-b border-[#E8EEF4] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#FF4D00]" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{docPreviewModal.title}</h3>
                  {docPreviewModal.passengerName && (
                    <p className="text-[11px] text-slate-500 font-medium">Passenger: {docPreviewModal.passengerName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={docPreviewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Open in New Tab <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setDocPreviewModal(null)}
                  className="text-slate-400 hover:text-slate-700 font-semibold text-lg px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[350px]">
              {docPreviewModal.url.toLowerCase().includes(".pdf") ? (
                <iframe
                  src={docPreviewModal.url}
                  className="w-full h-[550px] rounded-lg border border-[#E8EEF4] bg-white"
                  title={docPreviewModal.title}
                />
              ) : (
                <img
                  src={docPreviewModal.url}
                  alt={docPreviewModal.title}
                  className="max-h-[550px] max-w-full object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Auxiliary Service Modal */}
      <Dialog open={showAddServiceModal} onOpenChange={setShowAddServiceModal}>
        <DialogContent className="max-w-md bg-white rounded-xl p-5 shadow-lg border border-[#E8EEF4]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF4D00]" /> Add Auxiliary Service
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record a 3rd-party vendor service (Train, Flight, Hotel, Visa, Insurance, Transport) for {booking.bookingId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Service Type</label>
              <Select
                value={serviceForm.serviceType}
                onValueChange={(val: any) => setServiceForm({ ...serviceForm, serviceType: val })}
              >
                <SelectTrigger className="h-8.5 text-xs rounded-lg border-[#E8EEF4]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="TRAIN">Train Ticket / Quota</SelectItem>
                  <SelectItem value="FLIGHT">Flight Booking</SelectItem>
                  <SelectItem value="HOTEL">Hotel / Stay Extension</SelectItem>
                  <SelectItem value="VISA">Visa Processing</SelectItem>
                  <SelectItem value="INSURANCE">Travel Insurance</SelectItem>
                  <SelectItem value="TRANSPORT">Custom Cab / Transport</SelectItem>
                  <SelectItem value="OTHER">Other Auxiliary Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Vendor / Operator Name *</label>
              <Input
                placeholder="e.g. IRCTC Agent / MakeMyTrip / Snow View Resort"
                value={serviceForm.vendorName}
                onChange={(e) => setServiceForm({ ...serviceForm, vendorName: e.target.value })}
                className="h-8.5 text-xs rounded-lg border-[#E8EEF4]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Cost Price (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={serviceForm.costPrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, costPrice: e.target.value })}
                  className="h-8.5 text-xs rounded-lg border-[#E8EEF4] font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Selling Price (₹) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 2200"
                  value={serviceForm.sellingPrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, sellingPrice: e.target.value })}
                  className="h-8.5 text-xs rounded-lg border-[#E8EEF4] font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Notes / Remarks</label>
              <Textarea
                placeholder="e.g. PNR: 2481928190, 2S Sleeper extra seat"
                value={serviceForm.remarks}
                onChange={(e) => setServiceForm({ ...serviceForm, remarks: e.target.value })}
                className="text-xs rounded-lg border-[#E8EEF4]"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddServiceModal(false)}
              className="text-xs font-semibold h-8.5 rounded-lg border-[#E8EEF4]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateService}
              disabled={savingService}
              className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs h-8.5 px-4 rounded-lg"
            >
              {savingService ? "Saving..." : "Save Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Booking Refund Modal */}
      <Dialog open={showBookingRefundModal} onOpenChange={setShowBookingRefundModal}>
        <DialogContent className="max-w-md bg-white rounded-xl p-5 shadow-lg border border-[#E8EEF4]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#FF4D00]" /> Request Booking Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit refund request for booking {booking.bookingId} to the Finance Controller approval queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Refund Mode</label>
              <Select
                value={refundForm.refundMode}
                onValueChange={(val: any) => setRefundForm({ ...refundForm, refundMode: val })}
              >
                <SelectTrigger className="h-8.5 text-xs rounded-lg border-[#E8EEF4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="CASH">Bank / Cash Refund (Direct Payout)</SelectItem>
                  <SelectItem value="CREDIT">Store Credit Note (Reusable Voucher)</SelectItem>
                  <SelectItem value="HYBRID">Hybrid (Partial Cash + Partial Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(refundForm.refundMode === "CASH" || refundForm.refundMode === "HYBRID") && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Cash / Bank Payout Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={refundForm.cashAmount}
                  onChange={(e) => setRefundForm({ ...refundForm, cashAmount: e.target.value })}
                  className="h-8.5 text-xs rounded-lg border-[#E8EEF4] font-mono"
                />
              </div>
            )}

            {(refundForm.refundMode === "CREDIT" || refundForm.refundMode === "HYBRID") && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Store Credit Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={refundForm.creditAmount}
                  onChange={(e) => setRefundForm({ ...refundForm, creditAmount: e.target.value })}
                  className="h-8.5 text-xs rounded-lg border-[#E8EEF4] font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Bank Reference / UPI ID (Optional)</label>
              <Input
                placeholder="e.g. Customer HDFC A/C or UPI: customer@okhdfcbank"
                value={refundForm.bankReference}
                onChange={(e) => setRefundForm({ ...refundForm, bankReference: e.target.value })}
                className="h-8.5 text-xs rounded-lg border-[#E8EEF4]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Reason for Refund *</label>
              <Textarea
                placeholder="e.g. Traveler medical emergency, agreed 50% refund as per policy"
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="text-xs rounded-lg border-[#E8EEF4]"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBookingRefundModal(false)}
              className="text-xs font-semibold h-8.5 rounded-lg border-[#E8EEF4]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateBookingRefund}
              disabled={submittingRefund}
              className="bg-[#FF4D00] hover:bg-[#E04400] text-white font-semibold text-xs h-8.5 px-4 rounded-lg"
            >
              {submittingRefund ? "Submitting..." : "Submit Refund Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



