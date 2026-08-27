import React from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { NormalizedPassenger } from "@/utils/passengerUtils";
import { cn } from "@/lib/utils";

interface PassengerTimelineProps {
  passenger: NormalizedPassenger;
  booking: any;
  activeStep?: number;
  onSelectStep?: (index: number) => void;
}

export function PassengerTimeline({
  passenger,
  booking,
  activeStep,
  onSelectStep,
}: PassengerTimelineProps) {
  // Determine statuses for timeline
  const directId =
    passenger.aadhaar ||
    (passenger as any).idProof ||
    (passenger as any).idProofUrl;

  const hasDocs = Boolean(
    (passenger.documents && passenger.documents.length > 0) ||
      (directId && typeof directId === "string" && (directId.startsWith("http") || directId.startsWith("/"))),
  );

  const paymentCompleted = Boolean(
    booking?.paymentStatus === "Paid" ||
      booking?.paymentStatus === "Completed" ||
      booking?.payment_status === "completed" ||
      (booking?.remainingAmount !== undefined && booking.remainingAmount <= 0),
  );

  // Train requirement check (Requirements 2)
  const isTrainRequired = Boolean(
    booking?.trainTicketRequired !== false &&
      booking?.trainTicketStatus !== "NOT_REQUIRED" &&
      booking?.trainTicketStatus !== "NOT_BOOKED",
  );

  const hasTrainTicket = Boolean(
    (passenger.trainDetails && passenger.trainDetails.trim() !== "") ||
      (booking?.trainTickets &&
        booking.trainTickets.some(
          (t: any) =>
            t.ticketStatus === "CONFIRMED" || t.ticketStatus === "BOOKED",
        )),
  );

  const trainCompleted = !isTrainRequired || hasTrainTicket;

  // Sharing requirement check (Requirement 4)
  const roomSharingVal = (passenger.roomSharing || "").toLowerCase();
  const isSingleSharing = roomSharingVal.includes("single");
  const isSharingWithSet = Boolean(passenger.sharingWith && passenger.sharingWith.trim() !== "");
  const roomPlanned = Boolean(
    isSingleSharing || (roomSharingVal && isSharingWithSet),
  );

  const transportAllocated = Boolean(
    (passenger.tempoAllocation && passenger.tempoAllocation.trim() !== "") ||
      (passenger.seatNumber && passenger.seatNumber.trim() !== "") ||
      (booking?.opsVehicleAllocations &&
        booking.opsVehicleAllocations.length > 0),
  );

  const guideAssigned = Boolean(
    booking?.tripRef?.guideAssignments?.length > 0 ||
      booking?.guideName ||
      booking?.trip?.vendors?.some((v: any) => v.vendorType === "guide"),
  );

  const isBookingConfirmed =
    booking?.status === "confirmed" || booking?.status === "Confirmed";

  // Derived readiness calculation (Requirements 11)
  const isDepartureReady =
    isBookingConfirmed &&
    paymentCompleted &&
    hasDocs &&
    trainCompleted &&
    transportAllocated;

  const missingRequirements: string[] = [];
  if (!isBookingConfirmed) missingRequirements.push("Booking Confirmation");
  if (!paymentCompleted) missingRequirements.push("Payment Settlement");
  if (!hasDocs) missingRequirements.push("ID Proof / Documents");
  if (!trainCompleted) missingRequirements.push("Train Ticket Confirmation");
  if (!roomPlanned) missingRequirements.push("Sharing Allocation");
  if (!transportAllocated) missingRequirements.push("Transport Allocation");

  const steps = [
    { label: "Booking", completed: isBookingConfirmed, actionRequired: !isBookingConfirmed, key: "booking" },
    { label: "Docs", completed: hasDocs, actionRequired: !hasDocs, key: "docs" },
    { label: "Payment", completed: paymentCompleted, actionRequired: !paymentCompleted, key: "payment" },
    { label: "Train", completed: trainCompleted, actionRequired: !trainCompleted, key: "train" },
    { label: "Sharing", completed: roomPlanned, actionRequired: !roomPlanned, key: "sharing" },
    { label: "Transport", completed: transportAllocated, actionRequired: !transportAllocated, key: "transport" },
    { label: "Guide", completed: guideAssigned, actionRequired: !guideAssigned, key: "guide" },
    {
      label: "Departure",
      completed: isDepartureReady,
      actionRequired: !isDepartureReady,
      key: "departure",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.min(
    100,
    (completedCount / (steps.length - 1)) * 100,
  );

  return (
    <div className="w-full space-y-3">
      <div className="-mx-1 overflow-x-auto scrollbar-none px-1">
        <div className="relative flex min-w-[430px] items-start justify-between gap-1 pt-1">
          <div className="absolute left-4 right-4 top-3.5 h-[3px] rounded-full bg-[#E8EEF4]" />
          <div
            className="absolute left-4 top-3.5 h-[3px] rounded-full bg-green-600/80 transition-all duration-500 ease-in-out"
            style={{ width: `calc((100% - 2rem) * ${progressPct} / 100)` }}
          />

          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            const stateText = step.completed
              ? "Complete"
              : step.actionRequired
                ? "Action required"
                : "Pending";
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectStep && onSelectStep(idx)}
                className="relative z-10 flex flex-1 min-w-[48px] cursor-pointer flex-col items-center gap-2 focus:outline-none"
                title={`${step.label}: ${stateText}`}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white transition-all",
                    isActive && "ring-2 ring-[#FF4D00]/40 ring-offset-2",
                    step.completed
                      ? "border-green-500/70 text-green-600"
                      : step.actionRequired
                        ? "border-[#FF4D00]/45 bg-[#FF4D00]/[0.07] text-[#FF4D00]"
                        : "border-[#E8EEF4] text-slate-300",
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : step.actionRequired ? (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 shrink-0 fill-slate-100" />
                  )}
                </span>

                <span
                  className={cn(
                    "whitespace-nowrap text-center text-[10px] leading-none transition-colors",
                    isActive
                      ? "font-semibold text-[#FF4D00]"
                      : step.completed
                        ? "font-medium text-green-700"
                        : step.actionRequired
                          ? "font-semibold text-[#9A3412]"
                          : "font-medium text-slate-400",
                  )}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Derived Readiness Badge Banner (Shown only when no specific step detail is open) */}
      {activeStep === undefined && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3 py-2",
            isDepartureReady
              ? "border-green-200 bg-green-50/70"
              : "border-[#FF4D00]/20 bg-[#FF4D00]/[0.06]",
          )}
        >
          <div className="flex items-center gap-2">
            {isDepartureReady ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#FF4D00]" />
            )}
            <span className="text-[11px] font-medium text-slate-500">
              Departure readiness
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                isDepartureReady ? "text-green-700" : "text-[#9A3412]",
              )}
            >
              {isDepartureReady ? "Ready for departure" : "Action required"}
            </span>
          </div>
          {!isDepartureReady && missingRequirements.length > 0 && (
            <span className="max-w-[240px] truncate text-[10px] text-[#9A3412]/80">
              Pending: {missingRequirements.join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}


