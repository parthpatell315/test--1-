import {
  RotateCw,
  Users,
  CreditCard,
  FileText,
  Train,
  CheckSquare,
  ClipboardList,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, safeFormatDate, formatBookingCreatedAt } from "@/lib/utils";
import { normalizePassenger } from "@/utils/passengerUtils";
import {
  bookingListDueAmount,
  bookingListPaidAmount,
} from "@/utils/bookingListFinance";
import type { Booking, Admin } from "@/types";
import type { Dispatch, SetStateAction } from "react";

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  selectedIds: string[];
  selectAll: () => void;
  toggleSelect: (id: string) => void;
  onPreview: (b: Booking) => void;
  onOpenDetails: (b: Booking, tab?: string) => void;
  onDelete: (id: string) => void;
  currentAdmin: Admin | null | undefined;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  setPage: Dispatch<SetStateAction<number>>;
  onPageSizeChange: (size: number) => void;
  getDays: (b: Booking) => number;
  getProgress: (b: Booking) => number;
  getNextAction: (b: Booking) => string;
  getFlowStatus: (b: Booking) => string;
  getActivityTime: (b: Booking) => string;
  getBookedBy: (b: Booking) => string;
}

const iconBtn =
  "relative h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-[#0B1528] hover:bg-slate-50 transition-colors";

