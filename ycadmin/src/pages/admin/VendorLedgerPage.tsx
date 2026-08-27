import { useState, useEffect } from "react";
import api from "@/services/api";
import { format } from "date-fns";
import { IndianRupee, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function VendorLedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ledger");
      if (res.data.success) {
        setEntries(res.data.data);
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      toast.error("Failed to load ledger: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="min-w-0">
          <h1 className="admin-title">Financial Ledger</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Centralized view of all vendor credits and debits.</p>
        </div>
        <Button onClick={loadData} variant="outline" className="h-9 font-bold bg-white" disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-xs font-black text-slate-500 uppercase">Total Credits</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{summary.totalCredit.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-xs font-black text-slate-500 uppercase">Total Debits</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{summary.totalDebit.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xs font-black text-slate-300 uppercase">Net Balance</h3>
          </div>
          <p className={cn("text-2xl font-bold", summary.balance < 0 ? "text-red-400" : "text-green-400")}>
            ₹{summary.balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-500">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Vendor</th>
              <th className="p-4">Description</th>
              <th className="p-4">Reference ID</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-right">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-xs">{format(new Date(entry.date), "dd MMM yyyy")}</td>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{entry.vendor?.name || "Unknown"}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{entry.vendor?.vendorCode}</div>
                </td>
                <td className="p-4">{entry.description || "-"}</td>
                <td className="p-4 font-mono text-xs text-slate-500">{entry.referenceId || "-"}</td>
                <td className="p-4 text-right font-bold">₹{entry.amount.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <span className={cn("px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider", 
                    entry.type === "CREDIT" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    {entry.type}
                  </span>
                </td>
              </tr>
            ))}
            {entries.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold">
                  No ledger entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
