import React from "react";
import {
  BarChart2,
  Users,
  Building2,
  Compass,
  Calendar,
  Ticket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  DashboardWidget,
  DashboardWidgetContextProps,
} from "@/config/dashboardWidgetRegistry";

function KpiIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
      <Icon className="h-3 w-3" strokeWidth={1.75} />
    </div>
  );
}

function kpiMoney(amount: number | undefined | null) {
  if (amount === undefined || amount === null) return "—";
  return `₹ ${Number(amount).toLocaleString("en-IN")}`;
}

function kpiCount(value: number | undefined | null) {
  if (value === undefined || value === null) return "—";
  return String(value);
}

function currentMonthKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

function KpiCard({
  label,
  icon,
  loading,
  value,
  caption,
  onClick,
  trend,
}: {
  label: string;
  icon: LucideIcon;
  loading: boolean;
  value: string;
  caption: React.ReactNode;
  onClick: () => void;
  trend?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="flex h-full min-h-[92px] min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] transition-all duration-200 hover:border-[#FF4D00]/40 hover:shadow-[0_4px_20px_0_rgba(255,77,0,0.08)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-widest text-slate-500">
          {label}
        </span>
        <KpiIcon icon={icon} />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[18px] font-bold leading-none tracking-tight text-[#0B1528]">
          {loading ? <span className="animate-pulse text-slate-300">...</span> : value}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] font-medium leading-none text-slate-500">
          {trend ? (
            <TrendingUp
              className="h-2.5 w-2.5 shrink-0 text-[#FF4D00]"
              strokeWidth={2}
            />
          ) : null}
          {caption}
        </p>
      </div>
    </div>
  );
}

export const TodaysBookingsCard: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => (
  <KpiCard
    label="Today's bookings"
    icon={Ticket}
    loading={loading}
    value={loading ? "…" : kpiCount(stats?.todayBookings)}
    trend
    caption="Created today"
    onClick={() => navigate("/admin/bookings")}
  />
);

export const MonthlyRevenueCard: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => {
  const monthKey = currentMonthKey();
  const monthRow = Array.isArray(stats?.monthlyRevenue)
    ? stats.monthlyRevenue.find((row: { month: string }) => row.month === monthKey)
    : null;
  const monthValue =
    stats?.currentMonthRevenue ?? monthRow?.revenue;

  return (
    <KpiCard
      label="Monthly revenue"
      icon={BarChart2}
      loading={loading}
      value={kpiMoney(monthValue)}
      trend
      caption="Verified this month"
      onClick={() => navigate("/admin/finance")}
    />
  );
};

export const PendingCustomersCard: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => (
  <KpiCard
    label="Pending customers"
    icon={Users}
    loading={loading}
    value={kpiMoney(stats?.pendingPayments)}
    caption={`${loading ? "…" : kpiCount(stats?.pendingBookingsCount)} bookings due`}
    onClick={() => navigate("/admin/finance?tab=payments")}
  />
);

export const PendingVendorsCard: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => (
  <KpiCard
    label="Pending vendors"
    icon={Building2}
    loading={loading}
    value={kpiMoney(stats?.pendingVendorsCost)}
    caption={`${loading ? "…" : kpiCount(stats?.pendingVendorsCount)} vendors`}
    onClick={() => navigate("/admin/approvals-hub?tab=vendor-bills")}
  />
);

export const TripsRunningCard: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => (
  <KpiCard
    label="Trips running"
    icon={Compass}
    loading={loading}
    value={
      loading
        ? "…"
        : kpiCount(stats?.tripsRunningNow?.length ?? stats?.totalTrips)
    }
    caption="Active itineraries"
    onClick={() => navigate("/admin/operations")}
  />
);

export const BookingsMonthCard: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => (
  <KpiCard
    label="Bookings this month"
    icon={Calendar}
    loading={loading}
    value={
      loading
        ? "…"
        : kpiCount(stats?.bookingsThisMonth ?? stats?.totalBookings)
    }
    trend
    caption="Created this month"
    onClick={() => navigate("/admin/bookings")}
  />
);

export const kpiWidgets: DashboardWidget[] = [
  {
    id: "todays-bookings",
    title: "Today's Bookings",
    category: "kpi",
    permission: PERMISSIONS.BOOKINGS_VIEW,
    order: 10,
    colSpanDesktop: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    component: TodaysBookingsCard,
  },
  {
    id: "monthly-revenue",
    title: "Monthly Revenue",
    category: "kpi",
    permission: PERMISSIONS.ACCOUNTING_VIEW,
    order: 12,
    colSpanDesktop: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    component: MonthlyRevenueCard,
  },
  {
    id: "pending-customers",
    title: "Pending Customers",
    category: "kpi",
    permission: PERMISSIONS.ACCOUNTING_VIEW,
    order: 14,
    colSpanDesktop: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    component: PendingCustomersCard,
  },
  {
    id: "pending-vendors",
    title: "Pending Vendors",
    category: "kpi",
    permission: PERMISSIONS.VENDORS_VIEW,
    order: 16,
    colSpanDesktop: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    component: PendingVendorsCard,
  },
  {
    id: "trips-running",
    title: "Trips Running",
    category: "kpi",
    permission: PERMISSIONS.TRIPS_VIEW,
    order: 18,
    colSpanDesktop: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    component: TripsRunningCard,
  },
  {
    id: "bookings-month",
    title: "Bookings Month",
    category: "kpi",
    permission: PERMISSIONS.BOOKINGS_VIEW,
    order: 19,
    colSpanDesktop: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    component: BookingsMonthCard,
  },
];
