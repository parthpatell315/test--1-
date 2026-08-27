import React from "react";
import { UserCheck, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDisplayVendorCode } from "@/utils/vendorUtils";
import { VendorSearchToolbar } from "@/components/admin/vendors/VendorSearchToolbar";

interface GuidesModuleViewProps {
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

export function GuidesModuleView({
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
}: GuidesModuleViewProps) {
  const guides = vendors.filter(
    (v) => (v.type || "").toUpperCase() === "GUIDE",
  );

  return (
    <div className="space-y-4">
      <VendorSearchToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        placeholder="Search guide name, role, or city"
        destinations={destinations}
        filterDestination={filterDestination}
        onDestinationChange={onDestinationChange}
        onReset={onRefresh}
      />

      <div className="overflow-hidden rounded-xl border border-[#E8EEF4] bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-[#E8EEF4] bg-[#F8FAFC] text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="py-3 px-4">Guide / Leader Partner</th>
              <th className="py-3 px-4 whitespace-nowrap">Category</th>
              <th className="py-3 px-4 whitespace-nowrap">Destination</th>
              <th className="py-3 px-4 whitespace-nowrap">Contact</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {guides.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center bg-slate-50/50">
                  <div className="space-y-2 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      No Tour Guides Found
                    </p>
                    <p className="text-xs text-slate-500">
                      There are no registered tour guides or trek leaders in this scope. Click below to add a guide vendor.
                    </p>
                    <Button
                      onClick={onAddVendor}
                      className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#FF4D00] px-4 py-2 text-xs font-semibold text-white shadow-none hover:bg-[#E04400]"
                    >
                      <Plus className="w-4 h-4" /> Add Guide Vendor
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              guides.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span
                          onClick={() => onSelectVendor(g)}
                          className="font-bold text-slate-900 text-xs block leading-tight hover:text-[#FF4D00] cursor-pointer transition-colors"
                        >
                          {g.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">
                          {getDisplayVendorCode(g)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="rounded-md border border-[#E8EEF4] bg-[#F4F7FB] px-2 py-0.5 text-[11px] font-medium text-[#0B1528]">
                      Guide
                    </span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-700 font-medium text-xs">
                    📍 {g.city || g.location || "N/A"}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-800 text-xs block">
                      {g.contactPerson || g.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {g.phone || g.contactNumber || "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => onSelectVendor(g)}
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E8EEF4] bg-white px-2.5 text-[11px] font-medium text-[#0B1528] transition-colors hover:bg-[#F4F7FB]"
                      >
                        <Eye className="h-3.5 w-3.5" /> Workspace
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditVendor(g)}
                        title="Edit"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#F4F7FB] hover:text-[#0B1528]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVendor(g.id)}
                        title="Deactivate"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Synchronized Pagination Footer */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
        <span>
          Showing {pagination?.startIndex ?? 0}–{pagination?.endIndex ?? 0} of{" "}
          {pagination?.total ?? 0} guide partners
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            disabled={(pagination?.page ?? 1) <= 1}
            onClick={() => onPageChange((pagination?.page ?? 1) - 1)}
            variant="outline"
            className="h-8 px-2.5 text-xs cursor-pointer"
          >
            &lt; Prev
          </Button>
          <span className="px-2 font-bold text-slate-800">
            Page {pagination?.page ?? 1} of {pagination?.pages ?? 1}
          </span>
          <Button
            disabled={(pagination?.page ?? 1) >= (pagination?.pages ?? 1)}
            onClick={() => onPageChange((pagination?.page ?? 1) + 1)}
            variant="outline"
            className="h-8 px-2.5 text-xs cursor-pointer"
          >
            Next &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}

