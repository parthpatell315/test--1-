import React from "react";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  DashboardWidget,
  DashboardWidgetContextProps,
} from "@/config/dashboardWidgetRegistry";
import {
  DashBody,
  DashCard,
  DashHead,
  DashList,
  DashRow,
  dashLink,
  dashEmpty,
  dashRowLabel,
} from "@/modules/dashboard.chrome";

// My Approval Queue Widget
export const ApprovalQueueWidget: React.FC<DashboardWidgetContextProps> = ({
  stats,
  loading,
  navigate,
}) => {
  const q = stats?.approvalQueue;
  const items = [
    {
      label: "Payment approvals",
      count: q?.paymentApprovals ?? 0,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      path: "/admin/approvals-hub?tab=payment-approvals",
    },
    {
      label: "Vendor bills",
      count: q?.vendorBills ?? 0,
      color: "text-red-600 bg-red-50 border-red-200",
      path: "/admin/approvals-hub?tab=vendor-bills",
    },
    {
      label: "Train tickets",
      count: q?.missingTickets ?? 0,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      path: "/admin/ticket-approvals",
    },
  ];

  return (
    <DashCard>
      <DashHead
        title="My approval queue"
        action={
          <button
            type="button"
            onClick={() => navigate("/admin/approvals-hub")}
            className={dashLink}
          >
            View all
          </button>
        }
      />
      <DashBody>
        {loading ? (
          <p className={dashEmpty}>Loading…</p>
        ) : (
          <DashList>
            {items.map((appr, idx) => (
              <DashRow
                key={idx}
                onClick={() => navigate(appr.path)}
                className="py-1.5"
              >
                <span className="min-w-0 truncate text-[12px] font-medium text-[#0B1528]">{appr.label}</span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${appr.color}`}
                >
                  {appr.count} pending
                </span>
              </DashRow>
            ))}
          </DashList>
        )}
      </DashBody>
    </DashCard>
  );
};

export const approvalWidgets: DashboardWidget[] = [
  {
    id: "approval-queue",
    title: "My Approval Queue",
    category: "management",
    permission: PERMISSIONS.BOOKINGS_VERIFY,
    order: 60,
    colSpanDesktop: "col-span-12 md:col-span-6 lg:col-span-3",
    component: ApprovalQueueWidget,
  },
];
