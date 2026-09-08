/**
 * Per-vehicle seat numbering and fleet matching for departure transport lists.
 * Display seats must always be unique and sequential (1..n) within a vehicle.
 */

export function parseSeatNum(seat: unknown): number {
  const n = parseInt(String(seat ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sortTravelersForSeats<T extends { seatNumber?: unknown; travelerName?: string }>(
  travelers: T[],
): T[] {
  return [...travelers].sort((a, b) => {
    const sA = parseSeatNum(a.seatNumber);
    const sB = parseSeatNum(b.seatNumber);
    if (sA !== sB) {
      if (sA === 0) return 1;
      if (sB === 0) return -1;
      return sA - sB;
    }
    return String(a.travelerName || "").localeCompare(String(b.travelerName || ""));
  });
}

/** Sequential 1-based seat labels after a stable sort. */
export function withSequentialSeats<T extends { seatNumber?: unknown; travelerName?: string }>(
  travelers: T[],
): Array<T & { displaySeat: number }> {
  return sortTravelersForSeats(travelers).map((t, i) => ({
    ...t,
    displaySeat: i + 1,
  }));
}

function stripInstanceHash(name: string): string {
  return String(name || "")
    .trim()
    .replace(/\s*#\d+\s*$/i, "")
    .toLowerCase();
}

function instanceHash(name: string): string | null {
  const m = String(name || "").trim().match(/#(\d+)\s*$/);
  return m ? m[1] : null;
}

/**
 * True if this passenger allocation belongs on this fleet card.
 * Prefers fleetId; never matches two vehicles solely because both contain "#1".
 */
export function isAllocOnFleet(
  alloc: { vehicle?: string; fleetId?: string } | null | undefined,
  fleetItem: { id?: string; name?: string },
  fleetIdx: number,
  allFleet: Array<{ id?: string; name?: string }>,
): boolean {
  if (!alloc) return false;
  const vehicle = String(alloc.vehicle || "").trim();
  if (!vehicle || vehicle === "—" || vehicle === "Unassigned") return false;
  if (!allFleet || allFleet.length <= 1) return true;

  const fleetId = fleetItem.id;
  const allocFleetId = alloc.fleetId;

  if (allocFleetId) {
    if (allocFleetId === fleetId) return true;
    const pointsToOther = allFleet.some(
      (ef, i) => i !== fleetIdx && ef.id && ef.id === allocFleetId,
    );
    if (pointsToOther) return false;
  }

  const vNorm = vehicle.toLowerCase();
  const fName = String(fleetItem.name || "").trim().toLowerCase();
  const fId = String(fleetId || "").trim().toLowerCase();
  if (vNorm === fName || (fId && vNorm === fId)) return true;

  const vBase = stripInstanceHash(vehicle);
  const fBase = stripInstanceHash(fleetItem.name || "");
  const vHash = instanceHash(vehicle);
  const fHash = instanceHash(fleetItem.name || "");
  if (vBase && fBase && vBase === fBase) {
    if (vHash && fHash) return vHash === fHash;
    if (!vHash && !fHash) return true;
  }

  const tempoIdxPattern = /^(?:tempo|vehicle)[-\s#]*(\d+)$/i;
  const vTempoMatch = vehicle.match(tempoIdxPattern);
  if (vTempoMatch) {
    return parseInt(vTempoMatch[1], 10) === fleetIdx + 1;
  }

  return false;
}

export function renumberVehicleAllocations<T extends { fleetId?: string; seatNumber?: number; travelerName?: string }>(
  rows: T[],
): T[] {
  const groups = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = row.fleetId || "__none__";
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  });
  const out: T[] = [];
  groups.forEach((list) => {
    sortTravelersForSeats(list).forEach((row, i) => {
      out.push({ ...row, seatNumber: i + 1 });
    });
  });
  return out;
}
