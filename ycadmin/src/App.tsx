import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DynamicThemeProvider } from "@/components/admin/DynamicThemeProvider";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

const LoadingUI = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#FF4D00]" />
      <p className="text-xs font-semibold text-slate-500">
        Loading YouthCamping OS...
      </p>
    </div>
  </div>
);

// ── Core Pages ──
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const LoginPage = lazy(() => import("./pages/admin/LoginPage.tsx"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage.tsx"));
const UnauthorizedPage = lazy(
  () => import("./pages/admin/UnauthorizedPage.tsx"),
);
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage.tsx"));

// ── Sales ──
const InquiriesPage = lazy(() => import("./pages/admin/InquiriesPage.tsx"));
const InquiryFormPage = lazy(() => import("./pages/admin/InquiryFormPage.tsx"));
const BookingsPage = lazy(() => import("./pages/admin/BookingsPage.tsx"));
const BookingLinksPage = lazy(
  () => import("./pages/admin/BookingLinksPage.tsx"),
);
const QuotationsPage = lazy(() => import("./pages/admin/QuotationsPage.tsx"));
const QuotationFormPage = lazy(
  () => import("./pages/admin/QuotationFormPage.tsx"),
);

const CustomerProfilePage = lazy(
  () => import("./pages/admin/CustomerProfilePage.tsx"),
);

// ── Operations ──
const OperationsHubPage = lazy(
  () => import("./pages/admin/OperationsHubPage.tsx"),
);
const DepartureHubPage = lazy(
  () => import("./pages/admin/DepartureHubPage.tsx"),
);
const SopLibraryPage = lazy(
  () => import("./pages/admin/SopLibraryPage.tsx"),
);
const SopBuilderPage = lazy(
  () => import("./pages/admin/SopBuilderPage.tsx"),
);
const DailyTaskConsolePage = lazy(
  () => import("./pages/admin/DailyTaskConsolePage.tsx"),
);
const GlobalBookingTasksPage = lazy(
  () => import("./pages/admin/GlobalBookingTasksPage.tsx"),
);
const VendorDirectoryPage = lazy(
  () => import("./pages/admin/VendorDirectoryPage.tsx"),
);
const VendorLedgerPage = lazy(
  () => import("./pages/admin/VendorLedgerPage.tsx"),
);
const CompanyDocumentsPage = lazy(
  () => import("./pages/admin/CompanyDocumentsPage.tsx"),
);

// ── Approval Center ──
const ApprovalsHubPage = lazy(
  () => import("./pages/admin/ApprovalsHubPage.tsx"),
);

// ── Finance ──
const AccountingPage = lazy(() => import("./pages/admin/AccountingPage.tsx"));

// ── Travel Desk ──
const TravelDeskPage = lazy(() => import("./pages/admin/TravelDeskPage.tsx"));

// ── Business: Trips, Master Database, Website CMS ──
const TripsPage = lazy(() => import("./pages/admin/TripsPage.tsx"));
const MasterDatabasePage = lazy(
  () => import("./pages/admin/MasterDatabasePage.tsx"),
);
const WebsiteControlCenterPage = lazy(
  () => import("./pages/admin/WebsiteControlCenterPage.tsx"),
);
const WebsiteEditorPage = lazy(
  () => import("./pages/admin/WebsiteEditorPage.tsx"),
);
const PagesPage = lazy(() => import("./pages/admin/PagesPage.tsx"));
const PageEditorPage = lazy(() => import("./pages/admin/PageEditorPage.tsx"));
const PageBuilderPage = lazy(() => import("./pages/admin/PageBuilderPage.tsx"));
const PreviewPage = lazy(() => import("./pages/admin/PreviewPage.tsx"));
const SeoCenterPage = lazy(() => import("./pages/admin/SeoCenterPage.tsx"));
const FooterManagementPage = lazy(
  () => import("./pages/admin/FooterManagementPage.tsx"),
);
const BlogsPage = lazy(() => import("./pages/admin/BlogsPage.tsx"));
const ReviewsPage = lazy(() => import("./pages/admin/ReviewsPage.tsx"));
const AttractionsPage = lazy(() => import("./pages/admin/AttractionsPage.tsx"));
const MediaPage = lazy(() => import("./pages/admin/MediaPage.tsx"));
const QuestionsPage = lazy(() => import("./pages/admin/QuestionsPage.tsx"));

// ── Administration ──
const UserManagementPage = lazy(
  () => import("./pages/admin/UserManagementPage.tsx"),
);
const AccessControlPage = lazy(
  () => import("./pages/admin/AccessControlPage.tsx"),
);
const RolesPage = lazy(() => import("./pages/admin/RolesPage.tsx"));
const PermissionMatrixPage = lazy(
  () => import("./pages/admin/PermissionMatrixPage.tsx"),
);
const EmailTemplatesPage = lazy(
  () => import("./pages/admin/EmailTemplatesPage.tsx"),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
      gcTime: 300000, // 5 minutes
    },
  },
});

import { isFounder } from "@/config/permissions.config";

