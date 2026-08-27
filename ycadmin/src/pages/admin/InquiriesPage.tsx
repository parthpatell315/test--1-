import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { inquiriesService } from "@/services/inquiries.service";
import type { Inquiry } from "@/types";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  MoreHorizontal,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  TrendingUp,
  MapPin,
  FileText,
  User,
  Calendar,
  Tag,
  ArrowUpRight,
  Sparkles,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, safeFormatDate } from "@/lib/utils";
import { inquiryTabCount } from "@/utils/inquiryCounts";
import { useAuthStore } from "@/store/auth.store";
import EmailComposerDrawer from "@/components/admin/EmailComposerDrawer";
import EmailLogsTimeline from "@/components/admin/EmailLogsTimeline";
import { MobileCRMLeadsView } from "@/components/mobile/MobileCRMLeadsView";

const STATUS_TABS = [
  { key: "all", label: "All Inquiries" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "follow-up", label: "Follow-up" },
  { key: "interested", label: "Interested" },
  { key: "payment-pending", label: "Payment Pending" },
  { key: "converted", label: "Booked" },
  { key: "closed", label: "Lost" },
];

export default function InquiriesPage() {
  const navigate = useNavigate();
  const { admin } = useAuthStore();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  // Email Composer
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerInquiry, setComposerInquiry] = useState<Inquiry | null>(null);
  const [bulkComposerIds, setBulkComposerIds] = useState<string[]>([]);

  // Selection state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showFullMessage, setShowFullMessage] = useState(false);

  // Filter dropdowns
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const loadRequestRef = useRef(0);

  // Debounced search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery((prev) => {
        if (prev !== searchInput) {
          setPage(1);
          return searchInput;
        }
        return prev;
      });
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load inquiries from backend
  const load = useCallback(
    async (isInitial = false) => {
      const requestId = ++loadRequestRef.current;
      if (isInitial) setLoading(true);

      try {
        let apiStatus = activeTab;
        if (activeTab === "all") apiStatus = "all";
        if (activeTab === "follow-up") apiStatus = "contacted";
        if (activeTab === "interested") apiStatus = "contacted";
        if (activeTab === "payment-pending") apiStatus = "new";

        const res = await inquiriesService.getAll({
          status: apiStatus,
          search: searchQuery,
          page,
          limit: pageSize,
        });

        if (requestId !== loadRequestRef.current) return;
        const currentTotalPages = res.pagination?.totalPages || 0;

        if (currentTotalPages > 0 && page > currentTotalPages) {
          setPage(1);
          return;
        }

        const list = res.data || [];
        setLoadFailed(false);
        setInquiries(list);
        setTotalCount(res.pagination?.totalCount ?? list.length);
        setTotalPages(currentTotalPages || Math.ceil(list.length / pageSize) || 0);

        if (list.length > 0 && !selected) {
          setSelected(list[0]);
        }
      } catch (error) {
        if (requestId !== loadRequestRef.current) return;
        setLoadFailed(true);
        toast.error("Failed to load inquiries");
      } finally {
        if (requestId === loadRequestRef.current) setLoading(false);
      }
    },
    [activeTab, searchQuery, page, pageSize, selected],
  );

  useEffect(() => {
    load(true);
  }, [activeTab, searchQuery, page, pageSize]);

  // Status Counts for KPI cards
  const kpiMetrics = useMemo(() => {
    const counts = {
      new: 0,
      contacted: 0,
      followUp: 0,
      interested: 0,
      paymentPending: 0,
      booked: 0,
      lost: 0,
    };

    inquiries.forEach((inq) => {
      const st = (inq.status || "").toLowerCase();
      if (st === "new") counts.new++;
      else if (st === "contacted") counts.contacted++;
      else if (st === "converted") counts.booked++;
      else if (st === "closed") counts.lost++;
      else counts.contacted++;
    });

    return [
      {
        label: "New Leads",
        count: loadFailed ? null : counts.new,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        label: "Contacted",
        count: loadFailed ? null : counts.contacted,
        color: "text-[#FF6B00]",
        bg: "bg-[#FF4D00]/5",
      },
      {
        label: "Follow-up",
        count: loadFailed ? null : counts.followUp,
        color: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        label: "Interested",
        count: loadFailed ? null : counts.interested,
        color: "text-[#FF4D00]",
        bg: "bg-[#FF4D00]/5",
      },
      {
        label: "Payment Pending",
        count: loadFailed ? null : counts.paymentPending,
        color: "text-[#FF4D00]",
        bg: "bg-[#FF4D00]/5",
      },
      {
        label: "Booked",
        count: loadFailed ? null : counts.booked,
        color: "text-green-600",
        bg: "bg-green-50",
      },
      {
        label: "Lost",
        count: loadFailed ? null : counts.lost,
        color: "text-red-600",
        bg: "bg-red-50",
      },
    ];
  }, [inquiries, loadFailed]);

  // Tab count resolver
  const getTabCount = (key: string) =>
    inquiryTabCount({
      key,
      activeTab,
      totalCount,
      inquiries,
      loadFailed,
    });

  // Status updater
  const updateStatus = async (inq: Inquiry, status: string) => {
    try {
      await inquiriesService.update(inq.id, { status } as any);
      toast.success(`Inquiry status updated to ${status.toUpperCase()}`);
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === inq.id ? { ...item, status: status as any } : item,
        ),
      );
      if (selected?.id === inq.id) {
        setSelected({ ...selected, status: status as any });
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === inquiries.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(inquiries.map((i) => i.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleRowEmailClick = (inq: Inquiry) => {
    setComposerInquiry(inq);
    setBulkComposerIds([]);
    setIsComposerOpen(true);
  };

  const handleBulkEmailClick = () => {
    setComposerInquiry(null);
    setBulkComposerIds(selectedRows);
    setIsComposerOpen(true);
  };

  return (
    <div className="flex-1 flex min-h-0 md:overflow-hidden bg-[#F8FAFC] -mx-3 md:-mx-6 md:-my-6 font-sans text-slate-800">
      {/* ─── MOBILE VIEW (<768px) ─── */}
      <div className="block md:hidden w-full p-3">
        <MobileCRMLeadsView
          inquiries={inquiries}
          onSelectInquiry={(inq) => setSelected(inq)}
          onUpdateStatus={(id, status) => {
            const item = inquiries.find((i) => i.id === id);
            if (item) updateStatus(item, status);
          }}
        />
      </div>

      {/* ─── DESKTOP CRM WORKSPACE (>=768px) ─── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Main Inquiries Workspace */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4 no-scrollbar">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Inquiries &amp; Leads
                <span className="text-[10px] font-extrabold bg-[#FF4D00]/10 text-[#FF6B00] px-2 py-0.5 rounded-full border border-[#FF4D00]/30/60 uppercase tracking-wider">
                  Live CRM
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage, follow up, and convert tour inquiries into confirmed
                bookings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => load(true)}
                className="h-8 px-3 rounded-lg text-xs font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 shadow-2xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                Sync
              </Button>
              <Button
                onClick={() => navigate("/admin/booking-forms")}
                className="h-8 px-3.5 rounded-lg text-xs font-bold bg-[#FF6B00] hover:bg-[#e05e00] text-white shadow-2xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                New Inquiry Link
              </Button>
            </div>
          </div>

          {/* Minimal KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 flex-shrink-0">
            {kpiMetrics.map((kpi, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-1 flex flex-col justify-between hover:border-slate-300 transition-all cursor-default"
              >
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
                  {kpi.label}
                </span>
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    {kpi.count === null ? "—" : kpi.count}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider",
                      kpi.bg,
                      kpi.color,
                    )}
                  >
                    {kpi.count === null
                      ? "Unavailable"
                      : kpi.count > 0
                        ? "Active"
                        : "Zero"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Status Tabs Navigation Bar */}
          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200/80 p-1 shadow-2xs overflow-x-auto no-scrollbar flex-shrink-0">
            {STATUS_TABS.map((tab) => {
              const count = getTabCount(tab.key);
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer select-none",
                    isActive
                      ? "bg-[#FF6B00] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-extrabold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {count === null ? "—" : count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Bulk Action Bar */}
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedRows.length === inquiries.length &&
                  inquiries.length > 0
                }
                onChange={toggleSelectAll}
                className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer ml-1"
              />
              <span className="text-xs font-bold text-slate-500">
                {selectedRows.length} Selected
              </span>

              {selectedRows.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkEmailClick}
                  className="h-7 px-3 text-[11px] font-bold rounded-lg bg-[#FF4D00]/5 hover:bg-[#FF4D00]/10 text-[#C2410C] border border-[#FF4D00]/30 gap-1.5 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Selected ({selectedRows.length})
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, phone, email, trip..."
                  className="w-full pl-8 pr-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF6B00] bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Minimal SaaS Data Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Loading Inquiries...
                </span>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No Inquiries Found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  No lead records match your search or filter tab. Try clearing
                  your filters or creating a new inquiry link.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 h-9 select-none">
                      <th className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-8 text-center"></th>
                      <th className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Trip / Package
                      </th>
                      <th className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
                        Quick Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inquiries.map((inq) => {
                      const isSelected = selected?.id === inq.id;
                      const status = (inq.status || "new").toLowerCase();

                      const statusConfig: Record<
                        string,
                        { label: string; style: string }
                      > = {
                        new: {
                          label: "NEW",
                          style: "bg-blue-50 text-blue-700 border-blue-200",
                        },
                        contacted: {
                          label: "CONTACTED",
                          style: "bg-amber-50 text-amber-700 border-amber-200",
                        },
                        converted: {
                          label: "BOOKED",
                          style:
                            "bg-green-50 text-green-700 border-green-200",
                        },
                        closed: {
                          label: "LOST",
                          style: "bg-red-50 text-red-700 border-red-200",
                        },
                      };

                      const currentStatus = statusConfig[status] || {
                        label: status.toUpperCase(),
                        style: "bg-slate-50 text-slate-700 border-slate-200",
                      };

                      return (
                        <tr
                          key={inq.id}
                          onClick={() => setSelected(inq)}
                          className={cn(
                            "hover:bg-slate-50/80 transition-colors h-14 cursor-pointer text-xs group",
                            isSelected &&
                              "bg-[#FF4D00]/5/20 border-l-3 border-[#FF6B00]",
                          )}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(inq.id)}
                              onChange={() => toggleSelectRow(inq.id)}
                              className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                            />
                          </td>

                          {/* Customer Details */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                                {inq.name
                                  ? inq.name.charAt(0).toUpperCase()
                                  : "L"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate leading-tight group-hover:text-[#FF6B00] transition-colors">
                                  {inq.name || "Anonymous Lead"}
                                </p>
                                <p className="text-[11px] font-mono font-medium text-slate-500 truncate">
                                  {inq.phone || inq.email || "No contact info"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Trip / Package Title */}
                          <td className="px-3 py-2">
                            <div className="space-y-0.5">
                              <span className="inline-block text-[11px] font-bold text-slate-800 truncate max-w-[200px]">
                                {inq.tripTitle || "General Tour Inquiry"}
                              </span>
                              {inq.date && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Travel: {inq.date}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block",
                                currentStatus.style,
                              )}
                            >
                              {currentStatus.label}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-3 py-2 text-slate-500 font-medium text-xs whitespace-nowrap">
                            {safeFormatDate(inq.createdAt, {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>

                          {/* Actions */}
                          <td
                            className="px-3 py-2 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 justify-end">
                              {inq.phone && (
                                <a
                                  href={`tel:${inq.phone}`}
                                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                  title="Call Lead"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {inq.phone && (
                                <a
                                  href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-colors"
                                  title="WhatsApp Lead"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center outline-none">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-40 p-1 bg-white border border-slate-200 rounded-xl shadow-xl text-xs font-semibold"
                                >
                                  <DropdownMenuItem
                                    onClick={() => setSelected(inq)}
                                    className="cursor-pointer"
                                  >
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(inq, "contacted")
                                    }
                                    className="cursor-pointer text-amber-700"
                                  >
                                    Mark Contacted
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus(inq, "converted")
                                    }
                                    className="cursor-pointer text-green-700"
                                  >
                                    Mark Won (Booked)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateStatus(inq, "closed")}
                                    className="cursor-pointer text-red-700"
                                  >
                                    Mark Lost
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRowEmailClick(inq)}
                                    className="cursor-pointer text-[#C2410C]"
                                  >
                                    Send Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 text-xs font-medium text-slate-500">
                <span>
                  Showing {inquiries.length} of {totalCount} inquiries
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-7 w-7 rounded-lg border-slate-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-bold text-slate-800 px-2">
                    {page} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-7 w-7 rounded-lg border-slate-200"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Minimal Context Detail Panel (360px) */}
        {selected && (
          <InquiryDetailsDrawer
            selected={selected}
            setSelected={setSelected}
            showFullMessage={showFullMessage}
            setShowFullMessage={setShowFullMessage}
            updateStatus={updateStatus}
            admin={admin}
            onSendEmail={handleRowEmailClick}
          />
        )}
      </div>

      {/* Email Composer Drawer */}
      <EmailComposerDrawer
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setComposerInquiry(null);
          setBulkComposerIds([]);
        }}
        contextType="inquiry"
        contextId={composerInquiry?.id || ""}
        selectedIds={bulkComposerIds}
        recipientEmail={composerInquiry?.email || ""}
        recipientName={composerInquiry?.name || ""}
        onSent={() => {
          setSelectedRows([]);
          load();
        }}
      />
    </div>
  );
}

// ─── Minimal SaaS Inquiry Context Drawer ───
interface DrawerProps {
  selected: Inquiry;
  setSelected: (val: Inquiry | null) => void;
  showFullMessage: boolean;
  setShowFullMessage: (val: boolean) => void;
  updateStatus: (inq: Inquiry, stat: string) => void;
  admin: any;
  onSendEmail: (inq: Inquiry) => void;
}

function InquiryDetailsDrawer({
  selected,
  setSelected,
  showFullMessage,
  setShowFullMessage,
  updateStatus,
  admin,
  onSendEmail,
}: DrawerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Timeline" | "Customer" | "Notes"
  >("Overview");
  const [noteText, setNoteText] = useState(selected.adminNotes || "");

  useEffect(() => {
    setNoteText(selected.adminNotes || "");
  }, [selected]);

  const handleSaveNotes = async () => {
    try {
      await inquiriesService.update(selected.id, {
        adminNotes: noteText,
      } as any);
      toast.success("Notes saved successfully");
    } catch (err) {
      toast.error("Failed to save notes");
    }
  };

  return (
    <div className="w-full sm:w-[360px] bg-white border-l border-slate-200/80 flex flex-col h-full flex-shrink-0 font-sans shadow-xl lg:shadow-none z-40">
      {/* Header (48px) */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-bold text-slate-800">
            INQ-{selected.id.substring(0, 8).toUpperCase()}
          </span>
          <span
            className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
              selected.status === "converted"
                ? "bg-green-100 text-green-700"
                : selected.status === "closed"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700",
            )}
          >
            {selected.status}
          </span>
        </div>

        <button
          onClick={() => setSelected(null)}
          className="w-7 h-7 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white px-2 shrink-0">
        {(["Overview", "Timeline", "Customer", "Notes"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-[11px] font-bold text-center border-b-2 transition-all cursor-pointer",
                isActive
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-slate-400 hover:text-slate-700",
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Drawer Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === "Overview" && (
          <div className="space-y-4">
            {/* Customer Avatar Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-[#FF6B00] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                {selected.name ? selected.name.charAt(0).toUpperCase() : "L"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {selected.name || "Lead Customer"}
                </h3>
                <p className="text-xs font-mono text-slate-500 truncate mt-0.5">
                  {selected.phone || selected.email || "No contact details"}
                </p>
              </div>
            </div>

            {/* Tour & Inquiry Summary */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Inquiry Details
              </span>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-medium">
                    Requested Tour:
                  </span>
                  <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">
                    {selected.tripTitle || "General Package"}
                  </span>
                </div>
                {selected.date && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">
                      Travel Date:
                    </span>
                    <span className="font-bold text-[#FF6B00]">
                      {selected.date}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Received:</span>
                  <span className="font-bold text-slate-700">
                    {safeFormatDate(selected.createdAt, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Message */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Customer Message
              </span>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed italic">
                <p className={cn(!showFullMessage && "line-clamp-3")}>
                  "
                  {selected.message ||
                    "Hi, I am interested in booking this package. Please share details and pricing."}
                  "
                </p>
                {selected.message && selected.message.length > 100 && (
                  <button
                    onClick={() => setShowFullMessage(!showFullMessage)}
                    className="text-[10px] font-bold text-[#FF6B00] hover:underline mt-1 block"
                  >
                    {showFullMessage ? "Show less" : "Show full message"}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Quick Actions
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex flex-col items-center gap-1 transition-all"
                  >
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>Call</span>
                  </a>
                )}
                {selected.phone && (
                  <a
                    href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl border border-green-200 bg-green-50/50 hover:bg-green-100 text-green-700 flex flex-col items-center gap-1 transition-all"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
                <button
                  onClick={() => onSendEmail(selected)}
                  className="p-2.5 rounded-xl border border-[#FF4D00]/30 bg-[#FF4D00]/5/50 hover:bg-[#FF4D00]/10 text-[#C2410C] flex flex-col items-center gap-1 transition-all"
                >
                  <Mail className="w-4 h-4 text-[#FF4D00]" />
                  <span>Email</span>
                </button>
                <button
                  onClick={() => updateStatus(selected, "converted")}
                  className="p-2.5 rounded-xl border border-green-200 bg-green-600 text-white hover:bg-green-700 flex flex-col items-center gap-1 transition-all shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Won</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Timeline" && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Email &amp; Activity Log
            </span>
            <EmailLogsTimeline contextType="inquiry" contextId={selected.id} />
          </div>
        )}

        {activeTab === "Customer" && (
          <div className="space-y-3 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Customer Specs
            </span>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Name:</span>
                <span className="font-bold text-slate-800">
                  {selected.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="font-bold text-slate-800">
                  {selected.email || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Phone:</span>
                <span className="font-bold font-mono text-slate-800">
                  {selected.phone || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Notes" && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Admin Notes
            </span>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add internal notes about this lead..."
              className="w-full h-32 p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF6B00] bg-white text-slate-800"
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              className="w-full h-8 text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg"
            >
              Save Notes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

