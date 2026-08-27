import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOBILE_BOTTOM_NAV,
  isAdminNavActive,
} from "@/config/adminNavigation";

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenDrawer,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-1 pb-safe shadow-[0_-4px_24px_rgba(15,23,42,0.08)] md:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = isAdminNavActive(
            location.pathname,
            item,
            location.search,
          );
          return (
            <button
              key={item.url}
              type="button"
              onClick={() => navigate(item.url)}
              className={cn(
                "flex min-h-[44px] min-w-[56px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-all active:scale-95",
                isActive
                  ? "font-bold text-[#FF4D00]"
                  : "font-medium text-slate-500 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "mb-0.5 h-5 w-5",
                  isActive && "stroke-[2.5px]",
                )}
              />
              <span className="max-w-full truncate text-[10px] leading-none tracking-tight">
                {item.title}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex min-h-[44px] min-w-[56px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 font-medium text-slate-500 transition-all hover:text-slate-900 active:scale-95"
          aria-label="Open full menu"
        >
          <Menu className="mb-0.5 h-5 w-5" />
          <span className="text-[10px] leading-none tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
