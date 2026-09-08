import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: AdminModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          maxWidth,
          "w-[95vw] sm:w-full flex flex-col p-0 gap-0 max-h-[95dvh] rounded-md border border-slate-200 overflow-hidden shadow-lg",
        )}
      >
        <DialogHeader className="px-6 py-4 border-b border-slate-150 bg-white shrink-0 items-start text-left space-y-1">
          <DialogTitle className="text-sm.5 font-bold tracking-tight text-slate-800">
            {title}
          </DialogTitle>
          <DialogDescription
            className={cn(
              "text-[11px] font-medium text-slate-450 leading-relaxed",
              !description && "sr-only",
            )}
          >
            {description || title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#FDFDFD]">
          {children}
        </div>

        {footer && (
          <DialogFooter className="px-6 py-3.5 border-t border-slate-150 bg-slate-50/70 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 w-full">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
