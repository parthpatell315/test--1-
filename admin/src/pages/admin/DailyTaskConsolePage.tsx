import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  UserCheck,
  Zap,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Layers,
  FileCheck,
  ShieldAlert,
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
import { useStaffUsers } from "@/hooks/useStaffUsers";

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

const getTaskDueDateStr = (task: any): string => {
  if (task.dueDate) return String(task.dueDate).split("T")[0];
  if (task.departureDate) {
    const depStr = String(task.departureDate).split("T")[0];
    const parts = depStr.split("-");
    if (parts.length === 3) {
      let offset = 0;
      if (task.relativeOffset !== undefined && task.relativeOffset !== null) {
        offset = Number(task.relativeOffset);
      } else {
        const stage = task.stage || "";
        if (stage.includes("60D")) offset = -60;
        else if (stage.includes("45D")) offset = -45;
        else if (stage.includes("30D")) offset = -30;
        else if (stage.includes("21D")) offset = -21;
        else if (stage.includes("14D")) offset = -14;
        else if (stage.includes("10D")) offset = -10;
        else if (stage.includes("7D")) offset = -7;
        else if (stage.includes("5D")) offset = -5;
        else if (stage.includes("3D")) offset = -3;
        else if (stage.includes("2D")) offset = -2;
        else if (stage.includes("1D")) offset = -1;
        else if (stage === "DEPARTURE_DAY") offset = 0;
        else if (stage.includes("DURING_TRIP") || stage.includes("ON_TRIP")) offset = 1;
        else if (stage === "POST_TRIP") offset = 9;
      }

      const calculated = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      calculated.setDate(calculated.getDate() + offset);
      return calculated.toISOString().split("T")[0];
    }
  }
  return "";
};

const getDynamicDueDateDisplay = (task: any) => {
  const dueStr = getTaskDueDateStr(task);
  if (!dueStr) return "—";
  const todayStr = new Date().toISOString().split("T")[0];
  if (dueStr === todayStr) return "Today, " + formatDateDisplay(dueStr, false);
  return formatDateDisplay(dueStr, true);
};

