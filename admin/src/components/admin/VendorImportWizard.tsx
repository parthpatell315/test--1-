import React, { useState } from "react";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { vendorsService } from "@/services/vendors.service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VendorImportWizard({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<
    "hotels" | "transport" | "charges"
  >("hotels");
  const [report, setReport] = useState<any | null>(null);

  const handleUpload = async () => {
    setLoading(true);
    try {
      // Trigger preview extraction from backend
      const data = await vendorsService.getImportPreview();
      setPreviewData(data);
      toast.success(
        "Workbook parsed successfully! Review the normalized preview below.",
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to parse workbook");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setLoading(true);
    try {
      const res = await vendorsService.confirmImport({
        hotels: previewData.hotels,
        transport: previewData.transport,
        additionalCharges: previewData.additionalCharges,
      });
      if (res.success) {
        setReport(res.report);
        toast.success(
          "Successfully imported all directory entries as DRAFT records!",
        );
        if (onComplete) onComplete();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = (
    type: "hotels" | "transport" | "charges",
    index: number,
  ) => {
    if (!previewData) return;
    const next = { ...previewData };
    if (type === "hotels") {
      next.hotels = next.hotels.filter((_: any, i: number) => i !== index);
    } else if (type === "transport") {
      next.transport = next.transport.filter(
        (_: any, i: number) => i !== index,
      );
    } else {
      next.additionalCharges = next.additionalCharges.filter(
        (_: any, i: number) => i !== index,
      );
    }
    setPreviewData(next);
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Himachal Trip Details Excel Importer
          </h2>
          <p className="text-[10px] text-slate-450 mt-0.5">
            Normalize and batch-import hotels, transport fleets and guide
            charges into the vendor directory.
          </p>
        </div>
        {!previewData && (
          <Button
            onClick={handleUpload}
            disabled={loading}
            className="h-8.5 bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase flex items-center gap-1.5 rounded"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {loading ? "Parsing..." : "Upload & Parse Workbook"}
          </Button>
        )}
      </div>

      {previewData && !report && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 border border-slate-150 p-3.5 rounded-[4px]">
            <div className="flex gap-6">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">
                  HOTELS DETECTED
                </span>
                <span className="text-sm font-black text-slate-800">
                  {previewData.hotels?.length || 0} Rooms / Sharing
                </span>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">
                  VEHICLE FLEETS
                </span>
                <span className="text-sm font-black text-slate-800">
                  {previewData.transport?.length || 0} Routes / Vehicles
                </span>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">
                  MISC / ADDON COSTS
                </span>
                <span className="text-sm font-black text-slate-800">
                  {previewData.additionalCharges?.length || 0} Charges
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewData(null)}
                className="h-8 text-[11px] font-bold text-slate-600 rounded-[4px]"
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmImport}
                disabled={loading}
                className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] rounded-[4px]"
              >
                {loading ? "Importing..." : "Confirm & Import to DB"}
              </Button>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 gap-1">
            {(["hotels", "transport", "charges"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? "border-[#FF4D00] text-[#FF4D00]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab === "hotels"
                  ? "Hotels & Stays"
                  : tab === "transport"
                    ? "Transporters & Routes"
                    : "Addons & Extra Charges"}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <div className="border border-slate-150 rounded-[4px] overflow-hidden max-h-[350px] overflow-y-auto bg-white">
            {activeTab === "hotels" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-150 sticky top-0">
                  <tr className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-2.5 border-r border-slate-100">
                      Hotel Name
                    </th>
                    <th className="p-2.5 border-r border-slate-100">City</th>
                    <th className="p-2.5 border-r border-slate-100">Phone</th>
                    <th className="p-2.5 border-r border-slate-100">Sharing</th>
                    <th className="p-2.5 border-r border-slate-100">
                      Rate Basis
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-right">
                      Amount
                    </th>
                    <th className="p-2.5 border-r border-slate-100">
                      Source Row
                    </th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {previewData.hotels.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-100 font-bold text-slate-800">
                        {h.vendorName}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-semibold text-slate-650">
                        {h.city}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-mono text-[10.5px]">
                        {h.primaryPhone || "—"}
                      </td>
                      <td className="p-2.5 border-r border-slate-100">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-100">
                          {h.rate.sharingType}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-semibold">
                        {h.rate.rateBasis}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 text-right font-black text-slate-850">
                        ₹{Number(h.rate.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-mono text-[10px] text-slate-400">
                        {h.sourceSheet} (Row {h.sourceRow})
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveItem("hotels", idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "transport" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-150 sticky top-0">
                  <tr className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-2.5 border-r border-slate-100">
                      Transporter
                    </th>
                    <th className="p-2.5 border-r border-slate-100">Route</th>
                    <th className="p-2.5 border-r border-slate-100">Vehicle</th>
                    <th className="p-2.5 border-r border-slate-100 text-center">
                      Sellable Seats
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-right">
                      Total Cost
                    </th>
                    <th className="p-2.5 border-r border-slate-100">
                      Source Row
                    </th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {previewData.transport.map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-100 font-bold text-slate-800">
                        {t.vendorName}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-semibold text-slate-650">
                        {t.routeName}
                      </td>
                      <td className="p-2.5 border-r border-slate-100">
                        {t.vehicleType}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 text-center font-bold text-slate-600">
                        {t.sellableSeats}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 text-right font-black text-slate-850">
                        ₹{Number(t.totalVehicleCost).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-mono text-[10px] text-slate-400">
                        {t.sourceSheet} (Row {t.sourceRow})
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveItem("transport", idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "charges" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-150 sticky top-0">
                  <tr className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-2.5 border-r border-slate-100">
                      Charge Name
                    </th>
                    <th className="p-2.5 border-r border-slate-100">
                      Rate Basis
                    </th>
                    <th className="p-2.5 border-r border-slate-100 text-right">
                      Amount
                    </th>
                    <th className="p-2.5 border-r border-slate-100">
                      Trip Code
                    </th>
                    <th className="p-2.5 border-r border-slate-100">
                      Source Row
                    </th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {previewData.additionalCharges.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-100 font-bold text-slate-800">
                        {c.chargeName}
                      </td>
                      <td className="p-2.5 border-r border-slate-100">
                        <span className="px-1.5 py-0.5 rounded bg-[#FF4D00]/5 text-[#C2410C] font-bold text-[9px] border border-[#FF4D00]/20">
                          {c.rateBasis}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-100 text-right font-black text-slate-850">
                        ₹{Number(c.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-semibold">
                        {c.tripCode}
                      </td>
                      <td className="p-2.5 border-r border-slate-100 font-mono text-[10px] text-slate-400">
                        {c.sourceSheet} (Row {c.sourceRow})
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveItem("charges", idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {report && (
        <div className="bg-green-50 border border-green-200 rounded-[6px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h4 className="text-xs font-black text-green-700 uppercase tracking-wider">
              Import Completed Successfully
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold mt-2">
            <div className="bg-white p-3 rounded border border-green-100">
              <span className="text-[10px] text-slate-400 block font-bold">
                CREATED
              </span>
              <span className="text-lg font-black text-green-600">
                {report.created} Records
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <span className="text-[10px] text-slate-400 block font-bold">
                DUPLICATES DRAFTED
              </span>
              <span className="text-lg font-black text-blue-600">
                {report.duplicates} Records
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <span className="text-[10px] text-slate-400 block font-bold">
                SKIPPED / ERRORS
              </span>
              <span className="text-lg font-black text-slate-500">
                {report.skipped + report.errors} Records
              </span>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setReport(null);
                setPreviewData(null);
              }}
              className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
            >
              Finish Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

