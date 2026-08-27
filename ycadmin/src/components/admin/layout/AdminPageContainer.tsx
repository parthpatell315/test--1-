import React from "react";
import { cn } from "@/lib/utils";

interface AdminPageContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function AdminPageContainer({
  children,
  className,
  fullWidth = false,
}: AdminPageContainerProps) {
  return (
    <div
      className={cn(
        "w-full px-4 sm:px-6 py-6 transition-all",
        fullWidth ? "max-w-full" : "max-w-7xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
