import React, { useEffect, useMemo, useState } from "react";
import {
  Upload,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
  ShieldAlert,
  Eye,
  User,
  CreditCard,
  IdCard,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { opsService } from "@/services/ops.service";
import { bookingsService } from "@/services/bookings.service";
import { ENV } from "@/config/environment";
import { formatProofDisplayUrl } from "@/utils/paymentProof";

interface DepartureDocumentsProps {
  tripId: string;
  departureDateStr: string;
}

type IdentityDoc = {
  id: string;
  source: string;
  label: string;
  fileName: string;
  mimeType?: string | null;
  status?: string | null;
  url?: string | null;
  bookingId: string;
  passengerId: string;
};

type PaymentProof = {
  id: string;
  paymentId: string;
  url: string;
  fileName: string;
  amount?: number | null;
  paymentMode?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
};

type PassengerRow = {
  id: string;
  name: string;
  isLead: boolean;
  bookingDbId: string;
  bookingRef: string;
  identityDocs: IdentityDoc[];
  hasIdentityDoc: boolean;
  paymentProofs: PaymentProof[];
  hasPaymentProof: boolean;
};

function resolvePublicUrl(url: string | null | undefined): string {
  if (!url) return "";
  return formatProofDisplayUrl(url, ENV.API_BASE_URL);
}

export default function DepartureDocuments({
  tripId,
  departureDateStr,
}: DepartureDocumentsProps) {
  const [docs, setDocs] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [summary, setSummary] = useState<{
    totalPassengers: number;
    withIdentityDoc: number;
    missingIdentityDoc: number;
    withPaymentProof: number;
    missingPaymentProof: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState<"all" | "missing_id" | "missing_proof">("all");
  const [showOpsFiles, setShowOpsFiles] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docForm, setDocForm] = useState({
    category: "HOTEL_VOUCHER",
    originalFileName: "",
    fileUrl: "",
    fileSize: 0,
    remarks: "",
  });

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [verifyForm, setVerifyForm] = useState({
    status: "Verified",
    remarks: "",
  });

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await opsService.getDocuments(tripId, departureDateStr);
      setDocs(data.documents);
      setPassengers(data.passengers || []);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [tripId, departureDateStr]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.fileUrl) {
      toast.error("Please enter a file URL");
      return;
    }
    setUploading(true);
    try {
      const fileName =
        docForm.originalFileName ||
        docForm.fileUrl.split("/").pop() ||
        "Document";
      await opsService.createDocument(tripId, departureDateStr, {
        ...docForm,
        originalFileName: fileName,
        fileSize: Math.floor(Math.random() * 800000) + 150000,
      });
      toast.success("Document uploaded successfully!");
      setUploadModalOpen(false);
      setDocForm({
        category: "HOTEL_VOUCHER",
        originalFileName: "",
        fileUrl: "",
        fileSize: 0,
        remarks: "",
      });
      fetchDocs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save document");
    } finally {
      setUploading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await opsService.verifyDocument(
        selectedDoc.id,
        verifyForm.status,
        verifyForm.remarks,
      );
      toast.success("Document verification updated!");
      setVerifyModalOpen(false);
      setSelectedDoc(null);
      fetchDocs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update verification status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;
    try {
      await opsService.deleteDocument(id);
      toast.success("Document deleted successfully!");
      fetchDocs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  const openIdentityDoc = async (doc: IdentityDoc, passengerName: string) => {
    const toastId = `view-id-${doc.id}`;
    try {
      if (doc.url) {
        const fullUrl = resolvePublicUrl(doc.url);
        window.open(fullUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (doc.source === "booking_document" && doc.bookingId && doc.passengerId) {
        toast.loading("Loading document...", { id: toastId });
        const blob = await bookingsService.downloadDocument(
          doc.bookingId,
          doc.passengerId,
          doc.id,
        );
        const url = window.URL.createObjectURL(blob);
        const win = window.open(url, "_blank");
        if (!win) {
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.fileName || "document";
          a.click();
        }
        toast.success(`Opened ${passengerName}'s document`, { id: toastId });
        return;
      }
      toast.error("No file available to view", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open document", { id: toastId });
    }
  };

  const openPaymentProof = (proof: PaymentProof) => {
    const fullUrl = resolvePublicUrl(proof.url);
    if (!fullUrl) {
      toast.error("No payment proof URL");
      return;
    }
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  const filteredPassengers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return passengers.filter((p) => {
      if (docFilter === "missing_id" && p.hasIdentityDoc) return false;
      if (docFilter === "missing_proof" && p.hasPaymentProof) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.bookingRef.toLowerCase().includes(q)
      );
    });
  }, [passengers, search, docFilter]);

  const groupedByBooking = useMemo(() => {
    const map = new Map<
      string,
      { bookingRef: string; bookingDbId: string; people: PassengerRow[] }
    >();
    filteredPassengers.forEach((p) => {
      const key = p.bookingDbId || p.bookingRef;
      if (!map.has(key)) {
        map.set(key, {
          bookingRef: p.bookingRef,
          bookingDbId: p.bookingDbId,
          people: [],
        });
      }
      map.get(key)!.people.push(p);
    });
    return Array.from(map.values());
  }, [filteredPassengers]);

  const filteredDocs = docs.filter((d) => {
    const matchCat =
      categoryFilter === "All Categories" || d.category === categoryFilter;
    const matchStatus =
      statusFilter === "All Status" || d.verificationStatus === statusFilter;
    const matchSearch =
      search === "" ||
      d.originalFileName.toLowerCase().includes(search.toLowerCase()) ||
      (d.remarks && d.remarks.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchStatus && matchSearch;
  });

  const summaryTiles = [
    {
      key: "all",
      label: "Passengers",
      count: summary?.totalPassengers ?? passengers.length,
      desc: "On this departure",
      filter: "all" as const,
    },
    {
      key: "id_ok",
      label: "ID uploaded",
      count: summary?.withIdentityDoc ?? 0,
      desc: "Aadhaar / passport",
      filter: "all" as const,
    },
    {
      key: "missing_id",
      label: "Missing ID",
      count: summary?.missingIdentityDoc ?? 0,
      desc: "No Aadhaar / ID",
      filter: "missing_id" as const,
    },
    {
      key: "proof_ok",
      label: "Payment proofs",
      count: summary?.withPaymentProof ?? 0,
      desc: "Receipts linked",
      filter: "all" as const,
    },
    {
      key: "missing_proof",
      label: "Missing proof",
      count: summary?.missingPaymentProof ?? 0,
      desc: "No payment proof",
      filter: "missing_proof" as const,
    },
    {
      key: "ops",
      label: "Ops files",
      count: docs.length,
      desc: "Hotel / vehicle / other",
      filter: null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {summaryTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => {
              if (tile.key === "ops") {
                setShowOpsFiles(true);
                return;
              }
              if (tile.filter) {
                setDocFilter((prev) =>
                  prev === tile.filter && tile.filter !== "all"
                    ? "all"
                    : tile.filter,
                );
              }
            }}
            className={cn(
              "border text-left rounded-[6px] p-3 shadow-3xs hover:border-slate-350 transition-all",
              (tile.filter && docFilter === tile.filter && tile.filter !== "all") ||
                (tile.key === "ops" && showOpsFiles)
                ? "bg-[#FF4D00]/5 border-[#FF4D00] text-[#FF4D00]"
                : "bg-white border-[#E2E8F0] text-slate-800",
            )}
          >
            <div className="flex justify-between items-start">
              <FileText
                className={cn(
                  "w-4.5 h-4.5 mb-1.5",
                  (tile.filter && docFilter === tile.filter && tile.filter !== "all") ||
                    (tile.key === "ops" && showOpsFiles)
                    ? "text-[#FF4D00]"
                    : "text-slate-400",
                )}
              />
              <span className="text-sm font-black">{tile.count}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider">
              {tile.label}
            </p>
            <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
              {tile.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-3.5 shadow-xs flex flex-wrap gap-2.5 items-center">
        <select
          value={docFilter}
          onChange={(e) =>
            setDocFilter(e.target.value as "all" | "missing_id" | "missing_proof")
          }
          className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
        >
          <option value="all">All passengers</option>
          <option value="missing_id">Missing ID only</option>
          <option value="missing_proof">Missing payment proof</option>
        </select>
        <div className="relative flex-1 max-w-xs min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search passenger or booking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full pl-8 text-[11px] rounded-[4px] border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowOpsFiles((v) => !v)}
          className="h-8 text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-[4px] px-3 flex items-center gap-1.5"
        >
          {showOpsFiles ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          Ops files ({docs.length})
        </button>
        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="h-8 text-[11px] font-bold bg-[#FF4D00] hover:bg-[#E05E00] text-white rounded-[4px] px-3.5 flex items-center gap-1.5 shadow-xs ml-auto"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Ops Document
        </button>
      </div>

      {/* Person-wise list */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden shadow-xs">
        <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Passenger documents
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Identity docs and payment proofs by person
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            {filteredPassengers.length} shown
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-medium text-xs">
            Loading passenger documents...
          </div>
        ) : groupedByBooking.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-medium text-xs">
            No passengers found for this departure.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {groupedByBooking.map((group) => (
              <div key={group.bookingDbId} className="p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Booking
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-800">
                    {group.bookingRef}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {group.people.length}{" "}
                    {group.people.length === 1 ? "person" : "people"}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.people.map((p) => (
                    <div
                      key={p.id}
                      className="border border-slate-150 rounded-[6px] bg-slate-50/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-7 w-7 rounded-md bg-slate-200/80 text-slate-600 inline-flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-800 truncate">
                              {p.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium">
                              {p.isLead ? "Lead passenger" : "Co-traveler"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider",
                              p.hasIdentityDoc
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-amber-50 text-amber-700 border-amber-100",
                            )}
                          >
                            {p.hasIdentityDoc ? "ID on file" : "No Aadhaar"}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider",
                              p.hasPaymentProof
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-amber-50 text-amber-700 border-amber-100",
                            )}
                          >
                            {p.hasPaymentProof
                              ? "Proof on file"
                              : "No payment proof"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* Identity */}
                        <div className="bg-white border border-[#E2E8F0] rounded-[5px] p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <IdCard className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                              Identity / passenger docs
                            </p>
                          </div>
                          {p.identityDocs.length === 0 ? (
                            <p className="text-[11px] text-amber-700 font-semibold">
                              No Aadhaar
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {p.identityDocs.map((doc) => (
                                <li
                                  key={doc.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-700 truncate">
                                      {doc.label}
                                    </p>
                                    <p className="text-[9px] text-slate-400 truncate">
                                      {doc.fileName}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openIdentityDoc(doc, p.name)}
                                    className="shrink-0 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9.5px] font-bold px-2 py-1 rounded flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3 text-slate-400" /> View
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Payment proofs */}
                        <div className="bg-white border border-[#E2E8F0] rounded-[5px] p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                              Payment proofs
                            </p>
                          </div>
                          {p.paymentProofs.length === 0 ? (
                            <p className="text-[11px] text-amber-700 font-semibold">
                              No payment proof
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {p.paymentProofs.map((proof) => (
                                <li
                                  key={proof.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-700 truncate">
                                      {proof.fileName}
                                    </p>
                                    <p className="text-[9px] text-slate-400 truncate">
                                      {proof.amount != null
                                        ? `₹${Number(proof.amount).toLocaleString("en-IN")}`
                                        : "Receipt"}
                                      {proof.paymentMode
                                        ? ` · ${proof.paymentMode}`
                                        : ""}
                                      {proof.status ? ` · ${proof.status}` : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openPaymentProof(proof)}
                                    className="shrink-0 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9.5px] font-bold px-2 py-1 rounded flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3 text-slate-400" />{" "}
                                    View
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operational / category documents (secondary) */}
      {showOpsFiles && (
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden shadow-xs">
          <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] bg-slate-50 flex flex-wrap gap-2 items-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mr-auto">
              Operational documents
            </p>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-7 text-[10px] font-bold border border-slate-200 rounded-[4px] px-2 bg-white text-slate-700 outline-none"
            >
              <option value="All Categories">All Categories</option>
              <option value="PASSENGER">Passenger Documents</option>
              <option value="PAYMENT_PROOF">Payment Proofs</option>
              <option value="HOTEL_VOUCHER">Hotel Vouchers</option>
              <option value="VEHICLE">Vehicle Documents</option>
              <option value="GUIDE_ID">Guide IDs</option>
              <option value="OPERATIONAL">Operational Files</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 text-[10px] font-bold border border-slate-200 rounded-[4px] px-2 bg-white text-slate-700 outline-none"
            >
              <option value="All Status">All Verification Status</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
              <option value="Action Required">Action Required</option>
            </select>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white border-b border-[#E2E8F0]">
              <tr className="text-[9.5px] font-bold text-slate-450 uppercase tracking-wider">
                <th className="p-3 border-r border-slate-100">FILE NAME</th>
                <th className="p-3 border-r border-slate-100">CATEGORY</th>
                <th className="p-3 border-r border-slate-100">UPLOADED BY</th>
                <th className="p-3 border-r border-slate-100 text-center">
                  VERIFICATION
                </th>
                <th className="p-3 text-center w-40">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-400 font-medium"
                  >
                    No operational documents uploaded for this category.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FF4D00]" />
                        <div>
                          <p className="font-extrabold text-slate-800">
                            {d.originalFileName}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Uploaded{" "}
                            {new Date(d.createdAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-100">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {d.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-100 font-bold text-slate-700">
                      {d.uploadedBy?.name || "Staff"}
                    </td>
                    <td className="p-3 border-r border-slate-100 text-center">
                      <span
                        className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider inline-flex items-center gap-1",
                          d.verificationStatus === "Verified"
                            ? "bg-green-50 text-green-700 border-green-100"
                            : d.verificationStatus === "Rejected"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : d.verificationStatus === "Action Required"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-blue-50 text-blue-700 border-blue-100",
                        )}
                      >
                        {d.verificationStatus === "Verified" && (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        )}
                        {d.verificationStatus === "Rejected" && (
                          <XCircle className="w-2.5 h-2.5" />
                        )}
                        {d.verificationStatus === "Action Required" && (
                          <AlertCircle className="w-2.5 h-2.5" />
                        )}
                        {d.verificationStatus === "Pending" && (
                          <Clock className="w-2.5 h-2.5" />
                        )}
                        {d.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9.5px] font-bold px-2 py-1 rounded flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-400" /> View
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoc(d);
                            setVerifyForm({
                              status: d.verificationStatus,
                              remarks: d.remarks || "",
                            });
                            setVerifyModalOpen(true);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-650 text-[9.5px] font-bold px-2 py-1 rounded"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="bg-red-50 text-red-650 hover:bg-red-100 text-[9.5px] font-bold px-2 py-1.5 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-lg border border-slate-200">
          <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-[#FF4D00]" /> Upload Departure
            Document
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-450 mt-1">
            Operational files (hotel vouchers, vehicle docs, guide IDs). Passenger
            Aadhaar and payment proofs come from booking records.
          </DialogDescription>
          <form onSubmit={handleUploadSubmit} className="space-y-4 mt-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Document Category
              </label>
              <select
                value={docForm.category}
                onChange={(e) =>
                  setDocForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="HOTEL_VOUCHER">Hotel Voucher</option>
                <option value="VEHICLE">Vehicle Document (Permits, RC)</option>
                <option value="GUIDE_ID">Guide ID Card / License</option>
                <option value="PASSENGER">Passenger Document (ID proof)</option>
                <option value="PAYMENT_PROOF">Client Payment Proof</option>
                <option value="OPERATIONAL">Other Operational File</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Document Title/Name
              </label>
              <input
                type="text"
                required
                value={docForm.originalFileName}
                onChange={(e) =>
                  setDocForm((prev) => ({
                    ...prev,
                    originalFileName: e.target.value,
                  }))
                }
                placeholder="e.g. Hotel Voucher Shimla.pdf"
                className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                File URL / Storage Link
              </label>
              <input
                type="url"
                required
                value={docForm.fileUrl}
                onChange={(e) =>
                  setDocForm((prev) => ({ ...prev, fileUrl: e.target.value }))
                }
                placeholder="e.g. https://supabase-storage-bucket/vouchers/file.pdf"
                className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2.5 bg-white text-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={docForm.remarks}
                onChange={(e) =>
                  setDocForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Enter remarks or specifications..."
                className="w-full text-xs font-bold border border-slate-200 rounded p-2 bg-white text-slate-700 outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUploadModalOpen(false)}
                className="h-8 text-xs font-bold text-slate-500 rounded"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="h-8 bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase rounded"
              >
                {uploading ? "Saving Document..." : "Save Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-lg border border-slate-200">
          <DialogTitle className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4.5 h-4.5 text-blue-650" /> Verify
            Departure Document
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-450 mt-1">
            Change the audit verification status and submit optional review
            comments.
          </DialogDescription>
          <form onSubmit={handleVerifySubmit} className="space-y-4 mt-3">
            <p className="text-xs text-slate-500 font-medium">
              Verify file:{" "}
              <strong className="text-slate-700">
                {selectedDoc?.originalFileName}
              </strong>
            </p>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Verification Status
              </label>
              <select
                value={verifyForm.status}
                onChange={(e) =>
                  setVerifyForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full h-9 text-xs font-bold border border-slate-200 rounded px-2 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="Pending">Pending Verification</option>
                <option value="Verified">Verified (Accept)</option>
                <option value="Rejected">Rejected (Decline)</option>
                <option value="Action Required">Action Required</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Review Remarks
              </label>
              <textarea
                rows={3}
                required
                value={verifyForm.remarks}
                onChange={(e) =>
                  setVerifyForm((prev) => ({
                    ...prev,
                    remarks: e.target.value,
                  }))
                }
                placeholder="Log reason for rejection or verify remarks..."
                className="w-full text-xs font-bold border border-slate-200 rounded p-2 bg-white text-slate-700 outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setVerifyModalOpen(false)}
                className="h-8 text-xs font-bold text-slate-500 rounded"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 bg-[#FF4D00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase rounded"
              >
                Submit Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
