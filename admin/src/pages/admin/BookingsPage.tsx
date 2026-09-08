import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Copy,
  Trash2,
  CheckCircle,
  Clock,
  Filter,
  X,
  Link2,
  Users,
  ChevronDown,
  Edit,
  Pencil,
  FileDown,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  ClipboardList,
  Bookmark,
  Ticket,
  Train,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  Wallet,
  Compass,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { bookingsService } from "@/services/bookings.service";
import api from "@/services/api";
import { adminUsersService } from "@/services/adminUsers.service";
import BookingDetailsView from "@/components/admin/BookingDetailsView";
import NewBookingModal from "@/components/admin/NewBookingModal";
import type { Booking, BookingTrip } from "@/types";
import { toast } from "sonner";
import { cn, safeFormatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { trainTicketService } from "@/services/trainTicket.service";
import EmailComposerDrawer from "@/components/admin/EmailComposerDrawer";
import AccountingPage from "@/pages/admin/AccountingPage";

import { TripManager } from "@/components/bookings/TripManagerModal";
import { ConfirmModal } from "@/components/bookings/ConfirmModal";
import { BookingsToolbar } from "@/components/bookings/BookingsToolbar";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { BookingsFilterSidebar } from "@/components/bookings/BookingsFilterSidebar";
import { MobileBookingsView } from "@/components/mobile/MobileBookingsView";
import { resolveBookingExecutiveName } from "@/utils/bookingExecutive";

// Booking source helper with Sales Executive name resolution
const getBookingMetaData = (
  booking: Booking,
  adminMap?: Record<string, string>,
) => {
  if (!booking)
    return { bookedBy: "Website / Direct", source: "Website / Inquiry" };
  const link = (booking as any).sourceBookingLink as
    | {
        tokenPrefix?: string | null;
        id?: string | null;
        shareUrl?: string | null;
      }
    | undefined;

  let bookedBy = resolveBookingExecutiveName(booking, adminMap);
  // Align list label with historical copy when no sales owner
  if (bookedBy === "Web Direct") bookedBy = "Website / Direct";

  let source = link?.tokenPrefix
    ? `Booking Link #${link.tokenPrefix}`
    : "Website / Inquiry";

  const notesLower =
    ((booking.notes as any) || "").toString().toLowerCase() +
    " " +
    ((booking.adminNotes as any) || "").toString().toLowerCase();
  // Do not let free-text "booked by:" notes override a resolved salesAdmin name
  if (
    notesLower.includes("booked by:") &&
    (bookedBy === "Website / Direct" || bookedBy === "Sales Executive")
  ) {
    const match = notesLower.match(/booked by:\s*([a-zA-Z\s]+)/);
    if (match && match[1]) bookedBy = match[1].trim();
  }
  if (notesLower.includes("source:")) {
    const match = notesLower.match(/source:\s*([a-zA-Z\s]+)/);
    if (match && match[1]) source = match[1].trim();
  }

  return { bookedBy, source };
};

// Caches
let cachedBookingTrips: BookingTrip[] | null = null;
let cachedSalesOptions: string[] | null = null;

// ── MAIN PAGE ──
export default function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<BookingTrip[]>(cachedBookingTrips || []);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "confirmed" | "all">("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch((prev) => (prev !== searchInput ? searchInput : prev));
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [filterTrip, setFilterTrip] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterSalesAdmin, setFilterSalesAdmin] = useState("all");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingEnd, setBookingEnd] = useState("");
  const [depStart, setDepStart] = useState("");
  const [depEnd, setDepEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [showTrips, setShowTrips] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Booking | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Custom states
  const [detailsDefaultTab, setDetailsDefaultTab] =
    useState<string>("overview");
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewTarget, setPreviewTarget] = useState<Booking | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [salesOptions, setSalesOptions] = useState<string[]>(
    cachedSalesOptions || [],
  );
  const bookingsRequestRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { admin: currentAdmin } = useAuthStore();

  const tripMap = useMemo(() => {
    const m = new Map<string, BookingTrip>();
    for (const t of trips) {
      if (t.id) m.set(t.id, t);
      if (t.tripCode) m.set(t.tripCode, t);
    }
    return m;
  }, [trips]);

  useEffect(() => {
    const handleReset = () => {
      setDetailsTarget(null);
      setSearchParams({});
    };
    window.addEventListener("reset-bookings-view", handleReset);
    return () => window.removeEventListener("reset-bookings-view", handleReset);
  }, [setSearchParams]);

  useEffect(() => {
    const bookingIdFromUrl = searchParams.get("id");
    if (
      bookingIdFromUrl &&
      (!detailsTarget || detailsTarget.id !== bookingIdFromUrl)
    ) {
      bookingsService
        .getById(bookingIdFromUrl)
        .then((fresh) => {
          setDetailsTarget(fresh);
        })
        .catch(() => {
          setSearchParams({});
        });
    }
  }, [searchParams]);

  useEffect(() => {
    bookingsService
      .getTrips()
      .then((t) => {
        const arr = Array.isArray(t) ? t : [];
        cachedBookingTrips = arr;
        setTrips(arr);
      })
      .catch((err) => console.error("Trips failed", err));
  }, []);

  useEffect(() => {
    if (currentAdmin) {
      if (cachedSalesOptions) setSalesOptions(cachedSalesOptions);
      adminUsersService
        .getSalesExecutives()
        .then((users) => {
          const ids = users
            .map((u: any) => u.id || u.username || u.email)
            .filter(Boolean);
          cachedSalesOptions = ids;
          setSalesOptions(ids);
        })
        .catch(() => setSalesOptions([]));
    } else if (currentAdmin && currentAdmin.role === "sales") {
      setSalesOptions([currentAdmin.id]);
    }
  }, [currentAdmin]);

  const filterKey = `${tab}-${filterTrip}-${filterPayment}-${filterSalesAdmin}-${bookingStart}-${bookingEnd}-${depStart}-${depEnd}-${statusFilter}-${paymentStatusFilter}-${balanceOnly}-${search}-${quickFilter}-${selectedStatuses.join(",")}`;
  const lastFilterKeyRef = useRef(filterKey);

  const fetchBookings = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let queryPage = page;
    if (lastFilterKeyRef.current !== filterKey) {
      lastFilterKeyRef.current = filterKey;
      queryPage = 1;
      setPage(1);
    }

    const requestId = ++bookingsRequestRef.current;
    setLoading(true);
    try {
      // Fetch both confirmed and pending if filtering by unconfirmed status
      let apiStatus = tab;
      if (
        quickFilter === "unconfirmed_bookings" ||
        selectedStatuses.includes("Unconfirmed")
      ) {
        apiStatus = "all" as any;
      }

      const res = await bookingsService.getAll(
        {
          status: apiStatus,
          tripId: filterTrip,
          paymentStatus: statusFilter,
          payment_status: paymentStatusFilter,
          search,
          salesAdminId: filterSalesAdmin,
          balanceOnly,
          bookingStart,
          bookingEnd,
          depStart,
          depEnd,
          page: queryPage,
          limit: pageSize,
        },
        controller.signal,
      );
      if (requestId !== bookingsRequestRef.current) return;

      const currentTotalPages = res.pagination?.totalPages || 0;
      if (currentTotalPages > 0 && queryPage > currentTotalPages) {
        setPage(currentTotalPages);
        return;
      }

      setBookings(res.data || []);
      setTotalCount(res.pagination?.totalCount || 0);
      setTotalPages(currentTotalPages);
    } catch (err: any) {
      if (err.name !== "CanceledError") {
        toast.error("Failed to load bookings");
      }
    } finally {
      if (requestId === bookingsRequestRef.current) setLoading(false);
    }
  }, [filterKey, page, pageSize]);

  useEffect(() => {
    fetchBookings();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchBookings]);

  const fetchAll = () => {
    fetchBookings();
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const getFlowStatus = (b: Booking) => {
    if (b.status === "cancelled") return "Cancelled";
    if (b.status === "expired") return "Expired";
    if (b.status === "draft") return "Draft";
    if (b.status === "confirmed" && b.remainingAmount <= 0) return "Completed";
    if (b.status === "confirmed") return "Confirmed";
    return "Inquiry";
  };

  const openBookingDetails = async (b: Booking, defaultTab?: string) => {
    setDetailsDefaultTab(defaultTab || "overview");
    setDetailsLoadingId(b.id);
    try {
      const fresh = await bookingsService.getById(b.id);
      setDetailsTarget(fresh);
      setSearchParams({ id: b.id });
    } catch {
      toast.error("Failed to load booking details");
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const refreshBookingDetails = async () => {
    if (!detailsTarget) return;
    try {
      const fresh = await bookingsService.getById(detailsTarget.id);
      setDetailsTarget(fresh);
      fetchAll();
    } catch {
      toast.error("Failed to refresh details");
    }
  };

  const openEdit = (b: Booking) => {
    setEditTarget(b);
    setEditForm({
      fullName: b.fullName,
      mobile: b.mobile,
      age: b.age || "",
      gender: b.gender || "Male",
      email: b.email || "",
      paymentStatus: b.paymentStatus,
      notes: b.notes || "",
      departureDate: b.departureDate || "",
    });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    try {
      await bookingsService.update(editTarget.id, editForm);
      toast.success("Booking updated!");
      setEditTarget(null);
      fetchAll();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this booking? This action cannot be undone.")) return;
    try {
      await api.delete(`/bookings/${id}?permanent=true`);
      toast.success("Booking permanently deleted successfully");
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete booking");
    }
  };

  const handleConfirmPayment = async (id: string) => {
    if (!confirm("Confirm payment for this booking?")) return;
    try {
      await bookingsService.confirmPayment(id);
      toast.success("Payment confirmed and WhatsApp triggered!");
      fetchAll();
    } catch {
      toast.error("Failed to confirm payment");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setFilterTrip("all");
    setFilterPayment("all");
    setFilterSalesAdmin("all");
    setBookingStart("");
    setBookingEnd("");
    setDepStart("");
    setDepEnd("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setBalanceOnly(false);
    setQuickFilter("all");
    setSelectedStatuses([]);
    setTab("all");
  };

  const handleExportCSV = () => {
    if (bookings.length === 0) return toast.error("No bookings to export");
    const headers = [
      "Booking ID",
      "Guest Name",
      "Email",
      "Mobile",
      "Expedition ID",
      "Total Price",
      "Advance Paid",
      "Balance Due",
      "Status",
      "Created Date",
    ];
    const rows = bookings.map((b) => [
      `"${b.bookingId}"`,
      `"${b.fullName}"`,
      `"${b.email || "N/A"}"`,
      `"${b.mobile}"`,
      `"${b.tripId}"`,
      b.totalAmount || 0,
      b.advancePaid || 0,
      b.remainingAmount || 0,
      `"${b.status === "confirmed" ? b.paymentStatus : "Pending Confirmation"}"`,
      `"${safeFormatDate(b.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" })}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${bookings.length} bookings exported to CSV!`);
  };

  const selectAll = () => {
    if (selectedIds.length === bookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bookings.map((b) => b.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Metrics for counters
  const totalAmountDue = bookings.reduce(
    (sum, b) => sum + (b.remainingAmount || 0),
    0,
  );
  const totalPendingInquiries = bookings.filter(
    (b) => b.status === "pending",
  ).length;
  const totalConfirmedCount = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;

  const getPriority = (b: Booking) => {
    if (b.status === "pending") return "amber";
    if (b.remainingAmount > 15000) return "red";
    if (b.remainingAmount > 0) return "blue";
    if (b.status === "confirmed") return "green";
    return "purple";
  };

  const getDays = (b: Booking) => {
    if (!b.departureDate) return 0;
    const diff =
      new Date(b.departureDate).getTime() - new Date(b.createdAt).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getProgress = (b: Booking) => {
    if (b.status === "confirmed" && b.remainingAmount === 0) return 100;
    if (b.status === "confirmed") return 85;
    if (b.status === "pending" && b.advancePaid > 0) return 60;
    if (b.status === "pending") return 35;
    return 15;
  };

  const isTicketPending = (b: Booking) =>
    b.trainTicketStatus === "Pending" ||
    b.trainTicketStatus === "Waitlisted" ||
    (Boolean(b.ticketStatus) && b.ticketStatus !== "ISSUED");

  const isTodayDeparture = (b: Booking) => {
    if (!b.departureDate) return false;
    const d = new Date(b.departureDate);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  };

  const isOpsPending = (b: Booking) => b.status === "confirmed" && getProgress(b) < 85;

  const isRefundQueue = (b: Booking) =>
    b.status === "cancelled" ||
    b.status === "expired" ||
    String(b.paymentStatus || "").toLowerCase().includes("refund");

  const isNeedsAttention = (b: Booking) =>
    b.status === "pending" ||
    Number(b.remainingAmount || 0) > 0 ||
    isTicketPending(b) ||
    isOpsPending(b);

  const getNextAction = (b: Booking) => {
    if (b.status === "pending") return "Confirm Booking";
    if (b.remainingAmount > 0) return "Collect Balance";
    if (b.ticketStatus !== "ISSUED") return "Generate Ticket";
    return "Final Checklist";
  };

  const getActivityTime = (b: Booking) => {
    const diff =
      new Date().getTime() - new Date(b.updatedAt || b.createdAt).getTime();
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    if (hrs < 1) return "Just now";
    if (hrs < 24) return `${hrs} hours ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Quick Filters
      if (quickFilter === "my") {
        const meta = getBookingMetaData(b);
        if (meta.bookedBy !== currentAdmin?.name)
          return false;
      } else if (quickFilter === "confirmed_bookings") {
        if (b.status !== "confirmed") return false;
      } else if (quickFilter === "unconfirmed_bookings") {
        if (
          b.status !== "pending" &&
          b.status !== "draft" &&
          b.status !== "abandoned"
        )
          return false;
      } else if (quickFilter === "needs_attention") {
        if (!isNeedsAttention(b)) return false;
      } else if (quickFilter === "payment_pending") {
        if (b.remainingAmount <= 0) return false;
      } else if (quickFilter === "ticket_pending" || quickFilter === "ticket_verification") {
        if (!isTicketPending(b)) return false;
      } else if (quickFilter === "ops_pending" || quickFilter === "ops_blocked") {
        if (!isOpsPending(b)) return false;
      } else if (quickFilter === "today_departure") {
        if (!isTodayDeparture(b)) return false;
      } else if (quickFilter === "refund_approval") {
        if (!isRefundQueue(b)) return false;
      } else if (quickFilter === "payment_overdue") {
        if (b.remainingAmount <= 0) return false;
        if (!b.departureDate) return false;
        const diff = new Date(b.departureDate).getTime() - new Date().getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days > 3) return false;
      } else if (quickFilter === "departing_7_days") {
        if (!b.departureDate) return false;
        const diff = new Date(b.departureDate).getTime() - new Date().getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 0 || days > 7) return false;
      } else if (quickFilter === "ops_blocked") {
        if (b.status !== "confirmed" || getProgress(b) >= 85) return false;
      } else if (quickFilter === "completed_bookings") {
        if (b.status !== "confirmed" || getProgress(b) < 100) return false;
      } else if (quickFilter === "cancelled_bookings") {
        if (b.status !== "expired" && b.status !== "cancelled") return false;
      }

      // 2. Booking Status Filters (Checkboxes)
      if (selectedStatuses.length > 0) {
        const isConfirmed = b.status === "confirmed";
        const isUnconfirmed =
          b.status === "pending" ||
          b.status === "draft" ||
          b.status === "abandoned";
        const isCancelled = b.status === "expired" || b.status === "cancelled";
        const isCompleted = getProgress(b) === 100 && b.status === "confirmed";

        let matchesOne = false;
        if (selectedStatuses.includes("Confirmed") && isConfirmed)
          matchesOne = true;
        if (selectedStatuses.includes("Unconfirmed") && isUnconfirmed)
          matchesOne = true;
        if (selectedStatuses.includes("Cancelled") && isCancelled)
          matchesOne = true;
        if (selectedStatuses.includes("Completed") && isCompleted)
          matchesOne = true;
        if (!matchesOne) return false;
      }

      // 3. Dropdowns
      if (filterTrip !== "all" && b.tripId !== filterTrip) return false;
      if (filterSalesAdmin !== "all" && b.salesAdminId !== filterSalesAdmin)
        return false;

      return true;
    });
  }, [
    bookings,
    quickFilter,
    selectedStatuses,
    filterTrip,
    filterSalesAdmin,
    currentAdmin,
  ]);

  const queueCounts = useMemo(
    () => ({
      all: bookings.length,
      needs_attention: bookings.filter(isNeedsAttention).length,
      payment_pending: bookings.filter((b) => Number(b.remainingAmount || 0) > 0).length,
      ticket_pending: bookings.filter(isTicketPending).length,
      ops_pending: bookings.filter(isOpsPending).length,
      today_departure: bookings.filter(isTodayDeparture).length,
      refund_approval: bookings.filter(isRefundQueue).length,
      completed_bookings: bookings.filter(
        (b) => b.status === "confirmed" && getProgress(b) === 100,
      ).length,
    }),
    [bookings],
  );

  const hasActiveFilters =
    search !== "" ||
    filterTrip !== "all" ||
    filterSalesAdmin !== "all" ||
    selectedStatuses.length > 0 ||
    (quickFilter !== "all" && quickFilter !== "confirmed_bookings");

  const [bulkModalAction, setBulkModalAction] = useState<string | null>(null);
  const [bulkSalesperson, setBulkSalesperson] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkReminderChannel, setBulkReminderChannel] = useState("WhatsApp");
  const [bulkReminderMessage, setBulkReminderMessage] = useState("");
  const [bulkTaskTitle, setBulkTaskTitle] = useState("");
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState("");
  const [bulkTaskPriority, setBulkTaskPriority] = useState("Medium");
  const [bulkTaskAssignee, setBulkTaskAssignee] = useState("");

  const handleBulkAction = (action: string) => {
    setBulkModalAction(action);
    setBulkSalesperson("");
    setBulkReminderMessage("");
    setBulkTaskTitle("");
    setBulkTaskDueDate("");
    setBulkTaskPriority("Medium");
    setBulkTaskAssignee("");
  };

  const executeBulkAction = async () => {
    if (!bulkModalAction) return;
    setBulkProcessing(true);
    try {
      if (bulkModalAction === "assign") {
        if (!bulkSalesperson) {
          toast.error("Please select a salesperson");
          setBulkProcessing(false);
          return;
        }
        await Promise.all(
          selectedIds.map((id) =>
            bookingsService.update(id, { salesAdminId: bulkSalesperson }),
          ),
        );
        toast.success(
          `Assigned executive ${bulkSalesperson} to ${selectedIds.length} bookings!`,
        );
      } else if (bulkModalAction === "reminder") {
        await Promise.all(
          selectedIds.map((id) => bookingsService.sendEmail(id, "reminder")),
        );
        toast.success(
          `Reminders dispatched via ${bulkReminderChannel} to ${selectedIds.length} travelers!`,
        );
      } else if (bulkModalAction === "link") {
        await Promise.all(
          selectedIds.map((id) => bookingsService.sendEmail(id, "invoice")),
        );
        toast.success(
          `Invoice payment links sent to ${selectedIds.length} travelers!`,
        );
      } else if (bulkModalAction === "assign_task") {
        if (!bulkTaskTitle) {
          toast.error("Please enter a task title");
          setBulkProcessing(false);
          return;
        }
        // Simulating creating a task on the booking's task board
        await Promise.all(
          selectedIds.map((id) =>
            bookingsService.update(id, {
              notes: `[Task Assigned: ${bulkTaskTitle} | Assignee: ${bulkTaskAssignee || "Unassigned"} | Due: ${bulkTaskDueDate || "No due date"} | Priority: ${bulkTaskPriority}]`,
            }),
          ),
        );
        toast.success(
          `Assigned task "${bulkTaskTitle}" to ${bulkTaskAssignee || "colleague"} for ${selectedIds.length} bookings!`,
        );
      } else if (bulkModalAction === "mark_complete") {
        await Promise.all(
          selectedIds.map((id) =>
            bookingsService.update(id, {
              status: "confirmed",
              paymentStatus: "Paid",
              remainingAmount: 0,
            }),
          ),
        );
        toast.success(
          `Marked ${selectedIds.length} bookings as confirmed and complete!`,
        );
      }
      setBulkModalAction(null);
      setSelectedIds([]);
      fetchAll();
    } catch (e) {
      toast.error("Failed to execute bulk action");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Use "view" param for the top-level bookings/payments switcher to avoid
  // colliding with AccountingPage's internal "tab" param when embedded.
  const currentTab = searchParams.get("view") || "bookings";

  if (detailsTarget) {
    return (
      <BookingDetailsView
        booking={detailsTarget}
        onBack={() => {
          setDetailsTarget(null);
          setSearchParams({});
          fetchAll();
        }}
        onRefresh={refreshBookingDetails}
        trips={trips}
        defaultTab={detailsDefaultTab}
      />
    );
  }

  if (currentTab === "payments") {
  return (
      <div className="flex flex-col min-h-0 md:h-[calc(100vh-56px)] md:overflow-hidden bg-[#F4F7FB] text-[#0B1528] font-sans antialiased -mx-3 md:-mx-5 md:-my-5 p-3 md:p-5">
        <div className="flex flex-col flex-1 min-h-0 bg-white border border-[#E8EEF4] rounded-xl md:overflow-hidden">
          {/* Top Tab Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8EEF4] bg-[#F8FAFC] shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-lg">
              <button
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete("view");
                  setSearchParams(nextParams);
                }}
                className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <Users className="w-3.5 h-3.5" />
                Bookings
              </button>
              <button
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set("view", "payments");
                  setSearchParams(nextParams);
                }}
                className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 bg-white text-[#FF4D00] shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Payments & Collections
              </button>
            </div>
          </div>
          <div className="flex-1 md:overflow-y-auto p-4 md:p-6 bg-[#F8FAFC]">
            <AccountingPage />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 md:h-[calc(100vh-56px)] md:overflow-hidden bg-[#F4F7FB] text-[#0B1528] font-sans antialiased -mx-3 md:-mx-5 md:-my-5 p-3 md:p-5">
      <div className="flex flex-col flex-1 min-h-0 bg-white border border-[#E8EEF4] rounded-xl md:overflow-hidden">
        {/* Top Tab Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8EEF4] bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-lg">
            <button
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete("view");
                setSearchParams(nextParams);
              }}
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 bg-white text-[#FF4D00] shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              Bookings ({totalCount || bookings.length})
            </button>
            <button
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set("view", "payments");
                setSearchParams(nextParams);
              }}
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payments & Collections
            </button>
          </div>
        </div>
      <BookingsToolbar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        fetchAll={fetchAll}
        handleExportCSV={handleExportCSV}
        setShowTrips={setShowTrips}
        counts={queueCounts}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* MAIN CONTAINER */}
      <div className="zoho-main flex flex-1 md:overflow-hidden">
        <BookingsFilterSidebar
          open={showSidebar}
          onOpenChange={setShowSidebar}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          filterTrip={filterTrip}
          setFilterTrip={setFilterTrip}
          trips={trips}
          bookingStart={bookingStart}
          setBookingStart={setBookingStart}
          bookingEnd={bookingEnd}
          setBookingEnd={setBookingEnd}
          depStart={depStart}
          setDepStart={setDepStart}
          depEnd={depEnd}
          setDepEnd={setDepEnd}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          paymentStatusFilter={paymentStatusFilter}
          setPaymentStatusFilter={setPaymentStatusFilter}
          balanceOnly={balanceOnly}
          setBalanceOnly={setBalanceOnly}
          filterSalesAdmin={filterSalesAdmin}
          setFilterSalesAdmin={setFilterSalesAdmin}
          salesOptions={salesOptions}
          onApply={fetchAll}
          onClear={clearFilters}
        />

        {/* CONTENT & TABLE AREA */}
        <div className="zoho-content-left flex-1 flex flex-col md:overflow-hidden bg-white min-w-0">
          {/* MOBILE BOOKINGS VIEW (<768px) */}
          <div className="block md:hidden p-3 pb-28">
            <MobileBookingsView
              bookings={filteredBookings}
              onSelectBooking={(b) => setDetailsTarget(b.rawBooking || b)}
              onCollectPayment={(b) => setDetailsTarget(b.rawBooking || b)}
            />
          </div>

          <BookingsTable
            bookings={filteredBookings}
            loading={loading}
            selectedIds={selectedIds}
            selectAll={selectAll}
            toggleSelect={toggleSelect}
            onPreview={setPreviewTarget}
            onOpenDetails={openBookingDetails}
            onDelete={handleDelete}
            currentAdmin={currentAdmin}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            setPage={setPage}
            onPageSizeChange={handlePageSizeChange}
            getDays={getDays}
            getProgress={getProgress}
            getNextAction={getNextAction}
            getFlowStatus={getFlowStatus}
            getActivityTime={getActivityTime}
            getBookedBy={(b) => getBookingMetaData(b).bookedBy}
          />

          {/* BULK ACTIONS DRAWER */}
          <div
            className={cn(
              "admin-fixed-above-nav fixed bottom-6 left-1/2 z-[60] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border border-slate-700/50 bg-[#0F172A] px-3 py-3 text-white shadow-xl transition-all duration-350 ease-out md:max-w-none md:flex-nowrap md:gap-3 md:px-6",
              selectedIds.length > 0
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-10 opacity-0",
            )}
          >
            <span className="font-bold text-xs mr-2">
              {selectedIds.length} Selected
            </span>
            <button
              className="h-8 px-3 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              onClick={() => handleBulkAction("assign")}
            >
              Assign Executive
            </button>
            <button
              className="h-8 px-3 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              onClick={() => handleBulkAction("reminder")}
            >
              Send Reminder
            </button>
            <button
              className="h-8 px-3 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              onClick={() => handleBulkAction("link")}
            >
              Payment Link
            </button>
            <button
              className="h-8 px-3 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              onClick={() => handleBulkAction("assign_task")}
            >
              Assign Task
            </button>
            <button
              className="h-8 px-3 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              onClick={() => handleBulkAction("mark_complete")}
            >
              Mark Complete
            </button>
            <button
              className="h-8 px-3 rounded border border-[#FF4D00]/40 bg-[#FF4D00] hover:bg-[#FF4D00] text-white font-bold text-xs transition-colors cursor-pointer"
              onClick={() => setIsBulkEmailOpen(true)}
            >
              Send Email
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* PREVIEW DRAWER SLIDE-OUT */}
      {previewTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setPreviewTarget(null)}
          />
          <div
            className={cn(
              "fixed top-0 right-0 z-50 flex h-[100dvh] w-full max-w-full flex-col border-l border-slate-200 bg-white font-sans shadow-2xl transition-transform duration-300 ease-out sm:w-[400px]",
              previewTarget ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="font-extrabold text-slate-800 text-sm">
                #{previewTarget.bookingId} - {previewTarget.fullName}
              </div>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                onClick={() => setPreviewTarget(null)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customer
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Name</span>
                    <span className="font-bold text-slate-800">
                      {previewTarget.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-mono font-bold text-slate-700">
                      {previewTarget.mobile}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Email</span>
                    <span className="font-mono font-bold text-slate-700">
                      {previewTarget.email || "no email"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Age / Gender</span>
                    <span className="font-bold text-slate-800">
                      {previewTarget.age || "N/A"} yrs /{" "}
                      {previewTarget.gender || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Salesperson</span>
                    <span className="font-bold text-slate-800">
                      {getBookingMetaData(previewTarget).bookedBy}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Trip Details
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Trip</span>
                    <span className="font-bold text-slate-800">
                      {previewTarget.tripName || previewTarget.tripId}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Departure</span>
                    <span className="font-bold text-slate-800">
                      {safeFormatDate(
                        previewTarget.departureDate,
                        { day: "2-digit", month: "short", year: "numeric" },
                        "Not Scheduled",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Passengers</span>
                    <span className="font-bold text-slate-800">
                      {previewTarget.numberOfTravelers || 1} pax
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Package Option</span>
                    <span className="font-bold text-slate-800">
                      {previewTarget.trainClass || "Sleeper"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Payment Summary
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Total Amount</span>
                    <span className="font-bold text-slate-800">
                      ₹
                      {Number(previewTarget.totalAmount || 0).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Received</span>
                    <span className="font-bold text-[#12B76A]">
                      ₹
                      {Number(previewTarget.advancePaid || 0).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Pending</span>
                    <span className="font-bold text-red-600">
                      ₹
                      {Number(
                        previewTarget.remainingAmount || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Booking status</span>
                    <span className="font-bold text-slate-800 uppercase text-[10px]">
                      {getFlowStatus(previewTarget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-400">Next Action</span>
                    <span className="font-bold text-blue-600 text-[10px] uppercase tracking-wide">
                      {getNextAction(previewTarget)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                className="w-full bg-[#0F172A] hover:bg-slate-850 text-white font-bold py-2.5 rounded-[6px] text-xs transition-colors cursor-pointer"
                onClick={() => {
                  openBookingDetails(previewTarget);
                  setPreviewTarget(null);
                }}
              >
                Open Full Workspace
              </button>
            </div>
          </div>
        </>
      )}

      {/* Trip & Confirm modals */}
      <TripManager
        open={showTrips}
        onClose={() => setShowTrips(false)}
        onRefresh={fetchAll}
      />
      <ConfirmModal
        booking={confirmTarget}
        trips={trips}
        onClose={() => setConfirmTarget(null)}
        onDone={() => {
          setConfirmTarget(null);
          fetchAll();
        }}
      />

      {/* BULK ACTIONS MODAL */}
      {bulkModalAction && (
        <Dialog
          open={!!bulkModalAction}
          onOpenChange={(v) => !v && setBulkModalAction(null)}
        >
          <DialogContent className="sm:max-w-[420px] p-0 border border-slate-200 rounded-lg overflow-hidden shadow-premium bg-white">
            <DialogHeader className="bg-slate-900 px-4 py-3 text-white">
              <DialogTitle className="text-xs font-bold uppercase tracking-wider text-white">
                {bulkModalAction === "assign" && "Assign Executive"}
                {bulkModalAction === "reminder" && "Send Reminders"}
                {bulkModalAction === "link" && "Generate Payment Links"}
                {bulkModalAction === "assign_task" && "Assign Tasks"}
                {bulkModalAction === "mark_complete" && "Mark as Complete"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Bulk operations for selected bookings.
              </DialogDescription>
            </DialogHeader>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-500 font-semibold">
                You have selected{" "}
                <span className="font-bold text-slate-800">
                  {selectedIds.length}
                </span>{" "}
                bookings to update.
              </p>

              {bulkModalAction === "assign" && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-400">
                    Select Executive / Salesperson
                  </label>
                  <Select
                    value={bulkSalesperson}
                    onValueChange={setBulkSalesperson}
                  >
                    <SelectTrigger className="h-9 text-xs rounded bg-white">
                      <SelectValue placeholder="Choose salesperson..." />
                    </SelectTrigger>
                    <SelectContent>
                      {salesOptions.map((id) => (
                        <SelectItem key={id} value={id} className="text-xs">
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {bulkModalAction === "reminder" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">
                      Reminder Channel
                    </label>
                    <Select
                      value={bulkReminderChannel}
                      onValueChange={setBulkReminderChannel}
                    >
                      <SelectTrigger className="h-9 text-xs rounded bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WhatsApp" className="text-xs">
                          WhatsApp Notification
                        </SelectItem>
                        <SelectItem value="Email" className="text-xs">
                          Email Reminder
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">
                      Custom message notes (Optional)
                    </label>
                    <textarea
                      className="w-full min-h-[60px] p-2 bg-white border border-slate-200 rounded text-xs outline-none"
                      placeholder="Type custom note to attach to the template..."
                      value={bulkReminderMessage}
                      onChange={(e) => setBulkReminderMessage(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {bulkModalAction === "link" && (
                <div className="bg-slate-55 p-3 rounded border border-slate-100/80 text-[11px] leading-relaxed text-slate-600">
                  This will generate and trigger automated billing invoice
                  payment links for the selected reservations, delivering them
                  to the primary passenger's email address.
                </div>
              )}

              {bulkModalAction === "assign_task" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">
                      Task Title / Description
                    </label>
                    <Input
                      value={bulkTaskTitle}
                      onChange={(e) => setBulkTaskTitle(e.target.value)}
                      placeholder="e.g. Call client for train tickets preference"
                      className="h-9 text-xs rounded bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">
                      Assign to Colleague / Executive
                    </label>
                    <Select
                      value={bulkTaskAssignee}
                      onValueChange={setBulkTaskAssignee}
                    >
                      <SelectTrigger className="h-9 text-xs rounded bg-white">
                        <SelectValue placeholder="Select colleague..." />
                      </SelectTrigger>
                      <SelectContent>
                        {salesOptions.map((id) => (
                          <SelectItem key={id} value={id} className="text-xs">
                            {id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={bulkTaskDueDate}
                        onChange={(e) => setBulkTaskDueDate(e.target.value)}
                        className="h-9 text-xs rounded bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-400">
                        Priority
                      </label>
                      <Select
                        value={bulkTaskPriority}
                        onValueChange={setBulkTaskPriority}
                      >
                        <SelectTrigger className="h-9 text-xs rounded bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low" className="text-xs">
                            Low
                          </SelectItem>
                          <SelectItem value="Medium" className="text-xs">
                            Medium
                          </SelectItem>
                          <SelectItem value="High" className="text-xs">
                            High
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {bulkModalAction === "mark_complete" && (
                <div className="bg-slate-55 p-3 rounded border border-slate-100/80 text-[11px] leading-relaxed text-slate-600">
                  Are you sure you want to mark all {selectedIds.length}{" "}
                  selected bookings as{" "}
                  <span className="text-green-600 font-bold">CONFIRMED</span>{" "}
                  and set their payment status to{" "}
                  <span className="text-green-600 font-bold">PAID</span>?
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={executeBulkAction}
                  disabled={bulkProcessing}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 rounded text-xs"
                >
                  {bulkProcessing ? "Processing..." : "Confirm Action"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBulkModalAction(null)}
                  disabled={bulkProcessing}
                  className="h-9 rounded text-xs border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editTarget && (
        <NewBookingModal
          open={!!editTarget}
          onOpenChange={(v) => !v && setEditTarget(null)}
          booking={editTarget}
          onSuccess={() => {
            setEditTarget(null);
            fetchAll();
          }}
        />
      )}
      {/* Bulk Email Composer Drawer */}
      <EmailComposerDrawer
        isOpen={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        contextType="booking"
        selectedIds={selectedIds}
        onSent={() => {
          setSelectedIds([]);
          setIsBulkEmailOpen(false);
          fetchAll();
        }}
      />
    </div>
  );
}

// Simple Helper
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
      <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0L7.1 4.995z" />
    </svg>
  );
}

