import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash,
  Check,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Download,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { opsService } from "@/services/ops.service";

import { sopsService } from "@/services/sops.service";

interface DepartureTasksProps {
  tripId: string;
  departureDateStr: string;
}

export default function DepartureTasks({
  tripId,
  departureDateStr,
}: DepartureTasksProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingSop, setIsApplyingSop] = useState(false);

  // Filters
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [search, setSearch] = useState("");

  // Modals & Form
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskForm, setTaskForm] = useState({
    taskName: "",
    stage: "PRE_TRIP_30D",
    assignedTo: "OPERATIONS",
    priority: "MEDIUM",
    dueDate: "",
    status: "Pending",
    notes: "",
    remarks: "",
  });

  const calcOffsetDate = (daysOffset: number) => {
    try {
      const d = new Date(departureDateStr);
      if (isNaN(d.getTime())) return departureDateStr;
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().substring(0, 10);
    } catch {
      return departureDateStr;
    }
  };

  const formatDateDisplay = (dateVal: any, includeYear: boolean = true) => {
    if (!dateVal) return "—";
    try {
      const rawStr = typeof dateVal === "string" ? dateVal : new Date(dateVal).toISOString();
      const str = rawStr.split("T")[0];
      const parts = str.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const monthIdx = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (!isNaN(day) && !isNaN(monthIdx) && months[monthIdx]) {
          return includeYear ? `${day} ${months[monthIdx]} ${year}` : `${day} ${months[monthIdx]}`;
        }
      }
    } catch {}
    return "—";
  };

  const getFormattedDueDate = (task: any) => {
    if (task.dueDate) {
      return formatDateDisplay(task.dueDate, true);
    }

    try {
      const depStr = String(departureDateStr).split("T")[0];
      const parts = depStr.split("-");
      if (parts.length !== 3) return "—";

      let offsetDays = 0;
      if (task.relativeOffset !== undefined && task.relativeOffset !== null) {
        offsetDays = task.relativeOffset;
      } else {
        const stage = task.stage || "";
        if (stage === "PRE_TRIP_30D") offsetDays = -30;
        else if (stage === "PRE_TRIP_21D") offsetDays = -21;
        else if (stage === "PRE_TRIP_14D") offsetDays = -14;
        else if (stage === "PRE_TRIP_7D") offsetDays = -7;
        else if (stage === "PRE_TRIP_3D") offsetDays = -3;
        else if (stage === "PRE_TRIP_1D") offsetDays = -1;
        else if (stage === "DEPARTURE_DAY") offsetDays = 0;
        else if (stage === "DURING_TRIP") offsetDays = 1;
        else if (stage === "POST_TRIP") offsetDays = 9;
      }

      const calculated = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      calculated.setDate(calculated.getDate() + offsetDays);
      return formatDateDisplay(calculated, true);
    } catch {
      return "—";
    }
  };

  const DEFAULT_CHECKLIST_TASKS = [
    {
      id: "def-1",
      taskName: "Confirm Hotel Bookings & Advance Payment",
      stage: "PRE_TRIP_30D",
      relativeOffset: -30,
      assignedTo: "OPERATIONS",
      priority: "HIGH",
      dueDate: calcOffsetDate(-30),
      status: "Pending",
      notes: "Verify all hotel vouchers and payment receipts",
      isCompleted: false,
      source: "SOP",
    },
    {
      id: "def-2",
      taskName: "Assign Lead Tour Guide & Vehicle Driver",
      stage: "PRE_TRIP_14D",
      relativeOffset: -14,
      assignedTo: "OPERATIONS",
      priority: "HIGH",
      dueDate: calcOffsetDate(-14),
      status: "Pending",
      notes: "Assign guide contact & vehicle license details",
      isCompleted: false,
      source: "SOP",
    },
    {
      id: "def-3",
      taskName: "Verify Vehicle Fleet & Driver Credentials",
      stage: "PRE_TRIP_7D",
      relativeOffset: -7,
      assignedTo: "TRANSPORT_DESK",
      priority: "HIGH",
      dueDate: calcOffsetDate(-7),
      status: "Pending",
      notes: "Check tempo Traveller permits and driver phone",
      isCompleted: false,
      source: "SOP",
    },
    {
      id: "def-4",
      taskName: "Create WhatsApp Group & Send Pax Welcome Kit",
      stage: "PRE_TRIP_3D",
      relativeOffset: -3,
      assignedTo: "SALES_EXEC",
      priority: "HIGH",
      dueDate: calcOffsetDate(-3),
      status: "Pending",
      notes: "Send meeting point info & packing checklist",
      isCompleted: false,
      source: "SOP",
    },
    {
      id: "def-5",
      taskName: "Final Passenger Manifest & Train Ticket Audit",
      stage: "DEPARTURE_DAY",
      relativeOffset: 0,
      assignedTo: "TICKETING",
      priority: "URGENT",
      dueDate: calcOffsetDate(0),
      status: "Pending",
      notes: "Audit all PNR statuses & train coach numbers",
      isCompleted: false,
      source: "SOP",
    },
    {
      id: "def-6",
      taskName: "Hotel Check-in & Daily Operations Tracking",
      stage: "DURING_TRIP",
      relativeOffset: 1,
      assignedTo: "LEAD_GUIDE",
      priority: "HIGH",
      dueDate: calcOffsetDate(1),
      status: "Pending",
      notes: "Update daily check-ins on Trip Control Sheet",
      isCompleted: false,
      source: "SOP",
    },
  ];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await opsService.getTasks(tripId, departureDateStr);
      if (Array.isArray(data) && data.length > 0) {
        setTasks(data);
      } else {
        // Automatically apply active Trip SOP for this departure
        try {
          await sopsService.applySopToDeparture(tripId, departureDateStr);
          const freshData = await opsService.getTasks(tripId, departureDateStr);
          if (Array.isArray(freshData) && freshData.length > 0) {
            setTasks(freshData);
          } else {
            setTasks(DEFAULT_CHECKLIST_TASKS);
          }
        } catch {
          setTasks(DEFAULT_CHECKLIST_TASKS);
        }
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);
      setTasks(DEFAULT_CHECKLIST_TASKS);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySop = async () => {
    setIsApplyingSop(true);
    try {
      const res = await sopsService.applySopToDeparture(tripId, departureDateStr);
      toast.success(res?.message || "Applied Trip SOP successfully!");
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to apply SOP to departure");
    } finally {
      setIsApplyingSop(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [tripId, departureDateStr]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingTask) {
        await opsService.updateTask(
          tripId,
          departureDateStr,
          editingTask.id,
          taskForm,
        );
        toast.success("Task updated successfully!");
      } else {
        await opsService.createTask(tripId, departureDateStr, taskForm);
        toast.success("Task created successfully!");
      }
      setTaskModalOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to save task";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await opsService.deleteTask(id);
      toast.success("Task deleted successfully!");
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to delete task";
      toast.error(errMsg);
    }
  };

  // Quick Toggle Complete
  const toggleComplete = async (task: any) => {
    try {
      const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
      await opsService.updateTask(tripId, departureDateStr, task.id, {
        ...task,
        status: nextStatus,
        isCompleted: nextStatus === "Completed",
      });
      toast.success(`Task marked as ${nextStatus}`);
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to toggle status";
      toast.error(errMsg);
    }
  };

  // KPI Calculations
  const kpis = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "Completed").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    pending: tasks.filter((t) => t.status === "Pending").length,
    overdue: tasks.filter(
      (t) =>
        t.status === "Overdue" ||
        (t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          t.status !== "Completed"),
    ).length,
  };

  const PRIORITY_ORDER: Record<string, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };

  const filteredTasks = tasks
    .filter((t) => {
      const matchStage = stageFilter === "All Stages" || t.stage === stageFilter;
      const matchPriority =
        priorityFilter === "All Priorities" || t.priority === priorityFilter;
      const matchStatus =
        statusFilter === "All Status" || t.status === statusFilter;
      const matchSource =
        sourceFilter === "All Sources" ||
        (sourceFilter === "SOP Tasks" && (t.source === "SOP" || !t.source)) ||
        (sourceFilter === "Manual Tasks" && t.source === "MANUAL");
      const matchSearch =
        search === "" ||
        t.taskName.toLowerCase().includes(search.toLowerCase()) ||
        (t.remarks && t.remarks.toLowerCase().includes(search.toLowerCase()));
      return matchStage && matchPriority && matchStatus && matchSource && matchSearch;
    })
    .sort((a, b) => {
      const rankA = PRIORITY_ORDER[a.priority?.toUpperCase()] || 99;
      const rankB = PRIORITY_ORDER[b.priority?.toUpperCase()] || 99;
      return rankA - rankB;
    });

  const handleDownloadCSV = () => {
    if (filteredTasks.length === 0) {
      toast.info("No tasks to export");
      return;
    }
    const headers = [
      "Task Name",
      "Stage",
      "Assigned To",
      "Priority",
      "Due Date",
      "Status",
      "Source",
      "Remarks",
    ].join(",");
    const rows = filteredTasks.map((t) =>
      [
        `"${t.taskName}"`,
        t.stage,
        t.assignedTo || "Unassigned",
        t.priority,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN") : "—",
        t.status,
        t.source || "SOP",
        `"${t.remarks || ""}"`,
      ].join(","),
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `departure_tasks_${tripId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Total Tasks",
            value: kpis.total,
            desc: "Across all stages",
            color: "text-slate-700",
            bg: "bg-slate-50",
          },
          {
            label: "Completed",
            value: kpis.completed,
            desc:
              kpis.total > 0
                ? `${Math.round((kpis.completed / kpis.total) * 100)}% of total`
                : "0% of total",
            color: "text-green-600",
            bg: "bg-green-50/50",
          },
          {
            label: "In Progress",
            value: kpis.inProgress,
            desc: "Active items",
            color: "text-blue-600",
            bg: "bg-blue-50/50",
          },
          {
            label: "Pending",
            value: kpis.pending,
            desc:
              kpis.total > 0
                ? `${Math.round((kpis.pending / kpis.total) * 100)}% of total`
                : "0% of total",
            color: "text-amber-600",
            bg: "bg-amber-50/50",
          },
          {
            label: "Overdue",
            value: kpis.overdue,
            desc: "Passed due date",
            color: "text-red-600",
            bg: "bg-red-50/50",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              "border border-[#E2E8F0] rounded-[6px] p-3.5 shadow-3xs space-y-1",
              kpi.bg,
            )}
          >
            <p className={cn("text-2xl font-black", kpi.color)}>{kpi.value}</p>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
              {kpi.label}
            </p>
            <p className="text-[9px] text-slate-400 font-medium">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-3.5 shadow-xs flex flex-wrap gap-2.5 items-center">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
        >
          <option value="All Stages">All Stages</option>
          {[
            "PRE_TRIP_30D",
            "PRE_TRIP_21D",
            "PRE_TRIP_14D",
            "PRE_TRIP_7D",
            "PRE_TRIP_3D",
            "PRE_TRIP_1D",
            "DEPARTURE_DAY",
            "DURING_TRIP",
            "POST_TRIP",
          ].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
        >
          <option value="All Priorities">All Priorities</option>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
        >
          <option value="All Status">All Status</option>
          {["Pending", "In Progress", "Completed", "Overdue"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full pl-8 text-[11px] rounded-[4px] border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <button
          onClick={handleDownloadCSV}
          className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-3 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-3xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
        </button>
        <button
          onClick={() => {
            setEditingTask(null);
            setTaskForm({
              taskName: "",
              stage: "PRE_TRIP_30D",
              assignedTo: "OPERATIONS",
              priority: "MEDIUM",
              dueDate: new Date().toISOString().substring(0, 10),
              status: "Pending",
              notes: "",
              remarks: "",
            });
            setTaskModalOpen(true);
          }}
          className="h-8 text-[11px] font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-3.5 flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      </div>

      {/* Task List Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-[#E2E8F0]">
            <tr className="text-[9.5px] font-bold text-slate-450 uppercase tracking-wider">
              <th className="p-3 w-10 text-center">DONE</th>
              <th className="p-3 border-r border-slate-100">TASK NAME</th>
              <th className="p-3 border-r border-slate-100">STAGE</th>
              <th className="p-3 border-r border-slate-100">ASSIGNED TO</th>
              <th className="p-3 border-r border-slate-100 text-center">
                PRIORITY
              </th>
              <th className="p-3 border-r border-slate-100">DUE DATE</th>
              <th className="p-3 border-r border-slate-100 text-center">
                STATUS
              </th>
              <th className="p-3 text-center w-28">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-slate-400 font-medium"
                >
                  Loading tasks checklist data...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-slate-400 font-medium"
                >
                  No tasks logged matching active filters.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleComplete(t)}
                      className={cn(
                        "p-1.5 rounded-full border transition-colors",
                        t.status === "Completed"
                          ? "bg-green-50 text-green-600 border-green-200"
                          : "bg-white text-slate-300 border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-3 border-r border-slate-100">
                    <p className="font-extrabold text-slate-800">
                      {t.taskName}
                    </p>
                    {t.notes && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t.notes}
                      </p>
                    )}
                  </td>
                  <td className="p-3 border-r border-slate-100">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                      {t.stage.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3 border-r border-slate-100 font-bold text-slate-700">
                    {t.assignedTo || "Unassigned"}
                  </td>
                  <td className="p-3 border-r border-slate-100 text-center">
                    <span
                      className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider block w-fit mx-auto",
                        t.priority?.toUpperCase() === "CRITICAL"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : t.priority?.toUpperCase() === "HIGH"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : t.priority?.toUpperCase() === "MEDIUM"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200",
                      )}
                    >
                      {t.priority || "MEDIUM"}
                    </span>
                  </td>
                  <td className="p-3 border-r border-slate-100 font-semibold text-slate-600">
                    {getFormattedDueDate(t)}
                  </td>
                  <td className="p-3 border-r border-slate-100 text-center">
                    <span
                      className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider inline-block",
                        t.status === "Completed"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : t.status === "In Progress"
                            ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                            : t.status === "Overdue"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      <button
                        onClick={() => {
                          setEditingTask(t);
                          setTaskForm({
                            taskName: t.taskName,
                            stage: t.stage,
                            assignedTo: t.assignedTo || "OPERATIONS",
                            priority: t.priority,
                            dueDate: t.dueDate
                              ? t.dueDate.substring(0, 10)
                              : "",
                            status: t.status,
                            notes: t.notes || "",
                            remarks: t.remarks || "",
                          });
                          setTaskModalOpen(true);
                        }}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9.5px] font-bold px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="bg-red-50 text-red-650 hover:bg-red-100 text-[9.5px] font-bold px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-lg border border-slate-200">
          <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-wider">
            {editingTask ? "Edit Operational Task" : "Add Operational Task"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-450 mt-1">
            Specify the task name, stage, and operational role assigned.
          </DialogDescription>
          <form onSubmit={handleSubmit} className="space-y-4 mt-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Task Title
              </label>
              <input
                type="text"
                required
                value={taskForm.taskName}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, taskName: e.target.value }))
                }
                placeholder="e.g. Call passengers for confirmation"
                className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Stage
                </label>
                <select
                  value={taskForm.stage}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, stage: e.target.value }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                >
                  <option value="PRE_TRIP_30D">Pre Trip (30 Days)</option>
                  <option value="PRE_TRIP_7D">Pre Trip (7 Days)</option>
                  <option value="PRE_TRIP_1D">Pre Trip (1 Day)</option>
                  <option value="DEPARTURE_DAY">Departure Day</option>
                  <option value="DURING_TRIP">During Trip</option>
                  <option value="POST_TRIP">Post Trip</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Assigned Department
                </label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      assignedTo: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                >
                  <option value="OPERATIONS">Operations Staff</option>
                  <option value="GUIDE">Trip Guide</option>
                  <option value="FINANCE">Finance Admin</option>
                  <option value="TRAVEL_DESK">Travel Desk</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Task Subtitle / Description
              </label>
              <textarea
                rows={2}
                value={taskForm.notes}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Details of the task..."
                className="w-full text-xs font-bold border border-slate-200 rounded p-2 bg-white text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Staff Remarks
              </label>
              <textarea
                rows={2}
                value={taskForm.remarks}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Log updates or notes here..."
                className="w-full text-xs font-bold border border-slate-200 rounded p-2 bg-white text-slate-700 outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTaskModalOpen(false)}
                className="h-8 text-xs font-bold text-slate-500 rounded"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-8 bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase rounded"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingTask
                    ? "Save Task"
                    : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

