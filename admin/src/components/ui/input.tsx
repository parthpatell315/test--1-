import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, id, name, placeholder, "aria-label": ariaLabel, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id || generatedId;
    const resolvedName = name || resolvedId;
    const resolvedAriaLabel = ariaLabel || (typeof placeholder === "string" ? placeholder : undefined) || resolvedName;

    return (
      <input
        type={type}
        id={resolvedId}
        name={resolvedName}
        aria-label={resolvedAriaLabel}
        placeholder={placeholder}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm ring-offset-background transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
