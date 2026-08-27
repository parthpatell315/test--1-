import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  MapPin,
  CalendarCheck,
  MessageSquare,
  Image,
  Layout,
  Settings,
  LogOut,
  Loader2,
  Plane,
  BookOpen,
  FileText,
  Paintbrush,
  Star,
  Users,
  Search,
  Globe,
  Banknote,
  Link2,
  Sparkles,
  Plus,
  User,
  Palette,
  PlusCircle,
  ChevronDown,
  FilePlus,
  HelpCircle,
  Bell,
  Shield,
  ClipboardCheck,
  Building2,
  History,
  Wrench,
  CreditCard,
  ChevronRight,
  ShoppingCart,
  ShoppingBag,
  CheckSquare,
  Briefcase,
  Megaphone,
  ShieldAlert,
  Key,
  ShieldCheck,
  Sliders,
  Route,
  BadgeCheck,
  Wallet,
  Tent,
  Settings2,
  ListTodo,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NewBookingModal from "./NewBookingModal";
import { knowledgeService } from "@/services/knowledge.service";
import { erpService } from "@/services/erp.service";
import { resolveAdminRoute } from "@/lib/adminRouteAliases";

// Reconfigured hierarchical modules config for accordion logic:
interface SidebarModule {
  title: string;
  url?: string;
  icon: any;
  hasSubItems: boolean;
  subItems?: { title: string; url: string; isNew?: boolean }[];
}

const sidebarModules: SidebarModule[] = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    hasSubItems: false,
  },
  {
    title: "Sales",
    icon: ShoppingBag,
    hasSubItems: true,
    subItems: [
      { title: "Bookings", url: "/admin/bookings" },
      { title: "Booking Links", url: "/admin/booking-forms" },
      { title: "Quotations", url: "/admin/quotations" },
    ],
  },
  {
    title: "Tasks & Allotments",
    url: "/admin/tasks",
    icon: ListTodo,
    hasSubItems: false,
  },
  {
    title: "Operations",
    icon: Route,
    hasSubItems: true,
    subItems: [
      { title: "Departures", url: "/admin/operations" },
      { title: "Daily tasks", url: "/admin/operations/daily-tasks" },
      { title: "SOP & checklists", url: "/admin/operations/sops" },
      { title: "Vendors", url: "/admin/vendors" },
      { title: "Company docs", url: "/admin/company-documents" },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    hasSubItems: true,
    subItems: [
      { title: "Ledger & overview", url: "/admin/finance" },
      {
        title: "Incoming approvals",
        url: "/admin/approvals-hub?tab=payment-approvals",
      },
      {
        title: "Vendor payouts",
        url: "/admin/approvals-hub?tab=vendor-bills",
      },
      {
        title: "Refunds",
        url: "/admin/approvals-hub?tab=refund-requests",
      },
    ],
  },
  {
    title: "Business",
    icon: Tent,
    hasSubItems: true,
    subItems: [
      { title: "Trips", url: "/admin/trips" },
      { title: "Website", url: "/admin/website" },
      { title: "Pages", url: "/admin/pages" },
      { title: "Blogs", url: "/admin/blogs" },
      { title: "Reviews", url: "/admin/reviews" },
      { title: "SEO", url: "/admin/seo" },
      { title: "Footer", url: "/admin/footer-management" },
    ],
  },
  {
    title: "Administration",
    icon: Settings2,
    hasSubItems: true,
    subItems: [
      { title: "Staff profiles", url: "/admin/staff-profiles" },
      { title: "Roles", url: "/admin/roles" },
      { title: "Email templates", url: "/admin/email-templates" },
      { title: "Settings", url: "/admin/settings" },
      { title: "Profile", url: "/admin/my-profile" },
    ],
  },
];

// Brand mark: one triangle read two ways — a pitched tent (via the door
// notch) and a summit. Drawn inline so it stays crisp at any rail width.
function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FF4D00]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="#FFFFFF"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fillRule="evenodd"
          d="M12 3.4 L21.6 20.4 L2.4 20.4 Z M12 12.4 L14.6 20.4 L9.4 20.4 Z"
        />
      </svg>
    </span>
  );
}

