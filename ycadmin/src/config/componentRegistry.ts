import { lazy, LazyExoticComponent, ComponentType } from "react";

export const COMPONENT_REGISTRY: Record<
  string,
  LazyExoticComponent<ComponentType<any>>
> = {
  dashboard: lazy(() => import("../pages/admin/DashboardPage.tsx")),
  profile: lazy(() => import("../pages/admin/SettingsPage.tsx")),
  "my-profile": lazy(() => import("../pages/admin/SettingsPage.tsx")),
  settings: lazy(() => import("../pages/admin/SettingsPage.tsx")),
  "change-password": lazy(() => import("../pages/admin/SettingsPage.tsx")),
  security: lazy(() => import("../pages/admin/SettingsPage.tsx")),
  inquiries: lazy(() => import("../pages/admin/InquiriesPage.tsx")),

  quotations: lazy(() => import("../pages/admin/QuotationsPage.tsx")),
  "quotation-detail": lazy(
    () => import("../pages/admin/QuotationFormPage.tsx"),
  ),
  "booking-forms": lazy(() => import("../pages/admin/BookingLinksPage.tsx")),
  bookings: lazy(() => import("../pages/admin/BookingsPage.tsx")),
  operations: lazy(() => import("../pages/admin/OperationsHubPage.tsx")),
  "departure-workspace": lazy(
    () => import("../pages/admin/DepartureHubPage.tsx"),
  ),
  vendors: lazy(() => import("../pages/admin/VendorDirectoryPage.tsx")),
  "vendor-directory": lazy(
    () => import("../pages/admin/VendorDirectoryPage.tsx"),
  ),
  "company-documents-ops": lazy(
    () => import("../pages/admin/CompanyDocumentsPage.tsx"),
  ),
  "approvals-hub": lazy(() => import("../pages/admin/ApprovalsHubPage.tsx")),
  accounting: lazy(() => import("../pages/admin/AccountingPage.tsx")),
  "travel-desk": lazy(() => import("../pages/admin/TravelDeskPage.tsx")),
  trips: lazy(() => import("../pages/admin/TripsPage.tsx")),
  "master-database": lazy(
    () => import("../pages/admin/MasterDatabasePage.tsx"),
  ),
  website: lazy(() => import("../pages/admin/WebsiteControlCenterPage.tsx")),
  "page-builder": lazy(() => import("../pages/admin/PageBuilderPage.tsx")),
  pages: lazy(() => import("../pages/admin/PagesPage.tsx")),
  blogs: lazy(() => import("../pages/admin/BlogsPage.tsx")),
  reviews: lazy(() => import("../pages/admin/ReviewsPage.tsx")),
  "staff-profiles": lazy(() => import("../pages/admin/UserManagementPage.tsx")),
  "staff-profiles-alt": lazy(
    () => import("../pages/admin/UserManagementPage.tsx"),
  ),
  "staff-profile-detail": lazy(
    () => import("../pages/admin/UserManagementPage.tsx"),
  ),
  "roles-permissions": lazy(
    () => import("../pages/admin/AccessControlPage.tsx"),
  ),
  "email-templates": lazy(
    () => import("../pages/admin/EmailTemplatesPage.tsx"),
  ),
};
