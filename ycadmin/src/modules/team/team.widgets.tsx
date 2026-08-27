import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, User, ArrowUpRight, AlertCircle, ListTodo } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  DashboardWidget,
  DashboardWidgetContextProps,
} from "@/config/dashboardWidgetRegistry";
import {
  DashBody,
  DashCard,
  DashHead,
  dashEmpty,
  dashLink,
} from "@/modules/dashboard.chrome";
import { bookingsService } from "@/services/bookings.service";
import { cn } from "@/lib/utils";

// ─── BOOKING TASKS DASHBOARD WIDGET ───
export const BookingTasksWidget: React.FC<DashboardWidgetContextProps> = ({
  navigate,
}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchBookingTasks = async () => {
      try {
        setLoading(true);
        const data = await bookingsService.getAllBookingTasks({ status: "ALL" });
        if (active) {
          const list = Array.isArray(data) ? data : (data as any)?.data || [];
          setTasks(list.slice(0, 6)); // Top 6 active tasks
        }
      } catch (err) {
        console.error("Failed to load booking tasks for dashboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchBookingTasks();
    return () => {
      active = false;
    };
  }, []);

  const openTasksCount = tasks.filter((t) => t.status !== "COMPLETED").length;

  return (
    <DashCard>
      <DashHead
        title={
          <div className="flex items-center gap-2">
            <span>Tasks & allotments</span>
            {openTasksCount > 0 && (
              <span className="rounded-full bg-[#FF4D00]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF5A1F]">
                {openTasksCount} open
              </span>
            )}
          </div>
        }
        action={
          <button
            type="button"
            onClick={() => navigate("/admin/operations/booking-tasks")}
            className={dashLink}
          >
            View all
          </button>
        }
      />
      <DashBody className="no-scrollbar max-h-[220px] space-y-2 overflow-y-auto text-[12px]">
        {loading ? (
          <p className={dashEmpty}>Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
            <ListTodo className="h-6 w-6 text-slate-300 mb-1" />
            <p className="text-[11px] font-medium">No tasks assigned. All clear!</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === "COMPLETED";
            const isBooking = task.taskCategory === "BOOKING" || Boolean(task.booking);
            const isDueToday =
              task.dueDate &&
              new Date(task.dueDate).toISOString().split("T")[0] ===
                new Date().toISOString().split("T")[0];

            return (
              <div
                key={task.id}
                onClick={() =>
                  isBooking && task.booking?.id
                    ? navigate(`/admin/bookings?id=${task.booking.id}&tab=tasks`)
                    : navigate("/admin/operations/booking-tasks")
                }
                className="-mx-1.5 flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-slate-100 hover:bg-[#F8FAFC]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : isDueToday ? (
                      <AlertCircle className="h-4 w-4 text-[#FF5A1F]" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate font-semibold text-[#0B1528] leading-tight text-[12px]",
                        isDone && "line-through text-slate-400"
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      {isBooking ? (
                        <>
                          {task.booking?.bookingId && (
                            <span className="font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-purple-100">
                              {task.booking.bookingId}
                            </span>
                          )}
                          {task.booking?.fullName && (
                            <span className="truncate max-w-[120px] text-slate-600 font-medium">
                              {task.booking.fullName}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-bold text-[#FF5A1F] bg-[#FF4D00]/5 px-1.5 py-0.5 rounded border border-[#FF4D00]/20">
                          Universal
                        </span>
                      )}
                      {task.assignedTo?.name && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <User className="h-3 w-3 text-slate-400" />
                          {task.assignedTo.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      isDone
                        ? "bg-green-50 text-green-700"
                        : isDueToday
                        ? "bg-[#FF4D00]/5 text-[#FF5A1F]"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {isDone
                      ? "Done"
                      : isDueToday
                      ? "Due today"
                      : task.dueDate
                      ? format(new Date(task.dueDate), "dd MMM")
                      : "Open"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#FF5A1F] flex items-center gap-0.5">
                    View <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </DashBody>
    </DashCard>
  );
};

export const teamWidgets: DashboardWidget[] = [
  {
    id: "booking-tasks",
    title: "Tasks & Allotments",
    category: "team",
    permission: PERMISSIONS.BOOKINGS_VIEW,
    order: 85,
    colSpanDesktop: "col-span-12 lg:col-span-6",
    component: BookingTasksWidget,
  },
];

