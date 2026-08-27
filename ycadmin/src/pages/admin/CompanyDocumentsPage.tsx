import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Trash2,
  Calendar,
  HardDrive,
  AlertTriangle,
  ChevronRight,
  File,
  MoreVertical,
  Activity,
  ArrowUpRight,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import { erpService, CompanyDocument } from "@/services/erp.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const DEFAULT_DOCUMENTS: CompanyDocument[] = [
  {
    id: "doc1",
    name: "YouthCamping GST Registration Certificate",
    category: "GST",
    identifier: "24AAAAA0000A1Z5",
    type: "PDF",
    uploadedBy: "Hemal Patel",
    uploadedDate: "10 Jan 2026",
    expiryDate: "31 Dec 2028",
    status: "Active",
    size: "2.4 MB",
  },
  {
    id: "doc2",
    name: "Gujarat Tourism Operator License",
    category: "License",
    identifier: "GTO-2026-881",
    type: "PDF",
    uploadedBy: "Hemal Patel",
    uploadedDate: "15 Jan 2026",
    expiryDate: "31 Dec 2027",
    status: "Active",
    size: "1.8 MB",
  },
  {
    id: "doc3",
    name: "High Altitude Wilderness Safety Policy",
    category: "Policy",
    identifier: "POL-HA-04",
    type: "PDF",
    uploadedBy: "Parth Patel",
    uploadedDate: "01 Feb 2026",
    expiryDate: "31 Dec 2026",
    status: "Active",
    size: "3.1 MB",
  },
  {
    id: "doc4",
    name: "Commercial Tempo Traveler Permit",
    category: "Vehicle",
    identifier: "GJ-01-TT-9988",
    type: "PDF",
    uploadedBy: "Suresh Kumar",
    uploadedDate: "20 Mar 2026",
    expiryDate: "15 Oct 2026",
    status: "Active",
    size: "1.2 MB",
  },
  {
    id: "doc5",
    name: "Himalayan Vendor Master MoU Agreement",
    category: "Vendor",
    identifier: "MOU-HM-2026",
    type: "PDF",
    uploadedBy: "Hemal Patel",
    uploadedDate: "05 Apr 2026",
    expiryDate: "31 Dec 2026",
    status: "Active",
    size: "4.5 MB",
  },
];

