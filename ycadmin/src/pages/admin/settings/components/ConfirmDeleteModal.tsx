import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [password, setPassword] = useState("");
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Please enter your current password");
      return;
    }
    if (!confirmedCheck) {
      toast.error(
        "Please confirm that you understand this action is permanent",
      );
      return;
    }

    try {
      setIsDeleting(true);
      await onConfirm(password);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setConfirmedCheck(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-red-200">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Delete Account Permanently?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            This action is irreversible. All your profile data, personal
            preferences, and permissions will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            ⚠️ <strong>Warning:</strong> You will be immediately logged out of
            all active devices once deleted.
          </div>

          <div className="flex items-start space-x-2 pt-1">
            <Checkbox
              id="confirm-check"
              checked={confirmedCheck}
              onCheckedChange={(c) => setConfirmedCheck(!!c)}
              className="mt-0.5"
            />
            <label
              htmlFor="confirm-check"
              className="text-xs text-slate-700 font-semibold cursor-pointer"
            >
              I understand that deleting my account is permanent and cannot be
              undone.
            </label>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold text-slate-700">
              Enter Your Password
            </Label>
            <Input
              type="password"
              placeholder="Current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs border-slate-300"
            />
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isDeleting || !confirmedCheck || !password}
              className="h-9 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