function LegacyStaffUserRedirect() {
  const { id } = useParams();
  return (
    <Navigate to={id ? `/admin/staff-profiles/${id}` : "/admin/staff-profiles"} replace />
  );
}

function AdminRoute({
  children,
  requiredPermission,
  founderOnly,
}: {
  children: React.ReactNode;
  requiredPermission?: string;
  founderOnly?: boolean;
}) {
  const { admin, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingUI />;
  }

  if (!isAuthenticated || !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  const isFounderUser = isFounder(admin);

  if (founderOnly && !isFounderUser) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  const customPerms = Array.isArray(admin.customPermissions)
    ? admin.customPermissions
    : [];
  const tokenPerms = Array.isArray(admin.permissions) ? admin.permissions : [];
  const combinedPerms = Array.from(new Set([...tokenPerms, ...customPerms]));

  if (
    requiredPermission &&
    !hasPermission(combinedPerms, requiredPermission, admin.role)
  ) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return (
    <AdminLayout>
      <Suspense fallback={<LoadingUI />}>{children}</Suspense>
    </AdminLayout>
  );
}

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  useEffect(() => {
    checkAuth();
  }, []);
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <DynamicThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_relativeSplatPath: true,
              v7_startTransition: true,
            }}
          >
            <AuthInitializer>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<LoadingUI />}>
                      <LoginPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/admin/login"
                  element={
                    <Suspense fallback={<LoadingUI />}>
                      <LoginPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/"
                  element={
                    <AdminRoute requiredPermission="dashboard.view">
                      <DashboardPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute requiredPermission="dashboard.view">
                      <DashboardPage />
                    </AdminRoute>
                  }
                />

                {/* Profile & Personal Settings */}
                <Route
                  path="/admin/profile"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/my-profile"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/change-password"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/security"
                  element={
                    <AdminRoute>
                      <SettingsPage />
                    </AdminRoute>
                  }
                />

                {/* Sales */}
                <Route
                  path="/admin/inquiries"
                  element={
                    <AdminRoute requiredPermission="inquiries.view">
                      <InquiriesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/inquiry-form"
                  element={
                    <AdminRoute requiredPermission="inquiries.view">
                      <InquiryFormPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/bookings"
                  element={
                    <AdminRoute requiredPermission="bookings.view">
                      <BookingsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/booking-forms"
                  element={
                    <AdminRoute requiredPermission="bookings.view">
                      <BookingLinksPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/quotations"
                  element={
                    <AdminRoute requiredPermission="quotations.view">
                      <QuotationsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/quotations/:id"
                  element={
                    <AdminRoute requiredPermission="quotations.view">
                      <QuotationFormPage />
                    </AdminRoute>
                  }
                />

                <Route
                  path="/admin/customers/:id"
                  element={
                    <AdminRoute requiredPermission="customers.timeline.view">
                      <CustomerProfilePage />
                    </AdminRoute>
                  }
                />

                {/* Operations */}
                <Route
                  path="/admin/departures"
                  element={<Navigate to="/admin/operations" replace />}
                />
                <Route
                  path="/admin/dashboard"
                  element={<Navigate to="/admin" replace />}
                />
                <Route
                  path="/admin/staff-directory"
                  element={<Navigate to="/admin/staff-profiles" replace />}
                />
                <Route
                  path="/admin/approval-center/incoming"
                  element={
                    <Navigate
                      to="/admin/approvals-hub?tab=payment-approvals"
                      replace
                    />
                  }
                />
                <Route
                  path="/admin/approval-center/*"
                  element={
                    <Navigate
                      to="/admin/approvals-hub?tab=payment-approvals"
                      replace
                    />
                  }
                />
                <Route
                  path="/admin/travel-desk/train-tickets"
                  element={<Navigate to="/admin/travel-desk" replace />}
                />
                <Route
                  path="/admin/settings/users/:id"
                  element={<LegacyStaffUserRedirect />}
                />
                <Route
                  path="/admin/bookings/:id"
                  element={<Navigate to="/admin/bookings" replace />}
                />
                <Route
                  path="/admin/inquiries/:id"
                  element={<Navigate to="/admin/inquiries" replace />}
                />
                <Route
                  path="/admin/trips/:id"
                  element={<Navigate to="/admin/trips" replace />}
                />
                <Route
                  path="/admin/vendors/:id"
                  element={<Navigate to="/admin/vendors" replace />}
                />
                <Route
                  path="/admin/company-documents/:id"
                  element={<Navigate to="/admin/company-documents" replace />}
                />
                <Route
                  path="/admin/operations"
                  element={
                    <AdminRoute requiredPermission="ops.view">
                      <OperationsHubPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/departure-workspace"
                  element={
                    <AdminRoute requiredPermission="ops.view">
                      <DepartureHubPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/operations/sops"
                  element={
                    <AdminRoute requiredPermission="ops.view">
                      <SopLibraryPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/operations/sops/builder"
                  element={
                    <AdminRoute requiredPermission="ops.view">
                      <SopBuilderPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/operations/daily-tasks"
                  element={
                    <AdminRoute requiredPermission="ops.view">
                      <DailyTaskConsolePage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/tasks"
                  element={
                    <AdminRoute requiredPermission="bookings.view">
                      <GlobalBookingTasksPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/operations/booking-tasks"
                  element={
                    <AdminRoute requiredPermission="bookings.view">
                      <GlobalBookingTasksPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/vendors"
                  element={
                    <AdminRoute requiredPermission="vendors.view">
                      <VendorDirectoryPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/vendors/ledger"
                  element={
                    <AdminRoute requiredPermission="vendors.view">
                      <VendorLedgerPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/vendor-directory"
                  element={
                    <AdminRoute requiredPermission="vendors.view">
                      <VendorDirectoryPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/company-documents"
                  element={
                    <AdminRoute requiredPermission="company_documents.view">
                      <CompanyDocumentsPage />
                    </AdminRoute>
                  }
                />

                {/* Approval Center */}
                <Route
                  path="/admin/verification-queue"
                  element={<Navigate to="/admin/approvals-hub?tab=payment-approvals" replace />}
                />
                <Route
                  path="/admin/approvals-hub"
                  element={
                    <AdminRoute requiredPermission="accounting.view">
                      <ApprovalsHubPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/ticket-approvals"
                  element={<Navigate to="/admin/approvals-hub?tab=payment-approvals" replace />}
                />

                {/* Unified Finance Control Hub */}
                <Route
                  path="/admin/finance"
                  element={
                    <AdminRoute requiredPermission="accounting.view">
                      <AccountingPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/accounting"
                  element={
                    <AdminRoute requiredPermission="accounting.view">
                      <AccountingPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/finance-control-center"
                  element={<Navigate to="/admin/finance" replace />}
                />
                <Route
                  path="/admin/finance-verification"
                  element={
                    <Navigate to="/admin/approvals-hub?tab=payment-approvals" replace />
                  }
                />

                {/* Travel Desk */}
                <Route
                  path="/admin/travel-desk"
                  element={
                    <AdminRoute>
                      <TravelDeskPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/train-templates"
                  element={<Navigate to="/admin/bookings" replace />}
                />

                {/* Business: Trips, Master Database, Website CMS */}
                <Route
                  path="/admin/trips"
                  element={
                    <AdminRoute requiredPermission="trips.view">
                      <TripsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/master-database"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <MasterDatabasePage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/website"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <WebsiteControlCenterPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/website/editor/:slug"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <WebsiteEditorPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/pages"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <PagesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/pages/:id"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <PageEditorPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/page-builder"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <PageBuilderPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/preview"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <PreviewPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/seo"
                  element={
                    <AdminRoute requiredPermission="seo.view">
                      <SeoCenterPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/footer-management"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <FooterManagementPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/blogs"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <BlogsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/reviews"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <ReviewsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/attractions"
                  element={
                    <AdminRoute requiredPermission="trips.view">
                      <AttractionsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/media"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <MediaPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/questions"
                  element={
                    <AdminRoute requiredPermission="settings.view">
                      <QuestionsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/theme"
                  element={<Navigate to="/admin/website" replace />}
                />
                <Route
                  path="/admin/design"
                  element={<Navigate to="/admin/website" replace />}
                />

                {/* Administration */}
                <Route
                  path="/admin/staff-profiles"
                  element={
                    <AdminRoute
                      founderOnly
                      requiredPermission="staff_profiles.view"
                    >
                      <UserManagementPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/staff-profiles/:staffId"
                  element={
                    <AdminRoute
                      founderOnly
                      requiredPermission="staff_profiles.view"
                    >
                      <UserManagementPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/people/staff"
                  element={
                    <AdminRoute
                      founderOnly
                      requiredPermission="staff_profiles.view"
                    >
                      <UserManagementPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={<Navigate to="/admin/staff-profiles" replace />}
                />
                <Route
                  path="/admin/roles-permissions"
                  element={
                    <AdminRoute
                      founderOnly
                      requiredPermission="roles_permissions.manage"
                    >
                      <AccessControlPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/roles"
                  element={
                    <AdminRoute requiredPermission="users.permissions">
                      <RolesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/permission-matrix"
                  element={
                    <AdminRoute requiredPermission="users.permissions">
                      <PermissionMatrixPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/access-control/roles"
                  element={
                    <AdminRoute requiredPermission="users.permissions">
                      <RolesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/access-control/matrix"
                  element={
                    <AdminRoute requiredPermission="users.permissions">
                      <PermissionMatrixPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/access-control"
                  element={<Navigate to="/admin/roles" replace />}
                />
                <Route
                  path="/admin/email-templates"
                  element={
                    <AdminRoute requiredPermission="emails.manage_templates">
                      <EmailTemplatesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/unauthorized"
                  element={
                    <AdminRoute>
                      <UnauthorizedPage />
                    </AdminRoute>
                  }
                />

                <Route
                  path="*"
                  element={
                    <Suspense fallback={<LoadingUI />}>
                      <NotFound />
                    </Suspense>
                  }
                />
              </Routes>
            </AuthInitializer>
          </BrowserRouter>
        </TooltipProvider>
      </DynamicThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
