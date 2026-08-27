import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Layers,
  HelpCircle,
  FileCheck,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sopsService } from "@/services/sops.service";
import { useStaffUsers } from "@/hooks/useStaffUsers";

interface OpsSopTaskTemplateData {
  id?: string;
  taskName: string;
  instructions?: string;
  category?: string;
  taskType?: string;
  stage: string;
  relativeOffset: number;
  defaultAssignee?: string;
  priority: string;
  isRequired: boolean;
  sortOrder?: number;
}

interface TripSopEditorTabProps {
  tripId?: string;
  tripTitle?: string;
  sopEnabled?: boolean;
  onToggleSopEnabled?: (enabled: boolean) => void;
  taskTemplates?: OpsSopTaskTemplateData[];
  onUpdateTasks?: (tasks: OpsSopTaskTemplateData[]) => void;
}

const STAGE_GROUPS = [
  { id: "PRE_TRIP", label: "PRE-TRIP (Before Departure)" },
  { id: "DEPARTURE_DAY", label: "DEPARTURE DAY (Day 0 Reporting)" },
  { id: "DURING_TRIP", label: "DURING TRIP (On-Tour Operations)" },
  { id: "POST_TRIP", label: "POST TRIP (Feedback & Settlement)" },
];

const RELATIVE_OFFSETS = [
  { value: -60, label: "T-60 (60 Days Before)" },
  { value: -45, label: "T-45 (45 Days Before)" },
  { value: -30, label: "T-30 (30 Days Before)" },
  { value: -21, label: "T-21 (21 Days Before)" },
  { value: -14, label: "T-14 (14 Days Before)" },
  { value: -10, label: "T-10 (10 Days Before)" },
  { value: -7, label: "T-7 (7 Days Before)" },
  { value: -5, label: "T-5 (5 Days Before)" },
  { value: -3, label: "T-3 (3 Days Before)" },
  { value: -2, label: "T-2 (2 Days Before)" },
  { value: -1, label: "T-1 (1 Day Before)" },
  { value: 0, label: "T0 (Departure Day)" },
  { value: 1, label: "Day 1 / T+1" },
  { value: 2, label: "Day 2 / T+2" },
  { value: 3, label: "Day 3 / T+3" },
  { value: 4, label: "Day 4 / T+4" },
  { value: 9, label: "Post Trip (T+9)" },
];

const TASK_CATEGORIES = [
  "Accommodation",
  "Transport",
  "Guide",
  "Ticketing",
  "Pax Communication",
  "Emergency",
  "Activities",
  "General",
];

const TASK_TYPES = [
  "CHECKLIST",
  "REMINDER",
  "VERIFICATION",
  "APPROVAL",
  "COMMUNICATION",
  "DOCUMENT",
  "INSPECTION",
  "FOLLOW_UP",
];

