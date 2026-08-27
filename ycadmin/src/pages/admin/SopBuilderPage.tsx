import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Trash2,
  Play,
  Copy,
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
import { useSearchParams, useNavigate } from "react-router-dom";
import { sopsService, SopTemplate, SopVersion, SopTaskTemplate } from "@/services/sops.service";
import { useStaffUsers } from "@/hooks/useStaffUsers";

const DEFAULT_STAGES = [
  { id: "ALL", label: "All Stages", isCustom: false, offsetDays: null },
  { id: "PRE_TRIP_30D", label: "PRE-TRIP 30D", isCustom: false, offsetDays: -30 },
  { id: "PRE_TRIP_21D", label: "PRE-TRIP 21D", isCustom: false, offsetDays: -21 },
  { id: "PRE_TRIP_14D", label: "PRE-TRIP 14D", isCustom: false, offsetDays: -14 },
  { id: "PRE_TRIP_7D", label: "PRE-TRIP 7D", isCustom: false, offsetDays: -7 },
  { id: "PRE_TRIP_3D", label: "PRE-TRIP 3D", isCustom: false, offsetDays: -3 },
  { id: "PRE_TRIP_1D", label: "PRE-TRIP 1D", isCustom: false, offsetDays: -1 },
  { id: "DEPARTURE_DAY", label: "DEPARTURE DAY", isCustom: false, offsetDays: 0 },
  { id: "DURING_TRIP", label: "DURING TRIP", isCustom: false, offsetDays: 1 },
  { id: "POST_TRIP", label: "POST TRIP", isCustom: false, offsetDays: 7 },
];

