import React, { useState, useEffect } from "react";
import { X, Building2, Link2 } from "lucide-react";
import { travelDeskService } from "@/services/travelDesk.service";
import { vendorsService } from "@/services/vendors.service";

interface LinkVendorModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: (newLink: any) => void;
}

export const TravelDeskLinkVendorModal: React.FC<LinkVendorModalProps> = ({
  tripId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [globalVendors, setGlobalVendors] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);

  const [vendorId, setVendorId] = useState("");
  const [relationshipType, setRelationshipType] = useState("HOTEL");
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendors = await vendorsService.getAll();
        setGlobalVendors(vendors.filter((v) => v.isActive));
      } catch (err) {
        console.error("Failed to load vendors", err);
      } finally {
        setIsLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!vendorId || !relationshipType) {
      setError("Please select a vendor and relationship type.");
      return;
    }

    try {
      setLoading(true);
      const newLink = await travelDeskService.linkVendor(tripId, {
        vendorId,
        relationshipType,
        negotiatedRate: negotiatedRate ? parseFloat(negotiatedRate) : undefined,
        internalNotes,
      });
      onSuccess(newLink);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to link vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">Link Vendor</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Assign an existing supplier to this trip
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 flex-1 overflow-y-auto"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Vendor *
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              disabled={isLoadingVendors}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all disabled:opacity-50"
            >
              <option value="">
                {isLoadingVendors
                  ? "Loading vendors..."
                  : "Choose a vendor from directory"}
              </option>
              {globalVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.location}) - {v.type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Relationship Type *
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
            >
              <option value="HOTEL">Accommodation / Hotel</option>
              <option value="TRANSPORT">Transport / Vehicle</option>
              <option value="ACTIVITY">Activity / Attraction</option>
              <option value="GUIDE">Local Guide</option>
              <option value="OTHER">Other Service</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Negotiated Rate (₹) (Optional)
            </label>
            <input
              type="number"
              value={negotiatedRate}
              onChange={(e) => setNegotiatedRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
              placeholder="e.g. 1500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Internal Notes / Terms
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all min-h-[80px]"
              placeholder="Any specific agreements for this trip..."
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#E66000] text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            {loading ? "Linking..." : "Link Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
};
