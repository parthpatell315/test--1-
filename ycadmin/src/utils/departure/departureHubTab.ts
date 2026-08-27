export function normalizeDepartureHubTab(raw: string | null | undefined): string {
  const t = (raw || "overview").toLowerCase().trim();
  if (t === "overview") return "overview";
  if (["hotel", "hotels", "accommodations", "accommodation", "itinerary"].includes(t)) {
    return "hotels";
  }
  if (["transport", "allocation", "tempo", "fleet", "vehicles"].includes(t)) {
    return "transport";
  }
  if (["passengers", "manifest", "pax"].includes(t)) return "passengers";
  if (["operations", "ops", "ticketing", "tasks", "checklist"].includes(t)) {
    return "operations";
  }
  if (["finance", "money", "payments", "accounting"].includes(t)) return "finance";
  if (["station", "stationpayments", "station_payments"].includes(t)) {
    return "stationpayments";
  }
  if (["documents", "docs"].includes(t)) return "documents";
  if (["reports", "report"].includes(t)) return "reports";
  if (["guides", "guide"].includes(t)) return "guides";
  if (["activities", "activity"].includes(t)) return "activities";
  return t || "overview";
}
