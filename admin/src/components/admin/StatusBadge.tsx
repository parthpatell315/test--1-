import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-blue-50 text-blue-700 border border-blue-200/80",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 border border-amber-200/80",
  destructive: "bg-rose-50 text-rose-700 border border-rose-200/80",
  outline: "border border-slate-200 text-slate-600 bg-white",
};

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  variant = "default",
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function getBookingBadgeVariant(status: string): BadgeVariant {
  const s = (status || "").toLowerCase();
  if (
    s === "confirmed" ||
    s === "accepted" ||
    s === "paid" ||
    s === "verified" ||
    s === "active" ||
    s === "success"
  ) {
    return "success"; // Green
  }
  if (
    s === "pending" ||
    s === "pending payment" ||
    s === "pending_payment" ||
    s === "inquiry" ||
    s === "pending approval"
  ) {
    return "warning"; // Amber
  }
  if (s === "partially paid" || s === "partial" || s === "partially_paid") {
    return "default"; // Orange
  }
  if (
    s === "cancelled" ||
    s === "rejected" ||
    s === "expired" ||
    s === "due" ||
    s === "failed"
  ) {
    return "destructive"; // Red
  }
  if (s === "draft") {
    return "outline"; // Grey
  }
  return "outline";
}

export function getTripBadgeVariant(status: string): BadgeVariant {
  return status === "published" ? "success" : "outline";
}