function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout, admin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // State to track the single expanded module title
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Fetch navigation persistence on mount
  useEffect(() => {
    const fetchNavState = async () => {
      try {
        const dbSavedModule = await knowledgeService.getNavState();
        if (dbSavedModule) {
          setExpandedModule(dbSavedModule);
        }
      } catch (err) {
        console.error("Failed to load nav state:", err);
      }
    };
    fetchNavState();
  }, []);

  // Handle module header click
  const handleModuleClick = async (mod: SidebarModule) => {
    if (!mod.hasSubItems) {
      if (mod.url) {
        navigate(mod.url);
        if (isMobile) setOpenMobile(false);
      }
      return;
    }

    // Toggle single expanded navigation section
    const nextState = expandedModule === mod.title ? null : mod.title;
    setExpandedModule(nextState);

    // Save state to database persistence
    if (nextState) {
      try {
        await knowledgeService.saveNavState(nextState);
      } catch (err) {
        console.error("Failed to save nav state:", err);
      }
    }
  };

  const handleLogout = () => {
    try {
      logout();
    } catch (e) {
      console.error("Logout store error:", e);
    }
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("admin_user");
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = "/admin/login";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-[#152238] shadow-none">
      <SidebarContent className="scrollbar-hide flex flex-col h-full text-slate-400" style={{ background: "linear-gradient(180deg, #0D1B2E 0%, #0B1528 60%, #0A1220 100%)" }}>
        {/* Brand / Logo Header */}
        <div
          className={cn(
            "flex items-center justify-start shrink-0 h-14 px-4 overflow-hidden",
            collapsed && "justify-center px-0",
          )}
        >
          {!collapsed ? (
            <div className="flex w-full min-w-0 items-center gap-0">
              <span className="truncate text-[15px] leading-none tracking-tight">
                <span className="font-bold text-white">Youth</span>
                <span className="font-light text-[#FF4D00]">Camping</span>
              </span>
              <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-slate-600 border border-slate-700 rounded px-1 py-0.5 leading-none">ERP</span>
            </div>
          ) : (
            <span className="text-[12px] font-black text-white tracking-tight">YC</span>
          )}
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2.5 space-y-0.5">
          {sidebarModules.map((mod) => {
            const hasSub = mod.hasSubItems;

            // Helper function to check if user has access to a given sub-item or module URL
            const hasUserAccessToUrl = (subUrl: string) => {
              if (!admin) return false;
              const role = (admin.role || "").toLowerCase();
              if (role === "superadmin") return true;

              const urlPath = subUrl.split("?")[0];

              // Check founder-only administrative sub-items
              if (
                urlPath === "/admin/users" ||
                urlPath === "/admin/access-control"
              ) {
                const email = (admin.email || "").toLowerCase().trim();
                const name = (admin.name || "").toLowerCase().trim();
                const isFounder =
                  email.includes("hemal") ||
                  name.includes("hemal") ||
                  email === "hemal.patel@youthcamping.online";
                if (!isFounder) return false;
              }

              const isSuperAdmin = role === "superadmin" || role === "founder";
              if (isSuperAdmin) return true;

              // Determine effective permissions (union of default role permissions, token permissions, and custom permissions)
              const rolePerms = ROLE_PERMISSIONS[role] || [];
              const customPerms = Array.isArray(admin.customPermissions)
                ? admin.customPermissions
                : [];
              const tokenPerms = Array.isArray((admin as any).permissions)
                ? (admin as any).permissions
                : [];
              const effectivePerms = Array.from(
                new Set([...rolePerms, ...customPerms, ...tokenPerms]),
              );

              // URL to permission mappings
              const urlPermissionMap: Record<string, string[]> = {
                "/admin": ["dashboard.view"],
                "/admin/inquiries": ["inquiries.view", "leads.view"],

                "/admin/quotations": ["quotations.view"],
                "/admin/booking-forms": ["bookings.create", "bookings.view"],
                "/admin/bookings": ["bookings.view"],
                "/admin/tasks": ["bookings.view", "ops.view", "dashboard.view"],
                "/admin/operations/booking-tasks": ["bookings.view", "ops.view", "dashboard.view"],
                "/admin/operations": ["operations.view", "ops.view"],
                "/admin/vendors": ["vendors.view", "vendors.manage", "ops.view"],
                "/admin/company-documents": ["company_documents.view", "operations.view", "ops.view"],
                "/admin/approvals-hub": [
                  "accounting.view",
                  "finance.view",
                  "bookings.verify",
                ],
                "/admin/accounting": ["accounting.view", "finance.view", "payments.view"],
                "/admin/finance": ["accounting.view", "finance.view"],
                "/admin/travel-desk": [
                  "tickets.view",
                  "tickets.create",
                  "tickets.approve",
                ],
                "/admin/trips": ["trips.view"],
                "/admin/website": [
                  "design.view",
                  "pagebuilder.view",
                  "settings.view",
                  "website.view",
                ],
                "/admin/blogs": ["blogs.view", "settings.view"],
                "/admin/reviews": ["reviews.view", "settings.view"],
                "/admin/seo": ["seo.view", "settings.view"],
                "/admin/pages": ["settings.view"],
                "/admin/footer-management": ["settings.view"],
                "/admin/users": ["users.view", "users.manage"],
                "/admin/roles": ["users.permissions", "roles.manage"],
                "/admin/permission-matrix": [
                  "users.permissions",
                  "roles.manage",
                ],
                "/admin/access-control": [
                  "roles.manage",
                  "users.manage",
                  "users.permissions",
                ],
                "/admin/email-templates": ["emails.manage_templates"],
                "/admin/settings": ["settings.view"],
                "/admin/my-profile": [],
              };

              const required = urlPermissionMap[urlPath];
              if (required) {
                return required.some((p) => effectivePerms.includes(p));
              }

              return true;
            };

            const visibleSubItems =
              mod.subItems?.filter((sub) => hasUserAccessToUrl(sub.url)) || [];

            if (hasSub && visibleSubItems.length === 0) return null;
            if (!hasSub && mod.url && !hasUserAccessToUrl(mod.url)) return null;

            // Check if a sub-item is active
            const isSubActive = (url: string) => {
              const [urlPath, urlSearch] = url.split("?");
              const currentPath = location.pathname;

              let pathMatches = false;
              if (currentPath === urlPath) {
                pathMatches = true;
              } else if (
                urlPath === "/admin/operations" &&
                currentPath.startsWith("/admin/departure-workspace")
              ) {
                pathMatches = true;
              } else if (
                urlPath !== "/admin" &&
                currentPath.startsWith(urlPath + "/")
              ) {
                // Check if any visible sibling sub-item has a more specific (longer) matching urlPath
                const hasMoreSpecificSibling = visibleSubItems.some((otherSub) => {
                  if (otherSub.url === url) return false;
                  const [otherPath] = otherSub.url.split("?");
                  return (
                    otherPath.length > urlPath.length &&
                    (currentPath === otherPath ||
                      currentPath.startsWith(otherPath + "/"))
                  );
                });
                if (!hasMoreSpecificSibling) {
                  pathMatches = true;
                }
              }

              if (!pathMatches) return false;

              const searchParams = new URLSearchParams(location.search);
              const currentTab = searchParams.get("tab");

              if (urlSearch) {
                // This sub-item expects specific query params like ?tab=stationpayments
                const urlParams = new URLSearchParams(urlSearch);
                for (const [key, val] of urlParams.entries()) {
                  if (searchParams.get(key) !== val) return false;
                }
                return true;
              }

              // If this sub-item has NO query params (e.g. /admin/operations):
              // If a sibling sub-item has query params matching current location.search, this base item should NOT be active.
              if (currentTab) {
                const hasMatchingSiblingTab = visibleSubItems.some((otherSub) => {
                  if (otherSub.url === url) return false;
                  const [otherPath, otherSearch] = otherSub.url.split("?");
                  if (otherPath === urlPath && otherSearch) {
                    const otherParams = new URLSearchParams(otherSearch);
                    return otherParams.get("tab") === currentTab;
                  }
                  return false;
                });
                if (hasMatchingSiblingTab) return false;
              }

              return true;
            };

            const isAnySubActive =
              hasSub && visibleSubItems.some((sub) => isSubActive(sub.url));
            const isDirectActive =
              !hasSub &&
              mod.url &&
              (location.pathname === mod.url ||
                (mod.url !== "/admin" &&
                  location.pathname.startsWith(mod.url)));
            const isModuleActive = isDirectActive || isAnySubActive;
            const isExpanded = expandedModule === mod.title || isAnySubActive;

            return (
              <div key={mod.title} className="flex flex-col">
                <button
                  onClick={() => handleModuleClick(mod)}
                  className={cn(
                    "group/nav flex items-center w-full h-9 rounded-lg px-2 transition-all duration-150 relative text-left cursor-pointer",
                    collapsed && "justify-center px-0",
                    isModuleActive
                      ? "bg-white/[0.07] text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]",
                  )}
                >
                  {isModuleActive && !collapsed && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full bg-[#FF4D00] shadow-[0_0_6px_rgba(255,77,0,0.6)]" />
                  )}
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md shrink-0 transition-colors",
                      collapsed ? "" : "mr-2.5",
                      isModuleActive
                        ? "text-[#FF4D00]"
                        : "text-slate-500 group-hover/nav:text-slate-300",
                    )}
                  >
                    <mod.icon className="h-[14px] w-[14px]" strokeWidth={2} />
                  </span>
                  {!collapsed && (
                    <span
                      className={cn(
                        "flex-1 truncate text-[12.5px] tracking-[-0.01em]",
                        isModuleActive ? "font-semibold text-white" : "font-medium",
                      )}
                    >
                      {mod.title}
                    </span>
                  )}

                  {!collapsed &&
                    hasSub &&
                    (isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-slate-600 ml-auto shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-slate-600 ml-auto shrink-0" strokeWidth={2} />
                    ))}
                </button>

                {!collapsed && hasSub && isExpanded && (
                  <div className="ml-5 pl-3 pr-1 py-0.5 mb-1 flex flex-col gap-px border-l border-white/[0.07]">
                    {visibleSubItems.map((sub) => {
                      const active = isSubActive(sub.url);
                      return (
                        <NavLink
                          key={`${sub.title}-${sub.url}`}
                          to={sub.url}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                          className={cn(
                            "text-[12px] py-1.5 px-2.5 rounded-md transition-all duration-100 flex items-center gap-1.5 cursor-pointer leading-snug",
                            active
                              ? "text-white font-semibold bg-[#FF4D00]/10"
                              : "text-slate-500 font-medium hover:text-slate-200 hover:bg-white/[0.04]",
                          )}
                          activeClassName=""
                        >
                          {active && <span className="h-1 w-1 rounded-full bg-[#FF4D00] shrink-0" />}
                          <span>{sub.title}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-2.5 border-t border-white/[0.06]">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              {admin && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#ff7040] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                  {admin.name ? admin.name.charAt(0).toUpperCase() : "A"}
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="h-8 w-8 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-white/[0.04] rounded-lg px-2.5 py-2 border border-white/[0.05]">
              {admin && (
                <>
                  {admin.avatarUrl ? (
                    <img
                      src={admin.avatarUrl}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-[#FF4D00]/30 shrink-0"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#ff7040] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                      {admin.name ? admin.name.charAt(0).toUpperCase() : "A"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white truncate leading-tight">
                      {admin.name || "Admin"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate capitalize">
                      {(admin.role || "operator").replace(/_/g, " ")}
                    </p>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="h-7 w-7 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileQuickActionFab } from "@/components/mobile/MobileQuickActionFab";
import { MobileNavigationDrawer } from "@/components/mobile/MobileNavigationDrawer";

function resolveAdminPageTitle(
  pathname: string,
  searchParams: URLSearchParams,
  role?: string,
  compact = false,
) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "admin")) {
    return "Dashboard";
  }
  if (pathname.startsWith("/admin/departure-workspace")) {
    return compact ? "Departure" : "Departure Workspace";
  }
  if (
    pathname.startsWith("/admin/accounting") ||
    pathname.startsWith("/admin/finance") ||
    pathname.startsWith("/admin/approvals-hub")
  ) {
    if ((role || "").toLowerCase() === "sales") {
      return "Payments";
    }
    const tab = searchParams.get("tab") || "overview";
    return `Finance · ${tab.replace(/_/g, " ")}`;
  }
  if (pathname.startsWith("/admin/operations")) {
    return "Departures";
  }
  const lastPart = parts.pop() || "";
  return lastPart.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveAdminDisplayRole(admin: {
  email?: string;
  role?: string;
} | null) {
  const email = (admin?.email || "").toLowerCase().trim();
  const isFounder =
    email.includes("hemal") ||
    email === "hemal.patel@youthcamping.online" ||
    admin?.role === "superadmin";
  if (isFounder) return "Founder";
  const raw = (admin?.role || "staff").replace(/_/g, " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevLocationRef = useRef(location.key);

  useEffect(() => {
    if (prevLocationRef.current !== location.key) {
      prevLocationRef.current = location.key;
      setIsNavigating(true);
      const t = setTimeout(() => setIsNavigating(false), 500);
      return () => clearTimeout(t);
    }
  }, [location.key]);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Record<string, { title: string; path: string }[]>
  >({});
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({});
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await erpService.searchAll(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";
      if (
        (e.key === "k" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "/" && !isInput)
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    const openSearch = () => setIsSearchOpen(true);
    const openNewBooking = () => setBookingModalOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("yc:open-global-search", openSearch);
    window.addEventListener("yc:open-new-booking", openNewBooking);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("yc:open-global-search", openSearch);
      window.removeEventListener("yc:open-new-booking", openNewBooking);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !admin) {
      checkAuth();
    }
  }, [checkAuth, isAuthenticated, admin]);

  useEffect(() => {
    if (!admin || isLoading) return;

    const currentPath = location.pathname;

    // Skip checks for login and unauthorized pages
    if (
      currentPath === "/admin/login" ||
      currentPath === "/admin/unauthorized" ||
      currentPath === "/admin/travel-desk"
    )
      return;

    const allowed = true;

    if (!allowed) {
      console.warn("🚫 Unauthorized access attempt to:", currentPath);
      navigate("/admin/unauthorized");
    }
  }, [location.pathname, admin, isLoading, navigate]);

  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      location.pathname !== "/admin/login"
    ) {
      console.log("🔒 Not authenticated, redirecting to login...");
      navigate("/admin/login");
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  const mainScrollRef = useRef<HTMLElement | null>(null);

  // Always reset scroll to top on page navigation or query param change
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF7F2] via-[#F4F7FB] to-[#EEF2F8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#FF4D00]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Loading
          </p>
        </div>
      </div>
    );
  }

  // The redirect effect above handles unauthenticated access.

  // Determine if we should show the "Need Help" sidebar (VacationLabs style)
  const showHelpPanel =
    location.pathname.includes("/settings") ||
    location.pathname.includes("/seo") ||
    location.pathname.includes("/pages");

  return (
    <SidebarProvider className="admin-app-shell min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-transparent">
        <AdminSidebar />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Navigation progress bar — appears during React Router lazy-load transitions */}
          {isNavigating && (
            <div className="absolute top-0 left-0 right-0 z-50 h-[2px] overflow-hidden">
              <div
                className="h-full bg-[#FF4D00] rounded-full"
                style={{
                  animation: "nav-progress 1.2s ease-in-out infinite",
                  width: "60%",
                }}
              />
              <style>{`
                @keyframes nav-progress {
                  0%   { transform: translateX(-100%); width: 60%; }
                  50%  { width: 80%; }
                  100% { transform: translateX(200%); width: 60%; }
                }
              `}</style>
            </div>
          )}
          {/* Top command strip — 56px */}
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0D1B2E] px-2 sm:gap-4 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <SidebarTrigger className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-slate-400 transition-colors hover:bg-white/[0.07] hover:text-white md:flex" />
              <h1 className="min-w-0 truncate text-[14px] font-semibold leading-none tracking-tight text-white">
                <span className="md:hidden">
                  {resolveAdminPageTitle(
                    location.pathname,
                    searchParams,
                    admin?.role,
                    true,
                  )}
                </span>
                <span className="hidden md:inline">
                  {resolveAdminPageTitle(
                    location.pathname,
                    searchParams,
                    admin?.role,
                  )}
                </span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={isMac ? "Search (Command K)" : "Search (Control K)"}
              className="hidden h-8 w-52 shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 text-left transition-colors hover:bg-white/[0.09] hover:border-white/[0.14] focus:outline-none md:flex"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-500">
                Search
              </span>
              <kbd className="inline-flex shrink-0 items-center gap-0.5">
                <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[3px] border border-white/[0.1] bg-white/[0.06] px-1 text-[9px] font-medium leading-none text-slate-500">
                  {isMac ? "⌘" : "Ctrl"}
                </span>
                <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[3px] border border-white/[0.1] bg-white/[0.06] px-1 text-[9px] font-medium leading-none text-slate-500">
                  K
                </span>
              </kbd>
            </button>

            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.07] hover:text-slate-300 md:hidden"
              >
                <Search className="h-4 w-4" strokeWidth={1.75} />
              </button>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 items-center gap-2 rounded-lg px-2 text-left outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#FF4D00]/30"
                  >
                    {admin?.avatarUrl ? (
                      <img
                        src={admin.avatarUrl}
                        className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-[#FF4D00]/30"
                        alt={admin?.name || "User"}
                      />
                    ) : (
                      <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#ff7040] flex items-center justify-center text-[10px] font-bold text-white">
                        {admin?.name ? admin.name.charAt(0).toUpperCase() : "A"}
                      </div>
                    )}
                    <span className="hidden items-baseline gap-1.5 lg:inline-flex">
                      <span className="text-[12.5px] font-semibold leading-none text-white">
                        {admin?.name || (admin as any)?.fullName || "User"}
                      </span>
                      <span className="text-[11px] font-medium leading-none text-slate-500">
                        {resolveAdminDisplayRole(admin)}
                      </span>
                    </span>
                    <ChevronDown className="hidden h-3 w-3 text-slate-600 lg:block" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1.5 rounded-xl shadow-2xl z-50 border border-white/[0.08]"
                  style={{ background: "linear-gradient(180deg, #0D1B2E 0%, #0B1528 100%)" }}
                >
                  <div className="px-2.5 py-2 border-b border-white/[0.07] mb-1 rounded-lg">
                    <p className="text-[12px] font-bold text-white truncate">
                      {admin?.name || "User"}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">
                      {admin?.email}
                    </p>
                    <span className="mt-1 inline-block text-[10px] font-semibold capitalize text-[#FF4D00] bg-[#FF4D00]/10 px-1.5 py-0.5 rounded">
                      {resolveAdminDisplayRole(admin)}
                    </span>
                  </div>

                  <DropdownMenuItem
                    onClick={() => navigate("/admin/my-profile")}
                    className="text-[12px] font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white cursor-pointer rounded-md py-1.5"
                  >
                    <User className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    My Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/admin/settings")}
                    className="text-[12px] font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white cursor-pointer rounded-md py-1.5"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    Settings
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/admin/change-password")}
                    className="text-[12px] font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white cursor-pointer rounded-md py-1.5"
                  >
                    <Key className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    Change Password
                  </DropdownMenuItem>

                  {((admin?.email || "").toLowerCase().includes("hemal") ||
                    admin?.email === "hemal.patel@youthcamping.online") && (
                    <>
                      <DropdownMenuSeparator className="my-1 border-slate-100" />
                      <DropdownMenuItem
                        onClick={() => navigate("/admin/staff-profiles")}
                        className="text-xs font-semibold text-[#C2410C] hover:bg-[#FF4D00]/5 cursor-pointer rounded-md py-1.5"
                      >
                        <Users className="w-4 h-4 mr-2 text-[#FF4D00]" />
                        Manage Staff Profiles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/admin/roles")}
                        className="text-[12px] font-medium text-[#FF4D00] hover:bg-[#FF4D00]/10 cursor-pointer rounded-md py-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#FF4D00]" />
                        Roles & Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate("/admin/permission-matrix")}
                        className="text-[12px] font-medium text-[#FF4D00] hover:bg-[#FF4D00]/10 cursor-pointer rounded-md py-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-2 text-[#FF4D00]" />
                        Permission Matrix
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator className="my-1 border-white/[0.07]" />

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      logout();
                    }}
                    className="text-[12px] font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 cursor-pointer rounded-md py-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span aria-hidden className="hidden h-4 w-px bg-white/[0.08] sm:block" />

              <button
                type="button"
                onClick={() => setBookingModalOpen(true)}
                className="hidden h-8 items-center gap-1.5 rounded-lg bg-[#FF4D00] px-3 text-[12px] font-semibold text-white shadow-[0_0_12px_rgba(255,77,0,0.25)] transition-colors hover:bg-[#E04400] md:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                New Booking
              </button>
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Main Content Area — single page scroller */}
            <main ref={mainScrollRef} className="admin-main-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:p-5 md:pb-5">
              <div className="admin-content-host mx-auto min-h-0 w-full min-w-0 max-w-[1600px]">{children}</div>
            </main>

            {/* Help Sidebar */}
            {showHelpPanel && (
              <aside className="hidden min-h-0 w-[280px] flex-col overflow-y-auto border-l bg-white p-5 no-scrollbar 2xl:flex">
                <div className="space-y-6">
                  <section className="space-y-3">
                    <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">
                      Resources
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="space-y-2">
                        <BookOpen className="w-4 h-4 text-[#FF4D00]" />
                        <h4 className="font-semibold text-sm text-[#0B1528]">
                          Knowledge Base
                        </h4>
                        <p className="text-[12px] text-slate-500 leading-relaxed">
                          Step-by-step guides for configuring the platform.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-hidden rounded-xl border border-slate-100 bg-white p-0 shadow-xl sm:max-h-[85vh]">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search modules, paths, and settings instantly.
          </DialogDescription>
          <div className="relative p-4 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search anything... (e.g. BK-2026, Rahul, GST, MKA)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none border-none bg-transparent"
            />
          </div>
          <div className="max-h-[380px] overflow-y-auto p-3.5 space-y-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF4D00]" />
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">
                  Searching Database...
                </span>
              </div>
            ) : Object.keys(searchResults).length > 0 ? (
              Object.entries(searchResults).map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          navigate(resolveAdminRoute(item.path));
                          setIsSearchOpen(false);
                          setSearchQuery("");
                          setSearchResults({});
                        }}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl cursor-pointer transition-all"
                      >
                        <span className="text-xs font-semibold text-slate-850">
                          {item.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-350" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : searchQuery.trim() ? (
              <p className="text-xs text-slate-400 text-center py-6 font-semibold">
                No records match your query.
              </p>
            ) : (
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                  Quick Navigation Suggestions
                </h4>
                <div className="space-y-1">
                  {[
                    { title: "Dashboard Overview", path: "/admin" },
                    { title: "Bookings Ledger", path: "/admin/bookings" },
                    { title: "Finance Control Center", path: "/admin/finance" },
                    { title: "Staff Directory", path: "/admin/staff-profiles" },
                    {
                      title: "Company Legal Documents",
                      path: "/admin/company-documents",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        navigate(resolveAdminRoute(item.path));
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl cursor-pointer transition-all"
                    >
                      <span className="text-xs font-semibold text-slate-850">
                        {item.title}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-350" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        onSuccess={() => {
          console.log("📅 Booking created successfully!");
          if (location.pathname === "/admin/bookings") {
            window.location.reload();
          }
        }}
      />

      {/* Mobile: bottom nav + quick actions (desktop uses sidebar + header only) */}
      <MobileBottomNav onOpenDrawer={() => setIsMobileDrawerOpen(true)} />
      <MobileQuickActionFab onOpenNewBooking={() => setBookingModalOpen(true)} />
      <MobileNavigationDrawer
        open={isMobileDrawerOpen}
        onOpenChange={setIsMobileDrawerOpen}
      />
    </SidebarProvider>
  );
}


