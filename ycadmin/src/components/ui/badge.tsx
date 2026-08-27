import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#FF4D00] text-white hover:bg-[#E04400]",
        secondary:
          "border-[#D8E0EC] bg-[#EEF2F8] text-[#0B1528] hover:bg-[#E2E8F0]",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700",
        outline: "border-[#E8EEF4] bg-white text-[#0B1528]",
        success:
          "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
        warning:
          "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
        info:
          "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
        soft:
          "border-[#FFD4BF] bg-[#FFF1E8] text-[#C2410C]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

