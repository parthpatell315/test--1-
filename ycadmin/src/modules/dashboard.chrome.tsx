import React from "react";
import { cn } from "@/lib/utils";

export const dashLink =
  "text-[11px] font-semibold text-[#FF4D00] hover:text-[#FF6B35] whitespace-nowrap shrink-0 cursor-pointer transition-colors";

export const dashEmpty =
  "p-8 text-center text-[11px] text-slate-400 font-medium leading-relaxed";

export const dashRowLabel =
  "text-[12px] font-medium text-[#0F172A] truncate";

export function cnDashAction(className?: string) {
  return cn(
    "inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:text-[#FF4D00] transition-colors cursor-pointer",
    className,
  );
}

export function DashCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col overflow-hidden h-full rounded-2xl border border-[#E8EEF4] bg-white shadow-[0_1px_6px_0_rgba(11,21,40,0.07)]",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-[#FF4D00]/30 hover:shadow-[0_4px_16px_0_rgba(255,77,0,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-h-11 px-4 py-2.5 flex items-center justify-between gap-3 border-b border-[#E8EEF4] shrink-0 bg-[#F8FAFC]">
      <span className="text-[11px] font-bold text-[#0B1528] tracking-widest uppercase truncate border-l-2 border-[#FF4D00] pl-2">
        {title}
      </span>
      {action ? <div className="flex items-center gap-3 shrink-0">{action}</div> : null}
    </div>
  );
}

export function DashBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-4 flex-1 overflow-y-auto min-w-0", className)}>
      {children}
    </div>
  );
}

export function DashList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-[#E8EEF4] -my-1", className)}>
      {children}
    </div>
  );
}

export function DashRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "py-2.5 flex items-center justify-between gap-2 text-xs",
        onClick && "cursor-pointer hover:bg-[#FF4D00]/[0.06] -mx-4 px-4 transition-colors rounded-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
