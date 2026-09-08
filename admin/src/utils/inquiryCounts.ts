export function inquiryTabCount(args: {
  key: string;
  activeTab: string;
  totalCount: number;
  inquiries: Array<{ status?: string }>;
  loadFailed?: boolean;
}): number | null {
  if (args.loadFailed) return null;
  if (args.key === args.activeTab) return args.totalCount || 0;
  if (args.key === "new") {
    return args.inquiries.filter((i) => i.status === "new").length;
  }
  if (args.key === "contacted") {
    return args.inquiries.filter((i) => i.status === "contacted").length;
  }
  if (args.key === "converted") {
    return args.inquiries.filter((i) => i.status === "converted").length;
  }
  if (args.key === "closed") {
    return args.inquiries.filter((i) => i.status === "closed").length;
  }
  return args.inquiries.length;
}

export function printTripTitle(title?: string | null): string {
  const t = String(title || "").trim();
  return t || "Trip title unavailable";
}
