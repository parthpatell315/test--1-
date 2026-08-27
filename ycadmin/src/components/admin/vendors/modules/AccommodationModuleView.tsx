import React, { useState } from "react";
import { Hotel, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDisplayVendorCode } from "@/utils/vendorUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VendorSearchToolbar,
  vendorSelectFieldClass,
} from "@/components/admin/vendors/VendorSearchToolbar";
import { cn } from "@/lib/utils";

interface AccommodationModuleViewProps {
  vendors: any[];
  destinations: string[];
  pagination: any;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  filterDestination: string;
  onDestinationChange: (v: string) => void;
  filterStatus: string;
  onStatusChange: (v: string) => void;
  onRefresh: () => void;
  onPageChange: (p: number) => void;
  onSelectVendor: (vendor: any) => void;
  onAddVendor: () => void;
  onEditVendor: (vendor: any) => void;
  onDeleteVendor: (id: string) => void;
}

export function AccommodationModuleView({
  vendors,
  destinations,
  pagination,
  searchTerm,
  onSearchChange,
  filterDestination,
  onDestinationChange,
  filterStatus,
  onStatusChange,
  onRefresh,
  onPageChange,
  onSelectVendor,
  onAddVendor,
  onEditVendor,
  onDeleteVendor,
}: AccommodationModuleViewProps) {
  const [filterStayType, setFilterStayType] = useState("ALL");

  const hotels = vendors.filter((v) => {
    if (filterStayType === "ALL") return true;
    const sType = filterStayType.toUpperCase();
    const vType = (v.type || "").toUpperCase();
    const accType = (v.accommodationType || "").toUpperCase();
    return vType === sType || accType === sType;
  });

  return (
    <div className="space-y-4">
      <VendorSearchToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        placeholder="Search property, phone, or city"
        destinations={destinations}
        filterDestination={filterDestination}
        onDestinationChange={onDestinationChange}
        onReset={onRefresh}
        extraFilters={
          <Select value={filterStayType} onValueChange={setFilterStayType}>
            <SelectTrigger className={cn(vendorSelectFieldClass, "w-full sm:w-40")}>
              <SelectValue placeholder="All stay types" />
            </SelectTrigger>
            <SelectContent className="bg-white text-[12px]">
              <SelectItem value="ALL">All stay types</SelectItem>
              <SelectItem value="HOTEL">Hotel</SelectItem>
              <SelectItem value="RESORT">Resort</SelectItem>
              <SelectItem value="HOMESTAY">Homestay</SelectItem>
              <SelectItem value="HOSTEL">Hostel</SelectItem>
              <SelectItem value="CAMP">Camp</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">Vendor / property</th>
              <th className="whitespace-nowrap px-4 py-3">Category</th>
              <th className="whitespace-nowrap px-4 py-3">Destination</th>
              <th className="whitespace-nowrap px-4 py-3">Contact</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EEF4] font-medium">
            {hotels.length === 0 ? (
              <tr>
                <td colSpan={5} className="bg-[#F4F7FB]/50 p-12 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#E8EEF4] bg-white text-[#FF4D00]">
                      <Hotel className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#0B1528]">
                      No accommodation vendors found
                    </p>
                    <p className="text-xs text-slate-500">
                      There are no stay partners registered in this scope. Add a new accommodation vendor to get started.
                    </p>
                    <Button
                      onClick={onAddVendor}
                      className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#FF4D00] px-4 py-2 text-xs font-semibold text-white shadow-none hover:bg-[#E04400]"
                    >
                      <Plus className="h-4 w-4" /> Add vendor
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              hotels.map((h) => {
                const sType = (h.type || h.accommodationType || "HOTEL").toUpperCase();
                const stayLabel = sType
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (c: string) => c.toUpperCase());
                const badgeColor =
                  sType === "CAMP" || sType === "TENT"
                    ? "bg-green-50 text-green-700 border-green-200/80"
                    : sType === "RESORT"
                    ? "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30/80"
                    : sType === "HOMESTAY"
                    ? "bg-[#F4F7FB] text-[#0B1528] border-[#E8EEF4]"
                    : "bg-[#F4F7FB] text-[#0B1528] border-[#E8EEF4]";

                return (
                  <tr
                    key={h.id}
                    className="transition-colors hover:bg-[#F4F7FB]/70"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E8EEF4] bg-[#F4F7FB] text-[#0B1528]">
                          <Hotel className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span
                            onClick={() => onSelectVendor(h)}
                            className="block cursor-pointer text-xs font-semibold leading-tight text-[#0B1528] transition-colors hover:text-[#FF4D00]"
                          >
                            {h.name}
                          </span>
                          <span className="font-mono text-[10px] font-medium text-slate-400">
                            {getDisplayVendorCode(h)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${badgeColor}`}>
                        {stayLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-700">
                      {h.city || h.location || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="block text-xs font-medium text-[#0B1528]">
                        {h.contactPerson || h.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {h.phone || h.contactNumber || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => onSelectVendor(h)}
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E8EEF4] bg-white px-2.5 text-[11px] font-medium text-[#0B1528] transition-colors hover:bg-[#F4F7FB]"
                        >
                          <Eye className="h-3.5 w-3.5" /> Workspace
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditVendor(h)}
                          title="Edit"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#F4F7FB] hover:text-[#0B1528]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteVendor(h.id)}
                          title="Deactivate"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[#E8EEF4] bg-white px-4 py-3 text-xs font-medium text-slate-500">
        <span>
          Showing {pagination?.startIndex ?? 0}–{pagination?.endIndex ?? 0} of{" "}
          {pagination?.total ?? 0} vendors
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            disabled={(pagination?.page ?? 1) <= 1}
            onClick={() => onPageChange((pagination?.page ?? 1) - 1)}
            variant="outline"
            className="h-8 cursor-pointer border-[#E8EEF4] px-2.5 text-xs text-[#0B1528]"
          >
            Prev
          </Button>
          <span className="px-2 font-semibold text-[#0B1528]">
            Page {pagination?.page ?? 1} of {pagination?.pages ?? 1}
          </span>
          <Button
            disabled={(pagination?.page ?? 1) >= (pagination?.pages ?? 1)}
            onClick={() => onPageChange((pagination?.page ?? 1) + 1)}
            variant="outline"
            className="h-8 cursor-pointer border-[#E8EEF4] px-2.5 text-xs text-[#0B1528]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

