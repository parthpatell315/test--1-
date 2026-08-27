import React from "react";
import {
  MapPin,
  Phone,
  ShieldCheck,
  Plus,
  RotateCw,
  Eye,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CampingModuleViewProps {
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

export function CampingModuleView({
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
}: CampingModuleViewProps) {
  const camps = vendors.filter((v) => ["CAMPING", "CAMP"].includes(v.type));

  const kpis = [
    {
      title: "Campsite Partners",
      count: camps.length || 9,
      icon: MapPin,
      color: "text-pink-600 bg-pink-50 border-pink-200",
    },
    {
      title: "Dome & Alpine Tents",
      count: 45,
      icon: MapPin,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      title: "Swiss Luxury Tents",
      count: 18,
      icon: ShieldCheck,
      color: "text-green-600 bg-green-50 border-green-200",
    },
    {
      title: "Bonfire & Music Permitted",
      count: "100%",
      icon: MapPin,
      color: "text-[#FF4D00] bg-[#FF4D00]/5 border-[#FF4D00]/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-pink-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Camping Partners Subsystem
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Campsite Owners, Swiss Luxury Tents & Outdoor Camping Equipment
          </p>
        </div>
        <Button
          onClick={onAddVendor}
          className="bg-[#FF4D00] hover:bg-[#E05E00] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-2xs"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Campsite Partner
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <Card
              key={i}
              className={cn(
                "p-4 rounded-xl border flex justify-between items-center bg-white shadow-2xs",
                k.color,
              )}
            >
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  {k.title}
                </span>
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {k.count}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-slate-200">
                <Icon className="w-5 h-5 text-slate-700" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Input
            placeholder="Search Campsite Name, Location, Tent Type..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8.5 text-xs bg-white border-[#E2E8F0] rounded-md"
          />
        </div>
        <Button
          onClick={onRefresh}
          variant="ghost"
          className="h-8.5 px-3 hover:bg-slate-50 text-slate-500"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Campsite Partner</th>
              <th className="p-3.5">Location</th>
              <th className="p-3.5">Tent Capacity</th>
              <th className="p-3.5">Washroom Type</th>
              <th className="p-3.5">Amenities</th>
              <th className="p-3.5 text-right">Base Tariff / Person</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {camps.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold text-slate-800">{c.name}</td>
                <td className="p-3.5 font-bold text-slate-800">
                  {c.city || c.location || "Kasol Riverside"}
                </td>
                <td className="p-3.5 text-slate-700 font-bold">
                  25 Swiss Tents (Triple Sharing)
                </td>
                <td className="p-3.5 font-bold text-green-600">
                  Attached Western Washrooms
                </td>
                <td className="p-3.5 text-slate-700">
                  Bonfire, Music System, River Stream View
                </td>
                <td className="p-3.5 text-right font-black text-slate-800">
                  ₹1,200 / Night
                </td>
                <td className="p-3.5 text-right space-x-1.5">
                  <Button
                    onClick={() => onSelectVendor(c)}
                    className="h-8 text-xs bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold px-2.5 rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Workspace
                  </Button>
                  <button
                    onClick={() => onEditVendor(c)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-md"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
        <span>
          Showing {pagination.startIndex}–{pagination.endIndex} of{" "}
          {pagination.total} campsite partners
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            variant="outline"
            className="h-8 px-2.5 text-xs"
          >
            &lt; Prev
          </Button>
          <span className="px-2 font-bold text-slate-800">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            disabled={pagination.page >= pagination.pages}
            onClick={() => onPageChange(pagination.page + 1)}
            variant="outline"
            className="h-8 px-2.5 text-xs"
          >
            Next &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}

