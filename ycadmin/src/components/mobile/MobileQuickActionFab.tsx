import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  X,
  Ticket,
  FileText,
  CreditCard,
  DollarSign,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileQuickActionFabProps {
  onOpenNewBooking: () => void;
}

export const MobileQuickActionFab: React.FC<MobileQuickActionFabProps> = ({
  onOpenNewBooking,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      id: "booking",
      label: "New Booking",
      desc: "Record customer reservation",
      icon: Ticket,
      color: "bg-[#FF4D00]/5 text-[#FF5400] border-[#FF4D00]/20",
      onClick: () => {
        setIsOpen(false);
        onOpenNewBooking();
      },
    },
    {
      id: "quotation",
      label: "Create Quotation",
      desc: "Generate trip itinerary PDF",
      icon: FileText,
      color: "bg-[#FF4D00]/5 text-[#FF4D00] border-[#FF4D00]/20",
      onClick: () => {
        setIsOpen(false);
        navigate("/admin/quotations/new");
      },
    },
    {
      id: "payment",
      label: "Collect Payment",
      desc: "Record UPI / Cash collection",
      icon: CreditCard,
      color: "bg-green-50 text-green-600 border-green-100",
      onClick: () => {
        setIsOpen(false);
        navigate("/admin/finance?tab=incoming");
      },
    },
    {
      id: "expense",
      label: "Add Expense",
      desc: "Log station or trip cost",
      icon: DollarSign,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      onClick: () => {
        setIsOpen(false);
        navigate("/admin/finance?tab=expenses");
      },
    },
  ];

  return (
    <>
      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 touch-manipulation items-center justify-center rounded-full border-2 border-white bg-[#FF4D00] text-white shadow-lg shadow-orange-500/30 transition-transform active:scale-90"
          aria-label="Quick actions"
        >
          <Plus className="h-6 w-6 stroke-[2.5px]" />
        </button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] rounded-t-2xl bg-white p-4 pb-safe md:hidden"
        >
          <SheetHeader className="border-b border-slate-100 pb-3 text-left">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-base font-bold text-slate-900">
                  Quick Actions
                </SheetTitle>
                <p className="text-xs text-slate-500">
                  Operational shortcuts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                aria-label="Close quick actions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>

          <div className="mobile-grid-keep grid max-h-[60dvh] grid-cols-2 gap-2.5 overflow-y-auto py-4">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={act.onClick}
                  className="flex touch-manipulation flex-col rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-left transition-all hover:border-slate-200 hover:bg-white active:scale-[0.98]"
                >
                  <div
                    className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg border ${act.color}`}
                  >
                    <Icon className="h-4 w-4 stroke-[2px]" />
                  </div>
                  <span className="text-xs font-bold leading-tight text-slate-900">
                    {act.label}
                  </span>
                  <span className="mt-0.5 text-[10px] leading-tight text-slate-500">
                    {act.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileQuickActionFab;
