import React, { useEffect, useState } from "react";
import { rbacService, PermissionMatrixRow } from "@/services/rbac.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Grid,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Lock,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

export default function PermissionMatrixPage() {
  const [matrixData, setMatrixData] = useState<{
    roles: Array<{ id: string; name: string; isSystem: boolean }>;
    matrix: PermissionMatrixRow[];
  }>({
    roles: [],
    matrix: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  const fetchMatrix = async () => {
    try {
      setIsLoading(true);
      const data = await rbacService.getPermissionMatrix();
      setMatrixData(data);

      // Default expand all modules
      const initialExpanded: Record<string, boolean> = {};
      data.matrix.forEach((item) => {
        initialExpanded[item.module] = true;
      });
      setExpandedModules(initialExpanded);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load permission matrix",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  // Group matrix by module
  const filteredRows = matrixData.matrix.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.action.toLowerCase().includes(search.toLowerCase()) ||
      row.module.toLowerCase().includes(search.toLowerCase()),
  );

  const groupedByModule = filteredRows.reduce(
    (acc, row) => {
      if (!acc[row.module]) acc[row.module] = [];
      acc[row.module].push(row);
      return acc;
    },
    {} as Record<string, PermissionMatrixRow[]>,
  );

  return (
    <div className="admin-page">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Grid className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Enterprise Permission Matrix
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Spreadsheet-style comparison matrix showing role permission
            assignments across every module.
          </p>
        </div>
        <Button
          onClick={fetchMatrix}
          variant="outline"
          className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Matrix
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search permissions by module, name, or key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Interactive Matrix Spreadsheet */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <Table className="border-collapse w-full text-xs">
            <TableHeader className="sticky top-0 z-20 bg-slate-900 text-white shadow-md">
              <TableRow className="border-b border-slate-800 hover:bg-slate-900">
                <TableHead className="w-[320px] text-slate-200 font-bold bg-slate-900 sticky left-0 z-30 shadow-r p-3">
                  MODULE / PERMISSION ACTION
                </TableHead>
                {matrixData.roles.map((role) => (
                  <TableHead
                    key={role.id}
                    className="text-center font-bold text-slate-100 min-w-[120px] p-3 border-l border-slate-800"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.entries(groupedByModule).map(
                ([moduleName, moduleRows]) => {
                  const isExpanded = expandedModules[moduleName] ?? true;

                  return (
                    <React.Fragment key={moduleName}>
                      {/* Module Header Row */}
                      <TableRow className="bg-slate-100/90 font-bold text-slate-800 hover:bg-slate-200/90 cursor-pointer transition-colors border-y border-slate-300">
                        <TableCell
                          colSpan={matrixData.roles.length + 1}
                          onClick={() => toggleModule(moduleName)}
                          className="p-3 sticky left-0 z-10 bg-slate-100"
                        >
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            )}
                            <span>
                              {moduleName} ({moduleRows.length})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Permission Rows */}
                      {isExpanded &&
                        moduleRows.map((permRow, idx) => (
                          <TableRow
                            key={permRow.permissionId}
                            className={`hover:bg-amber-50/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                          >
                            <TableCell className="font-medium p-3 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-r">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 block">
                                  {permRow.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  {permRow.action}
                                </span>
                              </div>
                            </TableCell>
                            {matrixData.roles.map((role) => {
                              const isGranted = permRow.roles[role.id] ?? false;
                              return (
                                <TableCell
                                  key={role.id}
                                  className="text-center p-3 border-l border-slate-200"
                                >
                                  {isGranted ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                },
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

