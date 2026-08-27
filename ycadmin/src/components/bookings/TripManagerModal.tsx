import { useState, useEffect } from "react";
import { X, Edit, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { bookingsService } from "@/services/bookings.service";
import type { BookingTrip } from "@/types";
import { toast } from "sonner";

export function TripManager({
  open,
  onClose,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [trips, setTrips] = useState<BookingTrip[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setTrips(await bookingsService.getTrips());
  };
  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleSave = async () => {
    if (!code || !name) return toast.error("Both fields required");
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return toast.error("Please enter a valid non-negative price");
    }
    setLoading(true);
    try {
      if (editId) {
        await bookingsService.updateTrip(editId, {
          tripCode: code.toUpperCase(),
          tripName: name,
          price: parsedPrice,
        });
        toast.success("Trip updated!");
      } else {
        await bookingsService.createTrip({
          tripCode: code.toUpperCase(),
          tripName: name,
          price: parsedPrice,
        });
        toast.success("Trip created!");
      }
      setCode("");
      setName("");
      setPrice("");
      setEditId(null);
      load();
      onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
    setLoading(false);
  };

  const startEdit = (t: BookingTrip) => {
    setEditId(t.id);
    setCode(t.tripCode);
    setName(t.tripName);
    setPrice(t.price?.toString() || "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setCode("");
    setName("");
    setPrice("");
  };

  const copyLink = (link?: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Form link copied!");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 border border-slate-200 rounded-lg overflow-hidden shadow-premium bg-white">
        <DialogHeader className="bg-slate-900 px-4 py-3 text-white">
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
            Trip Manager
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage available trips.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-20 uppercase font-bold h-8 text-xs rounded"
            />
            <Input
              placeholder="Trip Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-8 text-xs rounded"
            />
            <Input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-20 h-8 text-xs rounded"
            />
            {editId ? (
              <div className="flex gap-1 shrink-0">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] h-8 rounded px-3"
                >
                  Update
                </Button>
                <Button
                  onClick={cancelEdit}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 h-8 rounded px-1.5"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSave}
                disabled={loading}
                size="sm"
                className="bg-primary text-white font-bold text-[10px] h-8 rounded px-3"
              >
                Add
              </Button>
            )}
          </div>
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto no-scrollbar">
            {trips.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 bg-slate-55 rounded border border-slate-200/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-[10px]">
                    {t.tripCode}
                  </span>
                  <span className="font-medium text-slate-700">
                    {t.tripName}
                  </span>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 rounded font-mono">
                    ₹{t.price?.toLocaleString("en-IN") || 0}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-500 h-7 w-7 p-0"
                    onClick={() => startEdit(t)}
                    title="Edit trip"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-555 h-7 w-7 p-0"
                    onClick={() => copyLink(t.formLink)}
                    title="Copy form link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 h-7 w-7 p-0"
                    onClick={async () => {
                      if (confirm("Delete trip?")) {
                        await bookingsService.deleteTrip(t.id);
                        load();
                        onRefresh();
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {trips.length === 0 && (
              <p className="text-center text-gray-400 py-3 text-xs italic">
                No trips yet. Create one above.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

