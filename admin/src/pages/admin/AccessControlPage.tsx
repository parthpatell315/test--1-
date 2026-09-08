import { Shield, Check, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

const PERMISSION_LABELS: Record<string, string> = {
  "dashboard.view": "View Dashboard",
  "trips.view": "View Trips",
  "trips.create": "Create Trips",
  "trips.edit": "Edit Trips",
  "trips.publish": "Publish Trips",
  "trips.archive": "Archive Trips",
  "trips.delete": "Permanently Delete Trips",
  "bookings.view": "View Bookings",
  "bookings.create": "Create Bookings",
  "bookings.edit": "Edit Bookings",
  "bookings.approve": "Approve Bookings",
  "bookings.reject": "Reject Bookings",
  "payments.view": "View Payments",
  "payments.edit": "Edit Payments",
  "inquiries.view": "View Inquiries",
  "inquiries.create": "Create Inquiries",
  "inquiries.edit": "Edit Inquiries",
  "quotations.view": "View Quotations",
  "quotations.create": "Create Quotations",
  "quotations.edit": "Edit Quotations",
  "customers.view": "View Customer Data",
  "customers.export": "Export Customers",
  "pagebuilder.view": "View PageBuilder",
  "pagebuilder.edit": "Edit PageBuilder",
  "seo.view": "View SEO Metadata",
  "seo.edit": "Edit SEO Metadata",
  "guides.view": "View Guides Roster",
  "guides.manage": "Manage Guides",
  "operations.view": "View Operations",
  "operations.edit": "Edit Operations Fields",
  "reports.view": "View Finance Reports",
  "reports.export": "Export Reports",
  "users.view": "View Admin Users",
  "users.manage": "Manage Admin Users",
  "roles.manage": "Manage System Roles",
  "audit.view": "View Audit Trails",
  "settings.view": "View Settings",
  "settings.edit": "Edit Settings",
};

const ROLES = [
  "superadmin",
  "admin",
  "sales",
  "operations",
  "finance",
  "guide",
  "viewer",
] as const;

export default function AccessControlPage() {
  return (
    <div className="admin-page animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Access Control Matrix
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              System-wide role permissions and module restrictions mapping
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1">
            Security Enforcement Active
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Only a Super Admin can change access permissions. All modifications
            to roles, permissions, or system credentials are fully logged in the
            Audit Trail and require JWT token invalidation on target accounts.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-[#E2E8F0]">
              <TableRow>
                <TableHead className="font-bold uppercase tracking-wider text-[9px] text-slate-400 py-3 pl-6">
                  Module Permission
                </TableHead>
                {ROLES.map((role) => (
                  <TableHead
                    key={role}
                    className="font-bold uppercase tracking-wider text-[9px] text-slate-400 text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Shield
                        className={`w-3.5 h-3.5 ${role === "superadmin" ? "text-red-600" : "text-primary-orange"}`}
                      />
                      <span>{role}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(PERMISSION_LABELS).map(
                ([permissionKey, label]) => (
                  <TableRow
                    key={permissionKey}
                    className="hover:bg-slate-50/50 transition-colors border-b border-[#E2E8F0]"
                  >
                    <TableCell className="font-bold text-xs py-3 pl-6 text-slate-700">
                      <div className="flex flex-col">
                        <span>{label}</span>
                        <span className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">
                          {permissionKey}
                        </span>
                      </div>
                    </TableCell>
                    {ROLES.map((role) => {
                      const hasPerm =
                        role === "superadmin" ||
                        ROLE_PERMISSIONS[role]?.includes(permissionKey);
                      return (
                        <TableCell key={role} className="text-center py-3">
                          <div className="flex justify-center">
                            {hasPerm ? (
                              <div className="w-5 h-5 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

