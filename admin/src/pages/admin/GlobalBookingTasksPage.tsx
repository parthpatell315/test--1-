import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  ArrowUpRight, 
  Filter,
  Plus,
  Globe,
  Ticket,
  Calendar,
  AlertCircle,
  Layers,
  ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { bookingsService } from "@/services/bookings.service";
import { useStaffUsers } from "@/hooks/useStaffUsers";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function GlobalBookingTasksPage() {
  const { staffUsers } = useStaffUsers();
  const { admin } = useAuthStore();
  const canViewAllTasks = hasPermission(
    admin?.permissions || [],
    PERMISSIONS.TASKS_VIEW_ALL,
    admin?.role,
  );
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters — non-privileged staff are locked to their own assignee id
  const [typeFilter, setTypeFilter] = useState<"ALL" | "UNIVERSAL" | "BOOKING">("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState(
    canViewAllTasks ? "ALL" : admin?.id || "ALL",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskCategory, setTaskCategory] = useState<"UNIVERSAL" | "BOOKING">("UNIVERSAL");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    dueDate: "",
    priority: "MEDIUM",
    taskType: "UNIVERSAL",
    bookingId: "",
  });

  useEffect(() => {
    if (!canViewAllTasks && admin?.id && assigneeFilter !== admin.id) {
      setAssigneeFilter(admin.id);
    }
  }, [canViewAllTasks, admin?.id, assigneeFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await bookingsService.getAllBookingTasks({
        status: statusFilter,
        assignee: canViewAllTasks ? assigneeFilter : admin?.id || assigneeFilter,
        type: typeFilter,
      });
      setTasks(data || []);
    } catch (e) {
      toast.error("Failed to fetch tasks");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, assigneeFilter, typeFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!taskForm.assignedToId) {
      toast.error("Please assign the task to a staff member");
      return;
    }
    if (taskCategory === "BOOKING" && !taskForm.bookingId.trim()) {
      toast.error("Please enter a Booking ID");
      return;
    }

    setSubmitting(true);
    try {
      await bookingsService.createUniversalOrBookingTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        assignedToId: taskForm.assignedToId,
        dueDate: taskForm.dueDate || undefined,
        priority: taskForm.priority,
        taskType: taskCategory === "UNIVERSAL" ? taskForm.taskType : "BOOKING",
        bookingId: taskCategory === "BOOKING" ? taskForm.bookingId.trim() : undefined,
      });

      toast.success(
        taskCategory === "BOOKING"
          ? "Booking task created successfully"
          : "Universal task created successfully"
      );
      setShowCreateModal(false);
      setTaskForm({
        title: "",
        description: "",
        assignedToId: "",
        dueDate: "",
        priority: "MEDIUM",
        taskType: "UNIVERSAL",
        bookingId: "",
      });
      fetchTasks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create task");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await bookingsService.updateTask(taskId, newStatus);
      toast.success(`Task status updated to ${newStatus.replace("_", " ")}`);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchBooking = t.booking?.bookingId?.toLowerCase().includes(q);
      const matchName = t.booking?.fullName?.toLowerCase().includes(q) || t.booking?.name?.toLowerCase().includes(q);
      const matchAssignee = t.assignedTo?.name?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchBooking || matchName || matchAssignee;
    }
    return true;
  });

  const universalCount = tasks.filter((t) => t.taskCategory === "UNIVERSAL").length;
  const bookingCount = tasks.filter((t) => t.taskCategory === "BOOKING").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tasks & Allotments
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {tasks.length} total
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Create, manage, and track universal operational tasks along with booking-specific tasks.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#FF5A1F] hover:bg-[#E04D15] text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Task
        </Button>
      </div>

      {/* Tabs for Category Type */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setTypeFilter("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
            typeFilter === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Layers className="w-3.5 h-3.5" /> All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setTypeFilter("UNIVERSAL")}
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
            typeFilter === "UNIVERSAL"
              ? "bg-[#FF5A1F] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Globe className="w-3.5 h-3.5" /> Universal Tasks ({universalCount})
        </button>
        <button
          onClick={() => setTypeFilter("BOOKING")}
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
            typeFilter === "BOOKING"
              ? "bg-[#0B1528] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Ticket className="w-3.5 h-3.5" /> Booking Tasks ({bookingCount})
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, description, booking ID or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-xs font-semibold rounded-md border border-slate-200 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 text-xs font-semibold rounded-md border border-slate-200 bg-white focus:outline-none focus:border-[#FF5A1F]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            disabled={!canViewAllTasks}
            className="h-8 px-3 text-xs font-semibold rounded-md border border-slate-200 bg-white focus:outline-none focus:border-[#FF5A1F] max-w-[150px] disabled:opacity-60"
          >
            {canViewAllTasks && <option value="ALL">All Assignees</option>}
            {canViewAllTasks
              ? staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))
              : (
                  <option value={admin?.id || ""}>
                    {admin?.name || "My tasks"}
                  </option>
                )}
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Task Details</th>
                <th className="px-4 py-3">Category / Scope</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    Loading tasks…
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    No tasks found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isBooking = t.taskCategory === "BOOKING" || Boolean(t.booking);
                  const isDone = t.status === "COMPLETED";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className={cn("font-bold text-slate-900", isDone && "line-through text-slate-400")}>
                              {t.title}
                            </div>
                            {t.description && (
                              <div className="text-[10px] text-slate-500 max-w-[280px] truncate mt-0.5">
                                {t.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isBooking ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-50 text-slate-700 border border-slate-200">
                              Booking Task
                            </span>
                            {t.booking?.bookingId && (
                              <Link
                                to={`/admin/bookings?id=${t.booking?.id}&tab=tasks`}
                                className="font-bold text-slate-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                {t.booking.bookingId} <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#FF4D00]/5 text-[#FF5A1F] border border-[#FF4D00]/30">
                              Universal Task
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">
                              {t.taskType || "General"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700 font-semibold">{t.assignedTo?.name || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.dueDate ? (
                          <span className="text-slate-600 font-medium">
                            {format(new Date(t.dueDate), "MMM dd, yyyy")}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none",
                            t.status === "COMPLETED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : t.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isBooking && t.booking?.id ? (
                          <Link
                            to={`/admin/bookings?id=${t.booking.id}&tab=tasks`}
                            className="inline-flex items-center justify-center h-7 px-3 text-[10px] font-bold uppercase bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors"
                          >
                            View Booking <ArrowUpRight className="w-3 h-3 ml-1" />
                          </Link>
                        ) : (
                          <button
                            onClick={() =>
                              handleStatusChange(
                                t.id,
                                t.status === "COMPLETED" ? "PENDING" : "COMPLETED"
                              )
                            }
                            className="inline-flex items-center justify-center h-7 px-3 text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            {t.status === "COMPLETED" ? "Reopen" : "Complete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CREATE TASK MODAL ─── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px] bg-white p-5 rounded-xl shadow-lg border border-[#E8EEF4]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-[14px] font-bold text-[#0B1528]">
              <Plus className="h-4 w-4 text-[#FF5A1F]" />
              Create Task & Allotment
            </DialogTitle>
            <DialogDescription className="text-[11px] font-medium text-slate-400">
              Create a universal operational task or assign directly to a specific booking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="mt-3 space-y-4">
            {/* Task Category Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Task Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTaskCategory("UNIVERSAL")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                    taskCategory === "UNIVERSAL"
                      ? "border-[#FF5A1F] bg-[#FF4D00]/5/60 text-[#FF5A1F]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" /> Universal Task
                </button>
                <button
                  type="button"
                  onClick={() => setTaskCategory("BOOKING")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                    taskCategory === "BOOKING"
                      ? "border-purple-500 bg-slate-50/60 text-slate-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Ticket className="w-3.5 h-3.5" /> Booking Task
                </button>
              </div>
            </div>

            {/* If Booking Task, show Booking ID input */}
            {taskCategory === "BOOKING" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">
                  Booking Reference / ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BK-1002"
                  value={taskForm.bookingId}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, bookingId: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                />
              </div>
            )}

            {/* Task Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">
                Task Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Reconfirm hotel vouchers or arrange tempo traveller"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/20"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">Description / Details</label>
              <textarea
                rows={2}
                placeholder="Add any specific context, passenger details, or instructions..."
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/20"
              />
            </div>

            {/* Assignee & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">
                  Assign To <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={taskForm.assignedToId}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, assignedToId: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#FF5A1F]"
                >
                  <option value="">Select staff member...</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>

            {/* Priority & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#FF5A1F]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent / Critical</option>
                </select>
              </div>

              {taskCategory === "UNIVERSAL" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">Category Type</label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) =>
                      setTaskForm((prev) => ({ ...prev, taskType: e.target.value }))
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#FF5A1F]"
                  >
                    <option value="UNIVERSAL">General Operational</option>
                    <option value="HOTEL_BOOKING">Hotel Booking</option>
                    <option value="TRANSPORT_ARRANGE">Transport & Logistics</option>
                    <option value="GUIDE_CONFIRM">Guide Confirmation</option>
                    <option value="PAYMENT_COLLECT">Payment Collection</option>
                    <option value="VISA_FOLLOW_UP">Visa / Permits</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 bg-[#FF5A1F] hover:bg-[#E04D15] text-white text-xs font-bold px-4"
              >
                {submitting ? "Creating…" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

