import React from "react";
import { cn } from "@/lib/utils";

export const dashLink =
  "text-[11px] font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0 cursor-pointer transition-colors";

export const dashEmpty =
  "p-8 text-center text-[11px] text-slate-400 font-medium leading-relaxed";

export const dashRowLabel =
  "text-[12px] font-medium text-slate-900 truncate";

export function cnDashAction(className?: string) {
  return cn(
    "inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer",
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
        "relative flex flex-col overflow-hidden h-full rounded-xl border border-slate-200 bg-white shadow-sm",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-blue-500/30 hover:shadow-md",
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
    <div className="min-h-10 px-4 py-2 flex items-center justify-between gap-3 border-b border-slate-100 shrink-0 bg-slate-50/70">
      <span className="text-[11px] font-bold text-slate-800 tracking-wider uppercase truncate border-l-2 border-blue-600 pl-2">
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
    <div className={cn("divide-y divide-slate-100 -my-1", className)}>
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
        onClick && "cursor-pointer hover:bg-slate-50 -mx-4 px-4 transition-colors rounded-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}

