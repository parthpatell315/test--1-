import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  variant?: "light" | "dark" | "orange";
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, variant = "light", ...props }, ref) => {
    const variants = {
      light:
        "bg-white border-slate-100 shadow-premium hover:shadow-luxury hover:border-primary/5",
      dark: "bg-slate-900 border-white/10 shadow-2xl text-white",
      orange: "bg-primary/5 border-primary/10 shadow-xl shadow-primary/5",
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "rounded-[2.5rem] border p-10 transition-all duration-500",
          variants[variant],
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
