import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/store/auth.store";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOBILE_DRAWER_NAV,
  isAdminNavActive,
} from "@/config/adminNavigation";

interface MobileNavigationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuthStore();

  const isFounder =
    (admin?.email || "").toLowerCase().includes("hemal") ||
    admin?.role === "superadmin" ||
    admin?.role === "admin";

  const visibleModules = MOBILE_DRAWER_NAV.filter((mod) => {
    if (mod.founderOnly && !isFounder) return false;
    return true;
  });

  const handleNavigate = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(100vw-2rem,320px)] border-r-0 bg-[#0D1B2E] p-0 text-white"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Admin navigation</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0B1528]/80 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF4D00] to-[#ff7040] text-sm font-black text-white">
              {admin?.name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold text-white">
                {admin?.name || "Admin User"}
              </h3>
              <span className="mt-0.5 inline-block rounded border border-[#FF4D00]/30 bg-[#FF4D00]/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#FF4D00]">
                {isFounder ? "Founder" : admin?.role || "Staff"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-9rem)] space-y-0.5 overflow-y-auto p-3 pb-24">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = isAdminNavActive(
              location.pathname,
              mod,
              location.search,
            );
            return (
              <button
                key={mod.url}
                type="button"
                onClick={() => handleNavigate(mod.url)}
                className={cn(
                  "flex w-full touch-manipulation items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-semibold transition-all active:scale-[0.98]",
                  isActive
                    ? "bg-[#FF4D00] font-bold text-white shadow-md shadow-orange-500/20"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{mod.title}</span>
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.08] bg-[#0B1528] p-3 pb-safe">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              logout();
              navigate("/admin/login");
            }}
            className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-3 text-xs font-bold text-red-300 transition-all hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigationDrawer;
