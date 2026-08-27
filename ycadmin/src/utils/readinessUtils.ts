/**
 * Operational readiness — shared by Operations list + Departure Workspace overview.
 *
 * Weights (100 pts):
 * - Hotels stay coverage: 25
 * - Transport assignment: 25
 * - Guides assignment: 20
 * - Tasks completion: 15
 * - Payments collected: 15
 *
 * When a dimension has no target (e.g. no stay nights / no tasks yet), that
 * slice is treated as complete so early-planning departures are not unfairly
 * penalized to 0%.
 */

export interface OperationalReadinessInput {
  hotelsAssigned?: number;
  hotelsTarget?: number;
  transportAssigned?: number;
  transportRequired?: number;
  guideCount?: number;
  tasksDone?: number;
  tasksTotal?: number;
  /** 0–100 collected percent */
  paymentsCollectedPercent?: number;
}

export interface OperationalReadinessResult {
  score: number;
  hotelsScore: number;
  transportScore: number;
  guidesScore: number;
  tasksScore: number;
  paymentsScore: number;
  isReady: boolean;
}

export function computeOperationalReadinessScore(
  input?: OperationalReadinessInput | null,
): OperationalReadinessResult {
  const hotelsTarget = Math.max(0, Number(input?.hotelsTarget) || 0);
  const hotelsAssigned = Math.max(0, Number(input?.hotelsAssigned) || 0);
  const transportRequired = Math.max(
    1,
    Number(input?.transportRequired) || 1,
  );
  const transportAssigned = Math.max(0, Number(input?.transportAssigned) || 0);
  const guideCount = Math.max(0, Number(input?.guideCount) || 0);
  const tasksTotal = Math.max(0, Number(input?.tasksTotal) || 0);
  const tasksDone = Math.max(0, Number(input?.tasksDone) || 0);
  const paidPct = Math.min(
    100,
    Math.max(0, Number(input?.paymentsCollectedPercent) || 0),
  );

  const hotelsScore =
    hotelsTarget > 0
      ? (Math.min(hotelsAssigned, hotelsTarget) / hotelsTarget) * 25
      : 25;
  const transportScore =
    Math.min(1, transportAssigned / transportRequired) * 25;
  const guidesScore = (guideCount > 0 ? 1 : 0) * 20;
  const tasksScore =
    tasksTotal > 0 ? (Math.min(tasksDone, tasksTotal) / tasksTotal) * 15 : 15;
  const paymentsScore = (paidPct / 100) * 15;

  const score = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        hotelsScore +
          transportScore +
          guidesScore +
          tasksScore +
          paymentsScore,
      ),
    ),
  );

  return {
    score,
    hotelsScore,
    transportScore,
    guidesScore,
    tasksScore,
    paymentsScore,
    isReady: score >= 90,
  };
}

/**
 * Build readiness inputs from an ops workspace summary + booking payment totals.
 * Used by the Operations upcoming-trips list (same weights as workspace overview).
 */
export function readinessInputFromOpsSummary(params: {
  summary?: {
    hotelTransportStatus?: {
      hotelsTotal?: number;
      hotelsConfirmed?: number;
      transportTotal?: number;
    } | null;
    checklistCompletion?: { completed?: number; total?: number } | null;
    leaders?: unknown[] | null;
    acceptedTravelerCount?: number;
  } | null;
  totalRevenue?: number;
  customerOutstanding?: number;
  customerPaid?: number;
  participantCount?: number;
}): OperationalReadinessInput {
  const hotelsTotal = Number(params.summary?.hotelTransportStatus?.hotelsTotal) || 0;
  const hotelsConfirmed =
    Number(params.summary?.hotelTransportStatus?.hotelsConfirmed) || 0;
  const transportTotal =
    Number(params.summary?.hotelTransportStatus?.transportTotal) || 0;
  const pax = Math.max(
    0,
    Number(params.participantCount) ||
      Number(params.summary?.acceptedTravelerCount) ||
      0,
  );
  const transportRequired = Math.max(1, Math.ceil((pax || 1) / 17));
  const guideCount = Array.isArray(params.summary?.leaders)
    ? params.summary!.leaders!.length
    : 0;
  const tasksDone = Number(params.summary?.checklistCompletion?.completed) || 0;
  const tasksTotal = Number(params.summary?.checklistCompletion?.total) || 0;

  const totalRevenue = Number(params.totalRevenue) || 0;
  const customerOutstanding = Number(params.customerOutstanding) || 0;
  const customerPaid = Number(params.customerPaid) || 0;
  let paymentsCollectedPercent = 0;
  if (totalRevenue > 0) {
    const paid =
      customerPaid > 0
        ? customerPaid
        : Math.max(0, totalRevenue - customerOutstanding);
    paymentsCollectedPercent = Math.min(100, (paid / totalRevenue) * 100);
  } else if (customerOutstanding <= 0 && pax > 0) {
    paymentsCollectedPercent = 100;
  }

  return {
    hotelsAssigned: hotelsConfirmed,
    hotelsTarget: hotelsTotal,
    transportAssigned: transportTotal,
    transportRequired,
    guideCount,
    tasksDone,
    tasksTotal,
    paymentsCollectedPercent,
  };
}

/** @deprecated Prefer computeOperationalReadinessScore — kept for legacy call sites. */
export interface ReadinessParams {
  stats?: {
    totalParticipants?: number;
    totalRevenue?: number;
    customerOutstanding?: number;
    customerPaid?: number;
  } | null;
  vendors?: any[] | null;
  fleet?: any[] | null;
  documents?: any[] | null;
}

/**
 * Legacy readiness helper. Maps vendor/fleet shapes into the operational formula
 * so existing call sites stay coherent with the overview metric.
 */
export function calculateReadinessScore(
  params?: ReadinessParams | null,
): number {
  if (!params) return 0;

  const { stats, vendors, fleet } = params;
  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const hotels = safeVendors.filter((v: any) => v && v.vendorType === "hotel");
  const confirmedHotels = hotels.filter(
    (h: any) =>
      h &&
      (h.paymentStatus === "paid" ||
        h.status === "CONFIRMED" ||
        h.status === "Confirmed" ||
        h.confirmed === true),
  ).length;
  const guides = safeVendors.filter(
    (v: any) => v && (v.vendorType === "guide" || v.vendorType === "tour_lead"),
  );
  const transports = safeVendors.filter(
    (v: any) => v && v.vendorType === "transport",
  );
  const fleetCount = Array.isArray(fleet) ? fleet.filter(Boolean).length : 0;

  const totalRevenue = Number(stats?.totalRevenue) || 0;
  const customerOutstanding = Number(stats?.customerOutstanding) || 0;
  const customerPaid = Number(stats?.customerPaid) || 0;
  let paymentsCollectedPercent = 0;
  if (totalRevenue > 0) {
    const paid =
      customerPaid > 0
        ? customerPaid
        : Math.max(0, totalRevenue - customerOutstanding);
    paymentsCollectedPercent = Math.min(100, (paid / totalRevenue) * 100);
  }

  const pax = Number(stats?.totalParticipants) || 0;

  return computeOperationalReadinessScore({
    hotelsAssigned: confirmedHotels,
    hotelsTarget: hotels.length,
    transportAssigned: Math.max(transports.length, fleetCount),
    transportRequired: Math.max(1, Math.ceil((pax || 1) / 17)),
    guideCount: guides.length,
    tasksDone: 0,
    tasksTotal: 0,
    paymentsCollectedPercent,
  }).score;
}
