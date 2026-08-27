import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T;
  filters?: {
    key: string;
    label: string;
    options: { label: string; value: string }[];
  }[];
  onFilterChange?: (key: string, value: string) => void;
  pageSize?: number;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowKey?: keyof T;
  serverSide?: boolean;
  totalCount?: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSearchChange?: (search: string) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data = [],
  loading,
  searchPlaceholder = "Search records...",
  searchKey,
  filters,
  onFilterChange,
  pageSize = 10,
  emptyMessage = "No records found",
  emptyIcon,
  rowKey = "id" as keyof T,
  serverSide = false,
  totalCount = 0,
  page = 1,
  totalPages = 0,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState("");
  const [localPage, setLocalPage] = useState(0);

  const activePage = serverSide ? page : localPage;
  const activePageSize = pageSize;

  const filtered = useMemo(() => {
    return serverSide
      ? data
      : (data || []).filter((item) => {
          if (!searchKey || !localSearch) return true;
          const value = item[searchKey];
          return String(value || "")
            .toLowerCase()
            .includes(localSearch.toLowerCase());
        });
  }, [serverSide, data, searchKey, localSearch]);

  const computedTotalPages = serverSide
    ? totalPages
    : Math.ceil(filtered.length / activePageSize);

  const paged = useMemo(() => {
    return serverSide
      ? data
      : filtered.slice(
          activePage * activePageSize,
          (activePage + 1) * activePageSize,
        );
  }, [serverSide, data, filtered, activePage, activePageSize]);

  const totalItemsCount = serverSide ? totalCount : filtered.length;

  const handlePageChange = (newPage: number) => {
    if (serverSide) {
      onPageChange?.(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (!serverSide) {
      setLocalPage(0);
    }
  };

  // Reusable optional server-side debounce
  useEffect(() => {
    if (!serverSide) return;
    const handler = setTimeout(() => {
      onSearchChange?.(localSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch, serverSide, onSearchChange]);

  const renderCellValue = (item: T, col: Column<T>) => {
    if (col.render) return col.render(item);
    const value = item[col.key];
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const showToolbar = Boolean(searchKey) || Boolean(filters?.length);

  return (
    <div className={cn("min-w-0", showToolbar ? "space-y-4 sm:space-y-6" : "space-y-3")}>
      {showToolbar && (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
          {searchKey && (
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-11 h-10 rounded-xl bg-white border-slate-200 focus-visible:ring-primary font-normal text-sm"
              />
            </div>
          )}
          {filters?.map((f) => (
            <Select
              key={f.key}
              defaultValue="all"
              onValueChange={(v) => onFilterChange?.(f.key, v)}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-white border-slate-200 font-medium text-xs text-slate-600">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all" className="font-medium text-xs">
                  All {f.label}
                </SelectItem>
                {f.options.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    className="font-medium text-xs"
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      <div className="admin-card !p-0 overflow-hidden">
        <div className="responsive-table" tabIndex={0} aria-label="Scrollable data table">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold tracking-tight text-slate-500 sm:px-5 sm:py-4",
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-3 sm:px-5 sm:py-4">
                        <div className="h-4 bg-slate-50 animate-pulse rounded-lg w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                        {emptyIcon || <Search className="w-6 h-6" />}
                      </div>
                      <p className="text-xs font-medium text-slate-400 italic">
                        {emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((item, i) => (
                  <tr
                    key={String(item[rowKey] || i)}
                    className="hover:bg-[#F8FAFC] transition-all group"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-3 text-sm font-normal text-slate-600 sm:px-5 sm:py-4",
                          col.className,
                        )}
                      >
                        {renderCellValue(item, col)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(serverSide ? totalItemsCount > 0 : computedTotalPages > 1) && (
        <div className="flex flex-col items-start justify-between gap-3 px-1 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-2 sm:py-4">
          <p className="text-xs font-normal text-slate-500">
            Showing{" "}
            {serverSide
              ? totalItemsCount === 0
                ? 0
                : (activePage - 1) * activePageSize + 1
              : filtered.length === 0
                ? 0
                : activePage * activePageSize + 1}
            â€“
            {serverSide
              ? Math.min(activePage * activePageSize, totalItemsCount)
              : Math.min(
                  (activePage + 1) * activePageSize,
                  filtered.length,
                )}{" "}
            of {totalItemsCount}
          </p>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
            {serverSide && onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Rows per page:
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => onPageSizeChange(Number(val))}
                >
                  <SelectTrigger className="w-[70px] h-9 rounded-xl bg-white border-slate-200 font-medium text-xs text-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="25" className="font-medium text-xs">
                      25
                    </SelectItem>
                    <SelectItem value="50" className="font-medium text-xs">
                      50
                    </SelectItem>
                    <SelectItem value="100" className="font-medium text-xs">
                      100
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(activePage - 1)}
                disabled={serverSide ? activePage <= 1 : activePage === 0}
                className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(activePage + 1)}
                disabled={
                  serverSide
                    ? activePage >= computedTotalPages
                    : activePage >= computedTotalPages - 1
                }
                className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
