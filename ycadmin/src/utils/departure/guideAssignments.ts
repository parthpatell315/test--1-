export function isGuideExpenseType(assignmentType?: string | null): boolean {
  return (
    assignmentType === "EXPENSE" ||
    String(assignmentType || "").startsWith("EXPENSE_")
  );
}

export function isGuideAssignmentCancelled(row: {
  assignmentStatus?: string | null;
  status?: string | null;
}): boolean {
  const assignment = String(row.assignmentStatus || "").toUpperCase();
  const status = String(row.status || "").toUpperCase();
  return (
    assignment === "CANCELLED" ||
    assignment === "CANCELED" ||
    status === "CANCELLED" ||
    status === "CANCELED"
  );
}

/** Active crew only: not expenses, not cancelled. KPIs must match the table. */
export function listActiveAssignedGuides<T extends {
  assignmentType?: string | null;
  assignmentStatus?: string | null;
  status?: string | null;
}>(rows: T[] | null | undefined): T[] {
  return (rows || []).filter(
    (g) => !isGuideExpenseType(g.assignmentType) && !isGuideAssignmentCancelled(g),
  );
}
