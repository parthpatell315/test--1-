import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import BookingDetailsView from "./BookingDetailsView";
import type { Booking } from "@/types";

interface BookingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onRefresh?: () => void;
  trips?: any[];
  defaultTab?: string;
}

const EMPTY_TRIPS: any[] = [];

export default function BookingDetailsModal({
  open,
  onOpenChange,
  booking,
  onRefresh,
  trips = EMPTY_TRIPS,
  defaultTab,
}: BookingDetailsModalProps) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col rounded-xl border border-slate-200 shadow-2xl bg-[#F4F7FB]">
        <DialogHeader className="sr-only">
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            Details for booking {booking.bookingId}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <BookingDetailsView
            booking={booking}
            onBack={() => onOpenChange(false)}
            onRefresh={onRefresh || (() => {})}
            trips={trips}
            defaultTab={defaultTab}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
