import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Building2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { financeControllerService } from "@/services/financeController.service";
import { financeApprovalsService } from "@/services/financeApprovals.service";
import IncomingPaymentsApprovalPage from "./IncomingPaymentsApprovalPage";
import OutgoingPaymentsApprovalPage from "./OutgoingPaymentsApprovalPage";
import RefundRequestsPage from "./RefundRequestsPage";

export type ApprovalTab =
  | "payment-approvals"
  | "vendor-bills"
  | "refund-requests";

const TAB_ALIASES: Record<string, ApprovalTab> = {
  "booking-verification": "payment-approvals",
  "ticket-approvals": "payment-approvals",
  verification: "payment-approvals",
  queue: "payment-approvals",
};

const TABS: {
  key: ApprovalTab;
  label: string;
  icon: any;
  description: string;
}[] = [
  {
    key: "payment-approvals",
    label: "1. Incoming Payments",
    icon: CreditCard,
    description:
      "Approve customer online collections, bank transfers and cash submissions",
  },
  {
    key: "vendor-bills",
    label: "2. Outgoing Vendor Payments",
    icon: Building2,
    description:
      "Verify payouts for Hotels, Transport, Activities, Guides & ops balance",
  },
  {
    key: "refund-requests",
    label: "3. Refund Requests & Credits",
    icon: RefreshCw,
    description: "Review customer cancellation refunds and store credit notes",
  },
];

export default function ApprovalsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as ApprovalTab | string | null;
  const normalizedTab =
    tabParam && TAB_ALIASES[tabParam]
      ? TAB_ALIASES[tabParam]
      : tabParam;
  const activeTab: ApprovalTab =
    normalizedTab && TABS.some((t) => t.key === normalizedTab)
      ? (normalizedTab as ApprovalTab)
      : "payment-approvals";

  const [incomingPendingCount, setIncomingPendingCount] = useState<number>(0);
  const [vendorPendingCount, setVendorPendingCount] = useState<number>(0);
  const [refundPendingCount, setRefundPendingCount] = useState<number>(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [pendingApprovalsRes, refundRes] = await Promise.all([
          financeApprovalsService
            .getPendingApprovals()
            .catch(() => ({ pendingApprovals: { breakdown: { collectionsPendingFC: 0, collectionsAwaitingFounder: 0, vendorPendingFC: 0, vendorAwaitingFounder: 0 } } })),
          financeControllerService.refunds
            .list({ status: "PENDING_APPROVAL", limit: 1 })
            .catch(() => ({ data: [] })),
        ]);

        const breakdown = pendingApprovalsRes?.pendingApprovals?.breakdown;
        if (breakdown) {
          setIncomingPendingCount(
            (breakdown.collectionsPendingFC || 0) + (breakdown.collectionsAwaitingFounder || 0)
          );
          setVendorPendingCount(
            (breakdown.vendorPendingFC || 0) + (breakdown.vendorAwaitingFounder || 0)
          );
        }
        setRefundPendingCount(refundRes?.data?.length || 0);
      } catch {
        // silent fail
      }
    };
    fetchCounts();
  }, []);

  const handleTabChange = (key: ApprovalTab) => {
    setSearchParams({ tab: key });
  };

  const getBadgeCount = (key: ApprovalTab) => {
    if (key === "payment-approvals") return incomingPendingCount;
    if (key === "vendor-bills") return vendorPendingCount;
    if (key === "refund-requests") return refundPendingCount;
    return 0;
  };

  const totalOpen =
    incomingPendingCount + vendorPendingCount + refundPendingCount;

  return (
    <div className="flex h-[calc(100dvh-6.25rem)] min-h-0 min-w-0 flex-col gap-1.5 font-sans text-[#13283F] antialiased">
      <nav
        aria-label="Approval queues"
        className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const badgeCount = getBadgeCount(tab.key);
          return (
            <button
              key={tab.key}
              title={tab.description}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
                isActive
                  ? "border-[#FF5A1F] bg-[#FFF0EA] text-[#E84712]"
                  : "border-[#DCE5ED] bg-white text-[#526A7F] hover:border-[#B7C7D6]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label.replace(/^\d+\.\s*/, "")}
              <span
                className={cn(
                  "ml-0.5 min-w-[1.1rem] rounded px-1 text-center text-[10px] tabular-nums",
                  isActive ? "bg-white/80 text-[#E84712]" : "bg-[#EDF3F7] text-[#6B8195]",
                )}
              >
                {badgeCount}
              </span>
            </button>
          );
        })}
        {totalOpen > 0 && (
          <span className="ml-auto shrink-0 rounded bg-[#FF4D00] px-2 py-1 text-[10px] font-bold text-white tabular-nums">
            {totalOpen} open
          </span>
        )}
      </nav>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#DCE5ED] bg-white">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {activeTab === "payment-approvals" && (
          <div className="min-h-0 flex-1 overflow-auto">
            <IncomingPaymentsApprovalPage hideHeader={true} />
          </div>
        )}
        {activeTab === "vendor-bills" && (
          <OutgoingPaymentsApprovalPage hideHeader={true} />
        )}
        {activeTab === "refund-requests" && (
          <RefundRequestsPage hideHeader={true} />
        )}
        </div>
      </section>
    </div>
  );
}
