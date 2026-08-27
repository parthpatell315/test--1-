import { calculateBookingFinancialStatus } from "./paymentCalculator";
import { isSameDepartureDate, toDepartureDateKey } from "@/utils/departureDate";
import { isPassengerCancelled } from "./passengerStatus";
import {
  resolvePassengerAlloc,
} from "./passengerIdentity";
import {
  normalizeGenderFull,
} from "@/utils/passengerUtils";
import {
  allocatePassengerMoneyForBookingWithTotals,
  normalizeCompareName,
} from "./passengerAmounts";

const MISSING = "—";

function missingText(value: any): string {
  if (value == null) return MISSING;
  const s = String(value).trim();
  return s ? s : MISSING;
}

export function mapBookingsToDeparturePassengers(
  bookings: any[],
  departureDateStr: string,
  passengerAllocations: Record<string, any> = {},
): any[] {
  const arr: any[] = [];

  (bookings || [])
    .filter((b: any) => !isPassengerCancelled(null, b))
    .forEach((b: any) => {
      let passengersObj = b.passengers;
      if (typeof passengersObj === "string") {
        try {
          passengersObj = JSON.parse(passengersObj);
        } catch {
          passengersObj = {};
        }
      }

      const fin = calculateBookingFinancialStatus(b);
      const due = fin.remainingAmount;
      const paymentLabel =
        fin.paymentStatus === "PAID"
          ? "Paid in Full"
          : fin.paymentStatus === "OVERPAID"
            ? "Overpaid"
            : fin.paymentStatus === "PARTIAL"
              ? "Partial Payment"
              : "Payment Pending";

      const roomDetailsObj = b.roomDetails || passengersObj?.details || {};
      const personsRoomDetails = roomDetailsObj.personsRoomDetails || {};

      const leadName = b.fullName || b.name;
      const leadId = b.id;
      const leadAlloc = resolvePassengerAlloc(passengerAllocations, {
        id: leadId,
        bookingId: b.id,
        name: leadName,
      });
      const leadRoomInfo = personsRoomDetails[leadName] || {};
      const leadRoomNo =
        (leadAlloc?.room && leadAlloc.room !== "Unassigned" ? leadAlloc.room : null) ||
        leadRoomInfo.roomNo ||
        passengersObj?.details?.roomAllocation ||
        MISSING;
      const leadRoomType =
        leadRoomInfo.roomType ||
        b.roomSharing ||
        b.roomType ||
        passengersObj?.details?.roomType ||
        MISSING;
      const leadCoupleWith = leadRoomInfo.coupleWith || "";

      const normLeadName = normalizeCompareName(leadName);
      const trainOpt =
        b.trainOption ||
        b.trainClass ||
        passengersObj?.details?.trainClass ||
        passengersObj?.details?.trainOption ||
        (passengersObj?.persons &&
          Array.isArray(passengersObj.persons) &&
          passengersObj.persons[0]?.trainOption) ||
        MISSING;

      const isBookingCancelled =
        b.isCancelled === true ||
        b.cancelled === true ||
        String(b.status || "").toLowerCase() === "cancelled" ||
        String(b.bookingStatus || "").toLowerCase() === "cancelled";

      const draftRows: any[] = [];

      const base = {
        bookingId: b.id,
        bookingRef: b.bookingId || b.id,
        bookingDate: b.createdAt ? String(b.createdAt).substring(0, 10) : MISSING,
        departureDate: toDepartureDateKey(b.departureDate) || departureDateStr || MISSING,
        batchGroup: MISSING,
        gender: normalizeGenderFull(b.gender || passengersObj?.details?.gender, leadName),
        age: b.age ?? null,
        status: isBookingCancelled ? "CANCELLED" : b.status || MISSING,
        isCancelled: isBookingCancelled,
        phone: missingText(b.phone || b.mobile),
        email: missingText(b.email),
        pickupPoint: missingText(b.pickupCity),
        dropPoint: MISSING,
        roomSharing: b.roomSharing || b.roomType || passengersObj?.details?.roomType || MISSING,
        roomType: leadRoomType,
        coupleWith: leadCoupleWith,
        trainOption: trainOpt,
        trainClass: trainOpt,
        emergencyContact: missingText(b.emergencyContact || passengersObj?.details?.emergencyContact),
        roomNo: leadRoomNo,
        paymentStatus: paymentLabel,
        bookingBalance: Math.max(0, Math.round(due)),
        paymentMode: missingText(b.paymentMode || b.payment_method),
        paymentDate: MISSING,
        idProofType: missingText(b.idProofType || passengersObj?.details?.idProof),
        guideName: MISSING,
        transportDetails: MISSING,
        notes: b.notes || MISSING,
        hasDocs: !!passengersObj?.details?.idProof,
        ticketStatus: b.trainTicketStatus || MISSING,
        ticketVerified: b.trainTicketStatus === "CONFIRMED",
        documentStatus:
          passengersObj?.details?.idProof || b.idProofType ? "Verified" : "Missing",
        leadPassengerName: b.fullName || b.name,
        linkedBooking: b.linkedBooking || passengersObj?.details?.linkedBooking || undefined,
        bookingLevelPayment: true,
      };
      draftRows.push({ id: b.id, name: leadName, ...base, isLead: true });
      if (Array.isArray(passengersObj?.persons)) {
        passengersObj.persons.forEach((p: any, idx: number) => {
          if (normalizeCompareName(p.name) === normLeadName) return;
          const coId = `${b.id}-co-${idx}`;
          const coAlloc = resolvePassengerAlloc(passengerAllocations, {
            id: coId,
            bookingId: b.id,
            name: p.name,
          });
          const coRoomInfo = personsRoomDetails[p.name] || {};
          const coRoomNo =
            (coAlloc?.room && coAlloc.room !== "Unassigned" ? coAlloc.room : null) ||
            coRoomInfo.roomNo ||
            MISSING;
          const coRoomType =
            coRoomInfo.roomType ||
            p.roomSharing ||
            b.roomSharing ||
            b.roomType ||
            passengersObj?.details?.roomType ||
            MISSING;
          const coCoupleWith = coRoomInfo.coupleWith || "";
          const coTrainOpt = p.trainOption || p.trainClass || trainOpt;

          const isCoPaxCancelled =
            isBookingCancelled ||
            p.isCancelled === true ||
            p.cancelled === true ||
            String(p.status || "").toLowerCase() === "cancelled";

          draftRows.push({
            id: coId,
            name: p.name,
            ...base,
            roomNo: coRoomNo,
            roomType: coRoomType,
            coupleWith: coCoupleWith,
            trainOption: coTrainOpt,
            trainClass: coTrainOpt,
            phone: missingText(p.phone || b.phone || b.mobile),
            email: missingText(p.email),
            pickupPoint: missingText(p.pickupPoint || b.pickupCity),
            notes: p.notes || (isCoPaxCancelled ? "Cancelled" : MISSING),
            isLead: false,
            gender: normalizeGenderFull(p.gender || p.genderFull, p.name),
            age: p.age ?? null,
            status: isCoPaxCancelled ? "CANCELLED" : p.status || MISSING,
            isCancelled: isCoPaxCancelled,
            ticketStatus:
              p.ticketStatus ||
              (isCoPaxCancelled ? "CANCELLED" : b.trainTicketStatus) ||
              MISSING,
            ticketVerified:
              !isCoPaxCancelled &&
              (p.ticketStatus === "CONFIRMED" || b.trainTicketStatus === "CONFIRMED"),
            documentStatus: p.idProof ? "Verified" : "Missing",
          });
        });
      }

      const money = allocatePassengerMoneyForBookingWithTotals(b, draftRows, {
        totalAmount: fin.totalAmount,
        netPaidAmount: fin.netPaidAmount,
        remainingAmount: due,
      });
      draftRows.forEach((row, i) => {
        const share = money.shares[i];
        arr.push({
          ...row,
          amount: share?.amount ?? null,
          paidAmount: share?.paidAmount ?? null,
          balance: share?.balance ?? null,
          amountFromLineItems: share?.amountFromLineItems ?? false,
          paidIsBookingShare: share?.paidIsBookingShare ?? true,
          bookingBalance: money.remainingAmount,
        });
      });
    });

  return arr;
}

export function isTransportAllocatedForPassenger(
  passenger: { id?: string; pickupPoint?: string },
  allocations: Record<string, any>,
): boolean {
  const alloc = resolvePassengerAlloc(allocations, passenger);
  if (!alloc) return false;
  const vehicle = String(alloc.vehicle || "").trim();
  return Boolean(vehicle && vehicle !== "—" && vehicle !== "Unassigned");
}

export { isSameDepartureDate };
