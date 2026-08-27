import React, { useState, useEffect, useMemo } from "react";
import { adminUsersService } from "@/services/adminUsers.service";
import { Admin, AdminRole } from "@/types";
import {
  Users,
  Shield,
  User as UserIcon,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Key,
  Calendar,
  Lock,
  Mail,
  UserPlus,
  Sliders,
  ShieldCheck,
  Check,
  RotateCcw,
  Search,
  Filter,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  ChevronRight,
  ChevronDown,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const ROLES: {
  value: AdminRole;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: "superadmin",
    label: "Super Admin",
    desc: "Full unrestricted system access",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    value: "admin",
    label: "Admin",
    desc: "Manage trips, bookings, reports",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "sales",
    label: "Sales",
    desc: "View and manage leads & quotes",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  {
    value: "operations",
    label: "Operations",
    desc: "View rosters, assign guides & rooms",
    color: "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30",
  },
  {
    value: "finance",
    label: "Finance",
    desc: "View payments, GST, process invoices",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "finance_controller",
    label: "Finance Controller",
    desc: "Verify & approve cash, incoming & outgoing payouts, price audits",
    color: "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30",
  },
  {
    value: "guide",
    label: "Guide",
    desc: "Read assigned trips & operations",
    color: "bg-[#FF4D00]/5 text-[#C2410C] border-[#FF4D00]/30",
  },
  {
    value: "viewer",
    label: "Viewer",
    desc: "Read-only access to modules",
    color: "bg-slate-50 text-slate-700 border-slate-200",
  },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: [],
  admin: [
    "dashboard.view",
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.publish",
    "trips.archive",
    "design.view",
    "design.edit",
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.approve",
    "bookings.reject",
    "payments.view",
    "payments.edit",
    "inquiries.view",
    "inquiries.create",
    "inquiries.edit",
    "quotations.view",
    "quotations.create",
    "quotations.edit",
    "customers.view",
    "guides.view",
    "guides.manage",
    "operations.view",
    "operations.edit",
    "reports.view",
    "reports.export",
    "settings.view",
    "bookings.verify",
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "tickets.submit",
    "tickets.approve",
    "tickets.reopen",
    "tickets.bulk",
    "tickets.templates.manage",
    "tickets.alerts.view",
    "accounting.view",
    "accounting.submit",
    "accounting.approve",
    "ops.view",
    "ops.manage",
    "ops.allocate",
    "ops.checklist",
    "emails.view",
    "emails.send",
    "emails.send_bulk",
    "emails.manage_templates",
    "emails.view_logs",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.import",
    "vendors.activate",
    "package.vendor.select",
    "ops.vendor.allocate",
    "ops.vendor.confirm",
    "ops.vendor.rate.override",
    "station_payments.view",
    "station_payments.collect",
    "station_payments.edit_before_handover",
    "station_payments.cancel",
    "station_payments.handover",
    "station_payments.receive",
    "station_payments.reconcile",
    "station_payments.export",
    "station_payments.resend_receipt",
    "station_payments.manage_accounts",
    "station_payments.verify_upi",
  ],
  sales: [
    "dashboard.view",
    "trips.view",
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "bookings.approve",
    "payments.view",
    "inquiries.view",
    "inquiries.create",
    "inquiries.edit",
    "quotations.view",
    "quotations.create",
    "quotations.edit",
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "tickets.submit",
    "tickets.bulk",
    "tickets.alerts.view",
    "accounting.view",
    "accounting.submit",
    "emails.view",
    "emails.send",
    "emails.send_bulk",
    "emails.view_logs",
    "vendors.view",
    "package.vendor.select",
    "notifications.view_own",
    "notifications.mark_read",
    "activity.view",
    "customers.view",
    "customers.timeline.view",
    "company_documents.view",
    "recurring_tasks.view",
    "station_payments.view",
  ],
  operations: [
    "dashboard.view",
    "trips.view",
    "bookings.view",
    "bookings.edit",
    "operations.view",
    "operations.edit",
    "guides.view",
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "tickets.submit",
    "tickets.approve",
    "tickets.reopen",
    "tickets.bulk",
    "tickets.templates.manage",
    "tickets.alerts.view",
    "ops.view",
    "ops.manage",
    "ops.allocate",
    "ops.checklist",
    "emails.view",
    "emails.send",
    "emails.view_logs",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.import",
    "package.vendor.select",
    "ops.vendor.allocate",
    "ops.vendor.confirm",
    "ops.vendor.rate.override",
    "notifications.view_own",
    "notifications.mark_read",
    "activity.view",
    "company_documents.view",
    "recurring_tasks.view",
    "recurring_tasks.assign",
    "station_payments.view",
    "station_payments.collect",
    "station_payments.edit_before_handover",
    "station_payments.cancel",
    "station_payments.handover",
    "station_payments.resend_receipt",
  ],
  finance: [
    "dashboard.view",
    "bookings.view",
    "bookings.edit",
    "payments.view",
    "payments.edit",
    "reports.view",
    "reports.export",
    "accounting.view",
    "accounting.submit",
    "accounting.approve",
    "emails.view",
    "emails.send",
    "station_payments.view",
    "station_payments.receive",
    "station_payments.reconcile",
    "station_payments.export",
    "station_payments.manage_accounts",
    "station_payments.verify_upi",
  ],
  finance_controller: [
    "dashboard.view",
    "bookings.view",
    "payments.view",
    "reports.view",
    "reports.export",
    "accounting.view",
    "accounting.approve",
    "finance.control_center.view",
    "finance.incoming.verify",
    "finance.incoming.approve",
    "finance.cash.verify",
    "finance.cash.approve",
    "finance.cash.reject",
    "finance.outgoing.verify",
    "finance.outgoing.approve",
    "finance.outgoing.pay",
    "finance.tickets.verify",
    "finance.tickets.approve",
    "finance.refunds.view",
    "finance.refunds.approve",
    "finance.discrepancy.manage",
    "finance.reports.export",
    "station_payments.view",
    "station_payments.receive",
    "station_payments.reconcile",
    "station_payments.export",
    "station_payments.manage_accounts",
    "station_payments.verify_upi",
    "vendors.view",
    "vendors.payments.view",
    "tickets.view",
    "audit_logs.view",
    "audit.view",
    "notifications.view_own",
    "notifications.mark_read",
    "customers.timeline.view",
    "customers.timeline.view_finance",
  ],
  guide: [
    "trips.view",
    "bookings.view",
    "operations.view",
    "operations.edit",
    "guides.view",
    "station_payments.view",
    "station_payments.collect",
  ],
  viewer: [
    "dashboard.view",
    "trips.view",
    "bookings.view",
    "inquiries.view",
    "quotations.view",
    "reports.view",
  ],
};

const PERMISSION_GROUPS = [
  {
    name: "Dashboard & Analytics",
    permissions: [
      { key: "dashboard.view", label: "View Overview Dashboard" },
      { key: "dashboard.analytics", label: "View Analytics & Charts" },
      { key: "activity.view", label: "View System Activity Log" },
    ],
  },
  {
    name: "Sales & CRM",
    permissions: [
      { key: "inquiries.view", label: "View Leads & Inquiries" },
      { key: "inquiries.create", label: "Create Inquiries" },
      { key: "inquiries.edit", label: "Edit Leads & Notes" },
      { key: "quotations.view", label: "View Quotations" },
      { key: "quotations.create", label: "Create Quotations" },
      { key: "quotations.edit", label: "Edit Quotations" },
      { key: "booking_forms.view", label: "View Booking Links" },
      { key: "booking_forms.create", label: "Generate Booking Links" },
    ],
  },
  {
    name: "Bookings & Customers",
    permissions: [
      { key: "bookings.view", label: "View Assigned Bookings" },
      { key: "bookings.view_all", label: "View All Company Bookings" },
      { key: "bookings.create", label: "Create Manual Booking" },
      { key: "bookings.edit", label: "Edit Booking & Passengers" },
      { key: "bookings.approve", label: "Approve & Confirm Bookings" },
      { key: "bookings.reject", label: "Reject / Cancel Bookings" },
      { key: "bookings.verify", label: "Verify Documents & ID Proofs" },
      { key: "customers.view", label: "View Customer Profiles" },
      { key: "customers.export", label: "Export Customer Data" },
    ],
  },
  {
    name: "Operations & Departures Hub",
    permissions: [
      { key: "operations.view", label: "View Departures Hub" },
      { key: "operations.edit", label: "Edit Departures & Allocations" },
      { key: "ops.view", label: "View Ops Workspace" },
      { key: "ops.manage", label: "Manage Ops Workspace" },
      { key: "ops.allocate", label: "Allocate Staff & Transport" },
      { key: "ops.checklist", label: "Complete Pre-Departure Checklist" },
      { key: "guides.view", label: "View Guides & Trek Leaders" },
      { key: "guides.manage", label: "Manage Guides & Leader Profiles" },
      { key: "recurring_tasks.view", label: "View Recurring Tasks" },
      { key: "recurring_tasks.assign", label: "Assign Recurring Tasks" },
    ],
  },
  {
    name: "Station Payment Desk",
    permissions: [
      { key: "station_payments.view", label: "View Station Cash Collections" },
      { key: "station_payments.collect", label: "Collect Cash at Station" },
      { key: "station_payments.edit_before_handover", label: "Edit Entry Before Handover" },
      { key: "station_payments.cancel", label: "Cancel Cash Entry" },
      { key: "station_payments.handover", label: "Handover Cash to Lead" },
      { key: "station_payments.receive", label: "Receive & Verify Handover" },
      { key: "station_payments.reconcile", label: "Reconcile Cash Desk" },
      { key: "station_payments.export", label: "Export Station Cash Logs" },
      { key: "station_payments.manage_accounts", label: "Manage Collection Accounts" },
      { key: "station_payments.verify_upi", label: "Verify UPI Received at Station" },
      { key: "station_payments.resend_receipt", label: "Resend Station Cash Receipts" },
    ],
  },
  {
    name: "Ticketing Queue & Train Desk",
    permissions: [
      { key: "tickets.view", label: "View Ticketing Queue" },
      { key: "tickets.create", label: "Create Ticket Requests" },
      { key: "tickets.edit", label: "Edit PNR & Passenger Seat" },
      { key: "tickets.submit", label: "Submit Ticket for Verification" },
      { key: "tickets.approve", label: "Approve & Lock PNR Tickets" },
      { key: "tickets.reopen", label: "Reopen Ticket Approval" },
      { key: "tickets.bulk", label: "Bulk Auto-Generate Tickets" },
      { key: "tickets.templates.manage", label: "Manage Train Master Templates" },
      { key: "tickets.alerts.view", label: "View Ticketing Alerts" },
    ],
  },
  {
    name: "Finance & Accounting",
    permissions: [
      { key: "accounting.view", label: "View Accounting & General Ledger" },
      { key: "accounting.submit", label: "Submit Expense/Revenue Entries" },
      { key: "accounting.approve", label: "Approve Journal Entries" },
      { key: "payments.view", label: "View Client Payments" },
      { key: "payments.edit", label: "Record / Edit Payments" },
      { key: "reports.view", label: "View Financial Reports" },
      { key: "reports.export", label: "Export Financial Reports" },
    ],
  },
  {
    name: "Travel Desk",
    permissions: [
      { key: "travel_desk.view", label: "View Travel Desk Workspace" },
      { key: "travel_desk.manage", label: "Manage Flight / Bus / Train Desk" },
    ],
  },
  {
    name: "Vendor Directory & Packages",
    permissions: [
      { key: "vendors.view", label: "View Vendor Directory" },
      { key: "vendors.create", label: "Create New Vendor" },
      { key: "vendors.edit", label: "Edit Vendor Profiles & Rates" },
      { key: "vendors.import", label: "Import Vendor Data" },
      { key: "packages.view", label: "View Vendor Packages" },
      { key: "packages.manage", label: "Manage Vendor Packages" },
      { key: "ops.vendor.allocate", label: "Allocate Vendor to Departure" },
      { key: "ops.vendor.rate.override", label: "Override Vendor Rates" },
    ],
  },
  {
    name: "Trips & Product Catalog",
    permissions: [
      { key: "trips.view", label: "View Trips Catalog" },
      { key: "trips.create", label: "Create New Trip" },
      { key: "trips.edit", label: "Edit Itinerary, Rates & Photos" },
      { key: "trips.publish", label: "Publish / Archive Trips" },
      { key: "trips.delete", label: "Delete Trips" },
      { key: "masterdatabase.view", label: "View Master Database" },
    ],
  },
  {
    name: "Website & Content Builder",
    permissions: [
      { key: "website.view", label: "View Website Control Center" },
      { key: "pagebuilder.view", label: "View Page Builder" },
      { key: "pagebuilder.edit", label: "Edit Landing Pages & Sections" },
      { key: "seo.view", label: "View SEO Center" },
      { key: "seo.edit", label: "Edit Meta Tags & Schemas" },
      { key: "blogs.view", label: "Manage Blogs & Articles" },
      { key: "reviews.view", label: "Manage Reviews & Testimonials" },
      { key: "footer.manage", label: "Manage Website Footer" },
    ],
  },
  {
    name: "Communications & Emails",
    permissions: [
      { key: "emails.view", label: "View Communication Feed" },
      { key: "emails.send", label: "Send Direct Emails / WhatsApp" },
      { key: "emails.send_bulk", label: "Broadcast Bulk Emails" },
      { key: "emails.manage_templates", label: "Manage Email Templates" },
      { key: "emails.view_logs", label: "View Email Audit Logs" },
    ],
  },
  {
    name: "Company Vault & Documents",
    permissions: [
      { key: "company_documents.view", label: "View Vault Documents" },
      { key: "company_documents.upload", label: "Upload Vault Documents" },
      { key: "company_documents.delete", label: "Delete Vault Documents" },
    ],
  },
  {
    name: "Administration & Settings",
    permissions: [
      { key: "users.view", label: "View Staff Profiles" },
      { key: "users.manage", label: "Create / Edit / Delete Staff Accounts" },
      { key: "roles.manage", label: "Manage Roles & Permissions Matrix" },
      { key: "audit.view", label: "View Audit Trail Logs" },
      { key: "settings.view", label: "View System Settings" },
      { key: "settings.edit", label: "Edit System & Gateway Settings" },
    ],
  },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loginFilter, setLoginFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [isCreating, setIsCreating] = useState(false);

  // Reset password dialog state
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Admin | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Permanent Delete Dialog state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<Admin | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage Access Drawer / Sheet state
  const [permOpen, setPermOpen] = useState(false);
  const [permUser, setPermUser] = useState<Admin | null>(null);
  const [permRole, setPermRole] = useState<AdminRole>("admin");
  const [selectedCustomPerms, setSelectedCustomPerms] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await adminUsersService.listAdmins();
      setUsers(data);
    } catch (error: any) {
      console.error("Failed to fetch admins:", error);
      toast.error(
        error.response?.data?.message || "Failed to load admin users",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Derived Statistics for KPI Row ─── */
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const pendingInvites = users.filter(
      (u) => !u.lastLoginAt || !u.isActive,
    ).length;
    const superAdmins = users.filter((u) => u.role === "superadmin").length;
    return { total, active, pendingInvites, superAdmins };
  }, [users]);

  /* ─── Filtering Logic ─── */
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = (user.name || "").toLowerCase().includes(query);
        const matchesEmail = (user.email || "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      // Role Filter
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      // Status Filter
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;
      // Login Filter
      if (loginFilter === "recent" && !user.lastLoginAt) return false;
      if (loginFilter === "never" && user.lastLoginAt) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter, loginFilter]);

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setLoginFilter("all");
  };

  /* ─── Handlers ─── */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword || !newRole) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsCreating(true);
      await adminUsersService.createAdmin({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      toast.success("Staff profile created successfully");
      setCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to create admin:", error);
      toast.error(error.response?.data?.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await adminUsersService.toggleAdminActive(userId);
      toast.success(`Account is now ${res.isActive ? "active" : "disabled"}`);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to toggle status:", error);
      toast.error(
        error.response?.data?.message || "Failed to change active status",
      );
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPasswordVal) {
      toast.error("Please enter a new password");
      return;
    }

    try {
      setIsResetting(true);
      await adminUsersService.resetAdminPassword(
        selectedUser.id,
        resetPasswordVal,
      );
      toast.success(`Password reset successfully for ${selectedUser.name}`);
      setResetOpen(false);
      setSelectedUser(null);
      setResetPasswordVal("");
    } catch (error: any) {
      console.error("Failed to reset password:", error);
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      setIsDeleting(true);
      await adminUsersService.deleteAdmin(deleteConfirmUser.id);
      toast.success(
        `Profile for ${deleteConfirmUser.name || deleteConfirmUser.email} deleted permanently`,
      );
      setDeleteConfirmUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to delete user profile:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete user profile",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openPermissionDrawer = (user: Admin) => {
    setPermUser(user);
    setPermRole(user.role);
    if (
      user.customPermissions &&
      Array.isArray(user.customPermissions) &&
      user.customPermissions.length > 0
    ) {
      setSelectedCustomPerms(user.customPermissions);
    } else {
      const defaultPerms = ROLE_PERMISSIONS[user.role] || [];
      setSelectedCustomPerms([...defaultPerms]);
    }
    setPermOpen(true);
  };

  const handleRoleChangeInDrawer = (newRole: AdminRole) => {
    setPermRole(newRole);
    const defaultPerms = ROLE_PERMISSIONS[newRole] || [];
    setSelectedCustomPerms([...defaultPerms]);
  };

  const toggleGroupPermissions = (groupKeys: string[], isChecked: boolean) => {
    if (isChecked) {
      setSelectedCustomPerms((prev) =>
        Array.from(new Set([...prev, ...groupKeys])),
      );
    } else {
      setSelectedCustomPerms((prev) =>
        prev.filter((k) => !groupKeys.includes(k)),
      );
    }
  };

  const toggleSinglePermission = (itemKey: string) => {
    setSelectedCustomPerms((prev) =>
      prev.includes(itemKey)
        ? prev.filter((k) => k !== itemKey)
        : [...prev, itemKey],
    );
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permUser) return;

    try {
      setIsSavingPerms(true);
      await adminUsersService.updateAdminPermissions(permUser.id, {
        role: permRole,
        customPermissions: selectedCustomPerms,
      });
      toast.success(`Access permissions saved for ${permUser.name}`);
      setPermOpen(false);
      setPermUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update permissions:", error);
      toast.error(
        error.response?.data?.message || "Failed to update permissions",
      );
    } finally {
      setIsSavingPerms(false);
    }
  };

  const getRoleColor = (roleName: string) => {
    const matched = ROLES.find((r) => r.value === roleName);
    return matched
      ? matched.color
      : "bg-slate-50 text-slate-700 border-slate-200";
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center space-x-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
        <span className="text-xs font-semibold">Loading Staff Profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb & Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Administration</span>
            <span>/</span>
            <span className="text-slate-700 font-bold">Staff Profiles</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17233C] tracking-tight">
            Staff Profiles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Manage team members, roles, permissions, and account access.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#FF4D00] hover:bg-[#EA580C] text-white rounded-lg h-9 px-4 text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Create User
        </Button>
      </div>

      {/* ─── Compact KPI Row (4 Cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Users
            </p>
            <p className="text-xl font-extrabold text-[#17233C]">
              {stats.total}
            </p>
          </div>
        </Card>

        <Card className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Users
            </p>
            <p className="text-xl font-extrabold text-green-600">
              {stats.active}
            </p>
          </div>
        </Card>

        <Card className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pending / Inactive
            </p>
            <p className="text-xl font-extrabold text-amber-600">
              {stats.pendingInvites}
            </p>
          </div>
        </Card>

        <Card className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Super Admins
            </p>
            <p className="text-xl font-extrabold text-red-600">
              {stats.superAdmins}
            </p>
          </div>
        </Card>
      </div>

      {/* ─── Inventory Toolbar & Filters ─── */}
      <Card className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-9 pl-9 text-xs border-slate-200 rounded-lg text-[#17233C] placeholder:text-slate-400 focus-visible:ring-[#FF4D00]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D00] cursor-pointer"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D00] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive / Disabled</option>
            </select>

            <select
              value={loginFilter}
              onChange={(e) => setLoginFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#FF4D00] cursor-pointer"
            >
              <option value="all">All Login Times</option>
              <option value="recent">Logged In Recently</option>
              <option value="never">Never Logged In</option>
            </select>

            {(search ||
              roleFilter !== "all" ||
              statusFilter !== "all" ||
              loginFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </Button>
            )}
          </div>

          {/* View Toggle & Result Count */}
          <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <span className="text-xs font-bold text-slate-400">
              Showing {filteredUsers.length} staff member
              {filteredUsers.length !== 1 ? "s" : ""}
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md text-slate-600 transition-all ${
                  viewMode === "list"
                    ? "bg-white text-[#FF4D00] shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md text-slate-600 transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-[#FF4D00] shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── DESKTOP DATA TABLE (`hidden md:block`) ─── */}
        {viewMode === "list" ? (
          <div className="hidden md:block overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Primary Role</th>
                  <th className="px-4 py-3">Custom Permissions</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400 font-semibold"
                    >
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const customPermsCount =
                      user.customPermissions?.length || 0;
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                user.role === "superadmin"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-[#FF4D00]/10 text-[#FF4D00]"
                              }`}
                            >
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  className="w-full h-full rounded-full object-cover"
                                  alt={user.name}
                                />
                              ) : (
                                (user.name || "U").substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-[#17233C] font-bold text-xs">
                              {user.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-500 font-medium">
                          {user.email}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            className={`${getRoleColor(user.role)} font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border`}
                          >
                            {user.role}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Sliders className="w-3 h-3 text-slate-400" />
                            {customPermsCount > 0
                              ? `${customPermsCount} Custom`
                              : "Role Default"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold text-[9px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600 block" />{" "}
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold text-[9px] uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 block" />{" "}
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "Never Logged In"}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPermissionDrawer(user)}
                              className="h-8 px-2.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-[#FF4D00]/5 hover:text-[#FF4D00] hover:border-[#FF4D00]/30 rounded-lg flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Manage
                              Access
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-800 rounded-lg"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50"
                              >
                                <DropdownMenuItem
                                  onClick={() => openPermissionDrawer(user)}
                                  className="text-xs font-semibold py-1.5 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-500" />{" "}
                                  Edit Role & Access
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setResetOpen(true);
                                  }}
                                  className="text-xs font-semibold py-1.5 cursor-pointer"
                                >
                                  <Key className="w-3.5 h-3.5 mr-2 text-slate-500" />{" "}
                                  Reset Password
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 border-slate-100" />

                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(user.id)}
                                  className="text-xs font-semibold py-1.5 cursor-pointer"
                                >
                                  {user.isActive ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5 mr-2 text-amber-600" />{" "}
                                      Disable Account
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5 mr-2 text-green-600" />{" "}
                                      Enable Account
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 border-slate-100" />

                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirmUser(user)}
                                  className="text-xs font-semibold py-1.5 cursor-pointer text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />{" "}
                                  Permanently Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* ─── MOBILE CARDS / GRID VIEW (`block md:hidden` or Grid Toggle) ─── */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${viewMode === "list" ? "md:hidden" : ""}`}
        >
          {filteredUsers.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-xl border border-slate-200">
              No staff profiles found.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const customPermsCount = user.customPermissions?.length || 0;
              return (
                <div
                  key={user.id}
                  className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-xs space-y-3.5"
                >
                  {/* Top Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          user.role === "superadmin"
                            ? "bg-red-100 text-red-700"
                            : "bg-[#FF4D00]/10 text-[#FF4D00]"
                        }`}
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            className="w-full h-full rounded-full object-cover"
                            alt={user.name}
                          />
                        ) : (
                          (user.name || "U").substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-[#17233C] truncate">
                          {user.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-800 rounded-lg shrink-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50"
                      >
                        <DropdownMenuItem
                          onClick={() => openPermissionDrawer(user)}
                          className="text-xs font-semibold py-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-500" />{" "}
                          Edit Role & Access
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setResetOpen(true);
                          }}
                          className="text-xs font-semibold py-1.5 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5 mr-2 text-slate-500" />{" "}
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 border-slate-100" />
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user.id)}
                          className="text-xs font-semibold py-1.5 cursor-pointer"
                        >
                          {user.isActive ? "Disable Account" : "Enable Account"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 border-slate-100" />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirmUser(user)}
                          className="text-xs font-semibold py-1.5 cursor-pointer text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />{" "}
                          Permanently Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges Grid */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <Badge
                      className={`${getRoleColor(user.role)} font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border`}
                    >
                      {user.role}
                    </Badge>

                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold text-[9px] uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 block" />{" "}
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold text-[9px] uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 block" />{" "}
                        Inactive
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      <Sliders className="w-3 h-3 text-slate-400" />
                      {customPermsCount > 0
                        ? `${customPermsCount} Custom Perms`
                        : "Role Default"}
                    </span>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Last login:</span>
                    <span className="font-semibold text-slate-600">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => openPermissionDrawer(user)}
                      className="w-full h-8 text-xs font-semibold text-[#FF4D00] border-[#FF4D00]/30 bg-[#FF4D00]/5/50 hover:bg-[#FF4D00]/10/50 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Manage Access
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ─── MANAGE ACCESS DRAWER (`Sheet` - Slide-over Desktop, Fullscreen Mobile) ─── */}
      <Sheet open={permOpen} onOpenChange={setPermOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <SheetTitle className="text-lg font-extrabold text-[#17233C] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF4D00]" />
              Manage Access & Permissions
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500 font-medium mt-1">
              Configure primary role and custom module-level access for{" "}
              <strong className="text-slate-800">{permUser?.name}</strong> (
              {permUser?.email}).
            </SheetDescription>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Primary Role Selector */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <Label className="text-xs font-extrabold text-[#17233C] uppercase tracking-wider block">
                Primary System Role
              </Label>
              <select
                value={permRole}
                onChange={(e) =>
                  handleRoleChangeInDrawer(e.target.value as AdminRole)
                }
                className="h-10 w-full rounded-lg border border-slate-300 text-xs font-bold text-slate-800 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00] cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.desc}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                Changing primary role resets pre-ticked permissions to role
                defaults.
              </p>
            </div>

            {/* Module Permission Groups */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Module-Level Custom Permissions
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {selectedCustomPerms.length} selected
                </span>
              </div>

              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.permissions.map((p) => p.key);
                const allGroupChecked = groupKeys.every((k) =>
                  selectedCustomPerms.includes(k),
                );
                const isCollapsed = collapsedGroups[group.name];

                return (
                  <div
                    key={group.name}
                    className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Group Header */}
                    <div className="bg-slate-50/80 p-3.5 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allGroupChecked}
                          onCheckedChange={(checked) =>
                            toggleGroupPermissions(groupKeys, !!checked)
                          }
                          id={`group-${group.name}`}
                        />
                        <label
                          htmlFor={`group-${group.name}`}
                          className="text-xs font-bold text-[#17233C] cursor-pointer"
                        >
                          {group.name}
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedGroups((prev) => ({
                            ...prev,
                            [group.name]: !prev[group.name],
                          }))
                        }
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Group Items */}
                    {!isCollapsed && (
                      <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                        {group.permissions.map((item) => {
                          const isChecked = selectedCustomPerms.includes(
                            item.key,
                          );
                          const isRoleDefault = (
                            ROLE_PERMISSIONS[permRole] || []
                          ).includes(item.key);

                          return (
                            <div
                              key={item.key}
                              onClick={() => toggleSinglePermission(item.key)}
                              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                                isChecked
                                  ? "border-[#FF4D00]/40 bg-[#FF4D00]/5/40 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => {}}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {isRoleDefault && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                  Default
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPermOpen(false)}
              className="h-8 px-4 text-xs font-semibold border-slate-200 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePermissions}
              disabled={isSavingPerms}
              className="h-9 px-5 bg-[#FF4D00] hover:bg-[#EA580C] text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5"
            >
              {isSavingPerms ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Access Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── CREATE USER DIALOG ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#17233C]">
              Create New Staff User
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provision account credentials and assign a primary system role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Full Name
              </Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="rahul@youthcamping.online"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Temporary Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Primary Role
              </Label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="h-9 w-full rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 px-3 bg-white focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.desc})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="h-8 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="h-8 bg-[#FF4D00] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                {isCreating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Create Staff Profile"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── RESET PASSWORD DIALOG ─── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm p-6 bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#17233C]">
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter a new password for{" "}
              <strong className="text-slate-800">{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                New Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(false)}
                className="h-8 text-xs font-semibold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isResetting}
                className="h-8 bg-[#FF4D00] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                {isResetting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── PERMANENT DELETE DIALOG ─── */}
      <Dialog
        open={!!deleteConfirmUser}
        onOpenChange={(open) => !open && setDeleteConfirmUser(null)}
      >
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-1">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-extrabold text-[#17233C]">
              Permanently Delete Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete the profile for{" "}
              <strong className="text-slate-800">
                {deleteConfirmUser?.name}
              </strong>{" "}
              ({deleteConfirmUser?.email})? This action is permanent and cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmUser(null)}
              disabled={isDeleting}
              className="h-8 text-xs font-semibold rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