export default function CompanyDocumentsPage() {
  const [documents, setDocuments] =
    useState<CompanyDocument[]>(DEFAULT_DOCUMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "my" | "shared" | "expiring" | "expired"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Upload modal states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIdentifier, setNewIdentifier] = useState("");
  const [newCategory, setNewCategory] = useState("GST");
  const [newType, setNewType] = useState("PDF");
  const [newExpiry, setNewExpiry] = useState("");
  const [newSize, setNewSize] = useState("1.8 MB");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await erpService.getCompanyDocuments();
      if (Array.isArray(data) && data.length > 0) {
        setDocuments(data);
      }
    } catch (error) {
      console.warn("Company documents API fallback active.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Document Name is required");
      return;
    }
    try {
      const added = await erpService.createCompanyDocument({
        name: newName,
        identifier: newIdentifier,
        category: newCategory,
        type: newType,
        expiryDate: newExpiry || "—",
        size: newSize,
      });
      setDocuments((prev) => [added, ...prev]);
      setUploadOpen(false);
      setNewName("");
      setNewIdentifier("");
      setNewExpiry("");
      toast.success("Document uploaded successfully!");
    } catch (err) {
      toast.error("Failed to upload document");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this document? This action is tracked in the system audit logs.",
      )
    )
      return;
    try {
      await erpService.deleteCompanyDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  // Filter Logic
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.identifier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || doc.category === selectedCategory;

    // Tab logic
    if (activeTab === "expiring") {
      return (
        matchesSearch &&
        matchesCategory &&
        doc.expiryDate !== "—" &&
        new Date(doc.expiryDate) <
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
    }
    if (activeTab === "expired") {
      return (
        matchesSearch &&
        matchesCategory &&
        doc.expiryDate !== "—" &&
        new Date(doc.expiryDate) < new Date()
      );
    }
    return matchesSearch && matchesCategory;
  });

  // Calculate sizes and categories for right sidebar
  const totalSizeUsed = 3.42; // GB
  const storagePercent = (totalSizeUsed / 20) * 100;

  const categoryCounts = documents.reduce(
    (acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const recentActivity = [
    { text: "Hemal Patel uploaded GST Certificate", time: "10 mins ago" },
    { text: "Suresh Chaudhary renewed Vendor Agreement", time: "2 hours ago" },
    { text: "Zeel Panchal downloaded PAN Card", time: "1 day ago" },
  ];

  const expiringList = documents.filter(
    (doc) =>
      doc.expiryDate !== "—" &&
      new Date(doc.expiryDate) <
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="admin-page animate-fade-in">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Company Documents
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Official compliance files, legal licenses, and internal guidelines
              database
            </p>
          </div>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-[#FF4D00] hover:bg-[#EA580C] text-white rounded-[4px] h-9 px-4 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      <div className="space-y-4">
        {/* Main List Section */}
        <div className="space-y-4">
          {/* Tabs and Filters Row */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded border border-slate-100 w-full md:w-auto overflow-x-auto">
              {(["all", "my", "shared", "expiring", "expired"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded transition-all whitespace-nowrap capitalize ${
                      activeTab === tab
                        ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab === "all"
                      ? "All Documents"
                      : tab === "my"
                        ? "My Documents"
                        : tab === "shared"
                          ? "Shared with Me"
                          : tab === "expiring"
                            ? "Expiring Soon"
                            : "Expired"}
                  </button>
                ),
              )}
            </div>

            {/* Inputs & Filters */}
            <div className="flex items-center gap-3.5 w-full md:w-auto shrink-0">
              <div className="relative w-full md:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name/ID..."
                  className="rounded-[4px] pl-8 border-[#E2E8F0] h-8.5 text-xs font-semibold placeholder:text-slate-400 focus-visible:ring-[#FF4D00]"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8.5 rounded-[4px] border border-[#E2E8F0] text-xs font-semibold text-slate-650 bg-white px-2.5 focus-visible:ring-[#FF4D00]"
              >
                <option value="All">All Categories</option>
                <option value="GST">GST</option>
                <option value="PAN">PAN</option>
                <option value="Trade License">Trade License</option>
                <option value="MSME">MSME</option>
                <option value="Insurance">Insurance</option>
                <option value="Office Agreement">Office Agreement</option>
                <option value="Vendor Agreements">Vendor Agreements</option>
                <option value="Employee Documents">Employee Documents</option>
                <option value="Brand Assets">Brand Assets</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-[#E2E8F0]">
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3 pl-6">
                      Document Name
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3">
                      Category
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3">
                      Identifier / No.
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3">
                      Uploaded By
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3">
                      Upload Date
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3">
                      Expiry Date
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3">
                      Status
                    </th>
                    <th className="font-extrabold uppercase tracking-wider text-[9px] text-slate-400 py-3 pr-6 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          Loading Files Ledger...
                        </span>
                      </td>
                    </tr>
                  ) : filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3.5 pl-6 font-bold text-xs text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[#FF4D00]/5 border border-[#FF4D00]/20 rounded flex items-center justify-center">
                              <File className="w-3.5 h-3.5 text-[#FF4D00]" />
                            </div>
                            <div className="flex flex-col">
                              <span>{doc.name}</span>
                              <span className="text-[9px] text-slate-450 font-semibold uppercase">
                                {doc.type} • {doc.size}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-xs font-semibold text-slate-600">
                          {doc.category}
                        </td>
                        <td className="py-3.5 text-xs font-mono text-slate-600">
                          {doc.identifier}
                        </td>
                        <td className="py-3.5 text-xs font-semibold text-slate-700">
                          {doc.uploadedBy}
                        </td>
                        <td className="py-3.5 text-[11px] font-semibold text-slate-500">
                          {doc.uploadedDate || doc.uploadDate || "—"}
                        </td>
                        <td className="py-3.5 text-[11px] font-bold text-slate-700">
                          {doc.expiryDate !== "—" ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {doc.expiryDate}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3.5">
                          <Badge
                            className={`${
                              doc.expiryDate !== "—" &&
                              new Date(doc.expiryDate) < new Date()
                                ? "bg-red-100 text-red-700 border-red-200"
                                : doc.expiryDate !== "—" &&
                                    new Date(doc.expiryDate) <
                                      new Date(
                                        Date.now() + 30 * 24 * 60 * 60 * 1000,
                                      )
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-green-100 text-green-700 border-green-200"
                            } px-2 py-0.5 font-bold uppercase text-[8px] tracking-wider rounded-[4px] border shadow-none`}
                          >
                            {doc.expiryDate !== "—" &&
                            new Date(doc.expiryDate) < new Date()
                              ? "Expired"
                              : doc.expiryDate !== "—" &&
                                  new Date(doc.expiryDate) <
                                    new Date(
                                      Date.now() + 30 * 24 * 60 * 60 * 1000,
                                    )
                                ? "Expiring Soon"
                                : "Active"}
                          </Badge>
                        </td>
                        <td className="py-3.5 pr-6 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                toast.info(`Downloading file ${doc.name}...`)
                              }
                              className="w-7.5 h-7.5 rounded-[4px] hover:bg-slate-100 border border-slate-100"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-650" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(doc.id)}
                              className="w-7.5 h-7.5 rounded-[4px] hover:bg-red-50 border border-slate-100 hover:border-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-xs text-slate-400 font-semibold"
                      >
                        No company documents match current filter
                        configurations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Dialog Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[4px] border border-[#E2E8F0] p-5 bg-white shadow-xl">
          <DialogHeader className="border-b border-[#E2E8F0] pb-3">
            <DialogTitle className="font-bold uppercase tracking-tight text-sm flex items-center gap-2 text-slate-850">
              <FileText className="w-4 h-4 text-[#FF4D00]" /> Register Legal
              Document
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleUpload}
            className="space-y-4 py-4 text-xs font-semibold text-slate-700"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                Document Title *
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. MSME Registration Certificate"
                className="h-8.5 border-slate-200 focus-visible:ring-[#FF4D00]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                  Identifier / Reg. No.
                </label>
                <Input
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  placeholder="e.g. GSTIN12345"
                  className="h-8.5 border-slate-200 focus-visible:ring-[#FF4D00]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                  File Format
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full h-8.5 rounded-[4px] border border-slate-200 bg-white px-2 focus-visible:ring-[#FF4D00]"
                >
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="PNG">PNG</option>
                  <option value="JPEG">JPEG</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-8.5 rounded-[4px] border border-slate-200 bg-white px-2 focus-visible:ring-[#FF4D00]"
                >
                  <option value="GST">GST</option>
                  <option value="PAN">PAN</option>
                  <option value="Trade License">Trade License</option>
                  <option value="MSME">MSME</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Office Agreement">Office Agreement</option>
                  <option value="Vendor Agreements">Vendor Agreements</option>
                  <option value="Employee Documents">Employee Documents</option>
                  <option value="Brand Assets">Brand Assets</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                  Expiry Date (Optional)
                </label>
                <Input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="h-8.5 border-slate-200 focus-visible:ring-[#FF4D00]"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E2E8F0] gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                className="h-8.5 font-semibold text-xs border-slate-200 rounded-[4px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#FF4D00] hover:bg-[#EA580C] text-white h-8.5 font-semibold text-xs rounded-[4px] px-4"
              >
                Onboard Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