export default function TripSopEditorTab({
  tripId,
  tripTitle,
  sopEnabled = true,
  onToggleSopEnabled,
  taskTemplates = [],
  onUpdateTasks,
}: TripSopEditorTabProps) {
  const { staffUsers } = useStaffUsers();
  const [tasks, setTasks] = useState<OpsSopTaskTemplateData[]>(taskTemplates);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<OpsSopTaskTemplateData | null>(null);

  const [form, setForm] = useState<OpsSopTaskTemplateData>({
    taskName: "",
    instructions: "",
    category: "Accommodation",
    taskType: "VERIFICATION",
    stage: "PRE_TRIP_30D",
    relativeOffset: -30,
    defaultAssignee: "Hemal Patel",
    priority: "HIGH",
    isRequired: true,
  });

  // Sync internal state when parent props load
  useEffect(() => {
    if (taskTemplates && taskTemplates.length > 0) {
      setTasks(taskTemplates);
    } else if (tripId) {
      fetchTripSop();
    }
  }, [tripId, taskTemplates]);

  const fetchTripSop = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const template = await sopsService.getSopByTrip(tripId);
      const activeVersion =
        template?.versions?.find((v) => v.id === template?.activeVersionId) ||
        template?.versions?.[0];
      const fetchedTasks = (activeVersion?.taskTemplates || []) as OpsSopTaskTemplateData[];
      if (fetchedTasks.length > 0) {
        setTasks(fetchedTasks);
        if (onUpdateTasks) onUpdateTasks(fetchedTasks);
      }
    } catch (err) {
      console.error("Fetch Trip SOP error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = () => {
    if (!form.taskName.trim()) {
      toast.error("Please provide a task name");
      return;
    }

    let updatedList: OpsSopTaskTemplateData[];
    if (editingTask && editingTask.id) {
      updatedList = tasks.map((t) => (t.id === editingTask.id ? { ...form, id: editingTask.id } : t));
      toast.success(`Updated task "${form.taskName}"`);
    } else {
      const newTask = {
        ...form,
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      updatedList = [...tasks, newTask];
      toast.success(`Added SOP task "${form.taskName}"`);
    }

    setTasks(updatedList);
    if (onUpdateTasks) onUpdateTasks(updatedList);
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setForm({
      taskName: "",
      instructions: "",
      category: "Accommodation",
      taskType: "VERIFICATION",
      stage: "PRE_TRIP_30D",
      relativeOffset: -30,
      defaultAssignee: "Hemal Patel",
      priority: "HIGH",
      isRequired: true,
    });
  };

  const handleDeleteTask = (id?: string) => {
    if (!id) return;
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    if (onUpdateTasks) onUpdateTasks(updated);
    toast.success("Removed SOP task");
  };

  const handleOpenEdit = (task: OpsSopTaskTemplateData) => {
    setEditingTask(task);
    setForm({ ...task });
    setIsTaskModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTask(null);
    setForm({
      taskName: "",
      instructions: "",
      category: "Accommodation",
      taskType: "VERIFICATION",
      stage: "PRE_TRIP_30D",
      relativeOffset: -30,
      defaultAssignee: "Hemal Patel",
      priority: "HIGH",
      isRequired: true,
    });
    setIsTaskModalOpen(true);
  };

  const handleLoadPreset = (tripType: string) => {
    let preset: OpsSopTaskTemplateData[] = [];
    if (tripType === "spiti") {
      preset = [
        {
          taskName: "Confirm Hotel Bookings & Homestay Allocation in Kaza",
          instructions: "Confirm 4-sharing homestay rooming policy and advance voucher payment.",
          category: "Accommodation",
          taskType: "VERIFICATION",
          stage: "PRE_TRIP_30D",
          relativeOffset: -30,
          defaultAssignee: "OPERATIONS",
          priority: "CRITICAL",
          isRequired: true,
        },
        {
          taskName: "Verify High-Altitude Medical Disclosure & Guardian Consent",
          instructions: "Collect AMS hydration disclosure and under-18 guardian contact forms.",
          category: "Emergency",
          taskType: "DOCUMENT",
          stage: "PRE_TRIP_14D",
          relativeOffset: -14,
          defaultAssignee: "OPERATIONS",
          priority: "CRITICAL",
          isRequired: true,
        },
        {
          taskName: "Train Tickets Reviewed & PNR Status Verified",
          instructions: "Audit train PNR status for Shimla/Chandigarh train legs. Never promise unconfirmed seats.",
          category: "Ticketing",
          taskType: "VERIFICATION",
          stage: "PRE_TRIP_14D",
          relativeOffset: -14,
          defaultAssignee: "TICKETING",
          priority: "HIGH",
          isRequired: true,
        },
        {
          taskName: "Oxygen Cylinder & Emergency First-Aid Kit Inspection",
          instructions: "Inspect medical oxygen pressure valve and pulse oximeter battery.",
          category: "Emergency",
          taskType: "INSPECTION",
          stage: "PRE_TRIP_7D",
          relativeOffset: -7,
          defaultAssignee: "OPERATIONS",
          priority: "CRITICAL",
          isRequired: true,
        },
        {
          taskName: "Rooming Matrix & Seat Rotation Schedule Briefing",
          instructions: "Finalize room allocation matrix and seat rotation rules for long drives.",
          category: "Guide",
          taskType: "CHECKLIST",
          stage: "PRE_TRIP_3D",
          relativeOffset: -3,
          defaultAssignee: "LEAD_GUIDE",
          priority: "HIGH",
          isRequired: true,
        },
        {
          taskName: "Tempo Traveller Fleet Commercial RC & Permit Verification",
          instructions: "Check hill driving commercial RC permits & driver emergency contacts.",
          category: "Transport",
          taskType: "VERIFICATION",
          stage: "PRE_TRIP_1D",
          relativeOffset: -1,
          defaultAssignee: "TRANSPORT_DESK",
          priority: "CRITICAL",
          isRequired: true,
        },
        {
          taskName: "Departure Headcount & Welcome Briefing",
          instructions: "Conduct headcount at pickup point, verify original IDs, and log attendance.",
          category: "Pax Communication",
          taskType: "COMMUNICATION",
          stage: "DEPARTURE_DAY",
          relativeOffset: 0,
          defaultAssignee: "LEAD_GUIDE",
          priority: "CRITICAL",
          isRequired: true,
        },
        {
          taskName: "Daily Homestay Check-in & Pulse Oximeter Log",
          instructions: "Record daily participant SpO2 oxygen levels on Trip Control Sheet.",
          category: "General",
          taskType: "CHECKLIST",
          stage: "DURING_TRIP",
          relativeOffset: 1,
          defaultAssignee: "LEAD_GUIDE",
          priority: "HIGH",
          isRequired: false,
        },
      ];
    } else if (tripType === "manali") {
      preset = [
        {
          taskName: "Bhrigu Rental Timing & Equipment Reservation",
          instructions: "Reserve trekking boots, jackets, and sticks with Manali vendor.",
          category: "Activities",
          taskType: "VERIFICATION",
          stage: "PRE_TRIP_30D",
          relativeOffset: -30,
          defaultAssignee: "OPERATIONS",
          priority: "HIGH",
          isRequired: true,
        },
        {
          taskName: "Rafting Status & River Permit Reconfirmation",
          instructions: "Check Kullu rafting water levels and safety gear compliance.",
          category: "Activities",
          taskType: "VERIFICATION",
          stage: "PRE_TRIP_14D",
          relativeOffset: -14,
          defaultAssignee: "OPERATIONS",
          priority: "HIGH",
          isRequired: true,
        },
        {
          taskName: "DJ / Sound Speaker Permit & Campfire Arrangement",
          instructions: "Confirm campsite music permits and firewood stock.",
          category: "General",
          taskType: "CHECKLIST",
          stage: "PRE_TRIP_3D",
          relativeOffset: -3,
          defaultAssignee: "LEAD_GUIDE",
          priority: "MEDIUM",
          isRequired: false,
        },
        {
          taskName: "Hidimba Temple Local Vehicle Restriction Advisory",
          instructions: "Advise Tempo drivers regarding local taxi union parking restrictions.",
          category: "Transport",
          taskType: "REMINDER",
          stage: "PRE_TRIP_1D",
          relativeOffset: -1,
          defaultAssignee: "TRANSPORT_DESK",
          priority: "HIGH",
          isRequired: true,
        },
      ];
    }

    setTasks(preset);
    if (onUpdateTasks) onUpdateTasks(preset);
    toast.success(`Loaded ${preset.length} preset tasks for ${tripType.toUpperCase()}`);
  };

  const getStageTasks = (stagePrefix: string) => {
    return tasks.filter((t) => {
      const st = (t.stage || "").toUpperCase();
      const offset = Number(t.relativeOffset);

      if (stagePrefix === "PRE_TRIP") {
        return (
          st.includes("PRE_TRIP") ||
          st.includes("BEFORE") ||
          (!isNaN(offset) && offset < 0)
        );
      }
      if (stagePrefix === "DEPARTURE_DAY") {
        return (
          st === "DEPARTURE_DAY" ||
          st.includes("DEPARTURE") ||
          st.includes("DAY_0") ||
          st.includes("DAY 0") ||
          offset === 0
        );
      }
      if (stagePrefix === "DURING_TRIP") {
        return (
          st.includes("ON_TRIP") ||
          st.includes("DURING_TRIP") ||
          st.includes("DAY_") ||
          st.includes("DAY ") ||
          st.includes("ON_TOUR") ||
          (!isNaN(offset) && offset > 0 && offset < 9)
        );
      }
      if (stagePrefix === "POST_TRIP") {
        return (
          st.includes("POST_TRIP") ||
          st.includes("SETTLEMENT") ||
          st.includes("FEEDBACK") ||
          (!isNaN(offset) && offset >= 9)
        );
      }
      return false;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── SOP CONTROL HEADER CARD ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/30 flex items-center justify-center text-[#FF4D00]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Operations SOP & Master Checklist
                </h3>
                <span className="bg-[#FF4D00]/10 text-[#C2410C] font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border border-[#FF4D00]/30">
                  Trip SOP Owner
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Define operational task rules for <strong className="text-slate-800">{tripTitle || "this Trip"}</strong>. All departures created from this trip will automatically inherit these date-driven tasks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Enable Trip SOP:</span>
              <Switch
                checked={sopEnabled}
                onCheckedChange={(val) => onToggleSopEnabled && onToggleSopEnabled(val)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end pt-1">
          <Button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setForm({
                taskName: "",
                instructions: "",
                category: "Accommodation",
                taskType: "VERIFICATION",
                stage: "PRE_TRIP_30D",
                relativeOffset: -30,
                defaultAssignee: "OPERATIONS",
                priority: "HIGH",
                isRequired: true,
              });
              setIsTaskModalOpen(true);
            }}
            size="sm"
            className="h-9 text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white shadow-xs gap-1.5"
          >
            <Plus className="w-4 h-4" /> + Add SOP Task Template
          </Button>
        </div>
      </div>

      {/* ── STAGE GROUPINGS (SIMPLE LIST) ── */}
      <div className="space-y-5">
        {STAGE_GROUPS.map((group) => {
          const groupTasks = getStageTasks(group.id);
          return (
            <div key={group.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {group.label}
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {groupTasks.length} {groupTasks.length === 1 ? "Task" : "Tasks"}
                  </span>
                </div>
              </div>

              {groupTasks.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400 font-medium">
                  No SOP tasks configured for {group.label}. Click "+ Add SOP Task Template" above to add one.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groupTasks.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {t.taskName}
                          </span>
                          <span className="text-[9.5px] font-black px-2 py-0.5 rounded bg-[#FF4D00]/5 text-[#C2410C] border border-[#FF4D00]/30">
                            {RELATIVE_OFFSETS.find((r) => r.value === t.relativeOffset)?.label || `Offset: ${t.relativeOffset} Days`}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {t.category || "General"}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#FF4D00]/5 text-[#C2410C] border border-[#FF4D00]/30">
                            {t.taskType || "CHECKLIST"}
                          </span>
                          {t.isRequired && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 uppercase">
                              Required for Readiness
                            </span>
                          )}
                        </div>

                        {t.instructions && (
                          <p className="text-xs text-slate-500 font-medium">
                            {t.instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right text-xs">
                          <p className="font-bold text-slate-700">{t.defaultAssignee || "OPERATIONS"}</p>
                          <p
                            className={cn(
                              "text-[10px] font-black uppercase",
                              t.priority === "CRITICAL"
                                ? "text-red-600"
                                : t.priority === "HIGH"
                                  ? "text-amber-600"
                                  : "text-blue-600",
                            )}
                          >
                            {t.priority} PRIORITY
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setEditingTask(t);
                              setForm({ ...t });
                              setIsTaskModalOpen(true);
                            }}
                            className="h-8 w-8 text-slate-500 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDeleteTask(t.id, t.taskName)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CREATE / EDIT SOP TASK MODAL ── */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogTitle className="text-base font-black text-slate-900">
            {editingTask ? "Edit Trip SOP Task Template" : "Add SOP Task Template to Trip"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Define task rules and relative due dates. Every departure created for this trip will inherit this task.
          </DialogDescription>

          <div className="space-y-3.5 py-3 text-xs">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Task Name *
              </label>
              <input
                type="text"
                value={form.taskName}
                onChange={(e) => setForm({ ...form, taskName: e.target.value })}
                placeholder="e.g. Confirm all hotels & homestay rooming"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Instructions / Operational Notes
              </label>
              <textarea
                value={form.instructions || ""}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows={2}
                placeholder="Detailed steps, voucher reconfirmation rules, or advisory notes..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Relative Due Date (Offset)
                </label>
                <select
                  value={form.relativeOffset}
                  onChange={(e) => {
                    const offset = Number(e.target.value);
                    let stage = "PRE_TRIP_30D";
                    if (offset < 0) stage = `PRE_TRIP_${Math.abs(offset)}D`;
                    else if (offset === 0) stage = "DEPARTURE_DAY";
                    else if (offset > 0 && offset < 9) stage = "DURING_TRIP";
                    else if (offset === 9) stage = "POST_TRIP";

                    setForm({ ...form, relativeOffset: offset, stage });
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  {RELATIVE_OFFSETS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={form.category || "Accommodation"}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Task Type
                </label>
                <select
                  value={form.taskType || "VERIFICATION"}
                  onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Assignee / Staff Member
                </label>
                <select
                  value={form.defaultAssignee || "Hemal Patel"}
                  onChange={(e) => setForm({ ...form, defaultAssignee: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  {staffUsers.map((user) => (
                    <option key={user.id || user.email} value={user.name}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Priority
                </label>
                <select
                  value={form.priority || "HIGH"}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRequired !== false}
                    onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                    className="w-4 h-4 text-[#FF4D00] rounded border-slate-300 focus:ring-[#FF4D00]"
                  />
                  <span className="font-bold text-slate-800">
                    Required for Departure Readiness
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTaskModalOpen(false)}
              className="h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTask}
              className="h-9 text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white"
            >
              Save SOP Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

