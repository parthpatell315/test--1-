import React from "react";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDisplayVendorCode } from "@/utils/vendorUtils";

interface DuplicateVendorDialogProps {
  open: boolean;
  onClose: () => void;
  existingVendor: any;
  onUseExisting: (vendor: any) => void;
  onForceCreate: () => void;
}

export function DuplicateVendorDialog({
  open,
  onClose,
  existingVendor,
  onUseExisting,
  onForceCreate,
}: DuplicateVendorDialogProps) {
  if (!existingVendor) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-base font-extrabold text-slate-800">
            Potential Duplicate Vendor Detected
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-550 leading-relaxed">
            A vendor with matching details already exists in the system. To
            avoid duplicate vendor records across trips, we recommend linking
            the existing vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 my-3 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800 text-sm">
              {existingVendor.name}
            </span>
            <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
              {getDisplayVendorCode(existingVendor)}
            </span>
          </div>
          <div className="text-slate-600 font-medium space-y-1">
            <p>
              Type:{" "}
              <span className="font-bold text-slate-700 uppercase">
                {existingVendor.type || existingVendor.category}
              </span>
            </p>
            <p>
              Phone:{" "}
              <span className="font-bold text-slate-700">
                {existingVendor.contactNumber || existingVendor.phone || "—"}
              </span>
            </p>
            <p>
              Location:{" "}
              <span className="font-bold text-slate-700">
                {existingVendor.city || existingVendor.location || "—"},{" "}
                {existingVendor.state || "—"}
              </span>
            </p>
            {existingVendor.gstin && (
              <p>
                GSTIN:{" "}
                <span className="font-mono text-slate-700 font-bold">
                  {existingVendor.gstin}
                </span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            onClick={() => onUseExisting(existingVendor)}
            className="w-full sm:w-auto bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Link Existing Vendor
          </Button>
          <Button
            onClick={onForceCreate}
            variant="outline"
            className="w-full sm:w-auto border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg"
          >
            Create Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

