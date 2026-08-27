import { useEffect, useState, useCallback, useMemo } from "react";
import { quotationsService } from "@/services/quotations.service";
import { DataTable } from "@/components/admin/DataTable";
import { DashCard } from "@/modules/dashboard.chrome";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Calendar,
  Copy,
  Clock,
  RefreshCw,
  Eye,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ENV } from "@/config/environment";
import { cn } from "@/lib/utils";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quotationsService.getAll({
        page,
        limit: pageSize,
        search,
      });
      const currentTotalPages = res.pagination?.totalPages || 0;

      if (currentTotalPages > 0 && page > currentTotalPages) {
        setPage(1);
        return;
      }

      setQuotations(Array.isArray(res.data) ? res.data : []);
      setTotalCount(res.pagination?.totalCount || 0);
      setTotalPages(currentTotalPages);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load quotations");
      setQuotations([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, search]);

  const metrics = useMemo(() => {
    const total = totalCount || quotations.length;
    const published = quotations.filter((q) => q.status === "Published").length;
    const expired = quotations.filter(
      (q) => q.expiresAt && new Date() > new Date(q.expiresAt),
    ).length;
    const totalVal = quotations.reduce(
      (acc, q) => acc + (Number(q.finalPrice) || 0),
      0,
    );
    const avgValue = total > 0 ? Math.round(totalVal / total) : 0;
    return { total, published, expired, totalVal, avgValue };
  }, [quotations, totalCount]);

  const filteredQuotations = useMemo(() => {
    if (statusFilter === "published") {
      return quotations.filter((q) => q.status === "Published");
    }
    if (statusFilter === "draft") {
      return quotations.filter((q) => q.status !== "Published");
    }
    if (statusFilter === "expired") {
      return quotations.filter(
        (q) => q.expiresAt && new Date() > new Date(q.expiresAt),
      );
    }
    return quotations;
  }, [quotations, statusFilter]);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await quotationsService.remove(id);
      toast.success("Quotation deleted");
      load();
    } catch (err) {
      toast.error("Failed to delete quotation");
    }
  };

  const handleExtend = async (id: string) => {
    try {
      await quotationsService.extend(id, 48);
      toast.success("Validity extended by 48 hours");
      load();
    } catch (err) {
      toast.error("Failed to extend validity");
    }
  };

  const getPublicQuoteUrl = (q: any) => {
    let baseUrl = ENV.FRONTEND_URL;
    if (
      typeof window !== "undefined" &&
      window.location.hostname.includes("localhost")
    ) {
      baseUrl = "http://localhost:3000";
    }
    const target = q.slug || q.id;
    const isDraft = q.status?.toLowerCase() === "draft";
    const tokenPart = isDraft && q.shareToken ? `?token=${q.shareToken}` : "";
    return `${baseUrl}/quote/${target}${tokenPart}`;
  };

  const handleCopy = (q: any) => {
    const url = getPublicQuoteUrl(q);
    navigator.clipboard.writeText(url);
    toast.success("Public quote link copied to clipboard!");
  };

  const statusTabs = [
    { id: "all", label: "All", count: metrics.total },
    { id: "published", label: "Published", count: metrics.published },
    {
      id: "draft",
      label: "Drafts",
      count: Math.max(metrics.total - metrics.published, 0),
    },
    { id: "expired", label: "Expired", count: metrics.expired },
  ];

  const columns = [
    {
      key: "customerName",
      header: "Client",
      render: (q: any) => {
        const nameStr = q.customerName || "Untitled client";
        const firstLetter = nameStr.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2.5 min-w-[180px]">
            <div className="h-7 w-7 rounded-md bg-[#F4F7FB] border border-[#E8EEF4] text-[#0B1528] text-[11px] font-semibold flex items-center justify-center shrink-0">
              {firstLetter}
            </div>
            <div className="min-w-0">
              <p
                className="font-semibold text-[#0B1528] text-[12px] leading-tight truncate hover:text-[#FF4D00] transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/quotations/${q.id}`)}
              >
                {nameStr}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 truncate">
                  <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                  {q.createdAt
                    ? new Date(q.createdAt).toLocaleDateString()
                    : "Recent"}
                </span>
                {q.phone && (
                  <span className="text-[11px] text-slate-400 font-mono truncate">
                    {q.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "destination",
      header: "Destination",
      render: (q: any) => (
        <span className="text-[12px] text-slate-600 whitespace-nowrap">
          {q.destination || "TBD"}
        </span>
      ),
    },
    {
      key: "price",
      header: "Value",
      render: (q: any) => (
        <div className="whitespace-nowrap">
          <span className="font-semibold text-[13px] text-[#0B1528] tabular-nums">
            ₹{Number(q.finalPrice || 0).toLocaleString("en-IN")}
          </span>
          {q.discount > 0 && (
            <span className="text-[11px] text-slate-400 font-medium block">
              Saved ₹{Number(q.discount).toLocaleString("en-IN")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      render: (q: any) => {
        if (!q.expiresAt) {
          return (
            <span className="text-[12px] font-medium text-slate-500">
              No expiry
            </span>
          );
        }
        const isExpired = new Date() > new Date(q.expiresAt);
        const isUrgent =
          !isExpired &&
          new Date(q.expiresAt).getTime() - new Date().getTime() <
            24 * 60 * 60 * 1000;

        if (isExpired) {
          return (
            <span className="text-[12px] font-medium text-red-600">
              Expired
            </span>
          );
        }
        if (isUrgent) {
          return (
            <span className="text-[12px] font-medium text-amber-700">
              Urgent (24h)
            </span>
          );
        }
        return (
          <span className="text-[12px] font-medium text-slate-600">Active</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (q: any) => {
        const published = q.status === "Published";
        return (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
              published
                ? "bg-green-50/70 text-green-700 border-green-100"
                : "bg-[#F4F7FB] text-slate-600 border-[#E8EEF4]",
            )}
          >
            {published ? "Published" : "Draft"}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-px",
      render: (q: any) => (
        <div className="flex items-center gap-0.5 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCopy(q)}
            title="Copy public link"
            className="h-7 w-7 text-slate-400 hover:text-[#0B1528] hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              window.open(getPublicQuoteUrl(q), "_blank");
            }}
            title="Preview proposal"
            className="h-7 w-7 text-slate-400 hover:text-[#0B1528] hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExtend(q.id)}
            title="Extend validity (+48h)"
            className="h-7 w-7 text-slate-400 hover:text-[#0B1528] hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/quotations/${q.id}`)}
            title="Edit proposal"
            className="h-7 w-7 text-slate-400 hover:text-[#0B1528] hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(q.id)}
            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
            title="Delete quote"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const kpiStats = [
    {
      label: "Total proposals",
      value: String(metrics.total),
      tone: "text-[#0B1528]",
    },
    {
      label: "Published",
      value: String(metrics.published),
      tone: "text-[#0B1528]",
    },
    {
      label: "Pipeline value",
      value: `₹${metrics.totalVal.toLocaleString("en-IN")}`,
      tone: "text-[#FF4D00]",
    },
    {
      label: "Avg quote",
      value: `₹${metrics.avgValue.toLocaleString("en-IN")}`,
      tone: "text-[#0B1528]",
    },
  ];

  return (
    <div className="space-y-4 pb-12 min-w-0 text-[#0B1528]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between min-w-0">
        <p className="text-[12px] text-slate-500 leading-snug min-w-0">
          Create and track client quotes
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
            className="h-8 w-8 px-0 rounded-md border-[#E8EEF4] bg-white text-slate-500 hover:text-[#0B1528] hover:bg-white shadow-none"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", loading && "animate-spin")}
            />
          </Button>
          <Button
            onClick={() => navigate("/admin/quotations/new")}
            className="h-8 px-3.5 rounded-md text-[12px] font-semibold bg-[#FF4D00] hover:bg-[#E04400] text-white gap-1.5 shadow-none"
          >
            <Plus className="h-3.5 w-3.5" />
            Create proposal
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#E8EEF4] rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {kpiStats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "px-3 py-2.5 md:px-4 md:py-3 min-w-0",
                i % 2 === 0 && "border-r border-[#E8EEF4]",
                i < 2 && "border-b border-[#E8EEF4] lg:border-b-0",
                (i === 1 || i === 2) && "lg:border-r lg:border-[#E8EEF4]",
              )}
            >
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {stat.label}
              </p>
              <p
                className={cn(
                  "text-lg md:text-xl font-semibold leading-tight mt-0.5 tabular-nums tracking-tight",
                  stat.tone,
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <DashCard className="h-auto">
        <div className="px-3 py-2 border-b border-[#E8EEF4] bg-[#F8FAFC] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="overflow-x-auto flex-nowrap flex items-center gap-0.5 min-w-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0",
                  statusFilter === tab.id
                    ? "bg-white text-[#0B1528] border border-[#E8EEF4]"
                    : "text-slate-500 hover:text-[#0B1528] border border-transparent",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    statusFilter === tab.id
                      ? "text-[#FF4D00]"
                      : "text-slate-400",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search client or destination..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 bg-white border border-[#E8EEF4] rounded-md text-[12px] outline-none text-[#0B1528] focus:ring-1 focus:ring-[#FF4D00]/30 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-w-0 [&_.admin-card]:border-0 [&_.admin-card]:rounded-none [&_.admin-card]:shadow-none">
          <DataTable
            columns={columns}
            data={filteredQuotations}
            loading={loading}
            emptyMessage="No quotations generated yet"
            emptyIcon={<FileText className="h-10 w-10 text-slate-300" />}
            serverSide={true}
            totalCount={totalCount}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </DashCard>
    </div>
  );
}