export default function SopBuilderPage() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId");
  const navigate = useNavigate();
  const { staffUsers } = useStaffUsers();

  const [template, setTemplate] = useState<SopTemplate | null>(null);
  const [activeVersion, setActiveVersion] = useState<SopVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("ALL");

  // Custom Stages state persisted in localStorage
  const [customStages, setCustomStages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("yc_custom_sop_stages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Hidden/Deleted default stages persisted in localStorage
  const [hiddenStageIds, setHiddenStageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("yc_hidden_sop_stages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [addStageModalOpen, setAddStageModalOpen] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState("");
  const [newStageOffset, setNewStageOffset] = useState(-5);

  const stagesList = [...DEFAULT_STAGES, ...customStages];
  const visibleStages = stagesList.filter(
    (s) => s.id === "ALL" || !hiddenStageIds.includes(s.id),
  );

  // Add/Edit Task Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SopTaskTemplate | null>(null);
  const [taskForm, setTaskForm] = useState({
    taskName: "",
    description: "",
    stage: "PRE_TRIP_7D",
    relativeOffset: -7,
    priority: "MEDIUM",
    isRequired: true,
    defaultAssignee: "Hemal Patel",
    instructions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [sampleDepartureDate, setSampleDepartureDate] = useState("2026-08-20");
  const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);

  const loadData = async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const tmplRes = await sopsService.getSopTemplates();
      const found = tmplRes.find((t) => t.id === templateId);
      if (found) {
        setTemplate(found);
        const ver =
          found.versions.find((v) => v.id === found.activeVersionId) ||
          found.versions[0];
        setActiveVersion(ver);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load SOP builder");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [templateId]);

  const handleOpenAddTask = () => {
    setEditingTask(null);
    const curStageObj = stagesList.find((s) => s.id === activeStage);
    const initialOffset =
      curStageObj && curStageObj.offsetDays !== null
        ? curStageObj.offsetDays
        : -7;
    setTaskForm({
      taskName: "",
      description: "",
      stage: activeStage !== "ALL" ? activeStage : "PRE_TRIP_7D",
      relativeOffset: initialOffset,
      priority: "MEDIUM",
      isRequired: true,
      defaultAssignee: "Hemal Patel",
      instructions: "",
    });
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (t: SopTaskTemplate) => {
    setEditingTask(t);
    setTaskForm({
      taskName: t.taskName,
      description: t.description || "",
      stage: t.stage,
      relativeOffset: t.relativeOffset,
      priority: t.priority,
      isRequired: t.isRequired,
      defaultAssignee: t.defaultAssignee || "Hemal Patel",
      instructions: t.instructions || "",
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVersion) return;
    if (!taskForm.taskName.trim()) {
      toast.error("Please enter Task Name");
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedOffset = parseInt(String(taskForm.relativeOffset), 10);
      const safeOffset = isNaN(parsedOffset) ? -7 : parsedOffset;
      const payload = {
        ...taskForm,
        taskName: taskForm.taskName.trim(),
        relativeOffset: safeOffset,
        stage: taskForm.stage,
      };

      if (editingTask) {
        await sopsService.updateTaskTemplate(editingTask.id, payload);
        toast.success("SOP Task Template updated!");
      } else {
        await sopsService.createTaskTemplate(activeVersion.id, payload);
        toast.success("SOP Task Template created!");
      }
      setTaskModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(
        "Failed to save task template: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this SOP task template?")) return;
    try {
      await sopsService.deleteTaskTemplate(taskId);
      toast.success("Task deleted");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task");
    }
  };

  const handlePreviewSchedule = async () => {
    if (!activeVersion || !sampleDepartureDate) return;
    try {
      const schedule = await sopsService.previewSopSchedule(
        activeVersion.id,
        sampleDepartureDate,
      );
      setPreviewSchedule(schedule);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to preview schedule");
    }
  };

  const handleCreateNewVersion = async () => {
    if (!template || !activeVersion) return;
    try {
      const newVer = await sopsService.createSopVersion(
        template.id,
        activeVersion.id,
      );
      toast.success(`Created draft Version ${newVer.versionLabel}`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create version");
    }
  };

  const handleActivateVersion = async (verId: string) => {
    try {
      await sopsService.activateSopVersion(verId);
      toast.success("SOP version activated successfully!");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to activate version");
    }
  };

  const handleAddCustomStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageLabel.trim()) return;

    const stageId = `CUSTOM_${newStageLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    if (stagesList.some((s) => s.id === stageId)) {
      toast.error("A stage with this name already exists");
      return;
    }

    const newStageObj = {
      id: stageId,
      label: newStageLabel.trim().toUpperCase(),
      isCustom: true,
      offsetDays: newStageOffset,
    };

    const updated = [...customStages, newStageObj];
    setCustomStages(updated);
    try {
      localStorage.setItem("yc_custom_sop_stages", JSON.stringify(updated));
    } catch {}

    setActiveStage(stageId);
    setNewStageLabel("");
    setAddStageModalOpen(false);
    toast.success(`Custom stage "${newStageObj.label}" created successfully!`);
  };

  const handleDeleteStage = (stageId: string) => {
    if (stageId === "ALL") return;

    const isCustom = customStages.some((s) => s.id === stageId);
    if (isCustom) {
      const updatedCustom = customStages.filter((s) => s.id !== stageId);
      setCustomStages(updatedCustom);
      try {
        localStorage.setItem("yc_custom_sop_stages", JSON.stringify(updatedCustom));
      } catch {}
    } else {
      const updatedHidden = [...hiddenStageIds, stageId];
      setHiddenStageIds(updatedHidden);
      try {
        localStorage.setItem("yc_hidden_sop_stages", JSON.stringify(updatedHidden));
      } catch {}
    }

    if (activeStage === stageId) {
      setActiveStage("ALL");
    }
    toast.success("Stage removed!");
  };

  const handleResetDefaultStages = () => {
    setHiddenStageIds([]);
    try {
      localStorage.removeItem("yc_hidden_sop_stages");
    } catch {}
    toast.success("Default stages restored!");
  };

  const normalizeStageStr = (str: string) =>
    (str || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const isTaskInStage = (t: SopTaskTemplate, s: any) => {
    if (s.id === "ALL") return true;

    // 1. If s is a custom stage (e.g. offset -10)
    if (s.isCustom) {
      return (
        t.stage === s.id ||
        normalizeStageStr(t.stage) === normalizeStageStr(s.id) ||
        (s.offsetDays !== null && t.relativeOffset === s.offsetDays)
      );
    }

    // 2. If s is a standard stage (e.g. PRE_TRIP_7D)
    // Check if any custom stage claims this task's relativeOffset
    const matchedCustom = customStages.find(
      (cs) => cs.offsetDays !== null && cs.offsetDays === t.relativeOffset,
    );
    if (matchedCustom) {
      // Task belongs to custom stage, so exclude from standard stage
      return false;
    }

    return (
      t.stage === s.id ||
      normalizeStageStr(t.stage) === normalizeStageStr(s.id) ||
      (s.offsetDays !== null && t.relativeOffset === s.offsetDays)
    );
  };

  const filteredTasks = (activeVersion?.taskTemplates || []).filter((t) => {
    const curStageObj = visibleStages.find((s) => s.id === activeStage);
    if (!curStageObj) return true;
    return isTaskInStage(t, curStageObj);
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading SOP Builder...</div>;
  }

  if (!template || !activeVersion) {
    return <div className="p-8 text-center text-slate-500">SOP Template not found.</div>;
  }

  return (
    <div className="admin-page">
      {/* Top Navigation & Title Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate("/admin/operations/sops")}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SOP Library
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-200">
              {activeVersion.status} ({activeVersion.versionLabel})
            </span>

            <Button
              onClick={handleCreateNewVersion}
              variant="outline"
              className="h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              New Draft Version
            </Button>

            <Button
              onClick={() => setPreviewModalOpen(true)}
              variant="outline"
              className="h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Preview Schedule
            </Button>

            <Button
              onClick={handleOpenAddTask}
              className="h-8 text-xs font-bold bg-[#FF4D00] hover:bg-[#EA580C] text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Task
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#FF4D00]/10 rounded-lg text-[#FF4D00]">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {template.name}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trip Type: <strong className="text-slate-800">{template.trip?.title}</strong> • Total Configured Tasks:{" "}
            <strong className="text-slate-800">{activeVersion.taskTemplates.length}</strong>
          </p>
        </div>

        {/* Version Switcher Strip */}
        <div className="admin-tabs gap-2 border-t border-slate-100 pt-3">
          <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SOP Versions:
          </span>
          {template.versions.map((v) => {
            const isActive = v.id === activeVersion.id;
            return (
              <div
                key={v.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <button onClick={() => setActiveVersion(v)} className="cursor-pointer">
                  {v.versionLabel} ({v.status})
                </button>
                {v.status !== "ACTIVE" && (
                  <button
                    onClick={() => handleActivateVersion(v.id)}
                    className="text-[9px] bg-[#FF4D00] text-white px-1.5 py-0.2 rounded hover:bg-[#FF4D00] ml-1"
                    title="Make Active Version"
                  >
                    Activate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Selector Tabs */}
      <div className="w-full bg-white p-3 rounded-xl border border-slate-200 shadow-3xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {visibleStages.map((s) => {
            const isSelected = activeStage === s.id;
            const count =
              s.id === "ALL"
                ? activeVersion.taskTemplates.length
                : activeVersion.taskTemplates.filter((t) => isTaskInStage(t, s))
                    .length;

            return (
              <div key={s.id} className="relative group flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveStage(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#FF4D00] text-white border-[#FF4D00] shadow-xs"
                      : "bg-slate-50/80 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span>{s.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : count > 0
                        ? "bg-[#FF4D00]/10 text-[#C2410C] font-extrabold"
                        : "bg-slate-200/60 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>

                  {s.id !== "ALL" && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStage(s.id);
                      }}
                      className={`ml-0.5 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] font-bold transition-colors ${
                        isSelected
                          ? "text-white/80 hover:bg-white/20 hover:text-white"
                          : "text-slate-400 hover:bg-red-100 hover:text-red-600"
                      }`}
                      title={`Remove ${s.label} stage tab`}
                    >
                      ×
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setAddStageModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-dashed border-[#FF4D00]/60 text-[#FF4D00] hover:bg-[#FF4D00]/5 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>

          {hiddenStageIds.length > 0 && (
            <button
              type="button"
              onClick={handleResetDefaultStages}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Reset & restore default stage pills"
            >
              Reset Defaults
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3 border-r border-slate-800">TASK TEMPLATE NAME</th>
              <th className="p-3 border-r border-slate-800 whitespace-nowrap">STAGE</th>
              <th className="p-3 border-r border-slate-800 text-center whitespace-nowrap">OFFSET</th>
              <th className="p-3 border-r border-slate-800 whitespace-nowrap">ASSIGNEE</th>
              <th className="p-3 border-r border-slate-800 text-center whitespace-nowrap">PRIORITY</th>
              <th className="p-3 border-r border-slate-800 text-center whitespace-nowrap">REQUIRED</th>
              <th className="p-3 text-center w-24">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center space-y-2.5">
                  <p className="text-xs font-extrabold text-slate-700">
                    No task templates configured for stage "{visibleStages.find((s) => s.id === activeStage)?.label || activeStage}"
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Click "+ Add Task" to create a task for this stage, or switch to another stage tab above (e.g., Departure Day has tasks).
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      onClick={handleOpenAddTask}
                      className="h-7.5 text-xs font-bold bg-[#FF4D00] hover:bg-[#EA580C] text-white px-3 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Task for {visibleStages.find((s) => s.id === activeStage)?.label || activeStage}
                    </Button>
                    <Button
                      onClick={() => setActiveStage("ALL")}
                      variant="outline"
                      className="h-7.5 text-xs font-bold border-slate-200 text-slate-700 px-3 cursor-pointer"
                    >
                      View All Stages ({activeVersion?.taskTemplates?.length || 0})
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((t, idx) => {
                const offsetText =
                  t.relativeOffset === 0
                    ? "T0 (Departure)"
                    : t.relativeOffset < 0
                    ? `T${t.relativeOffset} Days`
                    : `T+${t.relativeOffset} Days`;

                const stgMatch = stagesList.find(
                  (s) =>
                    s.id !== "ALL" &&
                    (s.id === t.stage ||
                      normalizeStageStr(s.id) === normalizeStageStr(t.stage) ||
                      (s.offsetDays !== null && s.offsetDays === t.relativeOffset)),
                );
                const displayStageLabel = stgMatch
                  ? stgMatch.label
                  : t.stage.replace(/^CUSTOM_/, "").replace(/_/g, " ");

                return (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-100">
                      <p className="font-extrabold text-slate-800 text-xs">{t.taskName}</p>
                      {t.instructions && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.instructions}</p>
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                      <span className="inline-flex items-center whitespace-nowrap text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {displayStageLabel}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-100 text-center whitespace-nowrap font-bold text-slate-700">
                      <span className="inline-flex items-center whitespace-nowrap text-[10px] bg-[#FF4D00]/5 text-[#C2410C] px-1.5 py-0.5 rounded border border-[#FF4D00]/20">
                        {offsetText}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-100 font-medium text-slate-700 whitespace-nowrap">
                      {t.defaultAssignee || "OPERATIONS"}
                    </td>
                    <td className="p-3 border-r border-slate-100 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center whitespace-nowrap text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          t.priority?.toUpperCase() === "CRITICAL"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : t.priority?.toUpperCase() === "HIGH"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : t.priority?.toUpperCase() === "MEDIUM"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {t.priority || "MEDIUM"}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-100 text-center whitespace-nowrap">
                      {t.isRequired ? (
                        <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          YES
                        </span>
                      ) : (
                        <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                          OPTIONAL
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleOpenEditTask(t)}
                          className="h-7 w-7 text-slate-500 hover:text-[#FF4D00]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteTask(t.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add / Edit Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingTask ? "Edit SOP Task Template" : "Add SOP Task Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configured tasks will automatically generate date-calculated instances for every departure.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTask} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Task Name <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. Room allocation finalized"
                value={taskForm.taskName}
                onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Stage</label>
                <select
                  value={taskForm.stage}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const stgObj = stagesList.find((s) => s.id === selectedId);
                    setTaskForm({
                      ...taskForm,
                      stage: selectedId,
                      relativeOffset:
                        stgObj && stgObj.offsetDays !== null
                          ? stgObj.offsetDays
                          : taskForm.relativeOffset,
                    });
                  }}
                  className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-800"
                >
                  {stagesList.filter((s) => s.id !== "ALL").map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Relative Offset (Days)
                </label>
                <Input
                  type="number"
                  placeholder="-30, -7, 0, 1"
                  value={taskForm.relativeOffset}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, relativeOffset: parseInt(e.target.value, 10) || 0 })
                  }
                  className="text-xs h-9"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">
                  e.g. -7 = 7 days before departure date
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-800"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Default Assignee</label>
                <select
                  value={taskForm.defaultAssignee}
                  onChange={(e) => setTaskForm({ ...taskForm, defaultAssignee: e.target.value })}
                  className="w-full h-9 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-800"
                >
                  {staffUsers.map((user) => (
                    <option key={user.id || user.email} value={user.name}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Instructions / Advisory Notes</label>
              <textarea
                placeholder="Specific operational rules or instructions for team..."
                value={taskForm.instructions}
                onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 h-16 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTaskModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#FF4D00] hover:bg-[#EA580C] text-white h-9 text-xs font-bold"
              >
                {isSubmitting ? "Saving..." : "Save SOP Task Template"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Schedule Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FF4D00]" />
              Dynamic Date Engine Preview Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Test how tasks will be automatically date-calculated for a specific departure.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 my-3 bg-[#FF4D00]/5 p-3 rounded-lg border border-[#FF4D00]/30">
            <span className="text-xs font-bold text-slate-700">Sample Departure Date (T0):</span>
            <Input
              type="date"
              value={sampleDepartureDate}
              onChange={(e) => {
                setSampleDepartureDate(e.target.value);
              }}
              className="text-xs h-8 bg-white max-w-[160px]"
            />
            <Button
              onClick={handlePreviewSchedule}
              className="h-8 text-xs bg-[#FF4D00] hover:bg-[#EA580C] text-white font-bold"
            >
              Recalculate
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                  <th className="p-2 border-b">OFFSET</th>
                  <th className="p-2 border-b">CALCULATED DUE DATE</th>
                  <th className="p-2 border-b">TASK NAME</th>
                  <th className="p-2 border-b">PRIORITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewSchedule.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-[#FF4D00]">{item.offsetLabel}</td>
                    <td className="p-2 font-extrabold text-slate-800">{item.dueDate}</td>
                    <td className="p-2 font-semibold text-slate-800">{item.taskName}</td>
                    <td className="p-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100">
                        {item.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Custom Stage Modal */}
      <Dialog open={addStageModalOpen} onOpenChange={setAddStageModalOpen}>
        <DialogContent className="max-w-sm bg-white p-6 rounded-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#FF4D00]" />
              Generate Custom Stage
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a new stage pill for your SOP workflow (e.g. PRE-TRIP 45D, EQUIPMENT CHECK, etc.)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomStage} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Stage Label / Name <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. PRE-TRIP 45D or GEAR CHECK 5D"
                value={newStageLabel}
                onChange={(e) => setNewStageLabel(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Relative Day Offset (T-minus / T-plus)
              </label>
              <Input
                type="number"
                placeholder="-45, -5, 0, 1"
                value={newStageOffset}
                onChange={(e) => setNewStageOffset(parseInt(e.target.value, 10) || 0)}
                className="text-xs h-9"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                e.g. -45 = 45 days before departure, 0 = departure day.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddStageModalOpen(false)}
                className="h-8 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 text-xs font-bold bg-[#FF4D00] hover:bg-[#EA580C] text-white"
              >
                Generate Stage Pill
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

