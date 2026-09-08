/**
 * TrainTicketsPanel.tsx
 * Ultra-simple train ticketing: Done / Not done / Not required.
 * Backend still receives full payloads; removed fields use existing or empty defaults.
 */
import React, { useState, useEffect } from "react";
import {
  Train,
  Plus,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  ChevronDown,
  Send,
  ArrowRight,
  Check,
  Phone,
  MoreHorizontal,
  Receipt,
  History,
} from "lucide-react";
import { normalizePassenger } from "@/utils/passengerUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  trainTicketService,
  type TrainTicket,
} from "@/services/trainTicket.service";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isGroupTrainTicketingDone,
  isTrainTicketDone,
  simpleTrainTicketStateLabel,
  simpleTrainTicketStateToApi,
  toSimpleTrainTicketState,
  trainTicketProgressLabel,
  trainTicketRequirementLabel,
  type SimpleTrainTicketState,
} from "@/utils/trainTicketStatusUi";

function StatusPill({ status }: { status: string }) {
  const s = (status || "PENDING").toUpperCase();
  if (s === "CANCELLED") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold border bg-red-50 text-red-700 border-red-200">
        Cancelled
      </span>
    );
  }
  const simple = toSimpleTrainTicketState({ ticketStatus: s });
  const label = simpleTrainTicketStateLabel(simple);
  const colorClass =
    simple === "DONE"
      ? "bg-green-50 text-green-700 border-green-200"
      : simple === "NOT_REQUIRED"
        ? "bg-slate-50 text-slate-600 border-slate-200"
        : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[9px] font-semibold border",
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

function RequirementPill({ booking }: { booking?: any }) {
  const req = trainTicketRequirementLabel(booking);
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border",
        req === "req"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-slate-50 text-slate-600 border-slate-200",
      )}
      title={
        req === "req"
          ? "Train ticket required (set at booking confirmation)"
          : "Train ticket not required (set at booking confirmation)"
      }
    >
      {req}
    </span>
  );
}

