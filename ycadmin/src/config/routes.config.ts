import { PermissionKey } from "./permissions.config";

export type NavigationGroup =
  | "Dashboard"
  | "Sales"
  | "Operations"
  | "Approval Center"
  | "Finance"
  | "Travel Desk"
  | "People"
  | "Business"
  | "Marketing"
  | "Administration";

export interface AdminRouteMetadata {
  id: string;
  label: string;
  path: string;
  permission?: PermissionKey;
  authenticatedOnly?: boolean;
  founderOnly?: boolean;
  navigation?: {
    visible: boolean;
    group: NavigationGroup;
    iconName: string;
    isNew?: boolean;
  };
  breadcrumbLabel: string;
}

export const ADMIN_ROUTES: AdminRouteMetadata[] = [
  // Dashboard & Personal Profile
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/admin",
    permission: "dashboard.view",
    navigation: { visible: true, group: "Dashboard", iconName: "BarChart3" },
    breadcrumbLabel: "Dashboard",
  },
  {
    id: "profile",
    label: "My Profile",
    path: "/admin/profile",
    authenticatedOnly: true,
    breadcrumbLabel: "My Profile",
  },
  {
    id: "my-profile",
    label: "My Profile",
    path: "/admin/my-profile",
    authenticatedOnly: true,
    breadcrumbLabel: "My Profile",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/admin/settings",
    authenticatedOnly: true,
    breadcrumbLabel: "Settings",
  },
  {
    id: "change-password",
    label: "Change Password",
    path: "/admin/change-password",
    authenticatedOnly: true,
    breadcrumbLabel: "Change Password",
  },
  {
    id: "security",
    label: "Security & Password",
    path: "/admin/security",
    authenticatedOnly: true,
    breadcrumbLabel: "Security",
  },

  // Sales Module
  {
    id: "inquiries",
    label: "Inquiries",
    path: "/admin/inquiries",
    permission: "inquiries.view",
    navigation: { visible: false, group: "Sales", iconName: "MessageSquare" },
    breadcrumbLabel: "Sales / Inquiries",
  },
  {
    id: "quotations",
    label: "Quotations",
    path: "/admin/quotations",
    permission: "quotations.view",
    navigation: { visible: true, group: "Sales", iconName: "FileText" },
    breadcrumbLabel: "Sales / Quotations",
  },
  {
    id: "quotation-detail",
    label: "Quotation Form",
    path: "/admin/quotations/:id",
    permission: "quotations.view",
    breadcrumbLabel: "Sales / Quotation Detail",
  },
  {
    id: "booking-forms",
    label: "Booking Links",
    path: "/admin/booking-forms",
    permission: "bookings.view",
    navigation: {
      visible: true,
      group: "Sales",
      iconName: "Link2",
      isNew: true,
    },
    breadcrumbLabel: "Sales / Booking Links",
  },
  {
    id: "bookings",
    label: "Bookings",
    path: "/admin/bookings",
    permission: "bookings.view",
    navigation: { visible: true, group: "Sales", iconName: "CalendarCheck" },
    breadcrumbLabel: "Sales / Bookings",
  },

  // Operations Module
  {
    id: "operations",
    label: "Departures Hub (Roster)",
    path: "/admin/operations",
    permission: "ops.view",
    navigation: { visible: true, group: "Operations", iconName: "Compass" },
    breadcrumbLabel: "Operations / Departures Hub",
  },
  {
    id: "departure-workspace",
    label: "Departure Workspace (360°)",
    path: "/admin/departure-workspace",
    permission: "ops.view",
    breadcrumbLabel: "Operations / Departure Workspace",
  },
  {
    id: "vendors",
    label: "Vendors",
    path: "/admin/vendors",
    permission: "vendors.view",
    navigation: { visible: true, group: "Operations", iconName: "Building2" },
    breadcrumbLabel: "Operations / Vendors",
  },
  {
    id: "vendor-directory",
    label: "Vendor Directory",
    path: "/admin/vendor-directory",
    permission: "vendors.view",
    breadcrumbLabel: "Operations / Vendor Directory",
  },
  {
    id: "company-documents-ops",
    label: "Company Documents",
    path: "/admin/company-documents",
    permission: "company_documents.view",
    navigation: { visible: true, group: "Operations", iconName: "FileText" },
    breadcrumbLabel: "Operations / Documents",
  },

  // Finance — approvals (money in/out/refunds)
  {
    id: "approvals-hub",
    label: "Approvals",
    path: "/admin/approvals-hub",
    permission: "accounting.view",
    navigation: {
      visible: false,
      group: "Finance",
      iconName: "ClipboardCheck",
    },
    breadcrumbLabel: "Finance / Approvals",
  },

  // Finance — ledger & treasury
  {
    id: "accounting",
    label: "Finance Overview",
    path: "/admin/finance",
    permission: "accounting.view",
    navigation: { visible: false, group: "Finance", iconName: "Banknote" },
    breadcrumbLabel: "Finance / Ledger",
  },

  // Travel Desk
  {
    id: "travel-desk",
    label: "Travel Desk",
    path: "/admin/travel-desk",
    authenticatedOnly: true,
    navigation: { visible: false, group: "Travel Desk", iconName: "Plane" },
    breadcrumbLabel: "Travel Desk",
  },

  // Business Module
  {
    id: "trips",
    label: "Trips / Products",
    path: "/admin/trips",
    permission: "trips.view",
    navigation: { visible: true, group: "Business", iconName: "Compass" },
    breadcrumbLabel: "Business / Trips & Products",
  },
  {
    id: "master-database",
    label: "Master Database",
    path: "/admin/master-database",
    permission: "settings.view",
    navigation: { visible: true, group: "Business", iconName: "Building2" },
    breadcrumbLabel: "Business / Master Database",
  },
  {
    id: "website",
    label: "Website Control",
    path: "/admin/website",
    permission: "settings.view",
    navigation: { visible: true, group: "Business", iconName: "Globe" },
    breadcrumbLabel: "Business / Website Control",
  },
  {
    id: "page-builder",
    label: "Page Builder",
    path: "/admin/page-builder",
    permission: "settings.view",
    navigation: { visible: true, group: "Business", iconName: "Layout" },
    breadcrumbLabel: "Business / Page Builder",
  },
  {
    id: "pages",
    label: "Website Pages",
    path: "/admin/pages",
    permission: "settings.view",
    navigation: { visible: false, group: "Business", iconName: "FileText" },
    breadcrumbLabel: "Business / Website Pages",
  },

  // Marketing Module
  {
    id: "blogs",
    label: "Blogs",
    path: "/admin/blogs",
    permission: "settings.view",
    navigation: { visible: true, group: "Marketing", iconName: "FileText" },
    breadcrumbLabel: "Marketing / Blogs",
  },
  {
    id: "reviews",
    label: "Reviews & Socials",
    path: "/admin/reviews",
    permission: "marketing.social",
    navigation: { visible: true, group: "Marketing", iconName: "Star" },
    breadcrumbLabel: "Marketing / Reviews",
  },

  // Founder Only Administration Module
  {
    id: "staff-profiles",
    label: "Staff Profiles",
    path: "/admin/staff-profiles",
    founderOnly: true,
    permission: "staff_profiles.view",
    navigation: { visible: true, group: "Administration", iconName: "Users" },
    breadcrumbLabel: "Administration / Staff Profiles",
  },
  {
    id: "staff-profiles-alt",
    label: "Manage Staff Profiles",
    path: "/admin/people/staff",
    founderOnly: true,
    permission: "staff_profiles.view",
    breadcrumbLabel: "Administration / Staff Profiles",
  },
  {
    id: "staff-profile-detail",
    label: "Staff Profile Detail",
    path: "/admin/staff-profiles/:staffId",
    founderOnly: true,
    permission: "staff_profiles.view",
    breadcrumbLabel: "Administration / Staff Detail",
  },
  {
    id: "roles-permissions",
    label: "Roles & Permissions",
    path: "/admin/roles-permissions",
    founderOnly: true,
    permission: "roles_permissions.manage",
    navigation: {
      visible: true,
      group: "Administration",
      iconName: "ShieldCheck",
    },
    breadcrumbLabel: "Administration / Roles & Permissions",
  },
  {
    id: "email-templates",
    label: "Email Templates",
    path: "/admin/email-templates",
    permission: "emails.manage_templates",
    navigation: { visible: true, group: "Administration", iconName: "Mail" },
    breadcrumbLabel: "Administration / Email Templates",
  },
];
