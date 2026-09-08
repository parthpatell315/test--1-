import React from "react";

interface AdminSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  title,
  description,
  children,
  className = "",
}) => {
  return (
    <section
      className={`border-t border-zinc-100 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0 ${className}`}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-zinc-500 mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
};
