import React from "react";

interface AdminTableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminTableWrapper: React.FC<AdminTableWrapperProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`w-full overflow-x-auto rounded-[12px] border border-zinc-100 shadow-sm no-scrollbar ${className}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="min-w-full inline-block align-middle">
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
};