function TravellerCell({
  name,
  phone,
  ticketDone,
}: {
  name: string;
  phone?: string | null;
  ticketDone: boolean;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 border",
          ticketDone
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200",
        )}
        title={ticketDone ? "Done" : "Not done"}
      >
        <Train
          className={cn(
            "w-3.5 h-3.5",
            ticketDone ? "text-green-600" : "text-red-600",
          )}
        />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold text-[#0B1528] leading-tight truncate">
          {name || "—"}
        </div>
        {phone && phone !== "N/A" ? (
          <a
            href={`tel:${phone}`}
            className="text-[10px] font-normal font-mono text-slate-500 hover:text-[#FF4D00] hover:underline flex items-center gap-1 mt-0.5"
          >
            <Phone className="w-3 h-3 text-slate-400 shrink-0 inline" />
            <span>{phone}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ApprovalHint({ status }: { status?: string }) {
  const s = (status || "").toUpperCase();
  if (s === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700">
        <AlertTriangle className="w-2.5 h-2.5" />
        Awaiting approval
      </span>
    );
  }
  if (s === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-red-600">
        <XCircle className="w-2.5 h-2.5" />
        Rejected
      </span>
    );
  }
  return null;
}

/** Hidden fields kept for API compatibility — not shown in the form. */
type TicketFormPayload = {
  travelerName: string;
  passengerReference: "DEPARTURE" | "RETURN";
  pnr: string;
  trainName: string;
  trainNumber: string;
  journeyDate: string;
  sourceStation: string;
  destinationStation: string;
  coach: string;
  seatNumber: string;
  berthType: string;
  ticketAmount: string;
  paidBy: "COMPANY" | "CUSTOMER";
  amountMode: string;
  internalNote: string;
  ticketBookingPerson: string;
  simpleStatus: SimpleTrainTicketState;
};

const emptyForm = (
  defaultType: "DEPARTURE" | "RETURN" = "DEPARTURE",
): TicketFormPayload => ({
  travelerName: "",
  passengerReference: defaultType,
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
  paidBy: "COMPANY",
  amountMode: "PAYMENT_LINK",
  internalNote: "",
  ticketBookingPerson: "",
  simpleStatus: "NOT_DONE",
});

interface TrainTicketsPanelProps {
  bookingId: string;
  booking?: any;
  passengers?: any[];
  onCountChange?: (count: number) => void;
}

export default function TrainTicketsPanel({
  bookingId,
  booking,
  passengers = [],
  onCountChange,
}: TrainTicketsPanelProps) {
  const { admin } = useAuthStore();
  const role = admin?.role ?? "";

  const canApprove = [
    "superadmin",
    "admin",
    "operations",
    "BOOKING_VERIFIER",
  ].includes(role);
  const canManage = [
    "superadmin",
    "admin",
    "operations",
    "BOOKING_VERIFIER",
    "sales",
  ].includes(role);

  const [tickets, setTickets] = useState<TrainTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOriginalStatus, setEditingOriginalStatus] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<TicketFormPayload>(emptyForm("DEPARTURE"));
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [ticketToReject, setTicketToReject] = useState<TrainTicket | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState<TrainTicket | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRailwayCharge, setCancelRailwayCharge] = useState("0");
  const [cancelYcCharge, setCancelYcCharge] = useState("0");
  const [cancelNotes, setCancelNotes] = useState("");

  const [reticketModalOpen, setReticketModalOpen] = useState(false);
  const [ticketToReticket, setTicketToReticket] = useState<TrainTicket | null>(
    null,
  );
  const [reticketReason, setReticketReason] = useState("");
  const [reticketTrainName, setReticketTrainName] = useState("");
  const [reticketTrainNumber, setReticketTrainNumber] = useState("");
  const [reticketDate, setReticketDate] = useState("");
  const [reticketSource, setReticketSource] = useState("");
  const [reticketDest, setReticketDest] = useState("");
  const [reticketCoach, setReticketCoach] = useState("");
  const [reticketSeat, setReticketSeat] = useState("");
  const [reticketClass, setReticketClass] = useState("");
  const [reticketNewCost, setReticketNewCost] = useState("");
  const [reticketRailwayCharge, setReticketRailwayCharge] = useState("0");
  const [reticketYcCharge, setReticketYcCharge] = useState("0");
  const [reticketNotes, setReticketNotes] = useState("");

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [ticketForRefund, setTicketForRefund] = useState<TrainTicket | null>(
    null,
  );
  const [refundStatus, setRefundStatus] = useState("COMPLETED");
  const [refundTxRef, setRefundTxRef] = useState("");
  const [refundCustomAmount, setRefundCustomAmount] = useState("0");
  const [refundNotes, setRefundNotes] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [tripTemplate, setTripTemplate] = useState<any>(null);

  useEffect(() => {
    const tripId = booking?.tripId || booking?.tripRef?.id;
    if (tripId) {
      api
        .get(`/trips/${tripId}/train-template`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setTripTemplate(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [booking?.tripId, booking?.tripRef?.id]);

  const getMatchingLegTemplate = (
    journeyType: "DEPARTURE" | "RETURN",
    targetClass?: string,
  ) => {
    if (!tripTemplate) return null;
    let selectedTier = tripTemplate;
    const cls = (
      targetClass ||
      booking?.packageType ||
      booking?.travelClass ||
      ""
    ).toUpperCase();

    if (Array.isArray(tripTemplate.tiers) && tripTemplate.tiers.length > 0) {
      if (cls) {
        selectedTier =
          tripTemplate.tiers.find(
            (t: any) =>
              t.classCode?.toUpperCase() === cls ||
              (cls.includes("SLEEP") && t.classCode === "SL") ||
              (cls.includes("3A") && t.classCode === "3A") ||
              (cls.includes("2A") && t.classCode === "2A") ||
              (cls.includes("3E") && t.classCode === "3E") ||
              t.name?.toUpperCase().includes(cls),
          ) || tripTemplate.tiers[0];
      } else {
        selectedTier = tripTemplate.tiers[0];
      }
    }

    return journeyType === "RETURN"
      ? selectedTier?.returnJourney
      : selectedTier?.departureJourney;
  };

  const applyTemplateDefaults = (
    init: TicketFormPayload,
    journeyType: "DEPARTURE" | "RETURN",
  ) => {
    const tmpl = getMatchingLegTemplate(journeyType);
    if (tmpl) {
      init.sourceStation = tmpl.boardingStation || "";
      init.destinationStation = tmpl.destination || "";
      init.trainName = tmpl.trainName || "";
      init.trainNumber = tmpl.trainNumber || "";
      init.coach = tmpl.class || "";
      init.berthType = tmpl.quota || "";
      init.ticketAmount = tmpl.expectedCost ? String(tmpl.expectedCost) : "";
    }
    const dateSrc =
      journeyType === "RETURN" ? booking?.returnDate : booking?.departureDate;
    if (dateSrc) {
      init.journeyDate = new Date(dateSrc).toISOString().split("T")[0];
    }
    return init;
  };

  const handleSyncTemplate = async () => {
    setActionBusy(true);
    try {
      const res = await trainTicketService.syncTicketsWithTemplate(bookingId);
      toast.success(res.message || "Tickets synced with Trip Template!");
      loadTickets();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to sync tickets with template",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await trainTicketService.getTicketsByBooking(bookingId);
      setTickets(data || []);
      if (onCountChange) onCountChange(data.length);
    } catch (err: any) {
      console.error("Failed to load tickets", err);
      toast.error("Failed to load train tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) loadTickets();
  }, [bookingId]);

  const handleApproveTicket = async (t: TrainTicket) => {
    try {
      await trainTicketService.approveTicket(t.id);
      toast.success(`Ticket for ${t.travelerName} approved! ✓`);
      loadTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve ticket");
    }
  };

  const handleSubmitTicket = async (t: TrainTicket) => {
    try {
      await trainTicketService.submitTicket(t.id);
      toast.success(`Ticket for ${t.travelerName} submitted for approval`);
      loadTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit ticket");
    }
  };

  const handleOpenReject = (t: TrainTicket) => {
    setTicketToReject(t);
    setRejectionNotes("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!ticketToReject) return;
    setIsRejecting(true);
    try {
      await trainTicketService.rejectTicket(ticketToReject.id, rejectionNotes);
      toast.success(`Ticket for ${ticketToReject.travelerName} rejected`);
      setRejectModalOpen(false);
      setTicketToReject(null);
      loadTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject ticket");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReopenTicket = async (t: TrainTicket) => {
    try {
      await trainTicketService.reopenTicket(t.id, "Reopened for updates");
      toast.success(`Ticket for ${t.travelerName} reopened to draft status`);
      loadTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reopen ticket");
    }
  };

  const departureTickets = tickets.filter(
    (t) => t.passengerReference !== "RETURN",
  );
  const returnTickets = tickets.filter(
    (t) => t.passengerReference === "RETURN",
  );

  const getSimpleCounts = (ticketList: TrainTicket[]) => {
    let done = 0;
    let notDone = 0;
    let notRequired = 0;
    let cancelled = 0;
    ticketList.forEach((t) => {
      const st = (t.ticketStatus || "PENDING").toUpperCase();
      if (st === "CANCELLED") {
        cancelled++;
        return;
      }
      const simple = toSimpleTrainTicketState(t);
      if (simple === "DONE") done++;
      else if (simple === "NOT_REQUIRED") notRequired++;
      else notDone++;
    });
    return { done, notDone, notRequired, cancelled };
  };

  const getTravelerPhone = (travelerName: string) => {
    if (!passengers || passengers.length === 0) {
      if (
        booking?.fullName &&
        travelerName.toLowerCase().includes(booking.fullName.toLowerCase())
      ) {
        return booking?.mobile || booking?.phone || "";
      }
      return booking?.mobile || booking?.phone || "";
    }
    const match = passengers.find((p: any, idx: number) => {
      const normP = normalizePassenger(booking, p, idx);
      return (
        normP.name.toLowerCase().includes(travelerName.toLowerCase()) ||
        travelerName.toLowerCase().includes(normP.name.toLowerCase())
      );
    });
    if (match) {
      const normP = normalizePassenger(booking, match);
      return normP.phone || "";
    }
    return booking?.mobile || booking?.phone || "";
  };

  const groupSize = Math.max(
    passengers.length || 0,
    booking?.numberOfTravelers || 1,
    tickets.length || 1,
  );
  const depCounts = getSimpleCounts(departureTickets);
  const retCounts = getSimpleCounts(returnTickets);
  const requirementLabel = trainTicketRequirementLabel(booking);
  const groupTicketingDone = isGroupTrainTicketingDone(booking, tickets);

  const handleAutoGenerate = async () => {
    setActionBusy(true);
    try {
      const res = await trainTicketService.autoGenerateTickets(bookingId);
      toast.success(res.message || "Tickets auto-generated successfully");
      loadTickets();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to auto-generate tickets",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const buildApiPayload = () => {
    const ticketStatus = simpleTrainTicketStateToApi(
      form.simpleStatus,
      editingOriginalStatus,
    );
    return {
      travelerName: form.travelerName,
      passengerReference: form.passengerReference || "DEPARTURE",
      pnr: form.pnr || "",
      trainName: form.trainName || "",
      trainNumber: form.trainNumber || "",
      journeyDate: form.journeyDate || "",
      sourceStation: form.sourceStation || "",
      destinationStation: form.destinationStation || "",
      coach: form.coach || "",
      seatNumber: form.seatNumber || "",
      berthType: form.berthType || "",
      ticketAmount: parseFloat(form.ticketAmount) || 0,
      paidBy: form.paidBy || "COMPANY",
      amountMode: form.amountMode || "PAYMENT_LINK",
      internalNote: form.internalNote || "",
      ticketBookingPerson: form.ticketBookingPerson || "",
      ticketStatus,
    };
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.travelerName.trim()) {
      toast.error("Traveler name is required");
      return;
    }

    setActionBusy(true);
    try {
      const payload = buildApiPayload();
      if (editingId) {
        await trainTicketService.updateTicket(editingId, payload);
        toast.success("Ticket updated successfully");
      } else {
        await trainTicketService.createTicket(bookingId, payload);
        toast.success("Ticket created successfully");
      }
      setShowForm(false);
      setEditingId(null);
      setEditingOriginalStatus(null);
      setForm(emptyForm("DEPARTURE"));
      loadTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save ticket");
    } finally {
      setActionBusy(false);
    }
  };

  const seedTravelerName = (init: TicketFormPayload) => {
    if (passengers && passengers.length > 0) {
      const p = normalizePassenger(booking, passengers[0], 0);
      init.travelerName = p.name || booking?.fullName || "";
    } else {
      init.travelerName = booking?.fullName || booking?.name || "";
    }
    return init;
  };

  const handleOpenAddDeparture = () => {
    setEditingId(null);
    setEditingOriginalStatus(null);
    let init = emptyForm("DEPARTURE");
    init = applyTemplateDefaults(init, "DEPARTURE");
    init = seedTravelerName(init);
    setForm(init);
    setShowForm(true);
  };

  const handleOpenAddReturn = () => {
    setEditingId(null);
    setEditingOriginalStatus(null);
    let init = emptyForm("RETURN");
    init = applyTemplateDefaults(init, "RETURN");
    init = seedTravelerName(init);
    setForm(init);
    setShowForm(true);
  };

  const handleEdit = (ticket: TrainTicket) => {
    setEditingId(ticket.id);
    setEditingOriginalStatus(ticket.ticketStatus || "PENDING");
    setForm({
      travelerName: ticket.travelerName || "",
      passengerReference:
        (ticket.passengerReference as "DEPARTURE" | "RETURN") || "DEPARTURE",
      pnr: ticket.pnr || "",
      trainName: ticket.trainName || "",
      trainNumber: ticket.trainNumber || "",
      journeyDate: ticket.journeyDate
        ? new Date(ticket.journeyDate).toISOString().split("T")[0]
        : "",
      sourceStation: ticket.sourceStation || "",
      destinationStation: ticket.destinationStation || "",
      coach: ticket.coach || "",
      seatNumber: ticket.seatNumber || "",
      berthType: ticket.berthType || "",
      ticketAmount: ticket.ticketAmount ? String(ticket.ticketAmount) : "",
      paidBy: (ticket.paidBy as "COMPANY" | "CUSTOMER") || "COMPANY",
      amountMode: ticket.amountMode || "PAYMENT_LINK",
      internalNote: ticket.internalNote || "",
      ticketBookingPerson: ticket.ticketBookingPerson || "",
      simpleStatus: toSimpleTrainTicketState(ticket),
    });
    setShowForm(true);
  };

  const handleOpenCancel = (ticket: TrainTicket) => {
    setTicketToCancel(ticket);
    setCancelReason("");
    setCancelRailwayCharge(String(ticket.railwayCancellationCharge || 0));
    setCancelYcCharge(String(ticket.ycCancellationCharge || 0));
    setCancelNotes("");
    setCancelModalOpen(true);
  };

  const handleSubmitCancel = async () => {
    if (!ticketToCancel) return;
    if (!cancelReason.trim()) {
      toast.error("Please enter a cancellation reason");
      return;
    }
    setActionBusy(true);
    try {
      const rCharge = parseFloat(cancelRailwayCharge) || 0;
      const yCharge = parseFloat(cancelYcCharge) || 0;
      const origCost = Number(ticketToCancel.ticketAmount || 0);
      const calculatedRefund = Math.max(0, origCost - rCharge - yCharge);

      await trainTicketService.cancelTicket(ticketToCancel.id, {
        reason: cancelReason,
        railwayCancellationCharge: rCharge,
        ycCancellationCharge: yCharge,
        refundAmount: calculatedRefund,
        notes: cancelNotes,
      });
      toast.success("Ticket cancelled and refund recorded");
      setCancelModalOpen(false);
      setTicketToCancel(null);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel ticket");
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenReticket = (ticket: TrainTicket) => {
    setTicketToReticket(ticket);
    setReticketReason("Reticketing / Schedule Change");
    setReticketTrainName(ticket.trainName || "");
    setReticketTrainNumber(ticket.trainNumber || "");
    setReticketDate(
      ticket.journeyDate
        ? new Date(ticket.journeyDate).toISOString().split("T")[0]
        : "",
    );
    setReticketSource(ticket.sourceStation || "");
    setReticketDest(ticket.destinationStation || "");
    setReticketCoach(ticket.coach || "");
    setReticketSeat("");
    setReticketClass(ticket.berthType || "");
    setReticketNewCost(ticket.ticketAmount ? String(ticket.ticketAmount) : "");
    setReticketRailwayCharge("0");
    setReticketYcCharge("0");
    setReticketNotes("");
    setReticketModalOpen(true);
  };

  const handleSubmitReticket = async () => {
    if (!ticketToReticket) return;
    setActionBusy(true);
    try {
      await trainTicketService.rebookTicket(ticketToReticket.id, {
        reason: reticketReason,
        newTrainName: reticketTrainName,
        newTrainNumber: reticketTrainNumber,
        newJourneyDate: reticketDate,
        newSource: reticketSource,
        newDestination: reticketDest,
        newCoach: reticketCoach,
        newSeat: reticketSeat,
        newClass: reticketClass,
        newTicketAmount: parseFloat(reticketNewCost) || 0,
        railwayCancellationCharge: parseFloat(reticketRailwayCharge) || 0,
        ycCancellationCharge: parseFloat(reticketYcCharge) || 0,
        notes: reticketNotes,
      });
      toast.success("Ticket reticketed successfully");
      setReticketModalOpen(false);
      setTicketToReticket(null);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reticket");
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenRefund = (ticket: TrainTicket) => {
    setTicketForRefund(ticket);
    setRefundStatus("COMPLETED");
    setRefundTxRef(ticket.refundTransactionRef || "");
    setRefundCustomAmount(String(ticket.refundAmount || 0));
    setRefundNotes("");
    setRefundModalOpen(true);
  };

  const handleSubmitRefund = async () => {
    if (!ticketForRefund) return;
    setActionBusy(true);
    try {
      await trainTicketService.recordRefund(ticketForRefund.id, {
        refundStatus,
        transactionRef: refundTxRef,
        amount: parseFloat(refundCustomAmount) || 0,
        notes: refundNotes,
      });
      toast.success("Refund status updated in Finance");
      setRefundModalOpen(false);
      setTicketForRefund(null);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record refund");
    } finally {
      setActionBusy(false);
    }
  };

  const handleViewHistory = async (ticketId: string) => {
    setHistoryLoading(true);
    setHistoryModalOpen(true);
    try {
      const hist = await trainTicketService.getTicketHistory(ticketId);
      setTicketHistory(hist || []);
    } catch (err) {
      toast.error("Failed to load ticket history");
      setTicketHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderTicketRow = (t: TrainTicket) => {
    const ticketDone =
      requirementLabel === "non-req" || isTrainTicketDone(t);
    const approval = (t.approvalStatus || "").toUpperCase();

    return (
      <tr key={t.id} className="hover:bg-[#F8FAFC]">
        <td className="px-4 py-2.5">
          <TravellerCell
            name={t.travelerName}
            phone={getTravelerPhone(t.travelerName)}
            ticketDone={ticketDone}
          />
        </td>
        <td className="px-4 py-2.5 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusPill status={t.ticketStatus} />
          </div>
          <ApprovalHint status={t.approvalStatus} />
          {t.ticketStatus === "CANCELLED" && (
            <div className="text-[10px] text-red-600 font-semibold space-y-0.5">
              <div>Cancelled: {t.cancellationReason || "No reason"}</div>
              {Number(t.refundAmount || 0) > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-semibold text-green-700">
                    Refund: ₹{Number(t.refundAmount)}
                  </span>
                  <span
                    className={cn(
                      "px-1 py-0.2 rounded text-[8px] font-semibold uppercase",
                      t.refundStatus === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {t.refundStatus || "PENDING"}
                  </span>
                </div>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 text-right whitespace-nowrap">
          {canManage && (
            <div className="inline-flex items-center justify-end gap-1">
              {t.ticketStatus !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => handleEdit(t)}
                  className="text-blue-600 hover:underline font-semibold text-[10px] px-1.5 py-0.5"
                >
                  Edit
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-500 hover:text-[#0B1528]"
                    title="More actions"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canApprove && approval === "SUBMITTED" ? (
                    <>
                      <DropdownMenuItem onClick={() => handleApproveTicket(t)}>
                        <Check className="w-3.5 h-3.5 mr-2" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenReject(t)}>
                        <Ban className="w-3.5 h-3.5 mr-2" /> Reject
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  {(approval === "DRAFT" || !t.approvalStatus) && (
                    <DropdownMenuItem onClick={() => handleSubmitTicket(t)}>
                      <Send className="w-3.5 h-3.5 mr-2" /> Submit for approval
                    </DropdownMenuItem>
                  )}
                  {approval === "REJECTED" && (
                    <DropdownMenuItem onClick={() => handleReopenTicket(t)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reopen
                    </DropdownMenuItem>
                  )}
                  {t.ticketStatus !== "CANCELLED" && (
                    <>
                      <DropdownMenuItem onClick={() => handleOpenReticket(t)}>
                        Reticket
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleOpenCancel(t)}
                        className="text-red-600 focus:text-red-600"
                      >
                        Cancel ticket
                      </DropdownMenuItem>
                    </>
                  )}
                  {t.ticketStatus === "CANCELLED" &&
                    Number(t.refundAmount || 0) > 0 &&
                    t.refundStatus !== "COMPLETED" && (
                      <DropdownMenuItem onClick={() => handleOpenRefund(t)}>
                        Record refund
                      </DropdownMenuItem>
                    )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewHistory(t.id)}>
                    <History className="w-3.5 h-3.5 mr-2" /> History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </td>
      </tr>
    );
  };

  const renderJourneySection = (
    title: string,
    icon: React.ReactNode,
    journeyTickets: TrainTicket[],
    onAdd: () => void,
    addLabel: string,
    emptyLabel: string,
  ) => (
    <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b border-[#E8EEF4] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h4 className="font-semibold text-[#0B1528] text-xs truncate">
            {title}
          </h4>
          <span className="text-[11px] text-slate-400 shrink-0">
            {journeyTickets.length} tickets
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="h-8 text-xs font-semibold border-[#E8EEF4] text-[#0B1528] bg-white hover:bg-[#F4F7FB] gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-slate-400" /> {addLabel}
        </Button>
      </div>

      {journeyTickets.length === 0 ? (
        <div className="px-4 py-6 text-center text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E8EEF4] text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                <th className="px-4 py-2.5">Traveller</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF4]">
              {journeyTickets.map(renderTicketRow)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSimpleCountBadges = (counts: ReturnType<typeof getSimpleCounts>) => (
    <div className="flex flex-wrap gap-1.5">
      <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[11px] font-semibold">
        {counts.done} done
      </span>
      <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[11px] font-semibold">
        {counts.notDone} not done
      </span>
      {counts.notRequired > 0 ? (
        <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
          {counts.notRequired} not required
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3 text-xs min-w-0">
      <div className="bg-white border border-[#E8EEF4] rounded-xl shadow-sm overflow-hidden min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F8FAFC] border-b border-[#E8EEF4]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 border",
                groupTicketingDone
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200",
              )}
              title={
                groupTicketingDone
                  ? "Ticketing done / not required"
                  : "Not done"
              }
            >
              <Train
                className={cn(
                  "w-3.5 h-3.5",
                  groupTicketingDone ? "text-green-600" : "text-red-600",
                )}
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-semibold text-xs text-[#0B1528]">
                  Group ticketing summary
                </h3>
                <RequirementPill booking={booking} />
              </div>
              <p className="text-[11px] text-slate-500">
                Group size:{" "}
                <span className="font-semibold text-[#0B1528]">
                  {groupSize} travellers
                </span>
                {!groupTicketingDone && requirementLabel === "req" ? (
                  <span className="text-red-600 font-medium"> · Not done</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-semibold text-slate-600 hover:text-[#0B1528] hover:bg-[#E8EEF4]/70 gap-1.5"
                >
                  More
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                >
                  {isSummaryExpanded
                    ? "Collapse passenger matrix"
                    : "Expand passenger matrix"}
                </DropdownMenuItem>
                {canManage ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={actionBusy}
                      onClick={handleSyncTemplate}
                    >
                      Sync trip template
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={actionBusy}
                      onClick={handleAutoGenerate}
                    >
                      Auto-generate tickets
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            {canManage && (
              <Button
                size="sm"
                onClick={handleOpenAddDeparture}
                className="h-8 text-xs font-semibold bg-[#FF4D00] hover:bg-[#E04400] text-white gap-1.5 cursor-pointer shadow-sm shadow-[#FF4D00]/20"
              >
                <Plus className="w-3.5 h-3.5" /> Add ticket
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EEF4] space-y-2 min-w-0">
            <div className="flex justify-between items-center gap-2 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 truncate text-[#0B1528]">
                <ArrowRight className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                Departure journey
              </span>
              <span className="shrink-0 text-slate-500">
                {departureTickets.length} tickets
              </span>
            </div>
            {renderSimpleCountBadges(depCounts)}
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E8EEF4] space-y-2 min-w-0">
            <div className="flex justify-between items-center gap-2 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 truncate text-[#0B1528]">
                <RotateCcw className="w-3.5 h-3.5 text-[#0B1528]/50 shrink-0" />
                Return journey
              </span>
              <span className="shrink-0 text-slate-500">
                {returnTickets.length} tickets
              </span>
            </div>
            {renderSimpleCountBadges(retCounts)}
          </div>
        </div>

        {isSummaryExpanded && (
          <div className="border-t border-[#E8EEF4] px-4 py-3 overflow-x-auto min-w-0">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-400 uppercase border-b border-[#E8EEF4] text-[9px] font-semibold">
                  <th className="py-1.5 px-2">Passenger</th>
                  <th className="py-1.5 px-2">Departure</th>
                  <th className="py-1.5 px-2">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF4] text-slate-700">
                {(passengers.length > 0
                  ? passengers
                  : [{ name: booking?.fullName || "Lead Passenger" }]
                ).map((p: any, idx: number) => {
                  const pName = p.name || `Passenger ${idx + 1}`;
                  const depT = departureTickets.find(
                    (t) =>
                      t.travelerName
                        .toLowerCase()
                        .includes(pName.toLowerCase()) ||
                      pName
                        .toLowerCase()
                        .includes(t.travelerName.toLowerCase()),
                  );
                  const retT = returnTickets.find(
                    (t) =>
                      t.travelerName
                        .toLowerCase()
                        .includes(pName.toLowerCase()) ||
                      pName
                        .toLowerCase()
                        .includes(t.travelerName.toLowerCase()),
                  );

                  return (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-2 font-semibold text-[#0B1528]">
                        <div className="flex items-center gap-2">
                          <Train
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              requirementLabel === "non-req" ||
                                (isTrainTicketDone(depT) &&
                                  (!retT || isTrainTicketDone(retT)))
                                ? "text-green-600"
                                : "text-red-600",
                            )}
                          />
                          <div>
                            <div className="text-xs font-bold text-[#0B1528]">
                              {pName}
                            </div>
                            {(() => {
                              const phone = getTravelerPhone(pName);
                              if (!phone || phone === "N/A") return null;
                              return (
                                <span className="block text-[9.5px] font-normal font-mono text-slate-500">
                                  {phone}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {depT ? (
                          <StatusPill status={depT.ticketStatus} />
                        ) : (
                          <span className="text-slate-400 italic">
                            Not issued
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {retT ? (
                          <StatusPill status={retT.ticketStatus} />
                        ) : (
                          <span className="text-slate-400 italic">
                            Not issued
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit — traveler + Done / Not done / Not required only */}
      {showForm && (
        <form
          onSubmit={handleSaveTicket}
          className="p-4 bg-slate-50 border border-[#E8EEF4] rounded-xl space-y-3"
        >
          <div className="flex justify-between items-center border-b border-[#E8EEF4] pb-2 flex-wrap gap-2">
            <h4 className="font-semibold text-[#0B1528] text-xs">
              {editingId ? "Edit train ticket" : "Add train ticket"}
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setEditingOriginalStatus(null);
              }}
              className="h-6 text-[10px]"
            >
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] font-semibold uppercase text-slate-500">
                Traveler
              </label>
              <Input
                required
                value={form.travelerName}
                onChange={(e) =>
                  setForm({ ...form, travelerName: e.target.value })
                }
                placeholder="Full name"
                className="h-8 text-xs"
                readOnly={Boolean(editingId)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] font-semibold uppercase text-slate-500">
                Ticket status
              </label>
              <Select
                value={form.simpleStatus}
                onValueChange={(val: SimpleTrainTicketState) =>
                  setForm({ ...form, simpleStatus: val })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_DONE">Not done</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="NOT_REQUIRED">Not required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setEditingOriginalStatus(null);
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionBusy}
              size="sm"
              className="h-8 text-xs bg-slate-900 text-white font-semibold"
            >
              {actionBusy
                ? "Saving..."
                : editingId
                  ? "Update"
                  : "Save"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {renderJourneySection(
          "Departure journey",
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
          departureTickets,
          handleOpenAddDeparture,
          "Add departure ticket",
          "No departure tickets created yet.",
        )}
        {renderJourneySection(
          "Return journey",
          <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
          returnTickets,
          handleOpenAddReturn,
          "Add return ticket",
          "No return tickets created yet.",
        )}
      </div>

      {/* Advanced ops dialogs (overflow menu only) */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-600" /> Cancel Train Ticket
            </DialogTitle>
          </DialogHeader>
          {ticketToCancel && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-[#E8EEF4] space-y-1">
                <div className="font-semibold text-[#0B1528]">
                  {ticketToCancel.travelerName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {trainTicketProgressLabel(ticketToCancel)}
                  {Number(ticketToCancel.ticketAmount || 0) > 0
                    ? ` · ₹${Number(ticketToCancel.ticketAmount).toLocaleString("en-IN")}`
                    : ""}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase text-slate-500">
                    Railway Cancellation Fee (₹)
                  </label>
                  <Input
                    type="number"
                    value={cancelRailwayCharge}
                    onChange={(e) => setCancelRailwayCharge(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold text-red-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase text-slate-500">
                    YC Cancellation Fee (₹)
                  </label>
                  <Input
                    type="number"
                    value={cancelYcCharge}
                    onChange={(e) => setCancelYcCharge(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-green-50 border border-green-200 rounded flex justify-between items-center">
                <span className="font-semibold text-green-700 text-[11px]">
                  Net Refund Due / Credit:
                </span>
                <span className="font-semibold text-sm text-green-700 font-mono">
                  ₹
                  {Math.max(
                    0,
                    Number(ticketToCancel.ticketAmount || 0) -
                      (parseFloat(cancelRailwayCharge) || 0) -
                      (parseFloat(cancelYcCharge) || 0),
                  ).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Cancellation Reason *
                </label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested date change"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Internal Notes
                </label>
                <Textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              className="h-8 text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={actionBusy || !cancelReason.trim()}
              onClick={handleSubmitCancel}
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-600 text-white font-semibold"
            >
              {actionBusy ? "Processing..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reticketModalOpen} onOpenChange={setReticketModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-600" /> Reticket Passenger
            </DialogTitle>
          </DialogHeader>
          {ticketToReticket && (
            <div className="space-y-3 py-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="bg-slate-50 p-2.5 rounded border border-[#E8EEF4]">
                <div className="font-semibold text-[#0B1528]">
                  {ticketToReticket.travelerName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase text-slate-500">
                    Old Railway Deduction (₹)
                  </label>
                  <Input
                    type="number"
                    value={reticketRailwayCharge}
                    onChange={(e) => setReticketRailwayCharge(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold text-red-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase text-slate-500">
                    New Ticket Fare / Cost (₹)
                  </label>
                  <Input
                    type="number"
                    value={reticketNewCost}
                    onChange={(e) => setReticketNewCost(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold text-green-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Reason for Reticketing
                </label>
                <Input
                  value={reticketReason}
                  onChange={(e) => setReticketReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReticketModalOpen(false)}
              className="h-8 text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={actionBusy}
              onClick={handleSubmitReticket}
              size="sm"
              className="h-8 text-xs bg-[#FF4D00] hover:bg-[#FF4D00] text-white font-semibold"
            >
              {actionBusy ? "Rebooking..." : "Create Rebooked Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-green-600" /> Record Refund
            </DialogTitle>
          </DialogHeader>
          {ticketForRefund && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-[#E8EEF4]">
                <div className="font-semibold text-[#0B1528]">
                  {ticketForRefund.travelerName}
                </div>
                <div className="flex justify-between font-semibold text-green-700 mt-1">
                  <span>Refund Due:</span>
                  <span>
                    ₹
                    {Number(ticketForRefund.refundAmount || 0).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Refund Status *
                </label>
                <Select value={refundStatus} onValueChange={setRefundStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="INITIATED">INITIATED</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Transaction / UTR Reference
                </label>
                <Input
                  value={refundTxRef}
                  onChange={(e) => setRefundTxRef(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Confirmed Refund Amount (₹)
                </label>
                <Input
                  type="number"
                  value={refundCustomAmount}
                  onChange={(e) => setRefundCustomAmount(e.target.value)}
                  className="h-8 text-xs font-mono font-semibold text-green-700"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={actionBusy}
              onClick={handleSubmitRefund}
              size="sm"
              className="h-8 text-xs bg-green-600 hover:bg-green-600 text-white font-semibold"
            >
              {actionBusy ? "Saving..." : "Save Refund Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" /> Ticket Audit History
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto space-y-2 text-xs">
            {historyLoading ? (
              <div className="py-8 text-center text-slate-400">
                Loading audit history...
              </div>
            ) : ticketHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic">
                No history logged yet.
              </div>
            ) : (
              ticketHistory.map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-50 border border-[#E8EEF4] rounded space-y-1"
                >
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[#0B1528]">
                      {item.action}
                    </span>
                    <span className="text-slate-400">
                      {new Date(item.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-slate-700">{item.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryModalOpen(false)}
              className="h-8 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-[#0B1528] flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-600" /> Reject Train Ticket
            </DialogTitle>
          </DialogHeader>
          {ticketToReject && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-red-50 border border-red-200 p-2.5 rounded text-red-900">
                <div className="font-semibold">{ticketToReject.travelerName}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  Reason for Rejection *
                </label>
                <Textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Why is this ticket being rejected?"
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isRejecting || !rejectionNotes.trim()}
              onClick={handleConfirmReject}
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-600 text-white font-semibold"
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
