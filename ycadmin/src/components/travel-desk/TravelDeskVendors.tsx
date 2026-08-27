import React, { useEffect, useState } from "react";
import { Trip } from "@/types";
import { vendorsService } from "@/services/vendors.service";
import { Building2, Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import {
  TravelDeskLoadingState,
  TravelDeskEmptyState,
} from "./TravelDeskStateComponents";
import { TravelDeskLinkVendorModal } from "./TravelDeskLinkVendorModal";
import { cn } from "@/lib/utils";

interface TravelDeskVendorsProps {
  trip: Trip;
}

export const TravelDeskVendors: React.FC<TravelDeskVendorsProps> = ({
  trip,
}) => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVendors = async () => {
    try {
      const { assignments } = await vendorsService.getForTrip(trip.id);
      setVendors(assignments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [trip.id]);

  if (loading) return <TravelDeskLoadingState message="Loading Vendors..." />;

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Trip Vendors & Suppliers
          </h2>
          <p className="text-xs text-slate-550 mt-0.5 font-bold">
            Manage hotels, transport, and local guides for this trip
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E66000] shadow-sm flex items-center gap-1.5"
          >
            + Link Vendor
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5">
            Manage in Directory
          </button>
        </div>
      </div>

      {!vendors || vendors.length === 0 ? (
        <div className="mt-8">
          <TravelDeskEmptyState
            title="No Vendors Linked"
            description="There are currently no hotels, transport, or activity vendors assigned to this trip in the Master Directory."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((link: any) => (
            <div
              key={link.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      link.vendor?.type === "hotel"
                        ? "bg-blue-100 text-blue-600"
                        : link.vendor?.type === "transport"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-green-100 text-green-600",
                    )}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                      {link.vendor?.name || "Unknown Vendor"}
                    </h3>
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-black uppercase tracking-wider",
                        link.vendor?.type === "hotel"
                          ? "bg-blue-50 text-blue-700"
                          : link.vendor?.type === "transport"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700",
                      )}
                    >
                      {link.vendor?.type || "Other"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 mb-4 flex-1">
                <div className="flex items-start gap-2 text-xs font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>
                    {link.vendor?.city ||
                      link.vendor?.location ||
                      "Location unavailable"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{link.vendor?.contactNumber || "No phone"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {link.vendor?.email || "No email"}
                  </span>
                </div>
              </div>

              {link.notes && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                  <p className="text-xs text-slate-600 font-medium italic line-clamp-2">
                    "{link.notes}"
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Negotiated Rate
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {link.agreedCost
                      ? `₹${link.agreedCost.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-bold text-[#FF6B00] hover:text-[#E66000]">
                  View Profile <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TravelDeskLinkVendorModal
          tripId={trip.id}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchVendors();
          }}
        />
      )}
    </div>
  );
};

