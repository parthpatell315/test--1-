import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-muted-foreground",
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
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
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
