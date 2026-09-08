import { useState, useEffect } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, ChevronRight, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function VendorContractManager({ vendors, loadData }: { vendors: any[]; loadData: () => void }) {
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);

  const [contractForm, setContractForm] = useState({
    destination: "",
    hotelName: "",
    roomCategory: "Deluxe",
    season: "Standard",
    twinRate: "",
    tripleRate: "",
    quadRate: "",
    extraBedRate: "",
    mealPlan: "MAP",
    cancellationRules: "",
    startDate: "",
    endDate: "",
  });

  const fetchContracts = async () => {
    if (!selectedVendor) return;
    try {
      const res = await api.get(`/vendors/contracts/${selectedVendor.id}`);
      if (res.data.success) {
        setContracts(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch contracts", err);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [selectedVendor?.id]);

  const handleSaveContract = async () => {
    if (!selectedVendor) return;
    setLoading(true);
    try {
      await api.post(`/vendors/contracts/${selectedVendor.id}`, contractForm);
      toast.success("Vendor Contract registered successfully!");
      setContractModalOpen(false);
      fetchContracts();
      setContractForm({
        destination: "", hotelName: "", roomCategory: "Deluxe", season: "Standard",
        twinRate: "", tripleRate: "", quadRate: "", extraBedRate: "",
        mealPlan: "MAP", cancellationRules: "", startDate: "", endDate: ""
      });
    } catch (err: any) {
      toast.error("Failed to save contract: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contract?")) return;
    try {
      await api.delete(`/vendors/contracts/${id}`);
      toast.success("Contract removed");
      fetchContracts();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-sm space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF4D00]" />
            Vendor Contracts ERP
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Select a vendor to manage structural rates and seasonal blackout agreements.
          </p>
        </div>
        {selectedVendor && (
          <Button onClick={() => setContractModalOpen(true)} className="bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-bold h-8.5 rounded">
            <Plus className="w-4 h-4 mr-1.5" />
            New Contract
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 border-r border-slate-200 pr-4 space-y-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
            Vendors List
          </h4>
          <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVendor(v)}
                className={cn(
                  "w-full text-left p-2.5 text-xs font-semibold rounded transition-all cursor-pointer flex justify-between items-center",
                  selectedVendor?.id === v.id
                    ? "bg-[#FF4D00]/5 text-[#0B1528] border-l-4 border-[#FF4D00]"
                    : "text-slate-650 hover:bg-slate-50"
                )}
              >
                <span className="truncate">{v.name}</span>
                <ChevronRight className={cn("w-3.5 h-3.5", selectedVendor?.id === v.id ? "text-[#FF4D00]" : "text-transparent")} />
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 space-y-4 pl-2">
          {selectedVendor ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-850">
                {selectedVendor.name} Contracts
              </h3>

              <div className="border border-slate-200 rounded-[6px] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Twin</th>
                      <th className="p-3 text-right">Triple</th>
                      <th className="p-3 text-right">Quad</th>
                      <th className="p-3 text-right">Extra Bed</th>
                      <th className="p-3 text-center">Meal Plan</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {contracts.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3 font-bold text-slate-800">{c.roomCategory} <span className="text-[9px] font-normal text-slate-400 block">{c.season} Season</span></td>
                        <td className="p-3 text-right text-[#FF4D00]">₹{c.twinRate || "-"}</td>
                        <td className="p-3 text-right">₹{c.tripleRate || "-"}</td>
                        <td className="p-3 text-right">₹{c.quadRate || "-"}</td>
                        <td className="p-3 text-right text-slate-400">₹{c.extraBedRate || "-"}</td>
                        <td className="p-3 text-center font-mono">{c.mealPlan}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-700">
                            <XCircle className="w-4 h-4 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {contracts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                          No contracts registered. Create a new contract to define ERP pricing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-500 font-bold text-sm">Select a Vendor</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs">
                Choose a vendor from the list to view and manage their structural contracts and rates.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800 border-b pb-2 border-slate-100">
              New Vendor Contract
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Destination</label>
              <Input value={contractForm.destination} onChange={e => setContractForm({...contractForm, destination: e.target.value})} placeholder="e.g. Manali" className="h-8.5" />
            </div>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Hotel Name</label>
              <Input value={contractForm.hotelName} onChange={e => setContractForm({...contractForm, hotelName: e.target.value})} placeholder="e.g. Mountain Resort" className="h-8.5" />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Room Category</label>
              <Input value={contractForm.roomCategory} onChange={e => setContractForm({...contractForm, roomCategory: e.target.value})} placeholder="Deluxe" className="h-8.5" />
            </div>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Season</label>
              <Input value={contractForm.season} onChange={e => setContractForm({...contractForm, season: e.target.value})} placeholder="Standard" className="h-8.5" />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Twin Rate (₹)</label>
              <Input type="number" value={contractForm.twinRate} onChange={e => setContractForm({...contractForm, twinRate: e.target.value})} placeholder="2500" className="h-8.5" />
            </div>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Triple Rate (₹)</label>
              <Input type="number" value={contractForm.tripleRate} onChange={e => setContractForm({...contractForm, tripleRate: e.target.value})} placeholder="3500" className="h-8.5" />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Quad Rate (₹)</label>
              <Input type="number" value={contractForm.quadRate} onChange={e => setContractForm({...contractForm, quadRate: e.target.value})} placeholder="4500" className="h-8.5" />
            </div>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Extra Bed (₹)</label>
              <Input type="number" value={contractForm.extraBedRate} onChange={e => setContractForm({...contractForm, extraBedRate: e.target.value})} placeholder="1000" className="h-8.5" />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Meal Plan</label>
              <Select value={contractForm.mealPlan} onValueChange={v => setContractForm({...contractForm, mealPlan: v})}>
                <SelectTrigger className="h-8.5 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="EP">EP (Room Only)</SelectItem>
                  <SelectItem value="CP">CP (Breakfast)</SelectItem>
                  <SelectItem value="MAP">MAP (Breakfast + Dinner)</SelectItem>
                  <SelectItem value="AP">AP (All Meals)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSaveContract} disabled={loading} className="bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-bold px-6 h-8.5 rounded">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save Contract"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

