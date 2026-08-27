import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminContainerProps {
  children: ReactNode;
  className?: string;
}

export function AdminContainer({ children, className }: AdminContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