export function BookingsTable({
  bookings,
  loading,
  selectedIds,
  selectAll,
  toggleSelect,
  onPreview,
  onOpenDetails,
  onDelete,
  currentAdmin,
  page,
  pageSize,
  totalCount,
  totalPages,
  setPage,
  onPageSizeChange,
  getDays,
  getProgress,
  getNextAction,
  getFlowStatus,
  getActivityTime,
  getBookedBy,
}: BookingsTableProps) {
  const role = (currentAdmin?.role || "admin").toLowerCase();
  const isFounder =
    role === "superadmin" ||
    role === "founder" ||
    role === "owner" ||
    (currentAdmin?.designation || "").toLowerCase().includes("founder") ||
    (currentAdmin?.name || "").toLowerCase().includes("founder") ||
    (currentAdmin?.email || "").toLowerCase().includes("founder");

  return (
    <div className="hidden md:flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 py-10 font-semibold">
            <RotateCw className="w-4 h-4 animate-spin mr-2" /> Loading bookings…
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-700 text-sm mb-1">No bookings found</h3>
            <p className="text-slate-400 text-xs max-w-sm">Nothing matches this queue or search.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-[12px] border-collapse bg-white">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-[#E8EEF4] text-slate-400">
                  <th className="pl-4 pr-2 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-[#0B1528] focus:ring-[#FF4D00] cursor-pointer"
                      checked={selectedIds.length === bookings.length && bookings.length > 0}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">Guest</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">Trip</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">Executive</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right">Payment</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const isSelected = selectedIds.includes(b.id);
                  const days = getDays(b);
                  const progress = getProgress(b);
                  const nextAction = getNextAction(b);
                  const flowStatus = getFlowStatus(b);
                  const activityTime = getActivityTime(b);
                  const bookedBy = getBookedBy(b);
                  const listDue = bookingListDueAmount(b);
                  const listPaid = bookingListPaidAmount(b);
                  const dueSoon =
                    listDue > 0 &&
                    b.departureDate &&
                    (new Date(b.departureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 3;

                  let paymentDot: "red" | "amber" | undefined;
                  if (listDue > 0 && b.paymentStatus !== "Paid") {
                    paymentDot = dueSoon ? "red" : "amber";
                  }
                  const passengersDot = !b.numberOfTravelers ? "amber" : undefined;
                  const passengerCount = Array.isArray(b.passengers)
                    ? b.passengers.length
                    : Array.isArray((b.passengers as any)?.details)
                      ? (b.passengers as any).details.length
                      : 0;
                  const documentsDot = passengerCount < (b.numberOfTravelers || 0) ? "red" : undefined;
                  const ticketingDot =
                    b.trainTicketStatus === "Pending" || b.trainTicketStatus === "Waitlisted"
                      ? "amber"
                      : undefined;
                  const operationsDot = b.status === "confirmed" && progress < 85 ? "red" : undefined;
                  const checklistDot = progress === 100 ? "green" : undefined;
                  const notesDot = b.notes?.includes("[Task Assigned") ? "blue" : undefined;

                  return (
                    <tr
                      key={b.id}
                      className={cn(
                        "hover:bg-[#F8FAFC] border-b border-[#F1F5F9] cursor-pointer",
                        isSelected && "bg-[#FF4D00]/5/40",
                      )}
                      onClick={() => onPreview(b)}
                    >
                      <td className="pl-4 pr-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-[#0B1528] focus:ring-[#FF4D00] cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(b.id)}
                        />
                      </td>
                      <td className="px-3 py-3 min-w-[180px]">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-1 w-[3px] h-8 rounded-full shrink-0",
                              (b.status === "confirmed" && progress < 85) || dueSoon
                                ? "bg-[#dc2626]"
                                : b.status === "pending"
                                  ? "bg-[#d97706]"
                                  : b.status === "confirmed" && progress < 100
                                    ? "bg-[#2563eb]"
                                    : progress === 100
                                      ? "bg-[#16a34a]"
                                      : "bg-[#94a3b8]",
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0B1528] truncate leading-tight">{b.fullName}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {b.bookingId ? `# ${b.bookingId}` : ""}
                              {b.bookingId && b.mobile ? " · " : ""}
                              {b.mobile}
                              {normalizePassenger(b).formattedAgeGender
                                ? ` · ${normalizePassenger(b).formattedAgeGender}`
                                : ""}
                            </p>
                            {b.createdAt && (
                              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                {formatBookingCreatedAt(b.createdAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 min-w-[160px]">
                        <p className="font-semibold text-[#0B1528] truncate leading-tight">
                          {b.tripId || b.tripName}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {safeFormatDate(b.departureDate, { day: "2-digit", month: "short" }, "No date")}
                          {" · "}
                          {days}d · {b.numberOfTravelers || 1} pax
                          {b.trainClass ? ` · ${b.trainClass}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600 truncate max-w-[140px]" title={bookedBy}>
                        {bookedBy}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                        <p
                          className={cn(
                            "font-semibold leading-tight",
                            listDue > 0 ? "text-[#E04400]" : "text-green-600",
                          )}
                        >
                          ₹{listDue.toLocaleString("en-IN")}
                          <span className="ml-1 text-[10px] font-medium text-slate-400">due</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          ₹{listPaid.toLocaleString("en-IN")} in
                        </p>
                      </td>
                      <td className="px-3 py-3 min-w-[140px]">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold",
                            flowStatus === "Confirmed"
                              ? "bg-green-50 text-green-700"
                              : flowStatus === "Completed"
                                ? "bg-green-50 text-green-700"
                                : flowStatus === "Cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700",
                          )}
                        >
                          {flowStatus}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 truncate" title={nextAction}>
                          {nextAction}
                          {activityTime ? ` · ${activityTime}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <button className={iconBtn} title="Payment" onClick={() => onOpenDetails(b, "payments")}>
                            <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {paymentDot && (
                              <span className={cn("absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full", paymentDot === "red" ? "bg-[#dc2626]" : "bg-[#d97706]")} />
                            )}
                          </button>
                          <button className={iconBtn} title="Passengers" onClick={() => onOpenDetails(b, "passengers")}>
                            <Users className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {passengersDot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#d97706]" />}
                          </button>
                          <button className={iconBtn} title="Documents" onClick={() => onOpenDetails(b, "files")}>
                            <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {documentsDot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#dc2626]" />}
                          </button>
                          <button className={iconBtn} title="Tickets" onClick={() => onOpenDetails(b, "ticketing")}>
                            <Train className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {ticketingDot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#d97706]" />}
                          </button>
                          <button className={iconBtn} title="Operations" onClick={() => onOpenDetails(b, "operations")}>
                            <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {operationsDot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#dc2626]" />}
                          </button>
                          <button className={iconBtn} title="Checklist" onClick={() => onOpenDetails(b, "verification")}>
                            <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {checklistDot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#16a34a]" />}
                          </button>
                          <button className={iconBtn} title="Notes" onClick={() => onOpenDetails(b, "notes")}>
                            <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {notesDot && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#2563eb]" />}
                          </button>
                          {isFounder && (
                            <button
                              className="relative h-7 w-7 rounded-md flex items-center justify-center text-red-600 hover:bg-red-50"
                              title="Delete booking"
                              onClick={() => onDelete(b.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-[#E8EEF4] px-4 py-2 bg-white text-[12px] shrink-0">
          <p className="text-slate-400 font-medium">
            {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 bg-white border border-[#E8EEF4] rounded-md px-2 text-slate-600"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 w-8 rounded-md border-[#E8EEF4]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 w-8 rounded-md border-[#E8EEF4]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

