import React from "react";

interface AdminCardProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const AdminCard: React.FC<AdminCardProps> = ({
  title,
  extra,
  children,
  className = "",
  padding = "md",
}) => {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    >
      {(title || extra) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          {typeof title === "string" ? (
            <h4 className="font-semibold text-slate-900 text-sm tracking-tight">
              {title}
            </h4>
          ) : (
            title
          )}
          {extra && <div className="flex items-center gap-2">{extra}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
};
