import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { sopsService, SopTemplate } from "@/services/sops.service";
import { api } from "@/services/api";
import { useNavigate } from "react-router-dom";

export default function SopLibraryPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<SopTemplate[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create SOP Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [sopName, setSopName] = useState("");
  const [sopDesc, setSopDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tmplRes, tripsRes] = await Promise.all([
        sopsService.getSopTemplates(),
        api.get("/trips").then((res) => res.data?.data || []),
      ]);
      setTemplates(tmplRes);
      setTrips(tripsRes);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load SOP library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.trip?.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !sopName) {
      toast.error("Please select a trip and enter an SOP name");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await sopsService.createSopTemplate({
        tripId: selectedTripId,
        name: sopName,
        description: sopDesc,
      });
      toast.success("SOP Master Template created successfully!");
      setCreateModalOpen(false);
      setSopName("");
      setSopDesc("");
      setSelectedTripId("");
      loadData();
      navigate(`/admin/operations/sops/builder?templateId=${created.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create SOP");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#FF4D00]/10 rounded-lg text-[#FF4D00]">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              SOP & CHECKLISTS LIBRARY
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trip-specific operational procedures, dynamic relative offsets (T-30 to T+N), and date-driven checklist engine.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#FF4D00] hover:bg-[#EA580C] text-white font-semibold text-xs h-10 px-4 rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Trip SOP
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search trip type or SOP name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-xs h-10 rounded-lg shadow-sm"
          />
        </div>
      </div>

      {/* Grid of Trip SOP Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm font-medium">
          Loading SOP master templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No SOP Templates Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by creating a trip-specific SOP template for Spiti, Manali, Kerala, or Kashmir.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 bg-[#FF4D00] hover:bg-[#EA580C] text-white text-xs h-9 px-3 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Trip SOP
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tmpl) => {
            const activeVer = tmpl.versions.find(
              (v) => v.id === tmpl.activeVersionId,
            ) || tmpl.versions[0];
            const taskCount = activeVer?.taskTemplates?.length || 0;
            const criticalCount =
              activeVer?.taskTemplates?.filter((t) => t.priority === "CRITICAL")
                .length || 0;

            return (
              <div
                key={tmpl.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#FF4D00]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#FF4D00]/5 text-[#FF4D00] border border-[#FF4D00]/30 uppercase tracking-wider">
                      {tmpl.trip?.title || tmpl.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Active SOP: {activeVer?.versionLabel || "v1"}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tmpl.description || "Standard operational procedure guidelines and date-driven checklist tasks."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        SOP Tasks
                      </span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {taskCount} Tasks
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Critical Tasks
                      </span>
                      <span className="text-sm font-extrabold text-red-600">
                        {criticalCount} Critical
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated {new Date(tmpl.updatedAt).toLocaleDateString()}
                  </span>

                  <Button
                    onClick={() =>
                      navigate(`/admin/operations/sops/builder?templateId=${tmpl.id}`)
                    }
                    variant="outline"
                    className="h-8 text-xs font-bold text-[#FF4D00] border-[#FF4D00]/30 hover:bg-[#FF4D00]/5 hover:text-[#EA580C]"
                  >
                    Open SOP
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create SOP Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Create New Trip SOP Master Template
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define trip-specific operational checklists for Spiti, Manali, Kerala, Kashmir, etc.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSop} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Select Trip Type <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => {
                  setSelectedTripId(e.target.value);
                  const found = trips.find((t) => t.id === e.target.value);
                  if (found) {
                    setSopName(`${found.title} Master SOP`);
                  }
                }}
                className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2.5 bg-white text-slate-800 focus:outline-none focus:border-[#FF4D00]"
                required
              >
                <option value="">-- Choose a Trip --</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                SOP Template Name <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. Spiti Valley Road Trip SOP"
                value={sopName}
                onChange={(e) => setSopName(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Description & Operational Context
              </label>
              <textarea
                placeholder="Operational rules, room sharing policies, high-altitude advisories..."
                value={sopDesc}
                onChange={(e) => setSopDesc(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 h-20 text-slate-800 focus:outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#FF4D00] hover:bg-[#EA580C] text-white h-9 text-xs font-bold"
              >
                {isSubmitting ? "Creating..." : "Create & Configure SOP"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

