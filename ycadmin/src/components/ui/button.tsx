import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D00]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF4D00] text-white shadow-[0_1px_2px_rgba(255,77,0,0.25)] hover:bg-[#E04400]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[#E8EEF4] bg-white text-[#0B1528] hover:border-[#FFD4BF] hover:bg-[#FFF7F2] hover:text-[#C2410C]",
        secondary:
          "bg-[#EEF2F8] text-[#0B1528] hover:bg-[#E2E8F0]",
        ghost: "hover:bg-[#FFF1E8] hover:text-[#C2410C]",
        link: "text-[#FF4D00] underline-offset-4 hover:underline",
        brand: "bg-[#FF4D00] text-white hover:bg-[#E04400] shadow-xs",
        navy: "bg-[#0B1528] text-white hover:bg-[#152238]",
      },
      size: {
        default: "h-8 px-4 py-2",
        xs: "h-7 rounded-md px-2.5 text-xs",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
