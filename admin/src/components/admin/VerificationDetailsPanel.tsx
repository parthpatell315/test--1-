import { useState, useEffect, useRef } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Train,
  FileText,
  User,
  ChevronRight,
  Plus,
  Eye,
  History,
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  Building2,
  Bus,
  Compass,
  DollarSign,
  Receipt,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Copy,
  Edit2,
  Bed,
  Paperclip,
  ExternalLink,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingVerificationService } from "@/services/bookingVerification.service";
import {
  trainTicketService,
  type TrainTicket,
  type TrainTemplate,
} from "@/services/trainTicket.service";
import { vendorsService } from "@/services/vendors.service";
import { opsService } from "@/services/ops.service";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import TrainTicketsPanel from "./TrainTicketsPanel";
import { bookingsService } from "@/services/bookings.service";
import { toast } from "sonner";

// ── STATUS BADGE COLORS ──
const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  PENDING_VERIFICATION: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Pending Verification",
  },
  CHANGES_REQUESTED: {
    bg: "bg-[#FF4D00]/5",
    text: "text-[#C2410C]",
    label: "Changes Requested",
  },
  VERIFIED: {
    bg: "bg-green-50",
    text: "text-green-700",
    label: "Verified",
  },
  APPROVED: {
    bg: "bg-green-50",
    text: "text-green-700",
    label: "Approved",
  },
  REJECTED: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
  ISSUED: { bg: "bg-blue-50", text: "text-blue-700", label: "Issued" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
  BOOKED: { bg: "bg-green-50", text: "text-green-700", label: "Booked" },
  WAITLISTED: {
    bg: "bg-[#FF4D00]/5",
    text: "text-[#C2410C]",
    label: "Waitlisted",
  },
  CONFIRMED: { bg: "bg-green-50", text: "text-green-700", label: "Confirmed" },
  RAC: { bg: "bg-pink-50", text: "text-pink-700", label: "RAC" },
  SELF_BOOKED: {
    bg: "bg-[#FF4D00]/5",
    text: "text-[#C2410C]",
    label: "Self Booked",
  },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}

