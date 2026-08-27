import React from "react";
import { kpiWidgets } from "@/modules/kpi/kpi.widgets";
import { opsWidgets } from "@/modules/operations/ops.widgets";
import { financeWidgets } from "@/modules/finance/finance.widgets";
import { approvalWidgets } from "@/modules/approval/approval.widgets";
import { teamWidgets } from "@/modules/team/team.widgets";
import { generalWidgets } from "@/modules/general/general.widgets";

export interface DashboardWidgetContextProps {
  stats: any;
  loading: boolean;
  ticketPendingCount: number;
  announcements: any[];
  loadingAnnouncements: boolean;
  admin: any;
  userPerms: any;
  userRole?: string;
  navigate: (path: string) => void;
  setShowAddAnnouncement: (val: boolean) => void;
  setShowAllAnnouncements: (val: boolean) => void;
  hasPermission: (perms: any, required: string, role?: string) => boolean;
}

export type DashboardCategory = "kpi" | "operations" | "management" | "team";

export interface DashboardWidget {
  id: string;
  title: string;
  category: DashboardCategory;
  /** When set, widget is hidden unless the user has this permission. Omit for all authenticated dashboard users. */
  permission?: string;
  order: number;
  colSpanDesktop: string; // Tailwind grid span
  component: React.ComponentType<DashboardWidgetContextProps>;
}

export const CATEGORY_LABELS: Record<
  DashboardCategory,
  { title: string; subtitle: string }
> = {
  kpi: {
    title: "KPI summary",
    subtitle: "Key metrics for the selected period",
  },
  operations: {
    title: "Operational workspace",
    subtitle: "Live departures and urgent alerts",
  },
  management: {
    title: "Management & cash flow",
    subtitle: "Approvals, cash flow and announcements",
  },
  team: {
    title: "Tasks & bookings stream",
    subtitle: "Active booking task assignments, daily checklist and recent bookings",
  },
};

// ─────────────────────────────────────────────────────────────
// ENTERPRISE PLUGIN DASHBOARD REGISTRY AGGREGATOR
// ─────────────────────────────────────────────────────────────
export const DASHBOARD_WIDGET_REGISTRY: DashboardWidget[] = [
  ...kpiWidgets,
  ...opsWidgets,
  ...financeWidgets,
  ...approvalWidgets,
  ...teamWidgets,
  ...generalWidgets,
];