export default function DailyTaskConsolePage() {
  const { staffUsers } = useStaffUsers();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View Mode: TODAY by default!
  const [viewMode, setViewMode] = useState<"TODAY" | "OVERDUE" | "UPCOMING" | "ALL">("TODAY");

  // Secondary Filters
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create/Edit Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskForm, setTaskForm] = useState({
    tripId: "SPT-1",
    departureDate: new Date().toISOString().substring(0, 10),
    taskName: "",
    stage: "PRE_TRIP_30D",
    assignedTo: "OPERATIONS",
    priority: "HIGH",
    dueDate: new Date().toISOString().substring(0, 10),
    status: "Pending",
    notes: "",
    remarks: "",
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await opsService.getAllTasks({
        assignee: assigneeFilter,
        source: sourceFilter,
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery,
      });

      if (Array.isArray(data) && data.length > 0) {
        setTasks(data);
      } else {
        // Dynamic Seed Tasks mapped to current date
        const todayDate = new Date();
        const fmtDate = (addDays: number) => {
          const d = new Date(todayDate);
          d.setDate(d.getDate() + addDays);
          return d.toISOString().split("T")[0];
        };

        setTasks([
          {
            id: "console-1",
            tripId: "SPT-1",
            departureDate: fmtDate(14),
            taskName: "Verify High-Altitude Medical Consent Forms & Oxygen Prep",
            stage: "PRE_TRIP_14D",
            assignedTo: "OPERATIONS",
            priority: "CRITICAL",
            dueDate: fmtDate(0), // Today!
            status: "Pending",
            source: "SOP",
            notes: "Collect AMS consent for Spiti Valley trip from all participants under 18.",
          },
          {
            id: "console-2",
            tripId: "KRL-1",
            departureDate: fmtDate(7),
            taskName: "Reconfirm Houseboat Private Booking & Menu Selection",
            stage: "PRE_TRIP_7D",
            assignedTo: "OPERATIONS",
            priority: "HIGH",
            dueDate: fmtDate(0), // Today!
            status: "In Progress",
            source: "MANUAL",
            notes: "Assigned by Senior Ops Lead for Kerala Backwaters departure.",
          },
          {
            id: "console-3",
            tripId: "MKA-1",
            departureDate: fmtDate(1),
            taskName: "Tempo Traveller Fleet Pickup & Fuel Allowance Handover",
            stage: "PRE_TRIP_1D",
            assignedTo: "TRANSPORT_DESK",
            priority: "CRITICAL",
            dueDate: fmtDate(0), // Today!
            status: "Pending",
            source: "SOP",
            notes: "Reconfirm driver phone numbers & commercial RC permit copies.",
          },
          {
            id: "console-4",
            tripId: "SPT-1",
            departureDate: fmtDate(3),
            taskName: "Hotel Rooming Allocation & Matrix Finalization",
            stage: "PRE_TRIP_3D",
            assignedTo: "LEAD_GUIDE",
            priority: "HIGH",
            dueDate: fmtDate(0), // Today!
            status: "Completed",
            completedAt: new Date().toISOString(),
            source: "SOP",
            notes: "4-sharing homestay arrangement finalized in Kaza.",
          },
          {
            id: "console-5",
            tripId: "MNL-2",
            departureDate: fmtDate(10),
            taskName: "Train Tickets Reviewed & PNR Status Verified",
            stage: "PRE_TRIP_14D",
            assignedTo: "TICKETING",
            priority: "CRITICAL",
            dueDate: fmtDate(-2), // Overdue
            status: "Pending",
            source: "SOP",
            notes: "Audit all PNR statuses & train coach numbers.",
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching daily tasks:", err);
      toast.error("Failed to load operations tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [assigneeFilter, sourceFilter, priorityFilter, statusFilter]);

  const toggleTaskCompletion = async (task: any) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    const nextCompleted = nextStatus === "Completed";

    try {
      if (task.tripId && task.id && !task.id.startsWith("console-")) {
        await opsService.saveTask(
          task.tripId,
          {
            id: task.id,
            status: nextStatus,
            isCompleted: nextCompleted,
          },
          task.departureDate,
        );
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: nextStatus,
                isCompleted: nextCompleted,
                completedAt: nextCompleted ? new Date().toISOString() : null,
              }
            : t,
        ),
      );

      toast.success(
        nextCompleted
          ? `Marked "${task.taskName}" as Completed`
          : `Reopened "${task.taskName}"`,
      );
    } catch (err) {
      console.error("Toggle task error:", err);
      toast.error("Failed to update task status");
    }
  };

  const handleSaveTaskForm = async () => {
    if (!taskForm.taskName.trim()) {
      toast.error("Please enter a task name");
      return;
    }

    try {
      const payload = {
        taskName: taskForm.taskName,
        stage: taskForm.stage,
        assignedTo: taskForm.assignedTo,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
        status: taskForm.status,
        notes: taskForm.notes,
        remarks: taskForm.remarks,
        source: "MANUAL",
      };

      if (editingTask && !editingTask.id.startsWith("console-")) {
        await opsService.saveTask(taskForm.tripId, {
          id: editingTask.id,
          ...payload,
        });
        toast.success("Task updated successfully");
      } else {
        await opsService.saveTask(taskForm.tripId, payload);
        toast.success("New task created and assigned");
      }

      setIsTaskModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error("Save task error:", err);
      toast.error("Failed to save task");
    }
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Trip ID",
      "Task Name",
      "Stage",
      "Assigned To",
      "Priority",
      "Due Date",
      "Status",
      "Source",
      "Notes",
    ].join(",");
    const rows = filteredTasks.map((t) =>
      [
        `"${t.tripId || "SPT-1"}"`,
        `"${t.taskName}"`,
        t.stage || "PRE_TRIP",
        t.assignedTo || "OPERATIONS",
        t.priority || "HIGH",
        getTaskDueDateStr(t) || "—",
        t.status || "Pending",
        t.source || "SOP",
        `"${t.notes || ""}"`,
      ].join(","),
    );

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_tasks_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── FILTERING COMPUTATIONS ──
  const filteredTasks = tasks.filter((t) => {
    const isDone = t.status === "Completed" || t.isCompleted;
    const dueStr = getTaskDueDateStr(t);

    // View Mode Filter
    if (viewMode === "TODAY") {
      if (isDone) {
        const compDate = t.completedAt ? String(t.completedAt).split("T")[0] : "";
        if (compDate !== todayStr && dueStr !== todayStr) return false;
      } else {
        // Strictly tasks due today
        if (dueStr !== todayStr) return false;
      }
    } else if (viewMode === "OVERDUE") {
      if (isDone) return false;
      if (!dueStr || dueStr >= todayStr) return false;
    } else if (viewMode === "UPCOMING") {
      if (!dueStr || dueStr <= todayStr) return false;
    }

    // Secondary dropdown filters
    if (assigneeFilter !== "ALL" && (t.assignedTo || "OPERATIONS") !== assigneeFilter) return false;
    if (sourceFilter !== "ALL" && (t.source || "SOP") !== sourceFilter) return false;
    if (priorityFilter !== "ALL" && (t.priority || "HIGH") !== priorityFilter) return false;
    if (statusFilter !== "ALL") {
      if (statusFilter === "Completed" && !isDone) return false;
      if (statusFilter === "Pending" && (isDone || t.status === "In Progress")) return false;
      if (statusFilter === "In Progress" && t.status !== "In Progress") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (t.taskName || "").toLowerCase().includes(q);
      const tripMatch = (t.tripId || "").toLowerCase().includes(q);
      const notesMatch = (t.notes || "").toLowerCase().includes(q);
      if (!nameMatch && !tripMatch && !notesMatch) return false;
    }

    return true;
  }).sort((a, b) => {
    const PRIORITY_RANK: Record<string, number> = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
    };
    const rankA = PRIORITY_RANK[a.priority?.toUpperCase()] || 99;
    const rankB = PRIORITY_RANK[b.priority?.toUpperCase()] || 99;
    return rankA - rankB;
  });

  // KPI Counters
  const todayDueCount = tasks.filter((t) => getTaskDueDateStr(t) === todayStr && !(t.status === "Completed" || t.isCompleted)).length;
  const overdueCount = tasks.filter((t) => {
    const isDone = t.status === "Completed" || t.isCompleted;
    const dueStr = getTaskDueDateStr(t);
    return !isDone && dueStr && dueStr < todayStr;
  }).length;
  const completedTodayCount = tasks.filter((t) => {
    const isDone = t.status === "Completed" || t.isCompleted;
    const compDate = t.completedAt ? String(t.completedAt).split("T")[0] : "";
    return isDone && (compDate === todayStr || getTaskDueDateStr(t) === todayStr);
  }).length;
  const criticalCount = tasks.filter((t) => t.priority === "CRITICAL" && !(t.status === "Completed" || t.isCompleted)).length;
  const totalCount = tasks.length;

  return (
    <div className="admin-page">
      {/* ── STICKY HEADER & WORKSTATION TITLE ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/30 flex items-center justify-center text-[#FF4D00] shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                DAILY OPERATIONS TASK CONSOLE
              </h1>
              <span className="bg-[#FF4D00]/10 text-[#C2410C] border border-[#FF4D00]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                Live Workstation
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Focus on today's execution for <strong className="text-slate-800">{formatDateDisplay(todayStr, true)}</strong>. Auto-generated by Trip SOPs or assigned by senior colleagues.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" /> Export Tasks CSV
          </Button>
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskForm({
                tripId: "SPT-1",
                departureDate: todayStr,
                taskName: "",
                stage: "PRE_TRIP_30D",
                assignedTo: "OPERATIONS",
                priority: "HIGH",
                dueDate: todayStr,
                status: "Pending",
                notes: "",
                remarks: "",
              });
              setIsTaskModalOpen(true);
            }}
            size="sm"
            className="h-9 text-xs font-bold gap-1.5 bg-[#FF4D00] hover:bg-[#E05E00] text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Assign Quick Task
          </Button>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setViewMode("TODAY")}
          className={cn(
            "bg-white border rounded-xl p-4 shadow-2xs space-y-1 cursor-pointer transition-all hover:border-[#FF4D00]/40",
            viewMode === "TODAY" ? "border-[#FF4D00] ring-2 ring-[#FF4D00]/10 bg-[#FF4D00]/5/20" : "border-slate-200",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#C2410C] uppercase tracking-wider">
              Today's Due Tasks
            </span>
            <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse" />
          </div>
          <p className="text-2xl font-black text-slate-900">{todayDueCount}</p>
          <p className="text-[9.5px] text-slate-400 font-medium">Due {formatDateDisplay(todayStr, false)}</p>
        </div>

        <div
          onClick={() => setViewMode("OVERDUE")}
          className={cn(
            "bg-red-50/40 border rounded-xl p-4 shadow-2xs space-y-1 cursor-pointer transition-all hover:border-red-300",
            viewMode === "OVERDUE" ? "border-red-500 ring-2 ring-red-500/10 bg-red-50/60" : "border-red-200",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider">
              Overdue Action
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700">{overdueCount}</p>
          <p className="text-[9.5px] text-red-600 font-medium">Requires immediate action</p>
        </div>

        <div className="bg-green-50/40 border border-green-200 rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider block">
            Completed Today
          </span>
          <p className="text-2xl font-black text-green-700">{completedTodayCount}</p>
          <p className="text-[9.5px] text-green-600 font-medium">
            {todayDueCount + completedTodayCount > 0
              ? `${Math.round((completedTodayCount / (todayDueCount + completedTodayCount)) * 100)}% execution rate`
              : "0%"}
          </p>
        </div>

        <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
            Critical Priority
          </span>
          <p className="text-2xl font-black text-amber-700">{criticalCount}</p>
          <p className="text-[9.5px] text-amber-600 font-medium">High readiness impact</p>
        </div>

        <div
          onClick={() => setViewMode("ALL")}
          className={cn(
            "bg-white border rounded-xl p-4 shadow-2xs space-y-1 cursor-pointer transition-all hover:border-slate-300",
            viewMode === "ALL" ? "border-slate-400 ring-2 ring-slate-400/10 bg-slate-50" : "border-slate-200",
          )}
        >
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Total Logged
          </span>
          <p className="text-2xl font-black text-slate-800">{totalCount}</p>
          <p className="text-[9.5px] text-slate-400 font-medium">Across all departures</p>
        </div>
      </div>

      {/* ── WORKSTATION VIEW MODES (PILL TABS) ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode("TODAY")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "TODAY"
                ? "bg-white text-[#FF4D00] shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <span>TODAY'S TASKS</span>
            <span className={cn("px-1.5 py-0.2 rounded text-[10px]", viewMode === "TODAY" ? "bg-[#FF4D00]/10 text-[#C2410C]" : "bg-slate-200 text-slate-700")}>
              {todayDueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("OVERDUE")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "OVERDUE"
                ? "bg-white text-red-600 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <span>OVERDUE ACTION</span>
            <span className={cn("px-1.5 py-0.2 rounded text-[10px]", viewMode === "OVERDUE" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700")}>
              {overdueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("UPCOMING")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "UPCOMING"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <span>UPCOMING DEPARTURES</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "ALL"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <span>ALL LOGGED</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700">
              {totalCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={fetchTasks}
            className="h-8 text-xs font-bold text-slate-600 hover:text-[#FF4D00] gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </Button>
        </div>
      </div>

      {/* ── SECONDARY FILTER TOOLBAR ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 text-xs font-bold border border-slate-200 rounded-lg px-3 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer shadow-3xs"
          >
            <option value="ALL">All Staff Assignees</option>
            {staffUsers.map((u) => (
              <option key={u.id || u.email} value={u.name}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 text-xs font-bold border border-slate-200 rounded-lg px-3 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer shadow-3xs"
          >
            <option value="ALL">All Task Sources</option>
            <option value="SOP">SOP & Checklist Auto-Tasks</option>
            <option value="MANUAL">Assigned by Seniors / Colleagues</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 text-xs font-bold border border-slate-200 rounded-lg px-3 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer shadow-3xs"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search task name, trip code, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full pl-9 pr-3 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#FF4D00]"
          />
        </div>
      </div>

      {/* ── TASKS MASTER TABLE ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <th className="p-3.5 w-12 text-center">DONE</th>
              <th className="p-3.5 border-r border-slate-100">TRIP / DEPARTURE</th>
              <th className="p-3.5 border-r border-slate-100">TASK NAME & INSTRUCTIONS</th>
              <th className="p-3.5 border-r border-slate-100 text-center">STAGE</th>
              <th className="p-3.5 border-r border-slate-100">ASSIGNED TO</th>
              <th className="p-3.5 border-r border-slate-100 text-center">PRIORITY</th>
              <th className="p-3.5 border-r border-slate-100">DUE DATE</th>
              <th className="p-3.5 border-r border-slate-100 text-center">SOURCE</th>
              <th className="p-3.5 border-r border-slate-100 text-center">STATUS</th>
              <th className="p-3.5 text-center w-20">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-400 font-medium">
                  Loading daily operations tasks...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-400 font-medium">
                  No operations tasks found for <strong className="text-slate-700">{viewMode === "TODAY" ? "Today's Workstation" : viewMode}</strong>.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => {
                const isDone = t.status === "Completed" || t.isCompleted;
                const depDateClean = t.departureDate ? String(t.departureDate).split("T")[0] : todayStr;
                const depDateFormatted = formatDateDisplay(t.departureDate, false);
                const dueDateFormatted = getDynamicDueDateDisplay(t);
                const dueStr = getTaskDueDateStr(t);
                const isDueToday = dueStr === todayStr;
                const isOverdue = !isDone && dueStr && dueStr < todayStr;

                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "hover:bg-slate-50/80 transition-colors",
                      isDone && "bg-slate-50/50 opacity-75",
                      isDueToday && !isDone && "bg-[#FF4D00]/5/20",
                    )}
                  >
                    {/* DONE Checkbox */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => toggleTaskCompletion(t)}
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-all mx-auto cursor-pointer",
                          isDone
                            ? "bg-green-600 border-green-500 text-white"
                            : "border-slate-300 hover:border-slate-400 bg-white",
                        )}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* TRIP / DEPARTURE */}
                    <td className="p-3.5 border-r border-slate-100 font-bold">
                      <a
                        href={`/admin/departure-workspace?tab=operations&departureId=${t.tripId}_${depDateClean}`}
                        className="group flex items-center gap-1.5 text-slate-900 hover:text-[#FF4D00] font-black text-xs"
                      >
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200 text-[10px] font-mono">
                          {t.tripId || "SPT-1"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({depDateFormatted})
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF4D00] transition-colors" />
                      </a>
                    </td>

                    {/* TASK NAME & INSTRUCTIONS */}
                    <td className="p-3.5 border-r border-slate-100 space-y-0.5">
                      <p className={cn("font-extrabold text-slate-800", isDone && "line-through text-slate-400")}>
                        {t.taskName}
                      </p>
                      {t.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                          {t.notes}
                        </p>
                      )}
                    </td>

                    {/* STAGE */}
                    <td className="p-3.5 border-r border-slate-100 text-center">
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                        {t.stage?.replace(/_/g, " ") || "PRE TRIP"}
                      </span>
                    </td>

                    {/* ASSIGNED TO */}
                    <td className="p-3.5 border-r border-slate-100 font-bold text-slate-700">
                      {t.assignedTo || "OPERATIONS"}
                    </td>

                    {/* PRIORITY */}
                    <td className="p-3.5 border-r border-slate-100 text-center">
                      <span
                        className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider inline-block",
                          t.priority?.toUpperCase() === "CRITICAL"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : t.priority?.toUpperCase() === "HIGH"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : t.priority?.toUpperCase() === "MEDIUM"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200",
                        )}
                      >
                        {t.priority || "HIGH"}
                      </span>
                    </td>

                    {/* DUE DATE */}
                    <td className="p-3.5 border-r border-slate-100 font-bold text-slate-700 text-xs">
                      <span className={cn(isDueToday && !isDone && "text-[#FF4D00] font-black")}>
                        {dueDateFormatted}
                      </span>
                    </td>

                    {/* SOURCE */}
                    <td className="p-3.5 border-r border-slate-100 text-center">
                      <span
                        className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider inline-block",
                          t.source === "BOOKING"
                            ? "bg-slate-50 text-slate-700 border-slate-200"
                            : t.source === "MANUAL"
                              ? "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30"
                              : "bg-blue-50 text-blue-700 border-blue-200",
                        )}
                      >
                        {t.source === "BOOKING" ? "Booking Task" : t.source === "MANUAL" ? "Senior / Colleague" : "SOP & Checklist"}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="p-3.5 border-r border-slate-100 text-center">
                      <span
                        className={cn(
                          "text-[9.5px] font-black px-2 py-0.5 rounded border uppercase tracking-wider inline-block",
                          isDone
                            ? "bg-green-50 text-green-700 border-green-200"
                            : isOverdue
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isDueToday
                                ? "bg-[#FF4D00]/10 text-[#C2410C] border-[#FF4D00]/40"
                                : t.status === "In Progress"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {isDone ? "COMPLETED" : isOverdue ? "OVERDUE" : isDueToday ? "DUE TODAY" : t.status || "PENDING"}
                      </span>
                    </td>

                    {/* ACTION */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {t.bookingId && (
                          <a
                            href={`/admin/bookings?id=${t.bookingId}&tab=tasks`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          >
                            Booking <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                        <Button
                          onClick={() => {
                            setEditingTask(t);
                            setTaskForm({
                              tripId: t.tripId || "SPT-1",
                              departureDate: t.departureDate || todayStr,
                              taskName: t.taskName,
                              stage: t.stage || "PRE_TRIP_30D",
                              assignedTo: t.assignedTo || "OPERATIONS",
                              priority: t.priority || "HIGH",
                              dueDate: dueStr || todayStr,
                              status: t.status || "Pending",
                              notes: t.notes || "",
                              remarks: t.remarks || "",
                            });
                            setIsTaskModalOpen(true);
                          }}
                          variant="ghost"
                          size="xs"
                          className="text-xs font-bold text-slate-600 hover:text-[#FF4D00] hover:bg-[#FF4D00]/5"
                        >
                          Edit
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

      {/* ── CREATE / EDIT TASK MODAL ── */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogTitle className="text-base font-black text-slate-900">
            {editingTask ? "Edit Operations Task" : "Assign New Operations Task"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Assign or update task details for team members.
          </DialogDescription>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Task Name *
              </label>
              <input
                type="text"
                value={taskForm.taskName}
                onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                placeholder="e.g. Verify Tempo Traveller commercial permit"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Trip ID
                </label>
                <input
                  type="text"
                  value={taskForm.tripId}
                  onChange={(e) => setTaskForm({ ...taskForm, tripId: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-[#FF4D00]"
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={taskForm.departureDate}
                  onChange={(e) => setTaskForm({ ...taskForm, departureDate: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Assignee / Staff Member
                </label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  {staffUsers.map((u) => (
                    <option key={u.id || u.email} value={u.name}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Status
                </label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-white outline-none focus:border-[#FF4D00]"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                Instructions / Notes
              </label>
              <textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                rows={2}
                placeholder="Operational notes or specific requirements..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#FF4D00]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              onClick={handleSaveTaskForm}
              className="h-9 text-xs font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white"
            >
              Save Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