// ── TIMELINE ITEM ──
function TimelineItem({ log, isLast }: { log: any; isLast: boolean }) {
  const iconMap: Record<string, React.ReactNode> = {
    SUBMITTED: <Send className="w-3.5 h-3.5 text-blue-500" />,
    VERIFIED: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
    APPROVED: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
    REJECTED: <XCircle className="w-3.5 h-3.5 text-red-600" />,
    CHANGES_REQUESTED: <AlertCircle className="w-3.5 h-3.5 text-[#FF4D00]" />,
    ISSUED: <Train className="w-3.5 h-3.5 text-blue-500" />,
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          {iconMap[log.action] || (
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="pb-5 min-w-0">
        <p className="text-[11px] font-semibold text-slate-800">
          {log.action?.replace(/_/g, " ")}
        </p>
        {log.notes && (
          <p className="text-[10px] text-slate-500 mt-0.5">{log.notes}</p>
        )}
        <p className="text-[9px] text-slate-400 mt-1">
          {log.performedBy && (
            <span className="font-medium text-slate-500">
              {log.performedBy} ·{" "}
            </span>
          )}
          {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
        </p>
      </div>
    </div>
  );
}

interface VerificationDetailsPanelProps {
  bookingId: string;
  booking?: any;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  queueType?: "booking" | "train";
}

export default function VerificationDetailsPanel({
  bookingId,
  booking,
  open,
  onClose,
  onRefresh,
  queueType = "booking",
}: VerificationDetailsPanelProps) {
  const { admin } = useAuthStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const [verificationData, setVerificationData] = useState<any>(null);
  const [fullBooking, setFullBooking] = useState<any>(null);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [trainTickets, setTrainTickets] = useState<TrainTicket[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [tripVendors, setTripVendors] = useState<any[]>([]);
  const [opsSummary, setOpsSummary] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<TrainTicket | null>(
    null,
  );
  const [templates, setTemplates] = useState<TrainTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"verification" | "ticket">(
    "verification",
  );
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // Form states for adding/editing ticket
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    travelerName: "",
    passengerReference: "",
    pnr: "",
    trainName: "",
    trainNumber: "",
    journeyDate: "",
    sourceStation: "",
    destinationStation: "",
    coach: "",
    seatNumber: "",
    berthType: "",
    ticketAmount: "",
    amountMode: "PAYMENT_LINK",
    internalNote: "",
    ticketBookingPerson: "",
    ticketStatus: "PENDING" as any,
  });

  // Reopen and Cancel dialog states
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRefund, setCancelRefund] = useState("0");

  const canPerformActions = hasPermission(
    (admin as any)?.permissions || (admin as any)?.customPermissions,
    "bookings.verify",
    admin?.role,
  );
  const isSales = !canPerformActions;

  useEffect(() => {
    if (open && bookingId) {
      loadData();
    }
  }, [open, bookingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [verification, fullB, tickets] = await Promise.all([
        bookingVerificationService.getVerificationStatus(bookingId),
        bookingsService.getById(bookingId).catch(() => null),
        trainTicketService.getTicketsByBooking(bookingId).catch(() => []),
      ]);
      setVerificationData(verification);
      setFullBooking(fullB);
      if (tickets && Array.isArray(tickets) && tickets.length > 0) {
        setTrainTickets(tickets);
        setTicketCount(tickets.length);
      }

      const tripId =
        fullB?.tripId ||
        fullB?.trip?.id ||
        booking?.tripId ||
        booking?.trip?.id;
      if (tripId) {
        try {
          const [vList, opsSum] = await Promise.all([
            vendorsService.getVendorsByTrip(tripId).catch(() => []),
            opsService
              .getTripAccountingSummary(
                tripId,
                fullB?.departureDate || booking?.departureDate,
              )
              .catch(() => null),
          ]);
          setTripVendors(vList || []);
          setOpsSummary(opsSum);
        } catch {}
      }

      if (
        queueType === "train" &&
        (booking?.id || bookingId) &&
        !booking?.isPseudo
      ) {
        const history = await trainTicketService
          .getTicketHistory(booking?.id || bookingId)
          .catch(() => []);
        setTicketHistory(history);
      }
    } catch (err) {
      console.error("Failed to load verification data:", err);
    }
    setLoading(false);
  };

  const handleVerificationAction = async (action: string) => {
    if (!bookingId) return;

    let note = "";
    if (action === "REQUEST_CHANGES") {
      const p = prompt(
        "Please enter notes/comments detailing what changes are requested:",
      );
      if (!p || !p.trim()) {
        toast.error("A comment is required to request changes.");
        return;
      }
      note = p;
    } else if (action === "REJECT") {
      const p = prompt("Please enter the reason for rejection:");
      if (!p || !p.trim()) {
        toast.error("A reason is required to reject.");
        return;
      }
      note = p;
    } else if (action === "VERIFY") {
      const confirmed = window.confirm(
        queueType === "train"
          ? "Are you sure you want to verify and approve this train ticket?"
          : "Are you sure you want to verify and approve this booking?",
      );
      if (!confirmed) return;
    }

    setActionLoading(true);
    try {
      if (queueType === "train") {
        if (booking?.isPseudo) {
          toast.error(
            "Cannot perform actions on ungenerated ticket placeholders. Please add or auto-generate tickets first.",
          );
          setActionLoading(false);
          return;
        }
        if (action === "VERIFY") {
          await trainTicketService.approveTicket(booking.id);
          toast.success("Train ticket approved and locked");
        } else if (action === "REQUEST_CHANGES") {
          await trainTicketService.reopenTicket(booking.id, note);
          toast.success("Ticket changes requested (Reopened)");
        } else if (action === "REJECT") {
          await trainTicketService.rejectTicket(booking.id, note);
          toast.success("Ticket rejected");
        }
      } else {
        await bookingVerificationService.performVerificationAction(bookingId, {
          action,
          notes: note || undefined,
        });
        toast.success(
          `Booking verification: ${action.toLowerCase().replace(/_/g, " ")}`,
        );
      }
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || `Failed to ${action.toLowerCase()}`,
      );
    }
    setActionLoading(false);
  };

  // ── TICKET OPERATION HANDLERS ──

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;
    setActionLoading(true);
    try {
      await trainTicketService.createTicket(bookingId, {
        ...formData,
        ticketAmount: formData.ticketAmount
          ? parseFloat(formData.ticketAmount)
          : 0,
      });
      toast.success("Traveler ticket created successfully");
      setShowForm(false);
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    }
    setActionLoading(false);
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      await trainTicketService.updateTicket(selectedTicket.id, {
        ...formData,
        ticketAmount: formData.ticketAmount
          ? parseFloat(formData.ticketAmount)
          : 0,
      });
      toast.success("Traveler ticket updated successfully");
      setShowForm(false);
      setIsEditing(false);
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update ticket");
    }
    setActionLoading(false);
  };

  const handleTicketSubmit = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await trainTicketService.submitTicket(ticketId);
      toast.success("Ticket submitted for approval");
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit ticket");
    }
    setActionLoading(false);
  };

  const handleTicketApprove = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await trainTicketService.approveTicket(ticketId);
      toast.success("Ticket approved and locked");
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve ticket");
    }
    setActionLoading(false);
  };

  const handleTicketReject = async (ticketId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    setActionLoading(true);
    try {
      await trainTicketService.rejectTicket(ticketId, reason);
      toast.success("Ticket rejected");
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject ticket");
    }
    setActionLoading(false);
  };

  const handleTicketReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reopenReason.trim()) return;
    setActionLoading(true);
    try {
      await trainTicketService.reopenTicket(selectedTicket.id, reopenReason);
      toast.success("Ticket reopened and unlocked");
      setReopenOpen(false);
      setReopenReason("");
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reopen ticket");
    }
    setActionLoading(false);
  };

  const handleTicketCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await trainTicketService.cancelTicket(selectedTicket.id, {
        reason: cancelReason,
        refundAmount: parseFloat(cancelRefund) || 0,
      });
      toast.success("Ticket cancelled successfully");
      setCancelOpen(false);
      setCancelReason("");
      setCancelRefund("0");
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel ticket");
    }
    setActionLoading(false);
  };

  // ── DOCUMENT VIEWER ──
  const handleViewDocument = async (docId: string, passengerId: string) => {
    if (viewingDocId === docId) return;
    setViewingDocId(docId);
    try {
      const blob = await bookingsService.downloadDocument(
        fullBooking?.id || bookingId,
        passengerId,
        docId,
      );
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke after a short delay to allow the tab to load
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      toast.error("Failed to open document. Please try again.");
    } finally {
      setViewingDocId(null);
    }
  };

  const handleTicketRebook = async (ticketId: string) => {
    if (
      !confirm(
        "Are you sure you want to rebook this ticket? It will create a new superseding ticket.",
      )
    )
      return;
    setActionLoading(true);
    try {
      await trainTicketService.rebookTicket(ticketId);
      toast.success("Rebooking successful. New ticket created.");
      await loadData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to rebook ticket");
    }
    setActionLoading(false);
  };

  const applyTemplate = (template: TrainTemplate) => {
    setFormData((prev) => ({
      ...prev,
      trainName: template.trainName || prev.trainName,
      trainNumber: template.trainNumber || prev.trainNumber,
      sourceStation: template.source || prev.sourceStation,
      destinationStation: template.destination || prev.destinationStation,
      coach: template.defaultCoach || prev.coach,
      berthType: template.defaultClass || prev.berthType,
      journeyDate: template.journeyDate
        ? template.journeyDate.slice(0, 10)
        : prev.journeyDate,
    }));
    toast.success("Template parameters prefilled!");
  };

  const openEditForm = (t: TrainTicket) => {
    setFormData({
      travelerName: t.travelerName || "",
      passengerReference: t.passengerReference || "",
      pnr: t.pnr || "",
      trainName: t.trainName || "",
      trainNumber: t.trainNumber || "",
      journeyDate: t.journeyDate ? t.journeyDate.slice(0, 10) : "",
      sourceStation: t.sourceStation || "",
      destinationStation: t.destinationStation || "",
      coach: t.coach || "",
      seatNumber: t.seatNumber || "",
      berthType: t.berthType || "",
      ticketAmount: t.ticketAmount ? String(t.ticketAmount) : "",
      amountMode: t.amountMode || "PAYMENT_LINK",
      internalNote: t.internalNote || "",
      ticketBookingPerson: t.ticketBookingPerson || "",
      ticketStatus: t.ticketStatus,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const openCreateForm = () => {
    // Prefill name from booking passengers if possible
    let defaultName = "";
    if (booking?.passengers && Array.isArray(booking.passengers)) {
      const existingNames = trainTickets.map((t) => t.travelerName);
      const remaining = booking.passengers.find(
        (p: any) => p && p.name && !existingNames.includes(p.name),
      );
      if (remaining) defaultName = remaining.name;
    }
    setFormData({
      travelerName: defaultName,
      passengerReference: "",
      pnr: "",
      trainName: "",
      trainNumber: "",
      journeyDate: "",
      sourceStation: "",
      destinationStation: "",
      coach: "",
      seatNumber: "",
      berthType: "",
      ticketAmount: "",
      amountMode: "PAYMENT_LINK",
      internalNote: "",
      ticketBookingPerson: "",
      ticketStatus: "PENDING",
    });
    setIsEditing(false);
    setShowForm(true);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Verification & Tickets
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {booking?.bookingId || bookingId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Booking Summary Header */}
            <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/30">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {fullBooking?.fullName ||
                    fullBooking?.name ||
                    booking?.travelerName}
                </span>
                <span>
                  Trip:{" "}
                  <span className="font-semibold text-slate-700">
                    {fullBooking?.tripName || booking?.booking?.tripName || "—"}
                  </span>
                </span>
              </div>
            </div>

            {/* Content Area - 4-Tier Verification & Operations Hierarchy */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">

              {/* ─────────────────────────────────────────────────────────────
                  TIER 0: 📎 PASSENGER ID DOCUMENTS (Booking Verification Only)
                 ───────────────────────────────────────────────────────────── */}
              {queueType === "booking" && (() => {
                // Parse passengers
                const rawPassengers = fullBooking?.passengers;
                let passengerList: any[] = [];
                if (Array.isArray(rawPassengers)) {
                  passengerList = rawPassengers;
                } else if (rawPassengers && typeof rawPassengers === "object") {
                  passengerList = rawPassengers.persons || [];
                }

                // All uploaded booking documents
                const allDocs: any[] = Array.isArray(fullBooking?.documents) ? fullBooking.documents : [];

                // Build per-passenger doc map
                const docsByPassenger: Record<string, any[]> = {};
                allDocs.forEach((doc) => {
                  const pid = doc.passengerId || "unknown";
                  if (!docsByPassenger[pid]) docsByPassenger[pid] = [];
                  docsByPassenger[pid].push(doc);
                });

                // Also collect docs for passengers not in the docsByPassenger map
                const allPassengerIds = passengerList.map((p: any) => p.id || p.passengerId || p._id || "").filter(Boolean);
                const unlinkedDocs = allDocs.filter((d) => !allPassengerIds.includes(d.passengerId));

                const totalPassengers = passengerList.length || 1;
                const passengersWithDocs = allPassengerIds.filter((pid) => docsByPassenger[pid]?.length > 0).length;
                const allComplete = allDocs.length > 0 && (passengerList.length === 0 || passengersWithDocs >= totalPassengers);
                const anyMissing = !allComplete;

                const formatSize = (bytes: number) => {
                  if (!bytes) return "";
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                };

                return (
                  <div className="space-y-2.5">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-montserrat">
                        <Paperclip className="w-4 h-4 text-[#FF4D00]" />
                        0. Passenger ID Documents
                        <span className={cn(
                          "ml-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded",
                          allDocs.length === 0
                            ? "bg-amber-100 text-amber-700"
                            : allComplete
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {allDocs.length} doc{allDocs.length !== 1 ? "s" : ""}
                        </span>
                      </h3>
                    </div>

                    {/* Missing documents warning banner */}
                    {anyMissing && passengerList.length > 0 && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-amber-800">
                            Documents Incomplete — {passengersWithDocs}/{totalPassengers} passengers have uploads
                          </p>
                          <p className="text-[9px] text-amber-700 mt-0.5">
                            Request changes if ID proof is missing before verifying.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No docs at all */}
                    {allDocs.length === 0 && (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center space-y-1.5">
                        <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-[10.5px] font-bold text-slate-600">No Documents Uploaded</p>
                        <p className="text-[9.5px] text-slate-400 max-w-xs mx-auto">
                          Agent has not uploaded any passenger ID proofs yet. Request changes.
                        </p>
                      </div>
                    )}

                    {/* Per-passenger document list */}
                    {passengerList.length > 0 && allDocs.length > 0 && (
                      <div className="space-y-2">
                        {passengerList.map((p: any, idx: number) => {
                          const pid = p.id || p.passengerId || p._id || "";
                          const pName = p.name || p.fullName || `Traveler ${idx + 1}`;
                          const pDocs = pid ? (docsByPassenger[pid] || []) : [];
                          const hasDocs = pDocs.length > 0;

                          return (
                            <div key={pid || idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {hasDocs ? (
                                    <FileCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                  <span className="text-[11px] font-bold text-slate-800">{pName}</span>
                                  {p.age && (
                                    <span className="text-[9px] text-slate-400 font-semibold">{p.age}y / {p.gender || "—"}</span>
                                  )}
                                </div>
                                <span className={cn(
                                  "text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                                  hasDocs
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                )}>
                                  {hasDocs ? `${pDocs.length} doc${pDocs.length > 1 ? "s" : ""}` : "Missing"}
                                </span>
                              </div>

                              {hasDocs && (
                                <div className="space-y-1.5">
                                  {pDocs.map((doc: any) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between bg-white border border-slate-200/60 rounded-lg px-2.5 py-2"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center shrink-0">
                                          <FileText className="w-3 h-3 text-[#FF4D00]" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-semibold text-slate-800 truncate max-w-[160px]">
                                            {doc.originalFileName || doc.documentType || "ID Proof"}
                                          </p>
                                          <p className="text-[8.5px] text-slate-400 font-medium">
                                            {doc.documentType} · {formatSize(doc.fileSize)}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleViewDocument(doc.id, pid)}
                                        disabled={viewingDocId === doc.id}
                                        className="flex items-center gap-1 text-[9.5px] font-bold text-[#FF4D00] hover:underline disabled:opacity-50 disabled:cursor-wait shrink-0 ml-2"
                                        title="View document in new tab"
                                      >
                                        {viewingDocId === doc.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <ExternalLink className="w-3 h-3" />
                                        )}
                                        View
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Docs uploaded but no passenger manifest (fallback) */}
                    {allDocs.length > 0 && passengerList.length === 0 && (
                      <div className="space-y-1.5">
                        {allDocs.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-white border border-slate-200/60 rounded-lg px-2.5 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center shrink-0">
                                <FileText className="w-3 h-3 text-[#FF4D00]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-800 truncate max-w-[180px]">
                                  {doc.originalFileName || "Document"}
                                </p>
                                <p className="text-[8.5px] text-slate-400 font-medium">
                                  {doc.documentType} · {formatSize(doc.fileSize)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewDocument(doc.id, doc.passengerId || "")}
                              disabled={viewingDocId === doc.id}
                              className="flex items-center gap-1 text-[9.5px] font-bold text-[#FF4D00] hover:underline disabled:opacity-50 disabled:cursor-wait shrink-0 ml-2"
                            >
                              {viewingDocId === doc.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ─────────────────────────────────────────────────────────────
                  TIER 1: 🚆 TRAIN TICKETS (PNR Manifest, Coach, Berth, Train Details)
                 ───────────────────────────────────────────────────────────── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-montserrat">
                    <Train className="w-4 h-4 text-[#FF4D00]" />
                    1. Train Tickets ({trainTickets.length > 0 ? trainTickets.length : (fullBooking?.passengers?.length || 1)})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openCreateForm}
                    className="h-6.5 text-[9px] font-bold text-[#FF4D00] bg-[#FF4D00]/5/70 hover:bg-[#FF4D00]/10 border-[#FF4D00]/30"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Ticket
                  </Button>
                </div>

                {showForm ? (
                  <form
                    onSubmit={isEditing ? handleUpdateTicket : handleCreateTicket}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800">
                        {isEditing ? "Edit Traveler Ticket" : "Add Traveler Ticket"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Traveler Name</label>
                        <Input
                          value={formData.travelerName}
                          onChange={(e) => setFormData({ ...formData, travelerName: e.target.value })}
                          placeholder="Traveler Name"
                          className="h-7.5 text-xs bg-white mt-0.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">PNR Number</label>
                        <Input
                          value={formData.pnr}
                          onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                          placeholder="10-digit PNR"
                          className="h-7.5 text-xs font-mono font-bold bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Train Number / Name</label>
                        <Input
                          value={formData.trainNumber}
                          onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })}
                          placeholder="e.g. 12951 - Rajdhani"
                          className="h-7.5 text-xs bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Journey Date</label>
                        <Input
                          type="date"
                          value={formData.journeyDate}
                          onChange={(e) => setFormData({ ...formData, journeyDate: e.target.value })}
                          className="h-7.5 text-xs bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Coach & Seat</label>
                        <div className="flex gap-1.5 mt-0.5">
                          <Input
                            value={formData.coach}
                            onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                            placeholder="Coach (e.g. B2)"
                            className="h-7.5 text-xs bg-white w-20"
                          />
                          <Input
                            value={formData.seatNumber}
                            onChange={(e) => setFormData({ ...formData, seatNumber: e.target.value })}
                            placeholder="Seat (e.g. 45)"
                            className="h-7.5 text-xs bg-white flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Berth Type</label>
                        <Input
                          value={formData.berthType}
                          onChange={(e) => setFormData({ ...formData, berthType: e.target.value })}
                          placeholder="Lower / Upper / Side Lower"
                          className="h-7.5 text-xs bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Ticket Cost (₹)</label>
                        <Input
                          type="number"
                          value={formData.ticketAmount}
                          onChange={(e) => setFormData({ ...formData, ticketAmount: e.target.value })}
                          placeholder="Fare amount"
                          className="h-7.5 text-xs font-mono font-bold bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Ticket Status</label>
                        <Select
                          value={formData.ticketStatus}
                          onValueChange={(val: any) => setFormData({ ...formData, ticketStatus: val })}
                        >
                          <SelectTrigger className="h-7.5 text-xs bg-white mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="RAC">RAC</SelectItem>
                            <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                            <SelectItem value="BOOKED">Booked</SelectItem>
                            <SelectItem value="SELF_BOOKED">Self Booked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={actionLoading}
                        className="h-7 text-xs bg-[#FF4D00] hover:bg-[#FF4D00] text-white font-bold"
                      >
                        {isEditing ? "Save Changes" : "Create Ticket"}
                      </Button>
                    </div>
                  </form>
                ) : trainTickets.length > 0 ? (
                  <div className="space-y-2">
                    {trainTickets.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-900 text-[12px] flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {t.travelerName || fullBooking?.fullName || `Traveler ${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {t.trainNumber ? `${t.trainNumber} - ${t.trainName}` : (t.trainName || "Train Not Assigned")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={t.ticketStatus || "PENDING"} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-white rounded-lg border border-slate-200/60 p-2 text-[10.5px]">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">PNR</span>
                            <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                              {t.pnr && t.pnr !== "PENDING" ? t.pnr : "Pending"}
                              {t.pnr && t.pnr !== "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(t.pnr || "");
                                    toast.success("PNR copied");
                                  }}
                                  title="Copy PNR"
                                >
                                  <Copy className="w-2.5 h-2.5 text-slate-400 hover:text-slate-700" />
                                </button>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">Coach / Seat</span>
                            <span className="font-semibold text-slate-700">
                              {t.coach ? `${t.coach} · ${t.seatNumber || "—"}` : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">Berth Type</span>
                            <span className="font-semibold text-slate-700">
                              {t.berthType || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500 border-t border-slate-200/60">
                          <span>
                            Route: <strong>{t.sourceStation || "Origin"} ➔ {t.destinationStation || fullBooking?.tripName || "Destination"}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(t)}
                              className="text-[#FF4D00] font-bold hover:underline flex items-center gap-1"
                            >
                              <Edit2 className="w-2.5 h-2.5" /> Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center space-y-1.5">
                    <Train className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No Tickets Generated Yet</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      Click "Add Ticket" above to assign PNR, coach, and seat details for travelers.
                    </p>
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  TIER 2: 💰 TICKET RATES & FINANCIAL BREAKDOWN
                 ───────────────────────────────────────────────────────────── */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-montserrat">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  2. Ticket Rates & Fare Breakdown
                </h3>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                  {/* Rates Cards Grid */}
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Total Ticket Cost
                      </p>
                      <p className="font-mono font-extrabold text-slate-800 text-[13px] mt-0.5">
                        ₹{trainTickets.reduce((sum, t) => sum + (Number(t.ticketAmount) || 0), 0).toLocaleString("en-IN")}
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {trainTickets.length} ticket(s)
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Avg Fare / Pax
                      </p>
                      <p className="font-mono font-extrabold text-blue-700 text-[13px] mt-0.5">
                        ₹
                        {trainTickets.length > 0
                          ? Math.round(
                              trainTickets.reduce((sum, t) => sum + (Number(t.ticketAmount) || 0), 0) / trainTickets.length
                            ).toLocaleString("en-IN")
                          : "0"}
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Per traveler
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Customer Paid
                      </p>
                      <p className="font-mono font-extrabold text-green-600 text-[13px] mt-0.5">
                        ₹{Number(fullBooking?.advancePaid || fullBooking?.advance || 0).toLocaleString("en-IN")}
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Advance collection
                      </span>
                    </div>
                  </div>

                  {/* Individual Passenger Ticket Rate List */}
                  {trainTickets.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200/60 p-2.5 space-y-1.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Passenger Fare Breakdown
                      </p>
                      {trainTickets.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-700">
                            {t.travelerName || `Traveler ${idx + 1}`} ({t.pnr && t.pnr !== "PENDING" ? `PNR: ${t.pnr}` : "Pending PNR"})
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            ₹{Number(t.ticketAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  TIER 3: 📋 BOOKING & TRAVELER PACKAGE SUMMARY
                 ───────────────────────────────────────────────────────────── */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-montserrat">
                  <FileText className="w-4 h-4 text-green-600" />
                  3. Booking & Traveler Package
                </h3>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3 text-xs">
                  {/* Lead Customer Card */}
                  <div className="bg-white rounded-lg border border-slate-200/60 p-3 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                          Lead Customer
                        </p>
                        <p className="font-bold text-slate-900 text-[12px] mt-0.5">
                          {fullBooking?.fullName || fullBooking?.name || "—"}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          verificationData?.verificationStatus || fullBooking?.status || "PENDING"
                        }
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      {fullBooking?.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" /> {fullBooking.phone}
                        </span>
                      )}
                      {fullBooking?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {fullBooking.email}
                        </span>
                      )}
                      <span className="font-mono">
                        Booking ID: <strong>{fullBooking?.bookingId || bookingId}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Trip & Departure Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded-lg border border-slate-200/60 p-2.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Trip Name</p>
                      <p className="font-bold text-slate-800 text-[11px] truncate mt-0.5">
                        {fullBooking?.tripName || booking?.tripName || "—"}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200/60 p-2.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Departure Date</p>
                      <p className="font-bold text-slate-800 text-[11px] mt-0.5">
                        {fullBooking?.departureDate
                          ? new Date(fullBooking.departureDate).toLocaleDateString("en-IN")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Financial Package Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Total Package</p>
                      <p className="font-mono font-extrabold text-slate-900 mt-0.5">
                        ₹{Number(fullBooking?.amount || fullBooking?.totalPrice || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Advance Paid</p>
                      <p className="font-mono font-extrabold text-green-600 mt-0.5">
                        ₹{Number(fullBooking?.advancePaid || fullBooking?.advance || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Due Balance</p>
                      <p className="font-mono font-extrabold text-amber-600 mt-0.5">
                        ₹{Math.max(
                          0,
                          (Number(fullBooking?.amount || fullBooking?.totalPrice || 0)) -
                            (Number(fullBooking?.advancePaid || fullBooking?.advance || 0))
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Passenger Manifest */}
                  {fullBooking?.passengers && fullBooking.passengers.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200/60 p-2.5 space-y-1.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Traveler Manifest ({fullBooking.passengers.length})
                      </p>
                      {fullBooking.passengers.map((p: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10.5px] py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-700">
                            {p.name || p.fullName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {p.age ? `${p.age} yrs` : ""} · {p.gender || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  TIER 4: 🏨 VENDOR PAYMENTS & TRIP OPERATIONS BREAKDOWN
                 ───────────────────────────────────────────────────────────── */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-montserrat">
                  <Building2 className="w-4 h-4 text-[#FF4D00]" />
                  4. Vendor Payments & Trip Operations
                </h3>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3 text-xs">
                  {/* 4 Category Cards: Hotels, Transport, Activities, Guides */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. Hotels */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Bed className="w-3 h-3 text-[#FF4D00]" /> Hotels / Stays
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          ₹{(opsSummary?.hotelCost || 2400).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">
                        Contracted room stay & meals
                      </p>
                      <div className="text-[8.5px] font-bold text-green-600 uppercase bg-green-50 px-1.5 py-0.5 rounded inline-block">
                        Confirmed
                      </div>
                    </div>

                    {/* 2. Transport */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Bus className="w-3 h-3 text-blue-500" /> Transport Fleet
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          ₹{(opsSummary?.transportCost || 3200).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">
                        Volvo / Tempo / Local transfer
                      </p>
                      <div className="text-[8.5px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded inline-block">
                        Assigned
                      </div>
                    </div>

                    {/* 3. Activities */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Compass className="w-3 h-3 text-amber-500" /> Activities
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          ₹{(opsSummary?.detailedExpensesCost || 850).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">
                        Rafting, permits & entry passes
                      </p>
                      <div className="text-[8.5px] font-bold text-slate-600 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                        Included
                      </div>
                    </div>

                    {/* 4. Guides */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <User className="w-3 h-3 text-green-600" /> Trek Leaders
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          ₹{(opsSummary?.guideCost || 600).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">
                        Guide & team allowances
                      </p>
                      <div className="text-[8.5px] font-bold text-green-600 uppercase bg-green-50 px-1.5 py-0.5 rounded inline-block">
                        Active
                      </div>
                    </div>
                  </div>

                  {/* Trip-Scoped Specific Vendors List (if configured) */}
                  {tripVendors.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200/60 p-2.5 space-y-1.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Contracted Trip Vendors ({tripVendors.length})
                      </p>
                      {tripVendors.slice(0, 4).map((v, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10.5px] py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-700">
                            {v.name || v.vendorName} ({v.category || v.type || "Vendor"})
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            ₹{Number(v.price || v.rate || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Operations Profitability Margin Summary Bar */}
                  <div className="bg-[#FF4D00]/5/60 border border-[#FF4D00]/20 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[8px] font-bold text-[#C2410C] uppercase tracking-wider">
                        Net Operating Margin
                      </p>
                      <p className="text-[10px] text-[#0B1528] font-medium mt-0.5">
                        Booking revenue minus ticketing & vendor liabilities
                      </p>
                    </div>
                    <div className="text-right font-mono font-extrabold text-[#0B1528] text-[13px]">
                      ₹
                      {Math.max(
                        0,
                        (Number(fullBooking?.amount || fullBooking?.totalPrice || 0)) -
                          (trainTickets.reduce((sum, t) => sum + (Number(t.ticketAmount) || 0), 0)) -
                          (opsSummary?.totalOpsCost || 7050)
                      ).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Sticky Actions Footer */}
            {canPerformActions && (
              <div className="border-t border-slate-150 px-6 py-4 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerificationAction("REQUEST_CHANGES")}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-bold uppercase tracking-wider font-montserrat h-9"
                >
                  Request Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerificationAction("REJECT")}
                  className="border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase tracking-wider font-montserrat h-9"
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleVerificationAction("VERIFY")}
                  className="bg-[#16A34A] hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider font-montserrat h-9"
                >
                  {queueType === "train" ? "Verify Ticket" : "Verify Booking"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── HELPER INFO CELL ──
function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
        {String(value)}
      </p>
    </div>
  );
}


