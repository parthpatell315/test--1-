import React, { useEffect, useState } from "react";
import { rbacService, Role, Permission } from "@/services/rbac.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Copy,
  Trash2,
  Edit3,
  Lock,
  Users,
  Key,
  Search,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<
    Record<string, Permission[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRolesAndPermissions = async () => {
    try {
      setIsLoading(true);
      const [rolesData, permData] = await Promise.all([
        rbacService.getRoles(false, search),
        rbacService.getPermissions(),
      ]);
      setRoles(rolesData);
      setGroupedPermissions(permData.grouped);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load roles and permissions",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [search]);

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissionIds([]);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles are immutable and cannot be modified");
      return;
    }
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissionIds(role.permissions.map((p) => p.id));
    setIsEditorOpen(true);
  };

  const handleCloneRole = async (role: Role) => {
    try {
      const cloned = await rbacService.cloneRole(
        role.id,
        `${role.name} (Copy)`,
      );
      toast.success(`Role cloned as "${cloned.name}"`);
      fetchRolesAndPermissions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to clone role");
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted");
      return;
    }
    if (role.assignedUsersCount > 0) {
      toast.error(
        `Cannot delete role: Assigned to ${role.assignedUsersCount} active staff member(s). Reassign staff first.`,
      );
      return;
    }
    if (!confirm(`Are you sure you want to delete custom role "${role.name}"?`))
      return;

    try {
      await rbacService.deleteRole(role.id);
      toast.success(`Role "${role.name}" deleted successfully`);
      fetchRolesAndPermissions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete role");
    }
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingRole) {
        await rbacService.updateRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissionIds: selectedPermissionIds,
        });
        toast.success(`Role "${roleName}" updated successfully`);
      } else {
        await rbacService.createRole({
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissionIds: selectedPermissionIds,
        });
        toast.success(`Custom role "${roleName}" created successfully`);
      }
      setIsEditorOpen(false);
      fetchRolesAndPermissions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId],
    );
  };

  const toggleModulePermissions = (modulePerms: Permission[]) => {
    const moduleIds = modulePerms.map((p) => p.id);
    const allSelected = moduleIds.every((id) =>
      selectedPermissionIds.includes(id),
    );

    if (allSelected) {
      setSelectedPermissionIds((prev) =>
        prev.filter((id) => !moduleIds.includes(id)),
      );
    } else {
      setSelectedPermissionIds((prev) =>
        Array.from(new Set([...prev, ...moduleIds])),
      );
    }
  };

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  return (
    <div className="admin-page">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#152238] bg-[#0B1528] p-4 text-white sm:p-6 md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Enterprise Roles & Permissions
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Configure system roles, custom role definitions, and granular
            module-level permission assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchRolesAndPermissions}
            variant="outline"
            className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button
            onClick={handleOpenCreateModal}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Custom Role
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search roles by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Tabs for System vs Custom Roles */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="all">All Roles ({roles.length})</TabsTrigger>
          <TabsTrigger value="custom">
            Custom Roles ({customRoles.length})
          </TabsTrigger>
          <TabsTrigger value="system">
            System Roles ({systemRoles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Custom Roles Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" /> Custom Roles
              (Editable)
            </h2>
            {customRoles.length === 0 ? (
              <Card className="border-dashed border-slate-300 p-8 text-center bg-slate-50">
                <p className="text-slate-500 text-sm mb-3">
                  No custom roles created yet.
                </p>
                <Button
                  onClick={handleOpenCreateModal}
                  variant="outline"
                  className="text-amber-600 border-amber-300"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Your First Custom
                  Role
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={() => handleOpenEditModal(role)}
                    onClone={() => handleCloneRole(role)}
                    onDelete={() => handleDeleteRole(role)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* System Roles Section */}
          <div className="pt-4">
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-500" /> Immutable System Roles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onClone={() => handleCloneRole(role)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={() => handleOpenEditModal(role)}
                onClone={() => handleCloneRole(role)}
                onDelete={() => handleDeleteRole(role)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onClone={() => handleCloneRole(role)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Editor Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
              {editingRole
                ? `Edit Custom Role: ${editingRole.name}`
                : "Create New Custom Role"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define the role name, description, and module permissions matrix.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-5 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Role Name *
                </Label>
                <Input
                  placeholder="e.g. Sales Team Lead"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Description
                </Label>
                <Input
                  placeholder="Role responsibilities and scope..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Permission Matrix Checkboxes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  Module Permissions Matrix
                </h3>
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">
                  {selectedPermissionIds.length} permissions selected
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(
                  ([moduleName, modulePerms]) => {
                    const allSelected = modulePerms.every((p) =>
                      selectedPermissionIds.includes(p.id),
                    );
                    const selectedCount = modulePerms.filter((p) =>
                      selectedPermissionIds.includes(p.id),
                    ).length;

                    return (
                      <div
                        key={moduleName}
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() =>
                                toggleModulePermissions(modulePerms)
                              }
                            />
                            <span className="font-bold text-sm text-slate-800">
                              {moduleName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">
                            {selectedCount} / {modulePerms.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                          {modulePerms.map((perm) => {
                            const isChecked = selectedPermissionIds.includes(
                              perm.id,
                            );
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? "bg-amber-50/80 border-amber-300 text-slate-900"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    togglePermission(perm.id)
                                  }
                                  className="mt-0.5"
                                />
                                <div className="space-y-0.5">
                                  <span className="font-semibold block leading-tight">
                                    {perm.name}
                                  </span>
                                  {perm.description && (
                                    <span className="text-[10px] text-slate-500 block leading-normal line-clamp-1">
                                      {perm.description}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
            >
              {isSubmitting
                ? "Saving..."
                : editingRole
                  ? "Update Role"
                  : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Role Card Component
function RoleCard({
  role,
  onEdit,
  onClone,
  onDelete,
}: {
  role: Role;
  onEdit?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="border border-slate-200 hover:border-slate-300 transition-all shadow-sm hover:shadow-md bg-white">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">
                {role.name}
              </CardTitle>
              {role.isSystem ? (
                <Badge
                  variant="secondary"
                  className="bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200"
                >
                  <Lock className="w-3 h-3 mr-1 text-slate-500" /> System
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                  Custom
                </Badge>
              )}
            </div>
            {role.description && (
              <CardDescription className="text-xs text-slate-500 line-clamp-2">
                {role.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                className="h-7 w-7 text-slate-600 hover:text-amber-600"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            )}
            {onClone && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onClone}
                className="h-7 w-7 text-slate-600 hover:text-blue-600"
                title="Clone Role"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                className="h-7 w-7 text-slate-600 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>
              <strong>{role.permissionsCount}</strong> Permissions
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>
              <strong>{role.assignedUsersCount}</strong> Staff Members
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
